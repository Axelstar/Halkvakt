// Segmentprognosen (engine/src/segment.ts, kort #38b steg 4, DECISIONS #324/#325): rå avståndsviktning utan offset.
// Proven är små och geometriska med känd sanning — samma anda som grind A:s självtest.
import { test } from "node:test";
import assert from "node:assert/strict";
import { segmentPrognos, provpunkter, skatta, holdoutRader, narmastLangs, STEG_KM, UPPMATT_KM, FRYS_C, type Ankare } from "../engine/src/segment.ts";

// Rak linje österut vid 56° N: 0,01° lon ≈ 0,62 km. Linjen är ≈ 31 km.
const LINE: [number, number][] = [[13.0, 56.0], [13.5, 56.0]];
const ank = (id: string, lon: number, yta: number, lat = 56.0): Ankare => ({ id, lon, lat, yta });

test("provpunkter: var annan kilometer från 0, sista brytpunkten alltid med, lägena stiger", () => {
  const pts = provpunkter(LINE);
  assert.equal(pts[0].km, 0);
  assert.equal(pts[1].km, STEG_KM);
  for (let i = 1; i < pts.length; i++) assert.ok(pts[i].km > pts[i - 1].km);
  const sist = pts[pts.length - 1];
  assert.equal(sist.lon, 13.5); assert.equal(sist.lat, 56.0);
  assert.ok(sist.km > 30 && sist.km < 32, `längden ${sist.km}`);
  assert.ok(pts.length >= 16 && pts.length <= 18, `antal ${pts.length}`);
});

test("ett ankare på punkten ⇒ uppmätt, dess yta, avstånd 0", () => {
  const s = skatta({ lon: 13.1, lat: 56.0 }, [ank("a", 13.1, -2.3)]);
  assert.equal(s.yta, -2.3); assert.equal(s.n, 1); assert.ok(s.narm! < 0.001);
});

test("två ankare på samma avstånd ⇒ medelvärdet (grind A:s vikt 1/max(km, 1))", () => {
  const s = skatta({ lon: 13.1, lat: 56.0 }, [ank("v", 13.08, 0), ank("h", 13.12, 2)]);
  assert.ok(Math.abs(s.yta! - 1) < 1e-9, `yta ${s.yta}`); assert.equal(s.n, 2);
});

test("nära väger tyngre än långt, men aldrig tyngre än 1 km (max(km, 1))", () => {
  // 0,3 km och 6,2 km bort: vikterna 1/1 och 1/6,2 — inte 1/0,3.
  const s = skatta({ lon: 13.1, lat: 56.0 }, [ank("nara", 13.105, 0), ank("langt", 13.2, 10)]);
  const w1 = 1, w2 = 1 / (6.2);
  const vantat = (w1 * 0 + w2 * 10) / (w1 + w2);
  assert.ok(Math.abs(s.yta! - vantat) < 0.05, `yta ${s.yta} mot ${vantat}`);
});

test("högst fem ankare räknas — det sjätte och sjunde ändrar ingenting", () => {
  const fem = [1, 2, 3, 4, 5].map((i) => ank(`a${i}`, 13.1 + i * 0.02, i));          // 1,2 … 6,2 km
  const sju = [...fem, ank("a6", 13.1 + 6 * 0.02, 40), ank("a7", 13.1 + 7 * 0.02, -40)];
  const s5 = skatta({ lon: 13.1, lat: 56.0 }, fem), s7 = skatta({ lon: 13.1, lat: 56.0 }, sju);
  assert.equal(s7.n, 5); assert.equal(s7.yta, s5.yta); assert.equal(s7.narm, s5.narm);
});

test("inget ankare inom 50 km ⇒ okänt: yta null, status 0", () => {
  // 1° lon ≈ 62 km vid 56° N.
  const pr = segmentPrognos([[13.0, 56.0], [13.02, 56.0]], [ank("langt", 14.0, -5)]);
  assert.ok(pr.p.length >= 1);
  for (const q of pr.p) { assert.equal(q[1], null); assert.equal(q[2], null); assert.equal(q[3], 0); assert.equal(q[4], 0); assert.equal(q[5], 0); }
});

test("status: ankare inom facitradien ⇒ uppmätt (2), längre bort ⇒ modellerat (1)", () => {
  const nara = segmentPrognos([[13.0, 56.0], [13.01, 56.0]], [ank("a", 13.0, 0)]);
  assert.equal(nara.p[0][4], 2); assert.ok(nara.p[0][2]! <= UPPMATT_KM);
  const langt = segmentPrognos([[13.0, 56.0], [13.01, 56.0]], [ank("a", 13.16, 0)]);   // ≈ 10 km
  assert.equal(langt.p[0][4], 1); assert.ok(langt.p[0][2]! > UPPMATT_KM);
});

