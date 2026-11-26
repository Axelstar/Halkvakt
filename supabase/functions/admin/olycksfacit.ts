// admin, delen olyckor (DECISIONS #936): sidan Olyckor på admin.halkvakt.se, ett eget menyval (Bengt 21/11: alternativ A,
// "kalla den olyckor"). Läser säsongens olyckor med samma fråga som ärendena (olycksfacit/hamta.ts) och räknar dem med samma regler
// (olycksfacit/vyn.ts). index.ts kopplar in den: GET ?del=olyckor → svar(await olycksfacitSvar()).
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";
import { FORSTA_DAG, svenskDag } from "../olycksfacit/arende.ts";
import { hamta } from "../olycksfacit/hamta.ts";
import { type Vy, adminVy } from "../olycksfacit/vyn.ts";

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
  return adminVy(olyckor, arenden, idag, veckorna, timmar);
}
