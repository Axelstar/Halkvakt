// Full write-path test vs throwaway PostGIS (CI service container).
// Skips cleanly when TEST_DATABASE_URL is absent (local runs without Docker).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
        ('STANNAD',  'Tyst sedan 90 min', ST_SetSRID(ST_MakePoint(15.30, 59.30), 4326), now() - interval '90 minutes', -1.0,  0.0, 'rain', true,  false),
        ('FJARRYTA', 'Glest men levande', ST_SetSRID(ST_MakePoint(15.40, 59.40), 4326), now() - interval '50 minutes', -1.0,  0.0, 'rain', true,  false),
        ('OKANDLUFT','Utan lufttemp',     ST_SetSRID(ST_MakePoint(15.20, 59.20), 4326), now() - interval '10 minutes', -3.0, NULL, 'no',   false, false)
      ON CONFLICT (station_id) DO UPDATE SET sample_time = EXCLUDED.sample_time, surface_temp_c = EXCLUDED.surface_temp_c,
        air_temp_c = EXCLUDED.air_temp_c, precipitation = EXCLUDED.precipitation, rain = EXCLUDED.rain, snow = EXCLUDED.snow`);
    // radar_precip skapas av ingest/radar.ts i drift; här appliceras migrationen som testet
    // annars saknar. Samma mönster som gallringen (014) och grannschemana nedan.
    const { readFileSync: rf } = await import("node:fs");
    await pool.query(rf(new URL("../sql/009_radar_precip.sql", import.meta.url), "utf8"));
    const { liveDoc } = await buildSnapshot(async (t, p) => (await pool.query(t, p as any[])).rows, []);
    // W1 från writeAll-testet ovan har sample_time 2026-08-24 ⇒ gammal ⇒ tyst. Storvik: 22,7°
    // under luften ⇒ orimlig ⇒ tyst. GAMMAL: 5 h ⇒ tyst. STANNAD: 90 min ⇒ tyst sedan 30/10 (DECISIONS #751; talade med
    // tre timmar). Kvar: den färska, FJARRYTA på 50 min (glest men levande, som fjärrytorna på 33–38 min 30/10) och den vi
    // inte kan döma (luft saknas — vakten fäller bara på bevisad orimlighet, aldrig på okunskap).
    assert.deepEqual(liveDoc.weather.map((w) => w.id).sort(), ["FARSK", "FJARRYTA", "OKANDLUFT"]);
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
// körs här, så att det som schemaläggs är det som prövas. Sedan #740 (28/10) sätter sql/072 gallringens jobb; raderingens står
// kvar i sql/044. sql/044 laddas ändå, för gallra_vader med brottsundantaget.
const JOBB_044 = async () => {
  const { readFileSync } = await import("node:fs");
  const las = (fil: string) => readFileSync(new URL(`../sql/${fil}`, import.meta.url), "utf8");
  const text = las("044_gallring_tre_dygn.sql"), sql072 = las("072_gallringen_tillbaka.sql");
  const jobb = (kalla: string, fil: string, namn: string) => {
    const m = kalla.match(new RegExp(`'(SELECT ${namn}[^']*)'`));
    assert.ok(m, `sql/${fil} bär ett jobbkommando för ${namn}`);
    return m![1];
  };
  return { text, gallring: jobb(sql072, "072", "gallra_arkiv"), radering: jobb(text, "044", "arkiv_radera_exporterat") };
};

// Gallringen efter sju dygn (tre 10/10–28/10, #511, #740) behåller brotten mot #75 (ytan mer än 12 °C under luften): karantänen i
// snapshoten räknar dem över sju dygn. En rad utan yta är inget brott och gallras som förut. Dygn yngre än sju rörs inte.
test("#322 gallringen efter sju dygn: brotten mot #75 står kvar, ytlösa rader gallras, yngre dygn orörda, idempotent", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    const { text, gallring } = await JOBB_044();
    assert.equal(gallring, "SELECT gallra_arkiv(7)");
    for (const f of ["014_gallring.sql", "004_fi_schema.sql", "006_no_schema.sql", "007_dk_schema.sql", "026_gallring_grannar.sql", "031_gallring_dk_gravstenar_tid.sql"])
      await pool.query(readFileSync(new URL("../sql/" + f, import.meta.url), "utf8"));
    await pool.query(text);
    await pool.query(`DELETE FROM weather_observations WHERE station_id IN ('B11', 'B12')`);
    // B11: ett helt dygn var tionde minut för nio dygn sedan. 00:00 och 00:10 är brott (yta −15, luft 1), 00:30 saknar yta
    // men har luft. B12: ett helt dygn för fem dygn sedan, under fristen — det hade gallrats med tre dygn.
    await pool.query(`
      INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c)
      SELECT 'B11', 'Brott', ST_SetSRID(ST_MakePoint(15, 60), 4326), date_trunc('day', now() - interval '9 days') + i * interval '10 min',
             CASE WHEN i IN (0, 1) THEN -15 WHEN i = 3 THEN NULL ELSE 0 END, CASE WHEN i = 3 THEN 2 ELSE 1 END
      FROM generate_series(0, 143) i
      UNION ALL
      SELECT 'B12', 'Färsk', ST_SetSRID(ST_MakePoint(16, 61), 4326), date_trunc('day', now() - interval '5 days') + i * interval '10 min', 0, 1
      FROM generate_series(0, 143) i`);
    await pool.query(gallring);
    const n = async (villkor: string) => (await pool.query(`SELECT count(*)::int AS n FROM weather_observations WHERE ${villkor}`)).rows[0].n;
    assert.equal(await n(`station_id = 'B11'`), 48 + 2, "en rad per halvtimme, plus de två brotten som inte var sista i sin hink");
    assert.equal(await n(`station_id = 'B11' AND surface_temp_c < air_temp_c - 12`), 2, "brotten står kvar");
    assert.equal(await n(`station_id = 'B11' AND surface_temp_c IS NULL`), 0, "raden utan yta är inget brott och gallras");
    assert.equal(await n(`station_id = 'B12'`), 144, "fem dygn gamla rader rörs inte");
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

// DECISIONS #781: vakthundens kontroll 9b och healthchecken räknar grannstationerna inom 40 km med samma låda som publiceringen.
// Frågorna läses ur filerna, så proven prövar det som körs.
const gransrakningen = () => ["supabase/functions/vakthund/index.ts", "ingest/healthcheck.ts"].map((fil) => ({
  fil,
  fraga: readFileSync(new URL(`../${fil}`, import.meta.url), "utf8")
    .match(/`(\s*SELECT count\(\*\)::int AS n FROM \$\{land\}\.weather_latest f\r?\n[\s\S]*?)`/)?.[1],
}));

test("#781 vakthundens och healthcheckens gränsräkning sållar på vägindexet med en låda på minst BORDER_DEG", async () => {
  const { BORDER_DEG } = await import("../publish/snapshot-core.ts");
  for (const { fil, fraga } of gransrakningen()) {
    assert.ok(fraga, `${fil}: räknefrågan hittades inte`);
    assert.doesNotMatch(fraga, /ST_Collect/, fil);
    const lada = Number(fraga.match(/r\.geom && ST_Expand\(f\.geom, ([\d.]+)\)/)?.[1]);
    assert.ok(lada >= BORDER_DEG, `${fil}: lådan ${lada}° är mindre än BORDER_DEG ${BORDER_DEG.toFixed(3)}°`);
  }
});

// DECISIONS #742: gränsfrågan sållar vägarna med vägindexet (lådan BORDER_DEG) innan avståndet mäts. Den ska välja exakt de
// stationer som den gamla frågan valde (alla vägar i en ST_Collect, inget index) — också vid Riksgränsen, där en longitudgrad
// är kortast. Varje station ligger 1–3,4 km från gränsen på 40 km; NO-IN behöver en låda på minst 0,95°.
test("#742 gränsfrågan på vägindexet väljer samma grannstationer som ST_Collect-frågan", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { readFileSync } = await import("node:fs");
  const { buildSnapshot, WX_SANE_GRANS, BORDER_M } = await import("../publish/snapshot-core.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const sql = (f: string) => readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8");
  try {
    for (const f of ["004_fi_schema.sql", "006_no_schema.sql"]) await pool.query(sql(f));
    await pool.query(`
      INSERT INTO road_conditions (segment_id, condition_code, condition_text, geom) VALUES
        ('G742-HAP', 1, 'Haparanda, 65,85° N', ST_SetSRID(ST_MakeLine(ST_MakePoint(23.90, 65.85), ST_MakePoint(24.00, 65.85)), 4326)),
        ('G742-RIK', 1, 'E10 vid Riksgränsen, 68,43° N', ST_SetSRID(ST_MakeLine(ST_MakePoint(18.10, 68.43), ST_MakePoint(18.12, 68.43)), 4326))
      ON CONFLICT (segment_id) DO NOTHING`);
    const station = (land: string, id: string, namn: string, lon: number, lat: number) => pool.query(`
      INSERT INTO ${land}.weather_latest (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow)
      VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), now() - interval '5 minutes', -1.0, 0.0, 'no', false, false)
      ON CONFLICT (station_id) DO UPDATE SET sample_time = EXCLUDED.sample_time`, [id, namn, lon, lat]);
    await station("fi", "G742-FI-IN", "0,85° öster om vägen: 38,8 km", 24.85, 65.85);
    await station("fi", "G742-FI-UT", "0,95° öster om vägen: 43,4 km", 24.95, 65.85);
    await station("no", "G742-NO-IN", "0,95° väster om vägen: 39,0 km", 17.15, 68.43);
    await station("no", "G742-NO-UT", "1,05° väster om vägen: 43,1 km", 17.05, 68.43);
    const { liveDoc, border, notes } = await buildSnapshot(async (t, p) => (await pool.query(t, p as any[])).rows, []);
    const ids = new Set(liveDoc.weather.map((w) => w.id));
    assert.deepEqual(["G742-FI-IN", "G742-FI-UT", "G742-NO-IN", "G742-NO-UT"].filter((id) => ids.has(id)), ["G742-FI-IN", "G742-NO-IN"], notes.join(" | "));
    for (const land of ["fi", "no"]) {
      const gammal = await pool.query(`
        WITH se AS (SELECT ST_Collect(geom) g FROM road_conditions WHERE NOT deleted AND geom IS NOT NULL)
        SELECT f.station_id FROM ${land}.weather_latest f, se
        WHERE ${WX_SANE_GRANS} AND ST_DWithin(f.geom::geography, se.g::geography, $1)`, [BORDER_M]);
      assert.equal(border[land]?.reach, gammal.rows.length, `${land}: den nya frågan och ST_Collect-frågan räknar olika`);
      // #781: vakthundens kontroll 9b och healthchecken mot sin egen fråga före omskrivningen (bara färskheten, ingen radvakt).
      const forut = (await pool.query(`
        WITH se AS (SELECT ST_Collect(geom) g FROM road_conditions WHERE NOT deleted AND geom IS NOT NULL)
        SELECT count(*)::int AS n FROM ${land}.weather_latest f, se
        WHERE f.sample_time > now() - interval '3 hours' AND ST_DWithin(f.geom::geography, se.g::geography, 40000)`)).rows[0].n;
      assert.ok(forut >= 1, `${land}: ingen grannstation inom 40 km i den gamla frågan`);
      for (const { fil, fraga } of gransrakningen()) {
        const n = (await pool.query(fraga!.replaceAll("${land}", land))).rows[0].n;
        assert.equal(n, forut, `${fil} (${land}): räkningen på vägindexet och ST_Collect-frågan räknar olika`);
      }
    }
  } finally {
    await pool.query(`DELETE FROM road_conditions WHERE segment_id LIKE 'G742-%'`);
    for (const land of ["fi", "no"]) await pool.query(`DELETE FROM ${land}.weather_latest WHERE station_id LIKE 'G742-%'`);
    await pool.end();
  }
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
                     "056_kandidat_regel.sql", "057_kandidat_skugga.sql", "062_kortare_forvaring.sql", "072_gallringen_tillbaka.sql"])
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

    // Hinken: dygnet efter exporteras, golvet är tre dygn (sql/072, DECISIONS #740; ett dygn 17/10–28/10, #618; tre till 17/10, #573).
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
    assert.match((await q("SELECT arkiv2_radera_exporterat(0, 14) AS s")).rows[0].s, /inget exporterat tabelldygn äldre än golvet \(14 dygn, kandidatens loggar 3\)/,
      "två och ett dygn gamla står kvar");
    assert.equal((await q("SELECT count(*)::int AS n FROM kandidat_skugga WHERE segment_id = '99919'")).rows[0].n, 2, "två dygn kvar i databasen");
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
    // #739: vägnumret ur road_conditions i en egen fråga — en sträcka med nummer, de andra null.
    await q("UPDATE road_conditions SET road_number = '45' WHERE segment_id = '99921'");
    const { buildSnapshot } = await import("../publish/snapshot-core.ts");
    const { liveDoc } = await buildSnapshot(async (t, p) => (await pool.query(t, p as any[])).rows, []);
    assert.deepEqual(liveDoc.kandidat.filter((r) => r.id.startsWith("9992")),
      ["99921", "99922", "99923", "99924"].map((id) => ({ id, tid: tid.toISOString(), punkter: [[32, 70]], vag: id === "99921" ? "45" : null })));
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
    for (const f of ["062_kortare_forvaring.sql", "063_arkiv_fyra_tabeller.sql", "072_gallringen_tillbaka.sql",
                     "083_ny_kandidat_arkiv.sql", "083_ny_kandidat_arkiv.sql"]) await las(f);
    await stad();
    // sql/083 (DECISIONS #792): den nya kandidatens domlogg står i vitlistan, exporteras när dygnet är färdigt som den gamlas, men
    // raderas efter nattjobbets 14 dygn och inte de gamlas tre (sql/072). Filen tål att köras två gånger (ovan).
    for (const tab of ["ny_kandidat_skugga", "ny_kandidat_station"]) {
      assert.equal((await q("SELECT arkiv2_tabell($1) AS t", [tab])).rows[0].t, tab, `${tab} i vitlistan`);
      assert.equal((await q("SELECT arkiv2_alder($1) AS n", [tab])).rows[0].n, 1, `${tab} exporteras dygnet efter`);
      assert.equal((await q("SELECT arkiv2_golv($1, 14) AS n", [tab])).rows[0].n, 14, `${tab} raderas efter 14 dygn`);
      await q("INSERT INTO arkiv_export_tabell (tabell, dag, rader, bytes, sha256, sokvag) VALUES ($1, '2026-10-24', 0, 0, 'x', 'v')", [tab]);
    }
    assert.equal((await q("SELECT arkiv2_golv('kandidat_skugga', 14) AS n")).rows[0].n, 3, "den gamla kandidatens golv (sql/072) är orört");
    assert.equal((await q("SELECT arkiv2_alder('shadow_log') AS n")).rows[0].n, 8, "de andras ålder är orörd");
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
    // Den frystas kedja laddas bara när den saknas: i ci har tidigare prov redan laddat 058, som ger kandidat_regel() fler kolumner,
    // och en omladdning av 056/057 fälls då med "cannot change return type" (som provet ovan). 065 är sist i kedjan (fukt_pb).
    // Saknas 065 tas kandidat_regel() bort först, som 058 själv gör. 068 laddas alltid, två gånger (idempotent).
    const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
    if (!(await q("SELECT 1 FROM information_schema.columns WHERE table_name = 'kandidat_skugga' AND column_name = 'fukt_pb'")).rowCount) {
      await q("DROP FUNCTION IF EXISTS kandidat_regel()");
      for (const f of ["001_init.sql", "008_rain_sum.sql", "009_radar_precip.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql",
                       "029_brott_index.sql", "030_langsam_vakt.sql", "050_kandidat_live.sql", "052_kandidat_gallring_kort.sql", "053_arkiv_tabeller.sql",
                       "055_vagpunkter.sql", "056_kandidat_regel.sql", "057_kandidat_skugga.sql", "058_kandidat_spridning.sql",
                       "065_kandidat_domlogg_punkter.sql"]) await las(f);
    }
    for (const f of ["068_ny_kandidat_skugga.sql", "068_ny_kandidat_skugga.sql"]) await las(f);
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

// OLYCKSFACIT, STEG 1 (sql/084, DECISIONS #796): fångsten mot riktig PostGIS. Fyra olyckor kring 71° N: en på en sträcka med
// Besvärligt/Våt och en varnande kandidatpunkt (VARNADE), dess dubblett 100 m och fem minuter senare, en på en sträcka med Normalt
// där kandidatens närmaste punkt är torr (TYST_TACKT med orsakerna), och en långt från allt (TYST_OTACKT). En viltolycka äldre än tolv
// timmar och en annan typ fångas inte. En andra körning fångar ingenting (idempotent).
test("#796 olycksfacit: varje olycka fångas en gång, med vad lagren sa vid starten", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  const nord = (km: number) => 71 + km / 111.2;
  const stad = async () => {
    await q("DELETE FROM olycksfacit WHERE deviation_id LIKE 'OF%'").catch(() => {});
    await q("DELETE FROM situation_archive WHERE deviation_id LIKE 'OF%'");
    await q("DELETE FROM ny_kandidat_skugga WHERE segment_id LIKE '9995%'");
    await q("DELETE FROM ny_kandidat_skugga_korning WHERE korning > now() - interval '3 hours'").catch(() => {});
    await q("DELETE FROM ny_kandidat_live WHERE punkt LIKE 'vF%'");
    await q("DELETE FROM vagpunkt WHERE punkt LIKE 'vF%'");
    await q("DELETE FROM road_condition_history WHERE segment_id LIKE '9995%'");
    await q("DELETE FROM road_conditions WHERE segment_id LIKE '9995%'");
    await q("DELETE FROM weather_observations WHERE station_id LIKE 'OF%'");
  };
  try {
    await q("CREATE TABLE IF NOT EXISTS shadow_log (id bigserial PRIMARY KEY, run_at timestamptz NOT NULL DEFAULT now(), alerts jsonb NOT NULL DEFAULT '[]'::jsonb)");
    // Kandidatens kedja som provet ovan: den frystas bara när den saknas, sedan 068, arkivet och 084 två gånger (idempotent).
    if (!(await q("SELECT 1 FROM information_schema.columns WHERE table_name = 'kandidat_skugga' AND column_name = 'fukt_pb'")).rowCount) {
      await q("DROP FUNCTION IF EXISTS kandidat_regel()");
      for (const f of ["001_init.sql", "008_rain_sum.sql", "009_radar_precip.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql",
                       "029_brott_index.sql", "030_langsam_vakt.sql", "050_kandidat_live.sql", "052_kandidat_gallring_kort.sql", "053_arkiv_tabeller.sql",
                       "055_vagpunkter.sql", "056_kandidat_regel.sql", "057_kandidat_skugga.sql", "058_kandidat_spridning.sql",
                       "065_kandidat_domlogg_punkter.sql"]) await las(f);
    }
    for (const f of ["003_situation_archive.sql", "068_ny_kandidat_skugga.sql", "084_olycksfacit.sql", "084_olycksfacit.sql",
                     "085_olycksfacit_klassning.sql", "095_olycksfacit_k_timmen.sql", "089_stadspunkter.sql",
                     "096_olycksfacit_stad.sql"]) await las(f);   // den fångst som kör (#814, #815)
    await stad();
    // Sträckorna: 99951 Besvärligt/Våt sedan tre timmar, 99952 Normalt/Torrt.
    await q(`INSERT INTO road_conditions (segment_id, condition_code, condition_text, condition_info, road_number, geom, modified_time) VALUES
      ('99951', 2, 'Besvärligt (risk för)', '{Våt}', 'E 18', ST_SetSRID(ST_MakeLine(ST_MakePoint(31, $1), ST_MakePoint(31, $2)), 4326), now() - interval '3 hours'),
      ('99952', 1, 'Normalt', '{Torrt}', 'Väg 134', ST_SetSRID(ST_MakeLine(ST_MakePoint(32, $1), ST_MakePoint(32, $2)), 4326), now() - interval '3 hours')`,
      [nord(0), nord(5)]);
    await q(`INSERT INTO road_condition_history (segment_id, condition_code, condition_text, condition_info, modified_time) VALUES
      ('99951', 2, 'Besvärligt (risk för)', '{Våt}', now() - interval '3 hours'), ('99952', 1, 'Normalt', '{Torrt}', now() - interval '3 hours')`);
    for (const [p, s, lon, km] of [["vF01", "99951", 31, 1], ["vF02", "99951", 31, 3], ["vF03", "99952", 32, 1]] as const)
      await q("INSERT INTO vagpunkt (punkt, segment_id, lon, lat) VALUES ($1, $2, $3, $4)", [p, s, lon, nord(km)]);
    // Kandidatens timme, den som talade vid olyckorna (#814): skriven två minuter före dem, som körningsloggen säger. På 99951 tystar
    // spridningen vF01 och vF02 varnar; på 99952 är vF03 torr.
    await q(`INSERT INTO ny_kandidat_skugga_korning (korning, observed_at, status) VALUES (now() - interval '32 minutes', date_trunc('hour', now() - interval '35 minutes'), 'räknad')`);
    await q(`INSERT INTO ny_kandidat_skugga (segment_id, observed_at, skriven_at, punkter, varnar, veto, torr, vat, flackvis_vat, pb_min,
               spridning, fukt_punkter, fukt_utfall) VALUES
      ('99951', date_trunc('hour', now() - interval '35 minutes'), now() - interval '32 minutes', 2, 1, 0, 0, true, false, -1.0, 1, '{vF01,vF02}', '{spridning,varnar}'),
      ('99952', date_trunc('hour', now() - interval '35 minutes'), now() - interval '32 minutes', 1, 0, 0, 1, false, false, -1.2, 0, '{}', '{}')`);
    await q(`INSERT INTO ny_kandidat_live (tid, punkt, pb) VALUES (date_trunc('hour', now() - interval '35 minutes'), 'vF01', -0.7), (date_trunc('hour', now() - interval '35 minutes'), 'vF03', -1.2)`);
    // En station 0,6 km från den första olyckan: frusen, torr och under daggpunkten (rimfrost).
    await q(`INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, dewpoint_c, humidity_pct, precipitation)
             VALUES ('OF1', 'Provstation', ST_SetSRID(ST_MakePoint(31.01, $1), 4326), now() - interval '40 minutes', -1.0, -1.5, -0.5, 99, 'no')`, [nord(1.6)]);
    await q(`INSERT INTO situation_archive (deviation_id, message_type_value, message, severity_code, road_number, geom, start_time) VALUES
      ('OF1', 'Accident', 'Singelolycka', 4, 'E18', ST_SetSRID(ST_MakePoint(31, $1), 4326), now() - interval '30 minutes'),
      ('OF2', 'Accident', 'Singelolycka', 4, 'E18', ST_SetSRID(ST_MakePoint(31, $2), 4326), now() - interval '25 minutes'),
      ('OF3', 'Accident', 'Singelolycka', 4, 'Väg 134', ST_SetSRID(ST_MakePoint(32, $3), 4326), now() - interval '30 minutes'),
      ('OF4', 'Accident', 'Singelolycka', 2, NULL, ST_SetSRID(ST_MakePoint(33.5, 71.5), 4326), now() - interval '30 minutes'),
      ('OF5', 'Accident', 'Viltolycka', 2, NULL, ST_SetSRID(ST_MakePoint(31, $1), 4326), now() - interval '13 hours'),
      ('OF6', 'AnimalPresenceObstruction', 'Djur på vägen', 2, NULL, ST_SetSRID(ST_MakePoint(31, $1), 4326), now() - interval '30 minutes')`,
      [nord(1.2), nord(1.29), nord(1.1)]);

    assert.deepEqual((await q("SELECT proconfig FROM pg_proc WHERE proname = 'olycksfacit_fanga'")).rows[0].proconfig,
      ["search_path=public, extensions"], "fast sökväg i definitionen (DECISIONS #784)");
    await q("SELECT olycksfacit_fanga()");
    const rad = async (id: string) => (await q("SELECT * FROM olycksfacit WHERE deviation_id = $1", [id])).rows[0];
    const lager = async (id: string) => Object.fromEntries((await q("SELECT lager, talar, orsak, detalj FROM olycksfacit_lager WHERE deviation_id = $1", [id])).rows
      .map((r: any) => [r.lager, r]));
    assert.equal((await q("SELECT count(*)::int AS n FROM olycksfacit WHERE deviation_id LIKE 'OF%'")).rows[0].n, 4, "OF1–OF4, inte OF5 eller OF6");

    const o1 = await rad("OF1"), l1 = await lager("OF1");
    assert.equal(o1.utfall, "VARNADE");
    assert.deepEqual(o1.orsaker, []);
    assert.equal(l1.A1.talar, true); assert.equal(l1.A1.orsak, "väglag Besvärligt (risk för)");
    assert.equal(l1.K.talar, true, "vF02 varnar 1,8 km bort");
    assert.equal(l1.K.detalj.narmaste_utfall, "spridning"); assert.equal(l1.K.detalj.narmaste_pb, -0.7);
    assert.equal(l1.A2.talar, false); assert.equal(l1.A2.orsak, "ingen fukt vid stationen"); assert.equal(l1.A2.detalj.rimfrost, true);
    assert.equal(Object.keys(l1).length, 5);

    assert.equal((await rad("OF2")).dubblett_av, "OF1", "samma olycka 100 m och fem minuter senare");

    const o3 = await rad("OF3"), l3 = await lager("OF3");
    assert.equal(o3.utfall, "TYST_TACKT");
    assert.deepEqual(o3.orsaker, ["A1: väglaget Normalt", "K: fukt saknades", "A2: ingen station inom 5 km"]);
    assert.equal(l3.K.detalj.narmaste_utfall, "torr"); assert.equal(l3.tackning.orsak, "täckt");

    const o4 = await rad("OF4"), l4 = await lager("OF4");
    assert.equal(o4.utfall, "TYST_OTACKT");
    assert.equal(l4.A1.orsak, "ingen sträcka"); assert.equal(l4.K.orsak, "ingen vägpunkt");

    assert.equal((await q("SELECT olycksfacit_fanga() AS n")).rows[0].n, 0, "en andra körning fångar ingenting");
  } finally {
    await stad().catch(() => {});
    await pool.end();
  }
});

