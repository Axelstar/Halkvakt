// Norsk vägstationshistorik — rekognosering för KUVÖSEN (kort #232, DECISIONS #292).
//
// FRÅGAN: kuvösen behöver EN sak — stationernas mätvärden för en gången vinter.
// Trafikverkets API räcker sju dygn bakåt, och begäran om allmänna handlingar är
// obesvarad (27/9). Kortet säger att MET:s Frost-arkiv "kräver konto och är INTE
// kontrollerat" — och vi har redan ett Vegvesen-konto. Den här knappen kontrollerar det.
//
// KRITERIET, så svaret går att läsa utan tolkning. Användbart för kuvösen är:
//   1. YTTEMPERATUR per station (halkans fält — luft räcker inte),
//   2. för en PASSERAD vinter (nov–mars), inte de senaste dygnen,
//   3. i minst timupplösning,
//   4. åtkomligt med konto vi har eller kan skaffa utan kostnad.
// Faller något av de fyra är svaret nej, hur mycket data källan än har.
//
// REN LÄSNING. Skriver ingenting, laddar ingen datamängd, rör inte arkivet.
// Gissar aldrig en URL tyst: varje spår provar kandidater och rapporterar status +
// svarskropp (TRV-400-läxan). Att en kandidat faller är ett SVAR, inte ett fel —
// jobbet blir rött bara om ALLA spår är stumma.
//
// Run: VEGVESEN_USER=... VEGVESEN_PASS=... node --experimental-strip-types scripts/no-historik-rekognosering.ts

const USER = process.env.VEGVESEN_USER, PASS = process.env.VEGVESEN_PASS;
const UA = "Halkvakt-rekognosering/0.1 (+https://github.com/Axelstar/Halkvakt)";
const DATEX = "https://datex-server-get-v3-1.atlas.vegvesen.no/datexapi";

let svar = 0;                                   // hur många spår som gav något läsbart
const rad = (s: string) => console.log(s);
const kort = (s: string, n = 220) => s.replace(/\s+/g, " ").slice(0, n);

async function prova(namn: string, url: string, headers: Record<string, string> = {}) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, ...headers } });
    const txt = await r.text();
    rad(`  ${namn.padEnd(34)} HTTP ${r.status}  ${kort(txt)}`);
    if (r.ok) svar++;
    return { status: r.status, txt };
  } catch (e) {
    rad(`  ${namn.padEnd(34)} NÄTFEL: ${kort(String((e as Error).message), 140)}`);
    return { status: 0, txt: "" };
  }
}

// ── Spår A: DATEX-servern vi redan har nyckel till. Snapshot är bevisat (ingest-no
// kör den varje timme); frågan är om samma server bär något ANNAT än nuläget.
async function sparA() {
  rad(`\n=== SPÅR A: Vegvesens DATEX-server (konto finns: ${USER && PASS ? "ja" : "NEJ"}) ===`);
  if (!USER || !PASS) { rad("  A: VEGVESEN_USER/PASS saknas i miljön — hoppar spåret."); return; }
  const auth = { Authorization: "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64"), Accept: "*/*" };
  // Kontrollen först: den vi VET fungerar. Faller den är det kontot, inte historiken.
  const ctl = await prova("GetMeasuredWeatherData/snapshot", `${DATEX}/GetMeasuredWeatherData/pullsnapshotdata`, auth);
  if (ctl.status === 200) {
    const t = ctl.txt.match(/publicationTime>([^<]+)</)?.[1];
    rad(`  A: kontrollen svarar. publicationTime = ${t ?? "(hittades inte)"} — snapshot = NULÄGET.`);
  }
  for (const p of ["pulldeltadata", "pullhistoricdata", "pullhistorydata", "pullarchivedata"])
    await prova(`GetMeasuredWeatherData/${p}`, `${DATEX}/GetMeasuredWeatherData/${p}`, auth);
  await prova("datexapi (rot — katalog?)", `${DATEX}/`, auth);
  rad("  A: DATEX är en nulägesstandard. Ett 404 här är ett SVAR: historiken bor inte i det vi har nyckel till.");
}

// ── Spår B: MET:s Frost-arkiv. Två frågor, i rätt ordning: (1) har MET alls ett
// YTTEMPERATUR-element? Har de inte det kan inget konto i världen rädda kuvösen.
// (2) vad kostar kontot? Elementlistan är referensdata och brukar vara öppen.
async function sparB() {
  rad("\n=== SPÅR B: MET Frost (frost.met.no) ===");
  const el = await prova("elements/v0.jsonld", "https://frost.met.no/elements/v0.jsonld?lang=en-US");
  if (el.status === 200) {
    const namn = [...el.txt.matchAll(/"id"\s*:\s*"([^"]+)"/g)].map(m => m[1]);
    const yta = namn.filter(n => /surface_temperature|road|pavement/i.test(n));
    rad(`  B: ${namn.length} element lästa. Träffar på yta/väg: ${yta.length ? yta.slice(0, 12).join(", ") : "INGA"}`);
    rad(yta.length
      ? "  B: MET har minst ett kandidatelement — nästa fråga är om NÅGON station mäter det."
      : "  B: MET saknar yttemperatur ⇒ Frost kan inte ersätta VViS, oavsett konto. Kriteriet 1 faller.");
  }
  await prova("observations (utan nyckel)", "https://frost.met.no/observations/v0.jsonld?referencetime=2025-01-15&elements=air_temperature");
  rad("  B: 401 här betyder bara att konto krävs — läs felkroppen för HUR man får ett.");
}

// ── Spår C: Vegvesens övriga ytor. Bara existens och vad servern själv säger.
async function sparC() {
  rad("\n=== SPÅR C: Vegvesens övriga portaler ===");
  for (const [namn, url] of [
    ["api.vegvesen.no", "https://api.vegvesen.no/"],
    ["datainn.vegvesen.no", "https://datainn.vegvesen.no/"],
    ["trafikkdata (historisk trafik)", "https://www.vegvesen.no/trafikkdata/api/"],
  ] as [string, string][]) await prova(namn, url);
  rad("  C: trafikkdata bär TRAFIKMÄNGD, inte väder — men den är kort #42 steg 4b:s trafikproxy om den svarar.");
}

await sparA(); await sparB(); await sparC();

rad("\n" + "─".repeat(78));
if (svar === 0) {
  rad("ALLA SPÅR STUMMA — inget svar gick att läsa. Det är ett nätfel eller en blockerad utgång,");
  rad("inte ett besked om Norge. Kör om; faller den igen är det behållaren som hindrar, inte källan.");
  process.exit(1);
}
rad(`${svar} svar lästa. Läs mot kriteriet överst: yttemperatur · passerad vinter · timupplösning · konto vi kan få.`);
rad("Faller något av de fyra är svaret nej för kuvösen — men skriv VILKET som föll, inte bara att det blev nej.");
