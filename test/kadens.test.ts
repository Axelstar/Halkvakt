// Mätvaktens kadensläsning (check 6a). Provet skrevs 14/10 efter att kandidatens del A fick schemat
// "13 0,6,12,18 * * *" och mätvakten svarade "kadensen okänd, vakten blind" — funktionen låg i index.ts,
// som anropar Deno.serve vid inläsning och därför inte går att importera i ett prov.
import { test } from "node:test";
import assert from "node:assert/strict";
import { kadensTimmar } from "../supabase/functions/vakthund/kadens.ts";

test("de scheman som faktiskt står i cron.job och i flödena", () => {
  assert.equal(kadensTimmar("43 * * * *"), 1);            // puls-kandidat-timme: varje timme
  assert.equal(kadensTimmar("13 0,6,12,18 * * *"), 6);    // puls-kandidat-fysik: var sjätte timme
  assert.equal(kadensTimmar("23 */2 * * *"), 2);          // puls-healthcheck
  assert.equal(kadensTimmar("45 4 * * *"), 24);           // puls-marknadsforing: dagligen
  assert.equal(kadensTimmar("40 5 * * 1"), 24 * 7);       // puls-grind-a: veckovis
  assert.equal(kadensTimmar("0 3 1 * *"), 24 * 28);       // månadsvis
});

test("kadensen är det LÄNGSTA mellanrummet, inte det kortaste och inte medelvärdet", () => {
  // 0,1,13: mellanrummen är 1, 12 och 11 timmar. Ett tal under 12 larmar varje natt i onödan.
  assert.equal(kadensTimmar("0 0,1,13 * * *"), 12);
  // 0,12: jämnt, så alla tre läsningarna sammanfaller — den säger inget och duger inte som enda prov.
  assert.equal(kadensTimmar("0 0,12 * * *"), 12);
  // 22,23: två avfyrningar sent på dygnet, och luckan går över midnatt.
  assert.equal(kadensTimmar("0 22,23 * * *"), 23);
});

test("det som inte går att tolka ger null, inte en gissning", () => {
  assert.equal(kadensTimmar("0 0-6 * * *"), null);        // intervall
  assert.equal(kadensTimmar("0 */3,7 * * *"), null);      // steg blandat med lista
  assert.equal(kadensTimmar("0 0,25 * * *"), null);       // timme utanför dygnet
  assert.equal(kadensTimmar("0 0 * *"), null);            // fyra fält
  assert.equal(kadensTimmar(""), null);
});

test("en lista med dag- eller veckovillkor faller tillbaka på det glesare talet, inte på timluckan", () => {
  // Hade listgrenen körts här hade svaret blivit 6 timmar fast jobbet bara går på måndagar — en vakt som
  // larmar sex timmar efter måndagens körning och sedan tiger hela veckan.
  assert.equal(kadensTimmar("13 0,6,12,18 * * 1"), 24 * 7);
  assert.equal(kadensTimmar("13 0,6,12,18 1 * *"), 24 * 28);
});