// OLYCKSFACIT, STEG 2 OCH 3 (sql/085, DECISIONS #797): efterkontrollen och klassningen, och fångstens två rättelser, mot riktig
// PostGIS. Varje fixtur är en fälla som ger ett annat svar om regeln eller vakten saknas:
//   EK1  texten efteråt säger "halt" och ytan är +0,5 → TYDLIG; Trafikverket satte halka en timme efter → halka_efter
//   EK2  singelolycka, en trasig givare (−14 under luft 0, #75) 0,5 km bort med snö, en frisk +2,0 3 km bort → OKLAR, inte TROLIG
//   EK3  singelolycka, yta −1,0 under daggpunkten −0,5 → TROLIG genom rimfrosten; halka först efter sju timmar → inte halka_efter
//   EK4  viltolycka på −1 → INTE, vilt         EK5  flera fordon på +4,5 → INTE, yta över +3
//   EK6  singelolycka utan station inom 15 km → OKLAR       EK7  två timmar gammal → inte kontrollerad än
//   KF1  på E18:s sträcka; närmaste vägpunkt (69 m) ligger på grannsträckan, E18:s egen 0,9 km bort tystades av spridningen
//        → K läser E18:s punkt och säger "spridningsspärren", inte grannens "fukt saknades"
//   KF2  en station 0,5 km bort på −2 med snö, men i karantän (tre brott mot #75 i veckan) → A2 tiger, olyckan är otäckt
test("#797 olycksfacit: efterkontrollen klassar en gång, med vakterna, och K läser A1:s sträcka", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  const nord = (km: number) => 72 + km / 111.2;
  const ost = (lon: number, km: number) => lon + km / (111.2 * Math.cos((72 * Math.PI) / 180));
  const stad = async () => {
    await q("DELETE FROM olycksfacit WHERE deviation_id LIKE 'EK%' OR deviation_id LIKE 'KF%'").catch(() => {});
    await q("DELETE FROM situation_archive WHERE deviation_id LIKE 'EK%' OR deviation_id LIKE 'KF%'");
    await q("DELETE FROM ny_kandidat_skugga WHERE segment_id LIKE '9996%' OR segment_id LIKE '9997%'");
    await q("DELETE FROM ny_kandidat_skugga_korning WHERE korning > now() - interval '3 hours'").catch(() => {});
    await q("DELETE FROM ny_kandidat_live WHERE punkt LIKE 'vK%'");
    await q("DELETE FROM vagpunkt WHERE punkt LIKE 'vK%'");
    await q("DELETE FROM road_condition_history WHERE segment_id LIKE '9996%' OR segment_id LIKE '9997%'");
    await q("DELETE FROM road_conditions WHERE segment_id LIKE '9996%' OR segment_id LIKE '9997%'");
    await q("DELETE FROM weather_observations WHERE station_id LIKE 'EKS%' OR station_id LIKE 'KFQ%'");
  };
  try {
    await q("CREATE TABLE IF NOT EXISTS shadow_log (id bigserial PRIMARY KEY, run_at timestamptz NOT NULL DEFAULT now(), alerts jsonb NOT NULL DEFAULT '[]'::jsonb)");
    if (!(await q("SELECT 1 FROM information_schema.columns WHERE table_name = 'kandidat_skugga' AND column_name = 'fukt_pb'")).rowCount) {
      await q("DROP FUNCTION IF EXISTS kandidat_regel()");
      for (const f of ["001_init.sql", "008_rain_sum.sql", "009_radar_precip.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql",
                       "029_brott_index.sql", "030_langsam_vakt.sql", "050_kandidat_live.sql", "052_kandidat_gallring_kort.sql", "053_arkiv_tabeller.sql",
                       "055_vagpunkter.sql", "056_kandidat_regel.sql", "057_kandidat_skugga.sql", "058_kandidat_spridning.sql",
                       "065_kandidat_domlogg_punkter.sql"]) await las(f);
    }
    for (const f of ["003_situation_archive.sql", "068_ny_kandidat_skugga.sql", "084_olycksfacit.sql", "085_olycksfacit_klassning.sql",
                     "085_olycksfacit_klassning.sql", "088_olycksfacit_veckor.sql", "088_olycksfacit_veckor.sql",
                     "095_olycksfacit_k_timmen.sql", "089_stadspunkter.sql", "096_olycksfacit_stad.sql"]) await las(f);   // den fångst som kör (#814, #815)
    // Steg 4 (sql/088, DECISIONS #802): veckornas tabell finns, med RLS på, och filen går att köra två gånger.
    assert.deepEqual((await q("SELECT relrowsecurity FROM pg_class WHERE relname = 'olycksfacit_veckor'")).rows, [{ relrowsecurity: true }]);
    for (const f of ["olycksfacit_fanga", "olycksfacit_efterkontroll"])
      assert.deepEqual((await q("SELECT proconfig FROM pg_proc WHERE proname = $1", [f])).rows[0].proconfig,
        ["search_path=public, extensions"], `${f}: fast sökväg i definitionen (DECISIONS #784)`);
    await stad();

    // Efterkontrollen: olyckorna 26 timmar gamla, skrivna direkt i olycksfacit (fångsten tar bara tolv timmar bakåt).
    const t = "now() - interval '26 hours'";
    const olycka = (id: string, lon: number, text: string, alder = t) => q(`INSERT INTO olycksfacit (deviation_id, start_time, message,
      road_number, severity_code, geom, utfall, orsaker) VALUES ($1, ${alder}, $2, 'Väg 1', 4, ST_SetSRID(ST_MakePoint($3, 72), 4326),
      'TYST_TACKT', '{"A1: väglaget Normalt"}')`, [id, text, lon]);
    const station = (id: string, lon: number, km: number, tid: string, yta: number, luft: number, dagg: number | null, nb: string) =>
      q(`INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, dewpoint_c, precipitation)
         VALUES ($1, 'Provstation', ST_SetSRID(ST_MakePoint($2, 72), 4326), ${tid}, $3, $4, $5, $6)`, [id, ost(lon, km), yta, luft, dagg, nb]);
    await olycka("EK1", 41, "Singelolycka");
    await q(`INSERT INTO situation_archive (deviation_id, message_type_value, message, severity_code, geom, start_time) VALUES
      ('EK1', 'Accident', 'Singelolycka. Mycket halt på platsen.', 4, ST_SetSRID(ST_MakePoint(41, 72), 4326), ${t})`);
    await station("EKS1", 41, 2, t, 0.5, 0, -1, "no");
    await olycka("EK2", 42, "Singelolycka med personbil");
    await station("EKS2B", 42, 0.5, t, -14, 0, -15, "Snow");
    await station("EKS2", 42, 3, t, 2.0, 1, -1, "no");
    await olycka("EK3", 43, "Singelolycka");
    await station("EKS3", 43, 1, t, -1.0, -0.5, -0.5, "no");
    await olycka("EK4", 44, "Viltolycka, rådjur");
    await station("EKS4", 44, 1, t, -1.0, 0, -2, "no");
    await olycka("EK5", 45, "Trafikolycka flera fordon");
    await station("EKS5", 45, 1, t, 4.5, 5, 1, "no");
    await olycka("EK6", 39, "Singelolycka");
    await olycka("EK7", 38, "Singelolycka, halt", "now() - interval '2 hours'");
    for (const [id, seg] of [["EK1", "99961"], ["EK3", "99963"]])
      await q("INSERT INTO olycksfacit_lager (deviation_id, lager, talar, orsak, detalj) VALUES ($1, 'A1', false, 'väglaget Normalt', $2)",
        [id, { segment: seg, km: 0.02 }]);
    await q(`INSERT INTO road_condition_history (segment_id, condition_code, condition_text, condition_info, modified_time) VALUES
      ('99961', 2, 'Besvärligt (risk för)', '{Is}', ${t} + interval '1 hour'),
      ('99963', 2, 'Besvärligt (risk för)', '{Is}', ${t} + interval '7 hours')`);

    assert.equal((await q("SELECT olycksfacit_efterkontroll() AS n")).rows[0].n >= 6, true);
    const k = async (id: string) => (await q("SELECT * FROM olycksfacit WHERE deviation_id = $1", [id])).rows[0];
    const ek1 = await k("EK1");
    assert.equal(ek1.klass, "TYDLIG"); assert.equal(ek1.klass_skal, "halkord i texten och yta ≤ +1 °C");
    assert.equal(ek1.text_efter, "Singelolycka. Mycket halt på platsen."); assert.equal(ek1.halka_efter, true);
    assert.equal(ek1.yta_station, "EKS1"); assert.equal(ek1.yta_min, 0.5);
    const ek2 = await k("EK2");
    assert.equal(ek2.klass, "OKLAR", "den trasiga givaren (#75) får inte göra olyckan TROLIG");
    assert.equal(ek2.yta_station, "EKS2"); assert.equal(ek2.klass_skal, "övrigt i kallt väder");
    const ek3 = await k("EK3");
    assert.equal(ek3.klass, "TROLIG"); assert.equal(ek3.klass_skal, "singelolycka, yta ≤ 0 °C och rimfrost");
    assert.equal(ek3.rimfrost_efter, true); assert.equal(ek3.fukt_efter, false); assert.equal(ek3.halka_efter, false);
    assert.equal((await k("EK4")).klass_skal, "vilt"); assert.equal((await k("EK4")).klass, "INTE");
    assert.equal((await k("EK5")).klass_skal, "yta över +3 °C"); assert.equal((await k("EK5")).klass, "INTE");
    const ek6 = await k("EK6");
    assert.equal(ek6.klass, "OKLAR"); assert.equal(ek6.klass_skal, "ingen vaktad station inom 15 km"); assert.equal(ek6.yta_min, null);
    assert.equal(ek6.halka_efter, null, "ingen sträcka inom 100 m: inget att läsa");
    assert.equal((await k("EK7")).kontrollerad_at, null, "yngre än ett dygn");
    assert.equal((await q("SELECT olycksfacit_efterkontroll() AS n")).rows[0].n, 0, "en olycka kontrolleras en gång");

    // Fångsten: K på A1:s sträcka, och A2 med karantänen.
    await q(`INSERT INTO road_conditions (segment_id, condition_code, condition_text, condition_info, road_number, geom, modified_time) VALUES
      ('99971', 1, 'Normalt', '{Torrt}', 'E 18', ST_SetSRID(ST_MakeLine(ST_MakePoint(48, 72), ST_MakePoint(48, 72.05)), 4326), now() - interval '3 hours'),
      ('99972', 1, 'Normalt', '{Torrt}', 'Väg 9', ST_SetSRID(ST_MakeLine(ST_MakePoint(48.01, 72), ST_MakePoint(48.01, 72.05)), 4326), now() - interval '3 hours')`);
    await q(`INSERT INTO road_condition_history (segment_id, condition_code, condition_text, condition_info, modified_time) VALUES
      ('99971', 1, 'Normalt', '{Torrt}', now() - interval '3 hours'), ('99972', 1, 'Normalt', '{Torrt}', now() - interval '3 hours')`);
    await q("INSERT INTO vagpunkt (punkt, segment_id, lon, lat) VALUES ('vK01', '99972', $1, $2), ('vK02', '99971', 48, $3)",
      [ost(48, 0.069), nord(1.1), nord(2)]);
    // Timmen som talade vid olyckan (#814): körningsloggen säger den, skriven 12 minuter före.
    await q(`INSERT INTO ny_kandidat_skugga_korning (korning, observed_at, status) VALUES (now() - interval '32 minutes', date_trunc('hour', now() - interval '35 minutes'), 'räknad')`);
    await q(`INSERT INTO ny_kandidat_skugga (segment_id, observed_at, skriven_at, punkter, varnar, veto, torr, vat, flackvis_vat, pb_min,
               spridning, fukt_punkter, fukt_utfall) VALUES
      ('99971', date_trunc('hour', now() - interval '35 minutes'), now() - interval '32 minutes', 1, 0, 0, 0, true, false, -0.7, 1, '{vK02}', '{spridning}'),
      ('99972', date_trunc('hour', now() - interval '35 minutes'), now() - interval '32 minutes', 1, 0, 0, 1, false, false, -1.0, 0, '{}', '{}')`);
    await q(`INSERT INTO ny_kandidat_live (tid, punkt, pb) VALUES (date_trunc('hour', now() - interval '35 minutes'), 'vK02', -0.7), (date_trunc('hour', now() - interval '35 minutes'), 'vK01', -1.0)`);
    await station("KFQ1", 49, 0.5, "now() - interval '30 minutes'", -2.0, -1, -3, "Snow");
    for (const d of [2, 3, 4]) await station("KFQ1", 49, 0.5, `now() - interval '${d} days'`, -20, 0, -21, "no");
    await q(`INSERT INTO situation_archive (deviation_id, message_type_value, message, severity_code, road_number, geom, start_time) VALUES
      ('KF1', 'Accident', 'Singelolycka', 4, 'E18', ST_SetSRID(ST_MakePoint(48, $1), 4326), now() - interval '20 minutes'),
      ('KF2', 'Accident', 'Singelolycka', 4, NULL, ST_SetSRID(ST_MakePoint(49, $1), 4326), now() - interval '20 minutes')`, [nord(1.1)]);
    await q("SELECT olycksfacit_fanga()");
    const lager = async (id: string) => Object.fromEntries((await q("SELECT lager, talar, orsak, detalj FROM olycksfacit_lager WHERE deviation_id = $1", [id])).rows
      .map((r: any) => [r.lager, r]));
    const kf1 = await lager("KF1");
    assert.equal(kf1.A1.detalj.segment, "99971");
    assert.equal(kf1.K.detalj.punkt, "vK02", "E18:s egen punkt, inte grannsträckans 69 m bort");
    assert.equal(kf1.K.orsak, "spridningsspärren");
    assert.deepEqual((await k("KF1")).orsaker, ["A1: väglaget Normalt", "K: spridningsspärren", "A2: ingen station inom 5 km"]);
    const kf2 = await lager("KF2");
    assert.equal(kf2.A2.talar, false, "stationen är i karantän (tre brott mot #75)");
    assert.equal(kf2.A2.orsak, "ingen station inom 5 km");
    assert.equal((await k("KF2")).utfall, "TYST_OTACKT");
  } finally {
    await stad().catch(() => {});
    await pool.end();
  }
});

// OLYCKSFACIT I NÄRA REALTID (sql/108, DECISIONS #841, #842, kort #641). En funktions definition ur en migration: från raden med
// FUNCTION <namn>( till semikolonet efter det avslutande $$ (som test/ny-kandidat-skugga.test.ts).
const definition842 = (text: string, namn: string): string => {
  const i = text.search(new RegExp(`^CREATE (?:OR REPLACE )?FUNCTION ${namn}\\(`, "m"));
  assert.ok(i >= 0, `${namn} saknas`);
  const a = text.indexOf("$$", i), b = text.indexOf("$$", a + 2), c = text.indexOf(";", b);
  return text.slice(i, c + 1);
};
const sql842 = (f: string) => readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8");
/** En mutant: ersätter `fran` (exakt en gång) i definitionen, så att ett motprov aldrig blir tomt av att texten flyttat. */
const mutant842 = (def: string, fran: string | RegExp, till: string): string => {
  const n = typeof fran === "string" ? def.split(fran).length - 1 : (def.match(new RegExp(fran.source, "g")) ?? []).length;
  assert.equal(n, 1, `motprovets text finns inte exakt en gång: ${String(fran).slice(0, 80)}`);
  return def.replace(fran, till);
};

