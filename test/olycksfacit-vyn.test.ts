// Olycksfacit på admin.halkvakt.se (DECISIONS #936): fliken räknar med samma regler som veckans ärende.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Olycka } from "../supabase/functions/olycksfacit/arende.ts";
import { adminVy, atgard, smavagsdel, basfrekvens, isoVecka, oklarSkal } from "../supabase/functions/olycksfacit/vyn.ts";

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
  const v = adminVy(alla, new Map([["2026-11-19", { nr: 1801, stangd: false, veckolasning: true }]]), "2026-11-21");
  assert.deepEqual(v.sasong, { olyckor: 7, halkkopplade: 5, ratt: 2, rattVaglaget: 0, missar: 3, kollisioner: 1 });
  assert.equal(v.bedomningar["OKLAR TYSTNAD"], 1);
  assert.equal(v.bedomningar["RÄTT TYSTNAD"], 1);
  assert.deepEqual(v.namnare.find((n) => n.klass === "TYDLIG"), { klass: "TYDLIG", olyckor: 1, varnade: 1 });
  assert.deepEqual(v.omraden, [{ omrade: "Fukten syntes inte", missar: 2 }]);
  assert.deepEqual(v.missar.map((m) => [m.dag, m.atgard, m.arende]),
    [["2026-11-19", "läses i veckans ärende", 1801], ["2026-11-10", "ingen åtgärd, kollision", null]]);
  assert.equal(v.missar[0].tid, "22:00", "svensk tid");
  assert.deepEqual(v.veckor.map((w) => w.vecka), ["2026-V40", "2026-V45", "2026-V46", "2026-V47"]);
  assert.equal(v.dygn.length, 16, "6/11 till 21/11, också dygn utan olyckor");
  assert.deepEqual(v.dygn.find((d) => d.dag === "2026-11-20"), { dag: "2026-11-20", ratt: 1, missar: 0 });
  assert.deepEqual(v.dygn.find((d) => d.dag === "2026-11-19"), { dag: "2026-11-19", ratt: 0, missar: 1 });
  const l = Object.fromEntries(v.lagren.map((r) => [r.rad, [r.senaste, r.sasong]]));
  assert.deepEqual(l["Både A1 och K"], [1, 1]);
  assert.deepEqual(l["Bara K"], [0, 1]);
  assert.deepEqual(l["Inget lager"], [1, 3]);
  assert.equal(v.lagren.reduce((s, r) => s + r.sasong, 0), v.sasong.halkkopplade, "raderna summerar till de halkkopplade");
  assert.ok(!JSON.stringify(v).includes("57.98"), "inget läge som koordinater");
});

test("adminVy: en läsrad är åtgärdad när ärendet som bär den är stängt", () => {
  const alla = [o({ tid: "2026-11-07T06:00:00.000Z" }), o({ tid: "2026-11-13T06:00:00.000Z" }), o({ tid: "2026-11-19T06:00:00.000Z" }),
    o({ klass: "TROLIG", skal: "singelolycka, yta ≤ 0 °C och rimfrost", tid: "2026-11-08T06:00:00.000Z" })];
  const veckorna = new Map([["2026-V45", { nr: 1489, stangd: true }], ["2026-V46", { nr: 1634, stangd: false }]]);
  const dygnen = new Map([["2026-11-07", { nr: 1472, stangd: true, veckolasning: true }],
    ["2026-11-10", { nr: 1536, stangd: true, veckolasning: false }], ["2026-11-11", { nr: 1537, stangd: false, veckolasning: false }]]);
  const v = adminVy([...alla, o({ tid: "2026-11-10T06:00:00.000Z" }), o({ tid: "2026-11-11T06:00:00.000Z" })], dygnen, "2026-11-21", veckorna);
  assert.deepEqual(v.missar.map((m) => [m.dag, m.atgard, m.vecka]), [
    ["2026-11-19", "läses i veckans ärende", null],                // veckans ärende är inte skrivet än
    ["2026-11-13", "läses i veckans ärende", 1634],
    ["2026-11-11", "läses i veckans ärende", 1634],                // dygnets ärende är öppet: veckans gäller
    ["2026-11-10", "åtgärdad i dygnets ärende", null],             // åtgärdad i dygnets ärende, före sql/110
    ["2026-11-08", "kort #46", null],                              // förifylld: veckans ärende ändrar den inte
    ["2026-11-07", "åtgärdad i veckans ärende", 1489]]);
});

