// appbruk — appstatistiken, bara iOS (DECISIONS #746).
// POST (från BruketSender.swift): {dag: "YYYY-MM-DD", kanal: "appstore"|"testflight"|"debug", ver: "0.4.0", r: {räknare: antal}}
//   En rad per telefon och avslutat dygn. IP:n och allt annat i anropet sparas inte. Det som inte har rätt form kastas med 204,
//   så att en trasig dag aldrig blockerar telefonens kö.
// GET ?nyckel=…&dagar=30&kanal=appstore : sammanställningen för statistik.html, samma nyckel som besok (sha256 i besok_nyckel).
import { KANALER, rad } from "./rad.ts";

const SB = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "application/json" };
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};
const JSONH = { ...CORS, "Content-Type": "application/json" };

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    if (req.method === "POST") {
      const idag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
      let d: unknown = null;
      try { d = JSON.parse((await req.text()).slice(0, 4000)); } catch { /* fel form: kastas nedan */ }
      const r = rad(d, idag);
      if (r) {
        const ut = await fetch(`${SB}/rest/v1/app_bruk`, { method: "POST", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify(r) });
        if (!ut.ok) return new Response(null, { status: 503, headers: CORS });   // databasen borta: telefonen försöker igen
      }
      return new Response(null, { status: 204, headers: CORS });
    }
    const u = new URL(req.url);
    const nyckel = u.searchParams.get("nyckel") ?? "";
    const dagar = Math.min(365, Math.max(1, Number(u.searchParams.get("dagar")) || 30));
    const kanal = KANALER.includes(u.searchParams.get("kanal") ?? "") ? u.searchParams.get("kanal")! : "appstore";
    const nr = await fetch(`${SB}/rest/v1/besok_nyckel?select=hash&id=eq.1`, { headers: H });
    const [n] = await nr.json();
    if (!nyckel || !n || (await sha256(nyckel)) !== n.hash) {
      return new Response(JSON.stringify({ fel: "fel nyckel" }), { status: 401, headers: JSONH });
    }
    const sr = await fetch(`${SB}/rest/v1/rpc/appbruk_stat`, { method: "POST", headers: H, body: JSON.stringify({ dagar, kanal_: kanal }) });
    return new Response(await sr.text(), { status: sr.status, headers: { ...JSONH, "Cache-Control": "no-store" } });
  } catch (e) {
    return new Response(JSON.stringify({ fel: String(e) }), { status: 500, headers: JSONH });
  }
});
