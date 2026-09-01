// SMHI-provet (Bengts order 1/9, uppföljning på ankarfrågan): kan SMHI:s LUFT-stationer
// tjäna som sekundära ankare för yttempprognosen där VViS är glest? Samma leave-one-out
// och exakta bucketuteslutning som publish/grind-a.ts, men två ankarpooler jämförs:
//   BAS    = bara VViS-stationer (grind A:s läge idag)
//   +SMHI  = VViS + SMHI-luftstationer (offset yta−luft lärs klimatologiskt per par)
// Banden räknas på avstånd till närmaste ANDRA VViS-station (utan tak), så tabellen
// svarar på "hjälper SMHI där VViS är långt borta?". Rader som BARA +SMHI kan
// prognostisera (ingen VViS inom 50 km) redovisas separat — det är själva vinsten.
// Känd svaghet som provet ska mäta, inte anta: yta−luft-offseten varierar med dygnet
// (sol värmer ytan, natt kyler den under luften) — en klimatologisk medeloffset kan
// vara för trubbig. Domen är siffrorna, inte teorin.
//
// Run: DATABASE_URL=... node --experimental-strip-types scripts/smhi-prov.ts [dagar=60]
// Självtest utan nät/DB: scripts/smhi-prov.ts --sjalvtest
// SMHI öppna data (CC BY 4.0, källa anges): opendata-download-metobs.smhi.se, parameter 1
// (lufttemperatur, timvärde), period latest-months.

const K_NEIGHBOURS = 5;
const MAX_KM = 50;
const MIN_SHARED = 20;
const BUCKET_S = 1800;
const BANDS: [string, number, number][] = [
  ["0–7 km", 0, 7], ["7–15 km", 7, 15], ["15–20 km", 15, 20], [">20 km", 20, Infinity]];

type Anchor = { id: string; lon: number; lat: number; kind: "vvis" | "smhi"; series: Map<number, number> };
type Row = { measured: number; predBas: number | null; predSmhi: number | null; bandKm: number };

function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371, dLa = (lat2 - lat1) * Math.PI / 180, dLo = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Directional pair stats sum(S−A) over shared buckets, iterating the smaller series
// (same trick and same both-branches risk as grind-a — därav självtestets olika längder).
function pairStats(s: Map<number, number>, a: Map<number, number>): { sum: number; n: number } {
  const [small, big] = s.size <= a.size ? [s, a] : [a, s];
  let sum = 0, n = 0;
  for (const [t, v] of small) {
    const w = big.get(t);
    if (w !== undefined) { sum += small === s ? v - w : w - v; n++; }
  }
  return { sum, n };
}

/** Leave-one-out över VViS-stationerna; prognos ur upp till K närmaste ankare ≤ MAX_KM
 * ur given pool, invers-distansviktat, med exakt uteslutning av utvärderingsbucketen. */
function evaluate(vvis: Map<string, Anchor>, smhi: Anchor[]): Row[] {
  const vvisArr = [...vvis.values()];
  const rows: Row[] = [];
  for (const s of vvisArr) {
    const others = vvisArr.filter((a) => a.id !== s.id);
    const nearestVvisKm = others.reduce((m, a) => Math.min(m, haversineKm(s.lon, s.lat, a.lon, a.lat)), Infinity);
    const pool = (withSmhi: boolean) => [...others, ...(withSmhi ? smhi : [])]
      .map((a) => ({ a, km: haversineKm(s.lon, s.lat, a.lon, a.lat) }))
      .filter((x) => x.km <= MAX_KM)
      .sort((x, y) => x.km - y.km)
      .slice(0, K_NEIGHBOURS)
      .map((x) => ({ ...x, p: pairStats(s.series, x.a.series) }));
    const nb = { bas: pool(false), smhi: pool(true) };
    for (const [t, measured] of s.series) {
      if (measured > 5) continue; // vintertimmar, samma urval som grind A
      const predict = (anchors: { a: Anchor; km: number; p: { sum: number; n: number } }[]) => {
        let wsum = 0, psum = 0;
        for (const { a, km, p } of anchors) {
          const av = a.series.get(t);
          if (av === undefined || p.n - 1 < MIN_SHARED) continue;
          const offsetExcl = (p.sum - (measured - av)) / (p.n - 1);
          const w = 1 / Math.max(km, 1);
          wsum += w; psum += w * (av + offsetExcl);
        }
        return wsum > 0 ? psum / wsum : null;
      };
      const predBas = predict(nb.bas), predSmhi = predict(nb.smhi);
      if (predBas !== null || predSmhi !== null)
        rows.push({ measured, predBas, predSmhi, bandKm: nearestVvisKm });
    }
  }
  return rows;
}

