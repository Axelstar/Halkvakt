// KANDIDATEN LIVE — databasens in- och utgång (kort #343 steg 3, DECISIONS #558; tabellerna i sql/050). Python räknar, den här
// filen läser och skriver, batchat med UNNEST som ingest/db.ts (en sats per 500 rader, aldrig en per rad).
//   node --experimental-strip-types ingest/kandidat-db.ts skriv-ph <kandidat_ph_<körning>.csv.gz>   del A:s fil → kandidat_ph
//   node --experimental-strip-types ingest/kandidat-db.ts ph <tid-iso> <ut.csv>                     PH vid timmen → punkt,ph
//   node --experimental-strip-types ingest/kandidat-db.ts ankare <ut.csv>                           grind A:s ankare just nu → punkt,yta,lon,lat
//   node --experimental-strip-types ingest/kandidat-db.ts skriv-live <live.csv>                     del B:s fil → kandidat_live, sedan gallringen
//   node --experimental-strip-types ingest/kandidat-db.ts --sjalvtest                               csv-läsningen och satserna, utan databas
// Ankarna är exakt skuggans: sql/032 vagpunkt_ankare() (#75, radvakten, karantänen, den långsamma vakten, färska ≤ 3 h), så RÅ i
// del B räknas på samma population som skuggans RÅ. DATABASE_URL ur Actions secrets, aldrig i loggen.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHUNK = 500;

/** En csv (gz eller inte) → rader som objekt; tomt fält → null, tal → number. Rubriken är kontraktet. */
export function lasCsv(fil: string, vantade: string[]): Record<string, string | number | null>[] {
  const buf = readFileSync(fil);
  const text = (fil.endsWith(".gz") ? gunzipSync(buf) : buf).toString("utf8").trim();
  const [rubrik, ...rader] = text.split("\n");
  const kol = rubrik.split(",");
  for (const v of vantade) if (!kol.includes(v)) throw new Error(`${fil}: kolumnen ${v} saknas i rubriken ${rubrik}`);
  return rader.map((r) => {
    const c = r.split(","), o: Record<string, string | number | null> = {};
    kol.forEach((k, i) => { const v = c[i] ?? ""; o[k] = v === "" ? null : /^-?\d+(\.\d+)?$/u.test(v) ? Number(v) : v; });
    return o;
  });
}

export function* delar<T>(arr: T[]): Generator<T[]> {
  for (let i = 0; i < arr.length; i += CHUNK) yield arr.slice(i, i + CHUNK);
}

/** Satserna, så att självtestet kan läsa dem. */
export const SATS = {
  skrivPh: `INSERT INTO kandidat_ph (korning, tid, punkt, ts_fysik, ph)
    SELECT * FROM UNNEST($1::timestamptz[], $2::timestamptz[], $3::text[], $4::real[], $5::real[])
    ON CONFLICT (tid, punkt) DO UPDATE SET korning = EXCLUDED.korning, ts_fysik = EXCLUDED.ts_fysik, ph = EXCLUDED.ph`,
  ph: `SELECT punkt, ph FROM kandidat_ph WHERE tid = $1::timestamptz AND ph IS NOT NULL ORDER BY punkt`,
  ankare: `SELECT id AS punkt, yta, lon, lat FROM vagpunkt_ankare() ORDER BY id`,
  skrivLive: `INSERT INTO kandidat_live (tid, punkt, ph, pg, ra, ank_km, pb, n_ank, spr)
    SELECT * FROM UNNEST($1::timestamptz[], $2::text[], $3::real[], $4::real[], $5::real[], $6::real[], $7::real[], $8::smallint[], $9::real[])
    ON CONFLICT (tid, punkt) DO UPDATE SET ph = EXCLUDED.ph, pg = EXCLUDED.pg, ra = EXCLUDED.ra, ank_km = EXCLUDED.ank_km, pb = EXCLUDED.pb,
      n_ank = EXCLUDED.n_ank, spr = EXCLUDED.spr`,
  gallra: `SELECT gallra_kandidat() AS n`,
};

async function pool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL saknas");
  const pg = (await import("pg")).default;
  return new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
}

const csvRad = (v: unknown) => (v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v)) ? "" : String(v));

