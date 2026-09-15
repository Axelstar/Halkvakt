// VAKTHUNDEN — självövervakning som INTE kräver GitHub Actions (#73, 8/9 2026).
//
// Bakgrund: healthcheck.yml låg i Actions. När minuterna tog slut 5/9 tystnade vakthunden
// samtidigt som kedjan gick sönder, och att live.json var 66 timmar gammal upptäcktes bara
// för att en människa råkade titta. En vakthund som dör med det den vaktar är ingen vakthund.
//
// Kollar tre led, i den ordning de kan gå sönder:
//   1. Hämtar vi?      sync_state per källa
//   2. Sparar vi?      nyaste väderobservationen
//   3. Når det appen?  live.json på CDN — det led som faktiskt fallerade
// Larmar via GitHub-issue (API-anrop, inga Actions-minuter). En issue åt gången: öppnas när
// något är fel, uppdateras medan det består, stängs när allt är grönt igen.
//
// Därtill TVÅ händelsevakter som inte är felkontroller. De säger inte att något är trasigt
// utan att något äntligen går att mäta — egen etikett, egen issue, en enda gång var:
//   4. Första vinterordet i väglagsarkivet (kort #52). Prov: ?vinterprov=1
//   5. Frosten är här (kort #89, Bengts order 11/9). Prov: ?frostprov=1
// Provet bär egen etikett, så att ett prov aldrig förbrukar det riktiga engångslarmet.
//
// Och EN vakt över mätningarna själva (6, kort #101 + #106, Bengts order 12/9). Två halvor i
// samma larm, för de svarar på samma fråga — är mätapparaten frisk?
//   6a. KÖRNINGARNA: går de schemalagda mätjobben, och i tid?
//   6b. KÄLLORNA: växer tabellerna som domarna ska vila på?
// Prov: ?matvaktprov=1
// Den har egen etikett och egen öppna/uppdatera/stäng-cykel — INTE engångslarm, för ett schemafel
// kan upprepas — och den färgar aldrig driftvakthunden röd. Skälet: rött ska betyda "kedjan till
// appen är bruten NU". En mätning som missade en måndag är inte det, och låg den i samma issue
// skulle den hålla vakthunden röd i en vecka och dränka ett riktigt driftlarm.
//
// Och EN vakt över KASSAN (8, kort #152, Bengts order 13/9):
//   8. ACTIONS-TAKET: närmar vi oss den gräns som har hårt stopp?
// Prov: ?kassaprov=1
// Samma egen etikett och egen cykel, samma regel om att aldrig färga driftvakthunden röd.
//
// Och EN vakt över att NÅGON LÄSER larmen (7, kort #31 + #149, Bengts order 12/9):
//   7. KÄLLÄNDRINGARNA: ligger ett nyhetslarm oläst över sin frist?
// Prov: ?paminnelseprov=1
// Källvakten hade EN larmväg — ett issue tilldelat Bengt — och inget golv under den. Samma
// egen etikett och egen cykel, samma regel om att aldrig färga driftvakthunden röd.
//
// Och EN vakt över NYCKLARNA (10, kort #86, bedömning v3 N3, Bengts order 15/9):
//   10. NYCKELKALENDERN: går PAT:en eller Supabase-tokenen ut inom 14 dygn?
// Prov: ?nyckelprov=1
// PAT:ens datum läses LIVE ur GitHubs svarshuvud; Supabase-tokenens står i koden. Egen etikett,
// egen cykel, skrivs en gång om dygnet.
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
const REPO = "Axelstar/Halkvakt";
const token = Deno.env.get("PUBLISH_TOKEN")!;
const CDN = "https://axelstar.github.io/halkvakt-karta/data/app/v1/live.json";
const MARK = "<!-- vakthund -->";   // hittar vår egen issue igen

