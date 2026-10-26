// Den nya kandidatens skugga i databasen (sql/068, ersättningsregeln §4, DECISIONS #692): "en egen tabell bredvid kandidat_skugga
// (sql/057), med samma fält, så att domen i §5 kan räknas likadant för båda". Proven läser filerna, utan databas:
//   1. funktionerna i 068 är den frystas SENASTE definition (den sista migrationen före 068 som skapar dem) ord för ord, med bara tabell-
//      och funktionsnamnen bytta — ändras den frystas regel eller logg i en ny migration fäller provet tills den nyas följer med;
//   2. tabellerna har den frystas kolumner i samma ordning och med samma typer (CREATE TABLE i 050/057 och ADD COLUMN i 058/065);
//   3. 068 ändrar ingenting av den frystas och skriver bara i ny_-tabellerna, utan schema i pg_cron;
//   4. ingenting i appen, motorn, publiceringen eller edge-funktionerna nämner den nyas tabeller eller funktioner.
// Integrationsprovet (samma svar som den frystas regel och logg på samma rader) står i test/integration.test.ts och kör i ci.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROT = fileURLToPath(new URL("..", import.meta.url));
const SQL = join(ROT, "sql");
const NY = "068_ny_kandidat_skugga.sql";
const las = (f: string) => readFileSync(join(SQL, f), "utf8");
const utanKommentarer = (s: string) => s.replace(/--[^\n]*/g, "");
const filer = readdirSync(SQL).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort();
const fore = filer.filter((f) => f < NY);

/** Den frystas namn → den nyas: kandidat_x → ny_kandidat_x, gallra_kandidat() → gallra_ny_kandidat(). */
export const byt = (s: string) => s.replace(/gallra_kandidat\(\)/g, "gallra_ny_kandidat()").replace(/(?<![\w])kandidat_/g, "ny_kandidat_");

/** En funktions definition: från raden med FUNCTION <namn>( till semikolonet efter det avslutande $$. */
export function definition(text: string, namn: string): string | null {
  const i = text.search(new RegExp(`^CREATE (?:OR REPLACE )?FUNCTION ${namn}\\(`, "m"));
  if (i < 0) return null;
  const a = text.indexOf("$$", i), b = text.indexOf("$$", a + 2), c = text.indexOf(";", b);
  return text.slice(i, c + 1).split("\n").map((r) => r.trimEnd()).join("\n");
}

const FUNKTIONER: [string, string][] = [["kandidat_timme", "ny_kandidat_timme"], ["kandidat_regel", "ny_kandidat_regel"],
  ["kandidat_logga", "ny_kandidat_logga"], ["gallra_kandidat", "gallra_ny_kandidat"]];

test("068: funktionerna är den frystas senaste definition ord för ord, med bara namnen bytta", () => {
  const ny = las(NY);
  for (const [fryst, nyNamn] of FUNKTIONER) {
    let senast: { fil: string; text: string } | null = null;
    for (const f of fore) { const d = definition(las(f), fryst); if (d) senast = { fil: f, text: d }; }
    assert.ok(senast, `${fryst} finns i en migration före 068`);
    const d = definition(ny, nyNamn);
    assert.ok(d, `${nyNamn} finns i 068`);
    assert.equal(d, byt(senast!.text), `${nyNamn} i 068 ska vara ${fryst} ur sql/${senast!.fil} med bytta namn`);
  }
});

/** Kolumnerna i en tabell: CREATE TABLE-kroppen delad på kommatecken utanför parenteser, sedan ADD COLUMN i senare filer. */
export function kolumner(texter: string[], tabell: string): string[] {
  const ut: string[] = [];
  for (const t0 of texter) {
    const t = utanKommentarer(t0);
    const m = new RegExp(`CREATE TABLE IF NOT EXISTS ${tabell} \\(([\\s\\S]*?)\\n\\);`).exec(t);
    if (m) {
      let djup = 0, bit = "";
      for (const ch of m[1] + ",") {
        if (ch === "(") djup++;
        if (ch === ")") djup--;
        if (ch === "," && djup === 0) { if (bit.trim()) ut.push(bit.trim().replace(/\s+/g, " ")); bit = ""; } else bit += ch;
      }
    }
    for (const a of t.matchAll(new RegExp(`ALTER TABLE ${tabell} ADD COLUMN IF NOT EXISTS ([^;]+);`, "g"))) {
      const def = a[1].trim().replace(/\s+/g, " ");
      const namn = def.split(" ")[0];
      const pk = ut.findIndex((x) => x.startsWith("PRIMARY KEY"));
      if (!ut.some((x) => x.split(" ")[0] === namn)) ut.splice(pk < 0 ? ut.length : pk, 0, def);
    }
  }
  return ut;
}

