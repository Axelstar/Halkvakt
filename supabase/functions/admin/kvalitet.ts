// admin, kvalitetstavlan (kort #682, DECISIONS #973): sidan Kvalitet på admin.halkvakt.se, under menyvalet olyckor.
// Läser aggregaten i kvalitet_dag (sql/147, skrivna av scripts/kvalitetstavlan.ts) och räknar dem i kvalitetsvy.ts.
// index.ts kopplar in den: GET ?del=olyckor&vy=kvalitet → svar(await kvalitetSvar()).
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";
import { type KvRad, type KvVy, kvalitetVy } from "./kvalitetsvy.ts";

// deno-lint-ignore no-explicit-any
let sql: any = null;

export async function kvalitetSvar(): Promise<KvVy & { skriven: string | null }> {
  sql ??= postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
  // deno-lint-ignore no-explicit-any
  const rader: any[] = await sql`SELECT dag::text AS dag, lager, kalla, matt, n, k FROM kvalitet_dag ORDER BY dag`;
  const [s] = await sql`SELECT max(skriven_at) AS skriven FROM kvalitet_dag`;
  const vy = kvalitetVy(rader.map((r): KvRad => ({ dag: r.dag, lager: r.lager, kalla: r.kalla, matt: r.matt, n: Number(r.n), k: Number(r.k) })));
  return { ...vy, skriven: s?.skriven ? new Date(s.skriven).toISOString() : null };
}
