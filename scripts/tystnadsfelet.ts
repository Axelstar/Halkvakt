// TYSTNADSFELET — kort #98 (docs/TROSKLAR-TYSTNADSFEL.md; Bengts order 14/9, issue #119 steg 4–5; §3 gjord mätbar 24/9,
// DECISIONS #330 på Bengts "gör förslaget").
//
// MÅTTET VÄNDER PÅ VANLIG UTVÄRDERING: det räknar TYSTNADENS FEL, inte larmens träff. Enheten är ett bekräftat
// halttillfälle ur facit, med plats och tid, och frågan är vad systemet sa där och då — och om det hade signal.
//
// BYGGFORMEN ÄR PRINCIPENS, inte ett val: spara det som inte går att räkna om, räkna om det som går. Facit och
// skuggloggen är append-only, signalerna finns i väderarkivet (timupplösning efter sju dygn) — utom TRENDEN, som bara
// lever sju dygn i trend_kandidater: den signalen är okänd för äldre händelser, och det sägs i utskriften. En läsande
// knapp, ingen tabell, ingen deploy. Snubbeltråden står på kort #155.
//
// VAD SOM ÄNDRADES 24/9 (DECISIONS #330), och varför:
//  · FACIT läses ur den delade händelselistan (publish/skuggfacit.ts) — samma lista som grind S-B dömer segmentprognosen
//    mot: SMHI, halka i situation_archive, väglag (kod ≥ 2 eller motorns halkord), förarens "stämde", kamerafacit.
//    Två mått på två listor vore två sanningar.
//  · RÄCKVIDDEN är 7 km (grind A:s skarpaste band; "nära en VViS-station", §6) — inte ankarradien 50 km, som säger
//    hur långt bort en station får vara som GRANNE i en interpolation. Annan storhet, annat tal, eget namn.
//  · TYST avgörs mot flottans kadens: varje rutt körs var 3,5:e timme (7 slots × 30 min), så "inget larm inom ±60 min"
//    hade kallat nästan allt tyst. Nu: det senaste skuggvarvet på en rutt som passerar inom facitradien, högst 4 h före
//    händelsen; inget varv ⇒ OKÄNT, aldrig tyst.
//  · SIGNALERNA har tal ur redan fastställda dokument: kondensation yta − dagg ≤ gap (TROSKLAR-TRENDEN §2:s svep),
//    trend lutning30 ≥ 0,8 °C och yta ≤ +3 som når 1 °C inom 2 h (betans startvärden, DECISIONS #222), station visade
//    risk = motorns egen regel yta ≤ 1 °C OCH fukt, regn inom N h (TROSKLAR-OVERGANGAR §2:s svep).
//  · ORSAKSKOLUMN: en tyst miss med signal säger vilken tröskel som teg — fukt (#46 kondensation / #89 regn), tid (#88),
//    avstånd (risken fanns vid stationen men händelsen låg > 2 km bort) eller yttröskeln (stationen 1–3 °C och fuktig,
//    inom 2 km). Bara den sista betyder "sänk yttröskeln".
//  · TRE KLASSER: oursäktlig (signal i data) · ursäktlig (BEVISAD yttre orsak: radarn såg nederbörd i ett segment inom
//    5 km inom ±1 h medan stationen var torr — snöbyn) · okänd (ingen signal, ingen bevisad orsak — saltbilen bor här).
//  · TVÅ LÄGEN (blindningen): --underlag (standard) skriver antal; --dom skriver andelar, paret i §4 och priset i §5.
//
// §5:s PRIS i domläget: tillkomna varningstillfällen per kandidattröskel — episoder vid stationer inom räckvidd med yta
// ≤ X och fukt, utöver dagens 1 °C. Om de var FALSKA kan bara kamerafacit (bar/våt) och förarens "nej" säga; talet är
// tillkomna tillfällen, inte falsklarm, och det står så.
//
// Run: DATABASE_URL=... node --experimental-strip-types scripts/tystnadsfelet.ts [dagar=30] [--underlag|--dom]
// Självtest utan DB: scripts/tystnadsfelet.ts --sjalvtest

