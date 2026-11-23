// Körlistan D1 and D2 (DECISIONS #951): the weekly report. These tests need no database.
//   1. the value guard: every numeric field the report reads is declared, its table is in TID, and a field outside its span or
//      undeclared stops the report instead of giving a number
//   2. the report: internal, the six parts and the deadlines, the count beside every share, the active days never summed, the cities'
//      section inside it and a line when it is missing; its files never inside the repo
//   3. körlistan: only the rows that wait for Bengt's or Axel's word, and only words
//   4. the flow: Monday, the report to the private repo, and nothing in the log but klart
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { flaggaFor, spannFor } from "../scripts/vardevakten.ts";
import { FALT, SATS, granska, intervall, korlistan, rapport, type Db } from "../scripts/veckorapporten.ts";
import { iRepot } from "../scripts/sasongsfacit-stad.ts";
import type { Olycka } from "../supabase/functions/olycksfacit/arende.ts";

const las = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const olycka = (o: Partial<Olycka>): Olycka => ({ tid: "2026-11-20T06:00:00.000Z", vag: "E4", lon: 18, lat: 59.3, utfall: "VARNADE", orsaker: [],
  klass: "TYDLIG", skal: null, dubblett: false, talade: ["A1"], art: null, smavag: null, flackvisVat: false, ytaMin: -2, fuktEfter: false,
  rimfrostEfter: false, halkaEfter: null, ...o } as Olycka);

const db = (o: Partial<Db> = {}): Db => ({
  mandag: "2026-11-23", vecka_fran: "2026-11-16", veckans_timmar: 168,
  spann: FALT.map(([tabell, kolumn]) => ({ tabell, kolumn, min: 0, max: 7 })),
  timmar: [{ kedja: "K", dag: "2026-11-16", timmar: 24 }, { kedja: "K", dag: "2026-11-17", timmar: 23 }],
  bygget: { median: 8300, n: 600 },
  raknare: [
    { vecka: true, dag: "2026-11-17", app: "ios", version: "0.4.0", handelse: "resa_slut", varde: "sjalv:15-45:parkerad", antal: 30 },
    { vecka: true, dag: "2026-11-17", app: "ios", version: "0.4.0", handelse: "resa_slut", varde: "sjalv:15-45:avbruten", antal: 4 },
    { vecka: true, dag: "2026-11-17", app: "ios", version: "0.4.0", handelse: "aktiv_dag", varde: "1-7", antal: 11 },
    { vecka: true, dag: "2026-11-18", app: "ios", version: "0.4.0", handelse: "aktiv_dag", varde: "1-7", antal: 13 },
    { vecka: true, dag: "2026-11-17", app: "android", version: "0.4.0", handelse: "varning", varde: "slippery_segment:400-800", antal: 9 },
    { vecka: false, dag: "2026-11-05", app: "android", version: "0.4.0", handelse: "varning", varde: "smavag:under400", antal: 0 },
  ],
  facit: [{ vecka: true, dag: "2026-11-17", metod: "K", jamforelser: true, timmar: 1000, varnar: 40, traff: 22, f1: 30, tackt: 21 },
    { vecka: false, dag: "2026-11-05", metod: "J1", jamforelser: false, timmar: 900, varnar: 400, traff: 20, f1: 30, tackt: 25 }],
  facitdagar: ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"],
  ledtid: [{ vecka: true, dag: "2026-11-17", band: "1–3 h", n: 5 }, { vecka: true, dag: "2026-11-18", band: "ingen", n: 3 }],
  fordrojning: [{ period: "veckan", n: 500, fore: 2, median_s: 90, p95_s: 600 }, { period: "säsongen", n: 2000, fore: 3, median_s: 120, p95_s: 900 }],
  lagesfil: [{ vecka: true, dag: "2026-11-22", timmar_bygge: 24, timmar_utan: 0, a1_f1: 100, a1_i_filen: 90, a2_isrisk: 40, a2_i_filen: 30 }],
  givarfel: [{ vecka: true, stationsdygn: 4, stationer: 2 }, { vecka: false, stationsdygn: 6, stationer: 3 }],
  kamerafacit: 0,
  takt: [{ vecka: true, slag: "rösten", tatast_s: 12, inom60: 5, foljder: 80 }, { vecka: false, slag: "rösten", tatast_s: 8, inom60: 2, foljder: 40 },
    { vecka: true, slag: "K", tatast_s: 0, inom60: 9, foljder: 30 }],
  falsklarm: [{ vecka: true, rutt: "R1", korningar: 10, varningar: 30, utan_facit: 20 }, { vecka: false, rutt: "R1", korningar: 10, varningar: 10, utan_facit: 0 }],
  km: { R1: 100 },
  svar: [{ vecka: true, slag: "seg", svar: "ja", antal: 3 }, { vecka: true, slag: "seg", svar: "nej", antal: 1 }],
  missar: [{ vecka: true, vad: "halka", antal: 2 }],
  brytare: [{ grupp: "N", pa: false, andrad: "2026-11-14 10:00" }, { grupp: "P1", pa: false, andrad: "2026-11-14 10:00" }],
  olyckor: [olycka({}), olycka({ tid: "2026-11-10T06:00:00.000Z", utfall: "TYST_TACKT", talade: [] }), olycka({ dubblett: true })],
  arenden: [{ nummer: 1800, titel: "⏰ Frist 26/11 2026: MET", etiketter: ["frist"], skapad: "2026-11-19", oppet: true }],
  frister: [{ id: "met", datum: "2026-11-26", vad: "MET:s morgonfel. Mer text.", agare: ["Bengt"] },
    { id: "sen", datum: "2027-04-01", vad: "Långt bort.", agare: ["Axel"] }],
  korlistan: [{ id: "C8", punkt: "Småvägskartan", vem: "ni beslutar", lage: "öppen" }],
  ...o,
});

