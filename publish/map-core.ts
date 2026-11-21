// KARTLAGERKÄRNAN — kartsajtens filer data/{vaglag,vader,olyckor,kameror,kameror-vaglag,kandidat}.geojson
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
import { WX_SANE, KARANTAN_DYGN, KARANTAN_BROTT, type Q } from "./snapshot-core.ts";
import { byggLanssidor, lsStartsida, lsKartsida, type LanSegment, type LanStation, type SmhiRad, type StartTal } from "./lanssidor.ts";

const featureCollection = (features: unknown[]) => ({ type: "FeatureCollection", features });
const numOrNull = (x: unknown) => (x === null || x === undefined ? null : Number(x));

/** Varje svensk station med länet och vägnumret för den närmaste väglagssträckan inom 20 km (länssidorna och vägsidorna,
 *  #458). Stationerna saknar egen länskod i arkivet; sträckorna bär Trafikverkets CountyNo och RoadNumber. */
/** Tiden och Trafikverkets fält per sträcka (DECISIONS #897, kort #668 steg R3): när det hala läget började och om halkrisken är ny
 *  (vaglag_hal_sedan, sql/117), och varningen, orsaken och åtgärden (sql/116). `ny_sedan` är händelsen som gjorde sträckan ny: det
 *  hala lägets början, eller höjningen till Mycket besvärligt när den kom senare. Vad som är nytt avgörs i databasen. */
export const VAGLAG_TID_SQL = `
  SELECT rc.segment_id, h.hal_sedan, h.sedan_kand, h.ny, CASE WHEN h.ny THEN greatest(h.hal_sedan, h.hojd_sedan) END AS ny_sedan,
         rc.trv_varning, rc.trv_orsak, rc.trv_atgard
  FROM road_conditions rc LEFT JOIN vaglag_hal_sedan() h USING (segment_id)
  WHERE NOT rc.deleted AND rc.geom IS NOT NULL`;

export const STATION_LAN_SQL = `
  SELECT w.station_id, w.name, n.lan, n.vag
  FROM weather_latest w
  CROSS JOIN LATERAL (SELECT rc.county_nos[1] AS lan, rc.road_number AS vag, rc.geom FROM road_conditions rc
                      WHERE NOT rc.deleted AND rc.geom IS NOT NULL ORDER BY rc.geom <-> w.geom LIMIT 1) n
  WHERE n.lan IS NOT NULL AND ST_DWithin(n.geom::geography, w.geom::geography, 20000)`;

/** Storstädernas grupper i kandidatens segment_id (sql/089: grupp ~ '^[BC]-'). De ritas längs stadens gator (DECISIONS #935), och som
 *  prickar där en punkt saknar linje (DECISIONS #928). */
export const STADSGRUPP = /^[BC]-/;

/** Stadsbitens räckvidd om punkten, i meter, per lager (DECISIONS #935): halva grannavståndet, så att grannpunkternas bitar möts — som
 *  vägens bitar (punkterna ~2 km isär, 1 km åt vardera hållet). Ur provet med stadsgator.yml (körning 44841688891, 21/11): grannavståndet
 *  längs nätet, från varje punkt till närmaste punkt på samma element, var i median 1 205 m för B (4 792 punkter på 1 638 element) och
 *  1 300 m för C (186 punkter på 115 gator; de flesta av C:s gator och alla dess rutter har bara en punkt). Halva, till närmaste 50 m.
 *  B är alltså inte glesare än C: båda har en punkt per kilometer på samma väg eller gata (kuvösens punktfil). */
export const STAD_HALV_M = { B: 600, C: 650 } as const;

