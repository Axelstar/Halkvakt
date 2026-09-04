// Vegvesen DATEX II 3.1 → normaliserade väderobservationer (schema `no`, kort #35).
// Skrivet mot MÄTT struktur (ingest-no #28, 4/9 14:54, Accept */*):
//   GetMeasurementWeatherSiteTable  MeasurementSiteTablePublication — measurementSite id/version,
//                                   measurementSiteName/values/value lang="nob", mätslag per index
//   GetMeasuredWeatherData          MeasuredDataPublication — siteMeasurements med
//                                   measurementSiteReference id + physicalQuantity per index:
//                                   TemperatureInformation/airTemperature/temperature (856 träffar),
//                                   HumidityInformation/relativeHumidity/percentage,
//                                   roadSurfaceTemperature (848 träffar) ...
// Regex, inte XML-bibliotek: inga nya beroenden (gratisnivån). Namnrymdsprefix (ns6/ns9)
// ignoreras överallt — servern får byta dem utan att arkivet går ned.
// Stationens POSITION låg utanför rekognoseringens 2 000-teckenfönster. Parsern letar efter
// DATEX-standardens latitude/longitude; ingest/no.ts LARMAR och skriver inget om
// stationerna saknar koordinater — strukturen mäts, gissas inte (RoadNumber-läxan).

export interface NoStation { id: string; name: string; lat: number; lon: number }
export interface NoMeasurement {
  siteId: string;
  sampleTime: string | null;
  surfaceTempC: number | null;
  airTempC: number | null;
  dewpointC: number | null;
  humidityPct: number | null;
  precipitation: string | null; // DATEX precipitationType (rain/snow/sleet/...), null = ingen
  rain: boolean;
  snow: boolean;
}

function num(block: string, re: RegExp): number | null {
  const m = block.match(re); if (!m) return null;
  const v = Number(m[1]); return Number.isFinite(v) ? v : null;
}
function text(block: string, re: RegExp): string | null { const m = block.match(re); return m ? m[1].trim() : null; }

/** Stationstabellen. `sitesTotal` räknar alla stationer, `stations` bara de med koordinater;
 *  `sample` är första stationens råa XML (för strukturvakten i no.ts). */
export function parseSiteTable(xml: string): { stations: NoStation[]; sitesTotal: number; sample: string | null } {
  const stations: NoStation[] = []; let sitesTotal = 0; let sample: string | null = null;
  // `measurementSite\s` — inte measurementSiteTable/-Name/-Identification.
  const re = /<(?:\w+:)?measurementSite\s[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/(?:\w+:)?measurementSite>/g;
  for (const m of xml.matchAll(re)) {
    sitesTotal++;
    const [, id, body] = m;
    if (sample === null) sample = m[0].slice(0, 1500);
    const name = text(body, /<value lang="nob">([^<]*)<\/value>/) ?? text(body, /<value(?:\s[^>]*)?>([^<]*)<\/value>/) ?? id;
    const lat = num(body, /<(?:\w+:)?latitude>\s*([-\d.]+)\s*</);
    const lon = num(body, /<(?:\w+:)?longitude>\s*([-\d.]+)\s*</);
    if (lat === null || lon === null) continue;
    stations.push({ id, name, lat, lon });
  }
  return { stations, sitesTotal, sample };
}

const WINTRY = /snow|sleet|hail|freezing|ice/i;
const INGEN = /^(no|none|noPrecipitation|dry|unknown|other)$/i;

/** Mätdata. sampleTime = siteMeasurements' measurementTimeDefault, annars publicationTime. */
export function parseMeasuredData(xml: string): { items: NoMeasurement[]; publicationTime: string | null } {
  const publicationTime = text(xml, /<(?:\w+:)?publicationTime>([^<]+)</);
  const items: NoMeasurement[] = [];
  const re = /<(?:\w+:)?siteMeasurements>([\s\S]*?)<\/(?:\w+:)?siteMeasurements>/g;
  for (const m of xml.matchAll(re)) {
    const b = m[1];
    const siteId = text(b, /measurementSiteReference\b[^>]*\bid="([^"]+)"/);
    if (!siteId) continue;
    const temp = (outer: string) => num(b, new RegExp("<(?:\\w+:)?" + outer + ">\\s*<(?:\\w+:)?temperature>\\s*([-\\d.]+)"));
    const ptype = text(b, /<(?:\w+:)?precipitationType>\s*([^<\s]+)\s*</);
    const intensity = num(b, /<(?:\w+:)?millimetresPerHourIntensity>\s*([-\d.]+)/);
    const precipitation = ptype !== null && !INGEN.test(ptype) ? ptype : null;
    const snow = precipitation !== null && WINTRY.test(precipitation);
    const rain = !snow && (precipitation !== null || (intensity !== null && intensity > 0));
    items.push({
      siteId,
      sampleTime: text(b, /<(?:\w+:)?measurementTimeDefault>([^<]+)</) ?? publicationTime,
      surfaceTempC: temp("roadSurfaceTemperature"),
      airTempC: temp("airTemperature"),
      dewpointC: temp("dewPointTemperature"),
      humidityPct: num(b, /<(?:\w+:)?relativeHumidity>\s*<(?:\w+:)?percentage>\s*([-\d.]+)/),
      precipitation, rain, snow,
    });
  }
  return { items, publicationTime };
}

/** Arkivpolicyn DECISIONS #4, ordagrant som Sverige (sources/weather.ts) och Finland (fi.ts):
 *  vägyta ≤ 5 °C, nederbörd, Δ ≥ 0,5 °C mot senast sparade, eller första observationen. */
export function interesting(o: NoMeasurement, lastStoredSurfaceTemp: number | null, seenBefore: boolean): boolean {
  if (o.surfaceTempC !== null && o.surfaceTempC <= 5) return true;
  if (o.rain || o.snow || o.precipitation !== null) return true;
  if (o.surfaceTempC !== null && lastStoredSurfaceTemp !== null
      && Math.abs(o.surfaceTempC - lastStoredSurfaceTemp) >= 0.5) return true;
  return !seenBefore;
}