function mae(rows: Row[], pick: (r: Row) => number | null): { n: number; mae: number } {
  const xs = rows.filter((r) => pick(r) !== null && r.measured >= -5); // beslutsbandet −5…+5
  return { n: xs.length, mae: xs.length ? xs.reduce((a, r) => a + Math.abs(pick(r)! - r.measured), 0) / xs.length : NaN };
}

function report(rows: Row[], label: string) {
  console.log(`SMHI-provet — luftstationer som sekundära ankare (${label})`);
  console.log(`MAE i beslutsbandet (−5…+5 °C), band = avstånd till närmaste andra VViS-station`);
  console.log("band       n(bas)  MAE(bas)   n(+smhi)  MAE(+smhi)   nya punkter (bara +SMHI)  MAE(nya)");
  const f = (s: { n: number; mae: number }, w: number) => s.n ? s.mae.toFixed(2).padStart(w) + " °C" : "—".padStart(w + 3);
  for (const [name, lo, hi] of [...BANDS, ["ALLA", 0, Infinity] as [string, number, number]]) {
    const b = rows.filter((r) => r.bandKm >= lo && r.bandKm < hi);
    const bas = mae(b, (r) => r.predBas), plus = mae(b, (r) => r.predSmhi);
    const nya = mae(b.filter((r) => r.predBas === null), (r) => r.predSmhi);
    console.log(`${name.padEnd(10)} ${String(bas.n).padStart(6)} ${f(bas, 6)} ${String(plus.n).padStart(9)} ${f(plus, 7)} ${String(nya.n).padStart(17)}          ${f(nya, 5)}`);
  }
  const both = rows.filter((r) => r.predBas !== null && r.predSmhi !== null);
  const basB = mae(both, (r) => r.predBas), plusB = mae(both, (r) => r.predSmhi);
  if (basB.n) console.log(`\nSamma punkter (${basB.n} st, jämförbart rakt av): bas ${basB.mae.toFixed(2)} °C → +SMHI ${plusB.mae.toFixed(2)} °C (${plusB.mae <= basB.mae + 0.005 ? "bättre eller lika" : "SÄMRE — luftankare stör där VViS finns"})`);
  console.log(`\nKälla lufttemperatur: SMHI öppna data (CC BY 4.0). Inget härifrån är en dom —`);
  console.log(`provet upprepas på vinterdata och värderas i tröskeldokumentet innan något byggs.`);
}

// ── Självtest utan nät/DB: grind-a:s sex stationer + tre SMHI-luft med känd offset −1,5,
// plus en FJÄRRAN VViS-station (~120 km bort, utom räckhåll för alla VViS-ankare) med en
// egen SMHI-station intill (offset −2,0): basen ska LÄMNA den oprognostiserad, +SMHI ska
// träffa den nära perfekt. Serielängderna skiljer sig så pairStats båda grenar körs.
if (process.argv.includes("--sjalvtest")) {
  const base = (t: number) => -2 + 3 * Math.sin(t / 10);
  const vvis = new Map<string, Anchor>();
  for (let i = 0; i < 6; i++) {
    const series = new Map<number, number>();
    for (let t = 0; t < 200 - i * 25; t++) series.set(t, base(t) + i * 0.5);
    vvis.set(`v${i}`, { id: `v${i}`, lon: 13 + i * 0.08, lat: 56, kind: "vvis", series });
  }
  const fj = new Map<number, number>();
  for (let t = 0; t < 180; t++) fj.set(t, base(t) + 1.0);
  vvis.set("fjärran", { id: "fjärran", lon: 15, lat: 56, kind: "vvis", series: fj });
  const smhi: Anchor[] = [];
  for (const i of [0, 2, 4]) {
    const series = new Map<number, number>();
    for (let t = 0; t < 150; t++) series.set(t, base(t) + i * 0.5 - 1.5);
    smhi.push({ id: `s${i}`, lon: 13 + i * 0.08, lat: 56, kind: "smhi", series });
  }
  const fjLuft = new Map<number, number>();
  for (let t = 0; t < 150; t++) fjLuft.set(t, base(t) + 1.0 - 2.0);
  smhi.push({ id: "s-fjärran", lon: 15.01, lat: 56, kind: "smhi", series: fjLuft });
  const rows = evaluate(vvis, smhi);
  report(rows, "SJÄLVTEST — känd sanning");
  const fjRows = rows.filter((r) => r.bandKm > 50);
  const fjBas = fjRows.filter((r) => r.predBas !== null).length;
  const fjSmhi = mae(fjRows, (r) => r.predSmhi);
  const allSmhi = mae(rows, (r) => r.predSmhi);
  const ok = rows.length > 400 && allSmhi.mae < 0.05 && fjBas === 0 && fjSmhi.n > 80 && fjSmhi.mae < 0.05;
  if (!ok) { console.error(`SJÄLVTEST FALLERAR: n=${rows.length}, MAE(+smhi)=${allSmhi.mae}, fjärran bas=${fjBas} (ska vara 0), fjärran +smhi n=${fjSmhi.n} MAE=${fjSmhi.mae}`); process.exit(1); }
  console.log(`SJÄLVTEST OK: ${rows.length} punkter, MAE(+SMHI) ${allSmhi.mae.toFixed(4)} °C, fjärran-stationen räddades av luftankaret (${fjSmhi.n} punkter, MAE ${fjSmhi.mae.toFixed(4)} °C)`);
  process.exit(0);
}