/** Storstädernas bitar längs stadens gator (DECISIONS #935): $1 grupper, $2 lon, $3 lat — en rad per varnande stadspunkt. Varje punkt
 *  kopplas till sin stadspunkt (samma grupp, den närmaste, inom 5 m: lägesfilen har fem decimaler) och därmed till sitt elements linje i
 *  stadsgata (sql/135). Biten är elementets linje inom STAD_HALV_M från punkten, i SWEREF 99 TM (3006), och punkterna på samma element i
 *  samma grupp skärs ut en gång, ur föreningen av sina cirklar, så att överlappande bitar blir en. Inte ett intervall längs den närmaste
 *  linjen som vägens bitar (KANDIDAT_BITAR_SQL): C:s gator förgrenar sig (körbanor, gafflar, rondeller), och i läsningen av provets
 *  linjer (halkvakt-kuvos F79) tog intervallet bara median 68 % av gatan inom 550 m, under hälften för 1 402 av 3 219 gator. För B:s
 *  element och C:s rutter tog det lika mycket som cirkeln (median 1,00). En punkt utan element, utan linje eller mer än 300 m från den
 *  får ingen bit. Ut: en rad per grupp, med de ritade punkternas ordningsnummer i `ritade` (1 = första punkten i $1), så att resten
 *  kan ritas som prickar. Exporterad för integrationsprovet. */
export const STAD_BITAR_SQL = `
        WITH p AS (SELECT * FROM unnest($1::text[], $2::float8[], $3::float8[]) WITH ORDINALITY AS p(seg, lon, lat, i)),
        sp AS (
          SELECT p.seg, p.i, s.element_id, ST_Transform(ST_SetSRID(ST_MakePoint(p.lon, p.lat), 4326), 3006) AS pt
          FROM p CROSS JOIN LATERAL (
            SELECT s.element_id, s.geom FROM stadspunkt s WHERE s.grupp = p.seg
            ORDER BY s.geom <-> ST_SetSRID(ST_MakePoint(p.lon, p.lat), 4326) LIMIT 1) s
          WHERE s.element_id IS NOT NULL
            AND ST_DWithin(ST_Transform(s.geom, 3006), ST_Transform(ST_SetSRID(ST_MakePoint(p.lon, p.lat), 4326), 3006), 1000)),
        narm AS (
          SELECT sp.seg, sp.i, sp.element_id, sp.pt, ST_Transform(ST_Force2D(g.geom), 3006) AS linje
          FROM sp JOIN stadsgata g ON g.element_id = sp.element_id
          WHERE ST_DWithin(ST_Transform(g.geom, 3006), sp.pt, 300)),
        bit AS (
          SELECT seg, count(*)::int AS punkter,
                 ST_CollectionExtract(ST_Intersection((array_agg(linje))[1],
                   ST_Union(ST_Buffer(pt, CASE left(seg, 1) WHEN 'B' THEN ${STAD_HALV_M.B} ELSE ${STAD_HALV_M.C} END, 16))), 2) AS g
          FROM narm GROUP BY seg, element_id)
        SELECT seg, sum(punkter)::int AS punkter, round((sum(ST_Length(g)) / 1000)::numeric, 2) AS km,
               (SELECT array_agg(n.i ORDER BY n.i) FROM narm n WHERE n.seg = bit.seg) AS ritade,
               ST_AsGeoJSON(ST_Transform(ST_SimplifyPreserveTopology(ST_LineMerge(ST_Collect(g)), 2), 4326), 5)::json AS g
        FROM bit GROUP BY seg ORDER BY seg`;

