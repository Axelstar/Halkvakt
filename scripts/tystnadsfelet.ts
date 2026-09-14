// TYSTNADSFELET — kort #98 (TROSKLAR-TYSTNADSFEL, Bengts order 14/9, issue #119 steg 4–5).
//
// MÅTTET VÄNDER PÅ VANLIG UTVÄRDERING: det räknar TYSTNADENS FEL, inte larmens träff. Enheten är
// ett bekräftat halttillfälle ur facit, med plats och tid, och frågan är vad systemet sa där och då.
//
// BYGGFORMEN ÄR PRINCIPENS, inte ett val: spara det som inte går att räkna om, räkna om det som går.
// Allt det här måttet behöver är durabelt — facit (`road_condition_history`, `situation_archive`,
// kamerabilderna) är append-only, skuggloggen likaså, och signalerna finns i `trend_kandidater`
// (sparad av #88) plus väderarkivets timupplösning, som överlever gallringen. Alltså: en LÄSANDE
// knapp som räknar om vid behov. Ingen tabell, ingen deploy, inget cron-jobb, noll kostnad tills den
// trycks. Snubbeltråden står på kort #155: skärps kvarhållningen måste också det här måttet byta form.
//
// TRÖSKLARNA ÄR ANDRAS, INGEN ÄR NY. Daggpunktsgapet kommer ur TROSKLAR-TRENDEN §2, regnfönstret N
// ur TROSKLAR-OVERGANGAR §2, ankaravståndet ur grind A. Skriptet väljer ingen punkt — det skriver ut
// hela svepet, precis som §3 kräver innan Ö-B dömt.
//
// VAD DEN INTE GÖR: §5:s PRISKURVA. Priset — nya falsklarm per kandidattröskel — kräver att motorn
// körs om med andra trösklar över skuggrutterna, alltså ett bygge i motorkedjan. Och det går inte
// att öva på ett material där antalet oursäktliga missar är noll. Den halvan är ett eget steg, och
// den utelämnas HÖGLJUTT här nere i utskriften i stället för att tigas ihjäl.
//
// Helt läsande. Run: DATABASE_URL=... node --experimental-strip-types scripts/tystnadsfelet.ts [dagar=30]
// Självtest utan DB: scripts/tystnadsfelet.ts --sjalvtest

import { DAGGGAP } from "../publish/trenden.ts";
import { N_SVEP } from "../publish/tillstand.ts";

const MAX_KM = 50;          // ankaravståndet, grind A (publish/grind-a.ts:14) — §6:s räckviddsvillkor
const FROSTYTA = 1;         // °C — "stationen visade risk", samma tal som #89:s steg 0 använder
const NARA_M = 5000;        // m — hur nära skuggans larm måste ligga facit för att räknas som röst
const NARA_MIN = 60;        // min — och hur nära i tid
const MIN_FACIT = 20;       // under detta skrivs ⊘ OAVGJORT, aldrig ett tal

/** MOTORNS egen halklista, ordagrant ur engine.ts:43 (SLIPPERY_INFO). Måttet dömer mot det
 *  motorn FAKTISKT kallar halt — en egen lista hade mätt något annat än det som sägs.
 *  Kontraktsgrinden jämför den här strängen tecken för tecken mot motorns.
 *  ⚠️ OCH DEN SKILJER SIG I DAG FRÅN SNAPSHOTENS: `publish/snapshot-core.ts` och vakthunden
 *  saknar "mycket besvärligt", kodgrinden saknar dessutom "snö". Tre värden för vad som ser ut
 *  som en lista — mätt 14/9 när kontraktet skrevs. Kort #156 bär den frågan; den rörs inte här,
 *  eftersom en ändring i snapshoten ändrar vad appen varnar för. */
const HALKORD = "is|snö|halka|frost|mycket besvärligt";

/** Ursäktlig eller oursäktlig? Ren, testbar: hade systemet SIGNAL när det teg? (§3) */
export type Signaler = {
  daggpunktsgapSlots: boolean;   // yta − dagg ≤ gap
  trendenPekade: boolean;        // en trendkandidat vid stationen inom fönstret (#88)
  stationenVisadeRisk: boolean;  // yta ≤ FROSTYTA inom räckvidd
  regnInomN: boolean;            // det regnade inom N timmar vid stationen (#89, §3:s fjärde)
};

