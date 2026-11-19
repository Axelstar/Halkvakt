// DECISIONS #903, #782; kort #373, #378: storstäderna när den snabba kandidaten talar (sql/124). 19/11 tystade påslaget (sql/122)
// storstäderna, eftersom den snabba räkningen inte bär stadspunkterna; provet i sql/121 hade inga stadspunkter och såg det inte.
// Här har regeln en stadspunkt, och den härledda snabba regeln är tom i storstäderna som i driften. Proven:
//   1. talande_regel() har samma kolumner i sql/124 som i sql/070;
//   2. vakthunden läser storstader_tyst() och larmar på noll mot fler;
//   3. i en databas: med sql/121 saknas stadspunkten när den snabba talar (felet 19/11) och vakten ser det; med sql/124 har
//      stadspunkten timvärdet, med sin tid och talaren ny, och vakten är nöjd; AV och den frysta som förut. Eget schema.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const url = process.env.TEST_DATABASE_URL;
const las = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const sql = (f: string) => las(`sql/${f}`);
const A = "FROM ny_kandidat_live l JOIN vagpunkt v ON v.punkt = l.punkt";
const B = "WHERE l.tid = ny_kandidat_timme() AND l.pb <= 0";
const RATT = "124_storstaderna_i_den_snabba.sql";

