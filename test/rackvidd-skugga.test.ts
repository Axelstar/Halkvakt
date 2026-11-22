import { test } from "node:test";
import assert from "node:assert/strict";
import { stationerSomEnFara } from "../engine/src/rutfilter.ts";
import type { Hazard } from "../engine/src/types.ts";

// Räckvidden som en fara (DECISIONS #950): skuggmotorns regel, aldrig appens.
const LINE: [number, number][] = [[15.0, 59.0], [16.0, 59.0]];   // ~57 km österut
const KM_LON = 1 / (111.32 * Math.cos((59 * Math.PI) / 180));
const st = (id: string, km: number, norrKm: number, yta: number, fukt = true, bro = false): Hazard =>
  ({ id, kind: "icing_point", lon: 15.0 + km * KM_LON, lat: 59.0 + norrKm / 111.32,
     meta: { surfaceTempC: yta, moisture: fukt, ...(bro ? { bridge: true } : {}) } }) as Hazard;

test("en kedja med högst 15 km mellan stationerna är en fara, på rutten och med den första stationens id", () => {
  const ut = stationerSomEnFara([st("wx:a", 5, 10, 0), st("wx:b", 10, -12, -1), st("wx:c", 15, 3, 0.5)], LINE);
  assert.equal(ut.length, 1);
  assert.equal(ut[0].id, "wx:a");
  assert.ok(Math.abs((ut[0] as { lat: number }).lat - 59.0) < 1e-3, "faran ligger på rutten");
});

test("två stationer 22 km isär är två faror; en station 20 km från rutten är ingen", () => {
  const ut = stationerSomEnFara([st("wx:a", 5, 2, 0), st("wx:b", 27, 2, 0), st("wx:c", 40, 20, 0)], LINE);
  assert.deepEqual(ut.filter((h) => h.id !== "wx:c").map((h) => h.id), ["wx:a", "wx:b"]);
  assert.equal(ut.length, 2);
});

test("stationer som inte kan tala och broar står kvar som de är", () => {
  const varm = st("wx:varm", 5, 1, 2), torr = st("wx:torr", 6, 1, 0, false), bro = st("bro:x", 7, 1, 2, true, true);
  const ut = stationerSomEnFara([varm, torr, bro], LINE);
  assert.deepEqual(ut, [varm, torr, bro]);
});