/** OURSÄKTLIG = systemet teg TROTS signal. Ett rent tröskelfel: en sänkt tröskel fångar det
 *  utan ny datakälla. URSÄKTLIG = ingen signal fanns; då pekar missen mot nya källor (#43, #93),
 *  inte mot en lägre tröskel. */
export function oursaktlig(s: Signaler): boolean {
  return s.daggpunktsgapSlots || s.trendenPekade || s.stationenVisadeRisk || s.regnInomN;
}

/** §9: "Okänt" förblir ett giltigt utfall. Saknas underlaget för att ens ställa frågan är svaret
 *  varken ursäktligt eller oursäktligt — det är okänt, och får aldrig tvingas till en gissning. */
export function klassa(s: Signaler | null): "oursäktlig" | "ursäktlig" | "okänt" {
  if (s === null) return "okänt";
  return oursaktlig(s) ? "oursäktlig" : "ursäktlig";
}

const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)} %` : "–");

if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — klassningen mot känd sanning\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); ok = false; }
    else console.log(`  ok: ${namn} = ${fick}`);
  };
  const ingen: Signaler = { daggpunktsgapSlots: false, trendenPekade: false,
    stationenVisadeRisk: false, regnInomN: false };
  k("ingen signal alls är ursäktlig", klassa(ingen), "ursäktlig");
  k("daggpunktsgapet ensamt gör den oursäktlig", klassa({ ...ingen, daggpunktsgapSlots: true }), "oursäktlig");
  k("trenden ensam räcker", klassa({ ...ingen, trendenPekade: true }), "oursäktlig");
  k("stationens risk ensam räcker", klassa({ ...ingen, stationenVisadeRisk: true }), "oursäktlig");
  // Den fjärde signalen är hela skälet att #89 och #98 hänger ihop: utan den klassas efterhalkans
  // missar på de tre andra utan att ORSAKEN syns, och då går "för hög tröskel" inte att skilja
  // från "hål i fuktvillkoret".
  k("regn inom N ensamt räcker — §3:s fjärde signal", klassa({ ...ingen, regnInomN: true }), "oursäktlig");
  k("utan underlag är svaret okänt, aldrig en gissning", klassa(null), "okänt");
  // Svepen ska vara andras.
  k("daggpunktssvepet är TROSKLAR-TRENDEN §2:s", DAGGGAP.join("·"), "0·0.5·1·2");
  k("regnfönstret är TROSKLAR-OVERGANGAR §2:s", N_SVEP.join("·"), "1·2·3·4");
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK: fyra signaler, var och en tillräcklig, och okänt är ett giltigt utfall.");
  process.exit(0);
}

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const DAGAR = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 30);
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await pool.query("SET statement_timeout = '600s'");
const q = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows as any[];

async function avsnitt(namn: string, fn: () => Promise<void>) {
  try { await fn(); }
  catch (e) { console.log(`\n${namn}\n  ✗ FRÅGAN KUNDE INTE STÄLLAS: ${(e as Error).message}`); }
}

console.log(`TYSTNADSFELET — kort #98 mot facitstacken (${DAGAR} dygns fönster)\n`);
console.log(`  Fönstret har inget hårt tak: facit är append-only och gallras inte. Signalerna läses`);
console.log(`  ur väderarkivet, som efter sju dygn bara har en rad per halvtimme — punktvärden som`);
console.log(`  daggpunktsgap och yttemperatur överlever det, och regnet räknas per timme.\n`);

