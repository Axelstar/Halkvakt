// Radarns kärna för storstädernas grupper (ingest/radar-karna.ts gruppRader; sql/090, DECISIONS #804, kort #378).
import { test } from "node:test";
import assert from "node:assert/strict";
import { MIN_RATE_MMH, gruppRader } from "../ingest/radar-karna.ts";

test("gruppRader: radarn i varje punkt, max och medel per grupp, och händelsegränsen", () => {
  const regn: Record<string, number | null> = { "18,59": 0.5, "18.1,59": 0.0, "17,58": 0.05, "16,57": null, "16.1,57": 0.3 };
  const rateAt = (lon: number, lat: number) => { const k = `${lon},${lat}`; return k in regn ? regn[k] : 0; };   // null = utanför
  const r = gruppRader([
    { id: "B-1-1", punkter: [[18, 59], [18.1, 59]] },          // regn i en punkt: max 0,5, medel 0,25
    { id: "C-2-2", punkter: [[17, 58]] },                      // under gränsen: ingen rad
    { id: "B-3-3", punkter: [[16, 57], [16.1, 57]] },          // en punkt utanför kompositen räknas inte i medlet
    { id: "B-4-4", punkter: [[16, 57]] },                      // bara utanför: ingen rad
  ], rateAt);
  assert.deepEqual(r.ids, ["B-1-1", "B-3-3"]);
  assert.deepEqual(r.maxes, [0.5, 0.3]);
  assert.deepEqual(r.means, [0.25, 0.3]);
  assert.equal(r.events, 2);
  assert.equal(r.sampled, 6);
  assert.equal(r.outside, 2);
  assert.equal(MIN_RATE_MMH, 0.1);
});

test("gruppRader: exakt på gränsen räknas, tomma grupper ger inget", () => {
  const r = gruppRader([{ id: "B-1-1", punkter: [[18, 59]] }, { id: "B-2-2", punkter: [] }], () => 0.1);
  assert.deepEqual(r.ids, ["B-1-1"]);
});
