// Buntar engine/src (det urvalet längs rutten behöver), publish/rapport-core.ts, skuggans rutter och
// supabase/functions/favoritprov/main.ts → index.ts (DECISIONS #529). Samma mönster som bundle-skuggmotor.ts: index.ts är
// genererad — ändra aldrig i den, ändra i källorna och kör:
//   node --experimental-strip-types scripts/bundle-favoritprov.ts
// CI (ci.yml) och deploy-supabase.yml kör --check och fallerar om index.ts inte matchar källorna.
// Rutterna är skuggans 30, lagda på vägnätet med OSRM (data/favoritprov/rutter-osrm.json, kort #338, DECISIONS #531): samma namn som
// skuggmotorns ROUTES och ROUTES_C, och bunten fäller om namnen inte stämmer — en ny skuggrutt kräver att filen skrivs om.
import { readFileSync, writeFileSync } from "node:fs";
import { lasRutter } from "../publish/skuggfacit.ts";

const ORDER = ["types", "geo", "segment", "rutfilter", "snapshot"];
const strip = (s: string) => s.replace(/^import\b[\s\S]*?from\s+"[^"]+";[ \t]*\n/gm, "");
let out = `// ═══ GENERERAD av scripts/bundle-favoritprov.ts — ÄNDRA INTE HÄR ═══\n` +
          `// Källor: engine/src/{${ORDER.join(",")}}.ts + publish/rapport-core.ts + data/favoritprov/rutter-osrm.json + supabase/functions/favoritprov/main.ts\n\n`;
for (const f of ORDER) out += `// ═══ engine/src/${f}.ts ═══\n${strip(readFileSync(new URL(`../engine/src/${f}.ts`, import.meta.url), "utf8"))}\n\n`;
out += `// ═══ publish/rapport-core.ts ═══\n${strip(readFileSync(new URL("../publish/rapport-core.ts", import.meta.url), "utf8"))}\n\n`;
const kod = readFileSync(new URL("../supabase/functions/skuggmotor/main.ts", import.meta.url), "utf8");
const skuggans = { ...lasRutter(kod),
  ...lasRutter(kod.replace("const ROUTES: Record", "const ROUTES_X: Record").replace("const ROUTES_C: Record", "const ROUTES: Record")) };
const osrm = JSON.parse(readFileSync(new URL("../data/favoritprov/rutter-osrm.json", import.meta.url), "utf8")).rutter as Record<string, { punkter: [number, number][] }>;
const saknas = Object.keys(skuggans).filter((n) => !osrm[n]), extra = Object.keys(osrm).filter((n) => !skuggans[n]);
if (saknas.length || extra.length) { console.error(`rutter-osrm.json och skuggans rutter skiljer: saknas ${saknas.join(", ") || "–"}, extra ${extra.join(", ") || "–"}`); process.exit(1); }
const rutter = Object.fromEntries(Object.keys(skuggans).map((n) => [n, osrm[n].punkter]));
out += `// ═══ skuggans rutter på vägnätet, OSRM (${Object.keys(rutter).length}) ═══\nconst RUTTER_PROV: Record<string, [number, number][]> = ${JSON.stringify(rutter)};\n\n`;
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
