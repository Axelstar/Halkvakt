// GRIND K-B — FRYSKLASSNINGENS UPPSPELNING: tillför klassningen något? (Kort #309, docs/TROSKLAR-FRYSKLASSNINGEN.md §4 K-B och §7.4,
// DECISIONS #363, #491, #510.) K-A passerade 8/10 (täckning 97,8 %, träff 99,3 %, farliga fel 0,5 % vid K1 0 · K2 ±0,5 · K3 20 km).
// K-B frågar det som avgör om klassningen är värd något: vid de BEKRÄFTADE halktillfällena (scripts/uppspelning-facit.ts) — sade
// klassningen "fryser", var den rätt, och var punktmotorn tyst eller mer än 30 min senare? Döms efter en vintermånad (K-C1).
//
//   MODELLEN ÄR K-A:S, alltså grind A:s leave-one-out med K3 som tak: grind-k-a.ts utvardera, importerad — samma kod, ingen kopia.
//   K-B1  andel bekräftade tillfällen där klassningen var rätt OCH punktmotorn tyst eller > 30 min senare — golv 5 %. Delat i
//         nettonytt (punkten tyst) och tidsvinst (punkten sen), som T-B; de slås aldrig ihop i läsningen.
//   K-B2  nya falsklarm som klassningen orsakat: 0 per konstruktion (§1: aldrig egen avtryckare). Mäts ändå: hinkar där klassningen
//         sade "fryser" men ytan låg över gränsen, utan tillfälle inom fönstret efter — det falsklarm det hade varit om den fick tala.
//   K-C   giltighet: minst en vintermånad (30 frostdygn) med frost i minst tre regioner (K-C1); täckningen i varje dom (K-C2);
//         vakterna och spärren utskrivna FÖRE tabellen (K-C3).
// SPÄRREN ÄR STANDARD (grind NT, DECISIONS #363): utan --dom skrivs bara facitsidan — tillfällen, stationer, nätter, regioner, olyckor
// — och giltighetens räkningar; aldrig modellens fyrningar eller någon överensstämmelse. --dom kräver att K-C1 är uppfylld i fönstret,
// annars OAVGJORT. Den första körning som läser ett B-utfall låser trösklarna (§7). Helt läsande.
// Run: DATABASE_URL=... node --experimental-strip-types scripts/grind-k-b.ts [dagar=30] [--dom]
// Självtest utan DB: scripts/grind-k-b.ts --sjalvtest
import { andelSe, utfallGolv, marginalPe, type Utfall } from "../publish/marginal.ts";
import { RADVAKT_SQL, karantanSql } from "../publish/snapshot-core.ts";
import { saknadeDygn, skrivSaknade } from "../publish/vaktdiagnos.ts";
import { K1_GRANS, K2_ZON, K3_KM, utvardera, type Punkt, type Station } from "./grind-k-a.ts";
import { BUCKET_S, FACIT_SQL, OLYCKOR_SQL, FUKT_SQL, PUNKT_YTA_C, b3, falsklarm, sparrRader, giltighet, bandFor, natt,
  type Tillfalle, type Fyrningar, type B3 } from "./uppspelning-facit.ts";

const K_B1_GOLV = 0.05;                       // §4 K-B1
const K_C1_DYGN = 30, K_C1_REGIONER = 3;      // §4 K-C1: en vintermånad med frost i tre regioner
const FORSLAGET = { grans: 0, zon: 0.5, km: 20 };   // K-A:s bästa täckning 8/10 (DECISIONS #491) — mätningens förslag, inte en tröskel
const GIVARVAKT = `air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12 AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}`; // #75 + kort #234

/** Klassningens fyrningar: hinkar där modellen sade "fryser" (pred ≤ K1, utanför zonen). `ratt` där ytan också låg ≤ K1 — det är
 *  det K-B1 räknar; `fel` där ytan låg över — det K-B2 räknar som det falsklarm det hade varit. */
