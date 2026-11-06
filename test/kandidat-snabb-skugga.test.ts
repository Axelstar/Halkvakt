// DECISIONS #782 punkt 5, kort #373: skuggan för kandidaten på en kvart (sql/080). Regeln härleds ur den gällande
// ny_kandidat_regel() i stället för att skrivas av; provet kör härledningen på en stubbe med samma två rader som sql/069 och prövar
// fladdret (byten per källa), avvikelsen vid :47 och vakten mot en ändrad regel. Eget schema: provfilerna körs samtidigt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const url = process.env.TEST_DATABASE_URL;
const sql = (f: string) => readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8");
const A = "FROM ny_kandidat_live l JOIN vagpunkt v ON v.punkt = l.punkt";
const B = "WHERE l.tid = ny_kandidat_timme() AND l.pb <= 0";

test("#782 skuggan: raderna som byts finns exakt en gång i den gällande regeln (sql/069) och i sql/080", () => {
  const regel = sql("069_radarns_tal.sql");
  const start = regel.indexOf("CREATE OR REPLACE FUNCTION ny_kandidat_regel()");
  const kropp = regel.slice(start, regel.indexOf("$$;", start));
  assert.ok(start >= 0, "sql/069 definierar ny_kandidat_regel()");
  assert.equal(kropp.split(A).length - 1, 1, "raden med ny_kandidat_live");
  assert.equal(kropp.split(B).length - 1, 1, "raden med ny_kandidat_timme()");
  const skugga = sql("080_kandidat_snabb_skugga.sql");
  assert.ok(skugga.includes(`'${A}'`) && skugga.includes(`'${B}'`), "sql/080 byter exakt de raderna");
  assert.ok(!sql("070_bytet.sql").includes("ny_kandidat_snabb") && !sql("071_bytet_pa.sql").includes("ny_kandidat_snabb"),
    "talande_timme() och talande_regel() läser inte den snabba före påslaget");
});

// Väg (a), DECISIONS #808: sedan sql/087 läser regeln frys_min och sedan sql/091 har den en stadsgren. sql/080 byter också de
// raderna, och de ska finnas exakt så många gånger som härledningen kräver i den gällande regeln: den SENASTE migrationen som skapar
// ny_kandidat_regel(). En ny regelfil som ändrar raderna fäller provet, innan den stoppar skuggan i drift (som sql/087 gjorde 6/11).
test("#808 skuggan: raderna för F1 och stadsgrenen finns som härledningen kräver i den gällande regeln och byts i sql/080", () => {
  const fil = readdirSync(new URL("../sql/", import.meta.url)).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort()
    .filter((f) => sql(f).includes("CREATE OR REPLACE FUNCTION ny_kandidat_regel()")).pop()!;
  const regel = sql(fil);
  const start = regel.indexOf("CREATE OR REPLACE FUNCTION ny_kandidat_regel()");
  const kropp = regel.slice(start, regel.indexOf("$$;", start));
  const antal = (x: string) => kropp.split(x).length - 1;
  const F = "l.frys_min, v.geom", S = "FROM ny_kandidat_live l JOIN stadspunkt s ON s.punkt = l.punkt", FS = "l.frys_min, s.geom",
    TS = "WHERE l.tid = ny_kandidat_timme()";
  assert.equal(fil, "091_stadsregeln.sql", "den gällande regeln (byt namnet här när en ny regelfil kommer, efter att ha kört om sql/080)");
  assert.deepEqual([antal(A), antal(B), antal(F), antal(S), antal(FS), antal(TS)], [1, 1, 1, 1, 1, 2],
    "a, b, frys_min, stadsgrenen, dess frys_min och timmens villkor (i b och i stadsgrenen)");
  const skugga = sql("080_kandidat_snabb_skugga.sql");
  for (const x of [F, S, FS, TS]) assert.ok(skugga.includes(`'${x}'`), `sql/080 byter ${x}`);
});

