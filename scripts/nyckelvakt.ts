// Nyckelvakten (DECISIONS #570). DB-knappen skriver ut sina rader i Actions-loggen och i körningens sammanfattning, och repot är
// publikt. 15/10 läste en bevisrad `command` ur cron.job, och INGEST_KEY (x-halkvakt-key) hamnade i klartext i körning 38698517939:
// nyckeln finns inte i GitHub Secrets, så GitHub kunde inte maskera den. Regeln: ett svar som bär en nyckel skrivs inte ut — oavsett
// vilken sats som gav det. Vakten läser SVARET, inte satsen, så att SELECT *, en vy eller en ny tabell med kommandon också fångas.
// Kör: node --experimental-strip-types scripts/nyckelvakt.ts --sjalvtest

/** Det som bara en nyckel ser ut som: rubriken, Bearer-token, apikey-fältet och en JWT (Supabases nycklar). */
export const NYCKELMONSTER: [string, RegExp][] = [
  ["x-halkvakt-key", /x-halkvakt-key/i],
  ["Bearer", /\bBearer\s+[A-Za-z0-9._~+/-]{16,}/],
  ["apikey", /\bapikey\b/i],
  ["JWT", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./],
];

/** null = svaret får skrivas ut; annars skälet, utan ett enda värde ur svaret. */
export function nyckelvakt(svar: string): string | null {
  const traffar = NYCKELMONSTER.filter(([, m]) => m.test(svar)).map(([namn]) => namn);
  if (!traffar.length) return null;
  return `VÄGRAT (DECISIONS #570): svaret bär det som ser ut som en nyckel (${traffar.join(", ")}) — inga värden skrivs ut. ` +
    `Läs jobname, schedule och active ur cron.job, eller bevisa ett kommando med position('<väntat fragment>' in command) > 0 eller md5(command).`;
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  const hemlig = "0123456789abcdef0123456789abcdef0123456789abcdef";
  const cronRad = JSON.stringify([{ jobname: "halkvakt-arkivexport", command: `SELECT net.http_post(url:='https://x.supabase.co/functions/v1/arkivexport', headers:='{"Content-Type":"application/json","x-halkvakt-key":"${hemlig}"}')` }]);
  k(nyckelvakt(cronRad) !== null, "cron-kommandot med x-halkvakt-key vägras");
  k(!(nyckelvakt(cronRad) ?? "").includes(hemlig.slice(0, 8)), "skälet bär inte nyckeln");
  k(nyckelvakt(JSON.stringify([{ h: `Authorization: Bearer ${hemlig}` }])) !== null, "Bearer-token vägras");
  k(nyckelvakt(JSON.stringify([{ headers: { apikey: "x" } }])) !== null, "apikey-fältet vägras");
  k(nyckelvakt(JSON.stringify([{ v: "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.c2lnbmF0dXJl" }])) !== null, "en JWT vägras");
  k(nyckelvakt(JSON.stringify([{ jobname: "halkvakt-arkivexport", schedule: "40 * * * *", active: true }])) === null,
    "jobbnamn, schema och aktiv skrivs ut");
  k(nyckelvakt(JSON.stringify([{ summa: "459 MB", vantar: 76, sr_dygn: true }])) === null, "storlekar, antal och rättigheter skrivs ut");
  k(nyckelvakt(JSON.stringify([{ text: "Bearer of bad news" }])) === null, "ordet Bearer utan token släpps");
  console.log("✓ självtest: x-halkvakt-key, Bearer-token, apikey och JWT vägras utan att skälet bär värdet; vanliga svar skrivs ut");
  process.exit(0);
}
