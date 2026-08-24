// Halkvakt ingester. Run: TRAFIKVERKET_API_KEY=... npm run ingest[:dry]
// Delta-syncs via Trafikverket changeid persisted in sync_state.
import { fetchWeather, isInteresting } from "./sources/weather.ts";
import { fetchRoadConditions } from "./sources/roadcondition.ts";
import { fetchCameras } from "./sources/cameras.ts";
import { fetchDeviations } from "./sources/situations.ts";

const apiKey = process.env.TRAFIKVERKET_API_KEY;
if (!apiKey) { console.error("TRAFIKVERKET_API_KEY not set"); process.exit(1); }
const dryRun = process.argv.includes("--dry-run");
const hasDb = Boolean(process.env.DATABASE_URL);

let since: Record<string, string> = {};
if (!dryRun && hasDb) {
  const { readSyncState } = await import("./db.ts");
  since = await readSyncState();
  if (Object.keys(since).length) console.log("delta sync from:", since);
  else console.log("no sync_state — full sync");
}

const t0 = Date.now();
const [weather, conditions, cameras, deviations] = await Promise.all([
  fetchWeather(apiKey, since.weather ?? "0"),
  fetchRoadConditions(apiKey, since.road_conditions ?? "0"),
  fetchCameras(apiKey, since.cameras ?? "0"),
  fetchDeviations(apiKey, since.deviations ?? "0"),
]);

const coldStations = weather.items.filter(w => w.surfaceTempC !== null && w.surfaceTempC <= 5);
const activeConditions = conditions.items.filter(c => !c.deleted && c.conditionText !== "Normalt");
console.log(`Fetched in ${Date.now() - t0} ms`);
console.log(`weather stations:     ${weather.items.length} (surface<=5C: ${coldStations.length})`);
console.log(`road condition segs:  ${conditions.items.length} (non-normal active: ${activeConditions.length})`);
console.log(`speed cameras:        ${cameras.items.filter(c => !c.deleted).length}`);
console.log(`live deviations kept: ${deviations.items.filter(d => !d.deleted).length}`);
for (const d of deviations.items.filter(d => !d.deleted).slice(0, 5)) {
  console.log(`  [${d.messageType}/${d.severityText ?? "-"}] ${d.roadNumber ?? "?"}: ${d.message.slice(0, 90)}`);
}

if (dryRun) { console.log("(dry run — no DB writes)"); process.exit(0); }
if (!hasDb) {
  console.warn("DATABASE_URL not set — falling back to dry run. Set the secret to enable DB writes.");
  process.exit(0);
}
const { writeAll } = await import("./db.ts");
const t1 = Date.now();
const counts = await writeAll({ weather, conditions, cameras, deviations });
console.log(`DB WRITE OK in ${Date.now() - t1} ms:`, JSON.stringify(counts));
