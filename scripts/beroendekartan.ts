// Beroendekartans DRIFTVAKT (Bengts order 12/9, DECISIONS #147): hämtar koden från något
// kartan inte känner?
//
// Själva kartan bor i publish/beroenden.ts sedan #149 — den måste kunna läsas av två saker
// utan att något körs: den här vakten och nyhetsbedömningen. Ett skript med toppnivåkod går
// inte att importera utan att hela den skarpa körningen startar.
//
// VAD VAKTEN GÖR. Den läser varje extern värd ur spårad kod, jämför med kartan, och fäller om
// koden hämtar från något som inte står där. Den skriver ingenting. Sedan visar den gapet:
// vilka PRODUKTIONSberoenden som saknar bevakning.
//
// VAD DEN INTE GÖR. Den bedömer ingen nyhet — det är publish/nyhetsbedomning.ts. Och där
// `signal`-kolumnen säger OKÄND har ingen letat ännu; ärligare än att gissa en feed.
//
// Kör: node --experimental-strip-types scripts/beroendekartan.ts
// Självtest utan nät: scripts/beroendekartan.ts --sjalvtest

import { KARTAN, EGEN, TRV_OBJEKT, granska, type Beroende, type Roll } from "../publish/beroenden.ts";

// ── SJÄLVTEST mot känd sanning, utan nät ─────────────────────────────────────────────────
if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — beroendekartan mot känd sanning\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (JSON.stringify(fick) !== JSON.stringify(vantat)) {
      console.error(`  FEL: ${namn} = ${JSON.stringify(fick)}, väntat ${JSON.stringify(vantat)}`); ok = false;
    } else console.log(`  ok: ${namn} = ${JSON.stringify(fick)}`);
  };
  const prov: Beroende[] = [
    { vard: "a.se", roll: "produktion", matar: "x", brister: "y", bevakad: "vakt-a", signal: "rss" },
    { vard: "b.se", roll: "produktion", matar: "x", brister: "y", bevakad: "", signal: "OKÄND" },
    { vard: "c.se", roll: "verktyg", matar: "x", brister: "y", bevakad: "", signal: "OKÄND" },
  ];
  const g1 = granska(prov, ["a.se", "b.se", "c.se"]);
  k("inga okända", g1.okanda, []);
  k("inga döda", g1.doda, []);
  k("obevakade i produktion", g1.obevakade.map((b) => b.vard), ["b.se"]);
  k("verktyg räknas inte som gap", g1.obevakade.some((b) => b.roll === "verktyg"), false);
  k("ny värd fångas", granska(prov, ["a.se", "b.se", "c.se", "ny-kalla.se"]).okanda, ["ny-kalla.se"]);
  k("borttagen värd rapporteras", granska(prov, ["a.se", "b.se"]).doda, ["c.se"]);
  k("egen infrastruktur ignoreras",
    granska(prov, ["a.se", "b.se", "c.se", "api.github.com", "deno.land", "axelstar.github.io"]).okanda, []);

  // Kartan själv: varje produktionsrad måste säga vad som brister OCH bära nyckelord — utan
  // dem kan nyhetsbedömningen aldrig svara på "vad rör det här?".
  k("varje produktionsrad säger vad som brister",
    KARTAN.filter((b) => b.roll === "produktion" && b.brister.length < 5).map((b) => b.vard), []);
  k("varje produktionsrad har nyckelord",
    KARTAN.filter((b) => b.roll === "produktion" && !b.nyckelord?.length).map((b) => b.vard), []);
  // Varje produktionsrad måste också vara NÅBAR från en källvaktskälla, annars är bevakningen
  // bara ett namn i en kolumn.
  k("varje bevakad produktionsrad pekar på minst en källa",
    KARTAN.filter((b) => b.roll === "produktion" && b.bevakad && !b.bevakad.trim().length).map((b) => b.vard), []);

  // DRIFTVAKT för Trafikverkets objekttyper: listan i kartan ska vara densamma som koden
  // faktiskt frågar efter. Samma mönster som anomalins vakt mot grind A (#129).
  const { execSync: ex } = await import("node:child_process");
  const { fileURLToPath: f2 } = await import("node:url");
  const cwd = f2(new URL(".", import.meta.url));
  const rot2 = ex("git rev-parse --show-toplevel", { encoding: "utf-8", cwd }).trim();
  // Citationstecknet är inte kosmetiskt: utan det matchar mönstret även typdeklarationen
  // `objecttype: string` och plockar ut "tring". Bara CITERADE värden är riktiga objekttyper.
  const kod = ex(`git grep -hoiE "objecttype[:=] ?['\\"][A-Za-z]+" -- "*.ts"`, { encoding: "utf-8", cwd: rot2 })
    .split("\n").map((r) => r.replace(/^objecttype[:=] ?['"]/i, "").trim().toLowerCase()).filter(Boolean);
  const iKod = [...new Set(kod)].sort();
  k("TRV-objekttyperna i kartan = de koden frågar efter", iKod, [...TRV_OBJEKT].sort());

  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE.\n"); process.exit(1); }
  console.log("\nSJÄLVTEST OK: kartan fångar ny värd, rapporterar borttagen, räknar gapet bara i\nproduktionsledet, och TRV-objekttyperna stämmer med koden.");
  process.exit(0);
}

// ── SKARPT: läser repots egen kod ────────────────────────────────────────────────────────
const { execSync } = await import("node:child_process");
const { readFileSync } = await import("node:fs");
const { fileURLToPath } = await import("node:url");

const har = { encoding: "utf-8" as const, cwd: fileURLToPath(new URL(".", import.meta.url)) };
const rot = execSync("git rev-parse --show-toplevel", har).trim();

// Statefiler undantas. De är DATA, inte kod: källvaktens state fylls med guid-länkar ur
// tredje parts RSS-flöden, och en SMHI-post som råkar länka till en ny domän skulle annars
// fälla CI på ett helt orelaterat bygge. Kartan ska svara på vad VI hämtar från, inte på
// vad andra länkar till. Kartans egna filer räknar inte sig själva.
const SJALV = ["scripts/beroendekartan.ts", "publish/beroenden.ts"];
const filer = execSync("git ls-files", { ...har, cwd: rot }).split("\n").map((s) => s.trim())
  .filter((s) => s && /\.(ts|yml|yaml|kt|swift|sql|json)$/.test(s)
    && !s.includes("/.build/") && !s.includes("/vectors/") && !/-state\.json$/.test(s)
    && !SJALV.includes(s));

const vardar = new Set<string>();
for (const f of filer) {
  const s = readFileSync(`${rot}/${f}`, "utf-8");
  for (const m of s.matchAll(/https?:\/\/([a-zA-Z0-9._-]+\.[a-z]{2,})/g)) vardar.add(m[1]);
}

const g = granska(KARTAN, [...vardar]);

console.log(`Beroendekartan — vad hänger vi på, och vem märker om det ändras?\n`);
console.log(`${filer.length} spårade filer lästa. ${[...vardar].filter((h) => !EGEN.test(h)).length} externa värdar i koden, ${KARTAN.length} rader i kartan.\n`);

const ROLLTEXT: Record<Roll, string> = {
  produktion: "PRODUKTION — matar motorn, arkivet eller en grind",
  signal: "SIGNALKÄLLA — bevakas för att den annonserar ändringar i ett produktionsberoende",
  verktyg: "VERKTYG — bara mätskript och rekognosering",
  omvärld: "OMVÄRLD — bevakas för att veta vad andra gör; vi hämtar inga data därifrån",
  bygg: "BYGG — byggkedjan, inte data",
};
for (const roll of ["produktion", "signal", "verktyg", "omvärld", "bygg"] as Roll[]) {
  const rader = KARTAN.filter((b) => b.roll === roll);
  console.log(`\n${ROLLTEXT[roll]}  (${rader.length})`);
  for (const b of rader) {
    console.log(`  ${b.bevakad ? "✓" : "·"} ${b.vard}`);
    console.log(`      matar:    ${b.matar}`);
    if (roll === "produktion") console.log(`      brister:  ${b.brister}`);
    console.log(`      bevakad:  ${b.bevakad || "NEJ"}   signal: ${b.signal}`);
    if (b.nyckelord?.length) console.log(`      nyckelord: ${b.nyckelord.join(", ")}`);
    if (b.frammande?.length) console.log(`      främmande: ${b.frammande.join(", ")}`);
  }
}

console.log(`\n${"─".repeat(78)}`);
console.log(`GAPET: ${g.obevakade.length} av ${KARTAN.filter((b) => b.roll === "produktion").length} produktionsberoenden saknar bevakning.`);
for (const b of g.obevakade) console.log(`  ✗ ${b.vard.padEnd(40)} ${b.brister}`);

const prod = KARTAN.filter((b) => b.roll === "produktion");
const sig = KARTAN.filter((b) => b.roll === "signal");
const omv = KARTAN.filter((b) => b.roll === "omvärld");
// Antalet KÄLLOR i källvakten räknas ur kartans egna hänvisningar, inte ur minnet —
// en rad kan peka på flera källor ("polisen-regler + polisen-api").
const kallor = new Set(KARTAN.flatMap((b) => b.bevakad.split("+").map((x) => x.trim())).filter(Boolean));
console.log(`\nKällvakten kör ${kallor.size} källor. De täcker ${prod.filter((b) => b.bevakad).length} av ${prod.length} produktionsberoenden`);
console.log(`via ${sig.length} signalkällor, plus ${omv.length} omvärldssidor som inte är beroenden.`);
const utanSignal = prod.filter((b) => !b.bevakad);
if (utanSignal.length) console.log(`Utan signal: ${utanSignal.map((b) => b.vard).join(", ")}.`);
else {
  console.log(`Inget produktionsberoende står utan signal. Det säger INTE att varje signal är`);
  console.log(`bevisad: bara Trafikverkets larmväg har fyrat skarpt (#31). De sex nya är uppmätta`);
  console.log(`som stabila och läsbara — inte som bevisat larmande. Beviset kommer med första`);
  console.log(`äkta ändringen, och först då vet vi att kedjan källa → issue → notis håller.`);
}

if (g.doda.length) {
  console.log(`\nRADER UTAN MOTSVARIGHET I KODEN (${g.doda.length}) — källan är borta, eller på väg in:`);
  for (const h of g.doda) console.log(`  ? ${h}`);
}
if (g.okanda.length) {
  console.log(`\n✗ ODEKLARERADE VÄRDAR I KODEN (${g.okanda.length}):`);
  for (const h of g.okanda) console.log(`  ${h}`);
  console.log(`\nKoden hämtar från något kartan inte känner. Lägg in raden i publish/beroenden.ts`);
  console.log(`med roll, vad det matar, vad som brister och hur en ändring skulle synas. En karta`);
  console.log(`som inte är komplett kan aldrig bära en maskinell bedömning av en nyhet.`);
  process.exit(1);
}
console.log(`\nKartan är komplett mot koden: varje extern värd har en rad.`);
process.exit(0);
