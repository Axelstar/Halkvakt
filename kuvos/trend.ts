// KUVÖSENS TREND (kort #232, DECISIONS #455 punkt 3, väg A).
//
// Driftens trendfunktion (`berakna_trendkandidater`, sql/018) kräver minst tre rader i varje fönster. Det är skrivet för driftens
// femminutersmätningar. Kuvösen har en rad per station och halvtimme, så 30-minutersfönstret får aldrig tre rader. Driftens
// `lutning30` är ändå två mätvärden: värdet 30 minuter bakåt minus värdet nu. Här härleds därför en variant UR driftens källa vid
// körning — aldrig en kopia som kan glida isär — där 30-minutersramen kräver två rader. Allt annat är driftens: vakterna, banden,
// hoppvakten, svepets minsta lutning och utfallet efter 90 minuter. 15 minuter går inte att räkna.
//
// Körs med den vanliga sökvägen (den skriver), över hela vintern, och skriver bara antal: inga lutningar och inga utfall.
// Kör: DATABASE_URL=... node --experimental-strip-types kuvos/trend.ts
import { readFileSync } from "node:fs";

export const FUNKTION = "kuvos_ra.berakna_trendkandidater_halvtimme";

/** Driftens funktion ur sql/018 med två ändringar, var och en exakt en gång: namnet och 30-minutersramens radkrav 3 → 2. */
export function halvtimmesvariant(sql018: string): string {
  const start = sql018.indexOf("CREATE OR REPLACE FUNCTION berakna_trendkandidater(");
  const slutMarke = "$$ LANGUAGE plpgsql;";
  const slut = sql018.indexOf(slutMarke, start);
  if (start < 0 || slut < 0) throw new Error("sql/018: hittar inte berakna_trendkandidater");
  let f = sql018.slice(start, slut + slutMarke.length);
  const byt = (fran: string, till: string) => {
    const n = f.split(fran).length - 1;
    if (n !== 1) throw new Error(`sql/018: "${fran}" står ${n} gånger, väntat en — driftens funktion har ändrats; läs om väg A (DECISIONS #455)`);
    f = f.replace(fran, till);
  };
  byt("FUNCTION berakna_trendkandidater(", `FUNCTION ${FUNKTION}(`);
  byt("CASE WHEN n30 >= 3 AND", "CASE WHEN n30 >= 2 AND");
  return f;
}

export async function installera(q: (sql: string) => Promise<unknown>) {
  await q("CREATE SCHEMA IF NOT EXISTS kuvos_ra");
  await q(halvtimmesvariant(readFileSync(new URL("../sql/018_trend_berakna.sql", import.meta.url), "utf8")));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!)) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const pg = (await import("pg")).default;
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  await db.query("SET TimeZone = 'UTC'");
  await db.query("SET statement_timeout = 0");
  const q = async (sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows as any[];
  await installera((sql) => q(sql));
  const [{ forst }] = await q("SELECT min(sample_time) AS forst FROM weather_observations");
  const t0 = performance.now();
  const [r] = await q(`SELECT * FROM ${FUNKTION}(now() - $1::timestamptz + interval '1 day')`, [forst]);
  console.log(`trenden över hela vintern (väg A, DECISIONS #455): ${r.nya} kandidater skrivna, ${r.utfall} med utfallet ifyllt, ` +
    `${((performance.now() - t0) / 60_000).toFixed(1)} min`);
  for (const t of ["trend_kandidater", "trend_stigande"]) {
    const [n] = await q(`SELECT count(*) AS rader, count(lutning15_c) AS l15, count(lutning30_c) AS l30, count(lutning60_c) AS l60 FROM ${t}`);
    console.log(`  ${t}: ${n.rader} rader · med 15-minuterslutning ${n.l15} · med 30 ${n.l30} · med 60 ${n.l60}`);
  }
  await db.end();
}
