// Situation (schema 1.6, namespace road.trafficinfo) -> live deviations.
// One Situation contains 1..n Deviations; we flatten to deviations.
import { tvFetch, parseWgs84Point, type TvResult } from "../trafikverket.ts";

export interface Deviation {
  deviationId: string;
  situationId: string;
  messageType: string;       // "Olycka", "Vägarbete", ...
  messageTypeValue: string;  // "Accident", "RoadWork", ...
  message: string;
  severityCode: number | null;
  severityText: string | null;
  roadNumber: string | null;
  countyNos: number[];
  lon: number | null;
  lat: number | null;
  wgs84Line: string | null;
  startTime: string | null;
  endTime: string | null;
  iconId: string | null;
  modifiedTime: string;
  deleted: boolean;
}

// Trafikverket's ACTUAL MessageTypeValue vocabulary — verified against our own archive
// 2026-08-31. The generic words "Obstruction" and "Incident" DO NOT EXIST in the feed;
// the real values are VehicleObstruction, GeneralObstruction, AnimalPresenceObstruction,
// EnvironmentalObstruction, MaintenanceWorks, RoadOrCarriagewayOrLaneManagement, ...
// The old KEEP set listed the generic words and therefore matched nothing but "Accident".
//
// This set is deliberately kept at what we ACTUALLY ship today, so the code stops
// claiming a scope it never had. Widening it to obstructions is a PRODUCT decision, not
// a typo fix: every deviation is currently mapped to HazardKind "accident" by all three
// parsers, so an unwidened voice would announce a stopped vehicle as "Olycka rapporterad
// 3 kilometer framför dig" — a direct breach of the overstatement invariant in CLAUDE.md.
// See BACKLOG #32 for that card. DECISIONS #5's original intent is preserved there.
//
// 22/9 (DECISIONS #318, kort #241): AnimalPresenceObstruction widened INTO the live table, so
// that Trafikverket's deletes clear a removed animal (the archive never sees a delete). The
// overstatement risk above is closed in the snapshot, not here: publish/snapshot-core.ts sends
// only Accident as `deviations` and the animals under their own key `djur`. MIRROR of
// supabase/functions/ingest-live/index.ts.
const KEEP = new Set(["Accident", "AnimalPresenceObstruction"]);

/**
 * Types that go to `situation_archive` (BACKLOG #33) — the durable record the miss-
 * measurement (#19) judges the engine against once real ice arrives. Allow-listed on
 * purpose: MaintenanceWorks and RoadOrCarriagewayOrLaneManagement are chronic noise and
 * 62 % of the feed (measured 2026-08-31); they never enter. What remains is ~210 rows/day.
 * Accidents are archived too, so the archive is the single place to ask "what happened".
 */
const ARCHIVE = new Set([
  "Accident",
  "WeatherRelatedRoadConditions", "NonWeatherRelatedRoadConditions",
  "PoorEnvironmentConditions", "EnvironmentalObstruction",
  "AnimalPresenceObstruction", "VehicleObstruction", "GeneralObstruction",
  "AbnormalTraffic", "AffectedCarriagewayAndLanes",
]);

/** Pure: does a LIVE (non-deleted) deviation of this type belong in the archive? */
export function shouldArchive(messageTypeValue: string): boolean {
  return ARCHIVE.has(messageTypeValue);
}

/** What to do with one Deviation from the feed. Pure, so it can be tested directly. */
export type IngestAction = "store" | "mark-deleted" | "skip";

/**
 * Deletes are handled separately ON PURPOSE. A deleted Situation must always be able to
 * clear a hazard we are actively warning about — if a cleared accident lingered, the app
 * would keep announcing it. The old code achieved that with `|| deleted`, which also let
 * EVERY deleted deviation of EVERY type into the table: 4 584 tombstones for objects we
 * never stored alive, growing ~650/day (measured 2026-08-31).
 *
 * "mark-deleted" therefore means: flip the flag IF we already hold that row, otherwise do
 * nothing. Deletes still propagate for everything we track, and nothing else is archived.
 */
export function ingestAction(messageTypeValue: string, situationDeleted: boolean): IngestAction {
  if (situationDeleted) return "mark-deleted";
  return KEEP.has(messageTypeValue) ? "store" : "skip";
}

export async function fetchDeviations(apiKey: string, changeid = "0"): Promise<TvResult<Deviation>> {
  const { items, lastChangeId } = await tvFetch<any>(apiKey, {
    objecttype: "Situation",
    schemaversion: "1.6",
    namespace: "road.trafficinfo",
    changeid,
    includeDeleted: true,
  });
  const out: Deviation[] = [];
  for (const s of items) {
    for (const d of s.Deviation ?? []) {
      const mtv = d.MessageTypeValue ?? "";
      const action = ingestAction(mtv, Boolean(s.Deleted));
      // "skip" for the live table may still be an archive row (a live obstruction).
      if (action === "skip" && !shouldArchive(mtv)) continue;
      const p = parseWgs84Point(d?.Geometry?.Point?.WGS84 ?? d?.Geometry?.WGS84);
      out.push({
        deviationId: String(d.Id ?? s.Id),
        situationId: String(s.Id ?? d.Id),
        messageType: d.MessageType ?? "",
        messageTypeValue: d.MessageTypeValue ?? "",
        message: d.Message ?? "",
        severityCode: d.SeverityCode ?? null,
        severityText: d.SeverityText ?? null,
        roadNumber: d.RoadNumber ?? null,
        countyNos: d.CountyNo ?? [],
        lon: p?.lon ?? null, lat: p?.lat ?? null,
        wgs84Line: d?.Geometry?.Line?.WGS84 ?? null,
        startTime: d.StartTime ?? null,
        endTime: d.EndTime ?? null,
        iconId: d.IconId ?? null,
        modifiedTime: d.ModifiedTime ?? s.ModifiedTime,
        deleted: Boolean(s.Deleted),
      });
    }
  }
  return { items: out, lastChangeId };
}
