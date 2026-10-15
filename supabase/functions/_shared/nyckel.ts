// Funktionernas nyckel (DECISIONS #571, sql/054). x-halkvakt-key prövas mot raden i `funktionsnyckel`, inte mot
// funktionshemligheten INGEST_KEY, så att nyckeln kan bytas med databasen (nyckelbyte-ingest.yml) utan en Supabase-nyckel
// som får skriva funktionshemligheter. Prövningen går med service-rollen via PostgREST och stänger vid varje fel.
export async function nyckelGiltig(req: Request): Promise<boolean> {
  const k = req.headers.get("x-halkvakt-key");
  const sb = Deno.env.get("SUPABASE_URL"), srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!k || !sb || !srk) return false;
  try {
    const r = await fetch(`${sb}/rest/v1/rpc/nyckel_giltig`, {
      method: "POST",
      headers: { Authorization: `Bearer ${srk}`, apikey: srk, "Content-Type": "application/json" },
      body: JSON.stringify({ k }),
    });
    return r.ok && (await r.json()) === true;
  } catch {
    return false;
  }
}
