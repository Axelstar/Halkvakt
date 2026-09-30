// VÄGPUNKTSGRINDENS PREMISSER PRÖVADE — mätning på arkivet, registrerad i förväg (DECISIONS #405; Bengt 30/9:
// "gör en ny mätning baserad på din rekommendation").
//
// INGEN DOM. Trösklarna i TROSKLAR-SKUGGAN §3 rörs inte, och vägpunktsgrindens dom (FALLEN 28/9, bekräftad 30/9) står.
// Det här läser vad domen vilar på, i sex delar som alla är namngivna i DECISIONS #405 innan körningen:
//   1. POPULATION — bara mål efter 2026-09-25 07:30Z (första hela dygnet med varma grannrader, DECISIONS #353/#380).
//      Hela fönstret läses för parhistoriken (offsetens taket), men inget mål före snittet räknas.
//   2. VÄGVIKTNING — bandandelarna ur prognoslagrets provpunkter längs de svenska skuggrutterna (som
//      vagpunkt-population.ts), redovisat bredvid oviktat ALLA och per band.
//   3. FELMARGIN — blockbootstrap per station × UTC-dygn (B = 300, percentilerna 2,5 och 97,5). Punkterna är samma
//      stationer i intilliggande halvtimmar, så binomialfelet i grinden är en undre gräns.
//   4. FRYSFLAGGAN SOM MÅTT — missad (stationen ≤ 1 °C, modellen > 1), grovt missad (modellen > 2), falsk (modellen ≤ 1,
//      stationen > 1) och klart falsk (stationen > 2), bredvid A3 som det står i dokumentet (2 °C tvärs över gränsen).
//   5. NY KANDIDAT ANOM — luften interpoleras ur upp till K_LUFT grannar inom MAX_LUFT_KM (vikt 1/km); anomalin yta − luft ur
//      de K_ANOM närmaste inom MAX_KM (vikt 1/km²); skattning = luft + anomali. Kandidater: RÅ, RÅ+HÖJD, ANOM. OFFSET
//      (grind A:s lärda paroffset, målets egen historik) står bredvid som taket, inte som kandidat.
//   6. GOLVET — stationspar inom 3 km och inom 5 km: andel delade kalla hinkar (någon ≤ 5 °C) där |Δyta| > 2 °C.
//      Det golvet kan ingen interpolation slå.
// Utfallet mot A1 och A2 skrivs som LÄSNING (KLARAR / OAVGJORT / FALLER mot bootstrapintervallet), inte som dom. Fler
// kandidater ger fler chanser att klara av slump — därför står listan i DECISIONS innan talen finns.
//
// Run: DATABASE_URL=... node --experimental-strip-types scripts/matningar/vagpunkt-premisser-2026-09-30.ts [dagar=60]
// Självtest utan nät/DB: --sjalvtest

import { RADVAKT_SQL, karantanSql } from "../../publish/snapshot-core.ts";
import { vaktdiagnos, led234, saknadeDygn, skrivSaknade } from "../../publish/vaktdiagnos.ts";
import { FRYS_C } from "../../engine/src/segment.ts";

const K_NEIGHBOURS = 5;
const MAX_KM = 50;
const MIN_SHARED = 20;
const BUCKET_S = 1800;
const LAPSE = 0.0065;
const K_LUFT = 8, MAX_LUFT_KM = 80, K_ANOM = 3;
const SNITT = Math.floor(Date.parse("2026-09-25T07:30:00Z") / 1000 / BUCKET_S);
// Grind A:s trösklar och domspärr — kopior av publish/grind-a.ts, vaktade av scripts/kontraktsgrinden.ts.
const A1_MAX_MAE = 1.0, A2_MAX_GROSS = 0.05, A3_MAX_FREEZE = 0.10;
const MIN_POINTS_FOR_VERDICT = 500;
const MIN_STATIONS_FOR_VERDICT = 20;
const BANDS: [string, number, number][] = [
  ["0–7 km", 0, 7], ["7–15 km", 7, 15], ["15–20 km", 15, 20], [">20 km", 20, Infinity]];
const B_BOOT = 300;
const GOLV_KM = [3, 5];

