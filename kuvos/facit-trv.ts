// KUVÖSENS FACIT UR TRAFIKVERKETS VÄGLAG 2024/25 (DECISIONS #591, docs/FORREGISTRERING-FACIT-TRV-2024-25.md). Läsningen följer
// förregistreringen rad för rad: is är kod 60, 61, 70 och 71 i kod 1 eller kod 2; väglaget gäller från sin ändring till sträckans
// nästa; en station hör till sträckorna inom 2 km från deras linje; kandidaten bekräftas inom [t − 1, t + 2] h och efterhalkan inom
// [t, t + 6] h; en miss är en is-episod utan kandidatens kalla timme hos någon av sträckans stationer under de 2 h före; åtgärderna
// (20 och 50) räknas inom [t − 6, t + 6] h. Allt redovisas per månad och breddgradsband, bara som antal och andelar: Trafikverkets
// rader skrivs aldrig ut (PUBLIKT REPO). Den skarpa läsningen vägrar utan båda signaturerna i förregistreringen.
//
//   node --experimental-strip-types kuvos/facit-trv.ts --sjalvtest
//   node --experimental-strip-types kuvos/facit-trv.ts --las --xlsx <mapp> --linjer <vaglag.geojson> --stationer <stationer.json>
//        --kalla <csv: station,t_utc> --kandidat <csv: station,t_utc> --fyrningar <csv: station,t_utc> --forreg <förregistreringen>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deflateRawSync, inflateRawSync } from "node:zlib";

export const IS = new Set([60, 61, 70, 71]);
export const SNO = new Set([30, 31, 40, 41, 50, 51, 100, 101]);
export const PAR_M = 2000;
export const KANDIDAT_FONSTER_H: [number, number] = [-1, 2];
export const EFTERHALKA_FONSTER_H: [number, number] = [0, 6];
export const MISS_FORE_H = 2;
export const ATGARD_FONSTER_H: [number, number] = [-6, 6];
export const ATGARD_TYPER = new Set([20, 50]);
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

/** Is-episoder utan kandidatens kalla timme hos någon av sträckans stationer under MISS_FORE_H före starten. */
export function missar(is: Map<string, [number, number][]>, par: Map<string, string[]>, kalla: Tillfalle[]):
  { episoder: number; missade: number; utanStation: number } {
  const stationerPa = new Map<string, string[]>();
  for (const [st, segs] of par) for (const s of segs) (stationerPa.get(s) ?? stationerPa.set(s, []).get(s)!).push(st);
  const perStation = new Map<string, number[]>();
  for (const k of kalla) (perStation.get(k.station) ?? perStation.set(k.station, []).get(k.station)!).push(k.t);
  let episoderN = 0, missade = 0, utanStation = 0;
  for (const [seg, ep] of is) for (const [start] of ep) {
    const st = stationerPa.get(seg) ?? [];
    if (!st.length) { utanStation++; continue; }
    episoderN++;
    const sedd = st.some((s) => (perStation.get(s) ?? []).some((t) => t < start && t >= start - MISS_FORE_H * H));
    if (!sedd) missade++;
  }
  return { episoder: episoderN, missade, utanStation };
}

