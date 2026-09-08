// Halkvakt ingester. Run: TRAFIKVERKET_API_KEY=... npm run ingest[:dry]
// Delta-syncs via Trafikverket changeid persisted in sync_state.
import { fetchWeather, isInteresting } from "./sources/weather.ts";
import { fetchRoadConditions } from "./sources/roadcondition.ts";
import { fetchCameras } from "./sources/cameras.ts";
import { fetchDeviations } from "./sources/situations.ts";
import { fetchWildlifeEvents } from "./sources/polisen.ts";
import { fetchSmhiWarnings, isWinterRelevant } from "./sources/smhi.ts";

const apiKey = process.env.TRAFIKVERKET_API_KEY;
if (!apiKey) { console.error("TRAFIKVERKET_API_KEY not set"); process.exit(1); }
const dryRun = process.argv.includes("--dry-run");
const hasDb = Boolean(process.env.DATABASE_URL);

// Kort #80: --skip=weather,deviations. Livemotorn (supabase/functions/ingest-live, #72) äger
// kursorerna "weather" och "deviations" sedan 8/9; kör den här ingesten samma källor slåss
// två skrivare om samma changeid (läxan #73a) och nuläget hoppar. Det som INTE får hoppas
// över är det livemotorn inte gör: kamerorna, vinterarkivets egna kursor, polisen, SMHI.
// Bara de två namnen tillåts — ett okänt namn är ett skrivfel, inte en tyst nolla.
const SKIPPABLE = new Set(["weather", "deviations"]);
const skipArg = process.argv.find((a) => a.startsWith("--skip="));
const SKIP = new Set(skipArg ? skipArg.slice("--skip=".length).split(",").filter(Boolean) : []);
for (const s of SKIP) if (!SKIPPABLE.has(s)) { console.error(`--skip: okänd källa "${s}" (tillåtna: ${[...SKIPPABLE].join(", ")})`); process.exit(1); }
if (SKIP.size) console.log(`hoppar över (livemotorn äger kursorn, kort #80): ${[...SKIP].join(", ")}`);
const tom = { items: [] as never[], lastChangeId: "" };   // tom lastChangeId ⇒ writeAll rör inte sync_state

let since: Record<string, string> = {};
if (!dryRun && hasDb) {
  const { readSyncState } = await import("./db.ts");
  since = await readSyncState();
  if (Object.keys(since).length) console.log("delta sync from:", since);
  else console.log("no sync_state — full sync");
}

const t0 = Date.now();
const [weather, conditions, cameras, deviations, wildlife, smhi] = await Promise.all([
  SKIP.has("weather") ? tom : fetchWeather(apiKey, since.weather ?? "0"),
  // EGEN KURSOR (kort #51, DECISIONS #73): livemotorn (minutvis) och den här ingesten
  // delade tidigare sync_state-raden "road_conditions". Minutjobbet flyttade fram kursorn
  // ~59 ggr/timme, så det här jobbet — road_condition_historys ENDA skrivare — såg bara
  // sista minutens delta. Med "road_conditions_arkiv" konsumerar vi hela timmens ström.
  fetchRoadConditions(apiKey, since.road_conditions_arkiv ?? "0"),
  fetchCameras(apiKey, since.cameras ?? "0"),
  SKIP.has("deviations") ? tom : fetchDeviations(apiKey, since.deviations ?? "0"),
  fetchWildlifeEvents().catch((e) => { console.warn("polisen.se skipped:", e.message); return { items: [] }; }),
  fetchSmhiWarnings().catch((e) => { console.warn("SMHI skipped:", e.message); return { items: [] }; }),
]);

const coldStations = weather.items.filter(w => w.surfaceTempC !== null && w.surfaceTempC <= 5);
const activeConditions = conditions.items.filter(c => !c.deleted && c.conditionText !== "Normalt");
console.log(`Fetched in ${Date.now() - t0} ms`);
console.log(`weather stations:     ${weather.items.length} (surface<=5C: ${coldStations.length})`);
// Kort #48: förstapubliceringsbevis för vind/sikt — nya fält bevisas med egen loggrad.
console.log(`  vind: ${weather.items.filter(w => w.windSpeedMs !== null).length} st, byvind: ${weather.items.filter(w => w.windGustMs !== null).length}, sikt: ${weather.items.filter(w => w.visibilityM !== null).length} st`);
console.log(`road condition segs:  ${conditions.items.length} (non-normal active: ${activeConditions.length})`);
console.log(`speed cameras:        ${cameras.items.filter(c => !c.deleted).length}`);
console.log(`live deviations kept: ${deviations.items.filter(d => !d.deleted).length}`);
const wl = wildlife.items;
const wlRoads = wl.filter(w => w.roadNumber).length;
console.log(`wildlife events:      ${wl.length} (road extracted: ${wlRoads}, species: ${wl.filter(w => w.species).length})`);
console.log(`smhi warning areas:   ${smhi.items.length} (winter-relevant: ${smhi.items.filter(x => isWinterRelevant(x.eventCode)).length})`);
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
const counts = await writeAll({ weather, conditions, cameras, deviations, wildlife, smhi });
console.log(`DB WRITE OK in ${Date.now() - t1} ms:`, JSON.stringify(counts));
