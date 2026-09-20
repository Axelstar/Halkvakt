// Kontraktsgrinden (Bengts order 12/9): bär de upprepade kontrakten samma värde överallt?
//
// PROBLEMET. Ett tröskelvärde som står på ETT ställe kan ändras. Ett som står på SJUTTON
// kan ändras på sexton. #75:s givarvakt — "yttemperaturen får inte ligga mer än 12 grader
// under lufttemperaturen" — är kopierad ordagrant till tolv filer, utan någon vakt alls.
// Ändras 12 till 10 i en av dem mäter grindarna olika populationer TYST: samma arkiv,
// olika svar, ingen som märker det. Samma sak gäller fuktdefinitionen, som dessutom lever
// i två språk — en TypeScript-mängd och en SQL-lista som måste bära samma ord.
//
// Det är ingen hypotes. CLAUDE.md:s TradingOS-avsnitt beskriver exakt den här fällan två
// gånger: en tröskeländring följdes inte av en fullständig grep, och FEM ytterligare
// ställen hittades först veckor senare. Skillnaden här är att varje kopia sitter i en
// mätning som lämnar en DOM. En drivande kopia förfalskar domen, inte bara en siffra.
//
// VAD GRINDEN GÖR. Den läser, den skriver ingenting. För varje deklarerat kontrakt letar
// den upp varje förekomst av en FORM (t.ex. "surface_temp_c >= air_temp_c - <tal>"),
// plockar ut VÄRDET ur fångstgruppen, och fäller om förekomsterna inte bär samma värde.
// Den fäller också om antalet kopior sjunkit under det uppmätta golvet — en kopia som
// TYST försvinner är lika farlig som en som tyst ändras.
//
// VAD DEN INTE GÖR, och det ska läsas innan någon litar på den:
//  · Den kan ingenting om semantik. Att tolv filer skriver samma tal betyder inte att de
//    menar samma sak — bara att talet är ett.
//  · Den ser bara det som deklarerats här. Ett nytt kontrakt vaktas först när någon för in
//    det. Grinden är ett skyddsnät MELLAN ändringstillfällena, inte en ersättning för en
//    fullständig grep när en tröskel faktiskt ändras.
//  · Den matchar per RAD. Bryts en form över flera rader slutar den matcha — då sjunker
//    antalet under golvet och grinden fäller, högljutt istället för tyst. Det är avsiktligt.
//
// TVÅ AVSIKTLIGA OLIKHETER som grinden inte ska "laga", och som står här för att de annars
// glöms bort:
//  1. NOLLPOLITIKEN kring #75 skiljer sig mellan motorn och grindarna. publish/snapshot-core.ts
//     och publicera skriver "(air_temp_c IS NULL OR surface_temp_c >= air_temp_c - 12)" —
//     rader utan lufttemperatur SLÄPPS IGENOM. Grindarna kräver "air_temp_c IS NOT NULL AND
//     ...". Motorn publicerar alltså en något större population än grindarna mäter. Talet 12
//     är kontraktet; nollpolitiken är ett medvetet val på varje sida och vaktas inte här.
//  2. MIN_SHARED vaktas INTE. scripts/cell-matning.ts kör 10 där grind A kör 20, och det är
//     rätt — cellmätningen räknar delade buckets per par i ett annat syfte än leave-one-out.
//     anomalin.ts och grind-k-a.ts vaktar redan sina egna mot grind A:s källa direkt.
//     Ett kontrakt med en legitim avvikare är inget kontrakt, och att låtsas annat vore att
//     bygga en vakt som ropar varg.
//
// Kör: node --experimental-strip-types scripts/kontraktsgrinden.ts
// Självtest mot känd sanning: scripts/kontraktsgrinden.ts --sjalvtest

