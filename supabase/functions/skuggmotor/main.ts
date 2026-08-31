// ═══ Skuggmotorn (#20, Bengts design): kör motorn mot färska snapshoten på fasta
// referensrutter var 30:e min och loggar vad den SKULLE ha sagt — varningslogg
// med indata oavsett användarantal. Vid varning: arkivera närmaste väglags-
// kamerabild (facit-hinken, dedupe per station & 3 h). Rör aldrig användare.
// Land (#34): ?land=fi kör de finska rutterna mot den finska snapshoten. Samma motor,
// samma logg (kolumnen land), samma rapport. Sverige är standard.
const CDN_BY_LAND: Record<string, string> = {
  se: "https://axelstar.github.io/halkvakt-karta/data/app/v1/",
  fi: "https://axelstar.github.io/halkvakt-karta/data/app/fi/v1/",
  no: "https://axelstar.github.io/halkvakt-karta/data/app/no/v1/",   // #35, publiceras när Vegvesen-kontot finns
};
const SB = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TRV = Deno.env.get("TRAFIKVERKET_API_KEY")!;

// Grova men FASTA referenslinjer (jämförbarhet över tid slår metern):
// Finland (#34): tre referenslinjer, samma grovhet som de svenska. Fejkresorna.
const ROUTES_FI: Record<string, [number, number][]> = {
  // Söder: E18-stråket och kusten
  "E18 Åbo→Helsingfors":        [[22.27,60.45],[22.60,60.43],[23.13,60.40],[23.60,60.38],[24.05,60.32],[24.50,60.24],[24.94,60.17]],
  "E18 Helsingfors→Kotka":      [[24.94,60.17],[25.30,60.27],[25.66,60.39],[26.23,60.46],[26.95,60.47]],
  "E18 Kotka→Vaalimaa":         [[26.95,60.47],[27.20,60.57],[27.55,60.58],[27.85,60.58]],
  "Rv2 Helsingfors→Björneborg": [[24.94,60.17],[24.32,60.33],[23.62,60.81],[23.10,61.02],[22.70,61.18],[21.80,61.49]],
  "Rv8 Åbo→Björneborg":         [[22.27,60.45],[21.98,60.68],[21.69,60.88],[21.51,61.13],[21.80,61.49]],
  // Mitten: vt3, vt4, vt9, vt5
  "Rv3 Helsingfors→Tammerfors": [[24.94,60.17],[24.86,60.63],[24.46,61.00],[23.95,61.27],[23.76,61.50]],
  "Rv3 Tammerfors→Vasa":        [[23.76,61.50],[23.30,61.75],[23.02,62.01],[22.75,62.49],[22.01,62.98],[21.62,63.10]],
  "E75 Helsingfors→Lahtis":     [[24.94,60.17],[25.03,60.36],[25.12,60.52],[25.30,60.70],[25.50,60.85],[25.66,60.98]],
  "E75 Lahtis→Jyväskylä":       [[25.66,60.98],[26.03,61.21],[25.95,61.60],[25.85,61.95],[25.75,62.24]],
  "Rv9 Tammerfors→Jyväskylä":   [[23.76,61.50],[24.36,61.68],[25.19,61.86],[25.75,62.24]],
  "Rv9 Jyväskylä→Kuopio":       [[25.75,62.24],[26.43,62.39],[27.12,62.62],[27.68,62.89]],
  "Rv5 Lahtis→Kuopio":          [[25.66,60.98],[26.03,61.21],[26.70,61.45],[27.27,61.69],[27.87,62.31],[27.68,62.89]],
  "Rv6 Kouvola→Joensuu":        [[26.70,60.87],[27.60,61.00],[28.19,61.06],[28.77,61.17],[29.50,61.55],[29.76,62.60]],
  // Norr: vt4-stråket, kusten, fjällvägarna
  "E75 Jyväskylä→Uleåborg":     [[25.75,62.24],[25.73,62.60],[25.86,63.07],[25.57,63.37],[25.85,63.68],[25.75,63.98],[25.87,64.27],[25.47,65.01]],
  "Rv8 Björneborg→Vasa":        [[21.80,61.49],[21.51,61.86],[21.37,62.27],[21.34,62.47],[21.62,63.10]],
  "Rv8 Vasa→Uleåborg":          [[21.62,63.10],[22.20,63.35],[22.70,63.55],[23.15,63.80],[23.80,64.05],[24.45,64.40],[25.05,64.75],[25.47,65.01]],
  "Rv5 Kuopio→Kajaani":         [[27.68,62.89],[27.66,63.08],[27.19,63.56],[27.50,63.90],[27.73,64.22]],
  "E75 Uleåborg→Rovaniemi":     [[25.47,65.01],[25.37,65.32],[25.05,65.66],[24.56,65.74],[25.00,66.10],[25.73,66.50]],
  "Rv20 Uleåborg→Kuusamo":      [[25.47,65.01],[26.20,65.20],[26.99,65.36],[28.24,65.57],[29.19,65.96]],
  "E8 Torneå→Kilpisjärvi":      [[24.15,65.85],[23.97,66.78],[23.79,67.33],[23.68,67.96],[22.50,68.50],[20.79,69.05]],
};

