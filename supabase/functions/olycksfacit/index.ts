// ═══ Olycksfacit, steg 3 och 4: dagens och veckans ärende (DECISIONS #797 och #802, kort #376) ═══
// Anropas av pg_cron varje morgon 05:17 UTC (sql/085). Skriver ett ärende med etiketten `olycka` för varje svenskt dygn från
// FORSTA_DAG till i går (DYGN_EFTER, sedan 11/11: TROSKLAR-OLYCKSFACIT §10, DECISIONS #842) som har kontrollerats färdigt (alla dess
// olyckor har gått genom efterkontrollen, sql/085, sql/108 och sql/110) och som inte har något ärende än (olycksfacit_arenden). Sedan
// 13/11 (TROSKLAR-OLYCKSFACIT §11, DECISIONS #852) stängs dagens ärende alltid direkt: en miss som passar ett känt mönster har en
// förifylld åtgärd, och de övriga läses i veckans ärende. Sedan samma sak för varje ISO-vecka vars söndag är i går eller tidigare, så
// att veckans ärende skrivs måndagen efter veckan (olycksfacit_veckor, sql/088; TROSKLAR-OLYCKSFACIT §9.5): en vecka utan återkommande
// förbättringsområde och utan miss att läsa stängs direkt. Öppna ärenden påminns var sjunde dygn. ?torrt=1 visar ärendena utan att
// skriva något. Med ?drift=1 skriver den i stället driftlarmets ärenden (drift.ts, sql/142, DECISIONS #959).
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";
import { nyckelGiltig } from "../_shared/nyckel.ts";
import { DYGN_EFTER, ETIKETT, FORSTA_DAG, MARK, MARKV, PAMINN_DYGN, TILLDELAD, arendeKropp, arendeTitel, behoverAtgard, forifylld,
  paminnelse, veckaKropp, veckaPaminnelse, veckaTitel, veckansForslag, veckansLasrader } from "./arende.ts";
import { hamta as hamtaOlyckor } from "./hamta.ts";
import { DRIFT_ETIKETT, DRIFT_FELTYPER, type Driftrad, driftKommentar, driftKropp, driftMark, driftTitel } from "./drift.ts";

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

const hamta = (fran: string, till: string) => hamtaOlyckor(sql, fran, till);   // hamta.ts, delad med admin (DECISIONS #936)

/** Ett ärende med etiketten: finns det redan (skrivet men inte bokfört, om förra körningen föll mellan stegen) tas dess nummer,
 *  annars skrivs det. Utan något att åtgärda stängs ett nytt ärende direkt. */
async function skrivArende(titel: string, mark: string, kropp: string, atgarda: number): Promise<number> {
  const finns = ((await gh(`/issues?state=all&labels=${ETIKETT}&per_page=100`)) as any[])
    .find((i) => i.title === titel && (i.body ?? "").includes(mark));
  const nr = finns ? finns.number as number : (await gh("/issues", "POST", {
    title: titel, body: kropp, labels: [ETIKETT], assignees: atgarda ? [TILLDELAD] : [] })).number as number;
  if (!finns && !atgarda) await gh(`/issues/${nr}`, "PATCH", { state: "closed", state_reason: "completed" });
  return nr;
}

/** Driftlarmets ärenden (drift.ts, DECISIONS #959): varje ny rad av de valda feltyperna blir ett ärende per feltyp och svenskt dygn,
 *  eller en kommentar på dygnets ärende. Anropas av pg_cron tio minuter efter fångsten (?drift=1, sql/142). En rad markeras skickad
 *  först när GitHub tagit emot den, så ett fel mitt i tas om nästa varv. */