export type Kontrakt = {
  namn: string;
  varfor: string;      // varför drift just här är farligt — en rad, för CI-loggens läsare
  former: RegExp[];    // varje form har EXAKT en fångstgrupp: värdet som inte får driva
  golv: number;        // uppmätt antal i dag; färre = en kopia har försvunnit
  lista?: boolean;     // värdet är en ordlista (normaliseras sorterad och gemen)
  filer?: RegExp;      // begränsa till filer vars sökväg matchar — se nedan

  // VARFÖR `filer` FINNS (tillagd 14/9, kort #156). Samma ordlista kan stå på flera ställen och
  // ändå svara på OLIKA frågor. Halkorden är exemplet: motorn frågar "vad får oss att tala",
  // snapshoten "vad får nå motorn", vakthunden "har vintern börjat synas", kodgrinden "kod 1
  // tillsammans med farlighetsord". Tre av de fyra listorna SKA skilja sig, och ett kontrakt som
  // buntar ihop dem hade tvingat fram en falsk enighet — eller, värre, sett grönt ut ända tills
  // någon rättade den ena och då fällt på fel grund.
  //
  // Utan avgränsningen går de inte att skilja, eftersom raderna ser likadana ut. MED den blir
  // varje fråga ett eget namngivet kontrakt, och skillnaden står som ett BESLUT i stället för
  // som slarv — precis vad grindens egen feltext föreskriver.
};

export type Fynd = { fil: string; rad: number; varde: string; utdrag: string };
export type Utfall = { k: Kontrakt; fynd: Fynd[]; varden: Map<string, Fynd[]>; brott: string[] };

// En ordlista jämförs som MÄNGD, inte som text: ["no","dry"] och ('dry','no') är samma
// kontrakt. Det är hela poängen med att vakta över språkgränsen.
export function normalisera(v: string, lista?: boolean): string {
  if (!lista) return v.trim();
  return (v.match(/['"]([^'"]*)['"]/g) ?? []).map((o) => o.slice(1, -1).toLowerCase()).sort().join("|");
}

export function granska(kontrakt: Kontrakt[], filer: { fil: string; text: string }[]): Utfall[] {
  return kontrakt.map((k) => {
    const fynd: Fynd[] = [];
    for (const f of filer) {
      if (k.filer && !k.filer.test(f.fil)) continue;
      const rader = f.text.split("\n");
      for (let i = 0; i < rader.length; i++) {
        for (const form of k.former) {
          const re = new RegExp(form.source, form.flags.includes("g") ? form.flags : form.flags + "g");
          let m: RegExpExecArray | null;
          while ((m = re.exec(rader[i])) !== null) {
            fynd.push({ fil: f.fil, rad: i + 1, varde: normalisera(m[1], k.lista), utdrag: m[0].slice(0, 90) });
            if (m[0] === "") re.lastIndex++;
          }
        }
      }
    }
    const varden = new Map<string, Fynd[]>();
    for (const x of fynd) varden.set(x.varde, [...(varden.get(x.varde) ?? []), x]);
    const brott: string[] = [];
    if (varden.size > 1) brott.push(`${varden.size} OLIKA VÄRDEN — kopiorna har drivit isär`);
    if (fynd.length < k.golv) brott.push(`${fynd.length} förekomster men golvet är ${k.golv} — en kopia har försvunnit eller skrivits om`);
    return { k, fynd, varden, brott };
  });
}

export function rapport(utfall: Utfall[]): boolean {
  let allaHaller = true;
  for (const x of utfall) {
    const ok = x.brott.length === 0;
    if (!ok) allaHaller = false;
    const filer = new Set(x.fynd.map((f) => f.fil));
    console.log(`\n${ok ? "✓" : "✗"} ${x.k.namn}`);
    console.log(`   ${x.k.varfor}`);
    console.log(`   ${x.fynd.length} förekomster i ${filer.size} filer (golv ${x.k.golv})`);
    if (ok) {
      // Håller kontraktet räcker inventeringen: VILKA filer bär det, inte varje rad.
      const per = new Map<string, number>();
      for (const f of x.fynd) per.set(f.fil, (per.get(f.fil) ?? 0) + 1);
      for (const [fil, n] of [...per].sort()) console.log(`     ${fil}${n > 1 ? ` (${n})` : ""}`);
      console.log(`   värde: ${[...x.varden.keys()][0] ?? "(ingen förekomst)"}`);
    } else {
      // Brister det ska varje rad stå där, grupperad per värde — avvikaren ska synas direkt.
      for (const [v, f] of [...x.varden].sort((a, b) => b[1].length - a[1].length)) {
        console.log(`   värde "${v}" — ${f.length} st:`);
        for (const y of f) console.log(`     ${y.fil}:${y.rad}  ${y.utdrag}`);
      }
      for (const b of x.brott) console.log(`   ⚠ ${b}`);
    }
  }
  return allaHaller;
}

