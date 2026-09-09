// #38 Broarna — hämtar alla broar på motorväg/riksväg/primärväg i Sverige ur OpenStreetMap
// (Overpass) till data/bridges.geojson. Statisk fil i repot: broar flyttar inte. Körs bara
// på knapp (bridges.yml, alltid --force) sedan kort #82 — 30-dagarsspärren nedan gäller lokalt;
// i CI har filen alltid ålder noll. Provar tre speglar.
// Licens: ODbL — "© OpenStreetMap-bidragsgivare" måste anges där broarna syns.
import { writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";

const OUT = new URL("../data/bridges.geojson", import.meta.url);
// data/ finns inte i ett färskt checkout (git spårar inte tomma kataloger) — utan denna
// rad kraschade skrivningen på ENOENT i varje körning så fort Overpass väl svarade (4/9).
mkdirSync(new URL("../data/", import.meta.url), { recursive: true });
const MAX_AGE_DAYS = 30;
if (existsSync(OUT) && (Date.now() - statSync(OUT).mtimeMs) / 86400e3 < MAX_AGE_DAYS && !process.argv.includes("--force")) {
  console.log("bridges.geojson är färsk — hoppar över"); process.exit(0);
}
const QL = `[out:json][timeout:240];
area["ISO3166-1"="SE"]->.se;
way(area.se)["bridge"="yes"]["highway"~"^(motorway|trunk|primary)$"];
out tags center;`;
const MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter",
                 "https://overpass.private.coffee/api/interpreter"];

let data: any = null;
for (const url of MIRRORS) {
  try {
    const r = await fetch(url, { method: "POST", body: "data=" + encodeURIComponent(QL),
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Halkvakt/0.3 (axelstar.github.io/halkvakt-karta)" } });
    if (!r.ok) { console.log(`${url}: HTTP ${r.status}`); continue; }
    data = await r.json(); if (Array.isArray(data.elements)) break;
  } catch (e) { console.log(`${url}: ${e}`); }
}
if (!data) { console.log("Overpass svarade inte på någon spegel — försöker igen nästa körning"); process.exit(0); }

// En bro = ett OSM-way med centrum. Motorvägar har två separata banor ⇒ två ways nära varandra;
// slå ihop inom 60 m så rösten inte säger "bro" två gånger.
const raw = data.elements.filter((e: any) => e.center).map((e: any) => ({
  id: String(e.id), lon: e.center.lon, lat: e.center.lat,
  road: (e.tags?.ref ?? null)?.split(";")[0] ?? null, name: e.tags?.name ?? null, highway: e.tags?.highway,
}));
const kept: typeof raw = [];
for (const b of raw) {
  const dup = kept.find((k) => Math.hypot((k.lon - b.lon) * 55_000, (k.lat - b.lat) * 111_000) < 60);
  if (!dup) kept.push(b);
}
const fc = { type: "FeatureCollection", generated_at: new Date().toISOString(), source: "OpenStreetMap (ODbL)",
  features: kept.map((b) => ({ type: "Feature", geometry: { type: "Point", coordinates: [b.lon, b.lat] },
    properties: { id: b.id, road: b.road, name: b.name, highway: b.highway } })) };
writeFileSync(OUT, JSON.stringify(fc));
console.log(`broar: ${raw.length} OSM-ways → ${kept.length} broar efter sammanslagning`);
