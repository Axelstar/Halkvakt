// Cellmätningen (kort #42 steg 0b, körschemat §8; granskningens §7.2): hur lokala är
// regncellerna relativt vårt stationsnät? Ur arkivets befintliga ja/nej-regnflaggor:
// för varje stationspar, över delade 30-min-buckets, hur ofta regnar det på den ena
// men inte den andra — per avståndsband. Det är regnets dekorrelationskurva ur vårt
// eget nät och sätter en första siffra på vattenplaningens missrisk mellan stationer,
// inför tröskeldokumentet (steg 2).
//
// KÄND SKEVHET (utskriven i resultatet): arkivet är händelsefiltrerat — en regnig
// station skriver alltid rad, en TORR granne bara om dess temperatur samtidigt rört
// sig ≥ 0,5 °C. Fallet "regn på A, torrt på B" är därför underobserverat och
// diskordansen UNDERSKATTAS. Parning på delade buckets mildrar; höstens täta
// mängddata (rain_sum_mm, steg 0a) skärper mätningen utan metodbyte.
//
// V2 (2/9, artefakten ur #1): stationer UTAN en enda regnrapport i fönstret utesluts —
// parsern ger rain=false även för givarelösa stationer (~11 % saknar mängdgivare), och
// en sådan intill en givarförsedd producerar falsk diskord vid varje regn (v1:s
// 0–5 km-band visade 70 % av just detta). Uteslutna räknas och skrivs ut.
//
// Run: DATABASE_URL=... node --experimental-strip-types scripts/cell-matning.ts [dagar=60]
// Självtest utan DB: scripts/cell-matning.ts --sjalvtest

const MAX_KM = 50;
const MIN_SHARED = 10;   // min delade buckets per par för att paret ska räknas
const BUCKET_S = 1800;
const BANDS: [string, number, number][] = [
  ["0–5 km", 0, 5], ["5–10 km", 5, 10], ["10–15 km", 10, 15],
  ["15–20 km", 15, 20], ["20–30 km", 20, 30], ["30–50 km", 30, 50]];

type Station = { id: string; lon: number; lat: number; rain: Map<number, boolean> };

function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371, dLa = (lat2 - lat1) * Math.PI / 180, dLo = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

type BandAgg = { pairs: number; shared: number; both: number; discord: number };

function evaluate(stations: Station[]): BandAgg[] {
  const agg: BandAgg[] = BANDS.map(() => ({ pairs: 0, shared: 0, both: 0, discord: 0 }));
  for (let i = 0; i < stations.length; i++)
    for (let j = i + 1; j < stations.length; j++) {
      const a = stations[i], b = stations[j];
      const km = haversineKm(a.lon, a.lat, b.lon, b.lat);
      if (km > MAX_KM) continue;
      const bi = BANDS.findIndex(([, lo, hi]) => km >= lo && km < hi);
      if (bi < 0) continue;
      const [small, big] = a.rain.size <= b.rain.size ? [a.rain, b.rain] : [b.rain, a.rain];
      let shared = 0, both = 0, discord = 0;
      for (const [t, r] of small) {
        const w = big.get(t);
        if (w === undefined) continue;
        shared++;
        if (r && w) both++;
        else if (r !== w) discord++;
      }
      if (shared < MIN_SHARED) continue;
      const g = agg[bi];
      g.pairs++; g.shared += shared; g.both += both; g.discord += discord;
    }
  return agg;
}

function report(agg: BandAgg[], label: string) {
  console.log(`Cellmätningen — regnets dekorrelation ur stationsnätets ja/nej-flaggor (${label})`);
  console.log(`P(diskord|regn) = andel regnhändelser där bara ENA stationen i paret regnar.`);
  console.log("band       par     delade buckets  båda regnar  diskordanta  P(diskord|regn)");
  for (let i = 0; i < BANDS.length; i++) {
    const g = agg[i], ev = g.both + g.discord;
    const p = ev ? (100 * g.discord / ev).toFixed(0) + " %" : "—";
    console.log(`${BANDS[i][0].padEnd(10)} ${String(g.pairs).padStart(5)} ${String(g.shared).padStart(15)} ${String(g.both).padStart(12)} ${String(g.discord).padStart(12)} ${p.padStart(15)}`);
  }
  const tot = agg.reduce((s, g) => s + g.both + g.discord, 0);
  console.log(`\nTotalt ${tot} regnhändelser i par. OBS skevheten: torra grannar är underobserverade`);
  console.log(`i det händelsefiltrerade arkivet, så diskordansen är en UNDERSKATTNING — den`);
  console.log(`riktiga cellrisken är minst så här stor. Skärps med rain_sum_mm i höst (steg 0a).`);
  if (tot < 200) console.log(`⚠️ Tunt underlag (< 200 händelser) — riktningsvisare, ingen dom. Växer med varje regnvecka.`);
}

