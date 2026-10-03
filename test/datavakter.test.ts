// Datavakterna (kort #292, DECISIONS #452): vakthundens läsning av publiceringens noter. Noterna har den form
// publish/snapshot-core.ts skriver dem.
import { test } from "node:test";
import assert from "node:assert/strict";
import { I_RAD, datavakter, noter, olasbar, rad, tystade } from "../supabase/functions/vakthund/datavakter.ts";

const KARANTAN = "karantän: 2 station(er) tysta efter brott mot #75: 1106, 2135";
const LANGSAM = "långsam vakt: 1 station(er) tysta, ytan ≥ 6 ° under luften ett helt dygn: 1722";
const KARANTAN_FEL = "karantän: weather_observations ej läsbar (timeout) — ingen station i karantän";
const RADAR_FEL = "radar: radar_precip ej läsbar (relation saknas) — regn blir null på varje segment";

test("noter: bara publiceras huvudsvar räknas, inte grannländerna eller ett fel", () => {
  assert.deepEqual(noter(JSON.stringify({ ok: true, segments: 818, notes: [KARANTAN] })), [KARANTAN]);
  assert.equal(noter(JSON.stringify({ ok: true, land: "grannar", fi: {} })), null);
  assert.equal(noter(JSON.stringify({ ok: false, error: "x" })), null);
  assert.equal(noter("inte json"), null);
  assert.equal(noter(null), null);
});

test("olasbar och tystade läser notens form", () => {
  assert.equal(olasbar(KARANTAN_FEL), "karantän");
  assert.equal(olasbar(RADAR_FEL), "radar");
  assert.equal(olasbar(KARANTAN), null);
  assert.deepEqual(tystade(KARANTAN), { vakt: "karantän", antal: 2, stationer: ["1106", "2135"] });
  assert.deepEqual(tystade(LANGSAM), { vakt: "långsam vakt", antal: 1, stationer: ["1722"] });
  assert.equal(tystade(KARANTAN_FEL), null);
});

test(`datavakter: en enstaka oläsbar publicering larmar inte, ${I_RAD} i rad gör det`, () => {
  const en = datavakter([[KARANTAN_FEL], [KARANTAN], [KARANTAN]]);
  assert.deepEqual([en.olasbara, en.ihallande], [["karantän"], []], "en miss är fail-soft");
  const tre = datavakter([[KARANTAN_FEL, RADAR_FEL], [KARANTAN_FEL], [KARANTAN_FEL, LANGSAM]]);
  assert.deepEqual(tre.ihallande, ["karantän"], "karantänen tre i rad larmar; radarn bara i den nyaste");
  assert.deepEqual(datavakter([[KARANTAN_FEL], [KARANTAN_FEL]]).ihallande, [], "färre publiceringar än I_RAD larmar aldrig");
});

test("rad: de tystade stationerna per vakt, och det som inte gick att läsa nu", () => {
  assert.equal(rad(datavakter([[KARANTAN, LANGSAM]]), 1), "datavakterna: karantän 2 (1106, 2135) · långsam vakt 1 (1722)");
  assert.equal(rad(datavakter([[RADAR_FEL]]), 1), "datavakterna: inga stationer tystade · oläsbart nu: radar");
  assert.equal(rad(datavakter([]), 0), "datavakterna: inget svar från publiceringen den senaste timmen");
});
