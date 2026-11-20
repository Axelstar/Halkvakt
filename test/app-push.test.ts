import { test } from "node:test";
import assert from "node:assert/strict";
import { apnsKropp, b64urlText, dodAdress, pemTillDer } from "../supabase/functions/app-push/regler.ts";

// DECISIONS #924: Apple får rubriken och texten, ingenting om föraren.
test("app-push: kroppen bär bara rubrik, text och tråd", () => {
  const k = JSON.parse(apnsKropp({ slag: "prov", rubrik: "Halkvakt", text: "Provnotis." }));
  assert.deepEqual(k, { aps: { alert: { title: "Halkvakt", body: "Provnotis." }, "thread-id": "halkvakt.prov" } });
});

test("app-push: bara en adress som Apple säger är död tas bort", () => {
  assert.equal(dodAdress(410, "Unregistered"), true);
  assert.equal(dodAdress(400, "BadDeviceToken"), true);
  assert.equal(dodAdress(400, "DeviceTokenNotForTopic"), true);
  for (const [s, r] of [[400, "BadTopic"], [403, "InvalidProviderToken"], [429, "TooManyRequests"], [500, undefined], [0, undefined]] as const) {
    assert.equal(dodAdress(s, r), false, `${s} ${r}`);
  }
});

test("app-push: base64url utan utfyllnad, och PEM till byte", () => {
  assert.equal(b64urlText('{"alg":"ES256"}'), "eyJhbGciOiJFUzI1NiJ9");
  assert.deepEqual([...pemTillDer("-----BEGIN PRIVATE KEY-----\nAQID\nBA==\n-----END PRIVATE KEY-----\n")], [1, 2, 3, 4]);
});
