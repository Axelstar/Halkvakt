// FAVORITPROVET (favoriterna, DECISIONS #529, Bengt 11/10: "vi bygger det nu … en testmiljö … under faktiska förhållanden och inte
// når ut till själva telefonen"). Bygger rapportfilen som den är tänkt för appen, och det fliken skulle visa för skuggans 30 rutter,
// var 30:e minut (:08/:38, sql/047), med raderna sammanslagna och notisen simulerad (#530) — men skriver ALLT till hinken `favoritprov` i Supabase Storage, aldrig till kartrepot eller
// data/app/v1/, så ingen app läser något av det. Filerna skrivs över (ingen historik som växer); visningen är docs/favoritprov.html.
//
// index.ts är GENERERAD av scripts/bundle-favoritprov.ts ur engine/src, publish/rapport-core.ts, skuggans rutter (RUTTER_PROV, ur
// skuggmotor/main.ts) och den här filen — ändra aldrig i index.ts. Svaret bär tiden per steg och storlekarna, så att provet mot
// resursfelen (546, DECISIONS #344, #360) går att läsa ur net._http_response.
const SB = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TRV = Deno.env.get("TRAFIKVERKET_API_KEY")!;
const CDN = "https://axelstar.github.io/halkvakt-karta/data/app/v1/";
const HINK = "favoritprov";
const HISTORIK = 48;   // ett dygn med två körningar i timmen
// Minnet per körning (Bengt 13/10: "mät minnet", DECISIONS #541): det största värdet vid stegens slut, i MB med en decimal. heap är
// isolatets V8-hög; rss är processens, som körtiden kan dela med andra funktioner. null när körtiden saknar Deno.memoryUsage.
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

// SYNKPROVET (DECISIONS #533, #534, kort #340): bilen kör i GitHub Actions (scripts/favoritprov-synk.ts, :18/:48) och skriver en rad
// per körning i favoritprov_synk (sql/050). Varje körning här speglar de senaste raderna till hinken: synk.json (den senaste) och
// synk-historik.json (SYNK_HISTORIK körningar), som visningen läser. Ett fel här stoppar aldrig rapporten.
const SYNK_HISTORIK = 96;   // två dygn
async function speglaSynk(): Promise<string> {
  const r = await fetch(`${SB}/rest/v1/favoritprov_synk?select=data&order=t.desc&limit=${SYNK_HISTORIK}`,
    { headers: { Authorization: `Bearer ${SRK}`, apikey: SRK } });
  if (!r.ok) return `synken: ${r.status} ${(await r.text()).slice(0, 120)}`;
  const rader = (await r.json()) as { data: any }[];
  if (!rader.length) return "synken: inga rader än";
  const { historik: _h, ...senaste } = rader[0].data;
  await skrivHink("synk.json", JSON.stringify(senaste));
  await skrivHink("synk-historik.json", JSON.stringify({ schema: 1, korningar: rader.map((x) => x.data.historik).reverse() }));
  return `synken: ${rader.length} körningar speglade, senast ${senaste.generated_at}`;
}

