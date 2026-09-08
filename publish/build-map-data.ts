// Bygger kartsajtens filer LOKALT/MANUELLT ur databasen till argv[2] (standard map-data/).
// Sedan kort #77 (8/9 2026) publicerar Supabase-funktionen `publicera` kartlagren var 30:e
// minut — publish-map.yml kör inte längre det här steget. Kvar som Node-ingång till samma
// kärna (publish/map-core.ts). Allt som skrivs blir PUBLIKT (bara CC0/CC BY-data).
//
//   node --experimental-strip-types publish/build-map-data.ts out
import pg from "pg";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildMapData } from "./map-core.ts";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const outDir = process.argv[2] ?? "map-data";
mkdirSync(outDir, { recursive: true });
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });

const { files, stats, notes } = await buildMapData(
  async (text, params) => (await pool.query(text, params as any[])).rows,
  { trvKey: process.env.TRAFIKVERKET_API_KEY });
for (const n of notes) console.error(n);
for (const [name, json] of Object.entries(files)) writeFileSync(join(outDir, name), json);
await pool.end();
console.log("map data built:", JSON.stringify(stats), `vaglag=${(files["vaglag.geojson"].length / 1024).toFixed(0)}kB`);
