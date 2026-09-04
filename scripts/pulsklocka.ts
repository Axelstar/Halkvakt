// Pulsklockan (DECISIONS #26) breddad till de tre svältande jobben — FI, DK, regn-30
// (Bengt + Axel 4/9, efter healthcheck-larmet och eftermätningen på kort #44).
// Sedan ingest-no (kort #35) och — kort #50, Bengts "kör push healthcheck" 4/9 kväll —
// healthchecken själv: vakthunden var det sista tidskritiska jobbet på naken GitHub-cron
// och levererade 40 % av bokad takt (20 av ~49 avfyrningar på 99 h, värsta hål 6 h 44,
// noll mellanrum inom de bokade 2 h). En vakthund som inte vaktas mäter tur, inte tystnad.
//
// HEMLIGHETSREGELN STYR FORMEN: pulsjobbens kommandon bär en GitHub-token. Skriptet
// LÄSER därför aldrig ut ett kommando i klartext och SKRIVER aldrig ett nytt från
// grunden — det KOPIERAR malljobbets kommando och byter bara workflow-filnamnet.
// Token följer med utan att någonsin passera en logg eller den här filen.
//
// --inventering: visar cron-jobben maskerat (jobid, namn, schema, vilken workflow-fil
//   kommandot pekar på, om Authorization-header finns) — formatet bevisas före bygget.
// skarpt: skapar/uppdaterar pulsjobben i NYA ur mallen och läser tillbaka som bevis.
//
// Run: DATABASE_URL=... node --experimental-strip-types scripts/pulsklocka.ts [--inventering]

const NYA: { namn: string; schema: string; fil: string }[] = [
  { namn: "puls-ingest-fi", schema: "7,37 * * * *", fil: "ingest-fi.yml" },
  { namn: "puls-ingest-dk", schema: "12,42 * * * *", fil: "ingest-dk.yml" },
  { namn: "puls-regn-30", schema: "41 * * * *", fil: "regn-30.yml" },
  { namn: "puls-ingest-no", schema: "17,47 * * * *", fil: "ingest-no.yml" },   // kort #35, 4/9: no-arkivet tickar
  { namn: "puls-healthcheck", schema: "23 */2 * * *", fil: "healthcheck.yml" }, // kort #50, 4/9: vakthunden vaktades inte själv
];
const MALLFIL = "ingest.yml";            // svenska ingest-pulsen = bevisat fungerande mall
const INVENTERING = process.argv.includes("--inventering");

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });

// Maskerad vy: allt utom det vi behöver se. Kommandot självt lämnar aldrig databasen.
const VY = `SELECT jobid, jobname, schedule, active,
  substring(command from 'workflows/([A-Za-z0-9._-]+)/dispatches') AS workflow_fil,
  (command ILIKE '%authorization%') AS har_token,
  length(command) AS kommandolangd
  FROM cron.job ORDER BY jobid`;

const fore = await pool.query(VY);
console.log(`Pulsklockan — ${fore.rows.length} cron-jobb (kommandon aldrig utskrivna):`);
for (const r of fore.rows)
  console.log(`  #${r.jobid} ${String(r.jobname).padEnd(20)} ${String(r.schedule).padEnd(15)} aktiv=${r.active} workflow=${r.workflow_fil ?? "—"} token=${r.har_token} len=${r.kommandolangd}`);

const mall = fore.rows.find((r: any) => r.workflow_fil === MALLFIL);
if (!mall) {
  console.error(`MALLVAKT: hittade inget pulsjobb som pekar på ${MALLFIL} — pulsklockan ser inte ut som antaget, bygg inget på gissningar.`);
  await pool.end(); process.exit(1);
}
console.log(`\nMall: jobb #${mall.jobid} (${mall.jobname}) → ${MALLFIL}, token=${mall.har_token}`);
if (!mall.har_token) { console.error("MALLVAKT: malljobbet saknar Authorization — fel jobb, avbryter."); await pool.end(); process.exit(1); }

if (INVENTERING) {
  console.log(`\nINVENTERING — inget skrivet. Skulle skapa:`);
  for (const n of NYA) console.log(`  ${n.namn.padEnd(20)} ${n.schema.padEnd(15)} → ${n.fil}`);
  await pool.end(); process.exit(0);
}

// Skarpt: kopiera mallens kommando, byt bara filnamnet. replace() sker I DATABASEN.
for (const n of NYA) {
  await pool.query(
    `SELECT cron.schedule($1, $2, (SELECT replace(command, $3, $4) FROM cron.job WHERE jobid = $5))`,
    [n.namn, n.schema, MALLFIL, n.fil, mall.jobid]);
  console.log(`schemalagt: ${n.namn} (${n.schema}) → ${n.fil}`);
}

// Bevis: läs tillbaka och kräv att varje nytt jobb pekar rätt och bär token.
const efter = await pool.query(VY);
console.log(`\nEfter (${efter.rows.length} jobb):`);
let ok = true;
for (const n of NYA) {
  const r = efter.rows.find((x: any) => x.jobname === n.namn);
  const bra = r && r.active && r.workflow_fil === n.fil && r.har_token && r.schedule === n.schema;
  console.log(`  ${bra ? "OK " : "FEL"} ${n.namn}: workflow=${r?.workflow_fil ?? "—"} schema=${r?.schedule ?? "—"} aktiv=${r?.active ?? "—"} token=${r?.har_token ?? "—"}`);
  if (!bra) ok = false;
}
await pool.end();
if (!ok) { console.error("BEVISVAKT: minst ett pulsjobb blev inte som beställt."); process.exit(1); }
console.log(`\nAlla ${NYA.length} pulsjobben på plats. Bevis kommer från jobbens EGNA körningar: healthcheckens egna mellanrum (kort #50: inget över 2 h 30), FI/DK-stalheten och regn-tackningens 2/2-andel — inte från den här raden.`);
