// ═══ Skuggmotorn (#20, Bengts design): kör motorn mot färska snapshoten på fasta
// referensrutter var 30:e min och loggar vad den SKULLE ha sagt — varningslogg
// med indata oavsett användarantal. Vid varning: arkivera närmaste väglags-
// kamerabild (facit-hinken, dedupe per station & 3 h). Rör aldrig användare.
// Land (#34): ?land=fi kör de finska rutterna mot den finska snapshoten. Samma motor,
// samma logg (kolumnen land), samma rapport. Sverige är standard.
const CDN_BY_LAND: Record<string, string> = {
  se: "https://axelstar.github.io/halkvakt-karta/data/app/v1/",
  fi: "https://axelstar.github.io/halkvakt-karta/data/app/fi/v1/",
  no: "https://axelstar.github.io/halkvakt-karta/data/app/no/v1/",   // #35, publiceras när Vegvesen-kontot finns
  dk: "https://axelstar.github.io/halkvakt-karta/data/app/dk/v1/",   // #36
};
const SB = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TRV = Deno.env.get("TRAFIKVERKET_API_KEY")!;

// Grova men FASTA referenslinjer (jämförbarhet över tid slår metern):
// Finland (#34): tre referenslinjer, samma grovhet som de svenska. Fejkresorna.
const ROUTES_FI: Record<string, [number, number][]> = {
  // Söder: E18-stråket och kusten
  "E18 Åbo→Helsingfors":        [[22.27,60.45],[22.60,60.43],[23.13,60.40],[23.60,60.38],[24.05,60.32],[24.50,60.24],[24.94,60.17]],
  "E18 Helsingfors→Kotka":      [[24.94,60.17],[25.30,60.27],[25.66,60.39],[26.23,60.46],[26.95,60.47]],
  "E18 Kotka→Vaalimaa":         [[26.95,60.47],[27.20,60.57],[27.55,60.58],[27.85,60.58]],
  "Rv2 Helsingfors→Björneborg": [[24.94,60.17],[24.32,60.33],[23.62,60.81],[23.10,61.02],[22.70,61.18],[21.80,61.49]],
  "Rv8 Åbo→Björneborg":         [[22.27,60.45],[21.98,60.68],[21.69,60.88],[21.51,61.13],[21.80,61.49]],
  // Mitten: vt3, vt4, vt9, vt5
  "Rv3 Helsingfors→Tammerfors": [[24.94,60.17],[24.86,60.63],[24.46,61.00],[23.95,61.27],[23.76,61.50]],
  "Rv3 Tammerfors→Vasa":        [[23.76,61.50],[23.30,61.75],[23.02,62.01],[22.75,62.49],[22.01,62.98],[21.62,63.10]],
  "E75 Helsingfors→Lahtis":     [[24.94,60.17],[25.03,60.36],[25.12,60.52],[25.30,60.70],[25.50,60.85],[25.66,60.98]],
  "E75 Lahtis→Jyväskylä":       [[25.66,60.98],[26.03,61.21],[25.95,61.60],[25.85,61.95],[25.75,62.24]],
  "Rv9 Tammerfors→Jyväskylä":   [[23.76,61.50],[24.36,61.68],[25.19,61.86],[25.75,62.24]],
  "Rv9 Jyväskylä→Kuopio":       [[25.75,62.24],[26.43,62.39],[27.12,62.62],[27.68,62.89]],
  "Rv5 Lahtis→Kuopio":          [[25.66,60.98],[26.03,61.21],[26.70,61.45],[27.27,61.69],[27.87,62.31],[27.68,62.89]],
  "Rv6 Kouvola→Joensuu":        [[26.70,60.87],[27.60,61.00],[28.19,61.06],[28.77,61.17],[29.50,61.55],[29.76,62.60]],
  // Norr: vt4-stråket, kusten, fjällvägarna
  "E75 Jyväskylä→Uleåborg":     [[25.75,62.24],[25.73,62.60],[25.86,63.07],[25.57,63.37],[25.85,63.68],[25.75,63.98],[25.87,64.27],[25.47,65.01]],
  "Rv8 Björneborg→Vasa":        [[21.80,61.49],[21.51,61.86],[21.37,62.27],[21.34,62.47],[21.62,63.10]],
  "Rv8 Vasa→Uleåborg":          [[21.62,63.10],[22.20,63.35],[22.70,63.55],[23.15,63.80],[23.80,64.05],[24.45,64.40],[25.05,64.75],[25.47,65.01]],
  "Rv5 Kuopio→Kajaani":         [[27.68,62.89],[27.66,63.08],[27.19,63.56],[27.50,63.90],[27.73,64.22]],
  "E75 Uleåborg→Rovaniemi":     [[25.47,65.01],[25.37,65.32],[25.05,65.66],[24.56,65.74],[25.00,66.10],[25.73,66.50]],
  "Rv20 Uleåborg→Kuusamo":      [[25.47,65.01],[26.20,65.20],[26.99,65.36],[28.24,65.57],[29.19,65.96]],
  "E8 Torneå→Kilpisjärvi":      [[24.15,65.85],[23.97,66.78],[23.79,67.33],[23.68,67.96],[22.50,68.50],[20.79,69.05]],
};