// ── T1 FACIT: tre källor, var för sig. De slås ALDRIG ihop till ett tal utan att sägas.
let facit: { kalla: string; lon: number; lat: number; tid: Date; etikett: string }[] = [];
await avsnitt("T1 FACIT", async () => {
  console.log("T1 FACIT — bekräftade halttillfällen, per källa");

  // (a) Väglagets omklassningar. Halkorden är MOTORNS egna (engine.ts:43, SLIPPERY_INFO) speglade
  // i SQL; kontraktsgrinden vaktar att de inte glider isär. "fläckvis Våt" får aldrig matcha —
  // delsträngen 'is' inuti "fläckvis" gav åtta falska halksegment på riktig augustidata.
  const vaglag = await q(`
    SELECT h.segment_id, h.modified_time AS tid, h.condition_info,
           ST_X(ST_Centroid(c.geom)) AS lon, ST_Y(ST_Centroid(c.geom)) AS lat
    FROM road_condition_history h JOIN road_conditions c USING (segment_id)
    WHERE h.modified_time > now() - $1 * interval '1 day' AND NOT h.deleted AND c.geom IS NOT NULL
      AND EXISTS (SELECT 1 FROM unnest(h.condition_info) i
                  WHERE i ~* ('(^|[^a-zåäö])(' || $2 || ')'))`, [DAGAR, HALKORD]);
  console.log(`  (a) väglagets omklassningar till halka: ${vaglag.length}`);
  for (const r of vaglag) facit.push({ kalla: "väglag", lon: Number(r.lon), lat: Number(r.lat),
    tid: r.tid, etikett: `${r.segment_id} ${String(r.condition_info)}` });

  // (b) situation_archive. VIKTIGT: arkivet bär ingen ORSAK (situations.ts:37). En olycka är facit
  // på att NÅGOT hände, inte på att det var halt. Räknas därför separat och slås aldrig ihop med
  // (a) utan att skillnaden står bredvid.
  const olyckor = (await q(`SELECT count(*)::int AS n FROM situation_archive
    WHERE start_time > now() - $1 * interval '1 day' AND geom IS NOT NULL`, [DAGAR]))[0];
  console.log(`  (b) olyckor i situation_archive: ${olyckor.n}`);
  console.log(`      ⚠️ UTAN ORSAK. En olycka är facit på att något hände, inte på att det var halt.`);
  console.log(`      Den räknas därför inte in i grundtalet nedan — bara (a) och granskade bilder gör det.`);

  // (c) Kamerafacit. Bilderna finns, men en bild är facit först när någon läst den.
  const bilder = await q(`SELECT count(*)::int AS n, max(created_at) AS senast
    FROM storage.objects WHERE bucket_id = 'facit'`).catch(() => [{ n: null, senast: null }]);
  console.log(`  (c) arkiverade kamerabilder: ${bilder[0]?.n ?? "kunde inte läsas"}`
    + (bilder[0]?.senast ? ` · senast ${String(bilder[0].senast).slice(0, 16)}` : ""));
  console.log(`      ⚠️ EN BILD ÄR INTE FACIT FÖRRÄN NÅGON LÄST DEN. Ingen granskning finns byggd,`);
  console.log(`      så de räknas här som TILLGÄNGLIGT UNDERLAG, inte som bekräftade tillfällen.`);

  console.log(`  GRUNDTALETS underlag (bara (a)): ${facit.length} tillfällen`);
  if (facit.length < MIN_FACIT) {
    console.log(`  ⊘ OAVGJORT — under ${MIN_FACIT} bekräftade tillfällen. Allt nedan körs ändå, så`);
    console.log(`    instrumentet är prövat, men INGET tal härifrån får bära en dom.`);
  }
});

// ── T2 RÄCKVIDDSVILLKORET (§6): bara tillfällen där systemet hade en chans.
let inomRackvidd: typeof facit = [];
await avsnitt("T2 RÄCKVIDDSVILLKORET", async () => {
  console.log(`\nT2 RÄCKVIDDSVILLKORET — bara där systemet HADE en chans (§6, ${MAX_KM} km)`);
  if (!facit.length) { console.log("  ⊘ inget facit att pröva."); return; }
  const km: number[] = [];
  for (const f of facit) {
    const d = (await q(`SELECT round((ST_Distance(
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, w.geom::geography) / 1000)::numeric, 1) AS km
      FROM weather_latest w ORDER BY w.geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326) LIMIT 1`,
      [f.lon, f.lat]))[0];
    km.push(Number(d.km));
    if (Number(d.km) <= MAX_KM) inomRackvidd.push(f);
  }
  km.sort((a, b) => a - b);
  console.log(`  ${inomRackvidd.length} av ${facit.length} inom ${MAX_KM} km från en VViS-station`
    + ` · median ${km[Math.floor(km.length / 2)]} km`);
  console.log(`  Utanför räckvidd är ett TÄCKNINGSproblem (#93), inte ett tröskelproblem, och`);
  console.log(`  utesluts med flit — annars drunknar tröskelsignalen i hål som handlar om annat.`);
});

