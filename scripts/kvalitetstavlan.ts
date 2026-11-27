// KVALITETSTAVLAN (kort #682, DECISIONS #973; reglerna i docs/TROSKLAR-KVALITETSTAVLAN.md, skrivna innan något tal lästs).
// Varje lager (A1, A2, K, R och Halkvakt som helhet, med snöflingan J1 bredvid) mäts mot källor som det inte bygger på:
// friktionen vid stationerna (FR), Trafikverkets väglag (VL), kamerorna i den öppna halvan (KA) och singelolyckorna (OL).
// Det föraren fick höra läses ur lägesfilens historik i kartrepot (§2). Skriptet skriver BARA aggregat per svenskt dygn, lager,
// källa och mått till `kvalitet_dag` (sql/147). Repot är publikt: utskriften är bara klart eller fel, aldrig ett tal ur talen.
//
// Run (i Actions, kvalitetstavlan.yml):
//   DATABASE_URL=… [FN=… KEY=…] node --experimental-strip-types scripts/kvalitetstavlan.ts --karta <kartrepo> --fran ÅÅÅÅ-MM-DD --till ÅÅÅÅ-MM-DD
//   FN/KEY = arkivdumpen (dygnen som bara finns i hinken). Självtest utan databas: --sjalvtest
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

// ── Reglerna (TROSKLAR-KVALITETSTAVLAN) ─────────────────────────────────────────────────────────────────────────────────────
export const HT = 1_800_000;                 // en halvtimme i ms (§4: enheten)
export const PLATS_KM = 2;                   // §4: en källa inom 2 km
export const TACK_FORE = 4;                  // §4: täckningen, två timmar före den hala halvtimmen (4 halvtimmar) …
export const TRAFF_FORE = 2, TRAFF_EFTER = 4; // §4: träffsäkerheten, en timme före till två timmar efter varningens halvtimme
export const VERSION_MAX_MS = 20 * 60_000;   // §2: en version gäller högst 20 minuter
export const GRIP_HAL = 0.30, YTA_HAL = 1;   // §3: DECISIONS #540
export const A2_YTA = 1;                     // §2: motorns regel för icing_point (engine/src/engine.ts, utan bro)
export const J1_LUFT = 3;                    // §2: säsongsfacits J1
export const OLYCKA_SEG_KM = 0.1, OLYCKA_SMV_KM = 0.5, DUBBLETT_KM = 1, DUBBLETT_MS = 2 * 3_600_000; // §3, §6
export const NATT_SAKNAS = 0.051;            // §6: nattens andel av ÅDT där NVDB saknar värdet (DECISIONS #972)
export const R_START = Date.parse("2026-11-25T20:24:00Z"); // §2: småvägsrösten, brytaren på
export const HALVOR_TEXT = "halkvakt-kamerahalvor-2026-11-27/";   // §10
export const ORDNING_TEXT = "halkvakt-kameraordning-2026-11-27/"; // §10
export type Lager = "A1" | "A2" | "K" | "R" | "J1";
export const LAGER: Lager[] = ["A1", "A2", "K", "R", "J1"];
/** §5: vilka källor varje lager får bedömas med. */
export const KALLOR: Record<Lager, ("FR" | "VL" | "KA")[]> = { A1: ["FR", "KA"], A2: ["FR", "VL", "KA"], K: ["FR", "VL", "KA"], R: ["FR", "KA"], J1: ["FR", "VL", "KA"] };
const HV: Lager[] = ["A1", "A2", "K", "R"];  // Halkvakt: det föraren kan höra

// ── Kamerorna (§10) ──────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Kamerans id ur bildens sökväg: filnamnet före det sista bindestrecket. */
export function kameraId(bild: string): string {
  const fil = bild.split("/").pop() ?? "";
  const i = fil.lastIndexOf("-");
  return i > 0 ? fil.slice(0, i) : fil.replace(/\.jpg$/i, "");
}
export const oppenHalva = (kamera: string) => createHash("sha256").update(HALVOR_TEXT + kamera).digest()[0] % 2 === 0;
export const ordning = (bild: string) => createHash("sha256").update(ORDNING_TEXT + bild).digest("hex");

// ── Geometri ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export type Pt = [number, number];
const KX = (lat: number) => 111.32 * Math.cos((lat * Math.PI) / 180);
export function kmPP(a: Pt, b: Pt): number { return Math.hypot((a[0] - b[0]) * KX((a[1] + b[1]) / 2), (a[1] - b[1]) * 110.57); }
export function kmPL(p: Pt, l: Pt[]): number {
  if (l.length === 1) return kmPP(p, l[0]);
  let bast = Infinity;
  for (let i = 1; i < l.length; i++) {
    const [ax, ay] = l[i - 1], [bx, by] = l[i], c = KX((ay + by) / 2);
    const B = [(bx - ax) * c, (by - ay) * 110.57], P = [(p[0] - ax) * c, (p[1] - ay) * 110.57], l2 = B[0] ** 2 + B[1] ** 2;
    const t = l2 ? Math.max(0, Math.min(1, (P[0] * B[0] + P[1] * B[1]) / l2)) : 0;
    bast = Math.min(bast, Math.hypot(P[0] - t * B[0], P[1] - t * B[1]));
  }
  return bast;
}
/** Avståndet mellan två platser: punkter eller linjer (en linje har minst två punkter). */
export function kmGG(a: Pt[], b: Pt[]): number {
  let m = Infinity;
  for (const p of a) m = Math.min(m, kmPL(p, b));
  if (b.length > 1) for (const p of b) m = Math.min(m, kmPL(p, a));
  return m;
}
export function langdKm(l: Pt[]): number { let s = 0; for (let i = 1; i < l.length; i++) s += kmPP(l[i - 1], l[i]); return s; }

