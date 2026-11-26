// Simuleringens spår: GPS-spår för det som INTE är en bil — flyg, tåg, buss, cykel — och en bil som kontroll. Allt är
// syntetiskt och deterministiskt: samma anrop ger samma spår, bruset kommer ur en räknare med fast frö. Används av
// engine/simulering.ts (hela provet mot en lägesfil) och test/maste-tiga.test.ts (de fall som ska tiga).
//
// Spåren säger vad MOTORN får se. De säger inget om telefonens riktiga GPS, självstarten eller ljudet.
import { bearingDeg, haversineM } from "./src/geo.ts";

/** One fix as the apps build it: speed and altitude only when the platform says they are valid. `altitudeM` is read by the
 *  engine from the not-a-car gate on; an engine without the gate ignores it. */
export interface SimFix { t: number; lon: number; lat: number; speedKmh?: number; altitudeM?: number }
export type P = [number, number];   // [lon, lat]

const R = 6_371_000, RAD = Math.PI / 180;
const ll = (p: P) => ({ lon: p[0], lat: p[1] });

/** The point distM from p in the direction bearing (degrees from north). */
export function flytta(p: P, bearing: number, distM: number): P {
  const d = distM / R, b = bearing * RAD, la = p[1] * RAD, lo = p[0] * RAD;
  const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
  const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
  return [lo2 / RAD, la2 / RAD];
}

/** The great circle from a to b, one point about every stegM. */
export function storcirkel(a: P, b: P, stegM = 1000): P[] {
  const total = haversineM(ll(a), ll(b)), n = Math.max(1, Math.round(total / stegM)), d = total / R;
  const [la1, lo1, la2, lo2] = [a[1] * RAD, a[0] * RAD, b[1] * RAD, b[0] * RAD];
  const ut: P[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2);
    const y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2);
    const z = A * Math.sin(la1) + B * Math.sin(la2);
    ut.push([Math.atan2(y, x) / RAD, Math.atan2(z, Math.hypot(x, y)) / RAD]);
  }
  return ut;
}

/** A polyline with its length, and the point at a distance along it. */
export class Bana {
  readonly kum: number[] = [0];
  readonly punkter: P[];
  constructor(punkter: P[]) {
    this.punkter = punkter;
    for (let i = 1; i < punkter.length; i++) this.kum.push(this.kum[i - 1] + haversineM(ll(punkter[i - 1]), ll(punkter[i])));
  }
  get langdM(): number { return this.kum[this.kum.length - 1]; }
  private i = 1;
  /** The point sM along the line (clamped to its ends). */
  vid(sM: number): P {
    const s = Math.min(this.langdM, Math.max(0, sM));
    while (this.i < this.kum.length - 1 && this.kum[this.i] < s) this.i++;
    while (this.i > 1 && this.kum[this.i - 1] > s) this.i--;
    const a = this.punkter[this.i - 1], b = this.punkter[this.i], l = this.kum[this.i] - this.kum[this.i - 1];
    const f = l > 0 ? (s - this.kum[this.i - 1]) / l : 0;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }
}

/** The line moved sideways by about sidaM (positive = to the right of its direction): each point along the normal of the
 *  direction between its neighbours. In sharp bends the distance is not exact — measure it (avstandTillLinjeM) before use. */
export function sidoflytta(linje: P[], sidaM: number): P[] {
  return linje.map((p, i) => {
    const a = linje[Math.max(0, i - 1)], b = linje[Math.min(linje.length - 1, i + 1)];
    return flytta(p, bearingDeg(ll(a), ll(b)) + 90, sidaM);
  });
}

// ---------- ground vehicles ----------

export interface Markfordon {
  /** Top speed, km/h. */
  maxKmh: number;
  /** Acceleration and braking, m/s². */
  accMs2: number; bromsMs2: number;
  /** Stops as metres along the line (the end of the line is always a stop), and the dwell at each, seconds. */
  stoppM?: number[]; uppehallS?: number;
}

