// Situation (schema 1.6, namespace road.trafficinfo) -> live deviations.
// One Situation contains 1..n Deviations; we flatten to deviations.
import { tvFetch, parseWgs84Point, type TvResult } from "../trafikverket.ts";
import { ingestAction, shouldArchive } from "../../supabase/functions/ingest-live/situationspolicy.ts";

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

// Policyn — vilka typer som lagras levande, vilka som arkiveras och vad en radering gör — bor i
// supabase/functions/ingest-live/situationspolicy.ts, delad med livemotorn (kort #290, DECISIONS #449). Förut stod
// listorna här OCH i livemotorn som två handhållna kopior. Exporteras vidare för ingest/db.ts och proven.
export { ingestAction, shouldArchive, type IngestAction } from "../../supabase/functions/ingest-live/situationspolicy.ts";

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
