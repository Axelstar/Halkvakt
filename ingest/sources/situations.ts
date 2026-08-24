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

// v1 scope: accidents + obstacles only. Roadworks are chronic noise; revisit later.
const KEEP = new Set(["Accident", "Obstruction", "AbnormalTraffic", "Incident"]);

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
      if (!KEEP.has(d.MessageTypeValue) && !s.Deleted) continue;
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
