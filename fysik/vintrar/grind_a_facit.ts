// Facit för vintrarnas mått (fysik/vintrar/matt.py): grind A:s egen evaluate(…, { utanOffset: true }) och stats() ur
// publish/grind-a.ts, körda på samma syntetiska stationer som självtestet (fysik/vintrar/sjalvtest.py) räknar i Python. Ingen data:
// filen läser bara självtestets påhittade serier och skriver punkterna och måtten som JSON.
// Kör: node --experimental-strip-types fysik/vintrar/grind_a_facit.ts <stationer.json> <ut.json>
//   stationer.json: [{ id, lon, lat, serie: [[hink, yta], …] }, …] i den ordning stationerna ska ha (kuvösen: textordning)
import { readFileSync, writeFileSync } from "node:fs";
import { evaluate, stats, BANDS, type Station } from "../../publish/grind-a.ts";

const [inn, ut] = process.argv.slice(2);
if (!inn || !ut) { console.error("kör: grind_a_facit.ts <stationer.json> <ut.json>"); process.exit(2); }
const rader = JSON.parse(readFileSync(inn, "utf8")) as { id: string; lon: number; lat: number; serie: [number, number][] }[];
const stations = new Map<string, Station>();
for (const r of rader) stations.set(r.id, { lon: r.lon, lat: r.lat, series: new Map(r.serie) });
const ev = evaluate(stations, { utanOffset: true });
writeFileSync(ut, JSON.stringify({
  punkter: ev.map((e) => [e.station, e.t, e.measured, e.pred, e.ankKm]),
  totalt: stats(ev),
  band: Object.fromEntries(BANDS.map(([namn, lo, hi]) => [namn, stats(ev.filter((e) => e.ankKm >= lo && e.ankKm < hi))])),
}));
