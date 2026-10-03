// ═══ Arkivexporten (kort #83 steg 2a, DECISIONS #334; Bengt 24/9: "kör export till supabase storage") ═══
// Varje anrop tar upp till två färdiga, gallrade dygn av weather_observations (sql/034 arkiv_att_exportera), packar dem till
// arkiv/weather_observations/ÅÅÅÅ-MM-DD.ndjson.gz, LÄSER TILLBAKA filen, räknar raderna och jämför kontrollsumman, och
// bokför dygnet (arkiv_export_klar, som räknar dygnet en gång till i databasen). Funktionen raderar aldrig något — det gör
// bara pg_cron (arkiv_radera_exporterat), och bara bokförda dygn. Anropas av pg_cron varje timme på minut 40.
//
// ÅTERLÄSPROVET (kort #291, DECISIONS #450): ?aterlasprov=1 hämtar det äldsta exporterade, ännu inte raderade dygnet ur hinken,
// kontrollerar kontrollsumman mot bokföringen och jämför filens rader med databasens, kolumn för kolumn (sql/042 arkiv_jamfor).
// Inget skrivs. Körs med databasknappen (aterlasprov); beviset är noll rader som bara finns på ena sidan.
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";
const SB = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { Authorization: `Bearer ${SRK}`, apikey: SRK };
const HINK = "arkiv";
const MAX_DYGN = 2;

async function rpc(fn: string, args: Record<string, unknown>): Promise<any> {
  const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${fn} ${r.status}: ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}
const packa = (s: string) => new Response(new Blob([s]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer();
const packaUpp = (b: ArrayBuffer) => new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
/** Raderna efter rubrikraden. Tomt dygn ger 0. */
const radantal = (s: string) => { const l = s.split("\n"); return l.length > 1 && l[1] !== "" ? l.length - 1 : 0; };

async function aterlasprov(): Promise<Response> {
  const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
  try {
    const [e] = await sql`SELECT dag::text AS dag, sha256, sokvag, rader FROM arkiv_export WHERE raderad IS NULL ORDER BY dag LIMIT 1`;
    if (!e) return new Response(JSON.stringify({ ok: false, fel: "inget exporterat dygn att läsa tillbaka" }), { status: 500 });
    const ner = await fetch(`${SB}/storage/v1/object/${HINK}/${e.sokvag}`, { headers: H });
    if (!ner.ok) throw new Error(`hämtning ${e.dag} ${ner.status}`);
    const gz = await ner.arrayBuffer();
    const text = await packaUpp(gz);
    const [{ j }] = await sql`SELECT arkiv_jamfor(${e.dag}::date, ${text}) AS j`;
    const prov = { dag: e.dag, sha_lika: hex(await crypto.subtle.digest("SHA-256", gz)) === e.sha256, bokforda_rader: e.rader, ...j };
    const ok = prov.sha_lika && j.bara_i_filen === 0 && j.bara_i_databasen === 0 && j.fil === e.rader;
    return new Response(JSON.stringify({ ok, prov }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, fel: String(err).slice(0, 400) }), { status: 500, headers: { "Content-Type": "application/json" } });
  } finally {
    await sql.end();
  }
}

Deno.serve(async (req) => {
  const k = Deno.env.get("INGEST_KEY");
  if (!k || req.headers.get("x-halkvakt-key") !== k) return new Response("forbidden", { status: 403 });
  if (new URL(req.url).searchParams.get("aterlasprov") === "1") return aterlasprov();
  const ut: unknown[] = [];
  try {
    const dygn: string[] = await rpc("arkiv_att_exportera", { maxantal: MAX_DYGN });
    for (const d of dygn) {
      const text: string = await rpc("arkiv_dygn", { d });
      const rader = radantal(text);
      const gz = await packa(text);
      const sha = hex(await crypto.subtle.digest("SHA-256", gz));
      const vag = `weather_observations/${d}.ndjson.gz`;
      const up = await fetch(`${SB}/storage/v1/object/${HINK}/${vag}`, { method: "POST",
        headers: { ...H, "Content-Type": "application/gzip", "x-upsert": "true" }, body: gz });
      if (!up.ok) throw new Error(`uppladdning ${d} ${up.status}: ${(await up.text()).slice(0, 200)}`);
      // Läs tillbaka det som faktiskt ligger i hinken — ett grönt uppladdningssvar är inte beviset.
      const ner = await fetch(`${SB}/storage/v1/object/${HINK}/${vag}`, { headers: H });
      if (!ner.ok) throw new Error(`återläsning ${d} ${ner.status}`);
      const tillbaka = await ner.arrayBuffer();
      const sha2 = hex(await crypto.subtle.digest("SHA-256", tillbaka));
      const rader2 = radantal(await packaUpp(tillbaka));
      if (sha2 !== sha || rader2 !== rader) throw new Error(`verifiering ${d}: sha ${sha2 === sha ? "lika" : "OLIKA"}, rader ${rader2} mot ${rader}`);
      const n = await rpc("arkiv_export_klar", { d, antal: rader, storlek: gz.byteLength, sha, vag });
      ut.push({ dag: d, rader: n, bytes: gz.byteLength, text_bytes: text.length, sha: sha.slice(0, 12) });
    }
    const efter = await rpc("arkiv_efterslap", {});
    return new Response(JSON.stringify({ ok: true, exporterade: ut, efterslap: efter }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, exporterade: ut, fel: String(e).slice(0, 400) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
