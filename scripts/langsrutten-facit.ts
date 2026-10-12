// FACIT FÖR URVALET LÄNGS RUTTEN (DECISIONS #528). Skriver engine/fixtures/langsrutten.json ur farorLangsRutten i TypeScript; Kotlin
// (RouteFilter.kt) och Swift (RouteFilter.swift) prövas mot filen, TypeScript mot sig själv i test/langsrutten.test.ts.
// Fem-metersregeln (CLAUDE.md, vektorgeneratorn): ingen fara får ligga inom 5 m från marginalen, och två faror får inte ligga inom 5 m
// från varandra längs rutten utom de som med flit ligger lika — annars kan libm-avrundningen i ett annat språk byta utfall eller ordning.
// Kör: node --experimental-strip-types scripts/langsrutten-facit.ts            skriver filen
//      node --experimental-strip-types scripts/langsrutten-facit.ts --check    fäller om filen inte är den skriptet skriver
import { readFileSync, writeFileSync } from "node:fs";
import { farorLangsRutten } from "../engine/src/rutfilter.ts";
import type { Hazard } from "../engine/src/types.ts";

const p = (id: string, kind: string, lon: number, lat: number) => ({ id, kind, lon, lat }) as unknown as Hazard;
const s = (id: string, line: [number, number][]) => ({ id, kind: "slippery_segment", line }) as unknown as Hazard;

const FALL: { namn: string; linje: [number, number][]; marginalM: number; faror: Hazard[]; likaLangs?: string[][] }[] = [
  {
    namn: "vinkel vid 59° — punkt, hörn, före starten, andra benet, korsning, parallellt, segment som bara når en brytpunkt",
    linje: [[15.0, 59.0], [15.5, 59.0], [15.5, 59.3]],   // ~29 km österut, sedan ~33 km norrut
    marginalM: 2000,
    faror: [
      p("p-nara", "camera", 15.2, 59.009),               // ~1 km norr om första benet
      p("p-fjarran", "camera", 15.1, 59.03),             // ~3,3 km norr: utanför
      p("p-fore-start", "accident", 14.974, 59.0),       // ~1,5 km väster om starten: platsen 0
      p("p-hornet", "icing_point", 15.52, 58.995),       // utanför hörnet: närmast brytpunkten
      p("p-andra-benet", "wildlife", 15.5087, 59.2),     // ~0,5 km öster om andra benet
      p("p-tvilling-b", "camera", 15.35, 59.006),        // samma plats längs rutten som a, söder och norr om linjen
      p("p-tvilling-a", "camera", 15.35, 58.994),
      s("s-korsar", [[15.3, 58.9], [15.3, 59.1]]),       // korsar första benet: 0 m
      s("s-parallell", [[15.05, 59.0135], [15.15, 59.0135]]),   // ~1,5 km norr, parallellt
      s("s-bara-brytpunkten", [[14.97, 59.05], [14.97, 58.95]]), // brytpunkterna ~6 km bort, sträckan ~1,7 km från starten
      s("s-fjarran", [[16.0, 60.0], [16.1, 60.1]]),
    ],
    likaLangs: [["p-tvilling-a", "p-tvilling-b"], ["p-fore-start", "s-bara-brytpunkten"]],   // båda vid starten: platsen exakt 0
  },
  {
    namn: "diagonal vid 65° med marginalen 15 km",
    linje: [[20.0, 65.0], [21.0, 65.6]],
    marginalM: 15000,
    faror: [
      p("n-6km", "accident", 20.3, 65.28),
      p("n-innanfor-kanten", "accident", 20.8, 65.25),   // ~14,6 km: strax innanför marginalen
      p("n-utanfor", "accident", 20.1, 65.4),
      p("n-pa-linjen", "camera", 20.5, 65.3),
      s("n-segment", [[20.9, 65.4], [21.2, 65.45]]),
    ],
  },
  { namn: "en linje med en punkt ger inget", linje: [[15.0, 59.0]], marginalM: 2000, faror: [p("ensam", "camera", 15.0, 59.0)] },
];

const ut = { _om: "Facit för urvalet längs rutten (DECISIONS #528), skrivet av scripts/langsrutten-facit.ts — ändras aldrig för hand. " +
  "Varje fall: linjen, marginalen, farorna och det väntade urvalet i körordning med avstånd och plats längs rutten i meter. " +
  "Kotlin och Swift ska ge samma id i samma ordning och talen inom 0,01 m.", fall: [] as unknown[] };
for (const f of FALL) {
  const r = farorLangsRutten(f.faror, f.linje, f.marginalM);
  // Fem-metersregeln mot marginalen: avståndet för varje fara, med eller utan träff.
  const alla = farorLangsRutten(f.faror, f.linje, Number.MAX_VALUE);
  for (const x of alla) {
    if (Math.abs(x.avstandM - f.marginalM) < 5) throw new Error(`${f.namn}: ${x.hazard.id} ligger ${x.avstandM.toFixed(1)} m från linjen, inom 5 m från marginalen`);
  }
  const lika = new Set((f.likaLangs ?? []).flat());
  for (let i = 1; i < r.length; i++) {
    const a = r[i - 1], b = r[i];
    if (b.langsM - a.langsM < 5 && !(lika.has(a.hazard.id) && lika.has(b.hazard.id)))
      throw new Error(`${f.namn}: ${a.hazard.id} och ${b.hazard.id} ligger inom 5 m från varandra längs rutten`);
  }
  for (const grupp of f.likaLangs ?? []) {
    const l = grupp.map((id) => r.find((x) => x.hazard.id === id)!.langsM);
    if (l.some((v) => v !== l[0])) throw new Error(`${f.namn}: ${grupp.join(", ")} skulle ligga lika längs rutten`);
  }
  ut.fall.push({ namn: f.namn, linje: f.linje, marginalM: f.marginalM, faror: f.faror,
    vantat: r.map((x) => ({ id: x.hazard.id, avstandM: Math.round(x.avstandM * 1000) / 1000, langsM: Math.round(x.langsM * 1000) / 1000 })) });
  console.log(`${f.namn}: ${r.map((x) => `${x.hazard.id} ${x.avstandM.toFixed(0)} m @ ${x.langsM.toFixed(0)} m`).join(" · ") || "inget"}`);
}
const fil = new URL("../engine/fixtures/langsrutten.json", import.meta.url);
const text = JSON.stringify(ut, null, 1) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(fil, "utf8") !== text) { console.error("engine/fixtures/langsrutten.json är inte det skriptet skriver — kör utan --check"); process.exit(1); }
  console.log("langsrutten.json i synk");
} else writeFileSync(fil, text);
