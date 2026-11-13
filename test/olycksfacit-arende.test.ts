// Olycksfacit, steg 3 (DECISIONS #797, kort #376): dagens ärende, de rena delarna. Ärendet ligger i det publika repot: det får
// bära väg, tid, läge, koderna och antalen, aldrig kandidatens tal.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ATERKOMMANDE, DYGN_EFTER, MARK, MARKV, type Olycka, arendeKropp, arendeTitel, bedomning, behoverAtgard, forifylld, kollision, omrade,
  paminnelse, smavagText, svenskDag, svenskTid, veckaKropp, veckaPaminnelse, veckaTitel, veckansForslag, veckansLasrader }
  from "../supabase/functions/olycksfacit/arende.ts";

const o = (x: Partial<Olycka>): Olycka => ({ tid: "2026-11-06T05:23:00.000Z", vag: "Väg 134", lon: 15.5434, lat: 57.9831,
  utfall: "TYST_TACKT", orsaker: ["A1: väglaget Normalt", "K: fukt saknades", "A2: ingen station inom 5 km"], klass: "TROLIG",
  skal: "singelolycka, yta ≤ 0 °C och fukt", dubblett: false, talade: [], art: "ett fordon", smavag: null, flackvisVat: false, ...x });

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
  assert.ok(rader[0].endsWith(" — område: Fukten syntes inte — **Åtgärd:** i veckans ärende"),
    "missens förbättringsområde (§9.4), och utan förifylld åtgärd läses den i veckans ärende (§11, B)");
  assert.ok(k.includes("**Läsningen**") && k.includes("Det här ärendet stängs av funktionen."), "dagens ärende stängs alltid (§11, B)");
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
  assert.ok(k.includes("Inget förbättringsområde har 2 missar eller fler den här veckan.") && k.includes("Ingen rad att åtgärda. Ärendet stängs av funktionen."));
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

test("dygnet i går och måndagen efter veckan (TROSKLAR-OLYCKSFACIT §10, DECISIONS #842): båda frågorna i funktionen läser DYGN_EFTER", () => {
  assert.equal(DYGN_EFTER, 1, "dagens ärende gäller dygnet i går, veckans skrivs måndagen efter veckan (förut 2: i förrgår och tisdagen)");
  const index = readFileSync(new URL("../supabase/functions/olycksfacit/index.ts", import.meta.url), "utf8");
  assert.match(index, /::date - \$\{DYGN_EFTER\}::int, interval '1 day'\) AS g\(t\)/, "dygnen: till och med i dag minus DYGN_EFTER");
  assert.match(index, /::date - \(6 \+ \$\{DYGN_EFTER\}::int\)\)::timestamp, interval '7 days'\) AS g\(m\)/,
    "veckorna: måndagen senast DYGN_EFTER + 6 dygn bort, så att söndagen är i går");
  assert.ok(!/::date - [0-9]+[,)]/.test(index), "inget inskrivet antal dygn kvar i frågorna");
  assert.ok(arendeKropp("2026-11-10", []).includes("klassningen när olyckan är minst sex timmar gammal och har lämnat flödet"));
});