/** Ett rutnät på ungefär 5 km för sökningen inom 2 km. */
class Natet {
  private c = new Map<string, number[]>();
  private key = (x: number, y: number) => `${Math.floor(x / 0.09)},${Math.floor(y / 0.045)}`;
  geo: Pt[][];
  constructor(geo: Pt[][]) {
    this.geo = geo;
    geo.forEach((g, i) => {
      const xs = g.map((p) => p[0]), ys = g.map((p) => p[1]);
      for (let x = Math.floor((Math.min(...xs) - 0.05) / 0.09); x <= Math.floor((Math.max(...xs) + 0.05) / 0.09); x++)
        for (let y = Math.floor((Math.min(...ys) - 0.025) / 0.045); y <= Math.floor((Math.max(...ys) + 0.025) / 0.045); y++) {
          const k = `${x},${y}`; const l = this.c.get(k); if (l) l.push(i); else this.c.set(k, [i]);
        }
    });
  }
  inom(g: Pt[], km: number): number[] {
    const ut = new Set<number>();
    for (const p of g) {
      const l = this.c.get(this.key(p[0], p[1]));
      if (l) for (const i of l) if (!ut.has(i) && kmGG(g, this.geo[i]) <= km) ut.add(i);
    }
    if (g.length > 1) { // en linje: också mellan punkterna
      for (let i = 1; i < g.length; i++) {
        const n = Math.ceil(kmPP(g[i - 1], g[i]) / 2);
        for (let j = 1; j < n; j++) {
          const p: Pt = [g[i - 1][0] + ((g[i][0] - g[i - 1][0]) * j) / n, g[i - 1][1] + ((g[i][1] - g[i - 1][1]) * j) / n];
          const l = this.c.get(this.key(p[0], p[1]));
          if (l) for (const x of l) if (!ut.has(x) && kmGG(g, this.geo[x]) <= km) ut.add(x);
        }
      }
    }
    return [...ut];
  }
  narmast(p: Pt, km: number): number {
    let b = -1, bd = Infinity;
    const l = this.c.get(this.key(p[0], p[1])) ?? [];
    for (const i of l) { const d = kmGG([p], this.geo[i]); if (d <= km && d < bd) { bd = d; b = i; } }
    return b;
  }
}

