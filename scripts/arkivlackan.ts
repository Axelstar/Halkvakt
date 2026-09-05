// Arkivläckan (kort #51, Bengts order 5/9): hur mycket av väglagsströmmen når
// road_condition_history — husets uttryckliga vinterarkiv ("our moat", sql/001:30)?
//
// MEKANIKEN SOM MISSTÄNKS: arkivets enda skrivare är GitHub-ingesten (ingest/db.ts:101).
// Livemotorns edge function äger väglaget sedan 25/8 (DECISIONS #22), kör varje minut och
// skriver bara road_conditions som UPSERT. Båda delar changeid-kursor (sync_state källa
// road_conditions), så timjobbet ser bara deltat sedan senaste minutkörningen.
//
// MÄTNINGEN: varje rad i road_conditions bär segmentets NUVARANDE (segment_id, modified_time).
// Arkivet har PK (segment_id, modified_time). Fanns tillståndet när det skrevs skulle det
// alltså finnas i BÅDA. Saknas det i arkivet blev just den omklassningen aldrig sparad.
//
// VAD MÄTNINGEN INTE KAN SE (skrivs ut i rapporten, döljs inte): bara NUVARANDE tillstånd.
// Varje mellanliggande tillstånd som minutmotorn skrev och sedan skrev över är borta utan
// spår. Uppmätt bortfall är därför ett GOLV — det sanna är lika stort eller större.
//
// Run: DATABASE_URL=... node --experimental-strip-types scripts/arkivlackan.ts [dagar=30]
// Självtest utan DB: scripts/arkivlackan.ts --sjalvtest

type Rad = { arkiverad: boolean; efterLive: boolean; harNagonHistorik: boolean };

function rakna(rows: Rad[]) {
  const del = (f: (r: Rad) => boolean) => {
    const v = rows.filter(f);
    const saknas = v.filter(r => !r.arkiverad).length;
    return { n: v.length, saknas, pct: v.length ? (100 * saknas) / v.length : 0 };
  };
  return {
    alla: del(() => true),
    efter: del(r => r.efterLive),
    fore: del(r => !r.efterLive),
    utanHistorikAlls: rows.filter(r => !r.harNagonHistorik).length,
  };
}

const pct = (x: number) => `${x.toFixed(1)} %`;
function rapport(t: ReturnType<typeof rakna>) {
  const rad = (namn: string, d: { n: number; saknas: number; pct: number }) =>
    console.log(`  ${namn.padEnd(34)} ${String(d.n).padStart(6)} segment   ${String(d.saknas).padStart(6)} oarkiverade   ${pct(d.pct).padStart(8)}`);
  rad("ALLA nuvarande tillstånd", t.alla);
  rad("ändrade EFTER livemotorn 25/8", t.efter);
  rad("ändrade FÖRE livemotorn 25/8", t.fore);
  console.log(`  segment helt utan historikrad:     ${t.utanHistorikAlls}`);
}

// ── Självtest med känd sanning, utan DB.
// 10 segment: 6 efter livemotorn (varav 4 oarkiverade), 4 före (varav 0 oarkiverade),
// och 2 segment helt utan historik. Väntat: totalt 4/10 = 40 %, efter 4/6 = 66,7 %, före 0 %.
if (process.argv.includes("--sjalvtest")) {
  const r = (arkiverad: boolean, efterLive: boolean, harNagonHistorik = true): Rad =>
    ({ arkiverad, efterLive, harNagonHistorik });
  const rows: Rad[] = [
    r(false, true, false), r(false, true, false), r(false, true), r(false, true),
    r(true, true), r(true, true),
    r(true, false), r(true, false), r(true, false), r(true, false),
  ];
  const t = rakna(rows);
  console.log("SJÄLVTEST — 10 segment, känd sanning: 4 oarkiverade (alla efter 25/8), 2 utan historik");
  rapport(t);
  let ok = true;
  const nara = (a: number, b: number) => Math.abs(a - b) < 0.05;
  if (t.alla.saknas !== 4 || !nara(t.alla.pct, 40)) { console.error(`SJÄLVTEST: alla ${t.alla.saknas}/${t.alla.n} = ${t.alla.pct}, väntat 4/10 = 40`); ok = false; }
  if (t.efter.saknas !== 4 || !nara(t.efter.pct, 66.667)) { console.error(`SJÄLVTEST: efter ${t.efter.saknas}/${t.efter.n} = ${t.efter.pct}, väntat 4/6 = 66,7`); ok = false; }
  if (t.fore.saknas !== 0 || !nara(t.fore.pct, 0)) { console.error(`SJÄLVTEST: före ${t.fore.saknas}/${t.fore.n} = ${t.fore.pct}, väntat 0/4 = 0`); ok = false; }
  if (t.utanHistorikAlls !== 2) { console.error(`SJÄLVTEST: utan historik ${t.utanHistorikAlls}, väntat 2`); ok = false; }
  if (!ok) process.exit(1);
  console.log("SJÄLVTEST OK: räkningen återfinner den kända sanningen i alla fyra måtten.");
  process.exit(0);
}

