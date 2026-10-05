// Byggsignalernas rena delar (kort #288, DECISIONS #447): token, svaren som rader, ärendet fram och tillbaka.
// Svaren har den form Apple dokumenterar (Build.Attributes, BuildBetaDetail, AppStoreVersion, BetaBuildUsagesV1MetricResponse,
// lästa 3/10); ingen riktig nyckel behövs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { anvandning, appStoreRader, ascToken, byggRader, facitRader, gruppRad, issueKropp, lasKropp, tillstandsRader } from "../supabase/functions/byggsignaler/signaler.ts";

const fran64url = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

test("ascToken: ES256 som Apples nyckel kan verifiera, med .p8-filen i alla former en hemlighetsruta kan ge", async () => {
  const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const der = Buffer.from(await crypto.subtle.exportKey("pkcs8", par.privateKey)).toString("base64");
  const pem = `-----BEGIN PRIVATE KEY-----\n${der.match(/.{1,64}/g)!.join("\n")}\n-----END PRIVATE KEY-----`;
  const nu = new Date("2026-10-03T12:00:00Z");
  for (const form of [pem, pem.replace(/\n/g, "\\n"), der]) {
    const jwt = await ascToken("issuer-1", "KEY123", form, nu);
    const [h, p, s] = jwt.split(".");
    assert.deepEqual(JSON.parse(fran64url(h).toString()), { alg: "ES256", kid: "KEY123", typ: "JWT" });
    const kropp = JSON.parse(fran64url(p).toString());
    assert.equal(kropp.iss, "issuer-1");
    assert.equal(kropp.aud, "appstoreconnect-v1");
    assert.equal(kropp.exp - kropp.iat, 900);
    assert.equal(fran64url(s).length, 64, "JWS ES256 är r||s, 64 byte");
    assert.ok(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, par.publicKey, fran64url(s), new TextEncoder().encode(`${h}.${p}`)));
  }
});

test("byggRader: byggnummer, version ur preReleaseVersion och TestFlight-lägena ur buildBetaDetail", () => {
  const svar = {
    data: [
      { type: "builds", id: "b22", attributes: { version: "22", uploadedDate: "2026-10-03T08:10:00-07:00", processingState: "VALID", expired: false },
        relationships: { preReleaseVersion: { data: { type: "preReleaseVersions", id: "p310" } }, buildBetaDetail: { data: { type: "buildBetaDetails", id: "d22" } } } },
      { type: "builds", id: "bx", attributes: { version: "1.0b", processingState: "VALID" }, relationships: {} },
    ],
    included: [
      { type: "preReleaseVersions", id: "p310", attributes: { version: "0.3.10" } },
      { type: "buildBetaDetails", id: "d22", attributes: { internalBuildState: "IN_BETA_TESTING", externalBuildState: "WAITING_FOR_BETA_REVIEW" } },
    ],
  };
  const rader = byggRader(svar);
  assert.equal(rader.length, 1, "ett byggnummer som inte är ett heltal tas inte med");
  assert.deepEqual(rader[0], { kalla: "asc", nyckel: "bygge:22", varde: { id: "b22", nr: 22, version: "0.3.10", uppladdad: "2026-10-03T08:10:00-07:00",
    behandling: "VALID", intern: "IN_BETA_TESTING", extern: "WAITING_FOR_BETA_REVIEW", utgangen: false } });
  assert.deepEqual(tillstandsRader(rader), [{ kalla: "asc", nyckel: "bygge:22:extern:WAITING_FOR_BETA_REVIEW", varde: {} }]);
});

test("anvandning: summan över datapunkterna, först när någon installerat, utan datum ur datapunkterna", () => {
  const svar = { data: [{ dataPoints: [
    { start: "2026-10-04T00:00:00Z", end: "2026-10-05T00:00:00Z", values: { installCount: 1, sessionCount: 3, crashCount: 0, feedbackCount: 0 } },
    { start: "2026-10-03T00:00:00Z", end: "2026-10-04T00:00:00Z", values: { installCount: 1, sessionCount: 2, crashCount: 1 } },
  ] }] };
  assert.deepEqual(anvandning(22, svar), { kalla: "asc", nyckel: "bygge:22:installerad",
    varde: { installer: 2, sessioner: 5, krascher: 1, feedback: 0 } });
  // Apples svar 5/10: en datapunkt för hela året. Dess start är fönstrets, inte installationens (kort #288).
  const ar = { data: [{ dataPoints: [{ start: "2025-10-05T00:00:00Z", end: "2026-10-05T00:00:00Z", values: { installCount: 2, sessionCount: 6 } }] }] };
  assert.deepEqual(anvandning(22, ar)?.varde, { installer: 2, sessioner: 6, krascher: 0, feedback: 0 });
  assert.equal(anvandning(23, { data: [{ dataPoints: [{ values: { installCount: 0, inviteCount: 4 } }] }] }), null);
  assert.equal(anvandning(23, { data: [] }), null);
});

test("appStoreRader: appVersionState först, den föråldrade appStoreState som reserv, en rad per tillstånd", () => {
  const rader = appStoreRader({ data: [
    { attributes: { versionString: "0.3.9", appVersionState: "WAITING_FOR_REVIEW", appStoreState: "WAITING_FOR_REVIEW", createdDate: "2026-10-01T22:00:00Z" } },
    { attributes: { versionString: "0.3.8", appStoreState: "READY_FOR_SALE" } },
    { attributes: { versionString: "0.3.7" } },
  ] });
  assert.deepEqual(rader.map((r) => r.nyckel), ["appstore:0.3.9", "appstore:0.3.9:WAITING_FOR_REVIEW", "appstore:0.3.8", "appstore:0.3.8:READY_FOR_SALE"]);
  assert.equal(rader[0].varde.tillstand, "WAITING_FOR_REVIEW");
});

test("gruppRad och facitRader", () => {
  assert.deepEqual(gruppRad({ attributes: { name: "Kompisarna", publicLinkEnabled: true, isInternalGroup: false } }, 2),
    { kalla: "asc", nyckel: "grupp:Kompisarna", varde: { antal: 2, publik: true, intern: false } });
  assert.deepEqual(facitRader([{ app: "ios", version: null, antal: 1, forsta: "a", senaste: "b" }]),
    [{ kalla: "facit", nyckel: "ios:?", varde: { antal: 1, forsta: "a", senaste: "b" } }]);
});

test("ärendet: det issueKropp skriver läser lasKropp tillbaka, och ett främmande ärende avvisas", () => {
  const rader = [{ kalla: "asc", nyckel: "status", varde: { ok: false, fel: "nyckeln saknas" }, forst_sedd: "t1", senast_sedd: "t2" }];
  assert.deepEqual(lasKropp(issueKropp(rader, new Date("2026-10-03T12:23:00Z"))), rader);
  assert.throws(() => lasKropp("Något annat ärende\n```json\n[]\n```"), /märke/);
});
