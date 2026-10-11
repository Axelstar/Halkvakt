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

async function trv(objekt: string, version: string, ns: string, filter: string, include: string[] = [], limit = 20000): Promise<{ rader: any[]; byte: number }> {
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
async function gzBytes(s: string): Promise<number> {
  const cs = new CompressionStream("gzip"); const w = cs.writable.getWriter(); w.write(new TextEncoder().encode(s)); w.close();
  return (await new Response(cs.readable).arrayBuffer()).byteLength;
}

// SYNKPROVET (DECISIONS #533, kort #340; Bengt 11/10): `?lage=synk` på :18/:48 (sql/048), tio minuter efter rapporten. Bilen är motorn
// på färsk lägesfil längs varje favoritrutt; varje larm jämförs med vad rapporten i favoriter.json sa (publish/synk-core.ts). Allt
// skrivs till hinken: synk.json (senaste körningen, skrivs över) och synk-historik.json (de senaste SYNK_HISTORIK körningarna).
const SYNK_HISTORIK = 96;   // två dygn
async function synkVarv(): Promise<Response> {
  const t0 = performance.now(); const nu = Date.now();
  const [fav, lv, st] = await Promise.all([
    lasHink("favoriter.json"),
    fetch(CDN + "live.json?t=" + nu).then((r) => r.json()),
    fetch(CDN + "static.json?t=" + nu).then((r) => r.json()),
  ]);
  const alder = rapportensAlder(fav?.generated_at, nu);
  const faror = snapshotToHazards(st, lv);
  const nuIds = new Set(faror.map((h) => h.id));
  const rutter: Record<string, Utfall> = {}, larmPer: Record<string, Larm[]> = {};
  const skal: string[] = [];
  if (!alder.ok) skal.push(alder.min == null ? "favoriter.json saknas eller saknar generated_at" : `rapporten är ${alder.min} min gammal (räknas ${ALDER_MIN}–${ALDER_MAX})`);
  if (fav?.lagesfil && fav.lagesfil === lv.generated_at) skal.push("samma lägesfil som rapporten — publiceringen har inte gått sedan dess");
  for (const [namn, linje] of Object.entries(RUTTER_PROV)) {
    const larm = bilensLarm(faror, linje);
    larmPer[namn] = larm;
    rutter[namn] = jamfor(fav?.rutter?.[namn]?.rader ?? [], larm, nuIds);
  }
  const sum = summa(rutter, larmPer);
  const ut = { schema: 1, generated_at: new Date(nu).toISOString(), rapport: fav?.generated_at ?? null, alder_min: alder.min, jamforbar: alder.ok,
    lagesfil: lv.generated_at, rapportens_lagesfil: fav?.lagesfil ?? null, skal, summa: sum, rutter };
  await skrivHink("synk.json", JSON.stringify(ut));
  const hist = (await lasHink("synk-historik.json"))?.korningar ?? [];
  hist.push({ t: ut.generated_at, rapport: ut.rapport, alder_min: alder.min, jamforbar: alder.ok, larm: sum.larm, forvarnade: sum.forvarnade,
    saknade: Object.fromEntries(Object.entries(rutter).filter(([, u]) => u.saknade.length).map(([n, u]) => [n, u.saknade.map((x) => x.id)])),
    utan_larm: sum.utanLarm, per_slag: sum.perSlag });
  await skrivHink("synk-historik.json", JSON.stringify({ schema: 1, korningar: hist.slice(-SYNK_HISTORIK) }));
  return new Response(JSON.stringify({ ok: true, lage: "synk", generated_at: ut.generated_at, rapport: ut.rapport, alder_min: alder.min,
    jamforbar: alder.ok, skal, summa: sum, ms: Math.round(performance.now() - t0) }), { headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  const k = Deno.env.get("INGEST_KEY");
  if (!k || req.headers.get("x-halkvakt-key") !== k) return new Response("forbidden", { status: 403 });
  if (new URL(req.url).searchParams.get("lage") === "synk") {
    try { return await synkVarv(); } catch (e) { return new Response(JSON.stringify({ ok: false, lage: "synk", error: String(e) }), { status: 500 }); }
  }
  const t0 = performance.now(); const ms: Record<string, number> = {}; const steg = (n: string, t: number) => { ms[n] = Math.round(performance.now() - t); };
  try {
    const nu = Date.now(); const fran = new Date(nu).toISOString(), till = new Date(nu + 24 * 3_600_000).toISOString();
    let t = performance.now();
    // Bara de slag rapporten bär, bara aktiva, och bara fälten den läser — svaret för hela Situation är stort.
    const TYPER = "Accident,AnimalPresenceObstruction,AbnormalTraffic,MaintenanceWorks,RoadOrCarriagewayOrLaneManagement,VehicleObstruction,GeneralObstruction";
    // Deviation.Deleted finns inte (torrkörningen 38135721921: "Invalid query attribute"); Situation.Deleted gör det.
    const DEV = ["Id", "Suspended", "StartTime", "EndTime", "CreationTime", "ValidUntilFurtherNotice", "MessageTypeValue", "MessageCode",
      "MessageCodeValue", "Header", "Message", "RoadNumber", "LocationDescriptor", "SeverityCode", "SeverityText", "NumberOfLanesRestricted",
      "TemporaryLimit", "TrafficRestrictionType", "Geometry.Point.WGS84", "Geometry.Line.WGS84"].map((f) => `Deviation.${f}`);
    const [sit, tt, fa, fr, lv, st, wl] = await Promise.all([
      // Inget tidsfilter här: avvikelser utan sluttid (vägarbeten tills vidare) skulle falla bort. byggRapport avgör vad som är aktivt.
      trv("Situation", "1.6", "road.trafficinfo", `<IN name="Deviation.MessageTypeValue" value="${TYPER}"/>`, ["Id", "Deleted", ...DEV]),
      trv("TravelTimeRoute", "1.6", "road.trafficinfo", "", ["Id", "Name", "TravelTime", "FreeFlowTravelTime", "TrafficStatus", "MeasureTime", "Geometry.WGS84"]),
      trv("FerryAnnouncement", "1.2", "ferry.trafficinfo", `<AND><GTE name="DepartureTime" value="${fran}"/><LT name="DepartureTime" value="${till}"/></AND>`),
      trv("FerryRoute", "1.2", "ferry.trafficinfo", ""),
      fetch(CDN + "live.json?t=" + nu).then((r) => r.json()),
      fetch(CDN + "static.json?t=" + nu).then((r) => r.json()),
      fetch(`${SB}/rest/v1/weather_latest?select=station_id,name,air_temp_c`, { headers: { Authorization: `Bearer ${SRK}`, apikey: SRK } }).then((r) => r.json()),
    ]);
    steg("hamtning", t);
    t = performance.now();
    const kalla = new Set((lv.weather as any[]).map((w) => String(w.id)));
    const { snabb, lang } = byggRapport({ nu, situationer: sit.rader, restider: tt.rader, farjor: fa.rader, farjeleder: fr.rader,
      // Bara stationerna i lägesfilens weather[] (ytan högst +3 °C) — de enda som kan stå som frysrisk; namnen för alla 855 vägde 8,8 kB (#530).
      stationer: (wl as any[]).filter((w) => kalla.has(String(w.station_id)))
        .map((w) => ({ id: String(w.station_id), namn: String(w.name ?? ""), luft: w.air_temp_c == null ? null : Number(w.air_temp_c) })) });
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
      snabb: { sha256: await sha256(sSnabb), byte: sSnabb.length, gz_byte: await gzBytes(sSnabb) },
      lang: nyLang ? { sha256: shaLang, innehall: shaLangUtanTid, byte: sLang.length, gz_byte: await gzBytes(sLang), skriven: snabb.generated_at } : fore.lang };
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
    hist.push({ t: snabb.generated_at, ms: Math.round(performance.now() - t0), poster: snabb.poster.length, snabb_gz: manifest.snabb.gz_byte,
      lang_gz: manifest.lang.gz_byte, rader: Object.fromEntries(Object.entries(rutter).map(([n, r]: [string, any]) => [n, r.rader.length])),
      nytt: Object.values(rutter).reduce((s: number, r: any) => s + r.nytt.length, 0),
      grupper: Object.values(rutter).reduce((s: number, r: any) => s + r.grupper.length, 0),
      notis: Object.entries(rutter).filter(([, r]: [string, any]) => r.notis.ja).map(([n]) => n) });
    await skrivHink("historik.json", JSON.stringify({ schema: 1, korningar: hist.slice(-HISTORIK) }));
    return new Response(JSON.stringify({ ok: true, generated_at: snabb.generated_at, poster: snabb.poster.length, noter: snabb.noter,
      svar_byte: { situation: sit.byte, restider: tt.byte, farjor: fa.byte, farjeleder: fr.byte }, manifest, ny_lang: nyLang,
      rutter: Object.keys(rutter).length, ms: { ...ms, totalt: Math.round(performance.now() - t0) } }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e), ms }), { status: 500 });
  }
});