// Norge (#35): tjugo referenslinjer. Väntar på Vegvesens DATEX-konto; rutterna är klara.
const ROUTES_NO: Record<string, [number, number][]> = {
  "E6 Oslo→Lillehammer":        [[10.75,59.91],[11.03,60.20],[11.17,60.60],[10.93,60.80],[10.69,61.11]],
  "E6 Lillehammer→Dombås":      [[10.69,61.11],[10.48,61.50],[9.70,61.87],[9.13,62.08]],
  "E6 Dombås→Trondheim":        [[9.13,62.08],[9.55,62.35],[9.96,62.58],[10.15,63.00],[10.40,63.43]],
  "E6 Trondheim→Mo i Rana":     [[10.40,63.43],[11.30,63.85],[11.99,64.33],[12.65,64.90],[13.20,65.50],[14.14,66.31]],
  "E6 Mo i Rana→Narvik":        [[14.14,66.31],[15.40,66.95],[15.35,67.25],[16.03,67.70],[16.55,68.10],[17.43,68.44]],
  "E6 Narvik→Alta":             [[17.43,68.44],[18.96,68.85],[19.85,69.30],[20.90,69.60],[22.20,69.70],[23.27,69.97]],
  "E6 Alta→Kirkenes":           [[23.27,69.97],[24.90,70.20],[26.00,70.05],[27.60,70.05],[29.00,69.90],[30.05,69.73]],
  "E18 Oslo→Kristiansand":      [[10.75,59.91],[10.40,59.60],[10.03,59.27],[9.60,59.15],[9.10,58.98],[8.60,58.70],[8.00,58.15]],
  "E39 Kristiansand→Stavanger": [[8.00,58.15],[7.45,58.15],[7.10,58.35],[6.55,58.70],[5.75,58.97]],
  "E39 Stavanger→Bergen":       [[5.75,58.97],[5.75,59.30],[5.65,59.60],[5.55,59.90],[5.35,60.25],[5.33,60.39]],
  "E39 Bergen→Ålesund":         [[5.33,60.39],[5.60,60.85],[5.80,61.20],[6.10,61.50],[6.40,61.80],[6.20,62.20],[6.15,62.47]],
  "E39 Ålesund→Trondheim":      [[6.15,62.47],[6.80,62.55],[7.50,62.90],[8.05,63.05],[9.10,63.10],[10.40,63.43]],
  "E16 Oslo→Bergen":            [[10.75,59.91],[10.30,60.10],[9.80,60.55],[9.10,60.90],[8.20,61.15],[7.40,61.05],[6.70,60.90],[5.90,60.55],[5.33,60.39]],
  "Rv7 Hønefoss→Bergen":        [[10.25,60.17],[9.60,60.50],[8.80,60.55],[8.00,60.42],[7.50,60.45],[7.00,60.50],[6.40,60.45],[5.33,60.39]],
  "E134 Drammen→Haugesund":     [[10.20,59.74],[9.60,59.60],[8.90,59.60],[8.10,59.80],[7.35,59.85],[6.60,59.75],[5.85,59.55],[5.27,59.41]],
  "Rv3 Elverum→Ulsberg":        [[11.56,60.88],[11.20,61.50],[10.80,61.90],[10.45,62.30],[10.05,62.75]],
  "E14 Trondheim→Storlien":     [[10.40,63.43],[11.10,63.32],[11.60,63.30],[12.08,63.30]],
  "E10 Narvik→Å i Lofoten":     [[17.43,68.44],[16.70,68.50],[15.90,68.60],[15.00,68.55],[14.20,68.30],[13.60,68.15],[13.00,67.95]],
  "E8 Skibotn→Kilpisjärvi":     [[20.28,69.39],[20.50,69.20],[20.60,69.10],[20.79,69.05]],
  "Rv15 Otta→Stryn":            [[9.53,61.77],[8.90,61.90],[8.20,62.00],[7.60,62.00],[6.72,61.91]],
};