import { DAGGGAP } from "../publish/trenden.ts";
import { N_SVEP } from "../publish/tillstand.ts";
import { REGN_UTLOSARE_MMH } from "../publish/snapshot-core.ts";
import { narmastLangs, FRYS_C } from "../engine/src/segment.ts";
import { skuggmotornsRutter, hamtaHandelser, FACIT_KM, type Rutter, type Handelse } from "../publish/skuggfacit.ts";

const RACKVIDD_KM = 7;       // §6: nära en VViS-station — grind A:s skarpaste band. INTE ankarradien (MAX_KM 50).
const FLOTTA_H = 4;          // skuggflottan besöker varje rutt var 3,5:e h — inom den tiden finns ett varv att fråga
const TREND_FALL = 0.8;      // °C per 30 min, betans startvärde (DECISIONS #222)
const TREND_YTA_MAX = 3;     // °C, betans startband (DECISIONS #222)
const TREND_H = 2;           // når frysgränsen inom två timmar (4 × 30 min)
const YTA_NARA_MAX = 3;      // °C: "yttröskeln teg" = stationen låg mellan frysgränsen och +3 med fukt
const RADAR_KM = 5;          // snöbyn: radarsegment inom detta avstånd
const MIN_FACIT = 20, MIN_PERIODER = 3, PERIOD_GAP_D = 2;   // minsta underlag — samma golv som grind C1
const PRIS_SVEP = [1.0, 1.5, 2.0, 2.5];                    // §5: kandidattrösklar för ytan
const FUKT_SQL =
  "(rain OR snow OR (precipitation IS NOT NULL AND precipitation <> ''" +
  " AND lower(precipitation) NOT IN ('no','dry')))";

/** MOTORNS egen halklista, ordagrant ur engine.ts (SLIPPERY_INFO); kontraktsgrinden jämför strängen tecken för tecken. */
const HALKORD = "is|halka|halkrisk|halkig|halt|mycket besvärligt";
/** Stammarna som räknas även INUTI sammansättningar ("Nysnö", "Rimfrost") — speglar motorns SLIPPERY_STAM (kort #97). */
const HALKSTAM = "snö|frost";

export type Signaler = {
  daggpunktsgapSlots: boolean;   // yta − dagg ≤ gap vid närmaste station inom räckvidd
  trendenPekade: boolean;        // lutning30 ≥ 0,8, yta ≤ 3, når 1 °C inom 2 h (#88)
  stationenVisadeRisk: boolean;  // yta ≤ 1 °C OCH fukt — motorns egen regel
  regnInomN: boolean;            // regn inom N h (#89)
  stationNaraKm: number | null;  // avstånd händelse → station som bar signalen
  ytaNara: boolean;              // stationen 1–3 °C med fukt: yttröskeln själv
};
export type Klass = "oursäktlig" | "ursäktlig" | "okänd";
export type Orsak = "fukt" | "tid" | "avstånd" | "yttröskel";

