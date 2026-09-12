// KÄLLKOLLEN (Bengts avstämning 12/9): ligger allt vi ska mäta på källor som faktiskt VÄXER?
//
// FRÅGAN. Vi har fyra fastställda tröskeldokument, flera grindar som ska fällas i vinter och ett
// arkiv som är husets moat. Var och en vilar på att någon tabell fylls på. Healthchecken vaktar
// fem av dem och vakthunden tre — men ingen av dem vaktar radarn, skuggloggen eller olycksarkivet,
// och det är just de tre som bär vattenplaningen, skuggan och facit.
//
// VARFÖR EN EGEN SVEP I STÄLLET FÖR FLER RADER I HEALTHCHECKEN: healthchecken frågar "är kedjan
// till appen hel". Den här frågar "kan vi fälla domarna i vinter". Det är olika frågor med olika
// tidshorisont — en tabell som slutat växa i dag syns inte i appen förrän i mars, när underlaget
// skulle ha dömts. Svaret hör hemma i vakthunden till slut (kort #101:s syskon), men mäts först.
//
// RADARN ÄR DEN SOM OROAR MEST: ingest.yml kör radar.ts med `continue-on-error: true`, så om
// SMHI-hämtningen fallerar varje timme förblir ingest-jobbet grönt och ingen får veta. Hela
// vattenplaningsspåret vilar på den tabellen sedan grind V-A föll (DECISIONS #104).
//
// Helt läsande. Run: DATABASE_URL=... node --experimental-strip-types scripts/kallkollen.ts
// Självtest utan DB: scripts/kallkollen.ts --sjalvtest

/** En källa, dess tidskolumn och hur gammal den senaste raden får vara innan det är ett larm.
 *  `vaktas` säger vem som redan tittar — tomt betyder att den faller mellan stolarna i dag. */
type Kalla = {
  tabell: string; tid: string; maxTimmar: number; vaktas: string; barer: string;
};
export const KALLOR: Kalla[] = [
  { tabell: "weather_observations", tid: "sample_time", maxTimmar: 0.5, vaktas: "healthcheck + vakthund", barer: "allt väder: trend, efterhalka, grind A, V-A" },
  { tabell: "weather_latest", tid: "sample_time", maxTimmar: 0.5, vaktas: "healthcheck", barer: "snapshoten till appen" },
  // RÄTTAT 12/9 efter första körningen: 24 h var fel tröskel. road_conditions är NULÄGET, och
  // Trafikverket klassar om vägar i vinter — i september står det stilla i veckor, helt normalt
  // (mätt: 17,8 dygn). Min vakt larmade alltså på årstiden. Den SÄSONGSOBEROENDE frågan ställer
  // healthcheckens arkivvakt (#51/#71): finns tillstånd som INTE arkiverats? Den frågan har ett
  // rätt svar året om. Här räcker en grov livstecken-gräns.
  { tabell: "road_conditions", tid: "modified_time", maxTimmar: 24 * 45, vaktas: "healthcheck (arkivvakten)", barer: "halkvarningen A1" },
  { tabell: "road_condition_history", tid: "modified_time", maxTimmar: 24 * 30, vaktas: "healthcheck (arkivvakten)", barer: "vinterfacit — moaten" },
  { tabell: "radar_precip", tid: "observed_at", maxTimmar: 3, vaktas: "INGEN", barer: "vattenplaningens enda kvarvarande trigger" },
  { tabell: "situation_archive", tid: "last_seen", maxTimmar: 2, vaktas: "INGEN", barer: "facit för alla grindar" },
  { tabell: "shadow_log", tid: "run_at", maxTimmar: 2, vaktas: "INGEN", barer: "skuggans utdata — B3, V-B, upprepningen" },
  { tabell: "polisen_events", tid: "ingested_at", maxTimmar: 24, vaktas: "INGEN", barer: "viltvarningen A4" },
  { tabell: "smhi_warnings", tid: "published", maxTimmar: 24 * 14, vaktas: "INGEN", barer: "SMHI-spåret (§2.8)" },
  { tabell: "cameras", tid: "modified_time", maxTimmar: 24 * 7, vaktas: "healthcheck", barer: "fartkameror A5" },
];

