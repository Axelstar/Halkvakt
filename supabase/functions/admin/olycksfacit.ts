// admin, delen olyckor (DECISIONS #936): sidan Olyckor på admin.halkvakt.se, ett eget menyval (Bengt 21/11: alternativ A,
// "kalla den olyckor"). Läser säsongens olyckor med samma fråga som ärendena (olycksfacit/hamta.ts) och räknar dem med samma regler
// (olycksfacit/vyn.ts). index.ts kopplar in den: GET ?del=olyckor → svar(await olycksfacitSvar()).
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";
import { FORSTA_DAG, svenskDag } from "../olycksfacit/arende.ts";
import { hamta } from "../olycksfacit/hamta.ts";
import { SMAVAG_FRAN, type Vy, adminVy, smavagsdel } from "../olycksfacit/vyn.ts";

// deno-lint-ignore no-explicit-any
let sql: any = null;

export async function olycksfacitSvar(): Promise<Vy> {
  sql ??= postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
  const idag = svenskDag(new Date().toISOString());
  const olyckor = await hamta(sql, FORSTA_DAG, idag);
  // deno-lint-ignore no-explicit-any
  const arenden = new Map((await sql`SELECT dag::text AS dag, nr, stangd, veckolasning FROM olycksfacit_arenden`)
    .map((r: any) => [r.dag as string, { nr: r.nr as number, stangd: r.stangd as boolean, veckolasning: r.veckolasning as boolean }]));
  // deno-lint-ignore no-explicit-any
  const veckorna = new Map((await sql`SELECT vecka, nr, stangd FROM olycksfacit_veckor`).map((r: any) => [r.vecka as string, { nr: r.nr as number, stangd: r.stangd as boolean }]));
  // deno-lint-ignore no-explicit-any
  const timmar = (await sql`SELECT dygn, hink, sum(timmar)::int AS timmar FROM fuktskugga_timmar GROUP BY 1, 2`).map((r: any) =>
    ({ dygn: r.dygn, hink: r.hink, timmar: r.timmar }));
  const vy = adminVy(olyckor, arenden, idag, veckorna, timmar);
  // Småvägsrösten (DECISIONS #970): telefonernas småvägsvarningar per dygn sedan påslaget (app_raknare räknar per svenskt dygn). Ett fel
  // här fäller aldrig sidan: rutan visar felet och resten av sidan ritas (26/11 stod sidan på exempeldata efter första versionen).
  try {
    // deno-lint-ignore no-explicit-any
    const rader: any[] = await sql`SELECT dag::text AS dag, sum(antal)::int AS antal FROM app_raknare
      WHERE handelse = 'varning' AND varde LIKE 'smavag:%' AND dag >= ${SMAVAG_FRAN}::date GROUP BY 1`;
    vy.smavag = smavagsdel(olyckor, rader.map((r) => ({ dag: String(r.dag), antal: Number(r.antal) })), idag);
  } catch (e) {
    vy.smavag = { fel: e instanceof Error ? e.message : String(e) };
  }
  return vy;
}
