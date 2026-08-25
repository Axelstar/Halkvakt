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
} catch (e) {
  problems.push(`healthcheck query failed: ${String((e as Error).message)}`);
} finally { await pool.end(); }
if (problems.length) { console.error("UNHEALTHY:\n- " + problems.join("\n- ")); process.exit(1); }
console.log("HEALTHY");
