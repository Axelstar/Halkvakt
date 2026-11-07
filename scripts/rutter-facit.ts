// FACIT FÖR DE SPARADE RUTTERNA (favoriterna steg 2, kort #357, DECISIONS #616, #625). Skriver engine/fixtures/rutter.json ur
// engine/src/rutter.ts; Kotlin (Rutter.kt) och Swift (Rutter.swift) prövas mot filen, TypeScript mot sig själv i test/rutter.test.ts.
// Fem-metersregeln (CLAUDE.md, vektorgeneratorn): inget avstånd mellan en sparad punkt och nästa fix får ligga inom 5 m från
// RUTT_STEG_M (75 m), annars kan libm-avrundningen i ett annat språk byta utfall. Fixarna ligger därför 30 eller 50 m isär.
// Kör: node --experimental-strip-types scripts/rutter-facit.ts            skriver filen
//      node --experimental-strip-types scripts/rutter-facit.ts --check    fäller om filen inte är den skriptet skriver
import { readFileSync, writeFileSync } from "node:fs";
import { MAX_RUTTER, RUTT_STEG_M, Ruttinsamlare, SAMMA_RESA_ANDEL, SAMMA_RESA_M, VANTANDE_KVAR_S, VANTANDE_MAX, dagensResor, laggTill,
  namnforslag, sammaResa, taBort, type Punkt, type Rutter, type Vantande } from "../engine/src/rutter.ts";

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

// Igenkänningen (DECISIONS #637): en resa 6 km norrut, en punkt per 75 m, mot samma väg vänd, en parallell väg, halva vägen och en
// annan väg. Avstånden ligger långt från SAMMA_RESA_M (40 m och 300 m mot 100 m) och andelarna långt från SAMMA_RESA_ANDEL.
const vag = (ost: number, fran: number, till: number): Punkt[] =>
  Array.from({ length: Math.round(Math.abs(till - fran) / 75) + 1 }, (_, i) => [oster(ost), norr(fran + Math.sign(till - fran) * i * 75)] as Punkt);
const RESA = vag(0, 0, 6000);
const SAMMA = [
  { namn: "samma väg åt andra hållet", b: vag(0, 6000, 0) },
  { namn: "parallell väg 40 m bort (andra körbanan)", b: vag(40, 6000, 0) },
  { namn: "bara halva vägen", b: vag(0, 0, 3000) },
  { namn: "en annan väg 300 m bort", b: vag(300, 0, 6000) },
  { namn: "längre resa som fortsätter 3 km", b: vag(0, 0, 9000) },
];

const rutt = (id: string) => ({ id, namn: id, sparad: "2026-10-17T18:00:00Z", punkter: [[LON0, LAT0]] as Punkt[] });
let full: Rutter = { schema: 1, rutter: [] };
for (let i = 1; i <= MAX_RUTTER; i++) full = laggTill(full, rutt(`r${i}`))!;

// Dagens resor (DECISIONS #817): en lista som byggs resa för resa. Klockan i sekunder från 0; dygnet räknas från resans slut.
const V = (id: string, slutS: number, punkter: Punkt[], km = 6): Vantande => ({ id, slutS, km, punkter, dithem: false });
const DAGENS: { namn: string; ny: Vantande; nuS: number }[] = [
  { namn: "första resan", ny: V("s1", 1000, RESA), nuS: 1000 },
  { namn: "samma pass slutar igen, längre: ersätter sin egen", ny: V("s1", 2000, vag(0, 0, 6000), 7), nuS: 2000 },
  { namn: "en annan väg: läggs sist", ny: V("s2", 3000, vag(300, 0, 6000)), nuS: 3000 },
  { namn: "hem samma väg: slås ihop med den första", ny: V("s3", 40000, vag(0, 6000, 0), 5), nuS: 40000 },
  { namn: "två nya vägar: den äldsta går när de blir fler än tre", ny: V("s4", 41000, vag(900, 0, 6000)), nuS: 41000 },
  { namn: "en till", ny: V("s5", 42000, vag(1800, 0, 6000)), nuS: 42000 },
  { namn: "ett dygn efter den äldsta: den faller bort", ny: V("s6", 41000 + VANTANDE_KVAR_S, vag(2700, 0, 6000)), nuS: 41000 + VANTANDE_KVAR_S },
];
let dagLista: Vantande[] = [];
const dagensFall = DAGENS.map((f) => {
  dagLista = dagensResor(dagLista, f.ny, f.nuS);
  return { namn: f.namn, ny: f.ny, nuS: f.nuS, efter: dagLista.map((v) => ({ id: v.id, slutS: v.slutS, km: v.km, dithem: v.dithem, punkter: v.punkter.length })) };
});

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
  dagens: { max: VANTANDE_MAX, kvarS: VANTANDE_KVAR_S, fall: dagensFall },
  samma: { m: SAMMA_RESA_M, andel: SAMMA_RESA_ANDEL, a: RESA, fall: SAMMA.map((f) => ({ namn: f.namn, b: f.b, svar: sammaResa(RESA, f.b) })) },
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
  for (const f of ut.samma.fall) console.log(`samma resa? ${f.namn}: ${f.svar}`);
  for (const f of ut.dagens.fall) console.log(`dagens: ${f.namn} → ${f.efter.map((v) => `${v.id}${v.dithem ? "↔" : ""}`).join(" ")}`);
}
