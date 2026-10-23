// KUVÖSENS OLYCKOR UR TRAFIKVERKET 2024/25 (DECISIONS #697, docs/FORREGISTRERING-OLYCKOR-2024-25.md). Läsningen följer den
// signerade förregistreringen rad för rad:
//   §2 urvalet     de förskjutna raderna lagas med regeln "första kolumnen från och med StartTid som är en tid"; rader med samma
//                  starttid och koordinat räknas en gång; SWEREF 99 TM (X nordlig) räknas om till WGS 84; tiden är StartTid och
//                  Sluttid används inte. Två serier: alla olyckor och halkolyckorna, där fritexten (Beskrivning, i den rensade
//                  kopian med regnummer och telefonnummer redan maskade, KUVOS-LEVERANSEN §5i) prövas mot skuggfacitets frysta
//                  ordlista, översatt ur Postgres till JavaScript. Träffarna per ord och EventText redovisas; EventText väljer inget.
//   §3 tidszonen   timmen 02 natten till 30/3 2025 och vardagarnas topptimmar; utan klart svar svensk tid, och allt också med
//                  tiden flyttad en timme.
//   §4 fråga (a)   bekräftelsen, basnivån och lyftet för kandidaten [t − 1, t + 2] h och efterhalkans fyrningar [t, t + 6] h,
//                  inom 2 km och 5 km bredvid, för båda serierna, med halk mot alla som huvudjämförelse och 95 % marginal; per
//                  månad och norr och söder om 62°. En olycka bekräftar men fäller aldrig, och läggs aldrig i grundtalet (#247).
//   §5 fråga (b)   W-A med scripts/vindsikt-steg0.ts regler på kuvösens stationstimmar; siktens dom med tre villkor.
// Fritexten och platsen skrivs aldrig ut: utdata är bara aggregat (PUBLIKT REPO). Läsningen (`lasning`) körs i kuvösen av
// scripts/matningar/kuvos-blandning-vagb-olyckor-trv-2026-10-23.ts och vägrar utan båda signaturerna i förregistreringen.
//
//   node --experimental-strip-types kuvos/olyckor-trv.ts --sjalvtest
//   node --experimental-strip-types kuvos/olyckor-trv.ts --signerad <förregistreringen>     (kuvos.yml, före allt annat)
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { haversineM } from "../engine/src/geo.ts";
import { HANDELSE_SQL } from "../publish/skuggfacit.ts";
import { Z, skiljbarKvot } from "../publish/marginal.ts";
import { domrad } from "../scripts/domrad.ts";
import { VINDBAND, SIKTBAND, G_TAK, RACKVIDD_M, MIN_STATIONSTIMMAR, MIN_OLYCKOR, KVOT_KRAV, frekvens, monoton, dom, diskvalificera }
  from "../scripts/vindsikt-steg0.ts";
import { lasXlsx, tid, signerad, manad, inomPerioden, KANDIDAT_FONSTER_H, EFTERHALKA_FONSTER_H, PAR_M, type Tillfalle } from "./facit-trv.ts";

export const FORREG = "docs/FORREGISTRERING-OLYCKOR-2024-25.md";
export const MANIFEST = "kuvos/trv-111808-leverans.json";
export const FIL = "Olyckor24-25.xlsx";
export const NARA_M = PAR_M;                                  // §4: 2 km, väglagsläsningens avstånd, primärt
export const NARA_BREDVID_M = 5000;                           // §4: samma tal inom 5 km, bredvid
export const NORR_LAT = 62;                                   // §4: norr och söder om 62°
export const DAGTID_H: [number, number] = [7, 18];            // §5: 07–18 svensk tid, klockslagen [07:00, 18:00)
export const FORMIDDAG_H: [number, number] = [5, 11];         // §3: förmiddagens topptimme söks bland 05–11
export const EFTERMIDDAG_H: [number, number] = [13, 19];      // §3: eftermiddagens bland 13–19
export const RUSNING = { svensk: { fm: [7, 9], em: [15, 18] }, utc: { fm: [6, 8], em: [14, 17] } };
const H = 3_600_000;

// --- ordlistan (§2) ---
/** Skuggfacitets frysta ordlista, ordagrant ur HANDELSE_SQL (`message ~* '…'`): en källa, och läsningen vägrar om förregistreringen
 *  säger något annat. */
export const ORDLISTA = HANDELSE_SQL.match(/message ~\* '([^']+)'/)![1];
export const ORD = ORDLISTA.split("|");
const ORDTECKEN = String.raw`[\p{L}\p{N}_]`;
/** Postgres ARE till JavaScript, utan hänsyn till stora och små bokstäver som `~*`. `\m` (ett ords början) och `\M` (ett ords slut)
 *  blir blickar mot ordtecken: Postgres ordtecken är alnum och understreck, och i en UTF-8-databas är å, ä och ö alnum, här \p{L}. */
export const tillJs = (pg: string) =>
  new RegExp(pg.replace(/\\m/g, `(?<!${ORDTECKEN})(?=${ORDTECKEN})`).replace(/\\M/g, `(?<=${ORDTECKEN})(?!${ORDTECKEN})`), "iu");
export const HALK = tillJs(ORDLISTA);
export const ORD_RE = ORD.map(tillJs);
/** Påhittade meningar med Postgres svar för hela listan och orden som träffar, räknade ur ARE:s regler. Självtestet prövar
 *  översättningen mot dem, och test/olyckor-ordlistan.test.ts kör samma meningar mot Postgres. */
export const PROVMENINGAR: [string, boolean, string[]][] = [
  ["Snöröjning pågick, bilen i diket", true, [String.raw`\msnö`]],
  ["Kris vid avfarten", false, []],
  ["Bilen gled på is vid bron", true, [String.raw`\mis\M`]],
  ["ISHALKA på bron", true, ["halk", "ishalka"]],
  ["Halt väglag, singelolycka", true, [String.raw`\mhalt\M`]],
  ["Vägbanan var isig", true, [String.raw`\misig\M`]],
  ["Isigt väglag i kurvan", false, []],
  ["Kraftigt snöfall", true, [String.raw`\msnö`, "snöfall"]],
  ["Glatt på bron", true, ["glatt"]],
  ["Glashalt i backen", false, []],
  ["Kollision vid E4is", false, []],
  ["påis", false, []],
  ["Mötesolycka utan väder", false, []],
];

// --- SWEREF 99 TM till WGS 84 (§2) ---
/** Gauss–Krügers invers på GRS80 (Lantmäteriets formler): medelmeridianen 15°, skala 0,9996, falsk östlig 500 000 m. N är nordlig,
 *  E östlig. SWEREF 99 och WGS 84 skiljer sig under en meter. */
