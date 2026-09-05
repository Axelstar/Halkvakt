// Kursormätningen (kort #51, Bengts order 5/9). Gårdagens mätning var CIRKULÄR: den
// jämförde våra egna tabeller med varandra och kunde därför bara säga noll när strömmen
// stod still. Den här låter TRAFIKVERKET vara domare.
//
// FRÅGAN: livemotorn (minutvis) och GitHub-ingesten (timvis) delar changeid-kursor. Om
// minutjobbet äter strömmen ser timjobbet — arkivets enda skrivare — bara sista minutens
// delta, och omklassningarna däremellan arkiveras aldrig. Men den delade kursorn kan bara
// fällas när det FINNS omklassningar. Därför mäts två saker samtidigt:
//
//   A) LEVER STRÖMMEN? Full hämtning (changeid 0) ger TRV:s sanning för varje segment.
//      Fördelningen av ModifiedTime säger om något klassats om senaste timmen/dygnet/veckan.
//      Utan trafik är läckhypotesen otestbar — och då ska mätningen SÄGA det, inte fria.
//   B) TAPPAS RADER? Varje ModifiedTime TRV visar ska finnas i road_condition_history som
//      (segment_id, modified_time). Saknas den blev just den omklassningen aldrig arkiverad.
//      Det är förlust mätt mot KÄLLAN, inte mot oss själva.
//
// Dessutom: TRV:s lastChangeId mot vår lagrade — ligger vi långt efter lever livemotorn inte.
// HELT LÄSANDE: ingen kursor flyttas, ingen rad skrivs, produktionsflödet är orört.
//
// Run: TRAFIKVERKET_API_KEY=... DATABASE_URL=... node --experimental-strip-types scripts/kursormatning.ts
// Självtest utan nät/DB: scripts/kursormatning.ts --sjalvtest

type Trv = { seg: string; mt: string };          // Trafikverkets sanning
type Ark = { seg: string; mt: string };          // vårt arkiv

const H = 3_600_000;
function jamfor(trv: Trv[], ark: Ark[], nu: number) {
  const nyckel = (r: { seg: string; mt: string }) => `${r.seg}@${r.mt}`;
  const iArkiv = new Set(ark.map(nyckel));
  const alder = (r: Trv) => (nu - new Date(r.mt).getTime()) / H;
  const fonster = (h: number) => trv.filter(r => alder(r) <= h);
  const saknade = (rows: Trv[]) => rows.filter(r => !iArkiv.has(nyckel(r)));
  const f = (h: number) => { const v = fonster(h); const s = saknade(v); return { n: v.length, saknas: s.length }; };
  return { totalt: trv.length, timme: f(1), dygn: f(24), vecka: f(24 * 7), allt: f(Number.POSITIVE_INFINITY) };
}

type Res = ReturnType<typeof jamfor>;
function rapport(r: Res) {
  const rad = (namn: string, d: { n: number; saknas: number }) =>
    console.log(`  ${namn.padEnd(22)} ${String(d.n).padStart(5)} segment omklassade   ${String(d.saknas).padStart(5)} EJ arkiverade`);
  rad("senaste timmen", r.timme);
  rad("senaste dygnet", r.dygn);
  rad("senaste veckan", r.vecka);
  rad("hela beståndet", r.allt);
}

// Domen är avsiktligt trestegs: förlust · frisk under last · otestbar (tyst ström).
// Att fria en hypotes på tyst ström vore precis gårdagens fel, en gång till.
function dom(r: Res): { rad: string; forlust: boolean } {
  if (r.dygn.saknas > 0)
    return { rad: `DOM: FÖRLUST BEVISAD — ${r.dygn.saknas} av ${r.dygn.n} omklassningar det senaste dygnet saknas i arkivet.`, forlust: true };
  if (r.dygn.n === 0)
    return { rad: `DOM: OTESTBAR — noll omklassningar hos Trafikverket det senaste dygnet. Strömmen är tyst, inte vår pipeline. Läckhypotesen kan varken fällas eller frias i dag.`, forlust: false };
  return { rad: `DOM: ARKIVET HÖLL — ${r.dygn.n} omklassningar det senaste dygnet, alla arkiverade.`, forlust: false };
}

