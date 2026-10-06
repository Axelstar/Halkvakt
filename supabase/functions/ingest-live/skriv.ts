// Livemotorns skrivningar (kort #290, DECISIONS #449): situationerna, väglaget och vädret till databasen. Databasen kommer in som
// argument, så att skriv_test.ts prövar SAMMA SQL mot en tillfällig PostGIS som driften kör mot Supabase. Hämtningen från
// Trafikverket och kursorerna bor kvar i index.ts. Besluten om vad som lagras, arkiveras och raderas kommer ur situationspolicy.ts
// (delad med reservingesten) och arkivpolicy.ts — här finns bara skrivandet.
import { halvtimme, skaArkiveras } from "./arkivpolicy.ts";
import { ingestAction, shouldArchive } from "./situationspolicy.ts";

// deno-lint-ignore no-explicit-any
type Sql = any;
// deno-lint-ignore no-explicit-any
type Post = any;

const pt = (w?: string) => { const m = w?.match(/POINT \(([-\d.]+) ([-\d.]+)\)/); return m ? [Number(m[1]), Number(m[2])] : null; };

/** Situationerna (Situation 1.6): en rad per Deviation. Returnerar antalet skrivna och raderade. */
export async function skrivSituationer(sql: Sql, items: Post[]): Promise<number> {
  let n = 0;
  for (const s of items) for (const d of s.Deviation ?? []) {
    const atgard = ingestAction(d.MessageTypeValue ?? "", Boolean(s.Deleted));
    // Deletes clear hazards we are warning about, so they must always be applied — but
    // as an UPDATE, so a delete can never CREATE a row for a type we never ship.
    if (atgard === "mark-deleted") {
      await sql`UPDATE deviations SET deleted = TRUE,
                  modified_time = ${s.ModifiedTime ?? new Date().toISOString()}
                WHERE deviation_id = ${String(d.Id ?? s.Id)}`;
      n++;
      continue;
    }
    const p = pt(d?.Geometry?.Point?.WGS84 ?? d?.Geometry?.WGS84);
    if (shouldArchive(d.MessageTypeValue ?? "")) {
      await sql`INSERT INTO situation_archive (deviation_id, message_type_value, message_type, message,
                  severity_code, road_number, icon_id, geom, start_time, end_time)
                VALUES (${String(d.Id ?? s.Id)}, ${d.MessageTypeValue}, ${d.MessageType ?? null}, ${d.Message ?? ""},
                  ${d.SeverityCode ?? null}, ${d.RoadNumber ?? null}, ${d.IconId ?? null},
                  ${p ? sql`ST_SetSRID(ST_MakePoint(${p[0]}, ${p[1]}), 4326)` : null},
                  ${d.StartTime ?? null}, ${d.EndTime ?? null})
                ON CONFLICT (deviation_id) DO UPDATE SET message = EXCLUDED.message,
                  severity_code = EXCLUDED.severity_code, end_time = EXCLUDED.end_time,
                  geom = COALESCE(EXCLUDED.geom, situation_archive.geom), last_seen = now()`;
    }
    if (atgard !== "store") continue;
    await sql`INSERT INTO deviations (deviation_id, situation_id, message_type, message_type_value, message,
        severity_code, severity_text, road_number, county_nos, geom, start_time, end_time, icon_id, modified_time, deleted)
      VALUES (${String(d.Id ?? s.Id)}, ${String(s.Id ?? d.Id)}, ${d.MessageType ?? ""}, ${d.MessageTypeValue ?? ""},
        ${d.Message ?? ""}, ${d.SeverityCode ?? null}, ${d.SeverityText ?? null}, ${d.RoadNumber ?? null},
        ${d.CountyNo ?? []}, ${p ? sql`ST_SetSRID(ST_MakePoint(${p[0]}, ${p[1]}), 4326)` : null},
        ${d.StartTime ?? null}, ${d.EndTime ?? null}, ${d.IconId ?? null}, ${s.ModifiedTime ?? new Date().toISOString()}, ${!!s.Deleted})
      ON CONFLICT (deviation_id) DO UPDATE SET message_type = EXCLUDED.message_type,
        message_type_value = EXCLUDED.message_type_value, message = EXCLUDED.message,
        severity_code = EXCLUDED.severity_code, severity_text = EXCLUDED.severity_text,
        road_number = EXCLUDED.road_number, county_nos = EXCLUDED.county_nos,
        geom = COALESCE(EXCLUDED.geom, deviations.geom), start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time, icon_id = EXCLUDED.icon_id,
        modified_time = EXCLUDED.modified_time, deleted = EXCLUDED.deleted`;
    n++;
  }
  return n;
}