// ── Tiden ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const SV = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });
export function svensk(ms: number): { dag: string; timme: number } {
  const d = Object.fromEntries(SV.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { dag: `${d.year}-${d.month}-${d.day}`, timme: Number(d.hour) };
}
/** Det svenska dygnets början i UTC-ms. */
export function dygnStart(dag: string): number {
  for (const off of [-1, -2]) { const t = Date.parse(`${dag}T00:00:00Z`) + off * 3_600_000; if (svensk(t).dag === dag && svensk(t - 1).dag !== dag) return t; }
  throw new Error(`dygnets början gick inte att räkna: ${dag}`);
}

// ── Underlaget ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface Version { g: number; a1: { id: string; line: Pt[] }[]; a2: { id: string; p: Pt }[]; k: { id: string; pts: Pt[] }[] | null; r: Pt[] | null }
export interface Vader { st: string; t: number; p: Pt; yta: number | null; luft: number | null; grip: number | null }
export interface Vaglag { seg: string; t: number; f1: boolean; borta: boolean }
export interface Bild { bild: string; kamera: string; p: Pt; t: number; klass: string }
export interface Olycka { t: number; p: Pt }
export interface Seg { id: string; line: Pt[]; adt: number | null; natt: number }
/** Stationerna, samlade per halvtimme (absolut index, `floor(t / HT)`) medan raderna läses: bit 1 friktion mätt, 2 hal, 4 luft giltig, 8 luft under J1. */
export type Stationer = Map<string, { p: Pt; bits: Map<number, number> }>;
export interface Underlag { dagar: string[]; versioner: Version[]; stationer: Stationer; vaglag: Vaglag[]; bilder: Bild[]; olyckor: Olycka[]; seg: Seg[]; smvPunkter: Pt[] }
export interface Rad { dag: string; lager: string; kalla: string; matt: string; n: number; k: number }

/** §3: värdevakten och radvakten, som sql/138 och sql/141. */
export function giltigYta(r: { surface_temp_c: number | null; air_temp_c: number | null }): boolean {
  return r.surface_temp_c != null && r.surface_temp_c >= -40 && r.surface_temp_c <= 60 &&
    (r.air_temp_c == null || r.surface_temp_c >= r.air_temp_c - 12);
}
const giltigLuft = (l: number | null) => l != null && l >= -60 && l <= 60;
const giltigGrip = (g: number | null) => g != null && g >= 0 && g <= 1;

/** En väderrad in i stationernas halvtimmar (§3). Raden avgör själv om friktionen var hal: friktionen och ytan i samma rad. */
export function samla(st: Stationer, v: Vader): void {
  let b = 0;
  if (giltigGrip(v.grip)) {
    b |= 1;
    if (v.grip! < GRIP_HAL && giltigYta({ surface_temp_c: v.yta, air_temp_c: v.luft }) && v.yta! <= YTA_HAL) b |= 2;
  }
  if (giltigLuft(v.luft)) { b |= 4; if (v.luft! < J1_LUFT) b |= 8; }
  if (!b) return;
  let s = st.get(v.st); if (!s) st.set(v.st, (s = { p: v.p, bits: new Map() }));
  const h = Math.floor(v.t / HT); s.bits.set(h, (s.bits.get(h) ?? 0) | b);
}

/** §6: singelolyckorna, en per 1 km och 2 timmar. */
export function utanDubbletter(o: Olycka[]): Olycka[] {
  const s = [...o].sort((a, b) => a.t - b.t), ut: Olycka[] = [];
  for (const x of s) if (!ut.some((y) => x.t - y.t <= DUBBLETT_MS && kmPP(x.p, y.p) <= DUBBLETT_KM)) ut.push(x);
  return ut;
}

// ── Räkningen ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function rakna(u: Underlag): Rad[] {
  const t0 = dygnStart(u.dagar[0]), t1 = dygnStart(u.dagar[u.dagar.length - 1]) + 26 * 3_600_000;
  const h0 = Math.floor(t0 / HT) - 8, nH = Math.ceil((t1 + 3 * 3_600_000) / HT) - h0;
  const dagIdx = new Map(u.dagar.map((d, i) => [d, i]));
  const hDag = new Int16Array(nH).fill(-1);
  for (let i = 0; i < nH; i++) { const d = dagIdx.get(svensk((h0 + i) * HT).dag); if (d !== undefined) hDag[i] = d; }
  const ix = (t: number) => Math.floor(t / HT) - h0;
  const ut = new Map<string, Rad>();
  const add = (d: number, lager: string, kalla: string, matt: string, n: number, k: number) => {
    if (d < 0) return;
    const key = `${d}|${lager}|${kalla}|${matt}`, r = ut.get(key);
    if (r) { r.n += n; r.k += k; } else ut.set(key, { dag: u.dagar[d], lager, kalla, matt, n, k });
  };

  // Källornas platser.
  const stIdx = new Map<string, number>(), stPos: Pt[] = [];
  for (const [id, s] of u.stationer) { stIdx.set(id, stPos.length); stPos.push(s.p); }
  const nSt = stPos.length, FR = new Uint8Array(nSt * nH);   // bit 1 friktion mätt, 2 hal, 4 luft giltig, 8 luft < J1
  for (const [id, s] of u.stationer) {
    const i = stIdx.get(id)! * nH;
    for (const [h, b] of s.bits) { const x = h - h0; if (x >= 0 && x < nH) FR[i + x] |= b; }
  }
  const harGrip = new Uint8Array(nSt);
  for (let s = 0; s < nSt; s++) for (let h = 0; h < nH; h++) if (FR[s * nH + h] & 1) { harGrip[s] = 1; break; }
  const stNat = new Natet(stPos.map((p) => [p]));
  const gripNat = new Natet(stPos.map((p, i) => (harGrip[i] ? [p] : [[999, 999] as Pt])));

  const segIdx = new Map(u.seg.map((s, i) => [s.id, i]));
  const nSeg = u.seg.length, VL = new Uint8Array(nSeg * nH);   // bit 1 bedömbar, 2 hal (vid halvtimmens slut)
  const perSeg = new Map<number, Vaglag[]>();
  for (const r of u.vaglag) { const i = segIdx.get(r.seg); if (i === undefined) continue; const l = perSeg.get(i); if (l) l.push(r); else perSeg.set(i, [r]); }
  for (const [i, rr] of perSeg) {
    rr.sort((a, b) => a.t - b.t);
    let j = -1;
    for (let h = 0; h < nH; h++) {
      const slut = (h0 + h + 1) * HT;
      while (j + 1 < rr.length && rr[j + 1].t <= slut) j++;
      if (j >= 0 && !rr[j].borta) VL[i * nH + h] = 1 | (rr[j].f1 ? 2 : 0);
    }
  }
  const segNat = new Natet(u.seg.map((s) => s.line));

  const kamIdx = new Map<string, number>(), kamPos: Pt[] = [], KA = new Map<number, number>(); // nyckel kamera*nH+h → bit 1 bedömbar, 2 hal, 4 bar
  for (const b of u.bilder) {
    if (!oppenHalva(b.kamera)) continue;  // §10: den blinda halvan läses aldrig
    if (!kamIdx.has(b.kamera)) { kamIdx.set(b.kamera, kamPos.length); kamPos.push(b.p); }
    const h = ix(b.t); if (h < 0 || h >= nH || b.klass === "okänd") continue;
    const key = kamIdx.get(b.kamera)! * nH + h;
    KA.set(key, (KA.get(key) ?? 0) | 1 | (["is", "snö", "slask"].includes(b.klass) ? 2 : 0) | (b.klass === "bar" ? 4 : 0));
    if (b.bild.startsWith("v3/")) add(hDag[h], "-", "KA", "v3", 1, ["is", "snö", "slask"].includes(b.klass) ? 1 : 0);
  }
  const kamNat = new Natet(kamPos.map((p) => [p]));

  // Lagren ur lägesfilerna (§2): täckta halvtimmar, och för varje plats dess aktiva halvtimmar och dess källor inom 2 km.
  const tackt = new Uint8Array(nH), pa: Record<Lager, Uint8Array> = { A1: new Uint8Array(nH), A2: new Uint8Array(nH), K: new Uint8Array(nH), R: new Uint8Array(nH), J1: new Uint8Array(nH) };
  type Plats = { lager: Lager; grupp: string; geo: Pt[]; h: Set<number>; st: number[]; seg: number[]; kam: number[]; samma: number };
  const platser = new Map<string, Plats>();
  const plats = (lager: Lager, nyckel: string, grupp: string, geo: Pt[], samma = -1): Plats => {
    let p = platser.get(nyckel);
    if (!p) {
      p = { lager, grupp, geo, h: new Set(), st: stNat.inom(geo, PLATS_KM), seg: segNat.inom(geo, PLATS_KM), kam: kamNat.inom(geo, PLATS_KM), samma };
      platser.set(nyckel, p);
    }
    return p;
  };
  const vs = [...u.versioner].sort((a, b) => a.g - b.g);
  vs.forEach((v, i) => {
    const slut = Math.min(i + 1 < vs.length ? vs[i + 1].g : v.g + VERSION_MAX_MS, v.g + VERSION_MAX_MS);
    const hs: number[] = [];
    for (let h = ix(v.g); h <= ix(slut - 1); h++) if (h >= 0 && h < nH) hs.push(h);
    for (const h of hs) { tackt[h] = 1; pa.A1[h] = 1; pa.A2[h] = 1; pa.J1[h] = 1; if (v.k) pa.K[h] = 1; if (v.r && h >= ix(R_START)) pa.R[h] = 1; }
    const mark = (p: Plats) => { for (const h of hs) p.h.add(h); };
    for (const s of v.a1) mark(plats("A1", `A1:${s.id}`, s.id, s.line));
    for (const w of v.a2) mark(plats("A2", `A2:${w.id}`, w.id, [w.p], stIdx.get(w.id) ?? -1));
    for (const e of v.k ?? []) mark(plats("K", `K:${e.id}|${createHash("md5").update(JSON.stringify(e.pts)).digest("hex")}`, e.id, e.pts));
    if (v.g + 1 >= R_START) for (const p of v.r ?? []) mark(plats("R", `R:${p[0]},${p[1]}`, `${p[0]},${p[1]}`, [p]));
  });
  for (let s = 0; s < nSt; s++) for (let h = 0; h < nH; h++) if (FR[s * nH + h] & 8 && tackt[h]) plats("J1", `J1:${s}`, String(s), [stPos[s]], s).h.add(h);

  // Varje lagers aktiva halvtimmar vid varje källplats (stationer och väglagssträckor).
  const nara: Record<Lager, { st: Map<number, Set<number>>; seg: Map<number, Set<number>> }> = Object.fromEntries(LAGER.map((l) => [l, { st: new Map(), seg: new Map() }])) as any;
  for (const p of platser.values()) {
    const L = nara[p.lager];
    for (const s of p.st) { const m = L.st.get(s) ?? new Set<number>(); for (const h of p.h) m.add(h); L.st.set(s, m); }
    for (const s of p.seg) { const m = L.seg.get(s) ?? new Set<number>(); for (const h of p.h) m.add(h); L.seg.set(s, m); }
  }
  const aktivFore = (m: Set<number> | undefined, h: number, fore: number) => { if (m) for (let x = h - fore; x <= h; x++) if (m.has(x)) return true; return false; };

  // Täckningen (§6): de hala enheterna hos friktionen och väglaget.
  for (let s = 0; s < nSt; s++) for (let h = 0; h < nH; h++) {
    if (!(FR[s * nH + h] & 2) || !tackt[h] || hDag[h] < 0) continue;
    const d = hDag[h];
    let hv = false;
    for (const L of LAGER) {
      if (!pa[L][h]) continue;
      const ok = aktivFore(nara[L].st.get(s), h, TACK_FORE);
      add(d, L, "FR", "tackning", 1, ok ? 1 : 0);
      if (ok && HV.includes(L)) hv = true;
    }
    add(d, "HV", "FR", "tackning", 1, hv ? 1 : 0);
    // §7 oenigheten: låg friktion och en bild inom 2 km och en halvtimme som visar bar väg utan halka.
    let bed = false, bar = false, hal = false;
    for (const c of kamNat.inom([stPos[s]], PLATS_KM)) for (let x = h - 1; x <= h + 1; x++) { const f = KA.get(c * nH + x) ?? 0; if (f & 1) bed = true; if (f & 4) bar = true; if (f & 2) hal = true; }
    if (bed) add(d, "-", "FR", "oenig", 1, bar && !hal ? 1 : 0);
  }
  for (let s = 0; s < nSeg; s++) {
    let stNara: number[] | null = null;
    for (let h = 0; h < nH; h++) {
      if (!(VL[s * nH + h] & 2) || !tackt[h] || hDag[h] < 0) continue;
      const d = hDag[h];
      let hv = false;
      for (const L of ["A2", "K", "J1"] as Lager[]) {
        if (!pa[L][h]) continue;
        const ok = aktivFore(nara[L].seg.get(s), h, TACK_FORE);
        add(d, L, "VL", "tackning", 1, ok ? 1 : 0);
        if (ok && L !== "J1") hv = true;
      }
      if (!hv && pa.R[h] && aktivFore(nara.R.seg.get(s), h, TACK_FORE)) hv = true;
      add(d, "HV", "VL", "tackning", 1, hv ? 1 : 0);   // Halkvakt utom A1 (§5)
      // §7 oenigheten: halka i väglaget och friktion mätt inom 2 km i samma halvtimme utan halka en halvtimme före eller efter.
      stNara ??= gripNat.inom(u.seg[s].line, PLATS_KM);
      const matt = stNara.filter((x) => FR[x * nH + h] & 1);
      if (matt.length) add(d, "-", "VL", "oenig", 1, matt.every((x) => ![h - 1, h, h + 1].some((y) => y >= 0 && y < nH && FR[x * nH + y] & 2)) ? 1 : 0);
    }
  }

  // Träffsäkerheten (§6): varje varningsenhet, bedömd med lagrets egna oberoende källor. K räknas per post och halvtimme.
  const fonster = (h: number, f: (x: number) => number) => { let r = 0; for (let x = h - TRAFF_FORE; x <= h + TRAFF_EFTER; x++) if (x >= 0 && x < nH) r |= f(x); return r; };
  const domKalla = (Q: "FR" | "VL" | "KA", st: number[], seg: number[], kam: number[], h: number): number => {
    let r = 0;
    if (Q === "FR") for (const s of st) if (harGrip[s]) r |= fonster(h, (x) => FR[s * nH + x] & 3);
    if (Q === "VL") for (const s of seg) r |= fonster(h, (x) => VL[s * nH + x] & 3);
    if (Q === "KA") for (const c of kam) r |= fonster(h, (x) => (KA.get(c * nH + x) ?? 0) & 3);
    return r;   // bit 1 bedömbar, 2 bekräftad
  };
  const enhet = (L: Lager, h: number, st: number[], seg: number[], kam: number[], samma: boolean) => {
    const d = hDag[h]; if (d < 0 || !tackt[h]) return;
    let alla = 0;
    for (const Q of KALLOR[L]) {
      const r = domKalla(Q, st, seg, kam, h);
      if (r & 1) { add(d, L, Q, "traff", 1, r & 2 ? 1 : 0); if (HV.includes(L)) add(d, "HV", Q, "traff", 1, r & 2 ? 1 : 0); }
      if (Q === "FR" && samma && r & 1) add(d, L, "FR", "traff_samma", 1, r & 2 ? 1 : 0);
      alla |= r;
    }
    if (alla & 1) { add(d, L, "ALLA", "traff", 1, alla & 2 ? 1 : 0); if (HV.includes(L)) add(d, "HV", "ALLA", "traff", 1, alla & 2 ? 1 : 0); }
  };
  const kGrupper = new Map<string, Plats[]>();
  for (const p of platser.values()) {
    if (p.lager === "K") { const l = kGrupper.get(p.grupp) ?? []; l.push(p); kGrupper.set(p.grupp, l); continue; }
    for (const h of p.h) enhet(p.lager, h, p.st, p.seg, p.kam, p.samma >= 0 && p.st.includes(p.samma));
  }
  for (const varianter of kGrupper.values()) {
    const hs = new Set<number>(); for (const p of varianter) for (const h of p.h) hs.add(h);
    for (const h of hs) {
      const aktiva = varianter.filter((p) => p.h.has(h));
      const u3 = (f: (p: Plats) => number[]) => [...new Set(aktiva.flatMap(f))];
      enhet("K", h, u3((p) => p.st), u3((p) => p.seg), u3((p) => p.kam), false);
    }
  }

  // Basen (§6): källornas alla bedömbara enheter.
  for (let s = 0; s < nSt; s++) if (harGrip[s]) for (let h = 0; h < nH; h++) {
    if (!tackt[h] || hDag[h] < 0) continue;
    const r = fonster(h, (x) => FR[s * nH + x] & 3); if (r & 1) add(hDag[h], "-", "FR", "bas", 1, r & 2 ? 1 : 0);
  }
  for (let s = 0; s < nSeg; s++) for (let h = 0; h < nH; h++) {
    if (!tackt[h] || hDag[h] < 0) continue;
    const r = fonster(h, (x) => VL[s * nH + x] & 3); if (r & 1) add(hDag[h], "-", "VL", "bas", 1, r & 2 ? 1 : 0);
  }

  // Den relativa risken (§6): sträcka × timme, fordonskm och singelolyckor.
  const olyckor = utanDubbletter(u.olyckor);
  const segMedAdt = new Natet(u.seg.map((s) => (s.adt ? s.line : [[999, 999] as Pt])));
  const olyckaSeg = new Map<string, number>();   // seg*1e6+timme → antal
  for (const o of olyckor) {
    const s = segMedAdt.narmast(o.p, OLYCKA_SEG_KM); if (s < 0) continue;
    const k = `${s}|${Math.floor(o.t / 3_600_000)}`; olyckaSeg.set(k, (olyckaSeg.get(k) ?? 0) + 1);
  }
  const timmar = new Map<number, { dag: number; natt: boolean }>();
  for (let h = 0; h < nH; h += 1) {
    const T = Math.floor((h0 + h) * HT / 3_600_000);
    if (timmar.has(T) || hDag[h] < 0) continue;
    const a = h0 + h, hA = T * 2 - h0, hB = hA + 1;   // timmens två halvtimmar
    if (!(tackt[hA] || tackt[hB])) continue;
    const st = svensk(a * HT).timme;
    timmar.set(T, { dag: hDag[h], natt: st >= 22 || st < 6 });
  }
  for (let s = 0; s < nSeg; s++) {
    const g = u.seg[s]; if (!g.adt) continue;
    const km = langdKm(g.line);
    for (const [T, { dag, natt }] of timmar) {
      const fkm = (natt ? (g.adt * g.natt) / 8 : (g.adt * (1 - g.natt)) / 16) * km;
      const oly = olyckaSeg.get(`${s}|${T}`) ?? 0, hA = T * 2 - h0, hB = hA + 1;
      let hv = false;
      for (const L of ["A1", "A2", "K", "J1"] as Lager[]) {
        if (!(pa[L][hA] || pa[L][hB])) continue;
        const m = nara[L].seg.get(s), v = !!m && (m.has(hA) || m.has(hB));
        add(dag, L, "OL", v ? "risk_varn" : "risk_utan", fkm, oly);
        if (v && L !== "J1") hv = true;
      }
      add(dag, "HV", "OL", hv ? "risk_varn" : "risk_utan", fkm, oly);
    }
  }
  // R per punkttimme (§6): de varnande punkterna i timmen, och singelolyckorna vid närmaste småvägspunkt inom 0,5 km.
  if (u.smvPunkter.length) {
    const rNat = new Natet(u.smvPunkter.map((p) => [p]));
    const varnar = new Map<number, Set<string>>();
    for (const p of platser.values()) if (p.lager === "R") for (const h of p.h) { const T = Math.floor((h0 + h) * HT / 3_600_000); const m = varnar.get(T) ?? new Set(); m.add(p.grupp); varnar.set(T, m); }
    const olyckaR = new Map<number, string[]>();
    for (const o of olyckor) {
      const i = rNat.narmast(o.p, OLYCKA_SMV_KM); if (i < 0) continue;
      const T = Math.floor(o.t / 3_600_000), l = olyckaR.get(T) ?? []; l.push(`${u.smvPunkter[i][0]},${u.smvPunkter[i][1]}`); olyckaR.set(T, l);
    }
    for (const [T, { dag }] of timmar) {
      const hA = T * 2 - h0; if (!(pa.R[hA] || pa.R[hA + 1])) continue;
      const v = varnar.get(T) ?? new Set<string>(), ol = olyckaR.get(T) ?? [];
      const ov = ol.filter((x) => v.has(x)).length;
      add(dag, "R", "OL", "risk_varn", v.size, ov);
      add(dag, "R", "OL", "risk_utan", u.smvPunkter.length - v.size, ol.length - ov);
    }
  }
  // Underlaget per dygn: versionerna och friktionens stationer, så att en tom dag syns.
  for (const v of vs) { const h = ix(v.g); if (h >= 0 && h < nH) add(hDag[h], "-", "LF", "underlag", 1, 0); }
  for (let s = 0; s < nSt; s++) if (harGrip[s]) { const sett = new Set<number>(); for (let h = 0; h < nH; h++) if (FR[s * nH + h] & 1 && hDag[h] >= 0) sett.add(hDag[h]); for (const d of sett) add(d, "-", "FR", "underlag", 1, 0); }
  return [...ut.values()];
}

