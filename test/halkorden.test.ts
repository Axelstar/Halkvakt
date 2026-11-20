// DECISIONS #915 (Bengt 20/11: "lägg till ordet modd och gör en koppling mellan de olika"): the value guard's road-state words and the
// engine's halkord answer two questions — has a person read the word, and does the word make the voice speak on Normalt (code 1). They
// stay two lists, bound here: every word in scripts/vardevakten.ts VAGLAGSORD is run through the engine's own SLIPPERY_INFO and
// SLIPPERY_STAM, and a word whose declared answer differs from the engine's fails the build. A new word therefore gets both answers before
// it stands in the list, and a change of the engine's words shows up here as a word whose answer moved.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SLIPPERY_INFO, SLIPPERY_STAM } from "../engine/src/engine.ts";
import { ORD, VAGLAGSORD, domaOrd } from "../scripts/vardevakten.ts";

const motorn = (ord: string) => (SLIPPERY_INFO.test(ord) || SLIPPERY_STAM.test(ord) ? "halt" : "inte halt");

test("#915 varje väglagsord i värdevakten bär motorns svar: halt eller inte halt, som motorn säger", () => {
  const fel = Object.entries(VAGLAGSORD).filter(([ord, klass]) => motorn(ord) !== klass)
    .map(([ord, klass]) => `${ord}: deklarerat ${klass}, motorn säger ${motorn(ord)}`);
  assert.deepEqual(fel, [], "ett ord vars svar skiljer sig från motorns");
});

test("#915 värdevaktens ordlista för väglaget är VAGLAGSORD, och modden är halt", () => {
  assert.deepEqual(ORD.condition_info.ord, Object.keys(VAGLAGSORD), "ordlistan och svaren är samma ord");
  for (const ord of ["moddig vägbana", "fläckvis moddig vägbana", "moddsträngar", "fläckvis moddsträngar"])
    assert.equal(VAGLAGSORD[ord], "halt", `${ord} (Trafikverket i drift 20/11)`);
  for (const ord of ["torrt", "våt", "fläckvis torrt", "fläckvis våt"]) assert.equal(VAGLAGSORD[ord], "inte halt", ord);
});

test("#915 ett okänt väglagsord skrivs ut med motorns svar, andra kodlistor utan", () => {
  const falt = (kolumn: string, varden: [string, number][]) =>
    ({ tabell: "road_conditions", kolumn, rader: 500, varden: varden.map(([ord, n]) => ({ ord, n })) });
  const d = domaOrd(falt("condition_info", [["Våt", 440], ["Snömodd", 40], ["Spårslitage", 20]]));
  assert.equal(d.utfall, "OKÄNT ORD");
  assert.equal(d.varfor, `"Snömodd" (40; motorn: halt), "Spårslitage" (20; motorn: inte halt) står inte i ordlistan`);
  assert.doesNotMatch(domaOrd(falt("trv_varning", [["Risk för halka", 480], ["Översvämning", 20]])).varfor, /motorn/);
});