type Station = { id: string; lon: number; lat: number; elev: number | null; yta: Map<number, number>; luft: Map<number, number> };
type Rad = { station: string; dygn: number; measured: number; ankKm: number; raw: number; hojd: number | null; anom: number | null; offset: number | null };
type Pick = (r: Rad) => number | null;
const KANDIDATER: { namn: string; pick: Pick }[] = [
  { namn: "RÅ", pick: (r) => r.raw }, { namn: "RÅ+HÖJD", pick: (r) => r.hojd }, { namn: "ANOM", pick: (r) => r.anom },
  { namn: "OFFSET (taket)", pick: (r) => r.offset }];

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

/** Som hojd-prov.ts evaluate() för RÅ, RÅ+HÖJD och OFFSET; ANOM därtill. Bara mål från och med `fran` (hink). */
function evaluate(stations: Map<string, Station>, fran: number): Rad[] {
  const arr = [...stations.values()];
  const rader: Rad[] = [];
  for (const s of arr) {
    const alla = arr.filter((a) => a.id !== s.id)
      .map((a) => ({ a, km: haversineKm(s.lon, s.lat, a.lon, a.lat) }))
      .sort((x, y) => x.km - y.km);
    const nbs = alla.filter((x) => x.km <= MAX_KM).slice(0, K_NEIGHBOURS).map((x) => ({ ...x, p: pairStats(s.yta, x.a.yta) }));
    const nbsLuft = alla.filter((x) => x.km <= MAX_LUFT_KM).slice(0, K_LUFT);
    const nbsAnom = nbs.slice(0, K_ANOM);
    for (const [t, measured] of s.yta) {
      if (measured > 5 || t < fran) continue; // vintertimmar som grind A, och bara efter snittet
      let wR = 0, pR = 0, wH = 0, pH = 0, wO = 0, pO = 0, ank = Infinity;
      for (const { a, km, p } of nbs) {
        const av = a.yta.get(t);
        if (av === undefined) continue;
        const w = 1 / Math.max(km, 1);
        wR += w; pR += w * av;
        if (s.elev !== null && a.elev !== null) { wH += w; pH += w * (av - LAPSE * (s.elev - a.elev)); }
        if (p.n - 1 >= MIN_SHARED) { wO += w; pO += w * (av + (p.sum - (measured - av)) / (p.n - 1)); }
        if (km < ank) ank = km;
      }
      if (wR === 0) continue;
      // ANOM: luften ur många grannar (jämnt fält), anomalin ur de närmaste (platsegenskap).
      let wL = 0, pL = 0, wA = 0, pA = 0;
      for (const { a, km } of nbsLuft) {
        const al = a.luft.get(t);
        if (al === undefined) continue;
        const w = 1 / Math.max(km, 1);
        wL += w; pL += w * al;
      }
      for (const { a, km } of nbsAnom) {
        const av = a.yta.get(t), al = a.luft.get(t);
        if (av === undefined || al === undefined) continue;
        const v = 1 / Math.max(km, 1) ** 2;
        wA += v; pA += v * (av - al);
      }
      rader.push({ station: s.id, dygn: Math.floor(t * BUCKET_S / 86400), measured, ankKm: ank, raw: pR / wR,
        hojd: wH > 0 ? pH / wH : null, anom: wL > 0 && wA > 0 ? pL / wL + pA / wA : null, offset: wO > 0 ? pO / wO : null });
    }
  }
  return rader;
}

// ── Räkningarna: per kluster (station × dygn) och band, så att bootstrapen bara summerar.
type Agg = { n: number; nDec: number; absDec: number; gross: number; a3: number; stat: number; miss: number; grov: number; mod: number; falsk: number; klart: number };
const tom = (): Agg => ({ n: 0, nDec: 0, absDec: 0, gross: 0, a3: 0, stat: 0, miss: 0, grov: 0, mod: 0, falsk: 0, klart: 0 });
const bandAv = (km: number) => BANDS.findIndex(([, lo, hi]) => km >= lo && km < hi);

