// Halkvakt ingester. Run: TRAFIKVERKET_API_KEY=... npm run ingest[:dry]
// --dry-run: fetch + normalize + report, no DB. Used before Supabase exists
// and as a live smoke test in CI.
import { fetchWeather, isInteresting } from "./sources/weather.ts";
import { fetchRoadConditions } from "./sources/roadcondition.ts";
import { fetchCameras } from "./sources/cameras.ts";
import { fetchDeviations } from "./sources/situations.ts";

const apiKey = process.env.TRAFIKVERKET_API_KEY;
if (!apiKey) { console.error("TRAFIKVERKET_API_KEY not set"); process.exit(1); }
const dryRun = process.argv.includes("--dry-run");

const t0 = Date.now();
const [weather, conditions, cameras, deviations] = await Promise.all([
  fetchWeather(apiKey),
  fetchRoadConditions(apiKey),
  fetchCameras(apiKey),
  fetchDeviations(apiKey),
]);

const coldStations = weather.items.filter(w => w.surfaceTempC !== null && w.surfaceTempC <= 5);
const activeConditions = conditions.items.filter(c => !c.deleted && c.conditionText !== "Normalt");
const interesting = weather.items.filter(w => isInteresting(w, null));

console.log(`Fetched in ${Date.now() - t0} ms`);
console.log(`weather stations:     ${weather.items.length} (surface<=5C: ${coldStations.length}, archived under policy: ${interesting.length})`);
console.log(`road condition segs:  ${conditions.items.length} (non-normal active: ${activeConditions.length})`);
console.log(`speed cameras:        ${cameras.items.filter(c => !c.deleted).length}`);
console.log(`live deviations kept: ${deviations.items.filter(d => !d.deleted).length}`);
for (const d of deviations.items.filter(d => !d.deleted).slice(0, 5)) {
  console.log(`  [${d.messageType}/${d.severityText ?? "-"}] ${d.roadNumber ?? "?"}: ${d.message.slice(0, 90)}`);
}
console.log(`changeids: weather=${weather.lastChangeId} cond=${conditions.lastChangeId} cam=${cameras.lastChangeId} dev=${deviations.lastChangeId}`);

if (dryRun) { console.log("(dry run — no DB writes)"); process.exit(0); }
if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set — falling back to dry run. Set the secret to enable DB writes.");
  process.exit(0);
}
const { writeAll } = await import("./db.ts");
await writeAll({ weather, conditions, cameras, deviations });
