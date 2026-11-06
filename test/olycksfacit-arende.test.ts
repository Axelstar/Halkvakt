// Olycksfacit, steg 3 (DECISIONS #797, kort #376): dagens ärende, de rena delarna. Ärendet ligger i det publika repot: det får
// bära väg, tid, läge, koderna och antalen, aldrig kandidatens tal.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ATERKOMMANDE, MARK, MARKV, type Olycka, arendeKropp, arendeTitel, bedomning, behoverAtgard, omrade, paminnelse, svenskDag,
  svenskTid, veckaKropp, veckaPaminnelse, veckaTitel, veckansForslag } from "../supabase/functions/olycksfacit/arende.ts";

const o = (x: Partial<Olycka>): Olycka => ({ tid: "2026-11-06T05:23:00.000Z", vag: "Väg 134", lon: 15.5434, lat: 57.9831,
  utfall: "TYST_TACKT", orsaker: ["A1: väglaget Normalt", "K: fukt saknades", "A2: ingen station inom 5 km"], klass: "TROLIG",
  skal: "singelolycka, yta ≤ 0 °C och fukt", dubblett: false, talade: [], ...x });

test("behoverAtgard: bara tysta olyckor med tydlig eller trolig koppling, aldrig en dubblett", () => {
  assert.equal(behoverAtgard(o({})), true);
  assert.equal(behoverAtgard(o({ utfall: "TYST_OTACKT", klass: "TYDLIG" })), true);
  assert.equal(behoverAtgard(o({ utfall: "VARNADE" })), false, "appen varnade");
  assert.equal(behoverAtgard(o({ klass: "OKLAR" })), false);
  assert.equal(behoverAtgard(o({ klass: "INTE" })), false);
  assert.equal(behoverAtgard(o({ klass: null })), false, "inte klassad än");
  assert.equal(behoverAtgard(o({ dubblett: true })), false);
});

test("svenskTid: klockslaget i svensk tid, också över sommartiden", () => {
  assert.equal(svenskTid("2026-11-06T05:23:00.000Z"), "06:23");
  assert.equal(svenskTid("2026-07-01T05:23:00.000Z"), "07:23");
});

test("arendeKropp: tabellen per klass och utfall, orsakerna, raden att åtgärda och stängningsregeln", () => {
  const k = arendeKropp("2026-11-06", [
    o({}),
    o({ tid: "2026-11-06T05:24:00.000Z", dubblett: true }),
    o({ tid: "2026-11-06T04:23:55.000Z", vag: "E18", utfall: "VARNADE", orsaker: [], klass: "TYDLIG", talade: ["A1", "K"] }),
    o({ tid: "2026-11-06T03:43:00.000Z", vag: "Väg 700", utfall: "TYST_OTACKT", klass: "OKLAR",
        orsaker: ["A1: ingen sträcka", "K: ingen vägpunkt", "A2: ingen station inom 5 km"] }),
  ]);
  assert.ok(k.startsWith(MARK("2026-11-06")));
  assert.ok(k.includes("| TYDLIG | 1 | 0 | 0 | 1 |"));
  assert.ok(k.includes("| TROLIG | 0 | 1 | 0 | 1 |"), "dubbletten räknas inte");
  assert.ok(k.includes("| OKLAR | 0 | 0 | 1 | 1 |"));
  assert.ok(k.includes("| **Summa** | 1 | 1 | 1 | 3 |"));
  assert.ok(k.includes("3 olyckor; 1 dubbletter"));
  assert.ok(k.includes("| A2: ingen station inom 5 km | 2 |"), "orsakerna räknas över de tysta olyckorna");
  assert.ok(!k.includes("| A1: väglaget Normalt | 2 |"));
  const rader = k.split("\n").filter((r) => r.startsWith("- [ ] "));
  assert.equal(rader.length, 1, "bara Kisa ska åtgärdas: E18 varnade, väg 700 är OKLAR");
  assert.ok(rader[0].startsWith("- [ ] 06:23 Väg 134 (15.543, 57.983) — tyst, täckt, TROLIG"));
  assert.ok(rader[0].endsWith(" — område: Fukten syntes inte — **Åtgärd:** "), "missens förbättringsområde (§9.4)");
  assert.ok(k.includes("**Stängningsregeln:**"));
  // §9.4: listan Rätt varning tar E18 (varnade, TYDLIG), inte Kisa (tyst) eller väg 700 (OKLAR).
  const ratt = k.split("\n").filter((r) => r.startsWith("- 05:23"));
  assert.deepEqual(ratt, ["- 05:23 E18 (15.543, 57.983) — TYDLIG (singelolycka, yta ≤ 0 °C och fukt) — varnade: A1, K"]);
  assert.ok(k.includes("**Rätt varning**"));
});

