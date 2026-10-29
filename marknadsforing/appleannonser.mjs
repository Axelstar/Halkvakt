// Apple Ads: sökordsrapporten varje dygn till Supabase (DECISIONS #748, Axel 30/10).
//
// Hämtar kampanjens sökordsrapport (searchterms, per dygn) för de senaste DAGAR dygnen ur Apples Campaign Management API
// och skriver en rad per dygn, annonsgrupp, nyckelord och sökterm i `apple_ads_sokord` (sql/076). Raderna skrivs över, så en
// omkörning dubblar ingenting och Apples sena justeringar kommer med. statistik.html läser summan via besok_stat → apple_ads_stat.
//
// Inloggningen: en ES256-signerad client secret (privata nyckeln APPLE_ADS_PRIVATE_KEY) byts mot en åtkomsttoken hos
// appleid.apple.com. API-användaren är hej@halkvakt.se; nyckeln ligger bara i GitHub-hemligheterna.
//
//   node marknadsforing/appleannonser.mjs            hämtar och skriver
//   node marknadsforing/appleannonser.mjs --torr     hämtar och skriver ut, rör inte databasen
//
// Utan APPLE_ADS_PRIVATE_KEY är körningen en torrkörning som bara säger det.

import { createPrivateKey, sign } from "node:crypto";

const DAGAR = 14;
const API = "https://api.searchads.apple.com/api/v5";
const torr = process.argv.includes("--torr");

const env = (n) => (process.env[n] ?? "").trim();
const CLIENT_ID = env("APPLE_ADS_CLIENT_ID");
const KEY_ID = env("APPLE_ADS_KEY_ID");
const ORG_ID = env("APPLE_ADS_ORG_ID");
const NYCKEL = env("APPLE_ADS_PRIVATE_KEY");

const b64 = (b) => Buffer.from(b).toString("base64url");

export function klienthemlighet(clientId, keyId, pem, nu = Math.floor(Date.now() / 1000)) {
  const huvud = b64(JSON.stringify({ alg: "ES256", kid: keyId }));
  const kropp = b64(JSON.stringify({ sub: clientId, aud: "https://appleid.apple.com", iat: nu, exp: nu + 3600, iss: clientId }));
  const sig = sign("sha256", Buffer.from(`${huvud}.${kropp}`), { key: createPrivateKey(pem), dsaEncoding: "ieee-p1363" });
  return `${huvud}.${kropp}.${b64(sig)}`;
}

export async function token() {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: klienthemlighet(CLIENT_ID, KEY_ID, NYCKEL),
    scope: "searchadsorg",
  });
  const r = await fetch("https://appleid.apple.com/auth/oauth2/token", { method: "POST", body });
  if (!r.ok) throw new Error(`token: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return (await r.json()).access_token;
}

export async function api(at, vag, kropp) {
  const r = await fetch(API + vag, {
    method: kropp ? "POST" : "GET",
    headers: { Authorization: `Bearer ${at}`, "X-AP-Context": `orgId=${ORG_ID}`, "Content-Type": "application/json" },
    body: kropp ? JSON.stringify(kropp) : undefined,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${vag}: ${r.status} ${t.slice(0, 300)}`);
  return JSON.parse(t);
}

const dag = (d) => d.toISOString().slice(0, 10);

// En rapportrad (searchterms, DAILY) blir en databasrad per dygn med siffror.
export function rader(kampanj, rapport) {
  const ut = [];
  for (const r of rapport?.data?.reportingDataResponse?.row ?? []) {
    const m = r.metadata ?? {};
    for (const g of r.granularity ?? []) {
      if (!g.impressions && !g.taps && !g.totalInstalls && !Number(g.localSpend?.amount)) continue;
      ut.push({
        dag: g.date,
        kampanj: kampanj.name,
        annonsgrupp: m.adGroupName ?? "",
        nyckelord: m.keyword ?? "",
        matchning: m.matchType ?? "",
        sokterm: m.searchTermText ?? "",
        kalla: m.searchTermSource ?? "",
        visningar: g.impressions ?? 0,
        tryck: g.taps ?? 0,
        installationer: g.totalInstalls ?? 0,
        tryckinstallationer: g.tapInstalls ?? 0,
        kostnad: Number(g.localSpend?.amount ?? 0),
        valuta: g.localSpend?.currency ?? "",
      });
    }
  }
  return ut;
}

async function main() {
  if (!NYCKEL || !CLIENT_ID || !KEY_ID || !ORG_ID) {
    console.log("APPLE_ADS_* saknas: torrkörning, inget hämtat.");
    return;
  }
  const at = await token();
  const slut = new Date();
  const start = new Date(slut.getTime() - (DAGAR - 1) * 86400e3);
  const kampanjer = (await api(at, "/campaigns?limit=100")).data;
  const alla = [];
  for (const k of kampanjer) {
    const rapport = await api(at, `/reports/campaigns/${k.id}/searchterms`, {
      startTime: dag(start), endTime: dag(slut), granularity: "DAILY", timeZone: "ORTZ",
      selector: { orderBy: [{ field: "impressions", sortOrder: "DESCENDING" }], pagination: { offset: 0, limit: 1000 } },
      returnRecordsWithNoMetrics: false, returnRowTotals: false, returnGrandTotals: false,
    });
    alla.push(...rader(k, rapport));
  }
  const sum = (f) => alla.reduce((s, r) => s + r[f], 0);
  console.log(`${dag(start)}–${dag(slut)}: ${alla.length} rader, ${sum("visningar")} visningar, ${sum("tryck")} tryck, ` +
    `${sum("installationer")} installationer, ${sum("kostnad").toFixed(2)} i kostnad.`);
  if (torr) { for (const r of alla.slice(0, 20)) console.log(JSON.stringify(r)); return; }

  const pg = (await import("pg")).default;
  const db = new pg.Client({ connectionString: env("DATABASE_URL") });
  await db.connect();
  try {
    await db.query("begin");
    // Fönstret skrivs om i sin helhet: en sökterm som Apple flyttat eller tagit bort ska inte stå kvar.
    await db.query("delete from apple_ads_sokord where dag >= $1 and dag <= $2", [dag(start), dag(slut)]);
    for (const r of alla) {
      await db.query(
        `insert into apple_ads_sokord (dag, kampanj, annonsgrupp, nyckelord, matchning, sokterm, kalla, visningar, tryck,
           installationer, tryckinstallationer, kostnad, valuta)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         on conflict (dag, kampanj, annonsgrupp, nyckelord, sokterm) do update set
           matchning = excluded.matchning, kalla = excluded.kalla, visningar = apple_ads_sokord.visningar + excluded.visningar,
           tryck = apple_ads_sokord.tryck + excluded.tryck, installationer = apple_ads_sokord.installationer + excluded.installationer,
           tryckinstallationer = apple_ads_sokord.tryckinstallationer + excluded.tryckinstallationer,
           kostnad = apple_ads_sokord.kostnad + excluded.kostnad, hamtad = now()`,
        [r.dag, r.kampanj, r.annonsgrupp, r.nyckelord, r.matchning, r.sokterm, r.kalla, r.visningar, r.tryck,
          r.installationer, r.tryckinstallationer, r.kostnad, r.valuta],
      );
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