// ── Det nya upplägget (TROSKLAR-OLYCKSFACIT §11, DECISIONS #852) ──
test("D2: en kollision på frusen väg är TROLIG och en miss i statistiken, men får ingen åtgärdsrad och inget område", () => {
  const k = o({ art: "flera fordon", skal: "kollision, yta ≤ 0 °C och fukt" });
  assert.equal(kollision(k), true);
  assert.equal(kollision(o({})), false, "ett fordon");
  assert.equal(kollision(o({ art: "flera fordon", klass: "OKLAR" })), false, "bara TROLIG");
  assert.equal(behoverAtgard(k), false);
  assert.equal(bedomning(k), "MISS", "räknas som miss i statistiken");
  assert.equal(omrade(k), null);
  assert.deepEqual(veckansForslag([k, { ...k, tid: "2026-11-06T06:00:00.000Z" }]), [], "två kollisioner gör inget återkommande område");
  const dag = arendeKropp("2026-11-06", [k, { ...k, tid: "2026-11-06T06:00:00.000Z", utfall: "VARNADE", orsaker: [], talade: ["A1"] }]);
  assert.ok(dag.includes("**Kollisioner på frusen väg** (TROLIG, flera fordon; TROSKLAR-OLYCKSFACIT §11): 2, varav 1 där Halkvakt varnade."));
  assert.ok(!dag.includes("- [ ] "), "ingen åtgärdsrad");
  assert.ok(dag.includes("— TROLIG (kollision, yta ≤ 0 °C och fukt) — varnade: A1"), "en varnad kollision är rätt varning");
  // Utom kollisionen är en miss fortfarande exakt det som ska ha en åtgärd (§5).
  for (const art of ["ett fordon", "flera fordon", null]) for (const kl of ["TYDLIG", "TROLIG", "OKLAR", "INTE"] as const) {
    const x = o({ art, klass: kl });
    assert.equal(bedomning(x) === "MISS" && !kollision(x), behoverAtgard(x), `${art} ${kl}`);
  }
});

