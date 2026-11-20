// APP-PUSH — utskicket av notiser (DECISIONS #924; Axel 20/11). Tabellen: sql/131. Telefonerna: app_enhet (sql/130).
//
// Funktionen tar inte emot något. Ett anrop gör bara en sak: läser de öppna raderna i push_utskick, skickar dem genom Apple
// (APNs) till telefonerna som har en notisadress, och skriver antalet på raden. Vad som skickas och till vem bestäms av raden,
// och en rad kan bara läggas med SQL och tjänsterollen. Därför är anropet öppet: en främling kan som mest få kön tömd tidigare.
// Apple får notisadressen, rubriken och texten, aldrig id, kommun eller val. Ingen rad per telefon sparas.
// Android (FCM) är inte byggt: de raderna hoppas över.
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";
import { apnsKropp, b64urlBytes, b64urlText, dodAdress, pemTillDer, type Utskick } from "./regler.ts";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
// Nyckelns id och lagets id är inga hemligheter (de står i varje anrop till Apple); nyckelfilen är det och bor i APNS_KEY_P8.
const KEY_ID = Deno.env.get("APNS_KEY_ID") ?? "XM6528R5BQ";
const TEAM_ID = Deno.env.get("APNS_TEAM_ID") ?? "R93LGMM343";
const TOPIC = "se.halkvakt.app";
const TAK = 2000;   // telefoner per anrop; ett större utskick fortsätter i nästa

const svar = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function jwt(): Promise<string> {
  const pem = Deno.env.get("APNS_KEY_P8");
  if (!pem) throw new Error("APNS_KEY_P8 saknas");
  const nyckel = await crypto.subtle.importKey("pkcs8", pemTillDer(pem), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const huvud = `${b64urlText(JSON.stringify({ alg: "ES256", kid: KEY_ID }))}.${b64urlText(JSON.stringify({ iss: TEAM_ID, iat: Math.floor(Date.now() / 1000) }))}`;
  const sign = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, nyckel, new TextEncoder().encode(huvud));
  return `${huvud}.${b64urlBytes(new Uint8Array(sign))}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return svar(405, { fel: "bara POST" });
  try {
    const oppna = await sql`SELECT id, slag, enhet, kommun, lan, rubrik, text, partner, lank FROM push_utskick WHERE klar IS NULL ORDER BY id LIMIT 5`;
    if (oppna.length === 0) return svar(200, { utskick: 0 });
    const token = await jwt();
    const ut: unknown[] = [];
    for (const u of oppna) {
      // Erbjudanden går bara till den som valt dem. En telefon utan notisadress får ingenting.
      const mal = await sql`SELECT id, pushtoken FROM app_enhet
        WHERE app = 'ios' AND pushtoken IS NOT NULL
          AND (${u.enhet}::uuid IS NULL OR id = ${u.enhet}::uuid)
          AND (${u.kommun}::text IS NULL OR kommun = ${u.kommun})
          AND (${u.lan}::text IS NULL OR left(kommun, 2) = ${u.lan})
          AND (${u.slag} <> 'erbjudande' OR erbjudanden)
        LIMIT ${TAK}`;
      const kropp = apnsKropp(u as unknown as Utskick);
      let skickade = 0, fallna = 0, fel: string | null = null;
      for (const m of mal) {
        const r = await fetch(`https://api.push.apple.com/3/device/${m.pushtoken}`, {
          method: "POST", body: kropp,
          headers: { authorization: `bearer ${token}`, "apns-topic": TOPIC, "apns-push-type": "alert", "apns-priority": "10" },
        });
        if (r.status === 200) { skickade++; await r.body?.cancel(); continue; }
        fallna++;
        const reason = (await r.json().catch(() => ({})) as { reason?: string }).reason;
        fel = `${r.status} ${reason ?? ""}`.trim();
        if (dodAdress(r.status, reason)) await sql`UPDATE app_enhet SET pushtoken = NULL WHERE id = ${m.id}`;
      }
      await sql`UPDATE push_utskick SET klar = now(), skickade = ${skickade}, fallna = ${fallna}, fel = ${fel} WHERE id = ${u.id}`;
      ut.push({ id: u.id, skickade, fallna, fel });
    }
    return svar(200, { utskick: ut.length, ut });
  } catch (e) {
    return svar(500, { fel: String(e).slice(0, 160) });
  }
});
