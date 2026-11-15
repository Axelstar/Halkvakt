// SMÅVÄGSRÖSTEN VID OLYCKORNA, LÄSNINGEN (Bengt 14/11: "Ja, bygg" och "bakåträkningens omfång så gör vi bara a"; DECISIONS #867,
// halkvakt-kuvos F64). En läsning i en READ ONLY-transaktion av olycksfacits olyckor sedan en tidpunkt: närmaste småvägspunkt inom
// 0,5 km, olycksfacits lager för småvägsrösten (sql/110), och timmen som rösten hade talat med vid starten, räknad som i sql/110.
// Kuvösens kuvos/smavag-olyckor.ts gör facit ur filen och driftens underlag i den privata hinken. Inga tal i utskriften (#768).
//   node --experimental-strip-types ingest/smavag-olyckor-db.ts las <fran> <ut.json>      fran: t.ex. 2026-11-12T14:00:00Z
//   node --experimental-strip-types ingest/smavag-olyckor-db.ts --sjalvtest
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Avståndet, färskheten och fullständigheten är sql/110:s, ord för ord, och vaktas av kontraktsgrinden (SMAVAG_M, FARSK_TIMMAR,
// FULLSTANDIG_ANDEL). En olycka räknas först 18 timmar efter starten: fångsten tar den inom tolv timmar och lagret inom sex.
export const SATS = {
  olyckor: `SELECT f.deviation_id, f.start_time, f.fangad_at, p.punkt, p.km, l.orsak AS lager, l.detalj->>'timme' AS lager_timme,
      k.tid AS timme
    FROM olycksfacit f
    LEFT JOIN LATERAL (
      SELECT s.punkt, (ST_Distance(s.geom::geography, f.geom::geography) / 1000)::real AS km
      FROM smavagspunkt s
      WHERE s.geom && ST_Expand(f.geom, 0.02) AND ST_DWithin(s.geom::geography, f.geom::geography, 500)       -- SMAVAG_M
      ORDER BY ST_Distance(s.geom::geography, f.geom::geography), s.punkt LIMIT 1) p ON true
    LEFT JOIN olycksfacit_lager l ON l.deviation_id = f.deviation_id AND l.lager = 'smavag'
    LEFT JOIN LATERAL (
      SELECT x.tid FROM smavag_korning x
      WHERE x.tid = (SELECT max(y.tid) FROM smavag_korning y WHERE y.tid <= f.start_time AND y.skriven_at <= f.start_time)
        AND x.tid > f.start_time - interval '2 hours'                                                          -- FARSK_TIMMAR
        AND x.punkter >= 0.95 * (SELECT count(*) FROM smavagspunkt)                                      -- FULLSTANDIG_ANDEL
      ) k ON true
    WHERE f.start_time >= $1::timestamptz AND f.dubblett_av IS NULL AND f.start_time < now() - interval '18 hours'
    ORDER BY f.start_time, f.deviation_id`,
  brytare: `SELECT bool_or(pa) AS pa, min(andrad_at) FILTER (WHERE pa) AS sedan FROM smavagsbrytare`,
  nu: `SELECT now() AS nu`,
};

export type Olycka = {
  deviation_id: string; start: string; fangad: string; punkt: string | null; km: number | null;
  lager: string | null; lager_timme: string | null; timme: string | null;
};

const iso = (v: unknown): string | null => (v === null || v === undefined ? null : new Date(v as string).toISOString());

/** Läsningens fil: klockan i databasen, brytarna och olyckorna i den form kuvösens facit läser. */
export function fil(nu: unknown, brytare: { pa: boolean | null; sedan: unknown }, rader: any[]): string {
  const olyckor: Olycka[] = rader.map((r) => ({
    deviation_id: String(r.deviation_id), start: iso(r.start_time)!, fangad: iso(r.fangad_at)!,
    punkt: r.punkt ?? null, km: r.km === null || r.km === undefined ? null : Number(r.km),
    lager: r.lager ?? null, lager_timme: iso(r.lager_timme), timme: iso(r.timme),
  }));
  return JSON.stringify({ nu: iso(nu), brytare: { pa: brytare.pa === true, sedan: iso(brytare.sedan) }, olyckor }) + "\n";
}

async function las(fran: string, ut: string): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL saknas");
  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
  const c = await pool.connect();
  try {
    await c.query("BEGIN READ ONLY");
    await c.query("SET LOCAL TimeZone = 'UTC'");
    const nu = (await c.query(SATS.nu)).rows[0].nu;
    const br = (await c.query(SATS.brytare)).rows[0];
    const rr = (await c.query(SATS.olyckor, [fran])).rows;
    await c.query("COMMIT");
    writeFileSync(ut, fil(nu, br, rr));
  } finally { c.release(); await pool.end(); }
}

function sjalvtest(): number {
  const fel: string[] = [];
  const alla = Object.values(SATS).join("\n");
  if (/\b(INSERT|UPDATE|DELETE|TRUNCATE|DROP|ALTER|CREATE)\b/i.test(alla)) fel.push("läsningen skriver ingenting");
  if (!/-- SMAVAG_M/.test(SATS.olyckor) || !/-- FARSK_TIMMAR/.test(SATS.olyckor) || !/-- FULLSTANDIG_ANDEL/.test(SATS.olyckor))
    fel.push("gränserna bär sql/110:s märken, så att kontraktsgrinden ser dem");
  if (!/dubblett_av IS NULL/.test(SATS.olyckor) || !/lager = 'smavag'/.test(SATS.olyckor)) fel.push("dubbletterna bort, småvägslagret med");
  const f = JSON.parse(fil("2026-11-14T10:00:00Z", { pa: null, sedan: null }, [
    { deviation_id: 7, start_time: "2026-11-13T12:57:00Z", fangad_at: "2026-11-13T13:01:00Z", punkt: "r00001", km: "0.15", lager: "varnar",
      lager_timme: "2026-11-13T12:00:00+00:00", timme: new Date("2026-11-13T12:00:00Z") },
    { deviation_id: "8", start_time: "2026-11-13T05:40:00Z", fangad_at: "2026-11-13T05:47:00Z", punkt: null, km: null, lager: null, lager_timme: null, timme: null },
  ]));
  if (f.brytare.pa !== false || f.brytare.sedan !== null) fel.push("brytarna av utan rader");
  if (f.olyckor[0].deviation_id !== "7" || f.olyckor[0].km !== 0.15 || f.olyckor[0].timme !== "2026-11-13T12:00:00.000Z"
      || f.olyckor[0].lager_timme !== "2026-11-13T12:00:00.000Z") fel.push("olyckan med punkt, lager och timme");
  if (f.olyckor[1].punkt !== null || f.olyckor[1].timme !== null) fel.push("olyckan utan punkt");
  console.log(`självtest smavag-olyckor-db: ${fel.length ? "FEL" : "klart"}`);
  for (const x of fel) console.log(`  ${x}`);
  return fel.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [kmd, a, b] = process.argv.slice(2);
  if (kmd === "--sjalvtest") process.exit(sjalvtest());
  else if (kmd === "las" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/u.test(a ?? "") && b) {
    las(a, b).then(() => console.log("olyckorna: klart"))
      .catch((e) => { console.error(`smavag-olyckor-db: ${String(e?.message ?? e).slice(0, 200)}`); process.exit(1); });
  } else { console.error("las <fran> <ut.json> | --sjalvtest"); process.exit(2); }
}