function aggregera(rader: Rad[], pick: Pick): { kluster: Agg[][]; stationer: Set<string>[] } {
  const per = new Map<string, Agg[]>();
  const stationer = BANDS.map(() => new Set<string>());
  for (const r of rader) {
    const v = pick(r);
    if (v === null) continue;
    const key = `${r.station}|${r.dygn}`;
    let k = per.get(key);
    if (!k) { k = BANDS.map(tom); per.set(key, k); }
    const b = bandAv(r.ankKm), a = k[b];
    stationer[b].add(r.station);
    const fel = Math.abs(v - r.measured);
    a.n++;
    if (r.measured >= -5) { a.nDec++; a.absDec += fel; }
    if (fel > 2) a.gross++;
    if ((r.measured < 0 && v > 2) || (r.measured > 2 && v < 0)) a.a3++;
    if (r.measured <= FRYS_C) { a.stat++; if (v > FRYS_C) a.miss++; if (v > FRYS_C + 1) a.grov++; }
    if (v <= FRYS_C) { a.mod++; if (r.measured > FRYS_C) a.falsk++; if (r.measured > FRYS_C + 1) a.klart++; }
  }
  return { kluster: [...per.values()], stationer };
}

const summa = (xs: Agg[]): Agg => xs.reduce((s, a) => {
  for (const k of Object.keys(s) as (keyof Agg)[]) s[k] += a[k];
  return s;
}, tom());

type Matt = { n: number; mae: number; gross: number; a3: number; miss: number; grov: number; falsk: number; klart: number; nStat: number; nMod: number };
const matt = (a: Agg): Matt => ({ n: a.n, mae: a.nDec ? a.absDec / a.nDec : NaN, gross: a.n ? a.gross / a.n : NaN, a3: a.n ? a.a3 / a.n : NaN,
  miss: a.stat ? a.miss / a.stat : NaN, grov: a.stat ? a.grov / a.stat : NaN, falsk: a.mod ? a.falsk / a.mod : NaN,
  klart: a.mod ? a.klart / a.mod : NaN, nStat: a.stat, nMod: a.mod });

/** Vägviktat mått: bandandel × bandets mått, över banden som har underlag; täckningen skrivs ut. */
function vagviktat(band: Agg[], andelar: number[]): { m: Matt; tackt: number } {
  let tackt = 0, mae = 0, gross = 0, a3 = 0, miss = 0, falsk = 0, grov = 0, klart = 0, tMiss = 0, tFalsk = 0, n = 0, nStat = 0, nMod = 0;
  for (let i = 0; i < BANDS.length; i++) {
    const m = matt(band[i]);
    if (!m.n) continue;
    tackt += andelar[i]; n += band[i].n; mae += andelar[i] * m.mae; gross += andelar[i] * m.gross; a3 += andelar[i] * m.a3;
    if (m.nStat) { tMiss += andelar[i]; miss += andelar[i] * m.miss; grov += andelar[i] * m.grov; nStat += m.nStat; }
    if (m.nMod) { tFalsk += andelar[i]; falsk += andelar[i] * m.falsk; klart += andelar[i] * m.klart; nMod += m.nMod; }
  }
  const d = tackt || 1;
  return { tackt, m: { n, mae: mae / d, gross: gross / d, a3: a3 / d, miss: tMiss ? miss / tMiss : NaN, grov: tMiss ? grov / tMiss : NaN,
    falsk: tFalsk ? falsk / tFalsk : NaN, klart: tFalsk ? klart / tFalsk : NaN, nStat, nMod } };
}