test("068: tabellerna har den frystas kolumner, i samma ordning och med samma typer", () => {
  const fryst = fore.map(las), ny = [las(NY)];
  for (const t of ["kandidat_ph", "kandidat_live", "kandidat_skugga", "kandidat_station", "kandidat_skugga_korning"]) {
    const f = kolumner(fryst, t);
    assert.ok(f.length >= 5, `${t}: den frystas kolumner hittades (${f.length})`);
    // Den frystas PRIMARY KEY står sist i CREATE TABLE, och en tillagd kolumn läggs före den i den nyas tabell (samma ordning i katalogen).
    assert.deepEqual(kolumner(ny, `ny_${t}`), f, `ny_${t} ska ha ${t}:s kolumner`);
  }
});

test("068: den frysta rörs inte — inga av dess objekt ändras, och bara ny_-tabellerna skrivs; inget schema i pg_cron", () => {
  const t = utanKommentarer(las(NY));
  const fryst = /(?<![\w])(kandidat_(?:ph|live|skugga|station|skugga_korning|timme|regel|logga|brytare|pa)|gallra_kandidat)\b/g;
  assert.deepEqual([...t.matchAll(fryst)].map((m) => m[0]), [], "068 nämner inget av den frystas namn utanför kommentarerna");
  for (const m of t.matchAll(/\b(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE|ALTER TABLE|DROP (?:TABLE|FUNCTION)(?: IF EXISTS)?)\s+(\w+)/g))
    assert.match(m[1], /^ny_kandidat_/, `068 skriver eller ändrar bara den nyas objekt: ${m[0]}`);
  assert.ok(!/cron\.(schedule|unschedule)/.test(t), "inget schema i pg_cron: migrationen ensam skriver ingenting");
  assert.ok(!/CREATE (?:OR REPLACE )?FUNCTION (?!ny_kandidat_|gallra_ny_kandidat)/.test(t), "bara den nyas funktioner skapas");
});

function* genom(dir: string): Generator<string> {
  for (const f of readdirSync(dir)) {
    if (f === "node_modules" || f.startsWith(".") || f === "build") continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* genom(p);
    else if (/\.(ts|kt|swift|js|json|sql)$/.test(f)) yield p;
  }
}

test("ingenting i appen, motorn, publiceringen eller edge-funktionerna läser den nyas tabeller (§4: ingenting når förarna)", () => {
  const traff: string[] = [];
  for (const d of ["publish", "engine", "supabase", "android", "ios"]) {
    for (const p of genom(join(ROT, d))) if (/ny_kandidat|gallra_ny_kandidat/.test(readFileSync(p, "utf8"))) traff.push(p.slice(ROT.length));
  }
  assert.deepEqual(traff, [], "den nya kandidaten loggas bara; publiceringen läser kandidat_regel()");
});

test("provets egna verktyg: namnbytet och kolumnläsaren på en känd text", () => {
  assert.equal(byt("FROM kandidat_live l WHERE l.tid = kandidat_timme(); SELECT gallra_kandidat();"),
    "FROM ny_kandidat_live l WHERE l.tid = ny_kandidat_timme(); SELECT gallra_ny_kandidat();");
  assert.equal(byt("ny_kandidat_live"), "ny_kandidat_live", "ett redan bytt namn byts inte igen");
  const k = kolumner(["CREATE TABLE IF NOT EXISTS t (\n  a int NOT NULL, -- x, y\n  b text CHECK (b IN ('p', 'q')),\n  PRIMARY KEY (a, b)\n);",
    "ALTER TABLE t ADD COLUMN IF NOT EXISTS c real[];"], "t");
  assert.deepEqual(k, ["a int NOT NULL", "b text CHECK (b IN ('p', 'q'))", "c real[]", "PRIMARY KEY (a, b)"]);
  assert.equal(definition("x\nCREATE OR REPLACE FUNCTION f() RETURNS int\nLANGUAGE sql AS $$\n  SELECT 1\n$$;\nrest", "f"),
    "CREATE OR REPLACE FUNCTION f() RETURNS int\nLANGUAGE sql AS $$\n  SELECT 1\n$$;");
});

// R = 0,1 (sql/069, DECISIONS #725): en senare migration som skapar om den frystas regel skapar om den nyas i samma fil, ord för ord.
test("efter 068: varje migration som skapar om kandidat_regel skapar om ny_kandidat_regel likadant", () => {
  for (const f of filer.filter((x) => x > NY)) {
    const d = definition(las(f), "kandidat_regel");
    if (!d) continue;
    const n = definition(las(f), "ny_kandidat_regel");
    assert.ok(n, `${f} skapar om kandidat_regel men inte ny_kandidat_regel`);
    assert.equal(n, byt(d), `ny_kandidat_regel i ${f} ska vara kandidat_regel med bytta namn`);
  }
});
