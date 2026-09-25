import { test } from "node:test";
import assert from "node:assert/strict";
import { skaTrycka, senasteTryck, FROSTTRYCK_MARK } from "../supabase/functions/vakthund/frosttryck.ts";

// Kort #252, DECISIONS #352: frostflödena trycks kl 09 UTC och högst var sjunde dygn medan frosten varar.
const t = (iso: string) => new Date(iso);

test("mitt i natten trycks ingenting, inte ens första gången", () => {
  assert.equal(skaTrycka(t("2026-11-02T04:07:00Z"), null), false);
});

test("första gången kl 09 UTC trycks flödena", () => {
  assert.equal(skaTrycka(t("2026-11-02T09:07:00Z"), null), true);
});

test("sex dygn efter förra tryckningen trycks ingenting", () => {
  assert.equal(skaTrycka(t("2026-11-08T09:07:00Z"), t("2026-11-02T09:07:30Z")), false);
});

test("sju dygn efter trycks flödena igen, fast varvet landar några sekunder tidigare", () => {
  assert.equal(skaTrycka(t("2026-11-09T09:07:05Z"), t("2026-11-02T09:07:30Z")), true);
});

test("sju dygn efter men fel timme trycks ingenting", () => {
  assert.equal(skaTrycka(t("2026-11-09T10:07:00Z"), t("2026-11-02T09:07:30Z")), false);
});

test("förra tryckningen är den senaste markerade kommentaren, inte den senaste kommentaren", () => {
  const issue = { body: "frosten är här", created_at: "2026-11-02T04:07:00Z" };
  const kommentarer = [
    { body: `${FROSTTRYCK_MARK} tryckt`, created_at: "2026-11-02T09:07:30Z" },
    { body: "Bengt: tack", created_at: "2026-11-05T18:00:00Z" },
  ];
  assert.deepEqual(senasteTryck(issue, kommentarer), t("2026-11-02T09:07:30Z"));
});

test("en issue som själv bar tryckningen räknas, en utan markör gör det inte", () => {
  assert.deepEqual(senasteTryck({ body: `${FROSTTRYCK_MARK} x`, created_at: "2026-11-02T09:07:00Z" }, []), t("2026-11-02T09:07:00Z"));
  assert.equal(senasteTryck({ body: "x", created_at: "2026-11-02T09:07:00Z" }, []), null);
});
