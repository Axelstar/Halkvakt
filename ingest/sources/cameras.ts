// TrafficSafetyCamera (schema 1) -> static camera sites. CC0. Changes rarely.
import { tvFetch, parseWgs84Point, type TvResult } from "../trafikverket.ts";

export interface CameraSite {
  cameraId: string;
  name: string;
  roadNumber: string | null;
  bearing: number | null; // direction of enforcement, degrees
  lon: number;
  lat: number;
  modifiedTime: string;
  deleted: boolean;
}

export async function fetchCameras(apiKey: string, changeid = "0"): Promise<TvResult<CameraSite>> {
  const { items, lastChangeId } = await tvFetch<any>(apiKey, {
    objecttype: "TrafficSafetyCamera",
    schemaversion: "1",
    changeid,
    includeDeleted: true,
  });
  const out: CameraSite[] = [];
  for (const c of items) {
    const p = parseWgs84Point(c?.Geometry?.WGS84);
    if (!p) continue;
    out.push({
      cameraId: String(c.Id),
      name: c.Name ?? "",
      roadNumber: c.RoadNumber ?? null,
      bearing: c.Bearing ?? null,
      lon: p.lon, lat: p.lat,
      modifiedTime: c.ModifiedTime,
      deleted: Boolean(c.Deleted),
    });
  }
  return { items: out, lastChangeId };
}