test("#951 the value guard: every field the report reads is declared and its table is in TID", () => {
  const vakt = las("scripts/vardevakten.ts");
  for (const [t, k] of FALT) {
    assert.ok(spannFor(t, k), `${t}.${k} has a span`);
    assert.match(vakt, new RegExp(`\\b${t}: "(dag|t)"`), `${t} is in TID`);
  }
  for (const t of ["sasongsfacit_dag", "sasongsfacit_ledtid", "sasongsfacit_olyckor"]) assert.ok(spannFor(t, "lan"), `${t}.lan has a span`);
  assert.ok(flaggaFor("sasongsfacit_dag", "jamforelser"), "the flag that decides J1 and J2 is declared");
  assert.throws(() => granska(db({ spann: [{ tabell: "app_raknare", kolumn: "antal", min: 0, max: 100001 }] })), /utanför sitt spann/u);
  assert.throws(() => rapport(db({ spann: [{ tabell: "sasongsfacit_dag", kolumn: "f1", min: -1, max: 3 }] }), null), /utanför sitt spann/u);
  assert.doesNotThrow(() => granska(db({ spann: [{ tabell: "publicera_bygge", kolumn: "bygget_ms", min: null, max: null }] })));
  // the error never carries a value
  try { granska(db({ spann: [{ tabell: "app_raknare", kolumn: "antal", min: 0, max: 123456 }] })); } catch (e) { assert.doesNotMatch(String(e), /123456/u); }
});

test("#951 the questions read only, in the week and the season, and the active days never become a count of drivers", () => {
  for (const [n, s] of Object.entries(SATS)) {
    assert.match(s.trim(), /^(SELECT|WITH)\b/u, `${n} is a read`);
    assert.doesNotMatch(s, /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|cron\.job)\b/iu, `${n} writes nothing and reads no cron command`);
  }
  assert.match(SATS.svar, /NOT prov/u); assert.match(SATS.missar, /NOT prov/u);
});

