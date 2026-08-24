// Alert engine test suite — three independent layers of proof:
//   1. Vectors: every discipline rule (PLAN §1) frozen as input → expected alert log.
//      These same JSON files are the contract the future Kotlin/Swift ports must pass.
//   2. Invariants: rules re-checked structurally on every produced log, so a vector
//      regenerated carelessly can never bless rule-breaking output.
//   3. Determinism: two fresh engines, same input ⇒ byte-identical serialized logs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { AlertEngine } from "../engine/src/engine.ts";
import { DEFAULT_CONFIG, PRIORITY, type Alert, type Fix, type Hazard } from "../engine/src/types.ts";

interface VectorFile {
  name: string; hazards: Hazard[]; trace: Fix[]; expected: Alert[];
  config?: Record<string, number>;
}

const vectorDir = new URL("../engine/vectors/", import.meta.url);
const vectorFiles = readdirSync(vectorDir).filter((f) => f.endsWith(".json")).sort();
const fixture: VectorFile = JSON.parse(
  readFileSync(new URL("../engine/fixtures/skane_vag108.json", import.meta.url), "utf8"),
);

function loadVector(f: string): VectorFile {
  return JSON.parse(readFileSync(new URL(f, vectorDir), "utf8"));
}

/** The discipline rules, checked independently of any expected-log blessing. */
function assertInvariants(alerts: Alert[], trace: Fix[], label: string): void {
  const cfg = DEFAULT_CONFIG;
  for (let i = 1; i < alerts.length; i++) {
    assert.ok(
      alerts[i].t - alerts[i - 1].t >= cfg.globalCooldownS,
      `${label}: alerts ${i - 1}→${i} only ${alerts[i].t - alerts[i - 1].t}s apart (rule: ≥${cfg.globalCooldownS}s)`,
    );
  }
  const byHazard = new Map<string, Alert[]>();
  for (const a of alerts) {
    byHazard.set(a.hazardId, [...(byHazard.get(a.hazardId) ?? []), a]);
    if (a.kind === "camera") {
      assert.ok(a.distanceM <= cfg.cameraTriggerM + 40, `${label}: camera spoke at ${a.distanceM} m`);
      assert.ok(a.distanceM > 0, `${label}: camera alert after passing`);
    }
    if (a.kind === "accident") assert.match(a.text, /kilometer framför dig/);
    if (a.kind === "slippery_segment") assert.match(a.text, /på vägen framför dig/);
    if (a.kind === "icing_point") assert.match(a.text, /framöver/);
    assert.ok(PRIORITY.includes(a.kind), `${label}: unknown kind ${a.kind}`);
    const fixTimes = new Set(trace.map((f) => f.t));
    assert.ok(fixTimes.has(a.t), `${label}: alert at t=${a.t} has no matching fix`);
  }
  for (const [id, list] of byHazard) {
    for (let i = 1; i < list.length; i++) {
      assert.ok(
        list[i].t - list[i - 1].t >= cfg.repeatMinS,
        `${label}: hazard ${id} repeated after only ${list[i].t - list[i - 1].t}s`,
      );
    }
  }
}

for (const f of vectorFiles) {
  test(`vector ${f}`, () => {
    const v = loadVector(f);
    const got = new AlertEngine(v.hazards, v.config ?? {}).run(v.trace);
    assert.deepStrictEqual(got, v.expected, `${v.name}: alert log drifted from frozen vector`);
    assertInvariants(got, v.trace, f);
  });
}

test("vectors cover every discipline rule", () => {
  const names = vectorFiles.join(" ");
  for (const need of ["priority", "throttle", "no_repeat", "silent_drive", "stationary", "segment", "icing"]) {
    assert.ok(names.includes(need), `missing a vector for: ${need}`);
  }
  // The silence vector must actually be silent — the product's soul, asserted twice.
  const silent = loadVector("v11_silent_drive.json");
  assert.equal(silent.expected.length, 0);
});

test("real Skåne snapshot: only camera alerts in August, throttle respected", () => {
  const got = new AlertEngine(fixture.hazards).run(fixture.trace);
  assert.deepStrictEqual(got, fixture.expected);
  assertInvariants(got, fixture.trace, "skane_vag108");
  assert.ok(got.length >= 2, "route passes several real cameras; expected multiple alerts");
  for (const a of got) {
    assert.equal(a.kind, "camera", "August + Normalt segments + warm surfaces ⇒ cameras only");
  }
});

test("determinism: identical input ⇒ byte-identical alert log", () => {
  for (const input of [loadVector("v04_priority_drop.json"), fixture]) {
    const a = JSON.stringify(new AlertEngine(input.hazards).run(input.trace));
    const b = JSON.stringify(new AlertEngine(input.hazards).run(input.trace));
    assert.equal(a, b);
  }
});
