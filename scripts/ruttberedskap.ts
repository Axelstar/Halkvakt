// RUTTBEREDSKAPEN — vilken av skuggflottans tjugo bilar kan pröva vilken grind, och när?
// (Bengts order 12/9: "gör beredskapstabellen".)
//
// VARFÖR. Skuggflottan (Axels idé 29/8) kör tjugo låtsasbilar genom den riktiga motorn mot den
// riktiga snapshoten, var 30:e minut, dygnet runt. Fem av de skuggkolumner vi skrivit tröskel-
// dokument för ska köras just där: trenden (#88), tillståndsskattaren och efterhalkan (#89),
// rimfrosten (#46) och SMHI-förstärkaren (#95 d). I vinter kommer någon att fråga "vilken bil
// ska vi titta på?" — och att läsa alla tjugo är inte ett svar.
//
// VAD DEN SVARAR PÅ, en rad per rutt:
//   · GRIND A  — hur stor del av rutten ligger i varje ankarband, särskilt det OFÖRKLARADE
//                7–15 km-bandet (MAE 1,41 °C, 18,4 % grova fel, DECISIONS #119). Den rutt som
//                tillbringar mest tid där är den som kan säga något om varför.
//   · T-A/#46  — hur många stationer inom räckvidd som redan haft vägyta ≤ 0 °C, efter #75:s
//                givarvakt. Frosten kommer inte överallt samtidigt; den rutt som fryser först
//                är den som hinner ge T-A sitt underlag inom gallringens sju dygn.
//   · W-A      — hur många stationer längs rutten som bär vind och sikt alls (bara ~42 % av
//                arkivraderna gör det, DECISIONS #120), och högsta uppmätta byvind.
//   · F-A      — KAPACITETSKOLL, inte rangordning. Se nedan.
//
// VAD DEN INTE GÖR. Den rangordnar inte F-A (förstärkaren). Den grinden behöver vintervarningar,
// och arkivet bär noll SNOW_ICE och noll ICING (DECISIONS #122) — att rangordna rutter på ett
// underlag som är tomt vore att hitta på. Vad kolumnen visar är att geometrin FUNGERAR: skär
// rutten några varningsområden vi faktiskt arkiverat? Gör den inte det är matchningen trasig,
// och det vill vi veta innan vintern, inte under den.
//
// RUTTERNA LÄSES UR SKUGGMOTORN, de kopieras inte. Ändras flottan följer tabellen med.
// Självtestet fäller om parsningen slutar hitta dem — det är driftvakten.
//
// Helt läsande. Run: DATABASE_URL=... node --experimental-strip-types scripts/ruttberedskap.ts [dagar=30]
// Självtest utan DB: scripts/ruttberedskap.ts --sjalvtest

import { readFileSync } from "node:fs";

const STEG_KM = 2;               // provpunkt var annan kilometer längs rutten
const RACKVIDD_KM = 15;          // station räknas till rutten inom detta avstånd
const MIN_STATIONER = 5;         // underlagsvakt per rutt
const GIVARVAKT = "air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12"; // #75

export const BAND: [string, number][] = [["0–7", 7], ["7–15", 15], ["15–20", 20], [">20", Infinity]];

export function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371, d2r = Math.PI / 180;
  const dLa = (lat2 - lat1) * d2r, dLo = (lon2 - lon1) * d2r;
  const a = Math.sin(dLa / 2) ** 2 +
    Math.cos(lat1 * d2r) * Math.cos(lat2 * d2r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type Punkt = [number, number];

/** Läser ROUTES ur skuggmotorns källa. Kastar hellre än gissar — se driftvakten i självtestet. */
export function lasRutter(kod: string): Record<string, Punkt[]> {
  const start = kod.indexOf("const ROUTES: Record<string, [number, number][]> = {");
  if (start < 0) throw new Error("hittar inte ROUTES i skuggmotorn — har den bytt form?");
  const slut = kod.indexOf("\n};", start);
  if (slut < 0) throw new Error("hittar inte slutet på ROUTES");
  const kropp = kod.slice(kod.indexOf("{", start), slut + 2)
    .replace(/,(\s*})/g, "$1");           // efterföljande komma är giltig TS men inte JSON
  const o = JSON.parse(kropp) as Record<string, Punkt[]>;
  if (!Object.keys(o).length) throw new Error("ROUTES tolkades som tom");
  return o;
}