// Deterministisk slump (mulberry32) — samma frö ger samma intervall, så en omkörning är jämförbar.
function slump(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

type Nyckel = keyof Matt;
/** Blockbootstrap över kluster: per band, ALLA och vägviktat — percentiler för varje mått. */
function bootstrap(kluster: Agg[][], andelar: number[], rnd: () => number) {
  const K = kluster.length;
  const prov: { band: Matt[]; alla: Matt; vag: Matt }[] = [];
  for (let b = 0; b < B_BOOT; b++) {
    const acc = BANDS.map(tom);
    for (let i = 0; i < K; i++) {
      const k = kluster[Math.floor(rnd() * K)];
      for (let j = 0; j < BANDS.length; j++) for (const key of Object.keys(acc[j]) as (keyof Agg)[]) acc[j][key] += k[j][key];
    }
    prov.push({ band: acc.map(matt), alla: matt(summa(acc)), vag: vagviktat(acc, andelar).m });
  }
  const ci = (xs: number[]): [number, number] => {
    const s = xs.filter((x) => !Number.isNaN(x)).sort((a, b) => a - b);
    if (s.length < 20) return [NaN, NaN];
    return [s[Math.floor(0.025 * (s.length - 1))], s[Math.ceil(0.975 * (s.length - 1))]];
  };
  const over = (get: (p: typeof prov[number]) => Matt) => (key: Nyckel) => ci(prov.map((p) => get(p)[key] as number));
  return { band: BANDS.map((_, i) => over((p) => p.band[i])), alla: over((p) => p.alla), vag: over((p) => p.vag) };
}

/** Läsning mot en tröskel med bootstrapintervallet: hela intervallet under = KLARAR, hela över = FALLER, annars OAVGJORT. */
const lasning = (lo: number, hi: number, tr: number): string => Number.isNaN(lo) ? "—" : hi <= tr ? "KLARAR" : lo > tr ? "FALLER" : "OAVGJORT";
const pc = (x: number) => Number.isNaN(x) ? "  —  " : (100 * x).toFixed(1).padStart(5) + " %";
const iv = (c: [number, number], f: (x: number) => string) => Number.isNaN(c[0]) ? "[—]" : `[${f(c[0]).trim()}–${f(c[1]).trim()}]`;

function redovisa(namn: string, rader: Rad[], pick: Pick, andelar: number[], rnd: () => number): { vag: Matt; vagCi: (k: Nyckel) => [number, number]; alla: Matt } {
  const { kluster, stationer } = aggregera(rader, pick);
  const band = BANDS.map((_, i) => summa(kluster.map((k) => k[i])));
  const alla = matt(summa(band)), allaStationer = new Set(stationer.flatMap((s) => [...s])).size;
  const { m: vag, tackt } = vagviktat(band, andelar);
  const boot = bootstrap(kluster, andelar, rnd);
  console.log(`\nKANDIDAT ${namn} — ${kluster.length} kluster (station × dygn), ${allaStationer} stationer`);
  console.log("  band        n      MAE  A2 grova [95 % boot]      A3(dok)  flagga: missad [boot]     grovt   falsk [boot]      klart falsk");
  for (let i = 0; i < BANDS.length; i++) {
    const m = matt(band[i]), c = boot.band[i];
    if (!m.n) { console.log(`  ${BANDS[i][0].padEnd(9)} ${"0".padStart(6)}  —`); continue; }
    console.log(`  ${BANDS[i][0].padEnd(9)} ${String(m.n).padStart(6)}  ${m.mae.toFixed(2)}  ${pc(m.gross)} ${iv(c("gross"), pc).padEnd(17)} ${pc(m.a3)}  ` +
      `${pc(m.miss)} ${iv(c("miss"), pc).padEnd(17)} (${m.nStat})  ${pc(m.grov)}  ${pc(m.falsk)} ${iv(c("falsk"), pc).padEnd(17)} (${m.nMod})  ${pc(m.klart)}`);
  }
  const nog = alla.n >= MIN_POINTS_FOR_VERDICT && allaStationer >= MIN_STATIONS_FOR_VERDICT;
  for (const [rubrik, m, c] of [["ALLA (oviktat)", alla, boot.alla], [`VÄGVIKTAT (täckning ${(100 * tackt).toFixed(0)} %)`, vag, boot.vag]] as [string, Matt, (k: Nyckel) => [number, number]][]) {
    const a1 = c("mae"), a2 = c("gross");
    console.log(`  ${rubrik.padEnd(28)} n ${String(m.n).padStart(6)} · A1 ${m.mae.toFixed(2)} °C ${iv(a1, (x) => x.toFixed(2))} → ${nog ? lasning(a1[0], a1[1], A1_MAX_MAE) : "under spärren"}` +
      ` · A2 ${pc(m.gross)} ${iv(a2, pc)} → ${nog ? lasning(a2[0], a2[1], A2_MAX_GROSS) : "under spärren"} · A3(dok) ${pc(m.a3)}` +
      ` · missad flagga ${pc(m.miss)} ${iv(c("miss"), pc)} · falsk ${pc(m.falsk)} ${iv(c("falsk"), pc)}`);
  }
  if (!nog) console.log(`  underlag ${alla.n} punkter / ${allaStationer} stationer under spärren (≥ ${MIN_POINTS_FOR_VERDICT} / ≥ ${MIN_STATIONS_FOR_VERDICT})`);
  return { vag, vagCi: boot.vag, alla };
}

/** Golvet: stationspar inom `km`, delade hinkar från snittet där någon mätte ≤ 5 °C. */
function golvet(stations: Map<string, Station>, km: number, fran: number) {
  const arr = [...stations.values()];
  let par = 0, hinkar = 0, over2 = 0, abs = 0;
  for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
    if (haversineKm(arr[i].lon, arr[i].lat, arr[j].lon, arr[j].lat) > km) continue;
    let n = 0;
    for (const [t, y1] of arr[i].yta) {
      if (t < fran) continue;
      const y2 = arr[j].yta.get(t);
      if (y2 === undefined || Math.min(y1, y2) > 5) continue;
      n++; const d = Math.abs(y1 - y2); abs += d; if (d > 2) over2++;
    }
    if (n) { par++; hinkar += n; }
  }
  return { par, hinkar, andel: hinkar ? over2 / hinkar : NaN, mae: hinkar ? abs / hinkar : NaN };
}

