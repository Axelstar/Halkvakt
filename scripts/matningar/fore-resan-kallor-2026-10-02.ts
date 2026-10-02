// FÖRE RESAN — KÄLLORNA RÄKNADE (kort #233 del 1, DECISIONS #441; Bengt 2/10: "ja räkna på allt men bara som information inte något
// bygge alls (det här är bara på experimentstadiet)"). LÄS-ONLY: Trafikverkets öppna API just nu, räknat. Ingenting sparas, ingenting
// byggs, inget når appen.
//   1. Situationerna: aktiva avvikelser per typ, vägarbetena (påverkan, avstängda körfält, varaktighet, geometri), köer (AbnormalTraffic).
//   2. TravelTimeRoute: hur många restidssträckor, i vilka län, hur långa, status just nu, hur färska.
//   3. TrafficFlow: hur många detektorer, i vilka län, hur färska.
//   4. FerryAnnouncement: avgångar och leder i svaret.
//   5. Storleken på en GEMENSAM fil för hela landet (som lägesbilden): vägarbetena och restiderna, rå och packad (gzip).
// Kör: vagarbeten-matning.yml med inmatningen skript = den här filen. TRAFIKVERKET_API_KEY krävs.
import { gzipSync } from "node:zlib";

const KEY = process.env.TRAFIKVERKET_API_KEY;
const URL = "https://api.trafikinfo.trafikverket.se/v2/data.json";
const VAGARBETE = new Set(["MaintenanceWorks", "RoadOrCarriagewayOrLaneManagement"]);
const LAN: Record<number, string> = { 1: "Stockholm", 3: "Uppsala", 4: "Södermanland", 5: "Östergötland", 6: "Jönköping", 7: "Kronoberg",
  8: "Kalmar", 9: "Gotland", 10: "Blekinge", 12: "Skåne", 13: "Halland", 14: "Västra Götaland", 17: "Värmland", 18: "Örebro",
  19: "Västmanland", 20: "Dalarna", 21: "Gävleborg", 22: "Västernorrland", 23: "Jämtland", 24: "Västerbotten", 25: "Norrbotten" };

const tally = (m: Map<string, number>, k: unknown) => { const s = k === undefined || k === null || k === "" ? "(saknas)" : String(k); m.set(s, (m.get(s) ?? 0) + 1); };
const skriv = (rubrik: string, m: Map<string, number>, topp = 25) => {
  console.log(`mätt: ${rubrik}`);
  for (const [k, n] of [...m].sort((a, b) => b[1] - a[1]).slice(0, topp)) console.log(`mätt:   ${n.toString().padStart(6)}  ${k.slice(0, 90)}`);
};
const lan = (nr: unknown) => (Array.isArray(nr) ? nr : [nr]).map((n) => LAN[Number(n)] ?? `län ${n}`).join("/");
const kb = (b: number) => `${(b / 1000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} kB`;
const storlek = (namn: string, obj: unknown) => {
  const raw = Buffer.from(JSON.stringify(obj)); const gz = gzipSync(raw, { level: 9 });
  console.log(`mätt:   ${namn}: ${kb(raw.length)} rå · ${kb(gz.length)} packad`);
  return gz.length;
};
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };

async function hamta(objekt: string, version: string, namespace: string, limit = 20000): Promise<any[]> {
  const q = `<REQUEST><LOGIN authenticationkey="${KEY}"/><QUERY objecttype="${objekt}" schemaversion="${version}" namespace="${namespace}" limit="${limit}"></QUERY></REQUEST>`;
  const r = await fetch(URL, { method: "POST", headers: { "Content-Type": "text/xml" }, body: q });
  const body = await r.text();
  if (!r.ok) throw new Error(`${objekt} ${r.status}: ${body.slice(0, 400)}`);
  const ut = JSON.parse(body)?.RESPONSE?.RESULT?.[0]?.[objekt] ?? [];
  console.log(`mätt: ${objekt} ${version}: ${ut.length} poster${ut.length >= limit ? ` — TAKET ${limit} NÅTT, talen är för låga` : ""}`);
  return ut;
}
// Koordinaterna avrundas till fem decimaler (ungefär en meter) som i lägesbilden.
const runda = (wkt: string) => wkt.replace(/-?\d+\.\d+/g, (x) => String(Math.round(Number(x) * 1e5) / 1e5));