test("#842 efterkontrollen i sql/108 är sql/085:s ord för ord, utom urvalet", () => {
  const fore = definition842(sql842("085_olycksfacit_klassning.sql"), "olycksfacit_efterkontroll");
  const nu = definition842(sql842("108_olycksfacit_driftlarm.sql"), "olycksfacit_efterkontroll");
  const urval = /f\.start_time <= now\(\) - interval '6 hours'\n\s+AND NOT EXISTS \(SELECT 1 FROM situation_archive s WHERE s\.deviation_id = f\.deviation_id\s+-- #842: lämnat flödet\n\s+AND s\.last_seen > \(SELECT max\(a\.last_seen\) FROM situation_archive a\) - interval '1 hour'\)/;
  assert.match(nu, urval, "urvalet: sex timmar och flödet");
  assert.equal(nu.replace(urval, "f.start_time <= now() - interval '24 hours'"), fore, "resten av kroppen är 085:s");
});

// DRIFTLARMET I SKUGGA (sql/108 del 1). Fixturerna kring 77° N, en grad isär (25 km), så att ingen stations räckvidd når en annan
// olycka. Varje fixtur är en fälla som ger ett annat svar om ett villkor saknas, och motproven nedan muterar ett villkor i taget:
//   DL1  genom fångsten: "halt väglag", kedjans senaste körning tyst, en station 2 km bort som teg i tre timmar
//        → K ingen timme och A2 tyst, halka på ordet (ingen station med värde inom 15 km)
//   DL2  "Trafikolycka" utan halkord, men närmaste vaktade station +0,5 °C, och kandidatens tal gallrade → K gallrad, halka på ytan
//   DL3  utan halkord på +5 °C, med kedjans timme borta → ingenting (villkor 1 håller inte)
//   DL4  "Halka", ingen vaktad station inom 5 km, men stationen 1 km bort har ett värde som vakterna tog bort → inte tyst
//   DL5  "isig", ingen station inom 5 km alls (närmaste 7 km) → inte tyst
//   DL6  dubbletten av DL1 → ingenting        DL7  fångad för sju timmar sedan → prövas inte
//   DL8  publiceringen stod still: den senaste lyckade 60 min före, i fönstret bara en med hinken trasig och en grannlands
//        → appen stilla
//   DL9  publicerat 2 min före; A2 talade, och en tyst station inom 5 km gör inte A2 tyst → ingenting
//   DL10 pg_nets svar når inte 15 min före starten → appen okänd      DL11 når dit, utan lyckad publicering → appen stilla
// CI:s PostGIS saknar pg_net: net._http_response spelas av en egen tabell med samma kolumner (som #543), och tas bort efteråt; utan
// den blir appen okänd. Finns en riktig pg_net rörs den inte, och provet hoppas över.
test("#842 driftlarmet i skugga: en rad per feltyp när ett lager inte fungerade vid en olycka som kan gälla halka", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const las = (f: string) => q(sql842(f));
  const nu = Date.now();
  const ago = (min: number) => new Date(nu - min * 60_000).toISOString();
  const nord = 77, ost = (lon: number, km: number) => lon + km / (111.2 * Math.cos((nord * Math.PI) / 180));
  const riktiga = (await q("SELECT to_regclass('net._http_response') IS NOT NULL AS j")).rows[0].j;
  let egenNet = false;
  const stad = async () => {
    await q("DELETE FROM olycksfacit WHERE deviation_id LIKE 'DL%'").catch(() => {});
    await q("DELETE FROM situation_archive WHERE deviation_id LIKE 'DL%'");
    await q("DELETE FROM ny_kandidat_skugga_korning WHERE korning > now() - interval '3 hours'").catch(() => {});
    await q("DELETE FROM vagpunkt WHERE punkt LIKE 'vD%'").catch(() => {});
    await q("DELETE FROM weather_latest WHERE station_id LIKE 'DLW%'");
    await q("DELETE FROM weather_observations WHERE station_id LIKE 'DLW%'");
  };
  try {
    if (riktiga) return;   // en riktig pg_net rörs inte
    await q("CREATE TABLE IF NOT EXISTS shadow_log (id bigserial PRIMARY KEY, run_at timestamptz NOT NULL DEFAULT now(), alerts jsonb NOT NULL DEFAULT '[]'::jsonb)");
    if (!(await q("SELECT 1 FROM information_schema.columns WHERE table_name = 'kandidat_skugga' AND column_name = 'fukt_pb'")).rowCount) {
      await q("DROP FUNCTION IF EXISTS kandidat_regel()");
      for (const f of ["001_init.sql", "008_rain_sum.sql", "009_radar_precip.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql",
                       "029_brott_index.sql", "030_langsam_vakt.sql", "050_kandidat_live.sql", "052_kandidat_gallring_kort.sql", "053_arkiv_tabeller.sql",
                       "055_vagpunkter.sql", "056_kandidat_regel.sql", "057_kandidat_skugga.sql", "058_kandidat_spridning.sql",
                       "065_kandidat_domlogg_punkter.sql"]) await las(f);
    }
    // Fångsten som kör (084, 085, 095, 096 och 100), och 108 två gånger (idempotent).
    for (const f of ["003_situation_archive.sql", "068_ny_kandidat_skugga.sql", "084_olycksfacit.sql", "085_olycksfacit_klassning.sql",
                     "095_olycksfacit_k_timmen.sql", "089_stadspunkter.sql", "096_olycksfacit_stad.sql", "100_olycksfacit_rattelse.sql",
                     "108_olycksfacit_driftlarm.sql", "108_olycksfacit_driftlarm.sql"]) await las(f);
    await stad();
    assert.deepEqual((await q("SELECT relrowsecurity FROM pg_class WHERE relname = 'olycksfacit_driftlarm'")).rows, [{ relrowsecurity: true }]);
    for (const f of ["olycksfacit_driftlarm", "olycksfacit_efterkontroll"])
      assert.deepEqual((await q("SELECT proconfig FROM pg_proc WHERE proname = $1", [f])).rows[0].proconfig,
        ["search_path=public, extensions"], `${f}: fast sökväg i definitionen (DECISIONS #784)`);

    // Publiceringens svar, som pg_net sparar dem.
    await q(`CREATE SCHEMA net; CREATE TABLE net._http_response (id bigint, status_code integer, content_type text, headers jsonb,
      content text, timed_out boolean, error_msg text, created timestamptz NOT NULL DEFAULT now())`);
    egenNet = true;
    const pub = (min: number, hinken = "ok") => `{"ok":true,"sha":null,"generated_at":"${ago(min)}","segments":1,"notes":[],"hinken":"${hinken}","ms":9}`;
    for (const [id, min, content] of [[1, 100, '{"ok":true}'], [2, 60, pub(60)], [3, 33, pub(33, "Storage 500: fel")],
        [4, 31, '{"ok":true,"land":"no","sha":"abc","hinken":"ok","ms":3}'], [5, 12, pub(12)], [6, 5, '{"ok":false,"error":"x"}']] as const)
      await q("INSERT INTO net._http_response (id, status_code, content, timed_out, created) VALUES ($1, 200, $2, false, $3)", [id, content, ago(min)]);

    // DL1 genom fångsten: kedjans senaste körning före starten var tyst, och stationen 2 km bort teg i tre timmar.
    await q("INSERT INTO ny_kandidat_skugga_korning (korning, observed_at, status) VALUES ($1, $2, 'tyst')", [ago(15), ago(240)]);
    await q("INSERT INTO vagpunkt (punkt, segment_id, lon, lat) VALUES ('vD01', '99991', $1, $2)", [ost(60, 1), nord]);
    await q(`INSERT INTO weather_latest (station_id, name, geom, sample_time, surface_temp_c, air_temp_c)
             VALUES ('DLW1', 'Tyst station', ST_SetSRID(ST_MakePoint($1, $2), 4326), $3, -1, 0)`, [ost(60, 2), nord, ago(180)]);
    await q(`INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c)
             VALUES ('DLW1', 'Tyst station', ST_SetSRID(ST_MakePoint($1, $2), 4326), $3, -1, 0)`, [ost(60, 2), nord, ago(180)]);
    await q(`INSERT INTO situation_archive (deviation_id, message_type_value, message, severity_code, geom, start_time) VALUES
             ('DL1', 'Accident', 'Singelolycka, halt väglag', 4, ST_SetSRID(ST_MakePoint(60, $1), 4326), $2)`, [nord, ago(10)]);
    await q("SELECT olycksfacit_fanga()");
    const k1 = (await q("SELECT orsak, detalj FROM olycksfacit_lager WHERE deviation_id = 'DL1' AND lager IN ('K', 'A2') ORDER BY lager")).rows;
    assert.deepEqual(k1.map((r: any) => r.orsak), ["ingen station inom 5 km", "ingen timme"], "fångsten: A2 utan station, K utan timme");

    // De andra direkt i olycksfacit, med lagren som fångsten skriver dem.
    const olycka = async (id: string, lon: number, text: string, k: [string, object], a2: [string, object[]],
                          x: { t?: string; fangad?: string; dubblett?: string } = {}) => {
      await q(`INSERT INTO olycksfacit (deviation_id, start_time, fangad_at, message, road_number, severity_code, geom, dubblett_av, utfall)
               VALUES ($1, $2, $3, $4, 'Väg 1', 4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, 'TYST_TACKT')`,
        [id, x.t ?? ago(10), x.fangad ?? new Date(nu).toISOString(), text, lon, nord, x.dubblett ?? null]);
      await q(`INSERT INTO olycksfacit_lager (deviation_id, lager, talar, orsak, detalj) VALUES ($1, 'K', $2, $3, $4), ($1, 'A2', $5, $6, $7)`,
        [id, k[0] === "varnar", k[0], k[1], a2[0] === "isrisk", a2[0], { stationer: a2[1], rimfrost: false }]);
    };
    const st = (yta: number) => [{ station: "X", km: 3.1, yta }];
    await olycka("DL2", 61, "Trafikolycka", ["gallrad", { punkt: "vX2", timme: ago(70) }], ["ingen fukt vid stationen", st(0.5)]);
    await olycka("DL3", 62, "Trafikolycka, flera fordon", ["ingen timme", { punkt: "vX3", timme: ago(300), korning: "tyst" }], ["yta över +1", st(5.0)]);
    await olycka("DL4", 63, "Halka, singelolycka", ["varnar", {}], ["ingen station inom 5 km", []]);
    await q(`INSERT INTO weather_latest (station_id, name, geom, sample_time, surface_temp_c, air_temp_c) VALUES
             ('DLW4', 'Trasig givare', ST_SetSRID(ST_MakePoint($1, $2), 4326), $3, -14, 0),
             ('DLW5', 'Långt bort', ST_SetSRID(ST_MakePoint($4, $2), 4326), $5, -1, 0),
             ('DLW9', 'Tyst granne', ST_SetSRID(ST_MakePoint($6, $2), 4326), $7, -1, 0)`,
      [ost(63, 1), nord, ago(30), ost(64, 7), ago(600), ost(67, 2), ago(300)]);
    await q(`INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c)
             VALUES ('DLW4', 'Trasig givare', ST_SetSRID(ST_MakePoint($1, $2), 4326), $3, -14, 0)`, [ost(63, 1), nord, ago(30)]);
    await olycka("DL5", 64, "Singelolycka, isig vägbana", ["fukt saknades", {}], ["ingen station inom 5 km", []]);
    await olycka("DL6", 60, "Singelolycka, halt väglag", ["ingen timme", { timme: ago(240) }], ["ingen station inom 5 km", []], { dubblett: "DL1" });
    await olycka("DL7", 65, "Singelolycka, halt", ["ingen timme", { timme: ago(600) }], ["ingen station inom 5 km", []],
      { t: ago(430), fangad: ago(420) });
    await olycka("DL8", 66, "Singelolycka, halt", ["varnar", {}], ["isrisk", st(-1.0)], { t: ago(30) });
    await olycka("DL9", 67, "Singelolycka, halt", ["varnar", {}], ["isrisk", st(-1.0)], { t: ago(2) });
    await olycka("DL10", 68, "Singelolycka, halt", ["varnar", {}], ["isrisk", st(-1.0)], { t: ago(95) });
    await olycka("DL11", 69, "Singelolycka, halt", ["varnar", {}], ["isrisk", st(-1.0)], { t: ago(80) });

    const ALLA = ["DL1", "DL2", "DL3", "DL4", "DL5", "DL6", "DL7", "DL8", "DL9", "DL10", "DL11"];
    const rader = async () => {
      const ut: Record<string, string[]> = Object.fromEntries(ALLA.map((id) => [id, []]));
      for (const r of (await q("SELECT deviation_id, feltyp, halka FROM olycksfacit_driftlarm WHERE deviation_id LIKE 'DL%' ORDER BY 1, 2")).rows)
        ut[r.deviation_id].push(`${r.feltyp} · ${r.halka}`);
      return ut;
    };
    const kor = async (def: string) => {
      await q(def);
      await q("DELETE FROM olycksfacit_driftlarm WHERE deviation_id LIKE 'DL%'");
      await q("UPDATE olycksfacit SET driftlarm_at = NULL WHERE deviation_id LIKE 'DL%'");
      await q("SELECT olycksfacit_driftlarm()");
      return rader();
    };
    const VANTAT: Record<string, string[]> = {
      DL1: ["A2 tyst · halkord", "K ingen timme · halkord"], DL2: ["K gallrad · yta"], DL3: [], DL4: [], DL5: [], DL6: [], DL7: [],
      DL8: ["appen stilla · halkord och yta"], DL9: [], DL10: ["appen okänd · halkord och yta"], DL11: ["appen stilla · halkord och yta"],
    };
    const RIKTIG = definition842(sql842("108_olycksfacit_driftlarm.sql"), "olycksfacit_driftlarm");
    assert.deepEqual(await kor(RIKTIG), VANTAT);
    const sedan = Object.fromEntries((await q("SELECT deviation_id || ' ' || feltyp AS n, sedan FROM olycksfacit_driftlarm WHERE deviation_id LIKE 'DL%'"))
      .rows.map((r: any) => [r.n, r.sedan === null ? null : new Date(r.sedan).toISOString()]));
    assert.deepEqual(sedan, { "DL1 A2 tyst": ago(180), "DL1 K ingen timme": ago(240), "DL2 K gallrad": ago(70),
      "DL8 appen stilla": ago(60), "DL10 appen okänd": null, "DL11 appen stilla": null }, "sedan: när lagret senast fungerade, ur samma data");
    assert.equal((await q("SELECT driftlarm_at FROM olycksfacit WHERE deviation_id = 'DL7'")).rows[0].driftlarm_at, null, "DL7 prövas inte");
    assert.ok((await q("SELECT driftlarm_at FROM olycksfacit WHERE deviation_id = 'DL6'")).rows[0].driftlarm_at, "dubbletten är prövad");
    assert.equal((await q("SELECT olycksfacit_driftlarm() AS n")).rows[0].n, 0, "en olycka prövas en gång");
    assert.deepEqual(await rader(), VANTAT, "omkörningen ändrar inget");

    // Motproven: ett villkor i taget. Varje mutant ska ge ett annat svar än VANTAT, och raden säger vilka fixturer som fällde den.
    const MUTANTER: [string, string | RegExp, string][] = [
      ["halkordet", /halkord := coalesce\(o\.message, ''\) ~\* '[^']+';/, "halkord := false;"],
      ["ytan ≤ +1 °C", /ytan := coalesce\([^;]+;/, "ytan := false;"],
      ["villkor 1 alls", "CONTINUE WHEN NOT (halkord OR ytan);", ""],
      ["K ingen timme", "IN ('ingen timme', 'gallrad')", "IN ('gallrad')"],
      ["K gallrad", "IN ('ingen timme', 'gallrad')", "IN ('ingen timme')"],
      ["A2: fångstens orsak", "IF a2_orsak = 'ingen station inom 5 km' THEN", "IF true THEN"],
      ["A2: en station inom 5 km", "a2_st IS NOT NULL AND ", ""],
      ["A2: inget värde den sista timmen", "(a2_sedan IS NULL OR a2_sedan < o.t - interval '1 hour')", "true"],
      ["appen: hinken skriven", ` AND r.content LIKE '%"hinken":"ok"%'`, ""],
      ["appen: bara Sveriges publicering", `r.content LIKE '{"ok":true,"sha"%'`, `r.content LIKE '{"ok":true%'`],
      ["appen: 15 minuter", "pub < o.t - interval '15 minutes'", "pub < o.t - interval '75 minutes'"],
      ["appen: svaren når 15 minuter bakåt", "IF svar_nar THEN", "IF true THEN"],
      ["dubbletten", "CONTINUE WHEN o.dubblett_av IS NOT NULL;", ""],
      ["nyfångad", " AND f.fangad_at > now() - interval '6 hours'", ""],
    ];
    for (const [namn, fran, till] of MUTANTER) {
      const r = await kor(mutant842(RIKTIG, fran, till));
      const fallde = ALLA.filter((id) => JSON.stringify(r[id]) !== JSON.stringify(VANTAT[id]));
      console.log(`motprov driftlarmet, ${namn}: fälls av ${fallde.join(", ") || "INGEN"}`);
      assert.ok(fallde.length > 0, `motprovet ${namn} fälls inte av någon fixtur`);
    }
    assert.deepEqual(await kor(RIKTIG), VANTAT, "den riktiga funktionen tillbaka");

    // Utan pg_net går appen inte att avgöra: okänd, aldrig stilla.
    await q("DROP SCHEMA net CASCADE");
    egenNet = false;
    await q("UPDATE olycksfacit SET driftlarm_at = NULL WHERE deviation_id IN ('DL8', 'DL9')");
    await q("DELETE FROM olycksfacit_driftlarm WHERE deviation_id IN ('DL8', 'DL9')");
    await q("SELECT olycksfacit_driftlarm()");
    assert.deepEqual((await q("SELECT deviation_id, feltyp, detalj->>'skal' AS skal FROM olycksfacit_driftlarm WHERE deviation_id IN ('DL8', 'DL9') ORDER BY 1")).rows,
      [{ deviation_id: "DL8", feltyp: "appen okänd", skal: "pg_net saknas" }, { deviation_id: "DL9", feltyp: "appen okänd", skal: "pg_net saknas" }]);
  } finally {
    if (egenNet) await q("DROP SCHEMA IF EXISTS net CASCADE").catch(() => {});
    if (!riktiga) await stad().catch(() => {});
    await pool.end();
  }
});

// KLASSNINGEN EFTER SEX TIMMAR (sql/108 del 2, TROSKLAR-OLYCKSFACIT §10). Fixturerna kring 78° N:
//   DK1  sju timmar gammal, händelsen sedd senast för 200 min sedan → kontrolleras; texten efteråt ("Halt") gör den TYDLIG
//   DK2  5 h 50 min gammal → väntar          DK3  sju timmar gammal men sedd i flödet för 30 min sedan → väntar
//   DK4  sju timmar gammal, händelsen borta ur arkivet → kontrolleras
//   DK5  åtta timmar gammal, sedd för 125 min sedan → kontrolleras; men står inläsningen still sedan två timmar (arkivets senast
//        sedda händelse för 120 min sedan) är den sedd i flödets sista timme och väntar
test("#842 efterkontrollen: sex timmar, och händelsen ska ha lämnat flödet", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const nu = Date.now();
  const ago = (min: number) => new Date(nu - min * 60_000).toISOString();
  const stad = async () => {
    await q("DELETE FROM olycksfacit WHERE deviation_id LIKE 'DK%'").catch(() => {});
    await q("DELETE FROM situation_archive WHERE deviation_id LIKE 'DK%'");
    await q("DELETE FROM weather_observations WHERE station_id LIKE 'DKS%'");
  };
  try {
    for (const f of ["003_situation_archive.sql", "084_olycksfacit.sql", "085_olycksfacit_klassning.sql", "108_olycksfacit_driftlarm.sql"])
      await q(sql842(f));
    await stad();
    const olycka = (id: string, lon: number, alder: number) => q(`INSERT INTO olycksfacit (deviation_id, start_time, message, road_number,
      severity_code, geom, utfall) VALUES ($1, $2, 'Singelolycka', 'Väg 1', 4, ST_SetSRID(ST_MakePoint($3, 78), 4326), 'TYST_TACKT')`, [id, ago(alder), lon]);
    const handelse = (id: string, lon: number, alder: number, sedd: number, typ = "Accident", text = "Singelolycka") =>
      q(`INSERT INTO situation_archive (deviation_id, message_type_value, message, severity_code, geom, start_time, first_seen, last_seen)
         VALUES ($1, $2, $3, 4, ST_SetSRID(ST_MakePoint($4, 78), 4326), $5, $5, $6)`, [id, typ, text, lon, ago(alder), ago(sedd)]);
    await handelse("DKF", 59, 780, 0, "GeneralObstruction", "Flödet lever");          // arkivets senast sedda händelse: nu
    await olycka("DK1", 60, 420); await handelse("DK1", 60, 420, 200, "Accident", "Singelolycka. Halt på platsen.");
    await q(`INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, dewpoint_c, precipitation)
             VALUES ('DKS1', 'Provstation', ST_SetSRID(ST_MakePoint($1, 78), 4326), $2, 0.5, 1, -1, 'no')`,
      [60 + 1 / (111.2 * Math.cos((78 * Math.PI) / 180)), ago(420)]);
    await olycka("DK2", 61, 350); await handelse("DK2", 61, 350, 300);
    await olycka("DK3", 62, 420); await handelse("DK3", 62, 420, 30);
    await olycka("DK4", 63, 420);
    await olycka("DK5", 64, 480); await handelse("DK5", 64, 480, 125);

    const ALLA = ["DK1", "DK2", "DK3", "DK4", "DK5"];
    const kontrollerade = async (c: { query: typeof q }) =>
      Object.fromEntries((await c.query("SELECT deviation_id, kontrollerad_at IS NOT NULL AS k FROM olycksfacit WHERE deviation_id LIKE 'DK%' ORDER BY 1"))
        .rows.map((r: any) => [r.deviation_id, r.k]));
    /** Två lägen: flödet lever, och inläsningen står still sedan två timmar (i en transaktion som rullas tillbaka). */
    const kor = async (def: string) => {
      await q(def);
      await q("UPDATE olycksfacit SET kontrollerad_at = NULL WHERE deviation_id LIKE 'DK%'");
      await q("SELECT olycksfacit_efterkontroll()");
      const lever = await kontrollerade({ query: q });
      await q("UPDATE olycksfacit SET kontrollerad_at = NULL WHERE deviation_id LIKE 'DK%'");
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        await c.query("UPDATE situation_archive SET last_seen = least(last_seen, $1::timestamptz)", [ago(120)]);
        await c.query("SELECT olycksfacit_efterkontroll()");
        const still = await kontrollerade({ query: (s: string, p: unknown[] = []) => c.query(s, p) });
        await c.query("ROLLBACK");
        return { lever, still };
      } finally { c.release(); }
    };
    const VANTAT = { lever: { DK1: true, DK2: false, DK3: false, DK4: true, DK5: true },
                     still: { DK1: true, DK2: false, DK3: false, DK4: true, DK5: false } };
    const RIKTIG = definition842(sql842("108_olycksfacit_driftlarm.sql"), "olycksfacit_efterkontroll");
    assert.deepEqual(await kor(RIKTIG), VANTAT);
    const dk1 = (await q("SELECT klass, klass_skal, text_efter FROM olycksfacit WHERE deviation_id = 'DK1'")).rows[0];
    assert.deepEqual(dk1, { klass: "TYDLIG", klass_skal: "halkord i texten och yta ≤ +1 °C", text_efter: "Singelolycka. Halt på platsen." },
      "texten efteråt läses vid kontrollen, sju timmar efter starten");
    assert.equal((await q("SELECT klass FROM olycksfacit WHERE deviation_id = 'DK4'")).rows[0].klass, "OKLAR", "utan arkivrad: ingen station, OKLAR");

    const MUTANTER: [string, string | RegExp, string][] = [
      ["sex timmar (24)", "now() - interval '6 hours'", "now() - interval '24 hours'"],
      ["sex timmar (5)", "now() - interval '6 hours'", "now() - interval '5 hours'"],
      ["flödet alls", /\n\s+AND NOT EXISTS \(SELECT 1 FROM situation_archive s[^\n]*\n[^\n]*interval '1 hour'\)/, ""],
      ["flödets timme ur arkivet, inte klockan", "(SELECT max(a.last_seen) FROM situation_archive a)", "now()"],
    ];
    for (const [namn, fran, till] of MUTANTER) {
      const r = await kor(mutant842(RIKTIG, fran, till));
      const fallde = (["lever", "still"] as const).flatMap((l) => ALLA.filter((id) => r[l][id] !== VANTAT[l][id]).map((id) => `${id} (${l})`));
      console.log(`motprov efterkontrollen, ${namn}: fälls av ${fallde.join(", ") || "INGEN"}`);
      assert.ok(fallde.length > 0, `motprovet ${namn} fälls inte av någon fixtur`);
    }
    assert.deepEqual(await kor(RIKTIG), VANTAT, "den riktiga funktionen tillbaka");
  } finally {
    await stad().catch(() => {});
    await pool.end();
  }
});

