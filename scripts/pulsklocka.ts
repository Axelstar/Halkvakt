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
  // Kort #53: FI+DK+NO i ETT jobb. EN gång i timmen (Bengt + Axel 8/9, DECISIONS #82:s
  // rättelse 2): glesare hade tystat gränsstationerna — givarvakten (#75) släpper bara
  // mätningar yngre än 3 h. Tätare kostar 3 debiterade minuter per körning i onödan.
  { namn: "puls-ingest-grannar", schema: "24 * * * *", fil: "ingest-grannar.yml" },
  // Kort #80: svenska GitHub-ingesten tillbaka EN gång i timmen — med --skip=weather,deviations
  // i ingest.yml bär den bara det livemotorn inte gör (kamerorna, moaten, polisen, SMHI).
  { namn: "puls-ingest", schema: "11 * * * *", fil: "ingest.yml" },
  // Kort #50 (Bengts beslut 9/9 "gör den som en bro", DECISIONS #91): puls-healthcheck tillbaka.
  // Axel stängde den 8/9 när vakthunden i Supabase tog över, men vakthunden ser bara livekedjan
  // och manifestet — healthchecken är ensam om grannländerna, gränsstationerna, kamerorna,
  // kartlagren och arkivvakten, och naken GitHub-cron gav 40 % och fyrtimmarshål. BRO: 12 min/dygn
  // Kontrollerna flyttade in i vakthunden 14/9 (kort #87, DECISIONS #175) — men filen blev
  // KVAR på Bengts beslut samma dag: den är den enda kontroll som körs utanför det den vaktar.
  // Bron är alltså inte längre en bro utan ett andra spår, och pulsen behövs permanent.
  { namn: "puls-healthcheck", schema: "23 */2 * * *", fil: "healthcheck.yml" },
];

// AVVECKLAS (kort #53): de tre grannjobben ersätts av ett. Utan borttagning skulle de
// gamla fortsätta fyra mot de gamla filerna och besparingen bli noll — pulsklockan kunde
// bara SKAPA, aldrig ta bort, och det hålet var osynligt tills merget krävde det.
// Bara namn i den här listan rörs; inget mönster, ingen slasktratt.
// Kort #79/#85 (Axel + Bengt 9/9, DECISIONS #89): puls-regn-30 avvecklas. Sedan ingest-live
// deployades 9/9 skriver livemotorn rain_sum_mm varje minut; regn-30 kom bara in i en restnisch
// (raden var redan låst med NULL, ON CONFLICT DO NOTHING) och kostade 24 debiterade min/dygn.
const AVVECKLA: string[] = ["puls-ingest-fi", "puls-ingest-dk", "puls-ingest-no", "puls-regn-30"];
// Mallen var puls-ingest (ingest.yml, avstängd av Axel 8/9), sedan puls-regn-30 (avvecklas nu).
// puls-ingest-grannar är det pulsjobb som fyrar varje timme och bär token — mallvakten nedan
// bevisar det innan något kopieras. Byt mall INNAN dess föregångare avvecklas, aldrig efter.
const MALLFIL = "ingest-grannar.yml";
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
  for (const n of NYA) console.log(`  ${n.namn.padEnd(22)} ${n.schema.padEnd(15)} → ${n.fil}`);
  const finns = new Set(fore.rows.map((r: any) => r.jobname));
  console.log(`\nSkulle AVVECKLA:`);
  for (const namn of AVVECKLA)
    console.log(`  ${namn.padEnd(22)} ${finns.has(namn) ? "finns → tas bort" : "finns inte redan — inget att göra"}`);
  await pool.end(); process.exit(0);
}

// Skarpt: kopiera mallens kommando, byt bara filnamnet. replace() sker I DATABASEN.
for (const n of NYA) {
  await pool.query(
    `SELECT cron.schedule($1, $2, (SELECT replace(command, $3, $4) FROM cron.job WHERE jobid = $5))`,
    [n.namn, n.schema, MALLFIL, n.fil, mall.jobid]);
  console.log(`schemalagt: ${n.namn} (${n.schema}) → ${n.fil}`);
}

// Avveckling SIST, aldrig före: ersättaren ska finnas innan föregångaren tas bort, annars
// uppstår ett glapp där ingen hämtar. cron.unschedule tål inte ett namn som saknas, så
// varje borttagning vaktas mot den lästa listan.
const fanns = new Set(fore.rows.map((r: any) => r.jobname));
for (const namn of AVVECKLA) {
  if (!fanns.has(namn)) { console.log(`avvecklat redan: ${namn} (fanns inte)`); continue; }
  await pool.query(`SELECT cron.unschedule($1)`, [namn]);
  console.log(`avvecklat: ${namn}`);
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
for (const namn of AVVECKLA) {
  const kvar = efter.rows.some((x: any) => x.jobname === namn);
  console.log(`  ${kvar ? "FEL" : "OK "} ${namn}: ${kvar ? "FINNS KVAR — dubbelkörning och dubbel kostnad" : "borta"}`);
  if (kvar) ok = false;
}
await pool.end();
if (!ok) { console.error("BEVISVAKT: minst ett pulsjobb blev inte som beställt."); process.exit(1); }
console.log(`\nAlla ${NYA.length} pulsjobben på plats. Bevis kommer från jobbens EGNA körningar: healthcheckens egna mellanrum (kort #50: inget över 2 h 30), FI/DK-stalheten och regn-tackningens 2/2-andel — inte från den här raden.`);
