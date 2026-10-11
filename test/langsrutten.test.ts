import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { farorLangsRutten } from "../engine/src/rutfilter.ts";
import type { Hazard } from "../engine/src/types.ts";

// Urvalet längs rutten (DECISIONS #528): TypeScript mot det delade facit som Kotlin (RouteFilter.kt) och Swift (RouteFilter.swift) också
// prövas mot. Facit skrivs av scripts/langsrutten-facit.ts; ändras urvalet ska filen skrivas om, och då ändras den i alla tre.

type Fall = { namn: string; linje: [number, number][]; marginalM: number; faror: Hazard[]; vantat: { id: string; avstandM: number; langsM: number }[] };
const facit = JSON.parse(readFileSync(new URL("../engine/fixtures/langsrutten.json", import.meta.url), "utf8")) as { fall: Fall[] };

test("facit bär fallen som prövar varje gren", () => {
  const ids = facit.fall.flatMap((f) => f.vantat.map((v) => v.id));
  for (const id of ["s-korsar", "s-bara-brytpunkten", "p-fore-start", "p-hornet", "p-tvilling-a", "n-innanfor-kanten"]) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes("p-fjarran") && !ids.includes("s-fjarran") && !ids.includes("n-utanfor"), "de utanför marginalen är borta");
  assert.equal(facit.fall.find((f) => f.linje.length === 1)!.vantat.length, 0, "en linje med en punkt ger inget");
});

for (const f of facit.fall) {
  test(`längs rutten: ${f.namn}`, () => {
    const r = farorLangsRutten(f.faror, f.linje, f.marginalM);
    assert.deepEqual(r.map((x) => x.hazard.id), f.vantat.map((v) => v.id), "samma faror i samma ordning");
    r.forEach((x, i) => {
      assert.ok(Math.abs(x.avstandM - f.vantat[i].avstandM) < 0.01, `${x.hazard.id}: avståndet ${x.avstandM} mot ${f.vantat[i].avstandM}`);
      assert.ok(Math.abs(x.langsM - f.vantat[i].langsM) < 0.01, `${x.hazard.id}: platsen ${x.langsM} mot ${f.vantat[i].langsM}`);
    });
  });
}
