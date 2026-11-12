// THE GRID IS AN OPTIMISATION, NOT A RULE (DECISIONS #795). The engine evaluates only the hazards listed in the fix's grid cell;
// the full scan (`bruteForce`, test only) evaluates every hazard on every fix, as the engine did until 5/11. This file proves the
// two give the same answer — every step's alert and every suppression report — over seeded random hazard sets and traces built to
// sit on the bounds: hazards just inside and just outside each reach, on cell borders, around the antimeridian and the pole, with
// broken coordinates and fixes, NaN speeds, duplicate ids, snapshot swaps, odd configurations and the leadFor hook. Then the
// shared vectors, the Skåne fixture with 2 000 extra kandidat points and 3 000 wildlife points, and the window's tight edges.
// Motprov 5/11 (DECISIONS #795): each of these fails this file — the margin shrunk to −2 m, cos φ dropped from the longitude window,
// the lead reach taken from cfg alone (forgetting leadFor's ceiling), the NaN-lead full scan dropped, the antimeridian, pole or
// out-of-range-fix guard removed, the always-list dropped, and the camera or accident reach shortened. The edge counts below keep
// the random scenarios on the bounds so it stays that way. Kotlin (GridTest.kt) and Swift (GridTests.swift) run the same comparison.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { AlertEngine } from "../engine/src/engine.ts";
import { bearingDeg } from "../engine/src/geo.ts";
import { DEFAULT_CONFIG, type Alert, type EngineConfig, type Fix, type Hazard, type HazardKind } from "../engine/src/types.ts";

type Rng = () => number;
/** mulberry32: small and seeded — the same sequence on every machine. */
function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const between = (r: Rng, lo: number, hi: number) => lo + (hi - lo) * r();

const R = 6_371_000, D2R = Math.PI / 180;
/** The point dM metres from (lon, lat) along bearing bDeg on the sphere, longitude folded into [−180, 180). */
function dest(lon: number, lat: number, dM: number, bDeg: number): [number, number] {
  const d = dM / R, th = bDeg * D2R, p1 = lat * D2R, l1 = lon * D2R;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(th));
  const l2 = l1 + Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [((l2 / D2R + 540) % 360) - 180, p2 / D2R];
}

type Hook = (h: Hazard, leadM: number, speedMps: number) => number;
interface Scenario {
  name: string; cfg: Partial<EngineConfig>; hazards: Hazard[]; trace: Fix[];
  updates: { at: number; hazards: Hazard[] }[]; leadFor?: Hook;
}

const PLACES = [
  { name: "Skåne", lon: 13.15, lat: 55.38 },
  { name: "Kiruna", lon: 20.22, lat: 67.85 },
  { name: "southern hemisphere", lon: 151.2, lat: -33.9 },
  { name: "western hemisphere", lon: -74.0, lat: 40.7 },
  { name: "zero meridian", lon: 0.004, lat: 0.004 },   // rows and columns change sign under the fix
  { name: "antimeridian", lon: 179.97, lat: 65.0 },
  { name: "pole", lon: 10, lat: 89.8 },
];

function makeTrace(r: Rng, lon0: number, lat0: number, n: number): { fixes: Fix[]; headings: number[] } {
  const fixes: Fix[] = [], headings: number[] = [];
  let lon = lon0, lat = lat0, heading = between(r, 0, 360), speed = between(r, 30, 130), t = 0;
  for (let i = 0; i < n; i++) {
    const u = r();
    if (u < 0.03) speed = between(r, 150, 400);         // leads up to the 3 000 m ceiling
    else if (u < 0.05) speed = between(r, 0, 14);       // below minSpeedKmh
    else speed = Math.min(400, Math.max(0, speed + between(r, -6, 6)));
    heading = r() < 0.02 ? between(r, 0, 360) : (heading + between(r, -6, 6) + 360) % 360;
    const dt = r() < 0.9 ? 1 : pick(r, [0, 0.5, 2, 5]);
    t += dt;
    [lon, lat] = dest(lon, lat, (speed / 3.6) * dt, heading);
    const f: Fix = { t, lon, lat };
    if (r() < 0.7) f.speedKmh = speed;
    if (r() < 0.5) f.headingDeg = heading;
    fixes.push(f);
    headings.push(heading);
  }
  return { fixes, headings };
}

