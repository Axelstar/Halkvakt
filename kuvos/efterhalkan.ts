// KUVÖSENS EFTERHALKA (kort #232, DECISIONS #455, #456): betans regel spelad över vintern 2024/25 med uppspelningens egen funktion
// (`uppspelning_efterhalka`, sql/028), som bär startvärdena och vägrar värden utanför svepen. Två läsningar:
//   ensam  — funktionen själv, summerad över vintern: episoder och T-B:s klasser (föll ut, nära, uteblev);
//   ovanpå — varje fyrningsögonblick, ur en variant HÄRLEDD ur sql/028 vid körning (aldrig en kopia): samma bas och samma
//            blöt-villkor, men den lämnar ögonblicken i stället för summorna. Tabellen räknas i kuvos/ovanpa.ts.
// Trenden kommer ur väg A (kuvos/trend.ts, 30-minutersfallet ur två halvtimmesrader). Regnmängden (`rain_sum_mm`) har Trafikverket
// inte levererat (#439): utan den är "blöt" aldrig sann och efterhalkan tiger, och då hoppas läsningen över med skälet utskrivet.
// Kör: DATABASE_URL=... node --experimental-strip-types kuvos/efterhalkan.ts   (vanliga sökvägen; läser utfall — bara i riktningsprovet)
import { readFileSync } from "node:fs";

export const FUNKTION = "kuvos_ra.efterhalkans_ogonblick";

/** Uppspelningen ur sql/028 med tre ändringar, var och en exakt en gång: namnet, returtypen och slutet — ögonblicken i stället
 *  för episoderna och dygnssummorna. Allt före (basen, radarkopplingen, blöt-villkoret, nattens etikett) är driftens ordagrant. */
export function ogonblicksvariant(sql028: string): string {
  const start = sql028.indexOf("CREATE OR REPLACE FUNCTION uppspelning_efterhalka(");
  const slut = sql028.indexOf("END $$;", start);
  if (start < 0 || slut < 0) throw new Error("sql/028: hittar inte uppspelning_efterhalka");
  let f = sql028.slice(start, slut + "END $$;".length);
  const byt = (fran: RegExp | string, till: string) => {
    const n = typeof fran === "string" ? f.split(fran).length - 1 : (f.match(new RegExp(fran.source, "g")) ?? []).length;
    if (n !== 1) throw new Error(`sql/028: ${String(fran)} står ${n} gånger, väntat en — uppspelningen har ändrats; läs om kuvösens efterhalka (DECISIONS #456)`);
    f = f.replace(fran, till);
  };
  byt("FUNCTION uppspelning_efterhalka(", `FUNCTION ${FUNKTION}(`);
  byt(/RETURNS TABLE \(dag date,[\s\S]*?med_olycka int\)/, "RETURNS TABLE (sid text, t timestamptz, min_efter numeric, rader int)");
  byt(/,\n {2}ep AS \(SELECT DISTINCT ON[\s\S]*?ORDER BY a\.d;/, "\n  SELECT f.sid, f.t, f.min_efter, f.rader FROM f ORDER BY f.sid, f.t;");
  return f;
}

export async function installera(q: (sql: string) => Promise<unknown>) {
  await q("CREATE SCHEMA IF NOT EXISTS kuvos_ra");
  await q(ogonblicksvariant(readFileSync(new URL("../sql/028_uppspelning_varianter.sql", import.meta.url), "utf8")));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!)) {
  const { ovanpa, skrivOvanpa, FACIT_SQL } = await import("./ovanpa.ts");
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const pg = (await import("pg")).default;
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  await db.query("SET TimeZone = 'UTC'");
  await db.query("SET statement_timeout = 0");
  const q = async (sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows as any[];
  console.log("EFTERHALKAN I KUVÖSEN (DECISIONS #455, #456) — betans startvärden, uppspelningen ur sql/028");
  const [{ regn }] = await q("SELECT count(*) FILTER (WHERE rain_sum_mm IS NOT NULL)::bigint AS regn FROM weather_observations");
  if (Number(regn) === 0) {
    console.log("  INGEN REGNMÄNGD i leveransen (rain_sum_mm är NULL, #439): 'blöt' kan aldrig bli sann, så efterhalkan tiger.");
    console.log("  Läsningen hoppas över tills Trafikverket svarat om mängden — inte ett utfall, ett saknat underlag.");
    await db.end(); process.exit(0);
  }
  await installera((sql) => q(sql));
  const [{ fonster }] = await q("SELECT (now() - min(sample_time) + interval '1 day')::text AS fonster FROM weather_observations");
  const [e] = await q(`SELECT sum(episoder)::int AS ep, sum(episoder_med_utfall)::int AS med, sum(foll_ut)::int AS fo,
    sum(nara)::int AS na, sum(uteblev)::int AS ut FROM uppspelning_efterhalka(p_fonster := $1::interval, p_blind := false)`, [fonster]);
  console.log(`\nENSAM (uppspelning_efterhalka, T-B:s klasser): ${e.ep ?? 0} episoder, ${e.med ?? 0} med utfall · föll ut ${e.fo ?? 0} · ` +
    `nära ${e.na ?? 0} · uteblev ${e.ut ?? 0}`);
  const fyrningar = (await q(`SELECT sid, extract(epoch FROM t) * 1000 AS t, min_efter, rader FROM ${FUNKTION}(p_fonster := $1::interval)`, [fonster]))
    .map((r) => ({ sid: String(r.sid), t: Number(r.t), minEfter: r.min_efter === null ? null : Number(r.min_efter), rader: r.rader === null ? null : Number(r.rader) }));
  const facit = (await q(FACIT_SQL)).map((r) => ({ sid: String(r.sid), tFacit: Number(r.t_facit), tBas: r.t_bas === null ? null : Number(r.t_bas) }));
  for (const rad of skrivOvanpa(ovanpa(facit, { efterhalkan: fyrningar }))) console.log(rad);
  await db.end();
}