export function sweref99tmTillWgs84(N: number, E: number): { lon: number; lat: number } {
  const a = 6378137, f = 1 / 298.257222101, k0 = 0.9996, lon0 = 15, FE = 500000;
  const e2 = f * (2 - f), n = f / (2 - f), A = a / (1 + n) * (1 + n ** 2 / 4 + n ** 4 / 64);
  const d = [n / 2 - 2 * n ** 2 / 3 + 37 * n ** 3 / 96 - n ** 4 / 360, n ** 2 / 48 + n ** 3 / 15 - 437 * n ** 4 / 1440,
    17 * n ** 3 / 480 - 37 * n ** 4 / 840, 4397 * n ** 4 / 161280];
  const As = e2 + e2 ** 2 + e2 ** 3 + e2 ** 4, Bs = -(7 * e2 ** 2 + 17 * e2 ** 3 + 30 * e2 ** 4) / 6;
  const Cs = (224 * e2 ** 3 + 889 * e2 ** 4) / 120, Ds = -(4279 * e2 ** 4) / 1260;
  const xi = N / (k0 * A), eta = (E - FE) / (k0 * A);
  let x = xi, y = eta;
  d.forEach((c, i) => { const j = 2 * (i + 1); x -= c * Math.sin(j * xi) * Math.cosh(j * eta); y -= c * Math.cos(j * xi) * Math.sinh(j * eta); });
  const p = Math.asin(Math.sin(x) / Math.cosh(y)), s2 = Math.sin(p) ** 2;
  const lat = p + Math.sin(p) * Math.cos(p) * (As + Bs * s2 + Cs * s2 ** 2 + Ds * s2 ** 3);
  return { lon: lon0 + Math.atan(Math.sinh(y) / Math.cos(x)) * 180 / Math.PI, lat: lat * 180 / Math.PI };
}
/** Sveriges utsträckning i SWEREF 99 TM, rundligt: en koordinat utanför är ingen plats (tom, NULL eller förskjuten). */
const giltig = (N: number, E: number) => N >= 6_000_000 && N <= 7_800_000 && E >= 200_000 && E <= 1_000_000;

// --- inläsningen (§2) ---
export const TID_RE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;
export type Olycka = { start: string; lon: number | null; lat: number | null; halk: boolean; ord: boolean[]; eventText: string };
export type Inlasning = { rader: number; utanTid: number; forskjutna: Record<string, number>; dubbletter: number;
  dubbletterOlikHalk: number; utanKoordinat: number; olyckor: Olycka[] };

/** Bladets rader till olyckor. En rad lagas med första kolumnen från och med StartTid som är en tid: där står starttiden, och
 *  Sluttid, X och Y följer i rubrikens ordning; fritexten är Beskrivning och det som spillt över fram till tiden. Rader med samma
 *  starttid och koordinat är en olycka, en halkolycka om någon av dess rader träffar ordlistan. */
export function lasOlyckor(kolumner: string[], rader: string[][]): Inlasning {
  const k = (n: string) => { const i = kolumner.indexOf(n); if (i < 0) throw new Error(`kolumnen ${n} saknas i rubriken`); return i; };
  const iE = k("EventText"), iB = k("Beskrivning"), iS = k("StartTid"), dX = k("X") - iS, dY = k("Y") - iS;
  const tal = (s: string | undefined) => ((s ?? "").trim() === "" ? NaN : Number((s ?? "").trim().replace(",", ".")));
  const grupper = new Map<string, { start: string; N: number; E: number; texter: string[]; eventText: string }>();
  const forskjutna: Record<string, number> = {};
  let n = 0, utanTid = 0;
  for (const r of rader) {
    if (r.every((c) => c.trim() === "")) continue;
    n++;
    let j = iS;
    while (j < r.length && !TID_RE.test(r[j].trim())) j++;
    if (j >= r.length) { utanTid++; continue; }
    if (j > iS) forskjutna[j - iS] = (forskjutna[j - iS] ?? 0) + 1;
    const start = r[j].trim(), N = tal(r[j + dX]), E = tal(r[j + dY]), nyckel = `${start}|${N}|${E}`;
    const g = grupper.get(nyckel) ?? grupper.set(nyckel, { start, N, E, texter: [], eventText: (r[iE] ?? "").trim() }).get(nyckel)!;
    g.texter.push(r.slice(iB, j).join(" "));
  }
  let olikHalk = 0, utanKoordinat = 0;
  const olyckor: Olycka[] = [];
  for (const g of grupper.values()) {
    const halk = g.texter.map((t) => HALK.test(t));
    if (halk.some((h) => h !== halk[0])) olikHalk++;
    const p = giltig(g.N, g.E) ? sweref99tmTillWgs84(g.N, g.E) : null;
    if (!p) utanKoordinat++;
    olyckor.push({ start: g.start, lon: p?.lon ?? null, lat: p?.lat ?? null, halk: halk.some(Boolean),
      ord: ORD_RE.map((re) => g.texter.some((t) => re.test(t))), eventText: g.eventText });
  }
  return { rader: n, utanTid, forskjutna, dubbletter: n - utanTid - grupper.size, dubbletterOlikHalk: olikHalk, utanKoordinat, olyckor };
}

// --- tidszonen (§3) ---
export type Zon = "svensk" | "utc" | "oklart";
export type Tidszon = { natten02: number; vardagarPerTimme: number[]; formiddag: number[]; eftermiddag: number[]; rusning: Zon; lage: Zon };
/** De två proven på stämplarna som de står i filen. Rusningen: vardagarnas (måndag–fredag) topptimme av 05–11 och av 13–19, och vid
 *  lika många alla de timmarna; i 07–09 och 15–18 ⇒ svensk tid, annars i 06–08 och 14–17 ⇒ UTC, annars inget klart svar (reglerna
 *  prövas i förregistreringens ordning, eftersom 07–08 och 15–17 ligger i båda). En olycka timmen 02 natten till 30/3 2025, som inte
 *  finns i svensk tid, gör svaret oklart; för UTC säger timmen ingenting. */
export function tidszonen(stamplar: string[]): Tidszon {
  const natten02 = stamplar.filter((s) => s.startsWith("2025-03-30") && s.slice(11, 13) === "02").length;
  const per = Array<number>(24).fill(0);
  for (const s of stamplar) {
    const dag = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))).getUTCDay();
    if (dag >= 1 && dag <= 5) per[+s.slice(11, 13)]++;
  }
  const topp = ([a, b]: [number, number]) => { const max = Math.max(...per.slice(a, b + 1)); return per.flatMap((x, h) => (h >= a && h <= b && x === max ? [h] : [])); };
  const fm = topp(FORMIDDAG_H), em = topp(EFTERMIDDAG_H);
  const inom = (h: number[], [a, b]: number[]) => h.every((x) => x >= a && x <= b);
  const rusning: Zon = inom(fm, RUSNING.svensk.fm) && inom(em, RUSNING.svensk.em) ? "svensk"
    : inom(fm, RUSNING.utc.fm) && inom(em, RUSNING.utc.em) ? "utc" : "oklart";
  return { natten02, vardagarPerTimme: per, formiddag: fm, eftermiddag: em, rusning, lage: rusning === "svensk" && natten02 > 0 ? "oklart" : rusning };
}
export type Tolkning = { namn: string; zon: "lokal" | "utc"; flytt: number };
/** Läsningens tolkningar av stämplarna: den som proven ger, eller vid oklart svar svensk tid och tiden flyttad en timme (§3). */
export const tolkningar = (tz: Tidszon): Tolkning[] => tz.lage === "utc" ? [{ namn: "UTC (§3)", zon: "utc", flytt: 0 }]
  : tz.lage === "svensk" ? [{ namn: "svensk tid (§3)", zon: "lokal", flytt: 0 }]
  : [{ namn: "svensk tid, antagen (§3: inget klart svar)", zon: "lokal", flytt: 0 }, { namn: "känslighet: tiden flyttad en timme", zon: "lokal", flytt: H }];
export type Punkt = { t: number; lon: number; lat: number; halk: boolean };
/** Olyckorna med plats, med tiden i ms UTC enligt tolkningen. */
export const punkter = (o: Olycka[], l: Tolkning): Punkt[] =>
  o.filter((x) => x.lon !== null).map((x) => ({ t: tid(x.start, l.zon)! + l.flytt, lon: x.lon!, lat: x.lat!, halk: x.halk }));

