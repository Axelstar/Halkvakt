// Rimfrost-analysen (kort #46, Bengts hål A 4/9): motorns fuktvillkor är enbart
// nederbörd — men rimfrost bildas UTAN nederbörd när vägytan strålar ut under
// daggpunkten en klar natt. dewpoint_c har legat oanvänd i arkivet sedan 24/8.
// ANALYS FÖRE METODÄNDRING: hur många stationstimmar skulle en frostgren
// (yta ≤ daggpunkt + marginal, yta ≤ tröskel, INGEN nederbörd) ha fångat, hur
// mycket överlappar den befintliga fuktvillkoret, och — fysikens egen verifiering —
// toppar kandidaterna kl 03–07 lokal tid? Utstrålningsfrost är ett gryningsfenomen;
// en platt dygnskurva betyder att villkoret är brus, inte frost.
// Ingen motor- eller vektoränring här. Domen på siffrorna är ett senare beslut.
//
// Run (CI): rimfrost-analys.yml (workflow_dispatch). DATABASE_URL krävs.

import pg from "pg";

async function main(): Promise<number> {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); return 1; }
  const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });

  // nederbörd enligt motorns nuvarande fuktvillkor
  const NED = `(rain OR snow OR (precipitation IS NOT NULL AND precipitation NOT IN ('', 'no')))`;

  const tot = await pool.query(`
    SELECT count(*)::int AS n,
      count(*) FILTER (WHERE dewpoint_c IS NOT NULL AND surface_temp_c IS NOT NULL)::int AS n_med_dagg,
      count(*) FILTER (WHERE surface_temp_c <= 1)::int AS n_yta1,
      count(*) FILTER (WHERE surface_temp_c <= 1 AND ${NED})::int AS n_befintlig,
      count(*) FILTER (WHERE surface_temp_c <= 1 AND NOT ${NED} AND surface_temp_c <= dewpoint_c + 0.0)::int AS f_t1_m0,
      count(*) FILTER (WHERE surface_temp_c <= 1 AND NOT ${NED} AND surface_temp_c <= dewpoint_c + 0.5)::int AS f_t1_m05,
      count(*) FILTER (WHERE surface_temp_c <= 1 AND NOT ${NED} AND surface_temp_c <= dewpoint_c + 1.0)::int AS f_t1_m1,
      count(*) FILTER (WHERE surface_temp_c <= 0 AND NOT ${NED} AND surface_temp_c <= dewpoint_c + 0.0)::int AS f_t0_m0,
      count(*) FILTER (WHERE surface_temp_c <= 0 AND NOT ${NED} AND surface_temp_c <= dewpoint_c + 0.5)::int AS f_t0_m05,
      count(*) FILTER (WHERE surface_temp_c <= 0 AND NOT ${NED} AND surface_temp_c <= dewpoint_c + 1.0)::int AS f_t0_m1,
      count(DISTINCT station_id) FILTER (WHERE surface_temp_c <= 1 AND NOT ${NED} AND surface_temp_c <= dewpoint_c + 0.5)::int AS st_t1_m05,
      -- Körning #1:s fynd: topp-3 hade yta−dagg −28…−49° = trasiga daggpunktsgivare.
      -- ÄKTA kandidat kräver därför korsgivaren (RH ≥ 90 — rimfrost kräver fuktig luft)
      -- och fysikaliskt band (yta−dagg ≥ −5°). GIVARFEL räknas separat — de blir en
      -- egen läxa: frostgrenen behöver en givarvakt innan den någonsin byggs.
      count(*) FILTER (WHERE surface_temp_c <= 1 AND NOT ${NED} AND surface_temp_c <= dewpoint_c + 0.5
        AND humidity_pct >= 90 AND surface_temp_c - dewpoint_c >= -5)::int AS akta_t1_m05,
      count(DISTINCT station_id) FILTER (WHERE surface_temp_c <= 1 AND NOT ${NED} AND surface_temp_c <= dewpoint_c + 0.5
        AND humidity_pct >= 90 AND surface_temp_c - dewpoint_c >= -5)::int AS akta_st,
      count(*) FILTER (WHERE surface_temp_c <= 1 AND surface_temp_c - dewpoint_c < -10)::int AS givarfel
    FROM weather_observations`);
  const r = tot.rows[0];
  // Underlagsvakt: utan daggpunktsdata finns inget att analysera — rött, inte tomt grönt.
  if (!r.n_med_dagg) { console.error(`0 rader med daggpunkt av ${r.n} — arkivet bär inte analysen.`); await pool.end(); return 1; }

  console.log(`Rimfrost-analysen — arkivet sedan 24/8 (${r.n} rader, ${r.n_med_dagg} med daggpunkt)`);
  console.log(`Vintertimmar (yta ≤ 1°): ${r.n_yta1} · varav BEFINTLIG fukt (nederbörd): ${r.n_befintlig}`);
  console.log(`\nFROSTGRENENS KANDIDATER (yta ≤ daggpunkt + m, INGEN nederbörd — det motorn missar idag):`);
  console.log(`                 m=0,0    m=0,5    m=1,0`);
  console.log(`yta ≤ 1 °C   ${String(r.f_t1_m0).padStart(8)} ${String(r.f_t1_m05).padStart(8)} ${String(r.f_t1_m1).padStart(8)}`);
  console.log(`yta ≤ 0 °C   ${String(r.f_t0_m0).padStart(8)} ${String(r.f_t0_m05).padStart(8)} ${String(r.f_t0_m1).padStart(8)}`);
  console.log(`Stationer bakom mittvarianten (t1/m0,5): ${r.st_t1_m05}`);
  console.log(`
ÄKTHETSFILTRERAT (t1/m0,5 + RH ≥ 90 + yta−dagg ≥ −5°): ${r.akta_t1_m05} kandidater från ${r.akta_st} stationer`);
  console.log(`GIVARFEL-misstänkta rader (yta−dagg < −10° vid yta ≤ 1): ${r.givarfel} — frostgrenen KRÄVER givarvakt.`);

  // Fysikens verifiering: dygnsprofil för mittvarianten, svensk tid (Europe/Stockholm).
  const hh = await pool.query(`
    SELECT extract(hour FROM sample_time AT TIME ZONE 'Europe/Stockholm')::int AS h, count(*)::int AS n
    FROM weather_observations
    WHERE surface_temp_c <= 1 AND NOT ${NED} AND surface_temp_c <= dewpoint_c + 0.5 AND humidity_pct >= 90 AND surface_temp_c - dewpoint_c >= -5
    GROUP BY 1 ORDER BY 1`);
  const byH = new Map(hh.rows.map((x: any) => [x.h, x.n]));
  const tot2 = hh.rows.reduce((a: number, x: any) => a + x.n, 0);
  console.log(`\nDygnsprofil (svensk tid), ÄKTA kandidater — rimfrost ska toppa i gryningen:`);
  for (let h = 0; h < 24; h++) {
    const n = byH.get(h) ?? 0;
    console.log(`${String(h).padStart(2, "0")}  ${"█".repeat(Math.round((n / Math.max(1, tot2)) * 120)).padEnd(0)} ${n}`);
  }
  const natt = [0,1,2,3,4,5,6,7].reduce((a, h) => a + (byH.get(h) ?? 0), 0);
  const dag = [10,11,12,13,14,15,16,17].reduce((a, h) => a + (byH.get(h) ?? 0), 0);
  console.log(`Natt/gryning (00–08): ${natt} · Dag (10–18): ${dag} · kvot ${dag ? (natt / dag).toFixed(1) : "∞"}`);
  console.log(natt > 2 * dag
    ? `➡ FYSIKEN BEKRÄFTAR: tydlig natt-/gryningstopp — kandidaterna beter sig som utstrålningsfrost.`
    : `➡ VARNING: ingen tydlig nattopp — villkoret kan vara brus (dimma/advektion?); dom får inte fällas på detta.`);

  // Var och när: toppstationer med exempeldatum
  const st = await pool.query(`
    SELECT station_id, name, count(*)::int AS n,
      min(sample_time)::date AS forsta, max(sample_time)::date AS sista,
      round(avg(surface_temp_c - dewpoint_c)::numeric, 2) AS medel_yta_minus_dagg
    FROM weather_observations
    WHERE surface_temp_c <= 1 AND NOT ${NED} AND surface_temp_c <= dewpoint_c + 0.5 AND humidity_pct >= 90 AND surface_temp_c - dewpoint_c >= -5
    GROUP BY 1, 2 ORDER BY n DESC LIMIT 8`);
  console.log(`\nToppstationer (äkta kandidater):`);
  for (const s of st.rows) console.log(`  ${String(s.n).padStart(5)}  ${s.name} (${s.station_id})  ${s.forsta}→${s.sista}  yta−dagg medel ${s.medel_yta_minus_dagg}°`);

  console.log(`\nOBS: arkivet är händelsefiltrerat (yta ≤ 5° lagras) — kalla nätter finns, varma dagar saknas;`);
  console.log(`kandidatandelar ska läsas mot vintertimmarna, inte mot kalendern. Ingen dom här — underlag.`);
  await pool.end();
  return 0;
}
process.exitCode = await main();
