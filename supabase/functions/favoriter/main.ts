// FAVORITER — appens rapportfil (favoriterna version 1, kort #357; DECISIONS #541, #616, #617). Bygger rapportfilen var tionde minut
// (:x6, sql/061) med samma frågor och samma kärna som favoritprovet (publish/rapport-core.ts: rapportFragor, kallaStationer,
// byggRapport) och skriver den till den publika hinken `favoriter` i Supabase Storage, där appen hämtar den (Bengts val a 17/10, #617):
// rapport-snabb.json, rapport-lang.json (bara när linjerna ändrats) och sist manifest.json med sha256 för båda, så att manifestet aldrig
// pekar på en fil som inte är skriven. Appen hämtar manifestet, och filerna bara när kontrollsumman ändrats; en fil vars sha256 inte
// stämmer förkastas och den förra behålls (CLAUDE.md). Filerna skrivs över, så ingen historik växer. Inga rutter och inga förare här:
// matchningen mot förarens rutt sker i telefonen. Favoritprovet (testmiljön, #529) står kvar och rörs inte av den här funktionen.
//
// index.ts är GENERERAD av scripts/bundle-favoriter.ts ur engine/src, publish/rapport-core.ts och den här filen — ändra aldrig i
// index.ts. Svaret bär tiden per steg, minnet och storlekarna, så att marginalen mot resursfelen (546, #344, #360) går att läsa ur
// net._http_response.
const SB = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TRV = Deno.env.get("TRAFIKVERKET_API_KEY")!;
// Lägesfilen ur hinken som publicera skriver varannan minut, inte kartans tiominutersfil (DECISIONS #741, tillägget 30/10).
const LAGESFIL = `${SB}/storage/v1/object/app/v1/live.json`;
const HINK = "favoriter";
const HISTORIK = 144;   // ett dygn med sex körningar i timmen
const mb = (b: number) => Math.round(b / 1e5) / 10;
function minnesmatare() {
  let rss = 0, heap = 0, ok = false;
  const mat = () => { try { const m = Deno.memoryUsage(); rss = Math.max(rss, m.rss); heap = Math.max(heap, m.heapUsed); ok = true; } catch { /* API:t saknas */ } };
  return { mat, varde: () => (ok ? { heap: mb(heap), rss: mb(rss) } : null) };
}

async function trv({ objecttype: objekt, version, ns, filter, include }: Fraga, limit = 20000): Promise<{ rader: any[]; byte: number }> {
  const inc = include.map((f) => `<INCLUDE>${f}</INCLUDE>`).join("");
  const q = `<REQUEST><LOGIN authenticationkey="${TRV}"/><QUERY objecttype="${objekt}" schemaversion="${version}" namespace="${ns}" limit="${limit}">` +
    `${filter ? `<FILTER>${filter}</FILTER>` : ""}${inc}</QUERY></REQUEST>`;
  const r = await fetch("https://api.trafikinfo.trafikverket.se/v2/data.json", { method: "POST", headers: { "Content-Type": "text/xml" }, body: q });
  const text = await r.text();
  // Felet bär svarskroppen (CLAUDE.md: "TRV 400" utan kropp kostade ett diagnosvarv).
  if (!r.ok) throw new Error(`${objekt} ${r.status}: ${text.slice(0, 300)}`);
  const rader = JSON.parse(text)?.RESPONSE?.RESULT?.[0]?.[objekt] ?? [];
  if (rader.length >= limit) throw new Error(`${objekt}: taket ${limit} nått — svaret är ofullständigt`);
  return { rader, byte: text.length };
}