// ── DE VAKTADE KONTRAKTEN ──────────────────────────────────────────────────────────────
export const KONTRAKT: Kontrakt[] = [
  // ── HEALTHCHECKENS TRÖSKLAR (kort #87). PERMANENTA — läs den här raden innan du rör dem.
  // De skrevs 14/9 som tidsbegränsade, för planen var att healthcheck.yml skulle raderas när
  // kontrollerna flyttat in i vakthunden. BENGTS BESLUT SAMMA DAG: filen blir kvar. Skälet är
  // inte kostnaden (12 min/dygn) utan att den är den enda kontroll som KÖRS UTANFÖR det den
  // vaktar — vakthunden lever inuti Supabase, och tystnad efter grönt ser identiskt ut som
  // "allt väl". Samma dygn hittades en kedja som varit tyst trasig i sexton dygn (#177).
  // Dupliceringen är alltså permanent OCH avsiktlig, och de tolv nedan ska INTE tas bort.
  //
  // FORMEN ÄR MEDVETET ANNORLUNDA: talet är PINNAT i mönstret i stället för fritt fångat.
  // Ändras en kopia försvinner den ur räkningen och GOLVET fäller — vilket är rätt larm, och
  // det enda som fungerar när de två filerna skriver samma tröskel med olika variabelnamn.
  {
    namn: "Grannarkivens ålder — fi/dk/no",
    varfor: "Flyttad från healthcheck.yml till vakthunden (#87). Under parallellveckan kör båda; driver talet larmar den ena på ett läge den andra kallar friskt.",
    former: [/> (120)\b/],
    filer: /healthcheck\.ts|functions\/vakthund\//,
    golv: 2,
  },
  {
    namn: "Gränsgolvet FI — nåbara stationer",
    varfor: "Golvet är MÄTT (16–20 vid mätningen), inte valt. Sänks en kopia tystnar gränsområdena i den ena implementationen.",
    former: [/\["fi", (\d+)\]/],
    filer: /healthcheck\.ts|functions\/vakthund\//,
    golv: 2,
  },
  {
    namn: "Gränsgolvet NO — nåbara stationer",
    varfor: "Samma sak för Norge (mätt 42). Två kopior under parallellveckan.",
    former: [/\["no", (\d+)\]/],
    filer: /healthcheck\.ts|functions\/vakthund\//,
    golv: 2,
  },
  {
    namn: "Gränsradien — hur nära svensk väg en grannstation räknas",
    varfor: "40 km är gränssnapshotens definition. Driver den mäter de två implementationerna olika populationer.",
    former: [/se\.g::geography, (\d+)\)/],
    filer: /healthcheck\.ts|functions\/vakthund\//,
    golv: 2,
  },
  {
    namn: "Fältgolvet vind — stationer med vindfält",
    varfor: "Larmar bara om fältet NÅGONSIN skördats. Driver golvet dör fältet tyst i den ena.",
    former: [/vind_nu\) < (\d+)/],
    filer: /healthcheck\.ts|functions\/vakthund\//,
    golv: 2,
  },
  {
    namn: "Fältgolvet sikt — stationer med siktfält",
    varfor: "Samma konstruktion som vindens.",
    former: [/sikt_nu\) < (\d+)/],
    filer: /healthcheck\.ts|functions\/vakthund\//,
    golv: 2,
  },
  {
    namn: "Arkivvaktens fönster — hur länge ett tillstånd får vara oarkiverat",
    varfor: "Tre timmar = tre passerade ingestkörningar, alltså förlorat och inte försenat. Formen är bunden till modified_time-kontexten: en bredare form fångade elva orelaterade timintervall och lämnade ett hål där en ändring kunde passera under golvet.",
    former: [/modified_time < now\(\) - interval '(3) hours'/],
    filer: /healthcheck\.ts|functions\/vakthund\//,
    golv: 4,
  },
  {
    namn: "Kameraräknarens golv",
    varfor: "En halv synk ser inte trasig ut, den ser bara mindre ut.",
    former: [/(?:cameras|kameror)\) < (\d+)/],
    filer: /healthcheck\.ts|functions\/vakthund\//,
    golv: 2,
  },
  {
    namn: "Segmenträknarens golv",
    varfor: "Samma sak för väglagssegmenten.",
    former: [/(?:segments|segment)\) < (\d+)/],
    filer: /healthcheck\.ts|functions\/vakthund\//,
    golv: 2,
  },
  {
    namn: "Kartans meta.json — högsta ålder",
    varfor: "Kartsajtens fil, ett ANNAT led än appens manifest. Driver gränsen ser den ena en frusen karta som färsk.",
    former: [/> (90)\b/],
    filer: /healthcheck\.ts|functions\/vakthund\//,
    golv: 2,
  },
  {
    namn: "Kameralagrets golv",
    varfor: "Publiceringen är fail-soft, så ett permanent TRV-fel lämnar annars en gammal fil kvar i tysthet.",
    former: [/(?:n|antal) < (500)\b/],
    filer: /healthcheck\.ts|functions\/vakthund\//,
    golv: 2,
  },
  {
    namn: "Kameralagrets högsta ålder i dygn",
    varfor: "Generös med flit — vakten är mot 'trasigt för evigt', inte mot en sen körning.",
    former: [/(?:ageD|dygn) > (7)\b/],
    filer: /healthcheck\.ts|functions\/vakthund\//,
    golv: 2,
  },
  {
    namn: "Snapshotens halkfilter — vilka ord släpper in ett segment till motorn",
    varfor: "publicera/index.ts är BUNTEN av snapshot-core.ts. Skiljer de sig kör driften en annan filtrering än proven.",
    former: [/i ~\* '\(\^\|\[\^a-zåäö\]\)\(([^)]+)\)\|snö\|frost'/],   // sedan 16/9 (kort #97): snö/frost även i sammansättningar
    filer: /snapshot-core\.ts|functions\/publicera\//,
    golv: 2,
  },
  {
    namn: "Vinterorden i vakthunden — har vintern börjat synas i arkivet?",
    varfor: "Vakthunden bär listan TVÅ gånger i samma fil (rad 137 och 148): statusraden och tabellen i larmet. Driver de isär larmar den på ett ordförråd och redovisar ett annat.",
    former: [/i ~\* '\(\^\|\[\^a-zåäö\]\)\(([^)]+)\)\|snö\|frost'/],   // sedan 16/9 (kort #97): snö/frost även i sammansättningar
    filer: /functions\/vakthund\//,
    golv: 2,
  },
  {
    namn: "Farlighetsorden i kodgrinden — kod 1 tillsammans med farlighetsord",
    varfor: "Bärs två gånger i samma fil (rad 198 och 201): urvalet och räkningen. Driver de isär räknar grinden andra rader än den visar.",
    former: [/i ~\* '\(\^\|\[\^a-zåäö\]\)\(([^)]+)\)\|frost'/],   // sedan 16/9 (kort #97): frost även i sammansättningar; snö är YTA
    filer: /kodgrinden\.ts/,
    golv: 2,
  },
  {
    namn: "Halkorden i MOTORN — vilka ConditionInfo-ord som får motorn att tala (ordbörjan)",
    varfor: "Skuggmotorn är genererad ur engine.ts, och tystnadsfelet dömer mot samma lista. Glider de isär mäter måttet något annat än motorn säger.",
    // Fjärde kopian 20/9 (kort #207): uppspelningen läser omklassningarna i SQL. Postgres saknar lookbehind, så
    // SQL-formen är tystnadsfelets — `(^|[^a-zåäö])(...)` — inte motorns `(?<![a-zåäö])(...)`. Orden ska ändå vara
    // desamma tecken för tecken; "fläckvis Våt" får aldrig matcha på delsträngen 'is'.
    former: [/SLIPPERY_INFO\s*=\s*\/\(\?<!\[a-zåäö\]\)\(([^)]+)\)/,
              /HALKORD\s*=\s*"([^"]+)"/,
              /~\* '\(\^\|\[\^a-zåäö\]\)\(([^)]+)\)'/],
    golv: 5,
  },
  {
    // Kort #97 (16/9): snö och frost räknas även INUTI sammansättningar ("Nysnö", "Rimfrost"). Egen lista,
    // eget kontrakt — tas en stam bort i en kopia tystnar sammansättningarna där utan att något annat syns.
    namn: "Halkstammarna i MOTORN — snö/frost räknas även inuti ord",
    varfor: "Samma tre kopior som ordbörjanslistan. Driver de isär larmar skuggan på Nysnö medan tystnadsfelet mäter som om den teg.",
    former: [/SLIPPERY_STAM\s*=\s*\/\(([^)]+)\)\/i/, /HALKSTAM\s*=\s*"([^"]+)"/, /OR i ~\* '\(([^)]+)\)'/],
    golv: 5,
  },
  {
    namn: "Trendens minsta lutning — svepets lägsta steg (°C per fönster)",
    varfor: "Finns i TypeScript (T-A och knappen) och i SQL (drifträkningen). Driver den sparar driften andra kandidater än domen prövar.",
    former: [/LUTNING\s*=\s*\[(\d+(?:\.\d+)?)/, /medel\)?\s*>=\s*(0\.4)/, />=\s*(0\.4)\s*$/m],
    golv: 2,
  },
  {
    namn: "Trendens bredaste startband — övre gränsen i °C",
    varfor: "Utanför bandet kan ingen kombination fyra. Driver taket sparar drifträkningen bort rader T-B behöver.",
    former: [/STARTBAND[^=]*=\s*\[\[1,\s*3\],\s*\[1,\s*4\],\s*\[1,\s*(\d+)\]\]/,
              /r\.surface_temp_c\s*>=\s*1\s*AND\s*r\.surface_temp_c\s*<=\s*(\d+)/],
    golv: 2,
  },
  {
    namn: "#75 givarvakten — yta får ligga högst N grader under luften",
    varfor: "61 % av arkivets frostrader faller på den. Driver talet mäter grindarna olika arkiv.",
    former: [/surface_temp_c\s*>=\s*air_temp_c\s*-\s*(\d+(?:\.\d+)?)/],
    golv: 17,
  },
  {
    namn: "Fukten — vilka nederbördsord som betyder UPPEHÅLL",
    varfor: "Definierad i TypeScript och i SQL. Glider de isär larmar motorn på annat än grindarna mäter.",
    former: [
      /DRY\s*=\s*new Set\(\[([^\]]*)\]\)/,
      /lower\(precipitation\)\s*NOT IN\s*\(([^)]*)\)/,
    ],
    golv: 6,
    lista: true,
  },
  {
    namn: "Takten — 30-minutershinken som delas med skuggmotorn",
    varfor: "Ändras hinken i en mätning jämförs stationer som inte längre står i samma tidsfönster.",
    former: [/const BUCKET_S\s*=\s*(\d+)/],
    golv: 7,
  },
  {
    namn: "Ankarradien — hur långt bort en station får vara och ändå räknas",
    varfor: "Radien avgör vad som är granne och vad som bara är väder. Olika radie = olika population.",
    former: [/const MAX_KM\s*=\s*(\d+)/],
    golv: 5,
  },
  {
    namn: "Grannantalet — hur många stationer en förutsägelse vilar på",
    varfor: "Grind A:s offsetmodell och varje prov som speglar den måste väga lika många grannar.",
    former: [/const K_NEIGHBOURS\s*=\s*(\d+)/],
    golv: 5,
  },
  {
    // Buntningen skapar den andra kopian av sig själv: snapshot-core.ts genereras in i
    // publicera/index.ts. Faktorn hamnade därför på två ställen i samma commit som den skrevs,
    // och husregeln i CLAUDE.md säger att den då förs in här direkt.
    namn: "Radarfaktorn — radarvärdet DIVIDERAS med detta för stationens skala",
    varfor: "Driver den isär läser motorn en annan intensitet än den kalibrerade (§3.4, DECISIONS #154).",
    former: [/const RADAR_FAKTOR\s*=\s*(\d+(?:\.\d+)?)/],
    golv: 2,
  },
  {
    namn: "Radarns giltighetsfönster — äldre än så är radarn tyst",
    varfor: "#81 regel 7. Glider fönstret talar ett gammalt eko som om det vore nu.",
    former: [/const RADAR_MAX_ALDER_MIN\s*=\s*(\d+)/],
    golv: 2,
  },
  {
    namn: "Regnutlösaren — råradar över detta öppnar ett segment för rain_segments",
    varfor: "Satt av Bengt, kontrasignerad av Axel (#155/#156). Driver den publiceras andra segment än tröskeldokumentet säger.",
    former: [/const REGN_UTLOSARE_MMH\s*=\s*(\d+(?:\.\d+)?)/],
    golv: 2,
  },
  {
    namn: "regn_h-fönstret — hur långt bakåt arkivet får svara på när det senast regnade",
    varfor: "Ett annat fönster i buntningen än i källan ger skuggan en annan regnstoppsbild än den motorn publicerar.",
    former: [/const REGN_H_FONSTER_H\s*=\s*(\d+)/],
    golv: 2,
  },
  {
    namn: "Lutningens giltighetsfönster — äldre än så säger lutningen inget om nu",
    varfor: "Samma skäl som radarns fönster: ett gammalt fall som talar som om det vore nu.",
    former: [/const LUTNING_MAX_ALDER_MIN\s*=\s*(\d+)/],
    golv: 2,
  },
  {
    // Samma tröskel under TVÅ NAMN — ruttberedskapen kallar den BY_TAK, W-A kallar den G_TAK
    // efter dokumentets §3.1. Namnen skiljer sig, värdet får inte göra det, och en regex per
    // namn hade missat den ena. Samma konstruktion som fuktkontraktet över språkgränsen.
    namn: "G_tak — byvind över detta är trasig givare, inte väder",
    varfor: "87,7 m/s ligger i arkivet. Driver taket isär mäter W-A och ruttberedskapen olika stormar.",
    // G_TAK definieras som svepets första steg, inte som en literal — kontraktet läser därför
    // svepets första tal. Att det steget ÄR det lägsta låses av vindsikt-steg0:s eget självtest.
    former: [/const BY_TAK\s*=\s*(\d+)/, /const G_TAK_SVEP\s*=\s*\[\s*(\d+)/],
    golv: 2,
  },
  // BETANS STARTVÄRDEN (DECISIONS #222/#225, fastställda 17/9). Källan i SQL är standardvärdena i
  // uppspelning_efterhalka() (sql/028); den äldre mätfilen bär samma tal i sin CTE `p`. Driver de isär räknar
  // uppspelningen och kontrollen mot skuggloggen på olika regler — och domen i januari vilar på båda. När S3 för in
  // talen i motorn ska motorns kopior in här (bedömningen §0b). De daterade engångsmätningarna 16–17/9 i
  // scripts/matningar/ är historik och ingår inte.
  {
    namn: "Betans startvärde N — regn inom så här lång tid räknas som blöt",
    varfor: "Uppspelningen (sql/028) och kontrollen mot skuggloggen ska räkna samma regel; domen i januari vilar på båda.",
    former: [/interval '(\d+ hours?)' AS n\b/, /p_n interval DEFAULT '(\d+ hours?)'/],
    filer: /uppspelning-efterhalka\.sql|028_uppspelning_varianter\.sql/,
    golv: 4,
  },
  {
    namn: "Betans startvärde fall — °C på trendfönstret",
    varfor: "Samma som ovan: ett fallkrav som driver ändrar vilka nätter som räknas som fyrningar.",
    former: [/([\d.]+)::numeric AS fall\b/, /p_fall numeric DEFAULT ([\d.]+)/],
    filer: /uppspelning-efterhalka\.sql|028_uppspelning_varianter\.sql/,
    golv: 4,
  },
  {
    namn: "Betans startband, nedre gräns — °C",
    varfor: "Samma som ovan.",
    former: [/([\d.]+)::numeric AS lag\b/, /p_lag numeric DEFAULT ([\d.]+)/],
    filer: /uppspelning-efterhalka\.sql|028_uppspelning_varianter\.sql/,
    golv: 4,
  },
  {
    namn: "Betans startband, övre gräns — °C",
    varfor: "Samma som ovan.",
    former: [/([\d.]+)::numeric AS hog\b/, /p_hog numeric DEFAULT ([\d.]+)/],
    filer: /uppspelning-efterhalka\.sql|028_uppspelning_varianter\.sql/,
    golv: 4,
  },
  {
    namn: "Kopplingen station–väg för radarn — km (Bengt 17/9, DECISIONS #225)",
    varfor: "Täckningssatsen ska mäta samma koppling som uppspelningen räknar på — annars friskförklarar den ett annat rör.",
    former: [/p_radar_km numeric DEFAULT (\d+)/, /p_radar_km <> (\d+) THEN/, /::geography, (\d+) \* 1000\)/],
    filer: /uppspelning-varianter\.sql|028_uppspelning_varianter\.sql/,
    golv: 3,
  },
  {
    // Formen är bunden till `AS natt`: ett naket "12 hours" fångar också vakthundens tolvtimmarsfönster, som är något annat.
    namn: "Nattens gräns — timmar tiden skiftas så att en natt inte delas av midnatt (Bengt 20/9, DECISIONS #246)",
    varfor: "T-A, R-A och uppspelningens episoder ska mena samma natt. Med UTC-dygn delades 159 av 454 stationsnätter i två (#245).",
    former: [/- interval '(\d+) hours?'\)[^\n]{0,40}AS natt\b/],
    filer: /grind-t-a\.ts|grind-r-a\.ts|028_uppspelning_varianter\.sql/,
    golv: 3,
  },
  {
    // Fönstret är T-A:s (TROSKLAR-TRENDEN §2), inte kombinationens — men det finns nu i tre filer: arkivets skrivare,
    // dess rena hjälpfunktion, och uppspelningen som läser BÅDA facitkällorna över samma fönster (kort #207).
    namn: "Utfallsfönstret — minuter efter fyrningen som facit får komma",
    varfor: "Driver det isär mäter stationens egen facit ett fönster och omklassningarna ett annat, i samma tabellrad.",
    former: [/UTFALLSFONSTER_MIN\s*=\s*(\d+)/, /minuter = (\d+)\)/, /p_utfall interval DEFAULT '(\d+) minutes'/],
    golv: 3,
  },
  {
    namn: "Räckvidden för facit — km från stationen (Bengt 20/9, DECISIONS #245)",
    varfor: "Standardvärdet och vakten som avvisar andra tal måste bära samma km, annars släpper vakten igenom sitt eget fel.",
    former: [/p_facit_km numeric DEFAULT (\d+)/, /p_facit_km <> (\d+) THEN/],
    golv: 2,
  },
];

