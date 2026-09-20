// Full write-path test vs throwaway PostGIS (CI service container).
// Skips cleanly when TEST_DATABASE_URL is absent (local runs without Docker).
import { test } from "node:test";
import assert from "node:assert/strict";
import { ingestAction, shouldArchive } from "../ingest/sources/situations.ts";

const url = process.env.TEST_DATABASE_URL;

test("writeAll: migrate, insert, idempotent re-run", { skip: !url }, async () => {
  process.env.DATABASE_URL = url;
  const { writeAll, readSyncState } = await import("../ingest/db.ts");
  const data = {
    cameras: { items: [
      { cameraId: "T1", name: "Testkamera", roadNumber: "E4", bearing: 90, lon: 18.0, lat: 59.3, modifiedTime: "2026-08-24T10:00:00Z", deleted: false },
      { cameraId: "T2", name: "Testkamera 2", roadNumber: "70", bearing: null, lon: 15.5, lat: 60.6, modifiedTime: "2026-08-24T10:00:00Z", deleted: false },
    ], lastChangeId: "cam-1" },
    conditions: { items: [
      { segmentId: "S1", conditionCode: 2, conditionText: "Besvärligt", conditionInfo: ["Is och snö"], countyNos: [25], roadNumber: "E10",
        wgs84Line: "LINESTRING (20.2 67.8, 20.3 67.9)", startTime: null, endTime: null, modifiedTime: "2026-08-24T10:00:00Z", deleted: false },
    ], lastChangeId: "cond-1" },
    weather: { items: [
      { stationId: "W1", name: "Teststation", lon: 17.0, lat: 62.4, sampleTime: "2026-08-24T10:00:00Z",
        surfaceTempC: -1.2, airTempC: 0.5, dewpointC: -2, humidityPct: 90, precipitation: "snow", rain: false, snow: true,
        rainSumMm: 0.4, snowWateqMm: 1.1, modifiedTime: "2026-08-24T10:00:00Z" },
    ], lastChangeId: "wx-1" },
    wildlife: { items: [
      { eventId: 999001, datetime: "2026-08-23T09:43:26+02:00", countyName: "Jämtlands län",
        lon: 14.95918, lat: 63.171192, summary: "Testolycka med en älg på E45, Sänna.",
        url: "https://polisen.se/x", roadNumber: "E45", species: "älg", placeHint: "Sänna" },
    ] },
    smhi: { items: [
      { areaId: 888001, warningId: 777, eventCode: "SNOW_ICE", eventSv: "Snöfall och ishalka",
        levelCode: "YELLOW", levelSv: "Gul", descriptionSv: "Test", areaName: "Norrbottens län",
        affectedAreas: [{ id: 25, sv: "Norrbottens län" }],
        geometry: { type: "Polygon", coordinates: [[[20,66],[21,66],[21,67],[20,66]]] },
        approximateStart: null, approximateEnd: null, published: "2026-08-24T10:00:00Z" },
    ] },
    deviations: { items: [
      { deviationId: "D1", situationId: "SIT1", messageType: "Olycka", messageTypeValue: "Accident", message: "Testolycka",
        severityCode: 4, severityText: "Stor påverkan", roadNumber: "E4", countyNos: [1], lon: 18.1, lat: 59.4,
        wgs84Line: null, startTime: null, endTime: null, iconId: "roadAccident", modifiedTime: "2026-08-24T10:00:00Z", deleted: false },
    ], lastChangeId: "dev-1" },
  } as any;

  const expected = { cameras: 2, road_conditions: 1, history: 1, weather: 1, deviations: 1, archive: 1, wildlife: 1, smhi: 1 }; // archive: olyckan hamnar i BÅDA (#33)
  const c1 = await writeAll(data);
  assert.deepEqual(c1, expected);

  // Idempotency: same input again must not duplicate anything.
  // SKÄRPT (DECISIONS #73): history-räknaren är sedan den egna kursorn VERKLIGA skrivningar
  // (rowCount), inte försök (c.length). Andra körningen ska därför ge history: 0 — arkivet
  // är append-only med ON CONFLICT DO NOTHING, så en omkörning får inte lägga till något.
  // Det är ett STARKARE påstående än det gamla: förut passerade testet med history: 1 trots
  // att ingen rad skrevs, eftersom räknaren räknade försök. Nu bevisas invarianten i
  // CLAUDE.md ("en rerun får aldrig duplicera rader") i stället för att antas.
  // road_conditions stannar på 1 båda varven: ON CONFLICT DO UPDATE skriver om raden, och
  // bakåtvakten släpper igenom eftersom modified_time är oförändrad (>=).
  const c2 = await writeAll(data);
  assert.deepEqual(c2, { ...expected, history: 0 });

  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const n = async (q: string) => Number((await pool.query(q)).rows[0].count);
  assert.equal(await n("SELECT count(*) FROM cameras"), 2);
  assert.equal(await n("SELECT count(*) FROM road_conditions"), 1);
  assert.equal(await n("SELECT count(*) FROM road_condition_history"), 1);
  assert.equal(await n("SELECT count(*) FROM weather_observations"), 1);
  // Kort #42 steg 0a: mängderna ska landa i arkivet, inte bara i parsern.
  assert.equal(await n("SELECT count(*) FROM weather_observations WHERE rain_sum_mm = 0.4 AND snow_wateq_mm = 1.1"), 1);
  assert.equal(await n("SELECT count(*) FROM deviations"), 1);
  assert.equal(await n("SELECT count(*) FROM polisen_events"), 1);
  assert.equal(await n("SELECT count(*) FROM smhi_warnings"), 1);
  assert.equal(await n("SELECT count(*) FROM smhi_warnings_history"), 1);
  // Kort #199 (sql/024): synken stämplar när varningen senast fanns i flödet. smhi_synk får en rad per
  // körning — den är en klocka, inte data, så två körningar ger två rader utan att bryta idempotensen.
  assert.equal(await n("SELECT count(*) FROM smhi_warnings_history WHERE senast_sedd IS NOT NULL"), 1);
  assert.equal(await n("SELECT count(*) FROM smhi_synk WHERE varningar = 1"), 2);
  const wv = await pool.query("SELECT road_number, species FROM polisen_events WHERE event_id=999001");
  assert.equal(wv.rows[0].road_number, "E45");
  assert.equal(wv.rows[0].species, "älg");
  // PostGIS geometry actually parsed
  const g = await pool.query("SELECT ST_NPoints(geom) AS np FROM road_conditions WHERE segment_id='S1'");
  assert.equal(Number(g.rows[0].np), 2);
  await pool.end();

  const state = await readSyncState();
  assert.equal(state.cameras, "cam-1");
  assert.equal(state.weather, "wx-1");
});

