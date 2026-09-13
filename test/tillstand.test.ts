import { test } from "node:test";
import assert from "node:assert/strict";
import { skatta, samstammiga, N_SVEP, REGN_SVEP, R_SVEP, type Underlag } from "../publish/tillstand.ts";

const u = (o: Partial<Underlag>): Underlag => ({
  timmarSedanStationsregn: null, timmarSedanRadarregn: null, stationenTacker: true, ...o,
});

test("regn inom N ger blöt — från stationen", () => {
  assert.equal(skatta(u({ timmarSedanStationsregn: 0.5 }), 1), "blöt");
});

test("regn inom N ger blöt — från radarn ensam", () => {
  assert.equal(skatta(u({ timmarSedanRadarregn: 1 }), 2), "blöt");
});

test("gränsen är inklusive: exakt N timmar sedan räknas fortfarande som blöt", () => {
  assert.equal(skatta(u({ timmarSedanStationsregn: 2 }), 2), "blöt");
  assert.equal(skatta(u({ timmarSedanStationsregn: 2.01 }), 2), "torr");
});

test("N avgör: samma regn är blött vid N=4 och torrt vid N=2", () => {
  const bevis = u({ timmarSedanStationsregn: 3 });
  assert.equal(skatta(bevis, 4), "blöt");
  assert.equal(skatta(bevis, 2), "torr");
});

// Den bärande regeln, och den som ett framtida bygge lättast bryter.
test("FRÅNVARO ÄR INTE TORRT: utan stationstäckning blir svaret okänt, aldrig torr", () => {
  assert.equal(skatta(u({ stationenTacker: false }), 2), "okänt");
});

test("radarn kan ALDRIG ensam säga torr — en saknad rad betyder torrt ELLER utanför täckning", () => {
  // Radarn har ingen rad (null) och stationen observerar inte: svaret måste vara okänt.
  assert.equal(skatta({ timmarSedanStationsregn: null, timmarSedanRadarregn: null, stationenTacker: false }, 4), "okänt");
  // Med stationen på plats är torrt däremot ett påstående vi får göra.
  assert.equal(skatta({ timmarSedanStationsregn: null, timmarSedanRadarregn: null, stationenTacker: true }, 4), "torr");
});

test("unionen är en union: stationen tyst men radarn blöt räcker", () => {
  assert.equal(skatta(u({ timmarSedanStationsregn: null, timmarSedanRadarregn: 0.2 }), 1), "blöt");
});

test("skräpvärden får inte läcka igenom som blött", () => {
  assert.equal(skatta(u({ timmarSedanStationsregn: Number.NaN }), 2), "torr");
  assert.equal(skatta(u({ timmarSedanStationsregn: -1 }), 2), "torr");
});

test("samstämmigheten kräver att båda har en åsikt", () => {
  assert.equal(samstammiga(true, true), true);
  assert.equal(samstammiga(true, false), false);
  assert.equal(samstammiga(null, true), null);
  assert.equal(samstammiga(false, null), null);
});

test("svepen är tröskeldokumentets, inte skattarens egna", () => {
  assert.deepEqual([...N_SVEP], [1, 2, 3, 4]);
  assert.deepEqual([...REGN_SVEP], [0, 0.2, 0.5]);
  assert.deepEqual([...R_SVEP], [0.1, 0.5, 2]);
});
