// FACIT FÖR RESANS RAPPORT (favoriterna steg 3a, kort #357; DECISIONS #636, #637). Skriver engine/fixtures/rapport.json ur
// publish/rapport-app.ts och publish/rapport-core.ts; Kotlin (Rapport.kt) och Swift (Rapport.swift) prövas mot filen, med sina egna
// läsare av lägesfilen och rapportfilen — indata står i filen i samma form som de riktiga filerna.
// En påhittad värld längs en påhittad resa: 8 km norrut och 6 km österut från 59,3° N 18,0° Ö, en punkt per 75 m som en sparad resa.
// Varje slag har ett exempel som tas med och ett som inte gör det (för långt bort, tvärs över vägen eller åt fel håll). Fem-meters-
// regeln: inget avstånd ligger närmare en tröskel än 20 m, ingen linje nära LANGS_ANDEL, och inga tal som slutar på 5 i en decimal
// eller en halv km, så att avrundningen inte kan skilja språken åt.
// Kör: node --experimental-strip-types scripts/rapport-facit.ts            skriver filen
//      node --experimental-strip-types scripts/rapport-facit.ts --check    fäller om filen inte är den skriptet skriver
import { readFileSync, writeFileSync } from "node:fs";
import { aldersgrind, kollensIds, nyttSedanKollen, radlage, resansRapport, riktning, titel, tomtRad } from "../publish/rapport-app.ts";
import type { Rad } from "../publish/rapport-core.ts";
import { GRUPP_FRAN, grupperade, LANGS_ANDEL, LANGS_MINST_M, LANGS_STEG_M, MARGINALER, nyttSedan, RUBRIK, tomma, type Linje,
  type Linjer, type Rapport } from "../publish/rapport-core.ts";
import type { LiveDoc, StaticDoc } from "../engine/src/snapshot.ts";

const LON0 = 18.0, LAT0 = 59.3, M_LAT = 111_320;
const M_LON = M_LAT * Math.cos((LAT0 * Math.PI) / 180);
/** Punkt `ost` meter öster och `norr` meter norr om utgångspunkten, avrundad till sju decimaler (centimeter). */
const P = (ost: number, norr: number): [number, number] => [Math.round((LON0 + ost / M_LON) * 1e7) / 1e7, Math.round((LAT0 + norr / M_LAT) * 1e7) / 1e7];
const linje = (fran: [number, number], till: [number, number], steg = 100): Linje => {
  const n = Math.max(1, Math.round(Math.hypot(till[0] - fran[0], till[1] - fran[1]) / steg));
  return Array.from({ length: n + 1 }, (_, i) => P(fran[0] + ((till[0] - fran[0]) * i) / n, fran[1] + ((till[1] - fran[1]) * i) / n));
};

// Resan: norrut 0 → 8 000 m, sedan österut 0 → 6 000 m, en punkt per 75 m.
const rutt: Linje = [...Array.from({ length: 107 }, (_, i) => P(0, i * 75)), P(0, 8000),
  ...Array.from({ length: 80 }, (_, i) => P((i + 1) * 75, 8000))];

const live = {
  schema: 2, generated_at: "2026-10-18T05:00:00Z",
  segments: [
    { id: "1", line: linje([20, 1000], [20, 3000]), code: 3, info: ["Is", "Snö"], road: "E4" },          // längs vägen, 20 m
    { id: "2", line: linje([-1000, 5000], [1000, 5000]), code: 3, info: ["Is"], road: "263" },          // tvärs över: tas inte med
    { id: "3", line: linje([2000, 0], [2000, 1000]), code: 3, info: [], road: null },                  // 2 km bort
  ],
  weather: [
    { id: "10", ...lonlat(300, 2000), yta: -0.8, fukt: true, regn_h: null, lutning30: null },           // frysrisk, 300 m
    { id: "11", ...lonlat(-200, 6000), yta: 2.0, fukt: false, regn_h: 1.0, lutning30: 1.0 },            // efterhalkan, beta
    { id: "12", ...lonlat(100, 4200), yta: 5.0, fukt: true, regn_h: null, lutning30: null },            // varm: inget
    { id: "13", ...lonlat(900, 7000), yta: -2.4, fukt: true, regn_h: null, lutning30: null },           // 900 m: för långt
  ],
  deviations: [],
  smhi: [{ id: "smhi-1", event: "Halka", niva: 2, geom: { type: "Polygon", coordinates: [[
    P(-1000, 6000), P(1000, 6000), P(1000, 9000), P(-1000, 9000), P(-1000, 6000)]] } }],
  bridges: [{ id: "20", ...lonlat(50, 4000), road: "E4", yta: 2.0, fukt: true }],
} as unknown as LiveDoc;

