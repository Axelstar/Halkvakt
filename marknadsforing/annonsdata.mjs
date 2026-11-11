// Annonstratten: Meta-annonsernas dagssiffror och App Store-nedladdningarna till Supabase, så att en fråga kan lägga
// kostnad, klick, nedladdningar och appräknarens "kom igenom introduktionen" bredvid varandra per dygn.
//
//   Meta:      kontots insights per annonsuppsättning (= län) och dygn, de senaste DAGAR dygnen → meta_annons_dag (sql/102)
//   App Store: Apples dagliga försäljningsrapport (SALES/SUMMARY) för samma dygn, bara Halkvakts rader → appstore_dag (sql/102)
//
// Fönstret skrivs om i sin helhet varje körning: Metas och Apples sena justeringar kommer med, och en omkörning dubblar inget.
// Bara plattformarnas egna aggregat: ingen användare, ingen position. Appräknaren rörs inte (den har inget län och ska inte få det).
//
//   node marknadsforing/annonsdata.mjs          hämtar och skriver
//   node marknadsforing/annonsdata.mjs --torr   hämtar och skriver ut, rör inte databasen
//
// Varje källa utan sina nycklar hoppas över med en rad som säger det: META_ADS_TOKEN för Meta;
// ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8 och ASC_VENDOR (leverantörsnumret under Betalningar och ekonomiska rapporter) för App Store.

import { createPrivateKey, sign } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { pem } from "./appleannonser.mjs";

const DAGAR = 14;
const GRAPH = "https://graph.facebook.com/v23.0";
const KONTO = "act_1760320565448083";          // samma konto som annonsstyrning.mjs
const ASC = "https://api.appstoreconnect.apple.com";
const APPLE_ID = "6806939784";                  // Halkvakt i App Store
const torr = process.argv.includes("--torr");
const env = (n) => (process.env[n] ?? "").trim();

const dag = (d) => d.toISOString().slice(0, 10);
export function fonster(slut = new Date(), dagar = DAGAR) {
  // Gårdagen är det senaste hela dygnet hos båda; i dag är aldrig klart.
  const sista = new Date(slut.getTime() - 86400e3);
  return Array.from({ length: dagar }, (_, i) => dag(new Date(sista.getTime() - (dagar - 1 - i) * 86400e3)));
}

// ---- Meta ----

/** En insights-rad (level=adset, time_increment=1) blir en databasrad. Länkklick är klicken till App Store. */
export function metaRad(r, valuta) {
  return {
    dag: r.date_start,
    kampanj: r.campaign_name ?? "",
    annonsuppsattning: r.adset_name ?? "",
    visningar: Number(r.impressions ?? 0),
    rackvidd: Number(r.reach ?? 0),
    klick: Number(r.clicks ?? 0),
    lankklick: Number(r.inline_link_clicks ?? 0),
    kostnad: Number(r.spend ?? 0),
    valuta,
  };
}

async function meta(dagar) {
  const token = env("META_ADS_TOKEN");
  if (!token) { console.log("Meta: META_ADS_TOKEN saknas, hoppar över."); return null; }
  const get = async (url) => {
    const r = await fetch(url);
    const j = await r.json();
    if (!r.ok || j.error) throw new Error(`Meta ${r.status}: ${JSON.stringify(j.error ?? j).slice(0, 300)}`);
    return j;
  };
  const valuta = (await get(`${GRAPH}/${KONTO}?fields=currency&access_token=${token}`)).currency ?? "";
  const q = new URLSearchParams({
    level: "adset", time_increment: "1", limit: "500", access_token: token,
    time_range: JSON.stringify({ since: dagar[0], until: dagar.at(-1) }),
    fields: "campaign_name,adset_name,impressions,reach,clicks,inline_link_clicks,spend",
  });
  const ut = [];
  for (let url = `${GRAPH}/${KONTO}/insights?${q}`; url;) {
    const j = await get(url);
    ut.push(...(j.data ?? []).map((r) => metaRad(r, valuta)));
    url = j.paging?.next;
  }
  return ut;
}

// ---- App Store ----

export function ascToken(iss, kid, nyckel, nu = Math.floor(Date.now() / 1000)) {
  const b64 = (b) => Buffer.from(b).toString("base64url");
  const huvud = b64(JSON.stringify({ alg: "ES256", kid, typ: "JWT" }));
  const kropp = b64(JSON.stringify({ iss, iat: nu, exp: nu + 1200, aud: "appstoreconnect-v1" }));
  const sig = sign("sha256", Buffer.from(`${huvud}.${kropp}`), { key: createPrivateKey(nyckel), dsaEncoding: "ieee-p1363" });
  return `${huvud}.${kropp}.${b64(sig)}`;
}