const hinkUrl = (namn: string) => `${SB}/storage/v1/object/${HINK}/${namn}`;
async function lasHink(namn: string): Promise<any | null> {
  const r = await fetch(hinkUrl(namn), { headers: { Authorization: `Bearer ${SRK}`, apikey: SRK } });
  return r.ok ? r.json() : null;
}
async function skrivHink(namn: string, json: string) {
  const r = await fetch(hinkUrl(namn), { method: "POST", body: json, headers: { Authorization: `Bearer ${SRK}`, apikey: SRK,
    "Content-Type": "application/json", "x-upsert": "true", "cache-control": "max-age=60" } });
  if (!r.ok) throw new Error(`hinken ${namn} ${r.status}: ${(await r.text()).slice(0, 200)}`);
}
async function sha256(s: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// Storleken i byte som filen ligger i hinken (UTF-8), inte i tecken: å, ä och ö är två byte (17/10: 386 171 byte mot 380 188 tecken).
const utf8Byte = (s: string) => new TextEncoder().encode(s).length;
async function gzBytes(s: string): Promise<number> {
  const cs = new CompressionStream("gzip"); const w = cs.writable.getWriter(); w.write(new TextEncoder().encode(s)); w.close();
  return (await new Response(cs.readable).arrayBuffer()).byteLength;
}

import { nyckelGiltig } from "../_shared/nyckel.ts";
Deno.serve(async (req) => {
  if (!(await nyckelGiltig(req))) return new Response("forbidden", { status: 403 });  // nyckeln i databasen, DECISIONS #571
  const minne = minnesmatare(); minne.mat();
  const t0 = performance.now(); const ms: Record<string, number> = {}; const steg = (n: string, t: number) => { ms[n] = Math.round(performance.now() - t); minne.mat(); };
  try {
    const nu = Date.now();
    let t = performance.now();
    const [qSit, qTt, qFa, qFr] = rapportFragor(nu);
    const [sit, tt, fa, fr, lv, wl] = await Promise.all([
      trv(qSit), trv(qTt), trv(qFa), trv(qFr),
      fetch(LAGESFIL, { headers: { Authorization: `Bearer ${SRK}`, apikey: SRK } }).then(async (r) => {
        if (!r.ok) throw new Error(`lägesfilen ${r.status}: ${(await r.text()).slice(0, 200)}`);
        return r.json();
      }),
      fetch(`${SB}/rest/v1/weather_latest?select=station_id,name,air_temp_c`, { headers: { Authorization: `Bearer ${SRK}`, apikey: SRK } }).then((r) => r.json()),
    ]);
    steg("hamtning", t);
    t = performance.now();
    const { snabb, lang } = byggRapport({ nu, situationer: sit.rader, restider: tt.rader, farjor: fa.rader, farjeleder: fr.rader,
      stationer: kallaStationer(lv, wl) });
    steg("rapport", t);
    t = performance.now();
    const sSnabb = JSON.stringify(snabb), sLang = JSON.stringify(lang);
    const fore = await lasHink("manifest.json");
    // Den långsamma delen skrivs bara när linjerna ändrats (docs/FAVORITER.html §7) — generated_at räknas inte.
    const innehall = await sha256(JSON.stringify(lang.linjer));
    const nyLang = !fore?.lang || fore.lang.innehall !== innehall;
    const manifest = { schema: 1, generated_at: snabb.generated_at, lagesfil: lv.generated_at,
      snabb: { fil: "rapport-snabb.json", sha256: await sha256(sSnabb), byte: utf8Byte(sSnabb), gz_byte: await gzBytes(sSnabb) },
      lang: nyLang ? { fil: "rapport-lang.json", sha256: await sha256(sLang), innehall, byte: utf8Byte(sLang), gz_byte: await gzBytes(sLang), skriven: snabb.generated_at }
        : fore.lang };
    await skrivHink("rapport-snabb.json", sSnabb);
    if (nyLang) await skrivHink("rapport-lang.json", sLang);
    await skrivHink("manifest.json", JSON.stringify(manifest));   // sist: manifestet pekar bara på skrivna filer
    steg("skrivning", t);
    const hist = (await lasHink("historik.json"))?.korningar ?? [];
    hist.push({ t: snabb.generated_at, ms: Math.round(performance.now() - t0), minne_mb: minne.varde(), poster: snabb.poster.length,
      snabb_gz: manifest.snabb.gz_byte, lang_gz: manifest.lang.gz_byte, ny_lang: nyLang });
    await skrivHink("historik.json", JSON.stringify({ schema: 1, korningar: hist.slice(-HISTORIK) }));
    return new Response(JSON.stringify({ ok: true, generated_at: snabb.generated_at, poster: snabb.poster.length, noter: snabb.noter,
      svar_byte: { situation: sit.byte, restider: tt.byte, farjor: fa.byte, farjeleder: fr.byte }, manifest, ny_lang: nyLang,
      ms: { ...ms, totalt: Math.round(performance.now() - t0) }, minne_mb: minne.varde() }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    minne.mat();
    return new Response(JSON.stringify({ ok: false, error: String(e), ms, minne_mb: minne.varde() }), { status: 500 });
  }
});