export function oursaktlig(s: Signaler): boolean {
  return s.daggpunktsgapSlots || s.trendenPekade || s.stationenVisadeRisk || s.regnInomN || s.ytaNara;
}
/** Vilken tröskel teg? Flera kan gälla; alla skrivs. */
export function orsaker(s: Signaler): Orsak[] {
  const ut: Orsak[] = [];
  if (s.daggpunktsgapSlots || s.regnInomN) ut.push("fukt");
  if (s.trendenPekade) ut.push("tid");
  if (s.stationenVisadeRisk) ut.push(s.stationNaraKm !== null && s.stationNaraKm > FACIT_KM ? "avstånd" : "yttröskel");
  else if (s.ytaNara) ut.push("yttröskel");
  return ut;
}
/** Tre klasser (§3, DECISIONS #330). `radar` = bevisad yttre orsak; `null` signaler = inget underlag alls. */
export function klassa(s: Signaler | null, radar: boolean): Klass {
  if (s === null) return "okänd";
  if (oursaktlig(s)) return "oursäktlig";
  return radar ? "ursäktlig" : "okänd";
}
/** Halkperioder: händelser mer än PERIOD_GAP_D dygn isär är olika perioder (samma regel som grind S-C). */
export function halkperioder(tider: Date[]): number {
  const ts = [...tider].sort((a, b) => +a - +b);
  let n = 0;
  for (let i = 0; i < ts.length; i++) if (i === 0 || +ts[i] - +ts[i - 1] > PERIOD_GAP_D * 86400_000) n++;
  return n;
}
/** §5: episoder per kandidattröskel ur rader (station, tid, yta, fukt) — sammanhängande rader ≤ X med fukt, gap > 2 h bryter. */
export function episoderPerTroskel(rader: { st: string; t: Date; yta: number; fukt: boolean }[]): Map<number, number> {
  const ut = new Map<number, number>();
  const sorted = [...rader].sort((a, b) => a.st.localeCompare(b.st) || +a.t - +b.t);
  for (const X of PRIS_SVEP) {
    let n = 0; let cur: { st: string; t: Date } | null = null;
    for (const r of sorted) {
      const inne = r.fukt && r.yta <= X;
      if (!inne) continue;
      if (!cur || cur.st !== r.st || +r.t - +cur.t > 2 * 3600_000) n++;
      cur = { st: r.st, t: r.t };
    }
    ut.set(X, n);
  }
  return ut;
}
const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)} %` : "–");

if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — klassningen mot känd sanning\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); ok = false; }
    else console.log(`  ok: ${namn} = ${fick}`);
  };
  const ingen: Signaler = { daggpunktsgapSlots: false, trendenPekade: false, stationenVisadeRisk: false, regnInomN: false, stationNaraKm: 1.0, ytaNara: false };
  k("ingen signal och ingen radar är OKÄND, inte ursäktlig", klassa(ingen, false), "okänd");
  k("ingen signal men radarn såg nederbörd är ursäktlig (snöbyn)", klassa(ingen, true), "ursäktlig");
  k("daggpunktsgapet ensamt gör den oursäktlig", klassa({ ...ingen, daggpunktsgapSlots: true }, false), "oursäktlig");
  k("trenden ensam räcker", klassa({ ...ingen, trendenPekade: true }, false), "oursäktlig");
  k("stationens risk ensam räcker", klassa({ ...ingen, stationenVisadeRisk: true }, false), "oursäktlig");
  k("regn inom N ensamt räcker — §3:s fjärde signal", klassa({ ...ingen, regnInomN: true }, false), "oursäktlig");
  k("yttröskeln själv (1–3 °C fuktigt inom 2 km) räcker", klassa({ ...ingen, ytaNara: true }, false), "oursäktlig");
  k("signal slår radar: oursäktlig även om radarn såg något", klassa({ ...ingen, regnInomN: true }, true), "oursäktlig");
  k("utan underlag är svaret okänt, aldrig en gissning", klassa(null, true), "okänd");
  k("orsak: kondensation ⇒ fukt", orsaker({ ...ingen, daggpunktsgapSlots: true }).join(","), "fukt");
  k("orsak: risk vid station 5 km bort ⇒ avstånd", orsaker({ ...ingen, stationenVisadeRisk: true, stationNaraKm: 5 }).join(","), "avstånd");
  k("orsak: risk vid station 1 km bort ⇒ yttröskel", orsaker({ ...ingen, stationenVisadeRisk: true, stationNaraKm: 1 }).join(","), "yttröskel");
  k("orsak: regn + trend ⇒ fukt,tid", orsaker({ ...ingen, regnInomN: true, trendenPekade: true }).join(","), "fukt,tid");
  k("daggpunktssvepet är TROSKLAR-TRENDEN §2:s", DAGGGAP.join("·"), "0·0.5·1·2");
  k("regnfönstret är TROSKLAR-OVERGANGAR §2:s", N_SVEP.join("·"), "1·2·3·4");
  const d = (h: number) => new Date(Date.UTC(2026, 11, 1, h));
  k("halkperioder: tre dygn i rad är en period", halkperioder([d(0), d(24), d(48)]), 1);
  k("halkperioder: hopp på tre dygn ger två", halkperioder([d(0), d(24), d(24 * 5)]), 2);
  const rader = [
    { st: "a", t: d(0), yta: 0.5, fukt: true }, { st: "a", t: d(1), yta: 0.8, fukt: true },     // en episod ≤ 1
    { st: "a", t: d(10), yta: 1.8, fukt: true },                                                // en till vid ≤ 2
    { st: "b", t: d(0), yta: 2.4, fukt: true }, { st: "b", t: d(0.5), yta: 2.3, fukt: false },  // en vid ≤ 2,5; torr rad räknas inte
  ];
  const ep = episoderPerTroskel(rader);
  k("pris: episoder vid 1,0 °C", ep.get(1.0), 1);
  k("pris: episoder vid 2,0 °C", ep.get(2.0), 2);
  k("pris: episoder vid 2,5 °C", ep.get(2.5), 3);
  k("skuggmotorns rutter lästa (20)", Object.keys(skuggmotornsRutter()).length, 20);
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK: tre klasser, orsakskolumnen, svepen är andras, halkperioder, prisets episoder, rutterna.");
  process.exit(0);
}

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const DAGAR = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 30);
const LAGE: "underlag" | "dom" = process.argv.includes("--dom") ? "dom" : "underlag";
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await pool.query("SET statement_timeout = '600s'");
const q = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows as any[];
const rutter: Rutter = skuggmotornsRutter();
const H = 3600_000;

async function avsnitt(namn: string, fn: () => Promise<void>) {
  try { await fn(); }
  catch (e) { console.log(`\n${namn}\n  ✗ FRÅGAN KUNDE INTE STÄLLAS: ${(e as Error).message}`); }
}

console.log(`TYSTNADSFELET — kort #98 mot facitstacken (${DAGAR} dygns fönster) · läge: ${LAGE.toUpperCase()}\n`);

