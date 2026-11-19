// DECISIONS #782 punkt 3 och 5, kort #373: påslaget av kandidaten på en kvart (sql/121, sql/122). Proven:
//   1. talande_regel() har samma kolumner i sql/121 som i sql/070, så publiceringen läser samma rader;
//   2. sql/121 rör inte den frystas eller den nyas regel och tabeller, och slår inte på något: raden står i sql/122;
//   3. i en databas: utan påslag talar den nya som förut; med påslag talar den snabba när den är färsk, fullständig och härledd ur den
//      gällande regeln och den nyas timme är färsk, annars timvärdet, annars den frysta; AV går tillbaka. Eget schema: provfilerna
//      körs samtidigt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const url = process.env.TEST_DATABASE_URL;
const sql = (f: string) => readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8");
const A = "FROM ny_kandidat_live l JOIN vagpunkt v ON v.punkt = l.punkt";
const B = "WHERE l.tid = ny_kandidat_timme() AND l.pb <= 0";
const PAS = "121_kandidat_snabb_talar.sql";

function kolumner(text: string, namn: string): string | null {
  const m = new RegExp(`CREATE (?:OR REPLACE )?FUNCTION ${namn}\\(\\)\\s*RETURNS TABLE \\(([\\s\\S]*?)\\)\\s*LANGUAGE`, "m").exec(text);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

test("#782 påslaget: talande_regel() har samma kolumner i sql/121 som i sql/070", () => {
  assert.equal(kolumner(sql(PAS), "talande_regel"), kolumner(sql("070_bytet.sql"), "talande_regel"));
});

test("#782 påslaget: sql/121 rör inte regeln eller domens tabeller och slår inte på något", () => {
  const t = sql(PAS).replace(/^\s*--.*$/gm, "");
  for (const namn of ["kandidat_regel", "ny_kandidat_regel", "ny_kandidat_regel_snabb", "ny_kandidat_timme", "kandidat_timme", "kandidat_logga"])
    assert.doesNotMatch(t, new RegExp(`FUNCTION ${namn}\\(\\)\\s*RETURNS`), `${namn}() skrivs inte om`);
  assert.doesNotMatch(t, /INSERT INTO kandidat_snabb_talar/, "påslaget står i sql/122, inte i 121");
  assert.match(sql("122_kandidat_snabb_pa.sql"), /INSERT INTO kandidat_snabb_talar \(talar, beslut, korning\)\s+VALUES \('pa', 'DECISIONS #782'/);
});

test("#782 påslaget: vem som talar, i en databas", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const c = await pool.connect();
  const KOL = `punkt text, segment_id text, lon double precision, lat double precision, tid timestamptz, pb real,
               vat boolean, flackvis_vat boolean, radar_mmh numeric,
               veto_station text, veto_km real, veto_yta numeric, n_ank smallint, spr real, utfall text`;
  const regel = (extra: string) => `CREATE OR REPLACE FUNCTION ny_kandidat_regel() RETURNS TABLE (${KOL})
    LANGUAGE sql STABLE AS $$
      WITH kall AS (
        SELECT l.punkt, v.segment_id, v.lon, v.lat, l.tid, l.pb, l.n_ank, l.spr, v.geom
        ${A}
        ${B}
      )
      SELECT k.punkt, k.segment_id, k.lon, k.lat, k.tid, k.pb, true, false, NULL::numeric, NULL::text, NULL::real, NULL::numeric,
             k.n_ank, k.spr, 'varnar'::text FROM kall k ${extra}
    $$`;
  const vem = async () => (await c.query("SELECT tid, talare FROM talande_timme()")).rows[0] as { tid: Date; talare: string };
  const regelns = async () => (await c.query("SELECT punkt, tid, talare FROM talande_regel() ORDER BY punkt")).rows as
    { punkt: string; tid: Date; talare: string }[];
  // En snabb körning `min` minuter sedan, med pb per vägpunkt (v1–v4); `punkter` vägpunkter får raden (fullständigheten).
  const snabb = async (min: number, pb: number[], punkter = pb.length) => {
    await c.query("DELETE FROM ny_kandidat_snabb; DELETE FROM ny_kandidat_snabb_korning");
    const r = (await c.query(`SELECT date_trunc('second', now() - make_interval(mins => $1)) AS r`, [min])).rows[0].r as Date;
    await c.query(`INSERT INTO ny_kandidat_snabb (punkt, tid, raknad, pb) SELECT 'v' || i, date_trunc('hour', now()), $2, x
      FROM unnest($1::real[]) WITH ORDINALITY AS u(x, i) WHERE i <= $3`, [pb, r, punkter]);
    await c.query("INSERT INTO ny_kandidat_snabb_korning (raknad, tid, punkter) VALUES ($1, date_trunc('hour', now()), $2)", [r, punkter]);
    return r;
  };
  try {
    await c.query("DROP SCHEMA IF EXISTS ks_pa CASCADE; CREATE SCHEMA ks_pa; SET search_path = ks_pa, public");
    await c.query(`CREATE TABLE vagpunkt (punkt text PRIMARY KEY, segment_id text NOT NULL, lon double precision NOT NULL, lat double precision NOT NULL,
      geom geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lon, lat), 4326)) STORED)`);
    await c.query(`CREATE TABLE ny_kandidat_live (tid timestamptz NOT NULL, punkt text NOT NULL, ph real, pg real, ra real, ank_km real, pb real,
      n_ank smallint, spr real, PRIMARY KEY (tid, punkt))`);
    await c.query("CREATE FUNCTION ny_kandidat_timme() RETURNS timestamptz LANGUAGE sql STABLE AS 'SELECT max(tid) FROM ny_kandidat_live'");
    await c.query(regel(""));
    // Den frysta: en rad, punkten F, med sin egen timme.
    await c.query("CREATE FUNCTION kandidat_timme() RETURNS timestamptz LANGUAGE sql STABLE AS $$SELECT date_trunc('hour', now()) - interval '1 hour'$$");
    await c.query(`CREATE FUNCTION kandidat_regel() RETURNS TABLE (${KOL}) LANGUAGE sql STABLE AS $$
      SELECT 'F'::text, 'Z'::text, 15::float8, 60::float8, kandidat_timme(), -1::real, true, false, NULL::numeric, NULL::text, NULL::real,
             NULL::numeric, NULL::smallint, NULL::real, 'varnar'::text $$`);
    await c.query(sql("070_bytet.sql"));
    await c.query(sql("078_kandidat_snabb.sql"));
    await c.query(sql("080_kandidat_snabb_skugga.sql"));
    for (let i = 0; i < 2; i++) await c.query(sql(PAS));                                 // tål två körningar

    await c.query(`INSERT INTO vagpunkt (punkt, segment_id, lon, lat) VALUES
      ('v1', 'A', 15, 60), ('v2', 'B', 15.1, 60), ('v3', 'C', 15.2, 60), ('v4', 'D', 15.3, 60)`);
    // Timvärdena: v1 varnar. De snabba: v1 och v2 varnar.
    await c.query(`INSERT INTO ny_kandidat_live (tid, punkt, pb) SELECT date_trunc('hour', now()), 'v' || i, x
      FROM unnest(ARRAY[-1.0, 0.5, 2.0, 3.0]::real[]) WITH ORDINALITY AS u(x, i)`);
    const PB = [-1.5, -0.5, 1.0, 3.0];

    assert.equal((await vem()).talare, "fryst", "utan beslut talar den frysta");
    await c.query("INSERT INTO kandidat_talar (talar, beslut) VALUES ('ny', 'prov')");
    let r = await snabb(1, PB);
    assert.equal((await vem()).talare, "ny", "utan påslag talar den nya, även när den snabba är färsk");
    assert.deepEqual((await regelns()).map((x) => [x.punkt, x.talare]), [["v1", "ny"]]);

    await c.query(sql("122_kandidat_snabb_pa.sql"));
    let t = await vem();
    assert.equal(t.talare, "snabb", "med påslag talar den snabba");
    assert.equal(t.tid.getTime(), r.getTime(), "tiden är när den snabba räknades");
    const rad = await regelns();
    assert.deepEqual(rad.map((x) => [x.punkt, x.talare]), [["v1", "snabb"], ["v2", "snabb"]], "den snabba regeln");
    assert.ok(rad.every((x) => x.tid.getTime() === r.getTime()), "regelns tid är när den snabba räknades");

    r = await snabb(11, PB);
    assert.equal((await vem()).talare, "ny", "äldre än 10 minuter ⇒ timvärdet");
    r = await snabb(1, PB, 3);
    assert.equal((await vem()).talare, "ny", "3 av 4 vägpunkter (under 95 %) ⇒ timvärdet");
    r = await snabb(1, PB);
    await c.query("UPDATE ny_kandidat_snabb_korning SET skal = 'ingen PH för timmen'");
    assert.equal((await vem()).talare, "ny", "en körning med skäl räknade inte ⇒ timvärdet");

    r = await snabb(1, PB);
    assert.equal((await vem()).talare, "snabb");
    await c.query(regel("WHERE k.pb < 100"));
    assert.equal((await vem()).talare, "ny", "ändrad regel utan omkörd sql/080 ⇒ timvärdet, inte en gammal regel");
    await c.query(sql("080_kandidat_snabb_skugga.sql"));
    assert.equal((await vem()).talare, "snabb", "efter omkörningen talar den snabba igen");

    await c.query("DELETE FROM ny_kandidat_live");
    assert.equal((await vem()).talare, "fryst", "utan den nyas timme talar den frysta, även när den snabba är färsk");
    await c.query(`INSERT INTO ny_kandidat_live (tid, punkt, pb) SELECT date_trunc('hour', now()), 'v' || i, x
      FROM unnest(ARRAY[-1.0, 0.5, 2.0, 3.0]::real[]) WITH ORDINALITY AS u(x, i)`);
    assert.equal((await vem()).talare, "snabb");

    await c.query("INSERT INTO kandidat_snabb_talar (talar, beslut) VALUES ('av', 'prov')");
    assert.equal((await vem()).talare, "ny", "AV ⇒ den nya som förut");
    await c.query("INSERT INTO kandidat_snabb_talar (talar, beslut) VALUES ('pa', 'prov'); INSERT INTO kandidat_talar (talar, beslut) VALUES ('fryst', 'prov')");
    assert.equal((await vem()).talare, "fryst", "beslutet om den frysta går före påslaget");
    assert.deepEqual((await regelns()).map((x) => [x.punkt, x.talare]), [["F", "fryst"]]);
  } finally {
    await c.query("DROP SCHEMA IF EXISTS ks_pa CASCADE").catch(() => {});
    c.release();
    await pool.end();
  }
});
