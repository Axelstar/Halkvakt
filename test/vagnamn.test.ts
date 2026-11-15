// Vägbeteckningarna (DECISIONS #882, kort #660): en regel för all TypeScript, prövad mot varje form Trafikverket och OpenStreetMap
// skriver, och mot vad appens röst och skylt gör av koden i live.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { vagKod, vagText, vagForst } from "../supabase/functions/_shared/vagnamn.ts";
import { roadPhrase } from "../engine/src/texts.ts";
import { bridgesFromGeoJSON } from "../publish/snapshot-core.ts";
// @ts-ignore — .mjs utan typer
import { vagText as annonsText, vagBild } from "../marknadsforing/annonsstyrning.mjs";

const FORMER: [unknown, string | null, string | null, string | null][] = [
  // in, kod, text, först
  ["E 4", "E4", "E4", "E4"],
  ["E4", "E4", "E4", "E4"],
  ["e 18", "E18", "E18", "E18"],
  ["E 4.25", "E4", "E4", "E4"],
  ["Väg 40", "40", "väg 40", "Väg 40"],
  ["väg 40", "40", "väg 40", "Väg 40"],
  ["40", "40", "väg 40", "Väg 40"],
  ["Rv40", "40", "väg 40", "Väg 40"],
  ["riksväg 40", "40", "väg 40", "Väg 40"],
  ["Länsväg 1052", "1052", "väg 1052", "Väg 1052"],
  ["Väg 31.01", "31", "väg 31", "Väg 31"],
  ["Götaälvbron väg 570", "570", "väg 570", "Väg 570"],
  ["Lillhagsvägen väg 571", "571", "väg 571", "Väg 571"],
  ["Saltsjöbadsleden", "Saltsjöbadsleden", "Saltsjöbadsleden", "Saltsjöbadsleden"],
  ["Storvägen", "Storvägen", "Storvägen", "Storvägen"],
  ["", null, null, null],
  ["  ", null, null, null],
  [null, null, null, null],
  [undefined, null, null, null],
];

test("vagKod, vagText och vagForst för varje form (#882)", () => {
  for (const [inn, kod, text, forst] of FORMER) {
    assert.equal(vagKod(inn), kod, `vagKod(${JSON.stringify(inn)})`);
    assert.equal(vagText(inn), text, `vagText(${JSON.stringify(inn)})`);
    assert.equal(vagForst(inn), forst, `vagForst(${JSON.stringify(inn)})`);
  }
});

test("koden i live.json blir rätt röst utan ett nytt bygge (#882 c)", () => {
  // roadPhrase är appens regel (Kotlin och Swift speglar den); koden ger "på E4" och "på väg 40", aldrig "på Väg 1184" eller "på E 4".
  assert.equal(roadPhrase(vagKod("E 4")), " på E4");
  assert.equal(roadPhrase(vagKod("Väg 1184")), " på väg 1184");
  assert.equal(roadPhrase(vagKod("25")), " på väg 25");
  assert.equal(roadPhrase(vagKod(null)), "");
});

test("broarnas väg ur OpenStreetMap får koden", () => {
  const b = bridgesFromGeoJSON({ features: [
    { geometry: { coordinates: [13, 55.5] }, properties: { id: "a", road: "E 4" } },
    { geometry: { coordinates: [13, 55.6] }, properties: { id: "b", road: "50" } },
    { geometry: { coordinates: [13, 55.7] }, properties: { id: "c" } },
  ] });
  assert.deepEqual(b.map((x) => x.road), ["E4", "50", null]);
});

test("annonsernas kopia i .mjs följer samma regel", () => {
  for (const [inn, , text] of FORMER) {
    if (inn === null || inn === undefined) continue;
    assert.equal(annonsText(inn), text ?? "", `annonsstyrning vagText(${JSON.stringify(inn)})`);
    assert.equal(vagBild(inn), (text ?? "").toUpperCase(), `annonsstyrning vagBild(${JSON.stringify(inn)})`);
  }
});
