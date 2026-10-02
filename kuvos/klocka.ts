// Kuvösens klocka från Node (kort #232, DECISIONS #424). En anslutning som ser databasen genom kuvos-schemat (kuvos/klocka.sql):
// `now()` är kuvösens tid och de tidsindexerade tabellerna slutar vid den. Frågefunktionen har samma form som snapshotbyggarens
// `Q`, så `buildSnapshot(k.q, broar, t)` kör produktionens kod oförändrad mot en gången tidpunkt.
//
// EN anslutning, inte en pool: klockan är en inställning på sessionen, och en pool hade delat ut frågorna på anslutningar med
// olika klockor. Bara läsning — skrivningar och migrationer görs med den vanliga sökvägen (se klocka.sql).
import type { Q } from "../publish/snapshot-core.ts";

export const KUVOS_SOKVAG = "kuvos, public, pg_catalog";

export async function kuvosKlient(url: string) {
  const pg = (await import("pg")).default;
  const klient = new pg.Client({ connectionString: url });
  await klient.connect();
  await klient.query(`SET search_path = ${KUVOS_SOKVAG}`);
  // UTC som driftens databas: intervallaritmetik på timestamptz följer sessionens zon, och vintern korsar sommartiden 30/3
  // (20 karantänrader skilde 2/10 mellan svensk tid och UTC, DECISIONS #439).
  await klient.query("SET TimeZone = 'UTC'");
  const q: Q = async (text, params) => (await klient.query(text, params as any[])).rows;
  return {
    q,
    /** Ställer klockan. Skicka samma t till koden som tar tiden som argument (buildSnapshot, hazardsAt). */
    stall: async (t: Date) => { await klient.query("SELECT set_config('kuvos.nu', $1, false)", [t.toISOString()]); },
    slut: () => klient.end(),
  };
}

/** Tidskällor som klockan INTE når. `now()` nås genom sökvägen; de här är nyckelord eller kvalificerade anrop och läser alltid
 *  väggklockan. Kod som kuvösen kör får inte innehålla dem (test/kuvos.test.ts). */
export const ONADDA_TIDSKALLOR = /\b(current_timestamp|current_date|current_time|localtimestamp|localtime)\b|\b(clock_timestamp|statement_timestamp|transaction_timestamp|timeofday)\s*\(|pg_catalog\.now\s*\(/i;
