// Skriver sql/055_vagpunkter.sql ur data/vagdata/vaglagspunkter.json (DECISIONS #573). Kandidatens tabell kandidat_live
// namnger väglagspunkterna "v" + radnumret (fysik/live/indata.py, ingest/metnordic-live.ts); regeln i databasen
// (sql/056 kandidat_regel) behöver punktens sträcka och läge. Sträckan är id:t före "@" ("4045@0" → "4045"), samma id som
// road_conditions och radar_precip bär. sql/055 är GENERERAD — ändra filen ur källan och kör:
//   node --experimental-strip-types scripts/vagpunkter-sql.ts
// --check (ci) fäller om sql/055 inte matchar källan.
import { readFileSync, writeFileSync } from "node:fs";

const kalla = JSON.parse(readFileSync(new URL("../data/vagdata/vaglagspunkter.json", import.meta.url), "utf8"));
const rader = kalla.rader as { id: string; lon: number; lat: number }[];
const ut: string[] = [];
rader.forEach((r, i) => {
  const seg = r.id.split("@")[0];
  if (!/^[0-9]+$/.test(seg) || !Number.isFinite(r.lon) || !Number.isFinite(r.lat)) throw new Error(`rad ${i}: ${JSON.stringify(r)}`);
  ut.push(`('v${String(i).padStart(5, "0")}','${seg}',${r.lon.toFixed(6)},${r.lat.toFixed(6)})`);
});

const sql = `-- 055: VÄGPUNKTERNA (DECISIONS #573) — GENERERAD av scripts/vagpunkter-sql.ts ur data/vagdata/vaglagspunkter.json. ÄNDRA INTE HÄR.
-- Punkten heter som i kandidat_live ("v" + radnumret), sträckan är road_conditions/radar_precip:s segment_id. ${ut.length} punkter.
CREATE TABLE IF NOT EXISTS vagpunkt (
  punkt text PRIMARY KEY,
  segment_id text NOT NULL,
  lon double precision NOT NULL,
  lat double precision NOT NULL,
  geom geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lon, lat), 4326)) STORED
);
CREATE INDEX IF NOT EXISTS vagpunkt_segment ON vagpunkt (segment_id);
ALTER TABLE vagpunkt ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE vagpunkt FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON TABLE vagpunkt FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON TABLE vagpunkt FROM authenticated; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN GRANT SELECT ON TABLE vagpunkt TO service_role; END IF;
END $$;
INSERT INTO vagpunkt (punkt, segment_id, lon, lat) VALUES
${ut.join(",\n")}
ON CONFLICT (punkt) DO UPDATE SET segment_id = EXCLUDED.segment_id, lon = EXCLUDED.lon, lat = EXCLUDED.lat;
`;

const mal = new URL("../sql/055_vagpunkter.sql", import.meta.url);
if (process.argv.includes("--check")) {
  if (readFileSync(mal, "utf8") !== sql) { console.error("sql/055_vagpunkter.sql matchar inte vaglagspunkter.json — kör scripts/vagpunkter-sql.ts"); process.exit(1); }
  console.log(`sql/055_vagpunkter.sql i synk (${ut.length} punkter)`);
} else {
  writeFileSync(mal, sql);
  console.log(`skrev sql/055_vagpunkter.sql (${ut.length} punkter, ${sql.length} tecken)`);
}