// SPRIDNINGSSPÄRREN F1 (sql/086 och sql/087, DECISIONS #799, #800): båda regelfunktionerna tystar där minst två ankare bidrar och
// minoritetens viktandel kring noll (frys_min) är minst 0,45 — inte längre på spridningen 2,25 °C. Sedan TILLBAKA med sql/069, som
// ger dagens spärr igen; det lämnar också databasen som provet fann den.
test("#800 spridningsspärren F1: frys_min ≥ 0,45 tystar, spridningen gör det inte, och sql/069 tar tillbaka S0", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  const stad = async () => {
    await q("DELETE FROM kandidat_live WHERE punkt LIKE 'vX4%'");
    await q("DELETE FROM ny_kandidat_live WHERE punkt LIKE 'vX4%'").catch(() => {});
    await q("DELETE FROM vagpunkt WHERE punkt LIKE 'vX4%'");
    await q("DELETE FROM road_conditions WHERE segment_id LIKE '9994%'");
  };
  try {
    await q("CREATE TABLE IF NOT EXISTS shadow_log (id bigserial PRIMARY KEY, run_at timestamptz NOT NULL DEFAULT now(), alerts jsonb NOT NULL DEFAULT '[]'::jsonb)");
    // sql/056 skapar kandidat_regel() med den äldre returtypen (som provet #796): den tas bort först, och 058 och 069 skapar den igen.
    await q("DROP FUNCTION IF EXISTS kandidat_regel()");
    for (const f of ["001_init.sql", "008_rain_sum.sql", "009_radar_precip.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql",
                     "029_brott_index.sql", "030_langsam_vakt.sql", "050_kandidat_live.sql", "053_arkiv_tabeller.sql", "055_vagpunkter.sql",
                     "056_kandidat_regel.sql", "057_kandidat_skugga.sql", "058_kandidat_spridning.sql", "059_kandidat_brytare.sql",
                     "065_kandidat_domlogg_punkter.sql", "068_ny_kandidat_skugga.sql", "069_radarns_tal.sql",
                     "086_spridningsparren_frys_min.sql", "087_spridningsparren_f1.sql", "087_spridningsparren_f1.sql"]) await las(f);
    await stad();
    // [punkt, sträcka, n_ank, spr, frys_min, väntat med F1, väntat med S0] — alla Våt och kalla, långt från provens stationer (70° N, 33° Ö)
    const P: [string, string, number, number | null, number | null, string, string][] = [
      ["vX41", "99941", 3, 3.0, 0.0, "varnar", "spridning"],     // stor spridning men alla på samma sida: F1 talar, S0 tystade
      ["vX42", "99941", 2, 1.0, 0.5, "spridning", "varnar"],     // jämnt delade om noll trots liten spridning: F1 tystar
      ["vX43", "99942", 2, 1.0, 0.45, "spridning", "varnar"],    // exakt på gränsen ⇒ tyst (≥ 0,45)
      ["vX44", "99942", 2, 1.0, 0.44, "varnar", "varnar"],       // under gränsen ⇒ talar
      ["vX45", "99943", 1, 0.0, 0.0, "varnar", "varnar"],        // ett ankare: grindas inte
      ["vX46", "99943", 2, 3.0, null, "varnar", "spridning"],    // utan frys_min (före bytet, eller ett fallet steg): F1 tystar inte
    ];
    for (const [p, s] of P) await q("INSERT INTO vagpunkt (punkt, segment_id, lon, lat) VALUES ($1, $2, 33, 70)", [p, s]);
    await q(`INSERT INTO road_conditions (segment_id, condition_code, condition_text, condition_info) VALUES
      ('99941', 1, 'Normalt', '{Våt}'), ('99942', 1, 'Normalt', '{Våt}'), ('99943', 1, 'Normalt', '{Våt}')`);
    const tid: Date = (await q("SELECT date_trunc('hour', now()) AS t")).rows[0].t;
    for (const tab of ["kandidat_live", "ny_kandidat_live"]) {
      await q(`INSERT INTO ${tab} (tid, punkt, pb) SELECT $1, v.punkt, 5 FROM vagpunkt v WHERE v.punkt NOT LIKE 'vX4%' ON CONFLICT DO NOTHING`, [tid]);
      for (const [p, , n, spr, fm] of P)
        await q(`INSERT INTO ${tab} (tid, punkt, pb, n_ank, spr, frys_min, ank_km) VALUES ($1, $2, -1, $3, $4, $5, 4)`, [tid, p, n, spr, fm]);
    }
    const utfall = async (fn: string) => Object.fromEntries((await q(`SELECT punkt, utfall FROM ${fn}() WHERE punkt LIKE 'vX4%'`)).rows
      .map((r: any) => [r.punkt, r.utfall]));
    const vantatF1 = Object.fromEntries(P.map(([p, , , , , f1]) => [p, f1]));
    assert.deepEqual(await utfall("kandidat_regel"), vantatF1, "den frystas regel med F1");
    assert.deepEqual(await utfall("ny_kandidat_regel"), vantatF1, "den nyas regel med F1, samma som den frystas");
    // TILLBAKA: sql/069 ger dagens spärr på spridningen igen.
    await las("069_radarns_tal.sql");
    const vantatS0 = Object.fromEntries(P.map(([p, , , , , , s0]) => [p, s0]));
    assert.deepEqual(await utfall("kandidat_regel"), vantatS0, "sql/069 tar tillbaka S0");
    assert.deepEqual(await utfall("ny_kandidat_regel"), vantatS0, "sql/069 tar tillbaka S0 också för den nya");
  } finally {
    await stad().catch(() => {});
    await pool.end();
  }
});

// STORSTÄDERNAS PUNKTER (sql/089, DECISIONS #804, kort #378): tabellen och brytarna, och laddarens satser, mot riktig PostGIS.
//   SP1  filen går att köra två gånger; RLS på båda tabellerna; fyra brytare, alla av
//   SP2  laddarens skriv tar två punkter; en andra skrivning med samma värden ändrar inget; ett ändrat läge skrivs
//   SP3  ett v-id, ett id som inte börjar med lagret och en grupp utan lagret vägras av tabellen
//   SP4  ta_bort tar punkten som inte längre står i listan och rör inte vagpunkt
test("#804 stadspunkterna: tabellen, brytarna av och laddarens satser", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { SATS } = await import("../ingest/stadspunkter-db.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  const skriv = (r: [string, string, string, string, number, number][]) =>
    q(SATS.skriv, [r.map((x) => x[0]), r.map((x) => x[1]), r.map((x) => x[2]), r.map((x) => x[3]), r.map((x) => x[4]), r.map((x) => x[5])]);
  try {
    await las("055_vagpunkter.sql");
    const vp = Number((await q("SELECT count(*) AS n FROM vagpunkt")).rows[0].n);
    await las("089_stadspunkter.sql"); await las("089_stadspunkter.sql");
    await q("DELETE FROM stadspunkt WHERE punkt IN ('B99901', 'B99902', 'C99901')");
    assert.deepEqual((await q("SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('stadspunkt', 'stadsbrytare') ORDER BY 1")).rows,
      [{ relname: "stadsbrytare", relrowsecurity: true }, { relname: "stadspunkt", relrowsecurity: true }], "SP1: RLS");
    assert.deepEqual((await q("SELECT omrade, lager, pa FROM stadsbrytare ORDER BY omrade, lager")).rows,
      [{ omrade: "Stor-Göteborg", lager: "B", pa: false }, { omrade: "Stor-Malmö", lager: "B", pa: false },
       { omrade: "Stor-Stockholm", lager: "B", pa: false }, { omrade: "Stor-Stockholm", lager: "C", pa: false }], "SP1: fyra brytare, alla av");
    await skriv([["B99901", "B-1-1", "B", "Stor-Stockholm", 18.0, 59.3], ["C99901", "C-2-2", "C", "Stor-Stockholm", 18.05, 59.33]]);
    assert.equal((await skriv([["B99901", "B-1-1", "B", "Stor-Stockholm", 18.0, 59.3]])).rowCount, 0, "SP2: samma värden ändrar inget");
    assert.equal((await skriv([["B99901", "B-1-1", "B", "Stor-Stockholm", 18.001, 59.3]])).rowCount, 1, "SP2: ett ändrat läge skrivs");
    const g = await q("SELECT ST_X(geom) AS x FROM stadspunkt WHERE punkt = 'B99901'");
    assert.ok(Math.abs(g.rows[0].x - 18.001) < 1e-9, "SP2: geom följer läget");
    for (const [namn, rad] of [["v-id", ["v99901", "B-1-1", "B", "Stor-Stockholm", 18, 59]], ["fel lager i id:t", ["C99902", "B-1-1", "B", "Stor-Stockholm", 18, 59]],
                               ["grupp utan lagret", ["B99902", "12345", "B", "Stor-Stockholm", 18, 59]]] as const)
      await assert.rejects(skriv([rad as unknown as [string, string, string, string, number, number]]), undefined, `SP3: ${namn}`);
    await q(SATS.ta_bort, [["B99901"]]);
    assert.deepEqual((await q("SELECT punkt FROM stadspunkt ORDER BY punkt")).rows, [{ punkt: "B99901" }], "SP4: C99901 togs bort");
    assert.equal(Number((await q("SELECT count(*) AS n FROM vagpunkt")).rows[0].n), vp, "SP4: vagpunkt orörd");
  } finally {
    await q("DELETE FROM stadspunkt WHERE punkt IN ('B99901', 'B99902', 'C99901')").catch(() => {});
    await pool.end();
  }
});

// SMÅVÄGSRÖSTEN (sql/103, DECISIONS #828, kort #647; halkvakt-kuvos F53): tabellen och brytarna, och laddarens satser, mot riktig PostGIS.
//   SV1  filen går att köra två gånger; RLS på båda tabellerna; två brytare, P1 och N, båda av
//   SV2  laddarens skriv tar två punkter; samma värden ändrar inget; ett ändrat läge skrivs och geom följer
//   SV3  ett v-id, ett B-id, en okänd grupp och ett läge utanför Sverige vägras av tabellen
//   SV4  ta_bort tar punkten som inte längre står i listan och rör varken vagpunkt eller stadspunkt
//   SV5  full skala (CLAUDE.md, #783: ett jobb i full skala prövas i full skala utanför produktionen): 90 000 punkter skrivs i delar
//        om 500, en andra skrivning med samma värden ändrar inget, och ta_bort med alla utom en tar exakt en, på under 10 s
test("#828 småvägspunkterna: tabellen, brytarna av och laddarens satser, i full skala", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { SATS, kolumner } = await import("../ingest/smavagspunkter-db.ts");
  const { delar } = await import("../ingest/kandidat-db.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  type P = { punkt: string; grupp: "P1" | "N"; vag: string; ordning: number; lon: number; lat: number };
  const p = (punkt: string, grupp: string, vag: string, ordning: number, lon: number, lat: number) => ({ punkt, grupp, vag, ordning, lon, lat }) as P;
  const skriv = (r: P[]) => q(SATS.skriv, kolumner(r));
  const antal = async (t: string) => Number((await q(`SELECT count(*) AS n FROM ${t}`)).rows[0].n);
  try {
    await las("055_vagpunkter.sql"); await las("089_stadspunkter.sql");
    const vp = await antal("vagpunkt"), sp = await antal("stadspunkt");
    await las("103_smavagspunkter.sql"); await las("103_smavagspunkter.sql");
    await q("DELETE FROM smavagspunkt");
    assert.deepEqual((await q("SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('smavagspunkt', 'smavagsbrytare') ORDER BY 1")).rows,
      [{ relname: "smavagsbrytare", relrowsecurity: true }, { relname: "smavagspunkt", relrowsecurity: true }], "SV1: RLS");
    assert.deepEqual((await q("SELECT grupp, pa FROM smavagsbrytare ORDER BY grupp")).rows,
      [{ grupp: "N", pa: false }, { grupp: "P1", pa: false }], "SV1: två brytare, båda av");
    await skriv([p("r00001", "P1", "v00001", 0, 15.0, 60.0), p("r00002", "N", "v00001", 1, 15.01, 60.0)]);
    assert.equal((await skriv([p("r00001", "P1", "v00001", 0, 15.0, 60.0)])).rowCount, 0, "SV2: samma värden ändrar inget");
    assert.equal((await skriv([p("r00001", "P1", "v00001", 0, 15.001, 60.0)])).rowCount, 1, "SV2: ett ändrat läge skrivs");
    const g = await q("SELECT ST_X(geom) AS x FROM smavagspunkt WHERE punkt = 'r00001'");
    assert.ok(Math.abs(g.rows[0].x - 15.001) < 1e-9, "SV2: geom följer läget");
    for (const [namn, rad] of [["v-id", p("v00003", "P1", "v00002", 0, 15, 60)], ["B-id", p("B00003", "P1", "v00002", 0, 15, 60)],
                               ["okänd grupp", p("r00003", "P3", "v00002", 0, 15, 60)], ["läget i havet", p("r00003", "P1", "v00002", 0, 15, 0)]] as const)
      await assert.rejects(skriv([rad]), undefined, `SV3: ${namn}`);
    await q(SATS.ta_bort, [["r00001"]]);
    assert.deepEqual((await q("SELECT punkt FROM smavagspunkt ORDER BY punkt")).rows, [{ punkt: "r00001" }], "SV4: r00002 togs bort");
    assert.equal(await antal("vagpunkt"), vp, "SV4: vagpunkt orörd");
    assert.equal(await antal("stadspunkt"), sp, "SV4: stadspunkt orörd");
    const N = 90000, nr = (i: number) => String(i).padStart(5, "0");
    const alla = Array.from({ length: N }, (_, i) =>
      p(`r${nr(i + 1)}`, i % 3 ? "P1" : "N", `v${nr(Math.floor(i / 4) + 1)}`, i % 4, 11 + (i % 1000) * 0.012, 56 + Math.floor(i / 1000) * 0.13));
    let t = Date.now();
    for (const d of delar(alla)) await skriv(d);
    const tSkriv = Date.now() - t;
    let andrade = 0;
    t = Date.now();
    for (const d of delar(alla)) andrade += (await skriv(d)).rowCount ?? 0;
    const tIgen = Date.now() - t;
    assert.equal(andrade, 0, "SV5: en andra skrivning med samma värden ändrar inget");
    t = Date.now();
    const bort = await q(SATS.ta_bort, [alla.slice(1).map((x) => x.punkt)]);
    const tBort = Date.now() - t;
    assert.equal(bort.rowCount, 1, "SV5: ta_bort tar exakt den punkt som inte står i listan");
    assert.equal(await antal("smavagspunkt"), N - 1, "SV5: resten står kvar");
    assert.ok(tBort < 10000, `SV5: ta_bort tog ${tBort} ms`);
    console.log(`SV5: ${N} punkter skrivna på ${tSkriv} ms, igen på ${tIgen} ms, ta_bort på ${tBort} ms`);
  } finally {
    await q("DELETE FROM smavagspunkt").catch(() => {});
    await pool.end();
  }
});

// RADARN FÖR STORSTÄDERNAS PUNKTER (sql/090, DECISIONS #804, kort #378): tabellen, mot riktig PostGIS.
//   RS1  filen går att köra två gånger; RLS på       RS2  en grupp-rad skrivs, samma komposit en gång till ändrar inget
//   RS3  en numerisk grupp (Trafikverkets sträckor) vägras, så radar_stad och radar_precip kan aldrig blandas ihop
test("#804 radar_stad: tabellen för storstädernas radar", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  const skriv = (g: string) => q(`INSERT INTO radar_stad (grupp, observed_at, rate_max_mmh, rate_mean_mmh) VALUES ($1, '2026-11-06T12:00Z', 0.5, 0.2)
    ON CONFLICT (grupp, observed_at) DO NOTHING`, [g]);
  try {
    await las("090_radar_stad.sql"); await las("090_radar_stad.sql");
    await q("DELETE FROM radar_stad WHERE grupp IN ('B-990-990', '4045')");
    assert.equal((await q("SELECT relrowsecurity FROM pg_class WHERE relname = 'radar_stad'")).rows[0].relrowsecurity, true, "RS1: RLS");
    assert.equal((await skriv("B-990-990")).rowCount, 1, "RS2: raden skrivs");
    assert.equal((await skriv("B-990-990")).rowCount, 0, "RS2: samma komposit en gång till ändrar inget");
    await assert.rejects(skriv("4045"), undefined, "RS3: en numerisk grupp vägras");
  } finally {
    await q("DELETE FROM radar_stad WHERE grupp IN ('B-990-990', '4045')").catch(() => {});
    await pool.end();
  }
});

// RADARN FÖR SMÅVÄGSRÖSTENS PUNKTER (sql/104, DECISIONS #828, kort #647): tabellen och satserna i radar-karna.ts SMAVAG, mot riktig PostGIS.
//   RV1  filen går att köra två gånger; RLS på
//   RV2  grupper delar en väg i bitar om högst fem punkter i följd, i ordningens följd, och bara ur smavagspunkt
//   RV3  skriv tar en rad per bit, och samma komposit en gång till ändrar inget
//   RV4  en stadsgrupp och en numerisk sträcka vägras, så radar_smavag aldrig blandas ihop med radar_stad eller radar_precip
//   RV5  gallra tar rader äldre än två timmar och låter yngre stå
test("#828 radar_smavag: tabellen och satserna för småvägsröstens radar", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { SMAVAG } = await import("../ingest/radar-karna.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  const skriv = (b: string[], t = "2026-11-10T12:00Z") => q(SMAVAG.skriv, [b, t, b.map(() => 0.5), b.map(() => 0.2)]);
  try {
    await las("103_smavagspunkter.sql");
    await las("104_radar_smavag.sql"); await las("104_radar_smavag.sql");
    await q("DELETE FROM smavagspunkt"); await q("DELETE FROM radar_smavag");
    assert.equal((await q("SELECT relrowsecurity FROM pg_class WHERE relname = 'radar_smavag'")).rows[0].relrowsecurity, true, "RV1: RLS");
    // sju punkter längs v99001 (ordning 0–7 utan 3: en lucka där vägen går på en sträcka) och en på v99002
    await q(`INSERT INTO smavagspunkt (punkt, grupp, vag, ordning, lon, lat) SELECT 'r' || (99900 + o), 'P1', 'v99001', o, 15 + o * 0.01, 60
             FROM unnest(ARRAY[0, 1, 2, 4, 5, 6, 7]) AS o`);
    await q("INSERT INTO smavagspunkt (punkt, grupp, vag, ordning, lon, lat) VALUES ('r99990', 'N', 'v99002', 0, 16, 61)");
    const g = Object.fromEntries((await q(SMAVAG.grupper)).rows.map((r: any) => [r.bit, r.p.map((x: number[]) => x[0])]));
    assert.deepEqual(Object.keys(g).sort(), ["v99001-0", "v99001-1", "v99002-0"], "RV2: bitarna");
    assert.deepEqual(g["v99001-0"], [15, 15.01, 15.02, 15.04], "RV2: ordning 0–4 i följd, luckan vid 3");
    assert.deepEqual(g["v99001-1"], [15.05, 15.06, 15.07], "RV2: ordning 5–7");
    assert.equal((await skriv(["v99001-0", "v99002-0"])).rowCount, 2, "RV3: en rad per bit");
    assert.equal((await skriv(["v99001-0"])).rowCount, 0, "RV3: samma komposit en gång till ändrar inget");
    await assert.rejects(skriv(["B-990-990"]), undefined, "RV4: en stadsgrupp vägras");
    await assert.rejects(skriv(["4045"]), undefined, "RV4: en numerisk sträcka vägras");
    await q(SMAVAG.skriv, [["v99001-1", "v99002-0"], new Date(Date.now() - 3 * 3600e3).toISOString(), [0.5, 0.5], [0.2, 0.2]]);
    await q(SMAVAG.skriv, [["v99001-1"], new Date(Date.now() - 30 * 60e3).toISOString(), [0.5], [0.2]]);
    await q("UPDATE radar_smavag SET observed_at = now() - interval '1 day' WHERE observed_at = '2026-11-10T12:00Z'");
    await q(SMAVAG.gallra);
    assert.deepEqual((await q("SELECT bit FROM radar_smavag ORDER BY bit")).rows, [{ bit: "v99001-1" }], "RV5: bara raden yngre än två timmar står");
  } finally {
    await q("DELETE FROM radar_smavag").catch(() => {});
    await q("DELETE FROM smavagspunkt WHERE punkt LIKE 'r999%'").catch(() => {});
    await pool.end();
  }
});

