// Publikvakten (kort #320, DECISIONS #506; Bengt 9/10: "ja till alla tre"). Repot är publikt sedan 9/10 (#503): allt som checkas in kan
// läsas av vem som helst och går inte att ta tillbaka. Vakten prövar HELA trädet (git ls-files), inte bara ändringen:
//   1. varje fil under data/ står i registret data/KALLOR.json med källa och licens — och varje rad i registret finns som fil;
//   2. ingen fil är större än 20 MB (stora data hör hemma i en release eller i hinken);
//   3. inga kända mönster: Trafikverkets leveransfiler (Halkvakt_ÅÅMM.csv), modellarrayer (.npy), utfall per rad (oof) och exporter av
//      testarnas svar och missar (driver_facit, driver_miss).
// Den letar efter namn och storlekar, inte innehåll — ett nytt sorts misstag fångar den inte; då gäller regeln i CLAUDE.md (PUBLIKT REPO).
// Kör: node --experimental-strip-types scripts/publikvakt.ts [--sjalvtest]
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";

export const MAX_BYTE = 20_000_000;
export const REGISTER = "data/KALLOR.json";
export const MONSTER: [RegExp, string][] = [
  [/(^|\/)Halkvakt_\d{4}\.csv(\.gz)?$/i, "Trafikverkets leveransfil — ligger i hinken arkiv, aldrig i repot (#438, #499)"],
  [/\.npy$/i, "modellarray — räknad rad för rad, hör inte hemma i ett publikt repo"],
  [/(^|\/)oof[_.-]/i, "utfall per rad (oof) — räknat ur Trafikverkets leverans"],
  [/driver_(facit|miss)[^/]*\.(csv|tsv|json|xlsx?|gz)$/i, "export av testarnas svar eller missar (#498)"],   // migrationerna i sql/ är schema, inte data
];
export type Kalla = { kalla: string; licens: string };

/** Felen i trädet. filer: sökväg och storlek; register: data-fil → källa och licens. */
export function granska(filer: { fil: string; byte: number }[], register: Record<string, Kalla>): string[] {
  const fel: string[] = [];
  const finns = new Set(filer.map((f) => f.fil));
  for (const { fil, byte } of filer) {
    if (fil.startsWith("data/") && fil !== REGISTER) {
      const r = register[fil];
      if (!r) fel.push(`${fil}: står inte i ${REGISTER} — skriv in källa och licens, eller flytta filen till en release eller hinken`);
      else if (!r.kalla?.trim() || !r.licens?.trim()) fel.push(`${fil}: registret saknar källa eller licens`);
    }
    if (byte > MAX_BYTE) fel.push(`${fil}: ${(byte / 1e6).toFixed(1)} MB, över gränsen ${MAX_BYTE / 1e6} MB — lägg den i en release eller i hinken`);
    for (const [m, varfor] of MONSTER) if (m.test(fil)) fel.push(`${fil}: ${varfor}`);
  }
  for (const fil of Object.keys(register)) if (!finns.has(fil)) fel.push(`${REGISTER}: ${fil} finns inte i repot — ta bort raden`);
  return fel;
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  const reg: Record<string, Kalla> = { "data/a.csv": { kalla: "SMHI", licens: "CC BY 4.0" } };
  const f = (fil: string, byte = 100) => ({ fil, byte });
  k(granska([f("data/a.csv"), f("scripts/x.ts"), f(REGISTER)], reg).length === 0, "ett registrerat träd passerar");
  k(granska([f("data/a.csv"), f("data/b.csv")], reg).some((e) => e.startsWith("data/b.csv: står inte")), "en oregistrerad datafil fälls");
  k(granska([f("data/a.csv"), f("docs/stor.pdf", 25_000_000)], reg).some((e) => e.includes("över gränsen")), "en fil över 20 MB fälls");
  k(granska([f("data/a.csv"), f("kuvos/Halkvakt_2411.csv.gz")], reg).some((e) => e.includes("Trafikverkets leveransfil")), "Trafikverkets leveransfil fälls var den än ligger");
  k(granska([f("data/a.csv"), f("x/oof_A2.npy")], reg).length === 2, "modellarray och oof fälls var för sig");
  k(granska([f("data/a.csv"), f("export/driver_facit_2026.csv")], reg).some((e) => e.includes("testarnas svar")), "en export av testarnas svar fälls");
  k(granska([f("data/a.csv"), f("sql/038_driver_miss.sql")], reg).length === 0, "en migration som skapar testartabellen är inte data");
  k(granska([], reg).some((e) => e.includes("finns inte i repot")), "en registerrad utan fil fälls");
  k(granska([f("data/a.csv")], { "data/a.csv": { kalla: "SMHI", licens: "" } }).some((e) => e.includes("saknar källa eller licens")), "en rad utan licens fälls");
  console.log("✓ självtest: registret, storleken, Trafikverkets filer, modellarrayer, oof, testarnas svar och inaktuella registerrader");
  process.exit(0);
}

if (korsSjalv) {
  const filer = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean)
    // lstat, inte stat: repot bär symboliska länkar (skills/*/references → ../../references) som på Linux pekar på en sökväg som inte
    // finns. stat följer länken och kraschade i ci 9/10; på Windows checkas länken ut som en textfil, så felet syntes inte lokalt.
    .map((fil) => ({ fil, byte: lstatSync(fil).size }));
  const register: Record<string, Kalla> = JSON.parse(readFileSync(REGISTER, "utf8")).filer;
  const fel = granska(filer, register);
  if (fel.length) { console.error(`✗ publikvakten: ${fel.length} fel\n  ` + fel.join("\n  ")); process.exit(1); }
  console.log(`✓ publikvakten: ${filer.length} filer, ${Object.keys(register).length} datafiler i registret, ingen över ${MAX_BYTE / 1e6} MB, inga förbjudna mönster`);
}
