// Testbilarna — publik rapportsida för människor (Axel & Bengt), inte ingenjörer.
// Omskriven 30/8 efter Axels "så jag och pappa förstår".
const SB = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
const svTid = (iso: string) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", weekday: "short",
    hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

Deno.serve(async () => {
  try {
    const since = new Date(Date.now() - 24 * 3600e3).toISOString();
    const r = await fetch(
      `${SB}/rest/v1/shadow_log?select=route,run_at,n_hazards,n_alerts,alerts&run_at=gte.${since}&order=run_at.desc&limit=2000`,
      { headers: { Authorization: `Bearer ${SRK}`, apikey: SRK } },
    );
    const raw = await r.json();
    if (!Array.isArray(raw)) return new Response("datafel: " + JSON.stringify(raw), { status: 500 });
    const rows: { route: string; run_at: string; n_hazards: number; n_alerts: number;
      alerts: { kind: string; text: string }[] }[] = raw;

    const byRoute = new Map<string, typeof rows>();
    for (const row of rows) {
      if (!byRoute.has(row.route)) byRoute.set(row.route, []);
      byRoute.get(row.route)!.push(row);
    }
    const KIND: Record<string, string> = { camera: "📷", slippery: "🧊", accident: "⚠️",
      freeze: "❄️", wildlife: "🦌" };
    const talkers: { route: string; runs: number; warns: number; latest: string;
      lines: { icon: string; text: string; n: number }[] }[] = [];
    const quiet: { route: string; runs: number }[] = [];
    for (const [route, rr] of byRoute.entries()) {
      const warns = rr.reduce((a, x) => a + x.n_alerts, 0);
      if (!warns) { quiet.push({ route, runs: rr.length }); continue; }
      const texts = new Map<string, { n: number; kind: string }>();
      for (const row of rr) for (const a of row.alerts ?? []) {
        const e = texts.get(a.text) ?? { n: 0, kind: a.kind };
        e.n++; texts.set(a.text, e);
      }
      talkers.push({ route, runs: rr.length, warns, latest: rr[0].run_at,
        lines: [...texts.entries()].map(([t, e]) => ({ icon: KIND[e.kind] ?? "🔔", text: t, n: e.n })) });
    }
    talkers.sort((a, b) => b.warns - a.warns);
    quiet.sort((a, b) => a.route.localeCompare(b.route, "sv"));

    const runs = rows.length;
    const totWarns = rows.reduce((a, x) => a + x.n_alerts, 0);
    const bevakas = rows[0]?.n_hazards ?? 0;

    const talkerCards = talkers.map((t) => `
      <div class="kort">
        <div class="rad"><span class="rutt">🚗 ${esc(t.route)}</span>
          <span class="pill hot">${t.warns} varning${t.warns === 1 ? "" : "ar"}</span></div>
        <div class="dim">Provkörd ${t.runs} gång${t.runs === 1 ? "" : "er"} senaste dygnet · senast ${svTid(t.latest)}</div>
        <div class="sagt">Rösten har sagt:</div>
        <ul>${t.lines.map((l) => `<li>${l.icon} <i>"${esc(l.text)}"</i>${l.n > 1 ? ` <span class="dim">(${l.n} gånger)</span>` : ""}</li>`).join("")}</ul>
      </div>`).join("");

    const quietCard = quiet.length ? `
      <div class="kort tyst">
        <div class="rad"><span class="rutt">😴 Tysta vägar just nu — ${quiet.length} rutter</span></div>
        <div class="dim">Inga faror längs dem i dag. Det är precis så här det ska se ut i augusti —
        när första frostnatten kommer vaknar de.</div>
        <div class="chips">${quiet.map((q) => `<span class="chip">${esc(q.route)}</span>`).join("")}</div>
      </div>` : "";

    const html = `<!doctype html><html lang="sv"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Halkvakt — testbilarna</title><style>
body{background:#06090D;color:#E8EDF2;font:16px/1.55 -apple-system,system-ui,sans-serif;margin:auto;padding:20px;max-width:720px}
h1{font-size:15px;letter-spacing:3.5px;font-weight:900;margin:0 0 4px}h1 .tri{color:#FFC400}
h2{font-size:24px;margin:0 0 6px}
.sub{color:#8A97A3;margin-bottom:18px}
.tal{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px}
.tot{flex:1;min-width:150px;background:#0E1B25;border:1px solid #26313C;border-radius:14px;padding:12px 16px}
.tot b{display:block;color:#FFC400;font-size:26px}
.tot span{color:#8A97A3;font-size:13px}
.kort{background:#0E1B25;border:1px solid #26313C;border-radius:14px;padding:14px 18px;margin-bottom:12px}
.kort.tyst{opacity:.85}
.rad{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.rutt{font-weight:800;font-size:17px}
.pill{font-size:11px;font-weight:800;letter-spacing:1px;background:#06090D;border:1px solid #26313C;border-radius:99px;padding:4px 12px}
.pill.hot{color:#2FBF71}
.sagt{margin-top:10px;font-size:12px;letter-spacing:1.5px;font-weight:800;color:#FFC400;text-transform:uppercase}
ul{margin:6px 0 2px;padding-left:8px;list-style:none}li{margin:6px 0}
.chips{margin-top:10px;display:flex;gap:6px;flex-wrap:wrap}
.chip{font-size:12px;background:#06090D;border:1px solid #26313C;border-radius:99px;padding:3px 10px;color:#8A97A3}
.dim{color:#5C6873;font-size:13px}
.fot{margin-top:20px;color:#5C6873;font-size:12px}</style></head><body>
<h1><span class="tri">⚠</span> HALKVAKT</h1>
<h2>Vad har testbilarna hört?</h2>
<div class="sub">Tjugo låtsasbilar kör Sveriges vägar dygnet runt — genom exakt samma
varningsmotor som sitter i appen, med färsk riktig vägdata. Här är vad rösten
sagt i dem det senaste dygnet.</div>
<div class="tal">
  <div class="tot"><b>${runs}</b><span>provkörningar<br>senaste dygnet</span></div>
  <div class="tot"><b>${totWarns}</b><span>röstvarningar<br>uttalade</span></div>
  <div class="tot"><b>${bevakas.toLocaleString("sv-SE")}</b><span>punkter bevakas just nu<br>(faror + fartkameror i landet)</span></div>
</div>
${talkerCards || '<div class="kort"><div class="dim">Ingen bil har behövt varna det senaste dygnet.</div></div>'}
${quietCard}
<div class="fot">Sidan hämtar färska siffror varje gång du laddar om den.
Kameravarningar dominerar på sommaren — halka ❄️, frysrisk och vilt 🦌 fyller på när vintern kommer.</div>
</body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (e) { return new Response("rapportfel: " + String(e), { status: 500 }); }
});
