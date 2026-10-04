// KARTLAGERKÄRNAN — kartsajtens filer data/{vaglag,vader,olyckor,kameror,kameror-vaglag}.geojson
// och data/meta.json, byggda ur databasen. Allt här blir PUBLIKT (bara CC0/CC BY-data).
//
// Kort #77 (8/9 2026): publish-map.yml hade kvar sin egen cron (*/30) och hade ensam ätit
// oktoberpotten på tre veckor (2 debiterade minuter × 48/dygn). Samma mönster som snapshot-
// kärnan: frågorna och formatet bor här, körtidsneutralt; Node (build-map-data.ts) och Deno
// (publicera, buntad) matar in en fråge-funktion. Kadensen är oförändrad — var 30:e minut
// (DECISIONS #22:s löfte om ≤ 35 min färsk webb, och issue #4:s halvtimmesserie av
// vaglag.geojson som segmentstabilitetsmått) — men den kostar noll Actions-minuter.
//
// Inga Node- eller Deno-importer. Namnen krockar inte med snapshot-core.ts: båda buntas
// in i SAMMA modul i publicera/index.ts.
import type { Q } from "./snapshot-core.ts";
import { byggLanssidor, type LanStation } from "./lanssidor.ts";

const featureCollection = (features: unknown[]) => ({ type: "FeatureCollection", features });
const numOrNull = (x: unknown) => (x === null || x === undefined ? null : Number(x));

/** Varje svensk station med länet för den närmaste väglagssträckan inom 20 km (länssidorna, #458). Stationerna saknar egen
 *  länskod i arkivet; sträckorna bär Trafikverkets CountyNo. */
export const STATION_LAN_SQL = `
  SELECT w.station_id, w.name, n.lan
  FROM weather_latest w
  CROSS JOIN LATERAL (SELECT rc.county_nos[1] AS lan, rc.geom FROM road_conditions rc
                      WHERE NOT rc.deleted AND rc.geom IS NOT NULL ORDER BY rc.geom <-> w.geom LIMIT 1) n
  WHERE n.lan IS NOT NULL AND ST_DWithin(n.geom::geography, w.geom::geography, 20000)`;