/** A vehicle along a line at 1 Hz: accelerates to its top speed, brakes to a halt at every stop, waits, goes on. */
export function markspar(linje: P[], f: Markfordon): SimFix[] {
  const bana = new Bana(linje), vmax = f.maxKmh / 3.6;
  const stopp = [...(f.stoppM ?? []).filter((s) => s > 0 && s < bana.langdM), bana.langdM].sort((a, b) => a - b);
  const ut: SimFix[] = [];
  let s = 0, v = 0, t = 0, vila = 0, k = 0;
  const fix = () => { const [lon, lat] = bana.vid(s); ut.push({ t, lon, lat, speedKmh: v * 3.6 }); };
  fix();
  while (k < stopp.length && t < 200_000) {
    t++;
    if (vila > 0) { vila--; fix(); continue; }
    const kvar = stopp[k] - s;
    if (v * v / (2 * f.bromsMs2) >= kvar) v = Math.max(0, v - f.bromsMs2); else v = Math.min(vmax, v + f.accMs2);
    if (kvar <= Math.max(v, 1)) { s = stopp[k]; v = 0; k++; vila = f.uppehallS ?? 0; }
    else s += v;
    fix();
  }
  return ut;
}

/** Stops every stegM along a line of langdM. */
export function stoppVar(langdM: number, stegM: number): number[] {
  const ut: number[] = [];
  for (let s = stegM; s < langdM; s += stegM) ut.push(s);
  return ut;
}

// ---------- planes ----------

export interface Flygplats { namn: string; pos: P; hojdM: number }
/** Airports, positions rounded to about 100 m, elevation in metres above sea level. */
export const FLYGPLATS: Record<string, Flygplats> = {
  ARN: { namn: "Stockholm Arlanda", pos: [17.919, 59.652], hojdM: 42 },
  MMX: { namn: "Malmö", pos: [13.376, 55.536], hojdM: 72 },
  GOT: { namn: "Göteborg Landvetter", pos: [12.280, 57.663], hojdM: 154 },
  LLA: { namn: "Luleå", pos: [22.122, 65.544], hojdM: 20 },
};

const TAXI_UT_S = 300, VANTA_S = 30, TAXI_IN_S = 240, NEDSTIGNING_S = 1200;
const LYFT_MS = 280 / 3.6, MARSCH_MS = 800 / 3.6, SATT_MS = 260 / 3.6, MARSCH_HOJD_M = 10_000;
/** Taxi speed: 20–40 km/h, a slow wave. */
const taxiMs = (t: number) => (30 + 10 * Math.sin((2 * Math.PI * t) / 60)) / 3.6;

/**
 * A whole flight at 1 Hz along the great circle between two airports: taxi out (20–40 km/h, 5 min), a 30 s wait, the take-off
 * roll (0 to 280 km/h at 2.2 m/s²), the climb (to 800 km/h at 0.25 m/s² and to 10 000 m at 12 m/s), cruise, the descent (20 min,
 * down to 260 km/h and to the ground), the landing roll (2 m/s² down to taxi speed) and taxi in (4 min). Every fix carries the
 * true speed and altitude; `variant` below takes away what a phone may lack. A real flight follows departure and arrival routes
 * and taxiways; this one goes straight, which is enough for what the engine sees along the way.
 */