async function driftArenden(torrt: boolean) {
  const rader = await sql`
    SELECT d.deviation_id, d.feltyp, d.halka, d.sedan, f.start_time, f.road_number, ST_X(f.geom) AS lon, ST_Y(f.geom) AS lat,
           ((d.upptackt_at AT TIME ZONE 'Europe/Stockholm')::date)::text AS dag
    FROM olycksfacit_driftlarm d JOIN olycksfacit f USING (deviation_id)
    WHERE d.skickad_at IS NULL AND d.feltyp = ANY(${DRIFT_FELTYPER as unknown as string[]})
    ORDER BY d.upptackt_at, d.deviation_id, d.feltyp`;
  const ut: unknown[] = [];
  for (const x of rader as any[]) {
    const r: Driftrad = { feltyp: x.feltyp, halka: x.halka, sedan: x.sedan === null ? null : new Date(x.sedan).toISOString(),
      tid: new Date(x.start_time).toISOString(), vag: x.road_number, lon: Number(x.lon), lat: Number(x.lat) };
    if (torrt) { ut.push({ dag: x.dag, feltyp: r.feltyp, titel: driftTitel(x.dag, r.feltyp), kropp: driftKropp(x.dag, r) }); continue; }
    const [finns] = await sql`SELECT nr FROM olycksfacit_drift_arenden WHERE dag = ${x.dag}::date AND feltyp = ${r.feltyp}`;
    let nr: number;
    if (finns) {
      nr = finns.nr;
      await gh(`/issues/${nr}/comments`, "POST", { body: driftKommentar(r) });
    } else {
      // Skrivet men inte bokfört (förra varvet föll mellan stegen): ta dess nummer i stället för att skriva ett till.
      const mark = driftMark(x.dag, r.feltyp);
      const gammal = ((await gh(`/issues?state=all&labels=${DRIFT_ETIKETT}&per_page=100`)) as any[])
        .find((i) => (i.body ?? "").includes(mark));
      nr = gammal ? gammal.number : (await gh("/issues", "POST", { title: driftTitel(x.dag, r.feltyp), body: driftKropp(x.dag, r),
        labels: [DRIFT_ETIKETT], assignees: [TILLDELAD] })).number;
      await sql`INSERT INTO olycksfacit_drift_arenden (dag, feltyp, nr) VALUES (${x.dag}::date, ${r.feltyp}, ${nr}) ON CONFLICT DO NOTHING`;
    }
    await sql`UPDATE olycksfacit_driftlarm SET skickad_at = now(), arende_nr = ${nr}
      WHERE deviation_id = ${x.deviation_id} AND feltyp = ${r.feltyp}`;
    ut.push({ dag: x.dag, feltyp: r.feltyp, nr });
  }
  return json({ ok: true, torrt, drift: ut });
}