/** Apples försäljningsrapport (tabbseparerad) → rader för Halkvakt, summerade per land, produkttyp och version.
 *  Produkttyp 1/1F/1T är en första nedladdning, 3/3F/3T en återhämtning och 7/7F/7T en uppdatering. */
export function appstoreRader(tsv, datum) {
  const [huvud, ...rader] = tsv.trim().split("\n").map((l) => l.split("\t"));
  const k = (n) => huvud.indexOf(n);
  const summa = new Map();
  for (const r of rader) {
    if (r[k("Apple Identifier")] !== APPLE_ID) continue;
    const rad = { dag: datum, land: r[k("Country Code")] ?? "", produkttyp: r[k("Product Type Identifier")] ?? "",
      version: r[k("Version")] ?? "", enheter: 0 };
    const nyckel = `${rad.land}|${rad.produkttyp}|${rad.version}`;
    const s = summa.get(nyckel) ?? rad;
    s.enheter += Number(r[k("Units")] ?? 0);
    summa.set(nyckel, s);
  }
  return [...summa.values()];
}

async function appstore(dagar) {
  const iss = env("ASC_ISSUER_ID"), kid = env("ASC_KEY_ID"), ra = env("ASC_KEY_P8"), vendor = env("ASC_VENDOR");
  const saknas = [!iss && "ASC_ISSUER_ID", !kid && "ASC_KEY_ID", !ra && "ASC_KEY_P8", !vendor && "ASC_VENDOR"].filter(Boolean);
  if (saknas.length) { console.log(`App Store: ${saknas.join(", ")} saknas, hoppar över.`); return null; }
  const token = ascToken(iss, kid, pem(ra));
  const ut = [];
  for (const d of dagar) {
    const q = new URLSearchParams({ "filter[frequency]": "DAILY", "filter[reportType]": "SALES", "filter[reportSubType]": "SUMMARY",
      "filter[vendorNumber]": vendor, "filter[reportDate]": d, "filter[version]": "1_1" });
    const r = await fetch(`${ASC}/v1/salesReports?${q}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/a-gzip" } });
    // 404 betyder "ingen försäljning det dygnet" eller "rapporten inte klar än": båda är noll rader.
    if (r.status === 404) continue;
    if (!r.ok) throw new Error(`App Store ${r.status} ${d}: ${(await r.text()).slice(0, 300)}`);
    ut.push(...appstoreRader(gunzipSync(Buffer.from(await r.arrayBuffer())).toString("utf8"), d));
  }
  return ut;
}

// ---- Databasen ----

async function skriv(db, tabell, kolumner, nyckel, rader, dagar) {
  await db.query(`delete from ${tabell} where dag >= $1 and dag <= $2`, [dagar[0], dagar.at(-1)]);
  for (const r of rader) {
    const v = kolumner.map((_, i) => `$${i + 1}`).join(",");
    const upd = kolumner.filter((c) => !nyckel.includes(c)).map((c) => `${c} = excluded.${c}`).join(", ");
    await db.query(`insert into ${tabell} (${kolumner.join(",")}) values (${v})
      on conflict (${nyckel.join(",")}) do update set ${upd}, hamtad = now()`, kolumner.map((c) => r[c]));
  }
}

async function main() {
  const dagar = fonster();
  const m = await meta(dagar);
  const a = await appstore(dagar);
  const sum = (rs, f) => (rs ?? []).reduce((s, r) => s + r[f], 0);
  console.log(`${dagar[0]}–${dagar.at(-1)}`);
  if (m) console.log(`Meta: ${m.length} rader, ${sum(m, "visningar")} visningar, ${sum(m, "lankklick")} länkklick, ${sum(m, "kostnad").toFixed(2)} ${m[0]?.valuta ?? ""}.`);
  if (a) console.log(`App Store: ${a.length} rader, ${sum(a.filter((r) => r.produkttyp.startsWith("1")), "enheter")} första nedladdningar.`);
  if (torr) { for (const r of [...(m ?? []), ...(a ?? [])].slice(0, 20)) console.log(JSON.stringify(r)); return; }
  if (!m && !a) return;

  const pg = (await import("pg")).default;
  const db = new pg.Client({ connectionString: env("DATABASE_URL") });
  await db.connect();
  try {
    await db.query("begin");
    if (m) await skriv(db, "meta_annons_dag", ["dag", "kampanj", "annonsuppsattning", "visningar", "rackvidd", "klick", "lankklick", "kostnad", "valuta"],
      ["dag", "kampanj", "annonsuppsattning"], m, dagar);
    if (a) await skriv(db, "appstore_dag", ["dag", "land", "produkttyp", "version", "enheter"], ["dag", "land", "produkttyp", "version"], a, dagar);
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
