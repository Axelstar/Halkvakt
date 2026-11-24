// Viltets steg 0 (Bengt 13/11: "Ja, förbered steg 0"). LÄS-ONLY: Trafikverkets viltolyckskartor 2020–2024 (Lastkajen, produktpaket
// 10094, GeoPackage, CC0; metoden i Trafikverkets publikation 2019:179), räknade — ingenting sparas och ingenting skrivs utom
// utskriften. Filen hämtas av Bengt (Lastkajen kräver inloggning) och ligger utanför repot.
//
// Frågan: går det att bygga en smal viltvarning på sträckor där viltolyckor är vanliga, eller talar den överallt? PLAN.md rad A4
// beskrev varningen från början; den lades i vila 25/8 för att öppen data med positioner saknades (DECISIONS #13).
//
// FÖRREGISTRERAT FÖRE KÖRNINGEN. Ingen dom och inga egna trösklar: trappan nedan är en beskrivning, och gränsen 1 olycka per km
// och år med längre än 250 m är Trafikverkets egen definition av en hotspot (2019:179), så långt länkarnas fält bär den.
//   falt   Varje lager med antal rader, och varje kolumn som den FINNS: typ, tomma, spann eller vanligaste värden. Fältnamnen i
//          2019:179 gäller äldre serier, så de binds först efter den här utskriften.
//   rakna  (1) Nätet: länkar, kilometer, olyckor; frekvensfältet mot antal / (km × 5 år) och längdfältet mot geometrin.
//          (2) Koncentrationen: andelen olyckor på de 1, 2, 5, 10 och 20 % av väglängden som har högst frekvens.
//          (3) Trappan: länkar längre än 250 m med frekvens över 0,5 · 1 · 2 · 3 — länkar, kilometer, andel av nätet och av
//              olyckorna; längden på de heta länkarna och hur många som har färre än tre olyckor; vanligaste art per het länk.
//          (4) Takten längs de 20 svenska skuggrutterna (skuggmotorns ROUTES, grova linjer): länkar med ruttens vägnummer vars
//              mittpunkt ligger inom 5 km från linjen; heta länkar slås ihop till en sträcka när luckan är högst 500 m
//              (halkzonens regel); sträckor per 100 km, andelen av rutten inom en sträcka, och rop på ett varv med kandidatens
//              tak (DECISIONS #606: högst ett rop per 10 minuter, här 80 km/h). En rutt utan kopplade länkar skrivs som
//              "ingen koppling", aldrig som noll sträckor.
//          Filen bär ingen tid. Tidsvillkoret (artens veckor och timmar) minskar takten ytterligare och hör till nästa steg.
//
// Kör:  node --experimental-strip-types scripts/matningar/vilt-steg0-2026-11-13.ts --sjalvtest
//       node --experimental-strip-types scripts/matningar/vilt-steg0-2026-11-13.ts falt <fil.gpkg>
//       node --experimental-strip-types scripts/matningar/vilt-steg0-2026-11-13.ts rakna <fil.gpkg> <lager> [fält=kolumn ...] [langdenhet=km]
// Fälten och deras förval (2019:179): frekvens=VIOL_kmyr antal=VIOL_iLINK langd=LANGD vagnr=VAGNR lan=LAN alg=ALG radjur=RAD
// vildsvin=VSN dovhjort=DVH kronhjort=KRH. Ett fält som saknas stoppar körningen med lagrets kolumner utskrivna.
// Källa: Trafikverket, Viltolyckskartor (CC0).
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

type P = [number, number];                                           // [E, N] i SWEREF99 TM, meter
export type Lank = { vagnr: string; lan: string; langd: number; frekvens: number; antal: number; mitt: P | null; geoLangd: number;
  arter: Record<string, number> };

export const STEG = [0.5, 1, 2, 3];                                  // olyckor per km och år (trappan)
export const MIN_LANGD_M = 250;                                      // Trafikverkets hotspot: längre än 250 m (2019:179)
export const KORRIDOR_M = 5000;                                      // länkens mittpunkt från ruttens grova linje
export const ZON_M = 500;                                            // heta länkar närmare än så är en sträcka (halkzonen)
export const TAK_M = 80 / 3.6 * 600;                                 // kandidatens tak: ett rop per 10 minuter i 80 km/h
const ARTER = ["alg", "radjur", "vildsvin", "dovhjort", "kronhjort"];
const FORVAL: Record<string, string> = { frekvens: "VIOL_kmyr", antal: "VIOL_iLINK", langd: "LANGD", vagnr: "VAGNR", lan: "LAN",
  alg: "ALG", radjur: "RAD", vildsvin: "VSN", dovhjort: "DVH", kronhjort: "KRH" };