// Norge (#35): tjugo referenslinjer. Väntar på Vegvesens DATEX-konto; rutterna är klara.
const ROUTES_NO: Record<string, [number, number][]> = {
  "E6 Oslo→Lillehammer":        [[10.75,59.91],[11.03,60.20],[11.17,60.60],[10.93,60.80],[10.69,61.11]],
  "E6 Lillehammer→Dombås":      [[10.69,61.11],[10.48,61.50],[9.70,61.87],[9.13,62.08]],
  "E6 Dombås→Trondheim":        [[9.13,62.08],[9.55,62.35],[9.96,62.58],[10.15,63.00],[10.40,63.43]],
  "E6 Trondheim→Mo i Rana":     [[10.40,63.43],[11.30,63.85],[11.99,64.33],[12.65,64.90],[13.20,65.50],[14.14,66.31]],
  "E6 Mo i Rana→Narvik":        [[14.14,66.31],[15.40,66.95],[15.35,67.25],[16.03,67.70],[16.55,68.10],[17.43,68.44]],
  "E6 Narvik→Alta":             [[17.43,68.44],[18.96,68.85],[19.85,69.30],[20.90,69.60],[22.20,69.70],[23.27,69.97]],
  "E6 Alta→Kirkenes":           [[23.27,69.97],[24.90,70.20],[26.00,70.05],[27.60,70.05],[29.00,69.90],[30.05,69.73]],
  "E18 Oslo→Kristiansand":      [[10.75,59.91],[10.40,59.60],[10.03,59.27],[9.60,59.15],[9.10,58.98],[8.60,58.70],[8.00,58.15]],
  "E39 Kristiansand→Stavanger": [[8.00,58.15],[7.45,58.15],[7.10,58.35],[6.55,58.70],[5.75,58.97]],
  "E39 Stavanger→Bergen":       [[5.75,58.97],[5.75,59.30],[5.65,59.60],[5.55,59.90],[5.35,60.25],[5.33,60.39]],
  "E39 Bergen→Ålesund":         [[5.33,60.39],[5.60,60.85],[5.80,61.20],[6.10,61.50],[6.40,61.80],[6.20,62.20],[6.15,62.47]],
  "E39 Ålesund→Trondheim":      [[6.15,62.47],[6.80,62.55],[7.50,62.90],[8.05,63.05],[9.10,63.10],[10.40,63.43]],
  "E16 Oslo→Bergen":            [[10.75,59.91],[10.30,60.10],[9.80,60.55],[9.10,60.90],[8.20,61.15],[7.40,61.05],[6.70,60.90],[5.90,60.55],[5.33,60.39]],
  "Rv7 Hønefoss→Bergen":        [[10.25,60.17],[9.60,60.50],[8.80,60.55],[8.00,60.42],[7.50,60.45],[7.00,60.50],[6.40,60.45],[5.33,60.39]],
  "E134 Drammen→Haugesund":     [[10.20,59.74],[9.60,59.60],[8.90,59.60],[8.10,59.80],[7.35,59.85],[6.60,59.75],[5.85,59.55],[5.27,59.41]],
  "Rv3 Elverum→Ulsberg":        [[11.56,60.88],[11.20,61.50],[10.80,61.90],[10.45,62.30],[10.05,62.75]],
  "E14 Trondheim→Storlien":     [[10.40,63.43],[11.10,63.32],[11.60,63.30],[12.08,63.30]],
  "E10 Narvik→Å i Lofoten":     [[17.43,68.44],[16.70,68.50],[15.90,68.60],[15.00,68.55],[14.20,68.30],[13.60,68.15],[13.00,67.95]],
  "E8 Skibotn→Kilpisjärvi":     [[20.28,69.39],[20.50,69.20],[20.60,69.10],[20.79,69.05]],
  "Rv15 Otta→Stryn":            [[9.53,61.77],[8.90,61.90],[8.20,62.00],[7.60,62.00],[6.72,61.91]],
};

