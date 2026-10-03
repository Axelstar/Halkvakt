// Frysflaggan med tre marginaler (kort #270 g, DECISIONS #437): fem punkter med känd klass, räknade för hand för varje marginal.
import { test } from "node:test";
import assert from "node:assert/strict";
import { flaggtal, skrivFrysflaggan } from "../publish/frysflagga.ts";

// measured = stationens egen yta, est = grannarnas skattning. K1 = +1.
const P = [
  { measured: 0, est: 0.4, station: "a" },    // fryser, skattas kall
  { measured: 0.5, est: 1.6, station: "a" },  // fryser, skattas varm: farligt fel vid K2 0 och 0,5, "vet inte" vid 1,0
  { measured: 1.8, est: 0.9, station: "b" },  // fryser inte, flaggas vid alla marginaler
  { measured: 3.5, est: 1.9, station: "b" },  // fryser inte; flaggas bara vid K2 1,0 och är då klart falsk (> K1 + 1)
  { measured: 4, est: 4, station: "c" },      // fryser inte, skattas varm
];

test("flaggtal: K2 = 0 är dagens flagga — ingen 'vet inte'", () => {
  assert.deepEqual(flaggtal(P, 0), { n: 5, stationer: 3, frys: 2, uttalar: 5, rattKlass: 3, farligaFel: 1, flaggor: 2, falskaFlaggor: 1, klartFalska: 0 });
});

test("flaggtal: K2 = 0,5 lägger punkten 0,9 i 'vet inte' men flaggar den ändå", () => {
  assert.deepEqual(flaggtal(P, 0.5), { n: 5, stationer: 3, frys: 2, uttalar: 4, rattKlass: 3, farligaFel: 1, flaggor: 2, falskaFlaggor: 1, klartFalska: 0 });
});

test("flaggtal: K2 = 1,0 är flagga vid ≤ 2 °C — inga farliga fel, fler och klart falska flaggor", () => {
  assert.deepEqual(flaggtal(P, 1.0), { n: 5, stationer: 3, frys: 2, uttalar: 1, rattKlass: 1, farligaFel: 0, flaggor: 4, falskaFlaggor: 2, klartFalska: 1 });
});

test("skrivFrysflaggan: en rad per kandidat, marginal och band, med antal och båda nämnarna", () => {
  const rader = P.map((p, i) => ({ ...p, ankKm: i < 3 ? 5 : 12, raw: p.est }));
  const ut = skrivFrysflaggan(rader, [{ namn: "RÅ", pick: (r) => r.raw }], [["0–7 km", 0, 7], ["7–15 km", 7, 15]]);
  assert.equal(ut.filter((r) => r.startsWith("RÅ, K2")).length, 3, "tre marginaler, ingen väljs");
  const alla0 = ut[ut.indexOf("RÅ, K2 0:") + 3];
  assert.match(alla0, /^ {2}alla {6}n 5 \(3 st, frys 2\) · farliga fel 50,0 % av frysningarna, 20,0 % ± 35,1 av uttalade/);
});