const stat = { schema: 1, cameras: [
  ...[500, 2500, 4400, 6600].map((n, i) => ({ id: String(30 + i), ...lonlat(30, n), bearing: null, road: "E4" })),
  { id: "34", ...lonlat(3000, 8040), bearing: null, road: "73" },
  { id: "35", ...lonlat(5000, 2000), bearing: null, road: "E4" },
] } as unknown as StaticDoc;

const snabb: Rapport = {
  schema: 2, generated_at: "2026-10-18T05:06:00Z", noter: [],
  stationer: { "10": { namn: "Arninge", luft: 1.2 }, "11": { namn: "Täby", luft: 3.4 }, "13": { namn: "Vallentuna", luft: -1.1 } },
  poster: [
    { id: "dev:100", slag: "olycka", rubrik: "Olycka", t: "Trafikolycka söder om Arninge", p: P(60, 3500), vag: "E4", start: "2026-10-18T05:52:00Z", sev: 4 },
    { id: "dev:101", slag: "hinder", rubrik: "Föremål på vägen", t: "Däck på körbanan", p: P(-80, 7400), vag: "E4", start: "2026-10-18T04:10:00Z", slut: null, sev: 2 },
    { id: "dev:102", slag: "vilt", rubrik: "Djur på vägen", t: "Älg vid vägen", p: P(2000, 7900), vag: "väg 73", slut: null },
    { id: "dev:103", slag: "olycka", rubrik: "Olycka", t: "Olycka vid Täby", p: P(400, 1000), vag: "E4", start: "2026-10-18T05:30:00Z" },
    { id: "dev:110", slag: "vagarbete", rubrik: "Vägarbete", t: "Vägarbete vid Bro", l: "dev:110", vag: "väg 73", start: "2026-10-01T06:00:00Z", slut: "2026-12-15", korfalt: 1, grans: 60 },
    { id: "dev:111", slag: "vagarbete", rubrik: "Vägarbete", t: "Beläggningsarbete", l: "dev:111", vag: "väg 73", start: "2026-10-10T06:00:00Z", slut: "2026-11-20", sev: 1 },
    { id: "dev:112", slag: "vagarbete", rubrik: "Vägarbete", t: "Kantstolpar", l: "dev:112", vag: "väg 73", start: "2026-10-17T06:00:00Z", slut: "tv" },
    { id: "dev:113", slag: "vagarbete", rubrik: "Avstängning", t: "Bron avstängd under arbetet", l: "dev:113", vag: "E4", start: "2026-09-01T06:00:00Z", slut: "tv", korfalt: 2, sev: 5 },
    { id: "dev:120", slag: "hastighet", rubrik: "50 km/h", t: "Sänkt hastighet", p: P(50, 5300), vag: "E4", slut: "2026-10-31" },
    { id: "dev:130", slag: "omledning", rubrik: "Omledning", t: "Omledning via Bro", p: P(3000, 3000), vag: "263", slut: "tv" },
    { id: "tt:1", slag: "restid", rubrik: "E4 N Arninge - Täby", l: "tt:1", tid: 7, normal: 6, status: "normal" },
    { id: "tt:2", slag: "ko", rubrik: "E4 S Täby - Arninge", l: "tt:2", tid: 12, normal: 6, status: "slow" },
    { id: "tt:3", slag: "restid", rubrik: "73 O Bro - Mora", l: "tt:3", tid: 3, normal: 3, status: "normal" },
    { id: "farja:200", slag: "farja", rubrik: "Ledsgårdsleden", text: "nästa 08:10 från Ledsgård, 08:40 från Bro", p: P(3000, 8300) },
  ],
};
const lang: Linjer = { schema: 2, generated_at: "2026-10-18T05:06:00Z", linjer: {
  "dev:110": [linje([600, 8030], [1400, 8030])], "dev:111": [linje([2200, 8030], [3000, 8030])], "dev:112": [linje([4000, 8030], [4800, 8030])],
  "dev:113": [linje([40, 6000], [40, 6600])],
  "tt:1": [linje([15, 1000], [15, 4000])],          // norrut, som resan
  "tt:2": [linje([-15, 4000], [-15, 1000])],        // söderut, mot resan
  "tt:3": [linje([1000, 8010], [3000, 8010])],      // österut, som resan
} };

