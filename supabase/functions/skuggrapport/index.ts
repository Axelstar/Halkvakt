// Skuggrapporten — publik sida: vad har de 20 virtuella bilarna fått höra
// senaste dygnet? Läser shadow_log, visar per rutt. Svar på Axels önskan
// "20 resor som går och vi ser vad som rapporteras" (29/8 2026).
const SB = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));

Deno.serve(async () => {
  try {
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const r = await fetch(
    `${SB}/rest/v1/shadow_log?select=route,run_at,n_hazards,n_alerts,alerts&run_at=gte.${since}&order=run_at.desc&limit=2000`,
    { headers: { Authorization: `Bearer ${SRK}`, apikey: SRK } },
  );
  const raw = await r.json();
  if (!Array.isArray(raw)) return new Response("shadow_log-fel: " + JSON.stringify(raw), { status: 500 });
  const rows: { route: string; run_at: string; n_hazards: number; n_alerts: number;
    alerts: { kind: string; text: string }[] }[] = raw;

  const byRoute = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!byRoute.has(row.route)) byRoute.set(row.route, []);
    byRoute.get(row.route)!.push(row);
  }
  const runs = rows.length;
  const totAlerts = rows.reduce((a, r) => a + r.n_alerts, 0);
  const KIND: Record<string, string> = { camera: "📷", slippery: "🧊", accident: "⚠️",
    freeze: "❄️", wildlife: "🦌" };

  let sections = "";
  for (const [route, rr] of [...byRoute.entries()].sort()) {
    const latest = rr[0];
    const texts = new Map<string, { n: number; kind: string }>();
    for (const row of rr) for (const a of row.alerts ?? []) {
      const e = texts.get(a.text) ?? { n: 0, kind: a.kind };
      e.n++; texts.set(a.text, e);
    }
    const items = [...texts.entries()].map(([t, e]) =>
      `<li>${KIND[e.kind] ?? "🔔"} ${esc(t)} <span class="dim">×${e.n}</span></li>`).join("") ||
      `<li class="dim">Tyst dygn — inga faror på rutten (normalt i augusti)</li>`;
    const badge = rr.reduce((a, r) => a + r.n_alerts, 0);
    sections += `<details ${badge ? "open" : ""}><summary><b>${esc(route)}</b>
      <span class="pill ${badge ? "hot" : ""}">${rr.length} körningar · ${badge} varningar</span></summary>
      <div class="dim" style="font-size:12px">Senaste: ${latest.run_at.slice(0, 16).replace("T", " ")} UTC
      · ${latest.n_hazards} faror i landet vid körningen</div><ul>${items}</ul></details>`;
  }

  const html = `<!doctype html><html lang="sv"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Halkvakt — skuggrapporten</title><style>
body{background:#06090D;color:#E8EDF2;font:15px/1.5 -apple-system,system-ui,sans-serif;margin:0;padding:20px;max-width:760px;margin:auto}
h1{font-size:15px;letter-spacing:3.5px;font-weight:900}h1 .tri{color:#FFC400}
.sub{color:#8A97A3;margin-bottom:20px}
.tot{background:#0E1B25;border:1px solid #26313C;border-radius:14px;padding:14px 18px;margin-bottom:18px}
.tot b{color:#FFC400;font-size:22px}
details{background:#0E1B25;border:1px solid #26313C;border-radius:14px;padding:12px 16px;margin-bottom:10px}
summary{cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.pill{font-size:11px;font-weight:800;letter-spacing:1px;background:#06090D;border:1px solid #26313C;border-radius:99px;padding:3px 10px;color:#8A97A3}
.pill.hot{color:#2FBF71}
ul{margin:10px 0 4px;padding-left:20px}li{margin:4px 0}
.dim{color:#5C6873}</style></head><body>
<h1><span class="tri">⚠</span> HALKVAKT · SKUGGRAPPORTEN</h1>
<div class="sub">20 virtuella bilar kör Sveriges vägar var 30:e minut genom appens riktiga
varningsmotor och färsk livedata. Det här har de fått höra senaste dygnet.</div>
<div class="tot"><b>${runs}</b> körningar · <b>${totAlerts}</b> röstvarningar senaste 24h</div>
${sections || '<div class="dim">Ingen data ännu — första 20-bilarsvarvet rullar inom 30 min.</div>'}
<div class="dim" style="margin-top:18px;font-size:12px">Uppdateras live vid varje sidladdning.
Kameravarningar dominerar sommartid; halka, frysrisk och vilt fyller på när vintern kommer.</div>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (e) { return new Response("rapportfel: " + String(e), { status: 500 }); }
});