test("gravstensläckan: en raderad avvikelse av otrackad typ får ALDRIG skapa en rad", () => {
  // Regression för fyndet 31/8: `!KEEP.has(x) && !deleted` släppte in varje raderad
  // avvikelse av varje typ. 4 584 gravstenar för vägarbeten vi aldrig lagrat levande.
  assert.equal(ingestAction("MaintenanceWorks", false), "skip");
  assert.equal(ingestAction("MaintenanceWorks", true), "mark-deleted"); // UPDATE ⇒ 0 rader
  // Men raderingar av det vi FAKTISKT trackar måste fortfarande gå fram — annars
  // ligger en röjd olycka kvar och varnas för. Det vore värre än gravstenarna.
  assert.equal(ingestAction("Accident", false), "store");
  assert.equal(ingestAction("Accident", true), "mark-deleted");
  // Och de generiska orden som aldrig fanns i Trafikverkets vokabulär:
  assert.equal(ingestAction("Obstruction", false), "skip");
  assert.equal(ingestAction("Incident", false), "skip");
});

test("#33 arkivlistan: bruset stängs ute, vinterfacit + olyckor tas med", () => {
  // 62 % av flödet är MaintenanceWorks + körfältsomläggning — chronic noise (DECISIONS #5).
  assert.equal(shouldArchive("MaintenanceWorks"), false);
  assert.equal(shouldArchive("RoadOrCarriagewayOrLaneManagement"), false);
  // Det missmätningen (#19) faktiskt behöver i vinter:
  assert.equal(shouldArchive("WeatherRelatedRoadConditions"), true);
  assert.equal(shouldArchive("NonWeatherRelatedRoadConditions"), true);
  assert.equal(shouldArchive("Accident"), true);
  // Och kandidaterna för #32 (djur på vägbanan, stoppade fordon) sparas nu från dag ett:
  assert.equal(shouldArchive("AnimalPresenceObstruction"), true);
  assert.equal(shouldArchive("VehicleObstruction"), true);
  // Arkivering är oberoende av livetabellen: ett hinder arkiveras men lagras aldrig live.
  assert.equal(ingestAction("VehicleObstruction", false), "skip");
});

