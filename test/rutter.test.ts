import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAX_RUTTER, RUTT_STEG_M, Ruttinsamlare, SAMMA_RESA_ANDEL, SAMMA_RESA_M, VANTANDE_MAX, dagensResor, laggTill, namnforslag,
  sammaResa, taBort, type Rutter, type Vantande } from "../engine/src/rutter.ts";

// De sparade rutterna (favoriterna steg 2, kort #357, DECISIONS #616, #625): TypeScript mot det delade facit, som Swift och Kotlin
// prövas mot, och några invarianter som facit inte säger.
const facit = JSON.parse(readFileSync(new URL("../engine/fixtures/rutter.json", import.meta.url), "utf8"));

test("insamlaren glesar som facit, och talen är de i facit", () => {
  assert.equal(facit.ruttStegM, RUTT_STEG_M);
  assert.equal(facit.maxRutter, MAX_RUTTER);
  for (const f of facit.fall) {
    const r = new Ruttinsamlare();
    for (const [lon, lat] of f.fixar) r.add(lon, lat);
    assert.deepEqual(r.route(), f.sparas.map((i: number) => f.fixar[i]), f.namn);
  }
});

test("rutten slutar där resan slutade, och första fixen sparas alltid", () => {
  const r = new Ruttinsamlare();
  r.add(15, 59); r.add(15, 59.0001);   // 11 m: sparas inte
  assert.deepEqual(r.route(), [[15, 59], [15, 59.0001]], "sista fixen läggs till");
  assert.deepEqual(new Ruttinsamlare().route(), []);
});

test("listan: högst fem, den sjätte nekas, inget trängs ut tyst; ta bort en", () => {
  let l: Rutter = { schema: 1, rutter: [] };
  for (let i = 1; i <= MAX_RUTTER; i++) l = laggTill(l, { id: `r${i}`, namn: `R${i}`, sparad: "x", punkter: [] })!;
  assert.equal(laggTill(l, { id: "r6", namn: "R6", sparad: "x", punkter: [] }), null);
  assert.deepEqual(taBort(l, "r2").rutter.map((x) => x.id), ["r1", "r3", "r4", "r5"]);
  assert.deepEqual(facit.lista.efterTaBortR3, ["r1", "r2", "r4", "r5"]);
  assert.equal(facit.lista.sjatteSvar, "null");
});

test("igenkänningen: samma väg åt något håll, men inte en del av den eller en annan väg (DECISIONS #637)", () => {
  assert.equal(facit.samma.m, SAMMA_RESA_M);
  assert.equal(facit.samma.andel, SAMMA_RESA_ANDEL);
  for (const c of facit.samma.fall) assert.equal(sammaResa(facit.samma.a, c.b), c.svar, c.namn);
  assert.deepEqual(facit.samma.fall.map((c: { svar: boolean }) => c.svar), [true, true, false, false, false]);
  for (const c of facit.samma.fall) assert.equal(sammaResa(c.b, facit.samma.a), c.svar, `${c.namn}, åt andra hållet`);
});

test("namnförslagen: ett för båda hållen och datumet (DECISIONS #625, #806)", () => {
  assert.deepEqual(namnforslag(17, 10), ["Pendlingen", "Resa 17/10"]);
  assert.deepEqual(facit.namnforslag.svar, namnforslag(facit.namnforslag.dag, facit.namnforslag.manad));
});

test("dagens resor: samma pass ersätter, dit och hem blir en, högst tre, ett dygn (DECISIONS #806)", () => {
  let l: Vantande[] = [];
  for (const f of facit.dagens.fall) {
    l = dagensResor(l, f.ny, f.nuS);
    assert.deepEqual(l.map((v) => ({ id: v.id, slutS: v.slutS, km: v.km, dithem: v.dithem, punkter: v.punkter.length })), f.efter, f.namn);
    assert.ok(l.length <= VANTANDE_MAX);
  }
  assert.deepEqual(facit.dagens.fall[3].efter.map((v: { id: string; dithem: boolean }) => [v.id, v.dithem]), [["s1", true], ["s2", false]]);
});
