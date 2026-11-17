import { test } from "node:test";
import assert from "node:assert/strict";
import { byggeLarm, byggeRad, type ByggeLage } from "../supabase/functions/vakthund/bygge.ts";

// Körlistan B6, DECISIONS #896: vakthundens rad och larm om publiceringens byggtid. Räkningen sker i sql/115 och prövas i
// integrationsprovet; här prövas orden, och att larmet bara kommer när databasen säger över.

const lage = (o: Partial<ByggeLage> = {}): ByggeLage => ({
  pa_sedan: null, referens_ms: 8293, referens_n: 4950, referens_dygn: "6.9", senaste_ms: 8100, senaste_t: "2026-11-17T10:24:00Z",
  rader: 5000, par_i_rad: 0, over: false, ...o });

test("#896 raden: brytarna av ⇒ medianen de senaste dygnen, och att villkoret gäller från påslaget", () => {
  const r = byggeRad(lage(), 30);
  assert.match(r, /5000 körningar sparade \(30 nya\)/);
  assert.match(r, /median 8,3 s de senaste 6,9 dygn/);
  assert.match(r, /senaste 8,1 s/);
  assert.match(r, /brytarna är av, villkoret i #833 gäller från påslaget/);
});

test("#896 raden: brytarna på ⇒ medianen veckan före påslaget och gränsen, det dubbla", () => {
  const r = byggeRad(lage({ pa_sedan: "2026-11-20T09:00:00Z" }), 30);
  assert.match(r, /median 8,3 s veckan före påslaget \(4950 körningar på 6,9 dygn\)/);
  assert.match(r, /gräns 16,6 s/);
  assert.doesNotMatch(r, /brytarna är av/);
});

test("#896 raden: inga rader, och påslag utan referens, sägs rakt ut", () => {
  assert.equal(byggeRad(lage({ rader: 0 }), 0), "publiceringens bygge: inga körningar sparade än");
  assert.match(byggeRad(lage({ pa_sedan: "2026-11-20T09:00:00Z", referens_ms: null, referens_n: 0, referens_dygn: null }), 3),
    /ingen referens före påslaget, villkoret i #833 går inte att pröva/);
  assert.match(byggeRad(lage({ referens_ms: null, referens_n: 0, referens_dygn: null }), 3), /ingen median än/);
});

test("#896 larmet: bara när databasen säger över, och aldrig utan referens", () => {
  assert.equal(byggeLarm(lage()), null);
  assert.equal(byggeLarm(lage({ par_i_rad: 2 })), null, "två par men brytarna av ⇒ databasen säger inte över");
  assert.equal(byggeLarm(lage({ over: true, referens_ms: null })), null);
  const l = byggeLarm(lage({ pa_sedan: "2026-11-20T09:00:00Z", over: true, par_i_rad: 2, senaste_ms: 18900 }));
  assert.ok(l);
  assert.match(l!, /två körningar i rad/);
  assert.match(l!, /2 par den senaste timmen, senaste 18,9 s mot medianen 8,3 s/);
  assert.match(l!, /#833/);
  assert.match(l!, /sql\/107/);
});
