// Lastkajen-rekognoseringen (kort #42 steg 1, körschemat §8 i docs/VATTENPLANING-ANALYS.md).
// TRE FRÅGOR före något löfte om spårdjup: LICENS (öppna data?), FORMAT (går det att
// klippa mot vårt 818-segmentskelett?), FÄRSKHET (mäts vart 1-3 år — gott nog?).
// Plus den fjärde som förstudien flaggade: KRÄVS KONTO, och i så fall vilket?
//
// REN LÄSNING. Skriver ingenting, laddar inte ner datamängder, rör inte arkivet.
// Gissar aldrig en URL: varje spår provar kandidater, rapporterar status + svarskropp
// (TRV-400-läxan) och säger vilken som bar frukt. Att en kandidat faller är ett SVAR,
// inte ett fel — jobbet blir rött bara om ALLA spår är stumma.
//
// Spår A: öppna API:et vi redan har nyckel till — finns vägyte-/spårdjupsdata som
//   objekttyp? RoadNumber-läxan säger att felmeddelandet är den ärligaste katalogen.
// Spår B: Lastkajens egna ytor — publik katalog, licensvillkor, kontokrav.
//
// Run: TRAFIKVERKET_API_KEY=... node --experimental-strip-types scripts/lastkajen-rekognosering.ts

const KEY = process.env.TRAFIKVERKET_API_KEY;
const API = "https://api.trafikinfo.trafikverket.se/v2/data.json";
const UA = "Halkvakt-rekognosering/0.1 (+https://github.com/Axelstar/Halkvakt)";

let svar = 0;   // hur många spår som gav något läsbart
const rad = (s: string) => console.log(s);

// ── Spår A: öppna API:et. Kandidatnamn för vägyte-/tillståndsdata; ett okänt namn
// ger ett felmeddelande som ofta räknar upp vad som FINNS — den katalogen är gratis.
async function sparA() {
  rad(`\n=== SPÅR A: Trafikverkets öppna API (nyckel finns: ${KEY ? "ja" : "NEJ"}) ===`);
  if (!KEY) { rad("A: ingen nyckel i miljön — hoppar (sätt TRAFIKVERKET_API_KEY)."); return; }
  const kandidater = ["PavementData", "RoadSurface", "RoadSurfaceData", "RutDepth",
                      "MeasurementData", "RoadGeometry", "RoadData"];
  for (const typ of kandidater) {
    const body = `<REQUEST><LOGIN authenticationkey="${KEY}"/>` +
      `<QUERY objecttype="${typ}" schemaversion="1" limit="1"/></REQUEST>`;
    try {
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "text/xml", "User-Agent": UA }, body });
      const txt = await r.text();
      const kort = txt.replace(/\s+/g, " ").slice(0, 260);
      rad(`A ${typ.padEnd(18)} HTTP ${r.status}  ${kort}`);
      if (r.ok) svar++;
    } catch (e) { rad(`A ${typ.padEnd(18)} NÄTFEL: ${String((e as Error).message).slice(0, 120)}`); }
  }
  rad("A: läs felmeddelandena — Trafikverket brukar räkna upp giltiga objekttyper där.");
}

// ── Spår B: Lastkajens ytor. Vi vet att tjänsten finns och (enligt förstudien) kräver
// konto; det som ska mätas är VAD som är läsbart utan konto: katalog, licens, format.
async function sparB() {
  rad(`\n=== SPÅR B: Lastkajen — publika ytor, licens, kontokrav ===`);
  const kandidater = [
    "https://lastkajen.trafikverket.se/",
    "https://lastkajen.trafikverket.se/api/Identity/Login",
    "https://lastkajen.trafikverket.se/api/File/GetDataPackages",
    "https://lastkajen.trafikverket.se/swagger/index.html",
    "https://lastkajen.trafikverket.se/swagger/v1/swagger.json",
    "https://www.trafikverket.se/tjanster/data-kartor-och-geodata/lastkajen/",
  ];
  for (const url of kandidater) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json, text/html;q=0.9" } });
      const txt = await r.text();
      const typ = r.headers.get("content-type") ?? "—";
      // Leta efter de ord som avgör frågan, utan att dumpa hela sidor i loggen.
      const spar = ["licens", "licence", "license", "CC0", "öppna data", "spårdjup",
                    "rutDepth", "vägyta", "PMS", "IRI", "inloggning", "logga in", "konto",
                    "swagger", "api", "shape", "geopackage", "csv", "geojson"]
        .filter(o => txt.toLowerCase().includes(o.toLowerCase()));
      rad(`B ${url}`);
      rad(`   HTTP ${r.status} ${typ} ${txt.length} tecken | nyckelord: ${spar.join(", ") || "—"}`);
      if (r.ok) { svar++; rad(`   början: ${txt.replace(/\s+/g, " ").slice(0, 200)}`); }
    } catch (e) { rad(`B ${url}\n   NÄTFEL: ${String((e as Error).message).slice(0, 140)}`); }
  }
}

await sparA();
await sparB();

rad(`\n=== SAMMANFATTNING ===`);
rad(`Läsbara svar: ${svar}. Detta är REKOGNOSERING — inget nedladdat, inget skrivet.`);
rad(`Beslutspunkten (körschemat §8 steg 1) kräver svar på: licens · format mot 818-skelettet ·`);
rad(`färskhet · kontokrav. Det som inte gick att läsa utan konto är Bengts handgrepp.`);
if (svar === 0) { console.error("REKOGNOSERINGSVAKT: inget spår svarade — nät eller båda tjänsterna nere."); process.exit(1); }