async function gh(path: string, method = "GET", body?: unknown): Promise<any> {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}`);
  return r.json();
}

/** Kadens i timmar ur ett 5-fälts cron-uttryck. null = går inte att tolka, och DET är ett larm
 *  i sig — en vakt som inte förstår schemat kan inte se när schemat missas. */
export function kadensTimmar(cron: string): number | null {
  const f = cron.trim().split(/\s+/);
  if (f.length !== 5) return null;
  const [, tim, dom, , dow] = f;
  const varje = tim.match(/^\*\/(\d+)$/);
  if (varje) return Number(varje[1]);   // "23 */2 * * *" ⇒ varannan timme
  if (tim === "*") return 1;
  if (!/^\d+$/.test(tim)) return null;  // listor och intervall finns inte i repot i dag
  if (dow !== "*") return 24 * 7;       // veckovis
  if (dom !== "*") return 24 * 28;
  return 24;                            // dagligen
}

Deno.serve(async (req) => {
  const k = Deno.env.get("INGEST_KEY");
  if (!k || req.headers.get("x-halkvakt-key") !== k) return new Response("forbidden", { status: 403 });

  const problem: string[] = [];
  if (new URL(req.url).searchParams.get("larmprov") === "1") problem.push("**LARMPROV** — medvetet framkallat fel för att bevisa larmvägen. Ska stängas automatiskt vid nästa gröna körning.");
  const rad: string[] = [];
  try {
    // 1. Hämtar vi? Livemotorns källor har hård tröskel, GitHub-flödets mjuk (de väntar
    //    på kvotnollställningen 1/10 och SKA inte larma under september).
    const HÅRD: Record<string, number> = { deviations: 15, road_conditions: 15, weather: 60 };
    for (const r of await sql`SELECT source, synced_at FROM sync_state ORDER BY source`) {
      const min = (Date.now() - new Date(r.synced_at).getTime()) / 60000;
      const gräns = HÅRD[r.source];
      rad.push(`${r.source}: ${min.toFixed(0)} min${gräns ? ` (gräns ${gräns})` : " (GitHub-flödet, vilar)"}`);
      if (gräns && min > gräns) problem.push(`**${r.source}** hämtas inte: ${min.toFixed(0)} min sedan (gräns ${gräns})`);
    }
    // 2. Sparar vi?
    const [w] = await sql`SELECT max(sample_time) t FROM weather_observations`;
    const wMin = w.t ? (Date.now() - new Date(w.t).getTime()) / 60000 : Infinity;
    rad.push(`nyaste väderobservation: ${wMin.toFixed(0)} min`);
    if (wMin > 90) problem.push(`**Väderdatan står stilla**: nyaste mätning ${wMin.toFixed(0)} min gammal`);

    // 3. Når det APPEN? Inte "ligger filen på CDN" — apparna hämtar manifest.json och
    //    FÖRKASTAR en fil vars sha256 inte stämmer, och behåller den förra. 8/9 skrev den
    //    första publicera-versionen ingen manifest.json alls: CDN såg färsk ut, telefonerna
    //    stod kvar på 5/9-snapshoten, och en vakthund som bara mätte live.json:s ålder sa
    //    grönt. Bengts granskning fångade det (#76). Mät det appen faktiskt gör.
    const [mRes, lRes] = await Promise.all([
      fetch(CDN.replace("live.json", "manifest.json"), { cache: "no-store" }),
      fetch(CDN, { cache: "no-store" }),
    ]);
    if (!mRes.ok) problem.push(`**manifest.json svarar ${mRes.status}** — apparna kan inte verifiera och behåller gammal data`);
    else if (!lRes.ok) problem.push(`**live.json svarar ${lRes.status}** — appen får ingen snapshot`);
    else {
      const manifest = await mRes.json();
      const rå = new Uint8Array(await lRes.clone().arrayBuffer());
      const sum = [...new Uint8Array(await crypto.subtle.digest("SHA-256", rå))]
        .map((b) => b.toString(16).padStart(2, "0")).join("");
      const väntad = manifest?.files?.live?.sha256;
      const cdnMin = (Date.now() - new Date(manifest.generated_at).getTime()) / 60000;
      rad.push(`manifest: ${cdnMin.toFixed(0)} min | sha ${sum === väntad ? "stämmer" : "MISMATCH"}`);
      if (sum !== väntad)
        problem.push(`**Manifestets sha256 stämmer inte med live.json** — apparna förkastar filen och kör vidare på förra snapshoten. Det här är felet som INTE syns på CDN.`);
      if (cdnMin > 45)
        problem.push(`**Appen får gammal data**: manifestet ${cdnMin.toFixed(0)} min gammalt (publiceras var 10:e min)`);
    }
  } catch (e) {
    problem.push(`Vakthunden kunde inte slutföra kontrollen: ${String(e)}`);
  }

  // 4. HAR VINTERN KOMMIT I VÄGLAGSDATAN? Inte en felkontroll — en HÄNDELSE, och därför
  //    egen issue med egen etikett. Den får ALDRIG färga vakthunden röd: inget är brutet.
  //    Varför den finns: kodgrindens mätning (kort #52) kan inte falsifiera sin premiss
  //    förrän arkivet bär vinterord. 11/9 var hela ordförrådet fyra neutrala strängar
  //    (Torrt 799, Våt 25, fläckvis 14) och senaste omklassningen 25/8. Alternativet var
  //    ett schemalagt veckojobb som mäter ingenting tills det snöar — kort #85:s minutdiet
  //    säger nej. Utlösaren ska vara första vinterordet, inte en kalender.
  //    INTE samma sak som marknadsföringens snolarm: det fyrar på `code !== 1` ur CDN-
  //    snapshoten (säsongens första VERKLIGA halka, per län, ett säljtillfälle). Det här
  //    fyrar på ordförrådet i ARKIVET oavsett kod — och den intressanta cellen för #52 är
  //    just kod 1, som snölarmet per konstruktion hoppar över.
  //    EN gång: etiketten letas i state=all, så en stängd issue inte ger ett nytt larm.
  try {
    const [v] = await sql`SELECT EXISTS (
      SELECT 1 FROM road_condition_history h, unnest(h.condition_info) i
      WHERE i ~* '(^|[^a-zåäö])(is|snö|halka|frost)') AS finns`;
    rad.push(`vinterord i väglagsarkivet: ${v.finns ? "JA" : "nej"}`);
    const prov = new URL(req.url).searchParams.get("vinterprov") === "1";
    if (v.finns || prov) {
      // Provet bär egen etikett, annars skulle ett prov förbruka det riktiga engångslarmet.
      const etikett = prov && !v.finns ? "vinterord-prov" : "vinterord";
      const tidigare = await gh(`/issues?state=all&labels=${etikett}&per_page=1`);
      if (!tidigare.length) {
        const brott = await sql`
          SELECT h.condition_code AS kod, i AS ord, count(*)::int AS n
          FROM road_condition_history h, unnest(h.condition_info) i
          WHERE i ~* '(^|[^a-zåäö])(is|snö|halka|frost)'
          GROUP BY 1, 2 ORDER BY 1, 3 DESC LIMIT 40`;
        const tabell = brott.length
          ? brott.map((b: any) => `| ${b.kod} | ${b.ord} | ${b.n} |`).join("\n")
          : "| — | (inga rader; detta är ett prov) | 0 |";
        await gh(`/issues`, "POST", {
          title: `❄️ Första vinterordet i väglagsarkivet — kodgrinden kan mätas (kort #52)${prov && !v.finns ? " [PROV]" : ""}`,
          labels: [etikett],
          body: `Trafikverket har börjat skriva vinterord i \`condition_info\`. Kodgrindens mätning ` +
            `kunde inte falsifiera sin premiss så länge arkivet bara bar Torrt och Våt; nu kan den.\n\n` +
            `| kod | ord | förekomster |\n|---|---|---|\n${tabell}\n\n` +
            `**Att göra:** kör knappen \`kodgrinden\` i Actions och läs C-raden.\n\n` +
            `**Varför det brådskar:** står det ett farlighetsord (is/halka/frost) på **kod 1** i tabellen ovan ` +
            `faller förslaget om nivådelning, och den regionala gränsen (län 21–25 eller 17+20–25) blir ` +
            `alternativet. Står där bara ytord på kod 1 håller premissen och nivådelningen kan beslutas.\n\n` +
            `Beslutet är Bengts och Axels. Ingen motorändring görs på eget bevåg — den rör engine/vectors ` +
            `och tre körtider.\n\nEngångslarm: den här issuen skapas aldrig igen, öppen eller stängd.`,
        });
      }
    }
  } catch (e) {
    // Tappat signal ÄR ett vakthundsfel: vinterordet får inte passera obemärkt.
    problem.push(`**Vinterkollen (kort #52) kunde inte larma**: ${String(e)}`);
  }

  // 5. HAR FROSTEN KOMMIT? Samma sort som 4: en HÄNDELSE, egen etikett, egen issue, EN gång,
  //    och den får aldrig färga vakthunden röd. Bengts order 11/9 efter steg 0 (kort #89).
  //    Varför den måste larma i stället för att stå i en issue: steg 0:s frysfråga (0c) gav
  //    3–4 fall och behöver ~30, och avläsningen har en HÅRD deadline på sju dygn — gallringen
  //    (#83, sql/014) tunnar allt äldre än så till en rad per halvtimme, och då kan arkivet
  //    inte längre säga NÄR regnet slutade (DECISIONS #97). En passiv påminnelse som ingen
  //    läser på tio dagar är i praktiken ingen påminnelse.
  //    SNUBBELTRÅD, INTE MÄTNING. Den räknar stationer med frusen yta — inte regnstopp följda
  //    av frost, som är 0c:s fråga. Att bygga om steg 0:s klassning här hade gett en andra
  //    implementation av samma regel, och det är precis vad driftvakten i steg 0 finns för att
  //    förhindra. Tråden säger "gå och titta"; knappen mäter.
  //    TRÖSKELN ÄR ETT GOLV MOT BRUS, ingen mätt gräns (trendens mening, TROSKLAR-TRENDEN §2):
  //    enstaka fjällstationer under noll i september ska inte väcka någon. Raden skrivs varje
  //    timme, så talet går att följa och tröskeln att ändra mot verkligheten.
  const FROST_STATIONER = 50;
  try {
    //    GIVARVAKTEN GÄLLER HÄR OCKSÅ (#75). Första provet 11/9 rapporterade "kallast −49,9 °C"
    //    — ingen vägyta, en trasig givare, samma sort som Storvik 2135 som stod på −10,7 °C i
    //    september och var appens enda halkpunkt. Snapshoten filtrerar bort dem med WX_SANE;
    //    den här frågan gjorde det inte, och en snubbeltråd som räknar trasiga givare kan väcka
    //    folk mitt i sommaren. Kravet är strängare än snapshotens: lufttemperaturen måste FINNAS,
    //    så att rimligheten går att pröva alls. En station vi inte kan kontrollera får inte väcka
    //    någon — "silence is a feature" gäller vakthunden med.
    const [f] = await sql`SELECT count(DISTINCT station_id)::int AS n, min(surface_temp_c) AS kallast
      FROM weather_observations
      WHERE sample_time > now() - interval '24 hours' AND surface_temp_c <= 0
        AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12`;
    rad.push(`frost: ${f.n} stationer med yta <= 0 °C senaste dygnet (larm vid ${FROST_STATIONER})`);
    const prov = new URL(req.url).searchParams.get("frostprov") === "1";
    if (f.n >= FROST_STATIONER || prov) {
      // Provet bär egen etikett, annars förbrukar det det riktiga engångslarmet.
      const etikett = prov && f.n < FROST_STATIONER ? "frostlarm-prov" : "frostlarm";
      const tidigare = await gh(`/issues?state=all&labels=${etikett}&per_page=1`);
      if (!tidigare.length) {
        await gh(`/issues`, "POST", {
          title: `🥶 Frosten är här — kör steg 0 inom sju dygn (kort #89)${prov && f.n < FROST_STATIONER ? " [PROV]" : ""}`,
          labels: [etikett],
          assignees: ["895845"],
          body: `${f.n} stationer har haft vägyta ≤ 0 °C det senaste dygnet` +
            `${f.kallast != null ? ` (kallast ${Number(f.kallast).toFixed(1)} °C)` : ""}. Tröskeln är ${FROST_STATIONER}.\n\n` +
            `**Att göra nu:** tryck knappen \`overgangar-steg0\` i Actions med \`dagar = 7\`.\n\n` +
            `**Varför det brådskar — sju dygn, inte "när det passar":** gallringen (kort #83, sql/014) ` +
            `tunnar allt äldre än sju dygn till EN rad per station och halvtimme. Steg 0:s gap-vakt kastar ` +
            `varje omslag med mer än 20 minuters lucka, så en gallrad vecka är obrukbar per konstruktion. ` +
            `Mätt 11/9 (DECISIONS #97): ogallrad vecka 157 användbara omslag av 1 971, gallrad vecka 32 av ` +
            `5 175. Läses frostnätterna för sent finns raderna kvar — men de kan inte längre säga NÄR ` +
            `regnet slutade, och 0a/0b/0c blir OAVGJORT.\n\n` +
            `**Vad som faktiskt ändras:** bara 0c. Avläsningen 11/9 gav 3–4 regnstopp följda av yta ≤ 1 °C; ` +
            `grinden behöver ~30. 0a (76 %, median 35 min), 0b, 0d och 0f ger samma svar som då.\n\n` +
            `**FYRA MÄTNINGAR VÄNTAR PÅ SAMMA NÄTTER, och ingen av dem kan ta dem ikapp:**\n` +
            `1. \`overgangar-steg0\` med \`dagar = 7\` — kort #89, 0c (ovan)\n` +
            `2. \`grind-t-a\` — trenden (#88), kräver >= 30 frostnätter på >= 20 stationer\n` +
            `3. \`grind-r-a\` med \`land = se\` — rimfrosten (#46). Svensk körning är den ENDA som kan ` +
            `köra R-A4, molnkontrollen: SMHI:s molnstationer är svenska. Finsk körning är förhandsbesked.\n` +
            `4. \`grind-k-a\` — frysklassningen (#103), vars septembervakt kräver >= 100 punkter med ` +
            `UPPMÄTT frys. Den har hittills haft noll.\n\n` +
            `Bakgrund: #127, \`docs/OVERGANGAR-ANALYS.md\` §9, DECISIONS #96 och #97, kort #89.\n\n` +
            `Engångslarm: den här issuen skapas aldrig igen, öppen eller stängd.`,
        });
      }
    }
  } catch (e) {
    // Tappad signal ÄR ett vakthundsfel: frosten kommer en gång per år och kan inte tas om.
    problem.push(`**Frostvakten (kort #89) kunde inte larma**: ${String(e)}`);
  }

  // 6a. GÅR MÄTNINGSKÖRNINGARNA? (kort #101, Bengts order 12/9.)
  //    BAKGRUNDEN: grind V-A:s måndagskörning 7/9 fallerade i minutkrisens svallvågor, ingen
  //    larmade, och den omkörning DECISIONS #69 uttryckligen krävde uteblev i åtta dygn. Samma
  //    sak hade hänt cellmätningen, vars enda skarpa körning låg nio dygn gammal två dygn före
  //    radardomen. Två domar vilade på fel underlag utan att någon visste. Kort #81 regel 5 säger
  //    att varje nytt led ska få en rad i vakthunden innan det går skarpt — den regeln gällde
  //    drift, inte mätningar, och det här täpper hålet.
  //
  //    TVÅ VILLKOR, och det andra är det viktigare: (a) senaste körningen fallerade, (b) det var
  //    för länge sedan den kördes alls. (a) fångade V-A, men det farligare fallet är att
  //    GitHub-cronen helt enkelt INTE LEVERERAR — #70 mätte att den levererade 40 % av bokad takt.
  //    Då finns ingen körning att sätta en flagga på, och bara ålderskontrollen ser det.
  //
  //    SCHEMAT LÄSES UR REPOT, inte ur en lista här. En hårdkodad lista hade blivit inaktuell i
  //    tysthet — exakt det fel vakten finns för att fånga. Ett nytt schemalagt flöde bevakas
  //    därför automatiskt från första timmen.
  const MATVAKT = "<!-- matvakt -->";
  try {
    const wfs = ((await gh(`/actions/workflows?per_page=100`)).workflows ?? [])
      .filter((w: any) => w.state === "active");
    // Filerna hämtas parallellt: ~20 anrop i ETT varv i stället för i följd (vakthunden har en
    // vägg-klocka att hålla sig inom).
    const filer = await Promise.all(wfs.map((w: any) =>
      gh(`/contents/${w.path}`)
        .then((f: any) => ({ w, yaml: atob(String(f.content).replace(/\n/g, "")) }))
        .catch(() => ({ w, yaml: "" }))));
    const schemalagda = filer
      .map(({ w, yaml }) => ({ w, crons: [...yaml.matchAll(/^\s*-\s*cron:\s*["']([^"']+)["']/gm)].map((m) => m[1]) }))
      .filter((x) => x.crons.length);
    const lagen = await Promise.all(schemalagda.map(async ({ w, crons }) => {
      const timmar = Math.min(...crons.map(kadensTimmar).filter((t): t is number => t !== null));
      const r = ((await gh(`/actions/workflows/${w.id}/runs?per_page=1`)).workflow_runs ?? [])[0];
      return { namn: String(w.name), timmar, r };
    }));
    const sena: string[] = [];
    for (const { namn, timmar, r } of lagen) {
      if (!Number.isFinite(timmar)) { sena.push(`**${namn}**: cron-uttrycket går inte att tolka — kadensen okänd, vakten blind`); continue; }
      if (!r) { sena.push(`**${namn}**: schemalagd men har ALDRIG kört`); continue; }
      const alderH = (Date.now() - new Date(r.created_at).getTime()) / 3600000;
      if (r.conclusion && r.conclusion !== "success" && r.conclusion !== "skipped")
        sena.push(`**${namn}**: senaste körningen ${r.conclusion} (${String(r.created_at).slice(0, 16)})`);
      else if (alderH > timmar * 1.5)
        sena.push(`**${namn}**: ${alderH.toFixed(0)} h sedan senaste körning, kadens ${timmar} h`);
    }
    if (new URL(req.url).searchParams.get("matvaktprov") === "1")
      sena.push("**PROV** — påhittad rad för att bevisa mätvaktens larmväg. Försvinner vid nästa gröna körning.");
    rad.push(`mätvakten: ${schemalagda.length} schemalagda flöden, ${sena.length} med problem`);

    // 6b. VÄXER KÄLLORNA? (kort #106, källkollen 12/9.) Tre tabeller bär varje dom vi ska
    //     fälla i vinter och ingen av dem hade en vakt: radarn är vattenplaningens enda
    //     kvarvarande trigger sedan grind V-A föll (#104), situation_archive är facit för
    //     varenda grind, och shadow_log är skuggans utdata.
    //
    //     EN TABELL SOM SLUTAR VÄXA I DAG SYNS INTE I APPEN FÖRRÄN I MARS, när underlaget
    //     skulle ha dömts. Det är därför den här frågan är en annan än healthcheckens, som
    //     har timmars tidshorisont och frågar om kedjan till appen är hel.
    //
    //     RADARN TESTAS MED KORSKONTROLL, inte med ren färskhet. radar_precip är
    //     händelsefiltrerad (sql/009: rad bara vid regn ≥ 0,1 mm/h), så en tyst tabell kan
    //     betyda rikstorrt väder — en färskhetsvakt hade larmat på solsken. Larmet går därför
    //     bara när radarn tigit MEDAN stationerna rapporterat nederbörd. Det fångar precis den
    //     fara som oroar: ingest.yml kör radar.ts med continue-on-error, så ett stående
    //     SMHI-fel lämnar jobbet grönt och ingen får veta.
    //
    //     polisen_events och smhi_warnings vaktas INTE här med flit: deras luckor är världens,
    //     inte vårt systems. Att ingen viltolycka rapporterats på ett dygn är inte ett fel. Att
    //     INGESTEN slutat hämta är det, och den frågan ställer check 1 via sync_state.
    const alderH = (t: unknown) => t ? (Date.now() - new Date(t as string).getTime()) / 3600000 : null;
    const [sl] = await sql`SELECT max(run_at) t FROM shadow_log`;
    const [sa] = await sql`SELECT max(last_seen) t FROM situation_archive`;
    const [rp] = await sql`SELECT max(observed_at) t FROM radar_precip`;
    const [vatt] = await sql`SELECT count(*)::int AS n FROM weather_observations
      WHERE sample_time > now() - interval '3 hours' AND (rain OR snow OR rain_sum_mm > 0)`;
    // 6c. VÄGLAGSARKIVET (#124, 12/9): samma korskontroll som radarn. En operatörsklassning
    //     står tills den ändras, så ren ålder säger inget — men står arkivet stilla MEDAN
    //     en väsentlig andel stationer ligger under noll är antingen ingesten trasig eller
    //     Trafikverket tyst. Tröskel: ≥ 10 % av stationerna med yta ≤ 0 senaste 3 h (Bengt:
    //     "alla 848 visar minus" inträffar aldrig och skulle aldrig fyra). Tystar INGET.
    const [rc] = await sql`SELECT max(modified_time) t FROM road_conditions WHERE NOT deleted`;
    const [kallt] = await sql`SELECT count(DISTINCT station_id)::int AS n,
        (SELECT count(DISTINCT station_id) FROM weather_observations WHERE sample_time > now() - interval '3 hours')::int AS alla
      FROM weather_observations WHERE sample_time > now() - interval '3 hours' AND surface_temp_c <= 0`;
    const aRc = alderH(rc.t);
    const kallAndel = kallt.alla ? kallt.n / kallt.alla : 0;
    const aSl = alderH(sl.t), aSa = alderH(sa.t), aRp = alderH(rp.t);
    const visa = (a: number | null) => a === null ? "tom" : a < 1 ? `${(a * 60).toFixed(0)} min` : `${a.toFixed(1)} h`;
    rad.push(`källor: skuggloggen ${visa(aSl)} · olycksarkivet ${visa(aSa)} · radarn ${visa(aRp)} (stationsnederbörd 3 h: ${vatt.n}) · väglaget ${visa(aRc)} (kalla stationer 3 h: ${kallt.n}/${kallt.alla})`);

    const torra: string[] = [];
    if (aSl === null || aSl > 2)
      torra.push(`**shadow_log** har inte växt på ${visa(aSl)} (skrivs var 30:e min) — skuggans utdata bär B3, V-B och upprepningen`);
    if (aSa === null || aSa > 3)
      torra.push(`**situation_archive** har inte växt på ${visa(aSa)} (~240 rader/dygn normalt) — facit för varenda grind`);
    if ((aRp === null || aRp > 3) && vatt.n > 0)
      torra.push(`**radar_precip** tyst i ${visa(aRp)} MEDAN ${vatt.n} stationsmätningar visat nederbörd de senaste 3 h — radarsteget i ingest.yml kör med continue-on-error och fäller inte jobbet`);
    if ((aRc === null || aRc > 48) && kallAndel >= 0.10)
      torra.push(`**road_conditions** står stilla sedan ${visa(aRc)} MEDAN ${kallt.n} av ${kallt.alla} stationer (${(kallAndel * 100).toFixed(0)} %) legat på eller under noll de senaste 3 h — operatören borde klassa om; antingen ingest-live:s roadconditions() eller Trafikverket är tyst (#124)`);

    // Egen livscykel, egen etikett. Aldrig problem.push() — se huvudkommentaren.
    const allt = [...sena.map((x) => `- ❌ KÖRNING · ${x}`), ...torra.map((x) => `- ❌ KÄLLA · ${x}`)];
    const mKropp = `${MATVAKT}` + "\n" + `**Mätvakten ${new Date().toISOString()}**` + "\n" + "\n" +
      (allt.length ? allt.join("\n") : "- ✅ alla schemalagda mätningar går och alla källor växer") +
      "\n" + "\n" + `Bevakade flöden: ${schemalagda.map((x) => String(x.w.name)).join(", ")}` +
      "\n" + "\n" + `En mätning som inte gick betyder att en DOM kan vila på gammalt underlag. Kolla vad ` +
      `flödet matar innan du kvitterar — det var så grind V-A låg åtta dygn på tre dygns regn.` +
      "\n" + "\n" + `Och en källa som slutat växa märks inte i appen förrän domen ska fällas i vinter.`;
    const oppnaM = await gh(`/issues?state=open&labels=matvakt`);
    const minM = oppnaM.find((i: any) => (i.body ?? "").includes(MATVAKT));
    if (allt.length) {
      if (minM) await gh(`/issues/${minM.number}/comments`, "POST", { body: mKropp });
      else await gh(`/issues`, "POST", { title: "🔕 Mätvakten: en mätning går inte eller en källa har slutat växa", body: mKropp, labels: ["matvakt"], assignees: ["895845"] });
    } else if (minM) {
      await gh(`/issues/${minM.number}/comments`, "POST", { body: mKropp + "\n" + "\n" + "Stänger — mätningarna går och källorna växer igen." });
      await gh(`/issues/${minM.number}`, "PATCH", { state: "closed" });
    }
  } catch (e) {
    // Tappad signal ÄR ett vakthundsfel: en blind mätvakt är värre än ingen (#76-läxan).
    problem.push(`**Mätvakten (kort #101/#106) kunde inte köras**: ${String(e)}`);
  }

  // 7. LIGGER EN KÄLLÄNDRING OLÄST? (kort #31 + #149, Bengts order 12/9.)
  //
  //    Källvakten skapar ett issue när en källa ändrats, tilldelat Bengt, och GitHub skickar
  //    notisen. Det ÄR hela vägen från källa till människa — och den hade inget golv under sig:
  //    ingenting påminde om ett oläst larm. Uppmätt 12/9: issue #165 (met-api) låg öppet i elva
  //    timmar utan att något höjt rösten, och källvaktens enda schemalagda körning någonsin
  //    (7/9) dog i spending-limit-stoppet utan att någon märkte det på fem dygn.
  //
  //    En larmväg som fungerar EN gång är inte en larmväg. Den här checken är golvet.
  //
  //    DOMEN LÄSES UR RUBRIKEN, som källvakten sätter efter nyhetsbedömningen (#149):
  //      [RÖR OSS]        ⇒ 24 h. Ett beroende vi hämtar från har annonserat något.
  //      [VET INTE]       ⇒ 72 h. Måste läsas av en människa, men brådskar inte lika.
  //      (ingen dom)      ⇒ 72 h. Issues skapade FÖRE #149 bär ingen dom — de är inte vita.
  //      [RÖR OSS INTE]   ⇒ larmar ALDRIG. Bedömningen har redan svarat; att det ligger öppet
  //                          är städning, inte risk. Ett larm som aldrig kan tystna blir
  //                          ignorerat, och då dör de riktiga med det.
  //
  //    Egen etikett, egen livscykel, aldrig problem.push() — samma skäl som mätvakten: rött på
  //    driftvakthunden ska betyda att kedjan till appen är bruten NU. Ett oläst nyhetslarm är
  //    allvarligt, men det är inte det.
  const PAMINNELSE = "<!-- kallvaktspaminnelse -->";
  const FRIST: Record<string, number> = { "RÖR OSS": 24, "VET INTE": 72, "OBEDÖMD": 72 };
  try {
    const nyheter = (await gh(`/issues?state=open&labels=trv-nyhet&per_page=50`))
      .filter((i: any) => !i.pull_request);
    const forsenade: string[] = [];
    for (const i of nyheter) {
      const m = String(i.title).match(/\[(RÖR OSS INTE|RÖR OSS|VET INTE)\]/);
      const dom = m ? m[1] : "OBEDÖMD";
      const frist = FRIST[dom];
      if (frist === undefined) continue;                  // RÖR OSS INTE — se kommentaren ovan
      const alderH = (Date.now() - new Date(i.created_at).getTime()) / 3600000;
      if (alderH <= frist) continue;
      // Bedömningens egna rader ligger i kroppen. Att lyfta dem hit gör påminnelsen läsbar
      // utan att man öppnar issuet — det är skillnaden mellan en notis och en åtgärd.
      const brister = String(i.body ?? "").split("\n").filter((r) => r.includes("**Brister:**")).slice(0, 3);
      forsenade.push(`- ❌ **[${dom}]** #${i.number} öppet i ${(alderH / 24).toFixed(1)} dygn (frist ${frist} h): ${String(i.title).replace(/^[^ ]+ /, "").slice(0, 90)}`
        + (brister.length ? "\n" + brister.map((b) => `  ${b.trim()}`).join("\n") : ""));
    }
    if (new URL(req.url).searchParams.get("paminnelseprov") === "1")
      forsenade.push("- ❌ **PROV** — påhittad rad för att bevisa påminnelsens larmväg. Försvinner vid nästa körning utan prov.");
    rad.push(`källvaktspåminnelsen: ${nyheter.length} öppna källändringar, ${forsenade.length} över frist`);

    const pKropp = `${PAMINNELSE}` + "\n" + `**Källvaktspåminnelsen ${new Date().toISOString()}**` + "\n" + "\n" +
      (forsenade.length ? forsenade.join("\n") : "- ✅ ingen källändring ligger över sin frist") +
      "\n" + "\n" + `Frister: **RÖR OSS 24 h** · **VET INTE 72 h** · obedömda (före #149) 72 h. ` +
      `**RÖR OSS INTE larmar aldrig** — bedömningen har svarat, att det ligger öppet är städning.` +
      "\n" + "\n" + `Stäng nyhetsissuet när du läst det, så stängs den här av sig själv. ` +
      `Kräver posten kod: lägg ett kort på tavlan och skriv kortnumret i nyhetsissuet innan du stänger det.` +
      "\n" + "\n" + `Skälet att den här vakten finns: källvakten hade EN larmväg och inget golv. ` +
      `Issue #165 låg elva timmar utan att något höjt rösten, och den enda schemalagda körningen ` +
      `någonsin föll 7/9 utan att det märktes på fem dygn.`;
    const oppnaP = await gh(`/issues?state=open&labels=kallvaktspaminnelse`);
    const minP = oppnaP.find((i: any) => (i.body ?? "").includes(PAMINNELSE));
    if (forsenade.length) {
      if (minP) await gh(`/issues/${minP.number}/comments`, "POST", { body: pKropp });
      else await gh(`/issues`, "POST", { title: "🔔 Källvakten: en källändring ligger oläst över sin frist", body: pKropp, labels: ["kallvaktspaminnelse"], assignees: ["895845"] });
    } else if (minP) {
      await gh(`/issues/${minP.number}/comments`, "POST", { body: pKropp + "\n" + "\n" + "Stänger — inget ligger över frist längre." });
      await gh(`/issues/${minP.number}`, "PATCH", { state: "closed" });
    }
  } catch (e) {
    // Samma regel som mätvakten: en blind påminnelse är värre än ingen.
    problem.push(`**Källvaktspåminnelsen (kort #31/#149) kunde inte köras**: ${String(e)}`);
  }

  // 8. NÄRMAR VI OSS ACTIONS-TAKET? (kort #152, Bengts order 13/9: "Kan man ha någon mätning
  //    på taket så man vet när man närmar sig gränsen. Automatisk alltså".)
  //
  //    BAKGRUNDEN: 5/9 tog minuterna slut mitt i drift. Pipelinen stannade, appen serverade
  //    66 timmar gammal data, och det upptäcktes bara för att en människa råkade titta. Taket
  //    har HÅRT STOPP (Axels 35 USD, DECISIONS #81/#82) — det är inte en långsam försämring
  //    utan en vägg. 12/9 mättes takten till 202 min/dygn, vilket pekar mot 31–40 USD till 1/10.
  //
  //    VARFÖR VI RÄKNAR SJÄLVA i stället för att läsa fakturan: Billing-API:t kräver en nyckel
  //    med KONTObehörighet och PUBLISH_TOKEN har bara repo-behörigheter. Att skaffa den nyckeln
  //    är Axels handgrepp; den här vakten är byggd för att fungera utan den. Priset är två fel
  //    som vi känner till och därför skriver ut i varje larm i stället för att dölja:
  //      · TAKET ÄR KONTOOMFATTANDE, vi ser ETT repo. Bränner ett annat repo under samma konto
  //        minuter räknar vi för lågt. Vår siffra är ett GOLV för förbrukningen, aldrig ett facit.
  //      · GitHub avrundar per JOBB, vi per KÖRNING. Alla våra flöden har ett jobb utom
  //        android.yml som har två — där räknar vi en minut för lite per körning.
  //    Ett golv duger för frågan som ställdes, nämligen "närmar vi oss".
  //
  //    GRATISPOTTEN DRAS BORT FÖRST, och det är den lätta att missa: 2 000 minuter ingår per
  //    månad och nollställs den 1:a. En räknare som glömmer det rapporterar tjugo dollar den
  //    1 oktober när verkligheten är noll.
  //
  //    DET ANVÄNDBARA TALET ÄR PROGNOSEN, inte procenten. "I dagens takt slår taket i den 27:e"
  //    går att agera på; "62 % förbrukat" gör det inte.
  //
  //    TVÅ TAKTER, OCH BÅDA STÅR I LARMET (Bengts order 13/9). Förbrukningen läses ur
  //    månad-till-datum; PROGNOSEN räknas på en SLÄPANDE takt över de två senaste kompletta
  //    dygnen. Skälet är mätt och inte teoretiskt: 13/9 sa månadssnittet 311 min/dygn och pekade
  //    på 21 september, men i snittet låg fem flöden som slutade köra vid konsolideringen 8–9/9
  //    (ingest-fi, -no, -dk, publish-map, regn-30 — kort #53/#79/#85). Senaste dygnet var 232 och
  //    de två senaste 180. Ett snitt som räknar in nedlagda flöden svarar på fel fråga.
  //    Priset åt andra hållet: den släpande takten är känslig för en enskild byggskur. Därför
  //    skrivs BÅDA ut, och avviker de mer än 25 % säger larmet uttryckligen att marken rör sig.
  //
  //    KÖRS FYRA GÅNGER PER DYGN, inte varje timme: en räkning är ~30 API-anrop och budgeten
  //    rör sig 1–2 USD per dygn. Att lösa ett slöserifel med slöseri vore fel medicin.
  //
  //    FÄRGAR ALDRIG DRIFTVAKTHUNDEN RÖD — samma regel och samma skäl som mätvakten: rött ska
  //    betyda "kedjan till appen är bruten NU". Ett tak vi når om nio dygn är inte det, och låg
  //    det i samma issue skulle det hålla vakthunden röd i en vecka och dränka ett driftlarm.
  const KASSA = "<!-- kassavakt -->";
  const TAK_USD = 35;          // Axels spending limit (DECISIONS #81/#82) — hårt stopp vid gränsen
  const PRIS_PER_MIN = 0.008;  // USD, standard 2-core Linux
  const GRATIS_MIN = 2000;     // ingår per månad, nollställs den 1:a
  const LARM_ANDEL = 0.70;     // larma när FAKTISK förbrukning passerat denna andel av taket
  const SIDTAK = 10;           // max 10 sidor à 100 körningar PER DYGN — GitHub paginerar ändå bara till 1 000
  try {
    const nu = new Date();
    const kassaprov = new URL(req.url).searchParams.get("kassaprov") === "1";
    if (nu.getUTCHours() % 6 !== 5 && !kassaprov) {
      rad.push(`kassan: räknas 05/11/17/23 UTC (nu ${String(nu.getUTCHours()).padStart(2, "0")})`);
    } else {
      const start = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth(), 1));
      const sedan = start.toISOString().slice(0, 10);
      // ETT DYGN I TAGET, inte hela månaden på en gång. GitHubs runs-endpoint paginerar bara
      // fram till 1 000 träffar och säger det inte: första bygget 13/9 räknade exakt 1 000
      // körningar, rapporterade 94 min/dygn och såg fullt rimligt ut — mot 202 som mätts
      // oberoende samma dygn. En vakt som tyst halverar sitt eget tal är värre än ingen vakt,
      // för den ger lugn på fel grund. Ett dygn rymmer långt under 1 000 körningar, och
      // dygnsvakten nedan larmar ändå om något dygn skulle slå i taket.
      let minuter = 0, korningar = 0, avkortad = false;
      // Dygnssummorna sparas medan vi ändå går igenom dygnen — den släpande takten nedan
      // kostar därför INGA extra API-anrop.
      const perDag = new Map<string, number>();
      for (let d = new Date(start); d <= nu; d.setUTCDate(d.getUTCDate() + 1)) {
        const dag = d.toISOString().slice(0, 10);
        let dagMin = 0;
        for (let sida = 1; sida <= SIDTAK; sida++) {
          const k = ((await gh(`/actions/runs?per_page=100&page=${sida}&created=${dag}`)).workflow_runs ?? []);
          for (const r of k) {
            // Pågående körningar räknas nästa varv — en halvfärdig körning har ingen sluttid.
            if (r.status !== "completed" || !r.run_started_at) continue;
            const sek = (new Date(r.updated_at).getTime() - new Date(r.run_started_at).getTime()) / 1000;
            dagMin += Math.max(1, Math.ceil(sek / 60));
            korningar++;
          }
          if (k.length < 100) break;
          if (sida === SIDTAK) avkortad = true;   // ett dygn med > 1 000 körningar: säg det
        }
        perDag.set(dag, dagMin);
        minuter += dagMin;
      }
      const debiterat = Math.max(0, minuter - GRATIS_MIN);
      const kostnad = debiterat * PRIS_PER_MIN;
      const dygnIn = Math.max(1 / 24, (nu.getTime() - start.getTime()) / 86400000);
      const takt = minuter / dygnIn;
      const dygnIManaden = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth() + 1, 0)).getUTCDate();

      // SLÄPANDE TAKT (Bengts order 13/9, kort #152). Månadssnittet är rätt för frågan "vad har
      // vi förbrukat" men FEL för frågan "när tar det slut", eftersom det låser fast en takt som
      // kan ha upphört att gälla. Mätt 13/9: snittet sa 311 min/dygn och pekade på 21 september,
      // men i det snittet låg fem flöden som slutade köra 8–9/9 vid konsolideringen (ingest-fi,
      // ingest-no, ingest-dk, publish-map, regn-30, kort #53/#79/#85). Senaste dygnet var 232 och
      // de två senaste 180 — skillnaden mellan "agera i dag" och "vi har en vecka till".
      //
      // TVÅ KOMPLETTA DYGN, inte ett: ett enda dygn domineras av en byggskur. Och inte det
      // pågående dygnet, som alltid är delvis och därför räknar för lågt.
      // FALLBACK till månadssnittet den 1:a och 2:a, när inget komplett dygn finns än.
      const idag = nu.toISOString().slice(0, 10);
      const kompletta = [...perDag.keys()].filter((d) => d < idag).sort().slice(-2);
      const slapande = kompletta.length
        ? kompletta.reduce((s, d) => s + (perDag.get(d) ?? 0), 0) / kompletta.length : takt;
      // Avviker takterna mycket står marken och gungar under prognosen, och då ska det SÄGAS
      // i stället för att en av siffrorna tyst vinner.
      const gungar = takt > 0 && Math.abs(slapande - takt) / takt > 0.25;

      // PROGNOSEN RÄKNAS PÅ DEN SLÄPANDE TAKTEN, och räknas framåt FRÅN NU i stället för från
      // månadens början — samma tal när takten är konstant, men rätt när den inte är det.
      const prognosUsd = Math.max(0, minuter + slapande * (dygnIManaden - dygnIn) - GRATIS_MIN) * PRIS_PER_MIN;
      const takMin = GRATIS_MIN + TAK_USD / PRIS_PER_MIN;
      const dygnTillTak = slapande > 0 ? (takMin - minuter) / slapande : Infinity;
      const takDatum = dygnTillTak >= 0 && dygnIn + dygnTillTak <= dygnIManaden
        ? new Date(nu.getTime() + dygnTillTak * 86400000).toISOString().slice(0, 10) : null;
      rad.push(`kassan: ${minuter} min sedan ${sedan} (${korningar} körningar) · debiterat ${debiterat} min ` +
        `= ${kostnad.toFixed(2)} av ${TAK_USD} USD · takt ${takt.toFixed(0)} månad / ${slapande.toFixed(0)} släpande ` +
        `min per dygn · prognos ${prognosUsd.toFixed(0)} USD` +
        `${takDatum ? ` · TAKET SLÅR I ${takDatum}` : ""}${gungar ? " · TAKTEN ÄNDRAS" : ""}${avkortad ? " · AVKORTAD" : ""}`);

      const skal: string[] = [];
      if (kostnad >= TAK_USD * LARM_ANDEL)
        skal.push(`**${((kostnad / TAK_USD) * 100).toFixed(0)} % av taket förbrukat** — ${kostnad.toFixed(2)} av ${TAK_USD} USD.`);
      if (takDatum)
        skal.push(`**I den släpande takten (${slapande.toFixed(0)} min/dygn, snitt över ${kompletta.length || "—"} kompletta dygn) ` +
          `slår taket i den ${takDatum}**, alltså före månadsskiftet.`);
      if (gungar)
        skal.push(`**Takten ändras:** släpande ${slapande.toFixed(0)} mot månadssnittet ${takt.toFixed(0)} min/dygn. ` +
          `Prognosen räknas på den släpande — men den vilar alltså på mark som rör sig, och en byggskur ` +
          `eller ett nedlagt flöde slår igenom direkt. Läs båda talen innan du agerar på datumet.`);
      if (avkortad)
        skal.push(`Ett dygn hade fler än ${SIDTAK * 100} körningar och räkningen avkortades — talet är för lågt även för det här repot.`);
      if (kassaprov)
        skal.push("**PROV** — påhittad rad för att bevisa kassavaktens larmväg. Försvinner vid nästa körning under gränsen.");

      const kKropp = `${KASSA}` + "\n" + `**Kassavakten ${new Date().toISOString()}**` + "\n" + "\n" +
        (skal.length ? skal.map((s) => `- ⚠️ ${s}`).join("\n") : "- ✅ god marginal till taket") + "\n" + "\n" +
        `Förbrukat sedan ${sedan}: **${minuter} min** över ${korningar} körningar. Gratispotten ${GRATIS_MIN} min ` +
        `dras bort först ⇒ debiterat **${debiterat} min = ${kostnad.toFixed(2)} USD** av taket ${TAK_USD}. ` +
        `Takt: **${takt.toFixed(0)} min/dygn** månad-till-datum, **${slapande.toFixed(0)} min/dygn** släpande ` +
        `(${kompletta.length} kompletta dygn). Prognos för månaden **${prognosUsd.toFixed(0)} USD**.` + "\n" + "\n" +
        `**Förbrukningen läses ur månadstalet, prognosen ur det släpande.** Månadssnittet låser fast ` +
        `en takt som kan ha upphört att gälla — 13/9 innehöll det fem flöden som lades ner 8–9/9 och ` +
        `pekade därför nio dygn fel. Det släpande talet är i gengäld känsligt för en enskild byggskur. ` +
        `Båda står här med flit; ingen av dem är sann ensam.` + "\n" + "\n" +
        `Slår taket i blir det HÅRT STOPP: grannar, ingest och healthcheck tystnar som 5/9. ` +
        `Livemotorn i Supabase påverkas inte — den kostar inga Actions-minuter.` + "\n" + "\n" +
        `**Talet är ett GOLV, inte fakturan.** Taket är kontoomfattande men vi ser bara ${REPO}; ` +
        `och GitHub avrundar per jobb medan vi avrundar per körning (android.yml har två jobb). ` +
        `Den exakta siffran kräver en nyckel med kontobehörighet och ligger hos Axel.`;
      const oppnaK = await gh(`/issues?state=open&labels=kassavakt`);
      const minK = oppnaK.find((i: any) => (i.body ?? "").includes(KASSA));
      if (skal.length) {
        if (minK) await gh(`/issues/${minK.number}/comments`, "POST", { body: kKropp });
        else await gh(`/issues`, "POST", { title: "💸 Kassavakten: Actions-taket närmar sig", body: kKropp, labels: ["kassavakt"] });
      } else if (minK) {
        await gh(`/issues/${minK.number}/comments`, "POST", { body: kKropp + "\n" + "\n" + "Stänger — god marginal igen." });
        await gh(`/issues/${minK.number}`, "PATCH", { state: "closed" });
      }
    }
  } catch (e) {
    // Samma regel som mätvakten och påminnelsen: en blind vakt är värre än ingen.
    problem.push(`**Kassavakten (kort #152) kunde inte köras**: ${String(e)}`);
  }

  // 9. HEALTHCHECKENS KONTROLLER (kort #87, Bengts order 14/9).
  //
  //    VARFÖR: `healthcheck.yml` kostar 12 Actions-minuter per dygn — 360 i månaden, vilket
  //    kassavakten (check 8) räknar mot ett tak som slår i slutet av september. Allt den gör är
  //    SQL eller en GET, och inget av det kräver Actions. Här kostar det noll.
  //
  //    KORTET SA FEM KONTROLLER. FILEN INNEHÅLLER TIO, och det upptäcktes när de skulle flyttas.
  //    Hade bara de fem porterats och healthcheck.yml sedan raderats hade fem kontroller
  //    försvunnit TYST — precis den sortens fel huset redan betalat för flera gånger. Därför
  //    flyttas alla tio, och kortets lista rättas i samma varv.
  //
  //    DE HÖR TILL DEN OPERATIVA VAKTEN, inte till en egen etikett som 6/7/8. Skälet: de mäter
  //    om kedjan är trasig här och nu — ett arkiv som står stilla, en gränssnapshot som tunnats
  //    ut, en kartfil som frusit. Det är samma sorts fel som check 1–3, och en trasig kedja ska
  //    inte behöva två ställen att synas på.
  //
  //    HEALTHCHECK.YML RADERAS INTE HÄR. Kortets Verify kräver en vecka där vakthunden larmat på
  //    ett FRAMKALLAT fel i var och en — `?larmprov` räcker inte. Tills dess kör båda parallellt,
  //    och kontraktsgrinden vaktar att trösklarna är identiska i de två implementationerna.
  try {
    const KARTA = "https://axelstar.github.io/halkvakt-karta/data";

    // 9a. Grannländernas skuggarkiv (kort #48). Schema-vaktat: CI:s PostGIS saknar fi/dk/no.
    for (const land of ["fi", "dk", "no"]) {
      try {
        const r = await sql.unsafe(`SELECT synced_at FROM ${land}.sync_state ORDER BY synced_at DESC LIMIT 1`);
        if (!r.length) continue;
        const min = (Date.now() - new Date(r[0].synced_at).getTime()) / 60000;
        rad.push(`${land}-arkivet: ${min.toFixed(0)} min (gräns 120)`);
        if (min > 120) problem.push(`**${land}-arkivet står stilla**: ${min.toFixed(0)} min sedan synk (gräns 120) — ingest-${land}?`);
      } catch { rad.push(`${land}-arkivet: schemat saknas — hoppar`); }
    }

    // 9b. Gränssnapshoten (kort #49). Golven är MÄTTA, inte valda: FI 16–20, NO 42 vid mätningen.
    for (const [land, golv] of [["fi", 10], ["no", 20]] as [string, number][]) {
      try {
        const r = await sql.unsafe(`
          WITH se AS (SELECT ST_Collect(geom) g FROM road_conditions WHERE NOT deleted AND geom IS NOT NULL)
          SELECT count(*)::int AS n FROM ${land}.weather_latest f, se
          WHERE f.sample_time > now() - interval '3 hours'
            AND ST_DWithin(f.geom::geography, se.g::geography, 40000)`);
        const n = Number(r[0].n);
        rad.push(`gräns-wx ${land.toUpperCase()}: ${n} nåbara inom 40 km (golv ${golv})`);
        if (n < golv) problem.push(`**Gränssnapshoten tunn**: bara ${n} ${land.toUpperCase()}-stationer nåbara (golv ${golv}) — ${land}-ingest eller gränslogiken?`);
      } catch { rad.push(`gräns-wx ${land}: schemat saknas — hoppar`); }
    }

    // 9c. De VILANDE källorna. Check 1 ovan ger dem ingen gräns alls ("GitHub-flödet, vilar") —
    //     healthchecken hade 150 min, och utan den raden kan en kamerakursor frysa osett.
    const kallor = await sql`SELECT source, synced_at FROM sync_state ORDER BY source`;
    if (kallor.length < 4) problem.push(`**sync_state har ${kallor.length} av 4 källor** — en kursor har fallit bort`);
    for (const r of kallor) {
      if (["deviations", "road_conditions", "weather"].includes(r.source)) continue;   // hårda i check 1
      const min = (Date.now() - new Date(r.synced_at).getTime()) / 60000;
      rad.push(`${r.source}: ${min.toFixed(0)} min (mjuk gräns 150)`);
      if (min > 150) problem.push(`**${r.source} står stilla**: ${min.toFixed(0)} min (gräns 150)`);
    }

    // 9d. Livemotorns egen cron-puls. Tål att job_run_details inte är läsbar.
    try {
      const c = await sql`SELECT status, end_time FROM cron.job_run_details
        WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'halkvakt-ingest-live')
        ORDER BY end_time DESC LIMIT 1`;
      if (c.length) {
        rad.push(`livemotorns cron: ${c[0].status}`);
        if (c[0].status === "failed") problem.push(`**Livemotorns senaste cron-körning FAILED** @ ${c[0].end_time}`);
      }
    } catch { rad.push("livemotorns cron: job_run_details ej läsbar — hoppar"); }

    // 9e. Fältgolvet (kort #48). EXISTS-vaktat: larma aldrig på ett fält som aldrig funnits —
    //     en fail-soft-gren för något ofött är ett tyst ALDRIG åt andra hållet.
    try {
      const [f] = await sql`SELECT
        (SELECT count(*) FROM weather_latest WHERE wind_speed_ms IS NOT NULL)::int AS vind_nu,
        (SELECT EXISTS (SELECT 1 FROM weather_observations WHERE wind_speed_ms IS NOT NULL)) AS vind_fott,
        (SELECT count(*) FROM weather_latest WHERE visibility_m IS NOT NULL)::int AS sikt_nu,
        (SELECT EXISTS (SELECT 1 FROM weather_observations WHERE visibility_m IS NOT NULL)) AS sikt_fott`;
      rad.push(`fältgolv: vind ${f.vind_nu} (golv 100), sikt ${f.sikt_nu} (golv 30)`);
      if (f.vind_fott && Number(f.vind_nu) < 100) problem.push(`**Vindfältet dött**: ${f.vind_nu} stationer (golv 100) trots tidigare skörd`);
      if (f.sikt_fott && Number(f.sikt_nu) < 30) problem.push(`**Siktfältet dött**: ${f.sikt_nu} stationer (golv 30) trots tidigare skörd`);
    } catch { rad.push("fältgolv: kolumnerna inte födda — hoppar"); }

    // 9f. Arkivvakten (kort #51, DECISIONS #71). Frågar inte "växte arkivet" — i september är
    //     tystnad korrekt. Frågar: finns ett NUVARANDE tillstånd som borde hunnit arkiveras?
    //     Ingesten går varje timme, så 3 h betyder tre passerade körningar: förlorat, inte försenat.
    try {
      const [a] = await sql`SELECT
        (SELECT count(*) FROM road_conditions c
           WHERE NOT c.deleted AND c.modified_time IS NOT NULL
             AND c.modified_time < now() - interval '3 hours'
             AND NOT EXISTS (SELECT 1 FROM road_condition_history h
                             WHERE h.segment_id = c.segment_id AND h.modified_time = c.modified_time))::int AS saknade,
        (SELECT count(*) FROM road_conditions WHERE NOT deleted AND modified_time IS NOT NULL
           AND modified_time < now() - interval '3 hours')::int AS provade`;
      rad.push(`arkivvakt: ${a.saknade} oarkiverade av ${a.provade} prövade (>3 h)`);
      if (Number(a.saknade) > 0) problem.push(`**Arkivläcka**: ${a.saknade} nuvarande tillstånd saknas i road_condition_history trots >3 h — vinterarkivet tappar rader (kort #51)`);
    } catch { rad.push("arkivvakt: road_condition_history saknas — hoppar"); }

    // 9g. Räknarna: en halv synk ser inte trasig ut, den ser bara mindre ut.
    const [n] = await sql`SELECT
      (SELECT count(*) FROM cameras WHERE NOT deleted)::int AS kameror,
      (SELECT count(*) FROM road_conditions WHERE NOT deleted)::int AS segment`;
    rad.push(`räknare: ${n.kameror} kameror (golv 2000), ${n.segment} segment (golv 400)`);
    if (Number(n.kameror) < 2000) problem.push(`**Kamerorna tunnats ut**: ${n.kameror} (golv 2000) — trasig synk?`);
    if (Number(n.segment) < 400) problem.push(`**Segmenten tunnats ut**: ${n.segment} (golv 400) — trasig synk?`);

    // 9h. Kartans meta.json. Check 3 mäter APPENS manifest; det här är kartsajten, en annan fil
    //     med en annan publiceringsväg. Att de båda är "publicera" gör dem inte till samma led.
    try {
      const m = await (await fetch(`${KARTA}/meta.json?t=${Date.now()}`, { cache: "no-store" })).json();
      const min = (Date.now() - new Date(m.generated_at).getTime()) / 60000;
      rad.push(`kartans meta.json: ${min.toFixed(0)} min (gräns 90)`);
      if (min > 90) problem.push(`**Kartans meta.json ${min.toFixed(0)} min gammal** (gräns 90) — publicera står stilla?`);
    } catch (e) { problem.push(`**Kunde inte läsa kartans meta.json**: ${String(e)}`); }

    // 9i. Kameralagret (#38b). Publiceringen är fail-soft, så ett permanent TRV-fel lämnar annars
    //     en gammal fil kvar på CDN i tysthet — exakt kameror-vaglag-läxan. Gränsen är generös
    //     med flit: kamerorna ändras sällan, vakten är mot "trasigt för evigt".
    try {
      const k = await (await fetch(`${KARTA}/kameror-vaglag.geojson?t=${Date.now()}`, { cache: "no-store" })).json();
      const antal = k?.features?.length ?? 0;
      const dygn = k?.generated_at ? (Date.now() - new Date(k.generated_at).getTime()) / 86_400_000 : null;
      rad.push(`kameror-vaglag: ${antal} st (golv 500)${dygn === null ? ", ingen stämpel" : `, ${dygn.toFixed(1)} dygn (gräns 7)`}`);
      if (antal < 500) problem.push(`**Kameralagret tunt**: ${antal} kameror (golv 500)`);
      if (dygn !== null && dygn > 7) problem.push(`**Kameralagret ${dygn.toFixed(1)} dygn gammalt** (gräns 7) — TRV-steget i publiceringen fallerar permanent?`);
    } catch (e) { problem.push(`**Kunde inte läsa kameror-vaglag.geojson**: ${String(e)}`); }
  } catch (e) {
    // Samma regel som de andra: en blind vakt är värre än ingen.
    problem.push(`**Healthcheckens kontroller (kort #87) kunde inte köras**: ${String(e)}`);
  }

  // 10. NYCKELKALENDERN (kort #86, bedömning v3 N3 — Bengts order 15/9).
  //     Två nycklar går ut mitt i säsongen, och båda dör TYST: publicera får 401 ⇒ CDN fryser ⇒
  //     appens åldersspärr tystnar vakten (5/9-läget), och den här vakthundens larmväg går på samma
  //     PAT. Därför läses PAT:ens utgång LIVE ur GitHubs svarshuvud
  //     (github-authentication-token-expiration): roterar Axel nyckeln flyttas datumet av sig självt,
  //     och en rotation som INTE nått Supabase-hemligheten syns som ett datum som inte flyttat sig.
  //     Supabase-tokenen (deploy-knappen) har inget sådant huvud och bär sitt datum här.
  //     Egen etikett, egen cykel, aldrig problem.push() — samma regel som mätvakten. Issuen skrivs
  //     en gång om dygnet (06 UTC), inte varje timme: ett datum ändras inte på en timme.
  //     Varsel 14 dygn: rotationsläxan (CLAUDE.md) kräver ett BEVIS efter bytet, och det tar dagar
  //     att få en publicering, en deploy och ett larm igenom med den nya nyckeln. Prov: ?nyckelprov=1
  const NYCKEL_VARSEL_DYGN = 14;
  const SUPABASE_TOKEN_UTGAR = "2026-12-08";   // GitHub Secret SUPABASE_ACCESS_TOKEN — flyttas när den roterats
  try {
    const nyckelprov = new URL(req.url).searchParams.get("nyckelprov") === "1";
    const svar = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
    await svar.text();   // kroppen används inte, men lämnas inte oläst
    const pat = (svar.headers.get("github-authentication-token-expiration") ?? "").match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
    const nycklar = [
      { namn: "PAT (publicera + vakthundens larmväg)", datum: pat },
      { namn: "Supabase-token (deploy-knappen)", datum: SUPABASE_TOKEN_UTGAR },
    ];
    const sena: string[] = [];
    const rader: string[] = [];
    for (const n of nycklar) {
      if (!n.datum) { rad.push(`nyckel ${n.namn}: utgång okänd (inget svarshuvud)`); rader.push(`- ${n.namn}: GitHub gav inget utgångsdatum — läs det i Settings`); continue; }
      const dygn = Math.floor((new Date(n.datum).getTime() - Date.now()) / 86_400_000);
      rad.push(`nyckel ${n.namn}: går ut ${n.datum} (${dygn} dygn, varsel ${NYCKEL_VARSEL_DYGN})`);
      rader.push(`- ${n.namn}: går ut **${n.datum}** (${dygn} dygn)`);
      if (dygn <= NYCKEL_VARSEL_DYGN) sena.push(`- ❌ **${n.namn} går ut ${n.datum} — om ${dygn} dygn.** Rotera nu; bytt är den först när en publicering gått igenom med den.`);
    }
    if (nyckelprov) sena.push("- ❌ **PROV** — påhittad rad för att bevisa nyckelkalenderns larmväg. Försvinner vid nästa 06 UTC-körning utan prov.");
    const nuN = new Date();
    if (nyckelprov || nuN.getUTCHours() === 6) {
      const nKropp = `<!-- nyckelkalender -->\n**Nyckelkalendern ${nuN.toISOString()}**\n\n` +
        (sena.length ? sena.join("\n") : "- ✅ ingen nyckel inom varsel") + `\n\n${rader.join("\n")}\n\n` +
        `Varsel ${NYCKEL_VARSEL_DYGN} dygn. PAT:ens datum läses ur GitHubs svarshuvud vid varje körning; Supabase-tokenens står i vakthundens kod (kort #86).`;
      const oppnaN = await gh(`/issues?state=open&labels=nyckelkalender`);
      const minN = oppnaN.find((i: any) => (i.body ?? "").includes("<!-- nyckelkalender -->"));
      if (sena.length) {
        if (minN) await gh(`/issues/${minN.number}/comments`, "POST", { body: nKropp });
        else await gh(`/issues`, "POST", { title: `🔑 Nyckelkalendern: en nyckel går ut inom ${NYCKEL_VARSEL_DYGN} dygn — rotera och bevisa (kort #86)`, body: nKropp, labels: ["nyckelkalender"], assignees: ["895845"] });
      } else if (minN) {
        await gh(`/issues/${minN.number}/comments`, "POST", { body: nKropp + "\n" + "\n" + "Stänger — ingen nyckel inom varsel." });
        await gh(`/issues/${minN.number}`, "PATCH", { state: "closed" });
      }
    }
  } catch (e) {
    problem.push(`**Nyckelkalendern (kort #86) kunde inte köras**: ${String(e)}`);
  }

  const kropp = `${MARK}\n**Kontroll ${new Date().toISOString()}**\n\n` +
    (problem.length ? problem.map((p) => `- ❌ ${p}`).join("\n") : "- ✅ allt grönt") +
    `\n\n<details><summary>mätvärden</summary>\n\n\`\`\`\n${rad.join("\n")}\n\`\`\`\n</details>`;

  // Larmvägen får ALDRIG fälla vakthunden. 8/9: PAT:en saknade Issues:Write, så första
  // larmprovet gav 500 i stället för ett larm — en vakthund som bara klarar av att säga
  // "allt bra" är värdelös. Nu fångas felet och rapporteras i svaret, så pulsen ser det.
  let larmvag = "ok";
  try {
    const öppna = await gh(`/issues?state=open&labels=vakthund`);
    const min = öppna.find((i: any) => (i.body ?? "").includes(MARK));
    if (problem.length) {
      if (min) await gh(`/issues/${min.number}/comments`, "POST", { body: kropp });
      else await gh(`/issues`, "POST", { title: "🔴 Vakthunden: kedjan är bruten", body: kropp, labels: ["vakthund"] });
    } else if (min) {
      await gh(`/issues/${min.number}/comments`, "POST", { body: `${kropp}\n\nStänger — allt grönt igen.` });
      await gh(`/issues/${min.number}`, "PATCH", { state: "closed" });
    }
  } catch (e) {
    larmvag = `TRASIG: ${String(e)}`;
  }
  return new Response(JSON.stringify({ ok: problem.length === 0 && larmvag === "ok", problem, larmvag, rad }),
    { headers: { "Content-Type": "application/json" } });
});