// ── T1 FACIT: den delade händelselistan (publish/skuggfacit.ts), per källa.
let facit: Handelse[] = [];
await avsnitt("T1 FACIT", async () => {
  console.log("T1 FACIT — bekräftade halttillfällen inom facitradien av skuggrutterna, per källa (publish/skuggfacit.ts)");
  facit = await hamtaHandelser(q, rutter, DAGAR, { ord: HALKORD, stam: HALKSTAM });
  const per = new Map<string, number>();
  for (const f of facit) per.set(f.kalla, (per.get(f.kalla) ?? 0) + 1);
  console.log(`  ${facit.length} tillfällen — ${[...per].map(([k, n]) => `${k} ${n}`).join(" · ") || "inga"}`);
  console.log(`  ⚠️ olyckor utan halkord räknas inte: en olycka är facit på att något hände, inte på att det var halt.`);
});

// ── T2 RÄCKVIDDSVILLKORET (§6): nära en VViS-station — 7 km, inte ankarradien.
type Inom = Handelse & { stationId: string; stationKm: number };
let inomRackvidd: Inom[] = [];
await avsnitt("T2 RÄCKVIDDSVILLKORET", async () => {
  console.log(`\nT2 RÄCKVIDDSVILLKORET — bara där systemet HADE en chans (§6, ${RACKVIDD_KM} km till närmaste station)`);
  if (!facit.length) { console.log("  ⊘ inget facit att pröva."); return; }
  const km: number[] = [];
  for (const f of facit) {
    const [d] = await q(`SELECT w.station_id, round((ST_Distance(
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, w.geom::geography) / 1000)::numeric, 1) AS km
      FROM weather_latest w ORDER BY w.geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326) LIMIT 1`, [f.lon, f.lat]);
    if (!d) continue;
    km.push(Number(d.km));
    if (Number(d.km) <= RACKVIDD_KM) inomRackvidd.push({ ...f, stationId: String(d.station_id), stationKm: Number(d.km) });
  }
  km.sort((a, b) => a - b);
  console.log(`  ${inomRackvidd.length} av ${facit.length} inom ${RACKVIDD_KM} km · median ${km.length ? km[Math.floor(km.length / 2)] : "–"} km`);
  console.log(`  Utanför räckvidd är ett TÄCKNINGSproblem (#93), inte ett tröskelproblem, och utesluts med flit.`);
});

