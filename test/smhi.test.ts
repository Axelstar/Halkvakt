// SMHI parser vs real captured response + winter-relevance mapping.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseWarnings, isWinterRelevant } from "../ingest/sources/smhi.ts";

const raw = JSON.parse(readFileSync(new URL("./fixtures/smhi.json", import.meta.url), "utf8"));

test("smhi fixture parses with geometry and levels", () => {
  const areas = parseWarnings(raw);
  assert.ok(areas.length >= 10, `expected substantial fixture, got ${areas.length}`);
  for (const a of areas) {
    assert.ok(a.areaId > 0 && a.warningId > 0);
    assert.ok(["MESSAGE", "YELLOW", "ORANGE", "RED"].includes(a.levelCode), a.levelCode);
    assert.ok(!Number.isNaN(Date.parse(a.published)));
  }
  assert.ok(areas.some((a) => a.geometry !== null), "no geometries parsed");
});

test("winter relevance mapping", () => {
  for (const code of ["SNOW_ICE", "ICING", "SNOWFALL", "WIND", "COLD_WAVE"]) {
    assert.ok(isWinterRelevant(code), code);
  }
  for (const code of ["WATER_SHORTAGE", "FIRE_RISK", "HIGH_TEMPERATURES", "RAIN", "FOG", "THUNDER"]) {
    assert.ok(!isWinterRelevant(code), code);
  }
});