const ROUTES: Record<string, [number, number][]> = {
  "E22 Malmö→Kristianstad": [[13.05,55.60],[13.19,55.70],[13.35,55.76],[13.54,55.83],[13.74,55.85],[13.95,55.90],[14.05,55.95],[14.16,56.03]],
  "Väg 23 Höör→Osby":       [[13.54,55.94],[13.62,56.02],[13.70,56.09],[13.77,56.16],[13.85,56.25],[13.93,56.32],[13.98,56.38]],
  "Väg 19 Ystad→Kristianstad": [[13.82,55.43],[13.87,55.50],[13.95,55.55],[14.02,55.63],[14.10,55.72],[14.13,55.82],[14.15,55.92],[14.16,56.02]],
  "E6 Malmö→Halmstad": [[12.99,55.61],[12.83,55.87],[12.70,56.05],[12.86,56.24],[12.85,56.42],[13.04,56.51],[12.86,56.67]],
  "E6 Halmstad→Göteborg": [[12.86,56.67],[12.49,56.90],[12.25,57.11],[12.08,57.49],[11.97,57.71]],
  "E6 Göteborg→Strömstad": [[11.97,57.71],[11.98,57.87],[11.82,58.07],[11.94,58.35],[11.68,58.47],[11.32,58.72],[11.17,58.94]],
  "Rv40 Göteborg→Jönköping": [[11.97,57.71],[12.22,57.68],[12.94,57.72],[13.42,57.79],[14.16,57.78]],
  "E4 Helsingborg→Jönköping": [[12.70,56.05],[13.28,56.28],[13.60,56.46],[13.94,56.83],[14.04,57.19],[14.16,57.78]],
  "E4 Jönköping→Linköping": [[14.16,57.78],[14.47,58.02],[14.65,58.23],[15.13,58.32],[15.62,58.41]],
  "E4 Linköping→Södertälje": [[15.62,58.41],[16.19,58.59],[17.01,58.75],[17.63,59.20]],
  "E4 Södertälje→Uppsala": [[17.63,59.20],[18.07,59.33],[17.92,59.65],[17.64,59.86]],
  "E4 Uppsala→Gävle": [[17.64,59.86],[17.51,60.34],[17.14,60.67]],
  "E4 Gävle→Sundsvall": [[17.14,60.67],[17.06,61.30],[17.11,61.73],[17.31,62.39]],
  "E4 Sundsvall→Umeå": [[17.31,62.39],[17.94,62.63],[18.72,63.29],[19.50,63.57],[20.26,63.83]],
  "E4 Umeå→Luleå": [[20.26,63.83],[21.06,64.75],[21.48,65.32],[22.15,65.58]],
  "E10 Luleå→Kiruna": [[22.15,65.58],[21.69,65.83],[20.66,67.13],[20.23,67.86]],
  "E14 Sundsvall→Åre": [[17.31,62.39],[15.66,62.53],[15.42,62.75],[14.64,63.18],[13.08,63.40]],
  "E18 Karlstad→Örebro": [[13.50,59.38],[14.11,59.31],[14.52,59.33],[15.21,59.27]],
  "E18 Örebro→Stockholm": [[15.21,59.27],[15.84,59.39],[16.55,59.61],[17.07,59.64],[18.07,59.33]],
  "Rv70 Enköping→Mora": [[17.07,59.64],[16.60,59.92],[16.17,60.15],[15.98,60.28],[15.43,60.48],[15.13,60.55],[14.99,60.73],[15.12,60.89],[14.54,61.00]],
};

function traceAlong(line: [number, number][], kmh = 80, stepS = 5): Fix[] {
  const mps = (kmh * 1000) / 3600;
  const fixes: Fix[] = []; let t = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [lon1, lat1] = line[i], [lon2, lat2] = line[i + 1];
    const d = haversineM({ lon: lon1, lat: lat1 }, { lon: lon2, lat: lat2 });
    const steps = Math.max(1, Math.round(d / (mps * stepS)));
    for (let s = 0; s < steps; s++) {
      const f = s / steps;
      fixes.push({ t, lon: lon1 + (lon2 - lon1) * f, lat: lat1 + (lat2 - lat1) * f, speedKmh: kmh });
      t += stepS;
    }
  }
  return fixes;
}