// ── Självtest med känd sanning, utan nät och utan DB.
if (process.argv.includes("--sjalvtest")) {
  const nu = Date.parse("2026-09-05T12:00:00Z");
  const t = (h: number) => new Date(nu - h * H).toISOString();
  const trv: Trv[] = [
    { seg: "a", mt: t(0.5) }, { seg: "b", mt: t(0.5) },   // senaste timmen: 2
    { seg: "c", mt: t(5) }, { seg: "d", mt: t(20) },      // senaste dygnet: +2 = 4
    { seg: "e", mt: t(100) },                             // senaste veckan: +1 = 5
    { seg: "f", mt: t(2000) },                            // äldre
  ];
  const ark: Ark[] = [{ seg: "a", mt: t(0.5) }, { seg: "d", mt: t(20) }, { seg: "f", mt: t(2000) }];
  const r = jamfor(trv, ark, nu);
  console.log("SJÄLVTEST — 6 segment hos TRV, 3 i arkivet; väntat: timme 2/1 saknad, dygn 4/2, vecka 5/3, allt 6/3");
  rapport(r);
  let ok = true;
  const kolla = (n: string, fick: number, vantat: number) => { if (fick !== vantat) { console.error(`SJÄLVTEST: ${n} ${fick}, väntat ${vantat}`); ok = false; } };
  kolla("timme.n", r.timme.n, 2); kolla("timme.saknas", r.timme.saknas, 1);
  kolla("dygn.n", r.dygn.n, 4); kolla("dygn.saknas", r.dygn.saknas, 2);
  kolla("vecka.n", r.vecka.n, 5); kolla("vecka.saknas", r.vecka.saknas, 3);
  kolla("allt.n", r.allt.n, 6); kolla("allt.saknas", r.allt.saknas, 3);
  const d = dom(r);
  console.log(d.rad);
  if (!d.forlust) { console.error("SJÄLVTEST: domen skulle ha fällt FÖRLUST"); ok = false; }
  // Och domspärren åt andra hållet: tyst ström får ALDRIG bli en friande dom.
  const tyst = dom(jamfor([{ seg: "z", mt: t(2000) }], [], nu));
  if (!tyst.rad.startsWith("DOM: OTESTBAR")) { console.error(`SJÄLVTEST: tyst ström gav "${tyst.rad}", väntat OTESTBAR`); ok = false; }
  console.log(`tyst ström → ${tyst.rad}`);
  if (!ok) process.exit(1);
  console.log("SJÄLVTEST OK: fönstren, förlustdomen och tystnadsspärren återfinner den kända sanningen.");
  process.exit(0);
}

// ── Skarpt (läser bara).
const apiKey = process.env.TRAFIKVERKET_API_KEY, url = process.env.DATABASE_URL;
if (!apiKey || !url) { console.error("TRAFIKVERKET_API_KEY / DATABASE_URL not set"); process.exit(1); }
const { fetchRoadConditions } = await import("../ingest/sources/roadcondition.ts");
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });

const { items, lastChangeId } = await fetchRoadConditions(apiKey, "0");   // full sanning, skriver inget
const kursor = await pool.query(`SELECT last_change_id, synced_at, now() - synced_at AS age FROM sync_state WHERE source = 'road_conditions'`);
const arkiv = await pool.query(`SELECT segment_id AS seg, modified_time AS mt FROM road_condition_history`);
const nulage = await pool.query(`SELECT max(modified_time) AS senaste FROM road_conditions WHERE NOT deleted`);
await pool.end();

console.log(`Kursormätningen (kort #51) — Trafikverket som domare. Helt läsande.\n`);
const levande = items.filter(i => !i.deleted && i.modifiedTime);
if (levande.length < 400) {
  console.error(`UNDERLAGSVAKT: bara ${levande.length} segment från Trafikverket (<400) — hämtningen är trasig, inte arkivet. Grön-men-tom räknas inte.`);
  process.exit(1);
}

const k = kursor.rows[0];
console.log(`KURSORN: vår lagrade last_change_id ${k?.last_change_id ?? "—"} (synkad för ${k ? ((Date.now() - new Date(k.synced_at).getTime()) / 60000).toFixed(0) : "—"} min sedan)`);
console.log(`         Trafikverkets lastChangeId just nu ${lastChangeId ?? "—"}`);
console.log(`         ${String(k?.last_change_id) === String(lastChangeId) ? "IKAPP — livemotorn har konsumerat hela strömmen" : "SKILJER SIG — antingen ligger vi efter, eller så har TRV rullat vidare sedan vår sista körning"}\n`);

const r = jamfor(
  levande.map(i => ({ seg: i.segmentId, mt: new Date(i.modifiedTime).toISOString() })),
  arkiv.rows.map((a: any) => ({ seg: a.seg, mt: new Date(a.mt).toISOString() })),
  Date.now());

console.log(`TRAFIKVERKETS SANNING (${levande.length} levande segment) MOT VÅRT ARKIV (${arkiv.rows.length} rader):`);
rapport(r);
console.log(`\nVårt nuläge (road_conditions) senast ändrat: ${nulage.rows[0]?.senaste ?? "—"}`);
const d = dom(r);
console.log(`\n${d.rad}`);
console.log(`\nMätningen flyttade ingen kursor och skrev ingen rad. Åtgärd är Bengts och Axels beslut.`);
