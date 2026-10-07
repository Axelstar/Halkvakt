// C8 MOT AXELS FINGERAVTRYCK — vägdatan mot fysikspårets egen särart per station (kort #305, DECISIONS #486; Axels ord 7/10 i Bengts
// ställe). INGEN DOM, inga trösklar. Bengts C8 (#479) och C8 mot vädret (#480) mätte särarten mot RÅ och MET Nordic; Axels 23 % (SVAR
// §5) mättes mot hans fysikmodell utanför repot, med andra kolumner och andra regioner. Här körs BENGTS C8 — samma kolumner, samma ridge,
// samma regioner — på Axels fingeravtryck (`data/fysik/fingeravtryck-2024-25.csv`, sha256 i kuvos/fysik-leverans.json).
//   MÅLET: filens fingeravtryck_c = medel(uppmätt − modell) per station, positivt = vägen varmare än modellen; stationer med minst
//          100 timmar (C8:s MIN_PUNKTER) och vägdata. Fyra mål: modell A2 (den frysta, med vägdata inne) och Bsp (den tidigare utan
//          vägdata, modellen bakom 23 %) × period novdec (Axels inlärningsfönster) och vinter.
//   MODELLERNA ur C8-skriptet, importerade: VÄG, REL (mot grannarna inom 50 km, lägena ur filen), BAS. Ridge λ = 1.
//   VALIDERINGEN som C8: regioner gömda (rutor 1° × 2°) — huvudtalet — och leave-one-out.
//   KONTROLLEN först: filens summa = manifestet, och A2 vinter 736 stationer med spridning 0,52 °C, Bsp vinter 0,64 °C (SVAR §6).
//          Stämmer det inte läses inget annat.
// Ingen databas: allt ligger i repot. Kör: node --experimental-strip-types scripts/matningar/kuvos-c8-fingeravtryck-2026-10-08.ts [--sjalvtest]
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { vagRad, fyllMedian, grannar, relativt, korsvalidera, forklarat, region, haversineKm, type VagRad, type Pos } from "./kuvos-c8-vagdata-2026-10-07.ts";

const MIN_TIMMAR = 100;                   // C8:s MIN_PUNKTER (#479)
const TATHET_KM = 20;                     // BAS som C8
const ADT_KLASSER: [string, number, number][] = [["< 1 000", 0, 1000], ["1 000–20 000", 1000, 20000], ["> 20 000", 20000, Infinity]];

export type FARad = { sid: string; lon: number; lat: number; modell: string; period: string; n: number; fa: number | null };
export function lasFingeravtryck(text: string): FARad[] {
  const [huvud, ...rader] = text.trim().split("\n");
  if (!huvud.startsWith("sid,lon,lat,modell,period,population,n_timmar,fingeravtryck_c,sd_c")) throw new Error("fingeravtrycket: fel rubrikrad");
  return rader.map((r) => {
    // population är citerad och innehåller kommatecken: läs fälten utifrån båda ändarna.
    const a = r.split(","), sd = a.length;
    const fa = a[sd - 2];
    return { sid: a[0], lon: +a[1], lat: +a[2], modell: a[3], period: a[4], n: +a[sd - 3], fa: fa === "" ? null : +fa };
  });
}