// SMÅVÄGSRÖSTENS REGEL (sql/105, DECISIONS #828, kort #647; halkvakt-kuvos F51): timmen, fukten, radarn och brytarna, mot riktig PostGIS.
//   SG1  filen går att köra två gånger; RLS på båda tabellerna
//   SG2  timmen: utan körning ingen; en tre timmar gammal körning och en med för få punkter räknas inte; den senaste färska och
//        fullständiga gäller, och en körning i framtiden rör den inte
//   SG3  fukten: N3 varnar; utan N3 och utan radar torr; radarn ≥ 0,1 mm/h i punktens bit på 60 minuter varnar, men inte i grannbiten
//        (ordning 5 är bit 1); 70 minuter gammal radar och ett medel på 0,05 mm/h (max 0,1) väcker inte; en punkt utan rad (D säger
//        inte fryser), en rad ur en äldre timme och en rad vars punkt saknas i smavagspunkt ger ingen rad
//   SG4  brytarna: båda av ⇒ smavag_talar() är tom medan smavag_regel() varnar som förut (skuggans underlag); P1 på ⇒ bara P1:s
//        varnande; båda på ⇒ alla varnande
//   SG5  full skala (CLAUDE.md, #783; regelns tid som #813): 90 000 punkter med rad i timmen, hälften med N3 och regn i var tredje
//        bit, båda brytarna på, före och efter ANALYZE; regeln och beskeden tar under 10 s, och med brytarna av är beskeden tomma
test("#828 småvägsregeln: timmen, fukten, radarn och brytarna, i full skala", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  const brytare = (p1: boolean, n: boolean) =>
    q("UPDATE smavagsbrytare SET pa = CASE grupp WHEN 'P1' THEN $1::boolean ELSE $2::boolean END", [p1, n]);
  const regel = async () => Object.fromEntries((await q("SELECT punkt, utfall FROM smavag_regel()")).rows.map((r: any) => [r.punkt, r.utfall]));
  const talar = async () => (await q("SELECT punkt FROM smavag_talar() ORDER BY punkt")).rows.map((r: any) => r.punkt);
  const timme = async () => (await q("SELECT smavag_timme() AS t")).rows[0].t?.toISOString() ?? null;
  const rensa = async () => { for (const t of ["smavag_live", "smavag_korning", "radar_smavag", "smavagspunkt"]) await q(`DELETE FROM ${t}`); };
  try {
    await las("103_smavagspunkter.sql"); await las("104_radar_smavag.sql");
    await las("105_smavagsregeln.sql"); await las("105_smavagsregeln.sql");
    await rensa(); await brytare(false, false);
    assert.deepEqual((await q("SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('smavag_live', 'smavag_korning') ORDER BY 1")).rows,
      [{ relname: "smavag_korning", relrowsecurity: true }, { relname: "smavag_live", relrowsecurity: true }], "SG1: RLS");
    const t0 = (await q("SELECT date_trunc('hour', now()) AS t")).rows[0].t.toISOString();

    // Åtta punkter. Bitarna är <väg>-<ordning div 5>.
    await q(`INSERT INTO smavagspunkt (punkt, grupp, vag, ordning, lon, lat) VALUES
      ('r99901', 'P1', 'v99001', 0, 15.00, 60), ('r99902', 'P1', 'v99001', 1, 15.01, 60), ('r99903', 'P1', 'v99001', 5, 15.05, 60),
      ('r99904', 'P1', 'v99002', 0, 16.00, 60), ('r99905', 'P1', 'v99003', 0, 17.00, 60),
      ('r99906', 'N', 'v99004', 0, 18.00, 61), ('r99907', 'N', 'v99004', 1, 18.01, 61), ('r99908', 'P1', 'v99005', 0, 19.00, 62)`);
    // D säger fryser i timmen för r99901–r99906 (r99907 har ingen rad); r99908 bara i timmen före; r99999 saknas bland punkterna.
    await q(`INSERT INTO smavag_live (tid, punkt, ned) SELECT $1::timestamptz - h * interval '1 hour', p, n
             FROM (VALUES ('r99901', true, 0), ('r99902', false, 0), ('r99903', false, 0), ('r99904', false, 0), ('r99905', false, 0),
                          ('r99906', true, 0), ('r99908', true, 1), ('r99999', true, 0)) AS v(p, n, h)`, [t0]);
    await q(`INSERT INTO radar_smavag (bit, observed_at, rate_max_mmh, rate_mean_mmh) VALUES
      ('v99001-1', now() - interval '30 minutes', 0.3, 0.2), ('v99002-0', now() - interval '70 minutes', 0.3, 0.2),
      ('v99003-0', now() - interval '10 minutes', 0.1, 0.05)`);

    // SG2: timmen.
    assert.equal(await timme(), null, "SG2: utan körning ingen timme");
    await q("INSERT INTO smavag_korning (tid, punkter) VALUES ($1::timestamptz - interval '3 hours', 8)", [t0]);
    assert.equal(await timme(), null, "SG2: en tre timmar gammal körning räknas inte");
    await q("INSERT INTO smavag_korning (tid, punkter) VALUES ($1, 7)", [t0]);
    assert.equal(await timme(), null, "SG2: 7 av 8 punkter är under 95 %");
    await q("UPDATE smavag_korning SET punkter = 8 WHERE tid = $1", [t0]);
    assert.equal(await timme(), t0, "SG2: den färska och fullständiga timmen");
    await q("INSERT INTO smavag_korning (tid, punkter) VALUES ($1::timestamptz + interval '1 hour', 8)", [t0]);
    assert.equal(await timme(), t0, "SG2: en körning i framtiden rör inte timmen");

    // SG3: fukten och radarn.
    const VANTAT = { r99901: "varnar", r99902: "torr", r99903: "varnar", r99904: "torr", r99905: "torr", r99906: "varnar" };
    assert.deepEqual(await regel(), VANTAT, "SG3: N3, radarn i biten, grannbiten, 70 minuter, medlet 0,05, punkter utan rad");

    // SG4: brytarna.
    assert.deepEqual(await talar(), [], "SG4: båda av ⇒ inga besked");
    assert.deepEqual(await regel(), VANTAT, "SG4: regeln räknar som förut med brytarna av");
    await brytare(true, false);
    assert.deepEqual(await talar(), ["r99901", "r99903"], "SG4: P1 på ⇒ bara P1:s varnande");
    await brytare(true, true);
    assert.deepEqual(await talar(), ["r99901", "r99903", "r99906"], "SG4: båda på ⇒ alla varnande");

    // SG5: full skala, med båda brytarna på.
    await rensa();
    const N = 90000;
    await q(`INSERT INTO smavagspunkt (punkt, grupp, vag, ordning, lon, lat)
             SELECT 'r' || lpad(i::text, 5, '0'), CASE WHEN i % 3 = 0 THEN 'N' ELSE 'P1' END, 'v' || lpad((i / 40 + 1)::text, 5, '0'),
                    i % 40, 11 + (i % 1000) * 0.012, 56 + (i / 1000) * 0.13
             FROM generate_series(1, $1::int) AS i`, [N]);
    await q(`INSERT INTO smavag_live (tid, punkt, ned) SELECT $1::timestamptz, punkt, substr(punkt, 2)::int % 2 = 0 FROM smavagspunkt`, [t0]);
    await q("INSERT INTO smavag_korning (tid, punkter) VALUES ($1, $2)", [t0, N]);
    await q(`INSERT INTO radar_smavag (bit, observed_at, rate_max_mmh, rate_mean_mmh)
             SELECT b.bit, now() - m * interval '1 minute', 0.5, 0.3
             FROM (SELECT DISTINCT vag || '-' || (ordning / 5) AS bit FROM smavagspunkt WHERE (ordning / 5) % 3 = 0) b,
                  unnest(ARRAY[5, 20, 35, 50]) AS m`);
    const matt = async () => {
      let t = Date.now();
      const nRegel = (await q("SELECT count(*) AS n FROM smavag_regel()")).rows[0].n;
      const tRegel = Date.now() - t;
      t = Date.now();
      const nTalar = (await q("SELECT count(*) AS n FROM smavag_talar()")).rows[0].n;
      return { nRegel: Number(nRegel), nTalar: Number(nTalar), tRegel, tTalar: Date.now() - t };
    };
    const fore = await matt();
    await q("ANALYZE smavagspunkt"); await q("ANALYZE smavag_live"); await q("ANALYZE radar_smavag");
    const efter = await matt();
    for (const [namn, m] of [["före ANALYZE", fore], ["efter ANALYZE", efter]] as const) {
      assert.equal(m.nRegel, N, `SG5 ${namn}: en rad per punkt`);
      assert.ok(m.nTalar > N / 2 && m.nTalar < N, `SG5 ${namn}: ${m.nTalar} besked, N3 för hälften och radarn för en del av resten`);
      assert.ok(m.tRegel < 10000 && m.tTalar < 10000, `SG5 ${namn}: regeln ${m.tRegel} ms, beskeden ${m.tTalar} ms`);
    }
    assert.equal(fore.nTalar, efter.nTalar, "SG5: samma besked före och efter ANALYZE");
    const plan = (await q("EXPLAIN SELECT * FROM smavag_talar()")).rows.map((r: any) => r["QUERY PLAN"]).join("\n");
    await brytare(false, false);
    let t = Date.now();
    assert.equal(Number((await q("SELECT count(*) AS n FROM smavag_talar()")).rows[0].n), 0, "SG5: brytarna av ⇒ inga besked");
    const tAv = Date.now() - t;
    console.log(`SG5: ${N} punkter, ${efter.nTalar} besked; regeln ${fore.tRegel}/${efter.tRegel} ms och beskeden ${fore.tTalar}/${efter.tTalar} ms ` +
                `(före/efter ANALYZE), beskeden med brytarna av ${tAv} ms; planen ${plan.includes("InitPlan") ? "räknar timmen en gång (InitPlan)" : "är en funktionsskanning"}`);
  } finally {
    await q("DELETE FROM smavag_live").catch(() => {});
    await q("DELETE FROM smavag_korning").catch(() => {});
    await q("DELETE FROM radar_smavag").catch(() => {});
    await q("DELETE FROM smavagspunkt").catch(() => {});
    await q("UPDATE smavagsbrytare SET pa = false").catch(() => {});
    await pool.end();
  }
});

// SMÅVÄGSRÖSTENS AVFIL (sql/107, avbrottsvillkoren, DECISIONS #828), mot riktig PostGIS.
//   SA1  med båda brytarna på slår filen av båda, med tid och skäl; en andra körning ändrar inget; beskeden blir tomma
test("#828 småvägsröstens avfil: sql/107 slår av båda brytarna", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  try {
    await las("103_smavagspunkter.sql"); await las("104_radar_smavag.sql"); await las("105_smavagsregeln.sql");
    await q("UPDATE smavagsbrytare SET pa = true, skal = 'prov'");
    const r1 = await las("107_smavag_brytarna_av.sql");
    assert.equal(r1.rowCount, 2, "SA1: båda slås av");
    assert.deepEqual((await q("SELECT grupp, pa, skal FROM smavagsbrytare ORDER BY grupp")).rows,
      [{ grupp: "N", pa: false, skal: "av med sql/107 (DECISIONS #828)" }, { grupp: "P1", pa: false, skal: "av med sql/107 (DECISIONS #828)" }], "SA1: av med skäl");
    assert.equal((await las("107_smavag_brytarna_av.sql")).rowCount, 0, "SA1: en andra körning ändrar inget");
    assert.equal(Number((await q("SELECT count(*) AS n FROM smavag_talar()")).rows[0].n), 0, "SA1: inga besked");
  } finally {
    await q("UPDATE smavagsbrytare SET pa = false").catch(() => {});
    await pool.end();
  }
});

// SMÅVÄGSRÖSTENS PUNKTFIL OCH BESKED (sql/106, byggsteg 5b, DECISIONS #828), mot riktig PostGIS.
//   SF1  punktfilen skrivs i ordningen punkt COLLATE "C" med sha och storlekar; samma punkter en gång till ändrar inget
//   SF2  en ny punkt ger en ny sha och nollar i_hinken och i_github
//   SF3  bitarna i lägesfilen: brytarna av ⇒ ingen nyckel; P1 på ⇒ en bit för varje talande punkt på punktfilens plats
test("#828 småvägsröstens punktfil och besked i lägesfilen", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { SATS, punktfil } = await import("../ingest/smavagspunkter-db.ts");
  const { smavagBitar } = await import("../publish/snapshot-core.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  const skrivFil = async () => { const f = punktfil((await q(SATS.punktfilRader)).rows); await q(SATS.punktfil, [f.sha256, f.punkter, f.bytes, f.gz_bytes, f.json]); return f; };
  const rensa = async () => { for (const t of ["smavag_live", "smavag_korning", "radar_smavag", "smavagspunkt", "smavag_punktfil"]) await q(`DELETE FROM ${t}`); };
  try {
    await las("103_smavagspunkter.sql"); await las("104_radar_smavag.sql"); await las("105_smavagsregeln.sql");
    await las("106_smavag_punktfil.sql"); await las("106_smavag_punktfil.sql");
    await rensa(); await q("UPDATE smavagsbrytare SET pa = false");
    await q(`INSERT INTO smavagspunkt (punkt, grupp, vag, ordning, lon, lat) VALUES
      ('r00003', 'N', 'v00002', 0, 16.0, 61.0), ('r00001', 'P1', 'v00001', 0, 15.0, 60.0), ('r00002', 'P1', 'v00001', 1, 15.01, 60.0)`);
    const f1 = await skrivFil();
    assert.equal(f1.json, '{"schema":1,"punkter":[[15,60],[15.01,60],[16,61]]}', "SF1: lägena i id-ordning");
    const rad = async () => (await q("SELECT sha256, punkter, bytes, gz_bytes, i_hinken, i_github FROM smavag_punktfil")).rows[0];
    assert.deepEqual(await rad(), { sha256: f1.sha256, punkter: 3, bytes: f1.bytes, gz_bytes: f1.gz_bytes, i_hinken: null, i_github: null }, "SF1: raden");
    await q("UPDATE smavag_punktfil SET i_hinken = sha256, i_github = sha256");
    assert.equal((await q(SATS.punktfil, [f1.sha256, f1.punkter, f1.bytes, f1.gz_bytes, f1.json])).rowCount, 0, "SF1: samma fil ändrar inget");
    assert.equal((await rad()).i_hinken, f1.sha256, "SF1: hinkens sha står kvar");
    await q("INSERT INTO smavagspunkt (punkt, grupp, vag, ordning, lon, lat) VALUES ('r00004', 'P1', 'v00003', 0, 17.0, 62.0)");
    const f2 = await skrivFil();
    assert.ok(f2.sha256 !== f1.sha256 && (await rad()).i_hinken === null && (await rad()).i_github === null, "SF2: ny sha nollar hinken och kartrepot");
    // SF3: r00002 (P1) och r00003 (N) varnar i timmen; med P1 på talar bara r00002, på plats 1 i punktfilen.
    const t0 = (await q("SELECT date_trunc('hour', now()) AS t")).rows[0].t;
    await q("INSERT INTO smavag_live (tid, punkt, ned) VALUES ($1::timestamptz, 'r00002', true), ($1::timestamptz, 'r00003', true)", [t0]);
    await q("INSERT INTO smavag_korning (tid, punkter) VALUES ($1::timestamptz, 4)", [t0]);
    const bitar = async () => (await q(`SELECT p.i FROM (SELECT punkt, (row_number() OVER (ORDER BY punkt COLLATE "C") - 1)::int AS i FROM smavagspunkt) p
      JOIN smavag_talar() t ON t.punkt = p.punkt`)).rows.map((r: any) => r.i);
    assert.deepEqual(await bitar(), [], "SF3: brytarna av ⇒ inga besked");
    await q("UPDATE smavagsbrytare SET pa = (grupp = 'P1')");
    assert.deepEqual(await bitar(), [1], "SF3: P1 på ⇒ r00002 på plats 1");
    assert.equal(smavagBitar(await bitar(), 4), "Ag==", "SF3: bit 1");
  } finally {
    await rensa().catch(() => {});
    await q("UPDATE smavagsbrytare SET pa = false").catch(() => {});
    await pool.end();
  }
});

// SMÅVÄGSRÖSTENS TIMRADER (ingest/smavag-live-db.ts, sql/105, DECISIONS #828, kort #647), mot riktig PostGIS.
//   SL1  en timme skrivs med körningens rad, och regeln läser den
//   SL2  samma timme en gång till ersätter raderna och körningens antal
//   SL3  ett fel mitt i skrivningen lämnar timmen som den var (transaktionen)
//   SL4  gallringen tar rader äldre än sex timmar och låter körningsraderna stå
//   SL5  lagen läser punkterna i id-ordning
//   SL6  full skala: 90 000 rader på under 10 s, och en andra skrivning lämnar lika många
//   SL7  taktens underlag (kuvösen F55): regelns varnande punkter med N3 och radarns medel i biten, i id-ordning; den torra står inte
//        med; en timme som inte är regelns ger ingenting
test("#828 småvägsröstens timrader: skrivningen, omskrivningen och gallringen, i full skala", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const { SATS, skrivTimme, underlag } = await import("../ingest/smavag-live-db.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const c = await pool.connect();
  const q = (s: string, p: unknown[] = []) => c.query(s, p);
  const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  const antal = async (t: string) => Number((await q(`SELECT count(*) AS n FROM ${t}`)).rows[0].n);
  const rensa = async () => { for (const t of ["smavag_live", "smavag_korning", "radar_smavag", "smavagspunkt"]) await q(`DELETE FROM ${t}`); };
  try {
    await las("103_smavagspunkter.sql"); await las("104_radar_smavag.sql"); await las("105_smavagsregeln.sql");
    await rensa();
    const tid = (await q("SELECT to_char(date_trunc('hour', now()) AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:00:00\"Z\"') AS t")).rows[0].t as string;
    await q(`INSERT INTO smavagspunkt (punkt, grupp, vag, ordning, lon, lat) VALUES
      ('r99902', 'P1', 'v99001', 1, 15.01, 60), ('r99901', 'P1', 'v99001', 0, 15.00, 60), ('r99903', 'N', 'v99002', 0, 16.00, 61)`);
    await skrivTimme(c, tid, [{ punkt: "r99901", ned: true }, { punkt: "r99902", ned: false }], 3);
    const regel = async () => Object.fromEntries((await q("SELECT punkt, utfall FROM smavag_regel()")).rows.map((r: any) => [r.punkt, r.utfall]));
    assert.deepEqual(await regel(), { r99901: "varnar", r99902: "torr" }, "SL1: regeln läser timmen");
    assert.equal((await q("SELECT punkter FROM smavag_korning WHERE tid = $1", [tid])).rows[0].punkter, 3, "SL1: körningens antal");
    await skrivTimme(c, tid, [{ punkt: "r99902", ned: true }], 2);
    assert.deepEqual(await regel(), {}, "SL2: 2 av 3 punkter är under 95 %, så timmen räknas inte");
    await skrivTimme(c, tid, [{ punkt: "r99902", ned: true }], 3);
    assert.deepEqual(await regel(), { r99902: "varnar" }, "SL2: raderna ersatta");
    await assert.rejects(skrivTimme(c, tid, [{ punkt: "r99901", ned: true }, { punkt: "x", ned: true }], 3), undefined, "SL3: ett ogiltigt id vägras");
    assert.deepEqual(await regel(), { r99902: "varnar" }, "SL3: timmen är orörd efter felet");
    await q("INSERT INTO smavag_live (tid, punkt, ned) VALUES (now() - interval '7 hours', 'r99901', true), (now() - interval '5 hours', 'r99903', true)");
    await q("INSERT INTO smavag_korning (tid, punkter) VALUES (now() - interval '7 hours', 3)");
    await q(SATS.gallra);
    assert.equal(Number((await q("SELECT count(*) AS n FROM smavag_live WHERE tid < now() - interval '6 hours'")).rows[0].n), 0, "SL4: den gamla raden är borta");
    assert.equal(Number((await q("SELECT count(*) AS n FROM smavag_live WHERE punkt = 'r99903'")).rows[0].n), 1, "SL4: raden fem timmar bort står kvar");
    assert.equal(await antal("smavag_korning"), 2, "SL4: körningsraderna står kvar");
    assert.deepEqual((await q(SATS.lagen)).rows.map((r: any) => r.punkt), ["r99901", "r99902", "r99903"], "SL5: lägena i id-ordning");
    await q("DELETE FROM smavag_live");
    await skrivTimme(c, tid, [{ punkt: "r99902", ned: false }, { punkt: "r99901", ned: true }, { punkt: "r99903", ned: false }], 3);
    await q(`INSERT INTO radar_smavag (bit, observed_at, rate_max_mmh, rate_mean_mmh) VALUES ('v99001-0', now() - interval '10 minutes', 0.4, 0.2)`);
    assert.equal(await underlag(c, tid), "punkt,ned,radar_mmh\nr99901,1,0.2\nr99902,0,0.2\n", "SL7: N3 och radarn varnar, den torra står inte med");
    assert.equal(await underlag(c, new Date(Date.parse(tid) - 3600e3).toISOString().replace(".000Z", "Z")), null, "SL7: en annan timme ger ingenting");
    await rensa();
    const N = 90000;
    const alla = Array.from({ length: N }, (_, i) => ({ punkt: `r${String(i + 1).padStart(5, "0")}`, ned: i % 2 === 0 }));
    let t = Date.now();
    await skrivTimme(c, tid, alla, N);
    const t1 = Date.now() - t;
    t = Date.now();
    await skrivTimme(c, tid, alla, N);
    const t2 = Date.now() - t;
    assert.equal(await antal("smavag_live"), N, "SL6: en andra skrivning lämnar lika många rader");
    assert.ok(t1 < 10000 && t2 < 10000, `SL6: ${t1} och ${t2} ms`);
    console.log(`SL6: ${N} rader skrivna på ${t1} ms, en gång till på ${t2} ms`);
  } finally {
    for (const t of ["smavag_live", "smavag_korning", "radar_smavag", "smavagspunkt"]) await q(`DELETE FROM ${t}`).catch(() => {});
    c.release();
    await pool.end();
  }
});

