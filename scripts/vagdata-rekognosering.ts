// VÄGDATALAGRETS REKOGNOSERING (kort #301, DECISIONS #472; Bengt 7/10: "kör rekognoseringen och gör kortet").
// FRÅGAN: bär Trafikverkets öppna API — nyckeln vi redan har — NVDB:s vägdata vid våra platser, så att ett statiskt vägdatalager
// (data/vagdata/) kan byggas utan Lastkajen? Datamodellen (data.trafikverket.se, läst 7/10) listar Trafik (ÅDT, namespace
// Vägdata.TRAFIK_DK_O 1.2), FunktionellVägklass, Slitlager, Vägbredd, Hastighetsgräns (Vägdata.NVDB_DK_O) och PavementData
// (Road.PavementInfo) med geometri som WKT i WGS84.
//
// REN LÄSNING, INGET UTFALL. Skriver ingenting, lagrar ingenting. Tre spår, varje svar redovisas med status, ROTELEMENT och antal
// (Vegvesen-läxan: 200 är ingen katalog) — och svarskroppen vid fel (TRV-400-läxan).
//   Spår A: ett anrop per datamängd med limit 1 — finns den, vilken schemaversion svarar, vilka fält kommer tillbaka.
//   Spår B: rumslig fråga vid ett STICKPROV av platser (var tolfte VViS-station, var tjugonde väglagssegment, var tjugonde vägpunkt
//           längs de 20 svenska rutterna) med WITHIN center/radius på geometrin — hur stor andel får träff, hur många objekt per
//           träff, hur lång tid per anrop. Stickprov, inte alla: nyckeln delas med driftens ingest varje minut, och full täckning
//           är hämtarens jobb (nästa steg), inte rekognoseringens.
//   Spår C: PavementData på samma stickprov av segment — finns spårdjup (vattenplaningens gamla Lastkajen-låsning, kort #42)?
// Run: TRAFIKVERKET_API_KEY=... node --experimental-strip-types scripts/vagdata-rekognosering.ts [--alla]  (--alla: alla platser, bara i hämtaren)
import { readFileSync } from "node:fs";
import { provpunkter } from "../engine/src/segment.ts";

const KEY = process.env.TRAFIKVERKET_API_KEY;
const API = "https://api.trafikinfo.trafikverket.se/v2/data.json";
const UA = "Halkvakt-vagdata-rekognosering/0.1 (+https://github.com/Axelstar/Halkvakt)";
const RADIE_M = 150;      // vägpunkten ligger på vägen; stationen står intill den — 150 m fångar vägen utan att fånga grannvägen
const STEG = { station: 12, segment: 20, vagpunkt: 20 };   // stickprovets gleshet
const PAUS_MS = 600;      // ~1,5 anrop/s — driftens ingest delar nyckeln