// ── Självtest: kända sanningar för de tre nya delarna.
if (process.argv.includes("--sjalvtest")) {
  const rnd = slump(1);
  // (a) ANOM: tolv stationer på en linje (2 km), luft med lutning 0,05 °C/km, anomali −2 i block om fem, +2 i nästa block.
  // Målen är blockens centra (s2, s7): de tre närmaste bär målets anomali, RÅ:s femte granne står i nästa block och drar
  // dit (≈ 0,4 °C). ANOM:s enda fel är luftinterpolationens skevhet vid linjens ände. ANOM ska vara klart bättre.
  const st = new Map<string, Station>();
  for (let i = 0; i < 12; i++) {
    const yta = new Map<number, number>(), luft = new Map<number, number>();
    const anomali = Math.floor(i / 5) % 2 === 0 ? -2 : 2;
    for (let t = SNITT; t < SNITT + 240; t++) { const l = 2 * Math.sin(t / 9) + 0.05 * (2 * i); luft.set(t, l); yta.set(t, l + anomali); }
    st.set(`s${i}`, { id: `s${i}`, lon: 13 + i * 0.0327, lat: 56, elev: 0, yta, luft });
  }
  const rader = evaluate(st, SNITT);
  const mitt = rader.filter((r) => ["s2", "s7"].includes(r.station)); // blockens centra
  const maeAv = (xs: Rad[], p: Pick) => xs.reduce((a, r) => a + Math.abs(p(r)! - r.measured), 0) / xs.length;
  const rawM = maeAv(mitt, (r) => r.raw), anomM = maeAv(mitt, (r) => r.anom);
  if (!(mitt.length > 400 && rawM > 0.3 && anomM < 0.3 * rawM)) { console.error(`SJÄLVTEST FALLERAR (ANOM): n=${mitt.length}, rå=${rawM}, anom=${anomM}`); process.exit(1); }
  // (b) Bootstrap: 60 kluster à 40 rader, sann andel grova fel 10 % — intervallet ska täcka 0,10 och vara smalare än ±6 pe.
  const kluster: Agg[][] = [];
  for (let k = 0; k < 60; k++) { const a = BANDS.map(tom); for (let i = 0; i < 40; i++) { a[0].n++; if (rnd() < 0.1) a[0].gross++; } kluster.push(a); }
  const boot = bootstrap(kluster, [1, 0, 0, 0], rnd), c = boot.alla("gross");
  if (!(c[0] <= 0.1 && c[1] >= 0.1 && c[1] - c[0] < 0.12)) { console.error(`SJÄLVTEST FALLERAR (bootstrap): ${c}`); process.exit(1); }
  // (c) Vägviktning: band 1 med 2 %, band 2 med 10 %, andelar 0,5/0,5 ⇒ 6 %; band utan underlag räknas inte.
  const v1 = tom(), v2 = tom(); v1.n = 100; v1.gross = 2; v2.n = 100; v2.gross = 10;
  const vv = vagviktat([v1, v2, tom(), tom()], [0.5, 0.5, 0, 0]);
  if (!(Math.abs(vv.m.gross - 0.06) < 1e-9 && vv.tackt === 1)) { console.error(`SJÄLVTEST FALLERAR (vägviktning): ${vv.m.gross}`); process.exit(1); }
  // (d) Golvet: två par inom 3 km, ett med konstant skillnad 3 °C (alla hinkar över 2), ett med 0,5 (inga).
  const g = new Map<string, Station>();
  const mk = (id: string, lon: number, off: number) => { const yta = new Map<number, number>(); for (let t = SNITT; t < SNITT + 50; t++) yta.set(t, off); g.set(id, { id, lon, lat: 56, elev: 0, yta, luft: new Map() }); };
  mk("a", 13, 0); mk("b", 13.02, 3); mk("c", 14, 0); mk("d", 14.02, 0.5);
  const gg = golvet(g, 3, SNITT);
  if (!(gg.par === 2 && gg.hinkar === 100 && Math.abs(gg.andel - 0.5) < 1e-9)) { console.error(`SJÄLVTEST FALLERAR (golvet): ${JSON.stringify(gg)}`); process.exit(1); }
  console.log(`SJÄLVTEST OK: ANOM ${anomM.toFixed(3)} mot RÅ ${rawM.toFixed(3)} °C på ${mitt.length} punkter · bootstrap [${pc(c[0]).trim()}–${pc(c[1]).trim()}] kring 10 % · vägviktat 6,0 % · golvet 50 %`);
  process.exit(0);
}

