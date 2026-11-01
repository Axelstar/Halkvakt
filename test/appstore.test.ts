// App Store-nedladdningarna (DECISIONS #773): rapporten blir rader per land, bara för Halkvakt och bara nedladdningar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
// @ts-ignore — .mjs utan typer
import { APP_ID, typ, rader, ingaNedladdningar, jwt } from "../marknadsforing/appstore.mjs";

const HUVUD = "Provider\tProvider Country\tSKU\tDeveloper\tTitle\tVersion\tProduct Type Identifier\tUnits\tDeveloper Proceeds\t" +
  "Begin Date\tEnd Date\tCustomer Currency\tCountry Code\tCurrency of Proceeds\tApple Identifier";
const rad = (pt: string, antal: number, land: string, app = APP_ID) =>
  ["APPLE", "US", "halkvakt", "Axel", "Halkvakt", "0.3.13", pt, String(antal), "0", "10/31/2026", "10/31/2026", "SEK", land, "SEK", app].join("\t");

test("produkttypen: 1 nya, 3 omladdningar, 7 uppdateringar, köp i appen räknas inte", () => {
  assert.equal(typ("1"), "nya");
  assert.equal(typ("1F"), "nya");
  assert.equal(typ("3"), "omladdningar");
  assert.equal(typ("7F"), "uppdateringar");
  assert.equal(typ("IA1"), null);
  assert.equal(typ(""), null);
});

test("en rad per land, bara Halkvakt, och typerna summeras var för sig", () => {
  const tsv = [HUVUD, rad("1", 30, "SE"), rad("1", 2, "SE"), rad("3", 4, "SE"), rad("7", 10, "SE"), rad("1", 1, "NO"),
    rad("1", 99, "SE", "123456789"), rad("IA1", 5, "SE")].join("\n") + "\n";
  const ut = rader(tsv, "2026-10-31");
  assert.deepEqual(ut.find((r: any) => r.land === "SE"), { dag: "2026-10-31", land: "SE", nya: 32, omladdningar: 4, uppdateringar: 10 });
  assert.deepEqual(ut.find((r: any) => r.land === "NO"), { dag: "2026-10-31", land: "NO", nya: 1, omladdningar: 0, uppdateringar: 0 });
  assert.equal(ut.length, 2);
});

test("ett dygn utan Halkvakt blir en nollrad, inte ett hål", () => {
  assert.deepEqual(rader([HUVUD, rad("1", 7, "SE", "123456789")].join("\n"), "2026-10-30"),
    [{ dag: "2026-10-30", land: "", nya: 0, omladdningar: 0, uppdateringar: 0 }]);
});

test("en rapport utan de väntade kolumnerna fäller körningen", () => {
  assert.throws(() => rader("Provider\tUnits\n", "2026-10-30"), /väntade kolumner/);
});

test("404: bara 'inga försäljningar' är en nolla, en rapport som inte är klar är det inte", () => {
  assert.equal(ingaNedladdningar('{"errors":[{"detail":"There were no sales for the date specified."}]}'), true);
  assert.equal(ingaNedladdningar('{"errors":[{"detail":"Report is not available yet."}]}'), false);
});

test("JWT:n är ES256 med Apples publik och en giltig signatur", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const t = jwt("issuer-1", "KEY123", privateKey.export({ type: "pkcs8", format: "pem" }).toString(), 1_800_000_000);
  const [h, k, s] = t.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(h, "base64url").toString()), { alg: "ES256", kid: "KEY123", typ: "JWT" });
  assert.deepEqual(JSON.parse(Buffer.from(k, "base64url").toString()),
    { iss: "issuer-1", iat: 1_800_000_000, exp: 1_800_000_900, aud: "appstoreconnect-v1" });
  assert.ok(verify("sha256", Buffer.from(`${h}.${k}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url")));
});
