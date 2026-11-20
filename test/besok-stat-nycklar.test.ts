import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

// DECISIONS #905: statistik.html reads the tabs Appen and Annonser from keys that 076, 077 and 102 put into besok_stat by
// patching its stored definition. sql/118 rewrote besok_stat from scratch and dropped them. Whichever migration last rewrites
// besok_stat must carry each key itself, or a later migration must put it back.

const DIR = new URL("../sql/", import.meta.url);
const NYCKLAR = ["apple_ads_stat", "app_raknare_stat", "annonstratten_stat"];

test("besok_stat bär apple_ads, appen och annonstratten efter sista omskrivningen (DECISIONS #905)", () => {
  const filer = readdirSync(DIR).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort();
  const text = filer.map((f) => readFileSync(new URL(f, DIR), "utf8").replace(/--[^\n]*/g, ""));
  const sista = text.findLastIndex((t) => /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.)?besok_stat\s*\(/i.test(t));
  assert.ok(sista >= 0, "ingen migration skriver besok_stat");
  const efter = text.slice(sista).join("\n");
  const saknas = NYCKLAR.filter((n) => !efter.includes(n));
  assert.deepEqual(saknas, [], `sql/${filer[sista]} skriver om besok_stat utan nycklarna, och ingen senare migration lägger tillbaka dem`);
});
