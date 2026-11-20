import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// DECISIONS #917, #918: the municipality table the iPhone app bundles is the registered file, byte for byte.
test("kommuner: appens tabell är samma fil som den i registret, med 290 kommuner", () => {
  const a = readFileSync("data/kommuner/kommuner.json");
  const b = readFileSync("ios/HalkvaktApp/Sources/Data/kommuner.json");
  assert.ok(a.equals(b), "kopiera data/kommuner/kommuner.json till ios/HalkvaktApp/Sources/Data/");
  const k = JSON.parse(a.toString("utf8")).kommuner as { k: string; n: string; c: number[]; p: number[][][] }[];
  assert.equal(k.length, 290);
  assert.equal(new Set(k.map((x) => x.k)).size, 290);
  assert.ok(k.every((x) => /^[0-9]{4}$/.test(x.k) && x.c.length === 2 && x.p.length > 0));
});