/** Förtätar en grov linje till provpunkter var `stegKm`. Behåller alltid ändpunkterna. */
export function forta(linje: Punkt[], stegKm = STEG_KM): Punkt[] {
  const ut: Punkt[] = [];
  for (let i = 0; i < linje.length - 1; i++) {
    const [x1, y1] = linje[i], [x2, y2] = linje[i + 1];
    const d = haversineKm(x1, y1, x2, y2);
    const n = Math.max(1, Math.round(d / stegKm));
    for (let k = 0; k < n; k++) ut.push([x1 + ((x2 - x1) * k) / n, y1 + ((y2 - y1) * k) / n]);
  }
  ut.push(linje[linje.length - 1]);
  return ut;
}

export function langdKm(linje: Punkt[]): number {
  let s = 0;
  for (let i = 0; i < linje.length - 1; i++) s += haversineKm(...linje[i], ...linje[i + 1]);
  return s;
}

export function bandet(avstandKm: number): string {
  for (const [namn, tak] of BAND) if (avstandKm <= tak) return namn;
  return BAND[BAND.length - 1][0];
}

/** Underlagsvakt per rutt. null = rutten kan inte pröva något, och ska säga det. */
export function dom<T>(stationer: number, svar: T): T | null {
  return stationer >= MIN_STATIONER ? svar : null;
}

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)} %` : "–");

// ── Självtest med känd sanning, utan DB. Läser den riktiga skuggmotorn — det ÄR driftvakten.
if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — geometri, förtätning, band och ruttparsningen mot skuggmotorn\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); ok = false; }
    else console.log(`  ok: ${namn} = ${fick}`);
  };
  k("en breddgrad ≈ 111 km", Math.round(haversineKm(15, 60, 15, 61)), 111);
  const sthlmGbg = Math.round(haversineKm(18.07, 59.33, 11.97, 57.71));
  k("Stockholm–Göteborg 390–410 km", sthlmGbg > 390 && sthlmGbg < 410, true);
  // Förtätningen: en linje på ~111 km med 2 km steg ska ge ~56 punkter, ändpunkterna kvar.
  const f = forta([[15, 60], [15, 61]]);
  k("förtätning ~56 punkter", Math.abs(f.length - 56) <= 2, true);
  k("första punkten bevarad", f[0][1], 60);
  k("sista punkten bevarad", f[f.length - 1][1], 61);
  k("längden bevarad", Math.round(langdKm(f)), 111);
  k("en punkt utan sträcka ger sig själv", forta([[15, 60]]).length, 1);
  // Banden.
  k("0 km i första bandet", bandet(0), "0–7");
  k("7 km i första bandet", bandet(7), "0–7");
  k("7,1 km i andra", bandet(7.1), "7–15");
  k("18 km i tredje", bandet(18), "15–20");
  k("40 km i sista", bandet(40), ">20");
  k("underlagsvakt: 4 stationer", dom(4, "svar"), null);
  k("underlagsvakt: 5 stationer", dom(5, "svar"), "svar");
  // DRIFTVAKTEN: rutterna läses ur skuggmotorn, inte ur en kopia här.
  const kod = readFileSync(new URL("../supabase/functions/skuggmotor/index.ts", import.meta.url), "utf8");
  const rutter = lasRutter(kod);
  k("tjugo svenska rutter", Object.keys(rutter).length, 20);
  k("E14 Sundsvall→Åre finns", "E14 Sundsvall→Åre" in rutter, true);
  const alla = Object.values(rutter).flat();
  k("alla punkter ligger i Sverige",
    alla.every(([x, y]) => x > 10 && x < 25 && y > 55 && y < 69), true);
  k("ingen rutt har färre än två punkter",
    Object.values(rutter).every((r) => r.length >= 2), true);
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK: geometrin stämmer mot känd sanning, och de tjugo rutterna");
  console.log("lästes ur skuggmotorn — inte ur en kopia som kan glida isär.");
  process.exit(0);
}

// ── Skarpt (läser bara).
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const DAGAR = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 30);
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await pool.query("SET statement_timeout = '300s'");
const q = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows as any[];

const rutter = lasRutter(readFileSync(new URL("../supabase/functions/skuggmotor/index.ts", import.meta.url), "utf8"));
console.log(`Ruttberedskapen — skuggflottans ${Object.keys(rutter).length} bilar mot grindarna (${DAGAR} dygns fönster)\n`);

// Stationerna en gång: position + det varje grind behöver veta om dem.
const st = await q(`SELECT station_id,
    ST_X((array_agg(geom ORDER BY sample_time DESC))[1]) AS lon,
    ST_Y((array_agg(geom ORDER BY sample_time DESC))[1]) AS lat,
    count(*) FILTER (WHERE surface_temp_c <= 0 AND ${GIVARVAKT})::int AS frostrader,
    min(surface_temp_c) FILTER (WHERE ${GIVARVAKT}) AS kallast,
    count(*) FILTER (WHERE wind_gust_ms IS NOT NULL)::int AS vindrader,
    max(wind_gust_ms) AS max_by
  FROM weather_observations WHERE sample_time > now() - $1 * interval '1 day'
  GROUP BY station_id`, [DAGAR]);
console.log(`Underlag: ${st.length} stationer med mätvärden i fönstret.`);
const stationer = st.map((r) => ({
  lon: Number(r.lon), lat: Number(r.lat), frost: Number(r.frostrader),
  kallast: r.kallast === null ? null : Number(r.kallast),
  vind: Number(r.vindrader), maxBy: r.max_by === null ? null : Number(r.max_by),
}));
if (stationer.length < 100) {
  console.error(`UNDERLAGSVAKT: ${stationer.length} stationer är för få för att svara på något. Avbryter.`);
  await pool.end(); process.exit(1);
}

type Rad = {
  namn: string; km: number; band: Record<string, number>; punkter: number;
  nara: number; medFrost: number; frostrader: number; kallast: number | null;
  medVind: number; maxBy: number | null; omraden: number; vinterOmraden: number;
};
const rader: Rad[] = [];

for (const [namn, linje] of Object.entries(rutter)) {
  const pp = forta(linje);
  const band: Record<string, number> = Object.fromEntries(BAND.map(([n]) => [n, 0]));
  for (const [x, y] of pp) {
    let b = Infinity;
    for (const s of stationer) { const d = haversineKm(x, y, s.lon, s.lat); if (d < b) b = d; }
    band[bandet(b)]++;
  }
  // Stationer inom räckvidd av rutten (mot de förtätade punkterna, inte mot brytpunkterna).
  const nara = stationer.filter((s) => pp.some((p) => haversineKm(p[0], p[1], s.lon, s.lat) <= RACKVIDD_KM));
  const medFrost = nara.filter((s) => s.frost > 0);
  const kallaste = nara.map((s) => s.kallast).filter((x): x is number => x !== null);
  const byar = nara.map((s) => s.maxBy).filter((x): x is number => x !== null);

  const wkt = `LINESTRING(${linje.map(([x, y]) => `${x} ${y}`).join(",")})`;
  const w = (await q(`SELECT count(DISTINCT area_id)::int AS omraden,
      count(DISTINCT area_id) FILTER (WHERE event_code ~* 'SNOW|ICE|ICING')::int AS vinter
    FROM smhi_warnings_history
    WHERE geom IS NOT NULL AND ST_Intersects(geom, ST_GeomFromText($1, 4326))`, [wkt]))[0];

  rader.push({
    namn, km: Math.round(langdKm(linje)), band, punkter: pp.length,
    nara: nara.length, medFrost: medFrost.length,
    frostrader: medFrost.reduce((a, s) => a + s.frost, 0),
    kallast: kallaste.length ? Math.min(...kallaste) : null,
    medVind: nara.filter((s) => s.vind > 0).length,
    maxBy: byar.length ? Math.max(...byar) : null,
    omraden: Number(w.omraden), vinterOmraden: Number(w.vinter),
  });
}

const p = (s: string, n: number) => s.padEnd(n);
const h = (s: string, n: number) => s.padStart(n);

console.log(`\nGRIND A — var ligger rutten i ankaravstånd? (det OFÖRKLARADE bandet är 7–15 km)`);
console.log(`  ${p("rutt", 28)} ${h("km", 5)} ${h("0–7", 6)} ${h("7–15", 6)} ${h("15–20", 6)} ${h(">20", 6)}`);
for (const r of [...rader].sort((a, b) => b.band["7–15"] / b.punkter - a.band["7–15"] / a.punkter)) {
  console.log(`  ${p(r.namn, 28)} ${h(String(r.km), 5)} ${h(pct(r.band["0–7"], r.punkter), 6)} ` +
    `${h(pct(r.band["7–15"], r.punkter), 6)} ${h(pct(r.band["15–20"], r.punkter), 6)} ${h(pct(r.band[">20"], r.punkter), 6)}`);
}

console.log(`\nT-A OCH RIMFROSTEN — vem fryser först? (stationer inom ${RACKVIDD_KM} km, efter #75:s givarvakt)`);
console.log(`  ${p("rutt", 28)} ${h("stationer", 10)} ${h("m. frost", 9)} ${h("frostrader", 11)} ${h("kallast", 9)}`);
for (const r of [...rader].sort((a, b) => b.frostrader - a.frostrader)) {
  const d = dom(r.nara, true);
  console.log(`  ${p(r.namn, 28)} ${h(String(r.nara), 10)} ${h(d ? String(r.medFrost) : "–", 9)} ` +
    `${h(d ? String(r.frostrader) : "–", 11)} ${h(r.kallast !== null ? `${r.kallast.toFixed(1)} °C` : "–", 9)}` +
    `${d ? "" : "   ⊘ för få stationer"}`);
}

console.log(`\nW-A — vem bär vind och sikt? (bara ~42 % av arkivraderna gör det, #120)`);
console.log(`  ${p("rutt", 28)} ${h("stationer", 10)} ${h("m. vind", 9)} ${h("andel", 7)} ${h("högsta by", 10)}`);
for (const r of [...rader].sort((a, b) => (b.maxBy ?? 0) - (a.maxBy ?? 0))) {
  console.log(`  ${p(r.namn, 28)} ${h(String(r.nara), 10)} ${h(String(r.medVind), 9)} ` +
    `${h(pct(r.medVind, r.nara), 7)} ${h(r.maxBy !== null ? `${r.maxBy.toFixed(1)} m/s` : "–", 10)}`);
}

console.log(`\nF-A — KAPACITETSKOLL, inte rangordning`);
console.log(`  Arkivet bär noll SNOW_ICE och noll ICING (#122), så ingen rutt kan rangordnas för`);
console.log(`  förstärkaren i dag. Kolumnen visar att GEOMETRIN fungerar: skär rutten några`);
console.log(`  varningsområden vi faktiskt arkiverat? Noll överallt = matchningen är trasig.`);
console.log(`  ${p("rutt", 28)} ${h("områden", 8)} ${h("varav vinter", 13)}`);
for (const r of [...rader].sort((a, b) => b.omraden - a.omraden)) {
  console.log(`  ${p(r.namn, 28)} ${h(String(r.omraden), 8)} ${h(String(r.vinterOmraden), 13)}`);
}

// ── Läsningen: en mening per grind, och den ska peka ut EN bil.
const basta = (f: (r: Rad) => number) => [...rader].sort((a, b) => f(b) - f(a))[0];
const ga = basta((r) => r.band["7–15"] / r.punkter);
const ta = basta((r) => (dom(r.nara, 1) ? r.frostrader : -1));
const wa = basta((r) => r.maxBy ?? -1);
const skarNagot = rader.some((r) => r.omraden > 0);

console.log(`\nLÄSNINGEN — vilken bil ska tittas på för vilken fråga`);
console.log(`  GRIND A:  ${ga.namn} — ${pct(ga.band["7–15"], ga.punkter)} av rutten i det oförklarade`);
console.log(`            7–15 km-bandet. Den bilen kan säga något om varför mittenbandet är sämst.`);
console.log(`  T-A/#46:  ${ta.namn} — ${ta.frostrader} frostrader på ${ta.medFrost} stationer,`);
console.log(`            kallast ${ta.kallast !== null ? ta.kallast.toFixed(1) + " °C" : "–"}. Den fryser först och hinner inom gallringens sju dygn.`);
console.log(`  W-A:      ${wa.namn} — högsta byvind ${wa.maxBy !== null ? wa.maxBy.toFixed(1) + " m/s" : "–"} på ${wa.medVind} givare.`);
console.log(`            Körs om efter första höststormen, inte förr (#120).`);
console.log(`  F-A:      ingen rangordning — arkivet saknar vintervarningar. Geometrin ${skarNagot ? "FUNGERAR" : "SKÄR INGET, undersök"}.`);
console.log(`\n  Att läsa med: tabellen säger var en grind KAN prövas, aldrig vad den kommer att visa.`);
console.log(`  Ankarbanden vandrar dessutom med stationsbortfall — kör om den när vintern satt sig.`);
await pool.end();