test("bedomning (§9.2): fem bedömningar, ingen för en dubblett eller en oklassad olycka", () => {
  assert.equal(bedomning(o({ utfall: "VARNADE", klass: "TYDLIG" })), "RÄTT VARNING");
  assert.equal(bedomning(o({ utfall: "VARNADE", klass: "TROLIG" })), "RÄTT VARNING");
  assert.equal(bedomning(o({ utfall: "VARNADE", klass: "OKLAR" })), "VARNING, HALKA INTE BEKRÄFTAD");
  assert.equal(bedomning(o({ utfall: "VARNADE", klass: "INTE" })), "VARNING, HALKA INTE BEKRÄFTAD");
  assert.equal(bedomning(o({ utfall: "TYST_TACKT", klass: "TYDLIG" })), "MISS");
  assert.equal(bedomning(o({ utfall: "TYST_OTACKT", klass: "TROLIG" })), "MISS");
  assert.equal(bedomning(o({ utfall: "TYST_TACKT", klass: "OKLAR" })), "OKLAR TYSTNAD");
  assert.equal(bedomning(o({ utfall: "TYST_OTACKT", klass: "INTE" })), "RÄTT TYSTNAD");
  assert.equal(bedomning(o({ dubblett: true })), null);
  assert.equal(bedomning(o({ klass: null })), null);
  // En miss är exakt det som ska ha en åtgärd i dagens ärende (§5).
  for (const u of ["VARNADE", "TYST_TACKT", "TYST_OTACKT"] as const) for (const kl of ["TYDLIG", "TROLIG", "OKLAR", "INTE", null] as const)
    for (const d of [false, true]) { const x = o({ utfall: u, klass: kl, dubblett: d }); assert.equal(bedomning(x) === "MISS", behoverAtgard(x)); }
});

test("omrade (§9.3): varje rad, i ordning, och bara för en miss", () => {
  const k = (s: string, extra: string[] = []) => o({ orsaker: ["A1: väglaget Normalt", `K: ${s}`, "A2: ingen fukt vid stationen", ...extra] });
  assert.equal(omrade(o({ utfall: "TYST_OTACKT", orsaker: ["A1: ingen sträcka", "K: spridningsspärren", "A2: ingen station inom 5 km"] })),
    "Täckningen", "otäckt går före K:s orsak");
  assert.equal(omrade(k("ingen vägpunkt")), "Täckningen");
  assert.equal(omrade(k("spridningsspärren", ["rimfrost"])), "Spridningsspärren", "spärren går före rimfrosten");
  assert.equal(omrade(k("veto")), "Vetot");
  assert.equal(omrade(k("yta över 0")), "Ytan i modellen");
  assert.equal(omrade(k("fukt saknades", ["rimfrost"])), "Rimfrosten");
  assert.equal(omrade(k("fukt saknades")), "Fukten syntes inte");
  assert.equal(omrade(k("ingen timme")), "Kandidatens drift");
  assert.equal(omrade(k("inget värde")), "Kandidatens drift");
  assert.equal(omrade(k("något nytt")), "Övrigt");
  assert.equal(omrade(o({ utfall: "TYST_TACKT", klass: "TROLIG", orsaker: ["A1: väglaget Normalt"] })), "Övrigt", "utan K-orsak");
  assert.equal(omrade(o({ klass: "OKLAR" })), null, "en oklar tystnad är ingen miss");
  assert.equal(omrade(o({ utfall: "VARNADE" })), null);
});

