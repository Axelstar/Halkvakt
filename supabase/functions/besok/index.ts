// besok — räknar sidvisningar på halkvakt.se utan kakor, IP eller användar-id.
// POST (från /assets/besok.js via sendBeacon): {p: sida, r: hänvisande domän, k: kod (?r=), m: "m"|"d"}
// GET ?nyckel=… : sammanställning för statistik.html (nyckeln jämförs mot sha256 i besok_nyckel).
const SB = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "application/json" };
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};
const ren = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[^\p{L}\p{N}\-._/:()]/gu, "").slice(0, max) : "";

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    if (req.method === "POST") {
      const ursprung = req.headers.get("origin") ?? "";
      if (ursprung && !/^https:\/\/(www\.)?halkvakt\.se$/.test(ursprung)) {
        return new Response(null, { status: 204, headers: CORS });
      }
      const ua = req.headers.get("user-agent") ?? "";
      if (/bot|crawl|spider|slurp|headless|preview|lighthouse/i.test(ua)) {
        return new Response(null, { status: 204, headers: CORS });
      }
      const d = JSON.parse((await req.text()).slice(0, 2000) || "{}");
      const sida = ren(d.p, 200) || "/";
      if (!sida.startsWith("/")) return new Response(null, { status: 204, headers: CORS });
      const rad = {
        sida,
        kalla: ren(d.r, 100).toLowerCase(),
        kod: ren(d.k, 40).toLowerCase(),
        enhet: d.m === "m" ? "mobil" : "dator",
      };
      await fetch(`${SB}/rest/v1/besok`, {
        method: "POST",
        headers: { ...H, Prefer: "return=minimal" },
        body: JSON.stringify(rad),
      });
      return new Response(null, { status: 204, headers: CORS });
    }

    const u = new URL(req.url);
    const nyckel = u.searchParams.get("nyckel") ?? "";
    const dagar = Math.min(365, Math.max(1, Number(u.searchParams.get("dagar")) || 30));
    const nr = await fetch(`${SB}/rest/v1/besok_nyckel?select=hash&id=eq.1`, { headers: H });
    const [rad] = await nr.json();
    if (!nyckel || !rad || (await sha256(nyckel)) !== rad.hash) {
      return new Response(JSON.stringify({ fel: "fel nyckel" }), {
        status: 401, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const sr = await fetch(`${SB}/rest/v1/rpc/besok_stat`, {
      method: "POST", headers: H, body: JSON.stringify({ dagar }),
    });
    return new Response(await sr.text(), {
      status: sr.status,
      headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ fel: String(e) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
