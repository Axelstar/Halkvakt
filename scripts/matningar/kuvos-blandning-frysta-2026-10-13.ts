// DEN FRYSTA KANDIDATEN FÖR VINTERN 2026/27 — KVITTOT (DECISIONS #544 punkt 6, #549, kort #342). INGEN MÄTNING, ingen dom.
// fysik/niva2/frysta.py räknar i jobbet om den valda proceduren på alla stationer (valet i kuvos/kandidat-2026-27-val.json) och skriver
// niva2-ut/frysta/modell.pkl och kandidat.json. Steget före det här lägger modellen i hinken arkiv (kuvos/kuvos-kandidat-2026-27/) och
// hämtar tillbaka den. Kvittot prövar att modellfilen har manifestets summa och skriver ut manifestet utom särdragslistan, så att det
// kan föras in i repot ordagrant (kuvos/kandidat-2026-27.json). Talen under i_urvalet är räknade där proceduren tränade och är INTE det
// väntade felet; det är det ärliga talet ur körningen som valet bygger på.
// Kör: node --experimental-strip-types scripts/matningar/kuvos-blandning-frysta-2026-10-13.ts [--sjalvtest]
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

type Kandidat = { fysik: string; par: { W: number; L_km: number }; filer: { fil: string; bytes: number; sha256: string }[]; sardrag: string[];
  parametrar: Record<string, number>; [k: string]: unknown };

/** Felen i kvittot: varje fil i manifestet finns i katalogen med manifestets storlek och summa, och manifestet bär fysik, par och särdrag. */
export function provaKvitto(k: Kandidat, las: (fil: string) => Buffer | null): string[] {
  const fel: string[] = [];
  if (!["lw", "terrang"].includes(k.fysik)) fel.push(`fysik ${k.fysik}`);
  if (!(k.par?.W > 0 && k.par?.L_km > 0)) fel.push("paret saknas");
  if (!k.sardrag?.length || !Object.keys(k.parametrar ?? {}).length) fel.push("särdragen eller parametrarna saknas");
  if (!k.filer?.length) fel.push("inga filer i manifestet");
  for (const f of k.filer ?? []) {
    const b = las(f.fil);
    if (!b) { fel.push(`${f.fil} saknas`); continue; }
    const h = createHash("sha256").update(b).digest("hex");
    if (b.length !== f.bytes || h !== f.sha256) fel.push(`${f.fil}: ${b.length} byte, sha256 ${h} — manifestet säger ${f.bytes}, ${f.sha256}`);
  }
  return fel;
}

if (process.argv.includes("--sjalvtest")) {
  const b = Buffer.from("modell");
  const sha = createHash("sha256").update(b).digest("hex");
  const k: Kandidat = { fysik: "lw", par: { W: 0.25, L_km: 160 }, sardrag: ["ts"], parametrar: { albedo: 0.1 }, filer: [{ fil: "modell.pkl", bytes: 6, sha256: sha }] };
  const fel = [
    provaKvitto(k, () => b).length === 0 || "ett riktigt kvitto går igenom",
    provaKvitto(k, () => Buffer.from("modelL")).some((x) => x.includes("manifestet säger")) || "en ändrad modell fälls",
    provaKvitto(k, () => null).some((x) => x.includes("saknas")) || "en saknad modell fälls",
    provaKvitto({ ...k, fysik: "annan" }, () => b).length === 1 || "en okänd fysik fälls",
  ].filter((x) => x !== true);
  for (const f of fel) console.log("✗", f);
  if (fel.length) process.exit(1);
  console.log("✓ självtest: kvittot godtar modellen med manifestets summa och fäller en ändrad, en saknad och en okänd fysik");
  process.exit(0);
}

const DIR = "niva2-ut/frysta";
if (!existsSync(`${DIR}/kandidat.json`)) { console.error(`${DIR}/kandidat.json saknas — fysik/niva2/frysta.py har inte skrivit den frysta kandidaten`); process.exit(1); }
const k: Kandidat = JSON.parse(readFileSync(`${DIR}/kandidat.json`, "utf8"));
const fel = provaKvitto(k, (fil) => (existsSync(`${DIR}/${fil}`) ? readFileSync(`${DIR}/${fil}`) : null));
console.log(`DEN FRYSTA KANDIDATEN FÖR VINTERN 2026/27 (DECISIONS #544 punkt 6) — fysiken ${k.fysik}, paret W ${k.par.W} · L ${k.par.L_km} km, ${k.sardrag.length} särdrag`);
for (const f of k.filer) console.log(`  ${f.fil}: ${f.bytes} byte, sha256 ${f.sha256}${fel.length ? "" : " = filen i jobbet"}`);
const { sardrag: _s, ...utan } = k;
console.log("kandidat.json (utom särdragslistan, som står i jobbets fysiksteg):");
console.log(JSON.stringify(utan, null, 1));
for (const f of fel) console.error("✗", f);
if (fel.length) process.exit(1);
