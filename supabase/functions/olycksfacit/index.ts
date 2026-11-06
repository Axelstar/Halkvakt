// ═══ Olycksfacit, steg 3: dagens ärende (DECISIONS #797, kort #376) ═══
// Anropas av pg_cron varje morgon 05:17 UTC (sql/085). Skriver ett ärende med etiketten `olycka` för varje svenskt dygn från
// FORSTA_DAG till i förrgår som har kontrollerats färdigt (alla dess olyckor har gått genom efterkontrollen, sql/085) och som
// inte har något ärende än (olycksfacit_arenden). Ett dygn utan en tyst halkkopplad olycka får ett ärende som stängs direkt, så
// att en tyst dag syns som tyst och inte som utebliven. Öppna ärenden påminns var sjunde dygn. ?torrt=1 visar ärendena utan att
// skriva något.
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";
import { nyckelGiltig } from "../_shared/nyckel.ts";
import { ETIKETT, FORSTA_DAG, MARK, type Olycka, PAMINN_DYGN, TILLDELAD, arendeKropp, arendeTitel, behoverAtgard, paminnelse } from "./arende.ts";

const REPO = "Axelstar/Halkvakt";
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });

async function gh(path: string, method = "GET", body?: unknown): Promise<any> {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, { method, headers: {
    Authorization: `Bearer ${Deno.env.get("PUBLISH_TOKEN")!}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body) });
  if (!r.ok) throw new Error(`GitHub ${r.status} ${method} ${path}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (!(await nyckelGiltig(req))) return new Response("forbidden", { status: 403 });  // nyckeln i databasen, DECISIONS #571
  const torrt = new URL(req.url).searchParams.get("torrt") === "1";
  try {
    // Dygnen utan ärende, från FORSTA_DAG till i förrgår (svensk tid), med antalet olyckor som inte är kontrollerade än.
    const dygn = await sql`
      SELECT g.t::date::text AS dag,
             count(f.deviation_id)::int AS olyckor,
             count(f.deviation_id) FILTER (WHERE f.kontrollerad_at IS NULL)::int AS okontrollerade
      FROM generate_series(${FORSTA_DAG}::date, (now() AT TIME ZONE 'Europe/Stockholm')::date - 2, interval '1 day') AS g(t)
      LEFT JOIN olycksfacit f ON (f.start_time AT TIME ZONE 'Europe/Stockholm')::date = g.t::date
      WHERE NOT EXISTS (SELECT 1 FROM olycksfacit_arenden a WHERE a.dag = g.t::date)
      GROUP BY g.t ORDER BY g.t`;

    const skrivna: unknown[] = [], vantar: string[] = [];
    for (const d of dygn as any[]) {
      if (d.okontrollerade > 0) { vantar.push(d.dag); continue; }
      const olyckor: Olycka[] = (await sql`
        SELECT start_time, road_number, ST_X(geom) AS lon, ST_Y(geom) AS lat, utfall, orsaker, klass, klass_skal, dubblett_av
        FROM olycksfacit WHERE (start_time AT TIME ZONE 'Europe/Stockholm')::date = ${d.dag}::date
        ORDER BY start_time, deviation_id`).map((r: any) => ({
          tid: new Date(r.start_time).toISOString(), vag: r.road_number, lon: Number(r.lon), lat: Number(r.lat), utfall: r.utfall,
          orsaker: r.orsaker ?? [], klass: r.klass, skal: r.klass_skal, dubblett: r.dubblett_av !== null }));
      const atgarda = olyckor.filter(behoverAtgard).length;
      const titel = arendeTitel(d.dag), kropp = arendeKropp(d.dag, olyckor);
      if (torrt) { skrivna.push({ dag: d.dag, titel, atgarda, kropp }); continue; }

      // Finns ärendet redan (skrivet men inte bokfört, om förra körningen föll mellan stegen), bokförs det i stället för att
      // skrivas en gång till.
      const finns = ((await gh(`/issues?state=all&labels=${ETIKETT}&per_page=100`)) as any[])
        .find((i) => i.title === titel && (i.body ?? "").includes(MARK(d.dag)));
      const nr = finns ? finns.number as number : (await gh("/issues", "POST", {
        title: titel, body: kropp, labels: [ETIKETT], assignees: atgarda ? [TILLDELAD] : [] })).number as number;
      if (!finns && !atgarda) await gh(`/issues/${nr}`, "PATCH", { state: "closed", state_reason: "completed" });
      await sql`INSERT INTO olycksfacit_arenden (dag, nr, atgarda, stangd) VALUES (${d.dag}::date, ${nr}, ${atgarda}, ${!atgarda})
        ON CONFLICT (dag) DO NOTHING`;
      skrivna.push({ dag: d.dag, nr, atgarda });
    }

    // Påminnelsen: öppna ärenden som stått sju dygn sedan de skrevs eller påmindes senast.
    const paminda: unknown[] = [];
    const oppna = await sql`SELECT dag::text AS dag, nr, skapad_at FROM olycksfacit_arenden
      WHERE NOT stangd AND coalesce(paminnd_at, skapad_at) < now() - ${PAMINN_DYGN}::int * interval '1 day' ORDER BY dag`;
    for (const a of oppna as any[]) {
      if (torrt) { paminda.push({ dag: a.dag, nr: a.nr }); continue; }
      const issue = await gh(`/issues/${a.nr}`);
      if (issue.state === "closed") { await sql`UPDATE olycksfacit_arenden SET stangd = true WHERE dag = ${a.dag}::date`; continue; }
      const dagar = Math.floor((Date.now() - new Date(a.skapad_at).getTime()) / 86_400_000);
      await gh(`/issues/${a.nr}/comments`, "POST", { body: paminnelse(a.dag, dagar) });
      await sql`UPDATE olycksfacit_arenden SET paminnd_at = now() WHERE dag = ${a.dag}::date`;
      paminda.push({ dag: a.dag, nr: a.nr, dagar });
    }
    return json({ ok: true, torrt, skrivna, vantar, paminda });
  } catch (e) {
    return json({ ok: false, fel: String(e).slice(0, 300) }, 500);
  }
});
