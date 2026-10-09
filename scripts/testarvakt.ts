// Testarvakten (kort #315, DECISIONS #498). DB-knappen skriver ut sina rader i Actions-loggen och i körningens sammanfattning
// (dbknapp.yml: `tee -a "$GITHUB_STEP_SUMMARY"`). 9/10 bar sju körningar testarnas svar och missar där — varnings-id, station och
// klockslag, alltså ungefär var och när någon körde — och sammanfattningen överlevde att loggen raderades. Med ett publikt repo
// blir båda publika. Regeln: en sats som nämner driver_facit eller driver_miss får skriva ut sitt svar bara om det är högst en rad
// där varje kolumn är ett tal, bedömt efter Postgres typ (inte texten: ett stationsnummer som text eller en tidpunkt släpps inte).
// Annars skrivs inga värden. Vakten stoppar misstag, inte avsikt — den som gör om ett id till ett tal får ut det.
// Kör: node --experimental-strip-types scripts/testarvakt.ts --sjalvtest

/** Tabellerna med testarnas svar och missar (sql/027, sql/038). Inga vyer eller funktioner läser dem (kontrollerat 9/10). */
export const TESTARTABELLER = /\bdriver_(facit|miss)\b/i;
/** Postgres typ-id för tal: int8, int2, int4, float4, float8, numeric. */
const TALTYPER = new Set([20, 21, 23, 700, 701, 1700]);

export type Falt = { name: string; dataTypeID: number };

/** null = svaret får skrivas ut; annars skälet, utan ett enda värde ur svaret. */
export function testarvakt(sats: string, falt: Falt[], antalRader: number): string | null {
  if (!TESTARTABELLER.test(sats)) return null;
  const ejTal = falt.filter((f) => !TALTYPER.has(f.dataTypeID)).map((f) => f.name);
  if (antalRader <= 1 && !ejTal.length) return null;
  return `VÄGRAT (kort #315, DECISIONS #498): satsen läser testartabellerna och gav ${antalRader} rad(er)` +
    (ejTal.length ? `, kolumner som inte är tal: ${ejTal.join(", ")}` : "") +
    ` — bara en rad med tal skrivs ut. Räkna med count(*), eller läs raderna i Supabase SQL-editor, där inget hamnar i en logg.`;
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  const tal = (n: string): Falt => ({ name: n, dataTypeID: 20 }), text = (n: string): Falt => ({ name: n, dataTypeID: 25 });
  const tid = (n: string): Falt => ({ name: n, dataTypeID: 1184 });
  k(testarvakt("SELECT count(*) FROM driver_facit WHERE received_at > now() - interval '2 hours'", [tal("count")], 1) === null,
    "ett antal ur driver_facit skrivs ut");
  k(testarvakt("SELECT count(*)::int AS n, max(extract(epoch FROM t))::int AS s FROM driver_miss", [tal("n"), { name: "s", dataTypeID: 23 }], 1) === null,
    "flera tal på en rad skrivs ut");
  k(testarvakt("SELECT * FROM driver_facit ORDER BY id", [tal("id"), text("alert_id"), text("svar"), tid("received_at")], 30)?.includes("30 rad") === true,
    "SELECT * med 30 rader vägras");
  k(testarvakt("SELECT alert_id FROM driver_facit LIMIT 1", [text("alert_id")], 1)?.includes("alert_id") === true,
    "en enda rad med text vägras");
  k(testarvakt("SELECT max(received_at) FROM driver_facit", [tid("max")], 1) !== null, "en tidpunkt vägras");
  k(testarvakt("SELECT station_id FROM public.\"DRIVER_MISS\"", [text("station_id")], 1) !== null, "versaler, schema och citattecken fångas");
  k(testarvakt("SELECT id, count(*) FROM driver_facit GROUP BY id", [tal("id"), tal("count")], 2) !== null, "flera rader med tal vägras");
  k(testarvakt("SELECT count(*) FROM driver_facit WHERE false", [tal("count")], 0) === null, "noll rader är tillåtet");
  k(testarvakt("SELECT * FROM weather_observations LIMIT 3", [text("station_id")], 3) === null, "andra tabeller rörs inte");
  k(testarvakt("SELECT * FROM driver_facitarkiv", [text("x")], 3) === null, "ordgränsen: ett längre namn är inte testartabellen");
  k(!(testarvakt("SELECT * FROM driver_facit", [text("svar")], 2) ?? "").includes("ja"), "skälet bär inga värden");
  console.log("✓ självtest: antal släpps, rader, text och tidpunkter vägras, varianter av tabellnamnet fångas, andra tabeller rörs inte");
  process.exit(0);
}