const rad = (s: string) => console.log(`mätt: ${s}`);
const cit = (s: string) => `"${s.replace(/"/g, '""')}"`;
const pct = (a: number, b: number) => b > 0 ? `${(100 * a / b).toFixed(1)} %` : "–";

/** WGS84 → SWEREF99 TM (Krüger-serien), samma formel som scripts/vagdata-rekognosering.ts, som kör sitt eget program vid import. */
export function sweref99tm(lon: number, lat: number): P {
  const a = 6378137, f = 1 / 298.257222101, k0 = 0.9996, lon0 = 15, FE = 500000;
  const e2 = f * (2 - f), n = f / (2 - f), A = a / (1 + n) * (1 + n * n / 4 + n ** 4 / 64);
  const φ = lat * Math.PI / 180, λ = (lon - lon0) * Math.PI / 180;
  const e = Math.sqrt(e2), conf = Math.atanh(Math.sin(φ)) - e * Math.atanh(e * Math.sin(φ));
  const t = Math.sinh(conf), ξ0 = Math.atan2(t, Math.cos(λ)), η0 = Math.atanh(Math.sin(λ) / Math.sqrt(1 + t * t));
  const α = [n / 2 - 2 * n * n / 3 + 5 * n ** 3 / 16, 13 * n * n / 48 - 3 * n ** 3 / 5, 61 * n ** 3 / 240];
  let ξ = ξ0, η = η0;
  α.forEach((c, i) => { const j = 2 * (i + 1); ξ += c * Math.sin(j * ξ0) * Math.cosh(j * η0); η += c * Math.cos(j * ξ0) * Math.sinh(j * η0); });
  return [FE + k0 * A * η, k0 * A * ξ];
}

/** GeoPackage-geometrin (huvud + WKB) som linjens delar. Annat än LineString och MultiLineString ger en tom lista. */
export function delar(b: Uint8Array): P[][] {
  if (b.length < 8 || b[0] !== 0x47 || b[1] !== 0x50) return [];
  const env = [0, 32, 48, 48, 64][(b[3] >> 1) & 7];
  if (env === undefined) return [];
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let o = 8 + env;
  const las = (): P[][] => {
    const le = dv.getUint8(o) === 1; o += 1;
    let typ = dv.getUint32(o, le); o += 4;
    let dim = 2;
    if (typ >= 0x20000000) {                                         // EWKB: flaggor i de höga bitarna
      if (typ & 0x20000000) o += 4;
      if (typ & 0x80000000) dim++;
      if (typ & 0x40000000) dim++;
      typ &= 0xff;
    } else if (typ >= 1000) { dim += typ >= 3000 ? 2 : 1; typ %= 1000; }   // ISO: 1000 Z, 2000 M, 3000 ZM
    if (typ === 2) {
      const n = dv.getUint32(o, le); o += 4;
      const ut: P[] = [];
      for (let i = 0; i < n; i++) { ut.push([dv.getFloat64(o, le), dv.getFloat64(o + 8, le)]); o += 8 * dim; }
      return [ut];
    }
    if (typ === 5) {
      const n = dv.getUint32(o, le); o += 4;
      const ut: P[][] = [];
      for (let i = 0; i < n; i++) ut.push(...las());
      return ut;
    }
    return [];
  };
  try { return las(); } catch { return []; }
}

const avst = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Linjens längd och punkten på halva längden (delarna i ordning, luckor mellan delar räknas inte). */
export function mittOchLangd(d: P[][]): { mitt: P | null; langd: number } {
  let langd = 0;
  for (const del of d) for (let i = 1; i < del.length; i++) langd += avst(del[i - 1], del[i]);
  if (!d.length || !d[0].length) return { mitt: null, langd: 0 };
  let kvar = langd / 2;
  for (const del of d) for (let i = 1; i < del.length; i++) {
    const s = avst(del[i - 1], del[i]);
    if (s >= kvar && s > 0) { const t = kvar / s; return { mitt: [del[i - 1][0] + t * (del[i][0] - del[i - 1][0]), del[i - 1][1] + t * (del[i][1] - del[i - 1][1])], langd }; }
    kvar -= s;
  }
  return { mitt: d[0][0], langd };
}

