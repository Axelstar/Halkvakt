// Norskt skuggarkiv (#35): Statens vegvesen DATEX II 3.1 → schema `no`.
// KONTOT BEVILJAT 4/9 (Bengt: användarnamn i GitHub Secrets VEGVESEN_USER/PASS —
// hemligheter passerar aldrig repo eller chatt). Parsern skrivs mot Vegvesens
// VERKLIGA XML i nästa varv, inte blint mot DATEX-schemat: den här körningen är
// rekognoseringen som visar sanningen (RoadNumber-läxan).
// Känt (vegvesen.no, NLOD): basic auth; väderstationer var 10:e min i
// GetMeasuredWeatherData + stationstabell i GetMeasurementWeatherSiteTable;
// trafikläge i GetSituation. Pull-snapshots, XML, If-Modified-Since stöds.
// Källa ska anges (NLOD) — User-Agent bär repo-URL, inga personuppgifter.
const USER = process.env.VEGVESEN_USER, PASS = process.env.VEGVESEN_PASS;
if (!USER || !PASS) { console.log("no: VEGVESEN_USER/PASS saknas — hoppar över (kontot väntar på Vegvesen)"); process.exit(0); }

const BASE = "https://datex-server-get-v3-1.atlas.vegvesen.no/datexapi";
const UA = "Halkvakt/0.4 (+https://github.com/Axelstar/Halkvakt)";
const auth = "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64");

async function pull(pub: string): Promise<string> {
  const r = await fetch(`${BASE}/${pub}/pullsnapshotdata`,
    { headers: { Authorization: auth, Accept: "application/xml", "User-Agent": UA } });
  if (!r.ok) {
    // Fel-loggen bär API:ets svarskropp — "TRV 400" utan kropp kostade ett diagnosvarv.
    const kropp = (await r.text().catch(() => "")).slice(0, 300);
    if (r.status === 401) throw new Error(`${pub}: HTTP 401 — hemligheterna nekas (fel par, eller kontot ännu inte aktiverat hos Vegvesen). Svar: ${kropp}`);
    if (r.status === 403) throw new Error(`${pub}: HTTP 403 — kontot saknar rätt till publikationen (eller IP-spärr). Svar: ${kropp}`);
    throw new Error(`${pub}: HTTP ${r.status}. Svar: ${kropp}`);
  }
  return r.text();
}

// Rekognosering: storlek + huvudet av varje publikation, plus en grov räkning av
// de element parsern kommer att leta efter — så nästa varv byggs på mätt struktur.
let allaOk = true;
for (const pub of ["GetMeasurementWeatherSiteTable", "GetMeasuredWeatherData", "GetSituation"]) {
  try {
    const xml = await pull(pub);
    const rakna = (t: string) => (xml.match(new RegExp(`<[^>]*${t}[^>]*>`, "g")) ?? []).length;
    console.log(`\n=== ${pub}: ${xml.length} tecken ===`);
    console.log(`element: measurementSiteRecord=${rakna("measurementSiteRecord")} siteMeasurements=${rakna("siteMeasurements")} situationRecord=${rakna("situationRecord")} roadSurfaceTemperature=${rakna("roadSurfaceTemperature")} airTemperature=${rakna("airTemperature")}`);
    console.log(xml.slice(0, 2000));
  } catch (e) {
    allaOk = false;
    console.error(`REKOGNOSERING FALLERADE: ${String((e as Error).message)}`);
  }
}
if (!allaOk) { console.error("no: minst en publikation svarade inte — se felkroppen ovan."); process.exit(1); }
console.log("\nno: rekognosering klar — parsern skrivs mot ovanstående i nästa varv (BACKLOG #35).");
console.log("OBS: inget skrivet till no.*-schemat än; arkivet börjar ticka när parsern finns.");
