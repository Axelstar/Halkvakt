// ═══ Skuggmotorn (#20, Bengts design): kör motorn mot färska snapshoten på fasta
// referensrutter var 30:e min och loggar vad den SKULLE ha sagt — varningslogg
// med indata oavsett användarantal. Vid varning: arkivera närmaste väglags-
// kamerabild (facit-hinken, dedupe per station & 3 h). Rör aldrig användare.
// Land (#34): ?land=fi kör de finska rutterna mot den finska snapshoten. Samma motor,
// samma logg (kolumnen land), samma rapport. Sverige är standard.
const CDN_BY_LAND: Record<string, string> = {
  se: "https://axelstar.github.io/halkvakt-karta/data/app/v1/",
  fi: "https://axelstar.github.io/halkvakt-karta/data/app/fi/v1/",
};
const SB = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TRV = Deno.env.get("TRAFIKVERKET_API_KEY")!;

// Grova men FASTA referenslinjer (jämförbarhet över tid slår metern):
// Finland (#34): tre referenslinjer, samma grovhet som de svenska. Fejkresorna.
const ROUTES_FI: Record<string, [number, number][]> = {
  "E18 Åbo→Helsingfors":     [[22.27,60.45],[22.60,60.43],[23.13,60.40],[23.60,60.38],[24.05,60.32],[24.50,60.24],[24.94,60.17]],
  "E75 Helsingfors→Lahtis":  [[24.94,60.17],[25.03,60.36],[25.12,60.52],[25.30,60.70],[25.50,60.85],[25.66,60.98]],
  "Rv8 Vasa→Uleåborg":       [[21.62,63.10],[22.20,63.35],[22.70,63.55],[23.15,63.80],[23.80,64.05],[24.45,64.40],[25.05,64.75],[25.47,65.01]],
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
    const routes = land === "fi" ? ROUTES_FI : ROUTES;
    const bust = `?t=${Date.now()}`;
    const [st, lv] = await Promise.all([
      fetch(CDN + "static.json" + bust).then((r) => r.json()),
      fetch(CDN + "live.json" + bust).then((r) => r.json()),
    ]);
    const hazards = snapshotToHazards(st, lv);
    const results: Record<string, unknown> = {};
    let facitTotal = 0;
    // Rotation: 3 rutter per varv (CPU-taket, läxa 29/8) — alla 20 täcks varje 3,5 h.
    // Finland har bara tre rutter ⇒ alla körs varje varv.
    const allNames = Object.keys(routes).sort();
    const slots = land === "fi" ? 1 : 7;
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