/** Punktens avstånd till linjen och läget längs den, i meter. */
export function langsLinjen(p: P, linje: P[]): { d: number; s: number } {
  let bast = { d: Infinity, s: 0 }, fore = 0;
  for (let i = 1; i < linje.length; i++) {
    const a = linje[i - 1], b = linje[i], L = avst(a, b);
    const t = L > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / (L * L))) : 0;
    const d = avst(p, [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    if (d < bast.d) bast = { d, s: fore + t * L };
    fore += L;
  }
  return bast;
}

const siffror = (s: string) => /\d+/.exec(s)?.[0] ?? "";
const het = (l: Lank, steg: number) => l.langd > MIN_LANGD_M && l.frekvens > steg;

/** Andelen olyckor på de x % av väglängden som har högst frekvens (en länk som delas av gränsen räknas i proportion). */
export function koncentration(lankar: Lank[], andelar: number[]): number[] {
  const s = [...lankar].sort((a, b) => b.frekvens - a.frekvens);
  const km = s.reduce((a, l) => a + l.langd, 0), ol = s.reduce((a, l) => a + l.antal, 0);
  return andelar.map((x) => {
    let kvar = km * x, sum = 0;
    for (const l of s) {
      if (kvar <= 0) break;
      const del = l.langd > 0 ? Math.min(1, kvar / l.langd) : 1;
      sum += l.antal * del; kvar -= l.langd;
    }
    return ol > 0 ? sum / ol : 0;
  });
}

/** Takten längs en rutt: länkarna med vägnumret inom korridoren, de heta, sträckorna och ropen på ett varv med taket. */
export function takt(lankar: Lank[], linje: P[], vagnr: string, steg: number):
  { kopplade: number; heta: number; strackor: number; rop: number; inomM: number; ruttM: number } {
  let ruttM = 0;
  for (let i = 1; i < linje.length; i++) ruttM += avst(linje[i - 1], linje[i]);
  const k = lankar.filter((l) => l.mitt && siffror(l.vagnr) === vagnr)
    .map((l) => ({ l, ...langsLinjen(l.mitt!, linje) })).filter((x) => x.d <= KORRIDOR_M);
  const h = k.filter((x) => het(x.l, steg)).map((x) => ({ fran: x.s - x.l.langd / 2, till: x.s + x.l.langd / 2 }))
    .sort((a, b) => a.fran - b.fran);
  const str: { fran: number; till: number }[] = [];
  for (const x of h) {
    const sist = str[str.length - 1];
    if (sist && x.fran - sist.till <= ZON_M) sist.till = Math.max(sist.till, x.till); else str.push({ ...x });
  }
  let rop = 0, senast = -Infinity;
  for (const x of str) if (x.fran - senast >= TAK_M) { rop++; senast = x.fran; }
  return { kopplade: k.length, heta: h.length, strackor: str.length, rop, inomM: str.reduce((a, x) => a + x.till - x.fran, 0), ruttM };
}

function rutter(): Record<string, [number, number][]> {
  const src = readFileSync("supabase/functions/skuggmotor/main.ts", "utf8");
  const start = src.indexOf("const ROUTES: Record<string, [number, number][]> = {");
  const slut = src.indexOf("\n};", start);
  if (start < 0 || slut < 0) throw new Error("ROUTES hittades inte i skuggmotor/main.ts");
  return new Function(`return ${src.slice(src.indexOf("{", start), slut + 2)}`)();
}

const kvantil = (v: number[], q: number) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : NaN; };

