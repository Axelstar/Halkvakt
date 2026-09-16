// DB-knappen (kort #83/#78-läxan, 9/9): kör en SQL-fil ur repot mot databasen, eller
// vakthundens larmprov — utan SQL-editorn. Deploy-tokenen får inte röra databasen (#86), men
// DATABASE_URL i Actions-secrets får det redan (ingesten migrerar med den). Skillnaden mot
// auto-migrationen i ingest/db.ts: det här är ett MEDVETET TRYCK av en människa, inte nästa
// timkörning — ett cron-jobb ska skapas av någon som vet att det skapas (DECISIONS #87).
//
//   migrera <fil> [--bevis "SQL"]   kör filen i en transaktion, kör sedan varje bevisrad
//                                    (radbrutna SQL-satser) och skriver ut resultatraderna.
//   larmprov [flagga]                 läser vakthundens eget cron-kommando ur cron.job, lägger
//                                    prov-flaggan på URL:en och kör det — nyckeln passerar
//                                    aldrig en logg. Flaggor (vitlista): larmprov (standard,
//                                    framkallar ett fel ⇒ issue `vakthund`) och vinterprov
//                                    (framkallar vinterordslarmet, kort #52 ⇒ issue
//                                    `vinterord-prov`), frostprov (framkallar frostlarmet,
//                                    kort #89 ⇒ issue `frostlarm-prov`), matvaktprov (framkallar
//                                    mätvaktens larm, kort #101 ⇒ issue `matvakt`) och kassaprov
//                                    (framkallar kassavaktens larm, kort #152 ⇒ issue `kassavakt`).
//                                    Beviset är issuen, inte utskriften.
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
    // Vitlistan först, före FRÅGAN: en felstavad flagga ska falla på en rad, inte efter att ha
    // kört något mot databasen. (Rättat 12/9: kommentaren sa tidigare att den därmed gick att
    // prova helt utan DATABASE_URL — det stämmer inte, toppnivåvakten kräver den ändå.)
    const FLAGGOR: Record<string, string> = { larmprov: "larmprov=1", vinterprov: "vinterprov=1", frostprov: "frostprov=1", matvaktprov: "matvaktprov=1", paminnelseprov: "paminnelseprov=1", kassaprov: "kassaprov=1", nyckelprov: "nyckelprov=1", sparrprov: "sparrprov=1" };
    // Vilken funktion provet går till. Vakthunden är standard; spärrprovet (kort #191) går till skuggmotorn.
    const FUNKTION: Record<string, string> = { sparrprov: "skuggmotor" };
    const flagga = FLAGGOR[arg ?? "larmprov"];
    if (!flagga) { console.error(`larmprov: okänd flagga "${arg}" — tillåtna: ${Object.keys(FLAGGOR).join(", ")}`); process.exit(1); }
    const fn = FUNKTION[arg ?? ""] ?? "vakthund";
    // Jobbet hittas på sin URL, inte på namnet: skuggmotorn har ett jobb per land, och det svenska är det
    // som saknar land=fi/no/dk. Exakt ETT jobb får matcha, annars avbryts provet högljutt.
    const j = await pool.query(`SELECT jobid, jobname, command FROM cron.job WHERE command LIKE $1 AND command !~ 'land=(fi|no|dk)'`, [`%functions/v1/${fn}%`]);
    if (j.rows.length !== 1) { console.error(`larmprov: hittade ${j.rows.length} jobb för functions/v1/${fn} — avbryter`); process.exit(1); }
    const kommando: string = j.rows[0].command;
    const urlForm = new RegExp(`functions\\/v1\\/${fn}(?=['"?])`, "g");
    const traffar = kommando.match(urlForm) ?? [];
    if (traffar.length !== 1) { console.error(`larmprov: väntade exakt EN ${fn}-URL i kommandot, hittade ${traffar.length} — avbryter (kommandot skrivs aldrig ut)`); process.exit(1); }
    // Flaggan är vitlistad (ovan), aldrig fri text: den byggs in i ett SQL-kommando som körs
    // skarpt, och kommandot innehåller nyckeln.
    const prov = kommando.replace(new RegExp(`functions\\/v1\\/${fn}(?=['"?])`), `functions/v1/${fn}?${flagga}`);
    const r = await pool.query(prov);
    console.log(`larmprov: ${j.rows[0].jobname}s kommando (jobb #${j.rows[0].jobid}, ${kommando.length} tecken) kört med ?${flagga} → ${JSON.stringify(r.rows[0] ?? {})}`);
    // SVARET, inte bara request-id:t (15/9-läxan, DECISIONS #197): pg_net kör asynkront och lägger funktionens
    // svar i net._http_response. Förut skrevs bara id:t ut, så varje prov bevisades via sitt utfall (en issue)
    // och aldrig via det funktionen faktiskt svarade — vakthundens `rad` och spärrprovets `suppressed` var
    // oläsbara utifrån. Nu väntas svaret in (högst 90 s) och skrivs ut, kortat.
    const reqId = Number(Object.values(r.rows[0] ?? {})[0]);
    if (Number.isFinite(reqId)) {
      let svar: { status_code: number | null; content: string | null; error_msg: string | null } | null = null;
      for (let i = 0; i < 18 && !svar; i++) {
        await new Promise((res) => setTimeout(res, 5000));
        const s = await pool.query(`SELECT status_code, content, error_msg FROM net._http_response WHERE id = $1`, [reqId]).catch((e) => ({ rows: [], fel: String(e) } as any));
        if ((s as any).fel) { console.log(`svar: net._http_response ej läsbar (${String((s as any).fel).slice(0, 80)}) — beviset får läsas via utfallet`); break; }
        svar = s.rows[0] ?? null;
      }
      if (svar) {
        console.log(`svar (request ${reqId}): status ${svar.status_code}${svar.error_msg ? ` fel ${svar.error_msg}` : ""}`);
        try {
          const d = JSON.parse(svar.content ?? "");
          for (const nyckel of ["ok", "prov", "problem", "larmvag", "suppressed", "alerts", "facit", "facitSkal"]) if (nyckel in d) console.log(`  ${nyckel}: ${JSON.stringify(d[nyckel]).slice(0, 600)}`);
          if (Array.isArray(d.rad)) for (const x of d.rad) console.log(`  rad: ${x}`);
        } catch { console.log(`  ${String(svar.content ?? "").slice(0, 800)}`); }
      } else console.log(`svar (request ${reqId}): inget svar inom 90 s — funktionen kan fortfarande köra; läs beviset via utfallet`);
    }
    // Varje prov har sin EGEN etikett — annars går det inte att se vilket larm som bevisades.
    const BEVIS: Record<string, string> = {
      "vinterprov=1": "en issue med etiketten `vinterord-prov` ska finnas inom en minut. Den bär EGEN etikett, så provet inte förbrukar det riktiga engångslarmet.",
      "frostprov=1": "en issue med etiketten `frost-prov` ska finnas inom en minut, av samma skäl som vinterprovet.",
      "matvaktprov=1": "en issue med etiketten `matvakt` ska finnas inom en minut, och stängas av nästa gröna timkörning.",
      "paminnelseprov=1": "en issue med etiketten `kallvaktspaminnelse` ska finnas inom en minut, och stängas av nästa timkörning utan prov (#150).",
      "kassaprov=1": "en issue med etiketten `kassavakt` ska finnas inom en minut, och stängas av nästa körning 05/11/17/23 UTC som ligger under gränsen (#152).",
      "nyckelprov=1": "en issue med etiketten `nyckelkalender` ska finnas inom en minut, och stängas av nästa 06 UTC-körning utan prov (kort #86).",
      "sparrprov=1": "svaret ovan ska visa `suppressed` med EN rad — kamera 2 tystad av kamera 1 inom 45 s (kort #188/#191). Inget skrivs i shadow_log.",
    };
    const fallback = "en issue med etiketten vakthund ska finnas inom en minut, och stängas av nästa gröna timkörning (xx:07).";
    console.log(`Beviset är INTE den här raden: ${BEVIS[flagga] ?? fallback}`);
  } else {
    console.error("dbknapp: atgard måste vara migrera eller larmprov"); process.exit(1);
  }
} finally { await pool.end(); }
