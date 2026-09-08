// Bygger appens snapshot LOKALT/MANUELLT ur databasen: data/app/v1/{static,live,manifest}.json.
//
// Sedan kort #74 (8/9 2026) är Supabase-funktionen `publicera` den ENDA som skriver de här
// filerna till CDN:n — publish-map kör inte längre det här steget. Kvar som Node-ingång
// till samma kärna (publish/snapshot-core.ts), för lokal körning och för integrations-
// testet. Frågorna och formatet bor i kärnan; det här är bara pg-koppling och filskrivning.
//
//   node --experimental-strip-types publish/build-snapshot.ts out
import pg from "pg";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildSnapshot, bridgesFromGeoJSON, manifestFor } from "./snapshot-core.ts";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const outDir = join(process.argv[2] ?? "out", "app", "v1");
mkdirSync(outDir, { recursive: true });
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });

// #38: saknas data/bridges.geojson (Overpass nere) ⇒ tom lista, inget annat påverkas.
const bridgesFile = new URL("../data/bridges.geojson", import.meta.url);
const bridges = existsSync(bridgesFile) ? bridgesFromGeoJSON(JSON.parse(readFileSync(bridgesFile, "utf8"))) : [];

const { staticDoc, liveDoc, border, notes } = await buildSnapshot(
  async (text, params) => (await pool.query(text, params as any[])).rows, bridges);
for (const n of notes) console.log(n);

const sStatic = JSON.stringify(staticDoc), sLive = JSON.stringify(liveDoc);
const manifest = await manifestFor(liveDoc.generated_at, { static: sStatic, live: sLive });
writeFileSync(join(outDir, "static.json"), sStatic);
writeFileSync(join(outDir, "live.json"), sLive);
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest));

const kb = (b: number) => `${(b / 1024).toFixed(0)} kB`;
const f = manifest.files;
console.log(`snapshot built: static ${kb(f.static.bytes)} (gz ${kb(f.static.gz_bytes)}, ${staticDoc.cameras.length} cameras), ` +
  `live ${kb(f.live.bytes)} (gz ${kb(f.live.gz_bytes)}; segs ${liveDoc.segments.length}, wx ${liveDoc.weather.length}, dev ${liveDoc.deviations.length}, vilt ${liveDoc.wildlife.length}, broar ${liveDoc.bridges.length}, smhi ${liveDoc.smhi.length})`);
for (const land of ["fi", "no"])
  console.log(`gräns-wx (#49): ${land.toUpperCase()} ${border[land]?.reach ?? "—"} stationer inom 40 km av svenska vägnätet (varav ${border[land]?.cold ?? "—"} kalla i snapshoten nu)`);
if (f.live.gz_bytes > 1_500_000) console.warn("SPLIT CRITERION HIT (DECISIONS #14): live gz > 1.5 MB — time for per-län files");
await pool.end();