// ── T3 VAD SYSTEMET SA: det senaste skuggvarvet på en rutt som passerar händelsen, högst FLOTTA_H timmar före.
let tysta: Inom[] = [], okantTyst = 0;
await avsnitt("T3 VAD SYSTEMET SA", async () => {
  console.log(`\nT3 VAD SYSTEMET SA — tyst eller inte? (senaste varvet inom ${FLOTTA_H} h på en rutt inom ${FACIT_KM} km; larm inom ${FACIT_KM} km)`);
  const [pos] = await q(`SELECT count(*) FILTER (WHERE a ? 'lon')::int AS med_pos, count(*)::int AS alla
    FROM shadow_log s, jsonb_array_elements(s.alerts) a WHERE s.run_at > now() - $1 * interval '1 day'`, [DAGAR]);
  console.log(`  larm med position i skuggloggen: ${pos.med_pos} av ${pos.alla}`);
  if (Number(pos.alla) && !Number(pos.med_pos)) {
    console.log(`  ⊘ KAN INTE AVGÖRAS — inget larm bär position (kort #157). Att räkna alla som tysta vore en artefakt.`); return;
  }
  for (const f of inomRackvidd) {
    const passerar = Object.entries(rutter).filter(([, line]) => narmastLangs(f, line).km <= FACIT_KM).map(([namn]) => namn);
    if (!passerar.length) { okantTyst++; continue; }
    const [v] = await q(`SELECT max(run_at) AS senast FROM shadow_log
      WHERE land = 'SE' AND route = ANY($1::text[]) AND run_at BETWEEN $2::timestamptz - interval '${FLOTTA_H} hours' AND $2::timestamptz`,
      [passerar, f.t]);
    if (!v?.senast) { okantTyst++; continue; }
    const [sa] = await q(`SELECT count(*)::int AS n FROM shadow_log s, jsonb_array_elements(s.alerts) a
      WHERE s.land = 'SE' AND s.route = ANY($1::text[]) AND s.run_at BETWEEN $2::timestamptz - interval '${FLOTTA_H} hours' AND $2::timestamptz
        AND a->>'kind' IN ('icing_point', 'slippery_segment') AND a ? 'lon'
        AND ST_DWithin(ST_SetSRID(ST_MakePoint((a->>'lon')::float8, (a->>'lat')::float8), 4326)::geography,
                       ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5)`, [passerar, f.t, f.lon, f.lat, FACIT_KM * 1000]);
    if (!Number(sa.n)) tysta.push(f);
  }
  console.log(`  TYSTA MISSAR inom räckvidd: ${tysta.length} av ${inomRackvidd.length}${okantTyst ? ` · OKÄNT (inget varv på en rutt inom ${FACIT_KM} km inom ${FLOTTA_H} h): ${okantTyst}` : ""}`);
});

