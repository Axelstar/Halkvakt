// GRIND R-B — RIMFROSTENS UPPSPELNING: räddar grenen mer än den kostar? (Kort #46, docs/TROSKLAR-RIMFROST.md §4 R-B och §8 steg 4,
// DECISIONS #363, #491, #510.) R-A passerade spärren 8/10 på det svenska arkivet: 163 episoder, 394 stationstimmar, 61 stationer;
// R-A3 73 % kl 03–07 och R-A5 6 % klarar, R-A4 stödjer utstrålningshypotesen. Signalen är fysik. R-B frågar om den är värd något.
//
//   VILLKORET OCH EPISODERNA ÄR R-A:S: grind-r-a.ts uppfyller/episoder, importerade genom samma femdelade givarvakt (§3). Grenen
//   "fyrar" när uthålligheten U är nådd: fyrningens hink är episodens första rad + U.
//   R-B1  nettonytt: bekräftade halktillfällen (scripts/uppspelning-facit.ts) där grenen fyrade före tillfället och punktmotorn var
//         tyst eller > 30 min senare — golv 5 % av tillfällena; delat i netto och tidsvinst.
//   R-B2  falsklarm: fyrningar utan bekräftat tillfälle vid stationen inom 90 min — tak 25 %. Hårdare än halksträckans mått, för
//         rimfrosten är en förutsägelse (§4). Facit är omklassningen, inte stationens egen yta: ytan ingår redan i villkoret.
//   R-B3  extra röst: fyrningar per station och natt där punktmotorn teg — redovisas, fäller inte (DECISIONS #103).
//   R5    molnklassen hämtas i efterhand ur SMHI (publish/moln.ts) för den bästa kombinationens episoder, som R-A4; klar · klar+mellan
//         · alla redovisas var för sig. "Okänd" (ingen molnstation inom 50 km) räknas bara i "alla".
//   R-C   giltighet: minst 15 frostdygn (R-C1) i minst 3 regioner (R-C2); täckningen efter vakten som andel (R-C3); OAVGJORT före
//         tabellen (R-C4).
// SPÄRREN ÄR STANDARD (grind NT, DECISIONS #363): utan --dom skrivs facitsidan, giltighetens räkningar och episodantalen per
// kombination (som R-A under sin spärr) — aldrig R-B1–R-B3. Den första körning som läser ett B-utfall låser trösklarna (§9).
// Run: DATABASE_URL=... node --experimental-strip-types scripts/grind-r-b.ts [dagar=30] [--dom]
// Självtest utan DB och nät: scripts/grind-r-b.ts --sjalvtest
import { andelSe, utfallGolv, utfallTak, marginalPe, type Utfall } from "../publish/marginal.ts";
import { RADVAKT_SQL, karantanSql } from "../publish/snapshot-core.ts";
import { molnForPunkter, type Molnklass } from "../publish/moln.ts";
import { R1_MARGINAL, R2_YTA, R3_UTHALL, episoder, type Rad, type Episod } from "./grind-r-a.ts";
import { BUCKET_S, FACIT_SQL, OLYCKOR_SQL, FUKT_SQL, PUNKT_YTA_C, FONSTER_HINKAR, b3, falsklarm, sparrRader, giltighet, bandFor, natt,
  type Tillfalle, type Fyrningar, type B3 } from "./uppspelning-facit.ts";

const R_B1_GOLV = 0.05, R_B2_TAK = 0.25;      // §4 R-B
const R_C1_DYGN = 15, R_C2_REGIONER = 3;      // §4 R-C
const R5_KLASSER: [string, (m: Molnklass | undefined) => boolean][] = [
  ["klar", (m) => m === "klar"], ["klar+mellan", (m) => m === "klar" || m === "mellan"], ["alla", () => true]];