// ── Inläsningen ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** En version av lägesfilen → det som varnade (§2). `smv` slår upp småvägsfilen på sin kontrollsumma. */
export function lasVersion(d: any, smv: (sha: string) => Pt[] | null): Version {
  const r = (() => {
    const b = d.smavag; if (!b || typeof b.bitar !== "string") return null;
    const pts = smv(b.fil); if (!pts || pts.length !== b.n) return null;
    const bytes = Buffer.from(b.bitar, "base64"); if (bytes.length !== Math.ceil(b.n / 8)) return null;
    const ut: Pt[] = []; for (let i = 0; i < b.n; i++) if ((bytes[i >> 3] >> (i & 7)) & 1) ut.push(pts[i]);
    return ut;
  })();
  return {
    g: Date.parse(d.generated_at),
    a1: (d.segments ?? []).map((s: any) => ({ id: String(s.id), line: s.line })),
    a2: (d.weather ?? []).filter((w: any) => w.yta != null && w.yta <= A2_YTA && w.fukt === true).map((w: any) => ({ id: String(w.id), p: [w.lon, w.lat] as Pt })),
    k: Array.isArray(d.kandidat) ? d.kandidat.map((e: any) => ({ id: String(e.id), pts: e.punkter })) : null,
    r,
  };
}

