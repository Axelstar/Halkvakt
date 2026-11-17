import { test } from "node:test";
import assert from "node:assert/strict";
import { medOmprov, shaOrd, OMPROV_MAX, OMPROV_S } from "../supabase/functions/vakthund/omprov.ts";

// DECISIONS #889: vid varje publicering byter CDN manifestet och live.json omkring en sekund isär, och vakthunden larmade 17/11
// (ärende #1647) på en hämtning i just den sekunden. Kontrollsumman prövas därför om innan larmet. Proven här gäller slingan;
// hämtningen och larmtexten sitter i vakthundens index.ts.

/** Ett prov som svarar i tur och ordning ur listan, och räknar anropen och väntorna. */
const upplagg = (svar: boolean[]) => {
  const logg = { prov: 0, vantor: 0 };
  return {
    logg,
    prov: async () => svar[Math.min(logg.prov++, svar.length - 1)],
    vanta: async () => { logg.vantor++; },
  };
};
const lika = (b: boolean) => b;

test("stämmer det första provet görs inget omprov och ingen väntan", async () => {
  const u = upplagg([true]);
  const r = await medOmprov(u.prov, lika, u.vanta);
  assert.deepEqual([r.svar, r.omprov, u.logg.prov, u.logg.vantor], [true, 0, 1, 0]);
  assert.equal(shaOrd(r.svar, r.omprov), "stämmer");
});

test("glappet 17/11: första provet stämmer inte, omprovet gör det — inget larm, och raden säger att ett omprov behövdes", async () => {
  const u = upplagg([false, true]);
  const r = await medOmprov(u.prov, lika, u.vanta);
  assert.deepEqual([r.svar, r.omprov, u.logg.prov, u.logg.vantor], [true, 1, 2, 1]);
  assert.equal(shaOrd(r.svar, r.omprov), "stämmer efter 1 omprov");
});

test("stämmer först det andra omprovet räcker det också", async () => {
  const u = upplagg([false, false, true]);
  const r = await medOmprov(u.prov, lika, u.vanta);
  assert.deepEqual([r.svar, r.omprov, u.logg.prov, u.logg.vantor], [true, 2, 3, 2]);
  assert.equal(shaOrd(r.svar, r.omprov), "stämmer efter 2 omprov");
});

test("ett verkligt fel står kvar genom omproven och larmar: högst OMPROV_MAX omprov, sedan MISMATCH", async () => {
  const u = upplagg([false]);
  const r = await medOmprov(u.prov, lika, u.vanta);
  assert.deepEqual([r.svar, r.omprov, u.logg.prov, u.logg.vantor], [false, OMPROV_MAX, OMPROV_MAX + 1, OMPROV_MAX]);
  assert.equal(shaOrd(r.svar, r.omprov), "MISMATCH");
});

test("med noll omprov är slingan den gamla vakthunden: ett prov, och felet larmar direkt", async () => {
  const u = upplagg([false, true]);
  const r = await medOmprov(u.prov, lika, u.vanta, 0);
  assert.deepEqual([r.svar, r.omprov, u.logg.prov, u.logg.vantor], [false, 0, 1, 0]);
});

test("svaret som lämnas är det sista provets, inte det första", async () => {
  let n = 0;
  const r = await medOmprov(async () => ++n, (x) => x >= 2, async () => {});
  assert.deepEqual([r.svar, r.omprov], [2, 1]);
});

test("omproven ryms i vakthundens körning: högst tio sekunders väntan, och glappet är omkring en sekund", () => {
  assert.equal(OMPROV_MAX, 2);
  assert.equal(OMPROV_S, 5);
  assert.ok(OMPROV_MAX * OMPROV_S <= 10);
});