// #75 GIVARVAKTEN mot riktig PostGIS: kärnan publicerar bara färska, rimliga stationer.
// Storvik 2135 stod på −10,7 °C i september (5/9–8/9) och var appens enda halkpunkt —
// weather_latest hade frusit och ingen fråga kontrollerade vare sig ålder eller rimlighet.
test("#75 givarvakten: frusen, orimlig och gammal station publiceras inte", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { buildSnapshot } = await import("../publish/snapshot-core.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await pool.query(`
      INSERT INTO weather_latest (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow)
      VALUES
        ('STORVIK',  'Storvik-liknande', ST_SetSRID(ST_MakePoint(16.54, 60.58), 4326), now() - interval '5 minutes', -10.7, 12.0, 'rain', true,  false),
        ('GAMMAL',   'Tystnad sedan 5 h', ST_SetSRID(ST_MakePoint(15.00, 59.00), 4326), now() - interval '5 hours',   -2.0, -1.0, 'snow', false, true),
        ('FARSK',    'Rimlig och färsk',  ST_SetSRID(ST_MakePoint(15.10, 59.10), 4326), now() - interval '10 minutes', -1.5,  0.0, 'rain', true,  false),
        ('OKANDLUFT','Utan lufttemp',     ST_SetSRID(ST_MakePoint(15.20, 59.20), 4326), now() - interval '10 minutes', -3.0, NULL, 'no',   false, false)
      ON CONFLICT (station_id) DO UPDATE SET sample_time = EXCLUDED.sample_time, surface_temp_c = EXCLUDED.surface_temp_c,
        air_temp_c = EXCLUDED.air_temp_c, precipitation = EXCLUDED.precipitation, rain = EXCLUDED.rain, snow = EXCLUDED.snow`);
    // radar_precip skapas av ingest/radar.ts i drift; här appliceras migrationen som testet
    // annars saknar. Samma mönster som gallringen (014) och grannschemana nedan.
    const { readFileSync: rf } = await import("node:fs");
    await pool.query(rf(new URL("../sql/009_radar_precip.sql", import.meta.url), "utf8"));
    const { liveDoc } = await buildSnapshot(async (t, p) => (await pool.query(t, p as any[])).rows, []);
    // W1 från writeAll-testet ovan har sample_time 2026-08-24 ⇒ gammal ⇒ tyst. Storvik: 22,7°
    // under luften ⇒ orimlig ⇒ tyst. GAMMAL: 5 h ⇒ tyst. Kvar: den färska och den vi inte
    // kan döma (luft saknas — vakten fäller bara på bevisad orimlighet, aldrig på okunskap).
    assert.deepEqual(liveDoc.weather.map((w) => w.id).sort(), ["FARSK", "OKANDLUFT"]);
    assert.deepEqual(liveDoc.weather.find((w) => w.id === "FARSK"), { id: "FARSK", lon: 15.1, lat: 59.1, yta: -1.5, fukt: true, regn_h: null, lutning15: null, lutning30: null, lutning60: null });
  } finally { await pool.end(); }
});

// #80: en källa som hoppas över (tom lastChangeId) får INTE röra sync_state — annars skulle
// GitHub-ingesten flytta livemotorns kursor och stämpla "weather synced 0 min ago" utan att
// ha hämtat något. Det är hela poängen med --skip.
test("#80 --skip: tom lastChangeId lämnar sync_state orörd", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { writeAll } = await import("../ingest/db.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await pool.query(`INSERT INTO sync_state (source, last_change_id, synced_at) VALUES ('weather', 'live-42', now() - interval '7 minutes'), ('deviations', 'live-43', now() - interval '7 minutes')
      ON CONFLICT (source) DO UPDATE SET last_change_id = EXCLUDED.last_change_id, synced_at = EXCLUDED.synced_at`);
    const fore = (await pool.query(`SELECT source, last_change_id, synced_at FROM sync_state WHERE source IN ('weather','deviations') ORDER BY source`)).rows;
    const tom = { items: [], lastChangeId: "" };
    const counts = await writeAll({ weather: tom, deviations: tom,
      conditions: { items: [], lastChangeId: "cond-9" }, cameras: { items: [], lastChangeId: "cam-9" } } as any);
    assert.equal(counts.weather, 0); assert.equal(counts.deviations, 0);
    const efter = (await pool.query(`SELECT source, last_change_id, synced_at FROM sync_state WHERE source IN ('weather','deviations') ORDER BY source`)).rows;
    assert.deepEqual(efter, fore, "weather/deviations-kursorerna får inte röras");
    const cam = (await pool.query(`SELECT last_change_id FROM sync_state WHERE source = 'cameras'`)).rows[0];
    assert.equal(cam.last_change_id, "cam-9", "de källor som INTE hoppas över uppdateras som vanligt");
  } finally { await pool.end(); }
});


// #83 gallringen: allt äldre än `dagar` tunnas till EN rad per station och 30-minutershink — den
// senaste, precis den grind A och grind V-A väljer (BUCKET_S = 1800, ORDER BY sample_time DESC).
// Sista veckan rörs inte. Andra körningen hittar inget. Körs mot riktiga tabellen (PostGIS-geom).
test("#83 gallra_vader: tunnar gammalt till 30 min, lämnar sista veckan, idempotent", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await pool.query(readFileSync(new URL("../sql/014_gallring.sql", import.meta.url), "utf8"));
    await pool.query(`DELETE FROM weather_observations WHERE station_id IN ('G10', 'G5')`);
    // G10 mäter var 10:e minut: ett helt dygn 20 dygn sedan + ett helt dygn igår. G5 var 5:e minut, 20 dygn sedan.
    await pool.query(`
      INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c)
      SELECT 'G10', 'Tiominuters', ST_SetSRID(ST_MakePoint(15, 60), 4326), date_trunc('day', now() - interval '20 days') + i * interval '10 min', i FROM generate_series(0, 143) i
      UNION ALL
      SELECT 'G10', 'Tiominuters', ST_SetSRID(ST_MakePoint(15, 60), 4326), date_trunc('day', now() - interval '1 day') + i * interval '10 min', i FROM generate_series(0, 143) i
      UNION ALL
      SELECT 'G5', 'Femminuters', ST_SetSRID(ST_MakePoint(16, 61), 4326), date_trunc('day', now() - interval '20 days') + i * interval '5 min', i FROM generate_series(0, 287) i`);
    const bort = (await pool.query(`SELECT gallra_vader(7) AS n`)).rows[0].n;
    assert.equal(Number(bort), 96 + 240, "G10: 144 → 48, G5: 288 → 48; igår orörd");
    const kvar = (await pool.query(`SELECT station_id, (sample_time < now() - interval '7 days') AS gammal, count(*)::int AS n
      FROM weather_observations WHERE station_id IN ('G10', 'G5') GROUP BY 1, 2 ORDER BY 1, 2`)).rows;
    assert.deepEqual(kvar, [
      { station_id: "G10", gammal: false, n: 144 }, { station_id: "G10", gammal: true, n: 48 }, { station_id: "G5", gammal: true, n: 48 }]);
    // Kvar i varje hink är den SENASTE mätningen: hink 0 (00:00–00:29) behåller 00:20 för G10, 00:25 för G5.
    const forsta = (await pool.query(`SELECT station_id, to_char(min(sample_time), 'HH24:MI') AS t FROM weather_observations
      WHERE station_id IN ('G10', 'G5') AND sample_time < now() - interval '7 days' GROUP BY 1 ORDER BY 1`)).rows;
    assert.deepEqual(forsta, [{ station_id: "G10", t: "00:20" }, { station_id: "G5", t: "00:25" }]);
    const igen = (await pool.query(`SELECT gallra_vader(7) AS n`)).rows[0].n;
    assert.equal(Number(igen), 0, "andra körningen har inget att ta");
  } finally { await pool.end(); }
});

// Grepp 3 (sql/026, DECISIONS #232): gallra_arkiv kör den svenska gallringen och tar dessutom Finland (varma rader efter
// sju dygn, allt efter 60), Norge (allt efter sju dygn) och pg_crons logg — loggen finns inte i CI och hoppas över.
test("grepp 3 gallra_arkiv: Finland behåller kalla rader i 60 dygn, Norge sju dygn, idempotent", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    for (const f of ["014_gallring.sql", "004_fi_schema.sql", "006_no_schema.sql", "026_gallring_grannar.sql"])
      await pool.query(readFileSync(new URL("../sql/" + f, import.meta.url), "utf8"));
    await pool.query("DELETE FROM fi.weather_observations WHERE station_id = 'GFI'");
    await pool.query("DELETE FROM no.weather_observations WHERE station_id = 'GNO'");
    const p = "ST_SetSRID(ST_MakePoint(25, 66), 4326)";
    await pool.query(`INSERT INTO fi.weather_observations (station_id, name, geom, sample_time, surface_temp_c) VALUES
      ('GFI', 'Varm gammal', ${p}, now() - interval '20 days', 5),
      ('GFI', 'Kall gammal', ${p}, now() - interval '20 days' + interval '30 min', 1),
      ('GFI', 'Utan yta', ${p}, now() - interval '20 days' + interval '60 min', NULL),
      ('GFI', 'Kall uråldrig', ${p}, now() - interval '70 days', -2),
      ('GFI', 'Varm färsk', ${p}, now() - interval '1 day', 6)`);
    await pool.query(`INSERT INTO no.weather_observations (station_id, name, geom, sample_time, surface_temp_c) VALUES
      ('GNO', 'Gammal', ${p}, now() - interval '20 days', -1),
      ('GNO', 'Färsk', ${p}, now() - interval '1 day', -1)`);
    await pool.query("SELECT gallra_arkiv(7)");
    const fi = (await pool.query("SELECT name FROM fi.weather_observations WHERE station_id = 'GFI' ORDER BY sample_time")).rows.map((r) => r.name);
    assert.deepEqual(fi, ["Kall gammal", "Varm färsk"], "varm och ytlös gammal rad bort, kall kvar, 70 dygn bort");
    const no = (await pool.query("SELECT name FROM no.weather_observations WHERE station_id = 'GNO'")).rows.map((r) => r.name);
    assert.deepEqual(no, ["Färsk"], "Norge: allt äldre än sju dygn bort");
    const igen = (await pool.query("SELECT gallra_arkiv(7) AS n")).rows[0].n;
    assert.equal(Number(igen), 0, "andra körningen har inget att ta");
  } finally { await pool.end(); }
});

// Kort #196/#205 (sql/025, sql/027): provrader märks av en genererad kolumn och räknas aldrig (KB-D6). Fotostudio-kroken i
// apparna skickar "cam:fotostudio" som ett riktigt anrop — utan 027 landade den som ett riktigt förarsvar.
test("kort #205 prov-kolumnen: prov och fotostudio märks, riktiga id:n inte, omkörning ofarlig", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    for (const f of ["022_driver_facit.sql", "025_driver_facit_prov.sql", "027_driver_facit_prov_fotostudio.sql"])
      await pool.query(readFileSync(new URL("../sql/" + f, import.meta.url), "utf8"));
    await pool.query("DELETE FROM driver_facit WHERE version = 'test205'");
    await pool.query(`INSERT INTO driver_facit (alert_id, alert_t, svar, app, version) VALUES
      ('cam:fotostudio', '2026-11-01T06:00:00Z', 'ja', 'ios', 'test205'),
      ('cam:FOTOSTUDIO', '2026-11-01T06:01:00Z', 'ja', 'android', 'test205'),
      ('prov:kam1', '2026-11-01T06:02:00Z', 'nej', 'android', 'test205'),
      ('wx:2135', '2026-11-01T06:03:00Z', 'ja', 'ios', 'test205'),
      ('seg:16010', '2026-11-01T06:04:00Z', 'nej', 'ios', 'test205')`);
    const las = async () => (await pool.query(
      "SELECT alert_id, prov FROM driver_facit WHERE version = 'test205' ORDER BY alert_t")).rows.map((r) => [r.alert_id, r.prov]);
    const vantat = [["cam:fotostudio", true], ["cam:FOTOSTUDIO", true], ["prov:kam1", true], ["wx:2135", false], ["seg:16010", false]];
    assert.deepEqual(await las(), vantat);
    await pool.query(readFileSync(new URL("../sql/027_driver_facit_prov_fotostudio.sql", import.meta.url), "utf8"));
    assert.deepEqual(await las(), vantat, "omkörning: samma kolumn, samma värden, inga rader förlorade");
  } finally { await pool.end(); }
});

// Uppspelningen ur arkiven (sql/028, DECISIONS #244): kombinationen och KB-A:s varianter i EN funktion, med betans
// startvärden som standardvärden. Fem påhittade stationer med känt rätt svar per variant. Databasen delas med de andra
// testen, så talen jämförs som SKILLNAD mot läget före insättningen. Dessutom: utfallet är blindat som standard, och ett
// värde utanför de fastställda svepen avvisas (regel D1).
test("uppspelningen: varje variant ändrar en sak, utfallet är blindat, värden utanför svepen avvisas", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    for (const f of ["001_init.sql", "003_situation_archive.sql", "008_rain_sum.sql", "009_radar_precip.sql", "017_trend_kandidater.sql", "028_uppspelning_varianter.sql"])
      await pool.query(readFileSync(new URL("../sql/" + f, import.meta.url), "utf8"));
    for (const t of ["trend_kandidater", "weather_observations", "weather_latest"]) await pool.query(`DELETE FROM ${t} WHERE station_id LIKE 'UPPSP_%'`);
    for (const t of ["radar_precip", "road_condition_history", "road_conditions"]) await pool.query(`DELETE FROM ${t} WHERE segment_id LIKE 'UPPSP_SEG%'`);
    await pool.query("DELETE FROM situation_archive WHERE deviation_id LIKE 'UPPSP_%'");
    const T = "((date_trunc('day', now() AT TIME ZONE 'UTC') - interval '3 days' + interval '12 hours') AT TIME ZONE 'UTC')";
    const dag = (await pool.query(`SELECT (${T} AT TIME ZONE 'UTC')::date::text AS d`)).rows[0].d;
    const rad = async (arg: string, d: string = dag) => {
      const r = (await pool.query(`SELECT * FROM uppspelning_efterhalka(${arg}) WHERE dag = $1`, [d])).rows[0];
      return r ? { st: r.stationer, fo: r.foll_ut, na: r.nara, ut: r.uteblev, med: r.episoder_med_utfall,
                   ep: r.episoder, omk: r.med_omklassning, oly: r.med_olycka }
               : { st: 0, fo: null, na: null, ut: null, med: null, ep: 0, omk: null, oly: null };
    };
    const VARIANTER: [string, string, number][] = [
      ["kombinationen", "", 2], ["utan faller", "p_krav_faller := false", 1], ["utan blöt", "p_krav_blot := false", 4],
      ["radar 0,1", "p_radar_r := 0.1", 4], ["radar 0,5", "p_radar_r := 0.5", 3], ["radar 2", "p_radar_r := 2", 2],
      ["regn >= 0,2", "p_regn_min := 0.2", 1], ["regn >= 0,5", "p_regn_min := 0.5", 0],
      ["band +1…+4", "p_hog := 4", 3], ["band +1…+6", "p_hog := 6", 3],
    ];
    const fore = new Map<string, number>(); for (const [namn, arg] of VARIANTER) fore.set(namn, (await rad(arg)).st);
    // G: EPISODEN ÄR EN NATT, INTE ETT UTC-DYGN (Bengt 20/9, DECISIONS #246). Två ögonblick samma natt på var sin sida
    // om midnatt UTC — 23:30 (frös, 0,5) och 00:30 (uteblev, 2,5). Det är EN episod, bokförd på dygnet den började.
    const G1 = `(${T} - interval '36 hours 30 min')`, G2 = `(${T} - interval '35 hours 30 min')`;
    const [dagG1, dagG2] = (await pool.query(`SELECT (${G1} AT TIME ZONE 'UTC')::date::text AS a, (${G2} AT TIME ZONE 'UTC')::date::text AS b`)).rows.map((r) => [r.a, r.b])[0];
    assert.notEqual(dagG1, dagG2, "provet ska ligga på var sin sida om midnatt UTC");
    const foreG1 = await rad("p_blind := false", dagG1), foreG2 = await rad("p_blind := false", dagG2);
    // H och I: facitstackens två skrivna källor (kort #207). Egen dag, så variantdeltan ovan inte rubbas — 72 h, inte
    // 48, eftersom 48 h hade landat på samma UTC-dygn som G1 (T − 36 h 30 min) och räknat tre stationer där.
    // H har facit inom 5 km OCH inom fönstret; I har bara facit utanför fönstret och utanför radien.
    const T2 = `(${T} - interval '72 hours')`;
    const dagHI = (await pool.query(`SELECT (${T2} AT TIME ZONE 'UTC')::date::text AS d`)).rows[0].d;
    assert.ok(dagHI !== dagG1 && dagHI !== dagG2 && dagHI !== dag, "H och I ligger på ett eget UTC-dygn");
    const foreHI = await rad("p_blind := false", dagHI);
    const g = "ST_SetSRID(ST_MakePoint(15.0, 60.0), 4326)";
    // A: faller, 0,3 mm regn, frös (0,4). B: faller, 0,1 mm, nära (1,3). C: bara i bredare band, uteblev (2,9).
    // D: faller, inget stationsregn men radar 0,6 mm/h inom 5 km. E: regn i bandet utan fall — bara "utan faller".
    // F: GRÄNSPROVET. Faller, 55 km bort med eget vägavsnitt, radar EXAKT 0,5 mm/h. Regeln är rate_mean_mmh > r
    // (TROSKLAR-OVERGANGAR §4), så F ska med vid r = 0,1 men INTE vid r = 0,5.
    await pool.query(`INSERT INTO trend_kandidater (station_id, observed_at, surface_temp_c, lutning15_c, lutning30_c, lutning60_c, min_yta_90min_c, utfall_rader) VALUES
      ('UPPSP_A', ${T}, 2.5, 0.5, 1.0, 1.4, 0.4, 5), ('UPPSP_B', ${T}, 2.0, 0.4, 0.9, 1.2, 1.3, 4),
      ('UPPSP_C', ${T}, 3.5, 0.5, 1.0, 1.4, 2.9, 3), ('UPPSP_D', ${T}, 2.2, 0.5, 1.0, 1.4, 0.2, 6),
      ('UPPSP_F', ${T}, 2.4, 0.5, 1.0, 1.4, 1.8, 4),
      ('UPPSP_G', ${G1}, 2.0, 0.5, 1.0, 1.4, 0.5, 5), ('UPPSP_G', ${G2}, 1.5, 0.5, 1.0, 1.4, 2.5, 5),
      ('UPPSP_H', ${T2}, 2.0, 0.5, 1.0, 1.4, 0.6, 5), ('UPPSP_I', ${T2}, 2.0, 0.5, 1.0, 1.4, 0.6, 5)`);
    await pool.query(`INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, rain_sum_mm) VALUES
      ('UPPSP_A', 'A', ${g}, ${T} - interval '30 min', NULL, NULL, 0.3), ('UPPSP_B', 'B', ${g}, ${T} - interval '60 min', NULL, NULL, 0.1),
      ('UPPSP_C', 'C', ${g}, ${T} - interval '20 min', NULL, NULL, 1.0), ('UPPSP_E', 'E', ${g}, ${T}, 2.0, 3.0, 0.5),
      ('UPPSP_G', 'G', ${g}, ${T} - interval '37 hours', NULL, NULL, 0.3),
      ('UPPSP_H', 'H', ${g}, ${T2} - interval '30 min', NULL, NULL, 0.3), ('UPPSP_I', 'I', ${g}, ${T2} - interval '30 min', NULL, NULL, 0.3)`);
    await pool.query(`INSERT INTO weather_latest (station_id, name, geom, sample_time) VALUES ('UPPSP_D', 'D', ${g}, ${T}),
      ('UPPSP_F', 'F', ST_SetSRID(ST_MakePoint(16.0, 60.0), 4326), ${T}),
      ('UPPSP_H', 'H', ST_SetSRID(ST_MakePoint(17.0, 60.0), 4326), ${T2}),
      ('UPPSP_I', 'I', ST_SetSRID(ST_MakePoint(18.0, 60.0), 4326), ${T2})`);
    await pool.query(`INSERT INTO road_conditions (segment_id, condition_code, condition_text, geom) VALUES
      ('UPPSP_SEG', 1, 'Normalt', ST_SetSRID(ST_MakeLine(ST_MakePoint(15.01, 60.0), ST_MakePoint(15.02, 60.01)), 4326)),
      ('UPPSP_SEG2', 1, 'Normalt', ST_SetSRID(ST_MakeLine(ST_MakePoint(16.01, 60.0), ST_MakePoint(16.02, 60.01)), 4326)),
      ('UPPSP_SEG3', 1, 'Normalt', ST_SetSRID(ST_MakeLine(ST_MakePoint(17.01, 60.0), ST_MakePoint(17.02, 60.01)), 4326)),
      ('UPPSP_SEG4', 1, 'Normalt', ST_SetSRID(ST_MakeLine(ST_MakePoint(18.01, 60.0), ST_MakePoint(18.02, 60.01)), 4326)),
      ('UPPSP_SEG5', 1, 'Normalt', ST_SetSRID(ST_MakeLine(ST_MakePoint(18.90, 60.0), ST_MakePoint(18.91, 60.01)), 4326))`);
    // Facit kring H och I. H (SEG3): halka inom 5 km OCH inom fönstret ⇒ räknas. I har BARA fällor, var och en nära nog
    // och färsk nog att räknas om regeln vore lösare: "fläckvis Våt" (delsträngen 'is' inuti ordet) inom fönstret,
    // halka 3 h senare, och halka 50 km bort (SEG5). Fällorna ligger vid I just för att de ska kunna fälla ett prov —
    // vid H hade de dolts av stationens riktiga fynd, eftersom kolumnen räknar EPISODER och inte rader.
    await pool.query(`INSERT INTO road_condition_history (segment_id, condition_code, condition_text, condition_info, modified_time) VALUES
      ('UPPSP_SEG3', 3, 'Is/snö', '{Isbelagd}', ${T2} + interval '30 min'),
      ('UPPSP_SEG4', 2, 'Vått', '{"fläckvis Våt"}', ${T2} + interval '30 min'),
      ('UPPSP_SEG4', 3, 'Is/snö', '{Halka}', ${T2} + interval '3 hours'),
      ('UPPSP_SEG5', 3, 'Is/snö', '{Isbelagd}', ${T2} + interval '30 min')`);
    await pool.query(`INSERT INTO situation_archive (deviation_id, message_type_value, geom, start_time) VALUES
      ('UPPSP_OLY1', 'Accident', ST_SetSRID(ST_MakePoint(17.01, 60.0), 4326), ${T2} + interval '20 min'),
      ('UPPSP_OLY2', 'Accident', ST_SetSRID(ST_MakePoint(18.01, 60.0), 4326), ${T2} + interval '3 hours'),
      ('UPPSP_OLY3', 'VehicleObstruction', ST_SetSRID(ST_MakePoint(18.01, 60.0), 4326), ${T2} + interval '20 min')`);
    await pool.query(`INSERT INTO radar_precip (segment_id, observed_at, rate_max_mmh, rate_mean_mmh) VALUES
      ('UPPSP_SEG', ${T} - interval '10 min', 0.9, 0.6), ('UPPSP_SEG2', ${T} - interval '10 min', 0.8, 0.5)`);
    for (const [namn, arg, vantat] of VARIANTER)
      assert.equal((await rad(arg)).st - fore.get(namn)!, vantat, `${namn}: stationer den dagen`);
    // Blindat som standard: utfallskolumnerna är NULL. Öppnat: A föll ut, B nära; med bredare band uteblev C.
    const blind = await rad("");
    assert.deepEqual([blind.med, blind.fo, blind.na, blind.ut], [null, null, null, null], "p_blind är sant som standard");
    const oppen = await rad("p_blind := false");
    assert.ok(oppen.fo >= 1 && oppen.na >= 1, "öppnat: minst A som föll ut och B som var nära");
    assert.ok((await rad("p_hog := 4, p_blind := false")).ut >= 1, "öppnat med bredare band: C uteblev");
    assert.equal((await rad("p_krav_faller := false, p_blind := false")).fo, null, "utan faller har inget utfall i trendarkivet");
    // G över midnatt: båda dygnen ser stationen, men episoden — och dess utfall — finns bara på dygnet natten började.
    const efterG1 = await rad("p_blind := false", dagG1), efterG2 = await rad("p_blind := false", dagG2);
    assert.deepEqual([efterG1.st - foreG1.st, efterG2.st - foreG2.st], [1, 1], "G redovisas på båda UTC-dygnen");
    assert.deepEqual([(efterG1.med ?? 0) - (foreG1.med ?? 0), (efterG1.fo ?? 0) - (foreG1.fo ?? 0)], [1, 1], "G: en episod, bokförd där natten började, och den föll ut");
    assert.deepEqual([(efterG2.med ?? 0) - (foreG2.med ?? 0), (efterG2.ut ?? 0) - (foreG2.ut ?? 0)], [0, 0], "G: ingen andra episod efter midnatt UTC");
    assert.equal(efterG2.med === null, false, "öppnat ger 0, inte NULL, på ett dygn där ingen episod började — NULL betyder blindat");
    // #207 FACITSTACKEN: H har halka inom 5 km inom fönstret och en olycka likaså; I har bara fällorna.
    const efterHI = await rad("p_blind := false", dagHI);
    assert.equal(efterHI.ep - foreHI.ep, 2, "H och I ger var sin episod");
    assert.equal(efterHI.omk - (foreHI.omk ?? 0), 1, "bara H: 'fläckvis Våt', halka 3 h senare och halka 50 km bort räknas inte");
    assert.equal(efterHI.oly - (foreHI.oly ?? 0), 1, "bara H: olyckan 3 h senare och VehicleObstruction räknas inte");
    assert.equal((await rad("p_utfall := interval '120 minutes', p_blind := false", dagHI)).omk - (foreHI.omk ?? 0), 1, "ett bredare fönster når ändå inte 3 h");
    const blindHI = await rad("", dagHI);
    assert.deepEqual([blindHI.omk, blindHI.oly], [null, null], "facitkolumnerna är blindade som standard");
    assert.ok(blindHI.ep >= 2, "episoder räknar fyrningar och blindas inte");
    // D1: ett värde utanför svepen avvisas högljutt.
    for (const fel of ["p_fall := 0.7", "p_n := interval '5 hours'", "p_hog := 5", "p_regn_min := 0.3", "p_radar_r := 1", "p_radar_km := 10",
                       "p_trendfonster := 45", "p_band := 0.4", "p_utfall := interval '45 minutes'", "p_facit_km := 10"])
      await assert.rejects(pool.query(`SELECT * FROM uppspelning_efterhalka(${fel})`), /utanför svepet|utanför T-A|kopplingen station|räckvidden för facit/, fel);
    // Exakt EN signatur får finnas: en överlagring hade gjort anropet utan argument tvetydigt (se huvudet i sql/028).
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM pg_proc WHERE proname = 'uppspelning_efterhalka'")).rows[0].n, 1, "en signatur");
  } finally { await pool.end(); }
});

// #85 grannländernas batchade skrivare: samma kolumner och ON CONFLICT som de gamla enradiga
// INSERT:arna, men en UNNEST-sats per tabell. Provas mot riktiga fi/no/dk-scheman (migrationerna
// 004/010/012, 006/013, 007) — typkastningen i UNNEST (numeric[] med null, bool[], timestamptz[])
// är det som kan gå fel, och det syns bara mot Postgres.
test("#85 writeFi/writeNo/writeDk: batchat, upsert på latest, DO NOTHING i arkivet, omkörning ofarlig", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const { writeFi, writeNo, writeDk } = await import("../ingest/grannar-db.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const sql = (f: string) => readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8");
  try {
    for (const f of ["004_fi_schema.sql", "010_fi_dewpoint_latest.sql", "012_fi_falt.sql", "016_fi_humidity_latest.sql", "006_no_schema.sql", "013_no_falt.sql", "007_dk_schema.sql"]) await pool.query(sql(f));
    const client = await pool.connect();
    try {
      const fi = [
        { id: "FI:1", name: "Rovaniemi", lon: 25.7, lat: 66.5, t: "2026-11-01T06:00:00Z", surface: -1.5, air: 0.2, dewpoint: -2, keli: "Frost", rain: false, snow: true,
          frost: -1.8, fryspkt: -3, salt: 12, vind: 3.2, byvind: 5.1, vindr: 180, sikt: 8000, form: 60, ytstatus: 5 },
        { id: "FI:2", name: "Åbo", lon: 22.3, lat: 60.45, t: "2026-11-01T06:00:00Z", surface: null, air: 7, dewpoint: null, keli: null, rain: false, snow: false,
          frost: null, fryspkt: null, salt: null, vind: null, byvind: null, vindr: null, sikt: null, form: null, ytstatus: null },
      ];
      await writeFi(client, fi, [fi[0]]);
      await writeFi(client, fi, [fi[0]]);   // omkörning: latest upsertas, arkivet DO NOTHING
      const no = [{ id: "NO:1", name: "Dombås", lon: 9.13, lat: 62.08, t: "2026-11-01T06:00:00Z", surface: -4, air: -3, dewpoint: -5, humidity: 88, precipitation: "snow", rain: false, snow: true },
                  { id: "NO:2", name: "Oslo", lon: 10.75, lat: 59.91, t: "2026-11-01T06:00:00Z", surface: 6, air: 7, dewpoint: null, humidity: null, precipitation: null, rain: false, snow: false }];
      await writeNo(client, no, [no[0]]); await writeNo(client, no, [no[0]]);
      const dk = [{ id: "DK:1", name: "Aalborg", lon: 9.92, lat: 57.05, t: "2026-11-01T06:00:00Z", surface: -0.5, air: 1, dewpoint: -1, rain: false, snow: false },
                  { id: "DK:2", name: "Rønne", lon: 14.7, lat: 55.1, t: "2026-11-01T06:00:00Z", surface: 8, air: null, dewpoint: null, rain: false, snow: false }];
      await writeDk(client, dk, [dk[0]]); await writeDk(client, dk, [dk[0]]);
    } finally { client.release(); }
    const n = async (t: string) => Number((await pool.query(`SELECT count(*) AS n FROM ${t} WHERE station_id LIKE $1`, [t.slice(0, 2).toUpperCase() + ":%"])).rows[0].n);
    assert.deepEqual([await n("fi.weather_latest"), await n("fi.weather_observations")], [2, 1]);
    assert.deepEqual([await n("no.weather_latest"), await n("no.weather_observations")], [2, 1]);
    assert.deepEqual([await n("dk.weather_latest"), await n("dk.weather_observations")], [2, 1]);
    const r = (await pool.query(`SELECT surface_temp_c, precipitation, snow, salt_gm2, visibility_m, ST_X(geom) AS lon FROM fi.weather_observations WHERE station_id = 'FI:1'`)).rows[0];
    assert.deepEqual({ ...r, surface_temp_c: Number(r.surface_temp_c), salt_gm2: Number(r.salt_gm2), visibility_m: Number(r.visibility_m) },
      { surface_temp_c: -1.5, precipitation: "Frost", snow: true, salt_gm2: 12, visibility_m: 8000, lon: 25.7 });
    const tom = (await pool.query(`SELECT surface_temp_c, air_temp_c, precipitation FROM fi.weather_latest WHERE station_id = 'FI:2'`)).rows[0];
    assert.deepEqual({ ...tom, air_temp_c: Number(tom.air_temp_c) }, { surface_temp_c: null, air_temp_c: 7, precipitation: null });
    const g = (await pool.query(`SELECT precipitation, dewpoint_c FROM dk.weather_observations WHERE station_id = 'DK:1'`)).rows[0];
    assert.deepEqual({ precipitation: g.precipitation, dewpoint_c: Number(g.dewpoint_c) }, { precipitation: "grass", dewpoint_c: -1 });
  } finally { await pool.end(); }
});