/** Grenens fyrningar ur episoderna: hinken där uthålligheten nåddes (första raden + U). */
export function grenFyrningar(ep: Episod[], uthall: number): { station: string; b: number }[] {
  return ep.filter((e) => e.startT !== undefined).map((e) => ({ station: e.station, b: Math.floor((e.startT! + uthall * 60) / BUCKET_S) }));
}
export const somKarta = (f: { station: string; b: number }[]): Fyrningar => {
  const ut: Fyrningar = new Map();
  for (const x of f) { if (!ut.has(x.station)) ut.set(x.station, new Set()); ut.get(x.station)!.add(x.b); }
  return ut;
};
/** Punktmotorn i dag ur stationens egen rad: yta ≤ 1 °C och fukt. */
export function punktFyrningar(rader: { station: string; b: number; yta: number; fukt: boolean }[]): Fyrningar {
  return somKarta(rader.filter((r) => r.yta <= PUNKT_YTA_C && r.fukt).map((r) => ({ station: r.station, b: r.b })));
}
/** R-B3: fyrningar per station och natt där punktmotorn teg i fönstret runt fyrningen. */
export function extraRost(fyrningar: { station: string; b: number }[], punkt: Fyrningar): number {
  const ut = new Set<string>();
  for (const f of fyrningar) {
    const s = punkt.get(f.station); let tyst = true;
    if (s) for (let b = f.b - FONSTER_HINKAR; b <= f.b + FONSTER_HINKAR; b++) if (s.has(b)) { tyst = false; break; }
    if (tyst) ut.add(`${f.station}|${natt(f.b * BUCKET_S)}`);
  }
  return ut.size;
}
export function domRB(r: B3, fl: { fyrningar: number; utan: number }): { b1: number; b1Utfall: Utfall; b2: number; b2Utfall: Utfall } {
  const b1 = r.tillfallen ? (r.nettonytt + r.tidsvinst) / r.tillfallen : 0;
  const b2 = fl.fyrningar ? fl.utan / fl.fyrningar : 0;
  return { b1, b1Utfall: r.tillfallen ? utfallGolv(b1, R_B1_GOLV, andelSe(b1, r.tillfallen)) : "OAVGJORT",
    b2, b2Utfall: fl.fyrningar ? utfallTak(b2, R_B2_TAK, andelSe(b2, fl.fyrningar)) : "OAVGJORT" };
}
const pct = (x: number) => `${(100 * x).toFixed(1)} %`;
export function rbRad(namn: string, ep: number, r: B3, fl: { fyrningar: number; utan: number }, rost: number): string {
  const d = domRB(r, fl);
  return `  ${namn.padEnd(18)} ${String(ep).padStart(6)}  ${String(r.tillfallen).padStart(6)}  ${String(r.fangade).padStart(7)}  ${String(r.nettonytt).padStart(5)}  ${String(r.tidsvinst).padStart(5)}  ` +
    `${(pct(d.b1) + marginalPe(andelSe(d.b1, Math.max(1, r.tillfallen)))).padStart(16)} ${d.b1Utfall.padEnd(8)}  ` +
    `${(pct(d.b2) + marginalPe(andelSe(d.b2, Math.max(1, fl.fyrningar)))).padStart(16)} ${d.b2Utfall.padEnd(8)}  ${String(rost).padStart(5)}`;
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  const rad = (min: number, yta: number, station = "A"): Rad => ({ station, t: min * 60, yta, dagg: yta + 1, rh: 95, timme: 4, natt: "n", lon: 15, lat: 60 });
  const ep = episoder([rad(0, -1), rad(30, -2), rad(60, -3)], 0, 0, 60);
  k(ep.length === 1 && ep[0].startT === 0, "episoderna ur R-A bär starttiden");
  const f = grenFyrningar(ep, 60);
  k(f.length === 1 && f[0].b === Math.floor(3600 / BUCKET_S), `fyrningen ligger vid första raden + U (${JSON.stringify(f)})`);
  k(grenFyrningar([{ station: "A", natt: "n", minuter: 60, kallastTimme: 4, kallastT: 0, lon: 0, lat: 0 }], 30).length === 0, "en episod utan starttid kan inte fyra");
  const punkt = punktFyrningar([{ station: "A", b: 1, yta: 0.5, fukt: true }, { station: "A", b: 2, yta: 0.5, fukt: false }, { station: "B", b: 9, yta: 2, fukt: true }]);
  k(punkt.get("A")?.size === 1 && !punkt.has("B"), "punktmotorn: yta ≤ 1 och fukt");
  // Tio tillfällen; grenen fyrar 2 hinkar före på fyra, punkten tyst på tre av dem och sen (60 min) på en; två fyrningar utan tillfälle.
  const T = 5000, tillf: Tillfalle[] = Array.from({ length: 10 }, (_, i) => ({ station: `S${i}`, b: T, lan: 1 }));
  const fyr = [...Array.from({ length: 4 }, (_, i) => ({ station: `S${i}`, b: T - 2 })), { station: "Z", b: T }, { station: "S0", b: T + 9 }];
  const pk: Fyrningar = new Map([["S3", new Set([T])]]);
  const r = b3(tillf, somKarta(fyr), pk), fl = falsklarm(fyr, tillf);
  k(r.fangade === 4 && r.nettonytt === 3 && r.tidsvinst === 1, `b3: ${JSON.stringify(r)}`);
  k(fl.fyrningar === 6 && fl.utan === 2, `falsklarm: två fyrningar utan tillfälle (${JSON.stringify(fl)})`);
  const d = domRB(r, fl);
  k(Math.abs(d.b1 - 0.4) < 1e-9 && d.b1Utfall === "KLARAR" && Math.abs(d.b2 - 2 / 6) < 1e-9 && d.b2Utfall !== "KLARAR", `R-B1 40 % klarar, R-B2 33 % över taket 25 % (${d.b1Utfall}, ${d.b2Utfall})`);
  // S0 fyrar två gånger samma natt (T − 2 och T + 9 ligger 5,5 h isär) och räknas en gång; S3 har punkten i fönstret; S1, S2, Z räknas.
  k(extraRost(fyr, pk) === 4, `R-B3: fyrningar per station och natt där punkten teg — S0 en gång, S3 inte (${extraRost(fyr, pk)})`);
  k(domRB({ tillfallen: 0, fangade: 0, nettonytt: 0, tidsvinst: 0, punktEnsam: 0 }, { fyrningar: 0, utan: 0 }).b1Utfall === "OAVGJORT", "utan tillfällen ingen dom");
  k(rbRad("0.0 1.0 30", 6, r, fl, 5).includes("40.0 %") && R1_MARGINAL.join(",") === "0,0.5,1" && R3_UTHALL.join(",") === "30,60", "tabellraden och svepen ur R-A");
  console.log("✓ självtest: fyrningen vid första raden + U, punktmotorn, R-B1/R-B2 med marginalvakt, R-B3 per station och natt, svepen ur R-A");
  process.exit(0);
}

