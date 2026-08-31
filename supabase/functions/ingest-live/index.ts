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
    if (!KEEP.has(d.MessageTypeValue)) continue;
    const p = pt(d?.Geometry?.Point?.WGS84 ?? d?.Geometry?.WGS84);
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

Deno.serve(async (req) => {
  // Fail-closed: kräver delad hemlighet (sätts som secret INGEST_KEY; cron skickar headern).
  const k = Deno.env.get("INGEST_KEY");
  if (!k || req.headers.get("x-halkvakt-key") !== k) {
    return new Response("forbidden", { status: 403 });
  }
  try {
    const [s, r] = await Promise.all([situations(), roadconditions()]);
    return new Response(JSON.stringify({ ok: true, situations: s, roadconditions: r }), {
      headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
