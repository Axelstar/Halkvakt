// Annonstratten (DECISIONS #827): Metas och Apples rader blir databasrader utan att något tal tappas eller dubblas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createPublicKey, verify } from "node:crypto";
// @ts-ignore — .mjs utan typer
import { fonster, metaRad, appstoreRader, ascToken } from "../marknadsforing/annonsdata.mjs";

test("fönstret är fjorton hela dygn som slutar i går", () => {
  const f = fonster(new Date("2026-11-09T22:00:00Z"));
  assert.equal(f.length, 14);
  assert.equal(f.at(-1), "2026-11-08");
  assert.equal(f[0], "2026-10-26");
});

test("en insights-rad blir en rad med tal, länkklick skilda från klick", () => {
  const r = metaRad({ date_start: "2026-11-08", campaign_name: "Halkvakt · län · app", adset_name: "Län · Värmland",
    impressions: "1200", reach: "900", clicks: "40", inline_link_clicks: "31", spend: "84.17" }, "SEK");
  assert.deepEqual(r, { dag: "2026-11-08", kampanj: "Halkvakt · län · app", annonsuppsattning: "Län · Värmland",
    visningar: 1200, rackvidd: 900, klick: 40, lankklick: 31, kostnad: 84.17, valuta: "SEK" });
});

test("försäljningsrapporten: bara Halkvakt, summerat per land, produkttyp och version", () => {
  const h = ["Provider", "SKU", "Units", "Product Type Identifier", "Country Code", "Version", "Apple Identifier"].join("\t");
  const rad = (u: number, typ: string, land: string, ver: string, id = "6806939784") => ["APPLE", "x", u, typ, land, ver, id].join("\t");
  const tsv = [h, rad(3, "1F", "SE", "0.3.17"), rad(2, "1F", "SE", "0.3.17"), rad(1, "1F", "FI", "0.3.17"),
    rad(7, "7F", "SE", "0.3.17"), rad(9, "1F", "SE", "1.0", "999")].join("\n") + "\n";
  const ut = appstoreRader(tsv, "2026-11-08");
  assert.deepEqual(ut.find((r: any) => r.land === "SE" && r.produkttyp === "1F").enheter, 5);
  assert.equal(ut.length, 3);
  assert.equal(ut.reduce((s: number, r: any) => s + r.enheter, 0), 13);
});

test("App Store-token är en ES256-JWT till appstoreconnect-v1", () => {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const t = ascToken("iss-1", "KID1", pem, 1_700_000_000);
  const [h, k, s] = t.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(h, "base64url").toString()), { alg: "ES256", kid: "KID1", typ: "JWT" });
  const kropp = JSON.parse(Buffer.from(k, "base64url").toString());
  assert.equal(kropp.aud, "appstoreconnect-v1");
  assert.equal(kropp.exp - kropp.iat, 1200);
  assert.ok(verify("sha256", Buffer.from(`${h}.${k}`), { key: createPublicKey(pem), dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url")));
});
