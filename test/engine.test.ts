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
  updates?: { atT: number; hazards: Hazard[] }[];
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

/** The one utterance allowed to omit the distance (DECISIONS #28, second step). */
const REMINDER = "Sakta ner — olycksplats strax framför dig.";

/** The discipline rules, checked independently of any expected-log blessing. */
function assertInvariants(alerts: Alert[], trace: Fix[], label: string): void {
  const cfg = DEFAULT_CONFIG;
  for (let i = 1; i < alerts.length; i++) {
    // The floor is PRIORITY-AWARE (#127): inside the window only a MORE important hazard may
    // speak. Until 20/9 this check demanded ≥ 10 s between ALL alerts and would have failed the
    // very vector that proves the breakthrough (v27) — test and engine contradicted each other.
    const gapS = alerts[i].t - alerts[i - 1].t;
    const moreImportant = PRIORITY.indexOf(alerts[i].kind) < PRIORITY.indexOf(alerts[i - 1].kind);
    assert.ok(
      gapS >= cfg.globalCooldownS || moreImportant,
      `${label}: alerts ${i - 1}→${i} only ${gapS}s apart (rule: ≥${cfg.globalCooldownS}s unless more important)`,
    );
  }
  const byHazard = new Map<string, Alert[]>();
  for (const a of alerts) {
    byHazard.set(a.hazardId, [...(byHazard.get(a.hazardId) ?? []), a]);
    if (a.kind === "camera") {
      assert.ok(a.distanceM <= cfg.cameraTriggerM + 40, `${label}: camera spoke at ${a.distanceM} m`);
      assert.ok(a.distanceM > 0, `${label}: camera alert after passing`);
    }
    if (a.kind === "accident") {
      // DECISIONS #28: an accident alert either states the distance in plain words, or it
      // is the second step of a serious two-step warning. Nothing else may pass.
      const statesDistance = /kilometer framför dig/.test(a.text);
      assert.ok(
        statesDistance || a.text === REMINDER,
        `${label}: accident text is neither a distance line nor the reminder: "${a.text}"`,
      );
    }
    if (a.kind === "slippery_segment") assert.match(a.text, /på vägen framför dig/);
    if (a.kind === "icing_point") assert.match(a.text, /framöver/);
    assert.ok(PRIORITY.includes(a.kind), `${label}: unknown kind ${a.kind}`);
    const fixTimes = new Set(trace.map((f) => f.t));
    assert.ok(fixTimes.has(a.t), `${label}: alert at t=${a.t} has no matching fix`);
  }
  for (const [id, list] of byHazard) {
    for (let i = 1; i < list.length; i++) {
      const gapS = list[i].t - list[i - 1].t;
      if (gapS >= cfg.repeatMinS) continue;

      // The ONLY sanctioned exception to rule 2 (DECISIONS #28): a serious accident
      // speaks twice — early with the routing decision, close with the speed reminder.
      // Every condition below must hold, so this cannot be used to smuggle in a repeat.
      const [prev, cur] = [list[i - 1], list[i]];
      assert.equal(cur.kind, "accident",
        `${label}: hazard ${id} repeated after only ${gapS}s`);
      assert.equal(cur.text, REMINDER,
        `${label}: ${id} spoke twice inside ${cfg.repeatMinS}s but not with the reminder line`);
      assert.match(prev.text, /^Allvarlig olycka/,
        `${label}: ${id} gave a reminder without a preceding serious early call`);
      assert.equal(list.length, 2,
        `${label}: ${id} spoke ${list.length} times — the two-step is exactly two`);
      assert.ok(cur.distanceM < prev.distanceM,
        `${label}: ${id} reminder at ${cur.distanceM} m is not closer than ${prev.distanceM} m`);
      assert.ok(gapS >= cfg.globalCooldownS,
        `${label}: ${id} two-step steps only ${gapS}s apart`);
    }
  }
}

for (const f of vectorFiles) {
  test(`vector ${f}`, () => {
    const v = loadVector(f);
    const engine = new AlertEngine(v.hazards, v.config ?? {});
    const updates: { atT: number; hazards: Hazard[] }[] = v.updates ?? [];
    let u = 0;
    const got: Alert[] = [];
    for (const fix of v.trace) {
      while (u < updates.length && fix.t >= updates[u].atT) engine.updateHazards(updates[u++].hazards);
      const a = engine.step(fix);
      if (a) got.push(a);
    }
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

test("fläckvis is not halka — Swedish word boundaries in slippery matching", () => {
  const trace: Fix[] = Array.from({ length: 121 }, (_, t) => ({
    t, lon: 15.0, lat: 58.0 + (t * 22.222) / 111320, speedKmh: 80,
  }));
  const seg = (info: string[]): Hazard => ({
    id: "s", kind: "slippery_segment",
    line: [[14.99, 58.018], [15.01, 58.018]], meta: { code: 1, info },
  });
  // Real August data that fooled the substring regex:
  assert.equal(new AlertEngine([seg(["fläckvis Våt", "fläckvis Torrt"])]).run(trace).length, 0);
  // Genuine winter vocabulary must still fire:
  for (const info of [["Isfläckar"], ["Svår halka"], ["Packad snö"], ["Risk för halka"]]) {
    assert.equal(new AlertEngine([seg(info)]).run(trace).length, 1, info.join());
  }
  // Compounds the word-start rule silenced (kort #97, 16/9) — the operator wrote the word:
  for (const info of [["Rimfrost"], ["Nysnö"], ["Halkrisk"], ["Halt"], ["Blötsnö"], ["Nattfrost"], ["Halkigt"]]) {
    assert.equal(new AlertEngine([seg(info)]).run(trace).length, 1, info.join());
  }
  // Countermeasures share a stem but are not hazards:
  for (const info of [["Halkbekämpning"], ["Halkskydd"]]) {
    assert.equal(new AlertEngine([seg(info)]).run(trace).length, 0, info.join());
  }
});