function makeConfig(r: Rng): Partial<EngineConfig> {
  const c: Partial<EngineConfig> = {};
  if (r() < 0.35) return c;
  if (r() < 0.5) c.leadMaxM = pick(r, [400, 1200, 2000, 3000, 6000, 12000]);
  if (r() < 0.3) c.leadMinM = pick(r, [100, 400, 900]);
  if (r() < 0.3) c.warnLeadS = pick(r, [10, 30, 90, 200]);
  if (r() < 0.3) c.cameraTriggerM = pick(r, [150, 500, 1500]);
  if (r() < 0.3) c.accidentMaxAheadM = pick(r, [3000, 10000, 25000]);
  if (r() < 0.2) c.accidentNearM = pick(r, [500, 2000, 4000]);
  if (r() < 0.3) c.segmentSampleM = pick(r, [30, 100, 400]);
  if (r() < 0.3) c.corridorHalfAngleDeg = pick(r, [20, 35, 90, 180]);
  if (r() < 0.4) { c.repeatMinS = pick(r, [30, 120, 600]); c.repeatMinM = pick(r, [200, 1000, 5000]); }
  if (r() < 0.2) c.globalCooldownS = pick(r, [0, 3, 10]);
  if (r() < 0.2) c.kandidatTakS = pick(r, [0, 60, 600]);
  if (r() < 0.2) c.kandidatEfterHalkaS = pick(r, [0, 120, 900]);
  if (r() < 0.2) c.halkZonM = pick(r, [0, 500, 3000]);
  if (r() < 0.05) c.leadMaxM = pick(r, [NaN, Infinity, -5]);   // windows that bound nothing: always evaluated
  if (r() < 0.05) c.cameraTriggerM = pick(r, [NaN, Infinity]);
  return c;
}

/** Pure, per hazard id: the försprång's sweep, the plain lead, a value far over the ceiling, or something odd. */
function makeHook(r: Rng): Hook {
  const odd = pick(r, [NaN, 50, -1, Infinity]);
  return (h, leadM, v) => {
    let x = 0;
    for (let i = 0; i < h.id.length; i++) x = (x * 31 + h.id.charCodeAt(i)) >>> 0;
    return [v * 90, leadM, 1e9, odd][x % 4];
  };
}