// ── Skarpt.
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
const DAGAR = Number(process.argv.find(a => /^\d+$/.test(a)) ?? 30);
const LIVE = "2026-08-25";  // DECISIONS #22: livemotorn tar över väglaget

// Joinen görs i SQL (billigt och läsbart); aritmetiken i rakna(), som självtestet prövar.
const nu = await pool.query(`
  SELECT (h.segment_id IS NOT NULL) AS arkiverad,
         (c.modified_time >= $1::timestamptz) AS efter_live,
         EXISTS (SELECT 1 FROM road_condition_history x WHERE x.segment_id = c.segment_id) AS har_nagon
  FROM road_conditions c
  LEFT JOIN road_condition_history h
    ON h.segment_id = c.segment_id AND h.modified_time = c.modified_time
  WHERE NOT c.deleted AND c.modified_time IS NOT NULL`, [LIVE]);

const arkiv = await pool.query(`
  SELECT count(*)::bigint AS rader, count(DISTINCT segment_id)::bigint AS segment,
         min(modified_time) AS aldsta, max(modified_time) AS nyaste
  FROM road_condition_history`);

const serie = await pool.query(`
  SELECT date_trunc('day', modified_time)::date AS dag, count(*)::bigint AS rader,
         count(DISTINCT segment_id)::bigint AS segment
  FROM road_condition_history
  WHERE modified_time > now() - $1 * interval '1 day'
  GROUP BY 1 ORDER BY 1`, [DAGAR]);
await pool.end();

const rows: Rad[] = nu.rows.map((r: any) => ({
  arkiverad: r.arkiverad, efterLive: r.efter_live, harNagonHistorik: r.har_nagon }));

console.log(`Arkivläckan (kort #51) — når väglagsströmmen vinterarkivet?\n`);
if (rows.length < 100) {
  console.error(`UNDERLAGSVAKT: bara ${rows.length} segment i road_conditions — hämtningen eller arkivet är trasigt. Grön-men-tom räknas inte som en mätning.`);
  process.exit(1);
}
const t = rakna(rows);
// Invariantvakt: fångar en trasig join innan siffrorna tolkas.
if (t.alla.n !== rows.length || t.efter.n + t.fore.n !== rows.length) {
  console.error(`INVARIANTVAKT: delmängderna summerar inte till helheten (${t.efter.n}+${t.fore.n} ≠ ${rows.length}) — joinen ljuger, siffrorna får inte läsas.`);
  process.exit(1);
}

const a = arkiv.rows[0];
console.log(`Arkivet: ${a.rader} rader över ${a.segment} segment, ${a.aldsta ?? "—"} → ${a.nyaste ?? "—"}\n`);
console.log(`NUVARANDE TILLSTÅND SOM SAKNAS I ARKIVET (livemotorn tog över ${LIVE}):`);
rapport(t);

console.log(`\nRADER PER DYGN I ARKIVET (${DAGAR} dygn bakåt) — brottet ska synas vid ${LIVE}:`);
if (serie.rows.length === 0) console.log(`  (inga rader i fönstret — arkivet står helt still)`);
const max = Math.max(1, ...serie.rows.map((r: any) => Number(r.rader)));
for (const r of serie.rows as any[]) {
  const n = Number(r.rader);
  console.log(`  ${r.dag}  ${String(n).padStart(6)} rader  ${String(r.segment).padStart(4)} segment  ${"█".repeat(Math.max(1, Math.round((40 * n) / max)))}`);
}

console.log(`\nLÄSNING — och mätningens egen gräns:`);
console.log(`  Siffran ovan är ett GOLV, inte hela sanningen. Mätningen ser bara NUVARANDE`);
console.log(`  tillstånd. Varje mellanliggande omklassning som minutmotorn skrev och sedan`);
console.log(`  skrev över är borta utan spår och kan aldrig räknas. Sant bortfall >= uppmätt.`);
console.log(`  Mätningen fäller ingen dom om åtgärd — den ger underlag till Bengt och Axel.`);