async function main(arg: string[]) {
  const [kmd, a, b] = arg;
  if (kmd === "skriv-ph") {
    const rader = lasCsv(a, ["punkt", "korning_utc", "tid_utc", "ts_fysik", "ph"]);
    const p = await pool();
    try {
      let n = 0;
      for (const d of delar(rader)) {
        await p.query(SATS.skrivPh, [d.map((r) => r.korning_utc), d.map((r) => r.tid_utc), d.map((r) => r.punkt), d.map((r) => r.ts_fysik), d.map((r) => r.ph)]);
        n += d.length;
      }
      console.log(`kandidat_ph: ${n} rader skrivna ur ${a}`);
    } finally { await p.end(); }
  } else if (kmd === "ph") {
    const p = await pool();
    try {
      const r = await p.query(SATS.ph, [a]);
      writeFileSync(b, "punkt,ph\n" + r.rows.map((x) => `${x.punkt},${x.ph}`).join("\n") + (r.rows.length ? "\n" : ""));
      console.log(`ph vid ${a}: ${r.rows.length} punkter → ${b}`);
      if (!r.rows.length) process.exit(3);                                   // ingen PH för timmen: del A har inte kört, timjobbet stannar
    } finally { await p.end(); }
  } else if (kmd === "ankare") {
    const p = await pool();
    try {
      const r = await p.query(SATS.ankare);
      writeFileSync(a, "punkt,yta,lon,lat\n" + r.rows.map((x) => `${x.punkt},${x.yta},${x.lon},${x.lat}`).join("\n") + (r.rows.length ? "\n" : ""));
      console.log(`ankare just nu (vagpunkt_ankare): ${r.rows.length} stationer → ${a}`);
    } finally { await p.end(); }
  } else if (kmd === "skriv-live") {
    const rader = lasCsv(a, ["tid_utc", "punkt", "ph", "pg", "ra", "ank_km", "pb", "n_ank", "spr"]);   // n_ank, spr: spridningsgrinden (#575)
    const p = await pool();
    try {
      let n = 0;
      for (const d of delar(rader)) {
        await p.query(SATS.skrivLive, [d.map((r) => r.tid_utc), d.map((r) => r.punkt), d.map((r) => r.ph), d.map((r) => r.pg), d.map((r) => r.ra), d.map((r) => r.ank_km), d.map((r) => r.pb),
          d.map((r) => r.n_ank), d.map((r) => r.spr)]);
        n += d.length;
      }
      const g = await p.query(SATS.gallra);
      console.log(`kandidat_live: ${n} rader skrivna ur ${a}; gallringen tog ${g.rows[0].n} rader`);
    } finally { await p.end(); }
  } else {
    console.error("kör: kandidat-db.ts skriv-ph <fil> | ph <tid> <ut> | ankare <ut> | skriv-live <fil> | --sjalvtest"); process.exit(2);
  }
}

function sjalvtest() {
  let fel = 0; const k = (ok: boolean, m: string) => { if (!ok) { fel++; console.error("✗ " + m); } };
  const d = mkdtempSync(join(tmpdir(), "kdb-"));
  writeFileSync(join(d, "a.csv.gz"), gzipSync("punkt,korning_utc,tid_utc,ts_fysik,ph\nv00001,2026-10-20T06:00:00Z,2026-10-20T12:00:00Z,-1.25,-0.9\n1001,2026-10-20T06:00:00Z,2026-10-20T12:00:00Z,,0.1\n"));
  const r = lasCsv(join(d, "a.csv.gz"), ["punkt", "ph"]);
  k(r.length === 2 && r[0].punkt === "v00001" && r[0].ts_fysik === -1.25 && r[1].ts_fysik === null && r[1].ph === 0.1, `csv: ${JSON.stringify(r)}`);
  let foll = false; try { lasCsv(join(d, "a.csv.gz"), ["pb"]); } catch { foll = true; }
  k(foll, "en saknad kolumn fälls");
  k([...delar(Array.from({ length: 1201 }, (_, i) => i))].map((x) => x.length).join() === "500,500,201", "delarna om 500");
  k(SATS.skrivPh.includes("ON CONFLICT (tid, punkt)") && SATS.skrivLive.includes("ON CONFLICT (tid, punkt)") && SATS.ankare.includes("vagpunkt_ankare()"),
    "satserna: upsert på (tid, punkt) och skuggans ankare");
  k(csvRad(null) === "" && csvRad(NaN) === "" && csvRad(1.5) === "1.5", "tomt och NaN blir tomt fält");
  if (fel) process.exit(1);
  console.log("✓ självtest: csv-läsningen (gz, tomma fält, tal), kolumnkontrollen, delarna om 500, satsernas form");
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv) {
  if (process.argv.includes("--sjalvtest")) sjalvtest();
  else await main(process.argv.slice(2));
}
