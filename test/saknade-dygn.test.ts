import { test } from "node:test";
import assert from "node:assert/strict";
import { saknadeDagar } from "../publish/vaktdiagnos.ts";

// Kort #252, DECISIONS #352: ett dygn utan arkivrader efter arkivets början ska synas; ett dygn före arkivet ska inte det.
const nu = new Date("2026-09-25T12:00:00Z");
const alla = (fran: string, till: string) => {
  const s = new Set<string>();
  for (let d = new Date(`${fran}T00:00:00Z`); d.toISOString().slice(0, 10) <= till; d = new Date(d.getTime() + 86_400_000)) s.add(d.toISOString().slice(0, 10));
  return s;
};

test("inget saknas när varje dygn har rader", () => {
  assert.deepEqual(saknadeDagar(alla("2026-09-20", "2026-09-25"), 5, "2026-08-24", nu), []);
});

test("ett raderat dygn mitt i fönstret syns", () => {
  const med = alla("2026-09-20", "2026-09-25"); med.delete("2026-09-22");
  assert.deepEqual(saknadeDagar(med, 5, "2026-08-24", nu), ["2026-09-22"]);
});

test("dygn före arkivets början saknas inte — men ett hål efter den gör det", () => {
  const med = alla("2026-09-23", "2026-09-25"); med.delete("2026-09-24");
  assert.deepEqual(saknadeDagar(med, 5, "2026-09-23", nu), ["2026-09-24"]);
});

test("utan känd början räknas hela fönstret", () => {
  assert.deepEqual(saknadeDagar(alla("2026-09-22", "2026-09-25"), 5, null, nu), ["2026-09-20", "2026-09-21"]);
});
