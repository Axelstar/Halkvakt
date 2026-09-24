import { test } from "node:test";
import assert from "node:assert/strict";
import { skatta, skattaNiva, samstammiga, N_SVEP, REGN_SVEP, R_SVEP, K1_GRANS, K2_ZON, type Underlag } from "../publish/tillstand.ts";

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

// ── S2: nivå och bevis (DECISIONS #341). Kontraktet först: tillstand är ALLTID skatta()s svar.
test("S2: tillstand är exakt skatta() — för varje N och varje kombination av källor", () => {
  const fall: Underlag[] = [];
  for (const s of [null, 0.2, 1, 2.5, 4, 6, Number.NaN, -1]) for (const r of [null, 0.5, 3, 5]) for (const t of [true, false])
    fall.push({ timmarSedanStationsregn: s, timmarSedanRadarregn: r, stationenTacker: t });
  for (const f of fall) for (const N of N_SVEP) assert.equal(skattaNiva(f, N, 1.0, 0.5).tillstand, skatta(f, N), JSON.stringify(f));
});

test("S2: väta räknar svepstegen — nyligen ger 4, tre timmar sedan 2, efter fyra 0", () => {
  assert.equal(skattaNiva(u({ timmarSedanStationsregn: 0.5 }), 2, 1.0, 0.5).vata, 4);
  assert.equal(skattaNiva(u({ timmarSedanStationsregn: 3 }), 2, 1.0, 0.5).vata, 2);
  assert.equal(skattaNiva(u({ timmarSedanStationsregn: 4.5 }), 2, 1.0, 0.5).vata, 0);
  assert.equal(skattaNiva(u({ timmarSedanRadarregn: 1.5 }), 2, 1.0, 0.5).vata, 3, "radarn ensam räknas också");
  assert.equal(skattaNiva(u({ stationenTacker: false }), 2, 1.0, 0.5).vata, 0, "okänt har ingen väta");
});

test("S2: mängden är null när den är okänd — aldrig noll — och räknar regnsvepets steg", () => {
  const m = (mm: number | null | undefined) => skattaNiva({ ...u({ timmarSedanStationsregn: 0.5 }), mmSenaste: mm }, 1, 1.0, 0.5).mangd;
  assert.equal(m(undefined), null); assert.equal(m(null), null); assert.equal(m(Number.NaN), null); assert.equal(m(-0.1), null);
  assert.equal(m(0), 0, "uppmätt torrt är 0, inte okänt");
  assert.equal(m(0.1), 1); assert.equal(m(0.2), 2); assert.equal(m(0.3), 2); assert.equal(m(0.5), 3); assert.equal(m(2), 3);
});

test("S2: radarn är null utan rad och räknar r-svepets steg", () => {
  const r = (x: number | null | undefined) => skattaNiva({ ...u({}), radarMmh: x }, 1, 1.0, 0.5).radar;
  assert.equal(r(undefined), null); assert.equal(r(null), null);
  assert.equal(r(0.05), 0); assert.equal(r(0.1), 1); assert.equal(r(0.6), 2); assert.equal(r(3), 3);
});

test("S2: frys är ytan mot K1 med zonen K2 — nära gränsen får skattaren säga att den inte vet", () => {
  const f = (yta: number | null, K1: number, K2: number) => skattaNiva({ ...u({}), yta }, 1, K1, K2).frys;
  assert.equal(f(0.4, 1.0, 0.5), "under"); assert.equal(f(0.5, 1.0, 0.5), "under");
  assert.equal(f(0.6, 1.0, 0.5), "nära"); assert.equal(f(1.5, 1.0, 0.5), "nära"); assert.equal(f(1.6, 1.0, 0.5), "över");
  assert.equal(f(1.0, 1.0, 0), "under"); assert.equal(f(1.01, 1.0, 0), "över", "K2 = 0: alltid ett svar, aldrig nära");
  assert.equal(f(null, 1.0, 0.5), null);
});

test("S2: källorna säger vem som bär vätan inom N, och beviset är läsbart", () => {
  const n = skattaNiva({ timmarSedanStationsregn: 0.5, timmarSedanRadarregn: 1.8, stationenTacker: true, mmSenaste: 0.3, radarMmh: 0.6, yta: 0.8 }, 1, 1.0, 0.5);
  assert.deepEqual(n.kallor, ["station"], "radarn 1,8 h sedan ligger utanför N = 1");
  assert.equal(n.bevis, "blöt · väta 4/4 · mängd 2/3 · radar 2/3 · källor station · yta 0,8 °C nära 1,0 ±0,5");
});

test("S2: D1 i kod — ett tal utanför svepen avvisas högljutt", () => {
  assert.throws(() => skattaNiva(u({}), 5, 1.0, 0.5), /N=5 står inte i N_SVEP/);
  assert.throws(() => skattaNiva(u({}), 2, 0.7, 0.5), /K1=0.7 står inte i K1_GRANS/);
  assert.throws(() => skattaNiva(u({}), 2, 1.0, 0.3), /K2=0.3 står inte i K2_ZON/);
});

test("S2: frysklassningens svep är dokumentets", () => {
  assert.deepEqual([...K1_GRANS], [0, 0.5, 1.0]);
  assert.deepEqual([...K2_ZON], [0, 0.5, 1.0]);
});
