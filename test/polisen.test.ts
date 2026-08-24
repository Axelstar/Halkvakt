// Polisen wildlife parser vs the real captured API response (test/fixtures/polisen.json)
// plus synthetic edge cases for the free-text extraction. If polisen changes shape or
// our regexes rot, this fails before production does.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extract, parseEvents } from "../ingest/sources/polisen.ts";

const raw = JSON.parse(readFileSync(new URL("./fixtures/polisen.json", import.meta.url), "utf8"));

test("polisen fixture parses; extraction hit-rate holds", () => {
  const events = parseEvents(raw);
  assert.ok(events.length >= 50, `expected a substantial fixture, got ${events.length}`);
  for (const e of events) {
    assert.ok(Number.isFinite(e.lon) && Number.isFinite(e.lat));
    assert.ok(e.countyName.endsWith("län"), `county-level location expected: ${e.countyName}`);
    assert.ok(!Number.isNaN(Date.parse(e.datetime)), `bad datetime: ${e.datetime}`);
    assert.ok(e.url.startsWith("https://polisen.se/"));
  }
  const roadRate = events.filter((e) => e.roadNumber).length / events.length;
  const speciesRate = events.filter((e) => e.species).length / events.length;
  // Real August 2026 data: 56/84 roads, ~80/84 species. Alarm if extraction collapses.
  assert.ok(roadRate >= 0.5, `road extraction collapsed: ${(roadRate * 100).toFixed(0)}%`);
  assert.ok(speciesRate >= 0.7, `species extraction collapsed: ${(speciesRate * 100).toFixed(0)}%`);
});

test("free-text extraction: roads, species, place hints", () => {
  const cases: [string, string | null, string | null, string | null][] = [
    ["Polisen får in en anmälan om en olycka med en personbil och ett rådjur på E45, Sänna.",
      "E45", "rådjur", "Sänna"],
    ["olycka med en lastbil och en ren på länsväg 395, Junosuando.",
      "395", "ren", "Junosuando"],
    ["en skåpbil och en älg på väg 108 söder om Rötviken.",
      "108", "älg", "söder om Rötviken"],
    ["kollision med vildsvin på riksväg 40 i höjd med Bollebygd.",
      "40", "vildsvin", "i höjd med Bollebygd"],
    ["en personbil har krockat med en kronhjort på E 4 mellan Ljungby och Lagan.",
      "E4", "kronhjort", "mellan Ljungby och Lagan"],
    // No road mentioned → nulls, no crash:
    ["Sammanstötning mellan bil och älg. Inga personskador.", null, "älg", null],
    // "ren" must not fire inside other words:
    ["Bilen var nyrenoverad och krockade med ett rådjur på väg 23.", "23", "rådjur", null],
  ];
  for (const [text, road, species, place] of cases) {
    const got = extract(text);
    assert.equal(got.roadNumber, road, `road in: ${text}`);
    assert.equal(got.species, species, `species in: ${text}`);
    if (place !== null) assert.equal(got.placeHint, place, `place in: ${text}`);
  }
});

test("defensive type filter drops non-wildlife events (API cache quirk, RUNBOOK)", () => {
  const mixed = [
    ...raw.slice(0, 3),
    { id: 1, datetime: "2026-08-24 20:14:07 +02:00", summary: "Brand i byggnad", url: "/x",
      type: "Brand", location: { name: "Skåne län", gps: "55.99,13.59" } },
  ];
  const events = parseEvents(mixed);
  assert.equal(events.length, 3);
  assert.ok(events.every((e) => e.summary !== "Brand i byggnad"));
});