// Danmark (#36): tjugo referenslinjer — motorvägsnätet + Limfjorden, Bornholm, öarna.
const ROUTES_DK: Record<string, [number, number][]> = {
  "E45 Padborg→Kolding":          [[9.36,54.82],[9.42,55.04],[9.50,55.25],[9.47,55.49]],
  "E45 Kolding→Aarhus":           [[9.47,55.49],[9.75,55.57],[9.54,55.71],[9.85,55.86],[10.05,56.00],[10.20,56.16]],
  "E45 Aarhus→Aalborg":           [[10.20,56.16],[10.04,56.46],[9.85,56.65],[9.73,56.90],[9.92,57.05]],
  "E45 Aalborg→Frederikshavn":    [[9.92,57.05],[10.10,57.20],[10.30,57.35],[10.54,57.44]],
  "E39 Aalborg→Hirtshals":        [[9.92,57.05],[9.90,57.30],[9.96,57.59]],
  "E20 Esbjerg→Kolding":          [[8.45,55.47],[8.90,55.50],[9.20,55.50],[9.47,55.49]],
  "E20 Kolding→Odense":           [[9.47,55.49],[9.75,55.57],[10.05,55.48],[10.39,55.40]],
  "E20 Odense→Storebælt→Slagelse":[[10.39,55.40],[10.79,55.31],[11.00,55.33],[11.14,55.33],[11.35,55.40]],
  "E20 Slagelse→København":       [[11.35,55.40],[11.75,55.45],[12.08,55.55],[12.45,55.63],[12.57,55.68]],
  "E47 København→Rødby":          [[12.57,55.68],[12.18,55.46],[11.98,55.25],[11.87,54.77],[11.39,54.66]],
  "E47 København→Helsingør":      [[12.57,55.68],[12.50,55.80],[12.55,55.92],[12.61,56.03]],
  "Rv21 København→Kalundborg":    [[12.57,55.68],[12.08,55.64],[11.70,55.65],[11.40,55.68],[11.09,55.68]],
  "Rv16 København→Hillerød":      [[12.57,55.68],[12.45,55.78],[12.31,55.93]],
  "Rv15 Aarhus→Grenaa":           [[10.20,56.16],[10.45,56.25],[10.70,56.35],[10.88,56.41]],
  "Rv15 Aarhus→Herning":          [[10.20,56.16],[9.85,56.15],[9.55,56.17],[8.98,56.14]],
  "Rv13 Vejle→Viborg":            [[9.54,55.71],[9.50,56.00],[9.40,56.25],[9.40,56.45]],
  "Rv26 Aarhus→Viborg→Skive":     [[10.20,56.16],[9.80,56.30],[9.40,56.45],[9.03,56.57]],
  "Rv11 Holstebro→Thisted":       [[8.62,56.36],[8.55,56.65],[8.62,56.85],[8.69,56.95]],
  "E20 Esbjerg→Ribe→Padborg":     [[8.45,55.47],[8.77,55.33],[9.10,55.10],[9.36,54.82]],
  "Rv38 Rønne→Nexø (Bornholm)":   [[14.70,55.10],[14.85,55.10],[15.00,55.08],[15.13,55.06]],
};

const ROUTES: Record<string, [number, number][]> = {
  "E22 Malmö→Kristianstad": [[13.05,55.60],[13.19,55.70],[13.35,55.76],[13.54,55.83],[13.74,55.85],[13.95,55.90],[14.05,55.95],[14.16,56.03]],
  "Väg 23 Höör→Osby":       [[13.54,55.94],[13.62,56.02],[13.70,56.09],[13.77,56.16],[13.85,56.25],[13.93,56.32],[13.98,56.38]],
  "Väg 19 Ystad→Kristianstad": [[13.82,55.43],[13.87,55.50],[13.95,55.55],[14.02,55.63],[14.10,55.72],[14.13,55.82],[14.15,55.92],[14.16,56.02]],
  "E6 Malmö→Halmstad": [[12.99,55.61],[12.83,55.87],[12.70,56.05],[12.86,56.24],[12.85,56.42],[13.04,56.51],[12.86,56.67]],
  "E6 Halmstad→Göteborg": [[12.86,56.67],[12.49,56.90],[12.25,57.11],[12.08,57.49],[11.97,57.71]],
  "E6 Göteborg→Strömstad": [[11.97,57.71],[11.98,57.87],[11.82,58.07],[11.94,58.35],[11.68,58.47],[11.32,58.72],[11.17,58.94]],
  "Rv40 Göteborg→Jönköping": [[11.97,57.71],[12.22,57.68],[12.94,57.72],[13.42,57.79],[14.16,57.78]],
  "E4 Helsingborg→Jönköping": [[12.70,56.05],[13.28,56.28],[13.60,56.46],[13.94,56.83],[14.04,57.19],[14.16,57.78]],
  "E4 Jönköping→Linköping": [[14.16,57.78],[14.47,58.02],[14.65,58.23],[15.13,58.32],[15.62,58.41]],
  "E4 Linköping→Södertälje": [[15.62,58.41],[16.19,58.59],[17.01,58.75],[17.63,59.20]],
  "E4 Södertälje→Uppsala": [[17.63,59.20],[18.07,59.33],[17.92,59.65],[17.64,59.86]],
  "E4 Uppsala→Gävle": [[17.64,59.86],[17.51,60.34],[17.14,60.67]],
  "E4 Gävle→Sundsvall": [[17.14,60.67],[17.06,61.30],[17.11,61.73],[17.31,62.39]],
  "E4 Sundsvall→Umeå": [[17.31,62.39],[17.94,62.63],[18.72,63.29],[19.50,63.57],[20.26,63.83]],
  "E4 Umeå→Luleå": [[20.26,63.83],[21.06,64.75],[21.48,65.32],[22.15,65.58]],
  "E10 Luleå→Kiruna": [[22.15,65.58],[21.69,65.83],[20.66,67.13],[20.23,67.86]],
  "E14 Sundsvall→Åre": [[17.31,62.39],[15.66,62.53],[15.42,62.75],[14.64,63.18],[13.08,63.40]],
  "E18 Karlstad→Örebro": [[13.50,59.38],[14.11,59.31],[14.52,59.33],[15.21,59.27]],
  "E18 Örebro→Stockholm": [[15.21,59.27],[15.84,59.39],[16.55,59.61],[17.07,59.64],[18.07,59.33]],
  "Rv70 Enköping→Mora": [[17.07,59.64],[16.60,59.92],[16.17,60.15],[15.98,60.28],[15.43,60.48],[15.13,60.55],[14.99,60.73],[15.12,60.89],[14.54,61.00]],
};

