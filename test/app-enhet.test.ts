import { test } from "node:test";
import assert from "node:assert/strict";
import { lasEnhet, lasId } from "../supabase/functions/app-enhet/regler.ts";

// DECISIONS #917: appen får skicka ett slumpat id, plattformen, kommunen, pushtoken och valet om erbjudanden. Inget annat.
const ID = "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90";
const bas = { id: ID, app: "ios", kommun: "1280" };

test("app-enhet: en riktig rad går igenom, och valet om erbjudanden är av om det inte sägs", () => {
  assert.deepEqual(lasEnhet(bas), { id: ID, app: "ios", kommun: "1280", token: null, erbj: false });
  assert.equal(lasEnhet({ ...bas, erbj: true, token: "a".repeat(64) })?.erbj, true);
  assert.equal(lasEnhet({ ...bas, id: ID.toUpperCase() })?.id, ID);
});

test("app-enhet: position, okända fält och fel form avvisas", () => {
  for (const d of [
    { ...bas, lat: 55.6, lon: 13.0 },          // en position får aldrig följa med
    { ...bas, kommun: "128" }, { ...bas, kommun: "0280" }, { ...bas, kommun: "1680" },   // tre siffror; län 02 och 16 finns inte
    { ...bas, kommun: 1280 }, { ...bas, app: "web" }, { ...bas, id: "inte-ett-id" },
    { ...bas, token: "kort" }, { ...bas, token: "a b".repeat(20) }, { ...bas, erbj: "ja" },
    null, [bas], "text",
  ]) assert.equal(lasEnhet(d), null, JSON.stringify(d));
});

test("app-enhet: raderingen kräver ett riktigt id", () => {
  assert.equal(lasId({ id: ID }), ID);
  assert.equal(lasId({ id: "1" }), null);
  assert.equal(lasId({}), null);
});
