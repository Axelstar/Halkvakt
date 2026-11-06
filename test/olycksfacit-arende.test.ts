// Olycksfacit, steg 3 (DECISIONS #797, kort #376): dagens ärende, de rena delarna. Ärendet ligger i det publika repot: det får
// bära väg, tid, läge, koderna och antalen, aldrig kandidatens tal.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MARK, type Olycka, arendeKropp, arendeTitel, behoverAtgard, paminnelse, svenskTid } from "../supabase/functions/olycksfacit/arende.ts";

const o = (x: Partial<Olycka>): Olycka => ({ tid: "2026-11-06T05:23:00.000Z", vag: "Väg 134", lon: 15.5434, lat: 57.9831,
  utfall: "TYST_TACKT", orsaker: ["A1: väglaget Normalt", "K: fukt saknades", "A2: ingen station inom 5 km"], klass: "TROLIG",
  skal: "singelolycka, yta ≤ 0 °C och fukt", dubblett: false, ...x });

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
    o({ tid: "2026-11-06T04:23:55.000Z", vag: "E18", utfall: "VARNADE", orsaker: [], klass: "TYDLIG" }),
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
  assert.ok(k.includes("**Stängningsregeln:**"));
});

test("arendeKropp: ett dygn utan något att åtgärda säger det, och inga tal ur kandidaten följer med", () => {
  const k = arendeKropp("2026-11-07", [o({ klass: "INTE", skal: "vilt" })]);
  assert.ok(k.includes("Ingen tyst olycka med tydlig eller trolig koppling till halka det här dygnet"));
  assert.ok(!k.includes("- [ ] "));
  assert.ok(!/pb|narmaste_pb|pb_min/.test(k));
  assert.equal(arendeTitel("2026-11-07"), "Olycksfacit 2026-11-07");
  assert.ok(paminnelse("2026-11-07", 7).startsWith(MARK("2026-11-07")));
});
