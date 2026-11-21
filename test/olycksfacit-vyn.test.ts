// Olycksfacit på admin.halkvakt.se (DECISIONS #936): fliken räknar med samma regler som veckans ärende.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Olycka } from "../supabase/functions/olycksfacit/arende.ts";
import { adminVy, atgard, isoVecka, oklarSkal } from "../supabase/functions/olycksfacit/vyn.ts";

const o = (x: Partial<Olycka>): Olycka => ({ tid: "2026-11-18T05:23:00.000Z", vag: "134", lon: 15.5434, lat: 57.9831,
  utfall: "TYST_TACKT", orsaker: ["A1: väglaget Normalt", "K: fukt saknades", "A2: ingen station inom 5 km"], klass: "TROLIG",
  skal: "singelolycka, yta ≤ 0 °C och fukt", dubblett: false, talade: [], art: "ett fordon", smavag: null, flackvisVat: false, ...x });

test("isoVecka: ISO-veckan, också över årsskiftet", () => {
  assert.equal(isoVecka("2026-11-06"), "2026-V45");
  assert.equal(isoVecka("2026-11-09"), "2026-V46");
  assert.equal(isoVecka("2026-11-15"), "2026-V46");
  assert.equal(isoVecka("2027-01-01"), "2026-V53");
  assert.equal(isoVecka("2027-01-04"), "2027-V01");
  assert.equal(isoVecka("2025-12-29"), "2026-V01");
});

test("atgard: kortet ur den förifyllda åtgärden, läsningen eller kollisionen", () => {
  assert.equal(atgard(o({ klass: "TROLIG", skal: "singelolycka, yta ≤ 0 °C och rimfrost" })), "kort #46");
  assert.equal(atgard(o({})), "läses i veckans ärende");
  assert.equal(atgard(o({ art: "flera fordon" })), "ingen åtgärd, kollision");
});

test("adminVy: säsongen, nämnaren, missarna, veckorna och lagren", () => {
  const alla = [
    o({ utfall: "VARNADE", klass: "TYDLIG", talade: ["A1", "K"], tid: "2026-11-20T06:00:00.000Z" }),
    o({ utfall: "VARNADE", klass: "TROLIG", talade: ["K"], tid: "2026-11-07T06:00:00.000Z" }),
    o({ tid: "2026-11-19T21:00:00.000Z" }),                                     // miss, Fukten syntes inte
    o({ art: "flera fordon", tid: "2026-11-10T06:00:00.000Z" }),               // miss, kollision, inget område
    o({ klass: "OKLAR" }), o({ klass: "INTE", skal: "vilt" }),
    o({ dubblett: true }), o({ klass: null }),                                  // räknas inte
    o({ tid: "2026-10-01T06:00:00.000Z" }),                                     // miss utanför 30 dygn: i säsongen, inte i listan
  ];
  const v = adminVy(alla, new Map([["2026-11-19", 1801]]), "2026-11-21");
  assert.deepEqual(v.sasong, { olyckor: 7, halkkopplade: 5, ratt: 2, missar: 3, kollisioner: 1 });
  assert.equal(v.bedomningar["OKLAR TYSTNAD"], 1);
  assert.equal(v.bedomningar["RÄTT TYSTNAD"], 1);
  assert.deepEqual(v.namnare.find((n) => n.klass === "TYDLIG"), { klass: "TYDLIG", olyckor: 1, varnade: 1 });
  assert.deepEqual(v.omraden, [{ omrade: "Fukten syntes inte", missar: 2 }]);
  assert.deepEqual(v.missar.map((m) => [m.dag, m.atgard, m.arende]),
    [["2026-11-19", "läses i veckans ärende", 1801], ["2026-11-10", "ingen åtgärd, kollision", null]]);
  assert.equal(v.missar[0].tid, "22:00", "svensk tid");
  assert.deepEqual(v.veckor.map((w) => w.vecka), ["2026-V40", "2026-V45", "2026-V46", "2026-V47"]);
  const l = Object.fromEntries(v.lagren.map((r) => [r.rad, [r.senaste, r.sasong]]));
  assert.deepEqual(l["Både A1 och K"], [1, 1]);
  assert.deepEqual(l["Bara K"], [0, 1]);
  assert.deepEqual(l["Inget lager"], [1, 3]);
  assert.equal(v.lagren.reduce((s, r) => s + r.sasong, 0), v.sasong.halkkopplade, "raderna summerar till de halkkopplade");
  assert.ok(!JSON.stringify(v).includes("57.98"), "inget läge som koordinater");
});

test("oklarSkal: skälet i klassningens ordning, och oklara summerar till OKLAR", () => {
  const ok = (x: Partial<Olycka>) => o({ klass: "OKLAR", ...x });
  assert.equal(oklarSkal(ok({ ytaMin: null })), "Ingen station inom 15 km");
  assert.equal(oklarSkal(ok({ ytaMin: 1.5 })), "Ytan mellan 0 och +3 °C");
  assert.equal(oklarSkal(ok({ ytaMin: -1, art: "okänd" })), "Kall yta, men texten säger inte hur olyckan gick till");
  assert.equal(oklarSkal(ok({ ytaMin: -1, art: "ett fordon, svag" })), "Kall yta, men texten säger inte hur olyckan gick till");
  assert.equal(oklarSkal(ok({ ytaMin: -1, art: "ett fordon" })), "Kall yta, men ingen fukt eller rimfrost vid stationen");
  assert.equal(oklarSkal(o({ klass: "TROLIG", ytaMin: -1 })), null);
  const v = adminVy([ok({ ytaMin: 2, utfall: "VARNADE" }), ok({ ytaMin: null }), ok({ ytaMin: 0.5 }), o({})], new Map(), "2026-11-21");
  assert.deepEqual(v.oklara.map((r) => [r.olyckor, r.varnade]), [[1, 0], [2, 1], [0, 0], [0, 0]]);
  assert.equal(v.oklara.reduce((a, r) => a + r.olyckor, 0), v.bedomningar["OKLAR TYSTNAD"] + 1);
});
