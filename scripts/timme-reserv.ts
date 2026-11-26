// RESERVEN FÖR TIMKÖRNINGEN (Bengt 26/11: "ja bygg", DECISIONS #971). Pulsklockan startar den nya kandidatens timkörning
// (ny-kandidat-timme.yml) :47 varje timme, och småvägsrösten räknar sin timme efter den (kuvos-smavag-timme.yml, workflow_run).
// 25/11 15:47 UTC gick startsignalen ut ur databasen (pg_cron "INSERT 0 1"), men ingen körning startade hos GitHub. Timmen fanns
// aldrig, och eftersom rösten bara får använda en timme som är högst två timmar gammal (sql/110, FARSK_TIMMAR) hade den tigit
// omkring 17.00–17.49 svensk tid om den varit påslagen.
//
// Pulsklockan startar det här flödet :54 och :58. Det frågar GitHub om timmens körning finns, alltså en körning av ny-kandidat-timme
// skapad sedan :40 i den timme som pågår:
//   körningen finns                      → inget (det vanliga)
//   den saknas och klockan är före :57   → starta den (första reserven)
//   den saknas och klockan är :57 eller senare → starta den och larma: också :54 föll, eller :54 startade aldrig
// En dubbel körning är ofarlig: ny-kandidat-timme har en concurrency-grupp och skriver timmen med ON CONFLICT, och småvägsrösten
// skriver om samma timme. Larmet är ett ärende med etiketten smavag-vakt, tilldelat Bengt; en ny utebliven timme blir en kommentar.
// Uteblir också det här flödet tar småvägsröstens vakt (smavag-vakt.yml) timmen nästa morgon.
//
//   gh api "repos/<repo>/actions/workflows/ny-kandidat-timme.yml/runs?per_page=10" --jq '[.workflow_runs[].created_at]' \
//     | node --experimental-strip-types scripts/timme-reserv.ts [--nu 2026-11-25T15:54:30Z]
//     skriver "<beslut>\t<skäl>", beslut = finns | starta | larma
//   node --experimental-strip-types scripts/timme-reserv.ts --sjalvtest

export const FRAN_MIN = 40;    // en körning skapad från :40 i timmen räknas som timmens (pulsklockan startar den :47)
export const SISTA_MIN = 57;   // från :57 är det andra försöket: :54 har redan fått sin chans

export type Beslut = "finns" | "starta" | "larma";

export function besluta(skapade: string[], nu: Date): [Beslut, string] {
  const fran = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth(), nu.getUTCDate(), nu.getUTCHours(), FRAN_MIN));
  const timme = nu.toISOString().slice(0, 13) + ":00Z";
  if (nu < fran) return ["finns", `före :${FRAN_MIN}, timmens körning ska inte ha startat än (${timme})`];
  const finns = skapade.some((s) => { const t = new Date(s); return t >= fran && t <= nu; });
  if (finns) return ["finns", `timmens körning finns (${timme})`];
  return nu.getUTCMinutes() >= SISTA_MIN
    ? ["larma", `timmens körning saknas också efter :54 — startar den och larmar (${timme})`]
    : ["starta", `timmens körning saknas — startar den (${timme})`];
}

function sjalvtest() {
  const fall: [string[], string, Beslut][] = [
    [["2026-11-25T14:47:05Z"], "2026-11-25T14:54:20Z", "finns"],
    [["2026-11-25T14:47:05Z"], "2026-11-25T15:54:20Z", "starta"],     // 25/11: 15:47 uteblev
    [["2026-11-25T14:47:05Z"], "2026-11-25T15:58:20Z", "larma"],      // :54 föll också
    [["2026-11-25T14:47:05Z", "2026-11-25T15:54:40Z"], "2026-11-25T15:58:20Z", "finns"],   // :54 räddade timmen
    [["2026-11-25T15:47:05Z"], "2026-11-25T15:30:00Z", "finns"],      // före :40
    [["2026-11-25T15:41:00Z"], "2026-11-25T15:54:00Z", "finns"],      // en hand- eller reservkörning efter :40 räknas
    [[], "2026-11-25T15:59:59Z", "larma"],
  ];
  for (const [skapade, nu, vantat] of fall) {
    const [b] = besluta(skapade, new Date(nu));
    if (b !== vantat) { console.error(`självtest FEL: ${nu} gav ${b}, väntat ${vantat}`); process.exit(1); }
  }
  console.log(`självtest ok: timme-reserv.ts (${fall.length} fall)`);
}

if (process.argv.includes("--sjalvtest")) sjalvtest();
else {
  const i = process.argv.indexOf("--nu");
  const nu = i > 0 ? new Date(process.argv[i + 1]) : new Date();
  let text = "";
  for await (const bit of process.stdin) text += bit;
  const [b, skal] = besluta(JSON.parse(text) as string[], nu);
  console.log(`${b}\t${skal}`);
}
