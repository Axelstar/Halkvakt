// PARITETEN — DEN LEVANDE KEDJAN MOT KUVÖSENS FRYSTA PROCEDUR (kort #343 steg 5, DECISIONS #559). Ingen tröskel ändras.
// Steget före det här kör fysik/live/paritet.py på tre förregistrerade körningar i vintern 24/25 (15/12, 15/1, 15/2, alla 00Z): väg A är
// kuvösens EGNA funktioner (metnordic.load_mn + niva2/prognos.py::prognoslage) med kandidatens frysta parametrar och kandidatens ENA
// modell i alla fem folds, väg B är fysik/live/kandidat_fysik.py på samma analys, samma körningsfil och samma modell. Den här filen
// läser utfallen och ställer domen mot toleransen som skrevs före körningen.
// DOMEN ÄR INGEN GRIND: den säger om det som går live är det som mättes. Faller den är svaret ett beslut av Bengt och Axel, inte en
// uppmjukad tolerans (fönstret FONSTER höjs, eller den levande kedjan sparar tillstånd mellan körningarna).
// Kör: node --experimental-strip-types scripts/matningar/kuvos-paritet-2026-10-14.ts [--sjalvtest]
import { existsSync, readdirSync, readFileSync } from "node:fs";

// Toleransen, skriven 2026-10-14 FÖRE körningen (DECISIONS #559). ts_fysik är fysikkolumnen före rättelsen, ph efter den.
export const TOLERANS = { median: 0.10, p95: 0.30 };          // °C
// Snöfälten är de sex av kandidatens 70 särdrag som en omstart 45 dygn bakåt kan tappa. De har ingen tolerans i °C; de redovisas
// som andel av väg A:s egen nivå, eftersom ett snötäcke på 200 mm vatten som skiljer 10 mm är en annan sak än ett på 10 mm.
export const SNO_ANDEL_LARM = 0.10;

export type Utfall = {
  korning: string; punkter_gemensamma: number; rader_jamforda: number;
  kolumnen_bakat_a_timmar: number; kolumnen_bakat_b_timmar: number;
  falt: { falt: string; median: number | null; p95: number | null; max: number | null; n: number }[];
  snon_vid_korningen: { falt: string; median_diff: number | null; max_diff: number | null; median_niva_a: number | null }[];
  kraften: { falt: string; median: number | null; max: number | null; median_sista_dygnet: number | null; max_sista_dygnet: number | null }[];
  metan: { kolumn: string; median: number | null; max_eller_antal_olika: number }[];
  ifyllda_punkttimmar_vag_b: number;
};

/** Domen per körning: vilka fält som ligger utanför toleransen, och vilka snöfält som skiljer mer än andelen av väg A:s nivå. */
export function dom(u: Utfall): { utanfor: string[]; sno: string[]; metan: string[]; tomt: boolean } {
  const utanfor: string[] = [];
  let matt = 0;
  for (const f of u.falt) {
    if (f.median === null || f.p95 === null) continue;
    matt += f.n;
    if (f.median > TOLERANS.median) utanfor.push(`${f.falt} median ${f.median.toFixed(3)} > ${TOLERANS.median}`);
    else if (f.p95 > TOLERANS.p95) utanfor.push(`${f.falt} p95 ${f.p95.toFixed(3)} > ${TOLERANS.p95}`);
  }
  const sno = u.snon_vid_korningen
    .filter((s) => s.median_diff !== null && s.median_niva_a !== null && s.median_niva_a > 0
      && s.median_diff / s.median_niva_a > SNO_ANDEL_LARM)
    .map((s) => `${s.falt} ${(100 * (s.median_diff as number) / (s.median_niva_a as number)).toFixed(0)} % av väg A:s nivå`);
  const metan = u.metan.filter((m) => m.max_eller_antal_olika > 0).map((m) => m.kolumn);
  return { utanfor, sno, metan, tomt: matt === 0 };
}

function rad(x: number | null, d = 3): string { return x === null ? "–" : x.toFixed(d); }

