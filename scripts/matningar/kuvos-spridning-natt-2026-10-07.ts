// SPRIDNINGEN OCH NATTEN KORSADE — EN LÄSNING I KUVÖSEN (kort #299, DECISIONS #476; Bengts ja 7/10).
// INGEN DOM: inga trösklar rörs. Underlag för två beslut som Bengt och Axel fattar efteråt: spridningsgrindens X (#474/#475) och
// nattbegränsningen (kort #299 förslag 2). Modellen är grind A:s RÅ (`publish/grind-a.ts` med utanOffset — det driften kör, inte
// OFFSET som L2 mätte), hela vintern 2024/25, samma underlag och vakter som L1/L2 (#471).
//   K1 X-KURVAN. Per spridningsband bland punkter med minst två ankare (0–0,5 · 0,5–1 · steg om 0,25 °C från 1 till 4 · > 4) och
//      ett ankare för sig: täckning, MAE, A2, A3. Grinden vid X: täckning av ALLA punkter och felen bland dem som talar.
//   K2 NATTEN FÖR RÅ. A2 per solhöjdsband (natt < −6° · skymning −6…0° · dag > 0°) och månad — L2 för driftens modell.
//   K3 KORSAT. A2 per solhöjdsband och månad bland punkter som grinden vid X = 2, 3 och 4 släpper fram; och reglerna sida vid sida —
//      bara grind, grind + natt, grind + sol under 0°, bara natt, ingen regel — med täckning, MAE, A2 och A3 hela vintern, i februari
//      och i mars.
//   K4 MORGONEN. Punkter 05–08 UTC (06–09 svensk normaltid) i februari och mars: andel per solhöjdsband och A2 med och utan grind.
// Spridningen avrundas till tre decimaler före bandningen (CLAUDE.md: flyttalsläxan 13/9) — skuggan loggar den med en decimal, och
// 2,0 ska aldrig hamna under 2 för att 1,3 − (−0,7) råkade bli 1,9999999. Solhöjden är L2:s USNO-approximation, kopierad ordagrant
// ur kuvos-prognoslagret-2026-10-06.ts (det skriptet ansluter till databasen när det läses in och kan inte importeras).
// Kör: DATABASE_URL=... node --experimental-strip-types scripts/matningar/kuvos-spridning-natt-2026-10-07.ts [--sjalvtest]
import { evaluate, stats, type Station, type Eval } from "../../publish/grind-a.ts";
import { RADVAKT_SQL, karantanSql } from "../../publish/snapshot-core.ts";