// --- fråga (a) (§4) ---
export type Nara = { lat: number; alla: number[]; halk: number[] };
/** Varje station med läge och tiderna, sorterade, för olyckorna inom maxM. */
export function naraTider(stationer: { id: string; lon: number; lat: number }[], olyckor: Punkt[], maxM: number): Map<string, Nara> {
  const ut = new Map<string, Nara>();
  for (const s of stationer) {
    const x: Nara = { lat: s.lat, alla: [], halk: [] };
    for (const o of olyckor) if (haversineM(s, o) <= maxM) { x.alla.push(o.t); if (o.halk) x.halk.push(o.t); }
    x.alla.sort((a, b) => a - b); x.halk.sort((a, b) => a - b);
    ut.set(s.id, x);
  }
  return ut;
}
/** Finns en tid i [fran, till], gränserna medräknade? */
export function finns(tider: number[], fran: number, till: number): boolean {
  let lo = 0, hi = tider.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (tider[m] < fran) lo = m + 1; else hi = m; }
  return lo < tider.length && tider[lo] <= till;
}
export type Rakning = { n: number; alla: number; halk: number };
export const halva = (lat: number) => (lat >= NORR_LAT ? "norr" : "söder");
/** Tillfällen med minst en olycka inom avståndet och fönstret, per månad · halva; tillfällen vid en station utan läge för sig. */
export function bekrafta(tillfallen: Tillfalle[], nara: Map<string, Nara>, fonster: [number, number]): { per: Map<string, Rakning>; utanLage: number } {
  const per = new Map<string, Rakning>();
  let utanLage = 0;
  for (const x of tillfallen) {
    const s = nara.get(x.station);
    if (!s) { utanLage++; continue; }
    const g = `${manad(x.t)} · ${halva(s.lat)}`, r = per.get(g) ?? per.set(g, { n: 0, alla: 0, halk: 0 }).get(g)!;
    const fran = x.t + fonster[0] * H, till = x.t + fonster[1] * H;
    r.n++;
    if (finns(s.alla, fran, till)) r.alla++;
    if (finns(s.halk, fran, till)) r.halk++;
  }
  return { per, utanLage };
}
export type Kvot = { varde: number; lo: number | null; hi: number | null };
/** Kvoten (a/n)/(b/m) av två andelar med 95 % marginal på logaritmen (Katz): SE = √(1/a − 1/n + 1/b − 1/m), som med få händelser
 *  är marginalvaktens √(1/a + 1/b) (publish/marginal.ts). En undre gräns för osäkerheten: tillfällena är inte oberoende. Lyftet är
 *  kvoten (bekräftade/varningar)/(bekräftade/kalla timmar); halk mot alla är (halk/alla bland varningarna)/(samma bland timmarna). */
export function andelskvot(a: number, n: number, b: number, m: number): Kvot | null {
  if (!n || !m || !b) return null;
  const v = (a / n) / (b / m);
  if (!a) return { varde: 0, lo: null, hi: null };
  const se = Math.sqrt(Math.max(1 / a - 1 / n + 1 / b - 1 / m, 0));
  return { varde: v, lo: v * Math.exp(-Z * se), hi: v * Math.exp(Z * se) };
}
export type Arad = { grupp: string; varningar: Rakning; bas: Rakning; lyftAlla: Kvot | null; lyftHalk: Kvot | null; halkMotAlla: Kvot | null };
/** Fråga (a) för en population mot basnivån (stationernas egna kalla timmar) i samma fönster: totalt, per månad, norr och söder,
 *  och månad · halva. */
export function fragaA(pop: Tillfalle[], bas: Tillfalle[], nara: Map<string, Nara>, fonster: [number, number]) {
  const w = bekrafta(pop, nara, fonster), b = bekrafta(bas, nara, fonster);
  const nycklar = [...new Set([...w.per.keys(), ...b.per.keys()])].sort();
  const manader = [...new Set(nycklar.map((g) => g.slice(0, 7)))];
  const summa = (per: Map<string, Rakning>, med: (g: string) => boolean): Rakning =>
    [...per].filter(([g]) => med(g)).reduce((s, [, r]) => ({ n: s.n + r.n, alla: s.alla + r.alla, halk: s.halk + r.halk }), { n: 0, alla: 0, halk: 0 });
  const vyer: [string, (g: string) => boolean][] = [["totalt", () => true], ...manader.map((m) => [m, (g: string) => g.startsWith(m)] as [string, (g: string) => boolean]),
    ["norr", (g) => g.endsWith("norr")], ["söder", (g) => g.endsWith("söder")], ...nycklar.map((k) => [k, (g: string) => g === k] as [string, (g: string) => boolean])];
  const rader: Arad[] = vyer.map(([grupp, med]) => {
    const x = summa(w.per, med), y = summa(b.per, med);
    return { grupp, varningar: x, bas: y, lyftAlla: andelskvot(x.alla, x.n, y.alla, y.n), lyftHalk: andelskvot(x.halk, x.n, y.halk, y.n),
      halkMotAlla: andelskvot(x.halk, x.alla, y.halk, y.alla) };
  });
  return { utanLage: { varningar: w.utanLage, bas: b.utanLage }, rader };
}

// --- fråga (b) (§5) ---
/** En stations timmar ur kuvösen: timindex (UTC-timmar sedan 1970), timmens högsta byvind och lägsta sikt, och stationsvaktens
 *  omöjliga timmar (driftens SQL, #164). */
export type Stationstimmar = { station: string; lon: number; lat: number; omojliga: number; h: number[]; byvind: (number | null)[]; sikt: (number | null)[] };
export type Band = { namn: string; timmar: number; olyckor: number; unika: number };
type Urval = { alla: Band[]; halk: Band[] };
export type WaRakning = { diskade: number; vind: { dygnet: Urval; dagtid: Urval }; sikt: { dygnet: Urval; dagtid: Urval } };
const bandAv = (banden: [string, number, number][], v: number | null) => (v === null ? -1 : banden.findIndex(([, lo, hi]) => v >= lo && v < hi));
const svenskTimme = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", hour: "2-digit", hourCycle: "h23" });
const dagCache = new Map<number, boolean>();
/** Börjar timmen t (ms UTC) på dagtid, 07:00–18:00 svensk tid? */
export function dagtid(t: number): boolean {
  let v = dagCache.get(t);
  if (v === undefined) { const h = Number(svenskTimme.format(new Date(t))); v = h >= DAGTID_H[0] && h < DAGTID_H[1]; dagCache.set(t, v); }
  return v;
}
/** W-A:s räkning (scripts/vindsikt-steg0.ts): per band stationstimmarna och timmarna med minst en olycka inom RACKVIDD_M som
 *  började i timmen [h, h + 1 h), hela dygnet och på dagtid, för båda serierna; olika olyckor bredvid, eftersom samma olycka räknas
 *  vid varje station inom räckvidden. Byvinden utesluter stationsvaktens stationer och kastar timmar över G_TAK (utanför banden);
 *  sikten utesluter ingen station. */
