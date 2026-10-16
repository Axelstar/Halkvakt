// KUVÖSENS FACIT UR TRAFIKVERKETS VÄGLAG 2024/25 (DECISIONS #591, docs/FORREGISTRERING-FACIT-TRV-2024-25.md). Läsningen följer
// förregistreringen rad för rad: is är kod 60, 61, 70 och 71 i kod 1 eller kod 2; väglaget gäller från sin ändring till sträckans
// nästa; en station hör till sträckorna inom 2 km från deras linje; kandidaten bekräftas inom [t − 1, t + 2] h och efterhalkan inom
// [t, t + 6] h; en miss är en is-episod utan kandidatens kalla timme hos någon av sträckans stationer under de 2 h före, klassad mot
// den närmaste stationens nederbörd inom ±1 h; åtgärderna (20 och 50) räknas inom [t − 6, t + 6] h. Allt redovisas per månad och
// breddgradsband, bara som antal och andelar. Hela regeln (driftens sql/058) räknas bredvid kandidaten vid timmens slut: Trafikverkets rader skrivs aldrig ut (PUBLIKT REPO). Läsningen (`lasning`) körs i
// kuvösen av scripts/matningar/kuvos-blandning-vagb-facit-trv-2026-10-16.ts och vägrar utan båda signaturerna i förregistreringen.
//
//   node --experimental-strip-types kuvos/facit-trv.ts --sjalvtest
//   node --experimental-strip-types kuvos/facit-trv.ts --signerad <förregistreringen>     (kuvos.yml, före fysikkedjan)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { haversineM } from "../engine/src/geo.ts";

export const IS = new Set([60, 61, 70, 71]);
export const SNO = new Set([30, 31, 40, 41, 50, 51, 100, 101]);
export const PAR_M = 2000;
export const KALL_C = 0;               // en kall timme: yta ≤ 0 °C (§4), kandidatens och stationens egen
export const KANDIDAT_FONSTER_H: [number, number] = [-1, 2];
export const EFTERHALKA_FONSTER_H: [number, number] = [0, 6];
export const MISS_FORE_H = 2;
export const NEDERBORD_H = 1;
export const ATGARD_FONSTER_H: [number, number] = [-6, 6];
export const ATGARD_TYPER = new Set([20, 50]);
// Hela regeln (§4 a, DECISIONS #562–#575, #593), som driftens kandidat_regel() i sql/058 — kontraktsgrinden vaktar kopiorna.
export const VAT = new Set([20]);      // Våt i kod 1 eller kod 2; fläckvis (21) räknas inte (#573: "nej till fläckvis")
export const RADAR_MMH = 0.5;          // fukt: radarns medel på någon av stationens sträckor (#565)
export const RADAR_MIN = 60;
export const VETO_M = 15000;           // veto: en station inom 15 km, stationen själv medräknad (#566)
export const VETO_MIN = 45;
export const VETO_YTA_C = 2;
export const SPRIDNING_X_C = 2.25;     // spridningsgrinden där minst två ankare bidrar (#575)
const K_NEIGHBOURS = 5;                // RÅ:s ankare, som grind A och fysik/live/kandidat_timme.py
const MAX_KM = 50;
export const PERIOD_START = Date.parse("2024-11-01T00:00:00+01:00");
export const PERIOD_SLUT = Date.parse("2025-04-01T00:00:00+02:00");
const H = 3_600_000;

// --- xlsx med standardbiblioteket: zipens centralkatalog, delade strängar och första bladet ---
function zipFiler(buf: Buffer): Map<string, Buffer> {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error("ingen zip");
  const antal = buf.readUInt16LE(e + 10); let p = buf.readUInt32LE(e + 16);
  const ut = new Map<string, Buffer>();
  for (let i = 0; i < antal; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("trasig centralkatalog");
    const metod = buf.readUInt16LE(p + 10), storlek = buf.readUInt32LE(p + 20);
    const nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), kl = buf.readUInt16LE(p + 32), lokal = buf.readUInt32LE(p + 42);
    const namn = buf.toString("utf8", p + 46, p + 46 + nl);
    const start = lokal + 30 + buf.readUInt16LE(lokal + 26) + buf.readUInt16LE(lokal + 28);
    const data = buf.subarray(start, start + storlek);
    ut.set(namn, metod === 8 ? inflateRawSync(data) : Buffer.from(data));
    p += 46 + nl + xl + kl;
  }
  return ut;
}
const avkoda = (s: string) => s.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (_, k: string) =>
  k === "amp" ? "&" : k === "lt" ? "<" : k === "gt" ? ">" : k === "quot" ? '"' : k === "apos" ? "'" :
  String.fromCodePoint(k[1] === "x" || k[1] === "X" ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10)));
const kolumn = (ref: string) => [...ref].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

