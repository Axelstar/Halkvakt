// Buntar engine/src (det rapport-core behöver), publish/rapport-core.ts och supabase/functions/favoriter/main.ts → index.ts
// (appens rapportfil, DECISIONS #617). Samma mönster som bundle-favoritprov.ts, utan provets rutter: index.ts är genererad —
// ändra aldrig i den, ändra i källorna och kör:
//   node --experimental-strip-types scripts/bundle-favoriter.ts
// CI (ci.yml) och deploy-supabase.yml kör --check och fallerar om index.ts inte matchar källorna.
import { readFileSync, writeFileSync } from "node:fs";

const ORDER = ["types", "geo", "segment", "rutfilter", "snapshot"];
const strip = (s: string) => s.replace(/^import\b[\s\S]*?from\s+"[^"]+";[ \t]*\n/gm, "");
let out = `// ═══ GENERERAD av scripts/bundle-favoriter.ts — ÄNDRA INTE HÄR ═══\n` +
          `// Källor: engine/src/{${ORDER.join(",")}}.ts + publish/rapport-core.ts + supabase/functions/favoriter/main.ts\n\n`;
for (const f of ORDER) out += `// ═══ engine/src/${f}.ts ═══\n${strip(readFileSync(new URL(`../engine/src/${f}.ts`, import.meta.url), "utf8"))}\n\n`;
out += `// ═══ publish/rapport-core.ts ═══\n${strip(readFileSync(new URL("../publish/rapport-core.ts", import.meta.url), "utf8"))}\n\n`;
out += `// ═══ supabase/functions/favoriter/main.ts ═══\n` + readFileSync(new URL("../supabase/functions/favoriter/main.ts", import.meta.url), "utf8");
const target = new URL("../supabase/functions/favoriter/index.ts", import.meta.url);
if (process.argv.includes("--check")) {
  let cur = ""; try { cur = readFileSync(target, "utf8"); } catch { /* saknas */ }
  if (cur !== out) { console.error("favoriter/index.ts matchar inte källorna — kör bundle-favoriter"); process.exit(1); }
  console.log("favoriter/index.ts i synk");
} else {
  writeFileSync(target, out);
  console.log(`skrev ${out.length} tecken till favoriter/index.ts`);
}