/** falt: lagren och kolumnerna som de finns. */
export function falt(db: DatabaseSync): void {
  const lager = db.prepare("select table_name, data_type, srs_id from gpkg_contents order by table_name").all() as any[];
  rad(`${lager.length} lager i filen`);
  for (const g of lager) {
    const t = String(g.table_name);
    if (g.data_type !== "features") { rad(`lager ${t}: ${g.data_type}, srs ${g.srs_id} (inte läst)`); continue; }
    const geo = db.prepare("select column_name, geometry_type_name from gpkg_geometry_columns where table_name = ?").get(t) as any;
    const n = (db.prepare(`select count(*) n from ${cit(t)}`).get() as any).n;
    rad(`lager ${t}: ${n} rader, srs ${g.srs_id}, geometri ${geo?.geometry_type_name ?? "saknas"} i ${geo?.column_name ?? "–"}`);
    for (const k of db.prepare(`pragma table_info(${cit(t)})`).all() as any[]) {
      const c = String(k.name);
      if (c === geo?.column_name) continue;
      const s = db.prepare(`select count(*) - count(${cit(c)}) tomma, count(distinct ${cit(c)}) olika, min(${cit(c)}) lo, max(${cit(c)}) hi,
        sum(typeof(${cit(c)}) in ('integer', 'real')) tal from ${cit(t)}`).get() as any;
      let slut = `spann ${s.lo} … ${s.hi}`;
      if (!s.tal) {
        const v = db.prepare(`select ${cit(c)} v, count(*) n from ${cit(t)} where ${cit(c)} is not null group by 1 order by 2 desc limit 8`).all() as any[];
        slut = `vanligast ${v.map((x) => `${String(x.v).slice(0, 30)} (${x.n})`).join(" · ")}`;
      }
      rad(`  ${c} [${k.type || "–"}]: tomma ${s.tomma}, olika ${s.olika}, ${slut}`);
    }
  }
}

export function lasLankar(db: DatabaseSync, lager: string, f: Record<string, string>, langdM: number): { lankar: Lank[]; utanGeo: number } {
  const geo = db.prepare("select column_name from gpkg_geometry_columns where table_name = ?").get(lager) as any;
  if (!geo) throw new Error(`lagret ${lager} har ingen geometri i gpkg_geometry_columns`);
  const finns = (db.prepare(`pragma table_info(${cit(lager)})`).all() as any[]).map((k) => String(k.name));
  const saknas = Object.entries(f).filter(([, kol]) => !finns.includes(kol));
  if (saknas.length) throw new Error(`fält saknas i ${lager}: ${saknas.map(([n, kol]) => `${n}=${kol}`).join(", ")} · kolumnerna är ${finns.join(", ")}`);
  const lankar: Lank[] = []; let utanGeo = 0;
  const kol = Object.entries(f).map(([n, c]) => `${cit(c)} as ${cit(n)}`).join(", ");
  for (const r of db.prepare(`select ${kol}, ${cit(geo.column_name)} as geom from ${cit(lager)}`).iterate() as Iterable<any>) {
    const g = r.geom instanceof Uint8Array ? mittOchLangd(delar(r.geom)) : { mitt: null, langd: 0 };
    if (!g.mitt) utanGeo++;
    lankar.push({ vagnr: String(r.vagnr ?? ""), lan: String(r.lan ?? ""), langd: Number(r.langd ?? 0) * langdM, frekvens: Number(r.frekvens ?? 0),
      antal: Number(r.antal ?? 0), mitt: g.mitt, geoLangd: g.langd, arter: Object.fromEntries(ARTER.map((a) => [a, Number(r[a] ?? 0)])) });
  }
  return { lankar, utanGeo };
}

