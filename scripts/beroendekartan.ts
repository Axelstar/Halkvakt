// Beroendekartan (Bengts order 12/9): vilka källor hänger vi på, vad går sönder om de ändras,
// och vem märker det?
//
// FRÅGAN BAKOM. Bengt 12/9: "har vi något system som tar hand om uppdateringar från vägverket,
// smhi och alla andra som vi hämtar uppgifter från" — och sedan: "kan man bygga det så att all
// ny information processas maskinellt och man får en bedömning av en nyhet. Det här kan komma
// att påverka det och det, och att en människa bara säger ok."
//
// Källvakten (#31, scripts/trv-bevakning.ts) hämtar redan nyheter — men från SJU källor, valda
// när issue #2 skrevs. Sedan dess har vi lagt till radar, moln, Finland, Norge, Danmark och
// polisen. En bedömning kan aldrig bli bättre än listan den bedöms mot, och listan som ska vara
// komplett läses från källan, inte från minnet (samma husregel som mätvakten #105,
// ruttberedskapen #124, värdevakten #133 och kontraktsgrinden #144).
//
// VAD KARTAN GÖR. Den läser varje extern värd ur spårad kod, jämför med den deklarerade kartan
// nedan, och fäller om koden hämtar från något som inte står i kartan. Den skriver ingenting.
// Sedan visar den gapet: vilka PRODUKTIONSberoenden som saknar bevakning i dag.
//
// VAD DEN INTE GÖR. Den bedömer ingen nyhet. Den är underlaget en sådan bedömning skulle vila
// på — steget efter, inte steget självt. Och `signal`-kolumnen säger var en ändring skulle
// synas; där den står OKÄND har ingen letat ännu, och det är ärligare än att gissa en feed.
//
// Kör: node --experimental-strip-types scripts/beroendekartan.ts
// Självtest utan nät: scripts/beroendekartan.ts --sjalvtest

type Roll =
  | "produktion"   // matar motorn, arkivet eller en grind — går den sönder märks det i appen
  | "verktyg"      // bara mätskript och rekognosering — går den sönder står en mätning still
  | "signal"      // bevakas för att den ANNONSERAR ändringar i ett produktionsberoende
  | "omvärld"      // bevakas för att veta vad andra gör; vi hämtar inga data därifrån
  | "bygg";        // byggkedjan, inte data

export type Beroende = {
  vard: string;
  roll: Roll;
  matar: string;      // vad det ger oss, på svenska
  brister: string;    // vad som går sönder om källan ändras eller försvinner
  bevakad: string;    // källvaktens namn på källan, eller "" om obevakad
  signal: string;     // var en ändring skulle synas — OKÄND = ingen har letat ännu
};

