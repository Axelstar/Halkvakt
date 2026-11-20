// Certifikatstädningen i testflight.yml (DECISIONS #929, gamla kort #366 steg 2). Varje uppladdning körs på en ny Mac, som
// skapar ett eget Apple Development-certifikat och lämnar det kvar; kontot slår då i Apples tak och nästa bygge faller.
//   --lista <fil>          skriver utvecklingscertifikatens id, ett per rad (före bygget)
//   --aterkalla-nya <fil>  återkallar de utvecklingscertifikat som inte står i filen (efter uppladdningen)
// Bara utvecklingscertifikat som kommit till under körningen rörs. Distributionscertifikaten och de som fanns före rörs aldrig.
// Loggen är publik: bara antal skrivs ut, aldrig namn eller id. Ren JavaScript, så att den går på Macens Node utan flaggor.
import { createSign } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const [lage, fil] = process.argv.slice(2);
const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8_FIL } = process.env;
if (!["--lista", "--aterkalla-nya"].includes(lage) || !fil || !ASC_KEY_ID || !ASC_ISSUER_ID || !ASC_KEY_P8_FIL) {
  console.error("bruk: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8_FIL i miljön; --lista <fil> eller --aterkalla-nya <fil>");
  process.exit(2);
}

const b64 = (s) => Buffer.from(s).toString("base64url");
function jwt() {
  const nu = Math.floor(Date.now() / 1000);
  const huvud = `${b64(JSON.stringify({ alg: "ES256", kid: ASC_KEY_ID, typ: "JWT" }))}.${b64(JSON.stringify({ iss: ASC_ISSUER_ID, iat: nu, exp: nu + 600, aud: "appstoreconnect-v1" }))}`;
  const sign = createSign("SHA256").update(huvud).sign({ key: readFileSync(ASC_KEY_P8_FIL, "utf8"), dsaEncoding: "ieee-p1363" });
  return `${huvud}.${sign.toString("base64url")}`;
}

async function asc(metod, vag) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${vag}`, { method: metod, headers: { authorization: `Bearer ${jwt()}` } });
  if (!r.ok) throw new Error(`${metod} certifikat: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return metod === "GET" ? r.json() : null;
}

// Utvecklingscertifikaten: DEVELOPMENT och IOS_DEVELOPMENT. Kontot rymmer långt färre än 200.
async function utveckling() {
  const d = await asc("GET", "/v1/certificates?limit=200&fields%5Bcertificates%5D=certificateType");
  return d.data.filter((c) => /DEVELOPMENT$/.test(c.attributes.certificateType)).map((c) => c.id);
}

const nu = await utveckling();
if (lage === "--lista") {
  writeFileSync(fil, nu.join("\n") + "\n");
  console.log(`utvecklingscertifikat före bygget: ${nu.length}`);
} else {
  const fore = new Set(readFileSync(fil, "utf8").split("\n").filter(Boolean));
  const nya = nu.filter((id) => !fore.has(id));
  for (const id of nya) await asc("DELETE", `/v1/certificates/${id}`);
  console.log(`utvecklingscertifikat: ${fore.size} före, ${nu.length} efter bygget, ${nya.length} återkallade`);
}
