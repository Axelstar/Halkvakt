// FÖRARFACIT — betatestarnas "stämde det?" (bedömning v3 S4; DECISIONS #186 punkt 2, #196 punkt 4, #201).
//
// Tar emot ETT svar per varning: {id, t, svar, app, ver}. Inget annat — ingen position, ingen resa,
// ingen identitet. Men ärligt: varnings-id pekar på en fara med koordinat och t säger när, så ett svar
// ÄR en plats och en tid. Det står ordagrant i produktbokens Om-avsnitt (Axels krav, #196), och knappen
// finns bara för betatestare som själva slagit på den (#186). Löftet till allmänheten är orört.
//
// ÖPPEN ENDPOINT MED FLIT: appen kan inte bära en hemlighet (CLAUDE.md), så ingen nyckel krävs.
// Skyddet är formen — strikt schema, storleksgräns, tak per dygn — och tabellen är dubbellåst (sql/022)
// så inget kan läsas tillbaka. Räcker för en beta i känd krets, inte för allmänheten: då krävs #21:s
// sensorbeslut. Ingen IP sparas; taket räknas globalt per dygn, som ett översvämningsskydd.
//
// Omsändning: appen kör svaren när bilen står stilla, och kan skicka samma svar två gånger. Nyckeln
// (id, t, app) gör det idempotent; ett ÄNDRAT svar på samma varning ersätter det förra — förarens
// senaste ord gäller.
//
// MISSARNA (kort #203 lager 2, DECISIONS #379): {miss: true, t, vad, station, segment?, app, ver} — "appen missade".
// station är närmaste mätstation ur snapshotens stationslista ("wx:<id>"), segment närmaste halkavsnitt inom 2 km om
// telefonen hade något ("seg:<id>"), vad är förarens eget val efter resan. Samma klass som ett varnings-id: ungefär var
// och när (Axels ja, #267 punkt 4). Egen tabell driver_miss (sql/038), eget dygnstak, samma omsändningsregel.
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
const TAK_PER_DYGN = 2000;   // tolv testare × kanske 30 varningar per dygn är 360 — taket är mot flod, inte mot förare
const MAX_BYTES = 512;
const FONSTER_H = 48;        // ett svar på en varning äldre än så är inte facit, det är ett minne

const svar = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return svar(405, { fel: "bara POST" });
  const text = await req.text();
  if (text.length > MAX_BYTES) return svar(413, { fel: `mer än ${MAX_BYTES} byte` });
  let d: any;
  try { d = JSON.parse(text); } catch { return svar(400, { fel: "ogiltig JSON" }); }
  if (d?.miss === true) return taEmotMiss(d);

  const id = typeof d?.id === "string" && d.id.length >= 1 && d.id.length <= 64 ? d.id : null;
  const t = typeof d?.t === "string" && !Number.isNaN(Date.parse(d.t)) ? new Date(d.t) : null;
  const val = d?.svar === "ja" || d?.svar === "nej" ? d.svar : null;
  const app = d?.app === "android" || d?.app === "ios" ? d.app : null;
  const ver = typeof d?.ver === "string" && d.ver.length <= 20 ? d.ver : null;
  if (!id || !t || !val || !app) return svar(400, { fel: "id (1–64 tecken), t (ISO-tid), svar (ja|nej) och app (android|ios) krävs" });
  if (Math.abs(Date.now() - t.getTime()) > FONSTER_H * 3600e3) return svar(400, { fel: `t utanför ±${FONSTER_H} h` });

  try {
    const [n] = await sql`SELECT count(*)::int AS n FROM driver_facit WHERE received_at > now() - interval '24 hours'`;
    if (n.n >= TAK_PER_DYGN) return svar(429, { fel: "dygnstaket nått" });
    await sql`INSERT INTO driver_facit (alert_id, alert_t, svar, app, version)
      VALUES (${id}, ${t.toISOString()}, ${val}, ${app}, ${ver})
      ON CONFLICT (alert_id, alert_t, app) DO UPDATE SET svar = EXCLUDED.svar, version = EXCLUDED.version, received_at = now()`;
    return new Response(null, { status: 204 });
  } catch (e) {
    return svar(500, { fel: String(e).slice(0, 120) });
  }
});

const VAD = new Set(["halka", "vatten", "vilt", "olycka", "annat"]);
const plats = (v: unknown, prefix: "wx" | "seg") =>
  typeof v === "string" && new RegExp(`^${prefix}:[\\w.-]{1,40}$`).test(v) ? v : null;

async function taEmotMiss(d: any): Promise<Response> {
  const t = typeof d?.t === "string" && !Number.isNaN(Date.parse(d.t)) ? new Date(d.t) : null;
  const vad = VAD.has(d?.vad) ? d.vad : null;
  const station = plats(d?.station, "wx");
  const segment = d?.segment == null ? null : plats(d.segment, "seg");
  const app = d?.app === "android" || d?.app === "ios" ? d.app : null;
  const ver = typeof d?.ver === "string" && d.ver.length <= 20 ? d.ver : null;
  if (!t || !vad || !station || !app || (d?.segment != null && !segment))
    return svar(400, { fel: "t (ISO-tid), vad (halka|vatten|vilt|olycka|annat), station (wx:…), app (android|ios) krävs; segment (seg:…) valfritt" });
  if (Math.abs(Date.now() - t.getTime()) > FONSTER_H * 3600e3) return svar(400, { fel: `t utanför ±${FONSTER_H} h` });
  try {
    const [n] = await sql`SELECT count(*)::int AS n FROM driver_miss WHERE received_at > now() - interval '24 hours'`;
    if (n.n >= TAK_PER_DYGN) return svar(429, { fel: "dygnstaket nått" });
    await sql`INSERT INTO driver_miss (t, vad, station_id, segment_id, app, version)
      VALUES (${t.toISOString()}, ${vad}, ${station}, ${segment}, ${app}, ${ver})
      ON CONFLICT (t, station_id, app) DO UPDATE SET vad = EXCLUDED.vad, segment_id = EXCLUDED.segment_id,
        version = EXCLUDED.version, received_at = now()`;
    return new Response(null, { status: 204 });
  } catch (e) {
    return svar(500, { fel: String(e).slice(0, 120) });
  }
}