/** Väglaget (RoadCondition 1.2): en rad per vägsträcka. */
export async function skrivVaglag(sql: Sql, items: Post[]): Promise<number> {
  let n = 0;
  for (const rc of items) {
    const line = rc?.Geometry?.Line?.WGS84 ?? null;
    await sql`INSERT INTO road_conditions (segment_id, condition_code, condition_text, condition_info,
        county_nos, road_number, geom, start_time, end_time, modified_time, deleted)
      VALUES (${String(rc.Id)}, ${rc.ConditionCode ?? 1}, ${rc.ConditionText ?? "Normalt"}, ${rc.ConditionInfo ?? []},
        ${rc.CountyNo ?? []}, ${rc.RoadNumber?.trim() || null},
        ${line ? sql`ST_SetSRID(ST_GeomFromText(${line.replace("LINESTRING (", "LINESTRING(")}), 4326)` : null},
        ${rc.StartTime ?? null}, ${rc.EndTime ?? null}, ${rc.ModifiedTime ?? new Date().toISOString()}, ${!!rc.Deleted})
      ON CONFLICT (segment_id) DO UPDATE SET condition_code = EXCLUDED.condition_code,
        condition_text = EXCLUDED.condition_text, condition_info = EXCLUDED.condition_info,
        county_nos = EXCLUDED.county_nos, road_number = EXCLUDED.road_number,
        geom = COALESCE(EXCLUDED.geom, road_conditions.geom), start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time, modified_time = EXCLUDED.modified_time, deleted = EXCLUDED.deleted`;
    n++;
  }
  return n;
}

// Väderstationerna (#72, 8/9): flyttade hit från GitHub-ingesten när Actions-minuterna tog
// slut 5/9 och databasen slutade få mätningar. Arkivpolicyn är DECISIONS #4:s — spara bara
// "intressanta" lägen (yta ≤ 5 °C, eller nederbörd) så gratisnivån räcker. Speglar
// ingest/sources/weather.ts; ändras den ena ska den andra följa med.
/** Vädret (WeatherMeasurepoint 2.1): arkivet efter arkivpolicyn och nuläget per station. `arkivpolicy` är svarets rad om
 *  policyn (DECISIONS #353): hur många varma halvtimmesrader, eller att frågan fallerade. */
