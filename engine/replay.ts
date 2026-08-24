// Replay harness — run a recorded/synthetic drive through the alert engine and print
// the alert log. This is how we validate warning quality against archived snapshots
// long before any Android code exists (PLAN Phase 0.4).
//
//   node --experimental-strip-types engine/replay.ts engine/vectors/v01_camera_simple.json
//   node --experimental-strip-types engine/replay.ts --hazards h.json --trace t.json
//
// Output is deterministic: same input file ⇒ byte-identical log. Exit 1 on any mismatch
// when the input file contains an `expected` array (vector mode).

import { readFileSync } from "node:fs";
import { AlertEngine } from "./src/engine.ts";
import type { Alert, Fix, Hazard } from "./src/types.ts";

interface VectorFile {
  name?: string;
  description?: string;
  config?: Record<string, number>;
  hazards: Hazard[];
  trace: Fix[];
  expected?: Alert[];
}

function load(): VectorFile {
  const args = process.argv.slice(2);
  if (args[0] === "--hazards") {
    return {
      hazards: JSON.parse(readFileSync(args[1], "utf8")),
      trace: JSON.parse(readFileSync(args[3], "utf8")),
    };
  }
  return JSON.parse(readFileSync(args[0], "utf8"));
}

const v = load();
const engine = new AlertEngine(v.hazards, v.config ?? {});
const alerts = engine.run(v.trace);

console.log(`# ${v.name ?? "replay"} — ${v.trace.length} fixes, ${v.hazards.length} hazards`);
if (v.description) console.log(`# ${v.description}`);
for (const a of alerts) {
  console.log(`t=${String(a.t).padStart(5)}s  ${a.kind.padEnd(17)} ${String(a.distanceM).padStart(5)} m  "${a.text}"`);
}
if (alerts.length === 0) console.log("(tystnad — inga varningar)");

if (v.expected) {
  const ok = JSON.stringify(alerts) === JSON.stringify(v.expected);
  console.log(ok ? "VECTOR: PASS" : "VECTOR: FAIL");
  if (!ok) {
    console.log("expected:", JSON.stringify(v.expected, null, 2));
    console.log("got:", JSON.stringify(alerts, null, 2));
    process.exit(1);
  }
}
