// DB-knappen (kort #83/#78-läxan, 9/9): kör en SQL-fil ur repot mot databasen, eller
// vakthundens larmprov — utan SQL-editorn. Deploy-tokenen får inte röra databasen (#86), men
// DATABASE_URL i Actions-secrets får det redan (ingesten migrerar med den). Skillnaden mot
// auto-migrationen i ingest/db.ts: det här är ett MEDVETET TRYCK av en människa, inte nästa
// timkörning — ett cron-jobb ska skapas av någon som vet att det skapas (DECISIONS #87).
//
//   migrera <fil> [--bevis "SQL"]   kör filen i en transaktion, kör sedan varje bevisrad
//                                    (radbrutna SQL-satser) och skriver ut resultatraderna.
//   larmprov                          läser vakthundens eget cron-kommando ur cron.job, lägger
//                                    ?larmprov=1 på URL:en och kör det — nyckeln passerar
//                                    aldrig en logg. Beviset är issuen med etiketten vakthund.
import pg from "pg";
import { readFileSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const [atgard, arg] = process.argv.slice(2);
const bevisIdx = process.argv.indexOf("--bevis");
const bevis = bevisIdx > 0 ? process.argv[bevisIdx + 1] ?? "" : "";
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });

try {
  if (atgard === "migrera") {
    if (!arg || !/^sql\/\d{3}_[a-z0-9_]+\.sql$/.test(arg)) { console.error(`migrera: ange en fil som sql/014_gallring.sql (fick "${arg ?? ""}")`); process.exit(1); }
    const text = readFileSync(new URL(`../${arg}`, import.meta.url), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(text);
      await client.query("COMMIT");
      console.log(`migrera: ${arg} körd (${text.length} tecken), transaktionen bekräftad`);
    } catch (e) { await client.query("ROLLBACK").catch(() => {}); throw e; } finally { client.release(); }
    for (const sats of bevis.split("\n").map((s) => s.trim()).filter(Boolean)) {
      const r = await pool.query(sats);
      console.log(`\nbevis: ${sats}`);
      for (const row of r.rows) console.log("  " + JSON.stringify(row));
      if (!r.rows.length) console.log("  (inga rader)");
    }
  } else if (atgard === "larmprov") {
    const j = await pool.query(`SELECT jobid, command FROM cron.job WHERE jobname = 'halkvakt-vakthund'`);
    if (j.rows.length !== 1) { console.error(`larmprov: hittade ${j.rows.length} jobb med namnet halkvakt-vakthund — avbryter`); process.exit(1); }
    const kommando: string = j.rows[0].command;
    const traffar = kommando.match(/functions\/v1\/vakthund(?=['"?])/g) ?? [];
    if (traffar.length !== 1) { console.error(`larmprov: väntade exakt EN vakthund-URL i kommandot, hittade ${traffar.length} — avbryter (kommandot skrivs aldrig ut)`); process.exit(1); }
    const prov = kommando.replace(/functions\/v1\/vakthund(?=['"?])/, "functions/v1/vakthund?larmprov=1");
    const r = await pool.query(prov);
    console.log(`larmprov: vakthundens kommando (jobb #${j.rows[0].jobid}, ${kommando.length} tecken) kört med ?larmprov=1 → ${JSON.stringify(r.rows[0] ?? {})}`);
    console.log("Beviset är INTE den här raden: en issue med etiketten `vakthund` ska finnas inom en minut, och stängas av nästa gröna timkörning (xx:07).");
  } else {
    console.error("dbknapp: atgard måste vara migrera eller larmprov"); process.exit(1);
  }
} finally { await pool.end(); }