export function flygspar(fran: Flygplats, till: Flygplats): SimFix[] {
  const bana = new Bana(storcirkel(fran.pos, till.pos));
  // The tail (landing roll and taxi in) and the descent, in metres, so that the descent starts where the flight ends at `till`.
  let svans = 0;
  for (let v = SATT_MS; v > taxiMs(0); v -= 2) svans += v;
  for (let t = 0; t < TAXI_IN_S; t++) svans += taxiMs(t);
  const nedM = ((MARSCH_MS + SATT_MS) / 2) * NEDSTIGNING_S;
  const ut: SimFix[] = [];
  let s = 0, v = 0, h = fran.hojdM, t = 0;
  const fix = () => { const [lon, lat] = bana.vid(s); ut.push({ t, lon, lat, speedKmh: v * 3.6, altitudeM: h }); t++; };
  for (let i = 0; i < TAXI_UT_S; i++) { v = taxiMs(i); s += v; fix(); }
  for (let i = 0; i < VANTA_S; i++) { v = 0; fix(); }
  while (v < LYFT_MS) { v = Math.min(LYFT_MS, v + 2.2); s += v; fix(); }
  while (s < bana.langdM - svans - nedM) {
    v = Math.min(MARSCH_MS, v + 0.25); h = Math.min(MARSCH_HOJD_M, h + 12); s += v; fix();
  }
  const v0 = v, h0 = h;
  for (let i = 1; i <= NEDSTIGNING_S; i++) {
    v = v0 + (SATT_MS - v0) * (i / NEDSTIGNING_S); h = h0 + (till.hojdM - h0) * (i / NEDSTIGNING_S); s += v; fix();
  }
  while (v - 2 > taxiMs(0)) { v -= 2; s += v; fix(); }
  for (let i = 0; i < TAXI_IN_S; i++) { v = taxiMs(i); s += v; fix(); }
  return ut;
}

// ---------- what the phone may lack ----------

/** A small deterministic generator (mulberry32) seeded from a text. */
export function slump(fro: string): () => number {
  let a = 2166136261;
  for (let i = 0; i < fro.length; i++) a = Math.imul(a ^ fro.charCodeAt(i), 16777619);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const normal = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

export const VARIANTER = {
  "fart+höjd": "fart och höjd finns i varje fix (1 Hz)",
  "fart, ingen höjd": "farten finns, höjden saknas",
  "bara lägen": "varken fart eller höjd: motorn räknar farten ur lägena",
  "glest": "en fix var 10–30:e sekund, med fart och höjd",
  "glest, bara lägen": "en fix var 10–30:e sekund, varken fart eller höjd",
  "hoppigt": "hoppiga lägen (se brus), fart och höjd finns",
  "hoppigt, bara lägen": "hoppiga lägen, varken fart eller höjd",
} as const;
export type Variant = keyof typeof VARIANTER;

/**
 * The same trip as a phone with less to give. The noise model for "hoppigt" (a phone at a cabin window): every position is moved
 * by a normal error of 25 m in each of north and east; one fix in a hundred is thrown 200–2 000 m in a random direction; the
 * altitude gets a normal error of 40 m and the speed one of 3 km/h (the phone measures speed by Doppler, not from positions).
 */
export function variant(spar: SimFix[], v: Variant, fro: string): SimFix[] {
  const r = slump(`${fro}|${v}`);
  let ut = spar;
  if (v.startsWith("glest")) {
    ut = [];
    for (let i = 0; i < spar.length; i += 10 + Math.floor(r() * 21)) ut.push(spar[i]);
  }
  if (v.startsWith("hoppigt")) {
    ut = ut.map((f) => {
      let p: P = flytta(flytta([f.lon, f.lat], 0, 25 * normal(r)), 90, 25 * normal(r));
      if (r() < 0.01) p = flytta(p, 360 * r(), 200 + 1800 * r());
      return { t: f.t, lon: p[0], lat: p[1],
               ...(f.speedKmh !== undefined ? { speedKmh: Math.max(0, f.speedKmh + 3 * normal(r)) } : {}),
               ...(f.altitudeM !== undefined ? { altitudeM: f.altitudeM + 40 * normal(r) } : {}) };
    });
  }
  if (v === "fart, ingen höjd") return ut.map(({ t, lon, lat, speedKmh }) => ({ t, lon, lat, speedKmh }));
  if (v.endsWith("bara lägen")) return ut.map(({ t, lon, lat }) => ({ t, lon, lat }));
  return ut;
}
