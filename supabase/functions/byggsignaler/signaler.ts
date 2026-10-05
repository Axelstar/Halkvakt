// Byggsignalernas rena delar (kort #288, DECISIONS #447): App Store Connects token, svaren som signalrader, och ärendet som
// kartsynken läser. Ingen Deno, inga importer, ingen I/O — prövat i test/byggsignaler.test.ts. Hämtningen bor i index.ts.
//
// En signal är en rad (kalla, nyckel, varde). Tabellen byggsignaler sparar första och senaste gången den sågs; första gången
// är beviset. Nycklar som bär ett tillstånd (bygge:22:extern:IN_BETA_TESTING, appstore:0.3.9:READY_FOR_DISTRIBUTION) får en
// egen rad, så att varje tillstånd får sin egen första tidpunkt.

export type Rad = { kalla: string; nyckel: string; varde: Record<string, unknown> };
export type Lagrad = Rad & { forst_sedd: string; senast_sedd: string };

const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64text = (s: string) => b64url(new TextEncoder().encode(s));

/** ES256-token för App Store Connect, giltig 15 minuter (Apple tillåter högst 20). pem = .p8-filens innehåll, med eller utan
 *  rubrikrader och radbrytningar — också med radbrytningarna inklistrade som bokstavliga \n, som en hemlighetsruta kan göra. */
export async function ascToken(issuer: string, keyId: string, pem: string, nu: Date): Promise<string> {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\\n/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const nyckel = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const iat = Math.floor(nu.getTime() / 1000);
  const huvud = b64text(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
  const kropp = b64text(JSON.stringify({ iss: issuer, iat, exp: iat + 15 * 60, aud: "appstoreconnect-v1" }));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, nyckel, new TextEncoder().encode(`${huvud}.${kropp}`));
  return `${huvud}.${kropp}.${b64url(new Uint8Array(sig))}`;
}

/** GET /v1/builds?…&include=preReleaseVersion,buildBetaDetail → en rad per bygge (nyckel bygge:<byggnummer>). */
export function byggRader(svar: any): Rad[] {
  const inkl = new Map<string, any>((svar?.included ?? []).map((x: any) => [`${x.type}:${x.id}`, x.attributes ?? {}]));
  return (svar?.data ?? []).flatMap((b: any) => {
    const a = b?.attributes ?? {};
    if (!/^\d+$/.test(String(a.version ?? ""))) return [];
    const pre = inkl.get(`preReleaseVersions:${b.relationships?.preReleaseVersion?.data?.id}`) ?? {};
    const beta = inkl.get(`buildBetaDetails:${b.relationships?.buildBetaDetail?.data?.id}`) ?? {};
    return [{ kalla: "asc", nyckel: `bygge:${a.version}`, varde: {
      id: b.id, nr: Number(a.version), version: pre.version ?? null, uppladdad: a.uploadedDate ?? null,
      behandling: a.processingState ?? null, intern: beta.internalBuildState ?? null, extern: beta.externalBuildState ?? null,
      utgangen: a.expired ?? null } }];
  });
}

/** GET /v1/builds/{id}/metrics/betaBuildUsages → summan över alla datapunkter; null tills bygget har installerats.
 *  Inget datum: Apple ger en datapunkt för hela året (5/10: start 2025-10-05 för alla byggen), så dess start säger inget om
 *  installationen. Tidpunkten är radens forst_sedd, timmen då signalen först såg installationen (kort #288). */
export function anvandning(nr: number, svar: any): Rad | null {
  let installer = 0, sessioner = 0, krascher = 0, feedback = 0;
  for (const d of svar?.data ?? []) for (const p of d?.dataPoints ?? []) {
    const v = p?.values ?? {};
    installer += Number(v.installCount ?? 0); sessioner += Number(v.sessionCount ?? 0);
    krascher += Number(v.crashCount ?? 0); feedback += Number(v.feedbackCount ?? 0);
  }
  return installer > 0 ? { kalla: "asc", nyckel: `bygge:${nr}:installerad`, varde: { installer, sessioner, krascher, feedback } } : null;
}

/** GET /v1/apps/{id}/appStoreVersions → en rad per version och en per tillstånd. appStoreState är föråldrad hos Apple
 *  (ersatt av appVersionState, API 3.3) men läses som reserv. */
export function appStoreRader(svar: any): Rad[] {
  return (svar?.data ?? []).flatMap((v: any) => {
    const a = v?.attributes ?? {};
    const tillstand = a.appVersionState ?? a.appStoreState ?? null;
    if (!a.versionString || !tillstand) return [];
    return [{ kalla: "asc", nyckel: `appstore:${a.versionString}`, varde: { tillstand, skapad: a.createdDate ?? null } },
      { kalla: "asc", nyckel: `appstore:${a.versionString}:${tillstand}`, varde: {} }];
  });
}

/** En TestFlight-grupp och antalet testare i den. */
export function gruppRad(grupp: any, antal: number): Rad {
  const a = grupp?.attributes ?? {};
  return { kalla: "asc", nyckel: `grupp:${a.name}`, varde: { antal, publik: a.publicLinkEnabled ?? null, intern: a.isInternalGroup ?? null } };
}

/** Byggenas externa tillstånd som egna rader, så att varje tillstånd får sin första tidpunkt. */
export function tillstandsRader(rader: Rad[]): Rad[] {
  return rader.filter((r) => /^bygge:\d+$/.test(r.nyckel) && r.varde.extern)
    .map((r) => ({ kalla: "asc", nyckel: `${r.nyckel}:extern:${r.varde.extern}`, varde: {} }));
}

/** Förarsvaren per plattform och appversion (driver_facit utan prov). Versionen är marknadsversionen, t.ex. 0.3.10. */
export function facitRader(rader: { app: string; version: string | null; antal: number; forsta: string; senaste: string }[]): Rad[] {
  return rader.map((r) => ({ kalla: "facit", nyckel: `${r.app}:${r.version ?? "?"}`, varde: { antal: r.antal, forsta: r.forsta, senaste: r.senaste } }));
}

export const ISSUE_MARK = "<!-- byggsignaler -->";
export const ISSUE_TITEL = "📡 Byggsignaler — kartsynkens indata (skrivs varje timme, ändra inte)";

/** Ärendets kropp: en förklaring och signalerna som ett json-block, som scripts/kartsynk.ts läser. */
export function issueKropp(rader: Lagrad[], skriven: Date): string {
  return `${ISSUE_MARK}\nSkrivs av edge function \`byggsignaler\` varje timme (kort #288, DECISIONS #447) och läses av ` +
    `\`scripts/kartsynk.ts\`. Ändra inte för hand. Senast skriven ${skriven.toISOString()}.\n\n` +
    "```json\n" + JSON.stringify(rader, null, 1) + "\n```\n";
}

/** Läser tillbaka signalerna ur ärendets kropp (samma form som issueKropp skriver). */
export function lasKropp(kropp: string): Lagrad[] {
  if (!kropp.startsWith(ISSUE_MARK)) throw new Error("ärendet saknar byggsignalernas märke");
  const m = kropp.match(/```json\n([\s\S]*?)\n```/);
  if (!m) throw new Error("ärendet saknar json-blocket");
  return JSON.parse(m[1]);
}