Deno.serve(async (req) => {
  if (!(await nyckelGiltig(req))) return new Response("forbidden", { status: 403 });  // nyckeln i databasen, DECISIONS #571
  const url = new URL(req.url);
  const torrt = url.searchParams.get("torrt") === "1";
  if (url.searchParams.get("drift") === "1") {
    try { return await driftArenden(torrt); } catch (e) { return json({ ok: false, fel: String(e).slice(0, 300) }, 500); }
  }
  try {
    // Dygnen utan ärende, från FORSTA_DAG till i går (svensk tid), med antalet olyckor som inte är kontrollerade än.
    const dygn = await sql`
      SELECT g.t::date::text AS dag,
             count(f.deviation_id)::int AS olyckor,
             count(f.deviation_id) FILTER (WHERE f.kontrollerad_at IS NULL)::int AS okontrollerade
      FROM generate_series(${FORSTA_DAG}::date, (now() AT TIME ZONE 'Europe/Stockholm')::date - ${DYGN_EFTER}::int, interval '1 day') AS g(t)
      LEFT JOIN olycksfacit f ON (f.start_time AT TIME ZONE 'Europe/Stockholm')::date = g.t::date
      WHERE NOT EXISTS (SELECT 1 FROM olycksfacit_arenden a WHERE a.dag = g.t::date)
      GROUP BY g.t ORDER BY g.t`;

    const skrivna: unknown[] = [], vantar: string[] = [];
    for (const d of dygn as any[]) {
      if (d.okontrollerade > 0) { vantar.push(d.dag); continue; }
      const olyckor = await hamta(d.dag, d.dag);
      // B (TROSKLAR-OLYCKSFACIT §11, DECISIONS #852): dagens ärende stängs alltid av funktionen. Raderna utan förifylld åtgärd
      // (atgarda) läses i veckans ärende, som hittar dygnet på veckolasning.
      const atgarda = olyckor.filter((o) => behoverAtgard(o) && forifylld(o) === null).length;
      const titel = arendeTitel(d.dag), kropp = arendeKropp(d.dag, olyckor);
      if (torrt) { skrivna.push({ dag: d.dag, titel, atgarda, kropp }); continue; }
      const nr = await skrivArende(titel, MARK(d.dag), kropp, 0);
      await sql`INSERT INTO olycksfacit_arenden (dag, nr, atgarda, stangd, veckolasning) VALUES (${d.dag}::date, ${nr}, ${atgarda}, true, true)
        ON CONFLICT (dag) DO NOTHING`;
      skrivna.push({ dag: d.dag, nr, atgarda });
    }

    // Veckorna (§9.5): ISO-veckor från FORSTA_DAG:s vecka vars söndag är i går eller tidigare, utan ärende. Veckan börjar
    // tidigast på FORSTA_DAG, och säsongen räknas från FORSTA_DAG till veckans söndag.
    const veckor = await sql`
      SELECT to_char(g.m, 'IYYY-"V"IW') AS vecka, greatest(g.m::date, ${FORSTA_DAG}::date)::text AS fran,
             (g.m + interval '6 days')::date::text AS till,
             count(f.deviation_id) FILTER (WHERE f.kontrollerad_at IS NULL)::int AS okontrollerade
      FROM generate_series(date_trunc('week', ${FORSTA_DAG}::date::timestamp),
                           ((now() AT TIME ZONE 'Europe/Stockholm')::date - (6 + ${DYGN_EFTER}::int))::timestamp, interval '7 days') AS g(m)
      LEFT JOIN olycksfacit f ON (f.start_time AT TIME ZONE 'Europe/Stockholm')::date
                                 BETWEEN greatest(g.m::date, ${FORSTA_DAG}::date) AND (g.m + interval '6 days')::date
      WHERE NOT EXISTS (SELECT 1 FROM olycksfacit_veckor v WHERE v.vecka = to_char(g.m, 'IYYY-"V"IW'))
      GROUP BY g.m ORDER BY g.m`;
    const veckorna: unknown[] = [];
    for (const v of veckor as any[]) {
      if (v.okontrollerade > 0) { vantar.push(v.vecka); continue; }
      const veckans = await hamta(v.fran, v.till), sasong = await hamta(FORSTA_DAG, v.till);
      const lasdagar = new Set((await sql`SELECT dag::text AS dag FROM olycksfacit_arenden
        WHERE veckolasning AND dag BETWEEN ${v.fran}::date AND ${v.till}::date`).map((r: any) => r.dag as string));
      const egna = veckans.filter((o) => !o.dubblett);
      const forslag = veckansForslag(egna).length + veckansLasrader(egna, lasdagar).length;   // raderna att åtgärda (§9.5, §11)
      const titel = veckaTitel(v.vecka), kropp = veckaKropp(v.vecka, v.fran, v.till, veckans, sasong, lasdagar);
      if (torrt) { veckorna.push({ vecka: v.vecka, titel, forslag, kropp }); continue; }
      const nr = await skrivArende(titel, MARKV(v.vecka), kropp, forslag);
      await sql`INSERT INTO olycksfacit_veckor (vecka, nr, forslag, stangd) VALUES (${v.vecka}, ${nr}, ${forslag}, ${!forslag})
        ON CONFLICT (vecka) DO NOTHING`;
      veckorna.push({ vecka: v.vecka, nr, forslag });
    }

    // Påminnelsen: öppna ärenden som stått sju dygn sedan de skrevs eller påmindes senast, dygnens och veckornas. Ett öppet
    // ärende läses varje morgon, så att sidan Olyckor (admin, vyn.ts) ser att det stängts samma dygn och inte först vid påminnelsen.
    const paminda: unknown[] = [];
    const oppna = await sql`
      SELECT 'dag' AS slag, dag::text AS nyckel, nr, skapad_at, coalesce(paminnd_at, skapad_at) < now() - ${PAMINN_DYGN}::int * interval '1 day' AS dags FROM olycksfacit_arenden
      WHERE NOT stangd
      UNION ALL
      SELECT 'vecka', vecka, nr, skapad_at, coalesce(paminnd_at, skapad_at) < now() - ${PAMINN_DYGN}::int * interval '1 day' FROM olycksfacit_veckor
      WHERE NOT stangd
      ORDER BY 1, 2`;
    for (const a of oppna as any[]) {
      if (torrt) { if (a.dags) paminda.push({ slag: a.slag, nyckel: a.nyckel, nr: a.nr }); continue; }
      const issue = await gh(`/issues/${a.nr}`);
      const dagar = Math.floor((Date.now() - new Date(a.skapad_at).getTime()) / 86_400_000);
      if (a.slag === "dag") {
        if (issue.state === "closed") { await sql`UPDATE olycksfacit_arenden SET stangd = true WHERE dag = ${a.nyckel}::date`; continue; }
        if (!a.dags) continue;
        await gh(`/issues/${a.nr}/comments`, "POST", { body: paminnelse(a.nyckel, dagar) });
        await sql`UPDATE olycksfacit_arenden SET paminnd_at = now() WHERE dag = ${a.nyckel}::date`;
      } else {
        if (issue.state === "closed") { await sql`UPDATE olycksfacit_veckor SET stangd = true WHERE vecka = ${a.nyckel}`; continue; }
        if (!a.dags) continue;
        await gh(`/issues/${a.nr}/comments`, "POST", { body: veckaPaminnelse(a.nyckel, dagar) });
        await sql`UPDATE olycksfacit_veckor SET paminnd_at = now() WHERE vecka = ${a.nyckel}`;
      }
      paminda.push({ slag: a.slag, nyckel: a.nyckel, nr: a.nr, dagar });
    }
    return json({ ok: true, torrt, skrivna, veckorna, vantar, paminda });
  } catch (e) {
    return json({ ok: false, fel: String(e).slice(0, 300) }, 500);
  }
});
