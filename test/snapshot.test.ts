// Snapshot adapter: published file format → engine hazards → correct alerts.
// This is the exact chain the Android app will run; locked here first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { snapshotToHazards, type LiveDoc, type StaticDoc } from "../engine/src/snapshot.ts";
import { AlertEngine } from "../engine/src/engine.ts";
import type { Fix } from "../engine/src/types.ts";

const staticDoc: StaticDoc = {
  schema: 1,
  cameras: [{ id: "TV1", lon: 15.0, lat: 58.026948, bearing: 0, road: "E4" }], // 3 km norr
};
const liveDoc: LiveDoc = {
  schema: 1, generated_at: "2026-08-25T00:00:00Z",
  segments: [{ id: "S1", line: [[14.99, 58.0808], [15.01, 58.0808]], code: 2, info: ["Is"], road: "E4" }], // 9 km norr
  weather: [{ id: "W1", lon: 15.0, lat: 58.05, yta: 0.2, fukt: true }],   // 5.6 km norr
  deviations: [{ id: "D1", lon: 15.0, lat: 58.135, typ: "Olycka", road: "E4" }], // 15 km norr → utom räckhåll (>10 km)
  smhi: [],
};

function northTrace(seconds: number, kmh: number): Fix[] {
  const mps = (kmh * 1000) / 3600;
  return Array.from({ length: seconds + 1 }, (_, t) => ({
    t, lon: 15.0, lat: 58.0 + (t * mps) / 111320, speedKmh: kmh,
  }));
}

test("snapshot chain: files → hazards → disciplined alerts", () => {
  const hazards = snapshotToHazards(staticDoc, liveDoc);
  assert.equal(hazards.length, 4);
  const alerts = new AlertEngine(hazards).run(northTrace(420, 80));
  // Väntat: kamera ~500 m (t≈113) → isrisk-station (när D1 kommit inom 10 km tävlar
  // accident, men D1 på 15 km är utom horisont vid start; vid t≈225 är D1 <10 km och
  // vinner prioritet över wx/seg om samtidiga)... verifiera disciplinen strukturellt:
  assert.ok(alerts.length >= 3, `expected a busy but disciplined drive, got ${alerts.length}`);
  for (let i = 1; i < alerts.length; i++) {
    assert.ok(alerts[i].t - alerts[i - 1].t >= 45, "45s rule broken via snapshot path");
  }
  assert.ok(alerts.some((a) => a.hazardId === "cam:TV1"), "camera missing");
  assert.ok(alerts.some((a) => a.kind === "accident"), "deviation→accident mapping missing");
  assert.ok(alerts.some((a) => a.kind === "slippery_segment" || a.kind === "icing_point"),
    "winter alert missing");
  // Determinism genom adapterkedjan:
  const rerun = new AlertEngine(snapshotToHazards(staticDoc, liveDoc)).run(northTrace(420, 80));
  assert.equal(JSON.stringify(rerun), JSON.stringify(alerts));
});
