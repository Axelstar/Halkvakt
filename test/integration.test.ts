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
  // Källornas genomgång 20/10: när SMHI-hämtningen fallerar skickar ingest ingen smhi alls. Då får nuläget inte tömmas
  // och ingen synkrad skrivas — förut blev ett fel en tom lista, som raderade smhi_warnings och loggades som 0 varningar.
  const c3 = await writeAll({ ...data, smhi: undefined });
  assert.equal(c3.smhi, 0);
  assert.equal(await n("SELECT count(*) FROM smhi_warnings"), 1, "ett SMHI-fel tömmer inte nuläget");
  assert.equal(await n("SELECT count(*) FROM smhi_synk"), 2, "ett SMHI-fel skriver ingen synkrad");
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
  // #318: djuren i den levande tabellen, så att Trafikverkets radering släcker dem.
  assert.equal(ingestAction("AnimalPresenceObstruction", false), "store");
  assert.equal(ingestAction("AnimalPresenceObstruction", true), "mark-deleted");
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
    assert.deepEqual(liveDoc.weather.find((w) => w.id === "FARSK"), { id: "FARSK", lon: 15.1, lat: 59.1, yta: -1.5, fukt: true, regn_h: null, lutning15: null, lutning30: null, lutning60: null,
      bevis: { vata: 0, mangd: null, radar: null } });   // #245: inget arkiverat regn ⇒ väta 0, mängden okänd (inte noll)
  } finally { await pool.end(); }
});

// #234 RADVAKTEN OCH KARANTÄNEN mot riktig PostGIS (DECISIONS #298). Ö Ljungby 1106 visade yta +1,3 °C vid luft +13,3 °C
// och regn — exakt på #75:s gräns — och 24 broar på E4 fick frysrisk. Provet bär fallet som det såg ut, och de två fall
// vakten INTE får ta: blixthalkan (varmfront över frusen väg) och den enstaka studsen.
test("#234 radvakten och karantänen: givarfelet tystas, blixthalkan och studsen får tala", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { buildSnapshot } = await import("../publish/snapshot-core.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await pool.query(`
      INSERT INTO weather_latest (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow)
      VALUES
        ('LJUNGBY',   'Ö Ljungby-liknande: 12,0° under luften', ST_SetSRID(ST_MakePoint(13.02, 56.18), 4326), now() - interval '5 minutes',  1.3, 13.3, 'rain', true, false),
        ('BLIXT',     'Varmfront över frusen väg',              ST_SetSRID(ST_MakePoint(16.00, 60.00), 4326), now() - interval '5 minutes', -5.0,  4.0, 'rain', true, false),
        ('GRANS-UT',  'Luft +10, gap 8,0 — fälls',              ST_SetSRID(ST_MakePoint(16.10, 60.10), 4326), now() - interval '5 minutes',  2.0, 10.0, 'rain', true, false),
        ('GRANS-IN',  'Luft +10, gap 7,9 — släpps',             ST_SetSRID(ST_MakePoint(16.20, 60.20), 4326), now() - interval '5 minutes',  2.1, 10.0, 'rain', true, false),
        ('TOVADER',   'Blankis i töväder: luft +9,9, yta 0',    ST_SetSRID(ST_MakePoint(16.30, 60.30), 4326), now() - interval '5 minutes',  0.0,  9.9, 'rain', true, false),
        ('URKOPPLAD', 'Rimlig NU, men tre brott i veckan',      ST_SetSRID(ST_MakePoint(16.40, 60.40), 4326), now() - interval '5 minutes',  0.5,  5.0, 'rain', true, false),
        ('STUDS',     'Ett enda brott — ingen karantän',        ST_SetSRID(ST_MakePoint(16.50, 60.50), 4326), now() - interval '5 minutes', -0.5,  0.5, 'snow', false, true)
      ON CONFLICT (station_id) DO UPDATE SET sample_time = EXCLUDED.sample_time, surface_temp_c = EXCLUDED.surface_temp_c,
        air_temp_c = EXCLUDED.air_temp_c, precipitation = EXCLUDED.precipitation, rain = EXCLUDED.rain, snow = EXCLUDED.snow`);
    await pool.query(`
      INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c) VALUES
        ('URKOPPLAD', 'x', ST_SetSRID(ST_MakePoint(16.40, 60.40), 4326), now() - interval '1 day',  -49.0, 10.0),
        ('URKOPPLAD', 'x', ST_SetSRID(ST_MakePoint(16.40, 60.40), 4326), now() - interval '2 days', -48.0, 11.0),
        ('URKOPPLAD', 'x', ST_SetSRID(ST_MakePoint(16.40, 60.40), 4326), now() - interval '6 days', -50.0,  9.0),
        ('STUDS',     'x', ST_SetSRID(ST_MakePoint(16.50, 60.50), 4326), now() - interval '1 day',  -32.8,  0.7),
        ('GAMMALT',   'x', ST_SetSRID(ST_MakePoint(16.60, 60.60), 4326), now() - interval '8 days', -49.0, 10.0)
      ON CONFLICT DO NOTHING`);
    const { liveDoc, notes } = await buildSnapshot(async (t, p) => (await pool.query(t, p as any[])).rows, []);
    const ids = liveDoc.weather.map((w) => w.id);
    for (const tyst of ["LJUNGBY", "GRANS-UT", "URKOPPLAD"]) assert.ok(!ids.includes(tyst), `${tyst} ska vara tyst`);
    for (const talar of ["BLIXT", "GRANS-IN", "TOVADER", "STUDS"]) assert.ok(ids.includes(talar), `${talar} ska få tala`);
    assert.ok(notes.some((n) => n.startsWith("karantän: 1 station(er)") && n.includes("URKOPPLAD")), "karantänen ska namnge stationen: " + notes.join(" | "));
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

// Kort #83 steg 2a (sql/034, DECISIONS #334): arkivexporten. Dygnet packas som rubrikrad + en JSON-lista per rad, bokförs bara
// om filen bär exakt dygnets radantal, och raderingen tar bara det äldsta bokförda dygnet, bara över gränsen, aldrig yngre än
// min_dygn, och aldrig om databasen bär fler rader än filen — då exporteras dygnet om (sql/045, DECISIONS #514).
test("#83 arkivexporten: dygnet som text, bokföringen räknar om, raderingen är försiktig", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    for (const f of ["034_arkivexport.sql", "045_radering_exporterar_om.sql"])
      await pool.query(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
    await pool.query(`DELETE FROM weather_observations WHERE station_id IN ('X1', 'X2')`);
    await pool.query(`DELETE FROM arkiv_export`);
    // Ett dygn 40 dygn sedan: X1 tre rader, X2 två. Plus en rad i går (för ung att exportera).
    await pool.query(`
      INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, precipitation)
      SELECT 'X1', 'Ex, ett', ST_SetSRID(ST_MakePoint(15.5, 60.25), 4326), date_trunc('day', now() - interval '40 days') + i * interval '30 min', -i, 'no' FROM generate_series(0, 2) i
      UNION ALL SELECT 'X2', 'Ex "två"', ST_SetSRID(ST_MakePoint(16, 61), 4326), date_trunc('day', now() - interval '40 days') + i * interval '1 hour', null, null FROM generate_series(0, 1) i
      UNION ALL SELECT 'X1', 'Ex, ett', ST_SetSRID(ST_MakePoint(15.5, 60.25), 4326), now() - interval '1 day', 1, null`);
    const dag = (await pool.query(`SELECT ((now() - interval '40 days') AT TIME ZONE 'UTC')::date::text AS d`)).rows[0].d;
    // Ingesttestet ovan lämnar station W1 på det fasta datumet 2026-08-24. Den 3 oktober är "40 dygn sedan" just den dagen,
    // och räkningen nedan blev 6 (CI 37098271161). Bara X1 och X2 får finnas på testets dygn.
    await pool.query(`DELETE FROM weather_observations WHERE station_id NOT IN ('X1', 'X2') AND (sample_time AT TIME ZONE 'UTC')::date = $1::date`, [dag]);
    const att =(await pool.query(`SELECT arkiv_att_exportera(100)::text AS d`)).rows.map((r) => r.d);
    assert.ok(att.includes(dag), `dygnet ${dag} står i kö`);
    const igar = (await pool.query(`SELECT ((now() - interval '1 day') AT TIME ZONE 'UTC')::date::text AS d`)).rows[0].d;
    assert.ok(!att.includes(igar), "gårdagen är för ung — gallringen har inte tunnat den");
    const text: string = (await pool.query(`SELECT arkiv_dygn($1::date) AS t`, [dag])).rows[0].t;
    const rader = text.split("\n");
    const hdr = JSON.parse(rader[0]);
    assert.ok(hdr.includes("lon") && hdr.includes("lat") && !hdr.includes("geom"), "geom blir lon, lat");
    assert.equal(rader.length - 1, 5, "fem rader efter rubriken");
    const forsta = JSON.parse(rader[1]);
    assert.equal(forsta[hdr.indexOf("station_id")], "X1");
    assert.equal(forsta[hdr.indexOf("name")], "Ex, ett", "kommatecken i ett värde bryter inget");
    assert.equal(JSON.parse(rader[5])[hdr.indexOf("name")], 'Ex "två"', "citattecken bryter inget");
    assert.equal(forsta[hdr.indexOf("lon")], 15.5);
    // Fel radantal bokförs inte.
    await assert.rejects(pool.query(`SELECT arkiv_export_klar($1::date, 4, 100, 'x', 'v')`, [dag]), /har 5 rader i databasen men filen bär 4/);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM arkiv_export`)).rows[0].n, 0);
    assert.equal((await pool.query(`SELECT arkiv_export_klar($1::date, 5, 100, 'x', 'v') AS n`, [dag])).rows[0].n, 5);
    assert.ok(!(await pool.query(`SELECT arkiv_att_exportera(100)::text AS d`)).rows.some((r) => r.d === dag), "bokfört dygn lämnar kön");
    // Under gränsen raderas ingenting.
    assert.match((await pool.query(`SELECT arkiv_radera_exporterat(100000, 30) AS s`)).rows[0].s, /inget raderas/);
    // För ungt: min_dygn 50 skyddar ett dygn som är 40 dygn gammalt.
    assert.match((await pool.query(`SELECT arkiv_radera_exporterat(0, 50) AS s`)).rows[0].s, /inget exporterat dygn äldre än 50/);
    // En sen rad i dygnet: ingenting raderas, dygnet tas ur bokföringen och står i exportens kö igen (sql/045).
    await pool.query(`INSERT INTO weather_observations (station_id, name, geom, sample_time) VALUES ('X2', 'Ex "två"', ST_SetSRID(ST_MakePoint(16, 61), 4326), $1::date + interval '23 hours')`, [dag]);
    assert.match((await pool.query(`SELECT arkiv_radera_exporterat(0, 30) AS s`)).rows[0].s, /har 6 rader, filen bara 5 — exporteras om/);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM weather_observations WHERE (sample_time AT TIME ZONE 'UTC')::date = $1::date`, [dag])).rows[0].n, 6, "ingen rad raderad");
    assert.ok((await pool.query(`SELECT arkiv_att_exportera(100)::text AS d`)).rows.some((r) => r.d === dag), "dygnet står i kö igen");
    // Exporten tar dygnet igen, med den sena raden; sedan raderas det.
    assert.equal((await pool.query(`SELECT arkiv_export_klar($1::date, 6, 100, 'x2', 'v') AS n`, [dag])).rows[0].n, 6);
    assert.match((await pool.query(`SELECT arkiv_radera_exporterat(0, 30) AS s`)).rows[0].s, /raderade 6 rader/);
    const kvar = (await pool.query(`SELECT count(*)::int AS n FROM weather_observations WHERE station_id IN ('X1', 'X2')`)).rows[0].n;
    assert.equal(kvar, 1, "bara gårdagens rad står kvar");
    const e = (await pool.query(`SELECT raderad IS NOT NULL AS raderad, raderade_rader FROM arkiv_export WHERE dag = $1::date`, [dag])).rows[0];
    assert.deepEqual(e, { raderad: true, raderade_rader: 6 });
    // Ett raderat dygn skrivs aldrig över av en ny bokföring (dygnet är nu tomt, så 0 rader "stämmer").
    await pool.query(`SELECT arkiv_export_klar($1::date, 0, 1, 'y', 'v')`, [dag]);
    assert.equal((await pool.query(`SELECT rader FROM arkiv_export WHERE dag = $1::date`, [dag])).rows[0].rader, 6);
  } finally {
    await pool.query(`DELETE FROM weather_observations WHERE station_id IN ('X1', 'X2')`).catch(() => {});
    await pool.end();
  }
});

// Kort #347 (sql/053, DECISIONS #569): trendtabellerna och radarn går samma väg som väderarkivet. Vitlistan stoppar andra
// tabeller, filen bär dygnets värden i nyckelordning, bokföringen räknar om, och raderingen tar ett tabelldygn per anrop,
// exporterar om ett dygn som vuxit och raderar aldrig det som inte står i en fil.
test("#347 arkivexporten för trendtabellerna och radarn: vitlistan, filen, bokföringen och raderingen", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const ut = (s: string) => `DELETE FROM ${s}`;
  try {
    for (const f of ["001_init.sql", "009_radar_precip.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql", "029_brott_index.sql",
                     "030_langsam_vakt.sql", "053_arkiv_tabeller.sql"])
      await pool.query(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
    await pool.query(ut("arkiv_export_tabell"));
    const dag = (await pool.query(`SELECT ((now() - interval '40 days') AT TIME ZONE 'UTC')::date::text AS d`)).rows[0].d;
    // Bara testets rader får finnas på testets dygn (andra prov lämnar rader på fasta datum).
    for (const t of ["trend_kandidater", "trend_stigande", "radar_precip"])
      await pool.query(`DELETE FROM ${t} WHERE (observed_at AT TIME ZONE 'UTC')::date = $1::date`, [dag]);
    await pool.query(`INSERT INTO trend_kandidater (station_id, observed_at, surface_temp_c, air_temp_c, lutning15_c, utfall_rader)
      SELECT 'AX' || (2 - i % 2), ($1::date + i * interval '5 hours' + interval '7 minutes') AT TIME ZONE 'UTC', -1.25 * i, 2.5, 0.125, i FROM generate_series(0, 2) i
      UNION ALL SELECT 'AX1', now() - interval '1 day', 0, null, null, 0`, [dag]);
    await pool.query(`INSERT INTO trend_stigande (station_id, observed_at, surface_temp_c) VALUES ('AX1', ($1::date + interval '3 hours') AT TIME ZONE 'UTC', 4.5)`, [dag]);
    await pool.query(`INSERT INTO radar_precip (segment_id, observed_at, rate_max_mmh, rate_mean_mmh)
      VALUES ('AXS', ($1::date + interval '1 hour') AT TIME ZONE 'UTC', 3.5, 0.75), ('AXS', ($1::date + interval '2 hours') AT TIME ZONE 'UTC', 0.25, 0.125)`, [dag]);
    await assert.rejects(pool.query(`SELECT arkiv2_dygn('weather_observations', $1::date)`, [dag]), /okänd tabell weather_observations/);
    const att = (await pool.query(`SELECT arkiv2_att_exportera('trend_kandidater', 100)::text AS d`)).rows.map((r) => r.d);
    assert.ok(att.includes(dag), `dygnet ${dag} står i kö`);
    const igar = (await pool.query(`SELECT ((now() - interval '1 day') AT TIME ZONE 'UTC')::date::text AS d`)).rows[0].d;
    assert.ok(!att.includes(igar), "gårdagen är för ung");
    // Filen: rubrikrad + en lista per rad, i nyckelordning (station, tid), med samma värden som tabellen.
    const text: string = (await pool.query(`SELECT arkiv2_dygn('trend_kandidater', $1::date) AS t`, [dag])).rows[0].t;
    const [hdrRad, ...rader] = text.split("\n");
    const hdr = JSON.parse(hdrRad);
    assert.equal(hdr[0], "station_id"); assert.ok(hdr.includes("lutning15_c") && hdr.includes("skriven_at"));
    const db = (await pool.query(`SELECT station_id, observed_at, surface_temp_c::float8 AS y, air_temp_c::float8 AS l, utfall_rader FROM trend_kandidater
      WHERE (observed_at AT TIME ZONE 'UTC')::date = $1::date ORDER BY station_id, observed_at`, [dag])).rows;
    assert.equal(rader.length, 3, "tre rader efter rubriken");
    rader.forEach((r, i) => {
      const v = JSON.parse(r);
      assert.equal(v[hdr.indexOf("station_id")], db[i].station_id);
      assert.equal(new Date(v[hdr.indexOf("observed_at")]).getTime(), db[i].observed_at.getTime(), `rad ${i}: tiden`);
      assert.equal(v[hdr.indexOf("surface_temp_c")], db[i].y, `rad ${i}: ytan`);
      assert.equal(v[hdr.indexOf("utfall_rader")], db[i].utfall_rader);
    });
    // Bokföringen: fel radantal bokförs inte; rätt radantal bokförs och dygnet lämnar kön.
    await assert.rejects(pool.query(`SELECT arkiv2_export_klar('trend_kandidater', $1::date, 2, 100, 'x', 'v')`, [dag]), /har 3 rader i databasen men filen bär 2/);
    assert.equal((await pool.query(`SELECT arkiv2_export_klar('trend_kandidater', $1::date, 3, 100, 'x', 'v') AS n`, [dag])).rows[0].n, 3);
    assert.equal((await pool.query(`SELECT arkiv2_export_klar('radar_precip', $1::date, 2, 50, 'r', 'v') AS n`, [dag])).rows[0].n, 2);
    assert.ok(!(await pool.query(`SELECT arkiv2_att_exportera('trend_kandidater', 100)::text AS d`)).rows.some((r) => r.d === dag));
    assert.ok((await pool.query(`SELECT arkiv2_att_exportera('trend_stigande', 100)::text AS d`)).rows.some((r) => r.d === dag),
      "trend_stigande är inte exporterad och står kvar i sin kö");
    // Raderingen: under gränsen inget, för ungt inget, sedan radarn före trendtabellen (dag, tabell), aldrig trend_stigande.
    assert.match((await pool.query(`SELECT arkiv2_radera_exporterat(100000, 14) AS s`)).rows[0].s, /inget raderas/);
    assert.match((await pool.query(`SELECT arkiv2_radera_exporterat(0, 50) AS s`)).rows[0].s, /inget exporterat tabelldygn äldre än 50/);
    await pool.query(`INSERT INTO trend_kandidater (station_id, observed_at, surface_temp_c) VALUES ('AX3', ($1::date + interval '23 hours') AT TIME ZONE 'UTC', 1)`, [dag]);
    assert.match((await pool.query(`SELECT arkiv2_radera_exporterat(0, 14) AS s`)).rows[0].s, /radar_precip: raderade 2 rader/);
    assert.match((await pool.query(`SELECT arkiv2_radera_exporterat(0, 14) AS s`)).rows[0].s, /trend_kandidater .* har 4 rader, filen bara 3 — exporteras om/);
    assert.match((await pool.query(`SELECT arkiv2_radera_exporterat(0, 14) AS s`)).rows[0].s, /inget exporterat tabelldygn/);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM trend_kandidater WHERE (observed_at AT TIME ZONE 'UTC')::date = $1::date`, [dag])).rows[0].n, 4, "ingen trendrad raderad");
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM trend_stigande WHERE station_id = 'AX1'`)).rows[0].n, 1, "trend_stigande orörd");
    assert.equal((await pool.query(`SELECT arkiv2_export_klar('trend_kandidater', $1::date, 4, 100, 'x2', 'v') AS n`, [dag])).rows[0].n, 4);
    assert.match((await pool.query(`SELECT arkiv2_radera_exporterat(0, 14) AS s`)).rows[0].s, /trend_kandidater: raderade 4 rader/);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM trend_kandidater WHERE station_id LIKE 'AX%'`)).rows[0].n, 1, "bara gårdagens rad står kvar");
    const e = (await pool.query(`SELECT tabell, raderade_rader FROM arkiv_export_tabell WHERE raderad IS NOT NULL ORDER BY tabell`)).rows;
    assert.deepEqual(e, [{ tabell: "radar_precip", raderade_rader: 2 }, { tabell: "trend_kandidater", raderade_rader: 4 }]);
  } finally {
    for (const s of ["trend_kandidater WHERE station_id LIKE 'AX%'", "trend_stigande WHERE station_id LIKE 'AX%'", "radar_precip WHERE segment_id = 'AXS'", "arkiv_export_tabell"])
      await pool.query(ut(s)).catch(() => {});
    await pool.end();
  }
});

