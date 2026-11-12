// SMÅVÄGSPROVET (DECISIONS #828 byggsteg 7, #844): TS-läsaren av punktfilen och beskedet mot engine/fixtures/smavagprov.json, samma
// fil som Kotlin (SmavagFilTest.kt) och Swift (SmavagFilTests.swift) prövas mot. Varje fall ska ge exakt de väntade farorna: id, punkterna
// i ordning och de varnande punkternas platser. Allt tvivel ger tystnad.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { smavagHazards } from "../engine/src/smavagfil.ts";
import { AlertEngine } from "../engine/src/engine.ts";
import { bearingDeg } from "../engine/src/geo.ts";

const prov = JSON.parse(readFileSync(new URL("../engine/fixtures/smavagprov.json", import.meta.url), "utf8"));

test("småvägsprovet: TS-läsaren ger varje falls väntade faror", () => {
  assert.ok(prov.fall.length >= 10, "provfilen har sina fall");
  for (const f of prov.fall) {
    const faror = smavagHazards(f.fil, f.besked, f.filSha).map((h) => ({ id: h.id, points: h.points, warn: h.warn }));
    assert.deepEqual(faror, f.vantat, `${f.namn}: ${f._varfor}`);
  }
});

test("småvägsprovet: läsarens faror talar i motorn när bilen följer vägen", () => {
  // Väg 1 i det vanliga fallet går från 12,00/56,00 mot nordost med punkterna omkring 800 m isär. En bil som följer vägen i 80 km/h
  // ska få beskedet om den varnande punkten (plats 1).
  const f = prov.fall.find((x: { namn: string }) => x.namn === "vanligt");
  const faror = smavagHazards(f.fil, f.besked, f.filSha).filter((h) => h.id === "smv:1");
  const [a, b] = [faror[0].points[0], faror[0].points[2]];
  const kurs = bearingDeg({ lon: a[0], lat: a[1] }, { lon: b[0], lat: b[1] }), steg = 40;
  const fixar = Array.from({ length: steg + 1 }, (_, i) => ({ t: i * 2, lon: a[0] + (b[0] - a[0]) * (i / steg), lat: a[1] + (b[1] - a[1]) * (i / steg),
    speedKmh: 80, headingDeg: kurs }));
  const alerts = new AlertEngine(faror).run(fixar);
  assert.ok(alerts.some((x) => x.hazardId === "smv:1"), `väg 1 talar: ${JSON.stringify(alerts.map((x) => x.hazardId))}`);
});