export function waRakna(st: Stationstimmar[], olyckor: Punkt[]): WaRakning {
  const tom = (banden: [string, number, number][]) => banden.map(([namn]) => ({ namn, timmar: 0, olyckor: 0, unika: new Set<number>() }));
  const urval = (banden: [string, number, number][]) => ({ dygnet: { alla: tom(banden), halk: tom(banden) }, dagtid: { alla: tom(banden), halk: tom(banden) } });
  const r = { vind: urval(VINDBAND), sikt: urval(SIKTBAND) };
  let diskade = 0;
  for (const s of st) {
    const perTimme = new Map<number, number[]>();
    olyckor.forEach((o, i) => { if (haversineM(s, o) <= RACKVIDD_M) { const h = Math.floor(o.t / H); (perTimme.get(h) ?? perTimme.set(h, []).get(h)!).push(i); } });
    const vind = !diskvalificera(s.omojliga);
    if (!vind) diskade++;
    for (let k = 0; k < s.h.length; k++) {
      const alla = perTimme.get(s.h[k]) ?? [], halk = alla.filter((i) => olyckor[i].halk);
      const delar = dagtid(s.h[k] * H) ? (["dygnet", "dagtid"] as const) : (["dygnet"] as const);
      for (const [matt, banden, v] of [["vind", VINDBAND, vind ? s.byvind[k] : null], ["sikt", SIKTBAND, s.sikt[k]]] as const) {
        const b = bandAv(banden, v);
        if (b < 0) continue;
        for (const del of delar) for (const [serie, ids] of [["alla", alla], ["halk", halk]] as const) {
          const x = r[matt][del][serie][b];
          x.timmar++;
          if (ids.length) x.olyckor++;
          for (const i of ids) x.unika.add(i);
        }
      }
    }
  }
  const ut = (u: { alla: any[]; halk: any[] }): Urval => ({ alla: u.alla.map((x) => ({ ...x, unika: x.unika.size })), halk: u.halk.map((x) => ({ ...x, unika: x.unika.size })) });
  return { diskade, vind: { dygnet: ut(r.vind.dygnet), dagtid: ut(r.vind.dagtid) }, sikt: { dygnet: ut(r.sikt.dygnet), dagtid: ut(r.sikt.dagtid) } };
}
export type Prov = { rader: (Band & { per1000: number; kvot: number; lo: number | null; hi: number | null })[]; monoton: boolean; kvot: number;
  skiljbar: boolean; underlag: boolean; olyckorTotalt: number; utfall: "KLARAR" | "FALLER" | "OAVGJORT" | "SPÄRRAD" };
/** W-A:s krav på banden, som driften: frekvensen per 1 000 stationstimmar och kvoten mot första bandet (95 % marginal på
 *  logaritmen, √(1/a + 1/b)); W-A1/W-A3 monotont; W-A2 sista bandet ≥ KVOT_KRAV × det första och skiljbart (marginalvakten, #128);
 *  W-A4 underlaget. Utfallet som i driften: SPÄRRAD utan underlag, OAVGJORT inom bruset, annars KLARAR eller FALLER. */
export function waProv(banden: Band[]): Prov {
  const f = frekvens(banden), forsta = f[0], sista = f[f.length - 1];
  const olyckorTotalt = f.reduce((s, r) => s + r.olyckor, 0);
  const underlag = dom(sista.timmar, olyckorTotalt, true) !== null;
  const mono = monoton(f), kvot = sista.kvot, skilj = skiljbarKvot(kvot, KVOT_KRAV, sista.olyckor, forsta.olyckor);
  const rader = f.map((r, i) => {
    const se = i > 0 && r.olyckor > 0 && forsta.olyckor > 0 ? Math.sqrt(1 / r.olyckor + 1 / forsta.olyckor) : null;
    return { ...r, lo: se === null ? null : r.kvot * Math.exp(-Z * se), hi: se === null ? null : r.kvot * Math.exp(Z * se) };
  });
  return { rader, monoton: mono, kvot, skiljbar: skilj, underlag, olyckorTotalt,
    utfall: !underlag ? "SPÄRRAD" : !skilj ? "OAVGJORT" : mono && kvot >= KVOT_KRAV ? "KLARAR" : "FALLER" };
}
/** Siktens dom (§5), på alla olyckor: (1) W-A3 över hela vintern med marginalvakten, oavgjort räknas som fall; (2) W-A4 för sikten;
 *  (3) riktningen på dagtid, kvoten mellan bandet under 200 m och bandet över 1000 m över 1. Sikten står kvar bara om alla tre håller. */
export function siktensDom(dygnet: Band[], dagtidBand: Band[]) {
  const p = waProv(dygnet), d = frekvens(dagtidBand), forsta = d[0], sista = d[d.length - 1];
  const w3 = p.monoton && p.kvot >= KVOT_KRAV && p.skiljbar, w4 = p.underlag, riktning = sista.per1000 > forsta.per1000;
  return { w3, w4, riktning, star: w3 && w4 && riktning, kvot: p.kvot, dagKvot: forsta.per1000 ? sista.per1000 / forsta.per1000 : null };
}

// --- spärren ---
/** Förregistreringens signaturer (§9): båda raderna med datum och signatur. Lämnar felet, eller null när läsningen får köras. */
export function sparr(text: string): string | null {
  const s = signerad(text);
  return s.bengt && s.axel ? null
    : `vägrar: förregistreringen är inte signerad av båda (Bengt ${s.bengt ? "signerat" : "INTE signerat"}, Axel ${s.axel ? "signerat" : "INTE signerat"}; DECISIONS #697)`;
}

// --- den skarpa läsningen ---
export type Indata = { xlsx: string; forreg: string; kandidat: Tillfalle[]; kalla: Tillfalle[]; fyrningar: Tillfalle[];
  stationer: { id: string; lon: number; lat: number }[]; stationstimmar: Stationstimmar[]; ut: string };
const vagra = (m: string) => { console.error(`vägrar: ${m}`); process.exit(2); };

/** Hela läsningen enligt förregistreringen §2–§5. Vägrar (exit 2) utan båda signaturerna, med en annan ordlista än skuggfacitets,
 *  med en annan fil än manifestets eller med ett annat radantal. Skriver JSON och markdown i `ut`, bara aggregat. */