if (korsSjalv) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const DOM = process.argv.includes("--dom");
  const DAGAR = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 30);
  const TILL = Date.now(), FRAN = TILL - DAGAR * 864e5;
  const P = [new Date(FRAN).toISOString(), new Date(TILL).toISOString()];
  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
  await pool.query("SET statement_timeout = '600s'");
  const q = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows as any[];
  console.log(`Grind R-B — rimfrostens uppspelning (kort #46), svenska arkivet, ${P[0].slice(0, 10)} → ${P[1].slice(0, 16)}Z, ` +
    `${DOM ? "DOMLÄGE (låser trösklarna, §9)" : "SPÄRRAT: bara räkningar (DECISIONS #363)"}\n`);

  // Alla rader genom #75, radvakten och karantänen: punktmotorn, frostdygnen och täckningens nämnare.
  const alla = await q(`
    SELECT DISTINCT ON (station_id, b) station_id, ST_Y(geom::geometry) lat, floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b,
      surface_temp_c AS yta, ${FUKT_SQL} AS fukt, (dewpoint_c IS NOT NULL) AS dagg
    FROM weather_observations w
    WHERE surface_temp_c IS NOT NULL AND sample_time >= $1 AND sample_time < $2
      AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12 AND ${RADVAKT_SQL} AND ${karantanSql("w")}
    ORDER BY station_id, b, sample_time DESC`, P);
  // Grenens rader: R-A:s femdelade vakt (§3), svensk tid.
  const rader = await q(`
    SELECT station_id, extract(epoch FROM sample_time)::bigint AS t, surface_temp_c AS yta, dewpoint_c AS dagg, humidity_pct AS rh,
      ST_X(geom) AS lon, ST_Y(geom) AS lat, extract(hour FROM sample_time AT TIME ZONE 'Europe/Stockholm')::int AS timme,
      ((sample_time AT TIME ZONE 'Europe/Stockholm') - interval '12 hours')::date::text AS natt
    FROM weather_observations w
    WHERE sample_time >= $1 AND sample_time < $2 AND surface_temp_c IS NOT NULL AND dewpoint_c IS NOT NULL
      AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12 AND ${RADVAKT_SQL} AND ${karantanSql("w")}
      AND surface_temp_c - dewpoint_c >= -5 AND humidity_pct IS NOT NULL AND humidity_pct >= 90
    ORDER BY station_id, t`, P);
  const data: Rad[] = rader.map((r) => ({ station: r.station_id, t: Number(r.t), yta: Number(r.yta), dagg: Number(r.dagg), rh: Number(r.rh),
    timme: Number(r.timme), natt: r.natt, lon: Number(r.lon), lat: Number(r.lat) }));
  const lat = new Map<string, number>(); const frostdygn = new Map<number, Set<string>>([[0, new Set()], [1, new Set()], [2, new Set()], [3, new Set()]]);
  const punktRader: { station: string; b: number; yta: number; fukt: boolean }[] = []; let medDagg = 0;
  for (const r of alla) {
    lat.set(r.station_id, +r.lat); const b = Number(r.b), yta = +r.yta;
    punktRader.push({ station: r.station_id, b, yta, fukt: !!r.fukt }); if (r.dagg) medDagg++;
    if (yta <= 0) frostdygn.get(bandFor(+r.lat))!.add(natt(b * BUCKET_S));
  }
  const stationer = new Set(alla.map((r) => r.station_id));
  console.log(`Underlag: ${stationer.size} stationer, ${alla.length} hinkar efter #75, radvakten och karantänen; ${rader.length} rader genom grenens femdelade vakt ` +
    `(R-C3 täckning: ${medDagg ? pct(new Set(data.map((d) => `${d.station}|${Math.floor(d.t / BUCKET_S)}`)).size / medDagg) : "—"} av hinkarna med daggpunkt).`);
  if (stationer.size < 100) { console.error("UNDERLAGSVAKT: för få stationer. Avbryter."); await pool.end(); process.exit(1); }

  const tillf: Tillfalle[] = (await q(FACIT_SQL, P)).filter((r) => stationer.has(r.station_id))
    .map((r) => ({ station: r.station_id, b: Number(r.b), lan: r.lan === null ? null : Number(r.lan) }));
  const olyckor = Number((await q(OLYCKOR_SQL, P))[0].n);
  for (const r of sparrRader(tillf, olyckor, lat, frostdygn)) console.log(r);
  const g = giltighet(frostdygn, R_C1_DYGN, R_C2_REGIONER);
  console.log(`R-C1/R-C2 (giltighet, räkningar): frostdygn ${g.dygn}/${R_C1_DYGN} · regioner med frost ${g.regioner}/${R_C2_REGIONER} ⇒ ${g.ok ? "giltigt fönster" : "inte giltigt än"}`);

  type Ut = { m: number; y: number; u: number; ep: Episod[] };
  const svep: Ut[] = [];
  for (const m of R1_MARGINAL) for (const y of R2_YTA) for (const u of R3_UTHALL) svep.push({ m, y, u, ep: episoder(data, m, y, u) });
  console.log(`\nGRENENS EPISODER per kombination (räkningar, som R-A): ` + svep.map((s) => `${s.m}/${s.y}/${s.u}: ${s.ep.length}`).join(" · "));
  if (!DOM) {
    console.log(`\nSPÄRRAT. R-B1–R-B3 visas först i domläget (--dom), när R-C1–R-C2 är uppfyllda — på Bengts ord (R-C4).`);
    await pool.end(); process.exit(0);
  }
  if (!g.ok) {
    console.log(`\n⊘ OAVGJORT — R-C1/R-C2 håller inte i fönstret: ingen dom, inget utfall läses (R-C4). Ovan bara räkningar.`);
    await pool.end(); process.exit(0);
  }

  // ---- DOMEN (§4 R-B) ---- Första läsningen av ett B-utfall låser trösklarna (§9).
  const punkt = punktFyrningar(punktRader);
  console.log(`\n${"─".repeat(78)}\nDOMEN — R-B på ${tillf.length} bekräftade halktillfällen.\n`);
  console.log(`  R1/R2/R3           episod  tillf.  fångade  netto  tidsv.     R-B1 (golv ${pct(R_B1_GOLV)})            R-B2 (tak ${pct(R_B2_TAK)})         R-B3`);
  for (const s of svep) {
    const f = grenFyrningar(s.ep, s.u);
    console.log(rbRad(`${s.m.toFixed(1)}  ${s.y.toFixed(1)}  ${String(s.u).padStart(3)}`, s.ep.length, b3(tillf, somKarta(f), punkt), falsklarm(f, tillf), extraRost(f, punkt)));
  }
  // R5 på den bästa kombinationen (flest episoder), molnet ur SMHI i efterhand — som R-A4.
  const bast = svep.reduce((a, b) => (b.ep.length > a.ep.length ? b : a));
  console.log(`\nR5 MOLNKLASSEN på kombinationen ${bast.m}/${bast.y}/${bast.u} (${bast.ep.length} episoder), molnet ur SMHI metobs 16 vid kallaste stunden:`);
  try {
    const klass = await molnForPunkter(bast.ep.map((e) => ({ lon: e.lon, lat: e.lat, tMin: e.kallastT })));
    bast.ep.forEach((e, i) => { e.moln = klass[i]; });
    for (const [namn, tar] of R5_KLASSER) {
      const ep = bast.ep.filter((e) => tar(e.moln)), f = grenFyrningar(ep, bast.u);
      console.log(rbRad(namn, ep.length, b3(tillf, somKarta(f), punkt), falsklarm(f, tillf), extraRost(f, punkt)));
    }
    console.log(`  okänd molnklass (ingen molnstation inom 50 km): ${bast.ep.filter((e) => e.moln === "okänd").length} episoder — bara i "alla".`);
  } catch (e) {
    console.log(`  SMHI svarade inte: ${String((e as Error).message).slice(0, 90)} — R5 är OKÖRD, inte ett negativt svar.`);
  }
  console.log(`\n  Netto = punktmotorn tyst · tidsvinst = punktmotorn > 30 min senare; R-B1 räknar båda, läs dem delat. R-B2:s facit är`);
  console.log(`  omklassningen inom 5 km, inte stationens yta. R-B3 fäller inte (DECISIONS #103). Domslutet fälls av Bengt mot den här`);
  console.log(`  utskriften; ett ja gör rimfrosten till en andra gren i icing_point bakom sin grind — rösten är Axels (§8 steg 6).`);
  await pool.end();
}
