// UPPFÖLJNINGEN AV FACITLÄSNINGEN 2024/25 (docs/FORREGISTRERING-FACIT-TRV-UPPFOLJNING.md). Förklarar ett sett utfall (DECISIONS #602),
// dömer inget och ändrar ingen tröskel. Samma indata, fönster och mått som läsningen (kuvos/facit-trv.ts), med två delningar:
//   (i)  hela regelns varnande timmar efter fuktvittnet vid timmens slut: bara Våt, bara radarn, båda;
//   (ii) basnivån, kandidaten, hela regeln och efterhalkan efter planerad halkbekämpning (20, 50) på stationens sträckor inom ±6 h.
// Per breddgradsband och totalt, med antalen. Bara aggregat (PUBLIKT REPO). Vägrar utan båda signaturerna i uppföljningens förregistrering.
//   node --experimental-strip-types kuvos/facit-trv-uppfoljning.ts --sjalvtest
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  lasXlsx, tidszonsprov, tid, episoder, parning, inom, regeln, inomPerioden, bekrafta, band, signerad, giltigaAtgarder,
  IS, VAT, VETO_M, MAX_KM, KANDIDAT_FONSTER_H, EFTERHALKA_FONSTER_H, ATGARD_FONSTER_H,
  type Andring, type Atgard, type Indata, type Tillfalle, type Rakning,
} from "./facit-trv.ts";

const H = 3_600_000;
export type Vittne = "bara Våt" | "bara radarn" | "båda";

/** Fukten i regeln vid timmens slut e = t + 1 h, delad efter vittne: Våt på någon av stationens sträckor vid e, radarn på någon av
 *  dem i fönstret som slutar vid e. Samma villkor som regeln() i facit-trv.ts, bara uppdelat; null = ingen fukt. */
export function fuktvittne(x: Tillfalle, par: Map<string, string[]>, vat: Map<string, [number, number][]>, radar: Map<string, Set<number>>): Vittne | null {
  const e = x.t + H, seg = par.get(x.station) ?? [];
  const v = seg.some((s) => (vat.get(s) ?? []).some(([a, b]) => a <= e && e < b)), r = seg.some((s) => !!radar.get(s)?.has(e));
  return v && r ? "båda" : v ? "bara Våt" : r ? "bara radarn" : null;
}

/** Planerad halkbekämpning på stationens sträckor inom ATGARD_FONSTER_H, som atgarder() i facit-trv.ts räknar den. */
export function medAtgard(x: Tillfalle, par: Map<string, string[]>, per: Map<string, [number, number][]>): boolean {
  return (par.get(x.station) ?? []).some((s) => !!per.get(s)?.some(([a, b]) => a <= x.t + ATGARD_FONSTER_H[1] * H && b >= x.t + ATGARD_FONSTER_H[0] * H));
}

const pct = (a: number, n: number) => (n ? (100 * a / n).toFixed(1).replace(".", ",") : "–");
const lyft = (r: Rakning, b?: Rakning) => (b && r.antal && b.antal && b.bekraftade ? ((r.bekraftade / r.antal) / (b.bekraftade / b.antal)).toFixed(2).replace(".", ",") : "–");

/** Andelen bekräftade per delning och band, och totalt per delning, med lyftet mot basnivån i samma delning och band. */
export function tabell(namn: string, delning: Map<string, Tillfalle[]>, par: Map<string, string[]>, is: Map<string, [number, number][]>,
  fonster: [number, number], bandFor: (x: Tillfalle) => string, bas?: Map<string, Map<string, Rakning>>): { rader: string[]; per: Map<string, Map<string, Rakning>> } {
  const rader = [`== ${namn}`], per = new Map<string, Map<string, Rakning>>();
  for (const [del, x] of [...delning].sort()) {
    const m = bekrafta(x, par, is, fonster, bandFor);
    const tot: Rakning = { antal: 0, bekraftade: 0, utanStracka: 0 };
    for (const r of m.values()) { tot.antal += r.antal; tot.bekraftade += r.bekraftade; tot.utanStracka += r.utanStracka; }
    m.set("totalt", tot); per.set(del, m);
    for (const [b, r] of [...m].sort((p, q) => (p[0] === "totalt" ? 1 : q[0] === "totalt" ? -1 : p[0] < q[0] ? -1 : 1))) {
      const br = bas?.get(del)?.get(b);
      rader.push(`  ${del} · ${b}: ${r.bekraftade} av ${r.antal} bekräftade (${pct(r.bekraftade, r.antal)} %)` +
        (bas ? ` · basnivån ${br ? `${br.bekraftade} av ${br.antal} (${pct(br.bekraftade, br.antal)} %)` : "–"} · lyftet ${lyft(r, br)}` : ""));
    }
  }
  return { rader, per };
}