export const KARTAN: Beroende[] = [
  // ── PRODUKTION ───────────────────────────────────────────────────────────────────────
  { vard: "api.trafikinfo.trafikverket.se", roll: "produktion",
    matar: "väder, väglag, kameror, situationer — motorns huvudkälla",
    brister: "allt: snapshoten, alla fem varningsslag, hela arkivet",
    bevakad: "trv-rss + trv-portal-news + trv-drift",
    signal: "bransch-RSS och portalens nyhetssida (bevisad väg, #31)" },
  { vard: "opendata-download-warnings.smhi.se", roll: "produktion",
    matar: "SMHI:s vädervarningar (ingest/sources/smhi.ts)",
    brister: "varningsarkivet och grind F-A:s hela underlag",
    bevakad: "smhi-uppdateringar",
    signal: "www.smhi.se/rss/uppdateringar-oppna-data-fran-smhi — RSS, 7 poster, verifierad 12/9 (#148)" },
  { vard: "opendata-download-radar.smhi.se", roll: "produktion",
    matar: "radarn (ingest/radar.ts)",
    brister: "radardomen och en av tre proxies i #89 (a)",
    bevakad: "smhi-uppdateringar",
    signal: "samma RSS som SMHI-varningarna (#148)" },
  { vard: "opendata-download-metobs.smhi.se", roll: "produktion",
    matar: "molnmängd parameter 16 (publish/moln.ts) — hämtas vid körning, lagras inte",
    brister: "grind R-A4 och grind T-A:s molnkontroll",
    bevakad: "smhi-uppdateringar",
    signal: "samma RSS som SMHI-varningarna (#148)" },
  { vard: "tie.digitraffic.fi", roll: "produktion",
    matar: "finska vägstationer (ingest/fi.ts)",
    brister: "gränssnapshoten mot Finland och grind R-A --land=fi",
    bevakad: "fi-digitraffic",
    signal: "www.digitraffic.fi/en/news/ — hash, 20 857 tecken, stabil. API-changes-sidan är JS-renderad och ger bara skal (#148)" },
  { vard: "datex-server-get-v3-1.atlas.vegvesen.no", roll: "produktion",
    matar: "norska vägstationer, DATEX (ingest/no.ts)",
    brister: "gränssnapshoten mot Norge",
    bevakad: "no-vegvesen",
    signal: "vegvesen.no …/hva-er-datex/informasjon-og-nyheter/ — hash, 1 364 tecken. Det var här v3.1 annonserades (#148)" },
  { vard: "opendataapi.dmi.dk", roll: "produktion",
    matar: "danska stationer (ingest/dk.ts)",
    brister: "dk-arkivet (medvetet utanför snapshoten — grästemp, #45)",
    bevakad: "dk-dmi",
    signal: "www.dmi.dk/frie-data — hash, 3 980 tecken. Adressen kommer ur DMI:s eget API-rotsvar; gamla opendatadocs.dmi.govcloud.dk svarar 404 på varje sökväg (#148)" },
  { vard: "storage.googleapis.com", roll: "produktion",
    matar: "DMI:s utlagda filer (ingest/dk.ts)",
    brister: "samma som DMI",
    bevakad: "dk-dmi",
    signal: "täcks av DMI:s egen kanal — filerna är DMI:s, lagringen bara en hylla (#148)" },
  { vard: "polisen.se", roll: "produktion",
    matar: "vilthändelser (ingest/sources/polisen.ts) — varningsslag A4",
    brister: "viltvarningarna",
    bevakad: "polisen-regler + polisen-api",
    signal: "polisen.se regler-for-oppna-data (villkoren, user-agent-kravet) och api-over-polisens-handelser (fälten) — hash, båda stabila (#148)" },

  // ── VERKTYG ──────────────────────────────────────────────────────────────────────────
  { vard: "frost.met.no", roll: "verktyg",
    matar: "norska observationer för frost-provet",
    brister: "frost-prov och frost-rekognosering står still", bevakad: "", signal: "OKÄND" },
  { vard: "api.opentopodata.org", roll: "verktyg",
    matar: "höjddata för höjd-provet och anomalin",
    brister: "höjduppdelningen i anomalin", bevakad: "", signal: "OKÄND" },
  { vard: "overpass-api.de", roll: "verktyg",
    matar: "broar ur OpenStreetMap (fetch-bridges)",
    brister: "brolistan kan inte byggas om", bevakad: "", signal: "OKÄND" },
  { vard: "overpass.kumi.systems", roll: "verktyg",
    matar: "reservspegel för Overpass", brister: "en av tre speglar", bevakad: "", signal: "OKÄND" },
  { vard: "overpass.private.coffee", roll: "verktyg",
    matar: "reservspegel för Overpass", brister: "en av tre speglar", bevakad: "", signal: "OKÄND" },
  { vard: "lastkajen.trafikverket.se", roll: "verktyg",
    matar: "NVDB-uttag, rekognosering", brister: "lastkajen-rekognoseringen", bevakad: "", signal: "OKÄND" },
  { vard: "www.trafikverket.se", roll: "verktyg",
    matar: "publika sidor i rekognosering och en testfixtur", brister: "inget i drift", bevakad: "", signal: "OKÄND" },

  // ── OMVÄRLD (bevakas, men vi hämtar inga data därifrån) ──────────────────────────────
  { vard: "api.met.no", roll: "omvärld",
    matar: "inget i drift — bevakas som omvärld, används i radar-rekognosering",
    brister: "inget", bevakad: "met-api", signal: "hash av framsidan (#31)" },
  { vard: "www.halkvarning.se", roll: "omvärld",
    matar: "inget — konkurrent/omvärld", brister: "inget", bevakad: "halkvarning",
    signal: "hash av framsidan, siffror strippade (#31)" },
  { vard: "www.klimator.se", roll: "omvärld",
    matar: "inget — konkurrent/omvärld", brister: "inget", bevakad: "klimator",
    signal: "hash av serverskalet — JS-tung sida, vakten ser inte innehållet (#31)" },
  { vard: "opendata.smhi.se", roll: "signal",
    matar: "inget — SMHI:s DOKUMENTATIONSsajt. Bevakas, men är inte en av de tre nedladdningsvärdar vi faktiskt hämtar från",
    brister: "inget", bevakad: "smhi-opendata", signal: "sitemap.xml, 238 sidor (#31)" },
  { vard: "www.smhi.se", roll: "signal",
    matar: "inget — SMHI:s EGEN uppdateringskanal för öppna data, RSS. Det är HÄR ändringar i varnings-, radar- och metobs-API:erna annonseras",
    brister: "inget", bevakad: "smhi-uppdateringar", signal: "rss/uppdateringar-oppna-data-fran-smhi (#148)" },
  { vard: "www.digitraffic.fi", roll: "signal",
    matar: "inget — Fintraffics nyhetssida för Digitraffic",
    brister: "inget", bevakad: "fi-digitraffic", signal: "en/news/, hash (#148)" },
  { vard: "www.vegvesen.no", roll: "signal",
    matar: "inget — Vegvesens DATEX-sida för information och nyheter",
    brister: "inget", bevakad: "no-vegvesen", signal: "hva-er-datex/informasjon-og-nyheter/, hash (#148)" },
  { vard: "www.dmi.dk", roll: "signal",
    matar: "inget — DMI:s frie data-sida, adressen kommer ur API:ets eget rotsvar",
    brister: "inget", bevakad: "dk-dmi", signal: "frie-data, hash (#148)" },
  { vard: "bransch.trafikverket.se", roll: "signal",
    matar: "inget — nyhetsflödet för api.trafikinfo", brister: "inget", bevakad: "trv-rss",
    signal: "RSS (#31)" },
  { vard: "data.trafikverket.se", roll: "signal",
    matar: "inget — portalens nyheter och driftinformation för api.trafikinfo",
    brister: "inget", bevakad: "trv-portal-news + trv-drift", signal: "CMS-GraphQL (#31)" },

  // ── BYGG ─────────────────────────────────────────────────────────────────────────────
  { vard: "download.swift.org", roll: "bygg",
    matar: "Swift-verktygskedjan i ios-engine.yml",
    brister: "ios-engine slutar bygga", bevakad: "", signal: "OKÄND" },
];

