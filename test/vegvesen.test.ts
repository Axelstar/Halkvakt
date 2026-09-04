// Vegvesen DATEX-parsern (kort #35) mot test/fixtures/vegvesen.xml — se fixturens huvud
// för vad som är mätt ur rekognoseringen och vad som är DATEX-standardens form.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseSiteTable, parseMeasuredData, interesting } from "../ingest/sources/vegvesen.ts";

const [siteXml, dataXml] = readFileSync(new URL("./fixtures/vegvesen.xml", import.meta.url), "utf8").split("<!-- SPLIT -->");

test("vegvesen stationstabell: id, nob-namn, position; station utan position räknas men lagras inte", () => {
  const s = parseSiteTable(siteXml);
  assert.equal(s.sitesTotal, 2);
  assert.deepEqual(s.stations, [{ id: "1629006", name: "Fv 714 Våvatnet", lat: 63.6421, lon: 9.4187 }]);
  assert.ok(s.sample?.startsWith('<ns6:measurementSite id="1629006"'));
});

test("vegvesen mätdata: luft, daggpunkt, fukt, vägyta, nederbörd, mättid", () => {
  const d = parseMeasuredData(dataXml);
  assert.equal(d.publicationTime, "2026-09-04T14:54:23.879+02:00");
  assert.equal(d.items.length, 2);
  const [a, b] = d.items;
  assert.deepEqual(a, { siteId: "1629006", sampleTime: "2026-09-04T14:50:00+02:00", surfaceTempC: -1.2, airTempC: 15.8,
    dewpointC: 7.4, humidityPct: 57.7, precipitation: "snow", rain: false, snow: true });
  // Ingen measurementTimeDefault ⇒ publicationTime; noPrecipitation ⇒ null, inga flaggor.
  assert.deepEqual(b, { siteId: "2", sampleTime: "2026-09-04T14:54:23.879+02:00", surfaceTempC: null, airTempC: 12.0,
    dewpointC: null, humidityPct: null, precipitation: null, rain: false, snow: false });
});

test("vegvesen arkivpolicy = DECISIONS #4 (som Sverige och Finland)", () => {
  const varm = { siteId: "x", sampleTime: null, surfaceTempC: 9.0, airTempC: null, dewpointC: null, humidityPct: null, precipitation: null, rain: false, snow: false };
  assert.equal(interesting(varm, 9.1, true), false);                 // varmt, torrt, stilla
  assert.equal(interesting(varm, 9.6, true), true);                  // Δ ≥ 0,5
  assert.equal(interesting(varm, null, false), true);                // första observationen
  assert.equal(interesting({ ...varm, surfaceTempC: 4.9 }, 4.9, true), true);   // ≤ 5 °C
  assert.equal(interesting({ ...varm, precipitation: "rain", rain: true }, 9.0, true), true);
  assert.equal(interesting({ ...varm, surfaceTempC: null }, null, true), false); // vägyta saknas, inget händer
});