export function lasning(ind: Indata) {
  const fel = sparr(ind.forreg);
  if (fel) { console.error(fel); process.exit(2); }
  const lista = ind.forreg.match(/`(halk\|[^`]+)`/)?.[1];
  if (lista !== ORDLISTA) vagra(`ordlistan i förregistreringen är inte skuggfacitets (HANDELSE_SQL)`);
  const m = JSON.parse(readFileSync(MANIFEST, "utf8")).komplettering.find((f: any) => f.fil === FIL);
  const buf = readFileSync(ind.xlsx), sha = createHash("sha256").update(buf).digest("hex");
  if (sha !== m.sha256 || buf.length !== m.bytes) vagra(`${FIL} är inte manifestets fil (${buf.length} byte, sha256 ${sha})`);
  const x = lasXlsx(buf), inl = lasOlyckor(x.kolumner, x.rader);
  if (inl.rader !== m.rader) vagra(`${inl.rader} rader i bladet, manifestet säger ${m.rader}`);
  const res = { forregistrering: FORREG, decisions: "#697", fil: { namn: FIL, bytes: buf.length, sha256: sha }, ...berakna(inl, ind) };
  const sd = res.tolkningar[0].b.siktensDom;
  mkdirSync(ind.ut, { recursive: true });
  writeFileSync(join(ind.ut, "olyckor-2024-25.json"), JSON.stringify(res, null, 1));
  const md = markdown(res);
  writeFileSync(join(ind.ut, "olyckor-2024-25.md"), md);
  console.log(md);
  domrad("W-A sikt 2024/25 (olyckorna)", sd.star ? "KLARAR" : "FALLER",
    `sikten ${sd.star ? "står kvar" : "stryks"}: W-A3 med marginalvakten ${sd.w3 ? "ja" : "nej"} (kvot ${sd.kvot.toFixed(2)}), W-A4 ${sd.w4 ? "ja" : "nej"}, ` +
    `riktningen på dagtid ${sd.riktning ? "ja" : "nej"} (${res.tolkningar[0].tolkning})`);
}

/** §2–§5 på de inlästa olyckorna och kuvösens indata: serierna, tidszonen, fråga (a) och (b) per tolkning. Bara aggregat. */
export function berakna(inl: Inlasning, ind: Omit<Indata, "xlsx" | "forreg" | "ut">) {
  const tz = tidszonen(inl.olyckor.map((o) => o.start));
  const kand = inomPerioden(ind.kandidat), kalla = inomPerioden(ind.kalla), fyr = inomPerioden(ind.fyrningar);
  const ordRakning = ORD.map((ord, i) => ({ ord, traffar: inl.olyckor.filter((o) => o.ord[i]).length,
    endaOrdet: inl.olyckor.filter((o) => o.ord[i] && o.ord.filter(Boolean).length === 1).length }));
  const fordelning = (o: Olycka[]) => o.reduce((s, x) => { const k = x.eventText.length <= 60 ? x.eventText : "(annat)"; s[k] = (s[k] ?? 0) + 1; return s; }, {} as Record<string, number>);
  return {
    inlasning: { rader: inl.rader, utanTid: inl.utanTid, forskjutna: inl.forskjutna, dubbletter: inl.dubbletter, dubbletterOlikHalk: inl.dubbletterOlikHalk,
      olyckor: inl.olyckor.length, utanKoordinat: inl.utanKoordinat },
    serier: { alla: inl.olyckor.length, halk: inl.olyckor.filter((o) => o.halk).length, ordlista: ORDLISTA, ord: ordRakning,
      eventText: { alla: fordelning(inl.olyckor), halk: fordelning(inl.olyckor.filter((o) => o.halk)) } },
    tidszonen: tz,
    populationer: { kandidat: [kand.length, ind.kandidat.length], kalla: [kalla.length, ind.kalla.length], fyrningar: [fyr.length, ind.fyrningar.length],
      stationerMedLage: ind.stationer.length, stationerMedTimmar: ind.stationstimmar.length,
      stationstimmar: ind.stationstimmar.reduce((n, s) => n + s.h.length, 0) },
    tolkningar: tolkningar(tz).map((l) => {
      const p = punkter(inl.olyckor, l);
      const a = Object.fromEntries([NARA_M, NARA_BREDVID_M].map((d) => {
        const nara = naraTider(ind.stationer, p, d);
        return [`${d / 1000} km`, { kandidat: fragaA(kand, kalla, nara, KANDIDAT_FONSTER_H), efterhalkan: fragaA(fyr, kalla, nara, EFTERHALKA_FONSTER_H) }];
      }));
      const w = waRakna(ind.stationstimmar, p);
      const prov = (u: { dygnet: Urval; dagtid: Urval }) => ({ dygnet: { alla: waProv(u.dygnet.alla), halk: waProv(u.dygnet.halk) },
        dagtid: { alla: waProv(u.dagtid.alla), halk: waProv(u.dagtid.halk) } });
      return { tolkning: l.namn, a, b: { diskade: w.diskade, vind: prov(w.vind), sikt: prov(w.sikt), siktensDom: siktensDom(w.sikt.dygnet.alla, w.sikt.dagtid.alla) } };
    }),
  };
}

// --- utskriften: markdown med bara aggregat ---
const komma = (x: number, d = 2) => x.toFixed(d).replace(".", ",");
const andel = (a: number, n: number) => `${a} av ${n}${n ? ` (${komma((100 * a) / n)} %)` : ""}`;
const kvotText = (k: Kvot | null) => (!k ? "–" : k.lo === null ? komma(k.varde) : `${komma(k.varde)} [${komma(k.lo)}–${komma(k.hi!)}]`);
export function markdown(res: any): string {
  const ut: string[] = [];
  const s = (x = "") => ut.push(x);
  const tabell = (rubrik: string[], rader: (string | number)[][]) => { s(`| ${rubrik.join(" | ")} |`); s(`|${rubrik.map(() => " :-- ").join("|")}|`); for (const r of rader) s(`| ${r.join(" | ")} |`); s(); };
  s("# Olyckorna 2024/25 mot kuvösen (FORREGISTRERING-OLYCKOR-2024-25, DECISIONS #697)");
  s();
  s(`Bara aggregat: fritexten och platsen skrivs aldrig ut. Filen ${res.fil.namn}, ${res.fil.bytes} byte, sha256 ${res.fil.sha256} (= manifestet).`);
  s("En olycka får bekräfta en varning men aldrig fälla den, och olyckorna läggs aldrig i grundtalet (#247).");
  s();
  const i = res.inlasning;
  s("## §2 Inläsningen och serierna");
  s();
  tabell(["", "antal"], [["rader i bladet", i.rader], ["rader utan tid (lästes inte)", i.utanTid],
    ["förskjutna rader, lagade", `${Object.values(i.forskjutna).reduce((a: number, b: any) => a + b, 0)} (${Object.entries(i.forskjutna).map(([k, n]) => `${k} steg: ${n}`).join(", ") || "inga"}; KUVOS-LEVERANSEN §5i: 22)`],
    ["dubbletter, samma starttid och koordinat (räknade en gång)", `${i.dubbletter} (KUVOS-LEVERANSEN §5i: 23)`],
    ["dubblettgrupper vars rader skiljer sig i halkklassningen", i.dubbletterOlikHalk], ["olyckor", i.olyckor],
    ["olyckor utan giltig koordinat (paras inte)", i.utanKoordinat], ["alla olyckor (serie 1)", res.serier.alla], ["halkolyckor (serie 2)", res.serier.halk]]);
  s(`Ordlistan (skuggfacitets, fryst): \`${res.serier.ordlista}\`. En olycka räknas för varje ord som träffar.`);
  s();
  tabell(["ord", "olyckor med träff", "där bara det ordet träffar"], res.serier.ord.map((o: any) => [`\`${o.ord}\``, o.traffar, o.endaOrdet]));
  s("EventText (påverkan), redovisas men väljer inget:");
  s();
  const et = res.serier.eventText, nycklar = [...new Set([...Object.keys(et.alla), ...Object.keys(et.halk)])].sort();
  tabell(["EventText", "alla", "halk"], nycklar.map((k) => [k || "(tom)", et.alla[k] ?? 0, et.halk[k] ?? 0]));
  const tz = res.tidszonen;
  s("## §3 Tidszonen");
  s();
  s(`- Timmen 02 natten till 30/3 2025, som den står i filen: ${tz.natten02} olyckor.`);
  s(`- Vardagarnas topptimme: förmiddagen (05–11) ${tz.formiddag.join(", ")}, eftermiddagen (13–19) ${tz.eftermiddag.join(", ")} ⇒ rusningen säger ${tz.rusning}.`);
  s(`- **Utfall: ${tz.lage === "oklart" ? "inget klart svar — svensk tid antas, och allt redovisas också med tiden flyttad en timme" : tz.lage === "utc" ? "UTC" : "svensk tid"}.**`);
  s();
  tabell(["timme", ...tz.vardagarPerTimme.map((_: number, h: number) => String(h).padStart(2, "0"))], [["vardagar", ...tz.vardagarPerTimme]]);
  const p = res.populationer;
  s(`Populationerna inom perioden: kandidatens kalla timmar ${p.kandidat[0]} av ${p.kandidat[1]}, stationernas egna kalla timmar ${p.kalla[0]} av ${p.kalla[1]}, ` +
    `efterhalkans fyrningar ${p.fyrningar[0]} av ${p.fyrningar[1]}; ${p.stationerMedLage} stationer med läge; W-A: ${p.stationstimmar} stationstimmar vid ${p.stationerMedTimmar} stationer.`);
  s();
  for (const t of res.tolkningar) {
    s(`## §4 Fråga (a) — ${t.tolkning}`);
    s();
    s("Bekräftad: minst en olycka inom avståndet och fönstret. Basnivån: stationernas egna kalla timmar vid kandidatens stationer, samma fönster. " +
      "Lyftet: bekräftelsen delad med basnivån. Huvudjämförelsen är halk mot alla: halkolyckornas lyft delat med alla olyckors. Marginalen 95 % (Katz), en undre gräns.");
    s();
    for (const [avst, x] of Object.entries(t.a) as [string, any][]) for (const [namn, fonster, y] of [["Kandidaten", "[t − 1, t + 2] h", x.kandidat], ["Efterhalkan", "[t, t + 6] h", x.efterhalkan]]) {
      s(`### ${namn}, ${fonster}, ${avst}${avst === "2 km" ? " (primärt)" : ""}`);
      s();
      tabell(["grupp", "varningar", "med olycka", "med halkolycka", "kalla timmar", "med olycka", "med halkolycka", "lyft alla", "lyft halk", "halk mot alla"],
        y.rader.filter((r: Arad) => !r.grupp.includes(" · ")).map((r: Arad) => [r.grupp, r.varningar.n, andel(r.varningar.alla, r.varningar.n), andel(r.varningar.halk, r.varningar.n),
          r.bas.n, andel(r.bas.alla, r.bas.n), andel(r.bas.halk, r.bas.n), kvotText(r.lyftAlla), kvotText(r.lyftHalk), kvotText(r.halkMotAlla)]));
      s(`Utan läge i stationer.json: ${y.utanLage.varningar} varningar och ${y.utanLage.bas} kalla timmar. Månad · halva står i JSON-filen.`);
      s();
    }
    const b = t.b;
    s(`## §5 Fråga (b) — ${t.tolkning}`);
    s();
    s(`W-A:s regler (scripts/vindsikt-steg0.ts): räckvidden ${RACKVIDD_M / 1000} km, olyckan i stationstimmen [h, h + 1 h), byvinden timmens högsta vimax och ` +
      `sikten timmens lägsta siktdjup, G_TAK ${G_TAK} m/s, W-A4 ≥ ${MIN_STATIONSTIMMAR} stationstimmar i sista bandet och ≥ ${MIN_OLYCKOR} olyckor totalt. ` +
      `Stationsvakten (#164) tar ${b.diskade} stationer ur byvinden, inga ur sikten. Samma olycka räknas vid varje station inom räckvidden: ` +
      `"timmar med olycka" är W-A:s tal, "olika olyckor" står bredvid.`);
    s();
    for (const [matt, rubrik] of [["vind", "Byvinden (diagnos, fäller inget)"], ["sikt", "Sikten"]] as const) for (const del of ["dygnet", "dagtid"] as const) for (const serie of ["alla", "halk"] as const) {
      const pr: Prov = b[matt][del][serie];
      s(`### ${rubrik} — ${del === "dygnet" ? "hela dygnet" : "dagtid 07–18"}, ${serie === "alla" ? "alla olyckor" : "halkolyckor"}`);
      s();
      tabell(["band", "stationstimmar", "timmar med olycka", "olika olyckor", "per 1 000 stationstimmar", "kvot mot första bandet"],
        pr.rader.map((r) => [r.namn, r.timmar, r.olyckor, r.unika, komma(r.per1000, 3), r.lo === null ? komma(r.kvot) : `${komma(r.kvot)} [${komma(r.lo)}–${komma(r.hi!)}]`]));
      s(`Monotont: ${pr.monoton ? "ja" : "nej"} · sista mot första: ${komma(pr.kvot)} (krav ≥ ${komma(KVOT_KRAV, 1)}), skiljbar från ${komma(KVOT_KRAV, 1)}: ${pr.skiljbar ? "ja" : "nej"} · ` +
        `W-A4: ${pr.underlag ? "ja" : "nej"} (${pr.rader[pr.rader.length - 1].timmar} stationstimmar, ${pr.olyckorTotalt} timmar med olycka) · som driften: ${pr.utfall}`);
      s();
    }
    const d = b.siktensDom;
    s(`### Siktens dom (§5) — ${t.tolkning}${t === res.tolkningar[0] ? "" : " (känslighet, inte domen)"}`);
    s();
    tabell(["villkor", "håller"], [["1. W-A3 över hela vintern med marginalvakten (oavgjort = fall)", `${d.w3 ? "ja" : "nej"} (kvot ${komma(d.kvot)})`],
      [`2. W-A4: ≥ ${MIN_STATIONSTIMMAR} stationstimmar under 200 m och ≥ ${MIN_OLYCKOR} olyckor`, d.w4 ? "ja" : "nej"],
      ["3. Riktningen på dagtid: kvoten < 200 m mot > 1000 m över 1", `${d.riktning ? "ja" : "nej"} (kvot ${d.dagKvot === null ? "–" : komma(d.dagKvot)})`]]);
    s(`**Sikten ${d.star ? "står kvar" : "stryks"}.**`);
    s();
  }
  s("## Reservationer");
  s();
  s("- W-A mäter samband, inte orsak: olyckorna bär ingen orsak, och en olycka i blåst räknas som en blåstolycka.");
  s("- Avstånden räknas på klotet (engine/src/geo.ts), som facitläsningens grannar; Postgres geography räknar på ellipsoiden.");
  s("- Marginalerna är undre gränser: tillfällena, timmarna och stationerna är inte oberoende.");
  return ut.join("\n");
}

