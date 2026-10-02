// KUVÖSENS SMHI-INLÄSNING (kort #232, PLAN-KUVOSEN steg 4, DECISIONS #441). Läser filerna från kuvos/radar-vinter.ts och
// kuvos/smhi-vinter.ts (releasen `kuvos-smhi-2024-25`) till kuvösens databas:
//   radar_precip_2024-25.csv.gz  → public.radar_precip (driftens tabell; snapshoten läser den genom klockans vy kuvos.radar_precip)
//   smhi_p<N>_2024-25.csv.gz      → kuvos_ra.smhi_obs (rått, som SMHI skrev det; ingen driftstabell finns — driften hämtar vid körning)
// Idempotent. Skriver ut täckningen per månad. Läser inget utfall.
//
// Kör: DATABASE_URL=... node --experimental-strip-types kuvos/smhi-inlasning.ts <mapp>
import { createReadStream, readdirSync, readFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { join } from "node:path";

export const SMHI_SCHEMA = `
CREATE SCHEMA IF NOT EXISTS kuvos_ra;
CREATE TABLE IF NOT EXISTS kuvos_ra.smhi_obs (
  parameter int NOT NULL, station_id text NOT NULL, lat double precision, lon double precision,
  tid timestamptz NOT NULL, varde numeric, kvalitet text,
  PRIMARY KEY (parameter, station_id, tid));`;

async function* rader(fil: string) {
  const rl = createInterface({ input: createReadStream(fil).pipe(createGunzip()).setEncoding("utf8"), crlfDelay: Infinity });
  let forsta = true;
  for await (const r of rl) { if (forsta) { forsta = false; continue; } if (r) yield r.split(","); }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!)) {
  const mapp = process.argv[2], url = process.env.DATABASE_URL;
  if (!mapp || !url) { console.error("användning: DATABASE_URL=... smhi-inlasning.ts <mapp>"); process.exit(1); }
  const pg = (await import("pg")).default;
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  await db.query("SET TimeZone = 'UTC'");
  await db.query(readFileSync(new URL("../sql/009_radar_precip.sql", import.meta.url), "utf8"));
  await db.query(SMHI_SCHEMA);
  const filer = readdirSync(mapp);
  const BATCH = 5000;

  const radar = filer.find((f) => /^radar_precip_.*\.csv\.gz$/.test(f));
  if (radar) {
    let buf: string[][] = [], n = 0;
    const skriv = async () => {
      if (!buf.length) return;
      await db.query(`INSERT INTO radar_precip (segment_id, observed_at, rate_max_mmh, rate_mean_mmh)
        SELECT * FROM unnest($1::text[], $2::timestamptz[], $3::numeric[], $4::numeric[])
        ON CONFLICT (segment_id, observed_at) DO UPDATE SET rate_max_mmh = EXCLUDED.rate_max_mmh, rate_mean_mmh = EXCLUDED.rate_mean_mmh`,
        [0, 1, 2, 3].map((k) => buf.map((r) => r[k])));
      buf = [];
    };
    for await (const r of rader(join(mapp, radar))) { buf.push(r); n++; if (buf.length >= BATCH) await skriv(); }
    await skriv();
    console.log(`${radar}: ${n} rader → radar_precip`);
    const m = (await db.query(`SELECT to_char(observed_at, 'YYYY-MM') AS man, count(DISTINCT observed_at) AS tider, count(*) AS rader,
      count(DISTINCT segment_id) AS segment FROM radar_precip GROUP BY 1 ORDER BY 1`)).rows;
    for (const x of m) console.log(`  ${x.man}: ${x.tider} kompositer med regn någonstans, ${x.rader} segmentrader, ${x.segment} segment`);
  } else console.log("ingen radar_precip-fil i mappen");

  for (const f of filer.filter((f) => /^smhi_p\d+_.*\.csv\.gz$/.test(f)).sort()) {
    let buf: string[][] = [], n = 0;
    const skriv = async () => {
      if (!buf.length) return;
      await db.query(`INSERT INTO kuvos_ra.smhi_obs SELECT * FROM unnest($1::int[], $2::text[], $3::float8[], $4::float8[], $5::timestamptz[], $6::numeric[], $7::text[])
        ON CONFLICT (parameter, station_id, tid) DO UPDATE SET varde = EXCLUDED.varde, kvalitet = EXCLUDED.kvalitet, lat = EXCLUDED.lat, lon = EXCLUDED.lon`,
        [0, 1, 2, 3, 4, 5, 6].map((k) => buf.map((r) => (r[k] === "" || r[k] === "NaN" ? null : r[k]))));
      buf = [];
    };
    for await (const r of rader(join(mapp, f))) { buf.push(r); n++; if (buf.length >= BATCH) await skriv(); }
    await skriv();
    console.log(`${f}: ${n} rader → kuvos_ra.smhi_obs`);
  }
  const t = (await db.query(`SELECT parameter, to_char(tid, 'YYYY-MM') AS man, count(DISTINCT station_id) AS st, count(*) AS rader,
    count(*) FILTER (WHERE kvalitet <> 'G') AS ej_g FROM kuvos_ra.smhi_obs GROUP BY 1, 2 ORDER BY 1, 2`)).rows;
  console.log("SMHI-stationernas täckning (parameter · månad · stationer · rader · ej G-kontrollerade):");
  for (const x of t) console.log(`  p${x.parameter} ${x.man}: ${String(x.st).padStart(4)} st · ${String(x.rader).padStart(7)} rader · ${x.ej_g} ej G`);
  await db.end();
}