// ── SJÄLVTEST mot känd sanning, utan disk ──────────────────────────────────────────────
if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — kontraktsgrinden mot påhittade filer med känd sanning\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${JSON.stringify(fick)}, väntat ${JSON.stringify(vantat)}`); ok = false; }
    else console.log(`  ok: ${namn} = ${JSON.stringify(fick)}`);
  };
  const tal = (golv: number): Kontrakt => ({ namn: "prov", varfor: "prov", former: [/air_temp_c\s*-\s*(\d+)/], golv });
  const ordlista: Kontrakt = {
    namn: "prov-lista", varfor: "prov", lista: true, golv: 2,
    former: [/DRY\s*=\s*new Set\(\[([^\]]*)\]\)/, /lower\(precipitation\)\s*NOT IN\s*\(([^)]*)\)/],
  };

  // FALL 1: tre kopior, samma tal ⇒ håller.
  const lika = granska([tal(3)], [
    { fil: "a.ts", text: "x AND surface_temp_c >= air_temp_c - 12" },
    { fil: "b.ts", text: "y\nz AND surface_temp_c >= air_temp_c - 12" },
    { fil: "c.ts", text: "AND surface_temp_c >= air_temp_c - 12 -- #75" },
  ])[0];
  k("FALL 1 antal", lika.fynd.length, 3);
  k("FALL 1 brott", lika.brott.length, 0);

  // FALL 2: en kopia har drivit ⇒ fäller, och rapporten ska kunna PEKA UT avvikaren.
  const drift = granska([tal(3)], [
    { fil: "a.ts", text: "AND surface_temp_c >= air_temp_c - 12" },
    { fil: "b.ts", text: "AND surface_temp_c >= air_temp_c - 12" },
    { fil: "avvikaren.ts", text: "AND surface_temp_c >= air_temp_c - 10" },
  ])[0];
  k("FALL 2 antal värden", drift.varden.size, 2);
  k("FALL 2 fäller", drift.brott.length > 0, true);
  k("FALL 2 pekar ut avvikaren", drift.varden.get("10")?.[0].fil, "avvikaren.ts");
  k("FALL 2 avvikaren är ensam", drift.varden.get("10")?.length, 1);

  // FALL 3: en kopia har försvunnit ⇒ fäller på golvet, trots att de kvarvarande är eniga.
  const borta = granska([tal(3)], [
    { fil: "a.ts", text: "AND surface_temp_c >= air_temp_c - 12" },
    { fil: "b.ts", text: "AND surface_temp_c >= air_temp_c - 12" },
  ])[0];
  k("FALL 3 antal värden", borta.varden.size, 1);
  k("FALL 3 fäller ändå", borta.brott.length, 1);
  k("FALL 3 skälet är golvet", borta.brott[0].includes("golvet"), true);

  // FALL 4: samma ordlista i två språk ⇒ håller. Det här är kontraktets egentliga prov.
  const tvarsprak = granska([ordlista], [
    { fil: "kod.ts", text: 'const DRY = new Set(["no", "dry"]);' },
    { fil: "fraga.ts", text: '" AND lower(precipitation) NOT IN (\'dry\',\'no\')))"' },
  ])[0];
  k("FALL 4 normaliserar lika", tvarsprak.varden.size, 1);
  k("FALL 4 värdet", [...tvarsprak.varden.keys()][0], "dry|no");
  k("FALL 4 brott", tvarsprak.brott.length, 0);

  // FALL 5: SQL-listan har tappat ett ord ⇒ fäller. Motorn och grinden skulle annars räkna
  // "Dry" som fukt i den ena och uppehåll i den andra, tyst.
  const glapp = granska([ordlista], [
    { fil: "kod.ts", text: 'const DRY = new Set(["no", "dry"]);' },
    { fil: "fraga.ts", text: '" AND lower(precipitation) NOT IN (\'no\')))"' },
  ])[0];
  k("FALL 5 fäller", glapp.brott.length > 0, true);
  k("FALL 5 två mängder", glapp.varden.size, 2);

  // Normaliseringen själv: ordning och versaler får inte spela roll, tal får inte röras.
  k("normalisera lista, omvänd ordning", normalisera("'dry','no'", true), "dry|no");
  k("normalisera lista, versaler", normalisera('"NO","Dry"', true), "dry|no");
  k("normalisera tal", normalisera(" 12 "), "12");

  // Rapporten ska gå att köra i båda lägena utan att kasta.
  rapport([lika]); rapport([drift]);
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE — grinden själv är trasig och får inte litas på.\n"); process.exit(1); }
  console.log("\nSJÄLVTEST OK: grinden hittar drift, pekar ut avvikaren, fäller på borttappad kopia\noch jämför ordlistor över språkgränsen.");
  process.exit(0);
}

// ── SKARPT: läser repots egna filer ────────────────────────────────────────────────────
// Fillistan läses ur git, inte ur en handskriven lista — samma husregel som mätvakten (#105)
// och ruttberedskapen (#124): listan som ska vara komplett läses från källan, inte från minnet.
const { execSync } = await import("node:child_process");
const { readFileSync } = await import("node:fs");
const { fileURLToPath } = await import("node:url");

const SJALV = "scripts/kontraktsgrinden.ts";   // grinden bär formerna själv och räknar inte sig
const ANDELSER = /\.(ts|tsx|sql|kt|swift)$/;

// Roten läses ur git, inte ur process.cwd(): grinden ska ge samma svar oavsett varifrån den
// körs. Utan det fäller den falskt på "under golvet" så fort någon kör den ur scripts/.
// git körs ur skriptets EGEN katalog, så den hittar repot även när cwd står någon annanstans.
const har = { encoding: "utf-8" as const, cwd: fileURLToPath(new URL(".", import.meta.url)) };
const rot = execSync("git rev-parse --show-toplevel", har).trim();

const spar = execSync("git ls-files", { ...har, cwd: rot }).split("\n")
  .map((s) => s.trim()).filter((s) => s && ANDELSER.test(s) && s !== SJALV && !s.startsWith("node_modules/"));

const filer = spar.map((fil) => ({ fil, text: readFileSync(`${rot}/${fil}`, "utf-8") }));

console.log(`Kontraktsgrinden — bär de upprepade kontrakten samma värde överallt?\n`);
console.log(`Läser ${filer.length} spårade filer ur git (${SJALV} räknar inte sig själv).`);

const utfall = granska(KONTRAKT, filer);
const haller = rapport(utfall);

console.log(`\n${"─".repeat(78)}`);
if (haller) {
  console.log(`ALLA ${KONTRAKT.length} KONTRAKT HÅLLER. Varje kopia bär samma värde och ingen har fallit bort.`);
  console.log(`Kom ihåg vad det INTE bevisar: bara de kontrakt som deklarerats i den här filen`);
  console.log(`är vaktade. Ändras en tröskel ska en fullständig grep fortfarande göras.`);
  process.exit(0);
}
console.log(`KONTRAKTSGRINDEN FÄLLER.`);
console.log(`  Olika värden ⇒ någon ändrade en kopia utan att ta de andra. Rätta ALLA, eller`);
console.log(`  dela kontraktet i två med var sitt namn om skillnaden är avsiktlig.`);
console.log(`  Under golvet ⇒ en kopia är borta eller omskriven. Är det avsiktligt: sänk golvet`);
console.log(`  i scripts/kontraktsgrinden.ts i samma commit, så att borttagningen blir ett beslut.`);
process.exit(1);