const dela = <K extends string>(x: Tillfalle[], nyckel: (y: Tillfalle) => K | null) => {
  const ut = new Map<string, Tillfalle[]>();
  for (const y of x) { const k = nyckel(y); if (k) (ut.get(k) ?? ut.set(k, []).get(k)!).push(y); }
  return ut;
};

/** Uppföljningen: samma beredning som lasning() i facit-trv.ts, sedan de två delningarna. */
export function uppfoljning(ind: Indata, forregUppfoljning: string) {
  const sig = signerad(forregUppfoljning);
  if (!sig.bengt || !sig.axel) { console.error(`vägrar: uppföljningens förregistrering är inte signerad av båda (Bengt ${sig.bengt}, Axel ${sig.axel})`); process.exit(2); }
  const v = lasXlsx(readFileSync(join(ind.xlsx, "RoadCondition24-25.xlsx")));
  const ki = (n: string) => v.kolumner.indexOf(n);
  const tz = tidszonsprov(v.rader.map((r) => r[ki("ModifiedTime")]));
  if (tz.lage === "oklart") { console.error("vägrar: tidszonen går inte att avgöra"); process.exit(2); }
  const andr: Andring[] = v.rader.map((r) => ({ seg: r[ki("ID")], t: tid(r[ki("ModifiedTime")], tz.lage)!, kod1: Number(r[ki("RoadCondCode1")]),
    kod2: r[ki("RoadCondCode2")] === "NULL" || r[ki("RoadCondCode2")] === "" ? null : Number(r[ki("RoadCondCode2")]) })).filter((a) => a.t !== null);
  const is = episoder(andr, IS), vat = episoder(andr, VAT);
  const a = lasXlsx(readFileSync(join(ind.xlsx, "RoadConditionMeasures24-25.xlsx")));
  const ai = (n: string) => a.kolumner.indexOf(n);
  const atg: Atgard[] = a.rader.map((r) => ({ seg: r[ai("Id")], typ: Number(r[ai("MeasureType")]), start: tid(r[ai("StartTime")], tz.lage), stopp: tid(r[ai("StopTime")], tz.lage) }));
  const perAtg = new Map<string, [number, number][]>();
  for (const g of giltigaAtgarder(atg)) (perAtg.get(g.seg) ?? perAtg.set(g.seg, []).get(g.seg)!).push([g.start!, g.stopp!]);
  const par = parning(ind.stationer, ind.linjer);
  const lat = new Map(ind.stationer.map((s) => [s.id, s.lat]));
  const bandFor = (x: Tillfalle) => (lat.has(x.station) ? band(lat.get(x.station)!) : "utan läge");
  const [kalla, kand, fyr] = [ind.kalla, ind.kandidat, ind.fyrningar].map(inomPerioden);
  const grannar = inom(ind.stationer, VETO_M, true), ankare = inom(ind.stationer, MAX_KM * 1000, false);
  const regelV = kand.filter((x) => regeln(x, par, grannar, ankare, vat, ind.regel) === "varnar");
  console.log(`UPPFÖLJNINGEN (förregistreringen docs/FORREGISTRERING-FACIT-TRV-UPPFOLJNING.md) — tidszonen ${tz.lage}; kalla station-timmar ${kalla.length}, ` +
    `kandidatens ${kand.length}, hela regelns varnande ${regelV.length}, fyrningar ${fyr.length}. Diagnos, ingen dom.`);
  const allt = (x: Tillfalle[]) => new Map([["alla", x]]);
  const basA = tabell("basnivån, [t − 1, t + 2] h", allt(kalla), par, is, KANDIDAT_FONSTER_H, bandFor);
  const vitt = dela(regelV, (x) => fuktvittne(x, par, vat, ind.regel.radar));
  const basVitt = new Map([...vitt.keys()].map((k) => [k, basA.per.get("alla")!]));
  for (const r of [...basA.rader, ...tabell("(i) hela regelns varnande timmar efter fuktvittne, [t − 1, t + 2] h", vitt, par, is, KANDIDAT_FONSTER_H, bandFor, basVitt).rader]) console.log(r);
  const atgDel = (x: Tillfalle[]) => dela(x, (y) => (medAtgard(y, par, perAtg) ? "med åtgärd" : "utan åtgärd"));
  const bA = tabell("(ii) basnivån efter planerad halkbekämpning, [t − 1, t + 2] h", atgDel(kalla), par, is, KANDIDAT_FONSTER_H, bandFor);
  const bB = tabell("(ii) basnivån efter planerad halkbekämpning, [t, t + 6] h", atgDel(kalla), par, is, EFTERHALKA_FONSTER_H, bandFor);
  for (const r of [...bA.rader,
    ...tabell("(ii) kandidaten efter planerad halkbekämpning, [t − 1, t + 2] h", atgDel(kand), par, is, KANDIDAT_FONSTER_H, bandFor, bA.per).rader,
    ...tabell("(ii) hela regeln efter planerad halkbekämpning, [t − 1, t + 2] h", atgDel(regelV), par, is, KANDIDAT_FONSTER_H, bandFor, bA.per).rader,
    ...bB.rader,
    ...tabell("(ii) efterhalkan efter planerad halkbekämpning, [t, t + 6] h", atgDel(fyr), par, is, EFTERHALKA_FONSTER_H, bandFor, bB.per).rader]) console.log(r);
}

