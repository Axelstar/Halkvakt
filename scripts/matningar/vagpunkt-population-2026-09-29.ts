// Vägpunktsgrindens population, läst före domen (kort #266, Bengts "gör det" 29/9).
//
// Frågan: varför föll rå avståndsviktning 28/9 (A2 6,9 %) när den klarade 23/9 (3,8 %)? Hypotesen är arkivregeln
// (DECISIONS #353): före 25/9 sparades bara kalla eller blöta avläsningar, så en kall station i en varm omgivning
// skattades ur de kalla grannarna ensamma. Sedan 25/9 finns de varma grannarna i arkivet, och rå viktning drar mot dem.
//
// Provet kör vägpunktsgrindens population (scripts/hojd-prov.ts: #75, radvakten, karantänen, halvtimmeshinkar, fem
// grannar inom 50 km, målen ≤ +5 °C) två gånger över SAMMA 60 dygn:
//   NY REGEL    = arkivet som det är (senaste raden per station och halvtimme)
//   GAMMAL REGEL = bara rader den gamla ingesten hade sparat: yta ≤ 5 °C, regn, snö eller nederbörd ≠ "no"
//                  (villkoret `intressant` i supabase/functions/ingest-live/index.ts)
// och delar målen i FÖRE och EFTER 2026-09-25 07:30Z (första hela dygnet med varma rader, DECISIONS #380).
// Förutsägelse om hypotesen håller: FÖRE är lika under båda reglerna; EFTER faller rå viktning bara under den nya.
// Offsetmodellen (grind A:s taket, exakt uteslutning av hinken) står bredvid som jämförelse.
//
// Ingen dom skrivs — det här är en läsning av populationen, inte en grind. Trösklarna står i TROSKLAR-SKUGGAN §3.
//
// Tillägg 29/9 (Bengt: "ja, kör det"): FRYSFLAGGAN. Grova fel är ett ersättningsmått; det föraren märker är om
// prognosen flaggar (skattning ≤ FRYS_C) där stationen själv mätte ≤ FRYS_C. Per band och period räknas
//   missad flagga = stationen ≤ 1 °C men modellen > 1 °C (det farliga felet), grovt missad = modellen > 2 °C
//   falsk flagga  = modellen ≤ 1 °C men stationen > 1 °C, som andel av modellens flaggor
// och allt vägs mot vägnätet: bandandelarna tas ur prognoslagrets egna provpunkter längs de svenska skuggrutterna
// (senaste varvet per rutt, avstånd till närmaste bidragande ankare), inte ur stationernas avstånd till varandra.
// Run: DATABASE_URL=... node --experimental-strip-types scripts/matningar/vagpunkt-population-2026-09-29.ts [dagar=60]

import { Z, andelSe, medelSe } from "../../publish/marginal.ts";
import { RADVAKT_SQL, karantanSql } from "../../publish/snapshot-core.ts";
import { FRYS_C } from "../../engine/src/segment.ts";

const K_NEIGHBOURS = 5;
const MAX_KM = 50;
const MIN_SHARED = 20;
const BUCKET_S = 1800;
const SNITT = Math.floor(Date.parse("2026-09-25T07:30:00Z") / 1000 / BUCKET_S);
const BANDS: [string, number, number][] = [
  ["0–7 km", 0, 7], ["7–15 km", 7, 15], ["15–20 km", 15, 20], [">20 km", 20, Infinity]];

type Station = { id: string; lon: number; lat: number; series: Map<number, number> };
type Rad = { measured: number; raw: number; offset: number | null; ankKm: number; station: string; efter: boolean };

function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371, dLa = (lat2 - lat1) * Math.PI / 180, dLo = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function pairStats(s: Map<number, number>, a: Map<number, number>): { sum: number; n: number } {
  const [small, big] = s.size <= a.size ? [s, a] : [a, s];
  let sum = 0, n = 0;
  for (const [t, v] of small) {
    const w = big.get(t);
    if (w !== undefined) { sum += small === s ? v - w : w - v; n++; }
  }
  return { sum, n };
}