test("veckaKropp (§9.5): bedömningarna, lagren, områdena, fallen, säsongen och förslagen vid minst två missar", () => {
  assert.equal(ATERKOMMANDE, 2);
  const veckans = [
    o({}),                                                                         // miss, Fukten syntes inte
    o({ tid: "2026-11-07T06:10:00.000Z" }),                                        // miss, Fukten syntes inte
    o({ tid: "2026-11-07T06:11:00.000Z", dubblett: true }),                        // dubbletten räknas inte
    o({ tid: "2026-11-07T07:00:00.000Z", orsaker: ["A1: väglaget Normalt", "K: spridningsspärren", "A2: isrisk"] }),  // en spärrmiss
    o({ tid: "2026-11-08T05:00:00.000Z", vag: "E18", utfall: "VARNADE", klass: "TYDLIG", orsaker: [], talade: ["A1", "K"] }),
    o({ tid: "2026-11-08T05:30:00.000Z", utfall: "VARNADE", klass: "OKLAR", orsaker: [], talade: ["A2"] }),
    o({ tid: "2026-11-08T06:00:00.000Z", klass: "INTE", skal: "vilt" }),
  ];
  const k = veckaKropp("2026-V45", "2026-11-06", "2026-11-08", veckans, veckans);
  assert.ok(k.startsWith(MARKV("2026-V45")));
  assert.equal(veckaTitel("2026-V45"), "Olycksfacit vecka 2026-V45");
  for (const r of ["| RÄTT VARNING | 1 |", "| VARNING, HALKA INTE BEKRÄFTAD | 1 |", "| MISS | 3 |", "| OKLAR TYSTNAD | 0 |",
                   "| RÄTT TYSTNAD | 1 |", "| **Summa** | 6 |"]) assert.ok(k.includes(r), r);
  assert.ok(k.includes("(TYDLIG och TROLIG, 4): A1 varnade vid 1, K varnade vid 1, A2 varnade vid 0."), "A2 vid en OKLAR räknas inte");
  assert.ok(k.includes("| Fukten syntes inte | 2 |") && k.includes("| Spridningsspärren | 1 |"));
  assert.ok(k.includes("- 2026-11-08 06:00 E18 (15.543, 57.983) — TYDLIG"), "fallet med dag och svensk tid");
  assert.ok(k.includes("4 halkkopplade olyckor; Halkvakt hade rätt varning vid 1 av dem (25 %) och missade 3."));
  assert.ok(k.includes("**Säljregeln**"));
  const rader = k.split("\n").filter((r) => r.startsWith("- [ ] "));
  assert.deepEqual(rader, ["- [ ] Fukten syntes inte — 2 missar — **Åtgärd:** "], "bara området med två missar är återkommande");
  assert.deepEqual(veckansForslag(veckans.filter((x) => !x.dubblett)), [["Fukten syntes inte", 2]]);
  assert.ok(!/pb|narmaste_pb|pb_min|frys_min/.test(k), "inga tal ur kandidaten");
});

test("veckaKropp: en vecka utan återkommande område stängs, och säsongen räknas för sig", () => {
  const sasong = [o({ tid: "2026-11-06T05:00:00.000Z", utfall: "VARNADE", talade: ["A1"] }), o({ tid: "2026-11-10T05:00:00.000Z" })];
  const k = veckaKropp("2026-V46", "2026-11-09", "2026-11-15", [sasong[1]], sasong);
  assert.ok(k.includes("Inget förbättringsområde har 2 missar eller fler den här veckan. Ärendet stängs av funktionen."));
  assert.ok(!k.includes("- [ ] "));
  assert.ok(k.includes("**Säsongen sedan 2026-11-06:** 2 halkkopplade olyckor; Halkvakt hade rätt varning vid 1 av dem (50 %) och missade 1."));
  assert.ok(veckaPaminnelse("2026-V46", 7).startsWith(MARKV("2026-V46")));
  assert.equal(svenskDag("2026-11-08T23:30:00.000Z"), "2026-11-09", "dagen i svensk tid");
});

test("arendeKropp: ett dygn utan något att åtgärda säger det, och inga tal ur kandidaten följer med", () => {
  const k = arendeKropp("2026-11-07", [o({ klass: "INTE", skal: "vilt" })]);
  assert.ok(k.includes("Ingen tyst olycka med tydlig eller trolig koppling till halka det här dygnet"));
  assert.ok(!k.includes("- [ ] "));
  assert.ok(!/pb|narmaste_pb|pb_min/.test(k));
  assert.equal(arendeTitel("2026-11-07"), "Olycksfacit 2026-11-07");
  assert.ok(paminnelse("2026-11-07", 7).startsWith(MARK("2026-11-07")));
});