if (process.argv.includes("--sjalvtest")) {
  const bas: Utfall = {
    korning: "2025-01-15 00:00:00", punkter_gemensamma: 754, rader_jamforda: 4524,
    kolumnen_bakat_a_timmar: 1800, kolumnen_bakat_b_timmar: 1080,
    falt: [{ falt: "ts_fysik", median: 0.04, p95: 0.12, max: 0.5, n: 4524 }, { falt: "ph", median: 0.05, p95: 0.14, max: 0.6, n: 4524 }],
    snon_vid_korningen: [{ falt: "swe", median_diff: 1.0, max_diff: 9, median_niva_a: 200 },
                         { falt: "snowd", median_diff: 60, max_diff: 90, median_niva_a: 200 }],
    kraften: [{ falt: "ta", median: 0, max: 0, median_sista_dygnet: 0, max_sista_dygnet: 0 }],
    metan: [{ kolumn: "elev_ifs", median: null, max_eller_antal_olika: 3 }], ifyllda_punkttimmar_vag_b: 0,
  };
  const fel: string[] = [];
  const d = dom(bas);
  if (d.utanfor.length) fel.push(`en körning inom toleransen fälldes: ${d.utanfor.join("; ")}`);
  if (d.sno.join() !== "snowd 30 % av väg A:s nivå") fel.push(`snöraden fel: ${d.sno.join("; ") || "ingen"}`);
  if (d.metan.join() !== "elev_ifs") fel.push(`metaraden fel: ${d.metan.join("; ") || "ingen"}`);
  if (d.tomt) fel.push("en mätt körning räknades som tom");
  // Utanför toleransen: medianen över taket, och p95 över taket med medianen under det — båda ska fällas, var för sig.
  const d2 = dom({ ...bas, falt: [{ falt: "ph", median: 0.11, p95: 0.2, max: 1, n: 10 }] });
  if (d2.utanfor.length !== 1 || !d2.utanfor[0].includes("median")) fel.push(`medianen över taket fälldes inte: ${d2.utanfor.join("; ")}`);
  const d3 = dom({ ...bas, falt: [{ falt: "ph", median: 0.09, p95: 0.31, max: 1, n: 10 }] });
  if (d3.utanfor.length !== 1 || !d3.utanfor[0].includes("p95")) fel.push(`p95 över taket fälldes inte: ${d3.utanfor.join("; ")}`);
  // En körning utan jämförbara rader är INTE grön; den är omätt, och det måste synas.
  const d4 = dom({ ...bas, falt: [{ falt: "ph", median: null, p95: null, max: null, n: 0 }] });
  if (!d4.tomt) fel.push("en körning utan jämförbara rader räknades inte som omätt");
  // Snöfältet utan nivå (väg A har ingen snö) får inte larma på en division med noll.
  const d5 = dom({ ...bas, snon_vid_korningen: [{ falt: "swe", median_diff: 5, max_diff: 5, median_niva_a: 0 }] });
  if (d5.sno.length) fel.push(`snö utan nivå larmade: ${d5.sno.join("; ")}`);
  if (fel.length) { for (const f of fel) console.log("✗", f); process.exit(1); }
  console.log(`✓ självtest: domen fäller median > ${TOLERANS.median} °C och p95 > ${TOLERANS.p95} °C var för sig, ` +
    `snö som skiljer mer än ${100 * SNO_ANDEL_LARM} % av väg A:s nivå, metakolumner som skiljer, och en omätt körning räknas inte som grön`);
  process.exit(0);
}

const KAT = process.env.PARITET_UT ?? "paritet-ut";
if (!existsSync(KAT)) { console.log(`${KAT} saknas — steget som kör fysik/live/paritet.py har inte lämnat något`); process.exit(1); }
const filer = readdirSync(KAT).filter((f) => f.startsWith("paritet_") && f.endsWith(".json")).sort();
if (!filer.length) { console.log(`inga paritet_*.json i ${KAT}`); process.exit(1); }