// ── Skarpt: VViS ur arkivet + SMHI ur öppna data.
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
const DAYS = Number(process.argv[2] ?? 60);

const res = await pool.query(`
  SELECT DISTINCT ON (station_id, b) station_id,
    ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
    floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c
  FROM weather_observations
  WHERE surface_temp_c IS NOT NULL AND sample_time > now() - $1 * interval '1 day'
  ORDER BY station_id, b, sample_time DESC`, [DAYS]);
await pool.end();
const vvis = new Map<string, Anchor>();
for (const r of res.rows) {
  let s = vvis.get(r.station_id);
  if (!s) { s = { id: r.station_id, lon: +r.lon, lat: +r.lat, kind: "vvis", series: new Map() }; vvis.set(r.station_id, s); }
  s.series.set(Number(r.b), +r.surface_temp_c);
}
console.log(`VViS: ${vvis.size} stationer, ${res.rows.length} bucketade avläsningar, ${DAYS} dygn bakåt`);
if (vvis.size < 100 || res.rows.length < 1000) {
  console.error(`UNDERLAGSVAKT: ${vvis.size} stationer / ${res.rows.length} avläsningar — hämtningen eller arkivet är trasigt.`);
  process.exit(1);
}

const SMHI = "https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/1";
const list: any = await fetch(`${SMHI}.json`, { headers: { Accept: "application/json" } }).then((r) => {
  if (!r.ok) throw new Error(`SMHI stationslista: HTTP ${r.status}`);
  return r.json();
});
const active = (list.station ?? []).filter((s: any) => s.active);
console.log(`SMHI: ${active.length} aktiva luftstationer i listan — hämtar latest-months …`);
const cutoff = (Date.now() / 1000 - DAYS * 86400);
const smhiAnchors: Anchor[] = [];
let fetched = 0, failed = 0;
const queue = [...active];
await Promise.all(Array.from({ length: 10 }, async () => {
  for (;;) {
    const st = queue.shift();
    if (!st) return;
    try {
      const r = await fetch(`${SMHI}/station/${st.key}/period/latest-months/data.json`, { headers: { Accept: "application/json" } });
      if (!r.ok) { failed++; continue; }
      const j: any = await r.json();
      const series = new Map<number, number>();
      for (const v of j.value ?? []) {
        const epoch = v.date / 1000;
        if (epoch < cutoff) continue;
        const val = Number(v.value);
        if (Number.isFinite(val)) series.set(Math.floor(epoch / BUCKET_S), val);
      }
      if (series.size >= MIN_SHARED)
        smhiAnchors.push({ id: `smhi-${st.key}`, lon: st.longitude, lat: st.latitude, kind: "smhi", series });
      fetched++;
    } catch { failed++; }
  }
}));
console.log(`SMHI: ${smhiAnchors.length} stationer med data i fönstret (${fetched} hämtade, ${failed} utan/fel)`);
if (smhiAnchors.length < 100) {
  console.error(`UNDERLAGSVAKT: bara ${smhiAnchors.length} SMHI-stationer med data — hämtningen är trasig (normalt flera hundra).`);
  process.exit(1);
}

report(evaluate(vvis, smhiAnchors), `senaste ${DAYS} dygnen`);
