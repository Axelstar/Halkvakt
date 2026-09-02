// Parser tests against real captured API responses (test/fixtures/*.json).
// If Trafikverket changes a schema, these fail before production does.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseWgs84Point } from "../ingest/trafikverket.ts";

function fixture(name: string): any {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"))
    .RESPONSE.RESULT[0];
}

test("parseWgs84Point", () => {
  assert.deepEqual(parseWgs84Point("POINT (18.04221 59.38437)"), { lon: 18.04221, lat: 59.38437 });
  assert.equal(parseWgs84Point(undefined), null);
  assert.equal(parseWgs84Point("LINESTRING (1 2, 3 4)"), null);
});

test("weather fixture shape", () => {
  const w = fixture("weather").WeatherMeasurepoint[0];
  assert.ok(w.Id && w.Geometry?.WGS84?.startsWith("POINT"));
  assert.ok(w.Observation?.Sample);
  assert.equal(typeof w.Observation.Surface.Temperature.Value, "number");
  // Kort #42 steg 0a: mängdfälten (bevisade 89 % täckning i regn-bevis #1).
  assert.equal(typeof w.Observation.Aggregated30minutes.Precipitation.RainSum.Value, "number");
  assert.equal(typeof w.Observation.Aggregated30minutes.Precipitation.SnowSum.WaterEquivalent.Value, "number");
});

test("roadcondition fixture shape", () => {
  const r = fixture("roadcondition").RoadCondition[0];
  assert.ok(r.Id && typeof r.ConditionCode === "number");
  assert.ok(typeof r.ConditionText === "string");
  assert.ok(Array.isArray(r.ConditionInfo));
  assert.ok(r.Geometry?.WGS84?.startsWith("LINESTRING"));
});

test("cameras fixture shape", () => {
  const c = fixture("cameras").TrafficSafetyCamera[0];
  assert.ok(c.Id && c.Geometry?.WGS84?.startsWith("POINT"));
  assert.equal(typeof c.Bearing, "number");
});

test("situations fixture shape (namespace road.trafficinfo, schema 1.6)", () => {
  const s = fixture("situations").Situation[0];
  assert.ok(Array.isArray(s.Deviation) && s.Deviation.length > 0);
  const d = s.Deviation[0];
  assert.ok(d.MessageType && d.MessageTypeValue);
  assert.ok(d.Geometry?.Point?.WGS84 || d.Geometry?.WGS84);
});