// ── T4 SIGNALERNA (§3): tre klasser och orsakskolumnen, över svepen.
type Rad = { f: Inom; klass: Klass; orsak: Orsak[]; trendOkand: boolean };
const perCell = new Map<string, Rad[]>();
await avsnitt("T4 SIGNALERNA", async () => {
  console.log(`\nT4 SIGNALERNA — teg systemet TROTS signal? (§3, fyra signaler med tal, tre klasser, orsak per tröskel)`);
  if (!tysta.length) {
    console.log("  ⊘ inga tysta missar att klassa. Instrumentet är kört, men utan material.");
    console.log(`  Svepen: daggpunktsgap ${DAGGGAP.join(" · ")} °C, regnfönster N ${N_SVEP.join(" · ")} h. Ingen punkt väljs förrän Ö-B dömt.`);
    return;
  }
  for (const gap of DAGGGAP) for (const N of N_SVEP) {
    const rader: Rad[] = [];
    for (const f of tysta) {
      const [s] = await q(`
        WITH st AS (SELECT station_id, geom FROM weather_latest WHERE station_id = $7),
        w AS (SELECT * FROM weather_observations w, st WHERE w.station_id = st.station_id
              AND w.sample_time BETWEEN $3::timestamptz - interval '2 hours' AND $3::timestamptz)
        SELECT
          (SELECT bool_or(surface_temp_c - dewpoint_c <= $4) FROM w WHERE dewpoint_c IS NOT NULL) AS gap,
          (SELECT bool_or(surface_temp_c <= $6 AND ${FUKT_SQL}) FROM w) AS risk,
          (SELECT bool_or(surface_temp_c > $6 AND surface_temp_c <= $8 AND ${FUKT_SQL}) FROM w) AS nara,
          (SELECT bool_or(rain OR snow OR rain_sum_mm > 0) FROM weather_observations w2, st WHERE w2.station_id = st.station_id
             AND w2.sample_time BETWEEN $3::timestamptz - $5 * interval '1 hour' AND $3::timestamptz) AS regn,
          (SELECT count(*) > 0 FROM trend_kandidater t, st WHERE t.station_id = st.station_id
             AND t.observed_at BETWEEN $3::timestamptz - interval '${TREND_H} hours' AND $3::timestamptz
             AND t.lutning30_c >= $9 AND t.surface_temp_c <= $10 AND t.surface_temp_c - 4 * t.lutning30_c <= $6) AS trend,
          (SELECT count(*) > 0 FROM trend_kandidater t, st WHERE t.station_id = st.station_id
             AND t.observed_at BETWEEN $3::timestamptz - interval '${TREND_H} hours' AND $3::timestamptz) AS trend_underlag,
          (SELECT count(*) > 0 FROM w) AS underlag,
          (SELECT bool_or(rp.rate_mean_mmh >= $11) FROM radar_precip rp JOIN road_conditions c USING (segment_id)
             WHERE rp.observed_at BETWEEN $3::timestamptz - interval '1 hour' AND $3::timestamptz + interval '1 hour'
               AND c.geom IS NOT NULL AND ST_DWithin(c.geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $12)) AS radar
        `, [f.lon, f.lat, f.t, gap, N, FRYS_C, f.stationId, YTA_NARA_MAX, TREND_FALL, TREND_YTA_MAX, REGN_UTLOSARE_MMH, RADAR_KM * 1000]);
      if (!s.underlag) { rader.push({ f, klass: "okänd", orsak: [], trendOkand: !s.trend_underlag }); continue; }
      const sig: Signaler = { daggpunktsgapSlots: !!s.gap, trendenPekade: !!s.trend, stationenVisadeRisk: !!s.risk,
        regnInomN: !!s.regn, stationNaraKm: f.stationKm, ytaNara: !!s.nara };
      rader.push({ f, klass: klassa(sig, !!s.radar && !s.regn), orsak: orsaker(sig), trendOkand: !s.trend_underlag });
    }
    perCell.set(`${gap}|${N}`, rader);
  }
  console.log("  gap \\ N   " + N_SVEP.map((n) => `N = ${n} h`.padStart(22)).join(""));
  for (const gap of DAGGGAP) {
    const celler = N_SVEP.map((N) => {
      const r = perCell.get(`${gap}|${N}`)!;
      const o = r.filter((x) => x.klass === "oursäktlig").length, u = r.filter((x) => x.klass === "ursäktlig").length, k = r.length - o - u;
      return `${o} / ${u} / ${k}`.padStart(22);
    });
    console.log(`  ${String(gap).padEnd(8)} ` + celler.join(""));
  }
  console.log(`  Cellerna är ANTAL oursäktliga / ursäktliga / okända av ${tysta.length} tysta missar.`);
  const bas = perCell.get(`${DAGGGAP[0]}|${N_SVEP[0]}`)!;
  const orsakN = new Map<Orsak, number>();
  for (const r of bas) for (const o of r.orsak) orsakN.set(o, (orsakN.get(o) ?? 0) + 1);
  console.log(`  Orsak (gap ${DAGGGAP[0]}, N ${N_SVEP[0]} h; flera kan gälla): ${[...orsakN].map(([o, n]) => `${o} ${n}`).join(" · ") || "inga"}`);
  const trendOkand = bas.filter((r) => r.trendOkand).length;
  if (trendOkand) console.log(`  ⚠️ trendsignalen okänd för ${trendOkand} — trend_kandidater bär sju dygn; äldre händelser kan inte prövas på tid.`);
});

