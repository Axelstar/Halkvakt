// FÖRE RESAN — DET SOM FATTADES 2/10 (favoriternas underlag, DECISIONS #528; Bengt 11/10: "gör 1"). LÄS-ONLY mot Trafikverkets
// öppna API just nu, räknat. Ingenting sparas, ingenting byggs, inget når appen. Fortsättning på fore-resan-kallor-2026-10-02.ts (#442):
//   1. Färjorna färdigräknade: svaret 2/10 nådde taket 20 000 avgångar. Nu i tidsfönster på sex timmar, de närmaste 24 timmarna, så att
//      inget fönster når taket — och hela svaret utan filter en gång till, för att se hur långt fram det sträcker sig.
//   2. Filstorleken för färjorna, hastigheterna, omledningarna och kömeddelandena, som en GEMENSAM fil för hela landet (samma för alla
//      telefoner, ingen fråga om förarens väg), rå och packad (gzip), som 2/10.
// Fälten för hastighet och omledning är inte kända i förväg: mätningen räknar vilka koder som finns (MessageCode, MessageCodeValue,
// TrafficRestrictionType, TemporaryLimit) och väljer sedan med mönster som skrivs ut, så att urvalet syns.
// Kör: vagarbeten-matning.yml med inmatningen skript = den här filen. TRAFIKVERKET_API_KEY krävs.
import { gzipSync } from "node:zlib";

const KEY = process.env.TRAFIKVERKET_API_KEY;
const URL = "https://api.trafikinfo.trafikverket.se/v2/data.json";
const TAK = 20000;

const tally = (m: Map<string, number>, k: unknown) => { const s = k === undefined || k === null || k === "" ? "(saknas)" : String(k); m.set(s, (m.get(s) ?? 0) + 1); };
const skriv = (rubrik: string, m: Map<string, number>, topp = 25) => {
  console.log(`mätt: ${rubrik}`);
  for (const [k, n] of [...m].sort((a, b) => b[1] - a[1]).slice(0, topp)) console.log(`mätt:   ${n.toString().padStart(6)}  ${k.slice(0, 90)}`);
};
const kb = (b: number) => `${(b / 1000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} kB`;
const storlek = (namn: string, obj: unknown) => {
  const raw = Buffer.from(JSON.stringify(obj)); const gz = gzipSync(raw, { level: 9 });
  console.log(`mätt:   ${namn}: ${kb(raw.length)} rå · ${kb(gz.length)} packad`);
  return gz.length;
};
const punkt = (wkt: unknown) => {
  const m = /POINT \(([-\d.]+) ([-\d.]+)\)/.exec(String(wkt ?? ""));
  return m ? { lon: Math.round(+m[1] * 1e5) / 1e5, lat: Math.round(+m[2] * 1e5) / 1e5 } : null;
};
const text = (d: any) => String(d.Header ?? d.Message ?? "").replace(/\s+/g, " ").slice(0, 80);

async function hamta(objekt: string, version: string, namespace: string, filter = "", limit = TAK): Promise<any[]> {
  const q = `<REQUEST><LOGIN authenticationkey="${KEY}"/><QUERY objecttype="${objekt}" schemaversion="${version}" namespace="${namespace}" ` +
    `limit="${limit}">${filter ? `<FILTER>${filter}</FILTER>` : ""}</QUERY></REQUEST>`;
  const r = await fetch(URL, { method: "POST", headers: { "Content-Type": "text/xml" }, body: q });
  const body = await r.text();
  if (!r.ok) throw new Error(`${objekt} ${r.status}: ${body.slice(0, 400)}`);
  const ut = JSON.parse(body)?.RESPONSE?.RESULT?.[0]?.[objekt] ?? [];
  if (ut.length >= limit) console.log(`mätt: ${objekt}: TAKET ${limit} NÅTT i ett fönster — talen är för låga`);
  return ut;
}