function traceAlong(line: [number, number][], kmh = 80, stepS = 5): Fix[] {
  const mps = (kmh * 1000) / 3600;
  const fixes: Fix[] = []; let t = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [lon1, lat1] = line[i], [lon2, lat2] = line[i + 1];
    const d = haversineM({ lon: lon1, lat: lat1 }, { lon: lon2, lat: lat2 });
    const steps = Math.max(1, Math.round(d / (mps * stepS)));
    for (let s = 0; s < steps; s++) {
      const f = s / steps;
      fixes.push({ t, lon: lon1 + (lon2 - lon1) * f, lat: lat1 + (lat2 - lat1) * f, speedKmh: kmh });
      t += stepS;
    }
  }
  return fixes;
}

async function trvCameras(): Promise<{ id: string; lon: number; lat: number; url: string }[]> {
  const q = `<REQUEST><LOGIN authenticationkey="${TRV}"/><QUERY objecttype="Camera" schemaversion="1" limit="1500"><FILTER><EQ name="Type" value="Väglagskamera"/></FILTER><INCLUDE>Id</INCLUDE><INCLUDE>PhotoUrl</INCLUDE><INCLUDE>Geometry.WGS84</INCLUDE></QUERY></REQUEST>`;
  const r = await fetch("https://api.trafikinfo.trafikverket.se/v2/data.json", {
    method: "POST", headers: { "Content-Type": "text/xml" }, body: q });
  const j = await r.json();
  const rows = j?.RESPONSE?.RESULT?.[0]?.Camera ?? [];
  return rows.flatMap((c: any) => {
    const m = /POINT \(([\d.]+) ([\d.]+)\)/.exec(c?.Geometry?.WGS84 ?? "");
    return m && c.PhotoUrl ? [{ id: String(c.Id), lon: +m[1], lat: +m[2], url: c.PhotoUrl }] : [];
  });
}

