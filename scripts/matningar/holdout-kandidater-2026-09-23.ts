// Holdout-kandidater på skuggrutterna (Bengts ja 23/9, DECISIONS #323, kort #38b delsteg 4c).
//
// FRÅGAN. Segmentmotorn döms i mars på facit MELLAN stationerna — men bara en station på
// segmentet eller en testarlogg får fälla ett falsklarm (TROSKLAR-SKUGGAN §2). Där vi saknar
// station saknar vi domare. En HOLDOUT är en station på rutten som hålls utanför modellen:
// prognosen för dess plats räknas ur grannarna, facit är dess egen mätning, hela vintern.
// Hur många sådana finns på skuggrutterna, och i vilket ankarband hamnar de när de tas bort?
//
// Läser rutterna ur skuggmotorns källa (main.ts, inte den genererade bunten) och stationerna
// ur den publicerade CDN-filen (ingen nyckel, ingen databas). Sverige och Finland — de två
// länder som har ett arkiv att pröva mot. Ändras flottan följer talen med.
//
// Kör: node --experimental-strip-types scripts/matningar/holdout-kandidater-2026-09-23.ts

import { readFileSync } from "node:fs";

const NARA_KM = 5;      // stationen hör till rutten inom detta avstånd — samma som ankaranalys.ts
const BANDS: [string, number, number][] = [
  ["0–7 km", 0, 7], ["7–15 km", 7, 15], ["15–20 km", 15, 20], [">20 km", 20, Infinity]];
const CDN = "https://axelstar.github.io/halkvakt-karta/data/";
type Pt = [number, number];
type Station = { namn: string; p: Pt };

function lasRutter(kod: string, namn: string): Record<string, Pt[]> {
  const start = kod.indexOf(`const ${namn}: Record<string, [number, number][]> = {`);
  if (start < 0) throw new Error(`hittar inte ${namn} i skuggmotorn`);
  const slut = kod.indexOf("\n};", start);
  const kropp = kod.slice(kod.indexOf("{", start), slut + 2)
    .replace(/^\s*\/\/.*$/gm, "")          // kommentarrader i listan ("// Söder: …")
    .replace(/,(\s*})/g, "$1");
  const o = JSON.parse(kropp) as Record<string, Pt[]>;
  if (!Object.keys(o).length) throw new Error(`${namn} tolkades som tom`);
  return o;
}
function havKm(a: Pt, b: Pt): number {
  const R = 6371, dLa = (b[1] - a[1]) * Math.PI / 180, dLo = (b[0] - a[0]) * Math.PI / 180;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
/** Avstånd från punkt till linjen och läget längs linjen (km), i en lokal planprojektion. */
function tillLinjen(p: Pt, linje: Pt[]): { km: number; vid: number } {
  let best = Infinity, vid = 0, kum = 0;
  for (let i = 0; i < linje.length - 1; i++) {
    const [ax, ay] = linje[i], [bx, by] = linje[i + 1];
    const c = Math.cos(((ay + by) / 2) * Math.PI / 180);
    const X = (x: number, y: number): Pt => [(x - ax) * c * 111.32, (y - ay) * 110.57];
    const B = X(bx, by), P = X(p[0], p[1]);
    const l2 = B[0] ** 2 + B[1] ** 2;
    const t = l2 > 0 ? Math.max(0, Math.min(1, (P[0] * B[0] + P[1] * B[1]) / l2)) : 0;
    const d = Math.hypot(P[0] - t * B[0], P[1] - t * B[1]);
    const seg = havKm(linje[i], linje[i + 1]);
    if (d < best) { best = d; vid = kum + t * seg; }
    kum += seg;
  }
  return { km: best, vid };
}
function langd(linje: Pt[]): number { let s = 0; for (let i = 0; i < linje.length - 1; i++) s += havKm(linje[i], linje[i + 1]); return s; }
function band(km: number): string { return BANDS.find(([, lo, hi]) => km >= lo && km < hi)![0]; }

const kod = readFileSync(new URL("../../supabase/functions/skuggmotor/main.ts", import.meta.url), "utf8");
const vader: any = await fetch(CDN + `vader.geojson?t=${Date.now()}`).then((r) => { if (!r.ok) throw new Error(`vader.geojson ${r.status}`); return r.json(); });
const perLand = new Map<string, Station[]>();
for (const f of vader.features) {
  const land = f.properties.land as string;
  if (!perLand.has(land)) perLand.set(land, []);
  perLand.get(land)!.push({ namn: f.properties.name, p: f.geometry.coordinates as Pt });
}
const summa = new Map<string, number>();
for (const [land, rutter] of [["SE", lasRutter(kod, "ROUTES")], ["FI", lasRutter(kod, "ROUTES_FI")]] as const) {
  const stationer = perLand.get(land) ?? [];
  if (stationer.length < 50) throw new Error(`${land}: bara ${stationer.length} stationer på CDN — filen är trasig`);
  console.log(`\n${land}: ${Object.keys(rutter).length} rutter, ${stationer.length} stationer. Holdout = station ≤ ${NARA_KM} km från linjen; band = avstånd till närmaste ANDRA station.`);
  console.log("rutt                            längd  på rutten   0–7  7–15  15–20  >20   kandidater 7–20 km (namn @ km på rutten: närmaste andra station)");
  for (const [namn, linje] of Object.entries(rutter)) {
    const pa = stationer.map((s) => ({ s, ...tillLinjen(s.p, linje) })).filter((x) => x.km <= NARA_KM).sort((a, b) => a.vid - b.vid);
    const rader = pa.map((x) => {
      let nn = Infinity;
      for (const o of stationer) if (o !== x.s) { const d = havKm(x.s.p, o.p); if (d < nn) nn = d; }
      return { ...x, nn, band: band(nn) };
    });
    const n = (b: string) => rader.filter((r) => r.band === b).length;
    for (const r of rader) summa.set(`${land} ${r.band}`, (summa.get(`${land} ${r.band}`) ?? 0) + 1);
    const kand = rader.filter((r) => r.nn >= 7 && r.nn < 20).map((r) => `${r.s.namn} @ ${r.vid.toFixed(0)} km: ${r.nn.toFixed(1)} km`).join(" · ");
    console.log(`${namn.padEnd(32)} ${langd(linje).toFixed(0).padStart(4)} km ${String(rader.length).padStart(6)}   ${String(n("0–7 km")).padStart(3)} ${String(n("7–15 km")).padStart(5)} ${String(n("15–20 km")).padStart(6)} ${String(n(">20 km")).padStart(4)}   ${kand}`);
  }
}
console.log("\nSUMMA per band (station borttagen ⇒ dess plats hamnar i bandet):");
for (const land of ["SE", "FI"]) console.log(`  ${land}: ` + BANDS.map(([b]) => `${b} ${summa.get(`${land} ${b}`) ?? 0}`).join(" · "));
console.log("\nLäsning: en holdout i 0–7 km prövar bara det band grind A redan klarar bäst. Domare för vägen mellan stationerna är");
console.log("kandidaterna i 7–15 och 15–20 km. Rutterna är grova polylinjer (få brytpunkter), så en station på den riktiga vägen kan");
console.log("ligga några km från linjen — talen är en undre gräns för vad som finns, inte ett facit.");
