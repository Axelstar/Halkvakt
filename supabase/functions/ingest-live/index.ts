// Livemotorn — Supabase Edge Function, körs varje minut av pg_cron.
// Hämtar ENDAST ändringar (changeid) för Situation (olyckor m.m.) + RoadCondition (halka)
// och upsertar direkt i databasen. Väder/kameror/vilt ligger kvar i 30-min-flödet (källorna
// uppdaterar ändå inte oftare). GitHub-ingesten blir reserv — dubbla skrivningar är ofarliga
// (idempotenta upserts).
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";
import { skrivSituationer, skrivVader, skrivVaglag } from "./skriv.ts";

const ENDPOINT = "https://api.trafikinfo.trafikverket.se/v2/data.json";
const KEY = Deno.env.get("TRAFIKVERKET_API_KEY")!;
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

async function tv(objecttype: string, schemaversion: string, changeid: string, ns?: string) {
  const body = `<REQUEST><LOGIN authenticationkey="${esc(KEY)}" />` +
    `<QUERY objecttype="${objecttype}" schemaversion="${schemaversion}"` +
    (ns ? ` namespace="${ns}"` : "") +
    ` changeid="${changeid}" includedeletedobjects="true" sseurl="false"></QUERY></REQUEST>`;
  const r = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "text/xml" }, body });
  if (!r.ok) throw new Error(`TV ${objecttype}: ${r.status}`);
  const j = await r.json();
  const res = j?.RESPONSE?.RESULT?.[0] ?? {};
  return { items: res[objecttype] ?? [], lastChangeId: String(res?.INFO?.LASTCHANGEID ?? changeid) };
}

// Skrivningarna bor i skriv.ts och besluten om vad som lagras i situationspolicy.ts, delad med reservingesten (kort #290,
// DECISIONS #449). Här finns hämtningen och kursorerna.

async function cursor(name: string): Promise<string> {
  const r = await sql`SELECT last_change_id FROM sync_state WHERE source = ${name}`;
  return r[0]?.last_change_id ?? "0";
}
const saveCursor = (name: string, id: string) =>
  sql`INSERT INTO sync_state (source, last_change_id, synced_at) VALUES (${name}, ${id}, now())
      ON CONFLICT (source) DO UPDATE SET last_change_id = ${id}, synced_at = now()`;

async function situations() {
  const { items, lastChangeId } = await tv("Situation", "1.6", await cursor("deviations"), "road.trafficinfo");
  const n = await skrivSituationer(sql, items);
  await saveCursor("deviations", lastChangeId);
  return n;
}

async function roadconditions() {
  const { items, lastChangeId } = await tv("RoadCondition", "1.2", await cursor("road_conditions"));
  const n = await skrivVaglag(sql, items);
  await saveCursor("road_conditions", lastChangeId);
  return n;
}

/** Svarets rad om arkivpolicyn (DECISIONS #353): hur många varma halvtimmesrader, eller att frågan fallerade. */
let arkivpolicy = "";
async function weather() {
  const { items, lastChangeId } = await tv("WeatherMeasurepoint", "2.1", await cursor("weather"));
  const r = await skrivVader(sql, items);
  arkivpolicy = r.arkivpolicy;
  await saveCursor("weather", lastChangeId);
  return r.n;
}

// TRENDKANDIDATERNA (kort #88 steg 2, Bengts order 13/9 "lägg trendberäkningen i ingest-live").
// Logiken bor i sql/018_trend_berakna.sql, inte här. Skälet: den här funktionen ÄR livemotorns
// ingest — situationer, väglag och väder i samma anrop — och kod som kastar här stoppar hela
// kedjan för hela appen. Trenden är en skuggmätning och får aldrig kosta driften något.
//
// FEL SKRIVS UT, ALDRIG TYST. En fail-soft-gren utan spår är ett tyst ALDRIG (CLAUDE.md-läxan
// från kameror-vaglag): felet går med i svaret så en tyst trend syns i loggen i stället för att
// se ut som noll kandidater.
//
// NOLL NYA ACTIONS-MINUTER och inget nytt cron-jobb: räkningen rider på ett anrop som redan sker.
async function trend(): Promise<string> {
  try {
    const r = await sql`SELECT * FROM berakna_trendkandidater(interval '2 hours')`;
    return `${r[0].nya} nya, ${r[0].utfall} utfall`;
  } catch (e) {
    return `FEL: ${String(e).slice(0, 120)}`;
  }
}

// DEN LÅNGSAMMA VAKTEN (kort #236, DECISIONS #300) rider på samma anrop: sql/030:s langsam_vakt() räknar om det senaste
// fönstret och skriver stationsdygnen i felet. Fail-soft av samma skäl som trenden — ett fel här får aldrig stoppa ingesten.
async function langsamVakt(): Promise<string> {
  try {
    const r = await sql`SELECT langsam_vakt(interval '2 hours') AS n`;
    return `${r[0].n} stationsdygn`;
  } catch (e) {
    return `FEL: ${String(e).slice(0, 120)}`;
  }
}

Deno.serve(async (req) => {
  // Fail-closed: kräver delad hemlighet (sätts som secret INGEST_KEY; cron skickar headern).
  const k = Deno.env.get("INGEST_KEY");
  if (!k || req.headers.get("x-halkvakt-key") !== k) {
    return new Response("forbidden", { status: 403 });
  }
  try {
    const [s, r, w] = await Promise.all([situations(), roadconditions(), weather()]);
    // Efter vädret, aldrig parallellt med det: trenden räknar på raderna weather() nyss skrev.
    const tr = await trend();
    const lv = await langsamVakt();
    return new Response(JSON.stringify({ ok: true, situations: s, roadconditions: r, weather: w, arkivpolicy, trend: tr, langsam_vakt: lv }), {
      headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
