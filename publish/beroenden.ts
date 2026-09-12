// Beroendekartan som REN modul (DECISIONS #147, #149): vilka källor hänger vi på, vad går
// sönder om de ändras, och vilka ord i en nyhet betyder att den rör just oss?
//
// Varför modul och inte skript: kartan måste kunna LÄSAS av två andra saker — driftvakten
// (scripts/beroendekartan.ts) och nyhetsbedömningen (publish/nyhetsbedomning.ts). Låg den
// kvar i skriptet skulle en import köra hela skarpa körningen och avsluta processen.
//
// `nyckelord` är det som gör en maskinell bedömning möjlig: orden som, om de står i en nyhet,
// betyder att posten rör just den här källan. `frammande` sitter på SIGNALkällan och listar
// vad den kanalen ofta skriver om som INTE är vårt — utan den listan kan en bedömning aldrig
// säga "rör oss inte", bara "vet inte".

export type Roll =
  | "produktion"   // matar motorn, arkivet eller en grind — går den sönder märks det i appen
  | "verktyg"      // bara mätskript och rekognosering — går den sönder står en mätning still
  | "signal"       // bevakas för att den ANNONSERAR ändringar i ett produktionsberoende
  | "omvärld"      // bevakas för att veta vad andra gör; vi hämtar inga data därifrån
  | "bygg";        // byggkedjan, inte data

export type Beroende = {
  vard: string;
  roll: Roll;
  matar: string;        // vad det ger oss, på svenska
  brister: string;      // vad som går sönder om källan ändras eller försvinner
  bevakad: string;      // källvaktens namn på källan, eller "" om obevakad
  signal: string;       // var en ändring skulle synas — OKÄND = ingen har letat ännu
  nyckelord?: string[]; // ord i en nyhet som betyder att den rör DEN HÄR källan
  frammande?: string[]; // (signalkällor) ord som betyder att posten rör något vi inte hämtar
};

// Trafikverkets objekttyper är INTE gissade: de är lästa ur ingest/sources/*.ts, publish/
// map-core.ts och skuggmotorn 12/9. scripts/beroendekartan.ts har en driftvakt som läser om
// dem ur koden och fäller om listan här slutar stämma.
export const TRV_OBJEKT = ["weathermeasurepoint", "roadcondition", "situation", "trafficsafetycamera", "camera"];