test("oklarSkal: skälet i klassningens ordning, och oklara summerar till OKLAR", () => {
  const ok = (x: Partial<Olycka>) => o({ klass: "OKLAR", ...x });
  assert.equal(oklarSkal(ok({ ytaMin: null })), "Ingen station inom 15 km");
  assert.equal(oklarSkal(ok({ ytaMin: 1.5 })), "Ytan +1 till +3 °C, torrt");
  assert.equal(oklarSkal(ok({ ytaMin: 1.5, fuktEfter: true })), "Ytan +1 till +3 °C, med fukt");
  assert.equal(oklarSkal(ok({ ytaMin: 0.5, rimfrostEfter: true })), "Ytan 0 till +1 °C, med fukt");
  assert.equal(oklarSkal(ok({ ytaMin: 1 })), "Ytan 0 till +1 °C, torrt");
  assert.equal(oklarSkal(ok({ ytaMin: -1, art: "okänd" })), "Kall yta, men texten säger inte hur olyckan gick till");
  assert.equal(oklarSkal(ok({ ytaMin: -1, art: "ett fordon, svag" })), "Kall yta, men texten säger inte hur olyckan gick till");
  assert.equal(oklarSkal(ok({ ytaMin: -1, art: "ett fordon" })), "Kall yta, men ingen fukt eller rimfrost vid stationen");
  assert.equal(oklarSkal(o({ klass: "TROLIG", ytaMin: -1 })), null);
  const v = adminVy([ok({ ytaMin: 2, utfall: "VARNADE" }), ok({ ytaMin: null }), ok({ ytaMin: 0.5 }), o({})], new Map(), "2026-11-21");
  assert.deepEqual(v.oklara.map((r) => [r.olyckor, r.varnade]), [[1, 0], [0, 0], [1, 0], [0, 0], [1, 1], [0, 0], [0, 0]]);
  assert.equal(v.oklara.reduce((a, r) => a + r.olyckor, 0), v.bedomningar["OKLAR TYSTNAD"] + 1);
});

test("basfrekvens och väntat antal (DECISIONS #940): olyckor per stationstimme mot samma del av dygnet över +3 °C", () => {
  const timmar = [
    { dygn: "dag" as const, hink: "över +3", timmar: 10_000 }, { dygn: "dag" as const, hink: "0 till +1, fukt", timmar: 1_000 },
    { dygn: "dag" as const, hink: "kall, torrt", timmar: 4_000 }, { dygn: "natt" as const, hink: "kall, fukt", timmar: 500 },
  ];
  const f = (hink: string | null, dygnsdel: "dag" | "natt", x: Partial<Olycka> = {}) => o({ fukthink: hink, dygnsdel, ...x });
  const alla = [
    ...Array.from({ length: 10 }, () => f("över +3", "dag", { klass: "INTE" })),                       // 10 per 10 000: referensen
    ...Array.from({ length: 4 }, () => f("0 till +1, fukt", "dag", { klass: "OKLAR", tid: "2026-11-10T09:00:00.000Z" })), // 40: 75 %
    f("kall, torrt", "dag"),                                                                            // 2,5: under referensen, 0 %
    f("kall, fukt", "natt"),                                                                            // ingen referens på natten
    f(null, "dag"), o({}), f("kall, torrt", "dag", { dubblett: true }),                                 // utan station, utanför skuggan, dubblett
  ];
  const h = basfrekvens(timmar, alla.filter((x) => !x.dubblett));
  assert.deepEqual(h.map((r) => [r.dygn, r.hink, r.olyckor, r.per10000, r.andel]), [
    ["dag", "kall, torrt", 1, 2.5, 0], ["dag", "0 till +1, fukt", 4, 40, 0.75], ["dag", "över +3", 10, 10, 0], ["natt", "kall, fukt", 1, 20, null],
  ]);
  const s = adminVy(alla, new Map(), "2026-11-21", new Map(), timmar).sannolikhet!;
  assert.equal(s.olyckor, 17, "olyckorna i skuggan, utan dubbletten och olyckan utanför");
  assert.equal(s.utanStation, 1);
  assert.equal(s.vantat, 3, "fyra olyckor à 75 %");
  assert.deepEqual(s.veckor.map((v) => [v.vecka, v.olyckor, v.klassade, v.vantat]), [["2026-V46", 4, 0, 3], ["2026-V47", 13, 3, 0]]);
  assert.equal(adminVy(alla, new Map(), "2026-11-21").sannolikhet, null, "utan stationstimmar ingen sannolikhet");
});