// FACITARKIVERINGEN — rättad 14/9 (kort #157, DECISIONS #172/#173, Bengts order).
//
// VAD SOM VAR FEL: bucketen `facit` innehöll NOLL objekt efter 5 657 skuggkörningar, varav 756
// med larm. Sex av sju led i kedjan mättes och höll — bucketen fanns sedan 29/8, TRV-frågan gav
// 749 kameror, bildens URL svarade 200 med en giltig jpeg. Det sjunde ledet, uppladdningen, var
// det enda som inte gick att prova utifrån, och det enda Supabase-anropet i hela repot som
// saknade `apikey`. Varje annat anrop i den här filen skickar både Authorization och apikey.
//
// TRE RÄTTELSER, för en ensam hade dolt de andra två:
//  1. `apikey` läggs till i uppladdningen.
//  2. Budgeten återställs PER ANROP. Den stod på modulnivå och minskades bara vid LYCKAD
//     sparning, så ett isolat som fått sina fem bilder tystnade för gott. Med enbart rättelse 1
//     hade det gett fem bilder och sedan tystnad — och sett ut som att felet var löst.
//  3. VARJE GREN SÄGER VARFÖR. Funktionen returnerade bara en siffra, och noll gick inte att
//     skilja från "inga larm". Nu går skälet med i svaret, och uppladdningens fel bär API:ets
//     SVARSKROPP — kameror-vaglag-läxan i CLAUDE.md, som fanns nedskriven men inte tillämpad här.
//
// VARFÖR DET HASTAR: en kamerabild är ett ögonblick. Trafikverket serverar bara den senaste, så
// det finns inget arkiv att hämta en passerad natt ur. Kamerafacit är därmed den enda källan i
// hela projektet som INTE går att räkna om i efterhand — och den bärande facitkällan för T-B
// (#88), tystnadsfelet (#98) och mars-domen (DECISIONS #94).
//
// RÄTTELSE 4 (15/9, bedömning v3 N1, DECISIONS #189): DEN ÅTTONDE LÄNKEN. Form A (#179) gav
// skuggloggens rader en position — men den här funktionen fick fortfarande motorns Alert, som inte
// bär någon (engine/src/types.ts), och räknade haversine på NaN precis som förut. Facitradien 15/9
// mätte 174 positionerade larm, ALLA inom 13,4 km från en kamera, och bucketen stod ändå på noll.
// Nu tar funktionen PUNKTER, uppslagna ur faran på samma sätt som loggen: punktfaror bär lon/lat,
// segment får ingen punkt (form A:s regel — en centroid kan ligga milsvitt från larmet).
const FACIT_PER_KORNING = 5;
let facitBudget = FACIT_PER_KORNING;

async function archiveFacit(punkter: { lon: number; lat: number }[], route: string): Promise<{ saved: number; skal: string[] }> {
  const skal: string[] = [];
  if (facitBudget <= 0) return { saved: 0, skal: ["budget slut"] };
  if (!punkter.length) return { saved: 0, skal: [] };
  const cams = await trvCameras();
  if (!cams.length) return { saved: 0, skal: ["TRV gav noll väglagskameror"] };
  const bucket3h = Math.floor(Date.now() / 10_800_000);
  const day = new Date().toISOString().slice(0, 10);
  let saved = 0;
  const seen = new Set<string>();
  for (const a of punkter) {
    let best = null as null | typeof cams[0]; let bd = 15_000;
    for (const c of cams) {
      const d = haversineM({ lon: a.lon, lat: a.lat }, { lon: c.lon, lat: c.lat });
      if (d < bd) { bd = d; best = c; }
    }
    if (!best) { skal.push("ingen kamera inom 15 km"); continue; }
    if (seen.has(best.id)) continue;
    seen.add(best.id);
    const path = `${day}/${best.id}-${bucket3h}.jpg`;
    const bild = await fetch(best.url).catch(() => null);
    if (!bild?.ok) { skal.push(`bildhämtning ${bild ? bild.status : "kastade"}`); continue; }
    const img = await bild.arrayBuffer();
    const up = await fetch(`${SB}/storage/v1/object/facit/${path}`, {
      method: "POST",
      // apikey SAKNADES här, och bara här. Det var kort #157:s troliga rotorsak.
      headers: { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "image/jpeg" },
      body: img });
    if (up.ok) { saved++; continue; }
    if (up.status === 409) { skal.push("409 fanns redan"); continue; }   // dedupe — helt ok
    skal.push(`uppladdning ${up.status}: ${(await up.text().catch(() => "")).slice(0, 120)}`);
  }
  return { saved, skal };
}

