import { test } from "node:test";
import assert from "node:assert/strict";
import { skaTrycka, senasteTryck, FROSTTRYCK_MARK, GALLRING_DYGN, TRYCK_INTERVALL_D } from "../supabase/functions/vakthund/frosttryck.ts";

// Kort #252, DECISIONS #352: frostflödena trycks kl 09 UTC medan frosten varar. Sedan 10/10 (DECISIONS #511) varannan dag,
// eftersom gallringen tunnar efter tre dygn i stället för sju.
const t = (iso: string) => new Date(iso);

test("mitt i natten trycks ingenting, inte ens första gången", () => {
  assert.equal(skaTrycka(t("2026-11-02T04:07:00Z"), null), false);
});

test("första gången kl 09 UTC trycks flödena", () => {
  assert.equal(skaTrycka(t("2026-11-02T09:07:00Z"), null), true);
});

test("ett dygn efter förra tryckningen trycks ingenting", () => {
  assert.equal(skaTrycka(t("2026-11-03T09:07:00Z"), t("2026-11-02T09:07:30Z")), false);
});

test("två dygn efter trycks flödena igen, fast varvet landar några sekunder tidigare", () => {
  assert.equal(skaTrycka(t("2026-11-04T09:07:05Z"), t("2026-11-02T09:07:30Z")), true);
});

test("två dygn efter men fel timme trycks ingenting", () => {
  assert.equal(skaTrycka(t("2026-11-04T10:07:00Z"), t("2026-11-02T09:07:30Z")), false);
});

// Ingen frostnatt får gallras innan den läses: den äldsta raden en tryckning ser är förra tryckningens (TRYCK_INTERVALL_D
// dygn plus slacken), och den ska vara yngre än gallringens gräns.
test("tryckningarna kommer tätare än gallringen", () => {
  assert.ok(TRYCK_INTERVALL_D * 24 + 2 < GALLRING_DYGN * 24, `${TRYCK_INTERVALL_D} dygn + slack mot ${GALLRING_DYGN} dygn`);
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
