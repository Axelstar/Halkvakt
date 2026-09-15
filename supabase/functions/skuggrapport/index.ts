// Testbilarna — publik rapportsida för människor (Axel & Bengt), inte ingenjörer.
// Omskriven 30/8 efter Axels "så jag och pappa förstår".
const SB = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
const svTid = (iso: string) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", weekday: "short",
    hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

Deno.serve(async (req) => {
  try {
    // ?land=fi ⇒ de finska testbilarna (#34). Sverige är standard.
    const land = (new URL(req.url).searchParams.get("land") ?? "se").toUpperCase();
    const since = new Date(Date.now() - 24 * 3600e3).toISOString();
    const r = await fetch(
      `${SB}/rest/v1/shadow_log?select=route,run_at,n_hazards,n_alerts,alerts,vb,suppressed&land=eq.${land}&run_at=gte.${since}&order=run_at.desc&limit=2000`,
      { headers: { Authorization: `Bearer ${SRK}`, apikey: SRK } },
    );
    const raw = await r.json();
    if (!Array.isArray(raw)) return new Response("datafel: " + JSON.stringify(raw), { status: 500 });
    const rows: { route: string; run_at: string; n_hazards: number; n_alerts: number;
      alerts: { kind: string; text: string }[]; vb?: { id: string; road: string | null; regn: number | null }[];
      suppressed?: { kind: string; by: string }[] }[] = raw;

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

    const payload = {
      hamtad: new Date().toISOString(),
      provkorningar: runs,
      rostvarningar: totWarns,
      bevakas: bevakas,
      pratare: talkers.map((t) => ({ rutt: t.route, korningar: t.runs, varningar: t.warns,
        senast: t.latest, sagt: t.lines })),
      tysta: quiet.map((q) => q.route),
      // Steg E (#154): vad vattenplaningsrösten SKULLE sagt — aldrig hörd, bara räknad (grind V-B).
      // #127 a (kort #188): vad regel 1b kastade — synligt först 15/9, kolumnen stod tom sedan 13/9.
      sparren: {
        kastade: rows.reduce((a, x) => a + (x.suppressed?.length ?? 0), 0),
        av: [...rows.flatMap((x) => x.suppressed ?? []).reduce((m, s) => m.set(`${s.kind} tystad av ${s.by}`, (m.get(`${s.kind} tystad av ${s.by}`) ?? 0) + 1), new Map<string, number>()).entries()]
          .map(([vad, n]) => ({ vad, n })).sort((a, b) => b.n - a.n),
      },
      vattenplaning: {
        skuggvarningar: rows.reduce((a, x) => a + (x.vb?.length ?? 0), 0),
        rutter: [...byRoute.entries()].flatMap(([route, rr]) => {
          const n = rr.reduce((a, x) => a + (x.vb?.length ?? 0), 0);
          return n ? [{ rutt: route, varningar: n, senast: rr.find((x) => x.vb?.length)!.run_at }] : [];
        }),
      },
    };
    return new Response(JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) { return new Response(JSON.stringify({ fel: String(e) }), { status: 500,
    headers: { "Access-Control-Allow-Origin": "*" } }); }
});