// ── Skarpt.
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
const DAYS = Number(process.argv[2] ?? 60);
console.log(`VÄGPUNKTSGRINDENS PREMISSER — mätning enligt DECISIONS #405, ${DAYS} dygn bakåt, mål från 2026-09-25 07:30Z. Ingen dom.`);
skrivSaknade(await saknadeDygn((s, p) => pool.query(s, p as any[]).then((r) => r.rows), "weather_observations", DAYS));
await vaktdiagnos((s, p) => pool.query(s, p as any[]).then((r) => r.rows),
  "weather_observations", `WHERE sample_time > now() - ${DAYS} * interval '1 day'`, [
    { namn: "yttemperatur finns", bar: "surface_temp_c IS NOT NULL", villkor: "true" },
    { namn: "#75: lufttemperatur finns", bar: "air_temp_c IS NOT NULL", villkor: "true" },
    { namn: "#75: yta - luft >= -12 grader", bar: "surface_temp_c IS NOT NULL AND air_temp_c IS NOT NULL", villkor: "surface_temp_c >= air_temp_c - 12" },
    ...led234(),
  ]);
// Vägpunktsgrindens WHERE-sats ordagrant (hojd-prov.ts), plus luften för ANOM.
const res = await pool.query(`
  SELECT DISTINCT ON (station_id, b) station_id,
    ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
    floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c, air_temp_c
  FROM weather_observations
  WHERE surface_temp_c IS NOT NULL AND sample_time > now() - $1 * interval '1 day'
    AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12
    AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}
  ORDER BY station_id, b, sample_time DESC`, [DAYS]);
const stations = new Map<string, Station>();
for (const r of res.rows) {
  let s = stations.get(r.station_id);
  if (!s) { s = { id: r.station_id, lon: +r.lon, lat: +r.lat, elev: null, yta: new Map(), luft: new Map() }; stations.set(r.station_id, s); }
  s.yta.set(Number(r.b), +r.surface_temp_c); s.luft.set(Number(r.b), +r.air_temp_c);
}
const efter = res.rows.filter((r: any) => Number(r.b) >= SNITT).length;
console.log(`VViS: ${stations.size} stationer, ${res.rows.length} hinkar i fönstret, varav ${efter} efter snittet`);
if (stations.size < 100 || efter < 1000) { console.error(`UNDERLAGSVAKT: ${stations.size} stationer / ${efter} hinkar efter snittet — arkivet eller hämtningen är trasig.`); process.exit(1); }
// Vägnätets avståndsfördelning (som vagpunkt-population.ts): provpunkter var 2 km längs de svenska skuggrutterna.
const vp = await pool.query(`
  SELECT (e->>2)::float AS narm
  FROM (SELECT DISTINCT ON (route) route, prognos FROM shadow_log
        WHERE land = 'SE' AND prognos ? 'p' AND run_at > now() - interval '7 days'
        ORDER BY route, run_at DESC) s,
       jsonb_array_elements(s.prognos->'p') e`);
