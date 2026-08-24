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
  for (const r of sync.rows) {
    const ageMin = (Date.now() - new Date(r.synced_at).getTime()) / 60000;
    console.log(`${r.source}: synced ${ageMin.toFixed(0)} min ago`);
    if (ageMin > 75) problems.push(`${r.source} stale: ${ageMin.toFixed(0)} min (cron is 30 min)`);
  }
  const counts = await pool.query(`SELECT
    (SELECT count(*) FROM cameras WHERE NOT deleted) AS cameras,
    (SELECT count(*) FROM road_conditions WHERE NOT deleted) AS segments,
    (SELECT count(*) FROM weather_observations) AS weather_obs`);
  const c = counts.rows[0];
  console.log(`cameras=${c.cameras} segments=${c.segments} weather_obs=${c.weather_obs}`);
  if (Number(c.cameras) < 2000) problems.push(`cameras=${c.cameras} (<2000: bad sync?)`);
  if (Number(c.segments) < 400) problems.push(`segments=${c.segments} (<400: bad sync?)`);
} catch (e) {
  problems.push(`healthcheck query failed: ${String((e as Error).message)}`);
} finally { await pool.end(); }
if (problems.length) { console.error("UNHEALTHY:\n- " + problems.join("\n- ")); process.exit(1); }
console.log("HEALTHY");