// ── T5 UNDERLAG, PARET (§4) OCH PRISET (§5).
const perioder = halkperioder(inomRackvidd.map((f) => f.t));
console.log(`\nT5 UNDERLAGET — ${inomRackvidd.length}/${MIN_FACIT} tillfällen inom räckvidd, ${perioder}/${MIN_PERIODER} halkperioder`
  + ` → ${inomRackvidd.length >= MIN_FACIT && perioder >= MIN_PERIODER ? "uppfyllt" : "inte än"}`);
if (LAGE === "underlag") {
  console.log(`\nUNDERLAG, INGA ANDELAR: paret i §4 och priset i §5 läses vid utsatt tid, eller med --dom på Bengts order.`);
} else {
  const bas = perCell.get(`${DAGGGAP[0]}|${N_SVEP[0]}`) ?? [];
  const o = bas.filter((x) => x.klass === "oursäktlig").length, u = bas.filter((x) => x.klass === "ursäktlig").length, k = bas.length - o - u;
  console.log(`\nPARET (§4, gap ${DAGGGAP[0]}, N ${N_SVEP[0]} h): tyst miss-frekvens ${pct(tysta.length, inomRackvidd.length)} ·`
    + ` oursäktliga ${pct(o, bas.length)} · ursäktliga ${pct(u, bas.length)} · okända ${pct(k, bas.length)}`);
  await avsnitt("PRISET", async () => {
    const rader = await q(`
      WITH r AS (SELECT ST_GeomFromText($2, 4326) AS g),
      st AS (SELECT station_id FROM weather_latest w, r WHERE ST_DWithin(w.geom::geography, r.g::geography, $3))
      SELECT w.station_id AS st, w.sample_time AS t, w.surface_temp_c AS yta, ${FUKT_SQL} AS fukt
      FROM weather_observations w JOIN st USING (station_id)
      WHERE w.sample_time > now() - $1 * interval '1 day' AND w.surface_temp_c IS NOT NULL AND w.surface_temp_c <= $4
        AND w.air_temp_c IS NOT NULL AND w.surface_temp_c >= w.air_temp_c - 12`,
      [DAGAR, ruttWktLokal(rutter), RACKVIDD_KM * 1000, Math.max(...PRIS_SVEP)]);
    const ep = episoderPerTroskel(rader.map((r) => ({ st: String(r.st), t: new Date(r.t), yta: Number(r.yta), fukt: !!r.fukt })));
    const bas1 = ep.get(PRIS_SVEP[0]) ?? 0;
    console.log(`\nPRISET (§5) — tillkomna varningstillfällen vid stationer inom ${RACKVIDD_KM} km av rutterna, ${DAGAR} dygn:`);
    for (const X of PRIS_SVEP) console.log(`  yta ≤ ${X.toFixed(1)} °C med fukt: ${ep.get(X)} episoder${X === PRIS_SVEP[0] ? " (dagens tröskel)" : ` — ${(ep.get(X) ?? 0) - bas1} tillkomna`}`);
    console.log(`  Om de tillkomna var FALSKA kan bara kamerafacit (bar/våt) och förarens "nej" säga — talet är tillfällen, inte falsklarm.`);
  });
}
function ruttWktLokal(r: Rutter): string {
  return "MULTILINESTRING(" + Object.values(r).map((l) => "(" + l.map(([x, y]) => `${x} ${y}`).join(",") + ")").join(",") + ")";
}
await pool.end();
