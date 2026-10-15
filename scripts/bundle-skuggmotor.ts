// Buntar engine/src/*.ts + supabase/functions/skuggmotor/main.ts → index.ts.
// FÖRE 31/8 var motorn i skuggmotorn en HANDKLISTRAD kopia som drev isär: skuggflottan
// körde hela dagen utan olyckslyftet (#28) trots att motorn i repot hade det. Nu är
// index.ts en genererad fil — ändra aldrig i den, ändra i källorna och kör:
//   node --experimental-strip-types scripts/bundle-skuggmotor.ts
// CI (ci.yml) kör samma sak och fallerar om index.ts inte matchar källorna.
// VÄGNÄTET (DECISIONS #573): huvudvarvets rutter (ROUTES) bäddas in längs vägnätet ur data/favoritprov/rutter-osrm.json (OSRM, #531),
// för kandidatens takt — de raka linjerna mellan stationerna gick 6,9 km från de varnande punkterna på E10 15/10. Bunten fäller om en
// rutt i ROUTES saknar sin geometri, som favoritprovets bunt; en ny skuggrutt kräver att filen skrivs om.
import { readFileSync, writeFileSync } from "node:fs";
import { lasRutter } from "../publish/skuggfacit.ts";

const ORDER = ["types", "geo", "segment", "texts", "engine", "forsprang", "rutfilter", "snapshot"];   // segment (kort #38b steg 4) efter geo, som den importerar
let out = `// ═══ GENERERAD av scripts/bundle-skuggmotor.ts — ÄNDRA INTE HÄR ═══\n` +
          `// Källor: engine/src/{${ORDER.join(",")}}.ts + supabase/functions/skuggmotor/main.ts\n\n`;
for (const f of ORDER) {
  // Strippar import-satser, även FLERRADIGA (engine.ts har en) — första utkastet
  // strök bara enradiga och Deno fick "} from './types.ts'" på lösa boliner.
  const src = readFileSync(new URL(`../engine/src/${f}.ts`, import.meta.url), "utf8")
    .replace(/^import\b[\s\S]*?from\s+"[^"]+";[ \t]*\n/gm, "");
  out += `// ═══ engine/src/${f}.ts ═══\n${src}\n\n`;
}
const kod = readFileSync(new URL("../supabase/functions/skuggmotor/main.ts", import.meta.url), "utf8");
const osrm = JSON.parse(readFileSync(new URL("../data/favoritprov/rutter-osrm.json", import.meta.url), "utf8")).rutter as Record<string, { punkter: [number, number][] }>;
const huvud = Object.keys(lasRutter(kod)).sort();
const saknas = huvud.filter((n) => !osrm[n]);
if (saknas.length) { console.error(`rutter-osrm.json saknar huvudvarvets rutter: ${saknas.join(", ")}`); process.exit(1); }
out += `// ═══ skuggans huvudrutter på vägnätet, OSRM (${huvud.length}, DECISIONS #573) ═══\n` +
       `const RUTTER_VAG: Record<string, [number, number][]> = ${JSON.stringify(Object.fromEntries(huvud.map((n) => [n, osrm[n].punkter])))};\n\n`;
out += `// ═══ supabase/functions/skuggmotor/main.ts ═══\n` + kod;
const target = new URL("../supabase/functions/skuggmotor/index.ts", import.meta.url);
if (process.argv.includes("--check")) {
  const cur = readFileSync(target, "utf8");
  if (cur !== out) { console.error("skuggmotor/index.ts matchar inte källorna — kör bundle-skuggmotor"); process.exit(1); }
  console.log("skuggmotor/index.ts i synk");
} else {
  writeFileSync(target, out);
  console.log(`skrev ${out.length} tecken till skuggmotor/index.ts`);
}
