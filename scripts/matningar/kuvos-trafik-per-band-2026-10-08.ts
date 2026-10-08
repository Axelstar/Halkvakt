// TRAFIKEN PER BAND (DECISIONS #490, förslag 3; Bengts ja 8/10). Hur stor del av väglagsnätet och av trafiken ligger i varje
// avståndsband till närmaste väderstation? Prognoslagret mäts i banden 0–7 · 7–15 · 15–20 · > 20 km (grind A:s BANDS); frågan avgör
// var kraften lönar sig. Ingen databas och ingen kandidat: allt läses ur repots vägdatalager (data/vagdata/, DECISIONS #473).
//   punkterna   väglagspunkterna var 2 km längs väglagsnätets 818 sträckor, med NVDB:s ÅDT och lätta fordon 22–06
//   stationerna de 854 platserna i data/vagdata/stationer.json (dagens nät)
//   bandet      avståndet från punkten till närmaste station; över 50 km har RÅ inget ankare alls (grind A söker inom 50 km)
// Väglängden räknas som 2 km per punkt, trafiken som ÅDT × 2 km (fordonskilometer per dygn); punkter utan ÅDT räknas i väglängden men
// inte i trafiken, och antalet skrivs ut. Norr/söder om 62° som fysikspårets egna tal.
// Kör: node --experimental-strip-types scripts/matningar/kuvos-trafik-per-band-2026-10-08.ts [--sjalvtest]
import { readFileSync } from "node:fs";
import { BANDS, MAX_KM } from "../../publish/grind-a.ts";

type Punkt = { lon: number; lat: number; adt_fordon: number | null; adt_latta_22_06: number | null };
type Plats = { lon: number; lat: number };
// Grind A:s band, det sista delat vid grind A:s sökradie (inga egna kopior av gränserna).
const SISTA = BANDS[BANDS.length - 1][1];
export const BANDEN: [string, number, number][] = [...BANDS.slice(0, -1), [`${SISTA}–${MAX_KM} km`, SISTA, MAX_KM], [`> ${MAX_KM} km`, MAX_KM, Infinity]];
const NORR_LAT = 62, KM_PER_PUNKT = 2;

export function km(a: Plats, b: Plats): number {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function narmast(p: Plats, platser: Plats[]): number {
  let bast = Infinity;
  for (const s of platser) {
    if (Math.abs(s.lat - p.lat) * 111 > bast) continue;   // snabbt: latitudskillnaden ensam är längre än det bästa
    const d = km(p, s); if (d < bast) bast = d;
  }
  return bast;
}

export type Rad = { band: string; punkter: number; vagKm: number; utanAdt: number; fordonKm: number; nattKm: number };
export function perBand(punkter: Punkt[], platser: Plats[]): Rad[] {
  const ut = BANDEN.map(([band]) => ({ band, punkter: 0, vagKm: 0, utanAdt: 0, fordonKm: 0, nattKm: 0 }));
  for (const p of punkter) {
    const d = narmast(p, platser);
    const i = BANDEN.findIndex(([, lo, hi]) => d >= lo && d < hi);
    const r = ut[i];
    r.punkter++; r.vagKm += KM_PER_PUNKT;
    if (p.adt_fordon == null) r.utanAdt++; else r.fordonKm += p.adt_fordon * KM_PER_PUNKT;
    if (p.adt_latta_22_06 != null) r.nattKm += p.adt_latta_22_06 * KM_PER_PUNKT;
  }
  return ut;
}

const pct = (x: number, tot: number) => (tot ? (100 * x / tot).toFixed(1).replace(".", ",") : "–") + " %";
export function skriv(rader: Rad[], rubrik: string): string[] {
  const t = { p: 0, v: 0, f: 0, n: 0 };
  for (const r of rader) { t.p += r.punkter; t.v += r.vagKm; t.f += r.fordonKm; t.n += r.nattKm; }
  const ut = [`═══ ${rubrik}: ${t.p} punkter, ${t.v} km väg ═══`, "  band        punkter   väglängd   trafiken (fordonskm)   nattrafiken 22–06   utan ÅDT"];
  for (const r of rader) ut.push(`  ${r.band.padEnd(10)} ${String(r.punkter).padStart(7)}   ${pct(r.vagKm, t.v).padStart(8)}   ${pct(r.fordonKm, t.f).padStart(20)}   ${pct(r.nattKm, t.n).padStart(17)}   ${r.utanAdt}`);
  return ut;
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  let fel = 0; const k = (ok: boolean, m: string) => { if (!ok) { fel++; console.error("✗ " + m); } };
  k(Math.abs(km({ lon: 18, lat: 59 }, { lon: 18, lat: 60 }) - 111.2) < 0.5, "en breddgrad är ~111 km");
  const st: Plats[] = [{ lon: 15, lat: 60 }];
  // Punkter 0,05° (5,6 km), 0,1° (11,1 km), 0,16° (17,8 km), 0,3° (33,4 km) och 0,6° (66,7 km) norr om stationen.
  const p: Punkt[] = [0.05, 0.1, 0.16, 0.3, 0.6].map((d, i) => ({ lon: 15, lat: 60 + d, adt_fordon: i === 4 ? null : 1000 * (i + 1), adt_latta_22_06: 10 }));
  const r = perBand(p, st);
  k(r.map((x) => x.punkter).join(",") === "1,1,1,1,1", `en punkt per band: ${r.map((x) => x.punkter)}`);
  k(r[0].fordonKm === 2000 && r[3].fordonKm === 8000 && r[4].fordonKm === 0 && r[4].utanAdt === 1, "trafiken = ÅDT × 2 km, utan ÅDT räknas bara i väglängden");
  k(skriv(r, "prov")[2].includes("20,0 %"), "andelarna skrivs med komma");
  if (fel) process.exit(1);
  console.log("✓ självtest: avståndet, banden, trafiken som ÅDT × 2 km och punkter utan ÅDT");
  process.exit(0);
}

if (korsSjalv) {
  const las = (f: string) => JSON.parse(readFileSync(new URL(`../../data/vagdata/${f}`, import.meta.url), "utf8"));
  const punkter: Punkt[] = las("vaglagspunkter.json").rader, platser: Plats[] = las("stationer.json").rader;
  console.log(`TRAFIKEN PER BAND (DECISIONS #490) — ${punkter.length} väglagspunkter mot ${platser.length} stationer, vägdatalagret ${las("stationer.json").huvud.datum}`);
  for (const r of skriv(perBand(punkter, platser), "hela landet")) console.log(r);
  for (const r of skriv(perBand(punkter.filter((p) => p.lat >= NORR_LAT), platser), `norr om ${NORR_LAT}°`)) console.log(r);
  for (const r of skriv(perBand(punkter.filter((p) => p.lat < NORR_LAT), platser), `söder om ${NORR_LAT}°`)) console.log(r);
  // Tillagt efter körningen 8/10 (utfallet under #490): hur stor del av trafiken i de bortre banden som går norr om 62°.
  const hela = perBand(punkter, platser), norr = perBand(punkter.filter((p) => p.lat >= NORR_LAT), platser);
  const bortom = (rr: Rad[], fran: number) => rr.slice(fran).reduce((a, r) => a + r.fordonKm, 0);
  for (const [namn, fran] of [["15", 2], ["20", 3]] as const) console.log(`bortom ${namn} km: ${pct(bortom(norr, fran), bortom(hela, fran))} av trafiken går norr om ${NORR_LAT}°`);
}