function makeHazards(r: Rng, trace: Fix[], headings: number[], cfg: EngineConfig, n: number, tag: string, broken: number): Hazard[] {
  const out: Hazard[] = [];
  const leadReach = Math.max(cfg.leadMaxM, DEFAULT_CONFIG.leadMaxM);
  const finite = (x: number, alt: number) => (Number.isFinite(x) ? x : alt);
  const distance = (bound: number) => {
    const u = r();
    if (u < 0.35) return Math.max(0, bound + between(r, -60, 60));   // on the edge of the reach
    if (u < 0.5) return bound + between(r, 60, 400);                // just outside
    return between(r, 0, Math.min(bound * 1.3, 15000));
  };
  let heading = 0;   // the anchor fix's heading, for a camera's bearing
  const place = (bound: number): [number, number] => {
    const i = Math.floor(r() * trace.length), f = trace[i];
    heading = headings[i];
    const b = r() < 0.75 ? heading + between(r, -40, 40) : between(r, 0, 360);
    let [lon, lat] = dest(f.lon, f.lat, distance(bound), b);
    if (r() < 0.08) lat = Math.round(lat / 0.05) * 0.05 + pick(r, [-1e-9, 0, 1e-9]);   // on a cell border
    if (r() < 0.08) lon = Math.round(lon / 0.05) * 0.05 + pick(r, [-1e-9, 0, 1e-9]);
    if (r() < broken) {
      if (r() < 0.5) lon = pick(r, [NaN, Infinity, 181, -200, 360.0001]);
      else lat = pick(r, [NaN, -Infinity, 91, -95]);
    }
    return [lon, lat];
  };
  const ids: Record<string, string[]> = {};
  const id = (kind: string) => {
    const seen = (ids[kind] ??= []);
    if (seen.length && r() < 0.05) return pick(r, seen);   // duplicate id: order must not matter more than before
    const v = `${tag}${kind}${seen.length}`;
    seen.push(v);
    return v;
  };
  for (let j = 0; j < n; j++) {
    const kind = pick(r, ["camera", "camera", "accident", "icing_point", "wildlife", "slippery_segment", "kandidat", "kandidat"] as const);
    if (kind === "camera") {
      const [lon, lat] = place(finite(cfg.cameraTriggerM, 500));
      const bearing = r() < 0.6 ? (heading + 180 + between(r, -90, 90) + 360) % 360 : null;
      out.push({ id: id(kind), kind, lon, lat, bearing, meta: { speedLimitKmh: pick(r, [null, 70, 90]) } });
    } else if (kind === "accident") {
      const [lon, lat] = place(r() < 0.3 ? cfg.accidentNearM : finite(cfg.accidentMaxAheadM, 10000));
      out.push({ id: id(kind), kind, lon, lat,
        meta: { severityCode: pick(r, [null, 1, 2, 4, 5, 5]), road: pick(r, [null, "E22", "108"]), endTimeLocal: pick(r, [null, "14:30"]) } });
    } else if (kind === "icing_point") {
      const [lon, lat] = place(finite(leadReach, 3000));
      out.push({ id: id(kind), kind, lon, lat, meta: {
        surfaceTempC: pick(r, [-3, 0.5, 1, 1.5, 2.5, 3, 4, null]), moisture: r() < 0.6, bridge: r() < 0.2,
        rainH: pick(r, [null, 0.5, 1.9, 3]), fall30C: pick(r, [null, 0.5, 0.8, 1.5]) } });
    } else if (kind === "wildlife") {
      const [lon, lat] = place(finite(leadReach, 3000));
      out.push({ id: id(kind), kind, lon, lat, meta: r() < 0.3 ? undefined : { active: r() < 0.8 } });
    } else if (kind === "slippery_segment") {
      const line: [number, number][] = [place(finite(leadReach, 3000))];
      let b = between(r, 0, 360);
      for (let k = 1 + Math.floor(r() * 5); k > 0; k--) {
        const [lon, lat] = line[line.length - 1];
        b += between(r, -30, 30);
        line.push(Number.isFinite(lon) && Number.isFinite(lat) ? dest(lon, lat, between(r, 50, 1500), b) : place(3000));
      }
      out.push({ id: id(kind), kind, line, meta: {
        code: pick(r, [null, 1, 2, 3, 4]), info: pick(r, [[], ["Is"], ["Våt"], ["fläckvis Våt"], ["Snöfläckar"], ["Normalt"]]) } });
    } else {
      const points: [number, number][] = [place(finite(leadReach, 3000))];
      const b = between(r, 0, 360), step = between(r, 200, 2500);
      for (let k = Math.floor(r() * 12); k > 0; k--) {
        const [lon, lat] = points[points.length - 1];
        points.push(Number.isFinite(lon) && Number.isFinite(lat) ? dest(lon, lat, step, b + between(r, -20, 20)) : place(3000));
      }
      const segs = out.filter((h) => h.kind === "slippery_segment");
      out.push({ id: id(kind), kind, points, ...(segs.length && r() < 0.5 ? { segmentHazardId: pick(r, segs).id } : {}) });
    }
  }
  return out;
}

