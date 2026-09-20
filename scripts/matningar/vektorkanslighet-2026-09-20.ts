// Vektorkänslighet (kort #212, 20/9): hur långt kan varje tröskel i DEFAULT_CONFIG flyttas innan en
// enda vektor (eller Skåneturen) ändrar sin utdata? Genomlysningen 20/9 mätte korridoren 5°–90° och
// reprisavståndet 0–50 000 m "utan att ett enda prov reagerar" — den här mätningen är samma metod, i
// repot, så att den kan köras om varje gång en vektor läggs till. Läser bara; skriver inget.
//   node --experimental-strip-types scripts/matningar/vektorkanslighet-2026-09-20.ts
import { readFileSync, readdirSync } from "node:fs";
import { AlertEngine } from "../../engine/src/engine.ts";
import { DEFAULT_CONFIG, type EngineConfig, type Fix, type Hazard, type Alert } from "../../engine/src/types.ts";

type V = { name: string; hazards: Hazard[]; trace: Fix[]; expected: Alert[]; updates?: { atT: number; hazards: Hazard[] }[]; config?: Partial<EngineConfig> };
const dir = new URL("../../engine/vectors/", import.meta.url);
const vektorer: [string, V][] = readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
  .map((f) => [f, JSON.parse(readFileSync(new URL(f, dir), "utf8"))]);
vektorer.push(["skane_vag108", JSON.parse(readFileSync(new URL("../../engine/fixtures/skane_vag108.json", import.meta.url), "utf8"))]);

function kor(v: V, cfg: Partial<EngineConfig>): string {
  const e = new AlertEngine(v.hazards, { ...(v.config ?? {}), ...cfg });
  const ups = v.updates ?? []; let u = 0; const ut: Alert[] = [];
  for (const fix of v.trace) { while (u < ups.length && fix.t >= ups[u].atT) e.updateHazards(ups[u++].hazards); const a = e.step(fix); if (a) ut.push(a); }
  return JSON.stringify(ut);
}
/** Första vektorn som ändrar utdata vid värdet, eller null om alla står. */
function bryter(nyckel: keyof EngineConfig, varde: number): string | null {
  for (const [namn, v] of vektorer) if (kor(v, { [nyckel]: varde }) !== JSON.stringify(v.expected)) return namn;
  return null;
}
// Svep: från standardvärdet utåt i angivna steg tills något bryter, åt båda hållen.
const SVEP: [keyof EngineConfig, number, number, number][] = [ // nyckel, steg, min, max
  ["corridorHalfAngleDeg", 0.1, 0, 180],
  ["repeatMinM", 10, 0, 60_000],
  ["repeatMinS", 1, 0, 3600],
  ["cameraBearingToleranceDeg", 0.5, 0, 180],
  ["minSpeedKmh", 0.1, 0, 120],
  ["leadMinM", 1, 0, 3000],
  ["leadMaxM", 10, 0, 20_000],
  ["cameraTriggerM", 1, 0, 3000],
  ["accidentMaxAheadM", 1, 0, 30_000],
  ["accidentNearM", 1, 0, 10_000],
  ["globalCooldownS", 1, 0, 120],
  ["warnLeadS", 1, 0, 300],
];
const r = (x: number) => Math.round(x * 10) / 10;
console.log(`${vektorer.length - 1} vektorer + Skåneturen. Intervall där INGEN vektor reagerar (utanför: första som bryter):\n`);
console.log(`  tröskel                     standard   intervall utan reaktion        bryter under          bryter över`);
for (const [nyckel, steg, min, max] of SVEP) {
  const std = DEFAULT_CONFIG[nyckel];
  let lo = std, hi = std, brytLo: string | null = null, brytHi: string | null = null;
  for (let x = std - steg; x >= min - 1e-9; x -= steg) { const b = bryter(nyckel, r(x)); if (b) { brytLo = `${b} @ ${r(x)}`; break; } lo = r(x); }
  for (let x = std + steg; x <= max + 1e-9; x += steg) { const b = bryter(nyckel, r(x)); if (b) { brytHi = `${b} @ ${r(x)}`; break; } hi = r(x); }
  console.log(`  ${nyckel.padEnd(27)} ${String(std).padStart(8)}   ${`${lo} – ${hi}`.padEnd(30)} ${(brytLo ?? "(golvet)").padEnd(21)} ${brytHi ?? "(taket)"}`);
}
