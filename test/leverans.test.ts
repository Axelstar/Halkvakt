import { test } from "node:test";
import assert from "node:assert/strict";
import { leveranstid } from "../supabase/functions/ingest-live/leverans.ts";

// Leveranstiden (DECISIONS #741, tillägg 28/10): hur gammal en ny väderobservation är när livemotorn får den, och Trafikverkets egen
// del när ModifiedTime finns. Raderade objekt och objekt utan mättid räknas inte.
const NU = Date.parse("2026-10-28T16:03:30Z");
const obs = (sample: string, modified?: string, deleted = false) =>
  ({ Id: "x", Deleted: deleted, ModifiedTime: modified, Observation: { Sample: sample } });

test("åldern räknas från mättiden till hämtningen, och Trafikverkets del från mättiden till ändringstiden", () => {
  const r = leveranstid([
    obs("2026-10-28T16:00:00Z", "2026-10-28T16:02:00Z"),   // 210 s gammal, Trafikverket 120 s
    obs("2026-10-28T16:00:00Z", "2026-10-28T16:02:40Z"),   // 210 s, 160 s
    obs("2026-10-28T15:50:00Z"),                           // 810 s, ingen ändringstid
    obs("2026-10-28T16:00:00Z", undefined, true),          // raderad: räknas inte
    { Id: "y", Observation: {} },                          // ingen mättid: räknas inte
  ], NU);
  assert.deepEqual(r, { n: 3, alder_median_s: 210, alder_p95_s: 810, alder_max_s: 810, trv_n: 2, trv_median_s: 160 });
});

test("en körning utan nya mätningar ger n 0 och inga tal, aldrig noll sekunder", () => {
  assert.deepEqual(leveranstid([], NU), { n: 0, alder_median_s: null, alder_p95_s: null, alder_max_s: null, trv_n: 0, trv_median_s: null });
});
