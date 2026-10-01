// Kuvösen (kort #232), Bengts fråga 1/10: täcker de 20 svenska skuggrutterna bara en del av det Trafikverket levererar? Läs-only:
// stationerna ur appens static.json (publik CDN) mot rutternas linjer ur skuggmotorn. Avstånd punkt–linjesegment, plan approximation.
// Kör från repots rot: node --experimental-strip-types scripts/matningar/rutternas-tackning-2026-10-01.ts
// Mätt 1/10: 854 stationer; inom 2 km från en rutt 97 (11 %), inom 5 km 190 (22 %), inom 20 km 410 (48 %); norr om 62° 23 av 205 inom 5 km.
// Rutterna är grova linjer (7–8 punkter per rutt), så 2 km underskattar; skuggmotorns egen korridor är ±5 km av samma skäl.
import { readFileSync } from "node:fs";
const src = readFileSync("supabase/functions/skuggmotor/main.ts", "utf8");
const start = src.indexOf("const ROUTES: Record<string, [number, number][]> = {");
const R: Record<string, [number, number][]> = new Function(`return ${src.slice(src.indexOf("{", start), src.indexOf("\n};", start) + 2)}`)();
const st = (await (await fetch("https://axelstar.github.io/halkvakt-karta/data/app/v1/static.json")).json()).stations as { id: string; lon: number; lat: number }[];
const m = (lon: number, lat: number, lat0: number) => [lon * 111_320 * Math.cos(lat0 * Math.PI / 180), lat * 110_540];
function dist(p: { lon: number; lat: number }, a: [number, number], b: [number, number]) {
  const [px, py] = m(p.lon, p.lat, p.lat), [ax, ay] = m(a[0], a[1], p.lat), [bx, by] = m(b[0], b[1], p.lat);
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
const namn = Object.keys(R);
const narmast = st.map((s) => Math.min(...namn.flatMap((n) => R[n].slice(1).map((b, i) => dist(s, R[n][i], b)))));
console.log(`stationer i static.json: ${st.length} · rutter: ${namn.length}`);
for (const km of [2, 5, 10, 20]) { const n = narmast.filter((d) => d <= km * 1000).length; console.log(`inom ${km} km från någon rutt: ${n} (${(n / st.length * 100).toFixed(0)} %)`); }
const lat = (f: (l: number) => boolean) => st.filter((s) => f(s.lat));
for (const [etikett, f] of [["söder om 59°", (l: number) => l < 59], ["59–62°", (l: number) => l >= 59 && l < 62], ["norr om 62°", (l: number) => l >= 62]] as const) {
  const alla = st.map((s, i) => [s, narmast[i]] as const).filter(([s]) => f(s.lat));
  console.log(`${etikett}: ${alla.length} stationer, ${alla.filter(([, d]) => d <= 5000).length} inom 5 km från en rutt`);
}
console.log("rutterna: " + namn.join(" · "));
