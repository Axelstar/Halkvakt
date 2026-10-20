import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

// DECISIONS #653: from 30/10 2026 Supabase no longer grants Data API privileges to new tables in public on its own.
// The edge functions reach the database through supabase-js with the service key, so a new table without an explicit
// grant to service_role gives "permission denied" in production. sql/064 writes out what the database already had for
// every table up to 063; from 064 on, each file that creates a table in public must grant service_role in the same file,
// and a serial column's sequence with it.

const DIR = new URL("../sql/", import.meta.url);
const FORSTA = 64;

const CREATE = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s*\(([\s\S]*?)\n\);/gi;

export function brister(sql: string): string[] {
  const ut: string[] = [];
  const text = sql.replace(/--[^\n]*/g, "");
  for (const m of text.matchAll(CREATE)) {
    const [, schema, tabell, kropp] = m;
    if (schema && schema.toLowerCase() !== "public") continue;
    const namn = `(?:public\\.)?"?${tabell}"?`;
    const grant = new RegExp(`GRANT\\s+[^;]*?\\s+ON\\s+(?:TABLE\\s+)?${namn}\\s+TO\\s+[^;]*\\bservice_role\\b`, "i");
    if (!grant.test(text)) ut.push(`${tabell}: GRANT ... TO service_role saknas`);
    if (/\b(?:big|small)?serial\b/i.test(kropp)) {
      const seq = new RegExp(`GRANT\\s+[^;]*?\\s+ON\\s+SEQUENCE\\s+(?:public\\.)?"?${tabell}_\\w+_seq"?\\s+TO\\s+[^;]*\\bservice_role\\b`, "i");
      if (!seq.test(text)) ut.push(`${tabell}: GRANT ... ON SEQUENCE ... TO service_role saknas (serial-kolumn)`);
    }
  }
  return ut;
}

test("varje ny tabell i public från sql/064 ger service_role sina rättigheter i samma fil (DECISIONS #653)", () => {
  const fel: string[] = [];
  for (const f of readdirSync(DIR).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort()) {
    if (Number(f.slice(0, 3)) < FORSTA) continue;
    for (const b of brister(readFileSync(new URL(f, DIR), "utf8"))) fel.push(`sql/${f}: ${b}`);
  }
  assert.deepEqual(fel, [], "Lägg GRANT till service_role i samma migration (CLAUDE.md, DECISIONS #653)");
});

test("vakten fäller en tabell utan grant och en serial utan sekvens-grant, men släpper en rätt skriven", () => {
  // 059 i miniatyr: tabellen fick sina rättigheter ur Supabases standard, inte ur filen.
  const utan = `CREATE TABLE IF NOT EXISTS kandidat_brytare (\n  id bigserial PRIMARY KEY,\n  vem text\n);\nREVOKE ALL ON TABLE kandidat_brytare FROM PUBLIC;`;
  assert.deepEqual(brister(utan), [
    "kandidat_brytare: GRANT ... TO service_role saknas",
    "kandidat_brytare: GRANT ... ON SEQUENCE ... TO service_role saknas (serial-kolumn)",
  ]);
  const med = utan + `\nDO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN\n` +
    `GRANT ALL ON TABLE kandidat_brytare TO service_role; GRANT USAGE, SELECT, UPDATE ON SEQUENCE kandidat_brytare_id_seq TO service_role;\nEND IF; END $$;`;
  assert.deepEqual(brister(med), []);
  // Andra scheman (fi, no, dk) är inte Data API:ts och prövas inte.
  assert.deepEqual(brister(`CREATE TABLE fi.x (\n  a int\n);`), []);
  // En grant som bara står i en kommentar räknas inte.
  assert.deepEqual(brister(`CREATE TABLE y (\n  a int\n);\n-- GRANT ALL ON TABLE y TO service_role;`), ["y: GRANT ... TO service_role saknas"]);
});

test("vakten hade fällt 059, som bara fick sina rättigheter ur Supabases standard", () => {
  const f059 = readFileSync(new URL("059_kandidat_brytare.sql", DIR), "utf8");
  assert.ok(brister(f059).length > 0);
});
