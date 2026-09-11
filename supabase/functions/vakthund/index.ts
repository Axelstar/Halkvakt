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
            `**Kolla #88 i samma varv:** grind T-A (trendkolumnen) väntar på exakt samma frostnätter och ` +
            `kan lika lite ta dem ikapp.\n\n` +
            `Bakgrund: #127, \`docs/OVERGANGAR-ANALYS.md\` §9, DECISIONS #96 och #97, kort #89.\n\n` +
            `Engångslarm: den här issuen skapas aldrig igen, öppen eller stängd.`,
        });
      }
    }
  } catch (e) {
    // Tappad signal ÄR ett vakthundsfel: frosten kommer en gång per år och kan inte tas om.
    problem.push(`**Frostvakten (kort #89) kunde inte larma**: ${String(e)}`);
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
