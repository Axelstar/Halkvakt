// LÄNGS LINJEN MOT REKTANGELN — tjänar skuggan på urvalet? (DECISIONS #528, Bengt 11/10: "gör 2"; förslaget: mät först.)
// LÄS-ONLY: dagens lägesfil ur CDN:et och skuggmotorns 30 rutter (ROUTES och ROUTES_C ur supabase/functions/skuggmotor/main.ts).
// Per rutt: farorna rektangeln ger (farorNaraRutten, skuggans förfilter i dag) och farorna linjen ger (farorLangsRutten med samma
// marginal, FARA_MARGINAL_KM), motorns tid med båda, och att varningarna och de undanträngda blir EXAKT desamma — annars duger urvalet
// inte som förfilter, hur mycket det än sparar. Spåret byggs som skuggmotorns traceAlong (80 km/h, 5 s).
// Kör: node --experimental-strip-types scripts/matningar/rutfilter-langs-linjen-2026-10-11.ts
import { readFileSync } from "node:fs";
import { AlertEngine } from "../../engine/src/engine.ts";
import { snapshotToHazards } from "../../engine/src/snapshot.ts";
import { haversineM } from "../../engine/src/geo.ts";
import { farorNaraRutten, farorLangsRutten, FARA_MARGINAL_KM } from "../../engine/src/rutfilter.ts";
import { lasRutter } from "../../publish/skuggfacit.ts";
import type { Fix, Hazard } from "../../engine/src/types.ts";

const CDN = "https://axelstar.github.io/halkvakt-karta/data/app/v1/";
const kod = readFileSync(new URL("../../supabase/functions/skuggmotor/main.ts", import.meta.url), "utf8");
// ROUTES_C läses som ROUTES: samma form, annan rubrik.
const rutterC = lasRutter(kod.replace("const ROUTES: Record", "const ROUTES_X: Record").replace("const ROUTES_C: Record", "const ROUTES: Record"));
const rutter = { ...lasRutter(kod), ...rutterC };

function traceAlong(line: [number, number][], kmh = 80, stepS = 5): Fix[] {
  const mps = (kmh * 1000) / 3600; const fixes: Fix[] = []; let t = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [lon1, lat1] = line[i], [lon2, lat2] = line[i + 1];
    const steps = Math.max(1, Math.round(haversineM({ lon: lon1, lat: lat1 }, { lon: lon2, lat: lat2 }) / (mps * stepS)));
    for (let s = 0; s < steps; s++) { const f = s / steps; fixes.push({ t, lon: lon1 + (lon2 - lon1) * f, lat: lat1 + (lat2 - lat1) * f, speedKmh: kmh } as Fix); t += stepS; }
  }
  return fixes;
}
const kor = (h: Hazard[], trace: Fix[]) => {
  const m = new AlertEngine(h); const sup: unknown[] = []; m.onSuppressed = (c) => sup.push(c);
  const t0 = performance.now(); const alerts = m.run(trace); return { alerts, sup, ms: performance.now() - t0 };
};

const [st, lv] = await Promise.all([fetch(CDN + "static.json").then((r) => r.json()), fetch(CDN + "live.json").then((r) => r.json())]);
const hazards = snapshotToHazards(st, lv);
console.log(`mätt: lägesfilen ${lv.generated_at}: ${hazards.length} faror · ${Object.keys(rutter).length} rutter · marginalen ${FARA_MARGINAL_KM} km`);
let sumR = 0, sumL = 0, msR = 0, msL = 0, msF = 0, olika = 0;
for (const [namn, line] of Object.entries(rutter)) {
  const trace = traceAlong(line);
  const rekt = farorNaraRutten(hazards, line);
  const t0 = performance.now(); const langs = farorLangsRutten(hazards, line, FARA_MARGINAL_KM * 1000).map((x) => x.hazard); msF += performance.now() - t0;
  // Motorn räknar på farorna i ursprunglig ordning; urvalet längs linjen ordnar dem i körordning, så ordningen återställs här.
  const ordning = new Map(hazards.map((h, i) => [h.id, i])); langs.sort((a, b) => ordning.get(a.id)! - ordning.get(b.id)!);
  // Varje körning två gånger, och bara den andra tiden räknas: annars betalar den som körs först för JIT-uppvärmningen.
  kor(rekt, trace); kor(langs, trace);
  const a = kor(rekt, trace), b = kor(langs, trace);
  const lika = JSON.stringify([a.alerts, a.sup]) === JSON.stringify([b.alerts, b.sup]);
  if (!lika) olika++;
  sumR += rekt.length; sumL += langs.length; msR += a.ms; msL += b.ms;
  console.log(`mätt:   ${namn.slice(0, 42).padEnd(42)} rektangeln ${String(rekt.length).padStart(4)} · linjen ${String(langs.length).padStart(4)} · ` +
    `motorn ${a.ms.toFixed(0).padStart(4)} → ${b.ms.toFixed(0).padStart(4)} ms · varningar ${a.alerts.length}${lika ? "" : " · OLIKA"}`);
}
console.log(`mätt: sammanlagt rektangeln ${sumR} faror och linjen ${sumL} (${(100 * sumL / sumR).toFixed(0)} %); motorn ${msR.toFixed(0)} → ${msL.toFixed(0)} ms, ` +
  `urvalet längs linjen ${msF.toFixed(0)} ms; rutter med olika varningar: ${olika}`);
process.exit(olika ? 1 : 0);
