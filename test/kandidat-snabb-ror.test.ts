// DECISIONS #782, kort #373: rörledningen för kandidaten på en kvart (sql/078 och 079) går att köra två gånger i en PostGIS utan
// Supabase-rollerna och utan pg_cron, och anroparen kandidat_snabb() loggar 'räkningen saknas' tills räkningen ur halkvakt-kuvos är
// inlagd. Pariteten mot kandidat_timme prövas där (test/kandidat-snabb.test.ts). Eget schema: provfilerna körs samtidigt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const url = process.env.TEST_DATABASE_URL;

test("#782 rörledningen: 078 och 079 tål två körningar, tabellerna är rätt sorts, och anroparen väntar på räkningen", { skip: !url }, async () => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const c = await pool.connect();
  try {
    await c.query("DROP SCHEMA IF EXISTS ks_ror CASCADE; CREATE SCHEMA ks_ror; SET search_path = ks_ror, public");
    for (const f of ["078_kandidat_snabb.sql", "079_kandidat_snabb_cron.sql"])
      for (let i = 0; i < 2; i++) await c.query(readFileSync(new URL(`../sql/${f}`, import.meta.url), "utf8"));
    assert.equal((await c.query("SELECT kandidat_snabb() AS s")).rows[0].s, "räkningen saknas");
    assert.deepEqual((await c.query("SELECT skal FROM ny_kandidat_snabb_korning")).rows.map((x) => x.skal), ["räkningen saknas"]);
    const sort = await c.query(`SELECT relname, relpersistence FROM pg_class
      WHERE relnamespace = 'ks_ror'::regnamespace AND relname IN ('ny_kandidat_snabb', 'kandidat_snabb_ankare', 'kandidat_grannar') ORDER BY relname`);
    assert.deepEqual(sort.rows.map((x) => `${x.relname}:${x.relpersistence}`),
      ["kandidat_grannar:p", "kandidat_snabb_ankare:u", "ny_kandidat_snabb:u"], "ankarna och värdena UNLOGGED, listorna sparade");
    // talar inte: bytets funktioner (sql/070) nämner inte tabellen
    const bytet = readFileSync(new URL("../sql/070_bytet.sql", import.meta.url), "utf8");
    assert.ok(!bytet.includes("ny_kandidat_snabb"), "talande_timme() och talande_regel() läser inte ny_kandidat_snabb före påslaget");
  } finally {
    await c.query("DROP SCHEMA IF EXISTS ks_ror CASCADE").catch(() => {});
    c.release();
    await pool.end();
  }
});