// --- självtestet ---
async function sjalvtest() {
  let fel = 0; const k = (ok: boolean, m: string) => { if (!ok) { fel++; console.error("✗ " + m); } else console.log("  ok: " + m); };
  const T = (s: string) => Date.parse(s);
  const nara = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
  // Inläsningen: en hel rad, förskjutningar ett, två och fyra steg, en dubblett, samma tid på annan plats, en rad utan tid, en tom rad
  // och en utan koordinat. Halkordet i den förskjutna raden står bara i spillet: utan lagningen faller både tiden och klassningen.
  const kol = ["Händelse", "EventText", "Beskrivning", "StartTid", "Sluttid", "X", "Y", "Plats"];
  const rad = (text: string[], start: string, N: string, E = "500000") => ["Olycka", "NULL", ...text, start, "2024-12-02 09:00:00.000", N, E, "Väg 1"];
  const inl = lasOlyckor(kol, [
    rad(["Singelolycka, bilen i diket"], "2024-12-02 07:15:00.000", "6650000"),
    rad(["Upphinnande, vägbanan", "hade is"], "2024-12-03 16:05:00.000", "6651000"),
    rad(["a", "b", "c"], "2024-12-04 08:00:00.000", "6652000"),
    rad(["a", "b", "c", "d", "e"], "2024-12-05 08:00:00.000", "6653000"),
    rad(["Halt, samma olycka"], "2024-12-02 07:15:00.000", "6650000"),
    rad(["Annan plats"], "2024-12-02 07:15:00.000", "6650000", "500100"),
    ["Olycka", "NULL", "ingen tid", "igår", "", "6650000", "500000", ""],
    ["", "", "", ""],
    rad(["Utan plats"], "2024-12-06 08:00:00.000", "NULL", "NULL"),
  ]);
  k(inl.rader === 8 && inl.utanTid === 1 && JSON.stringify(inl.forskjutna) === JSON.stringify({ 1: 1, 2: 1, 4: 1 }),
    `förskjutna rader: ett, två och fyra steg lagade, raden utan tid räknad för sig, den tomma raden ingen rad (${JSON.stringify({ rader: inl.rader, utanTid: inl.utanTid, f: inl.forskjutna })})`);
  k(inl.dubbletter === 1 && inl.olyckor.length === 6 && inl.dubbletterOlikHalk === 1 && inl.olyckor[0].halk,
    `dubbletten räknas en gång och är halk när en av raderna är det; samma tid 100 m bort är en egen olycka (${inl.dubbletter} dubblett, ${inl.olyckor.length} olyckor)`);
  const f1 = inl.olyckor.find((o) => o.start === "2024-12-03 16:05:00.000")!, f4 = inl.olyckor.find((o) => o.start === "2024-12-05 08:00:00.000")!;
  k(f1.halk && f1.ord[ORD.indexOf(String.raw`\mis\M`)] && nara(f1.lon!, 15, 1e-9) && f4.lat! > f1.lat!,
    "den förskjutna raden: tiden, koordinaten och fritexten med spillet (\"is\" står bara i spillet)");
  k(inl.utanKoordinat === 1 && inl.olyckor.filter((o) => o.lon === null).length === 1, "raden med NULL som koordinat paras inte");
  // Koordinaterna: proj4:s etmerc (en annan algoritm, beroende sedan tidigare) som facit, i Sveriges hörn och mitt; medelmeridianen exakt.
  const proj4 = (await import("proj4")).default;
  const sweref = "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
  let storst = 0;
  for (const [N, E] of [[6137751, 280588], [7594286, 916273], [6580822, 674032], [7400000, 300000], [6200000, 900000]]) {
    const [lon, lat] = proj4(sweref, "EPSG:4326", [E, N]), g = sweref99tmTillWgs84(N, E);
    storst = Math.max(storst, Math.abs(g.lon - lon), Math.abs(g.lat - lat));
  }
  k(storst < 1e-8, `SWEREF 99 TM → WGS 84 mot proj4 i fem punkter, största skillnad ${storst.toExponential(1)}° (< 1e-8°, under en millimeter)`);
  const m0 = sweref99tmTillWgs84(6651411.2, 500000);
  k(m0.lon === 15 && nara(m0.lat, 60, 1e-5), `medelmeridianen: E 500 000 är 15° exakt, N 6 651 411 är 60° (${m0.lat.toFixed(6)})`);
  const omvand = sweref99tmTillWgs84(500000, 6580822);
  k(!giltig(500000, 6580822) && omvand.lat < 10, "X och Y omkastade ger ingen plats i Sverige, och den giltighetsprövningen fångar");
  // Ordlistan: förregistreringens = skuggfacitets, och översättningen ger Postgres svar på de påhittade meningarna.
  k(readFileSync(FORREG, "utf8").match(/`(halk\|[^`]+)`/)?.[1] === ORDLISTA && ORD.length === 8, `ordlistan i förregistreringen är HANDELSE_SQL:s: ${ORDLISTA}`);
  for (const [mening, hela, ord] of PROVMENINGAR) {
    const fick = ORD.filter((_, i) => ORD_RE[i].test(mening));
    k(HALK.test(mening) === hela && JSON.stringify(fick) === JSON.stringify(ord), `"${mening}": ${hela ? "halk" : "inte halk"} ${JSON.stringify(fick)}`);
  }
  // Tidszonen åt båda hållen. Helgen bär en förmiddagstopp kl. 11 som bara syns om helgen räknas.
  const st = (dag: string, timmar: [number, number][]) => timmar.flatMap(([h, n]) => Array(n).fill(`${dag} ${String(h).padStart(2, "0")}:10:00.000`));
  const helg = st("2024-12-07", [[11, 20]]), natt = ["2025-03-30 01:30:00.000", "2025-03-30 03:10:00.000"];
  const sv = tidszonen([...st("2024-12-02", [[8, 5], [7, 3], [16, 6], [15, 2]]), ...helg, ...natt]);
  k(sv.lage === "svensk" && sv.formiddag.join() === "8" && sv.natten02 === 0, `rusningen 08 och 16 svensk tid, helgen räknas inte (${JSON.stringify([sv.formiddag, sv.eftermiddag, sv.lage])})`);
  k(tidszonen([...st("2024-12-02", [[6, 5], [14, 6]]), ...helg]).lage === "utc", "rusningen 06 och 14 ⇒ UTC");
  k(tidszonen(st("2024-12-02", [[6, 5], [16, 6]])).lage === "utc" && tidszonen(st("2024-12-02", [[7, 5], [16, 6]])).lage === "svensk",
    "06 och 16 ⇒ UTC; 07 och 16 ligger i båda och läses i förregistreringens ordning ⇒ svensk tid");
  k(tidszonen(st("2024-12-02", [[10, 5], [19, 6]])).lage === "oklart" && tidszonen(st("2024-12-02", [[7, 5], [10, 5], [16, 6]])).lage === "oklart",
    "10 och 19 ⇒ oklart; lika många kl. 07 och 10 ⇒ oklart");
  k(tidszonen([...st("2024-12-02", [[8, 5], [16, 6]]), "2025-03-30 02:30:00.000"]).lage === "oklart", "en olycka timmen 02 natten till 30/3 fäller svensk tid ⇒ oklart");
  const ok = tolkningar({ ...sv, lage: "oklart" }), o0: Olycka = { start: "2024-12-02 07:15:00.000", lon: 15, lat: 60, halk: false, ord: [], eventText: "" };
  k(ok.length === 2 && punkter([o0], ok[0])[0].t === T("2024-12-02T06:15Z") && punkter([o0], ok[1])[0].t === T("2024-12-02T07:15Z")
    && tolkningar(sv).length === 1 && punkter([o0], tolkningar({ ...sv, lage: "utc" })[0])[0].t === T("2024-12-02T07:15Z"),
    "oklart ⇒ svensk tid och känsligheten en timme senare; klart svar ⇒ en tolkning");
  // Fråga (a): avstånd, fönster med gränserna medräknade, halk och utan läge. En längdgrad vid 60° ≈ 55,6 km.
  const t0 = T("2024-12-10T12:00Z"), oster = (km: number) => 15 + km / 55.6;
  const olyckor: Punkt[] = [{ t: t0 + 2 * H, lon: oster(1.9), lat: 60, halk: true }, { t: t0 - H - 1, lon: oster(1), lat: 60, halk: false },
    { t: t0 + 30 * 60_000, lon: oster(4), lat: 60, halk: false }, { t: t0 + 10 * H, lon: oster(2.1), lat: 60, halk: false }];
  const stn = [{ id: "s", lon: 15, lat: 60 }, { id: "n", lon: 15, lat: 63 }];
  const tf = [{ station: "s", t: t0 }, { station: "s", t: t0 - 2.5 * H }, { station: "s", t: t0 + 10 * H }, { station: "utan", t: t0 }];
  const b2 = bekrafta(tf, naraTider(stn, olyckor, NARA_M), KANDIDAT_FONSTER_H), b5 = bekrafta(tf, naraTider(stn, olyckor, NARA_BREDVID_M), KANDIDAT_FONSTER_H);
  const r2 = b2.per.get("2024-12 · söder")!, r5 = b5.per.get("2024-12 · söder")!;
  k(r2.n === 3 && r2.alla === 2 && r2.halk === 1 && b2.utanLage === 1,
    `2 km, [t − 1, t + 2] h: olyckan t + 2 h räknas, t − 1 h − 1 ms inte; 2,1 km bort inte; halk för sig; stationen utan läge för sig ${JSON.stringify(r2)}`);
  k(r5.alla === 3 && r5.halk === 1, `5 km: olyckan 2,1 km bort räknas också ${JSON.stringify(r5)}`);
  k(halva(62) === "norr" && halva(61.99) === "söder" && finns([1, 5, 9], 5, 5) && !finns([1, 5, 9], 6, 8), "norr från 62°; fönstret med gränserna");
  const l = andelskvot(50, 1000, 200, 10000)!;
  k(nara(l.varde, 2.5, 1e-12) && nara(l.lo!, 1.8465, 1e-3) && nara(l.hi!, 3.3848, 1e-3),
    `lyftet (50/1000)/(200/10000) = 2,5 med marginalen [${komma(l.lo!, 4)}–${komma(l.hi!, 4)}], SE √(1/50 − 1/1000 + 1/200 − 1/10000)`);
  k(andelskvot(0, 1000, 200, 10000)!.lo === null && andelskvot(5, 1000, 0, 10000) === null && andelskvot(5, 0, 1, 1) === null,
    "inga bekräftade ⇒ lyftet 0 utan marginal; ingen bas ⇒ inget lyft");
  const fa = fragaA(tf, [{ station: "s", t: t0 + 10 * H }, { station: "s", t: t0 }, { station: "n", t: t0 }], naraTider(stn, olyckor, NARA_M), KANDIDAT_FONSTER_H);
  const tot = fa.rader.find((r) => r.grupp === "totalt")!;
  k(tot.varningar.n === 3 && tot.bas.n === 3 && tot.bas.alla === 1 && nara(tot.lyftAlla!.varde, 2, 1e-12) && nara(tot.halkMotAlla!.varde, 0.5, 1e-12)
    && fa.rader.some((r) => r.grupp === "norr" && r.bas.n === 1) && fa.rader.some((r) => r.grupp === "2024-12"),
    `fråga (a): lyftet (2/3)/(1/3) = 2 och halk mot alla (1/2)/(1/1) = 0,5; norr, söder och månaden finns (${JSON.stringify(tot)})`);
  // Fråga (b): räckvidden, timmen, G_TAK, stationsvakten och dagtiden. Kl. 06 UTC i december är 07 svensk tid.
  const h0 = T("2024-12-10T06:00Z") / H, norr = (km: number) => 60 + km / 111.2;
  const timmar: Stationstimmar[] = [
    { station: "A", lon: 15, lat: 60, omojliga: 0, h: [h0, h0 + 1, h0 + 3], byvind: [12, 35, 5], sikt: [150, 20000, 300] },
    { station: "B", lon: 15, lat: 60, omojliga: 1, h: [h0], byvind: [25], sikt: [600] },
  ];
  const wa = waRakna(timmar, [{ t: h0 * H + 10 * 60_000, lon: 15, lat: norr(14), halk: false }, { t: (h0 + 1) * H + 59 * 60_000, lon: 15, lat: norr(5), halk: true },
    { t: (h0 + 3) * H, lon: 15, lat: norr(16), halk: false }, { t: (h0 + 4) * H, lon: 15, lat: 60, halk: false }]);
  const vb = (u: Band[]) => u.map((x) => `${x.timmar}/${x.olyckor}`).join(" ");
  k(wa.diskade === 1 && vb(wa.vind.dygnet.alla) === "1/0 1/1 0/0 0/0",
    `byvinden: 14 km med, 16 km utanför, 35 m/s över G_TAK kastad, stationsvaktens station B utanför (${vb(wa.vind.dygnet.alla)})`);
  k(vb(wa.sikt.dygnet.alla) === "1/1 1/1 1/0 1/1" && vb(wa.sikt.dygnet.halk) === "1/1 1/0 1/0 1/0" && wa.sikt.dygnet.alla[3].unika === 1,
    `sikten: B räknas, olyckan 07:59 UTC i timmen 07, olyckan på slaget 10:00 inte i timmen 09 (${vb(wa.sikt.dygnet.alla)} · halk ${vb(wa.sikt.dygnet.halk)})`);
  k(dagtid(T("2024-12-10T06:00Z")) && !dagtid(T("2024-12-10T05:00Z")) && dagtid(T("2024-12-10T16:00Z")) && !dagtid(T("2024-12-10T17:00Z"))
    && dagtid(T("2025-03-31T05:00Z")) && !dagtid(T("2025-03-31T04:00Z")), "dagtid 07:00–18:00 svensk tid, vintertid och sommartid");
  // Siktens dom: klarar, faller på oavgjort, faller på W-A4 och faller på dagtidens riktning — vart och ett ensamt.
  const band = (x: [number, number][]) => x.map(([timmar, olyckor], i) => ({ namn: SIKTBAND[i][0], timmar, olyckor, unika: olyckor }));
  const hela = (sista: [number, number]) => band([[1_000_000, 1000], [50_000, 75], [40_000, 80], sista]);
  const dagRatt = band([[400_000, 300], [20_000, 20], [16_000, 20], [4_000, 12]]), dagFel = band([[400_000, 400], [20_000, 20], [16_000, 20], [4_000, 2]]);
  const d1 = siktensDom(hela([10_000, 60]), dagRatt), d2 = siktensDom(hela([600, 2]), dagRatt), d3 = siktensDom(hela([400, 40]), dagRatt), d4 = siktensDom(hela([10_000, 60]), dagFel);
  k(d1.star && d1.w3 && d1.w4 && d1.riktning && waProv(hela([10_000, 60])).utfall === "KLARAR", "siktens dom: kvoten 6, 60 mot 1 000 olyckor, rätt riktning ⇒ står kvar");
  k(!d2.star && !d2.w3 && d2.w4 && d2.riktning && waProv(hela([600, 2])).utfall === "OAVGJORT", "siktens dom: kvoten 3,3 på 2 olyckor går inte att skilja från 1,5 ⇒ oavgjort ⇒ stryks");
  k(!d3.star && d3.w3 && !d3.w4 && d3.riktning && waProv(hela([400, 40])).utfall === "SPÄRRAD", "siktens dom: 400 stationstimmar under 200 m ⇒ W-A4 faller ⇒ stryks");
  k(!d4.star && d4.w3 && d4.w4 && !d4.riktning && nara(d4.dagKvot!, 0.5, 1e-12), "siktens dom: dagtidens kvot 0,5 ⇒ riktningen faller ⇒ stryks");
  // Hela vägen till utskriften på de påhittade olyckorna: bara aggregat, ingen fritext, ingen plats och ingen koordinat.
  const res = { fil: { namn: FIL, bytes: 0, sha256: "-" }, ...berakna(inl, { kandidat: tf, kalla: tf, fyrningar: tf, stationer: stn, stationstimmar: timmar }) };
  const ut = JSON.stringify(res) + markdown(res);
  const lacker = ["Singelolycka", "Upphinnande", "vägbanan", "samma olycka", "Annan plats", "Utan plats", "ingen tid", "Väg 1", "6650000", "6651000", "500100",
    ...inl.olyckor.filter((o) => o.lat !== null).map((o) => String(o.lat))];
  k(lacker.every((x) => !ut.includes(x)) && ut.includes("Siktens dom") && res.serier.halk === 2 && res.serier.ord[ORD.indexOf("halk")].traffar === 0,
    `utskriften bär bara aggregat (${ut.length} tecken, ${lacker.length} fritexter, platser och koordinater prövade; ${lacker.filter((x) => ut.includes(x)).join(", ") || "ingen läcker"})`);
  // Spärren: den signerade förregistreringen släpper, utan signaturerna eller med bara en vägrar den.
  const text = readFileSync(FORREG, "utf8"), utan = text.replace(/^\| Axel \|.*$/m, "| Axel | | |");
  k(sparr(text) === null && sparr(utan) !== null && sparr(utan.replace(/^\| Bengt \|.*$/m, "| Bengt | | |")) !== null,
    "spärren: släpper den signerade förregistreringen, vägrar utan Axels signatur och utan båda");
  if (fel) process.exit(1);
  console.log("SJÄLVTEST OK: olyckor-trv");
}

const direkt = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("kuvos/olyckor-trv.ts");
if (direkt) {
  const args = process.argv.slice(2);
  if (args[0] === "--sjalvtest") await sjalvtest();
  else if (args[0] === "--signerad" && args[1]) {
    const fel = sparr(readFileSync(args[1], "utf8"));
    console.log(`förregistreringen ${args[1]}: ${fel ?? "signerad av Bengt och Axel (DECISIONS #697)"}`);
    if (fel) process.exit(2);
  } else { console.error("kör: olyckor-trv.ts --sjalvtest | --signerad <förregistreringen>"); process.exit(1); }
}
