// KANDIDATENS BRYTARE (NIVA2-LIVE steg 13, DECISIONS #562 punkt 5, #578). Knappen är .github/workflows/kandidatbrytaren.yml.
//   node --experimental-strip-types scripts/kandidatbrytaren.ts las|tysta|starta
//   node --experimental-strip-types scripts/kandidatbrytaren.ts --sjalvtest
// Vem som trycker kommer ur AKTOR, som flödet sätter till github.actor: 895845 är Bengt och Axelstar är Axel, alla andra avvisas.
// Claude trycker med Bengts konto och räknas därför som Bengt — Claude trycker bara på Bengts uttryckliga ord.
//   tysta   en rad; kandidaten är av direkt.
//   starta  en rad; kandidaten är på först när både Bengt och Axel har startat efter den senaste tystningen (sql/059).
//   las     skriver inget.
// Ändras läget körs publiceringens eget cron-jobb direkt, samma väg som DB-knappens larmprov: kommandot bär funktionens nyckel och
// skrivs aldrig ut. Svaret läses: lägesfilens nyckel `kandidat` ska saknas när kandidaten är av och finnas när den är på.
export const AKTORER: Record<string, "bengt" | "axel"> = { "895845": "bengt", Axelstar: "axel" };
export const ATGARDER = ["las", "tysta", "starta"] as const;

if (process.argv[2] === "--sjalvtest") {
  const fel: string[] = [];
  if (AKTORER["895845"] !== "bengt" || AKTORER["Axelstar"] !== "axel") fel.push("kontona");
  if (AKTORER["axelstar"] !== undefined || AKTORER["claude"] !== undefined) fel.push("okända konton ska avvisas, också med fel skiftläge");
  if (fel.length) { console.error(`kandidatbrytaren: självtestet föll — ${fel.join("; ")}`); process.exit(1); }
  console.log("✓ kandidatbrytaren: två konton, alla andra avvisas");
  process.exit(0);
}

const atgard = process.argv[2] as (typeof ATGARDER)[number];
if (!ATGARDER.includes(atgard)) { console.error(`kandidatbrytaren: okänd åtgärd "${atgard}" — tillåtna: ${ATGARDER.join(", ")}`); process.exit(1); }
const aktor = process.env.AKTOR ?? "";
const vem = AKTORER[aktor];
if (!vem) { console.error(`kandidatbrytaren: kontot "${aktor}" får inte trycka — bara Bengt (895845) och Axel (Axelstar)`); process.exit(1); }
if (!process.env.DATABASE_URL) { console.error("kandidatbrytaren: DATABASE_URL saknas"); process.exit(1); }

// pg läses in först här, så att självtestet och avvisningarna ovan går utan databaspaketet.
const { default: pg } = await import("pg");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const lage = async () => (await pool.query(`SELECT kandidat_pa() AS pa`)).rows[0].pa === true;
const ord = (pa: boolean) => (pa ? "PÅ" : "AV");
try {
  const fore = await lage();
  if (atgard !== "las") {
    await pool.query(`INSERT INTO kandidat_brytare (atgard, vem, korning) VALUES ($1, $2, $3)`, [atgard, vem, process.env.GITHUB_RUN_ID ?? null]);
  }
  const efter = await lage();
  console.log(`kandidatbrytaren: ${atgard} av ${vem} — kandidaten var ${ord(fore)}, är ${ord(efter)}`);
  // Loggen sedan den senaste tystningen: vem som har startat och vem som saknas.
  const logg = await pool.query(`
    SELECT id, to_char(tid AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') || ' UTC' AS tid, atgard, vem FROM kandidat_brytare
    WHERE id >= coalesce((SELECT max(id) FROM kandidat_brytare WHERE atgard = 'tysta'), 0) ORDER BY id`);
  for (const r of logg.rows) console.log(`  ${r.tid}  ${r.atgard}  ${r.vem}`);
  if (!efter) {
    const startat = new Set(logg.rows.filter((r) => r.atgard === "starta").map((r) => r.vem));
    const saknas = ["bengt", "axel"].filter((v) => !startat.has(v));
    console.log(`  väntar på starta av: ${saknas.join(" och ")}`);
  }
  if (efter !== fore) {
    // Publiceringens svenska jobb, hittat på sin URL: grannländernas bär land=, och exakt ETT jobb får matcha.
    const j = await pool.query(`SELECT jobid, jobname, command FROM cron.job WHERE command LIKE '%functions/v1/publicera%' AND command !~ 'land='`);
    if (j.rows.length !== 1) { console.error(`kandidatbrytaren: hittade ${j.rows.length} publiceringsjobb — publiceringen sker vid nästa tiominutersslag`); process.exitCode = 1; }
    else {
      const r = await pool.query(j.rows[0].command);
      const reqId = Number(Object.values(r.rows[0] ?? {})[0]);
      console.log(`publiceringen startad direkt (${j.rows[0].jobname}, request ${reqId}); kommandot skrivs aldrig ut`);
      let svar: { status_code: number | null; content: string | null } | null = null;
      for (let i = 0; i < 24 && !svar && Number.isFinite(reqId); i++) {
        await new Promise((res) => setTimeout(res, 5000));
        svar = (await pool.query(`SELECT status_code, content FROM net._http_response WHERE id = $1`, [reqId])).rows[0] ?? null;
      }
      if (!svar) console.log("  inget svar inom 120 s — läs beviset i lägesfilen");
      else {
        let d: Record<string, unknown> = {};
        try { d = JSON.parse(svar.content ?? ""); } catch { /* kroppen skrivs inte ut: den kan bära annat än svaret */ }
        const noter = Array.isArray(d.notes) ? (d.notes as string[]).filter((n) => n.startsWith("kandidat:")) : [];
        console.log(`  status ${svar.status_code}, ok ${d.ok}, generated_at ${d.generated_at}, kandidat ${d.kandidat ?? "saknas"}${noter.length ? ` — ${noter.join(" | ")}` : ""}`);
      }
    }
  }
} finally {
  await pool.end();
}
