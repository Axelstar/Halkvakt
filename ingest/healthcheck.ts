// Hourly self-monitoring. Exit 1 => workflow files/updates an incident issue.
import pg from "pg";
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: { rejectUnauthorized: false } });
const problems: string[] = [];
try {
  const sync = await pool.query(`SELECT source, last_change_id, synced_at,
    now() - synced_at AS age FROM sync_state ORDER BY source`);
  if (sync.rows.length < 4) problems.push(`sync_state has ${sync.rows.length}/4 sources`);
  // situations+roadcondition ägs av LIVEMOTORN (pg_cron, 1 min) — hård tröskel.
  // Övriga källor ägs av GitHub-flödet (numera 1 h) — mjuk tröskel.
  const LIMITS: Record<string, number> = { deviations: 15, road_conditions: 15 };
  for (const r of sync.rows) {
    const ageMin = (Date.now() - new Date(r.synced_at).getTime()) / 60000;
    const limit = LIMITS[r.source] ?? 150;
    console.log(`${r.source}: synced ${ageMin.toFixed(0)} min ago (limit ${limit})`);
    if (ageMin > limit) problems.push(
      `${r.source} stale: ${ageMin.toFixed(0)} min (limit ${limit}${limit===15?" — LIVEMOTORN står stilla? se RUNBOOK":""})`);
  }
  // Puls på pg_cron-jobbet självt (läsbart som postgres-rollen; tåler saknat schema)
  try {
    const cron = await pool.query(`SELECT status, end_time FROM cron.job_run_details
      WHERE jobid=(SELECT jobid FROM cron.job WHERE jobname='halkvakt-ingest-live')
      ORDER BY end_time DESC LIMIT 1`);
    if (cron.rows.length) {
      const j = cron.rows[0];
      console.log(`livemotor cron: ${j.status} @ ${j.end_time}`);
      if (j.status === 'failed') problems.push(`livemotorns senaste cron-körning FAILED @ ${j.end_time}`);
    }
  } catch { console.log('livemotor cron: (job_run_details ej läsbar — hoppar pulsen)'); }
  // FI/DK-stalehet (kort #48): grannländernas skuggarkiv vaktades INTE — bara svenska
  // sync_state lästes. Nu: schema-existens-vaktat (CI:s PostGIS saknar fi/dk, 003-läxan).
  for (const land of ["fi", "dk"]) {
    try {
      const st = await pool.query(`SELECT synced_at, (now() - synced_at) AS age FROM ${land}.sync_state ORDER BY synced_at DESC LIMIT 1`);
      if (st.rows.length) {
        const ageMin = (Date.now() - new Date(st.rows[0].synced_at).getTime()) / 60000;
        console.log(`${land}-arkivet: synkat för ${ageMin.toFixed(0)} min sedan (limit 120)`);
        if (ageMin > 120) problems.push(`${land}-arkivet stale: ${ageMin.toFixed(0)} min — ingest-${land} står stilla?`);
      }
    } catch { console.log(`${land}-arkivet: (schema saknas — hoppar)`); }
  }
  // Fältgolv (kort #48): nya fältfamiljer får inte dö tyst. Exists-vaktade — larmar bara
  // om arkivet NÅGONSIN sett fältet (annars "ofödd"-falsklarm, kamerafilsvakt-läxan).
  try {
    const falt = await pool.query(`SELECT
      (SELECT count(*) FROM weather_latest WHERE wind_speed_ms IS NOT NULL) AS vind_nu,
      (SELECT EXISTS (SELECT 1 FROM weather_observations WHERE wind_speed_ms IS NOT NULL)) AS vind_fott,
      (SELECT count(*) FROM weather_latest WHERE visibility_m IS NOT NULL) AS sikt_nu,
      (SELECT EXISTS (SELECT 1 FROM weather_observations WHERE visibility_m IS NOT NULL)) AS sikt_fott`);
    const ff = falt.rows[0];
    console.log(`fältgolv: vind ${ff.vind_nu} st (född: ${ff.vind_fott}), sikt ${ff.sikt_nu} st (född: ${ff.sikt_fott})`);
    if (ff.vind_fott && Number(ff.vind_nu) < 100) problems.push(`vindfältet dött: ${ff.vind_nu} stationer (<100) trots tidigare skörd`);
    if (ff.sikt_fott && Number(ff.sikt_nu) < 30) problems.push(`siktfältet dött: ${ff.sikt_nu} stationer (<30) trots tidigare skörd`);
  } catch { console.log("fältgolv: kolumnerna inte födda än (011 väntar på första ingesten) — hoppar"); }
  // Gränssnapshoten (kort #49): FI-stationer nära svenska vägar ska förbli nåbara — annars
  // tystnar gränsområdena utan att någon ser det. Reachability (any temp), schema-vaktat.
  try {
    const gr = await pool.query(`
      WITH se AS (SELECT ST_Collect(geom) g FROM road_conditions WHERE NOT deleted AND geom IS NOT NULL)
      SELECT count(*)::int AS n FROM fi.weather_latest f, se
      WHERE f.sample_time > now() - interval '3 hours' AND ST_DWithin(f.geom::geography, se.g::geography, 40000)`);
    const n = gr.rows[0].n;
    console.log(`gräns-wx: ${n} FI-stationer nåbara inom 40 km av svenska vägar`);
    if (Number(n) < 10) problems.push(`gränssnapshoten tunn: bara ${n} FI-stationer nåbara (<10) — FI-ingest eller gränslogik trasig?`);
  } catch { console.log("gräns-wx: fi-schemat saknas (CI) — hoppar"); }
  const counts = await pool.query(`SELECT
    (SELECT count(*) FROM cameras WHERE NOT deleted) AS cameras,
    (SELECT count(*) FROM road_conditions WHERE NOT deleted) AS segments,
    (SELECT count(*) FROM weather_observations) AS weather_obs`);
  const c = counts.rows[0];
  console.log(`cameras=${c.cameras} segments=${c.segments} weather_obs=${c.weather_obs}`);
  if (Number(c.cameras) < 2000) problems.push(`cameras=${c.cameras} (<2000: bad sync?)`);
  if (Number(c.segments) < 400) problems.push(`segments=${c.segments} (<400: bad sync?)`);
  // Webbens ålder: publicerade meta.json får inte åldras (publish-map var 30:e min)
  try {
    const m = await (await fetch(`https://axelstar.github.io/halkvakt-karta/data/meta.json?t=${Date.now()}`)).json();
    const webAge = (Date.now() - new Date(m.generated_at).getTime()) / 60000;
    console.log(`webb meta.json: ${webAge.toFixed(0)} min gammal (limit 90)`);
    if (webAge > 90) problems.push(`publicerad meta.json ${webAge.toFixed(0)} min gammal (>90) — publish-map står stilla?`);
  } catch (e) { problems.push(`kunde inte läsa publicerad meta.json: ${String((e as Error).message)}`); }
  // Kamerafilen (ankarlagret, #38b(2)): fail-soft i publiceringen betyder att ett
  // permanent TRV-fel annars lämnar en gammal fil kvar på CDN i tysthet. Kamerorna
  // ändras sällan — larmgränsen är generös (7 dygn), vakten är mot "trasigt för evigt".
  try {
    const k = await (await fetch(`https://axelstar.github.io/halkvakt-karta/data/kameror-vaglag.geojson?t=${Date.now()}`)).json();
    const n = k?.features?.length ?? 0;
    const ageD = k?.generated_at ? (Date.now() - new Date(k.generated_at).getTime()) / 86_400_000 : null;
    console.log(`kameror-vaglag: ${n} kameror, ${ageD === null ? "ingen stämpel (äldre version — självläker)" : ageD.toFixed(1) + " dygn gammal (limit 7)"}`);
    if (n < 500) problems.push(`kameror-vaglag: bara ${n} kameror (<500)`);
    if (ageD !== null && ageD > 7) problems.push(`kameror-vaglag ${ageD.toFixed(1)} dygn gammal (>7) — TRV-steget i publish fallerar permanent?`);
  } catch (e) { problems.push(`kunde inte läsa kameror-vaglag.geojson: ${String((e as Error).message)}`); }
} catch (e) {
  problems.push(`healthcheck query failed: ${String((e as Error).message)}`);
} finally { await pool.end(); }
if (problems.length) { console.error("UNHEALTHY:\n- " + problems.join("\n- ")); process.exit(1); }
console.log("HEALTHY");