// ── Självtest utan DB: stationer på en linje var 2,5:e km, regnceller = intervall med
// känd längd L som sveps deterministiskt över linjen. Teorin ger P(diskord|regn) =
// 2d/(L+d) för paravstånd d < L och 100 % för d ≥ L — mätningen måste återfinna kurvan.
if (process.argv.includes("--sjalvtest")) {
  const L = 15; // cellens längd i km
  const stations: Station[] = [];
  for (let i = 0; i <= 18; i++) // 0…45 km, längs en breddgrad (1° lon ≈ 55,5 km vid 60°N)
    stations.push({ id: `s${i}`, lon: 13 + (i * 2.5) / 55.5, lat: 60, rain: new Map() });
  let t = 0;
  for (let s = -L; s <= 45; s += 0.25, t++) // cellstart sveper hela linjen
    for (let i = 0; i < stations.length; i++) {
      const x = i * 2.5;
      stations[i].rain.set(t, x >= s && x <= s + L);
    }
  const agg = evaluate(stations);
  report(agg, "SJÄLVTEST — svepta celler, L=15 km, teori P=2d/(L+d)");
  let ok = true;
  for (let bi = 0; bi < BANDS.length; bi++) {
    const g = agg[bi], ev = g.both + g.discord;
    if (!ev) continue;
    const dMid = (Math.min(BANDS[bi][2], MAX_KM) + BANDS[bi][1]) / 2;
    const theory = dMid >= L ? 1 : (2 * dMid) / (L + dMid);
    const measured = g.discord / ev;
    if (Math.abs(measured - theory) > 0.10) { console.error(`SJÄLVTEST: band ${BANDS[bi][0]} mätt ${measured.toFixed(2)} vs teori ${theory.toFixed(2)}`); ok = false; }
  }
  const p0 = agg[0].discord / (agg[0].both + agg[0].discord);
  const p3 = agg[3].discord / (agg[3].both + agg[3].discord);
  if (!(p0 < p3)) { console.error("SJÄLVTEST: diskordansen växer inte med avståndet"); ok = false; }
  if (!ok) process.exit(1);
  console.log(`SJÄLVTEST OK: mätningen återfinner teorikurvan (±10 p.e. per band) och växer med avståndet.`);
  process.exit(0);
}

// ── Skarpt: regnflaggorna ur arkivet.
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
const DAYS = Number(process.argv[2] ?? 60);
const res = await pool.query(`
  SELECT DISTINCT ON (station_id, b) station_id,
    ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
    floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, rain
  FROM weather_observations
  WHERE sample_time > now() - $1 * interval '1 day'
  ORDER BY station_id, b, sample_time DESC`, [DAYS]);
await pool.end();
const byId = new Map<string, Station>();
for (const r of res.rows) {
  let s = byId.get(r.station_id);
  if (!s) { s = { id: r.station_id, lon: +r.lon, lat: +r.lat, rain: new Map() }; byId.set(r.station_id, s); }
  s.rain.set(Number(r.b), Boolean(r.rain));
}
const alla = byId.size;
for (const [id, st] of byId) {
  let any = false;
  for (const v of st.rain.values()) if (v) { any = true; break; }
  if (!any) byId.delete(id); // aldrig regn i fönstret = trolig givarelös (v2-rensningen)
}
console.log(`Arkivet: ${alla} stationer, ${res.rows.length} bucketade rader, ${DAYS} dygn bakåt`);
console.log(`V2-rensningen: ${alla - byId.size} stationer utan en enda regnrapport uteslutna (troligt givarelösa), ${byId.size} kvar`);
if (byId.size < 100 || res.rows.length < 1000) {
  console.error(`UNDERLAGSVAKT: ${byId.size} stationer / ${res.rows.length} rader — hämtningen eller arkivet är trasigt.`);
  process.exit(1);
}
report(evaluate([...byId.values()]), `senaste ${DAYS} dygnen`);