export function klassFyrningar(punkter: Punkt[], grans: number, zon: number): { ratt: Fyrningar; fel: { station: string; b: number }[]; uttalade: number; avstod: number } {
  const ratt: Fyrningar = new Map(); const fel: { station: string; b: number }[] = [];
  let uttalade = 0, avstod = 0;
  for (const p of punkter) {
    if (p.t === undefined) continue;
    if (Math.abs(p.pred - grans) <= zon) { avstod++; continue; }
    uttalade++;
    if (p.pred > grans) continue;                                   // modellen friar: ingen fyrning
    if (p.measured <= grans) { if (!ratt.has(p.station)) ratt.set(p.station, new Set()); ratt.get(p.station)!.add(p.t); }
    else fel.push({ station: p.station, b: p.t });
  }
  return { ratt, fel, uttalade, avstod };
}

/** Punktmotorn i dag ur stationens egen rad: yta ≤ 1 °C och fukt. */
export function punktFyrningar(rader: { station: string; b: number; yta: number; fukt: boolean }[]): Fyrningar {
  const ut: Fyrningar = new Map();
  for (const r of rader) if (r.yta <= PUNKT_YTA_C && r.fukt) { if (!ut.has(r.station)) ut.set(r.station, new Set()); ut.get(r.station)!.add(r.b); }
  return ut;
}

/** K-B1 med marginalvakten: (nettonytt + tidsvinst) / tillfällen mot golvet. */
export function domKB1(r: B3): { andel: number; utfall: Utfall } {
  const andel = r.tillfallen ? (r.nettonytt + r.tidsvinst) / r.tillfallen : 0;
  return { andel, utfall: r.tillfallen ? utfallGolv(andel, K_B1_GOLV, andelSe(andel, r.tillfallen)) : "OAVGJORT" };
}

const pct = (x: number) => `${(100 * x).toFixed(1)} %`;
export function kbRad(km: number, grans: number, zon: number, tackning: number, r: B3, fl: { utan: number }): string {
  const d = domKB1(r);
  return `  ${String(km).padStart(2)} km  ${grans.toFixed(1)}  ±${zon.toFixed(1)}  ${pct(tackning).padStart(7)}  ${String(r.tillfallen).padStart(6)}  ` +
    `${String(r.fangade).padStart(7)}  ${String(r.nettonytt).padStart(5)}  ${String(r.tidsvinst).padStart(5)}  ` +
    `${(pct(d.andel) + marginalPe(andelSe(d.andel, Math.max(1, r.tillfallen)))).padStart(16)}  ${String(fl.utan).padStart(6)}   ${d.utfall}` +
    (km === FORSLAGET.km && grans === FORSLAGET.grans && zon === FORSLAGET.zon ? "   ← K-A:s förslag 8/10" : "");
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  const p = (station: string, t: number, measured: number, pred: number): Punkt => ({ station, t, measured, pred });
  const f = klassFyrningar([p("A", 10, -2, -1.5), p("A", 11, 2, -1.5), p("A", 12, -2, 0.3), p("A", 13, -2, 2), p("B", 10, -1, -0.8)], 0, 0.5);
  k(f.ratt.get("A")?.has(10) === true && f.ratt.get("B")?.has(10) === true && f.fel.length === 1 && f.fel[0].b === 11, "fyrningar: rätt klass där ytan ≤ gränsen, fel klass räknas för sig");
  k(f.uttalade === 4 && f.avstod === 1, `avståendet i zonen räknas (${f.uttalade} uttalade, ${f.avstod} avstod)`);
  k(!klassFyrningar([{ station: "A", measured: -2, pred: -2 }], 0, 0).ratt.size, "en punkt utan hink kan inte fyra");
  const pf = punktFyrningar([{ station: "A", b: 1, yta: 0.5, fukt: true }, { station: "A", b: 2, yta: 0.5, fukt: false }, { station: "A", b: 3, yta: 1.5, fukt: true }]);
  k(pf.get("A")?.size === 1 && pf.get("A")!.has(1), "punktmotorn: yta ≤ 1 och fukt, inget annat");
  // Tio tillfällen: klassningen rätt 2 hinkar före på fem av dem, punkten tyst på tre och 60 min sen på två ⇒ K-B1 50 %.
  const T = 5000, tillf: Tillfalle[] = Array.from({ length: 10 }, (_, i) => ({ station: `S${i}`, b: T, lan: 1 }));
  const kand: Fyrningar = new Map(Array.from({ length: 5 }, (_, i) => [`S${i}`, new Set([T - 2])]));
  const punkt: Fyrningar = new Map([["S3", new Set([T])], ["S4", new Set([T])], ["S7", new Set([T])]]);
  const r = b3(tillf, kand, punkt);
  k(r.fangade === 5 && r.nettonytt === 3 && r.tidsvinst === 2 && r.punktEnsam === 1, `b3 ur facitmodulen: ${JSON.stringify(r)}`);
  const d = domKB1(r);
  k(Math.abs(d.andel - 0.5) < 1e-9 && d.utfall === "KLARAR", `K-B1 50 % klarar golvet 5 % (${d.utfall})`);
  k(domKB1({ tillfallen: 0, fangade: 0, nettonytt: 0, tidsvinst: 0, punktEnsam: 0 }).utfall === "OAVGJORT", "utan tillfällen ingen dom");
  k(domKB1({ tillfallen: 200, fangade: 10, nettonytt: 5, tidsvinst: 5, punktEnsam: 0 }).utfall !== "KLARAR", "5,0 % på 200 tillfällen är inte skiljbart från golvet");
  const rad = kbRad(20, 0, 0.5, 0.978, r, { utan: 4 });
  k(rad.includes("K-A:s förslag") && rad.includes("50.0 %") && rad.includes("KLARAR"), `tabellraden: ${rad.trim()}`);
  k(K1_GRANS.join(",") === "0,0.5,1" && K3_KM.join(",") === "15,20,50", "svepen är K-A:s (importerade)");
  k(typeof utvardera === "function", "modellen är grind K-A:s utvardera, importerad");
  console.log("✓ självtest: klassningens fyrningar (rätt och fel), punktmotorn, K-B1 med marginalvakten, tabellraden, svepen ur K-A");
  process.exit(0);
}