/** rakna: de fyra förregistrerade delarna. */
export function rakna(lankar: Lank[], utanGeo: number, R: Record<string, [number, number][]>): void {
  const km = lankar.reduce((a, l) => a + l.langd, 0) / 1000, ol = lankar.reduce((a, l) => a + l.antal, 0);
  rad(`(1) nätet: ${lankar.length} länkar, ${Math.round(km)} km, ${ol} olyckor i fältet antal; ${utanGeo} länkar utan läsbar geometri`);
  const kv = lankar.filter((l) => l.frekvens > 0 && l.langd > 0).map((l) => l.frekvens / (l.antal / (l.langd / 1000) / 5));
  rad(`    frekvens / (antal per km och 5 år): median ${kvantil(kv, 0.5).toFixed(2)} (p10 ${kvantil(kv, 0.1).toFixed(2)}, p90 ${kvantil(kv, 0.9).toFixed(2)}) — nära 1 om fälten betyder det 2019:179 säger`);
  const lg = lankar.filter((l) => l.geoLangd > 0 && l.langd > 0).map((l) => l.langd / l.geoLangd);
  rad(`    längdfältet / geometrins längd: median ${kvantil(lg, 0.5).toFixed(2)} (p10 ${kvantil(lg, 0.1).toFixed(2)}, p90 ${kvantil(lg, 0.9).toFixed(2)}) — nära 1 om enheten är rätt`);
  const A = [0.01, 0.02, 0.05, 0.1, 0.2];
  rad(`(2) koncentrationen: ${koncentration(lankar, A).map((v, i) => `${(100 * v).toFixed(0)} % av olyckorna på ${A[i] * 100} % av längden`).join(" · ")}`);
  rad(`(3) trappan, länkar längre än ${MIN_LANGD_M} m (${lankar.filter((l) => l.langd <= MIN_LANGD_M).length} länkar är kortare):`);
  for (const s of STEG) {
    const h = lankar.filter((l) => het(l, s)), hkm = h.reduce((a, l) => a + l.langd, 0) / 1000, hol = h.reduce((a, l) => a + l.antal, 0);
    rad(`    över ${s}: ${h.length} länkar, ${Math.round(hkm)} km (${pct(hkm, km)} av nätet), ${pct(hol, ol)} av olyckorna · längd p10 ${Math.round(kvantil(h.map((l) => l.langd), 0.1))} m, median ${Math.round(kvantil(h.map((l) => l.langd), 0.5))} m, p90 ${Math.round(kvantil(h.map((l) => l.langd), 0.9))} m · färre än tre olyckor: ${h.filter((l) => l.antal < 3).length}`);
    const art = new Map<string, number>();
    for (const l of h) { const [a] = Object.entries(l.arter).sort((x, y) => y[1] - x[1])[0] ?? ["?"]; art.set(a, (art.get(a) ?? 0) + 1); }
    rad(`      vanligaste art per länk: ${[...art].sort((a, b) => b[1] - a[1]).map(([a, n]) => `${a} ${n}`).join(" · ") || "–"}`);
    const lan = new Map<string, number>();
    for (const l of h) lan.set(l.lan, (lan.get(l.lan) ?? 0) + l.langd / 1000);
    rad(`      län med mest het väg: ${[...lan].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([a, n]) => `${a} ${Math.round(n)} km`).join(" · ") || "–"}`);
  }
  rad(`(4) takten längs ${Object.keys(R).length} skuggrutter (korridor ${KORRIDOR_M / 1000} km, zon ${ZON_M} m, tak ett rop per ${(TAK_M / 1000).toFixed(1)} km):`);
  for (const s of STEG) {
    let str = 0, rop = 0, inom = 0, rutt = 0; const per: string[] = [], utan: string[] = [];
    for (const [namn, wgs] of Object.entries(R)) {
      const t = takt(lankar, wgs.map(([lon, lat]) => sweref99tm(lon, lat)), siffror(namn), s);
      if (!t.kopplade) { utan.push(namn); continue; }
      str += t.strackor; rop += t.rop; inom += t.inomM; rutt += t.ruttM;
      per.push(`${namn} ${t.strackor}/${t.rop}`);
    }
    rad(`    över ${s}: ${str} sträckor (${rutt > 0 ? (str / rutt * 1e5).toFixed(1) : "–"} per 100 km), ${pct(inom, rutt)} av rutterna inom en sträcka, ${rop} rop på ett varv (${rutt > 0 ? (rop / rutt * 1e5).toFixed(1) : "–"} per 100 km)`);
    rad(`      sträckor/rop per rutt: ${per.join(" · ") || "–"}`);
    if (utan.length) rad(`      ingen koppling (inga länkar med vägnumret inom korridoren): ${utan.join(" · ")}`);
  }
}

// ── Självtestet: en påhittad fil i minnet, med en fälla för varje vakt där den ändrar ett tal ─────────────────────────────────────
function geoblob(d: P[][], z = false, env = false): Uint8Array {
  const dim = z ? 3 : 2, multi = d.length !== 1;
  const wkb = (del: P[]) => 9 + del.length * 8 * dim;
  const n = 8 + (env ? 32 : 0) + (multi ? 9 + d.reduce((a, del) => a + wkb(del), 0) : wkb(d[0]));
  const b = new Uint8Array(n), dv = new DataView(b.buffer);
  b[0] = 0x47; b[1] = 0x50; b[3] = 1 | (env ? 2 : 0); dv.setInt32(4, 3006, true);
  let o = 8 + (env ? 32 : 0);
  const skriv = (del: P[]) => {
    dv.setUint8(o, 1); dv.setUint32(o + 1, z ? 1002 : 2, true); dv.setUint32(o + 5, del.length, true); o += 9;
    for (const p of del) { dv.setFloat64(o, p[0], true); dv.setFloat64(o + 8, p[1], true); o += 8 * dim; }
  };
  if (multi) { dv.setUint8(o, 1); dv.setUint32(o + 1, z ? 1005 : 5, true); dv.setUint32(o + 5, d.length, true); o += 9; d.forEach(skriv); }
  else skriv(d[0]);
  return b;
}

