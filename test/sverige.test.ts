import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// DECISIONS #930: konturen och orterna som iPhone-appen bär är filen i registret, byte för byte.
test("sverige: appens kontur och orter är samma fil som den i registret", () => {
  const a = readFileSync("data/sverige/sverige.json");
  const b = readFileSync("ios/HalkvaktApp/Sources/Data/sverige.json");
  assert.ok(a.equals(b), "kopiera data/sverige/sverige.json till ios/HalkvaktApp/Sources/Data/");
  const d = JSON.parse(a.toString("utf8")) as { kontur: number[][][]; orter: { n: string; c: number[] }[] };
  assert.ok(d.kontur.length >= 1 && d.kontur[0].length > 100, "fastlandet först, med en riktig kontur");
  // Sverige ligger mellan 10 och 25 grader öst och 55 och 70 grader nord.
  assert.ok(d.kontur.flat().every(([x, y]) => x > 10 && x < 25 && y > 55 && y < 70));
  assert.ok(d.orter.length >= 30 && d.orter.every((o) => o.n.length > 0 && o.c.length === 2));
  for (const n of ["Stockholm", "Malmö", "Jönköping", "Linköping", "Vänersborg"]) assert.ok(d.orter.some((o) => o.n === n), n);
});