export type Atgard = { seg: string; typ: number; start: number | null; stopp: number | null };
/** Andelen tillfällen med planerad halkbekämpning (20 eller 50) på stationens sträckor inom ATGARD_FONSTER_H. */
export function atgarder(tillfallen: Tillfalle[], par: Map<string, string[]>, atg: Atgard[]): { antal: number; med: number; borttagna: number } {
  const giltiga = atg.filter((a) => ATGARD_TYPER.has(a.typ) && a.start !== null && a.stopp !== null && a.start >= PERIOD_START);
  const per = new Map<string, [number, number][]>();
  for (const a of giltiga) (per.get(a.seg) ?? per.set(a.seg, []).get(a.seg)!).push([a.start!, a.stopp!]);
  let antal = 0, med = 0;
  for (const x of tillfallen) {
    const seg = par.get(x.station) ?? [];
    if (!seg.length) continue;
    antal++;
    if (seg.some((s) => overlappar(per.get(s), x.t + ATGARD_FONSTER_H[0] * H, x.t + ATGARD_FONSTER_H[1] * H))) med++;
  }
  return { antal, med, borttagna: atg.length - giltiga.length };
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
  const m = missar(ep, p, [{ station: "nara", t: T("2024-12-01T01:30Z") }]);
  k(m.episoder === 2 && m.missade === 1, `missarna: episoden 03:00 sedd 01:30, episoden 2/12 00:00 missad ${JSON.stringify(m)}`);
  const at = atgarder([{ station: "nara", t: T("2024-12-01T02:30Z") }, { station: "nara", t: T("2024-12-03T02:30Z") }], p,
    [{ seg: "S", typ: 50, start: T("2024-12-01T06:00Z"), stopp: T("2024-12-01T09:00Z") }, { seg: "S", typ: 10, start: T("2024-12-03T01:00Z"), stopp: T("2024-12-03T03:00Z") },
     { seg: "S", typ: 20, start: null, stopp: T("2024-12-03T03:00Z") }, { seg: "S", typ: 20, start: T("2008-02-03T18:00Z"), stopp: T("2008-02-05T06:00Z") }]);
  k(at.antal === 2 && at.med === 1 && at.borttagna === 3, `åtgärderna: förebyggande 6 h efter räknas, plogning inte, tomma och 2008 borttagna ${JSON.stringify(at)}`);
  k(signerad("| Bengt | 2026-10-20 | BL |\n| Axel | | |").axel === false && signerad("| Bengt | 2026-10-20 | BL |\n| Axel | 2026-10-20 | AL |").axel, "signaturerna");
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
function csv(fil: string): Tillfalle[] {
  return readFileSync(fil, "utf8").trim().split(/\r?\n/).slice(1).map((r) => { const [station, t] = r.split(","); return { station, t: Date.parse(t) }; });
}
function las(arg: Record<string, string>) {
  const forreg = readFileSync(arg["--forreg"], "utf8"), sig = signerad(forreg);
  if (!sig.bengt || !sig.axel) { console.error(`vägrar: förregistreringen är inte signerad av båda (Bengt ${sig.bengt}, Axel ${sig.axel})`); process.exit(2); }
  const v = lasXlsx(readFileSync(join(arg["--xlsx"], "RoadCondition24-25.xlsx")));
  const ki = (n: string) => v.kolumner.indexOf(n);
  const tz = tidszonsprov(v.rader.map((r) => r[ki("ModifiedTime")]));
  console.log(`tidszonen: ${tz.lage} (timmen 02 natten till 30/3 2025: ${tz.i02} ändringar, timmarna runt: ${tz.runt})`);
  if (tz.lage === "oklart") { console.error("vägrar: tidszonen går inte att avgöra"); process.exit(2); }
  const andr: Andring[] = v.rader.map((r) => ({ seg: r[ki("ID")], t: tid(r[ki("ModifiedTime")], tz.lage)!, kod1: Number(r[ki("RoadCondCode1")]),
    kod2: r[ki("RoadCondCode2")] === "NULL" || r[ki("RoadCondCode2")] === "" ? null : Number(r[ki("RoadCondCode2")]) })).filter((a) => a.t !== null);
  const is = episoder(andr, IS), sno = episoder(andr, SNO);
  const a = lasXlsx(readFileSync(join(arg["--xlsx"], "RoadConditionMeasures24-25.xlsx")));
  const ai = (n: string) => a.kolumner.indexOf(n);
  const atg: Atgard[] = a.rader.map((r) => ({ seg: r[ai("Id")], typ: Number(r[ai("MeasureType")]), start: tid(r[ai("StartTime")], tz.lage), stopp: tid(r[ai("StopTime")], tz.lage) }));
  const gj = JSON.parse(readFileSync(arg["--linjer"], "utf8"));
  const linjer = gj.features.map((f: any) => ({ id: String(f.properties.segment_id),
    delar: f.geometry.type === "MultiLineString" ? f.geometry.coordinates : [f.geometry.coordinates] }));
  const st = JSON.parse(readFileSync(arg["--stationer"], "utf8")).rader.map((s: any) => ({ id: String(s.id), lon: Number(s.lon), lat: Number(s.lat) }));
  const lat = new Map(st.map((s: any) => [s.id, s.lat]));
  const par = parning(st, linjer);
  const grupp = (x: Tillfalle) => `${manad(x.t)} · ${band((lat.get(x.station) as number) ?? 0)}`;
  const kalla = csv(arg["--kalla"]), kand = csv(arg["--kandidat"]), fyr = csv(arg["--fyrningar"]);
  const skriv = (namn: string, m: Map<string, Rakning>) => { console.log(`== ${namn}`);
    for (const [g, r] of [...m].sort()) console.log(`  ${g}: ${r.bekraftade} av ${r.antal} bekräftade (${r.antal ? (100 * r.bekraftade / r.antal).toFixed(1) : "–"} %), utan sträcka ${r.utanStracka}`); };
  console.log(`sträckor med is-episod: ${[...is.values()].filter((e) => e.length).length}; is-episoder ${[...is.values()].reduce((n, e) => n + e.length, 0)}; snö- och moddepisoder ${[...sno.values()].reduce((n, e) => n + e.length, 0)}`);
  console.log(`stationer med sträcka inom 2 km: ${[...par.values()].filter((x) => x.length).length} av ${par.size}`);
  skriv("basnivån: kalla station-timmar, [t − 1, t + 2] h", bekrafta(kalla, par, is, KANDIDAT_FONSTER_H, grupp));
  skriv("kandidaten, [t − 1, t + 2] h", bekrafta(kand, par, is, KANDIDAT_FONSTER_H, grupp));
  skriv("efterhalkan, [t, t + 6] h", bekrafta(fyr, par, is, EFTERHALKA_FONSTER_H, grupp));
  const m = missar(is, par, kand);
  console.log(`missar: ${m.missade} av ${m.episoder} is-episoder utan kandidatens kalla timme 2 h före; ${m.utanStation} episoder på sträckor utan station`);
  for (const [namn, x] of [["kandidaten", kand], ["efterhalkan", fyr]] as const) {
    const r = atgarder(x, par, atg);
    console.log(`åtgärder vid ${namn}: ${r.med} av ${r.antal} med planerad halkbekämpning inom ±6 h (${r.borttagna} åtgärdsrader utan tid eller före perioden)`);
  }
}

const direkt = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("kuvos/facit-trv.ts");
if (direkt) {
  const args = process.argv.slice(2);
  if (args[0] === "--sjalvtest") sjalvtest();
  else if (args[0] === "--las") { const o: Record<string, string> = {}; for (let i = 1; i < args.length; i += 2) o[args[i]] = args[i + 1]; las(o); }
  else { console.error("kör: facit-trv.ts --sjalvtest | --las --xlsx <mapp> --linjer <geojson> --stationer <json> --kalla <csv> --kandidat <csv> --fyrningar <csv> --forreg <md>"); process.exit(1); }
}
