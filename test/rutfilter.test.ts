import { test } from "node:test";
import assert from "node:assert/strict";
import { AlertEngine } from "../engine/src/engine.ts";
import { segmentPrognos, holdoutRader, type Ankare } from "../engine/src/segment.ts";
import { farorNaraRutten, ankareNaraRutten, FARA_MARGINAL_KM, ANKARE_MARGINAL_KM } from "../engine/src/rutfilter.ts";
import type { Fix, Hazard } from "../engine/src/types.ts";

// Kort #244, DECISIONS #360: filtret tar bort bara det som aldrig kan påverka utfallet — motorn och prognosen ger samma svar.

const LINE: [number, number][] = [[15.0, 59.0], [15.5, 59.0]];   // ~29 km österut
function spar(): Fix[] {
  const ut: Fix[] = [];
  const mps = 80 / 3.6, mPerDeg = 111_320 * Math.cos((59 * Math.PI) / 180);
  for (let t = 0; t <= 1400; t += 5) {
    const lon = 15.0 + (mps * t) / mPerDeg;
    if (lon > 15.5) break;
    ut.push({ t, lon, lat: 59.0, speedKmh: 80, headingDeg: 90 } as Fix);
  }
  return ut;
}
const kam = (id: string, lon: number, lat: number): Hazard => ({ id, kind: "camera", lon, lat, bearing: null }) as Hazard;
const faror: Hazard[] = [
  kam("nara", 15.1, 59.0),
  ...Array.from({ length: 300 }, (_, i) => kam(`fjarran${i}`, 12 + (i % 20) * 0.1, 56 + Math.floor(i / 20) * 0.1)),   // 300 km bort
  { id: "olycka", kind: "accident", lon: 15.25, lat: 59.0, meta: { severity: 5 } } as unknown as Hazard,                 // talar ~10 km före
  // Ett långt segment som korsar rutten men vars båda brytpunkter ligger över 100 km bort: rutan måste skära, inte bara punkterna.
  { id: "seg:lang", kind: "slippery_segment", line: [[15.3, 58.0], [15.3, 60.0]], meta: { code: 2, info: [] } } as Hazard,
];

test("motorn ger samma varningar och samma undanträngda med och utan filtret", () => {
  const kor = (h: Hazard[]) => {
    const m = new AlertEngine(h); const sup: unknown[] = [];
    m.onSuppressed = (c) => sup.push(c);
    return { alerts: m.run(spar()), sup };
  };
  const nara = farorNaraRutten(faror, LINE);
  assert.ok(nara.length < 10, `filtret tar bort de fjärran: ${nara.length} kvar av ${faror.length}`);
  assert.ok(nara.some((h) => h.id === "seg:lang"), "segmentet som korsar rutten är kvar");
  const med = kor(nara);
  assert.ok(med.alerts.length >= 3, `jämförelsen bär varningar: ${med.alerts.map((a) => a.hazardId).join(", ")}`);
  assert.deepEqual(med, kor(faror));
});

test("olyckan på tio kilometers avstånd är kvar — marginalen är motorns längsta räckvidd", () => {
  assert.ok(FARA_MARGINAL_KM >= 10);
  const olyckaBredvid = { id: "o2", kind: "accident", lon: 15.25, lat: 59.0 + 9 / 110, meta: {} } as unknown as Hazard;   // 9 km norr om rutten
  assert.ok(farorNaraRutten([olyckaBredvid], LINE).length === 1);
});

test("prognosen och holdouten blir desamma med och utan filtret", () => {
  const ankare: Ankare[] = [];
  for (let i = 0; i < 400; i++) ankare.push({ id: `a${i}`, lon: 11 + (i % 40) * 0.2, lat: 55.5 + Math.floor(i / 40) * 0.6, yta: (i % 7) - 2 });
  ankare.push({ id: "pa-rutten", lon: 15.2, lat: 59.0, yta: 0.5 });
  const nara = ankareNaraRutten(ankare, LINE);
  assert.ok(nara.length < ankare.length / 2, `filtret tar bort de fjärran ankarna: ${nara.length} kvar av ${ankare.length}`);
  assert.deepEqual(segmentPrognos(LINE, nara), segmentPrognos(LINE, ankare));
  assert.deepEqual(holdoutRader(LINE, nara), holdoutRader(LINE, ankare));
  assert.ok(ANKARE_MARGINAL_KM > 50);
});