/** Första bladet som rubrik och rader. Tomma celler blir "". */
export function lasXlsx(buf: Buffer): { kolumner: string[]; rader: string[][] } {
  const z = zipFiler(buf);
  const delade = [...(z.get("xl/sharedStrings.xml")?.toString("utf8") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map((m) => avkoda([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
  const blad = z.get("xl/worksheets/sheet1.xml")?.toString("utf8");
  if (!blad) throw new Error("bladet sheet1 saknas");
  const rader: string[][] = [];
  for (const r of blad.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const rad: string[] = [];
    for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const v = c[3]?.match(/<v>([\s\S]*?)<\/v>/)?.[1], inl = c[3]?.match(/<is>([\s\S]*?)<\/is>/)?.[1];
      rad[kolumn(c[1])] = v !== undefined ? (/t="s"/.test(c[2]) ? delade[Number(v)] : avkoda(v))
        : inl !== undefined ? avkoda([...inl.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")) : "";
    }
    rader.push(Array.from(rad, (x) => x ?? ""));
  }
  const [kolumner, ...rest] = rader;
  return { kolumner, rader: rest };
}

// --- tidszonen (förregistreringen §3) ---
/** Saknar timmen 02 natten till 30/3 2025 ändringar, men timmarna runt har dem, är stämplarna svensk lokaltid. */
export function tidszonsprov(stamplar: string[]): { lage: "lokal" | "utc" | "oklart"; i02: number; runt: number } {
  let i02 = 0, runt = 0;
  for (const s of stamplar) {
    if (!s.startsWith("2025-03-30 0")) continue;
    const h = Number(s.slice(11, 13));
    if (h === 2) i02++; else if (h >= 0 && h <= 4) runt++;
  }
  return { lage: runt === 0 ? "oklart" : i02 === 0 ? "lokal" : "utc", i02, runt };
}
/** Sista söndagen i månaden kl. 01:00 UTC (EU:s sommartid). */
const omstallning = (ar: number, man: number) => { const d = new Date(Date.UTC(ar, man + 1, 0, 1)); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.getTime(); };
/** "ÅÅÅÅ-MM-DD hh:mm:ss[.fff]" i svensk lokaltid (eller UTC) till millisekunder UTC; "NULL" och tomt blir null. */
export function tid(s: string, lage: "lokal" | "utc"): number | null {
  if (!s || s === "NULL") return null;
  const naiv = Date.parse(s.replace(" ", "T") + "Z");
  if (Number.isNaN(naiv)) return null;
  if (lage === "utc") return naiv;
  const ar = new Date(naiv).getUTCFullYear();
  const sommar = (t: number) => t >= omstallning(ar, 2) && t < omstallning(ar, 9);
  const vinter = naiv - H;
  return sommar(vinter) ? naiv - 2 * H : vinter;
}

// --- väglaget som episoder (§2) ---
export type Andring = { seg: string; t: number; kod1: number; kod2: number | null };
/** Sammanhängande tider med en kod ur `koder` i kod 1 eller kod 2, per sträcka; ett väglag gäller till sträckans nästa ändring. */
export function episoder(andringar: Andring[], koder: Set<number>, slut = PERIOD_SLUT): Map<string, [number, number][]> {
  const per = new Map<string, Andring[]>();
  for (const a of andringar) (per.get(a.seg) ?? per.set(a.seg, []).get(a.seg)!).push(a);
  const ut = new Map<string, [number, number][]>();
  for (const [seg, rad] of per) {
    rad.sort((x, y) => x.t - y.t);
    const ep: [number, number][] = []; let start: number | null = null;
    for (const a of rad) {
      const pa = koder.has(a.kod1) || (a.kod2 !== null && koder.has(a.kod2));
      if (pa && start === null) start = a.t;
      if (!pa && start !== null) { ep.push([start, a.t]); start = null; }
    }
    if (start !== null) ep.push([start, slut]);
    ut.set(seg, ep);
  }
  return ut;
}
const overlappar = (ep: [number, number][] | undefined, fran: number, till: number) => !!ep?.some(([a, b]) => a <= till && b >= fran);

// --- parningen station och sträcka (§3) ---
const R = 6_371_000, RAD = Math.PI / 180;
function tillStracka(p: [number, number], a: [number, number], b: [number, number]): number {
  const k = Math.cos(p[1] * RAD) * R * RAD, m = R * RAD;
  const ax = (a[0] - p[0]) * k, ay = (a[1] - p[1]) * m, bx = (b[0] - p[0]) * k, by = (b[1] - p[1]) * m;
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  const t = L === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L));
  return Math.hypot(ax + t * dx, ay + t * dy);
}
/** Varje station och sträckorna vars linje ligger inom `maxM`. */
export function parning(stationer: { id: string; lon: number; lat: number }[], linjer: { id: string; delar: [number, number][][] }[],
  maxM = PAR_M): Map<string, string[]> {
  const ut = new Map<string, string[]>();
  for (const s of stationer) {
    const p: [number, number] = [s.lon, s.lat], nara: string[] = [];
    for (const l of linjer) {
      let d = Infinity;
      for (const del of l.delar) for (let i = 0; i < del.length - 1 && d > maxM; i++) d = Math.min(d, tillStracka(p, del[i], del[i + 1]));
      if (d <= maxM) nara.push(l.id);
    }
    ut.set(s.id, nara);
  }
  return ut;
}
/** För varje sträcka den av dess parade stationer som ligger närmast linjen: missens nederbördsvittne (TROSKLAR-SKUGGAN §2). */
export function narmaste(par: Map<string, string[]>, stationer: { id: string; lon: number; lat: number }[],
  linjer: { id: string; delar: [number, number][][] }[]): Map<string, string> {
  const pos = new Map(stationer.map((s) => [s.id, [s.lon, s.lat] as [number, number]])), lin = new Map(linjer.map((l) => [l.id, l.delar]));
  const ut = new Map<string, [string, number]>();
  for (const [st, segs] of par) for (const seg of segs) {
    let d = Infinity;
    for (const del of lin.get(seg)!) for (let i = 0; i < del.length - 1; i++) d = Math.min(d, tillStracka(pos.get(st)!, del[i], del[i + 1]));
    const f = ut.get(seg);
    if (!f || d < f[1]) ut.set(seg, [st, d]);
  }
  return new Map([...ut].map(([seg, [st]]) => [seg, st]));
}

/** Stationerna inom `maxM` från varje station, närmast först; med `sjalv` står stationen själv först (avståndet 0). */
export function inom(stationer: { id: string; lon: number; lat: number }[], maxM: number, sjalv: boolean): Map<string, string[]> {
  const ut = new Map<string, string[]>();
  for (const a of stationer) {
    const d: [string, number][] = [];
    for (const b of stationer) {
      if (b.id === a.id && !sjalv) continue;
      const m = b.id === a.id ? 0 : haversineM(a, b);
      if (m <= maxM) d.push([b.id, m]);
    }
    ut.set(a.id, d.sort((x, y) => x[1] - y[1]).map(([id]) => id));
  }
  return ut;
}

/** Regelns indata ur kuvösen, med fönstrets slut e (ms) som nyckel: `radar` sträckorna med radarns medel ≥ RADAR_MMH inom
 *  (e − RADAR_MIN, e], `varma` stationerna med en yta över VETO_YTA_C inom (e − VETO_MIN, e] (driftens vakter), `yta` stationens
 *  uppmätta yta vid timmen (grind A:s population, halvtimmen som börjar på timmen). Väglagets Våt tas ur facit i läsningen. */
export type Regelindata = { radar: Map<string, Set<number>>; varma: Map<string, Set<number>>; yta: Map<string, Map<number, number>> };
export type Regelutfall = "varnar" | "veto" | "torr" | "spridning";
/** Driftens regel (sql/058) vid en station och dess kalla timme t, utvärderad vid e = t + 1 h: veto om en station inom 15 km mätte
 *  över +2 °C de sista 45 minuterna; annars torr utan fukt (Våt vid e eller radarn de sista 60 minuterna, på någon av stationens
 *  sträckor); annars spridning om minst två av RÅ:s ankare (de fem närmaste ANDRA stationerna inom 50 km med en yta vid timmen)
 *  skiljer SPRIDNING_X_C eller mer, avrundat till en decimal som kandidat_timme.py; annars varnar. */
export function regeln(x: Tillfalle, par: Map<string, string[]>, grannar: Map<string, string[]>, ankare: Map<string, string[]>,
  vat: Map<string, [number, number][]>, ind: Regelindata): Regelutfall {
  const e = x.t + H;
  if ((grannar.get(x.station) ?? []).some((s) => ind.varma.get(s)?.has(e))) return "veto";
  const seg = par.get(x.station) ?? [];
  if (!seg.some((s) => (vat.get(s) ?? []).some(([a, b]) => a <= e && e < b) || !!ind.radar.get(s)?.has(e))) return "torr";
  const ytor: number[] = [];
  for (const s of ankare.get(x.station) ?? []) {
    const v = ind.yta.get(s)?.get(x.t);
    if (v !== undefined) ytor.push(v);
    if (ytor.length === K_NEIGHBOURS) break;
  }
  if (ytor.length >= 2 && Math.round((Math.max(...ytor) - Math.min(...ytor)) * 10) / 10 >= SPRIDNING_X_C) return "spridning";
  return "varnar";
}

// --- måtten (§4) ---
export type Tillfalle = { station: string; t: number };
export type Rakning = { antal: number; bekraftade: number; utanStracka: number };
export const band = (lat: number) => lat < 60 ? "55–60" : lat < 64 ? "60–64" : "64–69";
export const manad = (t: number) => new Date(t).toISOString().slice(0, 7);

/** Hur många tillfällen som bekräftas av is på någon av stationens sträckor inom fönstret, per grupp (månad · band). */
export function bekrafta(tillfallen: Tillfalle[], par: Map<string, string[]>, is: Map<string, [number, number][]>,
  fonster: [number, number], grupp: (t: Tillfalle) => string): Map<string, Rakning> {
  const ut = new Map<string, Rakning>();
  for (const x of tillfallen) {
    const g = ut.get(grupp(x)) ?? ut.set(grupp(x), { antal: 0, bekraftade: 0, utanStracka: 0 }).get(grupp(x))!;
    const seg = par.get(x.station) ?? [];
    if (!seg.length) { g.utanStracka++; continue; }
    g.antal++;
    if (seg.some((s) => overlappar(is.get(s), x.t + fonster[0] * H, x.t + fonster[1] * H))) g.bekraftade++;
  }
  return ut;
}

/** Tillfällena inom facitets period; utanför finns inget väglag att bekräfta med. */
export const inomPerioden = (x: Tillfalle[]) => x.filter((y) => y.t >= PERIOD_START && y.t < PERIOD_SLUT);

/** Givarens nederbörd per station och timme (timmens början i ms): "nederbord" om någon rad i timmen bar regn, snöblandat eller
 *  snö, annars "uppehall" om någon bar uppehåll. En timme utan känt ord finns inte i kartan och är okänd. */
export type Timklass = "nederbord" | "uppehall";
/** Missens orsak (TROSKLAR-SKUGGAN §2) ur timmarna som når in i [start − 1 h, start + 1 h]: nederbörd i någon ⇒ nederbördsdriven,
 *  annars uppehåll i någon ⇒ utstrålningsdriven, annars okänd. */
export function orsak(nb: Map<number, Timklass> | undefined, start: number): "nederbord" | "utstralning" | "okand" {
  let uppehall = false;
  for (let h = Math.floor((start - NEDERBORD_H * H) / H) * H; h <= start + NEDERBORD_H * H; h += H) {
    const k = nb?.get(h);
    if (k === "nederbord") return "nederbord";
    if (k === "uppehall") uppehall = true;
  }
  return uppehall ? "utstralning" : "okand";
}

export type Missrakning = { episoder: number; missade: number; nederbord: number; utstralning: number; okand: number };
/** Is-episoder utan kandidatens kalla timme hos någon av sträckans stationer under MISS_FORE_H före starten, per grupp, varje miss
 *  klassad mot sträckans närmaste stations nederbörd. */
export function missar(is: Map<string, [number, number][]>, par: Map<string, string[]>, kalla: Tillfalle[], narmast: Map<string, string>,
  nb: Map<string, Map<number, Timklass>>, grupp: (seg: string, start: number) => string): { per: Map<string, Missrakning>; utanStation: number } {
  const stationerPa = new Map<string, string[]>();
  for (const [st, segs] of par) for (const s of segs) (stationerPa.get(s) ?? stationerPa.set(s, []).get(s)!).push(st);
  const perStation = new Map<string, number[]>();
  for (const k of kalla) (perStation.get(k.station) ?? perStation.set(k.station, []).get(k.station)!).push(k.t);
  const per = new Map<string, Missrakning>();
  let utanStation = 0;
  for (const [seg, ep] of is) for (const [start] of ep) {
    const st = stationerPa.get(seg) ?? [];
    if (!st.length) { utanStation++; continue; }
    const g = grupp(seg, start), r = per.get(g) ?? per.set(g, { episoder: 0, missade: 0, nederbord: 0, utstralning: 0, okand: 0 }).get(g)!;
    r.episoder++;
    if (st.some((s) => (perStation.get(s) ?? []).some((t) => t < start && t >= start - MISS_FORE_H * H))) continue;
    r.missade++; r[orsak(nb.get(narmast.get(seg)!), start)]++;
  }
  return { per, utanStation };
}

export type Atgard = { seg: string; typ: number; start: number | null; stopp: number | null };
/** Andelen tillfällen med planerad halkbekämpning (20 eller 50) på stationens sträckor inom ATGARD_FONSTER_H, per grupp. */
export function atgarder(tillfallen: Tillfalle[], par: Map<string, string[]>, atg: Atgard[], grupp: (t: Tillfalle) => string):
  { per: Map<string, { antal: number; med: number }>; borttagna: number } {
  const giltiga = atg.filter((a) => ATGARD_TYPER.has(a.typ) && a.start !== null && a.stopp !== null && a.start >= PERIOD_START);
  const ep = new Map<string, [number, number][]>();
  for (const a of giltiga) (ep.get(a.seg) ?? ep.set(a.seg, []).get(a.seg)!).push([a.start!, a.stopp!]);
  const per = new Map<string, { antal: number; med: number }>();
  for (const x of tillfallen) {
    const seg = par.get(x.station) ?? [];
    if (!seg.length) continue;
    const g = per.get(grupp(x)) ?? per.set(grupp(x), { antal: 0, med: 0 }).get(grupp(x))!;
    g.antal++;
    if (seg.some((s) => overlappar(ep.get(s), x.t + ATGARD_FONSTER_H[0] * H, x.t + ATGARD_FONSTER_H[1] * H))) g.med++;
  }
  return { per, borttagna: atg.length - giltiga.length };
}

/** Signaturerna i förregistreringens §8: båda raderna ska ha ett datum och en signatur. */
export function signerad(text: string): { bengt: boolean; axel: boolean } {
  const rad = (namn: string) => { const m = text.match(new RegExp(`^\\|\\s*${namn}\\s*\\|([^|]*)\\|([^|]*)\\|`, "m"));
    return !!m && m[1].trim() !== "" && m[2].trim() !== ""; };
  return { bengt: rad("Bengt"), axel: rad("Axel") };
}

// --- självtestet ---
function sjalvtest() {
  let fel = 0; const k = (ok: boolean, m: string) => { if (!ok) { fel++; console.error("✗ " + m); } else console.log("  ok: " + m); };
  const T = (s: string) => Date.parse(s);
  k(tidszonsprov(["2025-03-30 01:10:00.000", "2025-03-30 03:05:00.000"]).lage === "lokal", "tidszonen: timmen 02 saknas ⇒ lokaltid");
  k(tidszonsprov(["2025-03-30 01:10:00.000", "2025-03-30 02:05:00.000"]).lage === "utc", "tidszonen: timmen 02 finns ⇒ UTC");
  k(tidszonsprov(["2024-12-01 01:00:00.000"]).lage === "oklart", "tidszonen: utan rader den natten ⇒ oklart");
  k(tid("2024-11-01 00:40:52.173", "lokal") === T("2024-10-31T23:40:52.173Z"), "vintertid: lokaltid − 1 h");
  k(tid("2025-03-30 03:00:00.000", "lokal") === T("2025-03-30T01:00:00Z"), "sommartid efter omställningen: − 2 h");
  k(tid("2025-03-30 01:59:00.000", "lokal") === T("2025-03-30T00:59:00Z"), "sista minuten vintertid: − 1 h");
  k(tid("NULL", "lokal") === null && tid("", "utc") === null, "NULL och tomt blir null");
  const a = (seg: string, t: string, k1: number, k2: number | null = null): Andring => ({ seg, t: T(t), kod1: k1, kod2: k2 });
  const ep = episoder([a("S", "2024-12-01T02:00Z", 10), a("S", "2024-12-01T03:00Z", 61), a("S", "2024-12-01T05:00Z", 20, 71),
    a("S", "2024-12-01T06:00Z", 20), a("S", "2024-12-02T00:00Z", 70)], IS, T("2025-04-01T00:00Z"));
  k(JSON.stringify(ep.get("S")) === JSON.stringify([[T("2024-12-01T03:00Z"), T("2024-12-01T06:00Z")], [T("2024-12-02T00:00Z"), T("2025-04-01T00:00Z")]]),
    "is-episoderna: fläckvis is och kod 2 räknas, väglaget gäller till nästa ändring, sista episoden till periodens slut");
  k((episoder([a("Q", "2024-12-01T02:00Z", 100), a("Q", "2024-12-01T03:00Z", 10)], IS).get("Q") ?? []).length === 0, "lössnö är inte is");
  // En nord–sydlig linje vid lon 15; stationer 1,9 och 2,1 km österut (en longitudgrad vid 60° ≈ 55,8 km).
  const linjer = [{ id: "S", delar: [[[15, 59.9], [15, 60.1]] as [number, number][]] }];
  const p = parning([{ id: "nara", lon: 15 + 1.9 / 55.8, lat: 60 }, { id: "langt", lon: 15 + 2.1 / 55.8, lat: 60 }], linjer);
  k(p.get("nara")!.length === 1 && p.get("langt")!.length === 0, `parningen: 1,9 km med, 2,1 km utanför (${JSON.stringify([...p])})`);
  const grupp = () => "g";
  const b = bekrafta([{ station: "nara", t: T("2024-12-01T02:30Z") }, { station: "nara", t: T("2024-12-01T07:30Z") },
    { station: "nara", t: T("2024-12-01T01:00Z") }, { station: "langt", t: T("2024-12-01T04:00Z") }], p, ep, KANDIDAT_FONSTER_H, grupp).get("g")!;
  k(b.antal === 3 && b.bekraftade === 2 && b.utanStracka === 1,
    `bekräftelsen [t − 1, t + 2] h, gränserna inräknade: 02:30 och 01:00 bekräftas av isen från 03:00, 07:30 inte (isen slutade 06:00), stationen 2,1 km bort saknar sträcka ${JSON.stringify(b)}`);
  const st2 = [{ id: "nara", lon: 15 + 1.9 / 55.8, lat: 60 }, { id: "narmre", lon: 15 + 0.5 / 55.8, lat: 60 }];
  const nm = narmaste(parning(st2, linjer), st2, linjer);
  k(nm.get("S") === "narmre", `närmaste stationen: 0,5 km före 1,9 km (${JSON.stringify([...nm])})`);
  const narmast = new Map([["S", "nara"]]), mg = (seg: string, start: number) => manad(start);
  const nbFor = (h: [string, Timklass][]) => new Map([["nara", new Map(h.map(([t, kl]) => [T(t), kl]))]]);
  const m = missar(ep, p, [{ station: "nara", t: T("2024-12-01T01:30Z") }], narmast, nbFor([["2024-12-01T23:00Z", "uppehall"]]), mg);
  const m12 = m.per.get("2024-12")!;
  k(m12.episoder === 2 && m12.missade === 1 && m12.utstralning === 1 && m.utanStation === 0,
    `missarna: episoden 03:00 sedd 01:30, episoden 2/12 00:00 missad och utstrålningsdriven (uppehåll timmen 23) ${JSON.stringify([...m.per])}`);
  const m2 = missar(ep, p, [{ station: "nara", t: T("2024-12-01T01:30Z") }], narmast,
    nbFor([["2024-12-01T23:00Z", "uppehall"], ["2024-12-02T01:00Z", "nederbord"]]), mg).per.get("2024-12")!;
  k(m2.nederbord === 1 && m2.utstralning === 0, `missens orsak: nederbörd timmen 01 (start + 1 h) går före uppehållet ${JSON.stringify(m2)}`);
  const m3 = missar(ep, p, [{ station: "nara", t: T("2024-12-01T01:30Z") }], narmast,
    nbFor([["2024-12-01T22:00Z", "nederbord"], ["2024-12-02T02:00Z", "nederbord"]]), mg).per.get("2024-12")!;
  k(m3.okand === 1, `missens orsak: timmarna 22 och 02 når inte in i [start − 1, start + 1] h ⇒ okänd ${JSON.stringify(m3)}`);
  k(inomPerioden([{ station: "a", t: T("2024-10-31T22:59Z") }, { station: "a", t: T("2024-10-31T23:00Z") }, { station: "a", t: T("2025-03-31T21:59Z") },
    { station: "a", t: T("2025-03-31T22:00Z") }]).length === 2, "perioden: 1/11 00:00 och 31/3 23:59 svensk tid med, minuten före och 1/4 00:00 utanför");
  const at = atgarder([{ station: "nara", t: T("2024-12-01T02:30Z") }, { station: "nara", t: T("2024-12-03T02:30Z") }], p,
    [{ seg: "S", typ: 50, start: T("2024-12-01T06:00Z"), stopp: T("2024-12-01T09:00Z") }, { seg: "S", typ: 10, start: T("2024-12-03T01:00Z"), stopp: T("2024-12-03T03:00Z") },
     { seg: "S", typ: 20, start: null, stopp: T("2024-12-03T03:00Z") }, { seg: "S", typ: 20, start: T("2008-02-03T18:00Z"), stopp: T("2008-02-05T06:00Z") }], (x) => manad(x.t));
  const at12 = at.per.get("2024-12")!;
  k(at12.antal === 2 && at12.med === 1 && at.borttagna === 3, `åtgärderna: förebyggande 6 h efter räknas, plogning inte, tomma och 2008 borttagna ${JSON.stringify([...at.per])}`);
  k(signerad("| Bengt | 2026-10-20 | BL |\n| Axel | | |").axel === false && signerad("| Bengt | 2026-10-20 | BL |\n| Axel | 2026-10-20 | AL |").axel, "signaturerna");
  // Hela regeln vid stationen "nara" (sträckan S), kall timme 4/12 06:00, utvärderad vid 07:00.
  const t6 = T("2024-12-04T06:00Z"), e7 = T("2024-12-04T07:00Z"), x6 = { station: "nara", t: t6 };
  const vatS = new Map([["S", [[T("2024-12-04T06:30Z"), T("2024-12-04T09:00Z")]] as [number, number][]]]);
  const tomt: Regelindata = { radar: new Map(), varma: new Map(), yta: new Map() };
  const gr = new Map([["nara", ["nara", "g14"]]]), ank = new Map([["nara", ["a1", "a2", "a3", "a4", "a5", "a6"]]]);
  const ytaVid = (v: [string, number][]) => new Map(v.map(([id, y]) => [id, new Map([[t6, y]])]));
  k(regeln(x6, p, gr, ank, vatS, tomt) === "varnar", "regeln: Våt vid 07:00 och inget annat ⇒ varnar");
  k(regeln(x6, p, gr, ank, new Map([["S", [[T("2024-12-04T07:00Z"), T("2024-12-04T09:00Z")]] as [number, number][]]]), tomt) === "varnar"
    && regeln(x6, p, gr, ank, new Map([["S", [[T("2024-12-04T05:00Z"), e7]] as [number, number][]]]), tomt) === "torr",
    "regeln: Våt som börjar vid e räknas, Våt som slutar vid e inte");
  k(regeln(x6, p, gr, ank, new Map(), { ...tomt, radar: new Map([["S", new Set([e7])]]) }) === "varnar"
    && regeln(x6, p, gr, ank, new Map(), { ...tomt, radar: new Map([["S", new Set([t6])]]) }) === "torr",
    "regeln: radarn i fönstret som slutar 07:00 ger fukt, fönstret som slutar 06:00 inte");
  k(regeln(x6, p, gr, ank, vatS, { ...tomt, varma: new Map([["g14", new Set([e7])]]) }) === "veto"
    && regeln(x6, p, gr, ank, vatS, { ...tomt, varma: new Map([["nara", new Set([e7])]]) }) === "veto"
    && regeln(x6, p, gr, ank, vatS, { ...tomt, varma: new Map([["g16", new Set([e7])]]) }) === "varnar",
    "regeln: en varm station inom 15 km, också stationen själv, vetar; en utanför grannlistan inte");
  k(regeln(x6, p, gr, ank, new Map(), { ...tomt, varma: new Map([["g14", new Set([e7])]]) }) === "veto",
    "regeln: vetot prövas först, som i sql/058 — en varm granne vetar också en torr timme");
  k((episoder([a("S", "2024-12-04T05:00Z", 21), a("S", "2024-12-04T08:00Z", 10, 21)], VAT).get("S") ?? []).length === 0
    && (episoder([a("S", "2024-12-04T05:00Z", 61, 20)], VAT).get("S") ?? []).length === 1,
    "Våt är kod 20 i kod 1 eller kod 2; fläckvis vått (21) räknas inte (#573)");
  k(regeln({ station: "langt", t: t6 }, p, gr, ank, vatS, { ...tomt, radar: new Map([["S", new Set([e7])]]) }) === "torr",
    "regeln: en station utan sträcka har ingen fukt");
  k(regeln(x6, p, gr, ank, vatS, { ...tomt, yta: ytaVid([["a1", -1], ["a2", 1.3]]) }) === "spridning"
    && regeln(x6, p, gr, ank, vatS, { ...tomt, yta: ytaVid([["a1", -1], ["a2", 1.2]]) }) === "varnar",
    "spridningen: 2,3 °C mellan två ankare tystar, 2,2 talar");
  k(regeln(x6, p, gr, ank, vatS, { ...tomt, yta: ytaVid([["a1", -5]]) }) === "varnar",
    "spridningen: ett ankare grindar inte");
  k(regeln(x6, p, gr, ank, vatS, { ...tomt, yta: ytaVid([["a1", 0], ["a2", 0], ["a3", 0], ["a4", 0], ["a5", 0], ["a6", 5]]) }) === "varnar",
    "spridningen: bara de fem närmaste ankarna räknas (det sjätte, +5 °C, är utanför)");
  const ino = inom([{ id: "a", lon: 15, lat: 60 }, { id: "b", lon: 15, lat: 60 + 14 / 111.2 }, { id: "c", lon: 15, lat: 60 + 16 / 111.2 }], VETO_M, true);
  k(JSON.stringify(ino.get("a")) === JSON.stringify(["a", "b"]) && JSON.stringify(inom([{ id: "a", lon: 15, lat: 60 }, { id: "b", lon: 15, lat: 60.1 }], 50_000, false).get("a")) === JSON.stringify(["b"]),
    `grannarna: 14 km med, 16 km utanför, stationen själv först med sjalv och aldrig utan (${JSON.stringify([...ino])})`);
  // Hela vägen genom en liten xlsx: zip med en okomprimerad och en komprimerad fil.
  const xlsx = provXlsx();
  const x = lasXlsx(xlsx);
  k(JSON.stringify(x.kolumner) === JSON.stringify(["ID", "RoadCondCode1", "Text"]) && x.rader.length === 2 && x.rader[0][2] === "Fläckvis isigt & fuktigt" && x.rader[1][1] === "10",
    `xlsx-läsaren: ${JSON.stringify(x)}`);
  if (fel) process.exit(1);
  console.log("SJÄLVTEST OK: facit-trv");
}

/** En minimal xlsx (zip med delade strängar och ett blad) för självtestet. */
function provXlsx(): Buffer {
  const filer: [string, string, boolean][] = [
    ["xl/sharedStrings.xml", "<sst><si><t>ID</t></si><si><t>RoadCondCode1</t></si><si><t>Text</t></si><si><t>Fläckvis isigt &amp; fuktigt</t></si></sst>", false],
    ["xl/worksheets/sheet1.xml", '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>' +
      '<row r="2"><c r="A2"><v>14020</v></c><c r="B2"><v>61</v></c><c r="C2" t="s"><v>3</v></c></row><row r="3"><c r="A3"><v>86000</v></c><c r="B3"><v>10</v></c><c r="C3"/></row></sheetData></worksheet>', true],
  ];
  const lokala: Buffer[] = [], central: Buffer[] = []; let off = 0;
  for (const [namn, text, packa] of filer) {
    const ra = Buffer.from(text, "utf8"), data = packa ? deflateRawSync(ra) : ra, n = Buffer.from(namn, "utf8");
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(packa ? 8 : 0, 8); lh.writeUInt32LE(data.length, 18);
    lh.writeUInt32LE(ra.length, 22); lh.writeUInt16LE(n.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(packa ? 8 : 0, 10); ch.writeUInt32LE(data.length, 20);
    ch.writeUInt32LE(ra.length, 24); ch.writeUInt16LE(n.length, 28); ch.writeUInt32LE(off, 42);
    lokala.push(lh, n, data); central.push(ch, n); off += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(central), eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(filer.length, 8); eocd.writeUInt16LE(filer.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(off, 16);
  return Buffer.concat([...lokala, cd, eocd]);
}

// --- den skarpa läsningen ---
/** Läsningens indata, framtagna i kuvösen (scripts/matningar/kuvos-blandning-vagb-facit-trv-2026-10-16.ts). `kandidatStationer` är
 *  stationerna där kandidaten har en skattning: bara de kan se en is-episod, så bara de räknas i missarna. */
export type Indata = {
  xlsx: string; linjer: { id: string; delar: [number, number][][] }[]; stationer: { id: string; lon: number; lat: number }[];
  kandidatStationer: Set<string>; kalla: Tillfalle[]; kandidat: Tillfalle[]; fyrningar: Tillfalle[];
  nederbord: Map<string, Map<number, Timklass>>; regel: Regelindata; forreg: string;
};
/** Väglagsnätets linjer ur vaglag.geojson, som Körflödet hämtar det. */
export const linjerUr = (gj: any): Indata["linjer"] => gj.features.map((f: any) => ({ id: String(f.properties.segment_id),
  delar: f.geometry.type === "MultiLineString" ? f.geometry.coordinates : [f.geometry.coordinates] }));
const pct = (a: number, n: number) => (n ? (100 * a / n).toFixed(1).replace(".", ",") : "–");
const summa = (m: Map<string, Rakning>): Rakning => [...m.values()].reduce((s, r) => ({ antal: s.antal + r.antal,
  bekraftade: s.bekraftade + r.bekraftade, utanStracka: s.utanStracka + r.utanStracka }), { antal: 0, bekraftade: 0, utanStracka: 0 });
const lyftet = (r: Rakning, b: Rakning) => (r.antal && b.antal && b.bekraftade ? ((r.bekraftade / r.antal) / (b.bekraftade / b.antal)).toFixed(2).replace(".", ",") : "–");

/** Hela läsningen enligt förregistreringen §4. Vägrar (exit 2) utan båda signaturerna eller med oklar tidszon. */
export function lasning(ind: Indata) {
  const sig = signerad(ind.forreg);
  if (!sig.bengt || !sig.axel) { console.error(`vägrar: förregistreringen är inte signerad av båda (Bengt ${sig.bengt}, Axel ${sig.axel})`); process.exit(2); }
  const v = lasXlsx(readFileSync(join(ind.xlsx, "RoadCondition24-25.xlsx")));
  const ki = (n: string) => v.kolumner.indexOf(n);
  const tz = tidszonsprov(v.rader.map((r) => r[ki("ModifiedTime")]));
  console.log(`tidszonen: ${tz.lage} (timmen 02 natten till 30/3 2025: ${tz.i02} ändringar, timmarna runt: ${tz.runt})`);
  if (tz.lage === "oklart") { console.error("vägrar: tidszonen går inte att avgöra"); process.exit(2); }
  const andr: Andring[] = v.rader.map((r) => ({ seg: r[ki("ID")], t: tid(r[ki("ModifiedTime")], tz.lage)!, kod1: Number(r[ki("RoadCondCode1")]),
    kod2: r[ki("RoadCondCode2")] === "NULL" || r[ki("RoadCondCode2")] === "" ? null : Number(r[ki("RoadCondCode2")]) })).filter((a) => a.t !== null);
  const is = episoder(andr, IS), sno = episoder(andr, SNO), vat = episoder(andr, VAT);
  const a = lasXlsx(readFileSync(join(ind.xlsx, "RoadConditionMeasures24-25.xlsx")));
  const ai = (n: string) => a.kolumner.indexOf(n);
  const atg: Atgard[] = a.rader.map((r) => ({ seg: r[ai("Id")], typ: Number(r[ai("MeasureType")]), start: tid(r[ai("StartTime")], tz.lage), stopp: tid(r[ai("StopTime")], tz.lage) }));
  const par = parning(ind.stationer, ind.linjer), narmast = narmaste(par, ind.stationer, ind.linjer);
  const parK = new Map([...par].filter(([s]) => ind.kandidatStationer.has(s)));
  const lat = new Map(ind.stationer.map((s) => [s.id, s.lat]));
  const grupp = (x: Tillfalle) => `${manad(x.t)} · ${lat.has(x.station) ? band(lat.get(x.station)!) : "utan läge"}`;
  console.log(`sträckor med is-episod: ${[...is.values()].filter((e) => e.length).length}; is-episoder ${[...is.values()].reduce((n, e) => n + e.length, 0)}; snö- och moddepisoder ${[...sno.values()].reduce((n, e) => n + e.length, 0)}`);
  console.log(`stationer med sträcka inom 2 km: ${[...par.values()].filter((x) => x.length).length} av ${par.size}; av kandidatens ${ind.kandidatStationer.size}: ${[...parK.values()].filter((x) => x.length).length}`);
  const [kalla, kand, fyr] = [ind.kalla, ind.kandidat, ind.fyrningar].map(inomPerioden);
  console.log(`inom perioden: kalla station-timmar ${kalla.length} av ${ind.kalla.length} · kandidatens kalla timmar ${kand.length} av ${ind.kandidat.length} · fyrningar ${fyr.length} av ${ind.fyrningar.length}`);
  const rad = (g: string, r: Rakning, b?: Rakning) => `  ${g}: ${r.bekraftade} av ${r.antal} bekräftade (${pct(r.bekraftade, r.antal)} %), utan sträcka ${r.utanStracka}` +
    (b ? ` · basnivån ${b.bekraftade} av ${b.antal} (${pct(b.bekraftade, b.antal)} %) · lyftet ${lyftet(r, b)}` : "");
  const skriv = (namn: string, m: Map<string, Rakning>, bas?: Map<string, Rakning>) => {
    console.log(`== ${namn}`);
    for (const [g, r] of [...m].sort()) console.log(rad(g, r, bas?.get(g)));
    console.log(rad("totalt", summa(m), bas && summa(bas)));
  };
  const basA = bekrafta(kalla, par, is, KANDIDAT_FONSTER_H, grupp), basB = bekrafta(kalla, par, is, EFTERHALKA_FONSTER_H, grupp);
  skriv("(a) basnivån: stationernas egna kalla timmar, [t − 1, t + 2] h", basA);
  skriv("(a) kandidaten, [t − 1, t + 2] h", bekrafta(kand, par, is, KANDIDAT_FONSTER_H, grupp), basA);
  skriv("(b) basnivån: stationernas egna kalla timmar, [t, t + 6] h", basB);
  skriv("(b) efterhalkan, [t, t + 6] h", bekrafta(fyr, par, is, EFTERHALKA_FONSTER_H, grupp), basB);
  const ms = missar(is, parK, kand, narmast, ind.nederbord, (seg, start) => `${manad(start)} · ${band(lat.get(narmast.get(seg)!)!)}`);
  const mrad = (g: string, r: Missrakning) => `  ${g}: ${r.missade} av ${r.episoder} missade (${pct(r.missade, r.episoder)} %) · nederbördsdrivna ${r.nederbord} · utstrålningsdrivna ${r.utstralning} · okänd orsak ${r.okand}`;
  const mt: Missrakning = { episoder: 0, missade: 0, nederbord: 0, utstralning: 0, okand: 0 };
  console.log("== (a) missarna: is-episoder utan kandidatens kalla timme 2 h före, orsaken ur närmaste stationens nederbörd ±1 h");
  for (const [g, r] of [...ms.per].sort()) { console.log(mrad(g, r)); for (const k of Object.keys(mt) as (keyof Missrakning)[]) mt[k] += r[k]; }
  console.log(mrad("totalt", mt) + `; ${ms.utanStation} episoder på sträckor utan kandidatens station`);
  // Hela regeln vid kandidatens kalla timmar (§4 a, #593): utfallen, och de varnande timmarna med samma mått som kandidaten.
  const grannar = inom(ind.stationer, VETO_M, true), ankare = inom(ind.stationer, MAX_KM * 1000, false);
  const utfall = kand.map((x) => regeln(x, par, grannar, ankare, vat, ind.regel));
  const perUtfall = new Map<string, Record<Regelutfall, number>>();
  kand.forEach((x, i) => { const g = perUtfall.get(grupp(x)) ?? perUtfall.set(grupp(x), { varnar: 0, veto: 0, torr: 0, spridning: 0 }).get(grupp(x))!; g[utfall[i]]++; });
  const urad = (g: string, r: Record<Regelutfall, number>) => `  ${g}: varnar ${r.varnar} · veto ${r.veto} · torr ${r.torr} · spridning ${r.spridning}`;
  const ut0: Record<Regelutfall, number> = { varnar: 0, veto: 0, torr: 0, spridning: 0 };
  console.log("== (a) hela regeln vid kandidatens kalla timmar (driftens sql/058, vid timmens slut)");
  for (const [g, r] of [...perUtfall].sort()) { console.log(urad(g, r)); for (const k of Object.keys(ut0) as Regelutfall[]) ut0[k] += r[k]; }
  console.log(urad("totalt", ut0));
  const regelV = kand.filter((_, i) => utfall[i] === "varnar");
  skriv("(a) hela regeln, de varnande timmarna, [t − 1, t + 2] h", bekrafta(regelV, par, is, KANDIDAT_FONSTER_H, grupp), basA);
  const mr = missar(is, parK, regelV, narmast, ind.nederbord, (seg, start) => `${manad(start)} · ${band(lat.get(narmast.get(seg)!)!)}`);
  const mrt: Missrakning = { episoder: 0, missade: 0, nederbord: 0, utstralning: 0, okand: 0 };
  console.log("== (a) missarna för hela regeln: is-episoder utan en varnande timme 2 h före");
  for (const [g, r] of [...mr.per].sort()) { console.log(mrad(g, r)); for (const k of Object.keys(mrt) as (keyof Missrakning)[]) mrt[k] += r[k]; }
  console.log(mrad("totalt", mrt) + `; ${mr.utanStation} episoder på sträckor utan kandidatens station`);
  for (const [namn, x] of [["(a) kandidaten", kand], ["(a) hela regeln", regelV], ["(b) efterhalkan", fyr]] as const) {
    const r = atgarder(x, par, atg, grupp), tot = { antal: 0, med: 0 };
    console.log(`== (c) åtgärderna vid ${namn}: planerad halkbekämpning (20, 50) på stationens sträckor inom ±6 h; ${r.borttagna} åtgärdsrader av annan typ, utan tid eller före perioden`);
    for (const [g, s] of [...r.per].sort()) { console.log(`  ${g}: ${s.med} av ${s.antal} (${pct(s.med, s.antal)} %)`); tot.antal += s.antal; tot.med += s.med; }
    console.log(`  totalt: ${tot.med} av ${tot.antal} (${pct(tot.med, tot.antal)} %)`);
  }
}

const direkt = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("kuvos/facit-trv.ts");
if (direkt) {
  const args = process.argv.slice(2);
  if (args[0] === "--sjalvtest") sjalvtest();
  else if (args[0] === "--signerad" && args[1]) {
    const s = signerad(readFileSync(args[1], "utf8"));
    console.log(`förregistreringen ${args[1]}: Bengt ${s.bengt ? "signerat" : "INTE signerat"} · Axel ${s.axel ? "signerat" : "INTE signerat"}`);
    if (!s.bengt || !s.axel) { console.error("vägrar: läsningen kräver båda signaturerna i §8 (DECISIONS #591)"); process.exit(2); }
  } else { console.error("kör: facit-trv.ts --sjalvtest | --signerad <förregistreringen>"); process.exit(1); }
}
