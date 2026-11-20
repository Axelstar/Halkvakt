// APP-ENHET — platsdelningen (DECISIONS #917; Axel och Bengt 20/11). Tabellen och gallringen: sql/130.
//
// POST   {id, app, kommun, token?, erbj?}  skriver eller skriver över installationens enda rad (senaste läget, ingen historik).
// DELETE {id}                              raderar raden (Radera min data i appen). Finns den inte är svaret detsamma.
// Appen anropar först när föraren godkänt platsdelningen. Ingen exakt position, ingen resa, inget namn tas emot, och ingen IP
// sparas eller loggas. id är slumpat i appen och är det enda som knyter en rad till en telefon.
//
// ÖPPEN ENDPOINT MED FLIT, som app-raknare: appen kan inte bära en hemlighet (CLAUDE.md). Skyddet är formen (regler.ts),
// storleksgränsen och taket för antalet rader. Tabellen är dubbellåst (sql/130), och inget läses tillbaka härifrån.
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";
import { lasEnhet, lasId, MAX_BYTES } from "./regler.ts";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
const TAK_RADER = 500000;   // mot flod, inte mot förare

const svar = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "DELETE") return svar(405, { fel: "bara POST och DELETE" });
  const text = await req.text();
  if (text.length > MAX_BYTES) return svar(413, { fel: `mer än ${MAX_BYTES} byte` });
  let d: unknown;
  try { d = JSON.parse(text); } catch { return svar(400, { fel: "ogiltig JSON" }); }
  try {
    if (req.method === "DELETE") {
      const id = lasId(d);
      if (!id) return svar(400, { fel: "id krävs" });
      await sql`DELETE FROM app_enhet WHERE id = ${id}`;
      return new Response(null, { status: 204 });
    }
    const e = lasEnhet(d);
    if (!e) return svar(400, { fel: "id, app (android|ios) och kommun (fyra siffror) krävs; token och erbj är valfria" });
    const [n] = await sql`SELECT count(*)::int AS n FROM app_enhet`;
    if (n.n >= TAK_RADER) return svar(429, { fel: "taket nått" });
    await sql`INSERT INTO app_enhet (id, app, pushtoken, kommun, erbjudanden) VALUES (${e.id}, ${e.app}, ${e.token}, ${e.kommun}, ${e.erbj})
      ON CONFLICT (id) DO UPDATE SET app = excluded.app, pushtoken = excluded.pushtoken, kommun = excluded.kommun,
        erbjudanden = excluded.erbjudanden, uppdaterad = now()`;
    return new Response(null, { status: 204 });
  } catch (e) {
    return svar(500, { fel: String(e).slice(0, 120) });
  }
});