// STORSTÄDERNAS REGEL (sql/091, DECISIONS #804, kort #378; halkvakt-kuvos F33): stadspunkterna i kandidatens regel, mot riktig PostGIS.
//   SR1  filen går att köra två gånger; den frystas och den nyas regel ger samma rader; vägpunkten varnar som förut
//   SR2  brytaren: B på talar med gruppen som sträcka, C av ger ingen rad, C på talar
//   SR3  fukten ur radar_stad på 60 minuter (utan rad torr, en rad 70 minuter gammal torr); ytan över noll ger ingen rad; F1 per punkt
//   SR4  marsfönstret, med provets klocka i mars och april 2027 (now() ur ett eget schema först i sökvägen): kl. 10–15 svensk tid
//        söder om 62° tyst, kl. 09 och 16 talar, norr om 62° talar, sommartiden räknas (29/3 08 UTC är 10 svensk tid), april talar
//   SR5  domloggen tar varken stadspunkterna bland stationerna eller deras grupper bland sträckorna, och har fast sökväg (#784)
//   SR6  stadsloggen för olycksfacit (#815)
//   SR7  brytarfilerna (#816): 098 slår av alla fyra; 097 vägrar utan 094:s timme i regeln och slår sedan på alla fyra, två gånger
test("#804 stadsregeln: brytarna, radarn, marsfönstret och domloggen", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  const LIVE = ["kandidat_live", "ny_kandidat_live"];
  // [UTC-timmen i provets klocka, väntat för punkten söder om 62°]: svensk tid är UTC+1 till 28/3 2027 och UTC+2 efter.
  const MARS: [string, string | undefined][] = [
    ["2027-03-10T08:00:00Z", "varnar"],    // 09 svensk tid
    ["2027-03-10T09:00:00Z", undefined],   // 10: fönstret börjar
    ["2027-03-10T14:00:00Z", undefined],   // 15: sista timmen i fönstret
    ["2027-03-10T15:00:00Z", "varnar"],    // 16: fönstret är slut
    ["2027-03-29T08:00:00Z", undefined],   // 10 sommartid; med UTC+1 hade det varit 09 och talat
    ["2027-04-01T09:00:00Z", "varnar"],    // 11 i april
  ];
  const PUNKTER = ["B99911", "B99912", "B99913", "B99914", "B99915", "C99911", "B99921", "B99922"];
  const GRUPPER = ["B-991-911", "B-991-912", "B-991-913", "C-991-911", "B-992-921", "B-992-922"];
  const brytare = (lager: string, pa: boolean) => q("UPDATE stadsbrytare SET pa = $2 WHERE omrade = 'Stor-Stockholm' AND lager = $1", [lager, pa]);
  const stad = async () => {
    await q("RESET search_path");
    await q("DROP SCHEMA IF EXISTS provtid CASCADE");
    for (const t of LIVE) await q(`DELETE FROM ${t} WHERE punkt = ANY($1) OR punkt LIKE 'vS%' OR tid = ANY($2::timestamptz[])`,
      [PUNKTER, MARS.map(([h]) => h)]).catch(() => {});
    await q("DELETE FROM ny_kandidat_station WHERE station_id = ANY($1)", [PUNKTER]).catch(() => {});
    await q("DELETE FROM ny_kandidat_skugga WHERE segment_id = ANY($1) OR segment_id LIKE '9995%'", [GRUPPER]).catch(() => {});
    await q("DELETE FROM radar_stad WHERE grupp = ANY($1)", [GRUPPER]).catch(() => {});
    await q("DELETE FROM ny_kandidat_skugga_stad WHERE grupp = ANY($1)", [GRUPPER]).catch(() => {});
    await q("DELETE FROM ny_kandidat_skugga_stad_korning WHERE korning > now() - interval '3 hours'").catch(() => {});
    await q("DELETE FROM stadspunkt WHERE punkt = ANY($1)", [PUNKTER]).catch(() => {});
    await q("UPDATE stadsbrytare SET pa = false").catch(() => {});
    await q("DELETE FROM vagpunkt WHERE punkt LIKE 'vS%'");
    await q("DELETE FROM road_conditions WHERE segment_id LIKE '9995%'");
  };
  const utfall = async (fn: string) => Object.fromEntries((await q(
    `SELECT punkt, segment_id, utfall FROM ${fn}() WHERE punkt = ANY($1) OR punkt LIKE 'vS%'`, [PUNKTER])).rows
    .map((r: any) => [r.punkt, `${r.utfall}@${r.segment_id}`]));
  try {
    await q("CREATE TABLE IF NOT EXISTS shadow_log (id bigserial PRIMARY KEY, run_at timestamptz NOT NULL DEFAULT now(), alerts jsonb NOT NULL DEFAULT '[]'::jsonb)");
    await q("DROP FUNCTION IF EXISTS kandidat_regel()");   // sql/056 har den äldre returtypen (som provet #800)
    for (const f of ["001_init.sql", "008_rain_sum.sql", "009_radar_precip.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql",
                     "029_brott_index.sql", "030_langsam_vakt.sql", "050_kandidat_live.sql", "053_arkiv_tabeller.sql", "055_vagpunkter.sql",
                     "056_kandidat_regel.sql", "057_kandidat_skugga.sql", "058_kandidat_spridning.sql", "059_kandidat_brytare.sql",
                     "065_kandidat_domlogg_punkter.sql", "068_ny_kandidat_skugga.sql", "069_radarns_tal.sql",
                     "086_spridningsparren_frys_min.sql", "087_spridningsparren_f1.sql", "089_stadspunkter.sql", "090_radar_stad.sql",
                     "091_stadsregeln.sql", "091_stadsregeln.sql",
                     "094_stadsgrenens_timme.sql", "094_stadsgrenens_timme.sql",   // stadsgrenens timme som underfråga (#813)
                     "096_olycksfacit_stad.sql", "096_olycksfacit_stad.sql"]) await las(f);   // stadsloggen för olycksfacit (#815)
    await stad();
    await q("DELETE FROM ny_kandidat_skugga_korning");   // som provet #692: domloggen räknar en timme en gång
    // Stadspunkterna: [punkt, grupp, lager, lat]. Långt från provens stationer (34° Ö).
    for (const [p, g, lager, lat] of [["B99911", "B-991-911", "B", 70], ["B99912", "B-991-912", "B", 70], ["B99913", "B-991-913", "B", 70],
                                      ["B99914", "B-991-911", "B", 70], ["B99915", "B-991-911", "B", 70], ["C99911", "C-991-911", "C", 70],
                                      ["B99921", "B-992-921", "B", 60], ["B99922", "B-992-922", "B", 70]] as const)
      await q("INSERT INTO stadspunkt (punkt, grupp, lager, omrade, lon, lat) VALUES ($1, $2, $3, 'Stor-Stockholm', 34, $4)", [p, g, lager, lat]);
    await q("INSERT INTO vagpunkt (punkt, segment_id, lon, lat) VALUES ('vS01', '99951', 34, 70)");
    await q("INSERT INTO road_conditions (segment_id, condition_code, condition_text, condition_info) VALUES ('99951', 1, 'Normalt', '{Våt}')");
    await q(`INSERT INTO radar_stad (grupp, observed_at, rate_max_mmh, rate_mean_mmh) VALUES
      ('B-991-911', now() - interval '10 minutes', 0.8, 0.5), ('C-991-911', now() - interval '10 minutes', 0.8, 0.5),
      ('B-991-913', now() - interval '70 minutes', 0.8, 0.5)`);
    const tid: Date = (await q("SELECT date_trunc('hour', now()) AS t")).rows[0].t;
    // [punkt, pb, n_ank, frys_min]
    const V: [string, number, number, number | null][] = [["vS01", -1, 1, 0], ["B99911", -1, 1, 0], ["B99912", -1, 1, 0], ["B99913", -1, 1, 0],
      ["B99914", 0.5, 1, 0], ["B99915", -1, 2, 0.5], ["C99911", -1, 1, 0]];
    for (const t of LIVE) {
      await q(`INSERT INTO ${t} (tid, punkt, pb) SELECT $1, v.punkt, 5 FROM vagpunkt v WHERE v.punkt NOT LIKE 'vS%' ON CONFLICT DO NOTHING`, [tid]);
      for (const [p, pb, n, fm] of V) await q(`INSERT INTO ${t} (tid, punkt, pb, n_ank, spr, frys_min, ank_km) VALUES ($1, $2, $3, $4, 1, $5, 4)`, [tid, p, pb, n, fm]);
    }
    const AV = { vS01: "varnar@99951" };
    assert.deepEqual(await utfall("ny_kandidat_regel"), AV, "SR2: brytarna av ⇒ bara vägpunkten");
    await brytare("B", true);
    const BPA = { ...AV, B99911: "varnar@B-991-911", B99912: "torr@B-991-912", B99913: "torr@B-991-913", B99915: "spridning@B-991-911" };
    assert.deepEqual(await utfall("ny_kandidat_regel"), BPA, "SR2/SR3: B på talar; utan radar och med 70 minuter gammal radar torr; pb > 0 ingen rad; F1 tystar");
    await brytare("C", true);
    const ALLA = { ...BPA, C99911: "varnar@C-991-911" };
    assert.deepEqual(await utfall("ny_kandidat_regel"), ALLA, "SR2: C på talar");
    assert.deepEqual(await utfall("kandidat_regel"), ALLA, "SR1: den frystas regel ger samma");
    const hela = (fn: string) => q(`SELECT * FROM ${fn}() WHERE punkt = ANY($1) OR punkt LIKE 'vS%' ORDER BY punkt`, [PUNKTER]).then((r) => r.rows);
    assert.deepEqual(await hela("ny_kandidat_regel"), await hela("kandidat_regel"), "SR1: samma rader, fält för fält");

    // SR6 (#815): stadsloggen för olycksfacit. Med B och C på skrivs varje grupp med kalla punkter, med regelns utfall, och körningen
    // med brytarna som var på.
    assert.equal((await q("SELECT ny_kandidat_logga_stad() AS m")).rows[0].m, "klart");
    const sl = Object.fromEntries((await q(`SELECT grupp, punkter, varnar, spridning, torr, fukt_punkter, fukt_utfall FROM ny_kandidat_skugga_stad
      WHERE observed_at = $1 AND grupp = ANY($2)`, [tid, GRUPPER])).rows.map((r: any) => [r.grupp, r]));
    assert.deepEqual([sl["B-991-911"].punkter, sl["B-991-911"].varnar, sl["B-991-911"].spridning], [2, 1, 1], "SR6: B99911 varnar, B99915 tystas av F1");
    assert.deepEqual(sl["B-991-911"].fukt_punkter, ["B99911", "B99915"]);
    assert.equal(sl["B-991-912"].torr, 1, "SR6: utan radar torr");
    assert.equal(sl["C-991-911"].varnar, 1, "SR6: C på");
    assert.deepEqual((await q("SELECT status, brytare FROM ny_kandidat_skugga_stad_korning ORDER BY korning DESC LIMIT 1")).rows[0],
      { status: "räknad", brytare: ["Stor-Stockholm/B", "Stor-Stockholm/C"] }, "SR6: körningen bär brytarna");

    // SR7 (#816): brytarfilerna. 098 slår av alla fyra, och bara vägpunkten varnar. Med regeln ur 091 (utan 094:s timme) vägrar 097
    // och ändrar ingenting; med 094 slår den på alla fyra, och B och C talar som i SR2.
    const paSlagna = async () => (await q("SELECT count(*)::int AS n FROM stadsbrytare WHERE pa")).rows[0].n;
    await las("098_brytarna_av.sql");
    assert.equal(await paSlagna(), 0, "SR7: 098 slår av alla");
    assert.deepEqual(await utfall("ny_kandidat_regel"), AV, "SR7: 098 ⇒ bara vägpunkten");
    await las("091_stadsregeln.sql");
    await assert.rejects(las("097_brytarna_pa.sql"), /saknar sql\/094/, "SR7: 097 vägrar utan 094");
    assert.equal(await paSlagna(), 0, "SR7: vägran ändrar ingenting");
    await las("094_stadsgrenens_timme.sql");
    await las("097_brytarna_pa.sql");
    await las("097_brytarna_pa.sql");
    assert.equal(await paSlagna(), 4, "SR7: 097 slår på alla fyra, och en andra körning ändrar ingenting");
    assert.deepEqual(await utfall("ny_kandidat_regel"), ALLA, "SR7: 097 ⇒ B och C talar");
    assert.deepEqual(await utfall("kandidat_regel"), ALLA, "SR7: den frystas regel ger samma");

    // SR5 (provets klocka är den riktiga här): domloggen.
    assert.match((await q("SELECT ny_kandidat_logga() AS m")).rows[0].m, /^kandidatens timme /);
    assert.equal((await q("SELECT count(*)::int AS n FROM ny_kandidat_station WHERE station_id = ANY($1)", [PUNKTER])).rows[0].n, 0,
      "SR5: inga stadspunkter bland stationerna");
    assert.deepEqual((await q("SELECT segment_id, varnar FROM ny_kandidat_skugga WHERE observed_at = $1 AND (segment_id = ANY($2) OR segment_id = '99951')",
      [tid, GRUPPER])).rows, [{ segment_id: "99951", varnar: 1 }], "SR5: vägpunktens sträcka loggas, stadsgrupperna inte");
    assert.deepEqual((await q("SELECT proconfig FROM pg_proc WHERE proname = 'ny_kandidat_logga'")).rows[0].proconfig,
      ["search_path=public, extensions"], "SR5: fast sökväg i definitionen (DECISIONS #784)");

    // SR4: marsfönstret. Varje timme får fullständiga vägpunkter (95 %-kravet) och de två stadspunkterna, med radar 20 minuter in.
    for (const [h] of MARS) {
      for (const t of LIVE) {
        await q(`INSERT INTO ${t} (tid, punkt, pb) SELECT $1, v.punkt, 5 FROM vagpunkt v ON CONFLICT DO NOTHING`, [h]);
        for (const p of ["B99921", "B99922"]) await q(`INSERT INTO ${t} (tid, punkt, pb, n_ank, spr, frys_min, ank_km) VALUES ($1, $2, -1, 1, 1, 0, 4)`, [h, p]);
      }
      await q(`INSERT INTO radar_stad (grupp, observed_at, rate_max_mmh, rate_mean_mmh) SELECT g, $1::timestamptz + interval '20 minutes', 0.8, 0.5
        FROM unnest(ARRAY['B-992-921', 'B-992-922']) g`, [h]);
    }
    await q("CREATE SCHEMA provtid");
    await q("CREATE FUNCTION provtid.now() RETURNS timestamptz LANGUAGE sql STABLE AS $$ SELECT current_setting('provtid.nu')::timestamptz $$");
    await q("SET search_path = provtid, pg_catalog, public");
    for (const [h, soder] of MARS) {
      const nu = new Date(Date.parse(h) + 30 * 60 * 1000).toISOString();
      await q("SELECT set_config('provtid.nu', $1, false)", [nu]);
      assert.equal((await q("SELECT now() AS t")).rows[0].t.toISOString(), nu, `SR4: provets klocka står på ${nu}`);
      const vantat: Record<string, string> = { B99922: "varnar@B-992-922" };
      if (soder) vantat.B99921 = `${soder}@B-992-921`;
      const fa = async (fn: string) => Object.fromEntries(Object.entries(await utfall(fn)).filter(([p]) => p === "B99921" || p === "B99922"));
      assert.deepEqual(await fa("ny_kandidat_regel"), vantat, `SR4: ${h}`);
      assert.deepEqual(await fa("kandidat_regel"), vantat, `SR4: ${h}, den frystas regel`);
    }
  } finally {
    await stad().catch(() => {});
    await pool.end();
  }
});

// DEN SNABBA SKUGGAN PÅ DEN GÄLLANDE REGELN (sql/080 efter sql/087 och sql/091; väg (a), DECISIONS #808, kort #373): härledningen
// går igenom på regeln med F1 och stadsgrenen, den snabba lånar timvärdets frys_min för samma punkt, och mätningen går igen.
//   SN1  sql/080 går att köra två gånger efter sql/091, och den härledda regeln läser ny_kandidat_snabb i båda grenarna
//   SN2  timmens tabell står bara kvar i lånet av frys_min
//   SN3  samma kalla och våta punkter: frys_min 0,5 i timvärdet tystar den snabba (spridning), 0 gör det inte; stadsgrenen likadant
//   SN4  kandidat_snabb_skugga() mäter (kontrollsumman stämmer)
test("#808 den snabba skuggan: härledningen på regeln med F1 och stadsgrenen", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  const LAN = "LEFT JOIN ny_kandidat_live h ON h.punkt = l.punkt AND h.tid = (SELECT ny_kandidat_timme())";
  const stad = async () => {
    await q("DELETE FROM ny_kandidat_snabb").catch(() => {});
    await q("DELETE FROM ny_kandidat_live WHERE punkt LIKE 'vQ%' OR punkt = 'B99931'").catch(() => {});
    await q("DELETE FROM radar_stad WHERE grupp = 'B-993-931'").catch(() => {});
    await q("DELETE FROM stadspunkt WHERE punkt = 'B99931'").catch(() => {});
    await q("UPDATE stadsbrytare SET pa = false").catch(() => {});
    await q("DELETE FROM vagpunkt WHERE punkt LIKE 'vQ%'");
    await q("DELETE FROM road_conditions WHERE segment_id LIKE '9998%'");
  };
  try {
    await q("CREATE TABLE IF NOT EXISTS shadow_log (id bigserial PRIMARY KEY, run_at timestamptz NOT NULL DEFAULT now(), alerts jsonb NOT NULL DEFAULT '[]'::jsonb)");
    await q("DROP FUNCTION IF EXISTS kandidat_regel()");   // sql/056 har den äldre returtypen (som provet #800)
    for (const f of ["001_init.sql", "008_rain_sum.sql", "009_radar_precip.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql",
                     "029_brott_index.sql", "030_langsam_vakt.sql", "050_kandidat_live.sql", "053_arkiv_tabeller.sql", "055_vagpunkter.sql",
                     "056_kandidat_regel.sql", "057_kandidat_skugga.sql", "058_kandidat_spridning.sql", "059_kandidat_brytare.sql",
                     "065_kandidat_domlogg_punkter.sql", "068_ny_kandidat_skugga.sql", "069_radarns_tal.sql",
                     "086_spridningsparren_frys_min.sql", "087_spridningsparren_f1.sql", "089_stadspunkter.sql", "090_radar_stad.sql",
                     "091_stadsregeln.sql", "078_kandidat_snabb.sql", "080_kandidat_snabb_skugga.sql",   // 080 på 091:s text, sedan på 094 (#813)
                     "094_stadsgrenens_timme.sql", "080_kandidat_snabb_skugga.sql", "080_kandidat_snabb_skugga.sql"]) await las(f);
    await stad();
    const def = (await q("SELECT pg_get_functiondef('ny_kandidat_regel_snabb()'::regprocedure) AS d")).rows[0].d as string;
    assert.ok(def.includes(`FROM ny_kandidat_snabb l JOIN vagpunkt v ON v.punkt = l.punkt ${LAN}`), "SN1: vägpunkterna ur den snabba, med lånet");
    assert.ok(def.includes(`FROM ny_kandidat_snabb l JOIN stadspunkt s ON s.punkt = l.punkt ${LAN}`), "SN1: stadsgrenen ur den snabba, med lånet");
    assert.ok(def.includes("h.frys_min, v.geom") && def.includes("h.frys_min, s.geom"), "SN1: frys_min ur lånet i båda grenarna");
    const utanLan = def.split(LAN).join("");
    assert.ok(!utanLan.includes("ny_kandidat_live") && !utanLan.includes("ny_kandidat_timme"), "SN2: timmens tabell bara i lånet");

    await q("INSERT INTO vagpunkt (punkt, segment_id, lon, lat) VALUES ('vQ01', '99981', 35, 70), ('vQ02', '99982', 35, 70)");
    await q(`INSERT INTO road_conditions (segment_id, condition_code, condition_text, condition_info) VALUES
      ('99981', 1, 'Normalt', '{Våt}'), ('99982', 1, 'Normalt', '{Våt}')`);
    await q("INSERT INTO stadspunkt (punkt, grupp, lager, omrade, lon, lat) VALUES ('B99931', 'B-993-931', 'B', 'Stor-Stockholm', 35, 70)");
    await q("INSERT INTO radar_stad (grupp, observed_at, rate_max_mmh, rate_mean_mmh) VALUES ('B-993-931', now() - interval '10 minutes', 0.8, 0.5)");
    await q("UPDATE stadsbrytare SET pa = true WHERE omrade = 'Stor-Stockholm' AND lager = 'B'");
    const tid: Date = (await q("SELECT date_trunc('hour', now()) AS t")).rows[0].t;
    await q("INSERT INTO ny_kandidat_live (tid, punkt, pb) SELECT $1, v.punkt, 5 FROM vagpunkt v WHERE v.punkt NOT LIKE 'vQ%' ON CONFLICT DO NOTHING", [tid]);
    for (const [p, fm] of [["vQ01", 0.5], ["vQ02", 0], ["B99931", 0.5]] as const) {
      await q("INSERT INTO ny_kandidat_live (tid, punkt, pb, n_ank, spr, frys_min, ank_km) VALUES ($1, $2, -1, 2, 1, $3, 4)", [tid, p, fm]);
      await q("INSERT INTO ny_kandidat_snabb (punkt, tid, raknad, pb, n_ank, spr) VALUES ($1, $2, now(), -1.5, 2, 1)", [p, tid]);
    }
    const utfall = async (fn: string) => Object.fromEntries((await q(
      `SELECT punkt, utfall FROM ${fn}() WHERE punkt LIKE 'vQ%' OR punkt = 'B99931'`)).rows.map((r: any) => [r.punkt, r.utfall]));
    const VANTAT = { vQ01: "spridning", vQ02: "varnar", B99931: "spridning" };
    assert.deepEqual(await utfall("ny_kandidat_regel_snabb"), VANTAT, "SN3: den snabba lånar timvärdets frys_min per punkt");
    assert.deepEqual(await utfall("ny_kandidat_regel"), VANTAT, "SN3: timvärdet ger samma utfall");
    assert.equal((await q("SELECT kandidat_snabb_skugga() AS s")).rows[0].s, "mätt", "SN4: mätningen går");
  } finally {
    await stad().catch(() => {});
    await pool.end();
  }
});

// STORSTÄDERNAS PUNKTER I KEDJAN (ingest/stadskedjan.ts, DECISIONS #804, kort #378), mot riktig PostGIS:
//   SK1  ph: del A:s rader med pilotens id (s00000 …) står i ny_kandidat_ph med driftens id, och en andra skrivning uppdaterar dem
//   SK2  ph med flaggan av skriver ingenting
//   SK3  lagen: stadspunkternas lägen ur stadspunkt, i del B:s form (sid, lat, lon)
test("#804 stadskedjan: PH med driftens id och lägena för del B", { skip: !url }, async () => {
  process.env.DATABASE_URL = url;
  const { default: pg } = await import("pg");
  const { createHash } = await import("node:crypto");
  const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
  const { gzipSync } = await import("node:zlib");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");
  const { skrivPh, lagen } = await import("../ingest/stadskedjan.ts");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  const rot = mkdtempSync(join(tmpdir(), "stadskedjan-"));
  const T = ["2031-01-01T06:00:00Z", "2031-01-01T07:00:00Z"];
  const stad = async () => {
    await q("DELETE FROM ny_kandidat_ph WHERE punkt IN ('B99941', 'C99941')").catch(() => {});
    await q("DELETE FROM stadspunkt WHERE punkt IN ('B99941', 'C99941')").catch(() => {});
  };
  try {
    if (!(await q("SELECT to_regclass('ny_kandidat_ph') AS t")).rows[0].t) await las("068_ny_kandidat_skugga.sql");
    await las("089_stadspunkter.sql");
    await stad();
    const pilot = JSON.stringify({ rader: [{ id: "B99941" }, { id: "C99941" }] });
    const fil = (n: string, s: string) => { const f = join(rot, n); writeFileSync(f, s); return f; };
    const pilotFil = fil("pilot.json", pilot);
    const listaFil = fil("lista.json", JSON.stringify({ kalla: { sha256: createHash("sha256").update(pilot).digest("hex") },
      rader: [{ punkt: "B99941" }, { punkt: "C99941" }] }));
    const pa = fil("pa.json", JSON.stringify({ skriv: true, paritet: { klarat: true, korning: "123456" } }));
    const av = fil("av.json", JSON.stringify({ skriv: false }));
    const ph = (n: string, tid: string, a: number, b: number) => {
      const f = join(rot, n);
      writeFileSync(f, gzipSync(`punkt,korning_utc,tid_utc,ts_fysik,ph\ns00000,2031-01-01T00:00:00Z,${tid},0,${a}\ns00001,2031-01-01T00:00:00Z,${tid},0,${b}\n`));
      return f;
    };
    const rader = async (tid: string) => (await q("SELECT punkt, ph FROM ny_kandidat_ph WHERE tid = $1 AND punkt IN ('B99941', 'C99941') ORDER BY punkt", [tid])).rows;
    await skrivPh([ph("a.csv.gz", T[0], -1.5, 2)], pilotFil, listaFil, pa);
    assert.deepEqual(await rader(T[0]), [{ punkt: "B99941", ph: -1.5 }, { punkt: "C99941", ph: 2 }], "SK1: driftens id");
    await skrivPh([ph("b.csv.gz", T[0], -2.5, 2)], pilotFil, listaFil, pa);
    assert.equal((await rader(T[0]))[0].ph, -2.5, "SK1: en andra skrivning uppdaterar");
    await skrivPh([ph("c.csv.gz", T[1], -1, -1)], pilotFil, listaFil, av);
    assert.deepEqual(await rader(T[1]), [], "SK2: flaggan av skriver ingenting");
    await q("INSERT INTO stadspunkt (punkt, grupp, lager, omrade, lon, lat) VALUES ('B99941', 'B-994-941', 'B', 'Stor-Stockholm', 18.05, 59.33)");
    const ut = join(rot, "punkter.csv");
    await lagen(ut);
    const t = readFileSync(ut, "utf8").split("\n");
    assert.equal(t[0], "sid,lat,lon", "SK3: del B:s rubrik");
    assert.ok(t.includes("B99941,59.33,18.05"), "SK3: stadspunktens läge");
  } finally {
    await stad().catch(() => {});
    await pool.end();
    rmSync(rot, { recursive: true, force: true });
  }
});

