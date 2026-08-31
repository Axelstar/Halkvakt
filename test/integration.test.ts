// Full write-path test vs throwaway PostGIS (CI service container).
// Skips cleanly when TEST_DATABASE_URL is absent (local runs without Docker).
import { test } from "node:test";
import assert from "node:assert/strict";
import { ingestAction } from "../ingest/sources/situations.ts";

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
        surfaceTempC: -1.2, airTempC: 0.5, dewpointC: -2, humidityPct: 90, precipitation: "snow", rain: false, snow: true, modifiedTime: "2026-08-24T10:00:00Z" },
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

  const expected = { cameras: 2, road_conditions: 1, history: 1, weather: 1, deviations: 1, wildlife: 1, smhi: 1 };
  const c1 = await writeAll(data);
  assert.deepEqual(c1, expected);

  // Idempotency: same input again must not duplicate anything.
  const c2 = await writeAll(data);
  assert.deepEqual(c2, expected);

  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const n = async (q: string) => Number((await pool.query(q)).rows[0].count);
  assert.equal(await n("SELECT count(*) FROM cameras"), 2);
  assert.equal(await n("SELECT count(*) FROM road_conditions"), 1);
  assert.equal(await n("SELECT count(*) FROM road_condition_history"), 1);
  assert.equal(await n("SELECT count(*) FROM weather_observations"), 1);
  assert.equal(await n("SELECT count(*) FROM deviations"), 1);
  assert.equal(await n("SELECT count(*) FROM polisen_events"), 1);
  assert.equal(await n("SELECT count(*) FROM smhi_warnings"), 1);
  assert.equal(await n("SELECT count(*) FROM smhi_warnings_history"), 1);
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