function scenario(seed: number): Scenario {
  const r = rng(seed);
  const place = PLACES[seed % PLACES.length];
  const cfg = makeConfig(r);
  const full = { ...DEFAULT_CONFIG, ...cfg };
  const { fixes, headings } = makeTrace(r, place.lon, place.lat, 200 + Math.floor(r() * 300));
  const broken = seed % 5 === 0 ? 0.05 : 0;
  if (broken) {   // fixes the grid cannot place (outside [−90, 90] × [−180, 180], not numbers) and a NaN speed (a NaN lead)
    for (let k = 0; k < 4; k++) {
      const i = Math.floor(r() * fixes.length);
      fixes[i] = { ...fixes[i], ...pick(r, [{ lon: fixes[i].lon + 360 }, { lon: 180.5 }, { lat: 90.5 }, { lon: NaN }, { speedKmh: NaN }]) };
    }
  }
  const hazards = makeHazards(r, fixes, headings, full, Math.floor(r() * 130), "a", broken);
  const updates: Scenario["updates"] = [];
  if (r() < 0.3) {   // a fresh snapshot mid-drive: some hazards kept (reordered), some new
    const kept = hazards.filter(() => r() < 0.6).sort(() => r() - 0.5);
    updates.push({ at: Math.floor(r() * fixes.length), hazards: [...kept, ...makeHazards(r, fixes, headings, full, Math.floor(r() * 80), "b", broken)] });
  }
  return { name: `seed ${seed} (${place.name})`, cfg, hazards, trace: fixes, updates, leadFor: r() < 0.35 ? makeHook(r) : undefined };
}

/** Both paths side by side; every step's answer and every suppression report must be equal. */
function runBoth(s: Scenario): { alerts: Alert[]; gridCalls: number; fullCalls: number } {
  const make = (bruteForce: boolean) => {
    const e = new AlertEngine(s.hazards, s.cfg);
    e.bruteForce = bruteForce;
    const sup: unknown[] = [];
    e.onSuppressed = (c) => sup.push(c);
    const box = { e, sup, calls: 0 };
    // Counted for point hazards only: the stretches take the full scan under leadFor (engine.ts step()).
    if (s.leadFor) { const f = s.leadFor; e.leadFor = (h, l, v) => { if (h.kind !== "slippery_segment" && h.kind !== "kandidat") box.calls++; return f(h, l, v); }; }
    return box;
  };
  const g = make(false), f = make(true);
  const alerts: Alert[] = [];
  let u = 0;
  for (let i = 0; i < s.trace.length; i++) {
    while (u < s.updates.length && s.updates[u].at === i) { g.e.updateHazards(s.updates[u].hazards); f.e.updateHazards(s.updates[u].hazards); u++; }
    const a = g.e.step(s.trace[i]), b = f.e.step(s.trace[i]);
    assert.deepStrictEqual(a, b, `${s.name}, fix ${i}: the grid and the full scan disagree`);
    if (a) alerts.push(a);
  }
  assert.deepStrictEqual(g.sup, f.sup, `${s.name}: the suppression reports differ`);
  return { alerts, gridCalls: g.calls, fullCalls: f.calls };
}

test("the grid says exactly what the full scan says — 300 seeded scenarios on the bounds", (t) => {
  const kinds = new Map<HazardKind, number>();
  const steps = new Set<string>();
  const edge = { camera: 0, accident: 0, lead: 0 };
  let alerts = 0, gridCalls = 0, fullCalls = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const s = scenario(seed);
    const out = runBoth(s);
    gridCalls += out.gridCalls; fullCalls += out.fullCalls;
    const cfg = { ...DEFAULT_CONFIG, ...s.cfg };
    const leadReach = s.leadFor ? DEFAULT_CONFIG.leadMaxM : cfg.leadMaxM;
    for (const a of out.alerts) {
      alerts++;
      kinds.set(a.kind, (kinds.get(a.kind) ?? 0) + 1);
      if (a.step) steps.add(a.step);
      if (a.beta && a.kind === "icing_point") steps.add("beta");
      // Alerts within 60 m of their reach: what a shrunk bound would lose first.
      if (a.kind === "camera" && cfg.cameraTriggerM - a.distanceM <= 60) edge.camera++;
      if (a.kind === "accident" && (a.step === undefined || a.step === "early") && cfg.accidentMaxAheadM - a.distanceM <= 60) edge.accident++;
      if (["icing_point", "wildlife", "slippery_segment", "kandidat"].includes(a.kind) && leadReach - a.distanceM <= 60) edge.lead++;
    }
  }
  // Not a vacuous comparison: every kind spoke, every accident step and the beta occurred, many alerts sat on a bound.
  for (const k of ["accident", "slippery_segment", "icing_point", "wildlife", "camera", "kandidat"] as const) {
    assert.ok((kinds.get(k) ?? 0) >= 20, `only ${kinds.get(k) ?? 0} ${k} alerts`);
  }
  for (const st of ["early", "reminder", "late", "beta"]) assert.ok(steps.has(st), `no ${st} alert`);
  assert.ok(alerts >= 3000, `only ${alerts} alerts`);
  assert.ok(edge.camera >= 30 && edge.accident >= 30 && edge.lead >= 30, `too few alerts on a bound: ${JSON.stringify(edge)}`);
  // And the grid did prune: leadFor is asked only for the hazards a fix evaluates.
  t.diagnostic(`${alerts} alerts, on a bound ${JSON.stringify(edge)}, leadFor asked for ${gridCalls} of ${fullCalls} points`);
  assert.ok(gridCalls < fullCalls * 0.7, `the grid evaluated ${gridCalls} of ${fullCalls} icing and wildlife points`);
});