function kolumner(text: string, namn: string): string | null {
  const m = new RegExp(`CREATE (?:OR REPLACE )?FUNCTION ${namn}\\(\\)\\s*RETURNS TABLE \\(([\\s\\S]*?)\\)\\s*LANGUAGE`, "m").exec(text);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

test("#903 storstäderna: talande_regel() har samma kolumner i sql/124 som i sql/070", () => {
  assert.equal(kolumner(sql(RATT), "talande_regel"), kolumner(sql("070_bytet.sql"), "talande_regel"));
});

test("#903 storstäderna: vakthunden läser storstader_tyst() och larmar på noll mot fler", () => {
  const v = las("supabase/functions/vakthund/index.ts");
  assert.match(v, /FROM storstader_tyst\(\)/);
  assert.match(v, /if \(h > 0 && t === 0\)\s+problem\.push\(/);
});

test("#903 storstäderna när den snabba talar, i en databas", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const c = await pool.connect();
  const KOL = `punkt text, segment_id text, lon double precision, lat double precision, tid timestamptz, pb real,
               vat boolean, flackvis_vat boolean, radar_mmh numeric,
               veto_station text, veto_km real, veto_yta numeric, n_ank smallint, spr real, utfall text`;
  const ANDRA = "true, false, NULL::numeric, NULL::text, NULL::real, NULL::numeric";
  const rader = async () => (await c.query("SELECT punkt, talare, tid FROM talande_regel() ORDER BY punkt")).rows as
    { punkt: string; talare: string; tid: Date }[];
  const vakt = async () => (await c.query("SELECT talare, stad_talande::int AS t, stad_timvarde::int AS h FROM storstader_tyst()")).rows[0] as
    { talare: string; t: number; h: number };
  try {
    await c.query("DROP SCHEMA IF EXISTS ks_stad CASCADE; CREATE SCHEMA ks_stad; SET search_path = ks_stad, public");
    await c.query(`CREATE TABLE vagpunkt (punkt text PRIMARY KEY, segment_id text NOT NULL, lon double precision NOT NULL, lat double precision NOT NULL,
      geom geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lon, lat), 4326)) STORED)`);
    await c.query("CREATE TABLE stadspunkt (punkt text PRIMARY KEY)");
    await c.query(`CREATE TABLE ny_kandidat_live (tid timestamptz NOT NULL, punkt text NOT NULL, ph real, pg real, ra real, ank_km real, pb real,
      n_ank smallint, spr real, PRIMARY KEY (tid, punkt))`);
    await c.query("CREATE TABLE stad_tim (punkt text PRIMARY KEY, tid timestamptz NOT NULL, pb real NOT NULL)");
    await c.query("CREATE FUNCTION ny_kandidat_timme() RETURNS timestamptz LANGUAGE sql STABLE AS 'SELECT max(tid) FROM ny_kandidat_live'");
    // Timvärdets regel: vägpunkterna med raderna som sql/080 byter, och storstädernas gren ur en egen tabell.
    await c.query(`CREATE OR REPLACE FUNCTION ny_kandidat_regel() RETURNS TABLE (${KOL}) LANGUAGE sql STABLE AS $$
      WITH kall AS (
        SELECT l.punkt, v.segment_id, v.lon, v.lat, l.tid, l.pb, l.n_ank, l.spr, v.geom
        ${A}
        ${B}
      )
      SELECT k.punkt, k.segment_id, k.lon, k.lat, k.tid, k.pb, ${ANDRA}, k.n_ank, k.spr, 'varnar'::text FROM kall k
      UNION ALL
      SELECT t.punkt, 'S'::text, 18::float8, 59::float8, t.tid, t.pb, ${ANDRA}, NULL::smallint, NULL::real, 'varnar'::text FROM stad_tim t
    $$`);
    await c.query("CREATE FUNCTION kandidat_timme() RETURNS timestamptz LANGUAGE sql STABLE AS $$SELECT date_trunc('hour', now()) - interval '1 hour'$$");
    await c.query(`CREATE FUNCTION kandidat_regel() RETURNS TABLE (${KOL}) LANGUAGE sql STABLE AS $$
      SELECT 'F'::text, 'Z'::text, 15::float8, 60::float8, kandidat_timme(), -1::real, ${ANDRA}, NULL::smallint, NULL::real, 'varnar'::text $$`);
    await c.query(sql("070_bytet.sql"));
    await c.query(sql("078_kandidat_snabb.sql"));
    await c.query(sql("080_kandidat_snabb_skugga.sql"));
    // Som i driften: den snabba regeln är tom i storstäderna (kandidat_punkter har inga stadspunkter).
    await c.query(`CREATE OR REPLACE FUNCTION ny_kandidat_regel_snabb() RETURNS TABLE (${KOL}) LANGUAGE sql STABLE AS $$
      SELECT l.punkt, v.segment_id, v.lon, v.lat, l.tid, l.pb, ${ANDRA}, l.n_ank, l.spr, 'varnar'::text
      FROM ny_kandidat_snabb l JOIN vagpunkt v ON v.punkt = l.punkt WHERE l.pb <= 0 $$`);
    await c.query(sql("121_kandidat_snabb_talar.sql"));

    await c.query(`INSERT INTO vagpunkt (punkt, segment_id, lon, lat) VALUES ('v1', 'A', 15, 60), ('v2', 'B', 15.1, 60)`);
    await c.query("INSERT INTO stadspunkt (punkt) VALUES ('s1')");
    await c.query("INSERT INTO stad_tim (punkt, tid, pb) VALUES ('s1', date_trunc('hour', now()), -2)");
    await c.query(`INSERT INTO ny_kandidat_live (tid, punkt, pb) VALUES (date_trunc('hour', now()), 'v1', -1), (date_trunc('hour', now()), 'v2', 1)`);
    const r = (await c.query("SELECT date_trunc('second', now() - interval '1 minute') AS r")).rows[0].r as Date;
    await c.query("INSERT INTO ny_kandidat_snabb (punkt, tid, raknad, pb) VALUES ('v1', date_trunc('hour', now()), $1, -1.5), ('v2', date_trunc('hour', now()), $1, -0.5)", [r]);
    await c.query("INSERT INTO ny_kandidat_snabb_korning (raknad, tid, punkter) VALUES ($1, date_trunc('hour', now()), 2)", [r]);
    await c.query("INSERT INTO kandidat_talar (talar, beslut) VALUES ('ny', 'prov')");
    await c.query(sql("122_kandidat_snabb_pa.sql"));

    // Felet 19/11: med sql/121 saknas stadspunkten när den snabba talar.
    assert.deepEqual((await rader()).map((x) => [x.punkt, x.talare]), [["v1", "snabb"], ["v2", "snabb"]], "sql/121 tappar storstäderna");
    for (let i = 0; i < 2; i++) await c.query(sql(RATT));                                // tål två körningar
    // Motprov för vakten: den felande regeln igen (sql/121), med vakten kvar.
    await c.query(sql("121_kandidat_snabb_talar.sql"));
    assert.deepEqual(await vakt(), { talare: "snabb", t: 0, h: 1 }, "vakten ser tystnaden: noll mot en");
    await c.query(sql(RATT));

    const efter = await rader();
    assert.deepEqual(efter.map((x) => [x.punkt, x.talare]), [["s1", "ny"], ["v1", "snabb"], ["v2", "snabb"]], "storstäderna har timvärdet");
    assert.equal(efter.find((x) => x.punkt === "v1")!.tid.getTime(), r.getTime(), "vägpunkterna bär den snabbas tid");
    assert.equal(efter.find((x) => x.punkt === "s1")!.tid.getTime(),
      (await c.query("SELECT date_trunc('hour', now()) AS t")).rows[0].t.getTime(), "storstäderna bär timmens tid");
    assert.deepEqual(await vakt(), { talare: "snabb", t: 1, h: 1 }, "vakten är nöjd");

    await c.query("INSERT INTO kandidat_snabb_talar (talar, beslut) VALUES ('av', 'prov')");
    assert.deepEqual((await rader()).map((x) => [x.punkt, x.talare]), [["s1", "ny"], ["v1", "ny"]], "AV: timvärdet överallt");
    assert.deepEqual(await vakt(), { talare: "ny", t: 1, h: 1 });
    await c.query("INSERT INTO kandidat_talar (talar, beslut) VALUES ('fryst', 'prov')");
    assert.deepEqual((await rader()).map((x) => [x.punkt, x.talare]), [["F", "fryst"]]);
    assert.deepEqual(await vakt(), { talare: "fryst", t: 0, h: 0 }, "noll i båda är inget att larma om");
  } finally {
    await c.query("DROP SCHEMA IF EXISTS ks_stad CASCADE").catch(() => {});
    c.release();
    await pool.end();
  }
});