function git(karta: string, ...a: string[]): Buffer { return execFileSync("git", ["-C", karta, ...a], { maxBuffer: 1 << 28 }); }

export function lasKartan(karta: string, fran: number, till: number): { versioner: Version[]; smv: Pt[] } {
  const smvFiler = new Map<string, Pt[]>(); let senaste: Pt[] = [];
  for (const rad of git(karta, "log", "--format=%H", "--", "data/app/v1/smavag.json").toString().split("\n").filter(Boolean)) {
    const b = git(karta, "show", `${rad}:data/app/v1/smavag.json`);
    const sha = createHash("sha256").update(b).digest("hex");
    if (!smvFiler.has(sha)) { const pts = JSON.parse(b.toString()).punkter as Pt[]; smvFiler.set(sha, pts); if (!senaste.length) senaste = pts; }
  }
  const revs = git(karta, "log", "--format=%H %cI", `--since=${new Date(fran - 3_600_000).toISOString()}`, `--until=${new Date(till).toISOString()}`, "--", "data/app/v1/live.json")
    .toString().split("\n").filter(Boolean).map((l) => l.split(" ")[0]);
  const versioner: Version[] = [];
  for (const h of revs) {
    try { versioner.push(lasVersion(JSON.parse(git(karta, "show", `${h}:data/app/v1/live.json`).toString()), (s) => smvFiler.get(s) ?? null)); }
    catch { /* en trasig version räknas som en lucka */ }
  }
  return { versioner: versioner.filter((v) => v.g >= fran - 3_600_000 && v.g <= till), smv: senaste };
}

