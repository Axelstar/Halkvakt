// WeatherMeasurepoint (schema 2.1) -> normalized weather observations.
// Archive policy (DECISIONS.md #4): store only "interesting" observations to
// respect the Supabase free tier: surface temp <= 5C, or any precipitation,
// or surface temp moved >= 0.5C since the last stored value for that station.
import { tvFetch, parseWgs84Point, type TvResult } from "../trafikverket.ts";

export interface WeatherObs {
  stationId: string;
  name: string;
  lon: number;
  lat: number;
  sampleTime: string;        // ISO from API
  surfaceTempC: number | null;
  airTempC: number | null;
  dewpointC: number | null;
  humidityPct: number | null;
  precipitation: string | null; // "no" | "rain" | "snow" | ...
  rain: boolean;
  snow: boolean;
  rainSumMm: number | null;     // Aggregated30minutes (mm/30 min) — matches ingest cadence
  snowWateqMm: number | null;   // Aggregated30minutes SnowSum.WaterEquivalent (mm/30 min)
  // Kort #48 (GOLVET.md bygge 1): fanns i källan, låg på golvet — verifierade fältvägar.
  windSpeedMs: number | null;   // Observation.Wind[0].Speed (m/s)
  windGustMs: number | null;    // Aggregated30minutes.Wind.SpeedMax — byvinden fäller höga fordon
  windDirDeg: number | null;    // Observation.Wind[0].Direction
  visibilityM: number | null;   // Observation.Air.VisibleDistance — dimma/sikt (hål C)
  modifiedTime: string;
}

export async function fetchWeather(apiKey: string, changeid = "0"): Promise<TvResult<WeatherObs>> {
  const { items, lastChangeId } = await tvFetch<any>(apiKey, {
    objecttype: "WeatherMeasurepoint",
    schemaversion: "2.1",
    changeid,
  });
  const out: WeatherObs[] = [];
  for (const w of items) {
    if (w.Deleted) continue;
    const p = parseWgs84Point(w?.Geometry?.WGS84);
    const o = w?.Observation;
    if (!p || !o?.Sample) continue;
    const agg = o?.Aggregated10minutes?.Precipitation;
    const agg30 = o?.Aggregated30minutes?.Precipitation;
    out.push({
      stationId: String(w.Id),
      name: w.Name ?? "",
      lon: p.lon, lat: p.lat,
      sampleTime: o.Sample,
      surfaceTempC: o?.Surface?.Temperature?.Value ?? null,
      airTempC: o?.Air?.Temperature?.Value ?? null,
      dewpointC: o?.Air?.Dewpoint?.Value ?? null,
      humidityPct: o?.Air?.RelativeHumidity?.Value ?? null,
      precipitation: o?.Weather?.Precipitation ?? null,
      rain: Boolean(agg?.Rain),
      snow: Boolean(agg?.Snow),
      rainSumMm: typeof agg30?.RainSum?.Value === "number" ? agg30.RainSum.Value : null,
      snowWateqMm: typeof agg30?.SnowSum?.WaterEquivalent?.Value === "number" ? agg30.SnowSum.WaterEquivalent.Value : null,
      windSpeedMs: o?.Wind?.[0]?.Speed?.Value ?? null,
      windGustMs: o?.Aggregated30minutes?.Wind?.SpeedMax?.Value ?? null,
      windDirDeg: o?.Wind?.[0]?.Direction?.Value ?? null,
      visibilityM: o?.Air?.VisibleDistance?.Value ?? null,
      modifiedTime: w.ModifiedTime,
    });
  }
  return { items: out, lastChangeId };
}

export function isInteresting(o: WeatherObs, lastStoredSurfaceTemp: number | null): boolean {
  if (o.surfaceTempC !== null && o.surfaceTempC <= 5) return true;
  if (o.rain || o.snow || (o.precipitation && o.precipitation !== "no")) return true;
  if (o.surfaceTempC !== null && lastStoredSurfaceTemp !== null
      && Math.abs(o.surfaceTempC - lastStoredSurfaceTemp) >= 0.5) return true;
  return lastStoredSurfaceTemp === null; // always store first sighting
}