async function trvCameras(): Promise<{ id: string; lon: number; lat: number; url: string }[]> {
  const q = `<REQUEST><LOGIN authenticationkey="${TRV}"/><QUERY objecttype="Camera" schemaversion="1" limit="1500"><FILTER><EQ name="Type" value="Väglagskamera"/></FILTER><INCLUDE>Id</INCLUDE><INCLUDE>PhotoUrl</INCLUDE><INCLUDE>Geometry.WGS84</INCLUDE></QUERY></REQUEST>`;
  const r = await fetch("https://api.trafikinfo.trafikverket.se/v2/data.json", {
    method: "POST", headers: { "Content-Type": "text/xml" }, body: q });
  const j = await r.json();
  const rows = j?.RESPONSE?.RESULT?.[0]?.Camera ?? [];
  return rows.flatMap((c: any) => {
    const m = /POINT \(([\d.]+) ([\d.]+)\)/.exec(c?.Geometry?.WGS84 ?? "");
    return m && c.PhotoUrl ? [{ id: String(c.Id), lon: +m[1], lat: +m[2], url: c.PhotoUrl }] : [];
  });
}

let facitBudget = 5;
async function archiveFacit(alerts: Alert[], route: string): Promise<number> {
  if (facitBudget <= 0) return 0;
  if (!alerts.length) return 0;
  const cams = await trvCameras();
  if (!cams.length) return 0;
  const bucket3h = Math.floor(Date.now() / 10_800_000);
  const day = new Date().toISOString().slice(0, 10);
  let saved = 0;
  const seen = new Set<string>();
  for (const a of alerts) {
    let best = null as null | typeof cams[0]; let bd = 15_000;
    for (const c of cams) {
      const d = haversineM({ lon: a.lon, lat: a.lat }, { lon: c.lon, lat: c.lat });
      if (d < bd) { bd = d; best = c; }
    }
    if (!best || seen.has(best.id)) continue;
    seen.add(best.id);
    const path = `${day}/${best.id}-${bucket3h}.jpg`;
    const img = await fetch(best.url).then((r) => r.ok ? r.arrayBuffer() : null).catch(() => null);
    if (!img) continue;
    const up = await fetch(`${SB}/storage/v1/object/facit/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SRK}`, "Content-Type": "image/jpeg" },
      body: img });
    if (up.ok) saved++;               // 409 = fanns redan (dedupe) — helt ok
  }
  return saved;
}

Deno.serve(async (req) => {
  const k = Deno.env.get("INGEST_KEY");
  if (!k || req.headers.get("x-halkvakt-key") !== k) return new Response("forbidden", { status: 403 });
  try {
    const land = (new URL(req.url).searchParams.get("land") ?? "se").toLowerCase();
    const CDN = CDN_BY_LAND[land]; if (!CDN) return new Response("okänt land", { status: 400 });
    const routes = land === "fi" ? ROUTES_FI : land === "no" ? ROUTES_NO : ROUTES;
    const bust = `?t=${Date.now()}`;
    const [st, lv] = await Promise.all([
      fetch(CDN + "static.json" + bust).then((r) => r.json()),
      fetch(CDN + "live.json" + bust).then((r) => r.json()),
    ]);
    const hazards = snapshotToHazards(st, lv);
    const results: Record<string, unknown> = {};
    let facitTotal = 0;
    // Rotation: 3 rutter per varv (CPU-taket, läxa 29/8) — alla 20 täcks varje 3,5 h,
    // i båda länderna.
    const allNames = Object.keys(routes).sort();
    const slots = 7;
    const slot = Math.floor(Date.now() / 1800e3) % slots;
    const batch = allNames.filter((_, i) => i % slots === slot);
    for (const name of batch) {
      const line = routes[name];
      {
      const trace = traceAlong(line);
      const alerts = new AlertEngine(hazards).run(trace);
      // Facit-bilder finns bara i Sverige (Trafikverkets väglagskameror).
      const f = land === "se" ? await archiveFacit(alerts, name) : 0; facitBudget -= f; facitTotal += f;
      results[name] = { fixes: trace.length, alerts: alerts.length };
      const body = JSON.stringify({
        route: name, land: land.toUpperCase(), snapshot_generated_at: lv.generated_at,
        n_hazards: hazards.length, n_alerts: alerts.length,
        alerts: alerts.map((a) => ({ t: a.t, kind: a.kind, id: a.hazardId, text: a.text, lon: a.lon, lat: a.lat })),
      });
      await fetch(`${SB}/rest/v1/shadow_log`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "application/json" },
        body });
      }
    }
    return new Response(JSON.stringify({ ok: true, results, facit: facitTotal }), {
      headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
