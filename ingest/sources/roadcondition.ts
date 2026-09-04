// RoadCondition (schema 1.2) -> operator-classified condition segments. The gold.
import { tvFetch, type TvResult } from "../trafikverket.ts";

export interface RoadConditionSeg {
  segmentId: string;
  conditionCode: number;       // numeric class from TV
  conditionText: string;       // "Normalt" | "Besvärligt" | ...
  conditionInfo: string[];     // ["Våt"], ["Is och snö"], ...
  countyNos: number[];
  roadNumber: string | null;
  locationText: string | null; // "E 4 Sundsvall Trafikplats Skönsmon - Gnarp" (kort #48 — röstens VAR-kandidat)
  wgs84Line: string | null;    // raw WKT LINESTRING, parsed by PostGIS
  startTime: string | null;
  endTime: string | null;
  modifiedTime: string;
  deleted: boolean;
}

export async function fetchRoadConditions(apiKey: string, changeid = "0"): Promise<TvResult<RoadConditionSeg>> {
  const { items, lastChangeId } = await tvFetch<any>(apiKey, {
    objecttype: "RoadCondition",
    schemaversion: "1.2",
    changeid,
    includeDeleted: true, // cleared segments must clear our alerts too
  });
  const out: RoadConditionSeg[] = items.map((r: any) => ({
    segmentId: String(r.Id),
    conditionCode: r.ConditionCode ?? 0,
    conditionText: r.ConditionText ?? "",
    conditionInfo: r.ConditionInfo ?? [],
    countyNos: r.CountyNo ?? [],
    roadNumber: r.RoadNumber ?? null,
    locationText: r.LocationText ?? null,
    wgs84Line: r?.Geometry?.WGS84 ?? null,
    startTime: r.StartTime ?? null,
    endTime: r.EndTime ?? null,
    modifiedTime: r.ModifiedTime,
    deleted: Boolean(r.Deleted),
  }));
  return { items: out, lastChangeId };
}