const sdAv = (v: number[]) => { const m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); };
const tal = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** En baslinje: R² per modell (regioner gömda och leave-one-out), effekt saknas med flit — det är C8:s läsning, inte vår. */
export function c8Mal(rader: FARad[], vag: Map<string, VagRad>): Record<string, { region: number; loo: number; n: number }> {
  const y = new Map(rader.filter((r) => r.fa !== null && r.n >= MIN_TIMMAR && vag.has(r.sid)).map((r) => [r.sid, r.fa!]));
  const pos = new Map<string, Pos>(rader.map((r) => [r.sid, { lat: r.lat, lon: r.lon }]));
  const ids = rader.map((r) => r.sid).filter((id) => vag.has(id)).sort();
  const VAG = fyllMedian(ids.map((id) => vagRad(vag.get(id)!)));
  const REL = relativt(ids, VAG, grannar(ids, pos));
  const BAS = ids.map((id) => { const p = pos.get(id)!; return [p.lat, p.lon, ids.filter((b) => b !== id && haversineKm(p.lon, p.lat, pos.get(b)!.lon, pos.get(b)!.lat) <= TATHET_KM).length]; });
  const reg = (id: string) => region(pos.get(id)!);
  const ut: Record<string, { region: number; loo: number; n: number }> = {};
  console.log(`  mål: ${y.size} stationer (≥ ${MIN_TIMMAR} timmar, med vägdata) · spridning ${sdAv([...y.values()]).toFixed(2)} °C · ${new Set(ids.map(reg)).size} rutor`);
  for (const [namn, X] of [["VÄG", VAG], ["REL", REL], ["BAS", BAS]] as [string, number[][]][]) {
    const fr = forklarat(y, korsvalidera(ids, X, y, reg)), fl = forklarat(y, korsvalidera(ids, X, y, (id) => id));
    ut[namn] = { region: fr.r2, loo: fl.r2, n: fr.n };
    console.log(`  ${namn.padEnd(4)} regioner gömda: R² ${fr.r2.toFixed(3)} · MAE ${fr.mae.toFixed(2)} °C (utan modell ${fr.maeNoll.toFixed(2)}) på ${fr.n} · leave-one-out: R² ${fl.r2.toFixed(3)}`);
  }
  const klass: number[] = [];
  const delar = ADT_KLASSER.map(([namn, lo, hi]) => {
    const v = [...y].filter(([id]) => { const a = tal(vag.get(id)!.adt_fordon); return a !== null && a >= lo && a < hi; }).map(([, s]) => s);
    const m = v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN; klass.push(m);
    return `${namn} ${v.length} st ${Number.isFinite(m) ? (m >= 0 ? "+" : "") + m.toFixed(2) : "—"} °C`;
  });
  ut["ÅDT"] = { region: klass[2] - klass[0], loo: NaN, n: y.size };
  console.log(`  per ÅDT-klass: ${delar.join(" · ")} · spann (> 20 000 − < 1 000) ${(klass[2] - klass[0]).toFixed(2)} °C`);
  return ut;
}

