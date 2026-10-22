// Kamerafacit V2/V3 (Bengts ja 26/9, DECISIONS #380): urvalet som körbara påståenden. Funktionen i supabase/functions/kamerafacit
// hämtar och sparar; allt som bestämmer VILKA bilder som tas bor i urval.ts och prövas här.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FARA_M, V2_NATT_TAK, V2_TAK, dagsljus, kamerorVidFaror, nattbilderIDag, solhojd, taV2, valjStickprov, valjV2, vag } from "../supabase/functions/kamerafacit/urval.ts";

const sthlm = { lon: 18.07, lat: 59.33 };

test("solhöjden skiljer dag från natt: midsommar mitt på dagen högt, midvinternatt djupt under", () => {
  const mid = solhojd(sthlm.lon, sthlm.lat, new Date("2026-06-21T11:00:00Z"));
  assert.ok(mid > 50 && mid < 56, `midsommar 13:00 svensk tid: ${mid.toFixed(1)}°`);
  const natt = solhojd(sthlm.lon, sthlm.lat, new Date("2026-12-21T23:00:00Z"));
  assert.ok(natt < -40, `midvinternatt: ${natt.toFixed(1)}°`);
  assert.equal(dagsljus(sthlm, new Date("2026-12-21T11:00:00Z")), true, "december mitt på dagen är dagsljus");
  assert.equal(dagsljus(sthlm, new Date("2026-12-21T17:00:00Z")), false, "december klockan 18 svensk tid är mörkt");
});

test("V2: närmaste kamera inom 15 km per fara, en gång per kamera, ingen bortom radien", () => {
  const kams = [{ id: "A", lon: 18.00, lat: 59.30, url: "a" }, { id: "B", lon: 18.50, lat: 59.30, url: "b" }];
  const faror = [{ id: "wx:1", lon: 18.01, lat: 59.31 }, { id: "wx:2", lon: 18.02, lat: 59.30 }, { id: "wx:3", lon: 20.0, lat: 60.0 }];
  assert.deepEqual(kamerorVidFaror(faror, kams).map((k) => k.id), ["A"], "wx:1 och wx:2 delar A; wx:3 har ingen kamera inom 15 km");
  assert.equal(FARA_M, 15_000);
});

test("V2: dagsljus ⇒ varje timme; mörker ⇒ bara utan en bild de senaste tolv timmarna", () => {
  assert.equal(taV2(true, true), true);
  assert.equal(taV2(false, false), true);
  assert.equal(taV2(false, true), false);
});

test("V3: bara i dagsljus, två stycken, samma timme ger samma val", () => {
  const kams = Array.from({ length: 10 }, (_, i) => ({ id: `K${i}`, lon: 18 + i * 0.1, lat: 59.3, url: "" }));
  const dag = new Date("2026-12-21T11:00:00Z"), natt = new Date("2026-12-21T23:00:00Z");
  const val = valjStickprov(kams, 491_000, dag);
  assert.equal(val.length, 2);
  assert.deepEqual(valjStickprov(kams, 491_000, dag).map((k) => k.id), val.map((k) => k.id), "deterministiskt per timme");
  assert.equal(valjStickprov(kams, 491_000, natt).length, 0, "ingen stickprovsbild i mörker");
});

test("vägen i hinken bär timmen, som kontaktarket läser", () => {
  assert.equal(vag("v2", new Date("2026-09-26T07:30:00Z"), "SE_STA_CAMERA_VViS_2241_K1"),
    "v2/2026-09-26/SE_STA_CAMERA_VViS_2241_K1-h497335.jpg");
});

test("V2:s nattkvot (#676): högst 30 nattbilder per dygn, dagsljuset får resten av taket", () => {
  const kams = Array.from({ length: 200 }, (_, i) => ({ id: `K${i}`, lon: 18, lat: 59, url: "u" }));
  const morker = () => false, ljus = () => true, ingen = () => false;
  assert.equal(V2_NATT_TAK, 30); assert.equal(V2_TAK, 150);
  assert.equal(valjV2(kams, morker, ingen, 0, 0).length, 30, "midnatt: bara nattkvoten, inte hela taket");
  assert.equal(valjV2(kams, morker, ingen, 30, 30).length, 0, "nattkvoten slut: inga fler nattbilder");
  assert.equal(valjV2(kams, ljus, ingen, 30, 30).length, 120, "dagsljuset får resten av taket");
  assert.equal(valjV2(kams, ljus, ingen, 150, 30).length, 0, "taket nått: inget mer");
  assert.equal(valjV2(kams, morker, () => true, 0, 0).length, 0, "en kamera med bild de senaste tolv timmarna tas inte i mörker");
  const blandat = (k: { id: string }) => Number(k.id.slice(1)) % 2 === 0;
  const val = valjV2(kams, blandat, ingen, 140, 25);
  assert.equal(val.length, 10, "taket begränsar"); assert.ok(val.filter((k) => !blandat(k)).length <= 5, "nattkvoten begränsar");
});

test("V2: dygnets nattbilder räknas ur namnens kamera och timme", () => {
  const kams = [{ id: "A", lon: 18.07, lat: 59.33, url: "a" }];
  const h = (iso: string) => Math.floor(new Date(iso).getTime() / 3_600_000);
  assert.equal(nattbilderIDag([{ k: "A", h: h("2026-12-21T00:00:00Z") }, { k: "A", h: h("2026-12-21T11:00:00Z") }, { k: "X", h: 1 }], kams), 1,
    "midnatt räknas, mitt på dagen inte, okänd kamera inte");
});
