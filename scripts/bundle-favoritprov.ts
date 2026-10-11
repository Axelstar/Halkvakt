// Buntar engine/src (det urvalet längs rutten behöver), publish/rapport-core.ts, skuggans rutter och
// supabase/functions/favoritprov/main.ts → index.ts (DECISIONS #529). Samma mönster som bundle-skuggmotor.ts: index.ts är
// genererad — ändra aldrig i den, ändra i källorna och kör:
//   node --experimental-strip-types scripts/bundle-favoritprov.ts
// CI (ci.yml) och deploy-supabase.yml kör --check och fallerar om index.ts inte matchar källorna.
// Rutterna läses ur skuggmotorns ROUTES och ROUTES_C med lasRutter, så att provet alltid kör skuggans rutter.
import { readFileSync, writeFileSync } from "node:fs";
import { lasRutter } from "../publish/skuggfacit.ts";

const ORDER = ["types", "geo", "segment", "rutfilter", "snapshot"];
const strip = (s: string) => s.replace(/^import\b[\s\S]*?from\s+"[^"]+";[ \t]*\n/gm, "");
let out = `// ═══ GENERERAD av scripts/bundle-favoritprov.ts — ÄNDRA INTE HÄR ═══\n` +
          `// Källor: engine/src/{${ORDER.join(",")}}.ts + publish/rapport-core.ts + skuggmotorns ROUTES och ROUTES_C + supabase/functions/favoritprov/main.ts\n\n`;
for (const f of ORDER) out += `// ═══ engine/src/${f}.ts ═══\n${strip(readFileSync(new URL(`../engine/src/${f}.ts`, import.meta.url), "utf8"))}\n\n`;
out += `// ═══ publish/rapport-core.ts ═══\n${strip(readFileSync(new URL("../publish/rapport-core.ts", import.meta.url), "utf8"))}\n\n`;
const kod = readFileSync(new URL("../supabase/functions/skuggmotor/main.ts", import.meta.url), "utf8");
const rutter = { ...lasRutter(kod),
  ...lasRutter(kod.replace("const ROUTES: Record", "const ROUTES_X: Record").replace("const ROUTES_C: Record", "const ROUTES: Record")) };
out += `// ═══ skuggans rutter (${Object.keys(rutter).length}) ═══\nconst RUTTER_PROV: Record<string, [number, number][]> = ${JSON.stringify(rutter)};\n\n`;
out += `// ═══ supabase/functions/favoritprov/main.ts ═══\n` + readFileSync(new URL("../supabase/functions/favoritprov/main.ts", import.meta.url), "utf8");
const target = new URL("../supabase/functions/favoritprov/index.ts", import.meta.url);
if (process.argv.includes("--check")) {
  let cur = ""; try { cur = readFileSync(target, "utf8"); } catch { /* saknas */ }
  if (cur !== out) { console.error("favoritprov/index.ts matchar inte källorna — kör bundle-favoritprov"); process.exit(1); }
  console.log("favoritprov/index.ts i synk");
} else {
  writeFileSync(target, out);
  console.log(`skrev ${out.length} tecken till favoritprov/index.ts (${Object.keys(rutter).length} rutter)`);
}