// Kort #291 (sql/042, DECISIONS #450): exportfilen läses tillbaka. Ett dygn med de värden som är lätta att tappa — decimaler,
// null, sant och falskt, kommatecken och citattecken i namnet, vind och sikt — exporteras, raderas och läses tillbaka, och
// jämförs kolumn för kolumn. Jämförelsen själv prövas också: en ändrad rad måste synas på båda sidor.
test("#291 återläsningen: filen blir samma rader igen, kolumn för kolumn", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    for (const f of ["034_arkivexport.sql", "042_arkiv_aterlas.sql"]) await pool.query(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
    const dag = (await pool.query(`SELECT ((now() - interval '45 days') AT TIME ZONE 'UTC')::date::text AS d`)).rows[0].d;
    await pool.query(`DELETE FROM weather_observations WHERE (sample_time AT TIME ZONE 'UTC')::date = $1::date`, [dag]);
    await pool.query(`
      INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, dewpoint_c, humidity_pct,
        precipitation, rain, snow, rain_sum_mm, snow_wateq_mm, wind_speed_ms, wind_gust_ms, wind_dir_deg, visibility_m)
      VALUES ('R1', 'Ån, "norra"', ST_SetSRID(ST_MakePoint(17.123456789, 62.987654321), 4326), $1::date + interval '30 min',
              -0.40, 1.2, -2.25, 97.5, 'Lätt snö', true, true, 0.3, 1.25, 4.7, 9.1, 225, 1200),
             ('R1', 'Ån, "norra"', ST_SetSRID(ST_MakePoint(17.123456789, 62.987654321), 4326), $1::date + interval '23 hours 30 min',
              null, null, null, null, 'no', false, false, null, null, null, null, null, null),
             ('R2', 'Två', ST_SetSRID(ST_MakePoint(11, 58), 4326), $1::date, 3, 4, 1, 80, null, false, false, 0, 0, 0.0, 0.0, 0, 20000)`, [dag]);
    const text: string = (await pool.query(`SELECT arkiv_dygn($1::date) AS t`, [dag])).rows[0].t;
    const jamfor = async () => (await pool.query(`SELECT arkiv_jamfor($1::date, $2) AS j`, [dag, text])).rows[0].j;
    assert.deepEqual(await jamfor(), { fil: 3, databas: 3, bara_i_filen: 0, bara_i_databasen: 0 }, "filen och databasen bär samma rader");
    // Jämförelsen ser en ändring: en rad med en annan temperatur finns då bara på ena sidan, och den andra bara på den andra.
    await pool.query(`UPDATE weather_observations SET surface_temp_c = -0.41 WHERE station_id = 'R1' AND sample_time = $1::date + interval '30 min'`, [dag]);
    assert.deepEqual(await jamfor(), { fil: 3, databas: 3, bara_i_filen: 1, bara_i_databasen: 1 }, "en ändrad rad syns");
    // Dygnet raderas och läses tillbaka ur filen; en andra återläsning skriver inget.
    await pool.query(`DELETE FROM weather_observations WHERE (sample_time AT TIME ZONE 'UTC')::date = $1::date`, [dag]);
    assert.equal((await pool.query(`SELECT arkiv_aterlas($1) AS n`, [text])).rows[0].n, 3, "tre rader tillbaka");
    assert.equal((await pool.query(`SELECT arkiv_aterlas($1) AS n`, [text])).rows[0].n, 0, "en omkörning dubblerar inte");
    assert.deepEqual(await jamfor(), { fil: 3, databas: 3, bara_i_filen: 0, bara_i_databasen: 0 }, "de återlästa raderna är filens, kolumn för kolumn");
    const [r] = (await pool.query(`SELECT name, ST_X(geom) AS lon, surface_temp_c::text AS yta, rain, visibility_m::text AS sikt FROM weather_observations
      WHERE station_id = 'R1' AND sample_time = $1::date + interval '30 min'`, [dag])).rows;
    assert.deepEqual(r, { name: 'Ån, "norra"', lon: 17.123456789, yta: "-0.40", rain: true, sikt: "1200" }, "decimalerna och skalan står kvar");
  } finally {
    await pool.query(`DELETE FROM weather_observations WHERE station_id IN ('R1', 'R2')`).catch(() => {});
    await pool.end();
  }
});

// Grepp 3 (sql/026, DECISIONS #232): gallra_arkiv kör den svenska gallringen och tar dessutom Finland (varma rader efter
// sju dygn, allt efter 60), Norge (allt efter sju dygn) och pg_crons logg — loggen finns inte i CI och hoppas över.
test("grepp 3 gallra_arkiv: Finland behåller kalla rader i 60 dygn, Norge och Danmark sju dygn, epoknoll och gravstenar bort, idempotent", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    for (const f of ["014_gallring.sql", "004_fi_schema.sql", "006_no_schema.sql", "007_dk_schema.sql", "026_gallring_grannar.sql", "031_gallring_dk_gravstenar_tid.sql"])
      await pool.query(readFileSync(new URL("../sql/" + f, import.meta.url), "utf8"));
    await pool.query("DELETE FROM fi.weather_observations WHERE station_id = 'GFI'");
    await pool.query("DELETE FROM no.weather_observations WHERE station_id = 'GNO'");
    await pool.query("DELETE FROM dk.weather_observations WHERE station_id = 'GDK'");
    await pool.query("DELETE FROM deviations WHERE deviation_id LIKE 'GRAV_%'");
    await pool.query("DELETE FROM dk.deviations WHERE deviation_id LIKE 'GRAV_%'");
    const p = "ST_SetSRID(ST_MakePoint(25, 66), 4326)";
    await pool.query(`INSERT INTO fi.weather_observations (station_id, name, geom, sample_time, surface_temp_c) VALUES
      ('GFI', 'Varm gammal', ${p}, now() - interval '20 days', 5),
      ('GFI', 'Kall gammal', ${p}, now() - interval '20 days' + interval '30 min', 1),
      ('GFI', 'Utan yta', ${p}, now() - interval '20 days' + interval '60 min', NULL),
      ('GFI', 'Kall uråldrig', ${p}, now() - interval '70 days', -2),
      ('GFI', 'Varm färsk', ${p}, now() - interval '1 day', 6),
      ('GFI', 'Epoknoll', ${p}, '1970-01-01T00:00:00Z', -2)`);
    // Kort #240: Danmark får Norges regel; gravstenar (raderade i 30 dygn) tas bort, färska gravstenar och levande rader står kvar.
    await pool.query(`INSERT INTO dk.weather_observations (station_id, name, geom, sample_time, surface_temp_c) VALUES
      ('GDK', 'Gammal', ${p}, now() - interval '20 days', -1),
      ('GDK', 'Färsk', ${p}, now() - interval '1 day', -1)`);
    const grav = (tabell: string) => pool.query(`INSERT INTO ${tabell} (deviation_id, situation_id, message_type, message_type_value, message, geom, start_time, modified_time, deleted) VALUES
      ('GRAV_GAMMAL', 's', 'Olycka', 'Accident', 'x', ${p}, now() - interval '40 days', now() - interval '35 days', true),
      ('GRAV_FARSK',  's', 'Olycka', 'Accident', 'x', ${p}, now() - interval '5 days',  now() - interval '2 days',  true),
      ('GRAV_LEVER',  's', 'Olycka', 'Accident', 'x', ${p}, now() - interval '40 days', now() - interval '35 days', false)`);
    await grav("deviations"); await grav("dk.deviations");
    await pool.query(`INSERT INTO no.weather_observations (station_id, name, geom, sample_time, surface_temp_c) VALUES
      ('GNO', 'Gammal', ${p}, now() - interval '20 days', -1),
      ('GNO', 'Färsk', ${p}, now() - interval '1 day', -1)`);
    await pool.query("SELECT gallra_arkiv(7)");
    const fi = (await pool.query("SELECT name FROM fi.weather_observations WHERE station_id = 'GFI' ORDER BY sample_time")).rows.map((r) => r.name);
    assert.deepEqual(fi, ["Kall gammal", "Varm färsk"], "varm och ytlös gammal rad bort, kall kvar, 70 dygn bort, epoknoll bort");
    const no = (await pool.query("SELECT name FROM no.weather_observations WHERE station_id = 'GNO'")).rows.map((r) => r.name);
    assert.deepEqual(no, ["Färsk"], "Norge: allt äldre än sju dygn bort");
    const dk = (await pool.query("SELECT name FROM dk.weather_observations WHERE station_id = 'GDK'")).rows.map((r) => r.name);
    assert.deepEqual(dk, ["Färsk"], "Danmark: Norges regel (kort #240)");
    for (const tabell of ["deviations", "dk.deviations"]) {
      const kvar = (await pool.query(`SELECT deviation_id FROM ${tabell} WHERE deviation_id LIKE 'GRAV_%' ORDER BY 1`)).rows.map((r) => r.deviation_id);
      assert.deepEqual(kvar, ["GRAV_FARSK", "GRAV_LEVER"], `${tabell}: gravstenen från 35 dygn bort, den färska och den levande kvar`);
    }
    const igen = (await pool.query("SELECT gallra_arkiv(7) AS n")).rows[0].n;
    assert.equal(Number(igen), 0, "andra körningen har inget att ta");
  } finally { await pool.end(); }
});

// Kort #322 (sql/044, DECISIONS #511): nattjobben ur migrationen själv, inte avskrivna. Jobbkommandona plockas ur filen och
// körs här, så att det som schemaläggs är det som prövas.
const JOBB_044 = async () => {
  const { readFileSync } = await import("node:fs");
  const text = readFileSync(new URL("../sql/044_gallring_tre_dygn.sql", import.meta.url), "utf8");
  const jobb = (namn: string) => {
    const m = text.match(new RegExp(`'(SELECT ${namn}[^']*)'`));
    assert.ok(m, `sql/044 bär ett jobbkommando för ${namn}`);
    return m![1];
  };
  return { text, gallring: jobb("gallra_arkiv"), radering: jobb("arkiv_radera_exporterat") };
};

// Gallringen efter tre dygn behåller brotten mot #75 (ytan mer än 12 °C under luften): karantänen i snapshoten räknar dem
// över sju dygn. En rad utan yta är inget brott och gallras som förut. Dygn yngre än tre rörs inte.
test("#322 gallringen efter tre dygn: brotten mot #75 står kvar, ytlösa rader gallras, yngre dygn orörda, idempotent", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    const { text, gallring } = await JOBB_044();
    assert.equal(gallring, "SELECT gallra_arkiv(3)");
    for (const f of ["014_gallring.sql", "004_fi_schema.sql", "006_no_schema.sql", "007_dk_schema.sql", "026_gallring_grannar.sql", "031_gallring_dk_gravstenar_tid.sql"])
      await pool.query(readFileSync(new URL("../sql/" + f, import.meta.url), "utf8"));
    await pool.query(text);
    await pool.query(`DELETE FROM weather_observations WHERE station_id IN ('B11', 'B12')`);
    // B11: ett helt dygn var tionde minut för fem dygn sedan. 00:00 och 00:10 är brott (yta −15, luft 1), 00:30 saknar yta
    // men har luft. B12: ett helt dygn för två dygn sedan, under fristen.
    await pool.query(`
      INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c)
      SELECT 'B11', 'Brott', ST_SetSRID(ST_MakePoint(15, 60), 4326), date_trunc('day', now() - interval '5 days') + i * interval '10 min',
             CASE WHEN i IN (0, 1) THEN -15 WHEN i = 3 THEN NULL ELSE 0 END, CASE WHEN i = 3 THEN 2 ELSE 1 END
      FROM generate_series(0, 143) i
      UNION ALL
      SELECT 'B12', 'Färsk', ST_SetSRID(ST_MakePoint(16, 61), 4326), date_trunc('day', now() - interval '2 days') + i * interval '10 min', 0, 1
      FROM generate_series(0, 143) i`);
    await pool.query(gallring);
    const n = async (villkor: string) => (await pool.query(`SELECT count(*)::int AS n FROM weather_observations WHERE ${villkor}`)).rows[0].n;
    assert.equal(await n(`station_id = 'B11'`), 48 + 2, "en rad per halvtimme, plus de två brotten som inte var sista i sin hink");
    assert.equal(await n(`station_id = 'B11' AND surface_temp_c < air_temp_c - 12`), 2, "brotten står kvar");
    assert.equal(await n(`station_id = 'B11' AND surface_temp_c IS NULL`), 0, "raden utan yta är inget brott och gallras");
    assert.equal(await n(`station_id = 'B12'`), 144, "två dygn gamla rader rörs inte");
    await pool.query(gallring);
    assert.equal(await n(`station_id IN ('B11', 'B12')`), 50 + 144, "andra körningen tar inget");
  } finally {
    await pool.query(`DELETE FROM weather_observations WHERE station_id IN ('B11', 'B12')`).catch(() => {});
    await pool.end();
  }
});

