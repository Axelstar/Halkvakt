// Appstatistiken (DECISIONS #746): servern sparar dagen, kanalen, versionen och räknarna — inget annat, och bara avslutade dygn.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rad } from "../supabase/functions/appbruk/rad.ts";

const IDAG = "2026-11-03";

test("appbruk: en riktig dag sparas med bara de fyra fälten", () => {
  const r = rad({ dag: "2026-11-02", kanal: "appstore", ver: "0.4.0", r: { oppnad: 3, varning_halka: 2 }, lat: 59.3, id: "abc" }, IDAG);
  assert.deepEqual(r, { dag: "2026-11-02", kanal: "appstore", ver: "0.4.0", r: { oppnad: 3, varning_halka: 2 } });
});

test("appbruk: i dag, framtiden och för gamla dygn kastas", () => {
  for (const dag of [IDAG, "2026-11-04", "2026-09-01", "2026-11-2", "igår"]) {
    assert.equal(rad({ dag, kanal: "appstore", ver: "1", r: { oppnad: 1 } }, IDAG), null, dag);
  }
});

test("appbruk: okänd kanal, fel räknare och tomma räknare kastas", () => {
  assert.equal(rad({ dag: "2026-11-02", kanal: "web", r: { oppnad: 1 } }, IDAG), null);
  assert.equal(rad({ dag: "2026-11-02", kanal: "appstore", r: { "wx:2135": 1, Oppnad: 1, oppnad: -1, resa: 1.5, vakt: 5000 } }, IDAG), null);
  assert.equal(rad({ dag: "2026-11-02", kanal: "appstore", r: [] }, IDAG), null);
  assert.equal(rad(null, IDAG), null);
});

test("appbruk: en udda version blir tom, räknarna står kvar", () => {
  assert.deepEqual(rad({ dag: "2026-11-02", kanal: "testflight", ver: "<script>", r: { resa: 2 } }, IDAG)?.ver, "");
});
