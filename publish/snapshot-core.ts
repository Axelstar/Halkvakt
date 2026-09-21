// SNAPSHOTKÄRNAN — den enda källan till appens filer data/app/v1/{static,live,manifest}.json.
//
// Kort #74 (8/9 2026): två skrivare (publish/build-snapshot.ts i Actions och Supabase-
// funktionen publicera) skrev samma fil med olika innehåll — broarna 7 ↔ 0, SMHI-fälten
// med olika namn, olyckans severity gated i den ena och inte i den andra, och publicera
// skrev ingen manifest.json alls, så apparna förkastade varje ny live.json på checksumman.
// Nu bor frågorna och formatet HÄR, körtidsneutralt: Node (build-snapshot.ts) och Deno
// (publicera, buntad av scripts/bundle-publicera.ts) matar in en fråge-funktion och får
// samma dokument tillbaka. Ändra formatet här och ingen annanstans — engine/src/snapshot.ts
// och de två apparnas adaptrar läser exakt det här.
//
// Kort #75 (8/9 2026), GIVARVAKTEN: en väderpunkt publiceras bara om den är FÄRSK (≤ 3 h)
// och RIMLIG (ytan högst 12 ° under luften). Storvik 2135 stod på −10,7 °C i september och
// var appens enda halkpunkt. "Silence is a feature": en station vi inte litar på är tyst.
//
// Inga Node- eller Deno-importer här. Web Crypto (sha256) och CompressionStream (gzip)
// finns i båda körtiderna.

export type Q = (text: string, params?: unknown[]) => Promise<Record<string, any>[]>;

export interface Bridge { id: string; lon: number; lat: number; road: string | null }

/** RADVAKTEN (kort #234, DECISIONS #298): luft ≥ +10 °C och ytan ≥ 8 ° under luften = givarfel, inte kyla.
 *  Ö Ljungby 1106 visade yta +1…+3 °C vid luft +13 °C och regn, ~12 ° fel — precis kring #75:s gräns — och 24 broar på
 *  E4 fick frysrisk sex dygn i september. Mätt mot arkivet 21/9: varje rad med yta ≤ +3 °C och luft ≥ +8 °C var ett
 *  givarfel (773 rader, 7 stationer), ingen äkta.
 *  VARFÖR BARA VARM LUFT, och varför #75:s 12 inte sänks: varmfront med regn över frusen väg (yta −3, luft +4) ger ett
 *  ÄKTA gap på 7–10 °C — blixthalkan, det farligaste väglaget — och blankis i töväder håller ytan vid 0 °C medan luften
 *  är +8. Under +10 °C rör vakten därför ingenting, och en station den tystat talar igen så fort luften kyls av. */
export const GIVARFEL_LUFT_MIN_C = 10;
export const GIVARFEL_GAP_C = 8;
/** KARANTÄNEN (kort #234): en station med ≥ 3 brott mot #75 de senaste 7 dygnen får inte tala alls. De stationer som
 *  läcker förbi #75 är samma som andra stunder visar −46…−50 °C (urkopplad givare): de har själva bevisat att de är
 *  trasiga. Tre brott, inte ett — en enstaka studs (Vassijaure, 1 rad på 29 dygn) ska inte tysta en frisk fjällstation. */
export const KARANTAN_DYGN = 7;
export const KARANTAN_BROTT = 3;

/** Givarvakten (#75) och radvakten (#234). Gäller VARJE fråga mot weather_latest — svensk, gräns och bro. */
export const WX_SANE =
  "surface_temp_c IS NOT NULL" +
  " AND sample_time > now() - interval '3 hours'" +
  " AND (air_temp_c IS NULL OR surface_temp_c >= air_temp_c - 12)" +
  ` AND (air_temp_c IS NULL OR air_temp_c < ${GIVARFEL_LUFT_MIN_C} OR air_temp_c - surface_temp_c < ${GIVARFEL_GAP_C})`;