function sjalvtest(): number {
  let fel = 0;
  const k = (ok: boolean, vad: string) => { if (!ok) { fel++; console.error(`FEL: ${vad}`); } };
  const [E, N] = sweref99tm(15, 60);
  k(Math.abs(E - 500000) < 0.01 && Math.abs(N - 6651411) < 100, `SWEREF99 TM på meridianen: E ${E.toFixed(1)} N ${N.toFixed(0)}`);
  k(sweref99tm(13, 56)[0] < 500000 && sweref99tm(17, 56)[0] > 500000, "SWEREF99 TM: väster och öster om meridianen");

  // Geometrin: enkel linje, linje med Z och envelope, och en multilinje i två delar.
  const d1 = delar(geoblob([[[0, 0], [0, 1000]]]));
  k(d1.length === 1 && d1[0].length === 2 && d1[0][1][1] === 1000, "geometri: enkel linje");
  const d2 = delar(geoblob([[[5, 5], [5, 105], [5, 205]]], true, true));
  k(d2.length === 1 && d2[0].length === 3 && d2[0][2][1] === 205 && d2[0][2][0] === 5, "geometri: Z och envelope hoppas över");
  const d3 = mittOchLangd(delar(geoblob([[[0, 0], [0, 100]], [[0, 300], [0, 600]]])));
  k(d3.langd === 400 && d3.mitt![1] === 400, `geometri: multilinjens längd och mitt (${d3.langd}, ${d3.mitt})`);
  k(delar(new Uint8Array([1, 2, 3])).length === 0, "geometri: skräp ger en tom lista");
  const pl = langsLinjen([300, 5000], [[0, 0], [0, 10000]]);
  k(pl.d === 300 && pl.s === 5000, "läget längs linjen");

  // Koncentrationen: tio länkar om en kilometer, hälften av olyckorna på den första.
  const tio = [50, 20, 10, 5, 5, 4, 3, 2, 1, 0].map((n): Lank => ({ vagnr: "1", lan: "X", langd: 1000, frekvens: n / 5, antal: n, mitt: null, geoLangd: 1000, arter: {} }));
  const kc = koncentration(tio, [0.1, 0.2, 0.05]);
  k(kc[0] === 0.5 && kc[1] === 0.7 && kc[2] === 0.25, `koncentrationen ${kc}`);

  // En fil i minnet: rutten går rakt norrut längs meridianen 15°, väg 99.
  const db = new DatabaseSync(":memory:");
  db.exec(`create table gpkg_contents (table_name text, data_type text, srs_id int);
    create table gpkg_geometry_columns (table_name text, column_name text, geometry_type_name text);
    create table lankar (fid integer primary key, geom blob, VAGNR text, LAN text, LANGD real, VIOL_iLINK int, VIOL_kmyr real,
      ALG int, RAD int, VSN int, DVH int, KRH int);
    insert into gpkg_contents values ('lankar', 'features', 3006), ('raster', 'tiles', 3006);
    insert into gpkg_geometry_columns values ('lankar', 'geom', 'LINESTRING');`);
  const R = { "E99 Söder→Norr": [[15, 60], [15, 60.9]] as [number, number][] };
  const [E0, N0] = sweref99tm(15, 60);
  const ins = db.prepare("insert into lankar (geom, VAGNR, LAN, LANGD, VIOL_iLINK, VIOL_kmyr, ALG, RAD, VSN, DVH, KRH) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const lank = (s: number, L: number, fr: number, vagnr = "E99", dE = 0, arter = [0, 9, 0, 0, 0]) =>
    ins.run(geoblob([[[E0 + dE, N0 + s - L / 2], [E0 + dE, N0 + s + L / 2]]]), vagnr, "T", L, Math.round(fr * L / 1000 * 5), fr, ...arter);
  lank(10000, 1000, 2.0);                       // A
  lank(10900, 500, 1.5);                        // B: 150 m efter A, samma sträcka
  lank(30000, 200, 5.0);                        // C, fällan för längden: kort länk med hög frekvens
  lank(50000, 2000, 0.4);                       // D, fällan för trappan: under 0,5
  lank(55000, 1000, 1.2, "E99", 0, [7, 1, 0, 0, 0]);   // E: egen sträcka, älg
  lank(60000, 1000, 3.0);                       // F: egen sträcka, men inom taket efter E
  lank(40000, 1000, 4.0, "E99", 20000);         // G, fällan för korridoren: rätt väg, två mil åt sidan
  lank(70000, 1000, 4.0, "77");                 // H, fällan för vägnumret: på linjen, annan väg
  const { lankar, utanGeo } = lasLankar(db, "lankar", FORVAL, 1);
  k(lankar.length === 8 && utanGeo === 0, `läsningen: ${lankar.length} länkar, ${utanGeo} utan geometri`);
  const linje = R["E99 Söder→Norr"].map(([lon, lat]) => sweref99tm(lon, lat));
  const t1 = takt(lankar, linje, "99", 1);
  k(t1.kopplade === 6 && t1.heta === 4 && t1.strackor === 3 && t1.rop === 2, `takten över 1: ${JSON.stringify(t1)}`);
  k(Math.round(t1.inomM) === 3650, `takten över 1: ${t1.inomM} m inom en sträcka`);
  const t05 = takt(lankar, linje, "99", 0.5);
  k(t05.heta === 4 && t05.strackor === 3, `takten över 0,5: ${JSON.stringify(t05)}`);
  const t2 = takt(lankar, linje, "99", 2);
  k(t2.heta === 1 && t2.strackor === 1 && t2.rop === 1, `takten över 2 (gränsen är strikt): ${JSON.stringify(t2)}`);
  k(takt(lankar, linje, "99", 3).heta === 0, "takten över 3");
  k(takt(lankar, linje, "12", 1).kopplade === 0, "en rutt utan länkar har ingen koppling");
  let stopp = "";
  try { lasLankar(db, "lankar", { ...FORVAL, frekvens: "FINNS_INTE" }, 1); } catch (e) { stopp = String((e as Error).message); }
  k(stopp.includes("frekvens=FINNS_INTE") && stopp.includes("VIOL_kmyr"), "ett fält som saknas stoppar med kolumnerna utskrivna");
  const ut: string[] = [], logg = console.log;
  console.log = (s: string) => { ut.push(s); };
  try { falt(db); rakna(lankar, utanGeo, R); } finally { console.log = logg; }
  const allt = ut.join("\n");
  k(/lager lankar: 8 rader/.test(allt) && /lager raster: tiles/.test(allt) && /VIOL_kmyr \[real\]: tomma 0, olika \d+, spann 0\.4 … 5/i.test(allt), "falt: lagren och spannen");
  // I nätet räknas också G och H, som bara rutten utesluter: sex heta länkar över 1, fyra av dem på rutten.
  k(/över 1: 6 länkar/.test(allt) && /över 2: 3 länkar/.test(allt) && /över 1: 3 sträckor/.test(allt) && /över 1: .* 2 rop på ett varv/.test(allt),
    "rakna: trappan och takten i utskriften");
  k(/vanligaste art per länk: radjur 5 · alg 1/.test(allt), "rakna: arterna");
  if (fel) { console.error(`${fel} fel`); return 1; }
  console.log("vilt-steg0: självtestet grönt");
  return 0;
}

function main(): number {
  const a = process.argv.slice(2);
  if (a[0] === "--sjalvtest") return sjalvtest();
  if ((a[0] !== "falt" && a[0] !== "rakna") || !a[1] || (a[0] === "rakna" && !a[2])) {
    console.error("falt <fil.gpkg> | rakna <fil.gpkg> <lager> [fält=kolumn ...] [langdenhet=km] | --sjalvtest");
    return 2;
  }
  const db = new DatabaseSync(a[1], { readOnly: true });
  if (a[0] === "falt") { falt(db); return 0; }
  const f = { ...FORVAL }; let langdM = 1;
  for (const p of a.slice(3)) {
    const [n, v] = p.split("=");
    if (n === "langdenhet" && (v === "km" || v === "m")) langdM = v === "km" ? 1000 : 1;
    else if (n in f && v) f[n] = v;
    else { console.error(`okänt val: ${p}`); return 2; }
  }
  const { lankar, utanGeo } = lasLankar(db, a[2], f, langdM);
  rakna(lankar, utanGeo, rutter());
  return 0;
}
process.exit(main());