/** Samma skattning som hojd-prov.ts evaluate() för RÅ och OFFSET, med målets hink märkt före/efter snittet. */
function evaluate(stations: Map<string, Station>): Rad[] {
  const arr = [...stations.values()];
  const rader: Rad[] = [];
  for (const s of arr) {
    const nbs = arr
      .filter((a) => a.id !== s.id)
      .map((a) => ({ a, km: haversineKm(s.lon, s.lat, a.lon, a.lat) }))
      .filter((x) => x.km <= MAX_KM)
      .sort((x, y) => x.km - y.km)
      .slice(0, K_NEIGHBOURS)
      .map((x) => ({ ...x, p: pairStats(s.series, x.a.series) }));
    for (const [t, measured] of s.series) {
      if (measured > 5) continue;
      let wR = 0, pR = 0, wO = 0, pO = 0, ank = Infinity;
      for (const { a, km, p } of nbs) {
        const av = a.series.get(t);
        if (av === undefined) continue;
        const w = 1 / Math.max(km, 1);
        wR += w; pR += w * av;
        if (p.n - 1 >= MIN_SHARED) { wO += w; pO += w * (av + (p.sum - (measured - av)) / (p.n - 1)); }
        if (km < ank) ank = km;
      }
      if (wR > 0) rader.push({ measured, raw: pR / wR, offset: wO > 0 ? pO / wO : null, ankKm: ank, station: s.id, efter: t >= SNITT });
    }
  }
  return rader;
}

/** Grind A:s tre mått, utan dom: MAE i beslutsbandet, andel |fel| > 2 °C, frysklassfel. */
function matt(rader: Rad[], pick: (r: Rad) => number | null) {
  const xs = rader.filter((r) => pick(r) !== null);
  const dec = xs.filter((r) => r.measured >= -5);
  const absDec = dec.map((r) => Math.abs(pick(r)! - r.measured));
  const mae = dec.length ? absDec.reduce((a, b) => a + b, 0) / dec.length : NaN;
  const gross = xs.length ? xs.filter((r) => Math.abs(pick(r)! - r.measured) > 2).length / xs.length : NaN;
  const freeze = xs.length ? xs.filter((r) => (r.measured < 0 && pick(r)! > 2) || (r.measured > 2 && pick(r)! < 0)).length / xs.length : NaN;
  return { n: xs.length, stationer: new Set(xs.map((r) => r.station)).size, mae, maeSe: medelSe(absDec),
    gross, grossSe: andelSe(gross, xs.length), freeze };
}

function rad(namn: string, m: ReturnType<typeof matt>): string {
  if (!m.n) return `${namn.padEnd(34)} inga punkter`;
  return `${namn.padEnd(34)} ${String(m.n).padStart(6)} p ${String(m.stationer).padStart(4)} st   A1 ${m.mae.toFixed(2)} °C [±${(Z * m.maeSe).toFixed(2)}]` +
    `   A2 ${(m.gross * 100).toFixed(1).padStart(4)} % [±${(Z * m.grossSe * 100).toFixed(1)} pe]   A3 ${(m.freeze * 100).toFixed(1)} %`;
}

function redovisa(regel: string, rader: Rad[]) {
  console.log(`\n── ${regel}`);
  for (const [fonster, urval] of [["FÖRE 25/9 07:30Z", rader.filter((r) => !r.efter)], ["EFTER 25/9 07:30Z", rader.filter((r) => r.efter)]] as [string, Rad[]][]) {
    console.log(rad(`${fonster} · RÅ`, matt(urval, (r) => r.raw)));
    console.log(rad(`${fonster} · OFFSET (taket)`, matt(urval, (r) => r.offset)));
    console.log(`  RÅ per band, A2: ` + BANDS.map(([n, lo, hi]) => {
      const m = matt(urval.filter((r) => r.ankKm >= lo && r.ankKm < hi), (r) => r.raw);
      return `${n} ${m.n ? (m.gross * 100).toFixed(1) + " % (" + m.n + " p)" : "—"}`;
    }).join(" · "));
  }
}

const bandAv = (km: number) => BANDS.findIndex(([, lo, hi]) => km >= lo && km < hi);

/** Frysflaggan per band: missade, grovt missade och falska flaggor. */
function flagga(rader: Rad[], pick: (r: Rad) => number | null) {
  const xs = rader.filter((r) => pick(r) !== null);
  const stat = xs.filter((r) => r.measured <= FRYS_C);
  const mod = xs.filter((r) => pick(r)! <= FRYS_C);
  return { nStat: stat.length, missad: stat.filter((r) => pick(r)! > FRYS_C).length, grov: stat.filter((r) => pick(r)! > FRYS_C + 1).length,
    nMod: mod.length, falsk: mod.filter((r) => r.measured > FRYS_C).length };
}
const pct = (a: number, n: number) => n ? `${(100 * a / n).toFixed(1)} % [±${(Z * andelSe(a / n, n) * 100).toFixed(1)} pe]` : "—";