/** Kontrollen före allt annat (SVAR §6): antal stationer med värde och spridningen för vintern, båda modellerna. */
export function kontroll(rader: FARad[]): string[] {
  const fel: string[] = [];
  for (const [modell, n, sd] of [["A2", 736, 0.52], ["Bsp", null, 0.64]] as [string, number | null, number][]) {
    const v = rader.filter((r) => r.modell === modell && r.period === "vinter" && r.fa !== null).map((r) => r.fa!);
    const s = sdAv(v);
    console.log(`  kontroll ${modell} vinter: ${v.length} stationer med värde, spridning ${s.toFixed(3)} °C (SVAR §6: ${n ?? "—"} st, ${sd})`);
    if ((n !== null && v.length !== n) || Math.abs(s - sd) > 0.01) fel.push(`${modell} vinter: ${v.length} st, sd ${s.toFixed(3)}`);
  }
  return fel;
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  // 300 stationer över Sverige; fingeravtrycket = 0,5 × (log10 ÅDT − 3) + brus för Bsp, bara brus för A2.
  let fro = 7; const rnd = () => ((fro = (fro * 16807) % 2147483647) / 2147483647);
  const vag = new Map<string, VagRad>(), rader: string[] = ["sid,lon,lat,modell,period,population,n_timmar,fingeravtryck_c,sd_c"];
  for (let i = 0; i < 300; i++) {
    const id = String(100 + i), lat = 55.5 + 12 * rnd(), lon = 12 + 10 * rnd(), adt = 10 ** (2 + 2.6 * rnd());
    vag.set(id, { id, adt_fordon: adt, adt_lastbilar: adt * 0.1, adt_latta_22_06: adt * 0.05, klass: 3, hastighet_kmh: 80, bredd_m: 8, slitlager: "asfalt", vaghallare: "statlig" });
    const brus = () => (rnd() - 0.5) * 0.6;
    for (const [m, f] of [["A2", 0], ["Bsp", 0.5]] as [string, number][]) for (const p of ["vinter", "novdec"])
      rader.push(`${id},${lon.toFixed(5)},${lat.toFixed(5)},${m},${p},"yta<=+5C, timvis, vakter #75/#234 (prep.py)",${i === 0 ? 50 : 1000},${(f * (Math.log10(adt) - 3) + brus()).toFixed(3)},1.0`);
  }
  rader.push(`999,15,60,A2,vinter,"yta<=+5C, timvis",12,,`); // tomt fingeravtryck: n < 20
  const fa = lasFingeravtryck(rader.join("\n") + "\n");
  k(fa.length === 1201 && fa.at(-1)!.fa === null && fa[0].n === 50 && fa[0].modell === "A2", "läsningen: citerad population, tomt värde, n");
  const log = console.log; console.log = () => {};
  const bsp = c8Mal(fa.filter((r) => r.modell === "Bsp" && r.period === "vinter"), vag);
  const a2 = c8Mal(fa.filter((r) => r.modell === "A2" && r.period === "vinter"), vag);
  console.log = log;
  k(bsp["VÄG"].n === 299, `MIN_TIMMAR stänger ute station 100: n ${bsp["VÄG"].n}`);
  k(bsp["VÄG"].region > 0.6 && a2["VÄG"].region < 0.1, `VÄG ser ÅDT-signalen i Bsp (${bsp["VÄG"].region.toFixed(2)}) och inte i A2 (${a2["VÄG"].region.toFixed(2)})`);
  k(bsp["ÅDT"].region > 0.8 && Math.abs(a2["ÅDT"].region) < 0.3, `ÅDT-spannet: Bsp ${bsp["ÅDT"].region.toFixed(2)}, A2 ${a2["ÅDT"].region.toFixed(2)}`);
  console.log = () => {}; const fel = kontroll(fa); console.log = log;
  k(fel.length === 2, "kontrollen fäller en fil som inte är Axels");
  console.log("✓ självtest: filen läses, C8:s kolumner och regioner, MIN_TIMMAR, ÅDT-klasserna och kontrollen");
  process.exit(0);
}

if (korsSjalv) {
  console.log("C8 MOT AXELS FINGERAVTRYCK (kort #305, DECISIONS #486) — Bengts C8 på fysikspårets särart per station. Ingen dom.");
  const buf = readFileSync(new URL("../../data/fysik/fingeravtryck-2024-25.csv", import.meta.url));
  const sha = createHash("sha256").update(buf).digest("hex");
  const vantad = JSON.parse(readFileSync(new URL("../../kuvos/fysik-leverans.json", import.meta.url), "utf8")).filer.find((f: { fil: string }) => f.fil === "fingeravtryck-2024-25.csv")?.sha256;
  console.log(`  filen: sha256 ${sha}${sha === vantad ? " = manifestet" : ` ≠ MANIFESTET ${vantad}`}`);
  if (sha !== vantad) process.exit(1);
  const fa = lasFingeravtryck(buf.toString("utf8"));
  const fel = kontroll(fa);
  if (fel.length) { console.error(`KONTROLLEN FÄLLER (${fel.join("; ")}) — populationen skiljer, inget annat läses`); process.exit(1); }
  const vagfil = JSON.parse(readFileSync(new URL("../../data/vagdata/stationer.json", import.meta.url), "utf8"));
  const vag = new Map<string, VagRad>((vagfil.rader as VagRad[]).map((r) => [String(r.id), r]));
  console.log(`  vägdatan: ${vag.size} stationer (hämtad ${vagfil.huvud?.datum ?? "?"})`);
  for (const [modell, period] of [["Bsp", "novdec"], ["A2", "novdec"], ["Bsp", "vinter"], ["A2", "vinter"]]) {
    console.log(`\n═══ ${modell} ${period} ═══`);
    c8Mal(fa.filter((r) => r.modell === modell && r.period === period), vag);
  }
}
