// Kvalitetstavlan på admin.halkvakt.se (kort #682, DECISIONS #973): gränserna (TROSKLAR-KVALITETSTAVLAN §8), minsta antalet och
// intervallen (§7), och perioderna.
import { test } from "node:test";
import assert from "node:assert/strict";
import { type KvRad, farg, kvalitetVy, period } from "../supabase/functions/admin/kvalitetsvy.ts";

const r = (dag: string, lager: string, kalla: string, matt: string, n: number, k: number): KvRad => ({ dag, lager, kalla, matt, n, k });
const dagar = (fran: string, antal: number) => Array.from({ length: antal }, (_, i) => new Date(Date.parse(fran + "T00:00:00Z") + i * 864e5).toISOString().slice(0, 10));

test("farg: gränserna i §8, med gränsvärdet i det bättre bandet", () => {
  assert.equal(farg("tackning", 0.8), "gron"); assert.equal(farg("tackning", 0.7999), "gul");
  assert.equal(farg("tackning", 0.6), "gul"); assert.equal(farg("tackning", 0.5999), "rod");
  assert.equal(farg("lyft", 4), "gron"); assert.equal(farg("lyft", 2), "gul"); assert.equal(farg("lyft", 1.99), "rod");
  assert.equal(farg("risk", 3), "gron"); assert.equal(farg("risk", 1.5), "gul"); assert.equal(farg("risk", 1.49), "rod");
  assert.equal(farg("risk", null), null);
});

test("period: bara Halkvakt får färg i täckningen, och under 20 i nämnaren visas bara antalet", () => {
  const rader = dagar("2026-11-02", 7).flatMap((d) => [
    r(d, "HV", "FR", "tackning", 10, 9), r(d, "A1", "FR", "tackning", 10, 9), r(d, "K", "VL", "tackning", 2, 1)]);
  const p = period("t", "t", rader);
  assert.equal(p.tackning.HV.FR.farg, "gron");
  assert.equal(p.tackning.HV.FR.varde, 0.9);
  assert.equal(p.tackning.A1.FR.farg, null);
  assert.equal(p.tackning.A1.FR.varde, 0.9);
  assert.equal(p.tackning.K.VL.n, 14);
  assert.equal(p.tackning.K.VL.varde, null);
  assert.ok(p.tackning.HV.FR.lo! <= 0.9 && p.tackning.HV.FR.hi! >= 0.9);
});

test("period: lyftet är träffsäkerheten delad med basen, och lägre lyft än snöflingan blir rött", () => {
  const rader = dagar("2026-11-02", 7).flatMap((d) => [
    r(d, "-", "FR", "bas", 100, 5),          // basen 5 %
    r(d, "A2", "FR", "traff", 10, 3),        // 30 % → lyft 6
    r(d, "J1", "FR", "traff", 10, 1),        // 10 % → lyft 2
    r(d, "K", "FR", "traff", 10, 0.5)]);     // 5 % → lyft 1, under J1
  const p = period("t", "t", rader);
  assert.ok(Math.abs(p.lyft.A2.FR.varde! - 6) < 1e-9);
  assert.equal(p.lyft.A2.FR.farg, "gron");
  assert.equal(p.lyft.J1.FR.farg, null);
  assert.equal(p.lyft.K.FR.farg, "rod");
  assert.equal(p.lyft.K.FR.motJ1, true);
  assert.equal(p.lyft.A2.FR.motJ1, undefined);
});

test("period: den relativa risken kräver 20 olyckor under varning", () => {
  const rader = dagar("2026-11-02", 10).flatMap((d) => [
    r(d, "HV", "OL", "risk_varn", 1e5, 2), r(d, "HV", "OL", "risk_utan", 1e6, 1),
    r(d, "A1", "OL", "risk_varn", 1e5, 1), r(d, "A1", "OL", "risk_utan", 1e6, 1)]);
  const p = period("t", "t", rader);
  assert.ok(Math.abs(p.risk.HV.varde! - 20) < 1e-9);
  assert.equal(p.risk.HV.farg, "gron");
  assert.equal(p.risk.A1.kV, 10);
  assert.equal(p.risk.A1.varde, null);
});

test("kvalitetVy: säsongen, sju dygn och veckorna, och samma rader ger samma intervall", () => {
  const rader = dagar("2026-11-02", 14).map((d, i) => r(d, "HV", "FR", "tackning", 10, i % 3 ? 8 : 5));
  const a = kvalitetVy(rader), b = kvalitetVy(rader);
  assert.deepEqual(a.perioder.map((p) => p.id), ["sasong", "7d", "2026-V46", "2026-V45"]);
  assert.equal(a.perioder[1].fran, "2026-11-09");
  assert.equal(a.perioder[0].dygn, 14);
  assert.deepEqual(a.perioder[0].tackning.HV.FR, b.perioder[0].tackning.HV.FR);
  assert.deepEqual(kvalitetVy([]), { fran: null, till: null, perioder: [] });
});