function frysflaggan(regel: string, rader: Rad[], andelar: number[]) {
  console.log(`\n── FRYSFLAGGAN (≤ ${FRYS_C} °C), ${regel}, EFTER 25/9 07:30Z`);
  const efter = rader.filter((r) => r.efter);
  for (const [namn, pick] of [["RÅ", (r: Rad) => r.raw], ["OFFSET", (r: Rad) => r.offset]] as [string, (r: Rad) => number | null][]) {
    let vMiss = 0, vFalsk = 0, vGross = 0, tackt = 0;
    for (let i = 0; i < BANDS.length; i++) {
      const b = efter.filter((r) => bandAv(r.ankKm) === i);
      const f = flagga(b, pick), m = matt(b, pick);
      console.log(`  ${namn.padEnd(7)} ${BANDS[i][0].padEnd(9)} stationen flaggade ${String(f.nStat).padStart(5)}: missad ${pct(f.missad, f.nStat)}, ` +
        `grovt ${f.grov} · modellen flaggade ${String(f.nMod).padStart(5)}: falsk ${pct(f.falsk, f.nMod)} · grova fel ${m.n ? (m.gross * 100).toFixed(1) + " %" : "—"}`);
      if (f.nStat && f.nMod && m.n) { vMiss += andelar[i] * f.missad / f.nStat; vFalsk += andelar[i] * f.falsk / f.nMod; vGross += andelar[i] * m.gross; tackt += andelar[i]; }
    }
    console.log(`  ${namn.padEnd(7)} VÄGVIKTAT (${(100 * tackt).toFixed(0)} % av vägpunkterna har underlag): missade flaggor ${(100 * vMiss / (tackt || 1)).toFixed(1)} %, ` +
      `falska flaggor ${(100 * vFalsk / (tackt || 1)).toFixed(1)} %, grova fel ${(100 * vGross / (tackt || 1)).toFixed(1)} %`);
  }
}

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
const DAYS = Number(process.argv[2] ?? 60);

// Vägpunktsgrindens WHERE-sats ordagrant (hojd-prov.ts), plus i GAMMAL REGEL ingestens villkor för en sparad rad.
const INTRESSANT = `(surface_temp_c <= 5 OR rain OR snow OR (precipitation IS NOT NULL AND precipitation NOT IN ('', 'no')))`;
async function hamta(gammal: boolean): Promise<Map<string, Station>> {
  const res = await pool.query(`
    SELECT DISTINCT ON (station_id, b) station_id,
      ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
      floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c
    FROM weather_observations
    WHERE surface_temp_c IS NOT NULL AND sample_time > now() - $1 * interval '1 day'
      AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12
      AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}
      ${gammal ? `AND ${INTRESSANT}` : ""}
    ORDER BY station_id, b, sample_time DESC`, [DAYS]);
  const stations = new Map<string, Station>();
  for (const r of res.rows) {
    let s = stations.get(r.station_id);
    if (!s) { s = { id: r.station_id, lon: +r.lon, lat: +r.lat, series: new Map() }; stations.set(r.station_id, s); }
    s.series.set(Number(r.b), +r.surface_temp_c);
  }
  const hinkar = res.rows.length, efter = res.rows.filter((r: any) => Number(r.b) >= SNITT).length;
  console.log(`${gammal ? "GAMMAL REGEL" : "NY REGEL"}: ${stations.size} stationer, ${hinkar} hinkar, varav ${efter} efter snittet`);
  return stations;
}

console.log(`Vägpunktsgrindens population före och efter arkivregeln (DECISIONS #353), ${DAYS} dygn bakåt. Ingen dom.`);
const ny = await hamta(false);
const gammal = await hamta(true);
// Vägnätets avståndsfördelning: prognoslagrets provpunkter var 2 km längs de svenska skuggrutterna, senaste varvet per rutt.
const vp = await pool.query(`
  SELECT (e->>2)::float AS narm
  FROM (SELECT DISTINCT ON (route) route, prognos FROM shadow_log
        WHERE land = 'SE' AND prognos ? 'p' AND run_at > now() - interval '7 days'
        ORDER BY route, run_at DESC) s,
       jsonb_array_elements(s.prognos->'p') e`);
await pool.end();
const narm = vp.rows.map((r: any) => r.narm).filter((x: any) => x !== null) as number[];
const andelar = BANDS.map((_, i) => narm.filter((k) => bandAv(k) === i).length / (narm.length || 1));
console.log(`Vägpunkter längs skuggrutterna: ${vp.rows.length}, varav ${narm.length} med ankare inom ${MAX_KM} km. Andel per band: ` +
  BANDS.map(([n], i) => `${n} ${(100 * andelar[i]).toFixed(1)} %`).join(" · "));
redovisa("NY REGEL (arkivet som det är, varma rader sedan 25/9)", evaluate(ny));
redovisa("GAMMAL REGEL (bara kalla eller blöta rader, som före 25/9)", evaluate(gammal));
console.log(`\nLäsning: håller hypotesen är FÖRE lika i båda reglerna, och RÅ EFTER faller bara under NY REGEL.`);
frysflaggan("NY REGEL", evaluate(ny), andelar);
frysflaggan("GAMMAL REGEL", evaluate(gammal), andelar);