/** Kandidatens bitar av vägen (DECISIONS #579): $1 sträckor, $2 lon, $3 lat — en rad per punkt. Exporterad för integrationsprovet. */
export const KANDIDAT_BITAR_SQL = `
        WITH p AS (SELECT * FROM unnest($1::text[], $2::float8[], $3::float8[]) AS p(seg, lon, lat)),
        del AS (
          SELECT p.seg, p.lon, p.lat, d.path AS del, ST_Transform(d.geom, 3006) AS linje,
                 ST_Transform(ST_SetSRID(ST_MakePoint(p.lon, p.lat), 4326), 3006) AS pt
          FROM p JOIN road_conditions rc ON rc.segment_id = p.seg AND NOT rc.deleted AND rc.geom IS NOT NULL
          CROSS JOIN LATERAL ST_Dump(ST_LineMerge(ST_Force2D(rc.geom))) d),
        narm AS (
          SELECT DISTINCT ON (seg, lon, lat) seg, del, linje, pt FROM del
          WHERE ST_DWithin(linje, pt, 300) AND ST_Length(linje) > 0
          ORDER BY seg, lon, lat, ST_Distance(linje, pt)),
        -- Varje punkt blir ett intervall [a, b] längs sin linje (andelar), 1 000 m åt vardera hållet. Intervallen slås ihop där de
        -- överlappar (luckor och öar) och skärs ut EN gång per ö — ST_Union på bitarna kände inte igen överlappet när linjerna
        -- skilde sig på sista decimalen, och två punkter 1 km isär blev 4 km i stället för 3 (CI 38860931214, #579).
        iv AS (
          SELECT seg, del, linje, greatest(0, f - 1000 / ST_Length(linje)) AS a, least(1, f + 1000 / ST_Length(linje)) AS b
          FROM narm, LATERAL (SELECT ST_LineLocatePoint(linje, pt) AS f) x),
        ny AS (
          SELECT *, CASE WHEN a <= max(b) OVER (PARTITION BY seg, del ORDER BY a, b ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING)
                         THEN 0 ELSE 1 END AS borjar
          FROM iv),
        oar AS (SELECT *, sum(borjar) OVER (PARTITION BY seg, del ORDER BY a, b) AS o FROM ny),
        bit AS (
          SELECT seg, count(*)::int AS punkter, ST_LineSubstring((array_agg(linje))[1], min(a), max(b)) AS g
          FROM oar GROUP BY seg, del, o)
        SELECT seg, sum(punkter)::int AS punkter, round((sum(ST_Length(g)) / 1000)::numeric, 1) AS km,
               ST_AsGeoJSON(ST_Transform(ST_SimplifyPreserveTopology(ST_LineMerge(ST_Collect(g)), 20), 4326), 5)::json AS g
        FROM bit GROUP BY seg ORDER BY seg`;

/** `appVader` = lägesfilens väderpunkter (de som klarar appens vakter). Med den skrivs länssidorna (#458); utan den hoppas de över.
 *  `appKandidat` = lägesfilens nyckel `kandidat` (#576), eller undefined när brytaren är av (#578) — kartan visar aldrig något annat
 *  än appen får. */