interface VectorFile { name: string; hazards: Hazard[]; trace: Fix[]; updates?: { atT: number; hazards: Hazard[] }[]; config?: Partial<EngineConfig> }

test("the shared vectors and the Skåne fixture: the grid and the full scan give the same log", () => {
  const dir = new URL("../engine/vectors/", import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => new URL(f, dir));
  files.push(new URL("../engine/fixtures/skane_vag108.json", import.meta.url));
  for (const file of files) {
    const v: VectorFile = JSON.parse(readFileSync(file, "utf8"));
    const updates = (v.updates ?? []).map((u) => ({ at: v.trace.findIndex((f) => f.t >= u.atT), hazards: u.hazards }));
    runBoth({ name: v.name, cfg: v.config ?? {}, hazards: v.hazards, trace: v.trace, updates });
  }
});

// S (DECISIONS #844): small roads along the Skåne drive — some on it, some at the road test's margin (40, 70, 90 m) and some beside it
// (150 m) — plus roads across it, with a third of their points warning. The road test and the warning both run on the grid's lists.
// The drive is 488 s, so the silence after a call is switched off (smavagTystS = smavagTystM = 0) for the comparison to see many.
test("the Skåne fixture with small roads along and across the drive: the grid and the full scan give the same log", () => {
  const fx: VectorFile = JSON.parse(readFileSync(new URL("../engine/fixtures/skane_vag108.json", import.meta.url), "utf8"));
  const r = rng(828);
  const extra: Hazard[] = [];
  const steg = 20;
  for (let s = 0; s + steg * 6 < fx.trace.length; s += steg * 6) {
    const av = pick(r, [0, 0, 40, 70, 90, 150] as const);
    const points: [number, number][] = [];
    for (let k = 0; k < 6; k++) {
      const a = fx.trace[s + k * steg], b = fx.trace[s + k * steg + 1];
      points.push(dest(a.lon, a.lat, av, bearingDeg(a, b) + 90));
    }
    const warn = points.flatMap((_, i) => (r() < 1 / 2 ? [i] : []));
    extra.push({ id: `smv:l${s}`, kind: "smavag", points, warn });
    const f = fx.trace[s + 3 * steg], g = fx.trace[s + 3 * steg + 1];
    const tvars = [-1350, -450, 450, 1350].map((m) => dest(f.lon, f.lat, m, bearingDeg(f, g) + 90));
    extra.push({ id: `smv:t${s}`, kind: "smavag", points: tvars, warn: [0, 1, 2, 3] });
  }
  const hazards = [...fx.hazards, ...extra];
  const run = runBoth({ name: "Skåne + småvägar", cfg: { smavagTystS: 0, smavagTystM: 0 }, hazards, trace: fx.trace, updates: [] });
  assert.ok(run.alerts.filter((a) => a.kind === "smavag").length >= 3, "the small roads along the drive must speak");
  runBoth({ name: "Skåne + småvägar, standardtystnaden", cfg: {}, hazards, trace: fx.trace, updates: [] });
});