async function main(): Promise<number> {
  if (!KEY) { console.error("TRAFIKVERKET_API_KEY not set"); return 1; }
  console.log(`mätt: FÖRE RESAN — KÄLLORNA (${new Date().toISOString()}), läs-only, DECISIONS #441`);
  const nu = Date.now();

  // 1. Situationerna
  const sits = await hamta("Situation", "1.6", "road.trafficinfo");
  const typer = new Map<string, number>(), va: any[] = [], ko: any[] = [];
  // Tillagt efter första körningen (2/10 18:32): mätningen 26/9 (#420) räknade 5 280 aktiva vägarbeten utan att se på `Suspended`, den
  // här räknade 1 876 med. Raden nedan räknar de vilande vägarbetena för sig, så att skillnaden syns. Inget annat i mätningen ändras.
  let vilande = 0, vilandeUtanTid = 0;
  for (const s of sits) for (const d of s.Deviation ?? []) {
    if (!s.Deleted && !d.Deleted && d.Suspended && VAGARBETE.has(d.MessageTypeValue)) {
      const st = d.StartTime ? Date.parse(d.StartTime) : -Infinity, sl = d.EndTime ? Date.parse(d.EndTime) : Infinity;
      if (st <= nu && nu < sl) vilande++; else vilandeUtanTid++;
    }
  }
  for (const s of sits) for (const d of s.Deviation ?? []) {
    if (s.Deleted || d.Deleted || d.Suspended) continue;
    const start = d.StartTime ? Date.parse(d.StartTime) : -Infinity, slut = d.EndTime ? Date.parse(d.EndTime) : Infinity;
    if (!(start <= nu && nu < slut)) continue;
    tally(typer, d.MessageTypeValue);
    if (VAGARBETE.has(d.MessageTypeValue)) va.push(d);
    if (d.MessageTypeValue === "AbnormalTraffic") ko.push(d);
  }
  skriv("aktiva avvikelser per typ (MessageTypeValue)", typer, 30);
  const pav = new Map<string, number>(), filer = new Map<string, number>(), tid = new Map<string, number>(), geo = new Map<string, number>(), nytt = new Map<string, number>();
  for (const d of va) {
    tally(pav, `${d.SeverityCode ?? "(saknas)"} ${d.SeverityText ?? ""}`.trim());
    tally(filer, d.NumberOfLanesRestricted ?? "(saknas)");
    const dygn = d.EndTime ? (Date.parse(d.EndTime) - Date.parse(d.StartTime)) / 86_400_000 : Infinity;
    tally(tid, d.ValidUntilFurtherNotice ? "tills vidare" : !d.EndTime ? "saknar sluttid" : dygn <= 1 ? "≤ 1 dygn" : dygn <= 7 ? "1–7 dygn" : dygn <= 30 ? "7–30 dygn" : "> 30 dygn");
    tally(geo, [d.Geometry?.Point?.WGS84 ? "punkt" : null, d.Geometry?.Line?.WGS84 ? "linje" : null].filter(Boolean).join(" + ") || "ingen");
    const sedan = (nu - Date.parse(d.StartTime)) / 3_600_000;
    tally(nytt, sedan <= 24 ? "började senaste dygnet" : sedan <= 24 * 7 ? "började senaste veckan" : "äldre än en vecka");
  }
  console.log(`mätt: aktiva vägarbeten: ${va.length} · köer och onormal trafik (AbnormalTraffic): ${ko.length}`);
  console.log(`mätt: vilande vägarbeten (Suspended) inom sin tid: ${vilande} · vilande utanför sin tid: ${vilandeUtanTid} — aktiva och vilande tillsammans: ${va.length + vilande}`);
  skriv("vägarbeten: påverkan", pav); skriv("vägarbeten: avstängda körfält", filer); skriv("vägarbeten: varaktighet", tid);
  skriv("vägarbeten: när de började", nytt); skriv("vägarbeten: geometri", geo);
  const kortaEllerNya = va.filter((d) => (nu - Date.parse(d.StartTime)) <= 86_400_000 || (d.EndTime && !d.ValidUntilFurtherNotice && (Date.parse(d.EndTime) - Date.parse(d.StartTime)) <= 7 * 86_400_000));
  console.log(`mätt: vägarbeten som är nya (senaste dygnet) eller kortare än en vecka: ${kortaEllerNya.length} — de en notis skulle gälla`);
  for (const d of ko.slice(0, 6)) console.log(`mätt:   kö: ${String(d.Header ?? d.Message ?? "").replace(/\s+/g, " ").slice(0, 100)} · ${d.RoadNumber ?? ""} · ${lan(d.CountyNo)}`);

  // 2. Restidssträckorna
  const tt = await hamta("TravelTimeRoute", "1.6", "road.trafficinfo");
  const ttLan = new Map<string, number>(), ttStatus = new Map<string, number>();
  let ttM = 0; const ttAlder: number[] = [];
  for (const r of tt) { tally(ttLan, lan(r.CountyNo)); tally(ttStatus, r.TrafficStatus); ttM += Number(r.Length ?? 0); if (r.MeasureTime) ttAlder.push((nu - Date.parse(r.MeasureTime)) / 60000); }
  console.log(`mätt: restidssträckor: ${tt.length}, sammanlagt ${Math.round(ttM / 1000)} km, mätvärdet i median ${median(ttAlder).toFixed(1)} min gammalt`);
  skriv("restidssträckor per län", ttLan); skriv("restidsstatus just nu", ttStatus);

  // 3. Detektorerna
  const tf = await hamta("TrafficFlow", "1.5", "road.trafficinfo");
  const platser = new Map<string, any>(); const tfAlder: number[] = [];
  for (const r of tf) { platser.set(String(r.SiteId), r); if (r.MeasurementTime) tfAlder.push((nu - Date.parse(r.MeasurementTime)) / 60000); }
  const tfLan = new Map<string, number>(); for (const r of platser.values()) tally(tfLan, lan(r.CountyNo));
  console.log(`mätt: detektorplatser: ${platser.size} (${tf.length} mätvärden), i median ${median(tfAlder).toFixed(1)} min gamla`);
  skriv("detektorplatser per län", tfLan);

  // 4. Färjorna
  const fa = await hamta("FerryAnnouncement", "1.2", "ferry.trafficinfo");
  const leder = new Map<string, number>(); for (const a of fa) tally(leder, a.Route?.Name ?? a.Route?.Id);
  console.log(`mätt: färjeavgångar i svaret: ${fa.length} på ${leder.size} leder`);
  skriv("färjeleder (avgångar)", leder, 12);

  // 5. En gemensam fil för hela landet
  console.log("mätt: storleken på en gemensam fil (alla får samma, ingen fråga om förarens väg):");
  const vaPunkt = va.flatMap((d) => { const m = /POINT \(([-\d.]+) ([-\d.]+)\)/.exec(d.Geometry?.Point?.WGS84 ?? ""); return m ? [{
    id: d.Id, lon: Math.round(+m[1] * 1e5) / 1e5, lat: Math.round(+m[2] * 1e5) / 1e5, sev: d.SeverityCode ?? null, korfalt: d.NumberOfLanesRestricted ?? null,
    start: d.StartTime, slut: d.EndTime ?? null, text: String(d.Header ?? d.Message ?? "").replace(/\s+/g, " ").slice(0, 80) }] : []; });
  const a = storlek(`vägarbeten som punkter (${vaPunkt.length})`, vaPunkt);
  const vaLinje = va.flatMap((d) => d.Geometry?.Line?.WGS84 ? [{ id: d.Id, linje: runda(d.Geometry.Line.WGS84), sev: d.SeverityCode ?? null }] : []);
  storlek(`vägarbeten som linjer (${vaLinje.length})`, vaLinje);
  const ttFil = tt.map((r) => ({ id: r.Id, status: r.TrafficStatus ?? null, restid: r.TravelTime ?? null, normal: r.FreeFlowTravelTime ?? null, linje: r.Geometry?.WGS84 ? runda(r.Geometry.WGS84) : null }));
  const b = storlek(`restidssträckor med linjer (${ttFil.length})`, ttFil);
  storlek("restidssträckor utan linjer (bara status, linjerna i en fil som hämtas sällan)", ttFil.map(({ linje, ...x }) => x));
  console.log(`mätt:   tillsammans, punkter och restider med linjer: ${kb(a + b)} packad — jämför lägesbilden i dag: live.json 2,9 kB och static.json 80 kB packade (mätt 2/10)`);
  return 0;
}
main().then((c) => process.exit(c), (e) => { console.error(e); process.exit(1); });