export type Utfall = "FÄRSK" | "GAMMAL" | "TOM" | "SAKNAS";
export function doma(rader: number, alderH: number | null, maxTimmar: number): Utfall {
  if (rader === 0) return "TOM";
  if (alderH === null) return "TOM";
  return alderH <= maxTimmar ? "FÄRSK" : "GAMMAL";
}

const alder = (h: number) => h < 1 ? `${(h * 60).toFixed(0)} min` : h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} dygn`;

if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — domen per källa mot känd sanning\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); ok = false; }
    else console.log(`  ok: ${namn} = ${fick}`);
  };
  k("färsk inom gränsen", doma(100, 0.2, 0.5), "FÄRSK");
  k("exakt på gränsen räknas som färsk", doma(100, 0.5, 0.5), "FÄRSK");
  k("över gränsen", doma(100, 3, 0.5), "GAMMAL");
  k("tom tabell", doma(0, null, 0.5), "TOM");
  k("rader men ingen tid", doma(5, null, 0.5), "TOM");
  k("moaten får vara gammal", doma(830, 24 * 18, 24 * 30), "FÄRSK");
  // Varje källa ska ha en ägare ELLER vara märkt INGEN — inget tyst mellanläge.
  k("alla källor har vaktfält", KALLOR.every((x) => x.vaktas.length > 0), true);
  k("alla källor säger vad de bär", KALLOR.every((x) => x.barer.length > 0), true);
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK.");
  process.exit(0);
}

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await pool.query("SET statement_timeout = '120s'");

console.log("Källkollen — växer allt vi ska mäta på?\n");
const rader: { k: Kalla; utfall: Utfall; txt: string }[] = [];
for (const k of KALLOR) {
  try {
    const r = (await pool.query(
      `SELECT count(*)::bigint AS n, max(${k.tid}) AS sist,
              count(*) FILTER (WHERE ${k.tid} > now() - interval '24 hours')::bigint AS dygn
       FROM ${k.tabell}`)).rows[0];
    const n = Number(r.n);
    const alderH = r.sist ? (Date.now() - new Date(r.sist).getTime()) / 3600000 : null;
    const utfall = doma(n, alderH, k.maxTimmar);
    rader.push({ k, utfall, txt: `${String(n).padStart(9)} rader · ${alderH === null ? "ingen tid" : alder(alderH).padStart(9)} sedan · ${String(r.dygn).padStart(6)} senaste dygnet` });
  } catch (e) {
    rader.push({ k, utfall: "SAKNAS", txt: `frågan gick inte: ${String(e).slice(0, 60)}` });
  }
}

const ikon = (u: Utfall) => u === "FÄRSK" ? "✅" : u === "GAMMAL" ? "⚠️ " : u === "TOM" ? "⛔" : "✗";
for (const { k, utfall, txt } of rader) {
  console.log(`${ikon(utfall)} ${k.tabell.padEnd(23)} ${txt}`);
  console.log(`   bär: ${k.barer}`);
  console.log(`   vaktas av: ${k.vaktas}${k.vaktas === "INGEN" ? "  ⟵ faller mellan stolarna" : ""}`);
}

const trasiga = rader.filter((x) => x.utfall !== "FÄRSK");
const obevakade = rader.filter((x) => x.k.vaktas === "INGEN");
console.log(`\nSAMMANFATTNING`);
console.log(`  ${rader.length - trasiga.length} av ${rader.length} källor är färska.`);
if (trasiga.length) for (const t of trasiga) console.log(`  ${ikon(t.utfall)} ${t.tabell ?? t.k.tabell}: ${t.utfall} — bär ${t.k.barer}`);
console.log(`  ${obevakade.length} källor har INGEN vakt i dag: ${obevakade.map((x) => x.k.tabell).join(", ")}`);
console.log(`\n  En tabell som slutar växa i dag syns inte i appen förrän domen ska fällas i vinter.`);
console.log(`  Det är därför den här frågan är en annan än healthcheckens.`);
await pool.end();