// SKUGGANS KANDIDATPUNKTER I ETT ENDA VÄRDE (sql/093, kort #374, DECISIONS #812): REST lämnar högst 1000 rader per svar, och skuggans
// lista stod på exakt 1000 i 265 körningar 31/10–7/11. skuggans_kandidat() lämnar den talande regelns varnande punkter som en json.
//   KS1  fler än 1000 varnande punkter kommer alla med, i samma antal som talande_regel() ger, och filen går att köra två gånger
//   KS2  timmen och talaren står med, och funktionen har ingen SET-klausul (en sql-funktion, CLAUDE.md och #784)
test("#812 skuggans kandidat: alla varnande punkter i ett värde", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  const LIVE = ["kandidat_live", "ny_kandidat_live"];
  const N = 1200;
  const stada = async () => {
    for (const t of LIVE) await q(`DELETE FROM ${t} WHERE punkt LIKE 'vK%'`).catch(() => {});
    await q("DELETE FROM vagpunkt WHERE punkt LIKE 'vK%'").catch(() => {});
    await q("DELETE FROM road_conditions WHERE segment_id = '99961'").catch(() => {});
  };
  try {
    await q("RESET search_path");
    await q("CREATE TABLE IF NOT EXISTS shadow_log (id bigserial PRIMARY KEY, run_at timestamptz NOT NULL DEFAULT now(), alerts jsonb NOT NULL DEFAULT '[]'::jsonb)");
    await q("DROP FUNCTION IF EXISTS kandidat_regel()");   // sql/056 har den äldre returtypen (som proven #800 och #804)
    for (const f of ["001_init.sql", "008_rain_sum.sql", "009_radar_precip.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql",
                     "029_brott_index.sql", "030_langsam_vakt.sql", "050_kandidat_live.sql", "053_arkiv_tabeller.sql", "055_vagpunkter.sql",
                     "056_kandidat_regel.sql", "057_kandidat_skugga.sql", "058_kandidat_spridning.sql", "059_kandidat_brytare.sql",
                     "065_kandidat_domlogg_punkter.sql", "068_ny_kandidat_skugga.sql", "069_radarns_tal.sql",
                     "086_spridningsparren_frys_min.sql", "087_spridningsparren_f1.sql", "089_stadspunkter.sql", "090_radar_stad.sql",
                     "091_stadsregeln.sql", "070_bytet.sql", "093_skuggans_kandidat.sql", "093_skuggans_kandidat.sql"]) await las(f);
    await stada();
    // N vägpunkter på en våt sträcka långt från provens stationer (34° Ö), alla kalla: alla varnar.
    await q(`INSERT INTO vagpunkt (punkt, segment_id, lon, lat) SELECT 'vK' || lpad(g::text, 4, '0'), '99961', 34 + g * 0.0001, 70
      FROM generate_series(1, $1::int) g`, [N]);
    await q("INSERT INTO road_conditions (segment_id, condition_code, condition_text, condition_info) VALUES ('99961', 1, 'Normalt', '{Våt}')");
    const tid: Date = (await q("SELECT date_trunc('hour', now()) AS t")).rows[0].t;
    for (const t of LIVE) {
      await q(`INSERT INTO ${t} (tid, punkt, pb) SELECT $1, v.punkt, 5 FROM vagpunkt v WHERE v.punkt NOT LIKE 'vK%' ON CONFLICT DO NOTHING`, [tid]);
      await q(`INSERT INTO ${t} (tid, punkt, pb, n_ank, spr, frys_min, ank_km)
        SELECT $1, v.punkt, -1, 1, 1, 0, 4 FROM vagpunkt v WHERE v.punkt LIKE 'vK%'`, [tid]);
    }
    const vk = (await q("SELECT count(*)::int AS n FROM talande_regel() WHERE utfall = 'varnar' AND punkt LIKE 'vK%'")).rows[0].n;
    assert.equal(vk, N, "KS1: provets punkter varnar i den talande regeln");
    const n = (await q("SELECT count(*)::int AS n FROM talande_regel() WHERE utfall = 'varnar'")).rows[0].n;
    const j = (await q("SELECT skuggans_kandidat() AS j")).rows[0].j;
    assert.equal(j.n, n, "KS1: antalet är regelns");
    assert.equal(j.p.length, n, "KS1: alla punkter med, fler än REST:s 1000");
    assert.equal(j.p.filter((p: any) => p.segment_id === "99961").length, N, "KS1: provets sträcka med alla sina punkter");
    assert.ok(typeof j.p[0].lon === "number" && typeof j.p[0].lat === "number", "KS1: lägena är tal");
    assert.equal(new Date(j.tid).getTime(), tid.getTime(), "KS2: timmen");
    assert.ok(["ny", "fryst"].includes(j.talare), "KS2: talaren");
    assert.equal((await q("SELECT proconfig FROM pg_proc WHERE proname = 'skuggans_kandidat'")).rows[0].proconfig, null,
      "KS2: ingen SET-klausul");
  } finally {
    await stada();
    await pool.end();
  }
});

// OLYCKSFACITS K-LAGER LÄSER DEN TIMME KANDIDATEN TALADE MED (sql/095, DECISIONS #814; TROSKLAR-OLYCKSFACIT §9.1). Varje fall är en
// fälla som ger ett annat svar med den gamla regeln (sträckans senaste skrivna timme, hur gammal den än var):
//   KT1  sträckan varnade för sju timmar sedan och saknas i timmen som talade → K tyst, "yta över 0" (förut: varnar)
//   KT2  sträckan varnar i timmen som talade → K varnar, VARNADE
//   KT3  den senaste körningen före olyckan var tyst → "ingen timme" (förut: den gamla timmens utfall)
//   KT4  omräkningen: en rad fångad med den gamla regeln räknas om när 095 körs, utfallet följer med, och en andra körning ändrar inget
test("#814 olycksfacit: K-lagret läser timmen som talade vid olyckan, och omräkningen", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  const nord = (km: number) => 73 + km / 111.2;
  const stad = async () => {
    await q("DELETE FROM olycksfacit WHERE deviation_id LIKE 'KT%'").catch(() => {});
    await q("DELETE FROM situation_archive WHERE deviation_id LIKE 'KT%'");
    await q("DELETE FROM ny_kandidat_skugga WHERE segment_id LIKE '9998%'");
    await q("DELETE FROM ny_kandidat_skugga_korning WHERE korning > now() - interval '12 hours'").catch(() => {});
    await q("DELETE FROM ny_kandidat_live WHERE punkt LIKE 'vT%'");
    await q("DELETE FROM vagpunkt WHERE punkt LIKE 'vT%'");
    await q("DELETE FROM road_condition_history WHERE segment_id LIKE '9998%'");
    await q("DELETE FROM road_conditions WHERE segment_id LIKE '9998%'");
  };
  try {
    await q("CREATE TABLE IF NOT EXISTS shadow_log (id bigserial PRIMARY KEY, run_at timestamptz NOT NULL DEFAULT now(), alerts jsonb NOT NULL DEFAULT '[]'::jsonb)");
    if (!(await q("SELECT 1 FROM information_schema.columns WHERE table_name = 'kandidat_skugga' AND column_name = 'fukt_pb'")).rowCount) {
      await q("DROP FUNCTION IF EXISTS kandidat_regel()");
      for (const f of ["001_init.sql", "008_rain_sum.sql", "009_radar_precip.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql",
                       "029_brott_index.sql", "030_langsam_vakt.sql", "050_kandidat_live.sql", "052_kandidat_gallring_kort.sql", "053_arkiv_tabeller.sql",
                       "055_vagpunkter.sql", "056_kandidat_regel.sql", "057_kandidat_skugga.sql", "058_kandidat_spridning.sql",
                       "065_kandidat_domlogg_punkter.sql"]) await las(f);
    }
    for (const f of ["003_situation_archive.sql", "068_ny_kandidat_skugga.sql", "084_olycksfacit.sql", "085_olycksfacit_klassning.sql",
                     "095_olycksfacit_k_timmen.sql"]) await las(f);
    await stad();
    assert.deepEqual((await q("SELECT proconfig FROM pg_proc WHERE proname = 'olycksfacit_k'")).rows[0].proconfig,
      ["search_path=public, extensions"], "fast sökväg i definitionen (DECISIONS #784)");
    // Tre sträckor kring 73° N med var sin punkt 0,5 km från sin olycka. Väglaget Normalt, så att bara K kan varna.
    for (const [seg, lon] of [["99981", 51], ["99982", 52], ["99983", 53]] as const) {
      await q(`INSERT INTO road_conditions (segment_id, condition_code, condition_text, condition_info, road_number, geom, modified_time) VALUES
        ($1, 1, 'Normalt', '{Våt}', 'Väg 1', ST_SetSRID(ST_MakeLine(ST_MakePoint($2, $3), ST_MakePoint($2, $4)), 4326), now() - interval '9 hours')`,
        [seg, lon, nord(0), nord(5)]);
      await q("INSERT INTO road_condition_history (segment_id, condition_code, condition_text, condition_info, modified_time) VALUES ($1, 1, 'Normalt', '{Våt}', now() - interval '9 hours')", [seg]);
      await q("INSERT INTO vagpunkt (punkt, segment_id, lon, lat) VALUES ($1, $2, $3, $4)", [`vT${seg.slice(-1)}`, seg, lon, nord(1.5)]);
    }
    const rad = (seg: string, obs: string, skr: string, varnar: boolean) => q(`INSERT INTO ny_kandidat_skugga (segment_id, observed_at,
      skriven_at, punkter, varnar, veto, torr, vat, flackvis_vat, pb_min, spridning, fukt_punkter, fukt_utfall) VALUES
      ($1, ${obs}, ${skr}, 1, $2, 0, 0, true, false, -1.5, 0, ARRAY[$3], ARRAY[$4])`,
      [seg, varnar ? 1 : 0, `vT${seg.slice(-1)}`, varnar ? "varnar" : "torr"]);
    // Sju timmar sedan: 99981 och 99983 varnade. Timmen som talar nu (skriven för 32 minuter sedan): bara 99982 är kall och varnar.
    const GAMMAL = "date_trunc('hour', now()) - interval '7 hours'", GSKR = "now() - interval '6 hours 13 minutes'";
    await q(`INSERT INTO ny_kandidat_skugga_korning (korning, observed_at, status) VALUES (${GSKR}, ${GAMMAL}, 'räknad')`);
    await rad("99981", GAMMAL, GSKR, true); await rad("99983", GAMMAL, GSKR, true);
    await q(`INSERT INTO ny_kandidat_skugga_korning (korning, observed_at, status) VALUES (now() - interval '32 minutes', date_trunc('hour', now() - interval '35 minutes'), 'räknad')`);
    await rad("99982", "date_trunc('hour', now() - interval '35 minutes')", "now() - interval '32 minutes'", true);
    await q(`INSERT INTO situation_archive (deviation_id, message_type_value, message, severity_code, road_number, geom, start_time) VALUES
      ('KT1', 'Accident', 'Singelolycka', 4, 'Väg 1', ST_SetSRID(ST_MakePoint(51, $1), 4326), now() - interval '20 minutes'),
      ('KT2', 'Accident', 'Singelolycka', 4, 'Väg 1', ST_SetSRID(ST_MakePoint(52, $1), 4326), now() - interval '20 minutes')`, [nord(1.0)]);
    await q("SELECT olycksfacit_fanga()");
    const lager = async (id: string) => Object.fromEntries((await q("SELECT lager, talar, orsak, detalj FROM olycksfacit_lager WHERE deviation_id = $1", [id])).rows
      .map((r: any) => [r.lager, r]));
    const olycka = async (id: string) => (await q("SELECT utfall, orsaker FROM olycksfacit WHERE deviation_id = $1", [id])).rows[0];
    const k1 = (await lager("KT1")).K;
    assert.equal(k1.talar, false, "KT1: varningen för sju timmar sedan räknas inte");
    assert.equal(k1.orsak, "yta över 0", "KT1: sträckan saknas i timmen som talade");
    assert.equal(k1.detalj.timregel, "#814");
    assert.deepEqual(await olycka("KT1"), { utfall: "TYST_TACKT", orsaker: ["A1: väglaget Normalt", "K: yta över 0", "A2: ingen station inom 5 km"] });
    const k2 = (await lager("KT2")).K;
    assert.equal(k2.talar, true, "KT2: sträckan varnar i timmen som talade");
    assert.equal(new Date(k2.detalj.timme).getTime(), (await q("SELECT date_trunc('hour', now() - interval '35 minutes') AS t")).rows[0].t.getTime());
    assert.equal((await olycka("KT2")).utfall, "VARNADE");

    // KT3: den senaste körningen före olyckan var tyst (kedjan gammal), fast 99983 har en äldre varnande rad.
    await q(`INSERT INTO ny_kandidat_skugga_korning (korning, observed_at, status) VALUES (now() - interval '15 minutes', date_trunc('hour', now() - interval '35 minutes'), 'tyst')`);
    await q(`INSERT INTO situation_archive (deviation_id, message_type_value, message, severity_code, road_number, geom, start_time) VALUES
      ('KT3', 'Accident', 'Singelolycka', 4, 'Väg 1', ST_SetSRID(ST_MakePoint(53, $1), 4326), now() - interval '10 minutes')`, [nord(1.0)]);
    await q("SELECT olycksfacit_fanga()");
    const k3 = (await lager("KT3")).K;
    assert.equal(k3.talar, false); assert.equal(k3.orsak, "ingen timme", "KT3: regeln teg, timmen var inte räknad");

    // KT4: en rad som den gamla fångsten skrev den (K varnar ur timmen för sju timmar sedan, inget märke). 095 räknar om den.
    await q(`INSERT INTO olycksfacit (deviation_id, start_time, message, road_number, severity_code, geom, utfall, orsaker)
             VALUES ('KT4', now() - interval '20 minutes', 'Singelolycka', 'Väg 1', 4, ST_SetSRID(ST_MakePoint(53, $1), 4326), 'VARNADE', '{}')`, [nord(1.0)]);
    await q(`INSERT INTO olycksfacit_lager (deviation_id, lager, talar, orsak, detalj) VALUES
      ('KT4', 'A1', false, 'väglaget Normalt', '{}'), ('KT4', 'A2', false, 'ingen station inom 5 km', '{"rimfrost": true}'),
      ('KT4', 'tackning', NULL, 'täckt', '{}'),
      ('KT4', 'K', true, 'varnar', jsonb_build_object('punkt', 'vT3', 'segment', '99983', 'km', 0.5, 'timme', ${GAMMAL}, 'varnande_km', 0.5))`);
    await las("095_olycksfacit_k_timmen.sql");
    const k4 = (await lager("KT4")).K;
    assert.equal(k4.talar, false, "KT4: omräknad");
    assert.equal(k4.orsak, "yta över 0", "KT4: 99983 saknas i timmen som talade 20 minuter före nu");
    assert.equal(k4.detalj.fore.talar, true, "KT4: det fångsten skrev före står kvar");
    assert.deepEqual(await olycka("KT4"), { utfall: "TYST_TACKT", orsaker: ["A1: väglaget Normalt", "K: yta över 0", "A2: ingen station inom 5 km", "rimfrost"] });
    const omraknad = k4.detalj.omraknad;
    await las("095_olycksfacit_k_timmen.sql");
    assert.equal((await lager("KT4")).K.detalj.omraknad, omraknad, "KT4: en andra körning räknar inte om");
    assert.equal((await lager("KT1")).K.detalj.omraknad, undefined, "fångster med den nya regeln räknas inte om");
  } finally {
    await stad().catch(() => {});
    await pool.end();
  }
});

// OLYCKSFACIT FÖR STORSTÄDERNAS PUNKTER (sql/096, DECISIONS #815). Domloggen tar inte storstädernas grupper (#804), så K-lagret läser
// stadsloggen vid närmaste stadspunkt inom 2 km, med samma timregel som #814. Fallen ligger kring 74° N, långt från alla vägpunkter:
//   OS1  brytaren var av vid olyckan → K "ingen vägpunkt" som förut, stadsdetaljen "brytaren av", otäckt
//   OS2  brytaren på och gruppen varnar i timmen som talade → K varnar, VARNADE och täckt
//   OS3  brytaren på och gruppen saknas i timmen → K "yta över 0", tyst men täckt
//   OS4  alla brytare av → stadsloggen räknar inte regeln, och körningen loggas som av
test("#815 olycksfacit för storstäderna: K-lagret läser stadsloggen vid närmaste stadspunkt", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  const nord = (km: number) => 74 + km / 111.2;
  const stad = async () => {
    await q("DELETE FROM olycksfacit WHERE deviation_id LIKE 'OS%'").catch(() => {});
    await q("DELETE FROM situation_archive WHERE deviation_id LIKE 'OS%'");
    await q("DELETE FROM ny_kandidat_skugga_stad WHERE grupp LIKE 'B-996-%'").catch(() => {});
    await q("DELETE FROM ny_kandidat_skugga_stad_korning WHERE korning > now() - interval '12 hours'").catch(() => {});
    await q("DELETE FROM stadspunkt WHERE punkt LIKE 'B9996%'").catch(() => {});
    await q("UPDATE stadsbrytare SET pa = false").catch(() => {});
  };
  try {
    await q("CREATE TABLE IF NOT EXISTS shadow_log (id bigserial PRIMARY KEY, run_at timestamptz NOT NULL DEFAULT now(), alerts jsonb NOT NULL DEFAULT '[]'::jsonb)");
    if (!(await q("SELECT 1 FROM information_schema.columns WHERE table_name = 'kandidat_skugga' AND column_name = 'fukt_pb'")).rowCount) {
      await q("DROP FUNCTION IF EXISTS kandidat_regel()");
      for (const f of ["001_init.sql", "008_rain_sum.sql", "009_radar_precip.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql",
                       "029_brott_index.sql", "030_langsam_vakt.sql", "050_kandidat_live.sql", "052_kandidat_gallring_kort.sql", "053_arkiv_tabeller.sql",
                       "055_vagpunkter.sql", "056_kandidat_regel.sql", "057_kandidat_skugga.sql", "058_kandidat_spridning.sql",
                       "065_kandidat_domlogg_punkter.sql"]) await las(f);
    }
    for (const f of ["003_situation_archive.sql", "068_ny_kandidat_skugga.sql", "084_olycksfacit.sql", "085_olycksfacit_klassning.sql",
                     "095_olycksfacit_k_timmen.sql", "089_stadspunkter.sql", "096_olycksfacit_stad.sql", "096_olycksfacit_stad.sql"]) await las(f);
    await stad();
    for (const f of ["olycksfacit_k_stad", "ny_kandidat_logga_stad"])
      assert.deepEqual((await q("SELECT proconfig FROM pg_proc WHERE proname = $1", [f])).rows[0].proconfig,
        ["search_path=public, extensions"], `${f}: fast sökväg i definitionen (DECISIONS #784)`);
    assert.deepEqual((await q("SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('ny_kandidat_skugga_stad', 'ny_kandidat_skugga_stad_korning') ORDER BY relname")).rows,
      [{ relname: "ny_kandidat_skugga_stad", relrowsecurity: true }, { relname: "ny_kandidat_skugga_stad_korning", relrowsecurity: true }]);
    // Tre stadspunkter i var sin grupp, 0,5 km från sin olycka.
    for (const [p, lon] of [["B99961", 55], ["B99962", 56], ["B99963", 57]] as const)
      await q("INSERT INTO stadspunkt (punkt, grupp, lager, omrade, lon, lat) VALUES ($1, $2, 'B', 'Stor-Stockholm', $3, $4)",
        [p, `B-996-${p.slice(-3)}`, lon, nord(1.5)]);
    // Körningarna: av för 50 minuter sedan, sedan räknad med B på i timmen som talar nu. Bara gruppen 962 är kall och varnar.
    await q(`INSERT INTO ny_kandidat_skugga_stad_korning (korning, observed_at, status, brytare) VALUES
      (now() - interval '50 minutes', date_trunc('hour', now() - interval '60 minutes'), 'av', '[]'),
      (now() - interval '32 minutes', date_trunc('hour', now() - interval '35 minutes'), 'räknad', '["Stor-Stockholm/B"]')`);
    await q(`INSERT INTO ny_kandidat_skugga_stad (grupp, observed_at, skriven_at, omrade, lager, punkter, varnar, veto, torr, spridning, pb_min,
      fukt_punkter, fukt_utfall) VALUES ('B-996-962', date_trunc('hour', now() - interval '35 minutes'), now() - interval '32 minutes', 'Stor-Stockholm', 'B', 1, 1, 0, 0, 0, -1.2, '{B99962}', '{varnar}')`);
    await q(`INSERT INTO situation_archive (deviation_id, message_type_value, message, severity_code, road_number, geom, start_time) VALUES
      ('OS1', 'Accident', 'Singelolycka', 4, NULL, ST_SetSRID(ST_MakePoint(55, $1), 4326), now() - interval '45 minutes'),
      ('OS2', 'Accident', 'Singelolycka', 4, NULL, ST_SetSRID(ST_MakePoint(56, $1), 4326), now() - interval '20 minutes'),
      ('OS3', 'Accident', 'Singelolycka', 4, NULL, ST_SetSRID(ST_MakePoint(57, $1), 4326), now() - interval '20 minutes')`, [nord(1.0)]);
    await q("SELECT olycksfacit_fanga()");
    const lager = async (id: string) => Object.fromEntries((await q("SELECT lager, talar, orsak, detalj FROM olycksfacit_lager WHERE deviation_id = $1", [id])).rows
      .map((r: any) => [r.lager, r]));
    const olycka = async (id: string) => (await q("SELECT utfall, orsaker FROM olycksfacit WHERE deviation_id = $1", [id])).rows[0];

    const l1 = await lager("OS1");
    assert.equal(l1.K.talar, false); assert.equal(l1.K.orsak, "ingen vägpunkt", "OS1: med brytaren av gäller K som förut");
    assert.equal(l1.K.detalj.stad.orsak, "brytaren av"); assert.equal(l1.K.detalj.stad.punkt, "B99961");
    assert.equal((await olycka("OS1")).utfall, "TYST_OTACKT", "OS1: en avslagen stadspunkt täcker inte");

    const l2 = await lager("OS2");
    assert.equal(l2.K.talar, true, "OS2: gruppen varnar 0,5 km bort"); assert.equal(l2.K.orsak, "varnar");
    assert.equal(l2.K.detalj.stad.aktiv, true); assert.equal(l2.tackning.orsak, "täckt");
    assert.equal((await olycka("OS2")).utfall, "VARNADE");

    const l3 = await lager("OS3");
    assert.equal(l3.K.talar, false); assert.equal(l3.K.orsak, "yta över 0", "OS3: gruppen saknas i timmen som talade");
    assert.deepEqual(await olycka("OS3"), { utfall: "TYST_TACKT", orsaker: ["A1: ingen sträcka", "K: yta över 0", "A2: ingen station inom 5 km"] });

    // OS4: med alla brytare av räknar stadsloggen inte regeln.
    await q("UPDATE stadsbrytare SET pa = false");
    assert.equal((await q("SELECT ny_kandidat_logga_stad() AS m")).rows[0].m, "brytarna av");
    assert.deepEqual((await q("SELECT status, brytare FROM ny_kandidat_skugga_stad_korning ORDER BY korning DESC LIMIT 1")).rows[0],
      { status: "av", brytare: [] });
  } finally {
    await stad().catch(() => {});
    await pool.end();
  }
});