function lonlat(ost: number, norr: number) { const [lon, lat] = P(ost, norr); return { lon, lat }; }

const del = (hem: boolean) => {
  const rader = resansRapport(rutt, hem, live, stat, snabb, lang);
  return { rader, grupper: grupperade(rader), tomma: tomma(rader) };
};
const dit = del(false), hem = del(true);
const fore = dit.rader.filter((r) => r.id !== "dev:100" && r.id !== "tt:1");
const R = (o: [number, number], t: [number, number]) => [linje(o, t, 100)];
const ut = {
  _om: "Facit för resans rapport (scripts/rapport-facit.ts). Skrivs av skriptet — ändras aldrig för hand.",
  marginaler: MARGINALER, langs: { andel: LANGS_ANDEL, minstM: LANGS_MINST_M, stegM: LANGS_STEG_M }, gruppFran: GRUPP_FRAN,
  rubrik: RUBRIK,
  in: { rutt, live, stat, snabb, lang },
  dit, hem,
  nytt: { fore: fore.map((r) => r.id), ut: nyttSedan(fore, dit.rader) },
  riktning: [
    { namn: "samma håll", delar: R([10, 0], [10, 2000]), svar: riktning(R([10, 0], [10, 2000]), rutt, 100) },
    { namn: "motsatt håll", delar: R([-10, 2000], [-10, 0]), svar: riktning(R([-10, 2000], [-10, 0]), rutt, 100) },
    { namn: "för långt bort", delar: R([400, 0], [400, 2000]), svar: riktning(R([400, 0], [400, 2000]), rutt, 100) },
    { namn: "når bara en provpunkt", delar: R([50, 3000], [250, 3000]), svar: riktning(R([50, 3000], [250, 3000]), rutt, 100) },   // 50, 150 och 250 m: en inom
  ],
  app: appen(),
};