// ── T3 VAD SYSTEMET SA: röst, skugga eller tyst?
let tystaMissar: typeof facit = [];
await avsnitt("T3 VAD SYSTEMET SA", async () => {
  console.log(`\nT3 VAD SYSTEMET SA — röst, skugga eller tyst? (${NARA_M} m, ${NARA_MIN} min)`);
  const sl = (await q(`SELECT count(*)::int AS rader, min(run_at) AS forst, max(run_at) AS sist,
      count(DISTINCT route)::int AS rutter FROM shadow_log
    WHERE run_at > now() - $1 * interval '1 day'`, [DAGAR]))[0];
  console.log(`  skuggloggen: ${sl.rader} körningar · ${sl.rutter} rutter · `
    + `${String(sl.forst).slice(0, 16)} → ${String(sl.sist).slice(0, 16)}`);
  console.log(`  ⚠️ SKUGGAN TÄCKER RUTTER, INTE LANDET. Ett facit-tillfälle som inte ligger vid en`);
  console.log(`     skuggrutt har ingen skuggdom alls — det är "okänt", inte "tyst".`);

  // VAKT MOT ETT SYSTEMATISKT FEL SVAR (kort #157, mätt 14/9): skuggloggens larm saknar
  // POSITION. 2 103 larm på fjorton dygn, noll med lon — motorns Alert-typ bär `t`, `hazardId`,
  // `kind`, `distanceM` och `text`, men ingen koordinat, och skuggmotorn skriver `lon: a.lon`
  // på ett fält som inte finns. Utan den här vakten hittar frågan nedan aldrig något larm och
  // klassar därför VARJE facit-tillfälle som en tyst miss — ett svar som ser ut som en mätning
  // men är en artefakt. Hellre ⊘ än ett tal som pekar åt fel håll.
  const [pos] = await q(`SELECT count(*) FILTER (WHERE a ? 'lon')::int AS med_pos,
      count(*)::int AS alla
    FROM shadow_log s, jsonb_array_elements(s.alerts) a
    WHERE s.run_at > now() - $1 * interval '1 day'`, [DAGAR]);
  console.log(`  larm med position: ${pos.med_pos} av ${pos.alla}`);
  if (!Number(pos.med_pos)) {
    console.log(`  ⊘ KAN INTE AVGÖRAS — INGET larm i skuggloggen bär en position (kort #157).`);
    console.log(`     Frågan "teg systemet?" går inte att ställa mot larm utan koordinater, och`);
    console.log(`     att räkna alla som tysta vore ett svar som ser ut som en mätning.`);
    return;
  }
  if (!inomRackvidd.length) { console.log("  ⊘ inget facit inom räckvidd att pröva."); return; }
  for (const f of inomRackvidd) {
    const sa = (await q(`SELECT count(*)::int AS n FROM shadow_log s, jsonb_array_elements(s.alerts) a
      WHERE s.run_at BETWEEN $3::timestamptz - $4 * interval '1 minute'
                         AND $3::timestamptz + $4 * interval '1 minute'
        AND ST_DWithin(ST_SetSRID(ST_MakePoint((a->>'lon')::float8, (a->>'lat')::float8), 4326)::geography,
                       ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $5)`,
      [f.lon, f.lat, f.tid, NARA_MIN, NARA_M]))[0];
    if (!Number(sa.n)) tystaMissar.push(f);
  }
  console.log(`  TYSTA MISSAR inom räckvidd: ${tystaMissar.length} av ${inomRackvidd.length}`
    + ` (${pct(tystaMissar.length, inomRackvidd.length)})`);
});