await pool.end();
const narm = vp.rows.map((r: any) => r.narm).filter((x: any) => x !== null) as number[];
const andelar = BANDS.map((_, i) => narm.filter((k) => bandAv(k) === i).length / (narm.length || 1));
console.log(`Vägpunkter längs skuggrutterna: ${narm.length}. Andel per band: ` + BANDS.map(([n], i) => `${n} ${(100 * andelar[i]).toFixed(1)} %`).join(" · "));
// Höjder ur EU-DEM (som hojd-prov.ts) för RÅ+HÖJD.
const ids = [...stations.keys()];
let elevOk = 0;
for (let i = 0; i < ids.length; i += 100) {
  const batch = ids.slice(i, i + 100);
  const locs = batch.map((id) => { const s = stations.get(id)!; return `${s.lat.toFixed(5)},${s.lon.toFixed(5)}`; }).join("|");
  const r = await fetch(`https://api.opentopodata.org/v1/eudem25m?locations=${locs}`, { headers: { Accept: "application/json" } });
  if (!r.ok) { console.error(`opentopodata: HTTP ${r.status} på batch ${i / 100 + 1}`); continue; }
  const j: any = await r.json();
  (j.results ?? []).forEach((x: any, k: number) => { if (typeof x?.elevation === "number") { stations.get(batch[k])!.elev = x.elevation; elevOk++; } });
  if (i + 100 < ids.length) await new Promise((ok) => setTimeout(ok, 1100));
}
console.log(`Höjder: ${elevOk} av ${stations.size} stationer fick EU-DEM-höjd (Copernicus EU-DEM via opentopodata.org)`);

console.log(`\nGOLVET — stationspar, delade hinkar från snittet där någon mätte ≤ 5 °C`);
for (const km of GOLV_KM) {
  const g = golvet(stations, km, SNITT);
  console.log(`  inom ${km} km: ${g.par} par, ${g.hinkar} hinkar, |Δyta| > 2 °C i ${pc(g.andel).trim()}, MAE mellan paren ${g.mae.toFixed(2)} °C`);
}

const rader = evaluate(stations, SNITT);
console.log(`\nMål efter snittet: ${rader.length} punkter från ${new Set(rader.map((r) => r.station)).size} stationer. ` +
  `Trösklar (läsning, ingen dom): A1 ≤ ${A1_MAX_MAE.toFixed(1)} °C · A2 ≤ ${A2_MAX_GROSS * 100} % · A3(dok) ≤ ${A3_MAX_FREEZE * 100} %. Bootstrap B = ${B_BOOT}, frö 20260930.`);
const rnd = slump(20260930);
const utfall = KANDIDATER.map((k) => ({ namn: k.namn, ...redovisa(k.namn, rader, k.pick, andelar, rnd) }));
console.log(`\nLÄSNING (vägviktat, mot A1 och A2 med bootstrapintervallet):`);
for (const u of utfall) {
  const a1 = u.vagCi("mae"), a2 = u.vagCi("gross");
  console.log(`  ${u.namn.padEnd(15)} A1 ${lasning(a1[0], a1[1], A1_MAX_MAE).padEnd(9)} A2 ${lasning(a2[0], a2[1], A2_MAX_GROSS).padEnd(9)} ` +
    `(oviktat A2 ${pc(u.alla.gross).trim()}, vägviktat ${pc(u.vag.gross).trim()} ${iv(a2, pc)})`);
}
console.log(`Frysflaggan har ingen tröskel i TROSKLAR-SKUGGAN; talen ovan är underlag för Bengts beslut, inte en dom.`);
