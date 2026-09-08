// PUBLICERA — bygger appens snapshot och lägger den på CDN, helt utan GitHub Actions.
//
// Bakgrund (#72, 8/9 2026): Actions-minuterna tog slut 5/9 13:12 och publish-map dog med
// dem. Appen serverade 66 timmar gammal data; åldersspärren räddade oss från att ljuga,
// men vakten hade inget att säga. Datan fanns hela tiden i databasen — bara sista steget
// saknades. Den här funktionen ÄR det steget, och den kostar noll Actions-minuter.
//
// Speglar publish/build-snapshot.ts (samma frågor, samma format) + publish/push-data.ts
// (Git Data API, inte git — samma skäl som där: git-over-HTTPS 403:ar med den token
// REST-API:t accepterar). Ändras den ena ska den andra följa med.
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
const REPO = "Axelstar/halkvakt-karta";
const token = Deno.env.get("PUBLISH_TOKEN")!;

async function gh(path: string, method = "GET", body?: unknown): Promise<any> {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}
const num = (x: unknown) => (x === null || x === undefined ? null : Number(x));

async function bygg() {
  const cams = await sql`SELECT camera_id, road_number, bearing, ST_X(geom) AS lon, ST_Y(geom) AS lat
                         FROM cameras WHERE NOT deleted`;
  const staticDoc = {
    schema: 1,
    cameras: cams.map((r: any) => ({
      id: r.camera_id, lon: Number(r.lon), lat: Number(r.lat),
      bearing: r.bearing === null ? null : Number(r.bearing), road: r.road_number,
    })),
  };

  const segs = await sql`
    SELECT segment_id, condition_code, condition_info, road_number,
           ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.0005))::json AS g
    FROM road_conditions
    WHERE NOT deleted AND geom IS NOT NULL
      AND (condition_code >= 2 OR EXISTS (
        SELECT 1 FROM unnest(condition_info) i WHERE i ~* '(^|[^a-zåäö])(is|snö|halka|frost)'))`;
  const wx = await sql`
    SELECT station_id, surface_temp_c, rain, snow, precipitation, ST_X(geom) AS lon, ST_Y(geom) AS lat
    FROM weather_latest
    WHERE surface_temp_c IS NOT NULL AND (surface_temp_c <= 3 OR snow)`;
  const devs = await sql`
    SELECT deviation_id, message_type, message_type_value, road_number, severity_code, end_time,
           ST_X(COALESCE(geom, ST_Centroid(line_geom))) AS lon,
           ST_Y(COALESCE(geom, ST_Centroid(line_geom))) AS lat
    FROM deviations
    WHERE NOT deleted AND (geom IS NOT NULL OR line_geom IS NOT NULL)
      AND (end_time IS NULL OR end_time > now())`;
  const vilt = await sql`
    SELECT event_id, ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat, species
    FROM polisen_events
    WHERE geom IS NOT NULL AND datetime > now() - interval '48 hours' ORDER BY datetime DESC`;
  const smhi = await sql`
    SELECT area_id, event_sv, level_code, ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.01))::json AS g
    FROM smhi_warnings WHERE geom IS NOT NULL AND (approx_end IS NULL OR approx_end > now())`;

  // Tidsstämpel i Europe/Stockholm för olycksfrasen (motorn läser ingen klocka, #28).
  const hhmm = (t: any) => t ? new Date(t).toLocaleTimeString("sv-SE",
    { timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit" }) : null;

  const liveDoc = {
    schema: 1,
    generated_at: new Date().toISOString(),
    segments: segs.map((r: any) => ({
      id: r.segment_id, line: r.g.coordinates, code: num(r.condition_code),
      info: r.condition_info ?? [], road: r.road_number,
    })),
    weather: wx.map((r: any) => ({
      id: r.station_id, lon: Number(r.lon), lat: Number(r.lat),
      yta: num(r.surface_temp_c), fukt: Boolean(r.rain || r.snow || r.precipitation),
    })),
    deviations: devs.map((r: any) => ({
      id: r.deviation_id, lon: Number(r.lon), lat: Number(r.lat),
      typ: r.message_type_value ?? r.message_type, road: r.road_number,
      sev: num(r.severity_code), slut: hhmm(r.end_time),
    })),
    wildlife: vilt.map((r: any) => ({
      id: String(r.event_id), lon: Number(r.lon), lat: Number(r.lat), art: r.species ?? null,
    })),
    smhi: smhi.map((r: any) => ({ id: r.area_id, event: r.event_sv, level: num(r.level_code), g: r.g })),
    bridges: [],   // #38: broarna publiceras av GitHub-jobbet när OSM-filen finns
  };
  return { staticDoc, liveDoc };
}

/** En commit med båda filerna via Git Data API — inget git, inga Actions-minuter. */
async function publicera(files: Record<string, string>) {
  const branch = await gh("/branches/main");
  const baseCommit = branch.commit.sha, baseTree = branch.commit.commit.tree.sha;
  const entries = [];
  for (const [path, content] of Object.entries(files)) {
    const blob = await gh("/git/blobs", "POST", { content: btoa(unescape(encodeURIComponent(content))), encoding: "base64" });
    entries.push({ path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const tree = await gh("/git/trees", "POST", { base_tree: baseTree, tree: entries });
  if (tree.sha === baseTree) return null;              // inget nytt att säga
  const commit = await gh("/git/commits", "POST", {
    message: `data: ${new Date().toISOString()} (Supabase)`, tree: tree.sha, parents: [baseCommit] });
  await gh("/git/refs/heads/main", "PATCH", { sha: commit.sha });
  return commit.sha.slice(0, 7);
}

Deno.serve(async (req) => {
  const k = Deno.env.get("INGEST_KEY");
  if (!k || req.headers.get("x-halkvakt-key") !== k) return new Response("forbidden", { status: 403 });
  try {
    const { staticDoc, liveDoc } = await bygg();
    const sha = await publicera({
      "data/app/v1/static.json": JSON.stringify(staticDoc),
      "data/app/v1/live.json": JSON.stringify(liveDoc),
    });
    return new Response(JSON.stringify({ ok: true, sha,
      segments: liveDoc.segments.length, weather: liveDoc.weather.length,
      deviations: liveDoc.deviations.length, wildlife: liveDoc.wildlife.length,
      cameras: staticDoc.cameras.length }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
