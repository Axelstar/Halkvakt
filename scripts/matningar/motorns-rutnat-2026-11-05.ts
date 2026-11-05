// THE ENGINE'S GRID, MEASURED (DECISIONS #795). step() µs per fix along the Skåne fixture's trace (road 108, 488 fixes at 80 km/h),
// with 3 000 point hazards across Sweden plus 0–32 000 extra kandidat points (stretches of ten points two kilometres apart, also
// across Sweden), before the grid (the full scan, `bruteForce`) and after. Both paths must give the same log; the script fails
// otherwise. Seeded, so every run builds the same hazards; the times are this machine's.
//
//   node --experimental-strip-types scripts/matningar/motorns-rutnat-2026-11-05.ts
import { readFileSync } from "node:fs";
import { AlertEngine } from "../../engine/src/engine.ts";
import type { Fix, Hazard } from "../../engine/src/types.ts";

const fixture: { hazards: Hazard[]; trace: Fix[] } =
  JSON.parse(readFileSync(new URL("../../engine/fixtures/skane_vag108.json", import.meta.url), "utf8"));

function rng(seed: number): () => number {   // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = rng(795);
const lon = () => 11 + 13 * r(), lat = () => 55.3 + 13.7 * r();   // Sweden's box

const points: Hazard[] = [];
for (let i = 0; i < 3000; i++) {
  const u = r();
  if (u < 0.4) points.push({ id: `cam${i}`, kind: "camera", lon: lon(), lat: lat(), bearing: 360 * r() });
  else if (u < 0.7) points.push({ id: `vilt${i}`, kind: "wildlife", lon: lon(), lat: lat() });
  else if (u < 0.95) points.push({ id: `wx${i}`, kind: "icing_point", lon: lon(), lat: lat(), meta: { surfaceTempC: 4 * r() - 2, moisture: r() < 0.5 } });
  else points.push({ id: `olycka${i}`, kind: "accident", lon: lon(), lat: lat(), meta: { severityCode: r() < 0.5 ? 5 : 2 } });
}
const kandidater: Hazard[] = [];
for (let s = 0; s < 3200; s++) {
  const b = 2 * Math.PI * r(), x = lon(), y = lat(), pts: [number, number][] = [];
  for (let k = 0; k < 10; k++) pts.push([x + (k * 0.018 * Math.sin(b)) / Math.cos((y * Math.PI) / 180), y + k * 0.018 * Math.cos(b)]);
  kandidater.push({ id: `k${s}`, kind: "kandidat", points: pts });
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
function time(hazards: Hazard[], bruteForce: boolean): { usPerFix: number; log: string } {
  const runs: number[] = [];
  let log = "";
  for (let k = 0; k < 6; k++) {   // the first run warms up and is dropped
    const e = new AlertEngine(hazards);
    e.bruteForce = bruteForce;
    const t0 = performance.now();
    const alerts = e.run(fixture.trace);
    const t1 = performance.now();
    if (k > 0) runs.push(((t1 - t0) * 1000) / fixture.trace.length);
    log = JSON.stringify(alerts);
  }
  return { usPerFix: median(runs), log };
}

console.log("extra kandidat points | full scan µs/fix | grid µs/fix | faster | build ms (grid included in both)");
for (const extra of [0, 4000, 8000, 16000, 32000]) {
  const hazards = [...fixture.hazards, ...points, ...kandidater.slice(0, extra / 10)];
  const builds: number[] = [];
  for (let k = 0; k < 5; k++) { const t0 = performance.now(); new AlertEngine(hazards); builds.push(performance.now() - t0); }
  const full = time(hazards, true), grid = time(hazards, false);
  if (full.log !== grid.log) { console.error(`${extra}: the grid and the full scan gave different logs`); process.exit(1); }
  console.log(`${String(extra).padStart(21)} | ${full.usPerFix.toFixed(1).padStart(16)} | ${grid.usPerFix.toFixed(1).padStart(11)} | ` +
    `${(full.usPerFix / grid.usPerFix).toFixed(0).padStart(5)}× | ${median(builds).toFixed(1)}`);
}
