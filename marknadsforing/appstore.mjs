// App Store: nedladdningarna per dygn till Supabase (DECISIONS #773, Axel 1/11).
//
// Hämtar App Store Connects dagliga försäljningsrapport (SALES, SUMMARY, DAILY) för de senaste DAGAR dygnen och skriver en rad
// per dygn och land i `app_store_nedladdningar` (sql/078): nya nedladdningar (produkttyp 1*), nya nedladdningar av någon som haft
// appen förut (3*) och uppdateringar (7*). Ett dygn skrivs om i sin helhet, så en omkörning dubblar ingenting. Ett dygn som Apple
// inte har lagt ut ännu lämnas orört och tas av nästa körning. statistik.html läser summan via besok_stat → app_store_stat.
//
// Inloggningen: samma App Store Connect-nyckel som TestFlight-flödet (ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8), en ES256-signerad
// JWT per körning. Rapporten kräver också leverantörsnumret (ASC_VENDOR_NUMBER), som står överst i Payments and Financial Reports.
//
//   node marknadsforing/appstore.mjs            hämtar och skriver
//   node marknadsforing/appstore.mjs --torr     hämtar och skriver ut, rör inte databasen
//
// Utan nycklarna eller leverantörsnumret är körningen en torrkörning som bara säger det.

import { createPrivateKey, sign } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { pem } from "./appleannonser.mjs";

const DAGAR = 7;
export const APP_ID = "6806939784";   // Halkvakt i App Store
const API = "https://api.appstoreconnect.apple.com/v1/salesReports";
const torr = process.argv.includes("--torr");

const env = (n) => (process.env[n] ?? "").trim();
const KEY_ID = env("ASC_KEY_ID");
const ISSUER = env("ASC_ISSUER_ID");
const VENDOR = env("ASC_VENDOR_NUMBER");
const NYCKEL = pem(env("ASC_KEY_P8"));

const b64 = (b) => Buffer.from(b).toString("base64url");

export function jwt(issuer, keyId, pemText, nu = Math.floor(Date.now() / 1000)) {
  const huvud = b64(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
  const kropp = b64(JSON.stringify({ iss: issuer, iat: nu, exp: nu + 15 * 60, aud: "appstoreconnect-v1" }));
  const sig = sign("sha256", Buffer.from(`${huvud}.${kropp}`), { key: createPrivateKey(pemText), dsaEncoding: "ieee-p1363" });
  return `${huvud}.${kropp}.${b64(sig)}`;
}

// Apple's product type identifiers: 1* is a first download, 3* a re-download, 7* an update. Anything else (in-app purchases)
// is not a download and is left out.
export function typ(pt) {
  const c = String(pt ?? "").trim()[0];
  return c === "1" ? "nya" : c === "3" ? "omladdningar" : c === "7" ? "uppdateringar" : null;
}

// One report (tab-separated, header first) becomes one row per country for Halkvakt. A day without a single Halkvakt line
// still gets a row, with land '' and zeros, so the chart shows the zero instead of a gap.
export function rader(tsv, dag) {
  const [huvud, ...linjer] = tsv.split(/\r?\n/).filter((l) => l.trim());
  const kol = (huvud ?? "").split("\t");
  const i = (namn) => kol.indexOf(namn);
  const [iTyp, iAntal, iApp, iLand] = [i("Product Type Identifier"), i("Units"), i("Apple Identifier"), i("Country Code")];
  if ([iTyp, iAntal, iApp, iLand].includes(-1)) throw new Error(`rapporten saknar väntade kolumner: ${kol.join(", ")}`);
  const perLand = new Map();
  for (const l of linjer) {
    const f = l.split("\t");
    if (f[iApp]?.trim() !== APP_ID) continue;
    const k = typ(f[iTyp]);
    if (!k) continue;
    const land = f[iLand].trim();
    const r = perLand.get(land) ?? { dag, land, nya: 0, omladdningar: 0, uppdateringar: 0 };
    r[k] += Number(f[iAntal]) || 0;
    perLand.set(land, r);
  }
  return perLand.size ? [...perLand.values()] : [{ dag, land: "", nya: 0, omladdningar: 0, uppdateringar: 0 }];
}

// A 404 means one of two things: the day had no sales at all, or Apple has not published the report yet. Only the first is a zero.
export const ingaNedladdningar = (text) => /no sales/i.test(text);

async function hamta(token, dag) {
  const q = new URLSearchParams({
    "filter[frequency]": "DAILY", "filter[reportType]": "SALES", "filter[reportSubType]": "SUMMARY",
    "filter[vendorNumber]": VENDOR, "filter[reportDate]": dag, "filter[version]": "1_0",
  });
  const r = await fetch(`${API}?${q}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/a-gzip" } });
  if (r.status === 404) {
    const t = await r.text();
    return ingaNedladdningar(t) ? { dag, rader: rader("Product Type Identifier\tUnits\tApple Identifier\tCountry Code", dag) }
      : { dag, inteKlar: t.slice(0, 200) };
  }
  if (!r.ok) throw new Error(`${dag}: ${r.status} ${(await r.text()).slice(0, 300)}`);
  return { dag, rader: rader(gunzipSync(Buffer.from(await r.arrayBuffer())).toString("utf8"), dag) };
}

const datum = (d) => d.toISOString().slice(0, 10);

async function main() {
  if (!NYCKEL || !KEY_ID || !ISSUER || !VENDOR) {
    console.log(`Saknas: ${[!NYCKEL && "ASC_KEY_P8", !KEY_ID && "ASC_KEY_ID", !ISSUER && "ASC_ISSUER_ID",
      !VENDOR && "ASC_VENDOR_NUMBER"].filter(Boolean).join(", ")}. Torrkörning, inget hämtat.`);
    return;
  }
  const token = jwt(ISSUER, KEY_ID, NYCKEL);
  const dagar = Array.from({ length: DAGAR }, (_, n) => datum(new Date(Date.now() - (n + 1) * 86400e3)));
  const svar = [];
  for (const dag of dagar) svar.push(await hamta(token, dag));
  for (const s of svar) {
    if (s.inteKlar) { console.log(`${s.dag}: inte klar hos Apple än (${s.inteKlar.replace(/\s+/g, " ")})`); continue; }
    const sum = (f) => s.rader.reduce((a, r) => a + r[f], 0);
    console.log(`${s.dag}: ${sum("nya")} nya, ${sum("omladdningar")} omladdningar, ${sum("uppdateringar")} uppdateringar, ` +
      `${s.rader.filter((r) => r.land).length} länder.`);
  }
  if (torr) return;

  const pg = (await import("pg")).default;
  const db = new pg.Client({ connectionString: env("DATABASE_URL") });
  await db.connect();
  try {
    await db.query("begin");
    for (const s of svar.filter((x) => x.rader)) {
      await db.query("delete from app_store_nedladdningar where dag = $1", [s.dag]);
      for (const r of s.rader) {
        await db.query(
          `insert into app_store_nedladdningar (dag, land, nya, omladdningar, uppdateringar) values ($1,$2,$3,$4,$5)`,
          [r.dag, r.land, r.nya, r.omladdningar, r.uppdateringar],
        );
      }
    }
    await db.query("commit");
  } catch (e) {
    await db.query("rollback");
    throw e;
  } finally {
    await db.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