const BUCKET_S = 1800;
const NATT_SOLHOJD = -6;                  // förslag 2:s gräns och L2:s band — mätningens gräns, inte produktens
const XS = [0.5, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4];
const XS_KORSAT = [2, 3, 4];
const MORGON_UTC = [5, 6, 7];             // 05:00–07:59 UTC = 06–09 normaltid (sommartiden från 30/3 2025 ger sista veckan 07–10)
const MANADER = [9, 10, 11, 0, 1, 2];     // okt … mar (getUTCMonth)
const MANADSNAMN = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** Solhöjd i grader (USNO:s approximation, fel under en grad) — ordagrant L2:s (#471). */
export function solhojd(lat: number, lon: number, tUnix: number): number {
  const rad = Math.PI / 180, d = (tUnix - 946728000) / 86400;
  const g = (357.529 + 0.98560028 * d) * rad, q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad, e = (23.439 - 0.00000036 * d) * rad;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = ((18.697374558 + 24.06570982441908 * d) % 24 + 24) % 24;
  const ha = ((gmst + lon / 15) * 15) * rad - ra;
  return Math.asin(Math.sin(lat * rad) * Math.sin(dec) + Math.cos(lat * rad) * Math.cos(dec) * Math.cos(ha)) / rad;
}
export const solband = (h: number) => (h < NATT_SOLHOJD ? "natt" : h < 0 ? "skymning" : "dag");
const komma = (x: number) => String(x).replace(".", ",");
export const BAND: [string, number, number][] = [["0–0,5", 0, 0.5], ["0,5–1", 0.5, 1],
  ...Array.from({ length: 12 }, (_, i): [string, number, number] => { const lo = 1 + i * 0.25; return [`${komma(lo)}–${komma(lo + 0.25)}`, lo, lo + 0.25]; }),
  ["> 4", 4, Infinity]];
export const avrundad = (s: number) => Math.round(s * 1000) / 1000;
/** Bandet för en punkt: "ett ankare" eller spridningsbandet för minst två. */
export function band(e: { spridning: number; ankare: number }): string {
  if (e.ankare < 2) return "ett ankare";
  const s = avrundad(e.spridning);
  return BAND.find(([, lo, hi]) => s >= lo && s < hi)![0];
}
/** Grinden vid X talar under X med minst två ankare (TROSKLAR-SKUGGAN §3, #474: "X °C eller mer" tiger). */
export const grind = (e: { spridning: number; ankare: number }, X: number) => e.ankare >= 2 && avrundad(e.spridning) < X;

const pct = (x: number) => `${(100 * x).toFixed(1).replace(".", ",")} %`;
const rad = (s: ReturnType<typeof stats>) => (s.n ? `n ${s.n} · MAE ${s.mae.toFixed(2)} °C · grova ${pct(s.gross)} · frysklassfel ${pct(s.freeze)}` : "n 0");

export type Punkt = Eval & { sol: string; man: number; timme: number };
/** K1–K4 på färdiga punkter — en funktion, så att självtestet kan köra hela utskriften på syntetiska punkter. */
export function lasningar(P: Punkt[]): void {
  const N = P.length;
  // ── K1 X-kurvan.
  console.log("\n═══ K1 — X-kurvan: RÅ per spridningsband (minst två ankare) och ett ankare för sig ═══");
  for (const b of ["ett ankare", ...BAND.map(([n]) => n)]) {
    const del = P.filter((e) => band(e) === b);
    console.log(`  ${b.padEnd(11)} täckning ${pct(del.length / N).padStart(7)} · ${rad(stats(del))}`);
  }
  console.log("  Grinden vid X — täckning av alla punkter, fel bland dem som talar:");
  for (const X of XS) {
    const tal = P.filter((e) => grind(e, X));
    console.log(`  X = ${komma(X).padEnd(5)} täckning ${pct(tal.length / N).padStart(7)} · ${rad(stats(tal))}`);
  }

  // ── K2 natten för RÅ.
  const manaderna = MANADER.filter((m) => P.some((e) => e.man === m));
  const tabell = (urval: Punkt[], rubrik: string) => {
    console.log(`  ${rubrik}`);
    console.log(`  ${"".padEnd(10)}${manaderna.map((m) => MANADSNAMN[m].padStart(16)).join("")}   hela vintern`);
    for (const sb of ["natt", "skymning", "dag"]) {
      const rad2 = urval.filter((e) => e.sol === sb);
      const cell = (m: number) => { const d = rad2.filter((e) => e.man === m); const s = stats(d); return (d.length ? `${pct(s.gross)} (${d.length})` : "—").padStart(16); };
      console.log(`  ${sb.padEnd(10)}${manaderna.map(cell).join("")}   ${rad(stats(rad2))} · andel ${pct(rad2.length / N)}`);
    }
  };
  console.log("\n═══ K2 — natten för driftens modell: RÅ, A2 per solhöjdsband och månad (andel i parentes = antal punkter) ═══");
  tabell(P, "utan grind");

  // ── K3 korsat.
  console.log("\n═══ K3 — korsat: A2 per solhöjdsband och månad bland punkter som grinden släpper fram ═══");
  for (const X of XS_KORSAT) tabell(P.filter((e) => grind(e, X)), `grinden vid X = ${X} °C`);
  console.log("\n  Reglerna sida vid sida — täckning av alla punkter i perioden och felen bland dem som talar:");
  const regler: [string, (e: Punkt) => boolean][] = [
    ["ingen regel", () => true],
    ["bara natt (< −6°)", (e) => e.sol === "natt"],
    ...XS_KORSAT.flatMap((X): [string, (e: Punkt) => boolean][] => [
      [`grind ${X}`, (e) => grind(e, X)],
      [`grind ${X} + natt`, (e) => grind(e, X) && e.sol === "natt"],
      [`grind ${X} + sol < 0°`, (e) => grind(e, X) && e.sol !== "dag"],
    ]),
  ];
  for (const [period, urval] of [["hela vintern", P], ["februari", P.filter((e) => e.man === 1)], ["mars", P.filter((e) => e.man === 2)]] as [string, Punkt[]][]) {
    console.log(`  ${period} (${urval.length} punkter):`);
    for (const [namn, f] of regler) { const tal = urval.filter(f); console.log(`    ${namn.padEnd(20)} täckning ${pct(urval.length ? tal.length / urval.length : 0).padStart(7)} · ${rad(stats(tal))}`); }
  }

  // ── K4 morgonen.
  console.log("\n═══ K4 — morgonen 05–08 UTC (06–09 normaltid), februari och mars ═══");
  for (const m of [1, 2]) {
    const morgon = P.filter((e) => e.man === m && MORGON_UTC.includes(e.timme));
    console.log(`  ${MANADSNAMN[m]}: ${morgon.length} punkter`);
    for (const sb of ["natt", "skymning", "dag"]) {
      const d = morgon.filter((e) => e.sol === sb);
      const a2 = (u: Punkt[]) => (u.length ? pct(stats(u).gross) : "—");
      const g = XS_KORSAT.map((X) => { const tal = d.filter((e) => grind(e, X)); return `grind ${X}: ${a2(tal)} på ${d.length ? pct(tal.length / d.length) : "—"}`; }).join(" · ");
      console.log(`    ${sb.padEnd(9)} andel ${pct(morgon.length ? d.length / morgon.length : 0).padStart(7)} · utan grind ${rad(stats(d))} · ${g}`);
    }
  }
}

if (process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  const midsommar = Date.UTC(2025, 5, 21, 11) / 1000, vinter = Date.UTC(2025, 0, 15, 0) / 1000;
  k(solhojd(56, 13, midsommar) > 55 && solhojd(56, 13, vinter) < -30, "solhöjden midsommar/vinternatt (samma punkter som L2)");
  k(solband(-10) === "natt" && solband(-3) === "skymning" && solband(5) === "dag", "solbanden");
  // Banden täcker [0, ∞) utan glapp och överlapp.
  k(BAND[0][1] === 0 && BAND.every((b, i) => i === 0 || b[1] === BAND[i - 1][2]) && BAND[BAND.length - 1][2] === Infinity, "banden sammanhängande");
  k(BAND.length === 15 && BAND[2][0] === "1–1,25" && BAND[13][0] === "3,75–4", "banden: 0,25-stegen");
  k(band({ spridning: 0, ankare: 1 }) === "ett ankare" && band({ spridning: 0, ankare: 2 }) === "0–0,5", "ett ankare skilt från två eniga");
  k(band({ spridning: 1.2, ankare: 3 }) === "1–1,25" && band({ spridning: 1.25, ankare: 3 }) === "1,25–1,5", "gränsen hör till bandet ovanför");
  k(band({ spridning: 1.3 - -0.7, ankare: 2 }) === "2–2,25" && band({ spridning: 1.9999999999, ankare: 2 }) === "2–2,25", "flyttalsläxan: 2,0 under 2 hamnar ändå i 2–2,25");
  k(!grind({ spridning: 2, ankare: 3 }, 2) && grind({ spridning: 1.9, ankare: 3 }, 2) && !grind({ spridning: 0, ankare: 1 }, 2), "grinden: X tiger, under X talar, ett ankare tiger");
  const syn: Punkt[] = [];
  for (const man of [9, 10, 11, 0, 1, 2]) for (const sol of ["natt", "skymning", "dag"]) for (const [i, spr] of [0, 0.3, 1.1, 2, 3.6, 5].entries())
    syn.push({ measured: -1, pred: -1 + (spr > 3 ? 2.5 : 0.2), ankKm: 5, station: "s", t: 0, spridning: spr, ankare: i === 0 ? 1 : 3,
               sol, man, timme: 6 });
  const skrivet: string[] = []; const orig = console.log; console.log = (x?: unknown) => { skrivet.push(String(x)); };
  try { lasningar(syn); } finally { console.log = orig; }
  k(!skrivet.some((r) => r.includes("NaN")), "utskriften utan NaN");
  k(skrivet.some((r) => r.startsWith("  X = 2 ") && r.includes("täckning  33,3 %")), "grinden vid 2: två av sex syntetiska punkter talar (0,3 och 1,1; ett ankare och 2,0 tiger)");
  k(skrivet.some((r) => r.includes("═══ K4")), "utskriften når K4");
  console.log("✓ självtest: solhöjd, solband, banden, ett ankare, flyttalsläxan, grinden, utskriften K1–K4");
  process.exit(0);
}

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const db = new pg.Client({ connectionString: url });
await db.connect();
await db.query("SET TimeZone = 'UTC'");
await db.query("SET statement_timeout = 0");
const q = async (sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows as any[];
const [{ kuvos }] = await q("SELECT to_regprocedure('kuvos.now()') IS NOT NULL AS kuvos");
if (!kuvos) { console.error("Inte kuvösen (kuvos.now() saknas): läsningen gäller bara vintern 2024/25 (DECISIONS #476)"); process.exit(1); }
const t0 = performance.now();
const min = () => `${((performance.now() - t0) / 60_000).toFixed(1)} min`;
console.log("SPRIDNINGEN OCH NATTEN KORSADE (kort #299, DECISIONS #476), vintern 2024/25, grind A:s RÅ och vakter. Ingen dom.");

// ── Underlaget: som L1/L2 (kuvos-prognoslagret-2026-10-06.ts), utan vinden.
const res = await q(`
  SELECT DISTINCT ON (station_id, b) station_id, ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
    floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c
  FROM weather_observations
  WHERE surface_temp_c IS NOT NULL AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12
    AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}
  ORDER BY station_id, b, sample_time DESC`);
const stations = new Map<string, Station>();
for (const r of res) {
  let s = stations.get(r.station_id);
  if (!s) { s = { lon: +r.lon, lat: +r.lat, series: new Map() }; stations.set(r.station_id, s); }
  s.series.set(Number(r.b), +r.surface_temp_c);
}
await db.end();
console.log(`  ${stations.size} stationer, ${res.length} bucketade avläsningar (${min()})`);
if (stations.size < 100 || res.length < 1000) { console.error("UNDERLAGSVAKT: för lite — arkivet eller vakterna är trasiga"); process.exit(1); }

const RA = evaluate(stations, { utanOffset: true });
if (!RA.length) { console.error("UNDERLAGSVAKT: RÅ gav noll punkter"); process.exit(1); }
const P: Punkt[] = RA.map((e) => {
  const s = stations.get(e.station)!, tu = (e.t + 0.5) * BUCKET_S, d = new Date(tu * 1000);
  return { ...e, sol: solband(solhojd(s.lat, s.lon, tu)), man: d.getUTCMonth(), timme: d.getUTCHours() };
});
console.log(`  RÅ ${P.length} punkter (${min()}) — kontroll mot L1/L2 6/10 (4 353 206 punkter, grova 7,5 %): ${rad(stats(P))}`);

lasningar(P);
console.log(`\nKlart (${min()}). Ingen dom: X och natten beslutas av Bengt och Axel ur tabellerna (DECISIONS #476).`);