// RÄTTELSEN AV OLYCKSFACITS OMRÄKNING (sql/100, DECISIONS #822). Raderna står som omräkningen #814 skrev dem, kring 75° N:
//   RT1  "inget värde" utan punktens värde, och fångstens timme är omräkningens → fångstens "fukt saknades", tyst och täckt
//   RT2  punkten 5,05 km bort; omräkningen sa "yta över 0" → "ingen vägpunkt", som fångsten
//   RT3  "inget värde" utan punktens värde, och fångstens timme en annan → "gallrad", med rimfrosten kvar i orsakerna
//   RT4  omräknad "yta över 0" med punkten 0,4 km bort → oförändrad, men märkt
//   RT5  en fångst som aldrig räknades om ("inget värde") → orörd
// Framåt: olycksfacit_k() ger "gallrad" när timmen saknas helt i ny_kandidat_live, "inget värde" när timmen finns men inte punkten,
// och "fukt saknades" när punkten finns och är kall men torr.
test("#822 olycksfacit: rättelsen av omräkningen och den gallrade timmen", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  const nord = (km: number) => 75 + km / 111.2;
  const stad = async () => {
    await q("DELETE FROM olycksfacit WHERE deviation_id LIKE 'RT%'").catch(() => {});
    await q("DELETE FROM ny_kandidat_skugga WHERE segment_id LIKE '9999%'").catch(() => {});
    await q("DELETE FROM ny_kandidat_skugga_korning WHERE korning > now() - interval '12 hours'").catch(() => {});
    await q("DELETE FROM ny_kandidat_live WHERE punkt LIKE 'vR%'").catch(() => {});
  };
  try {
    await q("CREATE TABLE IF NOT EXISTS shadow_log (id bigserial PRIMARY KEY, run_at timestamptz NOT NULL DEFAULT now(), alerts jsonb NOT NULL DEFAULT '[]'::jsonb)");
    if (!(await q("SELECT 1 FROM information_schema.columns WHERE table_name = 'kandidat_skugga' AND column_name = 'fukt_pb'")).rowCount) {
      await q("DROP FUNCTION IF EXISTS kandidat_regel()");
      for (const f of ["001_init.sql", "008_rain_sum.sql", "009_radar_precip.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql",
                       "029_brott_index.sql", "030_langsam_vakt.sql", "050_kandidat_live.sql", "052_kandidat_gallring_kort.sql", "053_arkiv_tabeller.sql",
                       "055_vagpunkter.sql", "056_kandidat_regel.sql", "057_kandidat_skugga.sql", "058_kandidat_spridning.sql",
                       "065_kandidat_domlogg_punkter.sql"]) await las(f);
    }
    for (const f of ["003_situation_archive.sql", "068_ny_kandidat_skugga.sql", "084_olycksfacit.sql", "085_olycksfacit_klassning.sql",
                     "095_olycksfacit_k_timmen.sql", "089_stadspunkter.sql", "096_olycksfacit_stad.sql"]) await las(f);
    await stad();
    const T = "date_trunc('hour', now()) - interval '30 hours'", F = "date_trunc('hour', now()) - interval '33 hours'";
    const olycka = (id: string, utfall: string, orsaker: string[]) => q(`INSERT INTO olycksfacit (deviation_id, start_time, message,
      road_number, severity_code, geom, utfall, orsaker) VALUES ($1, ${T} + interval '20 minutes', 'Singelolycka', 'Väg 1', 4,
      ST_SetSRID(ST_MakePoint(60, $2), 4326), $3, $4)`, [id, nord(1), utfall, orsaker]);
    const lagren = (id: string, a1: string, tackning: string, rim: boolean, k: { talar: boolean; orsak: string; detalj: string }) =>
      q(`INSERT INTO olycksfacit_lager (deviation_id, lager, talar, orsak, detalj) VALUES
        ($1, 'A1', false, $2, '{}'), ($1, 'A2', false, 'ingen station inom 5 km', jsonb_build_object('rimfrost', $3::boolean)),
        ($1, 'tackning', NULL, $4, '{}'), ($1, 'K', $5, $6, ${k.detalj})`, [id, a1, rim, tackning, k.talar, k.orsak]);
    const omr = (punkt: string, km: number, extra: string) => `jsonb_build_object('punkt', '${punkt}', 'segment', '99991', 'km', ${km},
      'timme', ${T}, 'narmaste_pb', NULL::real, 'omraknad', now() - interval '1 day', 'timregel', '#814') || ${extra}`;
    await olycka("RT1", "TYST_TACKT", ["A1: väglaget Normalt", "K: inget värde", "A2: ingen station inom 5 km"]);
    await lagren("RT1", "väglaget Normalt", "täckt", false, { talar: false, orsak: "inget värde", detalj: omr("vR1", 0.6,
      `jsonb_build_object('narmaste_utfall', 'inget värde', 'fore', jsonb_build_object('talar', false, 'orsak', 'fukt saknades', 'timme', ${T}))`) });
    await olycka("RT2", "TYST_OTACKT", ["A1: ingen sträcka", "K: yta över 0", "A2: ingen station inom 5 km"]);
    await lagren("RT2", "ingen sträcka", "otäckt", false, { talar: false, orsak: "yta över 0", detalj: omr("vR2", 5.05,
      `jsonb_build_object('narmaste_utfall', 'yta över 0', 'stracka_i_timmen', false, 'fore', jsonb_build_object('talar', false, 'orsak', 'ingen vägpunkt', 'timme', NULL::timestamptz))`) });
    await olycka("RT3", "TYST_TACKT", ["A1: väglaget Normalt", "K: inget värde", "A2: ingen station inom 5 km", "rimfrost"]);
    await lagren("RT3", "väglaget Normalt", "täckt", true, { talar: false, orsak: "inget värde", detalj: omr("vR3", 0.7,
      `jsonb_build_object('narmaste_utfall', 'inget värde', 'fore', jsonb_build_object('talar', true, 'orsak', 'varnar', 'timme', ${F}))`) });
    await olycka("RT4", "TYST_TACKT", ["A1: väglaget Normalt", "K: yta över 0", "A2: ingen station inom 5 km"]);
    await lagren("RT4", "väglaget Normalt", "täckt", false, { talar: false, orsak: "yta över 0", detalj: omr("vR4", 0.4,
      `jsonb_build_object('narmaste_utfall', 'yta över 0', 'stracka_i_timmen', false, 'fore', jsonb_build_object('talar', false, 'orsak', 'ingen timme', 'timme', ${F}))`) });
    await olycka("RT5", "TYST_TACKT", ["A1: väglaget Normalt", "K: inget värde", "A2: ingen station inom 5 km"]);
    await lagren("RT5", "väglaget Normalt", "täckt", false, { talar: false, orsak: "inget värde",
      detalj: `jsonb_build_object('punkt', 'vR5', 'segment', '99991', 'km', 0.5, 'timme', ${T}, 'narmaste_pb', NULL::real, 'timregel', '#814')` });

    await las("100_olycksfacit_rattelse.sql");
    const lager = async (id: string) => Object.fromEntries((await q("SELECT lager, talar, orsak, detalj FROM olycksfacit_lager WHERE deviation_id = $1", [id])).rows
      .map((r: any) => [r.lager, r]));
    const rad = async (id: string) => (await q("SELECT utfall, orsaker FROM olycksfacit WHERE deviation_id = $1", [id])).rows[0];
    const k1 = (await lager("RT1")).K;
    assert.equal(k1.orsak, "fukt saknades", "RT1: fångstens besked i samma timme");
    assert.equal(k1.talar, false);
    assert.equal(k1.detalj.rattelse, "#822"); assert.equal(k1.detalj.narmaste_utfall, "torr");
    assert.deepEqual(k1.detalj.omrakningen, { talar: false, orsak: "inget värde" }, "RT1: det omräkningen skrev står kvar");
    assert.deepEqual(await rad("RT1"), { utfall: "TYST_TACKT", orsaker: ["A1: väglaget Normalt", "K: fukt saknades", "A2: ingen station inom 5 km"] });
    const k2 = (await lager("RT2")).K;
    assert.equal(k2.orsak, "ingen vägpunkt", "RT2: punkten mer än 2 km bort");
    assert.deepEqual(await rad("RT2"), { utfall: "TYST_OTACKT", orsaker: ["A1: ingen sträcka", "K: ingen vägpunkt", "A2: ingen station inom 5 km"] });
    const k3 = (await lager("RT3")).K;
    assert.equal(k3.orsak, "gallrad", "RT3: fångstens timme är en annan, och värdet går inte att läsa");
    assert.equal(k3.talar, false, "RT3: en gammal timmes varning räknas inte");
    assert.deepEqual(await rad("RT3"), { utfall: "TYST_TACKT", orsaker: ["A1: väglaget Normalt", "K: gallrad", "A2: ingen station inom 5 km", "rimfrost"] });
    const k4 = (await lager("RT4")).K;
    assert.equal(k4.orsak, "yta över 0", "RT4: oförändrad"); assert.equal(k4.detalj.rattelse, "#822", "RT4: märkt");
    assert.equal(k4.detalj.omrakningen, undefined, "RT4: inget att spara");
    assert.deepEqual((await rad("RT4")).orsaker, ["A1: väglaget Normalt", "K: yta över 0", "A2: ingen station inom 5 km"]);
    const k5 = (await lager("RT5")).K;
    assert.equal(k5.orsak, "inget värde", "RT5: aldrig omräknad, orörd"); assert.equal(k5.detalj.rattelse, undefined);
    const fore = JSON.stringify((await lager("RT1")).K.detalj);
    await las("100_olycksfacit_rattelse.sql");
    assert.equal(JSON.stringify((await lager("RT1")).K.detalj), fore, "en andra körning rör ingenting");

    // Framåt: en timme som talade 35 minuter före nu, där punkten vR9 inte står bland sträckans fuktpunkter.
    for (const f of ["olycksfacit_k", "olycksfacit_k_stad"])
      assert.deepEqual((await q("SELECT proconfig FROM pg_proc WHERE proname = $1", [f])).rows[0].proconfig,
        ["search_path=public, extensions"], `${f}: fast sökväg i definitionen (DECISIONS #784)`);
    assert.ok((await q("SELECT prosrc FROM pg_proc WHERE proname = 'olycksfacit_k_stad'")).rows[0].prosrc.includes("'gallrad'"),
      "olycksfacit_k_stad har samma skydd");
    const H = "date_trunc('hour', now() - interval '35 minutes')";
    await q(`INSERT INTO ny_kandidat_skugga_korning (korning, observed_at, status) VALUES (now() - interval '32 minutes', ${H}, 'räknad')`);
    await q(`INSERT INTO ny_kandidat_skugga (segment_id, observed_at, skriven_at, punkter, varnar, veto, torr, vat, flackvis_vat, pb_min,
               spridning, fukt_punkter, fukt_utfall) VALUES ('99992', ${H}, now() - interval '32 minutes', 1, 0, 0, 1, false, false, -1.0, 0, '{}', '{}')`);
    const k = async () => (await q("SELECT orsak FROM olycksfacit_k(now() - interval '20 minutes', 'vR9', '99992', ST_SetSRID(ST_MakePoint(61, $1), 4326))",
      [nord(1)])).rows[0].orsak;
    // Andra prov skriver ny_kandidat_live för samma timme; provets timme ska sakna rader helt (ci 8/11 föll på det).
    await q(`DELETE FROM ny_kandidat_live WHERE tid = ${H}`);
    assert.equal(await k(), "gallrad", "timmen saknas helt i ny_kandidat_live");
    await q(`INSERT INTO ny_kandidat_live (tid, punkt, pb) VALUES (${H}, 'vR8', -1.0)`);
    assert.equal(await k(), "inget värde", "timmen finns, men inte punkten");
    await q(`INSERT INTO ny_kandidat_live (tid, punkt, pb) VALUES (${H}, 'vR9', -1.0)`);
    assert.equal(await k(), "fukt saknades", "punkten finns och är kall men torr");
  } finally {
    await stad().catch(() => {});
    await pool.end();
  }
});

// SÄSONGSFACIT (sql/099, docs/TROSKLAR-SASONGSFACIT.md, DECISIONS #818): dygnsräkningen mot riktig PostGIS, ett påhittat dygn
// 15/1 2026 (svensk tid = UTC+1) på sträckan SF1 vid 75° N, i det påhittade länet 99. K varnar 06 och 07, Trafikverket säger hal
// 07–09 (kod 2 från 07.30, kod 1 från 10.30), luften är 2 °C 06–09 och 0,5 °C kl. 08 med radar 0,5 mm/h, annars 5 °C, och en olycka
// klassad TROLIG kl. 08.15 där K varnade.
//   SF1  morgonrusningen: K 4 timmar, 2 varnar, 2 träffar, 3 F1-timmar, 3 täckta; J1 4/4/3/3; J2 1/1/3/2; övriga delar utan F1
//   SF2  ledtiden: en början på F1 kl. 07, och K varnade 06, alltså 1–3 h; olyckan räknas med K som varnade
//   SF3  räkningen går att köra om utan att något dubbleras, och utan stationsrader märks J1 och J2 som oräknade
test("#818 säsongsfacit: dygnsräkningen per län och tid på dygnet, ledtiden och olyckorna", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const q = (s: string, p: unknown[] = []) => pool.query(s, p);
  const las = (f: string) => q(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
  const DAG = "2026-01-15";
  const utc = (lokal: number, min = 0) => new Date(Date.UTC(2026, 0, 15, lokal - 1, min));
  const stad = async () => {
    for (const tb of ["sasongsfacit_dag", "sasongsfacit_ledtid", "sasongsfacit_olyckor"])
      await q(`DELETE FROM ${tb} WHERE dag = $1`, [DAG]).catch(() => {});
    await q("DELETE FROM olycksfacit WHERE deviation_id = 'SF-OLYCKA'").catch(() => {});
    await q("DELETE FROM ny_kandidat_skugga WHERE segment_id = 'SF1'").catch(() => {});
    await q("DELETE FROM ny_kandidat_skugga_korning WHERE observed_at >= $1 AND observed_at < $2", [utc(-6), utc(26)]).catch(() => {});
    await q("DELETE FROM road_condition_history WHERE segment_id = 'SF1'").catch(() => {});
    await q("DELETE FROM road_conditions WHERE segment_id = 'SF1'").catch(() => {});
    await q("DELETE FROM radar_precip WHERE segment_id = 'SF1'").catch(() => {});
    await q("DELETE FROM weather_observations WHERE station_id = 'SFS1'").catch(() => {});
    await q("DELETE FROM vagpunkt WHERE punkt = 'SF1-1'").catch(() => {});
  };
  try {
    await q("CREATE TABLE IF NOT EXISTS shadow_log (id bigserial PRIMARY KEY, run_at timestamptz NOT NULL DEFAULT now(), alerts jsonb NOT NULL DEFAULT '[]'::jsonb)");
    if (!(await q("SELECT 1 FROM information_schema.columns WHERE table_name = 'kandidat_skugga' AND column_name = 'fukt_pb'")).rowCount) {
      await q("DROP FUNCTION IF EXISTS kandidat_regel()");
      for (const f of ["001_init.sql", "008_rain_sum.sql", "009_radar_precip.sql", "017_trend_kandidater.sql", "018_trend_berakna.sql",
                       "029_brott_index.sql", "030_langsam_vakt.sql", "050_kandidat_live.sql", "052_kandidat_gallring_kort.sql", "053_arkiv_tabeller.sql",
                       "055_vagpunkter.sql", "056_kandidat_regel.sql", "057_kandidat_skugga.sql", "058_kandidat_spridning.sql",
                       "065_kandidat_domlogg_punkter.sql"]) await las(f);
    }
    for (const f of ["003_situation_archive.sql", "068_ny_kandidat_skugga.sql", "084_olycksfacit.sql", "085_olycksfacit_klassning.sql",
                     "099_sasongsfacit.sql", "099_sasongsfacit.sql"]) await las(f);
    await stad();
    await q("INSERT INTO vagpunkt (punkt, segment_id, lon, lat) VALUES ('SF1-1', 'SF1', 34, 75)");
    await q(`INSERT INTO road_conditions (segment_id, condition_code, condition_text, condition_info, county_nos, road_number, geom)
             VALUES ('SF1', 1, 'Normalt', '{}', '{99}', 'E99', ST_GeomFromText('LINESTRING(33.99 75, 34.01 75)', 4326))`);
    for (const [tid, kod, text] of [[utc(-2), 1, "Normalt"], [utc(7, 30), 2, "Besvärligt"], [utc(10, 30), 1, "Normalt"]] as const)
      await q(`INSERT INTO road_condition_history (segment_id, condition_code, condition_text, condition_info, modified_time, deleted)
               VALUES ('SF1', $1, $2, '{}', $3, false)`, [kod, text, tid]);
    for (let h = 0; h < 24; h++)
      await q("INSERT INTO ny_kandidat_skugga_korning (korning, observed_at, status) VALUES ($1, $2, 'räknad')", [utc(h, 47), utc(h)]);
    for (const [h, v] of [[6, 1], [7, 1], [12, 0]])
      await q(`INSERT INTO ny_kandidat_skugga (segment_id, observed_at, punkter, varnar, veto, torr, vat, flackvis_vat, pb_min)
               VALUES ('SF1', $1, 1, $2, 0, $3, false, false, -1)`, [utc(h), v, 1 - v]);
    for (let h = -6; h <= 25; h++) {
      const luft = h === 8 ? 0.5 : h >= 6 && h <= 9 ? 2.0 : 5.0;
      await q(`INSERT INTO weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c)
               VALUES ('SFS1', 'SF-station', ST_SetSRID(ST_MakePoint(34, 75), 4326), $1, 1, $2)`, [utc(h, 10), luft]);
    }
    await q("INSERT INTO radar_precip (segment_id, observed_at, rate_max_mmh, rate_mean_mmh) VALUES ('SF1', $1, 0.8, 0.5)", [utc(8, 15)]);
    await q(`INSERT INTO olycksfacit (deviation_id, start_time, geom, utfall, klass) VALUES
             ('SF-OLYCKA', $1, ST_SetSRID(ST_MakePoint(34, 75), 4326), 'VARNADE', 'TROLIG')`, [utc(8, 15)]);
    await q("INSERT INTO olycksfacit_lager (deviation_id, lager, talar, orsak) VALUES ('SF-OLYCKA', 'K', true, 'varnar')");

    const dag = async () => Object.fromEntries((await q(`SELECT dygnsdel || '/' || metod AS n, timmar, varnar, traff, f1, tackt, jamforelser
      FROM sasongsfacit_dag WHERE dag = $1 AND lan = 99`, [DAG])).rows.map((r: any) => [r.n, r]));
    assert.match((await q("SELECT sasongsfacit_rakna($1::date) AS m", [DAG])).rows[0].m, /^klart: /);
    const d = await dag();
    const fem = (r: any) => [r.timmar, r.varnar, r.traff, r.f1, r.tackt];
    assert.deepEqual(fem(d["morgonrusning/K"]), [4, 2, 2, 3, 3], "SF1: K i morgonrusningen");
    assert.deepEqual(fem(d["morgonrusning/J1"]), [4, 4, 4, 3, 3], "SF1: snöflingan i morgonrusningen");
    assert.deepEqual(fem(d["morgonrusning/J2"]), [4, 1, 1, 3, 2], "SF1: den enkla regeln i morgonrusningen");
    assert.deepEqual(["natt", "dag", "kvällsrusning", "kväll"].map((x) => fem(d[`${x}/K`])), [[8, 0, 0, 0, 0], [6, 0, 0, 0, 0], [3, 0, 0, 0, 0], [3, 0, 0, 0, 0]],
      "SF1: övriga delar av dygnet, 24 timmar i populationen, utan F1 och utan att K varnade");
    assert.equal(d["dag/J1"].varnar, 0, "SF1: 5 °C är ingen snöflinga");
    assert.equal(d["morgonrusning/J1"].jamforelser, true);
    assert.deepEqual((await q("SELECT dygnsdel, band, n FROM sasongsfacit_ledtid WHERE dag = $1 AND lan = 99", [DAG])).rows,
      [{ dygnsdel: "morgonrusning", band: "1–3 h", n: 1 }], "SF2: F1 börjar 07 och K varnade 06");
    assert.deepEqual((await q("SELECT dygnsdel, olyckor, k_varnade FROM sasongsfacit_olyckor WHERE dag = $1 AND lan = 99", [DAG])).rows,
      [{ dygnsdel: "morgonrusning", olyckor: 1, k_varnade: 1 }], "SF2: olyckan 08.15 där K varnade");

    assert.match((await q("SELECT sasongsfacit_rakna($1::date) AS m", [DAG])).rows[0].m, /^klart: /);
    assert.deepEqual(await dag(), d, "SF3: en andra räkning ger samma rader");
    await q("DELETE FROM weather_observations WHERE station_id = 'SFS1'");
    assert.match((await q("SELECT sasongsfacit_rakna($1::date) AS m", [DAG])).rows[0].m, /utan stationsrader/);
    const u = await dag();
    assert.deepEqual([u["morgonrusning/J1"].varnar, u["morgonrusning/J1"].jamforelser, u["morgonrusning/K"].jamforelser, fem(u["morgonrusning/K"])],
      [0, false, true, [4, 2, 2, 3, 3]], "SF3: utan stationsrader räknas K som förut, och J1 märks oräknad");
    assert.equal((await q("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name = 'road_condition_history' AND column_name = 'ingested_at'")).rows[0].n, 1,
      "A1:s fördröjning framåt: ingested_at finns");
  } finally {
    await stad().catch(() => {});
    await pool.end();
  }
});