export const KARTAN: Beroende[] = [
  // ── PRODUKTION ───────────────────────────────────────────────────────────────────────
  { vard: "api.trafikinfo.trafikverket.se", roll: "produktion",
    matar: "väder, väglag, kameror, situationer — motorns huvudkälla",
    brister: "allt: snapshoten, alla fem varningsslag, hela arkivet",
    bevakad: "trv-rss + trv-portal-news + trv-drift",
    signal: "bransch-RSS och portalens nyhetssida (bevisad väg, #31)",
    nyckelord: [...TRV_OBJEKT, "väglag", "vädermätpunkt", "väderstation", "trafikinfo", "öppna data", "datacache", "schemaversion"] },
  { vard: "opendata-download-warnings.smhi.se", roll: "produktion",
    matar: "SMHI:s vädervarningar (ingest/sources/smhi.ts)",
    brister: "varningsarkivet och grind F-A:s hela underlag",
    bevakad: "smhi-uppdateringar",
    signal: "www.smhi.se/rss/uppdateringar-oppna-data-fran-smhi — RSS, 7 poster, verifierad 12/9 (#148)",
    nyckelord: ["varning", "warning", "ibww", "vädervarning", "alert", "cap"] },
  { vard: "opendata-download-radar.smhi.se", roll: "produktion",
    matar: "radarn (ingest/radar.ts)",
    brister: "radardomen och en av tre proxies i #89 (a)",
    bevakad: "smhi-uppdateringar",
    signal: "samma RSS som SMHI-varningarna (#148)",
    nyckelord: ["radar", "nederbördsradar", "composite"] },
  { vard: "opendata-download-metobs.smhi.se", roll: "produktion",
    matar: "molnmängd parameter 16 (publish/moln.ts) — hämtas vid körning, lagras inte",
    brister: "grind R-A4 och grind T-A:s molnkontroll",
    bevakad: "smhi-uppdateringar",
    signal: "samma RSS som SMHI-varningarna (#148)",
    nyckelord: ["metobs", "meteorologiska observationer", "observation", "parameter 16", "molnmängd", "latest-months"] },
  { vard: "tie.digitraffic.fi", roll: "produktion",
    matar: "finska vägstationer (ingest/fi.ts): /weather/v1/stations och /stations/data",
    brister: "gränssnapshoten mot Finland och grind R-A --land=fi",
    bevakad: "fi-digitraffic",
    signal: "www.digitraffic.fi/en/news/ — hash, 20 857 tecken, stabil. API-changes-sidan är JS-renderad och ger bara skal (#148)",
    nyckelord: ["weather", "road weather", "tiesää", "weathercam", "station", "traffic-message", "digitraffic-user", "tie.digitraffic"] },
  { vard: "datex-server-get-v3-1.atlas.vegvesen.no", roll: "produktion",
    matar: "norska vägstationer, DATEX v3.1 pullsnapshotdata (ingest/no.ts)",
    brister: "gränssnapshoten mot Norge",
    bevakad: "no-vegvesen",
    signal: "vegvesen.no …/hva-er-datex/informasjon-og-nyheter/ — hash, 1 364 tecken. Det var här v3.1 annonserades (#148)",
    nyckelord: ["datex", "målestasjon", "værstasjon", "pullsnapshot", "publikasjon", "measurement", "weather"] },
  { vard: "opendataapi.dmi.dk", roll: "produktion",
    matar: "danska stationer (ingest/dk.ts): /v2/metObs/collections, observation + station",
    brister: "dk-arkivet (medvetet utanför snapshoten — grästemp, #45)",
    bevakad: "dk-dmi",
    signal: "www.dmi.dk/frie-data — hash, 3 980 tecken. Adressen kommer ur DMI:s eget API-rotsvar; gamla opendatadocs.dmi.govcloud.dk svarar 404 på varje sökväg (#148)",
    nyckelord: ["metobs", "observation", "station", "opendataapi", "govcloud", "synop"] },
  { vard: "storage.googleapis.com", roll: "produktion",
    matar: "DMI:s utlagda filer (ingest/dk.ts)",
    brister: "samma som DMI",
    bevakad: "dk-dmi",
    signal: "täcks av DMI:s egen kanal — filerna är DMI:s, lagringen bara en hylla (#148)",
    nyckelord: ["bucket", "storage", "download"] },
  { vard: "polisen.se", roll: "produktion",
    matar: "vilthändelser (ingest/sources/polisen.ts) — varningsslag A4",
    brister: "viltvarningarna",
    bevakad: "polisen-regler + polisen-api",
    signal: "polisen.se regler-for-oppna-data (villkoren, user-agent-kravet) och api-over-polisens-handelser (fälten) — hash, båda stabila (#148)",
    nyckelord: ["händelse", "events", "user-agent", "vilt", "trafikolycka", "öppna data", "api"] },

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

  // ── SIGNALKÄLLOR ─────────────────────────────────────────────────────────────────────
  { vard: "www.smhi.se", roll: "signal",
    matar: "inget — SMHI:s EGEN uppdateringskanal för öppna data, RSS. Det är HÄR ändringar i varnings-, radar- och metobs-API:erna annonseras",
    brister: "inget", bevakad: "smhi-uppdateringar", signal: "rss/uppdateringar-oppna-data-fran-smhi (#148)",
    // Kanalen skriver mest om sådant vi INTE hämtar. Listan är läst ur feedens sju poster 12/9:
    // PMP3, Mesan, brandrisk, vattenbrist — samtliga främmande för oss.
    frammande: ["pmp", "mesan", "prognos", "analys", "brandrisk", "vattenbrist", "oceanograf", "hydrolog", "klimatdata", "grid-point", "point-forecast"] },
  { vard: "www.digitraffic.fi", roll: "signal",
    matar: "inget — Fintraffics nyhetssida för Digitraffic",
    brister: "inget", bevakad: "fi-digitraffic", signal: "en/news/, hash (#148)",
    // Digitraffic täcker tåg, båt och flyg vid sidan av väg. Bara vägdelen är vår.
    frammande: ["rail", "train", "junat", "marine", "vessel", "meri", "aviation", "lento"] },
  { vard: "www.vegvesen.no", roll: "signal",
    matar: "inget — Vegvesens DATEX-sida för information och nyheter",
    brister: "inget", bevakad: "no-vegvesen", signal: "hva-er-datex/informasjon-og-nyheter/, hash (#148)",
    frammande: ["kjøretøy", "autosys", "førerkort", "bompeng"] },
  { vard: "www.dmi.dk", roll: "signal",
    matar: "inget — DMI:s frie data-sida, adressen kommer ur API:ets eget rotsvar",
    brister: "inget", bevakad: "dk-dmi", signal: "frie-data, hash (#148)",
    frammande: ["klimadata", "lightning", "oceanograf", "radar", "forecastedr", "grønland"] },
  { vard: "opendata.smhi.se", roll: "signal",
    matar: "inget — SMHI:s DOKUMENTATIONSsajt. Bevakas, men är inte en av de tre nedladdningsvärdar vi faktiskt hämtar från",
    brister: "inget", bevakad: "smhi-opendata", signal: "sitemap.xml, 238 sidor (#31)" },
  { vard: "bransch.trafikverket.se", roll: "signal",
    matar: "inget — nyhetsflödet för api.trafikinfo", brister: "inget", bevakad: "trv-rss",
    signal: "RSS (#31)",
    // Trafikverkets dataflöde täcker järnväg och färja lika mycket som väg.
    frammande: ["baninfo", "järnväg", "tåg", "trainannouncement", "railway", "färja", "ferry"] },
  { vard: "data.trafikverket.se", roll: "signal",
    matar: "inget — portalens nyheter och driftinformation för api.trafikinfo",
    brister: "inget", bevakad: "trv-portal-news + trv-drift", signal: "CMS-GraphQL (#31)",
    frammande: ["baninfo", "järnväg", "tåg", "trainannouncement", "railway", "färja", "ferry"] },

  // ── OMVÄRLD ──────────────────────────────────────────────────────────────────────────
  { vard: "api.met.no", roll: "omvärld",
    matar: "inget i drift — bevakas som omvärld, används i radar-rekognosering",
    brister: "inget", bevakad: "met-api", signal: "hash av framsidan (#31)" },
  { vard: "www.halkvarning.se", roll: "omvärld",
    matar: "inget — konkurrent/omvärld", brister: "inget", bevakad: "halkvarning",
    signal: "hash av framsidan, siffror strippade (#31)" },
  { vard: "www.klimator.se", roll: "omvärld",
    matar: "inget — konkurrent/omvärld", brister: "inget", bevakad: "klimator",
    signal: "hash av serverskalet — JS-tung sida, vakten ser inte innehållet (#31)" },

  // ── BYGG ─────────────────────────────────────────────────────────────────────────────
  { vard: "download.swift.org", roll: "bygg",
    matar: "Swift-verktygskedjan i ios-engine.yml",
    brister: "ios-engine slutar bygga", bevakad: "", signal: "OKÄND" },
];

// Värdar som är vår EGEN infrastruktur eller allmän verktygsinfrastruktur — inte beroenden
// i den mening kartan handlar om, och ska inte kräva en rad.
export const EGEN = /github\.com|githubusercontent|axelstar\.github\.io|deno\.land|supabase\.co|npmjs|nodejs\.org|schemas?\.|w3\.org|json-schema|localhost|example\.com/i;

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

// Vilka rader täcks av en viss källvaktskälla? "polisen-regler + polisen-api" är två namn
// på samma rad, så jämförelsen görs per namn och inte på hela strängen.
export function raderForKalla(kartan: Beroende[], kallnamn: string): Beroende[] {
  return kartan.filter((b) => b.bevakad.split("+").map((s) => s.trim()).includes(kallnamn));
}