async function main(): Promise<number> {
  if (!KEY) { console.error("TRAFIKVERKET_API_KEY not set"); return 1; }
  const nu = Date.now();
  console.log(`mätt: FÖRE RESAN — DET SOM FATTADES 2/10 (${new Date(nu).toISOString()}), läs-only, DECISIONS #528`);

  // 1. Färjorna
  const alla = await hamta("FerryAnnouncement", "1.2", "ferry.trafficinfo");
  const tider = alla.map((a) => Date.parse(a.DepartureTime)).filter(Number.isFinite).sort((a, b) => a - b);
  console.log(`mätt: färjor utan filter: ${alla.length} avgångar, från ${new Date(tider[0]).toISOString()} till ${new Date(tider[tider.length - 1]).toISOString()}`);
  console.log(`mätt: fälten i en avgång: ${Object.keys(alla[0] ?? {}).join(", ")}`);
  const fonster: any[] = [];
  for (let h = 0; h < 24; h += 6) {
    const fran = new Date(nu + h * 3_600_000).toISOString(), till = new Date(nu + (h + 6) * 3_600_000).toISOString();
    const del = await hamta("FerryAnnouncement", "1.2", "ferry.trafficinfo",
      `<AND><GTE name="DepartureTime" value="${fran}"/><LT name="DepartureTime" value="${till}"/></AND>`);
    console.log(`mätt:   ${fran.slice(11, 16)}–${till.slice(11, 16)} UTC: ${del.length} avgångar`);
    fonster.push(...del);
  }
  const leder = new Map<string, number>(); for (const a of fonster) tally(leder, a.Route?.Name ?? a.Route?.Id);
  const riktningar = new Set(fonster.map((a) => `${a.Route?.Id ?? a.Route?.Name}|${a.FromHarbor?.Id ?? a.FromHarbor?.Name}`));
  console.log(`mätt: färjeavgångar de närmaste 24 timmarna: ${fonster.length} på ${leder.size} leder (${riktningar.size} led och riktning)`);
  skriv("färjeleder, avgångar de närmaste 24 timmarna", leder, 40);
  // Rättat efter första körningen (38132362450): DeviationId är en lista, och en tom lista räknas som sann — alla 2 508 räknades.
  const info = fonster.filter((a) => (Array.isArray(a.DeviationId) ? a.DeviationId.length : a.DeviationId));
  console.log(`mätt: avgångar med avvikelse eller info: ${info.length}`);

  // 2. Situationerna: koderna som finns, och urvalen
  const sits = await hamta("Situation", "1.6", "road.trafficinfo");
  const aktiva: any[] = [];
  for (const s of sits) for (const d of s.Deviation ?? []) {
    if (s.Deleted || d.Deleted || d.Suspended) continue;
    const start = d.StartTime ? Date.parse(d.StartTime) : -Infinity, slut = d.EndTime ? Date.parse(d.EndTime) : Infinity;
    if (start <= nu && nu < slut) aktiva.push(d);
  }
  const kod = new Map<string, number>(), kodv = new Map<string, number>(), restr = new Map<string, number>(), grans = new Map<string, number>();
  for (const d of aktiva) { tally(kod, d.MessageCode); tally(kodv, d.MessageCodeValue); tally(restr, d.TrafficRestrictionType); if (d.TemporaryLimit) tally(grans, d.TemporaryLimit); }
  console.log(`mätt: aktiva avvikelser: ${aktiva.length}`);
  skriv("MessageCode", kod, 40); skriv("MessageCodeValue", kodv, 40); skriv("TrafficRestrictionType", restr, 20); skriv("TemporaryLimit", grans, 20);

  // Rättat efter första körningen (38132362450): `kö\b` träffade *Körfält blockerade* — i JavaScript är ö inget ordtecken, så \b
  // ligger mellan ö och r (1 994 träffar). Kö är nu bara MessageTypeValue AbnormalTraffic, som 2/10. Hastighet var TemporaryLimit satt,
  // vilket också tog vikt, bredd och omledning; nu bara gränser som säger hastighet, eller koden speedRestrictionInOperation.
  const HASTIGHET = /hastighet|speedRestriction/i, OMLEDNING = /omled|divers|detour/i;
  console.log(`mätt: urvalen: hastighet = ${HASTIGHET} i TemporaryLimit eller koderna; omledning = ${OMLEDNING}; kö = MessageTypeValue AbnormalTraffic`);
  const kod3 = (d: any) => `${d.MessageCode ?? ""} ${d.MessageCodeValue ?? ""} ${d.TrafficRestrictionType ?? ""}`;
  const hast = aktiva.filter((d) => HASTIGHET.test(String(d.TemporaryLimit ?? "")) || HASTIGHET.test(kod3(d)));
  const oml = aktiva.filter((d) => OMLEDNING.test(kod3(d)) || OMLEDNING.test(text(d)));
  const ko = aktiva.filter((d) => d.MessageTypeValue === "AbnormalTraffic");
  console.log(`mätt: hastigheter ${hast.length} · omledningar ${oml.length} · kömeddelanden ${ko.length} (${new Date(nu).toLocaleDateString("sv-SE", { weekday: "long", timeZone: "Europe/Stockholm" })} ${new Date(nu).toISOString().slice(11, 16)} UTC)`);

  // 3. En gemensam fil för hela landet
  console.log("mätt: storleken på en gemensam fil (alla får samma, ingen fråga om förarens väg):");
  const farjor = fonster.map((a) => ({ led: a.Route?.Id ?? a.Route?.Name ?? null, fran: a.FromHarbor?.Id ?? a.FromHarbor?.Name ?? null,
    till: a.ToHarbor?.Id ?? a.ToHarbor?.Name ?? null, tid: a.DepartureTime }));
  const f24 = storlek(`färjornas avgångar de närmaste 24 timmarna (${farjor.length})`, farjor);
  const per = new Map<string, any[]>();
  for (const f of [...farjor].sort((a, b) => Date.parse(a.tid) - Date.parse(b.tid))) {
    const k = `${f.led}|${f.fran}`; const l = per.get(k) ?? []; if (l.length < 3) l.push(f); per.set(k, l);
  }
  storlek(`färjornas tre närmaste per led och riktning (${[...per.values()].flat().length})`, [...per.values()].flat());
  const rad = (d: any) => ({ id: d.Id, ...(punkt(d.Geometry?.Point?.WGS84) ?? {}), sev: d.SeverityCode ?? null, text: text(d) });
  const h = storlek(`hastigheter (${hast.length})`, hast.map((d) => ({ ...rad(d), grans: d.TemporaryLimit ?? null })));
  const o = storlek(`omledningar (${oml.length})`, oml.map(rad));
  const k = storlek(`kömeddelanden (${ko.length})`, ko.map(rad));
  console.log(`mätt:   tillsammans, färjorna 24 h och de tre andra: ${kb(f24 + h + o + k)} packad — 2/10: vägarbeten som punkter och restider med linjer, och lägesbilden live.json 2,9 kB och static.json 80 kB packade`);
  return 0;
}
main().then((c) => process.exit(c), (e) => { console.error(e); process.exit(1); });
