// Bytet (FORREGISTRERING-2026-27 §12, sql/070, DECISIONS #723): den nya kandidaten talar bara efter ett beslut, och faller tillbaka
// till den frysta timme för timme. Proven läser filerna, utan databas:
//   1. talande_regel() har kandidat_regel():s kolumner (den senaste definitionen) och talaren, så publiceringen läser samma rader;
//   2. utan beslut talar den frysta, och den nyas timme används bara när beslutet säger ny (§12 f);
//   3. 070 rör inte den frystas funktioner eller tabeller (§12 c);
//   4. publiceringens två kopior läser bytet, faller tillbaka till kandidat_timme()/kandidat_regel(), och är lika i kandidatblocket.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROT = fileURLToPath(new URL("..", import.meta.url));
const SQL = join(ROT, "sql");
const BYTET = "070_bytet.sql";
const las = (f: string) => readFileSync(join(SQL, f), "utf8");
const filer = readdirSync(SQL).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort();

/** RETURNS TABLE-kolumnerna i en funktions senaste definition före (eller i) en fil, utan blanksteg. */
function kolumner(text: string, namn: string): string | null {
  const m = new RegExp(`CREATE (?:OR REPLACE )?FUNCTION ${namn}\\(\\)\\s*RETURNS TABLE \\(([\\s\\S]*?)\\)\\s*LANGUAGE`, "m").exec(text);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

test("070: talande_regel() har kandidat_regel():s kolumner och talaren", () => {
  let fryst: string | null = null;
  for (const f of filer.filter((x) => x < BYTET)) fryst = kolumner(las(f), "kandidat_regel") ?? fryst;
  assert.ok(fryst, "kandidat_regel() finns före 070");
  assert.equal(kolumner(las(BYTET), "talande_regel"), `${fryst}, talare text`);
});

test("070: utan beslut talar den frysta, och den nyas timme läses bara när beslutet säger ny", () => {
  const t = las(BYTET);
  assert.match(t, /coalesce\(\(SELECT t\.talar FROM kandidat_talar t ORDER BY t\.id DESC LIMIT 1\), 'fryst'\)/);
  assert.match(t, /CASE WHEN kandidat_talar_nu\(\) = 'ny' THEN ny_kandidat_timme\(\) END/);
  assert.match(t, /coalesce\(n\.t, kandidat_timme\(\)\)/, "saknas den nyas timme talar den frysta (§12 f)");
  assert.match(t, /talar text NOT NULL CHECK \(talar IN \('fryst', 'ny'\)\)/);
});

test("070: den frystas funktioner och tabeller rörs inte (§12 c)", () => {
  const t = las(BYTET).replace(/--[^\n]*/g, "");
  for (const m of t.matchAll(/CREATE (?:OR REPLACE )?FUNCTION (\w+)/g)) assert.ok(["kandidat_talar_nu", "talande_timme", "talande_regel"].includes(m[1]), m[0]);
  for (const m of t.matchAll(/(?:CREATE TABLE IF NOT EXISTS|ALTER TABLE) (\w+)/g)) assert.equal(m[1], "kandidat_talar", m[0]);
  assert.ok(!/INSERT INTO kandidat_talar/.test(t), "migrationen beslutar inget byte; den frysta talar efter den");
});

test("publiceringen läser bytet i båda kopiorna, med vägen tillbaka till dagens frågor", () => {
  const block = (f: string) => {
    const t = readFileSync(join(ROT, f), "utf8");
    return t.slice(t.indexOf("---- live: kandidatens varningar"), t.indexOf("---- karantänen"));
  };
  const a = block("publish/snapshot-core.ts"), b = block("supabase/functions/publicera/index.ts");
  assert.equal(a, b, "kandidatblocket är lika i publish/snapshot-core.ts och supabase/functions/publicera/index.ts");
  assert.match(a, /SELECT tid AS t, talare FROM talande_timme\(\)/);
  assert.match(a, /regel = "talande_regel\(\)"/);
  assert.match(a, /catch \(e\) \{\s*notes\.push\(`kandidat: bytet ej läsbart[\s\S]*?SELECT kandidat_timme\(\) AS t/);
  assert.match(a, /let timme: Record<string, any> \| undefined, regel = "kandidat_regel\(\)"/, "utan bytet frågas kandidat_regel() som förut");
});