/** Fliken och rapportskärmen (steg 3b): fallen ges som id ur Dit- och Hem-raderna ovan, så att apparna bygger samma indata. */
function appen() {
  const alla = kollensIds(dit.rader, hem.rader);
  const ur = (rader: Rad[], ids: string[]) => rader.filter((r) => ids.includes(r.id));
  const id = (rader: Rad[], villkor: (r: Rad) => boolean) => rader.filter(villkor).map((r) => r.id);
  const fast = (r: Rad) => r.slag === "kamera" || r.slag === "restid";
  const lagen = [
    { namn: "första kollen: inget nytt, det största pågår", dit: id(dit.rader, () => true), hem: id(hem.rader, () => true), sett: null },
    { namn: "en olycka och en kö har tillkommit", dit: id(dit.rader, () => true), hem: id(hem.rader, () => true),
      sett: alla.filter((i) => i !== "dev:100" && i !== "tt:2") },
    { namn: "en ny kamera räknas inte", dit: id(dit.rader, () => true), hem: id(hem.rader, () => true), sett: alla.filter((i) => i !== "cam:30") },
    { namn: "utan halkan är frysrisken störst", dit: id(dit.rader, (r) => r.slag !== "halka"), hem: id(hem.rader, (r) => r.slag !== "halka"), sett: alla },
    { namn: "lugnt: bara kameror och restider i normal trafik", dit: id(dit.rader, fast), hem: id(hem.rader, fast), sett: null },
  ].map((f) => {
    const l = radlage(ur(dit.rader, f.dit), ur(hem.rader, f.hem), f.sett);
    return { ...f, svar: l.lage === "nytt" ? { lage: l.lage, antal: l.antal, id: l.viktigast.id }
      : l.lage === "ingetNytt" ? { lage: l.lage, id: l.storst.id } : { lage: l.lage } };
  });
  const sett = alla.filter((i) => i !== "dev:100" && i !== "tt:1" && i !== "cam:30");
  const grind = (v: boolean, o: boolean) => ({ vaglag: v, olyckor: o, svar: aldersgrind(dit.rader, v, o).map((r) => r.id) });
  const tomt = (namn: string, rader: Rad[], v: boolean, o: boolean) =>
    ({ namn, rader: rader.map((r) => r.id), hem: rader === hem.rader, vaglag: v, olyckor: o, svar: tomtRad(rader, v, o) });
  return {
    lagen,
    nytt: [
      { namn: "olyckan är ny; restiden i normal trafik och kameran räknas inte", sett, svar: nyttSedanKollen(dit.rader, sett).map((r) => r.id) },
      { namn: "före den första kollen", sett: null, svar: nyttSedanKollen(dit.rader, null).map((r) => r.id) },
    ],
    kollen: alla,
    titlar: [["Olycka", "E4"], ["Djur på vägen", "E4"], ["Vägarbete", "73"], ["Fartkamera", null], ["Halt väglag på E4", "E4"]]
      .map(([rubrik, vag]) => ({ rubrik, vag, svar: titel(rubrik as string, vag) })),
    grind: [grind(true, false), grind(false, true), grind(true, true)],
    tomt: [
      tomt("Dit", dit.rader, false, false),
      tomt("Hem", hem.rader, false, false),
      tomt("Dit med gammalt väglag", aldersgrind(dit.rader, true, false), true, false),
      tomt("bara kameror: köerna mäts inte", dit.rader.filter((r) => r.slag === "kamera"), false, false),
      tomt("ingenting alls", [], false, true),
    ],
  };
}
const json = JSON.stringify(ut, null, 1) + "\n";
const fil = new URL("../engine/fixtures/rapport.json", import.meta.url);
if (process.argv.includes("--check")) {
  let cur = ""; try { cur = readFileSync(fil, "utf8"); } catch { /* saknas */ }
  if (cur !== json) { console.error("engine/fixtures/rapport.json är inte den skriptet skriver — kör scripts/rapport-facit.ts"); process.exit(1); }
  console.log("rapport.json i synk");
} else {
  writeFileSync(fil, json);
  for (const [namn, d] of [["DIT", dit], ["HEM", hem]] as const) {
    console.log(`── ${namn}: ${d.rader.length} rader, ${d.grupper.length} grupper; tomt: ${d.tomma.inget.join(", ")}; köer mäts inte: ${d.tomma.koerMatsInte}`);
    for (const r of d.rader) console.log(`  ${r.id.padEnd(10)} ${r.slag.padEnd(9)} ${String(r.avstandM).padStart(4)} m  ${String(r.langsM).padStart(6)} m  ${r.rubrik} — ${r.text}`);
    for (const g of d.grupper.filter((g) => g.antal > 1 || g.id.startsWith("grupp:"))) console.log(`  [grupp] ${g.rubrik} — ${g.text}`);
  }
  console.log("nytt:", ut.nytt.ut, "| riktning:", ut.riktning.map((r) => `${r.namn}=${r.svar}`).join(", "));
}
