// Buntar publish/snapshot-core.ts + data/bridges.geojson + supabase/functions/publicera/main.ts
// → supabase/functions/publicera/index.ts. Samma mönster som bundle-skuggmotor (#34-läxan):
// index.ts är en GENERERAD fil — ändra i källorna och kör:
//   node --experimental-strip-types scripts/bundle-publicera.ts
// CI (ci.yml) kör --check och fallerar om index.ts inte matchar källorna.
//
// Broarna (#38) bäddas in som en kompakt lista (id, lon, lat, väg) så att Supabase-
// funktionen inte behöver nå repot: ~2 500 broar ≈ 120 kB. Ändras data/bridges.geojson
// (bridges.yml, en gång i månaden) ändras index.ts, och CI säger till.
import { readFileSync, writeFileSync } from "node:fs";
import { bridgesFromGeoJSON } from "../publish/snapshot-core.ts";

const core = readFileSync(new URL("../publish/snapshot-core.ts", import.meta.url), "utf8")
  .replace(/^import\b[\s\S]*?from\s+"[^"]+";[ \t]*\n/gm, "");
const bridges = bridgesFromGeoJSON(JSON.parse(readFileSync(new URL("../data/bridges.geojson", import.meta.url), "utf8")));
const main = readFileSync(new URL("../supabase/functions/publicera/main.ts", import.meta.url), "utf8");

const out = `// ═══ GENERERAD av scripts/bundle-publicera.ts — ÄNDRA INTE HÄR ═══\n` +
  `// Källor: publish/snapshot-core.ts + data/bridges.geojson + supabase/functions/publicera/main.ts\n\n` +
  `// ═══ publish/snapshot-core.ts ═══\n${core}\n\n` +
  `// ═══ data/bridges.geojson (${bridges.length} broar, #38) ═══\n` +
  `const BRIDGES: Bridge[] = ${JSON.stringify(bridges)};\n\n` +
  `// ═══ supabase/functions/publicera/main.ts ═══\n${main}`;

const target = new URL("../supabase/functions/publicera/index.ts", import.meta.url);
if (process.argv.includes("--check")) {
  const cur = readFileSync(target, "utf8");
  if (cur !== out) { console.error("publicera/index.ts matchar inte källorna — kör bundle-publicera"); process.exit(1); }
  console.log("publicera/index.ts i synk");
} else {
  writeFileSync(target, out);
  console.log(`skrev ${out.length} tecken till publicera/index.ts (${bridges.length} broar inbäddade)`);
}