/** Ett arkivdygn ur hinken: rubrikrad med kolumnerna, sedan en JSON-lista per rad (sql/034). */
export function lasArkivdygn(text: string, ut: (v: Vader) => void): void {
  const rader = text.split("\n"); const hdr: string[] = JSON.parse(rader[0]);
  const i = (k: string) => hdr.indexOf(k);
  const [is, it, iy, il, ig, ix, iy2] = [i("station_id"), i("sample_time"), i("surface_temp_c"), i("air_temp_c"), i("surface_grip"), i("lon"), i("lat")];
  for (let n = 1; n < rader.length; n++) {
    if (!rader[n]) continue;
    const r = JSON.parse(rader[n]);
    ut({ st: String(r[is]), t: Date.parse(r[it]), p: [Number(r[ix]), Number(r[iy2])], yta: r[iy] == null ? null : Number(r[iy]),
         luft: r[il] == null ? null : Number(r[il]), grip: ig < 0 || r[ig] == null ? null : Number(r[ig]) });
  }
}

// F1 med säsongsfacits ord (sql/099, sql/141): kod 2 eller högre eller ett halkord; en raderad rad är inte hal.
const F1_SQL = `coalesce(NOT c.deleted AND (c.condition_code >= 2 OR EXISTS (SELECT 1 FROM unnest(c.condition_info) i
  WHERE i ~* '(^|[^a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)' OR i ~* '(snö|frost)')), false)`;

