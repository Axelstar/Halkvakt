import { test } from "node:test";
import assert from "node:assert/strict";
import { AlertEngine } from "../engine/src/engine.ts";
import { forsprangNiva, forsprangKrok, FORSPRANG_SVEP_S } from "../engine/src/forsprang.ts";
import type { Fix, Hazard } from "../engine/src/types.ts";

// Kort #153 beslut 1, docs/TROSKLAR-FORSPRANG.md, DECISIONS #359: samma ord, tidigare — nivå 2 talar tidigare, allt annat orört.

/** Ett rakt spår österut i 80 km/h, en fix var femte sekund — samma form som skuggmotorns traceAlong. */
function spar(): Fix[] {
  const ut: Fix[] = [];
  const mps = 80 / 3.6, mPerDeg = 111_320 * Math.cos((59 * Math.PI) / 180);
  for (let t = 0; t <= 300; t += 5) ut.push({ t, lon: 15.0 + (mps * t) / mPerDeg, lat: 59.0, speedKmh: 80, headingDeg: 90 } as Fix);
  return ut;
}
const seg = (id: string, x0: number, x1: number, code: number): Hazard =>
  ({ id, kind: "slippery_segment", line: [[x0, 59.0], [x1, 59.0]], meta: { code, info: [] } }) as Hazard;
const faror = [seg("niva1", 15.035, 15.040, 2), seg("niva2", 15.070, 15.078, 4)];
const nivaer = new Map(faror.map((h) => [h.id, forsprangNiva(h, new Map())!]));
const kor = (krok: boolean, svepS = 60) => {
  const m = new AlertEngine(faror);
  if (krok) m.leadFor = forsprangKrok(nivaer, svepS);
  return new Map(m.run(spar()).map((a) => [a.hazardId, a.distanceM]));
};

test("nivåerna: väglagskod 3 och 4 är nivå 2, kod 2 och kod 1 är nivå 1", () => {
  assert.equal(forsprangNiva(seg("a", 0, 1, 4), new Map()), 2);
  assert.equal(forsprangNiva(seg("a", 0, 1, 3), new Map()), 2);
  assert.equal(forsprangNiva(seg("a", 0, 1, 2), new Map()), 1);
  assert.equal(forsprangNiva(seg("a", 0, 1, 1), new Map()), 1);
});

test("nivåerna: frysrisk är nivå 2 bara under noll OCH blöt inom 2 h", () => {
  const is = (yta: number): Hazard => ({ id: "wx:1", kind: "icing_point", lon: 15, lat: 59, meta: { surfaceTempC: yta, moisture: true } }) as Hazard;
  assert.equal(forsprangNiva(is(-0.5), new Map([["wx:1", 3]])), 2);
  assert.equal(forsprangNiva(is(-0.5), new Map([["wx:1", 2]])), 1, "blöt för länge sedan");
  assert.equal(forsprangNiva(is(0.5), new Map([["wx:1", 4]])), 1, "nära noll men inte under");
  assert.equal(forsprangNiva(is(-0.5), new Map()), 1, "okänd väta är inte blöt");
});

test("nivåerna: olyckor, kameror och vilt ingår inte", () => {
  for (const kind of ["accident", "camera", "wildlife"])
    assert.equal(forsprangNiva({ id: "x", kind, lon: 15, lat: 59, meta: {} } as unknown as Hazard, new Map()), null);
});

test("utan krok är motorn densamma: samma varningar på samma avstånd", () => {
  const m = new AlertEngine(faror);
  const utan = new Map(m.run(spar()).map((a) => [a.hazardId, a.distanceM]));
  assert.deepEqual(kor(false), utan);
});

test("med kroken talar nivå 2 tidigare och nivå 1 på samma avstånd", () => {
  const bas = kor(false), variant = kor(true, 60);
  assert.equal(variant.get("niva1"), bas.get("niva1"), "nivå 1 orörd");
  assert.ok((variant.get("niva2") ?? 0) > (bas.get("niva2") ?? 0) + 400, `nivå 2 tidigare: ${bas.get("niva2")} → ${variant.get("niva2")}`);
});

test("spannet ändras inte: 90 s i 80 km/h klämms till högst 3 000 m", () => {
  // Segmentet ~6,9 km bort: utan tak hade 1 000 s talat direkt vid start; med taket talar det först vid 3 000 m.
  const m = new AlertEngine([seg("niva2", 15.12, 15.125, 4)]);
  m.leadFor = forsprangKrok(new Map([["niva2", 2]]), 1000);
  const a = m.run(spar()).find((x) => x.hazardId === "niva2");
  assert.ok(a && a.distanceM <= 3000 && a.distanceM >= 2500, `vid taket, högst 3 000 m — fick ${a?.distanceM}`);
});

test("svepet är dokumentets", () => {
  assert.deepEqual([...FORSPRANG_SVEP_S], [45, 60, 90]);
});
