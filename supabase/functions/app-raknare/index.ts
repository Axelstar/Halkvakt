// APP-RÄKNAREN — appens anonyma dagsräknare (DECISIONS #772; Axel och Bengt 1/11).
//
// Tar emot ETT ord per anrop: {h, v, app}. h är händelsen, v värdet, app vilken app. Inget annat — ingen position, ingen
// resa, inget enhets-id, ingen version, ingen tid: raden räknas upp på dygnet den kommer in (svensk tid, sql/077). Det som
// sparas är "i dag valde 14 iPhone-ägare Alltid", aldrig vem. Räknaren är alltid på och står i integritet.html (variant A).
//
// ÖPPEN ENDPOINT MED FLIT, som facit-svar: appen kan inte bära en hemlighet (CLAUDE.md). Skyddet är formen — fyra kända
// händelser med kända värden, storleksgräns, tak per dygn — och tabellen är dubbellåst (sql/077) så inget läses tillbaka
// annat än sammanställningen bakom statistik.html:s nyckel. Ingen IP sparas och ingen loggas; taket räknas globalt per dygn.
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
const TAK_PER_DYGN = 20000;   // tusen förare × ett par starter är ett par tusen — taket är mot flod, inte mot förare
const MAX_BYTES = 128;
const HANDELSER: Record<string, Set<string>> = {
  onboarding_klar: new Set([""]),
  behorighet: new Set(["alltid", "nar", "nekad"]),
  vakt_startad: new Set(["hand", "sjalv"]),
  forsta_varningen: new Set([""]),
};

const svar = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return svar(405, { fel: "bara POST" });
  const text = await req.text();
  if (text.length > MAX_BYTES) return svar(413, { fel: `mer än ${MAX_BYTES} byte` });
  let d: any;
  try { d = JSON.parse(text); } catch { return svar(400, { fel: "ogiltig JSON" }); }
  const h = typeof d?.h === "string" && HANDELSER[d.h] ? d.h : null;
  const v = typeof d?.v === "string" ? d.v : "";
  const app = d?.app === "android" || d?.app === "ios" ? d.app : null;
  if (!h || !app || !HANDELSER[h].has(v)) {
    return svar(400, { fel: "h (onboarding_klar|behorighet|vakt_startad|forsta_varningen), v (värdet händelsen känner) och app (android|ios) krävs" });
  }
  try {
    const [n] = await sql`SELECT coalesce(sum(antal), 0)::int AS n FROM app_raknare WHERE dag = (now() at time zone 'Europe/Stockholm')::date`;
    if (n.n >= TAK_PER_DYGN) return svar(429, { fel: "dygnstaket nått" });
    await sql`SELECT app_raknare_okna(${app}, ${h}, ${v})`;
    return new Response(null, { status: 204 });
  } catch (e) {
    return svar(500, { fel: String(e).slice(0, 120) });
  }
});