test("A: de förifyllda åtgärderna M1–M3, och fällorna där mönstret inte gäller", () => {
  const otackt = { utfall: "TYST_OTACKT" as const, orsaker: ["A1: ingen sträcka", "K: ingen vägpunkt", "A2: ingen station inom 5 km"] };
  assert.match(forifylld(o({ ...otackt, smavag: "varnar" })) ?? "", /^kort #647 — förifylld \(M1 småväg\): .*småvägsrösten: skulle ha talat\.$/);
  assert.match(forifylld(o({ ...otackt, smavag: "torr" })) ?? "", /^kort #647 .*småvägsrösten: teg, torrt\.$/);
  assert.equal(forifylld(o({ ...otackt, smavag: "ingen småvägspunkt" })), null, "M1 kräver en punkt inom 0,5 km");
  assert.equal(forifylld(o({ ...otackt, smavag: null })), null, "M1 kräver lagret (olyckor före sql/110)");
  assert.equal(forifylld(o({ smavag: "varnar" })), null, "M1 gäller bara otäckta: en täckt miss har en egen orsak");
  const rimfrost = { klass: "TROLIG" as const, skal: "singelolycka, yta ≤ 0 °C och rimfrost" };
  assert.match(forifylld(o(rimfrost)) ?? "", /^kort #46 — förifylld \(M2 rimfrost\)/);
  assert.equal(forifylld(o({ ...rimfrost, utfall: "TYST_OTACKT" })), null, "M2 gäller bara täckta");
  assert.equal(forifylld(o({ klass: "TYDLIG", skal: "halkord i texten och yta ≤ +1 °C" })), null, "M2 kräver TROLIG");
  assert.equal(forifylld(o({})), null, "TROLIG på fukt utan fläckvis Våt passar inget mönster");
  assert.match(forifylld(o({ flackvisVat: true })) ?? "", /^kort #645 — förifylld \(M3 fläckvis Våt\)/);
  assert.equal(forifylld(o({ flackvisVat: true, orsaker: ["A1: väglaget Normalt", "K: spridningsspärren"] })), null,
    "M3 kräver att K räknade sträckan torr");
  assert.equal(forifylld(o({ flackvisVat: true, utfall: "VARNADE" })), null, "bara en miss förifylls");
  assert.equal(forifylld(o({ ...rimfrost, art: "flera fordon" })), null, "en kollision får ingen rad alls");
  // I dagens ärende: en förifylld rad är bokförd ([x]); småvägsrösten står i ord, aldrig med tal.
  const dag = arendeKropp("2026-11-06", [o({ ...otackt, smavag: "varnar" }), o({ tid: "2026-11-06T06:00:00.000Z" })]);
  const x = dag.split("\n").filter((r) => r.startsWith("- [x] "));
  assert.equal(x.length, 1);
  assert.ok(x[0].includes(" — småvägsrösten: skulle ha talat — **Åtgärd:** kort #647 — förifylld (M1 småväg)"), x[0]);
  assert.equal(dag.split("\n").filter((r) => r.startsWith("- [ ] ")).length, 1, "den andra läses i veckans ärende");
  assert.equal(smavagText(o({ smavag: "fryser inte" })), "teg, fryser inte");
  assert.ok(!/pb|ned|mmh|N3/.test(dag), "inga tal ur kuvösen eller kandidaten");
});

test("B: veckans ärende tar missarna utan förifylld åtgärd, bara från de dygn som lämnade dem dit", () => {
  const veckans = [
    o({ tid: "2026-11-16T05:00:00.000Z" }),                                                    // dygn med veckoläsning: läses här
    o({ tid: "2026-11-17T05:00:00.000Z", flackvisVat: true }),                                 // förifylld (M3): inte här
    o({ tid: "2026-11-18T05:00:00.000Z" }),                                                    // dygn utan veckoläsning (äldre ärende)
    o({ tid: "2026-11-16T06:00:00.000Z", utfall: "VARNADE", talade: ["K"] }),                  // varnade
  ];
  const lasdagar = new Set(["2026-11-16", "2026-11-17"]);
  assert.deepEqual(veckansLasrader(veckans, lasdagar).map((x) => x.tid), ["2026-11-16T05:00:00.000Z"]);
  const k = veckaKropp("2026-V47", "2026-11-16", "2026-11-22", veckans, veckans, lasdagar);
  const rader = k.split("\n").filter((r) => r.startsWith("- [ ] "));
  assert.deepEqual(rader, [
    "- [ ] 2026-11-16 06:00 Väg 134 (15.543, 57.983) — tyst, täckt, TROLIG (singelolycka, yta ≤ 0 °C och fukt) — A1: väglaget Normalt · " +
      "K: fukt saknades · A2: ingen station inom 5 km — område: Fukten syntes inte — **Åtgärd:** ",
    "- [ ] Fukten syntes inte — 3 missar — **Åtgärd:** ",
  ], "missen att läsa, och det återkommande området räknar alla tre missar, också den förifyllda och den från dygnet utan veckoläsning");
  assert.ok(k.includes("**Stängningsregeln:**"));
  assert.equal(veckaKropp("2026-V47", "2026-11-16", "2026-11-22", veckans.slice(3), veckans, lasdagar).includes("Ingen rad att åtgärda."), true);
});

test("E: nämnaren per klass, med INTE delad på viltet och värmen", () => {
  const veckans = [
    o({ utfall: "VARNADE", talade: ["A1"] }), o({ tid: "2026-11-06T06:00:00.000Z" }),
    o({ tid: "2026-11-06T07:00:00.000Z", art: "flera fordon", utfall: "VARNADE", talade: ["K"] }),
    o({ tid: "2026-11-06T08:00:00.000Z", klass: "INTE", skal: "yta över +3 °C" }),
    o({ tid: "2026-11-06T09:00:00.000Z", klass: "INTE", skal: "yta över +3 °C", utfall: "VARNADE", talade: ["A2"] }),
    o({ tid: "2026-11-06T10:00:00.000Z", klass: "INTE", skal: "vilt" }),
    o({ tid: "2026-11-06T11:00:00.000Z", klass: "OKLAR", dubblett: true }),
  ];
  const k = veckaKropp("2026-V45", "2026-11-06", "2026-11-08", veckans, veckans);
  for (const r of ["| TYDLIG | 0 | 0 | – |", "| TROLIG, ett fordon | 2 | 1 | 50 % |", "| TROLIG, kollision | 1 | 1 | 100 % |",
                   "| OKLAR | 0 | 0 | – |", "| INTE, vilt | 1 | 0 | 0 % |", "| INTE, varmt | 2 | 1 | 50 % |"]) assert.ok(k.includes(r), r);
  assert.ok(k.includes("**Nämnaren**"));
});