// Raderingen tar ikapp: nattjobbets kommando anropar raderingen upp till 40 gånger och tar varje exporterat dygn äldre än
// 14 dygn, äldst först, med samma radprov som förut; sedan säger varje anrop att inget finns. Ett yngre dygn står kvar.
// Ett dygn som vuxit sedan exporten exporteras om, och natten går vidare: i driften 10/10 hade 19–22/9 sena rader, och ett
// undantag hade rullat tillbaka hela nattens radering (sql/045, DECISIONS #514).
test("#322 raderingen ur exporten: golvet 14 dygn, ikapp i en körning, yngre dygn kvar", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    const { radering } = await JOBB_044();
    assert.equal(radering, "SELECT arkiv_radera_exporterat(350, 14) FROM generate_series(1, 40)");
    for (const f of ["034_arkivexport.sql", "045_radering_exporterar_om.sql"])
      await pool.query(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
    await pool.query(`DELETE FROM arkiv_export`);
    const dagar: string[] = [];
    for (const alder of [22, 21, 20, 10]) {
      const dag = (await pool.query(`SELECT ((now() - $1 * interval '1 day') AT TIME ZONE 'UTC')::date::text AS d`, [alder])).rows[0].d;
      dagar.push(dag);
      await pool.query(`DELETE FROM weather_observations WHERE (sample_time AT TIME ZONE 'UTC')::date = $1::date`, [dag]);
      await pool.query(`INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c)
        SELECT 'Y1', 'Ikapp', ST_SetSRID(ST_MakePoint(15, 60), 4326), $1::date + i * interval '30 min', 0 FROM generate_series(0, 1) i`, [dag]);
      await pool.query(`SELECT arkiv_export_klar($1::date, 2, 100, 'x', 'v')`, [dag]);
    }
    // En sen rad i mittendygnet efter exporten, som i driften 19–22/9.
    await pool.query(`INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c)
      VALUES ('Y1', 'Ikapp', ST_SetSRID(ST_MakePoint(15, 60), 4326), $1::date + interval '23 hours', 0)`, [dagar[1]]);
    // Gränsen 0 MB i stället för 350, så att provet inte beror på provdatabasens storlek; resten är jobbets kommando.
    const svar = (await pool.query(radering.replace("(350, 14)", "(0, 14)"))).rows.map((r) => String(Object.values(r)[0]));
    assert.equal(svar.filter((s) => s.startsWith("raderade 2 rader")).length, 2, "de två dygnen utan sena rader raderade");
    assert.deepEqual(svar.filter((s) => /exporteras om/.test(s)), [`dygnet ${dagar[1]} har 3 rader, filen bara 2 — exporteras om, raderas en senare natt`]);
    assert.equal(svar.filter((s) => /inget exporterat dygn äldre än 14/.test(s)).length, 37, "sedan finns inget att ta");
    assert.match(svar[0], new RegExp(dagar[0]), "äldst först");
    const kvar = (await pool.query(`SELECT (sample_time AT TIME ZONE 'UTC')::date::text AS d, count(*)::int AS n FROM weather_observations
      WHERE station_id = 'Y1' GROUP BY 1 ORDER BY 1`)).rows;
    assert.deepEqual(kvar, [{ d: dagar[1], n: 3 }, { d: dagar[3], n: 2 }], "dygnet med den sena raden och det tio dygn gamla står kvar");
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM arkiv_export WHERE raderad IS NOT NULL`)).rows[0].n, 2);
    assert.ok((await pool.query(`SELECT arkiv_att_exportera(100)::text AS d`)).rows.some((r) => r.d === dagar[1]), "det står i exportens kö igen");
  } finally {
    await pool.query(`DELETE FROM weather_observations WHERE station_id = 'Y1'`).catch(() => {});
    await pool.end();
  }
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

// Kort #203 lager 2 (sql/038, DECISIONS #379): förarens missar. Samma provmärkning som svaren, omsändning ersätter i stället
// för att dubblera, och ett "vad" utanför de fem avvisas av tabellen själv — inte bara av funktionen.
test("#203 driver_miss: provmärkning, omsändning ersätter, okänt vad avvisas, omkörning ofarlig", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const mig = () => pool.query(readFileSync(new URL("../sql/038_driver_miss.sql", import.meta.url), "utf8"));
  try {
    await mig();
    await pool.query("DELETE FROM driver_miss WHERE version = 'test203'");
    const in_ = (t: string, vad: string, st: string, seg: string | null, app: string) => pool.query(
      `INSERT INTO driver_miss (t, vad, station_id, segment_id, app, version) VALUES ($1, $2, $3, $4, $5, 'test203')
       ON CONFLICT (t, station_id, app) DO UPDATE SET vad = EXCLUDED.vad, segment_id = EXCLUDED.segment_id`, [t, vad, st, seg, app]);
    await in_("2026-11-01T06:00:00Z", "halka", "wx:2135", "seg:16010", "ios");
    await in_("2026-11-01T06:05:00Z", "vilt", "wx:fotostudio", null, "android");
    await in_("2026-11-01T06:10:00Z", "annat", "wx:prov-ios", null, "ios");
    await in_("2026-11-01T06:00:00Z", "vatten", "wx:2135", "seg:16010", "ios");      // omsändning med ändrat svar
    const rader = (await pool.query("SELECT station_id, vad, prov FROM driver_miss WHERE version = 'test203' ORDER BY t")).rows
      .map((r) => [r.station_id, r.vad, r.prov]);
    assert.deepEqual(rader, [["wx:2135", "vatten", false], ["wx:fotostudio", "vilt", true], ["wx:prov-ios", "annat", true]],
      "tre rader, inte fyra; förarens senaste ord gäller; prov och fotostudio märks");
    await assert.rejects(in_("2026-11-01T06:15:00Z", "is", "wx:2135", null, "ios"), /check constraint/i, "vad utanför de fem avvisas");
    await mig();
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM driver_miss WHERE version = 'test203'")).rows[0].n, 3,
      "omkörning av migrationen tappar inga rader");
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
    for (const f of ["001_init.sql", "003_situation_archive.sql", "008_rain_sum.sql", "009_radar_precip.sql", "017_trend_kandidater.sql", "029_brott_index.sql", "030_langsam_vakt.sql", "028_uppspelning_varianter.sql"])
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
    // J: NATTEN ÄR SVENSK (kort #256, DECISIONS #366). Två ögonblick en halvtimme före och efter lokal middag är två nätter i
    // svensk tid men EN i UTC — lokal middag är kl 10 eller 11 UTC, och en UTC-natt bryts först kl 12 UTC. Egen dag, 5 dygn bort.
    const JN = `((date_trunc('day', (${T} - interval '5 days') AT TIME ZONE 'Europe/Stockholm') + interval '12 hours') AT TIME ZONE 'Europe/Stockholm')`;
    const J1 = `(${JN} - interval '30 min')`, J2 = `(${JN} + interval '30 min')`;
    const [dagJ, dagJ2] = (await pool.query(`SELECT (${J1} AT TIME ZONE 'UTC')::date::text AS a, (${J2} AT TIME ZONE 'UTC')::date::text AS b`)).rows.map((r) => [r.a, r.b])[0];
    assert.ok(dagJ === dagJ2 && ![dag, dagG1, dagG2, dagHI].includes(dagJ), "J: båda ögonblicken på samma, egna UTC-dygn");
    const foreJ = await rad("", dagJ);
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
    await pool.query(`INSERT INTO trend_kandidater (station_id, observed_at, surface_temp_c, lutning15_c, lutning30_c, lutning60_c, min_yta_90min_c, utfall_rader) VALUES
      ('UPPSP_J', ${J1}, 2.0, 0.5, 1.0, 1.4, 1.8, 4), ('UPPSP_J', ${J2}, 1.8, 0.5, 1.0, 1.4, 1.9, 4)`);
    await pool.query(`INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, rain_sum_mm) VALUES
      ('UPPSP_J', 'J', ${g}, ${J1} - interval '30 min', NULL, NULL, 0.3)`);
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
    // J (kort #256): lokal middag skiljer två nätter. Med natten i UTC hade det blivit en episod.
    assert.equal((await rad("", dagJ)).ep - foreJ.ep, 2, "J: en halvtimme före och efter lokal middag är två nätter i svensk tid");
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

// Kort #234 i drifträkningen (sql/018, DECISIONS #299): radvakten och karantänen räknas PER RAD mot riktig PostGIS, med
// sql/029:s delindex på plats. Fyra stationer med samma vackra fall i bandet (3,0 → 1,8 °C på en halvtimme): KAR_A är
// frisk och blir kandidat; KAR_B har luften 12 ° över ytan (Ö Ljungby-felet — #75 släpper, gapet är exakt 12) och tas
// av radvakten ENSAM; KAR_C har tre brott mot #75 två dygn tidigare och sitter i karantän; KAR_D har två brott, och två
// räcker inte. Samma fyra fall som rimlig() prövas på i trenden.test.ts — tvillingarna ska välja lika.
test("#234 drifträkningen: radvakten och karantänen väljer bort samma rader som rimlig()", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    for (const f of ["001_init.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql", "029_brott_index.sql", "030_langsam_vakt.sql"])
      await pool.query(readFileSync(new URL("../sql/" + f, import.meta.url), "utf8"));
    for (const t of ["trend_kandidater", "weather_observations", "givarfel_dygn"]) await pool.query(`DELETE FROM ${t} WHERE station_id LIKE 'KAR_%'`);
    const g = (x: number) => `ST_SetSRID(ST_MakePoint(${x}, 60.0), 4326)`;
    const fall = (st: string, x: number, luftOver: number) => [50, 40, 30, 20].map((min, i) => {
      const yta = 3.0 - i * 0.4;
      return `('${st}', 'x', ${g(x)}, now() - interval '${min} minutes', ${yta.toFixed(1)}, ${(yta + luftOver).toFixed(1)}, ${(yta - 0.3).toFixed(1)}, 95)`;
    }).join(",\n");
    const brott = (st: string, x: number, n: number) => Array.from({ length: n }, (_, i) =>
      `('${st}', 'x', ${g(x)}, now() - interval '2 days' - interval '${i * 10} minutes', -20.0, 5.0, NULL, NULL)`).join(",\n");
    await pool.query(`
      INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, dewpoint_c, humidity_pct) VALUES
        ${fall("KAR_A", 15.1, 1)},
        ${fall("KAR_B", 15.2, 12)},
        ${fall("KAR_C", 15.3, 1)}, ${brott("KAR_C", 15.3, 3)},
        ${fall("KAR_D", 15.4, 1)}, ${brott("KAR_D", 15.4, 2)},
        ${fall("KAR_E", 15.5, 1)}
      ON CONFLICT DO NOTHING`);
    // KAR_E: samma vackra fall, men stationen har ett dygn i den långsamma vaktens fel (kort #236) — tabellen räcker.
    // Ett feldygn per UTC-dygn som fallet rör, som langsam_vakt() skriver: med bara now():s dygn föll provet 14/10 00:14 UTC,
    // när fallets rader (−50 till −20 min) låg på föregående dygn.
    await pool.query(`INSERT INTO givarfel_dygn (station_id, dag, forst, senast)
      SELECT DISTINCT 'KAR_E', (t AT TIME ZONE 'UTC')::date, now() - interval '20 hours', now() - interval '10 minutes'
      FROM unnest(ARRAY[now() - interval '50 minutes', now()]) AS t
      ON CONFLICT DO NOTHING`);
    await pool.query("SELECT * FROM berakna_trendkandidater()");
    const valda = (await pool.query("SELECT DISTINCT station_id FROM trend_kandidater WHERE station_id LIKE 'KAR_%' ORDER BY 1")).rows.map((r) => r.station_id);
    assert.deepEqual(valda, ["KAR_A", "KAR_D"], "A (frisk) och D (två brott) räknas; B (radvakten), C (karantänen) och E (den långsamma vakten) är tysta");
  } finally { await pool.end(); }
});

// LUTNINGENS HOPPVAKT I RAMARNA (kort #235). sql/018 räknade fönstren med en lateral och räknar dem nu med fönsterfunktioner;
// den enda punkt där formerna kan skilja sig är hoppvakten: ett hopp > 3 °C MELLAN två rader som båda ligger i fönstret fäller
// lutningen, men hoppet IN i fönstret (från raden före) gör det inte. HOPP_A: 9,0 → 4,0 (hopp 5) och sedan ett jämnt fall.
// Raden −20 min har hoppet utanför sitt 60-minutersfönster [−80, −20] och ska få lutning60 = 4,0 − 2,8 = 1,2; raden −35 min har
// hoppet inuti sitt fönster [−95, −35] och får ingen lutning alls. En ram som räknar hoppet in i fönstret gav −20 min lutning60
// NULL; en ram utan hoppvakt gav −35 min en kandidat.
test("#235 drifträkningen i ramar: hoppet in i fönstret räknas inte, hoppet inuti fäller lutningen", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    for (const f of ["001_init.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql", "029_brott_index.sql", "030_langsam_vakt.sql"])
      await pool.query(readFileSync(new URL("../sql/" + f, import.meta.url), "utf8"));
    for (const t of ["trend_kandidater", "weather_observations", "givarfel_dygn"]) await pool.query(`DELETE FROM ${t} WHERE station_id LIKE 'HOPP_%'`);
    const rad = (min: number, yta: number) =>
      `('HOPP_A', 'x', ST_SetSRID(ST_MakePoint(15.9, 60.0), 4326), now() - interval '${min} minutes', ${yta.toFixed(1)}, ${(yta + 1).toFixed(1)}, ${(yta - 0.3).toFixed(1)}, 95)`;
    await pool.query(`
      INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, dewpoint_c, humidity_pct) VALUES
        ${[[90, 9.0], [70, 4.0], [50, 3.6], [35, 3.2], [20, 2.8]].map(([m, y]) => rad(m, y)).join(",\n")}
      ON CONFLICT DO NOTHING`);
    await pool.query("SELECT * FROM berakna_trendkandidater()");
    const valda = (await pool.query(`SELECT round(extract(epoch FROM now() - observed_at) / 60) AS min, lutning15_c, lutning30_c, lutning60_c
      FROM trend_kandidater WHERE station_id = 'HOPP_A' ORDER BY observed_at`)).rows
      .map((r) => [Number(r.min), r.lutning15_c === null ? null : Number(r.lutning15_c), Number(r.lutning30_c), Number(r.lutning60_c)]);
    assert.deepEqual(valda, [[20, null, 0.8, 1.2]], "bara −20 min: 15 min har två rader, 30 min 3,6 − 2,8, 60 min 4,0 − 2,8 trots hoppet före fönstret");
  } finally { await pool.end(); }
});

// DEN LÅNGSAMMA VAKTEN mot riktig PostGIS (sql/030, kort #236, DECISIONS #300). Tre stationer med 30 timmars rader var
// tionde minut: LV_FEL ligger 7 ° under luften hela tiden (Ö Ljungby-felet under #75:s 12), LV_FRISK 1 ° under, LV_KORT
// 7 ° under de första 20 timmarna och rätt de sista 10. Funktionen ska ge LV_FEL ett färskt dygn i felet, LV_FRISK inget,
// och LV_KORT ett dygn vars senaste ögonblick är gammalt — så snapshoten tystar LV_FEL men inte LV_KORT.
test("#236 den långsamma vakten: sql/030 skriver dygnen i felet, och snapshoten tystar bara det färska", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const { buildSnapshot } = await import("../publish/snapshot-core.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    for (const f of ["001_init.sql", "030_langsam_vakt.sql"])
      await pool.query(readFileSync(new URL("../sql/" + f, import.meta.url), "utf8"));
    for (const t of ["givarfel_dygn", "weather_observations", "weather_latest"]) await pool.query(`DELETE FROM ${t} WHERE station_id LIKE 'LV_%'`);
    const g = (x: number) => `ST_SetSRID(ST_MakePoint(${x}, 60.0), 4326)`;
    const serie = (st: string, x: number, gap: (min: number) => number) => Array.from({ length: 180 }, (_, i) => {
      const min = 1800 - i * 10;   // 30 h bakåt, var tionde minut, fram till för 10 min sedan
      return `('${st}', 'x', ${g(x)}, now() - interval '${min} minutes', 2.0, ${(2.0 + gap(min)).toFixed(1)})`;
    }).join(",\n");
    await pool.query(`
      INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c) VALUES
        ${serie("LV_FEL", 15.1, () => 7)},
        ${serie("LV_FRISK", 15.2, () => 1)},
        ${serie("LV_KORT", 15.3, (min) => (min > 600 ? 7 : 1))}
      ON CONFLICT DO NOTHING`);
    const n = (await pool.query("SELECT langsam_vakt(interval '2 days') AS n")).rows[0].n;
    assert.ok(Number(n) >= 1, `funktionen ska skriva minst ett stationsdygn, skrev ${n}`);
    const dygn = (await pool.query(`SELECT station_id, max(senast) AS senast FROM givarfel_dygn WHERE station_id LIKE 'LV_%' GROUP BY 1 ORDER BY 1`)).rows;
    assert.deepEqual(dygn.map((r) => r.station_id), ["LV_FEL", "LV_KORT"], "den friska stationen får inget dygn i felet");
    const alder = (s: Date) => (Date.now() - new Date(s).getTime()) / 3_600_000;
    assert.ok(alder(dygn[0].senast) < 1, "LV_FEL:s senaste ögonblick i felet är färskt");
    assert.ok(alder(dygn[1].senast) > 3, "LV_KORT mätte rätt de sista tio timmarna — dess senaste ögonblick i felet är gammalt");
    // Idempotent: ett andra anrop ändrar ingenting.
    const fore = (await pool.query("SELECT station_id, dag, forst, senast FROM givarfel_dygn WHERE station_id LIKE 'LV_%' ORDER BY 1, 2")).rows;
    await pool.query("SELECT langsam_vakt(interval '2 days')");
    const efter = (await pool.query("SELECT station_id, dag, forst, senast FROM givarfel_dygn WHERE station_id LIKE 'LV_%' ORDER BY 1, 2")).rows;
    assert.deepEqual(JSON.stringify(efter), JSON.stringify(fore), "omkörning ger samma tabell");
    // Snapshoten: LV_FEL och LV_KORT står kalla och blöta i weather_latest; bara LV_FEL ska tystas.
    await pool.query(`
      INSERT INTO weather_latest (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow) VALUES
        ('LV_FEL',   'Ö Ljungby-felet under 12', ${g(15.1)}, now() - interval '5 minutes', -1.0, 6.0, 'rain', true, false),
        ('LV_KORT',  'mätte rätt igen',          ${g(15.3)}, now() - interval '5 minutes', -1.0, 0.0, 'rain', true, false),
        ('LV_FRISK', 'frisk',                    ${g(15.2)}, now() - interval '5 minutes', -1.0, 0.0, 'rain', true, false)
      ON CONFLICT DO NOTHING`);
    const q = async (text: string, params?: unknown[]) => (await pool.query(text, params as any[])).rows;
    const { staticDoc, liveDoc, notes } = await buildSnapshot(q, [], new Date());
    const ids = liveDoc.weather.map((w) => w.id).filter((id) => id.startsWith("LV_")).sort();
    assert.deepEqual(ids, ["LV_FRISK", "LV_KORT"], "LV_FEL ska vara tyst, LV_KORT talar igen");
    // Kort #203 (A): stationslistan i static.json bär ALLA stationer — också den som tystas i live.json — med sin position.
    const st = staticDoc.stations.filter((s) => s.id.startsWith("LV_"));
    assert.deepEqual(st.map((s) => s.id), ["LV_FEL", "LV_FRISK", "LV_KORT"], "stationslistan filtrerar inte på väder eller givarvakt");
    assert.deepEqual(st.map((s) => [s.lon, s.lat]), [[15.1, 60], [15.2, 60], [15.3, 60]]);
    assert.ok(notes.some((n) => n.startsWith("långsam vakt:") && n.includes("LV_FEL") && !n.includes("LV_KORT")));
  } finally { await pool.end(); }
});

// KORT #156 (Bengt 22/9): serverns halkfilter släpper in allt motorn kan varna för. "Mycket besvärligt" vid kod 1 nådde
// förut aldrig telefonen, fast motorn räknar det som halt; "Halkigt" prövar halkig. Fällorna ska stå utanför: "fläckvis Våt"
// (is inuti ett ord, 8 falska halksegment i augusti) och "Halkbekämpning" (en motåtgärd, inte en fara).
test("#156 serverns halkfilter: kod 1 med mycket besvärligt och halkigt når motorn, fällorna gör det inte", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const { buildSnapshot } = await import("../publish/snapshot-core.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    for (const f of ["001_init.sql", "009_radar_precip.sql", "030_langsam_vakt.sql"])
      await pool.query(readFileSync(new URL("../sql/" + f, import.meta.url), "utf8"));
    const seg = (id: string, info: string, x: number) =>
      `('${id}', 1, 'Normalt', ARRAY['${info}'], ST_SetSRID(ST_MakeLine(ST_MakePoint(${x}, 61.0), ST_MakePoint(${x + 0.01}, 61.01)), 4326))`;
    await pool.query(`INSERT INTO road_conditions (segment_id, condition_code, condition_text, condition_info, geom) VALUES
      ${seg("H156_MB", "Mycket besvärligt", 16.1)}, ${seg("H156_HK", "Halkigt", 16.2)},
      ${seg("H156_FV", "fläckvis Våt", 16.3)}, ${seg("H156_HB", "Halkbekämpning", 16.4)}
      ON CONFLICT (segment_id) DO UPDATE SET condition_code = 1, condition_info = EXCLUDED.condition_info,
        deleted = false, end_time = NULL, geom = EXCLUDED.geom`);
    const { liveDoc } = await buildSnapshot(async (t, p) => (await pool.query(t, p as any[])).rows, []);
    const inne = liveDoc.segments.map((s) => s.id).filter((id) => id.startsWith("H156_")).sort();
    assert.deepEqual(inne, ["H156_HK", "H156_MB"], "mycket besvärligt och halkigt in; fläckvis Våt och Halkbekämpning ute");
  } finally { await pool.end(); }
});

// KORT #255: rekonstruktionen (publish/rekonstruktion.ts) räknade Trafikverkets "no" som fukt — `COALESCE(precipitation,'') <> ''`
// — och gav frysrisk vid varje torr station. Samma fälla som `Boolean(precipitation)` (CLAUDE.md). Provet kör den riktiga frågan
// mot PostGIS, vid en tid långt från de andra provens rader: uppehåll ("no", "Dry", null) är torrt; regn, snö och en tiominuterssumma
// med regn är blött — exakt som snapshotkärnans `fukt`.
test("#255 rekonstruktionen: uppehåll är torrt, nederbörd är blött", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { hazardsAt } = await import("../publish/rekonstruktion.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await pool.query(`
      INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow) VALUES
        ('R255-NO',    'uppehåll',          ST_SetSRID(ST_MakePoint(15.0, 60.0), 4326), '2026-01-15T05:50:00Z', -1.0, 0.0, 'no',   false, false),
        ('R255-DRY',   'nordiskt uppehåll', ST_SetSRID(ST_MakePoint(15.1, 60.0), 4326), '2026-01-15T05:50:00Z', -1.0, 0.0, 'Dry',  false, false),
        ('R255-NULL',  'ingen typgivare',   ST_SetSRID(ST_MakePoint(15.2, 60.0), 4326), '2026-01-15T05:50:00Z', -1.0, 0.0, NULL,   false, false),
        ('R255-RAIN',  'regn',              ST_SetSRID(ST_MakePoint(15.3, 60.0), 4326), '2026-01-15T05:50:00Z', -1.0, 0.0, 'rain', true,  false),
        ('R255-SNOW',  'snö',               ST_SetSRID(ST_MakePoint(15.4, 60.0), 4326), '2026-01-15T05:50:00Z', -1.0, 0.0, 'snow', false, true),
        ('R255-SUMMA', 'no, men regn i tiominuterssumman', ST_SetSRID(ST_MakePoint(15.5, 60.0), 4326), '2026-01-15T05:50:00Z', -1.0, 0.0, 'no', true, false)
      ON CONFLICT DO NOTHING`);
    const faror = await hazardsAt(async (s, p) => (await pool.query(s, p as any[])).rows, new Date("2026-01-15T06:00:00Z"));
    const fukt = Object.fromEntries(faror.filter((h) => h.id.startsWith("wx:R255-"))
      .map((h) => [h.id.slice(3), (h as { meta: { moisture: boolean } }).meta.moisture]));
    assert.deepEqual(fukt, { "R255-NO": false, "R255-DRY": false, "R255-NULL": false, "R255-RAIN": true, "R255-SNOW": true, "R255-SUMMA": true });
  } finally { await pool.end(); }
});

// KORT #254 g: orsaksklassningen ska läsa den NÄRMASTE STATIONEN (TROSKLAR-SKUGGAN §2), inte de åtta närmaste raderna, och
// en station bortom NEDERBORD_KM får inte ursäkta en miss. Fällan: den närmaste stationen är torr med två rader, en station
// 20 km bort regnar med tio — åtta rader hade låtit den längre bort avgöra.
test("#254 g orsaken: närmaste station, inom 50 km — annars okänd", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { nederbordVid } = await import("../publish/skuggfacit.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const fraga = async (s: string, p: unknown[]) => (await pool.query(s, p as any[])).rows;
  try {
    const rader: string[] = [];
    const rad = (id: string, lon: number, lat: number, min: number, regn: boolean) =>
      rader.push(`('${id}', 'x', ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326), '2026-02-10T06:00:00Z'::timestamptz + interval '${min} minutes', -1, 0, ${regn}, false)`);
    rad("G254-NARA", 16.0, 61.0, -20, false); rad("G254-NARA", 16.0, 61.0, 20, false);
    for (let i = 0; i < 10; i++) rad("G254-20KM", 16.0, 61.18, -50 + 10 * i, true);        // ~20 km norrut
    for (let i = 0; i < 10; i++) rad("G254-60KM", 20.0, 66.54, -50 + 10 * i, true);        // ensam och ~60 km från provpunkt 2
    await pool.query(`INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, rain, snow)
      VALUES ${rader.join(",")} ON CONFLICT DO NOTHING`);
    assert.equal(await nederbordVid(fraga, "2026-02-10T06:00:00Z", 16.0, 61.0), false, "den närmaste stationen är torr — den avgör");
    assert.equal(await nederbordVid(fraga, "2026-02-10T06:00:00Z", 16.0, 61.18), true, "vid den regnande stationen regnar det");
    assert.equal(await nederbordVid(fraga, "2026-02-10T06:00:00Z", 20.0, 66.0), null, "60 km bort ursäktar ingenting");
  } finally { await pool.end(); }
});

// KORT #254 h: rekonstruktionen ska se samma stationer som telefonen såg — genom #75, radvakten och karantänen. Utan vakterna
// hade en fastfrusen givare på −10,7 °C gett frysrisk i varje uppspelning (Storvik 5/9).
test("#254 h rekonstruktionen: trasiga givare ger ingen frysrisk i uppspelningen", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { hazardsAt } = await import("../publish/rekonstruktion.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await pool.query(`
      INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow) VALUES
        ('H254-GIVAR',   '#75: 22,7° under luften',   ST_SetSRID(ST_MakePoint(16.0, 62.0), 4326), '2027-01-20T05:50:00Z', -10.7, 12.0, 'rain', true, false),
        ('H254-RADVAKT', 'luft +13,3, gap 12,0',       ST_SetSRID(ST_MakePoint(16.1, 62.0), 4326), '2027-01-20T05:50:00Z',   1.3, 13.3, 'rain', true, false),
        ('H254-KARANT',  'rimlig nu, tre brott förut', ST_SetSRID(ST_MakePoint(16.2, 62.0), 4326), '2027-01-20T05:50:00Z',   0.5,  5.0, 'rain', true, false),
        ('H254-KARANT',  'x', ST_SetSRID(ST_MakePoint(16.2, 62.0), 4326), '2027-01-18T05:50:00Z', -49.0, 10.0, NULL, false, false),
        ('H254-KARANT',  'x', ST_SetSRID(ST_MakePoint(16.2, 62.0), 4326), '2027-01-17T05:50:00Z', -48.0, 11.0, NULL, false, false),
        ('H254-KARANT',  'x', ST_SetSRID(ST_MakePoint(16.2, 62.0), 4326), '2027-01-15T05:50:00Z', -50.0,  9.0, NULL, false, false),
        ('H254-BLIXT',   'varmfront över frusen väg',  ST_SetSRID(ST_MakePoint(16.3, 62.0), 4326), '2027-01-20T05:50:00Z',  -5.0,  4.0, 'rain', true, false),
        ('H254-FRISK',   'rimlig',                     ST_SetSRID(ST_MakePoint(16.4, 62.0), 4326), '2027-01-20T05:50:00Z',  -1.0,  0.5, 'snow', false, true)
      ON CONFLICT DO NOTHING`);
    const faror = await hazardsAt(async (s, p) => (await pool.query(s, p as any[])).rows, new Date("2027-01-20T06:00:00Z"));
    const ids = faror.map((h) => h.id).filter((id) => id.startsWith("wx:H254-")).sort();
    assert.deepEqual(ids, ["wx:H254-BLIXT", "wx:H254-FRISK"], "givarfelet, radvaktens fall och karantänen tystas; blixthalkan talar");
  } finally { await pool.end(); }
});

// KORT #257: trendens STIGANDE halva sparas i en egen tabell, med samma vakter, band, fönster och utfall som den fallande.
// STIG_A stiger 0,6 → 1,8 °C på 30 min (lutning30 −1,2 vid −20 min), FALL_A faller 3,0 → 1,8 (lutning30 +1,2), PLATT_A står
// still. STIG_B stiger för tre timmar sedan och fryser sedan om till 0,8 — utfallet ska fyllas som den fallande halvans.
test("#257 den stigande halvan: egen tabell, samma vakter, fallande orörd, utfallet fylls", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    for (const f of ["001_init.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql", "029_brott_index.sql", "030_langsam_vakt.sql"])
      await pool.query(readFileSync(new URL("../sql/" + f, import.meta.url), "utf8"));
    for (const t of ["trend_kandidater", "trend_stigande", "weather_observations"]) await pool.query(`DELETE FROM ${t} WHERE station_id LIKE '%_257'`);
    const rad = (st: string, x: number, min: number, yta: number) =>
      `('${st}', 'x', ST_SetSRID(ST_MakePoint(${x}, 61.0), 4326), now() - interval '${min} minutes', ${yta.toFixed(1)}, ${(yta + 1).toFixed(1)}, ${(yta - 0.3).toFixed(1)}, 95)`;
    const serie = (st: string, x: number, pts: [number, number][]) => pts.map(([min, yta]) => rad(st, x, min, yta)).join(",\n");
    await pool.query(`
      INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, dewpoint_c, humidity_pct) VALUES
        ${serie("STIG_A_257", 15.1, [[50, 0.6], [40, 1.0], [30, 1.4], [20, 1.8]])},
        ${serie("FALL_A_257", 15.2, [[50, 3.0], [40, 2.6], [30, 2.2], [20, 1.8]])},
        ${serie("PLATT_A_257", 15.3, [[50, 2.0], [40, 2.0], [30, 2.0], [20, 2.0]])},
        ${serie("STIG_B_257", 15.4, [[210, 0.6], [200, 1.0], [190, 1.4], [180, 1.8], [150, 1.2], [120, 0.8]])}
      ON CONFLICT DO NOTHING`);
    await pool.query("SELECT * FROM berakna_trendkandidater(interval '5 hours')");
    const i = async (tabell: string, st: string) =>
      (await pool.query(`SELECT to_char(observed_at, 'HH24:MI') AS t, lutning30_c::float8 AS l30, min_yta_90min_c::float8 AS min, utfall_rader AS n
                         FROM ${tabell} WHERE station_id = $1 ORDER BY observed_at`, [st])).rows;
    const stigA = await i("trend_stigande", "STIG_A_257");
    assert.equal(stigA.length, 2, "STIG_A: två stigande kandidater (−30 och −20 min) — raden −40 har för få rader i fönstret");
    assert.ok(stigA.every((r) => r.l30 <= -0.4), "stigningen bär negativ lutning — samma tecken som i trend_kandidater");
    assert.equal((await i("trend_kandidater", "STIG_A_257")).length, 0, "en stigning hamnar aldrig bland de fallande");
    assert.ok((await i("trend_kandidater", "FALL_A_257")).length >= 1, "den fallande halvan skrivs som förut");
    assert.equal((await i("trend_stigande", "FALL_A_257")).length, 0, "ett fall hamnar aldrig bland de stigande");
    assert.equal((await i("trend_stigande", "PLATT_A_257")).length + (await i("trend_kandidater", "PLATT_A_257")).length, 0, "platt yta: ingen kandidat");
    // STIG_B ger tre stigande rader: −190 och −180 min, och −150 — där har ytan fallit sedan −180 men 60-minutersfönstret
    // [−210, −150] har ändå stigit 0,6. Raden −180 har utfallet i (−180, −90]: 1,2 och 0,8.
    const bs = await i("trend_stigande", "STIG_B_257");
    assert.equal(bs.length, 3, "STIG_B: −190, −180 och −150 min");
    assert.deepEqual([bs[1].min, bs[1].n], [0.8, 2], "STIG_B: utfallet fylls — ytan frös om till 0,8 inom 90 min, på två mätningar");
  } finally { await pool.end(); }
});

// Kort #276 (sql/040, DECISIONS #421): oljeskuggans RPC. Aktiv = start ≤ nu < slut; utan sluttid bara det första dygnet; andra klasser
// och rader utan punkt aldrig. shadow_log skapades före sql/-katalogen (Management API), så provet ställer en minimal tabell i dess
// ställe — CI:s PostGIS är slit-och-släng.
test("#276 olja_aktiva: bara aktiva NonWeatherRelatedRoadConditions med punkt; omkörning ofarlig", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const sqlf = (f: string) => pool.query(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  try {
    await sqlf("001_init.sql");
    await sqlf("003_situation_archive.sql");
    await pool.query("CREATE TABLE IF NOT EXISTS shadow_log (id bigserial PRIMARY KEY, run_at timestamptz NOT NULL DEFAULT now(), alerts jsonb NOT NULL DEFAULT '[]'::jsonb)");
    await sqlf("040_olja_skugga.sql");
    await pool.query("DELETE FROM situation_archive WHERE deviation_id LIKE 'test276:%'");
    const in_ = (id: string, typ: string, punkt: boolean, start: string, slut: string | null) => pool.query(
      `INSERT INTO situation_archive (deviation_id, message_type_value, message, geom, start_time, end_time)
       VALUES ($1, $2, 'Olja på vägbanan, risk för halka', CASE WHEN $3::boolean THEN ST_SetSRID(ST_MakePoint(15, 59), 4326) END,
               now() + $4::interval, now() + $5::interval)`, [id, typ, punkt, start, slut]);
    await in_("test276:aktiv", "NonWeatherRelatedRoadConditions", true, "-1 hour", "2 hours");
    await in_("test276:slut", "NonWeatherRelatedRoadConditions", true, "-5 hours", "-1 hour");
    await in_("test276:framtid", "NonWeatherRelatedRoadConditions", true, "1 hour", "3 hours");
    await in_("test276:annan", "Accident", true, "-1 hour", "2 hours");
    await in_("test276:utanpunkt", "NonWeatherRelatedRoadConditions", false, "-1 hour", "2 hours");
    await in_("test276:ingen-slut-ny", "NonWeatherRelatedRoadConditions", true, "-2 hours", null);
    await in_("test276:ingen-slut-gammal", "NonWeatherRelatedRoadConditions", true, "-30 hours", null);
    const ids = async () => (await pool.query("SELECT id FROM olja_aktiva() WHERE id LIKE 'test276:%' ORDER BY id")).rows.map((r) => r.id);
    assert.deepEqual(await ids(), ["test276:aktiv", "test276:ingen-slut-ny"],
      "aktiv nu, eller utan sluttid och yngre än ett dygn — aldrig avslutad, framtida, annan klass eller utan punkt");
    const rad = (await pool.query("SELECT lon, lat, meddelande FROM olja_aktiva() WHERE id = 'test276:aktiv'")).rows[0];
    assert.deepEqual([rad.lon, rad.lat, rad.meddelande], [15, 59, "Olja på vägbanan, risk för halka"], "punkt och text följer med");
    await sqlf("040_olja_skugga.sql");
    assert.deepEqual(await ids(), ["test276:aktiv", "test276:ingen-slut-ny"], "omkörning av migrationen ändrar ingenting");
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name = 'shadow_log' AND column_name = 'olja'")).rows[0].n, 1,
      "kolumnen olja finns");
  } finally { await pool.end(); }
});

// Väg C (sql/046, DECISIONS #527): shadow_log_c har shadow_logs kolumner och RLS på, och omkörning är ofarlig. Samma minimala
// shadow_log som provet ovan, plus kolumnerna ur 005, 016, 019, 021, 032 och 040 (bara kolumnerna: 032:s och 040:s funktioner
// kräver väderarkivet och händelsearkivet, som provet inte behöver).
test("väg C: shadow_log_c har shadow_logs kolumner och RLS; omkörning ofarlig", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const sqlf = (f: string) => pool.query(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  const kolumner = async (t: string) => (await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY column_name", [t])).rows.map((r) => r.column_name);
  try {
    await pool.query("CREATE TABLE IF NOT EXISTS shadow_log (id bigserial PRIMARY KEY, run_at timestamptz NOT NULL DEFAULT now(), alerts jsonb NOT NULL DEFAULT '[]'::jsonb)");
    for (const f of ["005_shadow_log_land.sql", "016_shadow_suppressed.sql", "019_shadow_vb.sql", "021_shadow_efterhalka.sql"]) await sqlf(f);
    await pool.query("ALTER TABLE shadow_log ADD COLUMN IF NOT EXISTS prognos jsonb NOT NULL DEFAULT '{}'::jsonb");
    await pool.query("ALTER TABLE shadow_log ADD COLUMN IF NOT EXISTS olja jsonb NOT NULL DEFAULT '[]'::jsonb");
    await sqlf("046_skugga_c.sql");
    await sqlf("046_skugga_c.sql");
    assert.deepEqual(await kolumner("shadow_log_c"), await kolumner("shadow_log"), "samma kolumner som shadow_log");
    assert.equal((await pool.query("SELECT relrowsecurity FROM pg_class WHERE relname = 'shadow_log_c'")).rows[0].relrowsecurity, true, "RLS på");
    await pool.query("INSERT INTO shadow_log_c (alerts) VALUES ('[]'::jsonb)");
    const rad = (await pool.query("SELECT land, efterhalka, prognos FROM shadow_log_c ORDER BY id DESC LIMIT 1")).rows[0];
    assert.deepEqual([rad.land, rad.efterhalka, rad.prognos], ["SE", [], {}], "standardvärdena följer med");
  } finally { await pool.end(); }
});

// KUVÖSENS KLOCKA (kuvos/klocka.sql, kort #232, DECISIONS #424): snapshotbyggaren körd oförändrad mot en gången tidpunkt.
// FÄLLORNA LIGGER DÄR DE KAN FÄLLA NÅGOT (CLAUDE.md): varje station nedan ger ett annat svar om klockan står fel eller om
// framtiden läcker. Produktionens frågor har ingen övre tidsgräns, så utan vyerna i kuvos/klocka.sql ser byggaren vid T
// rader från T+20 min: fel yta, negativ regn_h, nästa timmes lutning, en karantän för brott som inte hänt än.
test("kuvösens klocka: byggaren ser världen som den var vid T — inget ur framtiden, och utan klockan ingenting", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const { buildSnapshot } = await import("../publish/snapshot-core.ts");
  const { kuvosKlient } = await import("../kuvos/klocka.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  let k: Awaited<ReturnType<typeof kuvosKlient>> | null = null;
  try {
    for (const f of ["001_init.sql", "008_rain_sum.sql", "009_radar_precip.sql", "017_trend_kandidater.sql", "030_langsam_vakt.sql"])
      await pool.query(readFileSync(new URL("../sql/" + f, import.meta.url), "utf8"));
    const klockaSql = readFileSync(new URL("../kuvos/klocka.sql", import.meta.url), "utf8");
    await pool.query(klockaSql);
    await pool.query(klockaSql);   // omkörning ofarlig: schemat byggs om helt
    for (const t of ["weather_observations", "weather_latest", "trend_kandidater", "givarfel_dygn"])
      await pool.query(`DELETE FROM ${t} WHERE station_id LIKE 'KUV_%'`);

    const T = new Date("2025-01-14T06:00:00Z"), T2 = new Date(T.getTime() + 30 * 60_000);
    const vid = (min: number) => `'${new Date(T.getTime() + min * 60_000).toISOString()}'`;
    const g = (x: number) => `ST_SetSRID(ST_MakePoint(${x}, 62.0), 4326)`;
    await pool.query(`
      INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow, rain_sum_mm) VALUES
        ('KUV_IS',       'x', ${g(15.1)}, ${vid(-40)},  2.5,  3.0, 'rain', true,  false, 0.4),
        ('KUV_IS',       'x', ${g(15.1)}, ${vid(-10)},  0.5,  1.0, 'no',   false, false, 0),
        ('KUV_IS',       'x', ${g(15.1)}, ${vid(20)},  -9.0, -8.0, 'rain', true,  false, 1.2),
        ('KUV_VARM',     'x', ${g(15.2)}, ${vid(-10)},  8.0,  8.0, 'no',   false, false, 0),
        ('KUV_GAMMAL',   'x', ${g(15.3)}, ${vid(-240)}, 0.5,  1.0, 'rain', true,  false, 0.2),
        ('KUV_FRAMTID',  'x', ${g(15.4)}, ${vid(20)},  -5.0, -4.0, 'snow', false, true,  0),
        ('KUV_KARANTAN', 'x', ${g(15.5)}, ${vid(-10)},  0.5,  1.0, 'rain', true,  false, 0.3),
        ('KUV_KARANTAN', 'x', ${g(15.5)}, ${vid(5)},  -20.0,  5.0, 'no',   false, false, 0),
        ('KUV_KARANTAN', 'x', ${g(15.5)}, ${vid(10)}, -20.0,  5.0, 'no',   false, false, 0),
        ('KUV_KARANTAN', 'x', ${g(15.5)}, ${vid(15)}, -20.0,  5.0, 'no',   false, false, 0),
        ('KUV_LANGSAM',  'x', ${g(15.6)}, ${vid(-10)},  0.5,  1.0, 'rain', true,  false, 0.3),
        ('KUV_LANGSAM',  'x', ${g(15.6)}, ${vid(25)},   0.5,  1.0, 'rain', true,  false, 0.3)`);
    await pool.query(`INSERT INTO trend_kandidater (station_id, observed_at, surface_temp_c, lutning30_c) VALUES
        ('KUV_IS', ${vid(-5)}, 0.5, 0.9), ('KUV_IS', ${vid(25)}, -9.0, 5.5)`);
    // Ett dygn i felet som börjar om en timme: vid T finns det inte.
    await pool.query(`INSERT INTO givarfel_dygn (station_id, dag, forst, senast) VALUES ('KUV_LANGSAM', '2025-01-14', ${vid(60)}, ${vid(120)})`);

    k = await kuvosKlient(url!);
    const kuv = (xs: { id: string }[]) => xs.filter((x) => x.id.startsWith("KUV_")).sort((a, b) => a.id.localeCompare(b.id));

    // Klockan ostalld = väggklockan.
    assert.equal((await k.q("SELECT now() = pg_catalog.now() AS lika"))[0].lika, true, "utan kuvos.nu går klockan som produktionens");

    await k.stall(T);
    const a = await buildSnapshot(k.q, [], T);
    assert.equal(a.liveDoc.generated_at, T.toISOString());
    const wa = kuv(a.liveDoc.weather) as any[];
    assert.deepEqual(wa.map((w) => w.id), ["KUV_IS", "KUV_KARANTAN", "KUV_LANGSAM"],
      "vid T: den gamla raden (4 h) är för gammal, den varma talar inte, den framtida stationen finns inte — och varken karantänen eller den långsamma vakten tystar för något som inte hänt än");
    const is = wa[0];
    assert.equal(is.yta, 0.5, "senaste raden FÖRE T, inte −9 från T+20");
    assert.equal(is.fukt, false);
    assert.equal(is.regn_h, 0.7, "40 min sedan regnet vid T — med framtiden synlig hade det blivit −0,3");
    assert.equal(is.lutning30, 0.9, "lutningen från T−5, inte 5,5 från T+25");
    assert.deepEqual(kuv(a.staticDoc.stations).map((s) => s.id), ["KUV_GAMMAL", "KUV_IS", "KUV_KARANTAN", "KUV_LANGSAM", "KUV_VARM"],
      "stationslistan: alla med en rad det senaste dygnet före T, ingen ur framtiden");

    // En halvtimme senare har "framtiden" hänt.
    await k.stall(T2);
    const b = await buildSnapshot(k.q, [], T2);
    const wb = kuv(b.liveDoc.weather) as any[];
    assert.deepEqual(wb.map((w) => w.id), ["KUV_FRAMTID", "KUV_IS", "KUV_LANGSAM"], "vid T+30: snön har kommit, och KUV_KARANTAN är tyst efter tre brott mot #75");
    assert.deepEqual([wb[1].yta, wb[1].fukt, wb[1].regn_h, wb[1].lutning30], [-9, true, 0.2, 5.5]);

    // MOTKONTROLLEN: samma byggare utan klockan (produktionens väg) ser ingen av dem — raderna är 20 månader gamla och
    // weather_latest-tabellen har dem inte. Det är klockan som bär provet, inte testdatan.
    const p = await buildSnapshot(async (t, pr) => (await pool.query(t, pr as any[])).rows, []);
    assert.deepEqual(kuv(p.liveDoc.weather), []);
    assert.deepEqual(kuv(p.staticDoc.stations), []);
  } finally {
    await k?.slut();
    await pool.query("DROP SCHEMA IF EXISTS kuvos CASCADE");   // vyerna får inte stå kvar och låsa tabellerna för andra prov
    await pool.end();
  }
});

// VÄG A (kuvos/trend.ts, DECISIONS #455): samma halvtimmesserie genom driftens trendfunktion och kuvösens variant. Driften kräver tre
// rader i 30-minutersramen och ger därför ingen 30-minuterslutning; varianten ger värdet 30 minuter bakåt minus nu. 60 minuter lika.
test("väg A: halvtimmesdata ger 30-minuterslutningen i kuvösens variant men inte i driftens — 60 minuter lika i båda", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const { installera, FUNKTION } = await import("../kuvos/trend.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    for (const f of ["001_init.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql", "030_langsam_vakt.sql"])
      await pool.query(readFileSync(new URL("../sql/" + f, import.meta.url), "utf8"));
    await installera((s) => pool.query(s));
    const rensa = async () => { for (const t of ["trend_kandidater", "trend_stigande"]) await pool.query(`DELETE FROM ${t} WHERE station_id = 'KUV_TREND'`); };
    await pool.query("DELETE FROM weather_observations WHERE station_id = 'KUV_TREND'");
    await rensa();
    // Tre halvtimmar som kuvösens leverans, stämplade :00:03/:30:03. Ytan faller 0,4 och sedan 0,8 °C; vakterna släpper igenom raderna.
    await pool.query(`INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, dewpoint_c, humidity_pct) VALUES
      ('KUV_TREND', 'x', ST_SetSRID(ST_MakePoint(16.0, 62.0), 4326), '2025-01-14T05:00:03Z', 2.6, 3.0, 0.5, 95),
      ('KUV_TREND', 'x', ST_SetSRID(ST_MakePoint(16.0, 62.0), 4326), '2025-01-14T05:30:03Z', 2.2, 3.0, 0.5, 95),
      ('KUV_TREND', 'x', ST_SetSRID(ST_MakePoint(16.0, 62.0), 4326), '2025-01-14T06:00:03Z', 1.4, 3.0, 0.5, 95)`);
    const kor = (fn: string) => pool.query(`SELECT * FROM ${fn}(now() - '2025-01-13T00:00:00Z'::timestamptz)`);
    const sex = async () => (await pool.query(`SELECT lutning15_c, lutning30_c, lutning60_c FROM trend_kandidater
      WHERE station_id = 'KUV_TREND' AND observed_at = '2025-01-14T06:00:03Z'`)).rows[0];
    const tal = (x: unknown) => (x === null ? null : Number(x).toFixed(2));

    await kor("berakna_trendkandidater");
    const drift = await sex();
    assert.deepEqual([tal(drift.lutning15_c), tal(drift.lutning30_c), tal(drift.lutning60_c)], [null, null, "1.20"],
      "driften: tre rader krävs, så halvtimmesdata ger bara 60-minuterslutningen");

    await rensa();
    await kor(FUNKTION);
    const a = await sex();
    assert.deepEqual([tal(a.lutning15_c), tal(a.lutning30_c), tal(a.lutning60_c)], [null, "0.80", "1.20"],
      "väg A: 30 minuter = värdet 30 minuter bakåt minus nu; 15 minuter går inte; 60 som driften");
  } finally {
    await pool.query("DELETE FROM weather_observations WHERE station_id = 'KUV_TREND'");
    for (const t of ["trend_kandidater", "trend_stigande"]) await pool.query(`DELETE FROM ${t} WHERE station_id = 'KUV_TREND'`).catch(() => {});
    await pool.end();
  }
});

// KUVÖSENS EFTERHALKA OCH OVANPÅ (DECISIONS #456): halvtimmesrader som leveransen → väg A:s trend → ögonblicksvarianten, vars första
// ögonblick per natt ska ge exakt driftens uppspelning. Natten 11/2 2025. E1 faller i regn och fryser; fukten kommer först efter
// facit, så bara efterhalkan fångar (nettonytt), men baslinjen talar samma natt. E2 faller i regn och stannar på +2,4 (uteblev,
// tillkommen). E3 faller utan regnmängd och fryser i fukt: efterhalkan tiger, baslinjen fångar.
test("efterhalkan i kuvösen: ögonblicken ger driftens episoder, och ovanpå räknar facit, baslinjen och priset", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const trend = await import("../kuvos/trend.ts");
  const { installera, FUNKTION } = await import("../kuvos/efterhalkan.ts");
  const { ovanpa, FACIT_SQL } = await import("../kuvos/ovanpa.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const rensa = async () => {
    for (const t of ["weather_observations", "trend_kandidater", "trend_stigande"]) await pool.query(`DELETE FROM ${t} WHERE station_id LIKE 'KUV_E%'`);
  };
  try {
    for (const f of ["001_init.sql", "003_situation_archive.sql", "008_rain_sum.sql", "009_radar_precip.sql", "017_trend_kandidater.sql",
      "018_trend_berakna.sql", "029_brott_index.sql", "030_langsam_vakt.sql", "028_uppspelning_varianter.sql"])
      await pool.query(readFileSync(new URL("../sql/" + f, import.meta.url), "utf8"));
    await trend.installera((s) => pool.query(s));
    await installera((s) => pool.query(s));
    await rensa();
    const rad = (sid: string, hhmm: string, yta: number, regn: number | null, fukt = false) =>
      `('${sid}', 'x', ST_SetSRID(ST_MakePoint(16.0, 62.0), 4326), '${hhmm < "12" ? "2025-02-12" : "2025-02-11"}T${hhmm}:03Z', ${yta}, 3.5, 0.5, 95, ${regn ?? "NULL"}, ${fukt})`;
    await pool.query(`INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, dewpoint_c, humidity_pct, rain_sum_mm, rain) VALUES
      ${rad("KUV_E1", "22:00", 3.0, 0.2)}, ${rad("KUV_E1", "22:30", 2.2, 0)}, ${rad("KUV_E1", "23:00", 1.4, 0)}, ${rad("KUV_E1", "23:30", 0.6, 0)}, ${rad("KUV_E1", "00:00", 0.4, 0, true)},
      ${rad("KUV_E2", "22:00", 3.4, 0.3)}, ${rad("KUV_E2", "22:30", 2.6, 0)}, ${rad("KUV_E2", "23:00", 2.4, 0)}, ${rad("KUV_E2", "23:30", 2.4, 0)}, ${rad("KUV_E2", "00:00", 2.5, 0)},
      ${rad("KUV_E3", "22:00", 2.0, null)}, ${rad("KUV_E3", "22:30", 1.2, null)}, ${rad("KUV_E3", "23:00", 0.8, null, true)}`);
    await pool.query(`SELECT * FROM ${trend.FUNKTION}(now() - '2025-02-10T00:00:00Z'::timestamptz)`);
    const fonster = "now() - '2025-02-10T00:00:00Z'::timestamptz";
    const og = (await pool.query(`SELECT sid, t, min_efter, rader FROM ${FUNKTION}(p_fonster := ${fonster}) WHERE sid LIKE 'KUV_E%'`)).rows;
    assert.deepEqual(og.map((r) => [r.sid, new Date(r.t).toISOString().slice(11, 16), Number(r.min_efter)]),
      [["KUV_E1", "22:30", 0.4], ["KUV_E1", "23:00", 0.4], ["KUV_E2", "22:30", 2.4]], "E3 utan regnmängd tiger; E1 två ögonblick samma natt");
    const [d] = (await pool.query(`SELECT * FROM uppspelning_efterhalka(p_fonster := ${fonster}, p_blind := false) WHERE dag = '2025-02-11'`)).rows;
    assert.deepEqual([d.ogonblick, d.episoder, d.episoder_med_utfall, d.foll_ut, d.nara, d.uteblev], [3, 2, 2, 1, 0, 1],
      "driftens uppspelning: samma ögonblick, och episoden är det första per natt");

    const facit = (await pool.query(FACIT_SQL)).rows.filter((r) => String(r.sid).startsWith("KUV_E"))
      .map((r) => ({ sid: String(r.sid), tFacit: Number(r.t_facit), tBas: r.t_bas === null ? null : Number(r.t_bas) }));
    assert.deepEqual(facit.map((f) => [f.sid, new Date(f.tFacit).toISOString().slice(11, 16), f.tBas && new Date(f.tBas).toISOString().slice(11, 16)]).sort(),
      [["KUV_E1", "23:30", "00:00"], ["KUV_E3", "23:00", "23:00"]], "facit = första ≤ +1 per natt; baslinjen = första med fukt");
    const r = ovanpa(facit, { efterhalkan: og.map((x) => ({ sid: x.sid, t: new Date(x.t).getTime(), minEfter: Number(x.min_efter), rader: x.rader })) });
    const e = r.delar[0];
    assert.deepEqual([r.facit, r.baslinjen, e.fangade, e.nettonytt, e.tillkomna, e.medUtfall, e.uteblev], [2, 1, 1, 1, 1, 1, 1]);
  } finally {
    await rensa().catch(() => {});
    await pool.end();
  }
});

// LÄNSSIDORNA (kort #281, DECISIONS #458): stationerna saknar länskod, så de får länet för den närmaste väglagssträckan inom 20 km.
// Långt norrut, så att andra provers sträckor aldrig är närmast. Fällor: en raderad sträcka närmare än den riktiga, en station mellan
// två län, och en station 250 km från närmaste sträcka.
test("länssidorna: stationen får länet för närmaste levande sträcka inom 20 km", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const { STATION_LAN_SQL } = await import("../publish/map-core.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const rensa = async () => {
    await pool.query("DELETE FROM road_conditions WHERE segment_id LIKE 'LS_%'");
    await pool.query("DELETE FROM weather_latest WHERE station_id LIKE 'LS_%'");
  };
  try {
    await pool.query(readFileSync(new URL("../sql/001_init.sql", import.meta.url), "utf8"));
    await rensa();
    const linje = (a: number, b: number, c: number, d: number) => `ST_SetSRID(ST_MakeLine(ST_MakePoint(${a}, ${b}), ST_MakePoint(${c}, ${d})), 4326)`;
    await pool.query(`INSERT INTO road_conditions (segment_id, condition_code, condition_text, county_nos, road_number, geom, deleted) VALUES
      ('LS_A', 1, 'Normalt', '{25}', 'E 4', ${linje(23.50, 66.50, 23.60, 66.50)}, false),
      ('LS_B', 1, 'Normalt', '{24}', 'Väg 363', ${linje(23.50, 66.70, 23.60, 66.70)}, false),
      ('LS_C', 1, 'Normalt', '{10}', 'E 22', ${linje(23.55, 66.519, 23.56, 66.519)}, true)`);
    const st = (id: string, lon: number, lat: number) => `('${id}', '${id}', ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326), now())`;
    await pool.query(`INSERT INTO weather_latest (station_id, name, geom, sample_time) VALUES
      ${st("LS_W1", 23.55, 66.52)}, ${st("LS_W2", 23.55, 66.66)}, ${st("LS_W3", 23.55, 69.0)}`);
    const rader = (await pool.query(STATION_LAN_SQL)).rows.filter((r) => String(r.station_id).startsWith("LS_"))
      .map((r) => [r.station_id, Number(r.lan), r.vag]).sort();
    assert.deepEqual(rader, [["LS_W1", 25, "E 4"], ["LS_W2", 24, "Väg 363"]],
      "W1 tar Norrbotten och E 4 fast den raderade sträckan ligger närmare; W2 ligger närmast Västerbotten; W3 är 250 km bort och står utanför");
  } finally {
    await rensa().catch(() => {});
    await pool.end();
  }
});

// RADARN PER STATION (DECISIONS #459): högsta råa rate_mean_mmh över levande sträckor inom 5 km, de senaste fyra timmarna. Långt
// norrut (67° N), så att andra provers sträckor och radarrader aldrig når stationerna. Fällor: en rad äldre än fyra timmar med
// högre värde, en sträcka 10 km bort med eget regn, en raderad sträcka nära stationen, och en station utan radar alls.
test("radarn per station: högsta råvärdet inom 5 km de senaste fyra timmarna, och ingen rad blir ingen rad", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const { RADAR_PER_STATION_SQL } = await import("../publish/snapshot-core.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const rensa = async () => {
    await pool.query("DELETE FROM radar_precip WHERE segment_id LIKE 'RS_%'");
    await pool.query("DELETE FROM road_conditions WHERE segment_id LIKE 'RS_%'");
    await pool.query("DELETE FROM weather_latest WHERE station_id LIKE 'RS_%'");
  };
  try {
    for (const f of ["001_init.sql", "009_radar_precip.sql"]) await pool.query(readFileSync(new URL("../sql/" + f, import.meta.url), "utf8"));
    await rensa();
    const linje = (a: number, b: number, c: number, d: number) => `ST_SetSRID(ST_MakeLine(ST_MakePoint(${a}, ${b}), ST_MakePoint(${c}, ${d})), 4326)`;
    await pool.query(`INSERT INTO road_conditions (segment_id, condition_code, condition_text, geom, deleted) VALUES
      ('RS_A', 1, 'Normalt', ${linje(21.00, 67.20, 21.05, 67.20)}, false),
      ('RS_B', 1, 'Normalt', ${linje(21.00, 67.30, 21.05, 67.30)}, false),
      ('RS_C', 1, 'Normalt', ${linje(21.02, 67.211, 21.03, 67.211)}, true)`);
    await pool.query(`INSERT INTO radar_precip (segment_id, observed_at, rate_max_mmh, rate_mean_mmh) VALUES
      ('RS_A', now() - interval '90 minutes', 1.0, 0.6), ('RS_A', now() - interval '3 hours', 3.0, 2.4),
      ('RS_A', now() - interval '5 hours', 12.0, 9.0),
      ('RS_B', now() - interval '20 minutes', 9.0, 7.0), ('RS_C', now() - interval '20 minutes', 9.0, 8.0)`);
    const st = (id: string, lon: number, lat: number) => `('${id}', '${id}', ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326), now())`;
    await pool.query(`INSERT INTO weather_latest (station_id, name, geom, sample_time) VALUES
      ${st("RS_W1", 21.02, 67.21)}, ${st("RS_W2", 21.02, 67.29)}, ${st("RS_W3", 21.02, 67.50)}`);
    const rader = (await pool.query(RADAR_PER_STATION_SQL)).rows.filter((r) => String(r.station_id).startsWith("RS_"))
      .map((r) => [r.station_id, Number(r.radar_mmh)]).sort();
    assert.deepEqual(rader, [["RS_W1", 2.4], ["RS_W2", 7.0]],
      "W1: 2,4 (inte 9,0 äldre än fyra timmar, inte 7,0 från sträckan 10 km bort, inte 8,0 från den raderade); W2: 7,0; W3: ingen rad");
  } finally {
    await rensa().catch(() => {});
    await pool.end();
  }
});

// KUVÖSENS ÖVERSÄTTNING (kuvos/oversattning.sql, kort #232, DECISIONS #439). Varje fälla ger ett annat svar om en regel faller:
// tidszonen (vinter +1, sommar +2 natten tiden hoppar), platshållarna, nederbördskoderna med källa och de utan, riktningen, en
// station utan läge — och omkörningen, som måste skriva om raderna i stället för att dubblera dem.
test("kuvösens översättning: lokaltid till UTC, platshållare till NULL, koderna 1/2/3/4/6/9 till driftens ord, −9 till NULL, mängden per typ, vinden", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const { RA_SCHEMA } = await import("../kuvos/inlasning.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    for (const f of ["001_init.sql", "008_rain_sum.sql", "011_vind_sikt.sql"])
      await pool.query(readFileSync(new URL("../sql/" + f, import.meta.url), "utf8"));
    await pool.query(RA_SCHEMA);
    await pool.query("DELETE FROM kuvos_ra.trv_obs WHERE measurepoint LIKE 'KUV_%'");
    await pool.query("DELETE FROM kuvos_ra.stationer WHERE station_id LIKE 'KUV_%'");
    await pool.query("DELETE FROM weather_observations WHERE station_id LIKE 'KUV_%'");
    await pool.query("INSERT INTO kuvos_ra.stationer VALUES ('KUV_A', 13.0, 55.6)");
    await pool.query(`INSERT INTO kuvos_ra.trv_obs (measurepoint, measuretime, tyta, tluft, daggp, lu_fu, ned_typ, ned_maengd, vimax, vimed, virik, vind30, siktdjup, fil) VALUES
      ('KUV_A', '2024-11-15 12:00:03', -99.9, 2.0, 1.0, 90, 1, 0,   5, 2, 'SV ', 2, 20000, 't'),
      ('KUV_A', '2025-03-30 03:00:03', -0.4,  1.2, -0.3, 97, 2, 0.4, 5, 2, 'N ',  2, -100,  't'),
      ('KUV_A', '2025-01-10 06:00:03', -3.0, -4.0, -5.0, 95, 4, 1.0, 5, 2, 'NV',  2, 800,   't'),
      ('KUV_A', '2025-01-10 06:30:03', -1.0,  0.5, -0.5, 99, 6, 1.0, 5, 2, 'O ',  2, 900,   't'),
      ('KUV_A', '2025-01-10 07:00:03', -1.0,  0.5, -0.5, 99, 3, 0.1, 5, 2, '-9',  2, 900,   't'),
      ('KUV_A', '2025-01-10 07:30:03', -1.0,  0.5, -0.5, 99, 9, 0,   5, 2, 'S ',  2, 900,   't'),
      ('KUV_A', '2025-01-10 08:00:03', -1.0,  0.5, -0.5, 99, -9, -99.8, -99.9, -99.9, '-9', -99.9, 900, 't'),
      ('KUV_UTAN_LAGE', '2025-01-10 06:00:03', -3.0, -4.0, -5.0, 95, 4, 1.0, 5, 2, 'NV', 2, 800, 't')`);
    const sql = readFileSync(new URL("../kuvos/oversattning.sql", import.meta.url), "utf8");
    await pool.query(sql);
    await pool.query(sql);   // omkörningen skriver om, dubblerar inte
    const r = (await pool.query(`SELECT station_id, to_char(sample_time AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS t,
        surface_temp_c::float AS yta, precipitation AS p, rain, snow, rain_sum_mm::float AS regn, snow_wateq_mm::float AS sno,
        wind_speed_ms::float AS vmed, wind_gust_ms::float AS vmax, wind_dir_deg::float AS rikt,
        visibility_m::float AS sikt FROM weather_observations WHERE station_id LIKE 'KUV_%' ORDER BY sample_time`)).rows;
    assert.equal(r.length, 7, "sju rader för KUV_A, ingen för stationen utan läge, inga dubbletter efter omkörningen");
    assert.deepEqual(r.map((x) => x.t), ["2024-11-15 11:00:03", "2025-01-10 05:00:03", "2025-01-10 05:30:03", "2025-01-10 06:00:03",
      "2025-01-10 06:30:03", "2025-01-10 07:00:03", "2025-03-30 01:00:03"], "vintertid +1 h, sommartid +2 h efter hoppet 30/3");
    assert.deepEqual(r.map((x) => [x.p, x.rain, x.snow]), [["no", false, false], ["snow", false, true], ["sleet", true, true],
      ["freezing_rain", true, false], ["yes", false, false], [null, false, false], ["rain", true, false]],
      "1/2/4/6 enligt VädErs 2019; 3 och 9 ur API:ts sex typer (DECISIONS #464); −9 ⇒ NULL");
    assert.deepEqual([r[0].yta, r[0].sikt, r[0].rikt, r[6].sikt, r[6].rikt, r[1].rikt, r[3].rikt],
      [null, 20000, 225, null, 0, 315, null], "−99,9 och −100 blir NULL, taket 20 000 står kvar, streck till sektorns mitt, −9 till NULL");
    // Mängden per typ (#464): regn vid 2/3/6 och 0 vid 1/4; snö som vatten vid 4 och 0 vid 1/2/3; 9 och −9 ⇒ NULL; −99,8 ⇒ NULL.
    assert.deepEqual(r.map((x) => [x.regn, x.sno]), [[0, 0], [0, 1], [1, null], [0.1, 0], [null, null], [null, null], [0.4, 0]],
      "mängden läggs där typen säger; okänd typ och platshållare ⇒ NULL");
    assert.deepEqual(r.map((x) => [x.vmed, x.vmax]), [[2, 5], [2, 5], [2, 5], [2, 5], [2, 5], [null, null], [2, 5]],
      "vimed och vimax ur API:ts definitioner; −99,9 ⇒ NULL");
  } finally {
    await pool.query("DELETE FROM weather_observations WHERE station_id LIKE 'KUV_%'");
    await pool.query("DROP SCHEMA IF EXISTS kuvos_ra CASCADE");
    await pool.end();
  }
});

// DECISIONS #542, #543 (sql/051): de schemalagda jobbens misslyckade anrop sparas. CI:s PostGIS saknar pg_cron och pg_net, så filen
// skapar bara tabellen och sopningen; net._http_response och cron.job/job_run_details spelas här av egna tabeller med samma kolumner.
// Jobbet läses ur processnumret (pid 502 användes först av ett annat jobb för två timmar sedan); lyckat svar bort, fel 500 och
// tidsgräns sparade med svaret, ett anrop utan svar efter sju timmar sparat som det, ett färskt utan svar orört, äldre än 30 dygn bort.
test("#543 anropsfelen: jobbet ur processnumret, lyckade bort, misslyckade sparade, omkörningen ändrar inget", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const riktiga = (await pool.query("SELECT 1 FROM pg_extension WHERE extname IN ('pg_net', 'pg_cron')")).rowCount;
  try {
    if (riktiga) return;   // en riktig pg_net eller pg_cron rörs inte
    const sql = readFileSync(new URL("../sql/051_anropsfel.sql", import.meta.url), "utf8");
    await pool.query(sql);
    await pool.query(sql);   // idempotent
    await pool.query(`CREATE SCHEMA net; CREATE TABLE net._http_response (id bigint, status_code integer, content_type text,
      headers jsonb, content text, timed_out boolean, error_msg text, created timestamptz NOT NULL DEFAULT now());
      CREATE SCHEMA cron; CREATE TABLE cron.job (jobid bigint, jobname text);
      CREATE TABLE cron.job_run_details (jobid bigint, job_pid integer, start_time timestamptz)`);
    await pool.query(`INSERT INTO cron.job VALUES (1, 'halkvakt-favoritprov'), (2, 'halkvakt-ingest-live'), (3, 'halkvakt-publicera')`);
    await pool.query(`INSERT INTO cron.job_run_details VALUES (1, 501, now() - interval '1 second'), (3, 502, now() - interval '2 hours'),
      (2, 502, now() - interval '2 seconds'), (2, 503, now() - interval '8 hours 1 second')`);
    await pool.query(`INSERT INTO net._http_response (id, status_code, content, timed_out, error_msg) VALUES
      (9001, 200, '{"ok":true}', false, null), (9002, 500, '{"ok":false,"error":"TypeError: x","ms":{"hamtning":812}}', false, null),
      (9003, null, null, true, 'Timeout of 20000 ms reached.')`);
    await pool.query(`INSERT INTO public.anrop (id, pid, t) VALUES (9001, 501, now()), (9002, 501, now()), (9003, 502, now()),
      (9004, 503, now() - interval '8 hours'), (9005, 501, now() - interval '1 hour')`);
    await pool.query(`INSERT INTO public.anrop (id, pid, t, klar) VALUES (9006, 501, now() - interval '31 days', true)`);
    const sopa = async () => (await pool.query("SELECT public.anropsfel_sopa() AS n")).rows[0].n;
    assert.equal(await sopa(), 3, "tre sparade: fel 500, tidsgränsen och anropet utan svar");
    const rader = async () => (await pool.query(`SELECT id::int, jobb, klar, status_code, timed_out, fel, svar FROM public.anrop WHERE id BETWEEN 9001 AND 9006 ORDER BY id`)).rows;
    const r = await rader();
    assert.deepEqual(r.map((x) => x.id), [9002, 9003, 9004, 9005], "det lyckade och det 31 dygn gamla är borta");
    assert.deepEqual(r.map((x) => x.jobb), ["halkvakt-favoritprov", "halkvakt-ingest-live", "halkvakt-ingest-live", null],
      "jobbet ur processnumret, den senaste körningen före anropet; 9005 har ingen körning inom en timme före sig");
    assert.equal(r[0].status_code, 500); assert.match(r[0].svar, /TypeError: x/, "svaret sparat");
    assert.equal(r[1].timed_out, true); assert.match(r[1].fel, /Timeout of 20000/, "tidsgränsen sparad");
    assert.equal(r[2].klar, true); assert.match(r[2].fel, /inget svar/, "utan svar efter sju timmar");
    assert.equal(r[3].klar, false, "ett färskt anrop utan svar väntar");
    assert.equal(await sopa(), 3, "omkörningen ändrar inget");
    assert.deepEqual(await rader(), r, "samma rader efter omkörningen");
  } finally {
    if (!riktiga) {
      await pool.query("DROP SCHEMA IF EXISTS net CASCADE"); await pool.query("DROP SCHEMA IF EXISTS cron CASCADE");
      await pool.query("DELETE FROM public.anrop WHERE id BETWEEN 9001 AND 9006").catch(() => {});
    }
    await pool.end();
  }
});

// KANDIDATEN LIVE (kort #343 steg 3, DECISIONS #558): sql/050 migrerar mot riktig PostGIS, upserten på (tid, punkt) skriver över, och
// gallringen tar bara det gamla — PH efter två dygn, värdet efter tre.
test("#343 kandidat_ph och kandidat_live: migrationen, upserten och gallringen", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    for (const f of ["001_init.sql", "050_kandidat_live.sql", "052_kandidat_gallring_kort.sql"]) await pool.query(readFileSync(new URL("../sql/" + f, import.meta.url), "utf8"));
    await pool.query("DELETE FROM kandidat_ph WHERE punkt LIKE 'KL_%'"); await pool.query("DELETE FROM kandidat_live WHERE punkt LIKE 'KL_%'");
    const sats = `INSERT INTO kandidat_ph (korning, tid, punkt, ts_fysik, ph) SELECT * FROM UNNEST($1::timestamptz[], $2::timestamptz[], $3::text[], $4::real[], $5::real[])
      ON CONFLICT (tid, punkt) DO UPDATE SET korning = EXCLUDED.korning, ts_fysik = EXCLUDED.ts_fysik, ph = EXCLUDED.ph`;
    // Hours ahead of now, so the gallring below never reaches them (fixed dates aged out of the window, DECISIONS #569).
    const nu = Date.now(), om = (h: number) => new Date(nu + h * 3600e3).toISOString();
    await pool.query(sats, [[om(0), om(0)], [om(6), om(6)], ["KL_A", "KL_B"], [-1.5, 0.5], [-1.0, 0.8]]);
    await pool.query(sats, [[om(1)], [om(6)], ["KL_A"], [-1.4], [-0.9]]);
    const r = await pool.query("SELECT punkt, ph, korning FROM kandidat_ph WHERE punkt LIKE 'KL_%' ORDER BY punkt");
    assert.deepEqual(r.rows.map((x) => [x.punkt, x.ph]), [["KL_A", -0.9], ["KL_B", 0.8]], "upserten skriver över KL_A och behåller KL_B");
    // 052: PH from one hour back, the value six hours (DECISIONS #569) — one row on each side of each edge.
    await pool.query(`INSERT INTO kandidat_live (tid, punkt, ph, pg, ra, ank_km, pb) VALUES
      (now() - interval '4 days', 'KL_gammal', 0, 0, 0, 1, 0), (now() - interval '7 hours', 'KL_sju', 0, 0, 0, 1, 0),
      (now() - interval '5 hours', 'KL_fem', 0, 0, 0, 1, 0), (now() - interval '1 hour', 'KL_ny', 0, 0, NULL, NULL, 0)`);
    await pool.query(`INSERT INTO kandidat_ph (korning, tid, punkt, ts_fysik, ph) VALUES
      (now() - interval '3 days', now() - interval '3 days', 'KL_gammal', 0, 0), (now() - interval '8 hours', now() - interval '2 hours', 'KL_tva', 0, 0),
      (now() - interval '6 hours', now() - interval '30 minutes', 'KL_halv', 0, 0)`);
    const g = await pool.query("SELECT gallra_kandidat()::int AS n");
    assert.equal(g.rows[0].n, 4, "gallringen tar värdena äldre än sex timmar och PH äldre än en timme, inget annat");
    const kvar = await pool.query("SELECT punkt FROM kandidat_live WHERE punkt LIKE 'KL_%' ORDER BY punkt");
    assert.deepEqual(kvar.rows.map((x) => x.punkt), ["KL_fem", "KL_ny"], "värdena inom sex timmar står kvar, också utan RÅ");
    const phKvar = await pool.query("SELECT punkt FROM kandidat_ph WHERE punkt LIKE 'KL_%' ORDER BY punkt");
    assert.deepEqual(phKvar.rows.map((x) => x.punkt), ["KL_A", "KL_B", "KL_halv"], "PH för timmen och de kommande står kvar");
    assert.equal((await pool.query("SELECT gallra_kandidat()::int AS n")).rows[0].n, 0, "omkörningen tar inget");
  } finally {
    await pool.query("DELETE FROM kandidat_ph WHERE punkt LIKE 'KL_%'").catch(() => {}); await pool.query("DELETE FROM kandidat_live WHERE punkt LIKE 'KL_%'").catch(() => {});
    await pool.end();
  }
});

// DECISIONS #571 (sql/054): funktionernas nyckel i databasen. Prövningen släpper bara exakt raden, längdkravet stoppar en kort
// nyckel, och bytets vakt — samma sats som nyckelbyte-ingest.yml kör — fäller när raden inte bär den väntade nyckeln, utan att
// planeraren räknar ut felgrenen i förväg.
test("#571 funktionsnyckel: prövningen, längdkravet och bytets vakt", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const giltig = async (k: string | null) => (await pool.query("SELECT nyckel_giltig($1) AS g", [k])).rows[0].g;
  const vakt = (fran: string, till: string) => pool.query(`with u as (update funktionsnyckel set nyckel = $2, bytt_at = now()
      where id = 1 and nyckel = $1 returning 1)
    select case when c = 1 then 'raden bytt' else ('fel: raderna ' || c)::int::text end as s from (select count(*) as c from u) z`, [fran, till]);
  try {
    await pool.query(readFileSync(new URL("../sql/054_funktionsnyckel.sql", import.meta.url), "utf8"));
    await pool.query("DELETE FROM funktionsnyckel");
    const a = "a".repeat(64), c = "c".repeat(64);
    assert.equal(await giltig(a), false, "en tom tabell släpper inget");
    await assert.rejects(pool.query("INSERT INTO funktionsnyckel (id, nyckel) VALUES (1, 'kort')"), /check/i, "en kort nyckel stoppas");
    await pool.query("INSERT INTO funktionsnyckel (id, nyckel) VALUES (1, $1)", [a]);
    assert.equal(await giltig(a), true, "raden släpps");
    assert.equal(await giltig(a + "x"), false, "en längre sträng släpps inte");
    assert.equal(await giltig(""), false, "tom sträng släpps inte");
    assert.equal(await giltig(null), false, "null släpps inte");
    await assert.rejects(vakt(c, "b".repeat(64)), /invalid input syntax/, "fel gammal nyckel fäller satsen");
    assert.equal(await giltig(a), true, "efter den fällda satsen gäller den gamla");
    assert.equal((await vakt(a, c)).rows[0].s, "raden bytt");
    assert.equal(await giltig(c), true, "den nya släpps");
    assert.equal(await giltig(a), false, "den gamla släpps inte längre");
  } finally {
    await pool.query("DELETE FROM funktionsnyckel").catch(() => {});
    await pool.end();
  }
});

// DECISIONS #573 (sql/055, sql/056): kandidatens regel på ett ställe. Ett fall per gräns, långt från provens övriga stationer
// (70° N, 30° Ö): Våt varnar, fläckvis Våt inte; radarn 0,6 varnar, 0,4 inte, 0,7 för 90 minuter sedan inte; en varm station på
// 10 km vetar, på 20 km inte, och en station i karantän räknas inte; en yta över 0 kommer inte med; och regeln tiger helt när
// kandidatens timme är ofullständig eller för gammal.
test("#573 kandidat_regel: ytan, fukten, radarn, vetot, vakterna och färskheten", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const st = (km: number) => 70 + km / 111.2;   // en punkt km norr om 70° N
  const stad = async () => {
    await q("DELETE FROM kandidat_live WHERE punkt LIKE 'v%'");
    await q("DELETE FROM vagpunkt WHERE punkt LIKE 'vT%'");
    await q("DELETE FROM road_conditions WHERE segment_id LIKE '9990%'");
    await q("DELETE FROM radar_precip WHERE segment_id LIKE '9990%'");
    await q("DELETE FROM weather_observations WHERE station_id LIKE 'RT%'");
  };
  try {
    for (const f of ["001_init.sql", "008_rain_sum.sql", "009_radar_precip.sql", "030_langsam_vakt.sql", "050_kandidat_live.sql",
                     "055_vagpunkter.sql", "056_kandidat_regel.sql"])
      await q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
    await stad();
    // Punkterna: [punkt, sträcka, km norr om 70° N, pb]
    const P: [string, string, number, number][] = [
      ["vT01", "99901", 0, -1.0],   // Våt ⇒ varnar
      ["vT02", "99902", 0, -1.0],   // bara fläckvis Våt ⇒ torr
      ["vT03", "99903", 0, -0.5],   // radar 0,6 för 30 min sedan ⇒ varnar
      ["vT04", "99904", 0, -0.5],   // radar 0,4 ⇒ torr
      ["vT05", "99905", 0, -0.5],   // radar 0,7 för 90 min sedan ⇒ torr
      ["vT06", "99901", 200, -2.0], // Våt, varm station 10 km bort ⇒ veto
      ["vT07", "99901", 400, -2.0], // Våt, varm station 20 km bort ⇒ varnar
      ["vT08", "99901", 600, -2.0], // Våt, varm station 5 km bort men i karantän ⇒ varnar
      ["vT09", "99901", 800, 0.5],  // ytan över 0 ⇒ inte med
    ];
    for (const [p, s, km, ] of P) await q("INSERT INTO vagpunkt (punkt, segment_id, lon, lat) VALUES ($1, $2, 30, $3)", [p, s, st(km)]);
    await q(`INSERT INTO road_conditions (segment_id, condition_code, condition_text, condition_info) VALUES
      ('99901', 1, 'Normalt', '{Våt}'), ('99902', 1, 'Normalt', '{"fläckvis Våt"}'), ('99903', 1, 'Normalt', '{Torrt}'),
      ('99904', 1, 'Normalt', '{Torrt}'), ('99905', 1, 'Normalt', '{Torrt}')`);
    await q(`INSERT INTO radar_precip (segment_id, observed_at, rate_max_mmh, rate_mean_mmh) VALUES
      ('99903', now() - interval '30 minutes', 1, 0.6), ('99904', now() - interval '30 minutes', 1, 0.4),
      ('99905', now() - interval '90 minutes', 1, 0.7)`);
    const obs = "INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c) VALUES ($1, 'prov', ST_SetSRID(ST_MakePoint(30, $2), 4326), $3, $4, $5)";
    await q(obs, ["RT1", st(210), new Date(Date.now() - 20 * 60e3), 3.0, 1.0]);   // 10 km från vT06
    await q(obs, ["RT2", st(420), new Date(Date.now() - 20 * 60e3), 3.0, 1.0]);   // 20 km från vT07
    await q(obs, ["RT3", st(605), new Date(Date.now() - 20 * 60e3), 3.0, 1.0]);   // 5 km från vT08 …
    for (const d of [1, 2, 3]) await q(obs, ["RT3", st(605), new Date(Date.now() - d * 86400e3), -10.0, 5.0]);   // … men i karantän
    const tid = (await q("SELECT date_trunc('hour', now()) AS t")).rows[0].t;
    const sattPb = (t: Date) => q(`INSERT INTO kandidat_live (tid, punkt, pb) SELECT $1, v.punkt, $2 FROM vagpunkt v WHERE v.punkt NOT LIKE 'vT%'
      ON CONFLICT (tid, punkt) DO NOTHING`, [t, 5]);
    const sattTest = (t: Date) => Promise.all(P.map(([p, , , pb]) => q("INSERT INTO kandidat_live (tid, punkt, pb) VALUES ($1, $2, $3)", [t, p, pb])));
    const regel = async () => Object.fromEntries((await q("SELECT punkt, utfall, flackvis_vat, veto_station FROM kandidat_regel() WHERE punkt LIKE 'vT%'"))
      .rows.map((r) => [r.punkt, r.utfall + (r.flackvis_vat ? "+fläckvis" : "") + (r.veto_station ? `@${r.veto_station}` : "")]));
    // Ofullständig timme: bara provpunkterna ⇒ inga rader.
    await sattTest(tid);
    assert.deepEqual(await regel(), {}, "ofullständig timme ⇒ regeln tiger");
    // Fullständig timme.
    await sattPb(tid);
    assert.deepEqual(await regel(), {
      vT01: "varnar", vT02: "torr+fläckvis", vT03: "varnar", vT04: "torr", vT05: "torr",
      vT06: "veto@RT1", vT07: "varnar", vT08: "varnar",
    });
    // För gammal timme: allt flyttat tre timmar bakåt ⇒ inga rader.
    await q("UPDATE kandidat_live SET tid = tid - interval '3 hours' WHERE punkt LIKE 'v%' AND tid = $1", [tid]);
    assert.deepEqual(await regel(), {}, "en timme som är tre timmar gammal ⇒ regeln tiger");
  } finally {
    await stad().catch(() => {});
    await pool.end();
  }
});

// DECISIONS #573 del 2 (sql/057): domloggen. En rad per sträcka och timme med utfallens antal, stationsvärdena utan dubbletter,
// en körningsrad som skiljer räknad, redan räknad och tyst, och arkivexportens nya tabeller med ett dygns ålder och tre dygns golv.
test("#573 del 2: domloggen per sträcka, stationsvärdena, körningsloggen och hinkens nya tabeller", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const st = (km: number) => 70 + km / 111.2;
  const stad = async () => {
    await q("DELETE FROM kandidat_live WHERE punkt LIKE 'v%' OR punkt LIKE 'ST\_%'");
    await q("DELETE FROM vagpunkt WHERE punkt LIKE 'vT%'");
    await q("DELETE FROM road_conditions WHERE segment_id LIKE '9991%'");
    await q("DELETE FROM weather_observations WHERE station_id LIKE 'RT2%'");
    await q("DELETE FROM kandidat_skugga WHERE segment_id LIKE '9991%'");
    await q("DELETE FROM kandidat_station WHERE station_id LIKE 'ST\_%'");
    await q("DELETE FROM kandidat_skugga_korning");
    await q("DELETE FROM arkiv_export_tabell");
  };
  try {
    await q("CREATE TABLE IF NOT EXISTS shadow_log (id bigserial PRIMARY KEY, run_at timestamptz NOT NULL DEFAULT now(), alerts jsonb NOT NULL DEFAULT '[]'::jsonb)");
    for (const f of ["001_init.sql", "008_rain_sum.sql", "009_radar_precip.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql",
                     "029_brott_index.sql", "030_langsam_vakt.sql", "050_kandidat_live.sql", "053_arkiv_tabeller.sql", "055_vagpunkter.sql",
                     "056_kandidat_regel.sql", "057_kandidat_skugga.sql", "062_kortare_forvaring.sql"])
      await q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
    await stad();
    const P: [string, string, number, number][] = [
      ["vT11", "99911", 0, -1.0], ["vT12", "99911", 1, -0.5],   // Våt ⇒ två varnar på samma sträcka
      ["vT13", "99912", 0, -0.2],                               // Torrt ⇒ torr
      ["vT14", "99913", 300, -0.8],                             // Våt, varm station 10 km bort ⇒ veto
    ];
    for (const [p, s, km] of P) await q("INSERT INTO vagpunkt (punkt, segment_id, lon, lat) VALUES ($1, $2, 31, $3)", [p, s, st(km)]);
    await q(`INSERT INTO road_conditions (segment_id, condition_code, condition_text, condition_info) VALUES
      ('99911', 1, 'Normalt', '{Våt}'), ('99912', 1, 'Normalt', '{Torrt}'), ('99913', 1, 'Normalt', '{Våt}')`);
    await q("INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c) VALUES ('RT21', 'prov', ST_SetSRID(ST_MakePoint(31, $1), 4326), now() - interval '10 minutes', 3.5, 1.0)", [st(310)]);
    const tid: Date = (await q("SELECT date_trunc('hour', now()) AS t")).rows[0].t;
    await q("INSERT INTO kandidat_live (tid, punkt, pb) SELECT $1, v.punkt, 5 FROM vagpunkt v WHERE v.punkt NOT LIKE 'vT%'", [tid]);
    for (const [p, , , pb] of P) await q("INSERT INTO kandidat_live (tid, punkt, pb) VALUES ($1, $2, $3)", [tid, p, pb]);
    await q("INSERT INTO kandidat_live (tid, punkt, ph, pb) VALUES ($1, 'ST_A', 1.0, 1.5), ($1 - interval '1 hour', 'ST_A', 0.9, 1.2)", [tid]);

    const m1: string = (await q("SELECT kandidat_logga() AS m")).rows[0].m;
    assert.match(m1, /3 sträckor, 2 varnande punkter, 1 vetade, 1 torra/);
    const rad = Object.fromEntries((await q("SELECT * FROM kandidat_skugga WHERE segment_id LIKE '9991%'")).rows.map((r) => [r.segment_id, r]));
    assert.equal(rad["99911"].punkter, 2); assert.equal(rad["99911"].varnar, 2); assert.equal(rad["99911"].vat, true);
    assert.equal(rad["99911"].pb_min, -1);
    assert.equal(rad["99912"].torr, 1); assert.equal(rad["99912"].vat, false);
    assert.equal(rad["99913"].veto, 1); assert.equal(rad["99913"].veto_station, "RT21");
    assert.ok(Math.abs(rad["99913"].veto_km - 10) < 0.3, `vetots avstånd ${rad["99913"].veto_km}`);
    assert.equal((await q("SELECT count(*)::int AS n FROM kandidat_station WHERE station_id = 'ST_A'")).rows[0].n, 2, "båda timmarna");
    const k1 = (await q("SELECT status, stracker, varnar, veto, torr FROM kandidat_skugga_korning ORDER BY korning DESC LIMIT 1")).rows[0];
    assert.deepEqual(k1, { status: "räknad", stracker: 3, varnar: 2, veto: 1, torr: 1 });

    const m2: string = (await q("SELECT kandidat_logga() AS m")).rows[0].m;
    assert.match(m2, /redan räknad/);
    assert.equal((await q("SELECT count(*)::int AS n FROM kandidat_skugga WHERE segment_id LIKE '9991%'")).rows[0].n, 3, "inga dubbletter");
    assert.equal((await q("SELECT count(*)::int AS n FROM kandidat_station WHERE station_id = 'ST_A'")).rows[0].n, 2, "inga dubbletter");

    await q("UPDATE kandidat_live SET tid = tid - interval '3 hours' WHERE tid = $1 AND punkt LIKE 'v%'", [tid]);
    assert.match((await q("SELECT kandidat_logga() AS m")).rows[0].m, /tyst/);
    assert.equal((await q("SELECT status FROM kandidat_skugga_korning ORDER BY korning DESC LIMIT 1")).rows[0].status, "tyst");

    // Hinken: dygnet efter exporteras, golvet är ett dygn (sql/062, DECISIONS #618; tre dygn till 17/10, #573).
    const dag = (n: number) => q("SELECT ((now() - $1 * interval '1 day') AT TIME ZONE 'UTC')::date::text AS d", [n]).then((r) => r.rows[0].d as string);
    const [d1, d2, d5, idag] = [await dag(1), await dag(2), await dag(5), await dag(0)];
    for (const d of [d1, d2, d5])
      await q(`INSERT INTO kandidat_skugga (segment_id, observed_at, punkter, varnar, veto, torr, vat, flackvis_vat, pb_min)
        VALUES ('99919', ($1::date + interval '12 hours') AT TIME ZONE 'UTC', 1, 1, 0, 0, true, false, -1)`, [d]);
    const att = (await q("SELECT arkiv2_att_exportera('kandidat_skugga', 100)::text AS d")).rows.map((r) => r.d);
    assert.ok(att.includes(d1) && att.includes(d2) && att.includes(d5), `ett, två och fem dygn gamla står i kö: ${att}`);
    assert.ok(!att.includes(idag), "i dag är inte färdigt");
    const text: string = (await q("SELECT arkiv2_dygn('kandidat_skugga', $1::date) AS t", [d5])).rows[0].t;
    assert.equal(JSON.parse(text.split("\n")[0])[0], "segment_id");
    for (const d of [d1, d2, d5]) await q("SELECT arkiv2_export_klar('kandidat_skugga', $1::date, 1, 10, 'x', 'v')", [d]);
    assert.match((await q("SELECT arkiv2_radera_exporterat(0, 14) AS s")).rows[0].s, /kandidat_skugga: raderade 1 rader/, "fem dygn gammalt raderas");
    assert.match((await q("SELECT arkiv2_radera_exporterat(0, 14) AS s")).rows[0].s, /kandidat_skugga: raderade 1 rader/, "två dygn gammalt raderas");
    assert.match((await q("SELECT arkiv2_radera_exporterat(0, 14) AS s")).rows[0].s, /inget exporterat tabelldygn äldre än golvet \(14 dygn, kandidatens loggar 1\)/,
      "ett dygn gammalt står kvar");
    await assert.rejects(q("SELECT arkiv2_dygn('shadow_log', $1::date)", [d5]), /okänd tabell/);
  } finally {
    await stad().catch(() => {});
    await pool.end();
  }
});

// DECISIONS #575 (sql/058): spridningsgrinden i regeln och domloggen. Gränsen 2,25 åt båda hållen, punkter med färre än två ankare
// grindas inte (#563), och domloggen bär det som räknar grinden vid vilket X som helst.
test("#575 spridningsgrinden: regeln, gränsen, glesa punkter och domloggens fält — och publiceringen (#576)", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const stad = async () => {
    await q("DELETE FROM kandidat_live WHERE punkt LIKE 'v%' OR punkt LIKE 'ST\_%'");
    await q("DELETE FROM vagpunkt WHERE punkt LIKE 'vT%'");
    await q("DELETE FROM road_conditions WHERE segment_id LIKE '9992%'");
    await q("DELETE FROM kandidat_skugga WHERE segment_id LIKE '9992%'");
    await q("DELETE FROM kandidat_station WHERE station_id LIKE 'ST\_%'");
    await q("DELETE FROM kandidat_skugga_korning");
  };
  try {
    await q("CREATE TABLE IF NOT EXISTS shadow_log (id bigserial PRIMARY KEY, run_at timestamptz NOT NULL DEFAULT now(), alerts jsonb NOT NULL DEFAULT '[]'::jsonb)");
    for (const f of ["001_init.sql", "008_rain_sum.sql", "009_radar_precip.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql",
                     "029_brott_index.sql", "030_langsam_vakt.sql", "050_kandidat_live.sql", "053_arkiv_tabeller.sql", "055_vagpunkter.sql",
                     "056_kandidat_regel.sql", "057_kandidat_skugga.sql", "058_kandidat_spridning.sql", "059_kandidat_brytare.sql",
                     "065_kandidat_domlogg_punkter.sql"])
      await q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
    await stad();
    // [punkt, sträcka, n_ank, spr, väntat utfall] — alla Våt och kalla, långt från provens stationer (70° N, 32° Ö)
    const P: [string, string, number, number | null, string][] = [
      ["vT21", "99921", 3, 1.0, "varnar"],      // ankarna överens
      ["vT22", "99921", 2, 3.0, "spridning"],   // ankarna oense ⇒ tyst
      ["vT23", "99922", 1, 0.0, "varnar"],      // ett ankare: grindas inte (#563)
      ["vT24", "99923", 0, null, "varnar"],     // inget ankare: grindas inte
      ["vT25", "99924", 2, 2.25, "spridning"],  // exakt på gränsen ⇒ tyst (≥ 2,25)
      ["vT26", "99924", 2, 2.2, "varnar"],      // under gränsen ⇒ talar
      ["vT27", "99925", 2, 1.0, "torr"],        // ingen fukt på sträckan ⇒ torr, och inte med i domloggens punktfält (sql/065)
    ];
    // sql/065: ankaravståndet per punkt (kandidat_live.ank_km), som domen lägger i ankarband
    const ANK: Record<string, number | null> = { vT21: 4.5, vT22: 12, vT23: 30, vT24: null, vT25: 6.5, vT26: 18, vT27: 3 };
    for (const [p, s] of P) await q("INSERT INTO vagpunkt (punkt, segment_id, lon, lat) VALUES ($1, $2, 32, 70)", [p, s]);
    await q(`INSERT INTO road_conditions (segment_id, condition_code, condition_text, condition_info) VALUES
      ('99921', 1, 'Normalt', '{Våt}'), ('99922', 1, 'Normalt', '{Våt}'), ('99923', 1, 'Normalt', '{Våt}'), ('99924', 1, 'Normalt', '{Våt}'),
      ('99925', 1, 'Normalt', '{}')`);
    const tid: Date = (await q("SELECT date_trunc('hour', now()) AS t")).rows[0].t;
    await q("INSERT INTO kandidat_live (tid, punkt, pb) SELECT $1, v.punkt, 5 FROM vagpunkt v WHERE v.punkt NOT LIKE 'vT%'", [tid]);
    for (const [p, , n, spr] of P) await q("INSERT INTO kandidat_live (tid, punkt, pb, n_ank, spr, ank_km) VALUES ($1, $2, -1, $3, $4, $5)", [tid, p, n, spr, ANK[p]]);
    await q("INSERT INTO kandidat_live (tid, punkt, pb, n_ank, spr) VALUES ($1, 'ST_B', 1.5, 3, 1.5)", [tid]);
    const utfall = Object.fromEntries((await q("SELECT punkt, utfall FROM kandidat_regel() WHERE punkt LIKE 'vT%'")).rows.map((r) => [r.punkt, r.utfall]));
    assert.deepEqual(utfall, Object.fromEntries(P.map(([p, , , , u]) => [p, u])));
    // NIVA2-LIVE steg 6 (#576): publiceringen tar regelns `varnar` och inget annat — de tystade punkterna kommer inte med.
    const { buildSnapshot } = await import("../publish/snapshot-core.ts");
    const { liveDoc } = await buildSnapshot(async (t, p) => (await pool.query(t, p as any[])).rows, []);
    assert.deepEqual(liveDoc.kandidat.filter((r) => r.id.startsWith("9992")),
      ["99921", "99922", "99923", "99924"].map((id) => ({ id, tid: tid.toISOString(), punkter: [[32, 70]] })));
    assert.match((await q("SELECT kandidat_logga() AS m")).rows[0].m, /5 sträckor, 4 varnande punkter, 0 vetade, 1 torra, 2 tystade av spridningen/);
    const rad = Object.fromEntries((await q("SELECT segment_id, varnar, spridning, fukt_glest, fukt_spr_min FROM kandidat_skugga WHERE segment_id LIKE '9992%'"))
      .rows.map((r) => [r.segment_id, [r.varnar, r.spridning, r.fukt_glest, r.fukt_spr_min]]));
    assert.deepEqual(rad, {
      "99921": [1, 1, 0, 1], "99922": [1, 0, 1, null], "99923": [1, 0, 1, null], "99924": [1, 1, 0, 2.2], "99925": [0, 0, 0, null],
    }, "en sträcka varnar vid X om fukt_glest > 0 eller fukt_spr_min < X");
    // sql/065 (åtgärdslistan B4-36): punkterna som inte är torra, med utfall, ankaravstånd, ankare, spridning och värde, i punktordning
    const pf = Object.fromEntries((await q(`SELECT segment_id, fukt_punkter, fukt_utfall, fukt_ank_km, fukt_n_ank, fukt_spr, fukt_pb
      FROM kandidat_skugga WHERE segment_id LIKE '9992%'`)).rows.map((r) => [r.segment_id,
        [r.fukt_punkter, r.fukt_utfall, r.fukt_ank_km, r.fukt_n_ank, r.fukt_spr, r.fukt_pb]]));
    assert.deepEqual(pf, {
      "99921": [["vT21", "vT22"], ["varnar", "spridning"], [4.5, 12], [3, 2], [1, 3], [-1, -1]],
      "99922": [["vT23"], ["varnar"], [30], [1], [0], [-1]],
      "99923": [["vT24"], ["varnar"], [null], [0], [null], [-1]],
      "99924": [["vT25", "vT26"], ["spridning", "varnar"], [6.5, 18], [2, 2], [2.25, 2.2], [-1, -1]],
      "99925": [null, null, null, null, null, null],
    }, "domloggen bär punkterna och ankaravståndet, och en torr sträcka bär inga punkter");
    const k = (await q("SELECT status, spridning FROM kandidat_skugga_korning ORDER BY korning DESC LIMIT 1")).rows[0];
    assert.deepEqual(k, { status: "räknad", spridning: 2 });
    const s = (await q("SELECT n_ank, spr FROM kandidat_station WHERE station_id = 'ST_B'")).rows[0];
    assert.deepEqual(s, { n_ank: 3, spr: 1.5 }, "stationsvärdena bär ankarna och spridningen");
  } finally {
    await stad().catch(() => {});
    await pool.end();
  }
});

test("#578 brytaren: en tystar, båda startar — och publiceringen utelämnar nyckeln när den är av", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const { buildSnapshot } = await import("../publish/snapshot-core.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const pa = async () => (await q("SELECT kandidat_pa() AS pa")).rows[0].pa as boolean;
  const tryck = (atgard: string, vem: string) => q("INSERT INTO kandidat_brytare (atgard, vem) VALUES ($1, $2)", [atgard, vem]);
  try {
    await q(readFileSync(new URL("../sql/059_kandidat_brytare.sql", import.meta.url), "utf8"));
    await q("DELETE FROM kandidat_brytare");
    assert.equal(await pa(), true, "ingen tystning ⇒ på");
    await tryck("tysta", "axel");
    assert.equal(await pa(), false, "en tystar");
    const { liveDoc, notes } = await buildSnapshot(async (t, p) => (await pool.query(t, p as any[])).rows, []);
    assert.ok(!("kandidat" in liveDoc), "av ⇒ nyckeln borta ur lägesfilen");
    assert.ok(notes.some((n) => n.startsWith("kandidat: avstängd med brytaren")));
    await tryck("starta", "axel");
    await tryck("starta", "axel");
    assert.equal(await pa(), false, "samma person två gånger räcker inte");
    await tryck("starta", "bengt");
    assert.equal(await pa(), true, "båda har startat efter tystningen");
    await tryck("tysta", "bengt");
    assert.equal(await pa(), false, "en ny tystning nollställer: de gamla startarna räknas inte");
    await tryck("starta", "bengt");
    assert.equal(await pa(), false, "en av två efter den nya tystningen");
    await assert.rejects(tryck("tysta", "claude"), "bara bengt och axel");
    await assert.rejects(tryck("pausa", "bengt"), "bara tysta och starta");
  } finally {
    await q("DELETE FROM kandidat_brytare").catch(() => {});
    await pool.end();
  }
});

test("#579 bitar av vägen: en kilometer åt vardera hållet i meter, sammanslagna per sträcka, och en punkt utanför vägen ritas inte", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { KANDIDAT_BITAR_SQL } = await import("../publish/map-core.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  try {
    await q("DELETE FROM road_conditions WHERE segment_id LIKE '99957%'");
    // En rak sträcka norrut på 10 km vid 60° N, och en öst–västlig på 10 km — samma bitlängd oavsett riktning (meter, inte grader).
    await q(`INSERT INTO road_conditions (segment_id, condition_code, condition_text, condition_info, geom) VALUES
      ('99957N', 1, 'Normalt', '{}', ST_SetSRID(ST_MakeLine(ST_MakePoint(17.0, 60.0), ST_MakePoint(17.0, 60.0898)), 4326)),
      ('99957O', 1, 'Normalt', '{}', ST_SetSRID(ST_MakeLine(ST_MakePoint(17.0, 61.0), ST_MakePoint(17.1852, 61.0)), 4326))`);
    // Norr: punkter vid 2 och 3 km (bitarna 1–4 km, sammanslagna) och en punkt 1 km öster om vägen (ritas inte). Öst: en punkt vid 5 km.
    const r = (await q(KANDIDAT_BITAR_SQL, [["99957N", "99957N", "99957N", "99957O"], [17.0, 17.0, 17.0185, 17.0926], [60.01797, 60.02695, 60.04, 61.0]])).rows;
    const per = Object.fromEntries(r.map((x) => [x.seg, x]));
    assert.deepEqual(Object.keys(per).sort(), ["99957N", "99957O"]);
    assert.equal(per["99957N"].punkter, 2, "punkten en kilometer bort från vägen ritas inte");
    assert.ok(Math.abs(Number(per["99957N"].km) - 3.0) <= 0.1, `två punkter 1 km isär ger en bit på 3 km: ${per["99957N"].km}`);
    assert.equal(per["99957N"].g.type, "LineString", "bitarna slås ihop till en linje");
    assert.ok(Math.abs(Number(per["99957O"].km) - 2.0) <= 0.1, `en ensam punkt ger 2 km också öster ut: ${per["99957O"].km}`);
  } finally {
    await q("DELETE FROM road_conditions WHERE segment_id LIKE '99957%'").catch(() => {});
    await pool.end();
  }
});

test("#580 autovacuum: tabellerna som byts ut städas vid 2 % + 1 000 döda rader, och saknade tabeller hoppas över", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await pool.query(readFileSync(new URL("../sql/060_autovacuum.sql", import.meta.url), "utf8"));
    await pool.query(readFileSync(new URL("../sql/060_autovacuum.sql", import.meta.url), "utf8"));   // två gånger: idempotent
    const { rows } = await pool.query(`SELECT reloptions FROM pg_class WHERE oid = 'public.weather_observations'::regclass`);
    for (const o of ["autovacuum_vacuum_scale_factor=0.02", "autovacuum_vacuum_threshold=1000", "autovacuum_analyze_scale_factor=0.02"]) {
      assert.ok((rows[0].reloptions ?? []).includes(o), `${o} saknas: ${rows[0].reloptions}`);
    }
  } finally { await pool.end(); }
});

// DECISIONS #618 (ii), sql/063: de fyra tabellerna som aldrig rensas exporteras per dygn på sin egen tidskolumn, men raderas aldrig.
test("#618 (ii): skuggloggen, väglaget, händelserna och SMHI exporteras på sin tidskolumn och raderas aldrig", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const stad = async () => {
    await q("DELETE FROM road_condition_history WHERE segment_id = 'T618'");
    await q("DELETE FROM situation_archive WHERE deviation_id = 'T618'");
    await q("DELETE FROM smhi_warnings_history WHERE area_id = 618618");
    await q("DELETE FROM shadow_log WHERE alerts = '[\"T618\"]'::jsonb");
    await q("DELETE FROM arkiv_export_tabell");
  };
  try {
    await q("CREATE TABLE IF NOT EXISTS shadow_log (id bigserial PRIMARY KEY, run_at timestamptz NOT NULL DEFAULT now(), alerts jsonb NOT NULL DEFAULT '[]'::jsonb)");
    // Bara det som saknas laddas: provet kan gå sist, när senare prov redan har gett äldre filers funktioner nya returtyper, och då
    // fäller en omladdning av 056/057 med "cannot change return type". sql/062 och 063 ändrar inga returtyper och laddas alltid.
    const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
    if (!(await q("SELECT to_regclass('road_condition_history') AS t")).rows[0].t) await las("001_init.sql");
    if (!(await q("SELECT to_regclass('situation_archive') AS t")).rows[0].t) await las("003_situation_archive.sql");
    if (!(await q("SELECT to_regprocedure('arkiv2_golv(text,integer)') AS t")).rows[0].t)
      for (const f of ["008_rain_sum.sql", "009_radar_precip.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql", "029_brott_index.sql",
                       "030_langsam_vakt.sql", "050_kandidat_live.sql", "053_arkiv_tabeller.sql", "055_vagpunkter.sql", "056_kandidat_regel.sql",
                       "057_kandidat_skugga.sql"]) await las(f);
    for (const f of ["062_kortare_forvaring.sql", "063_arkiv_fyra_tabeller.sql"]) await las(f);
    await stad();
    const d = (await q("SELECT ((now() - interval '30 days') AT TIME ZONE 'UTC')::date::text AS d")).rows[0].d as string;
    const kl = (h: number) => `${d}T${String(h).padStart(2, "0")}:00:00Z`;
    // Bara testets rader får finnas på testets dygn.
    await q("DELETE FROM road_condition_history WHERE (modified_time AT TIME ZONE 'UTC')::date = $1::date", [d]);
    await q("DELETE FROM situation_archive WHERE (first_seen AT TIME ZONE 'UTC')::date = $1::date", [d]);
    await q("DELETE FROM smhi_warnings_history WHERE (archived_at AT TIME ZONE 'UTC')::date = $1::date", [d]);
    await q("DELETE FROM shadow_log WHERE (run_at AT TIME ZONE 'UTC')::date = $1::date", [d]);
    await q(`INSERT INTO road_condition_history (segment_id, condition_code, condition_text, modified_time) VALUES
      ('T618', 2, 'Halt', $1), ('T618', 1, 'Torrt', $2)`, [kl(3), kl(9)]);
    // Händelsen började dagen innan men skrevs i arkivet på testets dygn: first_seen räknas, inte start_time.
    await q(`INSERT INTO situation_archive (deviation_id, message_type_value, start_time, first_seen, last_seen)
      VALUES ('T618', 'Accident', $1::timestamptz - interval '1 day', $1, $1)`, [kl(5)]);
    await q(`INSERT INTO smhi_warnings_history (area_id, published, warning_id, event_code, level_code, archived_at)
      VALUES (618618, $1::timestamptz - interval '2 days', 1, 'ICE', 'YELLOW', $1)`, [kl(6)]);
    await q("INSERT INTO shadow_log (run_at, alerts) VALUES ($1, '[\"T618\"]'::jsonb)", [kl(7)]);

    for (const [tab, n] of [["road_condition_history", 2], ["situation_archive", 1], ["smhi_warnings_history", 1], ["shadow_log", 1]] as const) {
      const att = (await q("SELECT arkiv2_att_exportera($1, 100000)::text AS d", [tab])).rows.map((r) => r.d);
      assert.ok(att.includes(d), `${tab}: dygnet står i kö (${att.length} dygn)`);
      const text: string = (await q("SELECT arkiv2_dygn($1, $2::date) AS t", [tab, d])).rows[0].t;
      assert.equal(text.split("\n").length - 1, n, `${tab}: ${n} rader i filen`);
      await assert.rejects(q("SELECT arkiv2_export_klar($1, $2::date, $3, 10, 'x', 'v')", [tab, d, n + 1]), /har \d+ rader i databasen/);
      assert.equal((await q("SELECT arkiv2_export_klar($1, $2::date, $3, 10, 'x', 'v') AS n", [tab, d, n])).rows[0].n, n);
    }
    // Golvet är NULL för de fyra: inte ens golvet noll raderar dem.
    assert.match((await q("SELECT arkiv2_radera_exporterat(0, 0) AS s")).rows[0].s, /inget exporterat tabelldygn/);
    assert.equal((await q("SELECT count(*)::int AS n FROM road_condition_history WHERE segment_id = 'T618'")).rows[0].n, 2, "väglaget står kvar");
    assert.equal((await q("SELECT count(*)::int AS n FROM arkiv_export_tabell WHERE raderad IS NOT NULL")).rows[0].n, 0, "inget bokfört som raderat");
    await assert.rejects(q("SELECT arkiv2_tidkolumn('weather_observations')"), /okänd tabell/);
  } finally {
    await stad().catch(() => {});
    await pool.end();
  }
});

// Ersättningsregeln §4 (sql/068, DECISIONS #692): den nya kandidatens skugga. Samma rader i kandidat_live och ny_kandidat_live ger samma
// regel och samma logg, rad för rad, och den nyas logg och gallring rör aldrig den frystas tabeller. 068 körs två gånger (idempotent).
test("#692 den nya kandidatens skugga (sql/068): samma regel och logg som den frystas på samma rader, och den frysta orörd", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const st = (km: number) => 70 + km / 111.2;   // en punkt km norr om 70° N
  const stad = async () => {
    for (const t of ["kandidat_live", "ny_kandidat_live", "kandidat_ph", "ny_kandidat_ph", "kandidat_skugga_korning", "ny_kandidat_skugga_korning"])
      await q(`DELETE FROM ${t}`);
    await q("DELETE FROM vagpunkt WHERE punkt LIKE 'vN%'");
    await q("DELETE FROM road_conditions WHERE segment_id LIKE '9993%'");
    await q("DELETE FROM radar_precip WHERE segment_id LIKE '9993%'");
    await q("DELETE FROM weather_observations WHERE station_id LIKE 'RN%'");
    for (const t of ["kandidat_skugga", "ny_kandidat_skugga"]) await q(`DELETE FROM ${t} WHERE segment_id LIKE '9993%'`);
    for (const t of ["kandidat_station", "ny_kandidat_station"]) await q(`DELETE FROM ${t} WHERE station_id LIKE 'SN%'`);
  };
  try {
    await q("CREATE TABLE IF NOT EXISTS shadow_log (id bigserial PRIMARY KEY, run_at timestamptz NOT NULL DEFAULT now(), alerts jsonb NOT NULL DEFAULT '[]'::jsonb)");
    for (const f of ["001_init.sql", "008_rain_sum.sql", "009_radar_precip.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql",
                     "029_brott_index.sql", "030_langsam_vakt.sql", "050_kandidat_live.sql", "052_kandidat_gallring_kort.sql", "053_arkiv_tabeller.sql",
                     "055_vagpunkter.sql", "056_kandidat_regel.sql", "057_kandidat_skugga.sql", "058_kandidat_spridning.sql",
                     "065_kandidat_domlogg_punkter.sql", "068_ny_kandidat_skugga.sql", "068_ny_kandidat_skugga.sql"])
      await q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
    await stad();
    // [punkt, sträcka, km norr om 70° N, pb, n_ank, spr, ank_km]
    const P: [string, string, number, number, number, number | null, number | null][] = [
      ["vN01", "99931", 0, -1.0, 3, 1.0, 4.5],     // Våt, ankarna överens ⇒ varnar
      ["vN02", "99931", 0, -0.5, 2, 3.0, 12],      // Våt, ankarna oense ⇒ spridning
      ["vN03", "99932", 0, -0.5, 1, 0.0, 30],      // radar 0,6 för 30 min sedan, ett ankare ⇒ varnar
      ["vN04", "99933", 0, -0.5, 0, null, null],   // radar 0,4 ⇒ torr
      ["vN05", "99934", 200, -2.0, 2, 1.0, 6],     // Våt, varm station 10 km bort ⇒ veto
      ["vN06", "99934", 400, 0.5, 2, 1.0, 6],      // ytan över 0 ⇒ inte med
    ];
    for (const [p, s, km] of P) await q("INSERT INTO vagpunkt (punkt, segment_id, lon, lat) VALUES ($1, $2, 33, $3)", [p, s, st(km)]);
    await q(`INSERT INTO road_conditions (segment_id, condition_code, condition_text, condition_info) VALUES
      ('99931', 1, 'Normalt', '{Våt}'), ('99932', 1, 'Normalt', '{Torrt}'), ('99933', 1, 'Normalt', '{Torrt}'), ('99934', 1, 'Normalt', '{Våt}')`);
    await q(`INSERT INTO radar_precip (segment_id, observed_at, rate_max_mmh, rate_mean_mmh) VALUES
      ('99932', now() - interval '30 minutes', 1, 0.6), ('99933', now() - interval '30 minutes', 1, 0.4)`);
    await q("INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c) VALUES ('RN1', 'prov', ST_SetSRID(ST_MakePoint(33, $1), 4326), now() - interval '20 minutes', 3.0, 1.0)", [st(210)]);
    const tid: Date = (await q("SELECT date_trunc('hour', now()) AS t")).rows[0].t;
    for (const t of ["kandidat_live", "ny_kandidat_live"]) {
      await q(`INSERT INTO ${t} (tid, punkt, pb) SELECT $1, v.punkt, 5 FROM vagpunkt v WHERE v.punkt NOT LIKE 'vN%'`, [tid]);
      for (const [p, , , pb, n, spr, ank] of P) await q(`INSERT INTO ${t} (tid, punkt, pb, n_ank, spr, ank_km) VALUES ($1, $2, $3, $4, $5, $6)`, [tid, p, pb, n, spr, ank]);
      await q(`INSERT INTO ${t} (tid, punkt, ph, pg, ra, ank_km, pb, n_ank, spr) VALUES ($1, 'SNA', 1.0, 1.1, 1.2, 3.5, 1.5, 3, 1.5)`, [tid]);
    }
    const regel = (f: string) => q(`SELECT * FROM ${f}() WHERE punkt LIKE 'vN%' ORDER BY punkt`).then((r) => r.rows);
    const fryst = await regel("kandidat_regel"), ny = await regel("ny_kandidat_regel");
    assert.deepEqual(Object.fromEntries(ny.map((r) => [r.punkt, r.utfall + (r.veto_station ? `@${r.veto_station}` : "")])),
      { vN01: "varnar", vN02: "spridning", vN03: "varnar", vN04: "torr", vN05: "veto@RN1" }, "den nyas regel på provets punkter");
    assert.deepEqual(ny, fryst, "ny_kandidat_regel() = kandidat_regel() rad för rad på samma värden");
    // Loggen: den nyas först, och den frystas tabeller står still under den; sedan den frystas, och de två loggarna jämförs.
    const antal = async () => Promise.all(["kandidat_skugga", "kandidat_station", "kandidat_skugga_korning", "kandidat_live", "kandidat_ph"]
      .map((t) => q(`SELECT count(*)::int AS n FROM ${t}`).then((r) => r.rows[0].n)));
    const fore = await antal();
    const mNy: string = (await q("SELECT ny_kandidat_logga() AS m")).rows[0].m;
    assert.deepEqual(await antal(), fore, "ny_kandidat_logga() skriver ingenting i den frystas tabeller");
    const mFryst: string = (await q("SELECT kandidat_logga() AS m")).rows[0].m;
    assert.equal(mNy, mFryst, "samma utfall i loggens svar");
    assert.match(mNy, /4 sträckor, 2 varnande punkter, 1 vetade, 1 torra, 1 tystade av spridningen; 1 stationsrader/);
    const KOL = `segment_id, observed_at, punkter, varnar, veto, torr, vat, flackvis_vat, radar_mmh, pb_min, veto_station, veto_km, veto_yta,
      spridning, fukt_glest, fukt_spr_min, fukt_punkter, fukt_utfall, fukt_ank_km, fukt_n_ank, fukt_spr, fukt_pb`;
    const logg = (t: string) => q(`SELECT ${KOL} FROM ${t} WHERE segment_id LIKE '9993%' ORDER BY segment_id`).then((r) => r.rows);
    const lNy = await logg("ny_kandidat_skugga");
    assert.equal(lNy.length, 4);
    assert.deepEqual(lNy, await logg("kandidat_skugga"), "ny_kandidat_skugga = kandidat_skugga, fält för fält");
    const stn = (t: string) => q(`SELECT station_id, observed_at, ph, pg, ra, ank_km, pb, n_ank, spr FROM ${t} WHERE station_id LIKE 'SN%'`).then((r) => r.rows);
    assert.deepEqual(await stn("ny_kandidat_station"), await stn("kandidat_station"), "stationsvärdena lika");
    const korning = (t: string) => q(`SELECT observed_at, status, stracker, varnar, veto, torr, stationer, spridning FROM ${t} ORDER BY korning DESC LIMIT 1`).then((r) => r.rows[0]);
    assert.deepEqual(await korning("ny_kandidat_skugga_korning"), await korning("kandidat_skugga_korning"), "körningsraden lika");
    // En gång per timme, och tyst när timmen är gammal — som den frystas.
    assert.match((await q("SELECT ny_kandidat_logga() AS m")).rows[0].m, /redan räknad/);
    assert.equal((await q("SELECT count(*)::int AS n FROM ny_kandidat_skugga WHERE segment_id LIKE '9993%'")).rows[0].n, 4, "inga dubbletter");
    await q("UPDATE ny_kandidat_live SET tid = tid - interval '3 hours' WHERE tid = $1 AND punkt LIKE 'v%'", [tid]);
    assert.match((await q("SELECT ny_kandidat_logga() AS m")).rows[0].m, /tyst/);
    assert.equal((await korning("ny_kandidat_skugga_korning")).status, "tyst");
    // Gallringen: bara den nyas tabeller.
    for (const t of ["kandidat_ph", "ny_kandidat_ph"])
      await q(`INSERT INTO ${t} (korning, tid, punkt, ts_fysik, ph) VALUES (now() - interval '9 hours', now() - interval '3 hours', 'SNA', 0, 0)`);
    const fore2 = await antal();
    assert.ok(Number((await q("SELECT gallra_ny_kandidat() AS n")).rows[0].n) >= 1, "gallra_ny_kandidat() tar den nyas gamla rader");
    assert.deepEqual(await antal(), fore2, "gallra_ny_kandidat() rör inte den frystas tabeller");
    assert.equal((await q("SELECT count(*)::int AS n FROM ny_kandidat_ph")).rows[0].n, 0);
  } finally {
    await stad().catch(() => {});
    await pool.end();
  }
});