// ── T4 SIGNALERNA (§3): var missen ursäktlig eller oursäktlig?
await avsnitt("T4 SIGNALERNA", async () => {
  console.log(`\nT4 SIGNALERNA — teg systemet TROTS signal? (§3, fyra signaler)`);
  if (!tystaMissar.length) {
    console.log("  ⊘ inga tysta missar att klassa. Instrumentet är kört, men utan material.");
    console.log(`  Svepen som skulle ha skrivits ut: daggpunktsgap ${DAGGGAP.join(" · ")} °C,`);
    console.log(`  regnfönster N ${N_SVEP.join(" · ")} h. Ingen punkt väljs förrän Ö-B dömt.`);
    return;
  }
  console.log("  gap \\ N   " + N_SVEP.map((n) => `N = ${n} h`.padStart(14)).join(""));
  for (const gap of DAGGGAP) {
    const celler: string[] = [];
    for (const N of N_SVEP) {
      let oursakt = 0, okant = 0;
      for (const f of tystaMissar) {
        const s = (await q(`
          WITH st AS (SELECT station_id, geom FROM weather_latest
                      ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326) LIMIT 1)
          SELECT
            (SELECT bool_or(w.surface_temp_c - w.dewpoint_c <= $4) FROM weather_observations w, st
              WHERE w.station_id = st.station_id AND w.dewpoint_c IS NOT NULL
                AND w.sample_time BETWEEN $3::timestamptz - interval '1 hour' AND $3::timestamptz) AS gap,
            (SELECT bool_or(w.surface_temp_c <= $6) FROM weather_observations w, st
              WHERE w.station_id = st.station_id
                AND w.sample_time BETWEEN $3::timestamptz - interval '1 hour' AND $3::timestamptz) AS risk,
            (SELECT bool_or(w.rain_sum_mm > 0) FROM weather_observations w, st
              WHERE w.station_id = st.station_id AND w.rain_sum_mm IS NOT NULL
                AND w.sample_time BETWEEN $3::timestamptz - $5 * interval '1 hour' AND $3::timestamptz) AS regn,
            (SELECT count(*) > 0 FROM trend_kandidater t, st
              WHERE t.station_id = st.station_id
                AND t.observed_at BETWEEN $3::timestamptz - interval '2 hours' AND $3::timestamptz) AS trend,
            (SELECT count(*) > 0 FROM weather_observations w, st
              WHERE w.station_id = st.station_id
                AND w.sample_time BETWEEN $3::timestamptz - interval '1 hour' AND $3::timestamptz) AS underlag
          `, [f.lon, f.lat, f.tid, gap, N, FROSTYTA]))[0];
        if (!s.underlag) { okant++; continue; }
        if (oursaktlig({ daggpunktsgapSlots: !!s.gap, trendenPekade: !!s.trend,
                         stationenVisadeRisk: !!s.risk, regnInomN: !!s.regn })) oursakt++;
      }
      celler.push(`${oursakt}${okant ? ` (+${okant} okänt)` : ""}`.padStart(14));
    }
    console.log(`  ${String(gap).padEnd(8)} ` + celler.join(""));
  }
  console.log(`  Talen är ANTAL OURSÄKTLIGA av ${tystaMissar.length} tysta missar.`);
});

// ── T5 UTFALLSMENINGEN (§7).
console.log(`\nT5 UTFALLSMENINGEN (§7)`);
console.log(`  "Under fönstret teg systemet vid ${tystaMissar.length} bekräftade halttillfällen inom`);
console.log(`   räckvidd. Av dem hade det signal i M fall (oursäktliga). En tröskelsänkning till nivå`);
console.log(`   X hade fångat dem, till priset av Y nya falsklarm."`);
console.log(`  N = ${tystaMissar.length} · M står i T4:s rutnät · X och Y saknas, se nedan.`);

console.log(`\nVAD DEN HÄR KNAPPEN INTE GÖR — §5:s PRISKURVA`);
console.log(`  Priset (Y) är antalet NYA falsklarm varje kandidattröskel skulle ha gett på torra,`);
console.log(`  ofarliga tillfällen. Att räkna det kräver att motorn körs om med andra trösklar över`);
console.log(`  skuggrutterna — ett bygge i motorkedjan, inte en fråga till arkivet. Och det går inte`);
console.log(`  att öva på ett material där M är noll. Den halvan är ett eget steg, och den står här`);
console.log(`  utskriven i stället för att tigas ihjäl: utan priset är måttet en halva, inte ett par.`);

await pool.end();