test("the Skåne fixture with 2 000 kandidat points along the road and 3 000 wildlife points in the county: same log, a fraction of the work", () => {
  const fx: VectorFile = JSON.parse(readFileSync(new URL("../engine/fixtures/skane_vag108.json", import.meta.url), "utf8"));
  const r = rng(108);
  const extra: Hazard[] = [];
  for (let s = 0; s < 200; s++) {
    const f = fx.trace[Math.floor(r() * fx.trace.length)];
    const points: [number, number][] = [];
    for (let k = 0; k < 10; k++) points.push(dest(f.lon, f.lat, between(r, 0, 4000), between(r, 0, 360)));
    extra.push({ id: `k${s}`, kind: "kandidat", points });
  }
  for (let w = 0; w < 3000; w++) {
    const f = fx.trace[Math.floor(r() * fx.trace.length)];
    const [lon, lat] = w % 100 === 0 ? dest(f.lon, f.lat, between(r, 0, 300), between(r, 0, 360))   // thirty by the road
      : [between(r, 12.5, 14.5), between(r, 55.3, 56.5)];
    extra.push({ id: `w${w}`, kind: "wildlife", lon, lat });
  }
  const hazards = [...fx.hazards, ...extra];
  const plain = runBoth({ name: "Skåne + kandidater", cfg: {}, hazards, trace: fx.trace, updates: [] });
  assert.ok(plain.alerts.some((a) => a.kind === "kandidat"), "the kandidat points must speak");
  assert.ok(plain.alerts.some((a) => a.kind === "wildlife"), "the wildlife points must speak");
  const hooked = runBoth({ name: "Skåne + kandidater, leadFor", cfg: {}, hazards, trace: fx.trace, updates: [], leadFor: (_h, leadM) => leadM });
  assert.deepStrictEqual(hooked.alerts, plain.alerts, "a hook that returns the plain lead changes nothing");
  assert.ok(hooked.gridCalls < hooked.fullCalls / 20, `the grid evaluated ${hooked.gridCalls} of ${hooked.fullCalls} wildlife points`);
});

test("the window's north and south edges: a hazard 0.5 m inside its reach speaks wherever the cell borders fall", () => {
  // The latitude bound is reached exactly due north and due south (|Δφ| = distM / R), so a fix there tests the margin itself: the
  // window's edge sweeps across the cell borders in 2.2 m steps, and every hazard has one fix 0.5 m inside its reach. A margin
  // shrunk by a few metres leaves some of those fixes outside the listed cells, and the comparison fails.
  const cases = [
    { reach: 500, speedKmh: 80, hazard: (lon: number, lat: number): Hazard => ({ id: "kamera", kind: "camera", lon, lat }) },
    { reach: 10_000, speedKmh: 80, hazard: (lon: number, lat: number): Hazard => ({ id: "olycka", kind: "accident", lon, lat }) },
    { reach: 3000, speedKmh: 400, hazard: (lon: number, lat: number): Hazard => ({ id: "vilt", kind: "wildlife", lon, lat }) },
  ];
  let spoke = 0;
  for (const c of cases) {
    for (let j = 0; j < 3000; j++) {
      for (const north of [true, false]) {
        const lon = 15, lat = 59 + j * 0.00002;
        const [flon, flat] = dest(lon, lat, c.reach - 0.5, north ? 0 : 180);
        const fix: Fix = { t: 0, lon: flon, lat: flat, speedKmh: c.speedKmh, headingDeg: north ? 180 : 0 };
        spoke += runBoth({ name: `${c.reach} m ${north ? "north" : "south"}, step ${j}`, cfg: {}, hazards: [c.hazard(lon, lat)],
                           trace: [fix], updates: [] }).alerts.length;
      }
    }
  }
  assert.equal(spoke, cases.length * 3000 * 2, "every hazard 0.5 m inside its reach must speak");
});
