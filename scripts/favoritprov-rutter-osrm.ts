// FAVORITPROVETS RUTTER PÅ RIKTIGA VÄGAR (kort #338, DECISIONS #531; Bengt 11/10: "då blir det osm + osrm för punkt 5", "gör kort 338").
// Skuggans 30 rutter (ROUTES och ROUTES_C i supabase/functions/skuggmotor/main.ts) är raka sträckor mellan brytpunkter. Det här skriptet
// lägger dem på vägnätet med en OSRM-beräkning på OpenStreetMap: brytpunkterna blir OSRM:s stopp, och linjen blir den väg en bil kör —
// samma sak som en sparad rutt i appen. Körs EN gång och skriver data/favoritprov/rutter-osrm.json (källa och licens i data/KALLOR.json);
// favoritprovet läser filen när det buntas. Skuggans egna rutter rörs inte.
// OSRM:s öppna server är för enstaka anrop: högst ett i sekunden och ett namn i User-Agent. 30 anrop, en gång.
// Kör: node --experimental-strip-types scripts/favoritprov-rutter-osrm.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { lasRutter } from "../publish/skuggfacit.ts";
import { haversineM } from "../engine/src/geo.ts";

type Linje = [number, number][];
const TOLERANS_M = 10;   // Douglas–Peucker: en brytpunkt närmare än 10 m den förenklade linjen stryks

const kod = readFileSync(new URL("../supabase/functions/skuggmotor/main.ts", import.meta.url), "utf8");
const rutter: Record<string, Linje> = { ...lasRutter(kod),
  ...lasRutter(kod.replace("const ROUTES: Record", "const ROUTES_X: Record").replace("const ROUTES_C: Record", "const ROUTES: Record")) };

const langd = (l: Linje) => l.reduce((s, p, i) => (i ? s + haversineM({ lon: l[i - 1][0], lat: l[i - 1][1] }, { lon: p[0], lat: p[1] }) : 0), 0);
/** Douglas–Peucker i en plan projektion kring linjens mittlatitud. */
function forenkla(l: Linje, tol: number): Linje {
  const lat0 = l.reduce((s, p) => s + p[1], 0) / l.length, kx = 111_320 * Math.cos((lat0 * Math.PI) / 180), ky = 110_574;
  const behall = new Uint8Array(l.length); behall[0] = behall[l.length - 1] = 1;
  const stack: [number, number][] = [[0, l.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const ax = l[a][0] * kx, ay = l[a][1] * ky, bx = l[b][0] * kx, by = l[b][1] * ky, dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const px = l[i][0] * kx, py = l[i][1] * ky;
      const t = L === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L));
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (d > max) { max = d; idx = i; }
    }
    if (idx >= 0 && max > tol) { behall[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return l.filter((_, i) => behall[i]);
}

const ut: Record<string, { km: number; km_rak: number; omvag: number; punkter: Linje }> = {};
for (const [namn, linje] of Object.entries(rutter)) {
  // De namngivna vägrutterna (E4, E22, Rv70 …) får bara start och mål: skuggans mellanpunkter har två decimaler och kan ligga en
  // halv kilometer från vägen, och OSRM körde då ut till närmaste småväg och tillbaka (E22 Malmö→Kristianstad 124 km mot omkring 95
  // i första körningen). Den snabbaste vägen mellan start och mål är den namngivna vägen. C-kedjorna behåller varje station som stopp —
  // det är stationerna de ska passera.
  const stoppen = namn.startsWith("C ") ? linje : [linje[0], linje[linje.length - 1]];
  const stopp = stoppen.map(([x, y]) => `${x},${y}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${stopp}?overview=full&geometries=geojson&steps=false`;
  const r = await fetch(url, { headers: { "User-Agent": "Halkvakt favoritprov (github.com/Axelstar/Halkvakt, kort #338)" } });
  const j = await r.json() as any;
  if (!r.ok || j.code !== "Ok") throw new Error(`${namn}: ${r.status} ${j.code ?? ""} ${String(j.message ?? "").slice(0, 200)}`);
  const full: Linje = j.routes[0].geometry.coordinates.map(([x, y]: number[]) => [x, y]);
  const enkel = forenkla(full, TOLERANS_M).map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5] as [number, number]);
  const km = j.routes[0].distance / 1000, kmRak = langd(linje) / 1000;
  ut[namn] = { km: Math.round(km * 10) / 10, km_rak: Math.round(kmRak * 10) / 10, omvag: Math.round((km / kmRak) * 100) / 100, punkter: enkel };
  console.log(`${namn.slice(0, 42).padEnd(42)} ${km.toFixed(0).padStart(4)} km på vägen, ${kmRak.toFixed(0).padStart(4)} km rakt (×${(km / kmRak).toFixed(2)}), ` +
    `${full.length} → ${enkel.length} punkter`);
  await new Promise((res) => setTimeout(res, 1200));
}
mkdirSync(new URL("../data/favoritprov/", import.meta.url), { recursive: true });
const fil = { _om: "Favoritprovets rutter på vägnätet (kort #338, DECISIONS #531): skuggans 30 rutter som OSRM-rutter, vägrutterna mellan start och mål och C-kedjorna med varje station som stopp; linjen " +
  "förenklad till 10 m (Douglas–Peucker). Skriven en gång av scripts/favoritprov-rutter-osrm.ts — ändras aldrig för hand.",
  kalla: "OSRM (router.project-osrm.org) på OpenStreetMap", licens: "ODbL 1.0 — © OpenStreetMaps bidragsgivare", hamtad: new Date().toISOString(),
  toleransM: TOLERANS_M, rutter: ut };
const text = JSON.stringify(fil) + "\n";
writeFileSync(new URL("../data/favoritprov/rutter-osrm.json", import.meta.url), text);
console.log(`skrev data/favoritprov/rutter-osrm.json: ${Object.keys(ut).length} rutter, ${(text.length / 1000).toFixed(0)} kB, ` +
  `${Object.values(ut).reduce((s, r) => s + r.punkter.length, 0)} punkter`);