test("frysflaggan följer A3:s klassgräns på den oavrundade skattningen", () => {
  const vid = (yta: number) => segmentPrognos([[13.0, 56.0], [13.01, 56.0]], [ank("a", 13.0, yta)]).p[0][5];
  assert.equal(vid(0.5), 1); assert.equal(vid(FRYS_C), 1); assert.equal(vid(1.5), 0);
  // 1,04 avrundas till 1,0 i raden men ligger över gränsen — flaggan ska säga 0.
  const r = segmentPrognos([[13.0, 56.0], [13.01, 56.0]], [ank("a", 13.0, 1.04)]).p[0];
  assert.equal(r[1], 1); assert.equal(r[5], 0);
});

test("raden är kompakt och avrundad: km, yta och avstånd med högst en decimal", () => {
  const pr = segmentPrognos(LINE, [ank("a", 13.13, -0.37), ank("b", 13.31, 2.11)]);
  assert.equal(pr.steg_km, STEG_KM);
  for (const q of pr.p) {
    assert.equal(q.length, 6);
    for (const v of [q[1], q[2]]) if (v !== null) assert.equal(v, Math.round(v * 10) / 10);
  }
});

test("närmaste punkt på linjen: avstånd och läge längs rutten", () => {
  // Mitt på LINE (13,25) ⇒ avstånd ≈ 0, läge ≈ halva längden; 0,05° norr om ⇒ ≈ 5,6 km bort.
  const mitt = narmastLangs({ lon: 13.25, lat: 56.0 }, LINE);
  assert.ok(mitt.km < 0.01, `avstånd ${mitt.km}`); assert.ok(mitt.vid > 15 && mitt.vid < 16, `läge ${mitt.vid}`);
  const norr = narmastLangs({ lon: 13.25, lat: 56.05 }, LINE);
  assert.ok(norr.km > 5.4 && norr.km < 5.8, `avstånd ${norr.km}`);
  // Bortom ändpunkten klipps läget till ändpunkten.
  const efter = narmastLangs({ lon: 13.6, lat: 56.0 }, LINE);
  assert.ok(efter.vid > 30 && efter.vid < 32, `läge ${efter.vid}`); assert.ok(efter.km > 6, `avstånd ${efter.km}`);
});

test("holdout: stationer inom facitradien skattas ur de ÖVRIGA och loggas med sin egen mätning, sorterade efter läge", () => {
  const a = [ank("mitt", 13.25, 3), ank("nara", 13.1, 1), ank("norr", 13.25, 0, 56.05), ank("langt", 13.25, 9, 56.1)];   // norr 5,6 km, langt 11 km från linjen
  const h = holdoutRader(LINE, a);
  assert.deepEqual(h.map((r) => r[1]), ["nara", "mitt"]);                 // bara de två på linjen, i km-ordning
  const mitt = h[1];
  assert.equal(mitt[2], 3);                                               // egen mätning
  // Skattningen är exakt vad de ÖVRIGA tre ger (1 på 9 km, 0 på 5,6 km, 9 på 11 km) — aldrig den egna trean.
  const utanSig = skatta({ lon: 13.25, lat: 56.0 }, a.filter((x) => x.id !== "mitt"));
  assert.equal(mitt[3], Math.round(utanSig.yta! * 10) / 10);
  assert.notEqual(mitt[3], 3);
  assert.equal(mitt[5], 3);                                               // tre övriga ankare bidrar
  assert.ok(mitt[0] > 15 && mitt[0] < 16, `läge ${mitt[0]}`);
  // Ensam station på linjen utan grannar inom 50 km ⇒ skattning null, inte sin egen mätning.
  const ensam = holdoutRader(LINE, [ank("ensam", 13.25, -1)]);
  assert.equal(ensam.length, 1); assert.equal(ensam[0][3], null); assert.equal(ensam[0][5], 0);
});

test("determinism: samma indata ⇒ byte-identisk rad", () => {
  const a = [ank("a", 13.13, -0.37), ank("b", 13.31, 2.11), ank("c", 13.44, -1.9)];
  assert.equal(JSON.stringify(segmentPrognos(LINE, a)), JSON.stringify(segmentPrognos(LINE, [...a].reverse())));
});