async function huvud(): Promise<void> {
  const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
  const karta = arg("--karta"), fran = arg("--fran"), till = arg("--till");
  if (!karta || !fran || !till || !process.env.DATABASE_URL) throw new Error("--karta, --fran, --till och DATABASE_URL krävs");
  const dagar: string[] = [];
  for (let t = Date.parse(`${fran}T12:00:00Z`); t <= Date.parse(`${till}T12:00:00Z`); t += 86_400_000) dagar.push(new Date(t).toISOString().slice(0, 10));
  const T0 = dygnStart(dagar[0]) - 3 * 3_600_000, T1 = dygnStart(dagar[dagar.length - 1]) + 27 * 3_600_000;
  const { default: pg } = await import("pg");
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL }); await db.connect();
  await db.query("SET TimeZone = 'UTC'");
  try {
    const { versioner, smv } = lasKartan(karta, T0, T1);
    // Väderraderna: dygnen som är exporterade ur hinken, resten ur driften (som scripts/tillfalliga-arkivet.ts).
    const utcDagar: string[] = [];
    for (let t = Math.floor(T0 / 86_400_000) * 86_400_000; t < T1; t += 86_400_000) utcDagar.push(new Date(t).toISOString().slice(0, 10));
    const exp = new Set((await db.query("SELECT dag::text AS d FROM arkiv_export")).rows.map((r: any) => r.d));
    const stationer: Stationer = new Map();
    const in_ = (v: Vader) => { if (v.t >= T0 && v.t < T1) samla(stationer, v); };
    const hink = utcDagar.filter((d) => exp.has(d));
    for (let i = 0; i < hink.length; i += 60) {
      if (!process.env.FN || !process.env.KEY) throw new Error("dygn i hinken men ingen arkivdump (FN, KEY)");
      const r = await fetch(`${process.env.FN}?lage=dygn_hamta`, { method: "POST", headers: { "x-halkvakt-key": process.env.KEY, "Content-Type": "application/json" }, body: JSON.stringify({ dagar: hink.slice(i, i + 60) }) });
      if (!r.ok) throw new Error(`arkivdumpen svarade ${r.status}`);
      for (const f of (await r.json()).filer as { dag: string; url: string }[]) {
        const b = await fetch(f.url); if (!b.ok) throw new Error(`dygnsfilen ${f.dag} svarade ${b.status}`);
        lasArkivdygn(gunzipSync(Buffer.from(await b.arrayBuffer())).toString(), in_);
      }
    }
    for (const d of utcDagar.filter((x) => !exp.has(x))) {
      const a = Math.max(T0, Date.parse(`${d}T00:00:00Z`)), b = Math.min(T1, Date.parse(`${d}T00:00:00Z`) + 86_400_000);
      const r = await db.query(`SELECT station_id, extract(epoch FROM sample_time) * 1000 AS t, ST_X(geom) AS x, ST_Y(geom) AS y, surface_temp_c AS yta, air_temp_c AS luft, surface_grip AS grip
        FROM weather_observations WHERE sample_time >= to_timestamp($1 / 1000.0) AND sample_time < to_timestamp($2 / 1000.0)`, [a, b]);
      for (const x of r.rows) in_({ st: String(x.station_id), t: Number(x.t), p: [Number(x.x), Number(x.y)], yta: x.yta == null ? null : Number(x.yta), luft: x.luft == null ? null : Number(x.luft), grip: x.grip == null ? null : Number(x.grip) });
    }
    const vaglag = (await db.query(`SELECT c.segment_id, extract(epoch FROM c.modified_time) * 1000 AS t, c.deleted, ${F1_SQL} AS f1
      FROM road_condition_history c WHERE c.modified_time < to_timestamp($1 / 1000.0)`, [T1])).rows
      .map((x: any) => ({ seg: String(x.segment_id), t: Number(x.t), f1: !!x.f1, borta: !!x.deleted }));
    const bilder = (await db.query(`SELECT bild, kamera_id, lon, lat, extract(epoch FROM bild_tid) * 1000 AS t, klass FROM kamerafacit
      WHERE bild NOT LIKE 'docs/%' AND bild_tid >= to_timestamp($1 / 1000.0) AND bild_tid < to_timestamp($2 / 1000.0)`, [T0, T1])).rows
      .map((x: any) => ({ bild: x.bild, kamera: kameraId(x.bild), p: [Number(x.lon), Number(x.lat)] as Pt, t: Number(x.t), klass: x.klass }));
    const olyckor = (await db.query(`SELECT extract(epoch FROM start_time) * 1000 AS t, ST_X(geom) AS x, ST_Y(geom) AS y FROM situation_archive
      WHERE message_type_value = 'Accident' AND geom IS NOT NULL AND olycksart(message) = 'ett fordon'
        AND start_time >= to_timestamp($1 / 1000.0) AND start_time < to_timestamp($2 / 1000.0)`, [T0, T1])).rows
      .map((x: any) => ({ t: Number(x.t), p: [Number(x.x), Number(x.y)] as Pt }));
    const adt = new Map((JSON.parse(readFileSync(new URL("../data/vagdata/segment.json", import.meta.url), "utf8")).rader as any[]).map((r) => [String(r.id), r]));
    const seg: Seg[] = (JSON.parse(readFileSync(join(karta, "data/vaglag.geojson"), "utf8")).features as any[]).map((f) => {
      const a = adt.get(String(f.properties.segment_id)), A = a?.adt_fordon ?? null, lb = a?.adt_lastbilar ?? 0, n = a?.adt_latta_22_06;
      const natt = A && n != null && A > lb ? Math.min(1, (n * A) / (A - lb) / A) : NATT_SAKNAS;
      return { id: String(f.properties.segment_id), line: f.geometry.coordinates as Pt[], adt: A, natt };
    });
    const rader = rakna({ dagar, versioner, stationer, vaglag, bilder, olyckor, seg, smvPunkter: smv });
    await db.query("BEGIN");
    await db.query("DELETE FROM kvalitet_dag WHERE dag = ANY($1::date[])", [dagar]);
    for (let i = 0; i < rader.length; i += 2000) {
      const b = rader.slice(i, i + 2000);
      await db.query(`INSERT INTO kvalitet_dag (dag, lager, kalla, matt, n, k) SELECT * FROM unnest($1::date[], $2::text[], $3::text[], $4::text[], $5::float8[], $6::float8[])`,
        [b.map((r) => r.dag), b.map((r) => r.lager), b.map((r) => r.kalla), b.map((r) => r.matt), b.map((r) => r.n), b.map((r) => r.k)]);
    }
    await db.query("COMMIT");
    console.log(`klart: ${dagar.length} dygn räknade (${dagar[0]} – ${dagar[dagar.length - 1]})`);
  } catch (e) {
    await db.query("ROLLBACK").catch(() => {});
    throw e;
  } finally { await db.end(); }
}

