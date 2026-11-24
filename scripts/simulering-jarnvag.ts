// Simuleringens järnvägar: tre linjer ur Natural Earths järnvägar (1:10 miljoner, public domain), skrivna till
// data/simulering/jarnvag.json. Körs en gång, och igen bara om linjerna ska bytas:
//
//   curl -L -o /tmp/ne_10m_railroads.geojson \
//     https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_railroads.geojson
//   node --experimental-strip-types scripts/simulering-jarnvag.ts /tmp/ne_10m_railroads.geojson
//
// Linjen mellan två stationer är den kortaste vägen i Natural Earths nät (Dijkstra över brytpunkterna). Natural Earth är grovt:
// en brytpunkt var 700:e meter i median och lägen som ligger hundratals meter till några kilometer från det riktiga spåret
// (stationernas avstånd till nätet står i filen). Linjerna visar VAR tågen går genom landet, inte vilken sida om vägen.
import { readFileSync, writeFileSync } from "node:fs";
import { haversineM } from "../engine/src/geo.ts";

type P = [number, number];
/** Stations: [lon, lat], rounded to about 100 m. */
const STATION: Record<string, P> = {
  "Stockholm C": [18.058, 59.330], "Södertälje Syd": [17.645, 59.162], "Katrineholm": [16.208, 58.996],
  "Skövde": [13.853, 58.390], "Göteborg C": [11.973, 57.709], "Uppsala C": [17.647, 59.858], "Tierp": [17.513, 60.345],
  "Gävle C": [17.151, 60.676], "Södertälje": [17.628, 59.193],
};
const LINJER: { namn: string; stationer: string[] }[] = [
  { namn: "Stockholm C–Göteborg C", stationer: ["Stockholm C", "Södertälje Syd", "Katrineholm", "Skövde", "Göteborg C"] },
  { namn: "Stockholm C–Gävle C", stationer: ["Stockholm C", "Uppsala C", "Tierp", "Gävle C"] },
  { namn: "Stockholm C–Södertälje", stationer: ["Stockholm C", "Södertälje"] },
];

const fil = process.argv[2];
if (!fil) { console.error("ange sökvägen till ne_10m_railroads.geojson"); process.exit(1); }
const ne = JSON.parse(readFileSync(fil, "utf8")) as { features: { geometry: { type: string; coordinates: P[] | P[][] } }[] };
const ll = (p: P) => ({ lon: p[0], lat: p[1] });
const key = (p: P) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;
const pos = new Map<string, P>(), adj = new Map<string, [string, number][]>();
for (const f of ne.features) {
  const lines = (f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates) as P[][];
  for (const l of lines) {
    if (!l.some(([x, y]) => x > 10.9 && x < 24.2 && y > 55.2 && y < 69.1)) continue;   // Sweden's box
    for (let i = 0; i < l.length; i++) {
      const k = key(l[i]);
      pos.set(k, l[i]);
      if (!adj.has(k)) adj.set(k, []);
      if (i > 0) {
        const k0 = key(l[i - 1]), d = haversineM(ll(l[i - 1]), ll(l[i]));
        adj.get(k)!.push([k0, d]);
        adj.get(k0)!.push([k, d]);
      }
    }
  }
}
function narmast(p: P): [string, number] {
  let b = "", bd = Infinity;
  for (const [k, q] of pos) { const d = haversineM(ll(p), ll(q)); if (d < bd) { bd = d; b = k; } }
  return [b, bd];
}
function vag(s: string, t: string): P[] {
  const dist = new Map<string, number>([[s, 0]]), prev = new Map<string, string>(), klar = new Set<string>();
  for (;;) {
    let u = "", ud = Infinity;
    for (const [k, d] of dist) if (!klar.has(k) && d < ud) { ud = d; u = k; }
    if (u === "") throw new Error(`ingen väg ${s} → ${t}`);
    if (u === t) break;
    klar.add(u);
    for (const [v, w] of adj.get(u)!) if (ud + w < (dist.get(v) ?? Infinity)) { dist.set(v, ud + w); prev.set(v, u); }
  }
  const ut: P[] = [];
  for (let u: string | undefined = t; u !== undefined; u = prev.get(u)) ut.push(pos.get(u)!);
  return ut.reverse();
}

const linjer: Record<string, unknown> = {};
for (const { namn, stationer } of LINJER) {
  const punkter: P[] = [], stopp: { namn: string; index: number; avstand_till_natet_m: number }[] = [];
  let forra = "";
  for (const st of stationer) {
    const [k, d] = narmast(STATION[st]);
    if (forra) punkter.push(...vag(forra, k).slice(punkter.length ? 1 : 0));
    stopp.push({ namn: st, index: Math.max(0, punkter.length - 1), avstand_till_natet_m: Math.round(d) });
    forra = k;
  }
  let m = 0;
  for (let i = 1; i < punkter.length; i++) m += haversineM(ll(punkter[i - 1]), ll(punkter[i]));
  linjer[namn] = { km: Math.round(m / 100) / 10, stopp, punkter };
  console.log(`${namn}: ${(m / 1000).toFixed(1)} km, ${punkter.length} punkter, ${stopp.map((s) => `${s.namn} ${s.avstand_till_natet_m} m`).join(", ")}`);
}
writeFileSync(new URL("../data/simulering/jarnvag.json", import.meta.url), JSON.stringify({
  _om: "Simuleringens järnvägar (engine/simulering.ts): den kortaste vägen mellan stationerna i Natural Earths järnvägsnät. Grovt: lägena ligger hundratals meter till några kilometer från det riktiga spåret (avstand_till_natet_m per station). Skriven av scripts/simulering-jarnvag.ts — ändras aldrig för hand.",
  kalla: "Natural Earth, ne_10m_railroads (github.com/nvkelso/natural-earth-vector, geojson/ne_10m_railroads.geojson)",
  licens: "Public domain (Natural Earth)",
  linjer,
}) + "\n");