const BORDER_M = 40_000;
const BORDER_LANDS = ["fi", "no"] as const;

/** RADARN I SNAPSHOTEN (kort #81 steg C, TROSKLAR-VATTENPLANING §3.4, DECISIONS #153–#156).
 *
 *  Fältet `regn` bär mm/h i STATIONENS SKALA — en enda skala i hela snapshoten, oavsett källa.
 *  Radarvärdet DIVIDERAS därför med faktorn; att multiplicera halverar i stället för att dubbla,
 *  och §3.4 skrev ut riktningen just för att den annars blir omvänd en gång.
 *
 *  Faktorn och fältet är mätta ihop: 0,65 gäller `rate_mean_mmh` och ingenting annat.
 *  `rate_max_mmh` är spärrat av värdevakten (727,54 mm/h, DECISIONS #134) och används inte här. */
export const RADAR_FAKTOR = 0.65;
/** #81 regel 7: utanför sin giltighet är radarn TYST, inte "ungefär rätt". */
export const RADAR_MAX_ALDER_MIN = 70;
/** UTLÖSAREN (TROSKLAR-VATTENPLANING §3.4, DECISIONS #155/#156): radarns RÅA `rate_mean_mmh`
 *  ≥ 2,0 mm/h öppnar ett segment för `rain_segments` nedan. Jämförs mot råvärdet, så som tröskeln
 *  sattes och kontrasignerades — inte mot det omskalade. */
export const REGN_UTLOSARE_MMH = 2.0;
/** F1 (kort #187): hur långt bakåt `regn_h` letar efter arkiverad nederbörd. Bortom detta är
 *  timmarna sedan regnet inte längre ett regnstopp utan bara torrt — fältet blir null. */
export const REGN_H_FONSTER_H = 48;
/** F1 (kort #187): en lutning äldre än sitt längsta fönster säger inget om nu. */
export const LUTNING_MAX_ALDER_MIN = 60;
const BRIDGE_M = 15_000;

const num = (x: unknown) => (x === null || x === undefined ? null : Number(x));

/** Fukt = regn, snö eller en nederbördsklass som INTE betyder torrt. Trafikverket skriver
 *  "no" för uppehåll (680 av 1 297 stationer 5/9) och de nordiska källorna "Dry" — båda
 *  gamla skrivarna gjorde `Boolean(precipitation)` och märkte alltså varje torr station som
 *  våt. Motorn larmar bara på kall OCH våt, så det var en falsklarmsmaskin i väntan på
 *  vintern (#75). Okänt värde räknas som vått: hellre ett larm för mycket än en okänd klass
 *  som tystar — men "no"/"Dry" är kända och betyder torrt. */
const DRY = new Set(["no", "dry"]);
const fukt = (r: { rain?: unknown; snow?: unknown; precipitation?: unknown }) =>
  Boolean(r.rain || r.snow || (r.precipitation && !DRY.has(String(r.precipitation).toLowerCase())));

/** Absolut tidpunkt → "HH:MM" svensk väggklocka, eller null. Förformateras HÄR: motorn
 *  läser ingen klocka och alla tre portarna ska säga exakt samma sträng (#28). */
export function hhmmStockholm(ts: Date | string | null): string | null {
  if (ts == null) return null;
  const d = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
}

export function bridgesFromGeoJSON(fc: { features: any[] }): Bridge[] {
  return fc.features.map((f) => ({
    id: String(f.properties.id), lon: Number(f.geometry.coordinates[0]),
    lat: Number(f.geometry.coordinates[1]), road: f.properties.road ?? null,
  }));
}