/** `appVader` = lägesfilens väderpunkter (de som klarar appens vakter). Med den skrivs länssidorna (#458); utan den hoppas de över. */
export async function buildMapData(q: Q, opts: {
  trvKey?: string; fetchFn?: typeof fetch; now?: Date; appVader?: { id: string; yta: number | null; fukt: boolean }[];
} = {}) {
  const now = opts.now ?? new Date();
  const notes: string[] = [];
  const files: Record<string, string> = {};
  const put = (name: string, obj: unknown) => { files[name] = JSON.stringify(obj); };

  const vaglag = await q(`
    SELECT segment_id, condition_code, condition_text, condition_info, road_number, location_text, modified_time, county_nos[1] AS lan,
           ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.001))::json AS g
    FROM road_conditions WHERE NOT deleted AND geom IS NOT NULL`);
  put("vaglag.geojson", featureCollection(vaglag.map((r) => ({
    type: "Feature", geometry: r.g,
    // segment_id (issue #4): halvtimmescommits i kartrepot = gratis tidsserie för segment-
    // stabilitet inför marsdomen. plats = LocationText (kort #48), fylls i takt med omklassningar.
    properties: { segment_id: r.segment_id, code: numOrNull(r.condition_code), text: r.condition_text,
                  info: r.condition_info, road: r.road_number, plats: r.location_text,
                  updated: r.modified_time, lan: numOrNull(r.lan) } }))));

  // Sverige (Trafikverket, CC0) + Finland (Fintraffic, CC BY 4.0, attribution på kartsidan)
  // + Danmark (#34/#44/#45). Kartan visar ALLA stationer, även de givarvakten (#75) döljer
  // för appen — kartan är ett lager att titta på, inte en röst som larmar.
  const vader = await q(`
    SELECT 'SE' AS land, station_id, name, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow,
           ST_AsGeoJSON(geom)::json AS g
    FROM weather_latest
    UNION ALL
    SELECT 'FI', station_id, name, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow,
           ST_AsGeoJSON(geom)::json
    FROM fi.weather_latest WHERE surface_temp_c IS NOT NULL
    UNION ALL
    SELECT 'DK', station_id, name, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow,
           ST_AsGeoJSON(geom)::json
    FROM dk.weather_latest WHERE surface_temp_c IS NOT NULL`);
  put("vader.geojson", featureCollection(vader.map((r) => ({
    type: "Feature", geometry: r.g,
    properties: { land: r.land, name: r.name, t: r.sample_time,
                  yta: numOrNull(r.surface_temp_c), luft: numOrNull(r.air_temp_c),
                  nbd: r.precipitation, sno: r.snow } }))));

  const olyckor = await q(`
    SELECT 'SE' AS land, deviation_id, message_type, message, severity_text, road_number, start_time,
           ST_AsGeoJSON(COALESCE(geom, ST_Centroid(line_geom)))::json AS g, county_nos[1] AS lan
    FROM deviations
    WHERE NOT deleted AND (geom IS NOT NULL OR line_geom IS NOT NULL)
      AND (end_time IS NULL OR end_time > now())
      AND message_type_value = 'Accident'   -- #318: djuren ligger i samma tabell sedan 22/9
    UNION ALL
    SELECT 'FI', deviation_id, message_type, message, severity_text, road_number, start_time,
           ST_AsGeoJSON(geom)::json, NULL::int
    FROM fi.deviations
    WHERE NOT deleted AND geom IS NOT NULL AND (end_time IS NULL OR end_time > now())
      AND message_type_value = 'Accident'
    UNION ALL
    SELECT 'DK', deviation_id, message_type, message, severity_text, road_number, start_time,
           ST_AsGeoJSON(geom)::json, NULL::int
    FROM dk.deviations
    WHERE NOT deleted AND geom IS NOT NULL AND (end_time IS NULL OR end_time > now())
      AND message_type_value = 'Accident'`);
  put("olyckor.geojson", featureCollection(olyckor.map((r) => ({
    type: "Feature", geometry: r.g,
    properties: { land: r.land, typ: r.message_type, msg: r.message, allvar: r.severity_text,
                  road: r.road_number, start: r.start_time } }))));

  const kameror = await q(`
    SELECT camera_id, name, road_number, bearing, ST_AsGeoJSON(geom)::json AS g
    FROM cameras WHERE NOT deleted`);
  put("kameror.geojson", featureCollection(kameror.map((r) => ({
    type: "Feature", geometry: r.g,
    properties: { name: r.name, road: r.road_number, bearing: numOrNull(r.bearing) } }))));

  // Väglagskamerornas koordinater (byggplan v3 punkt 1.5, kort #38b(2)): ankarfil för
  // ankarklippningen, samma Camera-fråga som skuggmotorn. Fail-soft: kamerorna ändras
  // sällan, så vid TRV-fel skrivs filen inte och den förra ligger kvar på CDN — men
  // det LOGGAS med API:ets svarskropp (läxan i CLAUDE.md: "TRV 400" utan kropp kostade
  // ett diagnosvarv), och meta.json bär frånvaron så healthcheck kan se den.
  let kamerorVaglag: number | null = null;
  if (!opts.trvKey) notes.push("kameror-vaglag HOPPAS ÖVER: TRAFIKVERKET_API_KEY saknas");
  else {
    try {
      const body = `<REQUEST><LOGIN authenticationkey="${opts.trvKey}"/><QUERY objecttype="Camera" schemaversion="1" limit="2500"><FILTER><EQ name="Type" value="Väglagskamera"/></FILTER><INCLUDE>Id</INCLUDE><INCLUDE>Name</INCLUDE><INCLUDE>PhotoUrl</INCLUDE><INCLUDE>Direction</INCLUDE><INCLUDE>Geometry.WGS84</INCLUDE></QUERY></REQUEST>`;
      const r = await (opts.fetchFn ?? fetch)("https://api.trafikinfo.trafikverket.se/v2/data.json", {
        method: "POST", headers: { "Content-Type": "text/xml" }, body });
      if (!r.ok) throw new Error(`TRV ${r.status}: ${(await r.text()).slice(0, 300)}`);
      const rows = (await r.json())?.RESPONSE?.RESULT?.[0]?.Camera ?? [];
      const feats = rows.flatMap((c: any) => {
        const m = /POINT \(([\d.]+) ([\d.]+)\)/.exec(c?.Geometry?.WGS84 ?? "");
        return m ? [{ type: "Feature",
          geometry: { type: "Point", coordinates: [+m[1], +m[2]] },
          properties: { id: String(c.Id), name: c.Name ?? null, photo: c.PhotoUrl ?? null,
                        dir: c.Direction ?? null } }] : [];
      });
      if (feats.length < 500) throw new Error(`bara ${feats.length} väglagskameror — trasigt svar?`);
      put("kameror-vaglag.geojson", { ...featureCollection(feats), generated_at: now.toISOString() });
      kamerorVaglag = feats.length;
    } catch (e) { notes.push(`kameror-vaglag HOPPAS ÖVER (förra filen kvar på CDN): ${String((e as Error).message)}`); }
  }

  // Vilt: BARA länsstatistik (polisens GPS = länscentrum, DECISIONS #13 — inga låtsaspunkter).
  const vilt = await q(`
    SELECT count(*) FILTER (WHERE datetime > now() - interval '24 hours') AS dygn,
           count(*) FILTER (WHERE datetime > now() - interval '7 days') AS vecka,
           (SELECT species FROM polisen_events
            WHERE datetime > now() - interval '7 days' AND species IS NOT NULL
            GROUP BY species ORDER BY count(*) DESC LIMIT 1) AS vanligast
    FROM polisen_events`);
  const smhiW = await q(`
    SELECT event_sv, level_sv, level_code, area_name
    FROM smhi_warnings
    WHERE event_code ~* 'SNOW|ICE|ICING|COLD|WIND'
    ORDER BY array_position(ARRAY['RED','ORANGE','YELLOW','MESSAGE'], level_code) LIMIT 3`);
  // Väntelistans storlek — socialt bevis på startsidan (visas från 25+).
  const wl = await q(`SELECT count(*)::int AS n FROM waitlist`);

  const stats = {
    generated_at: now.toISOString(),
    vaglag_total: vaglag.length,
    vaglag_ej_normalt: vaglag.filter((r) => Number(r.condition_code) > 1).length,
    stationer: vader.length,
    kalla_stationer: vader.filter((r) => r.surface_temp_c !== null && Number(r.surface_temp_c) <= 0).length,
    olyckor: olyckor.length,
    kameror: kameror.length,
    kameror_vaglag: kamerorVaglag,
    vilt_dygn: Number(vilt[0]?.dygn ?? 0),
    vilt_vecka: Number(vilt[0]?.vecka ?? 0),
    vilt_vanligast: vilt[0]?.vanligast ?? null,
    smhi_vinter: smhiW.map((r) => ({ event: r.event_sv, niva: r.level_sv, niva_kod: r.level_code, omrade: r.area_name })),
    waitlist_count: Number(wl[0]?.n ?? 0),
  };
  put("meta.json", stats);

  // Länssidorna (kort #281, DECISIONS #458). Stationerna saknar länskod i arkivet: varje station får länet för den närmaste
  // väglagssträckan inom 20 km. Bara de stationer appen själv talar om (appVader) räknas — en trasig givare blir aldrig
  // "minusgrader i länet".
  let sidor: Record<string, string> | null = null;
  if (opts.appVader) {
    const stLan = await q(STATION_LAN_SQL);
    const lanFor = new Map(stLan.map((r) => [String(r.station_id), { name: String(r.name), lan: Number(r.lan) }]));
    const stationer: LanStation[] = opts.appVader.flatMap((w) => {
      const s = lanFor.get(w.id);
      return s && w.yta !== null ? [{ name: s.name, yta: w.yta, fukt: w.fukt, lan: s.lan }] : [];
    });
    sidor = byggLanssidor({
      vaglag: vaglag.map((r) => ({ code: numOrNull(r.condition_code), text: r.condition_text ?? null, info: (r.condition_info ?? []) as string[],
        road: r.road_number ?? null, plats: r.location_text ?? null, lan: numOrNull(r.lan) })),
      stationer,
      olyckor: olyckor.filter((r) => r.land === "SE").map((r) => ({ road: r.road_number ?? null, start: r.start_time ? new Date(r.start_time).toISOString() : null,
        allvar: r.severity_text ?? null, lan: numOrNull(r.lan) })),
      now,
    });
  }
  return { files, stats, notes, sidor };
}