function sjalvtest() {
  let fel = 0; const k = (ok: boolean, m: string) => { if (!ok) { fel++; console.error("✗ " + m); } else console.log("  ok: " + m); };
  const T = (s: string) => Date.parse(s);
  const linjer = [{ id: "S", delar: [[[15, 59.9], [15, 60.1]] as [number, number][]] }];
  const par = parning([{ id: "nara", lon: 15 + 1.9 / 55.8, lat: 60 }, { id: "langt", lon: 15 + 2.1 / 55.8, lat: 60 }], linjer);
  const x = { station: "nara", t: T("2024-12-04T06:00Z") }, e7 = T("2024-12-04T07:00Z");
  const vatS = new Map([["S", [[T("2024-12-04T06:30Z"), T("2024-12-04T09:00Z")]] as [number, number][]]]);
  k(fuktvittne(x, par, vatS, new Map()) === "bara Våt" && fuktvittne(x, par, new Map(), new Map([["S", new Set([e7])]])) === "bara radarn"
    && fuktvittne(x, par, vatS, new Map([["S", new Set([e7])]])) === "båda" && fuktvittne(x, par, new Map(), new Map()) === null
    && fuktvittne({ station: "langt", t: x.t }, par, vatS, new Map([["S", new Set([e7])]])) === null,
    "fuktvittnet vid timmens slut: bara Våt, bara radarn, båda, ingen fukt, och ingen sträcka ⇒ ingen fukt");
  // Samma villkor som regeln: varnar (utan veto och spridning) exakt när fuktvittnet finns.
  const tomt = { radar: new Map<string, Set<number>>(), varma: new Map<string, Set<number>>(), yta: new Map<string, Map<number, number>>() };
  for (const [vat, radar] of [[vatS, new Map()], [new Map(), new Map([["S", new Set([e7])]])], [new Map(), new Map()]] as const) {
    const varnar = regeln(x, par, new Map(), new Map(), vat as any, { ...tomt, radar: radar as any }) === "varnar";
    k(varnar === (fuktvittne(x, par, vat as any, radar as any) !== null), `fuktvittnet och regeln är överens (${varnar ? "varnar" : "torr"})`);
  }
  const per = new Map([["S", [[T("2024-12-04T11:00Z"), T("2024-12-04T13:00Z")]] as [number, number][]]]);
  k(medAtgard(x, par, per) && !medAtgard({ ...x, t: T("2024-12-04T04:59Z") }, par, per) && medAtgard({ ...x, t: T("2024-12-04T19:00Z") }, par, per)
    && !medAtgard({ ...x, t: T("2024-12-04T19:01Z") }, par, per) && !medAtgard({ station: "langt", t: x.t }, par, per),
    "åtgärden inom ±6 h: 6 h före starten och 6 h efter stoppet med, minuten utanför inte, ingen sträcka ⇒ utan");
  const ep = new Map([["S", [[T("2024-12-04T07:00Z"), T("2024-12-04T08:00Z")]] as [number, number][]]]);
  const t = tabell("prov", new Map([["med åtgärd", [x]], ["utan åtgärd", [{ ...x, t: T("2024-12-05T06:00Z") }]]]), par, ep, KANDIDAT_FONSTER_H, () => "55–60");
  k(t.per.get("med åtgärd")!.get("totalt")!.bekraftade === 1 && t.per.get("utan åtgärd")!.get("totalt")!.bekraftade === 0
    && t.rader.length === 5 && t.rader[2].startsWith("  med åtgärd · totalt: 1 av 1"), `tabellen: per delning och band, totalt sist (${JSON.stringify(t.rader)})`);
  if (fel) process.exit(1);
  console.log("SJÄLVTEST OK: facit-trv-uppfoljning");
}

const direkt = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("kuvos/facit-trv-uppfoljning.ts");
if (direkt && process.argv.includes("--sjalvtest")) sjalvtest();
