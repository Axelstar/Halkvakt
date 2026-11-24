// Olyckorna direkt hos Trafikverket (Bengt 24/11: "hur många olyckor finns upptagna i trafikverket uppgifter under tiden 6/11 till
// idag"). A one-off read: asks Trafikverket's open API for every Situation with an Accident deviation, with and without the deleted
// objects, and compares the deviation ids with our own copy (situation_archive) and the counted accidents (olycksfacit). Reads only:
// the database part runs in a READ ONLY transaction that is rolled back. Prints counts per Swedish day only — no texts, no positions.
// Run (CI): olyckor-trv-kontroll.yml. Needs TRAFIKVERKET_API_KEY and DATABASE_URL.
import pg from "pg";

const KEY = process.env.TRAFIKVERKET_API_KEY, DB = process.env.DATABASE_URL;
const FRAN = "2026-11-06";   // first Swedish day of olycksfacit
const dag = (iso: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

type Dev = { id: string; start: string | null; deleted: boolean };

async function tv(deleted: boolean): Promise<{ objekt: number; raderade: number; utanAvvikelse: number; devs: Dev[]; fel?: string }> {
  const inc = ["Id", "Deleted", "ModifiedTime", "Deviation.Id", "Deviation.MessageTypeValue", "Deviation.StartTime"]
    .map((f) => `<INCLUDE>${f}</INCLUDE>`).join("");
  const body = `<REQUEST><LOGIN authenticationkey="${esc(KEY!)}"/>` +
    `<QUERY objecttype="Situation" schemaversion="1.6" namespace="road.trafficinfo" limit="50000"${deleted ? ` includedeletedobjects="true"` : ""}>` +
    `<FILTER><EQ name="Deviation.MessageTypeValue" value="Accident"/></FILTER>${inc}</QUERY></REQUEST>`;
  const r = await fetch("https://api.trafikinfo.trafikverket.se/v2/data.json", { method: "POST", headers: { "Content-Type": "text/xml" }, body });
  const text = await r.text();
  if (!r.ok) return { objekt: 0, raderade: 0, utanAvvikelse: 0, devs: [], fel: `${r.status} ${text.slice(0, 300)}` };
  const rows: any[] = JSON.parse(text)?.RESPONSE?.RESULT?.[0]?.Situation ?? [];
  const devs: Dev[] = [];
  let utan = 0;
  for (const s of rows) {
    const acc = (s.Deviation ?? []).filter((d: any) => d.MessageTypeValue === "Accident");
    if (!acc.length) utan++;
    for (const d of acc) devs.push({ id: String(d.Id ?? s.Id), start: d.StartTime ?? null, deleted: Boolean(s.Deleted) });
  }
  return { objekt: rows.length, raderade: rows.filter((s) => s.Deleted).length, utanAvvikelse: utan, devs };
}

function perDag(starts: (string | null)[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of starts) { const k = s ? dag(s) : "utan starttid"; m.set(k, (m.get(k) ?? 0) + 1); }
  return new Map([...m.entries()].sort());
}

async function main(): Promise<number> {
  if (!KEY || !DB) { console.error("TRAFIKVERKET_API_KEY and DATABASE_URL must be set"); return 1; }
  const aktiva = await tv(false), alla = await tv(true);
  for (const [namn, x] of [["Bara aktiva (som Trafikverkets karta nu)", aktiva], ["Med borttagna objekt (includedeletedobjects)", alla]] as const) {
    console.log(`\n== Trafikverket: ${namn} ==`);
    if (x.fel) { console.log(`  fel: ${x.fel}`); continue; }
    const starts = x.devs.map((d) => d.start).filter((s): s is string => s !== null).sort();
    console.log(`  situationer: ${x.objekt}, varav markerade borttagna: ${x.raderade}, utan olycksavvikelse i svaret: ${x.utanAvvikelse}`);
    console.log(`  olycksavvikelser: ${x.devs.length}, äldsta start: ${starts[0] ?? "-"}, senaste start: ${starts.at(-1) ?? "-"}`);
    console.log(`  per startdag: ${JSON.stringify(Object.fromEntries(perDag(x.devs.map((d) => d.start))))}`);
  }

  const pool = new pg.Pool({ connectionString: DB, max: 1, ssl: { rejectUnauthorized: false } });
  const c = await pool.connect();
  try {
    await c.query("BEGIN READ ONLY");
    const arkiv = (await c.query(`SELECT deviation_id, coalesce(start_time, first_seen) AS t FROM situation_archive
      WHERE message_type_value = 'Accident' AND (coalesce(start_time, first_seen) AT TIME ZONE 'Europe/Stockholm')::date >= $1::date`, [FRAN])).rows;
    const raknade = new Set((await c.query(`SELECT deviation_id FROM olycksfacit WHERE dubblett_av IS NULL AND klass IS NOT NULL
      AND (start_time AT TIME ZONE 'Europe/Stockholm')::date >= $1::date`, [FRAN])).rows.map((r: any) => r.deviation_id as string));
    const vara = new Set(arkiv.map((r: any) => r.deviation_id as string));
    console.log(`\n== Vår kopia sedan ${FRAN} ==`);
    console.log(`  situation_archive (Accident): ${vara.size}, räknade i olycksfacit (utan dubbletter, klassade): ${raknade.size}`);
    console.log(`  per startdag: ${JSON.stringify(Object.fromEntries(perDag(arkiv.map((r: any) => new Date(r.t).toISOString()))))}`);

    for (const [namn, x] of [["aktiva", aktiva], ["med borttagna", alla]] as const) {
      if (x.fel) continue;
      const tvPeriod = x.devs.filter((d) => d.start !== null && dag(d.start) >= FRAN);
      const ids = new Set(tvPeriod.map((d) => d.id));
      const baraTv = tvPeriod.filter((d) => !vara.has(d.id));
      const baraVi = [...vara].filter((id) => !ids.has(id));
      console.log(`\n== Jämförelse, Trafikverket ${namn}, start från ${FRAN} ==`);
      console.log(`  hos Trafikverket: ${ids.size}; också hos oss: ${[...ids].filter((id) => vara.has(id)).length}; bara hos Trafikverket: ${baraTv.length}; bara hos oss: ${baraVi.length}`);
      console.log(`  bara hos Trafikverket, per startdag: ${JSON.stringify(Object.fromEntries(perDag(baraTv.map((d) => d.start))))}`);
      const startVi = new Map(arkiv.map((r: any) => [r.deviation_id as string, new Date(r.t).toISOString()]));
      console.log(`  bara hos oss, per startdag: ${JSON.stringify(Object.fromEntries(perDag(baraVi.map((id) => startVi.get(id) ?? null))))}`);
    }
  } finally { await c.query("ROLLBACK").catch(() => {}); c.release(); await pool.end(); }
  return 0;
}
process.exitCode = await main();