test("TROLIG, väglaget (DECISIONS #942): halkkopplad, egen rad i nämnaren, och rätt varning räknad för sig", () => {
  const vg = (x: Partial<Olycka>) => o({ klass: "TROLIG", skal: "väglaget efteråt, yta ≤ +1 °C", art: "okänd", ...x });
  const alla = [vg({ utfall: "VARNADE", talade: ["A1"] }), vg({}), vg({ art: "flera fordon", skal: "väglaget efteråt, ingen vaktad station inom 15 km" }),
    o({ utfall: "VARNADE", klass: "TYDLIG", talade: ["K"] })];
  const v = adminVy(alla, new Map(), "2026-11-21");
  assert.deepEqual(v.sasong, { olyckor: 4, halkkopplade: 4, ratt: 2, rattVaglaget: 1, missar: 2, kollisioner: 1 });
  assert.deepEqual(v.namnare.find((n) => n.klass === "TROLIG, väglaget"), { klass: "TROLIG, väglaget", olyckor: 3, varnade: 1 });
  assert.equal(v.namnare.find((n) => n.klass === "TROLIG, kollision")!.olyckor, 0, "kollisionen i väglaget står på väglagets rad");
  assert.equal(v.namnare.reduce((a, n) => a + n.olyckor, 0), 4, "raderna utesluter varandra");
  assert.deepEqual(v.missar.map((m) => m.atgard), ["läses i veckans ärende", "ingen åtgärd, kollision"], "en tyst är en miss, kollisionen får ingen åtgärd (D2)");
});

test("småvägsrösten: varningarna per dygn och olyckorna nära en småvägspunkt sedan påslaget (Bengt 26/11)", () => {
  const alla = [
    o({ tid: "2026-11-25T19:00:00.000Z", smavag: "varnar" }),                                              // före påslaget
    o({ tid: "2026-11-25T22:10:00.000Z", smavag: "varnar", talade: ["smavag"], utfall: "VARNADE" }),       // varnade
    o({ tid: "2026-11-26T05:00:00.000Z", smavag: "torr", klass: "OKLAR", skal: "singelolycka" }),          // tyst, inte halkkopplad
    o({ tid: "2026-11-26T06:00:00.000Z", smavag: "ingen småvägspunkt" }),                                  // ingen punkt nära
    o({ tid: "2026-11-26T07:00:00.000Z", smavag: null }),                                                  // utan lagret
  ];
  const v = smavagsdel([...alla, o({ tid: "2026-11-26T08:00:00.000Z", smavag: "varnar", dubblett: true })],
    [{ dag: "2026-11-25", antal: 3 }, { dag: "2026-11-26", antal: 5 }, { dag: "2026-11-24", antal: 9 }], "2026-11-26");
  assert.equal(v.fran, "2026-11-25");
  assert.deepEqual(v.dygn, [
    { dag: "2026-11-25", varningar: 3, olyckor: 1, halkkopplade: 1, varnade: 1 },
    { dag: "2026-11-26", varningar: 5, olyckor: 1, halkkopplade: 0, varnade: 0 },
  ]);
  assert.deepEqual(v.summa, { varningar: 8, olyckor: 2, halkkopplade: 1, varnade: 1 });
  assert.equal(adminVy([], new Map(), "2026-11-26").smavag, undefined, "adminVy sätter inte rutan; admin gör det i ett eget försök");
  assert.deepEqual(smavagsdel([], [], "2026-11-26").summa, { varningar: 0, olyckor: 0, halkkopplade: 0, varnade: 0 });
});