test("#782 skuggan: härledd regel, fladdret per källa, avvikelsen vid :47 och vakten mot en ändrad regel", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const c = await pool.connect();
  const regel = (extra: string) => `CREATE OR REPLACE FUNCTION ny_kandidat_regel()
    RETURNS TABLE (punkt text, segment_id text, lon double precision, lat double precision, tid timestamptz, pb real,
                   vat boolean, flackvis_vat boolean, radar_mmh numeric,
                   veto_station text, veto_km real, veto_yta numeric, n_ank smallint, spr real, utfall text)
    LANGUAGE sql STABLE AS $$
      WITH kall AS (
        SELECT l.punkt, v.segment_id, v.lon, v.lat, l.tid, l.pb, l.n_ank, l.spr, v.geom
        ${A}
        ${B}
      )
      SELECT k.punkt, k.segment_id, k.lon, k.lat, k.tid, k.pb, true, false, NULL::numeric, NULL::text, NULL::real, NULL::numeric,
             k.n_ank, k.spr, 'varnar'::text FROM kall k ${extra}
    $$`;
  try {
    await c.query("DROP SCHEMA IF EXISTS ks_skugga CASCADE; CREATE SCHEMA ks_skugga; SET search_path = ks_skugga, public");
    await c.query(`CREATE TABLE vagpunkt (punkt text PRIMARY KEY, segment_id text NOT NULL, lon double precision NOT NULL, lat double precision NOT NULL,
      geom geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lon, lat), 4326)) STORED)`);
    await c.query(`CREATE TABLE ny_kandidat_live (tid timestamptz NOT NULL, punkt text NOT NULL, ph real, pg real, ra real, ank_km real, pb real,
      n_ank smallint, spr real, PRIMARY KEY (tid, punkt))`);
    await c.query("CREATE FUNCTION ny_kandidat_timme() RETURNS timestamptz LANGUAGE sql STABLE AS 'SELECT max(tid) FROM ny_kandidat_live'");
    await c.query(regel(""));
    await c.query(sql("078_kandidat_snabb.sql"));
    for (let i = 0; i < 2; i++) await c.query(sql("080_kandidat_snabb_skugga.sql"));     // tål två körningar

    // Den härledda regeln läser den snabba tabellen och varken timmens tabell eller dess färskhet.
    const def = (await c.query("SELECT pg_get_functiondef('ny_kandidat_regel_snabb()'::regprocedure) AS d")).rows[0].d as string;
    assert.ok(def.includes("FROM ny_kandidat_snabb l") && !def.includes("ny_kandidat_live") && !def.includes("ny_kandidat_timme"), "härledningen");
    assert.equal((await c.query("SELECT kandidat_snabb() AS s")).rows[0].s, "räkningen saknas", "anroparen väntar fortfarande på räkningen");

    await c.query(`INSERT INTO vagpunkt (punkt, segment_id, lon, lat) VALUES
      ('v1', 'A', 15, 60), ('v2', 'B', 15.1, 60), ('v3', 'C', 15.2, 60), ('v4', 'D', 15.3, 60)`);
    const timme = "date_trunc('hour', now())";
    // Timvärdena: A varnar. De snabba: A och B varnar.
    await c.query(`INSERT INTO ny_kandidat_live (tid, punkt, pb) VALUES (${timme}, 'v1', -1.0), (${timme}, 'v2', 0.5), (${timme}, 'v3', 2.0), (${timme}, 'v4', 3.0)`);
    const snabb = async (pb: number[]) => {
      await c.query("DELETE FROM ny_kandidat_snabb");
      await c.query(`INSERT INTO ny_kandidat_snabb (punkt, tid, raknad, pb) SELECT 'v' || i, ${timme}, now(), x
        FROM unnest($1::real[]) WITH ORDINALITY AS u(x, i)`, [pb]);
    };
    await snabb([-1.5, -0.5, 1.0, 3.0]);
    assert.equal((await c.query("SELECT kandidat_snabb_skugga() AS s")).rows[0].s, "mätt");
    let r = (await c.query(`SELECT * FROM ny_kandidat_skugga_snabb WHERE timme = ${timme}`)).rows[0];
    assert.deepEqual([r.korningar, r.byten_snabb, r.byten_tim, r.varnar_snabb_max, r.varnar_tim_max], [0, 0, 0, 2, 1],
      "första körningen sätter tillståndet utan att räkna byten");
    // Avvikelsen vid :47: |−1,5 − −1,0| = 0,5, |−0,5 − 0,5| = 1,0, |1,0 − 2,0| = 1,0, |3,0 − 3,0| = 0 ⇒ median 0,75.
    assert.equal(r.avvik_n, 4);
    assert.ok(Math.abs(r.avvik_median - 0.75) < 1e-6 && r.avvik_p95 > 0.9 && r.avvik_p95 <= 1.0, `avvikelsen ${r.avvik_median} / ${r.avvik_p95}`);

    // Andra körningen: B slutar varna och C börjar, i de snabba värdena ⇒ två byten där, inga i timvärdena.
    await snabb([-1.5, 0.5, -0.2, 3.0]);
    await c.query("SELECT kandidat_snabb_skugga()");
    r = (await c.query(`SELECT * FROM ny_kandidat_skugga_snabb WHERE timme = ${timme}`)).rows[0];
    assert.deepEqual([r.korningar, r.byten_snabb, r.byten_tim], [1, 2, 0], "byten räknas per källa och körning");
    assert.equal(r.avvik_n, 4, "avvikelsen räknas en gång per timme i timkedjan, inte varje körning");

    // Regeln ändras ⇒ mätningen slutar med skälet tills sql/080 körs om.
    await c.query(regel("WHERE k.pb < 100"));
    assert.match((await c.query("SELECT kandidat_snabb_skugga() AS s")).rows[0].s, /regeln har ändrats/);
    await c.query(sql("080_kandidat_snabb_skugga.sql"));
    assert.equal((await c.query("SELECT kandidat_snabb_skugga() AS s")).rows[0].s, "mätt", "efter omkörningen mäts det igen");

    // Motprov: en regel utan raderna som byts ⇒ migrationen fäller i stället för att härleda något annat.
    await c.query(regel("").replace(B, "WHERE l.pb <= 0"));
    let fall = "";
    try { await c.query(sql("080_kandidat_snabb_skugga.sql")); } catch (e) { fall = String(e); }
    assert.match(fall, /har ändrats: raderna som byts/, "en regel utan raderna fäller migrationen");
  } finally {
    await c.query("DROP SCHEMA IF EXISTS ks_skugga CASCADE").catch(() => {});
    c.release();
    await pool.end();
  }
});