test("#951 the report: internal, the parts in order, the count beside the share", () => {
  const r = rapport(db(), "## Storstäderna (TROSKLAR-SASONGSFACIT §11)\n\n**Internt**\n\n### Timmarna per klass (§11.3)\n\nx\n");
  assert.match(r, /^# Veckorapporten 2026-11-23\n\n\*\*Intern\*\*/u);
  const delar = ["## 1. Driften", "## 2. Räckvidden (nivå 1)", "## 3. Riktigheten (nivå 2 och 3)", "## 4. Olyckorna (nivå 4)", "## 5. Storstäderna",
    "## 6. Småvägarna", "## 7. Frister och öppna beslut"];
  let i = -1;
  for (const d of delar) { const j = r.indexOf(`\n${d}\n`); assert.ok(j > i, `${d} in order`); i = j; }
  assert.match(r, /\| K \| 47 \| 121 \| 1 \|/u, "K: 47 hours of 168, one complete day");
  assert.match(r, /\| ios 0\.4\.0 \| veckan \| 34 \| 4 av 34 \(11,8 %\) \|/u, "the aborted sessions as a share with the count");
  assert.match(r, /\| 2026-11-17 \| 11 \| 0 \|/u); assert.match(r, /\| 2026-11-18 \| 13 \| 0 \|/u);
  assert.match(r, /\| K \| veckan \| 1000 \| 40 \| 22 av 40 \(55,0 %; 95 %: 55–55 %\) \| 30 \| 21 av 30 \(70,0 %; 95 %: 70–70 %\) \|/u,
    "one day: the interval is the share itself");
  assert.match(r, /\| veckan \| 10 \| 1000 \| 30 \| 20 av 30 \(66,7 %\) \| 2,00 \|/u, "20 false of 1 000 km");
  assert.match(r, /\| säsongen \| 20 \| 2000 \| 40 \| 20 av 40 \(50,0 %\) \| 1,00 \|/u);
  assert.match(r, /\| rösten, alla lager \| säsongen \| 8 \| 120 \| 7 \|/u, "the season's closest gap is the smallest of the two");
  assert.match(r, /\| K \| veckan \| 0 \| 30 \| 9 \|/u);
  assert.match(r, /\| veckan \| 500 \| 1,5 \| 10,0 \| 2 \|/u, "A1's delay in minutes");
  assert.match(r, /tystade 4 stationsdygn i veckan och 10 under säsongen/u);
  assert.match(r, /0 bilder från säsongen är klassade/u);
  assert.doesNotMatch(r, /Saknas ännu/u);
  assert.match(r, /\| veckan \| 1 \| 0 \| 90 av 100 \(90,0 %; 95 %: 90–90 %\) \| 30 av 40 \(75,0 %; 95 %: 75–75 %\) \|/u, "A1 and A2 from the file's history");
  assert.match(r, /\| J1 \| säsongen \| 0 \| 0 \| 0 av 0 \| 0 \| 0 av 0 \|/u, "J1 without the station rows is not counted");
  assert.match(r, /inte har räknat: 2026-11-22\./u, "the day säsongsfacit has not counted is named");
  assert.match(r, /\| hal sträcka \(A1\) \| veckan \| 3 \| 1 \| 3 av 4 \|/u, "the answers' share from 30 only");
  assert.match(r, /\| veckan \| 1 \| 1 \| 1 \| 0 \| 0 \| 0 \| 0 \|/u, "the accidents without duplicates");
  assert.match(r, /#### Timmarna per klass/u, "the cities' section one level down");
  assert.doesNotMatch(r, /### Storstäderna \(TROSKLAR/u);
  assert.match(r, /\| 2026-11-26 \| MET:s morgonfel\. \| Bengt \|/u); assert.doesNotMatch(r, /Långt bort/u);
  assert.match(r, /- #1800 ⏰ Frist 26\/11 2026: MET/u);
  assert.match(r, /\| C8 Småvägskartan \| ni beslutar \| öppen \|/u);
  assert.match(r, /N av \(ändrad 2026-11-14 10:00\)/u);
  assert.match(rapport(db({ arenden: null }), null), /gick inte att läsa ur GitHub/u);
  assert.match(rapport(db(), null), /Avsnittet saknas den här veckan/u);
});

test("#954 the interval: bootstrapped per day, the same every time, around the share and absent under 20", () => {
  const dagar: [number, number][] = [[2, 10], [8, 10], [5, 10], [6, 10], [3, 10]];
  const iv = intervall(dagar)!;
  assert.deepEqual(intervall(dagar), iv, "a fixed seed");
  assert.ok(iv[0] < 0.48 && iv[1] > 0.48 && iv[0] >= 0.2 && iv[1] <= 0.8, "the share 24/50 lies inside, within the days' range");
  assert.equal(intervall([[3, 19]]), null);
  assert.throws(() => granska(db({ km: {} })), /saknar sin längd/u);
  assert.throws(() => granska(db({ takt: [{ vecka: true, slag: "K", tatast_s: -1, inom60: 0, foljder: 1 }] })), /negativ/u);
  assert.match(SATS.falsklarm, /generate_series\(-1, 2\)/u, "the facit window −1..+2 h");
  assert.match(SATS.takt, /2026-11-18T18:32:00Z/u, "the voice from the road's line");
});

test("#951 körlistan: only what waits for Bengt or Axel, in words", () => {
  const k = korlistan(las("docs/KORLISTAN.md"));
  for (const r of k) {
    assert.match(r.id, /^[BCD]\d+$/u);
    assert.doesNotMatch(r.lage, /^(klar|struken)/u);
    assert.match(r.vem, /\bni\b|ert ord|Bengt|Axel/u);
  }
  const prov = "| B9 | **Ansvarstexten.** Lång text | ni beslutar texten, Claude bygger | x | y | öppen: Bengt sade ja |\n" +
    "| B3 | **Klar sak.** | ert ord | x | y | klar 17/11: bevis |\n| B4 | **Bara Claude.** | Claude | x | y | öppen |";
  assert.deepEqual(korlistan(prov), [{ id: "B9", punkt: "Ansvarstexten", vem: "ni beslutar texten, Claude bygger", lage: "öppen" }]);
});

test("#951 the files stay outside the repo, and the flow writes the report only to the private repo", () => {
  assert.ok(iRepot("docs/x.md")); assert.ok(!iRepot(join(tmpdir(), "rapport.md")));
  const f = las(".github/workflows/veckorapporten.yml");
  assert.match(f, /cron: '\d+ \d+ \* \* 1'/u, "every Monday");
  assert.match(f, /KUVOS_SKRIVNYCKEL/u); assert.match(f, /halkvakt-kuvos/u);
  assert.doesNotMatch(f, /GITHUB_STEP_SUMMARY|upload-artifact|cat "\$RUNNER_TEMP/u, "no number in the summary, an artifact or the log");
  assert.match(f, /RUNNER_TEMP/u, "the files outside the checkout");
});