// ── Självtestet: påhittade data, inga tal ur driften ─────────────────────────────────────────────────────────────────────────
function sjalvtest(): boolean {
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    const lika = JSON.stringify(fick) === JSON.stringify(vantat); if (!lika) ok = false;
    console.log(`  ${lika ? "ok" : "FEL"}: ${namn}${lika ? "" : ` — fick ${JSON.stringify(fick)}, väntat ${JSON.stringify(vantat)}`}`);
  };
  console.log("SJÄLVTEST — kvalitetstavlan (kort #682)\n");
  k("kamerans id ur v2", kameraId("v2/2026-11-27/SE_STA_CAMERA_VViS_1007_K1-h498823.jpg"), "SE_STA_CAMERA_VViS_1007_K1");
  k("kamerans id ur skuggans dagsmapp", kameraId("2026-11-27/SE_STA_CAMERA_VViS_203_K1-166275.jpg"), "SE_STA_CAMERA_VViS_203_K1");
  const ids = Array.from({ length: 758 }, (_, i) => `SE_STA_CAMERA_VViS_${i}_K1`), oppna = ids.filter(oppenHalva).length;
  k("halvorna är ungefär lika stora (påhittade id)", oppna > 320 && oppna < 440, true);
  k("delningen är fast", oppenHalva("SE_STA_CAMERA_VViS_1007_K1") === oppenHalva("SE_STA_CAMERA_VViS_1007_K1"), true);
  k("svensk tid vintertid", svensk(Date.parse("2026-11-27T23:30:00Z")), { dag: "2026-11-28", timme: 0 });
  k("dygnets början", new Date(dygnStart("2026-11-27")).toISOString(), "2026-11-26T23:00:00.000Z");
  k("radvakten", [giltigYta({ surface_temp_c: -1, air_temp_c: 5 }), giltigYta({ surface_temp_c: -10, air_temp_c: 5 })], [true, false]);
  k("dubbletterna", utanDubbletter([{ t: 0, p: [15, 60] }, { t: 3_600_000, p: [15.005, 60] }, { t: 3 * 3_600_000, p: [15, 60] }]).length, 2);
  const bitar = Buffer.from([0b101]).toString("base64");
  k("småvägsbitarna", lasVersion({ generated_at: "2026-11-26T00:00:00Z", smavag: { fil: "x", n: 3, bitar } }, () => [[1, 1], [2, 2], [3, 3]]).r, [[1, 1], [3, 3]]);
  k("A2 kräver fukt och högst +1", lasVersion({ generated_at: "2026-11-26T00:00:00Z", weather: [{ id: "1", lon: 15, lat: 60, yta: 0.5, fukt: true }, { id: "2", lon: 15, lat: 60, yta: 0.5, fukt: false }, { id: "3", lon: 15, lat: 60, yta: 1.5, fukt: true }] }, () => null).a2.map((x) => x.id), ["1"]);

  // En påhittad natt: station S (friktion) hal 02.00–02.30 UTC; A2 vid S från 01.00; K 3 km bort; en väglagssträcka genom S.
  const dag = "2026-11-26", t = (hhmm: string) => Date.parse(`${dag}T${hhmm}:00Z`);
  const S: Pt = [15, 60], K3: Pt = [15.054, 60];
  const versioner: Version[] = [];
  for (let m = t("00:00"); m < t("06:00"); m += 600_000)
    versioner.push({ g: m, a1: [], a2: m >= t("01:00") ? [{ id: "S", p: S }] : [], k: [{ id: "x", pts: [K3] }], r: null });
  const stationer: Stationer = new Map();
  for (let m = t("00:00"); m < t("06:00"); m += 600_000) samla(stationer, { st: "S", t: m, p: S, yta: -1, luft: 0, grip: m >= t("02:00") && m < t("02:30") ? 0.2 : 0.6 });
  const seg: Seg[] = [{ id: "G", line: [[14.99, 60], [15.01, 60]], adt: 2400, natt: 0.05 }];
  const vaglag: Vaglag[] = [{ seg: "G", t: t("00:00") - 3_600_000, f1: false, borta: false }, { seg: "G", t: t("03:00"), f1: true, borta: false }];
  const rr = rakna({ dagar: [dag], versioner, stationer, vaglag, bilder: [], olyckor: [{ t: t("03:10"), p: [15, 60.0003] }], seg, smvPunkter: [] });
  const r = (l: string, q: string, m: string) => { const x = rr.find((y) => y.lager === l && y.kalla === q && y.matt === m); return x ? [x.n, x.k] : null; };
  k("täckning: A2 vid stationen täcker den hala halvtimmen", r("A2", "FR", "tackning"), [1, 1]);
  k("täckning: K 3 km bort täcker inte", r("K", "FR", "tackning"), [1, 0]);
  k("täckning: Halkvakt", r("HV", "FR", "tackning"), [1, 1]);
  k("täckning: J1 (luften 0 °C vid stationen)", r("J1", "FR", "tackning"), [1, 1]);
  k("träffsäkerhet: A2 mot friktionen, 11 halvtimmar (den sista versionen gäller 20 min in i 06.00) varav 5 inom fönstret", r("A2", "FR", "traff"), [11, 5]);
  k("träffsäkerhet: samma station märkt", r("A2", "FR", "traff_samma"), [11, 5]);
  k("träffsäkerhet: K har ingen friktion inom 2 km", r("K", "FR", "traff"), null);
  k("basen: friktionens 13 halvtimmar, 7 med halka i fönstret", r("-", "FR", "bas"), [13, 7]);
  k("relativ risk: olyckan under A2 på sträckan", r("A2", "OL", "risk_varn")?.[1], 1);
  k("relativ risk: fordonskm under A2 (fyra nattimmar och två dagtimmar)", Math.round((r("A2", "OL", "risk_varn")?.[0] ?? 0) * 1000), Math.round((4 * (2400 * 0.05 / 8) + 2 * 2400 * 0.95 / 16) * langdKm(seg[0].line) * 1000));
  k("relativ risk: A1 tyst hela natten", r("A1", "OL", "risk_utan")?.[1], 1);
  k("väglaget: Halkvakt utom A1 täcker väglagets halka från 02.30 med A2 (8 halvtimmar)", r("HV", "VL", "tackning"), [8, 8]);
  return ok;
}

if (process.argv.includes("--sjalvtest")) process.exit(sjalvtest() ? 0 : 1);
else if (import.meta.url === `file://${process.argv[1]}`) huvud().catch((e) => { console.error(`fel: ${e instanceof Error ? e.message.split("\n")[0] : "okänt"}`); process.exit(1); });