// STEG E — VATTENPLANINGENS SKUGGA (kort #154/#81, grind V-B, DECISIONS #191, Bengts ja 15/9).
// `rain_segments` (#187) når ingen port; här får de tala för mätningens skull. Samma motor, EGEN
// instans: korridor, försprång, 45 s och 10 min/5 km är motorns egna regler, inte en andra
// implementation av dem. `code: 2` i den syntetiska faran betyder BARA "får tala" i den här
// mätningen — evaluateSegment tiger på kod 1 — och den riktiga koden går med i loggraden.
// Bara segment i ruttens ruta (+0,05° ≈ 5 km, mer än leadMaxM 3 km): CPU-taket (läxa 29/8).
// Positionen är BILENS när rösten skulle talat (geo "bil") — det är där facitbilden ska tas.
// Rör aldrig `alerts`: den listan är motorns ord. Loggas i egen kolumn `vb` (sql/019).
type RainSeg = { id: string; line: [number, number][]; code: number | null; road: string | null; regn: number | null };
function vbAlerts(lv: any, route: [number, number][], trace: Fix[]) {
  const segs: RainSeg[] = Array.isArray(lv?.rain_segments) ? lv.rain_segments : [];
  const M = 0.05;
  const lons = route.map((p) => p[0]), lats = route.map((p) => p[1]);
  const x0 = Math.min(...lons) - M, x1 = Math.max(...lons) + M, y0 = Math.min(...lats) - M, y1 = Math.max(...lats) + M;
  const nara = segs.filter((s) => Array.isArray(s.line) && s.line.some(([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1));
  if (!nara.length) return [];
  const byId = new Map(nara.map((s) => [`vb:${s.id}`, s]));
  const syntetiska: Hazard[] = nara.map((s) => ({ id: `vb:${s.id}`, kind: "slippery_segment", line: s.line, meta: { code: 2, info: [] } }));
  const byT = new Map(trace.map((f) => [f.t, f]));
  return new AlertEngine(syntetiska).run(trace).map((a) => {
    const s = byId.get(a.hazardId)!, f = byT.get(a.t);
    return { t: a.t, id: s.id, regn: s.regn, code: s.code, road: s.road, distanceM: a.distanceM,
             geo: "bil", lon: f?.lon ?? null, lat: f?.lat ?? null };
  });
}

/** S1: väderpunkter i ruttens ruta (+5 km, samma ruta som vbAlerts) med N4:s råa fält och motorns utfall. */
function efterhalkaRader(lv: any, route: [number, number][], alerts: Alert[]) {
  const wx: any[] = Array.isArray(lv?.weather) ? lv.weather : [];
  if (!wx.length) return [];
  const M = 0.05;
  const lons = route.map((p) => p[0]), lats = route.map((p) => p[1]);
  const x0 = Math.min(...lons) - M, x1 = Math.max(...lons) + M, y0 = Math.min(...lats) - M, y1 = Math.max(...lats) + M;
  const larmade = new Set(alerts.map((a) => a.hazardId));
  return wx.filter((w) => w.lon >= x0 && w.lon <= x1 && w.lat >= y0 && w.lat <= y1).map((w) => ({
    id: String(w.id), yta: w.yta ?? null, fukt: w.fukt ?? null,
    regn_h: w.regn_h ?? null, lutning15: w.lutning15 ?? null, lutning30: w.lutning30 ?? null, lutning60: w.lutning60 ?? null,
    larm: larmade.has(`wx:${w.id}`),
  }));
}

/** SEGMENTPROGNOSENS ANKARE (sql/032 vagpunkt_ankare, DECISIONS #324/#325): vaktade, färska svenska stationer med
 *  yttemperatur — samma population som det appen hör och som grind A dömdes på. Fail-soft med skäl: en tom prognos
 *  utan orsak är omöjlig att skilja från "inga ankare", samma läxa som facit-hinken (#173). */
async function vagpunktAnkare(): Promise<{ lista: Ankare[]; skal: string | null }> {
  try {
    const r = await fetch(`${SB}/rest/v1/rpc/vagpunkt_ankare`, { method: "POST",
      headers: { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "application/json" }, body: "{}" });
    if (!r.ok) return { lista: [], skal: `vagpunkt_ankare ${r.status}: ${(await r.text().catch(() => "")).slice(0, 120)}` };
    const rows: any[] = await r.json();
    const lista = rows.flatMap((x) => (typeof x.lon === "number" && typeof x.lat === "number" && x.yta != null
      ? [{ id: String(x.id), lon: x.lon, lat: x.lat, yta: Number(x.yta) }] : []));
    return { lista, skal: lista.length ? null : "vagpunkt_ankare gav noll ankare" };
  } catch (e) { return { lista: [], skal: `vagpunkt_ankare kastade: ${String(e).slice(0, 120)}` }; }
}

Deno.serve(async (req) => {
  const k = Deno.env.get("INGEST_KEY");
  if (!k || req.headers.get("x-halkvakt-key") !== k) return new Response("forbidden", { status: 403 });
  try {
    // SPÄRRPROVET (kort #191 → bevis för #188, DECISIONS #197, Bengts ja 16/9). Två kameror på ett rakt spår
    // österut i 80 km/h: den första talar vid t=5 s, den andra når sin utlösning fem sekunder senare och
    // tystas av regel 1b (samma prioritet inom spärren) — kroken ska då ge EN rad. Septembers farubild ger
    // aldrig två larm så tätt, så beviset kan inte inväntas; det framkallas.
    // FÖRSTA PROVET 02:38Z 16/9 FÖLL: kamerorna stod 300 m isär (~14 s) och BÅDA talade — spärren är 10 s
    // sedan #127 (13/9), inte 45 s som CLAUDE.md:s invariant fortfarande säger. Kamerornas verkliga
    // minimidistans (520 m) ligger utanför spärren med flit; provet sätter dem 100 m isär just för att hamna
    // innanför de 10 sekunderna. Skriver INGET i shadow_log — en provrad hade förorenat tystnadsfelet och
    // upprepningen — svaret läses av dbknapp ur net._http_response.
    if (new URL(req.url).searchParams.get("sparrprov") === "1") {
      const prov: Hazard[] = [
        { id: "prov:kam1", kind: "camera", lon: 15.0105, lat: 59.0, bearing: null },   // ~600 m från start: talar t=5
        { id: "prov:kam2", kind: "camera", lon: 15.0122, lat: 59.0, bearing: null },   // ~700 m: kandidat t=10, 5 s < 10 ⇒ tystas
      ];
      const motor = new AlertEngine(prov);
      const suppressed: unknown[] = [];
      motor.onSuppressed = (c) => suppressed.push({ kind: c.kind, id: c.hazardId, distM: Math.round(c.distM), by: c.by, sinceS: c.sinceS });
      const alerts = motor.run(traceAlong([[15.0, 59.0], [15.03, 59.0]]));
      return new Response(JSON.stringify({ ok: true, prov: "sparr", alerts: alerts.map((a) => ({ t: a.t, id: a.hazardId, distanceM: a.distanceM })), suppressed }),
        { headers: { "Content-Type": "application/json" } });
    }
    const land = (new URL(req.url).searchParams.get("land") ?? "se").toLowerCase();
    const CDN = CDN_BY_LAND[land]; if (!CDN) return new Response("okänt land", { status: 400 });
    const routes = land === "fi" ? ROUTES_FI : land === "no" ? ROUTES_NO : land === "dk" ? ROUTES_DK : ROUTES;
    const bust = `?t=${Date.now()}`;
    const [st, lv] = await Promise.all([
      fetch(CDN + "static.json" + bust).then((r) => r.json()),
      fetch(CDN + "live.json" + bust).then((r) => r.json()),
    ]);
    const hazards = snapshotToHazards(st, lv);
    // Ankarna hämtas en gång per anrop, inte per rutt. Bara Sverige: funktionen läser det svenska arkivet.
    const ankare = land === "se" ? await vagpunktAnkare() : { lista: [] as Ankare[], skal: "bara Sverige" };
    const results: Record<string, unknown> = {};
    let facitTotal = 0;
    const facitSkal: string[] = [];
    facitBudget = FACIT_PER_KORNING;   // per ANROP, inte per isolat — se rättelse 2 ovan
    // Rotation: 3 rutter per varv (CPU-taket, läxa 29/8) — alla 20 täcks varje 3,5 h,
    // i båda länderna.
    const allNames = Object.keys(routes).sort();
    const slots = 7;
    const slot = Math.floor(Date.now() / 1800e3) % slots;
    const batch = allNames.filter((_, i) => i % slots === slot);
    for (const name of batch) {
      const line = routes[name];
      {
      const trace = traceAlong(line);
      // SPÄRREN SYNLIG (#127 a, kort #188, DECISIONS #193, Bengts ja 15/9). Kroken fanns i motorn och
      // kolumnen i sql/016 sedan 13/9 — men ingen lyssnade, så kolumnen stod tom. Nu: det regel 1b
      // kastar loggas per körning, med vad som tystade det och med vilken marginal.
      const motor = new AlertEngine(hazards);
      const suppressed: { kind: string; id: string; distM: number; by: string; sinceS: number }[] = [];
      motor.onSuppressed = (c) => suppressed.push({ kind: c.kind, id: c.hazardId, distM: Math.round(c.distM), by: c.by, sinceS: c.sinceS });
      const alerts = motor.run(trace);
      const vb = land === "se" ? vbAlerts(lv, line, trace) : [];
      // S1 — EFTERHALKANS INDATA (bedömning v3 S1, DECISIONS #198, Bengts "bygg S1 nu" 16/9). N4:s råa fält
      // per station i korridoren + om motorn larmade på stationen. Inget villkor: S2 sätter det, och raden
      // ska kunna spelas upp mot vilket villkor som helst. Axels grind (#196): regn_h döms här innan något
      // mer byggs på det. Tom i september (weather[] saknar stationer ≤ 3 °C) — det är rätt, inte fel.
      const efterhalka = land === "se" ? efterhalkaRader(lv, line, alerts) : [];
      // SEGMENTPROGNOSEN (kort #38b steg 4, DECISIONS #324/#325, Bengts "bygg nu" 23/9): rå avståndsviktning av de
      // vaktade stationerna per provpunkt längs rutten (engine/src/segment.ts). Loggad, aldrig hörd — grind B och C
      // dömer i mars. Tom utan ankare, och skälet står i svaret (ankareSkal), så en tom kolumn aldrig är tvetydig.
      const prognos = ankare.lista.length ? segmentPrognos(line, ankare.lista) : {};
      // Facit-bilder finns bara i Sverige (Trafikverkets väglagskameror). Punkterna slås upp ur
      // faran, inte ur larmet — motorns Alert bär ingen position (rättelse 4 ovan, DECISIONS #189).
      const farorById = new Map(hazards.map((h) => [h.id, h]));
      const punkter = alerts.flatMap((a) => {
        const h = farorById.get(a.hazardId) as any;
        return h && h.kind !== "slippery_segment" && typeof h.lon === "number" ? [{ lon: h.lon as number, lat: h.lat as number }] : [];
      });
      // Steg E: också bilens position vid en vattenplaningsvarning — en torr vägbana i bild fäller
      // falsklarm enligt TROSKLAR-VATTENPLANING §2. Motorns punkter först; budgeten är gemensam.
      const vbPunkter = vb.flatMap((v) => (v.lon != null && v.lat != null ? [{ lon: v.lon, lat: v.lat }] : []));
      const f = land === "se" ? await archiveFacit([...punkter, ...vbPunkter], name) : { saved: 0, skal: [] };
      // En nolla utan skäl är omöjlig att skilja från "inga larm" (#173) — även den här grenen säger varför.
      if (land === "se" && alerts.length && !punkter.length) f.skal.push("bara segmentlarm — ingen punkt att söka kamera från");
      facitBudget -= f.saved; facitTotal += f.saved; facitSkal.push(...f.skal);
      results[name] = { fixes: trace.length, alerts: alerts.length, vb: vb.length, suppressed: suppressed.length, efterhalka: efterhalka.length,
        prognos: (prognos as Prognos).p?.length ?? 0 };
      // LARMETS POSITION (kort #158, DECISIONS #177/#179, Axels ja via Bengt 14/9).
      //
      // FÖRUT SKREVS `lon: a.lon` — OCH DET FÄLTET FINNS INTE. Motorns Alert bär `t`, `hazardId`,
      // `kind`, `distanceM` och `text`, ingen koordinat. Edge-funktioner deployas utan typkontroll,
      // så det blev `undefined` och JSON.stringify tappade nyckeln TYST. Mätt 14/9: 2 103 larm på
      // fjorton dygn, NOLL med lon. Följden var att archiveFacit räknade haversine på NaN, aldrig
      // hittade en kamera och rapporterade "ingen kamera inom 15 km" — kamerafacit har därför
      // aldrig kunnat fyllas, och en kamerabild går inte att hämta i efterhand.
      //
      // POSITIONEN TAS UR FARAN, inte ur motorn. Punktfaror bär lon/lat själva; att slå upp dem på
      // hazardId kräver ingen motorlogik i den här filen (CLAUDE.md: klistra aldrig motorkod i en
      // edge function). `distanceM` skrivs också — Alert har alltid burit det, skuggmotorn kastade
      // bara bort det.
      //
      // SEGMENT FÅR INGEN KOORDINAT, OCH DET SÄGS RAKT UT. En slippery_segment är en polyline; dess
      // centroid kan ligga milsvitt från larmpunkten (Jämtlands segment är 59 km). Att skriva en
      // ungefärlig punkt vore att göra om samma fel en gång till, fast tystare. Fältet `geo` säger
      // därför VARFÖR en koordinat saknas: "punkt" = den finns, "segment" = den finns inte och ska
      // inte finnas, "okänd" = faran hittades inte alls, vilket i sig är ett larm värt att se.
      // Exakt punkt för segment kräver att motorns Alert bär den — det är form B och rör vektorerna.
      const body = JSON.stringify({
        route: name, land: land.toUpperCase(), snapshot_generated_at: lv.generated_at,
        n_hazards: hazards.length, n_alerts: alerts.length, vb, suppressed, efterhalka, prognos,
        alerts: alerts.map((a) => {
          const h = farorById.get(a.hazardId) as any;
          const punkt = h && h.kind !== "slippery_segment" && typeof h.lon === "number";
          return {
            t: a.t, kind: a.kind, id: a.hazardId, text: a.text, distanceM: a.distanceM,
            geo: !h ? "okänd" : punkt ? "punkt" : "segment",
            ...(punkt ? { lon: h.lon, lat: h.lat } : {}),
          };
        }),
      });
      await fetch(`${SB}/rest/v1/shadow_log`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "application/json" },
        body });
      }
    }
    // Skälen går med i svaret. En nolla utan skäl är omöjlig att skilja från "inga larm",
    // och det var precis det som lät bucketen stå tom i sexton dygn utan att någon såg det.
    return new Response(JSON.stringify({ ok: true, results, ankare: ankare.lista.length, ankareSkal: ankare.skal, facit: facitTotal,
      facitSkal: [...new Set(facitSkal)].slice(0, 8) }), {
      headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