// Värdar som är vår EGEN infrastruktur eller allmän verktygsinfrastruktur — inte beroenden
// i den mening kartan handlar om, och ska inte kräva en rad.
const EGEN = /github\.com|githubusercontent|axelstar\.github\.io|deno\.land|supabase\.co|npmjs|nodejs\.org|schemas?\.|w3\.org|json-schema|localhost|example\.com/i;

export type Granskning = { okanda: string[]; doda: string[]; obevakade: Beroende[] };

export function granska(kartan: Beroende[], vardarIKod: string[]): Granskning {
  const deklarerade = new Set(kartan.map((b) => b.vard));
  const iKod = new Set(vardarIKod.filter((h) => !EGEN.test(h)));
  return {
    okanda: [...iKod].filter((h) => !deklarerade.has(h)).sort(),
    doda: [...deklarerade].filter((h) => !iKod.has(h)).sort(),
    obevakade: kartan.filter((b) => b.roll === "produktion" && !b.bevakad),
  };
}

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

  // En ny värd i koden som ingen deklarerat ska fällas — det är hela driftvakten.
  const g2 = granska(prov, ["a.se", "b.se", "c.se", "ny-kalla.se"]);
  k("ny värd fångas", g2.okanda, ["ny-kalla.se"]);

  // En värd som tagits bort ur koden ska rapporteras, men inte fälla — den kan vara på väg in.
  const g3 = granska(prov, ["a.se", "b.se"]);
  k("borttagen värd rapporteras", g3.doda, ["c.se"]);

  // Egen infrastruktur ska aldrig kräva en rad i kartan.
  const g4 = granska(prov, ["a.se", "b.se", "c.se", "api.github.com", "deno.land", "axelstar.github.io"]);
  k("egen infrastruktur ignoreras", g4.okanda, []);

  // Kartan själv: varje produktionsrad måste säga vad som brister. En rad utan det är
  // oanvändbar för en bedömning — den kan inte svara på "vad rör det här?".
  const tomma = KARTAN.filter((b) => b.roll === "produktion" && b.brister.length < 5);
  k("varje produktionsrad säger vad som brister", tomma.map((b) => b.vard), []);
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE.\n"); process.exit(1); }
  console.log("\nSJÄLVTEST OK: kartan fångar ny värd, rapporterar borttagen, och räknar gapet\nbara i produktionsledet.");
  process.exit(0);
}

// ── SKARPT: läser repots egen kod ────────────────────────────────────────────────────────
const { execSync } = await import("node:child_process");
const { readFileSync } = await import("node:fs");
const { fileURLToPath } = await import("node:url");

const har = { encoding: "utf-8" as const, cwd: fileURLToPath(new URL(".", import.meta.url)) };
const rot = execSync("git rev-parse --show-toplevel", har).trim();
const filer = execSync("git ls-files", { ...har, cwd: rot }).split("\n").map((s) => s.trim())
  .filter((s) => s && /\.(ts|yml|yaml|kt|swift|sql|json)$/.test(s)
    && !s.includes("/.build/") && !s.includes("/vectors/") && s !== "scripts/beroendekartan.ts");

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
  verktyg: "VERKTYG — bara mätskript och rekognosering",
  signal: "SIGNALKÄLLA — bevakas för att den annonserar ändringar i ett produktionsberoende",
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
console.log(`
Källvakten kör ${kallor.size} källor. De täcker ${prod.filter((b) => b.bevakad).length} av ${prod.length} produktionsberoenden`);
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
  console.log(`\nKoden hämtar från något kartan inte känner. Lägg in raden i scripts/beroendekartan.ts`);
  console.log(`med roll, vad det matar, vad som brister och hur en ändring skulle synas. En karta`);
  console.log(`som inte är komplett kan aldrig bära en maskinell bedömning av en nyhet.`);
  process.exit(1);
}
console.log(`\nKartan är komplett mot koden: varje extern värd har en rad.`);
process.exit(0);
