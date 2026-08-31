// Norskt skuggarkiv (#35): Statens vegvesen DATEX II 3.1 → schema `no`.
// STATUS 31/8: SKELETT. Kontot är begärt (Axel) men inte beviljat; parsern skrivs mot
// Vegvesens riktiga XML den dag hemligheterna finns — inte blint mot DATEX-schemat.
// Vad som är känt (vegvesen.no, NLOD): basic auth; väderstationer var 10:e min i
// GetMeasuredWeatherData + stationstabell i GetMeasurementWeatherSiteTable; trafikläge
// i GetSituation. Alla pull-snapshots, XML, "If-Modified-Since" stöds. Källa ska anges.
const USER = process.env.VEGVESEN_USER, PASS = process.env.VEGVESEN_PASS;
if (!USER || !PASS) { console.log("no: VEGVESEN_USER/PASS saknas — hoppar över (kontot väntar på Vegvesen)"); process.exit(0); }

const BASE = "https://datex-server-get-v3-1.atlas.vegvesen.no/datexapi";
const auth = "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64");
async function pull(pub: string): Promise<string> {
  const r = await fetch(`${BASE}/${pub}/pullsnapshotdata`, { headers: { Authorization: auth, Accept: "application/xml" } });
  if (!r.ok) throw new Error(`${pub}: HTTP ${r.status}`);
  return r.text();
}
// Första körningen med konto: dumpa storlek + de första 2 000 tecknen av varje publikation
// till loggen, så parsern kan skrivas mot verkligheten i nästa varv.
for (const pub of ["GetMeasurementWeatherSiteTable", "GetMeasuredWeatherData", "GetSituation"]) {
  const xml = await pull(pub);
  console.log(`\n=== ${pub}: ${xml.length} tecken ===\n${xml.slice(0, 2000)}`);
}
console.log("\nno: rekognosering klar — parsern skrivs mot ovanstående (BACKLOG #35)");
