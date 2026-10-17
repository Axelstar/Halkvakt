// Halkvakts MCP-server (DECISIONS #630, kort #281): MCP över streamable HTTP, tillståndslös och utan nyckel.
// POST med ett JSON-RPC-meddelande → svaret som application/json. Ingen SSE, ingen session, inga hemligheter.
// Läser bara sajtens publika datafiler och sparar inga frågor: varken argument, IP eller svar loggas.
import { hantera } from "./karna.ts";

const DATA = "https://axelstar.github.io/halkvakt-karta/data/";
const CACHE_MS = 5 * 60_000;
const TAK = 60;               // anrop per minut och adress, per isolat
const cache = new Map<string, { t: number; v: unknown }>();
const takt = new Map<string, { t: number; n: number }>();

async function hamta(fil: string): Promise<unknown> {
  const c = cache.get(fil);
  if (c && Date.now() - c.t < CACHE_MS) return c.v;
  const r = await fetch(DATA + fil, { headers: { "user-agent": "halkvakt-mcp/1.0" } });
  if (!r.ok) throw new Error(`${fil}: ${r.status}`);
  const v = await r.json();
  cache.set(fil, { t: Date.now(), v });
  return v;
}

const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, accept, mcp-protocol-version, mcp-session-id", "access-control-expose-headers": "mcp-session-id" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json; charset=utf-8" } });

function forMycket(req: Request): boolean {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "okänd";
  const nu = Date.now(), r = takt.get(ip);
  if (!r || nu - r.t > 60_000) { takt.set(ip, { t: nu, n: 1 }); if (takt.size > 5000) takt.clear(); return false; }
  return ++r.n > TAK;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "Använd POST med JSON-RPC. Den här servern har ingen SSE-ström." } }, 405);
  if (forMycket(req)) return json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "För många anrop. Vänta en minut." } }, 429);
  let m: unknown;
  try { m = await req.json(); } catch { return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Kunde inte läsa JSON" } }, 400); }
  if (Array.isArray(m)) return json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Skicka ett meddelande i taget" } }, 400);
  const ut = await hantera(m as never, hamta);
  return ut === null ? new Response(null, { status: 202, headers: CORS }) : json(ut);
});