export async function buildMapData(q: Q, opts: {
  trvKey?: string; fetchFn?: typeof fetch; now?: Date; appVader?: { id: string; yta: number | null; fukt: boolean; lon?: number; lat?: number }[];
  appKandidat?: { id: string; tid: string; punkter: [number, number][] }[];
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

  // Danmarks avvikelser publiceras inte (Bengt 16/10, DECISIONS #587, kort #352): de kommer ur Vejdirektoratets odokumenterade
  // trafikkort-flöde, vars licens är okänd. dk.deviations fylls som förut för skuggarkivet (ingest/dk.ts).
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

  // KANDIDATEN — BITAR AV VÄGEN (NIVA2-LIVE steg 9, DECISIONS #579; Bengt 16/10: "bygg bitar av vägen"). Varje varnande punkt får
  // vägen en kilometer åt vardera hållet längs sin sträckas linje, och bitarna slås ihop per sträcka — ungefär det punkterna står för
  // (de ligger cirka 2 km isär), aldrig hela sträckan: i morse 16/10 hade 807 km sträcka 232 km varnande väg. Metrarna räknas i
  // SWEREF 99 TM (3006), inte i grader, så att en bit blir 2 km oavsett vägens riktning. En punkt mer än 300 m från sin sträckas linje
  // ritas inte (räknas som utanför). Brytaren av ⇒ appKandidat saknas ⇒ tom fil och meta.kandidat.pa = false. Fail-soft med not.
  // STORSTÄDERNAS PUNKTER (DECISIONS #804, #928, #935; Bengt 21/11: "Bygg linjer"): en grupp (sql/089, B- eller C-) har ingen sträcka i
  // Trafikverkets väglag, så stadspunkterna går till en egen fråga (STAD_BITAR_SQL) och får en bit längs vägen eller gatan de ligger på
  // (stadsgata, sql/135). En stadspunkt utan linje, eller mer än 300 m från den, ritas som prick där den står (#928), och alla ritas som
  // prickar när frågan faller. meta: stad = stadspunkterna, stad_bitar = de som fick en bit, stad_prickar = de som ritas som prick.
  const kandidatMeta = { pa: opts.appKandidat !== undefined, strackor: 0, punkter: 0, ritade: 0, km: 0, stad: 0, stad_bitar: 0, stad_prickar: 0,
    tid: null as string | null };
  const alla = (opts.appKandidat ?? []).flatMap((k) => k.punkter.map(([lon, lat]) => ({ seg: k.id, lon, lat })));
  const stad = alla.filter((x) => STADSGRUPP.test(x.seg));
  const kp = alla.filter((x) => !STADSGRUPP.test(x.seg));
  let kandidatFeatures: unknown[] = [];
  kandidatMeta.strackor = opts.appKandidat?.length ?? 0;
  kandidatMeta.punkter = alla.length;
  kandidatMeta.stad = stad.length;
  kandidatMeta.tid = opts.appKandidat?.[0]?.tid ?? null;
  let stadBitar: unknown[] = [], prickar = stad, stadKm = 0;
  if (stad.length) {
    try {
      const bitar = await q(STAD_BITAR_SQL, [stad.map((x) => x.seg), stad.map((x) => x.lon), stad.map((x) => x.lat)]);
      const ritad = new Set(bitar.flatMap((r) => ((r.ritade ?? []) as unknown[]).map(Number)));
      stadBitar = bitar.map((r) => ({ type: "Feature", geometry: r.g,
        properties: { segment_id: r.seg, stad: true, punkter: Number(r.punkter), km: Number(r.km), tid: kandidatMeta.tid } }));
      prickar = stad.filter((_, i) => !ritad.has(i + 1));
      stadKm = bitar.reduce((n, r) => n + Number(r.km), 0);
      if (prickar.length) notes.push(`kandidat: ${prickar.length} av ${stad.length} stadspunkter ritas som prickar (utan linje, eller mer än 300 m från den)`);
    } catch (e) {
      notes.push(`kandidat: stadens bitar ej läsbara (${String((e as Error).message).slice(0, 80)}) — stadspunkterna ritas som prickar`);
    }
  }
  const stadFeatures = [...stadBitar, ...prickar.map((x) => ({ type: "Feature", geometry: { type: "Point", coordinates: [x.lon, x.lat] },
    properties: { segment_id: x.seg, stad: true, tid: kandidatMeta.tid } }))];
  kandidatMeta.stad_bitar = stad.length - prickar.length;
  kandidatMeta.stad_prickar = prickar.length;
  kandidatMeta.ritade = stad.length;
  kandidatMeta.km = Math.round(stadKm * 10) / 10;
  if (kp.length) {
    try {
      const bitar = await q(KANDIDAT_BITAR_SQL,
        [kp.map((x) => x.seg), kp.map((x) => x.lon), kp.map((x) => x.lat)]);
      kandidatFeatures = bitar.map((r) => ({ type: "Feature", geometry: r.g,
        properties: { segment_id: r.seg, punkter: Number(r.punkter), km: Number(r.km), tid: kandidatMeta.tid } }));
      kandidatMeta.ritade += bitar.reduce((n, r) => n + Number(r.punkter), 0);
      kandidatMeta.km = Math.round((stadKm + bitar.reduce((n, r) => n + Number(r.km), 0)) * 10) / 10;
      if (kandidatMeta.ritade < kandidatMeta.punkter) {
        notes.push(`kandidat: ${kandidatMeta.punkter - kandidatMeta.ritade} av ${kandidatMeta.punkter} punkter ritas inte (mer än 300 m från sin sträckas linje)`);
      }
    } catch (e) {
      notes.push(`kandidat: bitarna ej läsbara (${String((e as Error).message).slice(0, 80)}) — kartlagret blir tomt`);
    }
  }
  put("kandidat.geojson", featureCollection([...kandidatFeatures, ...stadFeatures]));

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

  // Rikstalen räknar bara Sverige (Bengt 14/11, DECISIONS #865): kartan visar dem under "Sveriges väglag just nu". Finlands och
  // Danmarks stationer och Finlands olyckor ritas på kartan men räknas inte här (14/11 09.31 UTC+1: 933 kalla stationer i filen, varav 259 finska).
  const seVader = vader.filter((r) => r.land === "SE");
  const stats = {
    generated_at: now.toISOString(),
    vaglag_total: vaglag.length,
    vaglag_ej_normalt: vaglag.filter((r) => Number(r.condition_code) > 1).length,
    stationer: seVader.length,
    kalla_stationer: seVader.filter((r) => r.surface_temp_c !== null && Number(r.surface_temp_c) <= 0).length,
    olyckor: olyckor.filter((r) => r.land === "SE").length,
    kameror: kameror.length,
    kameror_vaglag: kamerorVaglag,
    vilt_dygn: Number(vilt[0]?.dygn ?? 0),
    vilt_vecka: Number(vilt[0]?.vecka ?? 0),
    vilt_vanligast: vilt[0]?.vanligast ?? null,
    smhi_vinter: smhiW.map((r) => ({ event: r.event_sv, niva: r.level_sv, niva_kod: r.level_code, omrade: r.area_name })),
    waitlist_count: Number(wl[0]?.n ?? 0),
    // Kandidaten (#579): pa = brytaren, punkter i lägesfilen, ritade = de som syns (en bit, eller för en stadspunkt en prick), km = bitarnas
    // längd (vägens och stadens), stad = stadspunkterna, stad_bitar och stad_prickar = hur de ritades (#935).
    kandidat: kandidatMeta,
  };
  put("meta.json", stats);

  // Länssidorna (kort #281, DECISIONS #458). Stationerna saknar länskod i arkivet: varje station får länet för den närmaste
  // väglagssträckan inom 20 km. Bara de stationer appen själv talar om (appVader) räknas — en trasig givare blir aldrig
  // "minusgrader i länet".
  let sidor: Record<string, string> | null = null;
  let start: Record<string, string> | null = null, kartaText: Record<string, string> | null = null;
  if (opts.appVader) {
    const stLan = await q(STATION_LAN_SQL);
    const lanFor = new Map(stLan.map((r) => [String(r.station_id), { name: String(r.name), lan: Number(r.lan), vag: r.vag ?? null }]));
    // Appens stationer bär bara vägbana på 3 °C eller kallare (snapshotens förfilter), så sidorna räknade "stationerna inom 30 km"
    // bland de kalla och sa en natt med plusgrader att Malmös närmaste station låg 110 km bort (9/11, DECISIONS #826). De varmare
    // stationerna läggs till här med samma givarvakt, radvakt och karantän; en station över 3 °C kan aldrig ge minusgrader i länet.
    const varma = await q(`
      SELECT station_id, surface_temp_c, rain, snow, ST_X(geom) AS lon, ST_Y(geom) AS lat FROM weather_latest w
      WHERE ${WX_SANE} AND surface_temp_c > 3 AND station_id NOT IN (
        SELECT station_id FROM weather_observations WHERE sample_time > now() - interval '${KARANTAN_DYGN} days'
          AND air_temp_c IS NOT NULL AND surface_temp_c < air_temp_c - 12 GROUP BY station_id HAVING count(*) >= ${KARANTAN_BROTT})`);
    const appIds = new Set(opts.appVader.map((w) => w.id));
    const alla = [...opts.appVader, ...varma.filter((r) => !appIds.has(String(r.station_id))).map((r) => ({ id: String(r.station_id),
      yta: Number(r.surface_temp_c), fukt: Boolean(r.rain || r.snow), lon: Number(r.lon), lat: Number(r.lat) }))];
    const stationer: LanStation[] = alla.flatMap((w) => {
      const s = lanFor.get(w.id);
      return s && w.yta !== null ? [{ name: s.name, yta: w.yta, fukt: w.fukt, lan: s.lan, vag: s.vag, lon: w.lon, lat: w.lat }] : [];
    });
    // SMHI:s alla gällande varningar (1/11): varningssidan och raden på läns-, orts- och vägsidorna väljer själva vägvarningarna
    // (vagvarningar i lanssidor.ts), så att regeln bor på ett ställe och går att pröva.
    const smhi = await q(`SELECT event_sv, level_sv, level_code, description_sv, area_name, affected_areas, approx_start, approx_end FROM smhi_warnings`);
    // Tiden och Trafikverkets fält (DECISIONS #897, kort #668 steg R3), i en egen fråga: faller den skrivs sidorna och rutans filer
    // ändå, utan fälten, och noten säger varför. Rutan visar då raden Halka som förut.
    const iso = (t: unknown) => (t ? new Date(t as string).toISOString() : null);
    const tidFalt = new Map<string, Partial<LanSegment>>();
    let tid = false;
    try {
      for (const r of await q(VAGLAG_TID_SQL)) tidFalt.set(String(r.segment_id), {
        sedan: iso(r.hal_sedan), sedanKand: r.sedan_kand === true, ny: r.ny === true, nySedan: iso(r.ny_sedan),
        varning: (r.trv_varning ?? []) as string[], orsak: (r.trv_orsak ?? []) as string[], atgard: (r.trv_atgard ?? []) as string[] });
      tid = true;
    } catch (e) { notes.push(`väglagets tid och fält: ej läsbara (${String((e as Error).message).slice(0, 100)}) — rutans filer skrivs utan dem`); }
    sidor = byggLanssidor({
      smhi: smhi as unknown as SmhiRad[], tid,
      vaglag: vaglag.map((r) => ({ ...tidFalt.get(String(r.segment_id)),
        code: numOrNull(r.condition_code), text: r.condition_text ?? null, info: (r.condition_info ?? []) as string[],
        road: r.road_number ?? null, plats: r.location_text ?? null, lan: numOrNull(r.lan),
        // Linjen (9/11): ortssidorna väljer avsnitten nära en kommun vars namn inget avsnitt bär.
        linje: r.g?.type === "LineString" ? [r.g.coordinates] : r.g?.type === "MultiLineString" ? r.g.coordinates : undefined })),
      stationer,
      olyckor: olyckor.filter((r) => r.land === "SE").map((r) => ({ road: r.road_number ?? null, start: r.start_time ? new Date(r.start_time).toISOString() : null,
        allvar: r.severity_text ?? null, lan: numOrNull(r.lan) })),
      now,
    });
    // Startsidans och kartans tal i HTML (6/11, DECISIONS #807): samma rader som lagren ovan och lan.json ur sidorna, räknade som
    // sidornas egna skript räknar dem. publicera skriver in dem i index.html och karta.html i kartrepot.
    const vaglagTal = vaglag.map((r) => ({ code: numOrNull(r.condition_code), info: (r.condition_info ?? []) as string[] }));
    start = lsStartsida({
      vader: vader.map((r) => ({ land: String(r.land), name: String(r.name ?? ""), yta: numOrNull(r.surface_temp_c), luft: numOrNull(r.air_temp_c) })),
      vaglag: vaglagTal, ...(JSON.parse(sidor["data/lan.json"]) as Pick<StartTal, "lan" | "vag">), now,
    });
    kartaText = lsKartsida({ vaglag: vaglagTal, now });
  }
  return { files, stats, notes, sidor, start, kartaText };
}