import { nyckelGiltig } from "../_shared/nyckel.ts";
Deno.serve(async (req) => {
  if (!(await nyckelGiltig(req))) return new Response("forbidden", { status: 403 });  // nyckeln i databasen, DECISIONS #571
  const minne = minnesmatare(); minne.mat();
  const t0 = performance.now(); const ms: Record<string, number> = {}; const steg = (n: string, t: number) => { ms[n] = Math.round(performance.now() - t); minne.mat(); };
  try {
    const nu = Date.now();
    let t = performance.now();
    // Frågorna och urvalet av stationer bor i rapport-core, delade med favoriter (appens fil, DECISIONS #617).
    const [qSit, qTt, qFa, qFr] = rapportFragor(nu);
    const [sit, tt, fa, fr, lv, st, wl] = await Promise.all([
      trv(qSit), trv(qTt), trv(qFa), trv(qFr),
      fetch(CDN + "live.json?t=" + nu).then((r) => r.json()),
      fetch(CDN + "static.json?t=" + nu).then((r) => r.json()),
      fetch(`${SB}/rest/v1/weather_latest?select=station_id,name,air_temp_c`, { headers: { Authorization: `Bearer ${SRK}`, apikey: SRK } }).then((r) => r.json()),
    ]);
    steg("hamtning", t);
    t = performance.now();
    const { snabb, lang } = byggRapport({ nu, situationer: sit.rader, restider: tt.rader, farjor: fa.rader, farjeleder: fr.rader,
      stationer: kallaStationer(lv, wl) });
    if (fr.rader.length) snabb.noter.push(`färjeledens fält: ${Object.keys(fr.rader[0]).join(", ")}`);
    steg("rapport", t);
    t = performance.now();
    const sSnabb = JSON.stringify(snabb), sLang = JSON.stringify(lang);
    const fore = await lasHink("manifest.json");
    const shaLang = await sha256(sLang);
    // Den långsamma delen skrivs bara när linjerna ändrats (docs/FAVORITER.html §7) — generated_at räknas inte.
    const shaLangUtanTid = await sha256(JSON.stringify(lang.linjer));
    const nyLang = fore?.lang?.innehall !== shaLangUtanTid;
    const manifest = { schema: 1, generated_at: snabb.generated_at, lagesfil: lv.generated_at,
      snabb: { sha256: await sha256(sSnabb), byte: utf8Byte(sSnabb), gz_byte: await gzBytes(sSnabb) },
      lang: nyLang ? { sha256: shaLang, innehall: shaLangUtanTid, byte: utf8Byte(sLang), gz_byte: await gzBytes(sLang), skriven: snabb.generated_at } : fore.lang };
    await skrivHink("rapport-snabb.json", sSnabb);
    if (nyLang) await skrivHink("rapport-lang.json", sLang);
    await skrivHink("manifest.json", JSON.stringify(manifest));
    steg("skrivning", t);
    t = performance.now();
    const forra = await lasHink("favoriter.json");
    const rutter: Record<string, unknown> = {};
    for (const [namn, linje] of Object.entries(RUTTER_PROV)) {
      const rader = favoritRapport(linje, lv, st, snabb, lang);
      const nytt = nyttSedan(forra?.rutter?.[namn]?.rader ?? null, rader);
      // Skärmen visar grupperna (#530: sammanslagna per slag och väg); raderna står kvar under dem, och notisen räknas på det nya.
      rutter[namn] = { km: Math.round(linje.reduce((s, p, i) => i ? s + haversineM({ lon: linje[i - 1][0], lat: linje[i - 1][1] }, { lon: p[0], lat: p[1] }) : 0, 0) / 1000),
        grupper: grupperade(rader), rader, nytt, notis: notis(rader, nytt, nu), tomma: tomma(rader) };
    }
    steg("rutterna", t);
    const fav = { schema: 1, generated_at: snabb.generated_at, lagesfil: lv.generated_at, forra: forra?.generated_at ?? null, rutter };
    await skrivHink("favoriter.json", JSON.stringify(fav));
    const hist = (await lasHink("historik.json"))?.korningar ?? [];
    hist.push({ t: snabb.generated_at, ms: Math.round(performance.now() - t0), minne_mb: minne.varde(), poster: snabb.poster.length, snabb_gz: manifest.snabb.gz_byte,
      lang_gz: manifest.lang.gz_byte, rader: Object.fromEntries(Object.entries(rutter).map(([n, r]: [string, any]) => [n, r.rader.length])),
      nytt: Object.values(rutter).reduce((s: number, r: any) => s + r.nytt.length, 0),
      grupper: Object.values(rutter).reduce((s: number, r: any) => s + r.grupper.length, 0),
      notis: Object.entries(rutter).filter(([, r]: [string, any]) => r.notis.ja).map(([n]) => n) });
    await skrivHink("historik.json", JSON.stringify({ schema: 1, korningar: hist.slice(-HISTORIK) }));
    t = performance.now();
    const synk = await speglaSynk().catch((e) => `synken: ${String(e).slice(0, 160)}`);
    steg("synken", t);
    return new Response(JSON.stringify({ ok: true, generated_at: snabb.generated_at, poster: snabb.poster.length, noter: snabb.noter,
      svar_byte: { situation: sit.byte, restider: tt.byte, farjor: fa.byte, farjeleder: fr.byte }, manifest, ny_lang: nyLang,
      rutter: Object.keys(rutter).length, synk, ms: { ...ms, totalt: Math.round(performance.now() - t0) }, minne_mb: minne.varde() }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    minne.mat();
    return new Response(JSON.stringify({ ok: false, error: String(e), ms, minne_mb: minne.varde() }), { status: 500 });
  }
});