export async function buildSnapshot(q: Q, bridgesIn: Bridge[], now: Date = new Date()) {
  const notes: string[] = [];

  // ---- static: kameror ----
  const cams = await q(`
    SELECT camera_id, road_number, bearing, ST_X(geom) AS lon, ST_Y(geom) AS lat
    FROM cameras WHERE NOT deleted`);
  const staticDoc = {
    schema: 1,
    cameras: cams.map((r) => ({
      id: String(r.camera_id), lon: Number(r.lon), lat: Number(r.lat),
      bearing: num(r.bearing), road: r.road_number ?? null,
    })),
  };

  // ---- live: väglag ----
  const segs = await q(`
    SELECT segment_id, condition_code, condition_info, road_number,
           ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.0005))::json AS g
    FROM road_conditions
    WHERE NOT deleted AND geom IS NOT NULL
      -- Operatörens eget slut (#124, 12/9): avvikelser filtrerades redan på end_time,
      -- segmenten inte. INGEN åldersgräns utöver detta — en klassning står tills den ändras,
      -- så ålder ≠ inaktualitet (Bengts dämpningsdom #103: tysta aldrig en sann varning).
      -- OPRÖVAD tills Trafikverket satt en EndTime en gång: i dag har 0 av 818 segment det.
      AND (end_time IS NULL OR end_time > now())
      AND (condition_code >= 2 OR EXISTS (
        SELECT 1 FROM unnest(condition_info) i WHERE i ~* '(^|[^a-zåäö])(is|halka|halkrisk|halkig|halt)|snö|frost'))`);

  // ---- live: radarns regn per segment (kort #81 steg C) ----
  // EN SKRIVARE: ingen annan sätter `regn`. Senaste raden per segment inom giltighetsfönstret.
  //
  // FRÅNVARO ÄR INTE TORRT, och det är hela finessen. radar_precip skrivs bara när ett segment
  // hade eko ≥ 0,1 mm/h OCH låg inom radartäckningen (ingest/radar.ts: nodata ⇒ punkten räknas
  // inte alls). En saknad rad kan alltså betyda "torrt" ELLER "utanför täckning", och tabellen
  // kan inte skilja dem åt. Därför skrivs `regn: null` — aldrig 0. Att skriva 0 vore att påstå
  // en torrhet vi inte mätt, och en sådan nolla är precis den sortens tysta osanning
  // värdevakten (#133) och septembervakten finns emot.
  //
  // OCH RADARN FÅR INTE FÄLLA HELA SNAPSHOTEN. Tabellen skapas av ingest/radar.ts vid varje
  // körning, så i drift finns den — men publicera bygger snapshoten för ALLA fem varningsslag,
  // och att döda halka, is, olyckor, vilt och kameror för att ett valfritt fält saknas vore
  // oproportionerligt. Samma avvägning som grannschemana redan har i den här funktionen.
  // MEN INTE TYST: felet noteras, för en fail-soft-gren utan spår är ett tyst ALDRIG
  // (CLAUDE.md-läxan från kameror-vaglag).
  const regnPerSegment = new Map<string, number>();
  const utlosta: string[] = [];
  try {
    const radar = await q(`
      SELECT DISTINCT ON (segment_id) segment_id, rate_mean_mmh
      FROM radar_precip
      WHERE observed_at > now() - interval '${RADAR_MAX_ALDER_MIN} minutes'
      ORDER BY segment_id, observed_at DESC`);
    for (const r of radar) {
      const raa = Number(r.rate_mean_mmh);
      if (!(Number.isFinite(raa) && raa >= 0)) continue;
      regnPerSegment.set(String(r.segment_id), Math.round((raa / RADAR_FAKTOR) * 10) / 10);
      if (raa >= REGN_UTLOSARE_MMH) utlosta.push(String(r.segment_id));
    }
  } catch (e) {
    notes.push(`radar: radar_precip ej läsbar (${String((e as Error).message).slice(0, 80)}) — regn blir null på varje segment`);
  }

  // ---- live: regnsegmenten (kort #154 → DECISIONS #187, bedömning v3 N2) ----
  // Väglagsfrågan ovan släpper bara HALKKLASSADE segment, så radarns `regn` nådde aldrig de segment
  // vattenplaningen sitter på. De läggs INTE i `segments`: motorn och båda portarna gör varje rad
  // där till en slippery_segment-varning (engine/src/snapshot.ts, SnapshotRepo.kt/.swift), så en
  // vidgad WHERE hade fått apparna att säga "halka" på varje blöt normalväg i höstregn. Egen nyckel
  // i stället — ingen port läser den, skuggan kan (LÄGG TILL, ERSÄTT ALDRIG). Samma form som
  // `segments`, samma enda `regn`-skrivare. Fail-soft av samma skäl som radarn: tom + not, aldrig tyst.
  const segIds = new Set(segs.map((r) => String(r.segment_id)));
  const nya = utlosta.filter((id) => !segIds.has(id));
  let regnSegs: Record<string, any>[] = [];
  if (nya.length) {
    try {
      regnSegs = await q(`
        SELECT segment_id, condition_code, condition_info, road_number,
               ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.0005))::json AS g
        FROM road_conditions
        WHERE NOT deleted AND geom IS NOT NULL
          AND (end_time IS NULL OR end_time > now())
          AND segment_id = ANY($1::text[])`, [nya]);
    } catch (e) {
      notes.push(`regnsegment: geometrin ej läsbar (${String((e as Error).message).slice(0, 80)}) — rain_segments blir tom`);
    }
  }

  // ---- karantänen (kort #234): svenska stationer som nyligen brutit grovt mot #75 ----
  // Fail-soft som arkivfrågorna nedan: går historiken inte att läsa publiceras stationerna som förut, och det noteras.
  const karantan = new Set<string>();
  try {
    const k = await q(`
      SELECT station_id FROM weather_observations
      WHERE sample_time > now() - interval '${KARANTAN_DYGN} days'
        AND air_temp_c IS NOT NULL AND surface_temp_c < air_temp_c - 12
      GROUP BY station_id HAVING count(*) >= ${KARANTAN_BROTT}`);
    for (const r of k) karantan.add(String(r.station_id));
    if (karantan.size) notes.push(`karantän: ${karantan.size} station(er) tysta efter brott mot #75: ${[...karantan].sort().join(", ")}`);
  } catch (e) {
    notes.push(`karantän: weather_observations ej läsbar (${String((e as Error).message).slice(0, 80)}) — ingen station i karantän`);
  }

  // ---- live: väderpunkter (svenska), med givarvakten ----
  // Karantänen gäller bara de svenska raderna: gränsstationerna nedan har egna id-rymder som kan krocka.
  const wx = (await q(`
    SELECT station_id, surface_temp_c, rain, snow, precipitation, ST_X(geom) AS lon, ST_Y(geom) AS lat
    FROM weather_latest
    WHERE ${WX_SANE} AND (surface_temp_c <= 3 OR snow)`)).filter((r) => !karantan.has(String(r.station_id)));

  // ---- #49 gränssnapshoten: grannländernas stationer inom 40 km av svenska vägar ----
  const border: Record<string, { reach: number; cold: number }> = {};
  for (const land of BORDER_LANDS) {
    try {
      const b = await q(`
        WITH se AS (SELECT ST_Collect(geom) g FROM road_conditions WHERE NOT deleted AND geom IS NOT NULL)
        SELECT f.station_id, f.surface_temp_c, f.rain, f.snow, f.precipitation,
               ST_X(f.geom) AS lon, ST_Y(f.geom) AS lat
        FROM ${land}.weather_latest f, se
        WHERE ${WX_SANE}
          AND ST_DWithin(f.geom::geography, se.g::geography, $1)`, [BORDER_M]);
      const cold = b.filter((r) => Number(r.surface_temp_c) <= 3 || r.snow);
      border[land] = { reach: b.length, cold: cold.length };
      wx.push(...cold);
    } catch (e) {
      notes.push(`gräns-wx: ${land}-schemat ej läsbart (${String((e as Error).message).slice(0, 80)}) — hoppar`);
    }
  }

  // ---- live: skattarens råa indata per station (F1, kort #187, DECISIONS #188) ----
  // Bredvid `fukt`, utan tolkning: `regn_h` = timmar sedan arkivet senast såg regn på stationen,
  // `lutning15/30/60` = ytans fall per fönster ur trendkandidaterna (positivt = faller). Motorn
  // läser inget av det ännu — F1 ligger ett varv före F4 så att skuggan kan mäta först (S1).
  // Null betyder "inget i fönstret" eller "okänt", aldrig noll. Fail-soft som radarn.
  const regnH = new Map<string, number>();
  try {
    const rh = await q(`
      SELECT station_id, EXTRACT(EPOCH FROM (now() - max(sample_time))) / 3600 AS regn_h
      FROM weather_observations
      WHERE rain_sum_mm > 0 AND sample_time > now() - interval '${REGN_H_FONSTER_H} hours'
      GROUP BY station_id`);
    for (const r of rh) regnH.set(String(r.station_id), Math.round(Number(r.regn_h) * 10) / 10);
  } catch (e) {
    notes.push(`regn_h: weather_observations ej läsbar (${String((e as Error).message).slice(0, 80)}) — regn_h blir null`);
  }
  const lutning = new Map<string, { l15: number | null; l30: number | null; l60: number | null }>();
  try {
    const tk = await q(`
      SELECT DISTINCT ON (station_id) station_id, lutning15_c, lutning30_c, lutning60_c
      FROM trend_kandidater
      WHERE observed_at > now() - interval '${LUTNING_MAX_ALDER_MIN} minutes'
      ORDER BY station_id, observed_at DESC`);
    for (const r of tk) lutning.set(String(r.station_id), { l15: num(r.lutning15_c), l30: num(r.lutning30_c), l60: num(r.lutning60_c) });
  } catch (e) {
    notes.push(`lutning: trend_kandidater ej läsbar (${String((e as Error).message).slice(0, 80)}) — lutning blir null`);
  }

  // ---- #38 broarna: OSM-broar vars närmaste kalla+våta station ligger ≤ 15 km bort ----
  // Motorn kollar regeln igen (tröskel +3 för bro); här förfiltreras så att inte
  // 3 000 broar skickas till varje telefon i juli. Samma givarvakt som ovan.
  const bridges: { id: string; lon: number; lat: number; road: string | null; yta: number | null; fukt: boolean }[] = [];
  if (bridgesIn.length) {
    const allWx = await q(`
      SELECT station_id, surface_temp_c, rain, snow, precipitation, ST_X(geom) AS lon, ST_Y(geom) AS lat
      FROM weather_latest WHERE ${WX_SANE}`);
    const cold = allWx
      .filter((r) => !karantan.has(String(r.station_id)))
      .map((r) => ({ lon: Number(r.lon), lat: Number(r.lat), yta: Number(r.surface_temp_c), fukt: fukt(r) }))
      .filter((w) => w.yta <= 3 && w.fukt);
    for (const b of bridgesIn) {
      let best: typeof cold[number] | null = null, bestD = Infinity;
      for (const w of cold) {
        const d = Math.hypot((w.lon - b.lon) * 111_320 * Math.cos(b.lat * Math.PI / 180), (w.lat - b.lat) * 111_000);
        if (d < bestD) { bestD = d; best = w; }
      }
      if (best && bestD <= BRIDGE_M) bridges.push({ id: b.id, lon: b.lon, lat: b.lat, road: b.road, yta: best.yta, fukt: true });
    }
  }

  // ---- live: avvikelser, vilt, SMHI ----
  const devs = await q(`
    SELECT deviation_id, message_type, message_type_value, road_number, severity_code, end_time,
           ST_X(COALESCE(geom, ST_Centroid(line_geom))) AS lon,
           ST_Y(COALESCE(geom, ST_Centroid(line_geom))) AS lat
    FROM deviations
    WHERE NOT deleted AND (geom IS NOT NULL OR line_geom IS NOT NULL)
      AND (end_time IS NULL OR end_time > now())`);
  const vilt = await q(`
    SELECT event_id, ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat, species, datetime
    FROM polisen_events
    WHERE geom IS NOT NULL AND datetime > now() - interval '48 hours'
    ORDER BY datetime DESC`);
  const smhi = await q(`
    SELECT area_id, event_sv, level_code, ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.01))::json AS g
    FROM smhi_warnings
    WHERE geom IS NOT NULL AND event_code ~* 'SNOW|ICE|ICING|COLD|WIND'`);

  const segRow = (r: Record<string, any>) => ({
    id: String(r.segment_id), line: r.g.coordinates as [number, number][],
    code: num(r.condition_code), info: (r.condition_info ?? []) as string[], road: r.road_number ?? null,
    // mm/h i stationens skala, eller null när radarn inte har något att säga om segmentet.
    regn: regnPerSegment.get(String(r.segment_id)) ?? null,
  });
  const liveDoc = {
    schema: 1,
    generated_at: now.toISOString(),
    segments: segs.map(segRow),
    // Regnsegmenten (#154): normalklassade segment med råradar ≥ utlösaren. Ingen port läser nyckeln.
    rain_segments: regnSegs.map(segRow),
    weather: wx.map((r) => {
      const id = String(r.station_id), l = lutning.get(id);
      return {
        id, lon: Number(r.lon), lat: Number(r.lat), yta: num(r.surface_temp_c), fukt: fukt(r),
        // F1 (#187): råa indata bredvid fukt. Motorn läser dem inte; skuggan mäter (S1).
        regn_h: regnH.get(id) ?? null,
        lutning15: l?.l15 ?? null, lutning30: l?.l30 ?? null, lutning60: l?.l60 ?? null,
      };
    }),
    deviations: devs.map((r) => ({
      id: String(r.deviation_id), lon: Number(r.lon), lat: Number(r.lat),
      typ: r.message_type ?? null, road: r.road_number ?? null,
      // Olyckslyftet (#28): graderas på Trafikverkets SeverityCode, MEN bara när Trafikverket
      // själva klassat det som olycka — texten säger ordet "olycka" högt. Annan typ ⇒ null,
      // och motorn faller tillbaka på den mildare raden. Får aldrig lättas upp.
      sev: r.message_type_value === "Accident" && r.severity_code != null ? Number(r.severity_code) : null,
      slut: r.message_type_value === "Accident" ? hhmmStockholm(r.end_time) : null,
    })),
    smhi: smhi.map((r) => ({ id: Number(r.area_id), event: r.event_sv, niva: r.level_code, geom: r.g })),
    wildlife: vilt.map((r) => ({ id: String(r.event_id), lon: Number(r.lon), lat: Number(r.lat), art: r.species ?? null })),
    bridges,
  };
  return { staticDoc, liveDoc, border, notes };
}

async function sha256Hex(s: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function gzipBytes(s: string): Promise<number> {
  const stream = new Blob([s]).stream().pipeThrough(new CompressionStream("gzip"));
  return (await new Response(stream).arrayBuffer()).byteLength;
}

/** manifest.json — apparna vägrar en fil vars sha256 inte stämmer och behåller den förra.
 *  Skrivs ALLTID ihop med static.json och live.json, aldrig separat. */
export async function manifestFor(generated_at: string, files: { static: string; live: string }) {
  const entry = async (name: "static" | "live") => ({
    path: `app/v1/${name}.json`,
    sha256: await sha256Hex(files[name]),
    bytes: new TextEncoder().encode(files[name]).byteLength,
    gz_bytes: await gzipBytes(files[name]),
  });
  return { schema: 1, generated_at, files: { static: await entry("static"), live: await entry("live") } };
}