if (korsSjalv) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const DOM = process.argv.includes("--dom");
  const DAGAR = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 30);
  const TILL = Date.now(), FRAN = TILL - DAGAR * 864e5;
  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
  await pool.query("SET statement_timeout = '600s'");
  const q = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows as any[];
  console.log(`Grind K-B — frysklassningens uppspelning (kort #309), ${new Date(FRAN).toISOString().slice(0, 10)} → ${new Date(TILL).toISOString().slice(0, 16)}Z, ` +
    `${DOM ? "DOMLÄGE (låser trösklarna, §7)" : "SPÄRRAT: bara räkningar på facitsidan (DECISIONS #363)"}\n`);
  // Saknade dygn (kort #322, DECISIONS #511): raderingen tar dygn äldre än 14 ur databasen och får aldrig krympa fönstret tyst.
  skrivSaknade(await saknadeDygn(q, "weather_observations", DAGAR));

  const res = await q(`
    SELECT DISTINCT ON (station_id, b) station_id, ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
      floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c, ${FUKT_SQL} AS fukt
    FROM weather_observations
    WHERE surface_temp_c IS NOT NULL AND sample_time >= $1 AND sample_time < $2 AND ${GIVARVAKT}
    ORDER BY station_id, b, sample_time DESC`, [new Date(FRAN).toISOString(), new Date(TILL).toISOString()]);
  const stationer = new Map<string, Station>();
  const lat = new Map<string, number>();
  const punktRader: { station: string; b: number; yta: number; fukt: boolean }[] = [];
  const frostdygn = new Map<number, Set<string>>([[0, new Set()], [1, new Set()], [2, new Set()], [3, new Set()]]);
  for (const r of res) {
    let s = stationer.get(r.station_id);
    if (!s) { s = { id: r.station_id, lon: +r.lon, lat: +r.lat, series: new Map() }; stationer.set(r.station_id, s); lat.set(r.station_id, +r.lat); }
    const b = Number(r.b), yta = +r.surface_temp_c;
    s.series.set(b, yta);
    punktRader.push({ station: r.station_id, b, yta, fukt: !!r.fukt });
    if (yta <= 0) frostdygn.get(bandFor(+r.lat))!.add(natt(b * BUCKET_S));
  }
  console.log(`Underlag: ${stationer.size} stationer, ${res.length} bucketade avläsningar efter #75:s vakt, radvakten och karantänen.`);
  if (stationer.size < 100) { console.error("UNDERLAGSVAKT: för få stationer. Avbryter."); await pool.end(); process.exit(1); }

  const tillf: Tillfalle[] = (await q(FACIT_SQL, [new Date(FRAN).toISOString(), new Date(TILL).toISOString()]))
    .filter((r) => stationer.has(r.station_id)).map((r) => ({ station: r.station_id, b: Number(r.b), lan: r.lan === null ? null : Number(r.lan) }));
  const olyckor = Number((await q(OLYCKOR_SQL, [new Date(FRAN).toISOString(), new Date(TILL).toISOString()]))[0].n);
  for (const r of sparrRader(tillf, olyckor, lat, frostdygn)) console.log(r);
  const g = giltighet(frostdygn, K_C1_DYGN, K_C1_REGIONER);
  console.log(`K-C1 (giltighet, räkningar): frostdygn ${g.dygn}/${K_C1_DYGN} · regioner med frost ${g.regioner}/${K_C1_REGIONER} ⇒ ${g.ok ? "en vintermånad finns i fönstret" : "ingen vintermånad än"}`);
  if (!DOM) {
    console.log(`\nSPÄRRAT. Klassningens fyrningar och K-B1–K-B2 visas först i domläget (--dom), när K-C1 är uppfylld — på Bengts ord.`);
    await pool.end(); process.exit(0);
  }
  if (!g.ok) {
    console.log(`\n⊘ OAVGJORT — K-C1 håller inte i fönstret: ingen dom, inget utfall läses (K-C3). Ovan bara räkningar.`);
    await pool.end(); process.exit(0);
  }

  // ---- DOMEN (§4 K-B) ---- Första läsningen av ett B-utfall låser trösklarna (§7).
  const punkt = punktFyrningar(punktRader);
  console.log(`\n${"─".repeat(78)}\nDOMEN — K-B på ${tillf.length} bekräftade halktillfällen. Punktmotorn fyrade på ${[...punkt.values()].reduce((a, s) => a + s.size, 0)} stationshinkar.\n`);
  console.log(`  K3    K1     K2   täckn.  tillf.  fångade  netto  tidsv.    K-B1 (golv ${pct(K_B1_GOLV)})    K-B2*   utfall`);
  for (const km of K3_KM) {
    const punkter = utvardera(stationer, km);
    for (const grans of K1_GRANS) for (const zon of K2_ZON) {
      const f = klassFyrningar(punkter, grans, zon);
      const r = b3(tillf, f.ratt, punkt), fl = falsklarm(f.fel, tillf);
      console.log(kbRad(km, grans, zon, f.uttalade + f.avstod ? f.uttalade / (f.uttalade + f.avstod) : 0, r, fl));
    }
  }
  console.log(`\n  * K-B2 är 0 per konstruktion — klassningen får aldrig tala ensam (§1). Talet är hinkar där den sade "fryser" med ytan över`);
  console.log(`    gränsen och utan bekräftat tillfälle inom 90 min: det falsklarm den hade orsakat om den fick tala.`);
  console.log(`  Netto = punktmotorn tyst · tidsvinst = punktmotorn > 30 min senare. K-B1 räknar båda; läs dem delat (TRENDEN T-B).`);
  console.log(`  Domslutet fälls av Bengt mot den här utskriften; ett ja ger ingen rätt att varna (§1, K4 = E0).`);
  await pool.end();
}
