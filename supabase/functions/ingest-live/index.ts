// Livemotorn — Supabase Edge Function, körs varje minut av pg_cron.
// Hämtar ENDAST ändringar (changeid) för Situation (olyckor m.m.) + RoadCondition (halka)
// och upsertar direkt i databasen. Väder/kameror/vilt ligger kvar i 30-min-flödet (källorna
// uppdaterar ändå inte oftare). GitHub-ingesten blir reserv — dubbla skrivningar är ofarliga
// (idempotenta upserts).
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

const ENDPOINT = "https://api.trafikinfo.trafikverket.se/v2/data.json";
const KEY = Deno.env.get("TRAFIKVERKET_API_KEY")!;
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

async function tv(objecttype: string, schemaversion: string, changeid: string, ns?: string) {
  const body = `<REQUEST><LOGIN authenticationkey="${esc(KEY)}" />` +
    `<QUERY objecttype="${objecttype}" schemaversion="${schemaversion}"` +
    (ns ? ` namespace="${ns}"` : "") +
    ` changeid="${changeid}" includedeletedobjects="true" sseurl="false"></QUERY></REQUEST>`;
  const r = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "text/xml" }, body });
  if (!r.ok) throw new Error(`TV ${objecttype}: ${r.status}`);
  const j = await r.json();
  const res = j?.RESPONSE?.RESULT?.[0] ?? {};
  return { items: res[objecttype] ?? [], lastChangeId: String(res?.INFO?.LASTCHANGEID ?? changeid) };
}

const pt = (w?: string) => { const m = w?.match(/POINT \(([-\d.]+) ([-\d.]+)\)/); return m ? [Number(m[1]), Number(m[2])] : null; };
// MIRROR of ingest/sources/situations.ts — keep the two in step. Trafikverket's real
// MessageTypeValue vocabulary has no "Obstruction"/"Incident"; the old set matched only
// "Accident" in practice. Widening = product decision, see BACKLOG #32.
const KEEP = new Set(["Accident"]);
// MIRROR of ARCHIVE in ingest/sources/situations.ts (#33). Live obstructions etc. go to
// situation_archive — never to the live table, never deleted by ingest.
const ARCHIVE = new Set([
  "Accident", "WeatherRelatedRoadConditions", "NonWeatherRelatedRoadConditions",
  "PoorEnvironmentConditions", "EnvironmentalObstruction", "AnimalPresenceObstruction",
  "VehicleObstruction", "GeneralObstruction", "AbnormalTraffic", "AffectedCarriagewayAndLanes",
]);

async function cursor(name: string): Promise<string> {
  const r = await sql`SELECT last_change_id FROM sync_state WHERE source = ${name}`;
  return r[0]?.last_change_id ?? "0";
}
const saveCursor = (name: string, id: string) =>
  sql`INSERT INTO sync_state (source, last_change_id, synced_at) VALUES (${name}, ${id}, now())
      ON CONFLICT (source) DO UPDATE SET last_change_id = ${id}, synced_at = now()`;

async function situations() {
  const { items, lastChangeId } = await tv("Situation", "1.6", await cursor("deviations"), "road.trafficinfo");
  let n = 0;
  for (const s of items) for (const d of s.Deviation ?? []) {
    // Deletes clear hazards we are warning about, so they must always be applied — but
    // as an UPDATE, so a delete can never CREATE a row for a type we never ship.
    if (s.Deleted) {
      await sql`UPDATE deviations SET deleted = TRUE,
                  modified_time = ${s.ModifiedTime ?? new Date().toISOString()}
                WHERE deviation_id = ${String(d.Id ?? s.Id)}`;
      n++;
      continue;
    }
    const p = pt(d?.Geometry?.Point?.WGS84 ?? d?.Geometry?.WGS84);
    if (ARCHIVE.has(d.MessageTypeValue)) {
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
    if (!KEEP.has(d.MessageTypeValue)) continue;
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
  await saveCursor("deviations", lastChangeId);
  return n;
}

async function roadconditions() {
  const { items, lastChangeId } = await tv("RoadCondition", "1.2", await cursor("road_conditions"));
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
  await saveCursor("road_conditions", lastChangeId);
  return n;
}

// Väderstationerna (#72, 8/9): flyttade hit från GitHub-ingesten när Actions-minuterna tog
// slut 5/9 och databasen slutade få mätningar. Arkivpolicyn är DECISIONS #4:s — spara bara
// "intressanta" lägen (yta ≤ 5 °C, eller nederbörd) så gratisnivån räcker. Speglar
// ingest/sources/weather.ts; ändras den ena ska den andra följa med.
async function weather() {
  const { items, lastChangeId } = await tv("WeatherMeasurepoint", "2.1", await cursor("weather"));
  let n = 0;
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
    // Arkivpolicyn: ointressanta lägen skrivs inte alls.
    const intressant = (yta !== null && yta <= 5) || rain || snow || (nederbord && nederbord !== "no");
    if (!intressant) continue;
    // Regnmängd, snöns vattenvärde, vind och sikt (kort #42 steg 0a, DECISIONS #77-serien i
    // ingest/sources/weather.ts): första versionen (8/9) skrev bara temperatur och ja/nej —
    // hela #42:s facit (rain_sum_mm, grind V-A) svalt sedan 5/9 fast arkivet fick rader.
    // Speglar weather.ts fält för fält; ändras den ena ska den andra följa med.
    const rainSum = typeof agg30?.RainSum?.Value === "number" ? agg30.RainSum.Value : null;
    const snowWateq = typeof agg30?.SnowSum?.WaterEquivalent?.Value === "number" ? agg30.SnowSum.WaterEquivalent.Value : null;
    await sql`INSERT INTO weather_observations (station_id, name, geom, sample_time,
        surface_temp_c, air_temp_c, dewpoint_c, humidity_pct, precipitation, rain, snow,
        rain_sum_mm, snow_wateq_mm, wind_speed_ms, wind_gust_ms, wind_dir_deg, visibility_m)
      VALUES (${String(w.Id)}, ${w.Name ?? ""},
        ST_SetSRID(ST_MakePoint(${p[0]}, ${p[1]}), 4326), ${o.Sample},
        ${yta}, ${o?.Air?.Temperature?.Value ?? null}, ${o?.Air?.Dewpoint?.Value ?? null},
        ${o?.Air?.RelativeHumidity?.Value ?? null}, ${nederbord}, ${rain}, ${snow},
        ${rainSum}, ${snowWateq},
        ${o?.Wind?.[0]?.Speed?.Value ?? null}, ${o?.Aggregated30minutes?.Wind?.SpeedMax?.Value ?? null},
        ${o?.Wind?.[0]?.Direction?.Value ?? null}, ${o?.Air?.VisibleDistance?.Value ?? null})
      ON CONFLICT (station_id, sample_time) DO NOTHING`;
    n++;
  }
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
  await saveCursor("weather", lastChangeId);
  return n;
}

Deno.serve(async (req) => {
  // Fail-closed: kräver delad hemlighet (sätts som secret INGEST_KEY; cron skickar headern).
  const k = Deno.env.get("INGEST_KEY");
  if (!k || req.headers.get("x-halkvakt-key") !== k) {
    return new Response("forbidden", { status: 403 });
  }
  try {
    const [s, r, w] = await Promise.all([situations(), roadconditions(), weather()]);
    return new Response(JSON.stringify({ ok: true, situations: s, roadconditions: r, weather: w }), {
      headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
