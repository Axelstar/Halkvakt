// FACIT FÖR DE SPARADE RUTTERNA (favoriterna steg 2, kort #357, DECISIONS #616, #625). Skriver engine/fixtures/rutter.json ur
// engine/src/rutter.ts; Kotlin (Rutter.kt) och Swift (Rutter.swift) prövas mot filen, TypeScript mot sig själv i test/rutter.test.ts.
// Fem-metersregeln (CLAUDE.md, vektorgeneratorn): inget avstånd mellan en sparad punkt och nästa fix får ligga inom 5 m från
// RUTT_STEG_M (75 m), annars kan libm-avrundningen i ett annat språk byta utfall. Fixarna ligger därför 30 eller 50 m isär.
// Kör: node --experimental-strip-types scripts/rutter-facit.ts            skriver filen
//      node --experimental-strip-types scripts/rutter-facit.ts --check    fäller om filen inte är den skriptet skriver
import { readFileSync, writeFileSync } from "node:fs";
import { MAX_RUTTER, RUTT_STEG_M, Ruttinsamlare, laggTill, namnforslag, taBort, type Punkt, type Rutter } from "../engine/src/rutter.ts";

const LAT0 = 59.0, LON0 = 15.0, M_PER_DEG_LAT = 111_320;
const norr = (m: number) => LAT0 + m / M_PER_DEG_LAT;
const oster = (m: number) => LON0 + m / (M_PER_DEG_LAT * Math.cos((LAT0 * Math.PI) / 180));

const FALL: { namn: string; fixar: Punkt[] }[] = [
  { namn: "rak väg norrut, 30 m mellan fixarna: var tredje sparas (90 m), och sista fixen läggs till",
    fixar: Array.from({ length: 21 }, (_, i) => [LON0, norr(i * 30)] as Punkt) },
  { namn: "kurva, 50 m mellan fixarna: varannan sparas (100 m)",
    // Hörnet ligger på en sparad punkt (300 m), så att varje avstånd till den senast sparade är 50 eller 100 m.
    fixar: [...Array.from({ length: 7 }, (_, i) => [LON0, norr(i * 50)] as Punkt),
            ...Array.from({ length: 8 }, (_, i) => [oster((i + 1) * 50), norr(300)] as Punkt)] },
  { namn: "stillastående med brus inom 10 m: bara första och sista",
    fixar: [[LON0, LAT0], [oster(4), norr(3)], [oster(-6), norr(2)], [oster(2), norr(-7)], [oster(5), norr(5)]] },
  { namn: "samma fix två gånger: båda står kvar, för sista fixen läggs till när den inte sparades — en flagga, ingen jämförelse av talen",
    fixar: [[LON0, LAT0], [LON0, LAT0]] },
  { namn: "en enda fix", fixar: [[LON0, LAT0]] },
  { namn: "inga fixar", fixar: [] },
];

const rutt = (id: string) => ({ id, namn: id, sparad: "2026-10-17T18:00:00Z", punkter: [[LON0, LAT0]] as Punkt[] });
let full: Rutter = { schema: 1, rutter: [] };
for (let i = 1; i <= MAX_RUTTER; i++) full = laggTill(full, rutt(`r${i}`))!;

const ut = {
  _om: "Facit för de sparade rutterna (scripts/rutter-facit.ts). Skrivs av skriptet — ändras aldrig för hand.",
  ruttStegM: RUTT_STEG_M, maxRutter: MAX_RUTTER,
  fall: FALL.map((f) => {
    const r = new Ruttinsamlare();
    for (const [lon, lat] of f.fixar) r.add(lon, lat);
    const rutten = r.route();
    return { namn: f.namn, fixar: f.fixar, sparas: rutten.map((p) => f.fixar.findIndex((q) => q[0] === p[0] && q[1] === p[1])) };
  }),
  lista: {
    fullAntal: full.rutter.length,
    sjatteSvar: laggTill(full, rutt("r6")) === null ? "null" : "lades till",
    efterTaBortR3: taBort(full, "r3").rutter.map((x) => x.id),
    efterTaBortOkand: taBort(full, "okand").rutter.map((x) => x.id),
  },
  namnforslag: { dag: 17, manad: 10, svar: namnforslag(17, 10) },
};
const json = JSON.stringify(ut, null, 1) + "\n";
const fil = new URL("../engine/fixtures/rutter.json", import.meta.url);
if (process.argv.includes("--check")) {
  let cur = ""; try { cur = readFileSync(fil, "utf8"); } catch { /* saknas */ }
  if (cur !== json) { console.error("engine/fixtures/rutter.json är inte den skriptet skriver — kör scripts/rutter-facit.ts"); process.exit(1); }
  console.log("rutter.json i synk");
} else {
  writeFileSync(fil, json);
  for (const f of ut.fall) console.log(`${f.namn}: ${f.fixar.length} fixar → index ${JSON.stringify(f.sparas)}`);
  console.log(JSON.stringify(ut.lista), JSON.stringify(ut.namnforslag.svar));
}