console.log(`## Pariteten: ${filer.length} körningar (tolerans median ≤ ${TOLERANS.median} °C, p95 ≤ ${TOLERANS.p95} °C, skriven före körningen)\n`);
console.log("| körning | punkter | rader | kolumnen bakåt A / B | ts_fysik median / p95 / max | ph median / p95 / max | dom |");
console.log("| :-- | --: | --: | --: | --: | --: | :-- |");
const domar: { korning: string; d: ReturnType<typeof dom>; u: Utfall }[] = [];
for (const f of filer) {
  const u = JSON.parse(readFileSync(`${KAT}/${f}`, "utf8")) as Utfall;
  const d = dom(u); domar.push({ korning: u.korning, d, u });
  const g = (n: string) => u.falt.find((x) => x.falt === n);
  const kol = (n: string) => { const x = g(n); return x ? `${rad(x.median)} / ${rad(x.p95)} / ${rad(x.max)}` : "–"; };
  const svar = d.tomt ? "**OMÄTT**" : d.utanfor.length ? `**UTANFÖR**: ${d.utanfor.join("; ")}` : "inom";
  console.log(`| ${u.korning} | ${u.punkter_gemensamma} | ${u.rader_jamforda} | ${u.kolumnen_bakat_a_timmar} / ` +
    `${u.kolumnen_bakat_b_timmar} h | ${kol("ts_fysik")} | ${kol("ph")} | ${svar} |`);
}

console.log("\n### Snön vid körningen (sex av kandidatens 70 särdrag; en omstart 45 dygn bakåt kan tappa den)\n");
console.log("| körning | fält | median diff | max diff | väg A:s nivå | andel |");
console.log("| :-- | :-- | --: | --: | --: | --: |");
for (const { korning, u } of domar)
  for (const s of u.snon_vid_korningen)
    console.log(`| ${korning} | ${s.falt} | ${rad(s.median_diff, 2)} | ${rad(s.max_diff, 2)} | ${rad(s.median_niva_a, 2)} | ` +
      `${s.median_diff !== null && s.median_niva_a ? (100 * s.median_diff / s.median_niva_a).toFixed(0) + " %" : "–"} |`);

console.log("\n### Kraften (väg A:s G mot väg B:s bygg_F över väg B:s fönster)\n");
console.log("| körning | fält | hela fönstret median / max | sista dygnet median / max |");
console.log("| :-- | :-- | --: | --: |");
for (const { korning, u } of domar)
  for (const k of u.kraften)
    if ((k.max ?? 0) > 0 || (k.max_sista_dygnet ?? 0) > 0)
      console.log(`| ${korning} | ${k.falt} | ${rad(k.median, 6)} / ${rad(k.max, 6)} | ${rad(k.median_sista_dygnet, 6)} / ${rad(k.max_sista_dygnet, 6)} |`);
if (!domar.some((x) => x.u.kraften.some((k) => (k.max ?? 0) > 0 || (k.max_sista_dygnet ?? 0) > 0)))
  console.log("| alla | – | 0 / 0 | 0 / 0 |");

const metan = [...new Set(domar.flatMap((x) => x.d.metan))];
const utanfor = domar.filter((x) => x.d.utanfor.length || x.d.tomt);
console.log(`\n**Metan:** ${metan.length ? "skiljer i " + metan.join(", ") : "alla gemensamma kolumner lika"}. ` +
  `**Ifyllda punkttimmar på väg B:** ${domar.map((x) => x.u.ifyllda_punkttimmar_vag_b).join(", ")}.`);
console.log(`\n**DOM:** ${utanfor.length === 0
  ? `alla ${domar.length} körningar inom toleransen — det som går live räknar samma sak som kuvösens frysta kandidat.`
  : `${utanfor.length} av ${domar.length} körningar ${domar.some((x) => x.d.tomt) ? "omätta eller " : ""}utanför toleransen (` +
    utanfor.map((x) => x.korning).join(", ") + "). Toleransen mjukas INTE upp; svaret är ett beslut av Bengt och Axel."}`);