type Mangd = { namn: string; ns: string; ver: string; falt: string[] };
const MANGDER: Mangd[] = [
  { namn: "Trafik", ns: "Vägdata.TRAFIK_DK_O", ver: "1.2", falt: ["ÅDT_fordon", "ÅDT_lastbilar", "ÅDT_lätta_fordon_22_06", "Mätårsperiod", "Mätmetod"] },
  { namn: "FunktionellVägklass", ns: "Vägdata.NVDB_DK_O", ver: "1.2", falt: ["Klass"] },
  { namn: "Slitlager", ns: "Vägdata.NVDB_DK_O", ver: "1.2", falt: ["Slitlagertyp"] },
  { namn: "Vägbredd", ns: "Vägdata.NVDB_DK_O", ver: "1.2", falt: ["Bredd"] },
  { namn: "Hastighetsgräns", ns: "Vägdata.NVDB_DK_O", ver: "1.2", falt: ["Högsta_tillåtna_hastighet"] },
  { namn: "Väghållare", ns: "Vägdata.NVDB_DK_O", ver: "1.2", falt: ["Väghållartyp"] },
  { namn: "PavementData", ns: "Road.PavementInfo", ver: "1", falt: [] },
  { namn: "MeasurementData20", ns: "Road.PavementInfo", ver: "1", falt: [] },   // spårdjup bor här, inte i PavementData (körning 1)
];
// Geometrins attributnamn upptäcks i spår A ur första posten (körning 37567654151: "Invalid query attribute Trafik.Geometry.WGS84" —
// NVDB-posternas Geometry heter något annat). Finns en WGS84-nyckel används den med radie i meter; annars SWEREF99TM med
// projicerade koordinater (Krüger-serien, självtestad mot E = 500 000 på meridianen 15°).
let GEO_ATTR = "Geometry.WGS84", GEO_WGS84 = true;
export function sweref99tm(lon: number, lat: number): [number, number] {
  const a = 6378137, f = 1 / 298.257222101, k0 = 0.9996, lon0 = 15, FE = 500000;
  const e2 = f * (2 - f), n = f / (2 - f), A = a / (1 + n) * (1 + n * n / 4 + n ** 4 / 64);
  const φ = lat * Math.PI / 180, λ = (lon - lon0) * Math.PI / 180;
  const e = Math.sqrt(e2), conf = Math.atanh(Math.sin(φ)) - e * Math.atanh(e * Math.sin(φ));
  const t = Math.sinh(conf), ξ0 = Math.atan2(t, Math.cos(λ)), η0 = Math.atanh(Math.sin(λ) / Math.sqrt(1 + t * t));
  const α = [n / 2 - 2 * n * n / 3 + 5 * n ** 3 / 16, 13 * n * n / 48 - 3 * n ** 3 / 5, 61 * n ** 3 / 240];
  let ξ = ξ0, η = η0;
  α.forEach((c, i) => { const j = 2 * (i + 1); ξ += c * Math.sin(j * ξ0) * Math.cosh(j * η0); η += c * Math.cos(j * ξ0) * Math.sinh(j * η0); });
  return [FE + k0 * A * η, k0 * A * ξ];
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const rad = (s: string) => console.log(s);

async function fraga(m: Mangd, filter: string, limit: number, ver = m.ver) {
  const body = `<REQUEST><LOGIN authenticationkey="${esc(KEY!)}"/>` +
    `<QUERY objecttype="${m.namn}" namespace="${m.ns}" schemaversion="${ver}" limit="${limit}"><FILTER>${filter}</FILTER></QUERY></REQUEST>`;
  const t0 = performance.now();
  const r = await fetch(API, { method: "POST", headers: { "Content-Type": "text/xml", "User-Agent": UA }, body });
  const txt = await r.text();
  const ms = Math.round(performance.now() - t0);
  let j: any = null; try { j = JSON.parse(txt); } catch { /* inte JSON */ }
  const res = j?.RESPONSE?.RESULT?.[0];
  const rot = res ? Object.keys(res).filter((k) => k !== "INFO").join(",") : (txt.replace(/\s+/g, " ").slice(0, 160) || "(tom)");
  const items: any[] = res?.[m.namn] ?? [];
  return { ok: r.ok, status: r.status, ms, rot, items, fel: r.ok ? "" : txt.replace(/\s+/g, " ").slice(0, 220) };
}
// Linjegeometrier ligger aldrig helt INOM en cirkel — det är INTERSECTS som gäller (dokumentationen: "används på samma sätt som
// WITHIN"; radien i meter kräver suffixet m på WGS84). Spår A provar syntaxen på en station innan stickprovet.
const within = (lon: number, lat: number) => {
  if (GEO_WGS84) return `<INTERSECTS name="${GEO_ATTR}" shape="center" value="${lon.toFixed(5)} ${lat.toFixed(5)}" radius="${RADIE_M}m"/>`;
  const [E, N] = sweref99tm(lon, lat);
  return `<INTERSECTS name="${GEO_ATTR}" shape="center" value="${E.toFixed(0)} ${N.toFixed(0)}" radius="${RADIE_M}"/>`;
};
const paus = () => new Promise((ok) => setTimeout(ok, PAUS_MS));
const pct = (a: number, b: number) => (b ? `${(100 * a / b).toFixed(0)} %` : "–");

if (process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  k(within(13.12345678, 56.1).includes('value="13.12346 56.10000"') && within(1, 2).includes(`radius="${RADIE_M}m"`), "WITHIN-filtret");
  k(esc('a&b<"c"') === "a&amp;b&lt;&quot;c&quot;", "XML-escapen");
  k(MANGDER.length === 8 && MANGDER.every((m) => m.ns && m.ver), "åtta datamängder med namespace och version");
  const [E, N] = sweref99tm(15, 60);
  k(Math.abs(E - 500000) < 0.01 && Math.abs(N - 6653180) < 200, `SWEREF99TM på meridianen: E ${E.toFixed(1)} N ${N.toFixed(0)}`);
  const [E2] = sweref99tm(13, 56);
  k(E2 < 500000 && E2 > 350000, `SWEREF99TM väster om meridianen: E ${E2.toFixed(0)}`);
  console.log("✓ självtest: WITHIN-filtret, escapen, datamängderna");
  process.exit(0);
}
if (!KEY) { console.error("TRAFIKVERKET_API_KEY not set"); process.exit(1); }
const alla = process.argv.includes("--alla");
rad(`VÄGDATALAGRETS REKOGNOSERING (kort #301, DECISIONS #472) — ${alla ? "ALLA platser" : "stickprov"}, radie ${RADIE_M} m, ${MANGDER.length} datamängder. Läser, lagrar inget.`);

// ── Spår A: finns datamängderna, och med vilka fält?
rad(`\n=== SPÅR A: en post per datamängd (limit 1) ===`);
const finns = new Map<string, boolean>();
for (const m of MANGDER) {
  const r = await fraga(m, "", 1);
  const falt = r.items[0] ? Object.keys(r.items[0]).filter((k) => k !== "Geometry").join(", ") : "";
  const geo = r.items[0]?.Geometry;
  const geoNycklar = geo && typeof geo === "object" ? Object.keys(geo) : [];
  rad(`A ${m.namn.padEnd(20)} ${m.ns} ${m.ver}  HTTP ${r.status} ${r.ms} ms  rot: ${r.rot}  poster: ${r.items.length}${falt ? `  fält: ${falt}` : ""}${r.fel ? `  FEL: ${r.fel}` : ""}`);
  if (geoNycklar.length) rad(`    Geometry-nycklar: ${geoNycklar.join(", ")}  exempel: ${String(geo[geoNycklar[0]]).slice(0, 70)}`);
  else if (r.items[0]) rad(`    Geometry: ${geo === undefined ? "saknas i posten" : String(geo).slice(0, 90)}`);
  if (m.namn === "Trafik" && geoNycklar.length) {
    const w = geoNycklar.find((k) => /WGS84/i.test(k)), s = geoNycklar.find((k) => /SWEREF/i.test(k));
    if (w) { GEO_ATTR = `Geometry.${w}`; GEO_WGS84 = true; } else if (s) { GEO_ATTR = `Geometry.${s}`; GEO_WGS84 = false; }
    rad(`    ⇒ rumslig fråga med ${GEO_ATTR} (${GEO_WGS84 ? "WGS84, radie i meter" : "SWEREF99TM, projicerat"})`);
  }
  finns.set(m.namn, r.ok && r.items.length > 0);
  await paus();
}

// ── Platserna: stationer (static.json), väglagssegment (vaglag.geojson), vägpunkter (ROUTES ur skuggmotorn, var 2 km).
const statik: any = JSON.parse(readFileSync("static.json", "utf8"));
const stationer: { id: string; lon: number; lat: number }[] = statik.stations;

// ── Syntaxprovet: INTERSECTS center/radius på första stationen, mot Trafik — status, rot och kropp, innan något stickprov.
{
  const m = MANGDER[0], p = stationer[0];
  const r = await fraga(m, within(p.lon, p.lat), 5);
  rad(`\nSyntaxprov INTERSECTS vid station ${p.id} (${p.lon}, ${p.lat}), ${m.namn}: HTTP ${r.status} ${r.ms} ms  rot: ${r.rot}  poster: ${r.items.length}${r.fel ? `  FEL: ${r.fel}` : ""}`);
  if (!r.ok) {
    const w = await fraga(m, within(p.lon, p.lat).replace("INTERSECTS", "WITHIN"), 5);
    rad(`Syntaxprov WITHIN (reserv): HTTP ${w.status}  rot: ${w.rot}  poster: ${w.items.length}${w.fel ? `  FEL: ${w.fel}` : ""}`);
  }
  await paus();
}
const vaglag: any = JSON.parse(readFileSync("vaglag.geojson", "utf8"));
const segment = vaglag.features.map((f: any) => { const c = f.geometry.coordinates; const m = c[Math.floor(c.length / 2)]; return { id: String(f.properties.segment_id), lon: m[0], lat: m[1] }; });
const src = readFileSync("supabase/functions/skuggmotor/main.ts", "utf8");
const start = src.indexOf("const ROUTES: Record<string, [number, number][]> = {"), slut = src.indexOf("\n};", start);
if (start < 0 || slut < 0) throw new Error("ROUTES hittades inte i skuggmotor/main.ts");
const ROUTES: Record<string, [number, number][]> = new Function(`return ${src.slice(src.indexOf("{", start), slut + 2)}`)();
const vagpunkter = Object.entries(ROUTES).filter(([n]) => !/Finland|Norge|Danmark|FI|NO|DK/.test(n)).flatMap(([n, line]) => provpunkter(line).map((p) => ({ id: `${n}@${p.km}`, lon: p.lon, lat: p.lat })));
const urval = <T,>(xs: T[], steg: number) => (alla ? xs : xs.filter((_, i) => i % steg === 0));
const platser = { station: urval(stationer, STEG.station), segment: urval(segment, STEG.segment), vagpunkt: urval(vagpunkter, STEG.vagpunkt) };
rad(`\nPlatser: stationer ${stationer.length} (stickprov ${platser.station.length}) · segment ${segment.length} (${platser.segment.length}) · vägpunkter ${vagpunkter.length} (${platser.vagpunkt.length})`);

// ── Spår B: rumslig träff per datamängd och platstyp.
rad(`\n=== SPÅR B: WITHIN ${RADIE_M} m vid stickprovet — andel platser med träff, objekt per träff, ms per anrop ===`);
const rader: string[] = [];
for (const m of MANGDER.filter((x) => x.ns !== "Road.PavementInfo")) {
  if (!finns.get(m.namn)) { rad(`B ${m.namn}: hoppas över — fanns inte i spår A`); continue; }
  for (const [typ, lista] of Object.entries(platser)) {
    let traff = 0, objekt = 0, fel = 0, ms = 0, exempel = "";
    for (const p of lista) {
      const r = await fraga(m, within(p.lon, p.lat), 20);
      ms += r.ms;
      if (!r.ok) { fel++; if (!exempel) exempel = r.fel; }
      else if (r.items.length) { traff++; objekt += r.items.length; if (!exempel) exempel = m.falt.map((f) => `${f}=${JSON.stringify(r.items[0][f] ?? null)}`).join(" "); }
      await paus();
    }
    const s = `B ${m.namn.padEnd(20)} ${typ.padEnd(9)} träff ${String(traff).padStart(3)}/${lista.length} (${pct(traff, lista.length)}) · objekt/träff ${traff ? (objekt / traff).toFixed(1) : "–"} · ${Math.round(ms / Math.max(1, lista.length))} ms/anrop${fel ? ` · FEL ${fel}` : ""}  ${exempel.slice(0, 140)}`;
    rad(s); rader.push(s);
  }
}

// ── Spår C: beläggningsdatan vid segmentstickprovet — PavementData (beläggningstyp, datum) och MeasurementData20 (spårdjup?).
rad(`\n=== SPÅR C: Road.PavementInfo vid segmentstickprovet — beläggning och spårdjup? ===`);
for (const namn of ["PavementData", "MeasurementData20"]) {
  const pd = MANGDER.find((m) => m.namn === namn)!;
  if (!finns.get(namn)) { rad(`C ${namn}: fanns inte i spår A — hoppas över`); continue; }
  let traff = 0, fel = 0, falt = "", exempel = "";
  for (const p of platser.segment) {
    const r = await fraga(pd, within(p.lon, p.lat), 5);
    if (!r.ok) { fel++; if (!exempel) exempel = r.fel; }
    else if (r.items.length) { traff++; if (!falt) falt = Object.keys(r.items[0]).filter((k) => k !== "Geometry").join(", "); }
    await paus();
  }
  rad(`C ${namn.padEnd(18)} segment träff ${traff}/${platser.segment.length} (${pct(traff, platser.segment.length)})${fel ? ` · FEL ${fel}: ${exempel.slice(0, 160)}` : ""}  fält: ${falt || "–"}`);
}
rad(`\nKlart. Rekognosering: inget utfall, inget lagrat. Hämtaren (nästa steg, kort #301) tar alla platser och skriver data/vagdata/.`);
