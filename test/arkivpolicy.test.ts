import { test } from "node:test";
import assert from "node:assert/strict";
import { halvtimme, skaArkiveras } from "../supabase/functions/ingest-live/arkivpolicy.ts";

// Kort #253, DECISIONS #353: kalla och blöta avläsningar alltid, varma och torra en gång per station och halvtimme.

test("en kall eller blöt avläsning sparas alltid, även om halvtimmen redan har en rad", () => {
  const har = new Set([halvtimme("1106", "2026-09-25T08:05:00Z")]);
  assert.equal(skaArkiveras(true, halvtimme("1106", "2026-09-25T08:15:00Z"), har), true);
});

test("en varm och torr avläsning sparas när halvtimmen saknar rad", () => {
  assert.equal(skaArkiveras(false, halvtimme("1106", "2026-09-25T08:05:00Z"), new Set()), true);
});

test("en andra varm avläsning i samma halvtimme sparas inte", () => {
  const har = new Set([halvtimme("1106", "2026-09-25T08:05:00Z")]);
  assert.equal(skaArkiveras(false, halvtimme("1106", "2026-09-25T08:25:00Z"), har), false);
});

test("nästa halvtimme är en ny halvtimme", () => {
  const har = new Set([halvtimme("1106", "2026-09-25T08:25:00Z")]);
  assert.equal(skaArkiveras(false, halvtimme("1106", "2026-09-25T08:35:00Z"), har), true);
});

test("en annan station i samma halvtimme räknas för sig", () => {
  const har = new Set([halvtimme("1106", "2026-09-25T08:05:00Z")]);
  assert.equal(skaArkiveras(false, halvtimme("2406", "2026-09-25T08:05:00Z"), har), true);
});

test("fallerade frågan gäller den gamla regeln: bara kallt eller blött", () => {
  assert.equal(skaArkiveras(false, halvtimme("1106", "2026-09-25T08:05:00Z"), null), false);
  assert.equal(skaArkiveras(true, halvtimme("1106", "2026-09-25T08:05:00Z"), null), true);
});

test("halvtimmen är grindarnas hink, floor(epok / 1800)", () => {
  assert.equal(halvtimme("s", "2026-09-25T08:29:59Z"), halvtimme("s", "2026-09-25T08:00:00Z"));
  assert.notEqual(halvtimme("s", "2026-09-25T08:30:00Z"), halvtimme("s", "2026-09-25T08:29:59Z"));
});
