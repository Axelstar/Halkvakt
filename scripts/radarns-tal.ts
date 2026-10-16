// RADARNS TAL R (DECISIONS #568, förregistreringen §10 a). Kandidatens fuktvittne från radarn är `rate_mean_mmh` ≥ R över punktens
// sträcka. Regeln skrevs 15/10 före läsningen: visar alla tre kurvorna en majoritet (över 50 %) i bandet 0,1–0,5 mm/h blir R = 0,1,
// annars står 0,5. Kurvorna är cellmätningen v3:s körningar 15/10 (fönstret 8–15/10, 38690393504) och måndagarna 19/10 och 26/10
// 06:20 (pulsklockan). Måndagarnas sjudygnsfönster delar tre dygn med det första, så kurvorna är inte helt oberoende (#568).
//
// Läser körningarnas loggar ur filer, så att samma rader går att köra i en session och i Actions:
//   gh run view <id> --log > kurva-<datum>.txt          (en gång per körning)
//   node --experimental-strip-types scripts/radarns-tal.ts kurva-1.txt kurva-2.txt kurva-3.txt
//   node --experimental-strip-types scripts/radarns-tal.ts --sjalvtest
import { readFileSync } from "node:fs";

/** Raden för bandet 0,1–0,5 i den skarpa tabellen på `rate_mean_mmh`; självtestets tabell har en annan rubrik och hoppas över. */
export function bandet(logg: string): { par: number; bekraftade: number; andel: number } | null {
  const i = logg.lastIndexOf("rate_mean_mmh (fältet som trösklarna står på)");
  if (i < 0) return null;
  const m = logg.slice(i).match(/0,1–0,5\s+(\d+)\s+(\d+)\s+(\d+) %/);
  if (!m) return null;
  const par = Number(m[1]), bekraftade = Number(m[2]);
  return { par, bekraftade, andel: par ? bekraftade / par : 0 };
}

/** R ur de tre kurvorna: 0,1 om alla visar över 50 %, annars 0,5. Färre än tre kurvor avgör inget. */
export function radarnsTal(andelar: number[]): 0.1 | 0.5 | null {
  if (andelar.length !== 3) return null;
  return andelar.every((a) => a > 0.5) ? 0.1 : 0.5;
}

function sjalvtest() {
  const k = (namn: string, fick: unknown, ville: unknown) => {
    if (JSON.stringify(fick) !== JSON.stringify(ville)) { console.error(`✗ ${namn}: fick ${JSON.stringify(fick)}, ville ${JSON.stringify(ville)}`); process.exit(1); }
    console.log(`  ok: ${namn}`);
  };
  // Formen ur körningen 38690393504: självtestets tabell först, sedan den skarpa.
  const logg = ["A) Bekräftelse per radarband på rate_mean_mmh (station ≤ 5 km från segmentet, ±45 min):", "0,1–0,5     90           40         44 %",
    "A) Bekräftelse per radarband på rate_mean_mmh (fältet som trösklarna står på) (station ≤ 5 km från segmentet, ±45 min):",
    "band mm/h   par   station såg regn   andel", "0,1–0,5  21012        13026         62 %"].join("\n");
  k("den skarpa tabellen, inte självtestets", bandet(logg), { par: 21012, bekraftade: 13026, andel: 13026 / 21012 });
  k("utan skarp tabell inget band", bandet(logg.split("\n").slice(0, 2).join("\n")), null);
  k("alla tre över hälften ⇒ 0,1", radarnsTal([0.62, 0.55, 0.51]), 0.1);
  k("exakt hälften är ingen majoritet ⇒ 0,5", radarnsTal([0.62, 0.5, 0.7]), 0.5);
  k("en kurva under ⇒ 0,5", radarnsTal([0.62, 0.48, 0.7]), 0.5);
  k("två kurvor avgör inget", radarnsTal([0.62, 0.7]), null);
  console.log("SJÄLVTEST OK: radarns tal");
}

// Som kortkartan.ts: ci kör Node 22, där import.meta.main saknas.
const direkt = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("scripts/radarns-tal.ts");
if (direkt) {
  const filer = process.argv.slice(2);
  if (filer[0] === "--sjalvtest") sjalvtest();
  else {
    const andelar: number[] = [];
    for (const f of filer) {
      const b = bandet(readFileSync(f, "utf-8"));
      if (!b) { console.error(`${f}: ingen skarp tabell på rate_mean_mmh`); process.exit(1); }
      console.log(`${f}: bandet 0,1–0,5 — ${b.bekraftade} av ${b.par} par bekräftade, ${(b.andel * 100).toFixed(1).replace(".", ",")} %`);
      andelar.push(b.andel);
    }
    const r = radarnsTal(andelar);
    console.log(r === null ? `inget avgjort: ${andelar.length} kurvor, regeln kräver tre` : `R = ${String(r).replace(".", ",")} mm/h (DECISIONS #568)`);
  }
}