export async function skrivVader(sql: Sql, items: Post[]): Promise<{ n: number; arkivpolicy: string }> {
  let n = 0;
  let arkivpolicy = "";
  // ARKIVPOLICYN (DECISIONS #4, ändrad #353, kort #253): vilka stationer har redan en rad i sina halvtimmar? EN fråga per
  // körning. Fallerar den gäller den gamla regeln — bara kalla och blöta lägen — och felet står i svaret; ingesten är
  // livemotorns och får aldrig stanna för en mätfråga.
  let har: Set<string> | null = null, varma = 0;
  try {
    const r = await sql`SELECT station_id, sample_time FROM weather_observations WHERE sample_time > now() - interval '3 hours'`;
    har = new Set(r.map((x: Post) => halvtimme(String(x.station_id), new Date(x.sample_time).toISOString())));
  } catch (e) {
    arkivpolicy = `FEL, gamla regeln: ${String(e).slice(0, 100)}`;
  }
  // weather_latest = "nuläge per station, alltid upsertad" (sql/001_init.sql) — det är den
  // tabellen publicera läser. Första versionen (8/9 fm) skrev BARA arkivet, så nuläget
  // frös på 5/9 och appens enda väderpunkt var Storvik på −10,7 °C i september (#75).
  // Skrivs för VARJE mätning, även ointressanta: annars fryser en station som värmts upp
  // fast på sitt sista kalla värde. Batchad som i ingest/db.ts; bakåtvakt på sample_time.
  const latest: { id: string; name: string; lon: number; lat: number; t: string; yta: number | null;
                  luft: number | null; nbd: string | null; rain: boolean; snow: boolean }[] = [];
  for (const w of items) {
    if (w.Deleted) continue;
    const p = pt(w?.Geometry?.WGS84);
    const o = w?.Observation;
    if (!p || !o?.Sample) continue;
    const yta = o?.Surface?.Temperature?.Value ?? null;
    const agg = o?.Aggregated10minutes?.Precipitation;
    const agg30 = o?.Aggregated30minutes?.Precipitation;
    const rain = Boolean(agg?.Rain), snow = Boolean(agg?.Snow);
    const nederbord = o?.Weather?.Precipitation ?? null;
    latest.push({ id: String(w.Id), name: w.Name ?? "", lon: p[0], lat: p[1], t: o.Sample, yta,
                  luft: o?.Air?.Temperature?.Value ?? null, nbd: nederbord, rain, snow });
    // Arkivpolicyn (DECISIONS #4, ändrad #353): kalla och blöta lägen skrivs alltid, varma och torra EN gång per station och
    // halvtimme — annars saknade grind A och vägpunktsgrinden de varma grannarna som driftens prognos tar med (kort #253).
    const intressant = (yta !== null && yta <= 5) || rain || snow || (nederbord && nederbord !== "no");
    const nyckel = halvtimme(String(w.Id), o.Sample);
    if (!skaArkiveras(!!intressant, nyckel, har)) continue;
    if (!intressant) varma++;
    // Regnmängd, snöns vattenvärde, vind och sikt (kort #42 steg 0a, DECISIONS #77-serien i
    // ingest/sources/weather.ts): första versionen (8/9) skrev bara temperatur och ja/nej —
    // hela #42:s facit (rain_sum_mm, grind V-A) svalt sedan 5/9 fast arkivet fick rader.
    // Speglar weather.ts fält för fält; ändras den ena ska den andra följa med. Ytstatusgivarna (Surface.Water/Ice/Snow/Grip,
    // kort #294, DECISIONS #465) är det enda i VViS som mäter att vägen blev hal; NULL = ingen givare, aldrig "torrt".
    const rainSum = typeof agg30?.RainSum?.Value === "number" ? agg30.RainSum.Value : null;
    const snowWateq = typeof agg30?.SnowSum?.WaterEquivalent?.Value === "number" ? agg30.SnowSum.WaterEquivalent.Value : null;
    await sql`INSERT INTO weather_observations (station_id, name, geom, sample_time,
        surface_temp_c, air_temp_c, dewpoint_c, humidity_pct, precipitation, rain, snow,
        rain_sum_mm, snow_wateq_mm, wind_speed_ms, wind_gust_ms, wind_dir_deg, visibility_m,
        surface_water, surface_ice, surface_snow, surface_grip)
      VALUES (${String(w.Id)}, ${w.Name ?? ""},
        ST_SetSRID(ST_MakePoint(${p[0]}, ${p[1]}), 4326), ${o.Sample},
        ${yta}, ${o?.Air?.Temperature?.Value ?? null}, ${o?.Air?.Dewpoint?.Value ?? null},
        ${o?.Air?.RelativeHumidity?.Value ?? null}, ${nederbord}, ${rain}, ${snow},
        ${rainSum}, ${snowWateq},
        ${o?.Wind?.[0]?.Speed?.Value ?? null}, ${o?.Aggregated30minutes?.Wind?.SpeedMax?.Value ?? null},
        ${o?.Wind?.[0]?.Direction?.Value ?? null}, ${o?.Air?.VisibleDistance?.Value ?? null},
        ${typeof o?.Surface?.Water === "boolean" ? o.Surface.Water : null}, ${typeof o?.Surface?.Ice === "boolean" ? o.Surface.Ice : null},
        ${typeof o?.Surface?.Snow === "boolean" ? o.Surface.Snow : null}, ${typeof o?.Surface?.Grip?.Value === "number" ? o.Surface.Grip.Value : null})
      ON CONFLICT (station_id, sample_time) DO NOTHING`;
    har?.add(nyckel);
    n++;
  }
  if (har) arkivpolicy = `${varma} varma halvtimmesrader`;
  if (latest.length) {
    await sql`INSERT INTO weather_latest (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow)
      SELECT u.station_id, u.name, ST_SetSRID(ST_MakePoint(u.lon, u.lat), 4326), u.sample_time,
             u.surface_temp_c, u.air_temp_c, u.precipitation, u.rain::boolean, u.snow::boolean
      FROM UNNEST(${latest.map((x) => x.id)}::text[], ${latest.map((x) => x.name)}::text[],
                  ${latest.map((x) => x.lon)}::float8[], ${latest.map((x) => x.lat)}::float8[],
                  ${latest.map((x) => x.t)}::timestamptz[], ${latest.map((x) => x.yta)}::numeric[],
                  ${latest.map((x) => x.luft)}::numeric[], ${latest.map((x) => x.nbd)}::text[],
                  ${latest.map((x) => String(x.rain))}::text[], ${latest.map((x) => String(x.snow))}::text[])
           AS u(station_id, name, lon, lat, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow)
      ON CONFLICT (station_id) DO UPDATE SET name = EXCLUDED.name, geom = EXCLUDED.geom,
        sample_time = EXCLUDED.sample_time, surface_temp_c = EXCLUDED.surface_temp_c,
        air_temp_c = EXCLUDED.air_temp_c, precipitation = EXCLUDED.precipitation,
        rain = EXCLUDED.rain, snow = EXCLUDED.snow
      WHERE EXCLUDED.sample_time >= weather_latest.sample_time`;
  }
  return { n, arkivpolicy };
}
