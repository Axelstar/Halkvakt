// VÄRDEVAKTEN — besiktar varje numeriskt fält i arkivet (Bengts order 12/9, DECISIONS #133).
//
// VARFÖR DEN FINNS. På ett dygn visade sig nio antaganden vara fel eller datan smutsig, och fyra
// av dem var samma defekt: **ett fält vars värden innehåller koder som är typgiltiga men fysiskt
// omöjliga.**
//
//   byvind 85,5 m/s     — trasig givare (Sveriges rekord ≈ 81, och då på fjällstation)
//   sikt 20 000 m       — SENTINEL ("minst 20 km") i hälften av raderna, inte en mätning
//   molnmängd 113 %     — SMHI:s KOD för himlen skymd, fysikaliskt motsatsen till klar natt
//   precipitation "no"  — sträng som betyder torrt; Boolean() av den var en falsklarmsmaskin
//
// Och två äldre av samma sort: SeverityCode 3 som aldrig funnits, och Camera.Bearing som pekar
// åt MOTSATT håll mot den kurs den bevakar.
//
// **INTE ETT ENDA AV DEM HITTADES AV EN VAKT.** Alla nio hittades av att en människa läste en
// utskrift, och varje vakt vi har — #75, DRY-listan, G_tak — skrevs EFTER att samma sorts defekt
// bitit oss. Det här skriptet är den systematiska kontroll som saknades.
//
// TRE KONTROLLER, och den tredje är den som gör den till en grind:
//
//   1. SPANNET   — ligger min/max inom det fysiskt rimliga? (85,5 m/s hade fastnat här)
//   2. DOMINANS  — tar ett enda värde en orimlig andel i ett fält med många distinkta värden?
//                  Det är sentinelns signatur. (20 000 m tog halva siktmaterialet)
//   3. DEKLARATIONEN — **ett fält utan deklarerat spann rapporteras som OBESIKTIGAT.**
//
// Punkt 3 är avsiktligt obekväm. Ett nytt fält dyker upp som obesiktigat den dag det finns i
// arkivet, och står så tills någon skriver ned vad det får innehålla. Det är billigare att
// deklarera ett spann än att upptäcka en sentinel i en tröskel.
//
// FLAGGOR OCH ORDLISTOR (körlistan B3, 17/11 2026). Sanningsvärden och kodlistor i text är inte tal, och varvet såg dem aldrig,
// fast de bär mätningar: nederbördsklassen och ytvattnets flagga är fukten i vinterns facit vid stationerna. De deklareras i
// FLAGGOR och ORD nedan och besiktas sist i varvet. En odeklarerad flagga är OBESIKTIGAT, och ett ord utanför listan är OKÄNT ORD.
//
// HUSREGELN (CLAUDE.md): ett fält får inte bära en mätning, en tröskel eller en varning förrän
// det passerat värdevakten.
//
// Helt läsande. Run: DATABASE_URL=... node --experimental-strip-types scripts/vardevakten.ts [dagar=30]
// Självtest utan DB: scripts/vardevakten.ts --sjalvtest

// The engine's own halkord (DECISIONS #915): every road-state word in VAGLAGSORD below carries the engine's answer, and an unknown
// word is reported with it, so the reader sees both questions at once — has a person read the word, and does it make the voice speak.
import { SLIPPERY_INFO, SLIPPERY_STAM } from "../engine/src/engine.ts";
import { HINKAR } from "../supabase/functions/olycksfacit/vyn.ts";

const MIN_RADER = 100;        // under detta får fältet ingen dom, bara ett tal
// DOMINANSEN SKÄRPT efter första körningen (DECISIONS #134). Första regeln var "ett värde över
// 5 % i ett fält med många distinkta" — den flaggade `rain_sum_mm` (0 i 58 %), `snow_wateq_mm`
// (0 i 99,9 %) och `wind_speed_ms` (0,5 i 6,8 %), alla fullkomligt legitima. Noll nederbörd i
// september ÄR det vanligaste värdet; det är inte en sentinel, det är väder.
//
// Den verkliga signaturen är smalare: **en sentinel ligger vid TAKET och tar en stor andel.**
// 20 000 m sikt är maxvärdet och tar halva materialet. 113 % molnmängd ligger över taket. Ett
// dominerande MINIMUM är däremot nästan alltid "ingenting hände". Ett sentinelvärde under golvet
// (−999 och liknande) fastnar på spannkontrollen i stället.
const DOMINANS = 0.20;        // en sentinel tar en STOR andel, inte bara en ovanligt stor
const MANGA_DISTINKTA = 50;   // under detta är fältet en kodlista, inte en mätning

/** Deklarerade spann. Fysikens gränser, inte driftens — en grind får vara strängare (t.ex.
 *  G_tak 30/40/50 i TROSKLAR-VIND-SIKT), men ingen får vara vidare. Ett fält som saknas här
 *  är OBESIKTIGAT och får inte bära en mätning. */
export const SPANN: Record<string, [number, number, string]> = {
  // Yttemperaturens spann är fysikens (Vuoggatjålme −52,6 °C i luften 1966; ytan går lägre en klar natt). De
  // −34…−50 °C som sju stationer rapporterade i SEPTEMBERLUFT (+9…+17 °C, anmälda till Trafikverket) ligger
  // INOM spannet och fångas inte här — de är omöjliga i RELATION till luften, och det är radvaktens sak
  // (publish/snapshot-core.ts RADVAKT_SQL, DECISIONS #298). Spannet vaktar värdet, radvakten paret (kort #267).
  surface_temp_c: [-60, 60, "°C"], air_temp_c: [-60, 60, "°C"], dewpoint_c: [-60, 60, "°C"],
  humidity_pct: [0, 100, "%"],
  wind_speed_ms: [0, 60, "m/s"], wind_gust_ms: [0, 60, "m/s"],
  visibility_m: [0, 20000, "m — 20 000 ÄR ETT TAK, inte en mätning"],
  rain_sum_mm: [0, 100, "mm/30 min"], snow_wateq_mm: [0, 100, "mm/30 min"],
  surface_grip: [0, 1, "friktion 0–1 ur ytstatusgivaren (Surface.Grip, DECISIONS #465) — NULL = ingen givare"],
  condition_code: [1, 4, "Trafikverkets väglagsklass"],
  // Vägdatalagret (kort #301, DECISIONS #473): NVDB ur öppna API:et, statiskt per plats i data/vagdata/. Spannen deklareras HÄR
  // innan någon mätning läser fälten; hämtaren importerar dem och fäller vid brott.
  klass: [0, 9, "funktionell vägklass 0 (riksväg) … 9"],   // också Lastkajens Klass_181 i data/vagdata/vaglagspunkter-adt-klass.json (#553)
  bredd_m: [0, 60, "m vägbredd"],
  hastighet_kmh: [5, 130, "km/h högsta tillåtna"],
  adt_fordon: [0, 200000, "fordon per årsmedeldygn"],   // också Lastkajens ADT_f_117 i data/vagdata/vaglagspunkter-adt-klass.json (#553)
  adt_lastbilar: [0, 50000, "tunga fordon per årsmedeldygn"],
  adt_latta_22_06: [0, 50000, "lätta fordon per årsmedeldygn kl. 22–06"],
  adt_matar: [1990, 2030, "mätår för ÅDT (ur Mätårsperiod ÅÅÅÅMM)"],
  // Terrängen vid stationen (Axels fysik/geofeat.py: 16 riktningar ut till 1,5 km i Copernicus DEM; geofeat.csv i indata-releasen).
  // Deklarerade 13/10 innan körning 2 (DECISIONS #549) låter dem bära energibalansen; terrang.py läser spannen härifrån och fäller.
  // Horisontvinkeln börjar på 0 i geofeat.py (en lägre terräng räknas som ingen skymning), så golvet är 0 och inte negativt.
  svf: [0, 1, "himmelsfaktor, medel av cos² av horisontvinkeln i 16 riktningar"],
  horizon_south: [0, 90, "° högsta horisontvinkel mot sydost–sydväst (riktning 6–10 av 16)"],
  // Rättelsens övriga fasta särdrag vid väglagspunkterna (DECISIONS #553, data/vagdata/vaglagspunkter-sardrag.json): höjd och
  // terräng ur Copernicus DEM (fysik/vagpunkter/hojd.py, geofeat2.py), skog, trädhöjd, vatten och bebyggelse ur ESA WorldCover och
  // Meta/WRI (geofeat.py). Fysikens gränser, inte vinterns; vdepth är högsta punkten inom radien minus platsen och kan inte bli negativ.
  elev: [-50, 2200, "m ö.h., höjden i platsen"], elev_ifs: [-50, 2200, "m ö.h., ECMWF-cellens höjd (= elev vid väglagspunkterna, #553)"],
  tpi1: [-1500, 1500, "m, platsen minus ringen på 1 km"], tpi3: [-1500, 1500, "m, platsen minus ringen på 3 km"],
  tpi2km: [-1500, 1500, "m, platsen minus medlet inom 2 km"], tpi5km: [-1500, 1500, "m, platsen minus medlet inom 5 km"],
  tpi10km: [-1500, 1500, "m, platsen minus medlet inom 10 km"], tpi20km: [-1500, 1500, "m, platsen minus medlet inom 20 km"],
  vdepth5km: [0, 2200, "m, högsta inom 5 km minus platsen"], vdepth10km: [0, 2200, "m, högsta inom 10 km minus platsen"],
  tree100: [0, 1, "andel träd inom 100 m (WorldCover)"], water1000: [0, 1, "andel vatten inom 1 km (WorldCover)"],
  built300: [0, 1, "andel bebyggelse inom 300 m (WorldCover)"], chm30: [0, 60, "m, trädens medelhöjd inom 30 m (Meta/WRI)"],
  // Vinterväghållningsklassen (Lastkajens Sverigepaket Drift och underhåll, Vagkl_564; data/vagdata/vaglagspunkter-vinterklass.json).
  uh_klass: [1, 5, "Trafikverkets vägunderhållsklass 1–5 — saknad är en väg utan statlig klass inom 150 m, inte en klass"],
  // Europaväg (NVDB Vägnummer i det öppna API:et, data/vagdata/vaglagspunkter-europavag.json). Källan skriver −1 för Ja; filen 1.
  europavag: [0, 1, "1 = vägen är en Europaväg (källans −1), 0 = inte, också onumrerad väg"],
  // MET Nordic Analysis (MET Norway, 1 km, timvis; releasen kuvos-metnordic-2024-25, DECISIONS #480). Läst 7/10 över hela
  // vintern: luft −36,0…+18,1 °C, fukt 0,28–1, vind 0,01–21,5 m/s, moln 0–1, nederbörd 0–13,7 mm/h, långvåg 525 000–1 346 000
  // J/m² per timme, kortvåg −222…2 257 000 J/m² per timme. Kortvågens små negativa värden (30 541 timmar) är beräkningsbrus.
  t2m_c: [-50, 35, "°C lufttemperatur 2 m (MET Nordic)"],
  rh2m: [0, 1, "andel relativ fukt 2 m (MET Nordic)"],
  vind10_ms: [0, 60, "m/s medelvind 10 m (MET Nordic)"],
  moln: [0, 1, "andel molnmängd (MET Nordic)"],
  nederbord_mm: [0, 50, "mm nederbörd per timme (MET Nordic)"],
  langvag_jm2: [360000, 1800000, "J/m² inkommande långvåg per timme, 100–500 W/m² (MET Nordic)"],
  kortvag_jm2: [-1000, 4000000, "J/m² inkommande kortvåg per timme; ned till −1 000 rymmer beräkningsbruset (MET Nordic)"],
  // FYSIK (Axels fysikspår som fil; releasen kuvos-fysik-2024-25, DECISIONS #485). Läst 7/10 över hela vintern: −25,5…+17,4 °C.
  // Spannet är ytans, som surface_temp_c: en skattning utanför det är ett fel i filen, inte en kall natt.
  fysik_c: [-60, 60, "°C skattad yttemperatur (fysikspåret, kuvos-fysik-2024-25)"],
  // Kallkartan (MODIS natt-LST 2022–25, releasen kuvos-modis-2022-25, DECISIONS #482). Läst 9/10 vid 843 stationer: −2,74…+3,51 K,
  // 1/99-percentil −1,78 / +1,46. Spannet är fysikens för en lokal avvikelse mot ±25 km en klar natt; vattnet tas av provets egen regel.
  // ECMWF IFS ur Open-Meteos arkiv för väderkällans nivå 1b (kort #318, DECISIONS #505): relativ fukt i procent; luften läses som t2m_c.
  rh_pct: [0, 100, "% relativ fukt 2 m (ECMWF via Open-Meteo, nivå 1b)"],
  medelavvikelse_k: [-15, 15, "K lokal avvikelse i MODIS natt-LST mot ±25 km (kallkartan, kuvos-modis-2022-25, DECISIONS #482)"],
  severity_code: [1, 5, "TRV SeverityCode — 3 har aldrig förekommit"],
  // Radarns intensiteter. 200 mm/h är fysikens gräns för en 5-minutersskur; extrema
  // konvektiva celler når 150–200. HÖGRE ÄR EN RADARARTEFAKT, inte regn — och de här två
  // fälten bär hela vattenplaningsspåret sedan grind V-A föll (#104).
  rate_max_mmh: [0, 200, "mm/h"], rate_mean_mmh: [0, 200, "mm/h"],
  wind_dir_deg: [0, 360, "grader"],
  speed_limit_kmh: [0, 130, "km/h"], bearing: [0, 360, "grader — kameran TITTAR hit, kursen är +180"],
  n_hazards: [0, 10000, "st"], n_alerts: [0, 1000, "st"],
  county_no: [1, 25, "länskod"], area_id: [1, 1e12, "SMHI-id"], warning_id: [1, 1e12, "SMHI-id"],
  // Trendens kandidatarkiv (#88 steg 2, sql/017), besiktigat 15/9 som förkrav för S2/S3 i bedömning v3:
  // fälten bär redan `lutning` i live.json (N4, DECISIONS #188). Lutning = ytans fall per fönster,
  // POSITIVT när ytan faller; svepet går till 1,2 °C (publish/trenden.ts LUTNING). ±20 per fönster är
  // fysikens yttergräns — bortom det är ett givarhopp, som trendens egen vakt redan kastar mellan rader.
  lutning15_c: [-20, 20, "°C per 15 min"], lutning30_c: [-20, 20, "°C per 30 min"], lutning60_c: [-20, 20, "°C per 60 min"],
  dagg_gap_c: [-60, 60, "°C — yta minus daggpunkt"], min_yta_90min_c: [-60, 60, "°C"],
  utfall_rader: [0, 200, "st mätningar i utfallsfönstret — 0 är okänt, inte torrt"],
  // Telefonens egen GPS-fart (DECISIONS #461): bär stillaståendetiern (< 3) och självstoppets bilfart (snitt ≥ 12 över 60 s).
  // Inte en arkivkolumn — deklarerad här för att husregeln gäller trösklar i appen också. Negativ/saknad = OKÄND, aldrig stilla.
  fix_speed_kmh: [0, 300, "km/h — saknad fart är okänd, inte 0"],
  // Kandidaten NIVÅ 2+BLANDNING live (kort #343, sql/050): fem skattningar av vägytans temperatur i ett led, och
  // ankaravståndet som väger dem. Fött besiktigade, innan fälten bär en mätning eller en varning — värdevakten
  // skannar bara tabeller som står i TIDSKOLUMN nedan. Spannet −60…+80 °C är fysikens yttergräns för en vägyta
  // (asfalt i sommarsol når 60-tal; −50 är Vuoggatjålmes rekord), inte ett väntat intervall: en skattning utanför
  // det är ett räknefel, inte ett väder. ank_km upp till RMAX_RES (300 km) — längre bort väger ingen granne alls.
  ts_fysik: [-60, 80, "°C — fysikkolumnens yta"], ph: [-60, 80, "°C — fysiken + rättelsen"],
  pg: [-60, 80, "°C — PH + grannarnas fel"], ra: [-60, 80, "°C — RÅ, grannarnas uppmätta yta"],
  pb: [-60, 80, "°C — blandningen, kandidatens värde"], ank_km: [0, 300, "km till närmaste bidragande ankare"],
  // Spridningsgrinden för kandidaten (DECISIONS #575): RÅ:s bidragande ankare (högst fem inom 50 km) och deras spridning, störst
  // minus minst yta. Spridningen bär grindens tröskel 2,25 °C, så den besiktigas innan grinden talar. Ytornas spann (−60…+80) ger en
  // teoretisk spridning upp till 140; 60 °C är redan en trasig givare bland grannarna, inte ett väder.
  n_ank: [0, 5, "antal bidragande ankare"], spr: [0, 60, "°C — ankarnas spridning"],
  // Spärren F1 (DECISIONS #799, sql/086–087): minoritetens andel av ankarnas vikt på andra sidan noll. En minoritet är per definition
  // högst hälften, och 0 betyder att ankarna är ense. Fältet bär spärrens tröskel 0,45 sedan 6/11 men stod obesiktigat till 17/11
  // (körlistan B3): läst då till 0…0,4999 i båda tabellerna, med 0 i 94–97 % av raderna.
  frys_min: [0, 0.5, "andel — minoritetens vikt på andra sidan noll (F1); 0 = ankarna ense"],
  // Domloggen (sql/057–058, kandidat_skugga): antal vägpunkter per sträcka och utfall — en sträcka har högst 64 punkter
  // (vaglagspunkter.json 15/10) — och sträckans radar, kallaste värde, vetostation och minsta spridning bland de varnande.
  punkter: [0, 64, "vägpunkter med yta ≤ 0 på sträckan"], varnar: [0, 64, "varnande punkter"], veto: [0, 64, "vetade punkter"],
  torr: [0, 64, "punkter utan fukt"], spridning: [0, 64, "punkter grinden tystade"], fukt_glest: [0, 64, "fuktiga punkter med färre än två ankare"],
  radar_mmh: [0, 200, "mm/h — radarns rate_mean över sträckan"], pb_min: [-60, 80, "°C — kandidatens kallaste värde på sträckan"],
  veto_km: [0, 15, "km till vetostationen"], veto_yta: [-60, 80, "°C — vetostationens yta"],
  fukt_spr_min: [0, 60, "°C — minsta spridningen bland de fuktiga punkterna med minst två ankare"],
  // Publiceringens byggtid (sql/115, DECISIONS #896, körlistan B6): bär avbrottsvillkoret i #833 (mer än det dubbla av medianen veckan
  // före påslaget, två körningar i rad), så den besiktigas innan vakthunden larmar på den. Läst 17/11 ur pg_nets svar (#892): 7 668
  // till 9 566 ms på 179 körningar. Tio minuter är ingen byggtid utan ett fel i svaret.
  bygget_ms: [0, 600000, "ms — publiceringens bygge av lägesfilen"],
  // The moisture shadow in the cities (sql/127, DECISIONS #907; halkvakt-kuvos F74 §5). The fields have names of their own, since a key
  // here holds in every table. The upper bounds come from the schema, never from the point list (TROSKLAR-SASONGSFACIT §11.7, DECISIONS
  // #904 answer 5 (a)): a point id is ^[BC][0-9]{5}$ and a group has one layer (sql/089), so a group holds at most 100 000 points and a
  // run at most 200 000 groups. The bounds say nothing about how large the groups are.
  p0_punkter: [0, 100000, "stadspunkter i P0 i gruppen — gränsen är schemats (sql/089), inte gruppens storlek"],
  r0_punkter: [0, 100000, "stadspunkter i P0 med radarns fukt (R0)"],
  r0_f1_punkter: [0, 100000, "stadspunkter med R0 som spärren F1 tystar"],
  k1_punkter: [0, 100000, "stadspunkter i P0 med R0 eller grannstationens fukt (K1)"],
  k1_nb_punkter: [0, 100000, "stadspunkter i P0 med R0 eller grannstationens nederbörd"],
  k1_rim_punkter: [0, 100000, "stadspunkter i P0 med R0 eller grannstationens rimfrost"],
  k1_utan_varde: [0, 100000, "stadspunkter i P0 utan giltig station inom 15 km"],
  k2a_punkter: [0, 100000, "stadspunkter i P0 med R0 eller Våt inom 2 km (K2a)"],
  k2a_utan_varde: [0, 100000, "stadspunkter i P0 utan väglagssträcka inom 2 km"],
  p0_grupper: [0, 200000, "grupper skrivna i fuktskuggans körning — gränsen är schemats (två lager, sql/089)"],
  // Svartis and rimfrost in the same shadow (sql/127, DECISIONS #908; halkvakt-kuvos F75 §8): the same schema bounds as above.
  g_rim_utan_varde: [0, 100000, "stadspunkter i P0 vars giltiga granne saknar en daggpunkt inom spannet (G-rim utan värde)"],
  m_dagg_punkter: [0, 100000, "stadspunkter i P0 med R0 eller MET:s daggfukt vid punkten (M-dagg)"],
  m_dagg_utan_varde: [0, 100000, "stadspunkter i P0 där kandidatens värde eller MET:s rad saknas i någon av timmarna (M-dagg utan värde)"],
  s1h_punkter: [0, 100000, "stadspunkter i P0 med R0 eller radarn i gruppen inom 1 timme (S-1h)"],
  s2h_punkter: [0, 100000, "stadspunkter i P0 med R0 eller radarn i gruppen inom 2 timmar (S-2h)"],
  s3h_punkter: [0, 100000, "stadspunkter i P0 med R0 eller radarn i gruppen inom 3 timmar (S-3h, den som avgör)"],
  s4h_punkter: [0, 100000, "stadspunkter i P0 med R0 eller radarn i gruppen inom 4 timmar (S-4h)"],
  c7_alla_punkter: [0, 100000, "stadspunkter i P0 med R0, G-rim, M-dagg eller S-3h"],
  // MET Nordic's dew point per city point (sql/126, DECISIONS #908; F75 §8): F38's span, stricter than dewpoint_c, under a key of its
  // own since a key holds in every table. The humidity beside it is rh2m above, as a fraction.
  met_td_c: [-50, 30, "°C MET Nordics daggpunkt vid stadspunkten (ur kuvösens kedja) — F38:s spann, strängare än dewpoint_c"],
  // THE CITIES IN SÄSONGSFACIT (TROSKLAR-SASONGSFACIT §11.7 V2, DECISIONS #904 answer 5 (a), #913; körlistan C3). A key "table.column"
  // holds in that table and goes before the column's name (spannFor below), so the city log's counts have spans of their own and do not
  // borrow the road points' 0–64 above. The bounds come from the schema, never from the point list (sql/089: a point id is a layer
  // letter and five digits, and a group has one layer), so they say nothing about how large the groups are: a group or a cell holds at
  // most 100 000 points of its layer, a run at most 200 000 groups, and a Swedish day has at most 25 hours.
  "ny_kandidat_skugga_stad.punkter": [0, 100000, "stadspunkter i gruppen med yta ≤ 0 i regeln (sql/096) — gränsen är schemats, inte gruppens storlek"],
  "ny_kandidat_skugga_stad.varnar": [0, 100000, "varnande stadspunkter i gruppen"],
  "ny_kandidat_skugga_stad.veto": [0, 100000, "vetade stadspunkter i gruppen"],
  "ny_kandidat_skugga_stad.torr": [0, 100000, "stadspunkter i gruppen utan fukt (radarn, deras enda fukt)"],
  "ny_kandidat_skugga_stad.spridning": [0, 100000, "stadspunkter i gruppen som spärren F1 tystade"],
  "ny_kandidat_skugga_stad_korning.grupper": [0, 200000, "grupper skrivna i stadsloggens körning — gränsen är schemats (två lager)"],
  // The daily aggregate (sql/128): per day, cell, part of the day and level.
  "sasongsfacit_stad_dag.timmar_raknad": [0, 25, "timmar — ett svenskt dygn har högst 25"],
  "sasongsfacit_stad_dag.timmar_mars": [0, 25, "timmar i marsfönstret"],
  "sasongsfacit_stad_dag.timmar_brytaren_av": [0, 25, "timmar"],
  "sasongsfacit_stad_dag.timmar_ingen_timme": [0, 25, "timmar"],
  "sasongsfacit_stad_dag.timmar_av": [0, 25, "timmar"],
  "sasongsfacit_stad_dag.timmar_ingen_korning": [0, 25, "timmar"],
  "sasongsfacit_stad_dag.timmar_varning": [0, 25, "räknade timmar med en varnande grupp i cellen"],
  "sasongsfacit_stad_dag.kalla": [0, 2500000, "grupp-timmar — 100 000 grupper gånger 25 timmar"],
  "sasongsfacit_stad_dag.varnande": [0, 2500000, "grupp-timmar"],
  "sasongsfacit_stad_dag.ytan_over_0": [0, 2500000, "grupp-timmar; under 0 är en grupp i loggen som inte står i stadspunkt"],
  "sasongsfacit_stad_dag.tysta_punkter": [0, 2500000, "punkt-timmar — 100 000 punkter i lagret gånger 25 timmar"],
  "sasongsfacit_stad_dag.veto": [0, 2500000, "punkt-timmar"],
  "sasongsfacit_stad_dag.torr": [0, 2500000, "punkt-timmar"],
  "sasongsfacit_stad_dag.spridning": [0, 2500000, "punkt-timmar"],
  "sasongsfacit_stad_dag.grupper": [0, 100000, "cellens grupper i stadspunkt när dygnet räknades — schemats gräns"],
  // Fuktskuggan och basfrekvensen (sql/138, DECISIONS #940): stationstimmar per dygn, del av dygnet och hink, fött besiktigad.
  "fuktskugga_timmar.timmar": [0, 50000, "stationstimmar — 2 000 stationer gånger 25 timmar"],
  "fuktskugga_timmar.larm_a2": [0, 50000, "stationstimmar"],
  "fuktskugga_timmar.larm_forslag": [0, 50000, "stationstimmar"],
  // Var på sträckan (sql/143, DECISIONS #960): de hala sträckorna i delar om ungefär en kilometer, fött besiktigad.
  "strackdel_timme.kod": [1, 4, "Trafikverkets väglagsklass"],
  "strackdel_timme.langd_km": [0, 1000, "km — den längsta väglagssträckan är långt kortare"],
  "strackdel_timme.delar": [1, 1000, "delar om ungefär 1 km"],
  "strackdel_timme.kalla": [0, 1000, "delar"], "strackdel_timme.mellan": [0, 1000, "delar"],
  "strackdel_timme.varma": [0, 1000, "delar"], "strackdel_timme.okanda": [0, 1000, "delar"],
  "strackdel_timme.uppmatta": [0, 1000, "delar"],
  "strackdel_timme.yta_min": [-60, 60, "°C, skattad ur ankarna"], "strackdel_timme.yta_max": [-60, 60, "°C, skattad ur ankarna"],
  "strackdel_olycka.kod": [1, 4, "Trafikverkets väglagsklass vid starten"],
  "strackdel_olycka.yta": [-60, 60, "°C, skattad ur ankarna vid olyckan"],
  "strackdel_olycka.narm_km": [0, 50, "km till närmaste ankare (MAX_KM)"],
  "strackdel_olycka.ankare": [0, 5, "ankare i skattningen (K_NEIGHBOURS)"],
  "vagnummer_punkt.huvudnummer": [1, 9999, "Trafikverkets huvudnummer (E4 = 4, länsvägar upp till fyra siffror; sql/144)"],
  "vagnummer_punkt.fragade": [1, 3, "punkter frågade per nyckel (PER_VAG)"], "vagnummer_punkt.svar": [0, 3, "punkter som svarade"],
  "vagnummer_punkt.lika": [0, 3, "svar som bar utfallets värde"],
  // The weekly report (körlistan D1, DECISIONS #951), born inspected. The counter's ceiling is the function's TAK_PER_DYGN, the
  // aggregates' bounds come from the population: 818 road stretches times 25 hours in a Swedish day, in one county and part of the day.
  "app_raknare.antal": [0, 100000, "händelser på ett dygn — app-raknares tak per dygn (TAK_PER_DYGN)"],
  "sasongsfacit_dag.timmar": [0, 25000, "sträcktimmar — 818 sträckor gånger 25 timmar"],
  "sasongsfacit_dag.varnar": [0, 25000, "sträcktimmar"],
  "sasongsfacit_dag.traff": [0, 25000, "sträcktimmar"],
  "sasongsfacit_dag.f1": [0, 25000, "sträcktimmar"],
  "sasongsfacit_dag.tackt": [0, 25000, "sträcktimmar"],
  "sasongsfacit_ledtid.n": [0, 25000, "början på F1 — högst en per sträcka och timme"],
  "sasongsfacit_olyckor.olyckor": [0, 2000, "olyckor på ett dygn i ett län"],
  "sasongsfacit_olyckor.k_varnade": [0, 2000, "olyckor"],
  "sasongsfacit_dag.lan": [0, 25, "Trafikverkets länsnummer, 0 = okänt (sql/099)"],
  "lagesfil_dag.timmar_bygge": [0, 25, "timmar i ett svenskt dygn med bygge av lägesfilen (sql/141); 25 när sommartiden slutar"],
  "lagesfil_dag.timmar_utan": [0, 25, "timmar i dygnet utan bygge (sql/141)"],
  "lagesfil_dag.a1_f1": [0, 500000, "sträcktimmar med F1 — hela landets väglagssträckor gånger 25 timmar (sql/141)"],
  "lagesfil_dag.a1_i_filen": [0, 500000, "sträcktimmar (sql/141)"],
  "lagesfil_dag.a2_isrisk": [0, 25000, "stationstimmar — omkring 800 stationer gånger 25 timmar (sql/141)"],
  "lagesfil_dag.a2_i_filen": [0, 25000, "stationstimmar (sql/141)"],
  "sasongsfacit_ledtid.lan": [0, 25, "Trafikverkets länsnummer, 0 = okänt (sql/099)"],
  "sasongsfacit_olyckor.lan": [0, 25, "Trafikverkets länsnummer, 0 = okänt (sql/099)"],
  // The accident layers' city detail (V4: keys in jsonb, JSONB below). Distances inside Sweden.
  "olycksfacit_lager.detalj.stad.varnande_km": [0, 2000, "km till närmaste varnande stadspunkt i gruppen (sql/100) — inom Sverige"],
  "olycksfacit_lager.detalj.varnande_km": [0, 2000, "km till närmaste varnande vägpunkt, vägpunktens del av K (sql/112) — inom Sverige"],
};

/** Identifierare är inte mätvärden. De ska inte stå som obesiktigade — men de ska inte heller
 *  kunna bära en tröskel, så de får en egen kategori i stället för att tigas ihjäl. */
export const IDFALT = new Set(["id", "event_id", "area_id", "warning_id", "camera_id", "segment_id"]);

/** THE ROAD STATE'S WORDS AND THE ENGINE'S ANSWER (DECISIONS #915; Bengt 20/11: "gör en koppling mellan de olika"). Two lists answer two
 *  questions: ORD.condition_info below answers "has a person read this word?", the engine's SLIPPERY_INFO/SLIPPERY_STAM answer "does
 *  this word make the voice speak on Normalt (code 1)?". They stay two, bound here: each word that stands in the list carries the
 *  engine's answer, and test/halkorden.test.ts runs the engine over every word and fails when an answer differs. So a new word gets
 *  both answers before it stands in the list, and a change of the engine's words shows up as a word whose answer moved. */
export type Halt = "halt" | "inte halt";
export const VAGLAGSORD: Record<string, Halt> = {
  "torrt": "inte halt", "våt": "inte halt", "fläckvis våt": "inte halt", "fläckvis torrt": "inte halt",
  "is": "halt", "fläckvis is": "halt", "is med bart i hjulspår": "halt", "fläckvis is med bart i hjulspår": "halt",
  "lössnö": "halt", "fläckvis lössnö": "halt", "packad snö": "halt", "fläckvis packad snö": "halt",
  "moddig vägbana": "halt", "fläckvis moddig vägbana": "halt", "moddsträngar": "halt", "fläckvis moddsträngar": "halt",
};
/** What the engine does with a road-state word on its own (code 1): the same test as engine.ts evaluateSegment. */
export const motornsSvar = (ord: string): Halt => (SLIPPERY_INFO.test(ord) || SLIPPERY_STAM.test(ord) ? "halt" : "inte halt");

/** ORDLISTOR (körlistan B3, 17/11 2026). Ett textfält som är en KODLISTA och bär en mätning deklareras här med varje ord det får
 *  innehålla, i gemener. Ett ord utanför listan är OKÄNT ORD och ett hinder, av samma skäl som ett tal utanför spannet: koden som
 *  läser fältet vet inte vad ordet betyder. `precipitation` är skälet att listan finns: "no" betyder torrt, och Boolean("no") är
 *  sant (huvudet ovan). Bara deklarerade textfält skannas: de flesta textfält är fritext eller identifierare, och ett textfält som
 *  börjar bära en mätning deklareras här innan det används. */
export const ORD: Record<string, { ord: string[]; not: string }> = {
  precipitation: { ord: ["no", "dry", "rain", "snow", "sleet", "freezing_rain", "yes"],
    not: "stationens nederbördsklass: no och dry är torrt, yes är nederbörd av okänt slag. Aldrig ett sanningsvärde" },
  condition_text: { ord: ["normalt", "besvärligt (risk för)", "mycket besvärligt", "is- och snövägbana"],
    not: "Trafikverkets väglagsklass i ord, condition_code 1–4" },
  // Trafikverkets egna fält på väglaget (sql/116, DECISIONS #897): textlistor, ett ord per element. Orden är de som fanns 17/11
  // (#890, 818 sträckor). Rutan visar dem ordagrant, så ett ord utanför listan ska läsas av en människa innan det står kvar där.
  // Åtgärden (trv_atgard) är fri text med tidsfönster och ingen kodlista.
  // Snödrev kom 20/11 (värdevakten 44692577425, läst ur driften 44695667709; Bengt 20/11: "De okända orden bör läggas till i ordlistan").
  trv_varning: { ord: ["risk för halka", "hal vägbana", "snörök", "snödrev"], not: "Trafikverkets varning på sträckan (Warning). Visas ordagrant, avgör inget" },
  // Snöfall och smältvatten kom redan den första timmen i drift (17/11 kl. 15 UTC): listan från morgonen var inte hela ordförrådet.
  // Underkylt regn kom 20/11, samma läsning som Snödrev.
  trv_orsak: { ord: ["regn", "fallande temperatur", "frost", "snöfall", "smältvatten", "underkylt regn"], not: "Trafikverkets orsak till väglaget (Cause). Visas ordagrant, avgör inget" },
  // The road state's word list, where the rule and K2a in the moisture shadow read Våt (sql/091, sql/127; halkvakt-kuvos F74 §5). Only the
  // words the repo has seen in the archive are here (docs/TILL-AXEL-HALKORDEN.md, 21/2–25/8 2026), and since 20/11 the winter's words: the
  // value guard 44692577425 named them as OKÄNT ORD, and every distinct word in road_conditions and 60 days of road_condition_history was
  // read from drift (DB-knappen 44695667709; Bengt 20/11: "De okända orden bör läggas till i ordlistan"). The winter's words are ice,
  // snow and slush. They are declared here only so that the field passes the guard: the rule and K2a still read Våt alone. The words and
  // the engine's answer for each live in VAGLAGSORD above (#915).
  condition_info: { ord: Object.keys(VAGLAGSORD),
    not: "Trafikverkets väglagsord på sträckan (ConditionInfo), en textlista. Våt är fukten i regeln och i fuktskuggans K2a; fläckvis Våt räknas inte" },
  // The moisture shadow's own codes (sql/127). The areas and layers are the four switches in sql/089.
  status: { ord: ["räknad", "tyst", "av"], not: "fuktskuggans körning: räknad, tyst (kandidatens timme saknas) eller av (alla brytare av)" },
  brytare: { ord: ["stor-stockholm/b", "stor-göteborg/b", "stor-malmö/b", "stor-stockholm/c"], not: "brytarna som var på vid körningen, område/lager" },
  omrade: { ord: ["stor-stockholm", "stor-göteborg", "stor-malmö"], not: "storstadens område (sql/089)" },
  lager: { ord: ["b", "c"], not: "stadspunktens lager: B statliga vägar, C kommunala gator (sql/089)" },
  // The cities in säsongsfacit (TROSKLAR-SASONGSFACIT §11.7 V2 and V3, DECISIONS #913). The plain omrade, lager and brytare above hold
  // for the city log and the aggregate as well; a column whose name means something else in its table is declared under its table.
  "ny_kandidat_skugga_stad_korning.status": { ord: ["räknad", "tyst", "av"], not: "stadsloggens körning (sql/096): räknad, tyst (den nyas timme saknas) eller av (alla brytare av)" },
  "olycksfacit_lager.lager": { ord: ["a1", "k", "a2", "radar", "tackning", "smavag"], not: "olycksfacits lager (sql/084, sql/110), inte stadspunktens" },
  "olycksfacit_lager.detalj.stad.orsak": { ord: ["varnar", "fukt saknades", "spridningsspärren", "veto", "yta över 0", "ingen timme", "gallrad",
    "inget värde", "brytaren av"], not: "stadspunktens besked vid olyckan (olycksfacit_k_stad, sql/100)" },
  "olycksfacit_lager.detalj.stad.omrade": { ord: ["stor-stockholm", "stor-göteborg", "stor-malmö"], not: "stadspunktens område (sql/089)" },
  "olycksfacit_lager.detalj.stad.lager": { ord: ["b", "c"], not: "stadspunktens lager (sql/089)" },
  "sasongsfacit_stad_dag.dygnsdel": { ord: ["natt", "morgonrusning", "dag", "kvällsrusning", "kväll"], not: "tid på dygnet i svensk tid (TROSKLAR-SASONGSFACIT §5)" },
  "sasongsfacit_stad_dag.niva": { ord: ["drift", "inte ny", "undantag"], not: "nivån: i drift, eller ett av de två undantagen i §11.2" },
  "fuktskugga_timmar.dygn": { ord: ["dag", "natt"], not: "dag = 07–18 svensk tid (sql/138)" },
  "fuktskugga_olycka.dygn": { ord: ["dag", "natt"], not: "dag = 07–18 svensk tid (sql/138)" },
  "fuktskugga_timmar.hink": { ord: [...HINKAR], not: "väderhinken (sql/138, HINKAR i olycksfacit/vyn.ts)" },
  "fuktskugga_olycka.hink": { ord: [...HINKAR], not: "väderhinken vid olyckan; NULL utan station inom 15 km (sql/138)" },
};

/** FLAGGOR (körlistan B3, 17/11 2026). Ett sanningsvärde som bär en mätning deklareras här med vad sant betyder. NULL betyder alltid
 *  "mäts inte" och aldrig falskt (sql/043). En flagga har inget spann att bryta, så besiktningen är deklarationen och en utskrift
 *  som en människa läser: täckningen, andelen sant, och stationerna där flaggan aldrig eller alltid är sann. */
export const FLAGGOR: Record<string, string> = {
  rain: "stationens regnflagga", snow: "stationens snöflagga",
  surface_water: "ytstatusgivaren: vatten på vägbanan (Surface.Water, omkring 50 stationer); NULL = ingen givare",
  surface_ice: "ytstatusgivaren: is på vägbanan (Surface.Ice); markerar inte is tillförlitligt (kort #324)",
  surface_snow: "ytstatusgivaren: snö på vägbanan (Surface.Snow)",
  vat: "kandidatens domlogg: sträckans väglag säger våt", flackvis_vat: "kandidatens domlogg: sträckans väglag säger fläckvis våt",
  // The small-road voice's rows (sql/105; DECISIONS #828, #908, halkvakt-kuvos F75 §13 point 1): ned is the rule's moisture, and the rule
  // already reads it, so it is declared now that smavag_live is in TID below.
  ned: "småvägsröstens fukt i regeln: kuvösens strängare N3, nederbörd i timmen eller de tre före (sql/105)",
  // The accident layers (TROSKLAR-SASONGSFACIT §11.5, §11.7 V3, DECISIONS #913): which layers warned, and the city point's detail.
  "olycksfacit_lager.talar": "lagret varnade när olyckan började (sql/084); NULL för radarn och täckningen",
  // The weekly report (körlistan D1, DECISIONS #951) counts J1 and J2 only on days where this is true.
  "sasongsfacit_dag.jamforelser": "säsongsfacit: stationsraderna fanns för dygnet, så J1 och J2 gick att räkna (sql/099)",
  "olycksfacit_lager.detalj.stad.aktiv": "stadspunktens brytare var på vid olyckans timme (sql/096)",
  "olycksfacit_lager.detalj.stad.talar": "stadspunkten varnade inom 2 km vid olyckan (sql/100)",
  "fuktskugga_olycka.a2_nu": "en station inom 5 km med yta högst +1 °C och nederbörd de två timmarna före olyckan (sql/138)",
  "fuktskugga_olycka.forslag": "förslag 2: en station inom 15 km med yta högst +1 °C och nederbörd eller yta under daggpunkten (sql/138)",
  "strackdel_timme.vinterord": "sträckans ord bär motorns halkord (is, snö, frost, modd …), inte bara klassen (sql/143)",
  "strackdel_olycka.vinterord": "A1:s sträcka bar motorns halkord vid starten (sql/143)",
  "strackdel_olycka.halkord": "olycksfacits halkord i texten vid fångsten eller efteråt — facit oberoende av stationen och A1 (sql/143)",
  "vagnummer_punkt.europavag": "NVDB Vägnummer säger Europaväg (−1 i API:et; sql/144)",
};
/** Statusflaggor är bokföring, inte mätvärden: samma kategori som identifierarna. */
export const STATUSFLAGGOR = new Set(["deleted"]);

/** V2 (TROSKLAR-SASONGSFACIT §11.7, DECISIONS #913): a declaration under "table.column" holds in that table and goes before the
 *  column's name, so the same name can mean different things in different tables (punkter is a road segment's points in the domlogg and
 *  a city group's in the city log; lager is a city layer in the city log and an accident layer in olycksfacit_lager). A key in jsonb is
 *  declared as "table.column.key.key" (V4, JSONB below). */
export const spannFor = (tabell: string, kolumn: string) => SPANN[`${tabell}.${kolumn}`] ?? SPANN[kolumn];
export const ordFor = (tabell: string, kolumn: string) => ORD[`${tabell}.${kolumn}`] ?? ORD[kolumn];
export const flaggaFor = (tabell: string, kolumn: string) => FLAGGOR[`${tabell}.${kolumn}`] ?? FLAGGOR[kolumn];

/** V4 (TROSKLAR-SASONGSFACIT §11.7, DECISIONS #913): the guard cannot list the keys of a jsonb column, so every key that carries a
 *  number is declared here with its path and its kind, and judged by its declaration under "table.column.key.key" in SPANN, ORD or
 *  FLAGGOR. A list is a jsonb array of words, judged word by word. A key that is not here is not scanned, as an undeclared text column. */
export const JSONB: { tabell: string; falt: string; slag: "tal" | "ord" | "flagga" | "lista" }[] = [
  // brytare decides whether an hour is in drift (§11.3); an unknown combination would otherwise count silently as brytaren av.
  { tabell: "ny_kandidat_skugga_stad_korning", falt: "brytare", slag: "lista" },
  { tabell: "olycksfacit_lager", falt: "detalj.stad.aktiv", slag: "flagga" },
  { tabell: "olycksfacit_lager", falt: "detalj.stad.talar", slag: "flagga" },
  { tabell: "olycksfacit_lager", falt: "detalj.stad.orsak", slag: "ord" },
  { tabell: "olycksfacit_lager", falt: "detalj.stad.omrade", slag: "ord" },
  { tabell: "olycksfacit_lager", falt: "detalj.stad.lager", slag: "ord" },
  { tabell: "olycksfacit_lager", falt: "detalj.stad.varnande_km", slag: "tal" },
  { tabell: "olycksfacit_lager", falt: "detalj.varnande_km", slag: "tal" },
];

/** THE TABLES WHOSE NUMBERS NEVER GO INTO A LOG (TROSKLAR-SASONGSFACIT §11.8, sql/096, #768): the city points' and groups' tables and the
 *  section's own. The guard judges them like every other table, but its output, which goes to the public step summary, says only the
 *  verdict: no row count, no minimum or maximum, no share and no count of a word. */
export const UTAN_TAL = new Set(["ny_kandidat_skugga_stad", "ny_kandidat_skugga_stad_korning", "olycksfacit_lager", "sasongsfacit_stad_dag",
  "ny_kandidat_fuktskugga_stad", "ny_kandidat_fuktskugga_stad_korning", "ny_kandidat_met_stad", "radar_stad"]);
/** The verdict of a field in UTAN_TAL, in words: the reasons above carry the field's own numbers. */
export function utanTal(d: Dom): string {
  if (d.utfall === "OK") return "inom sitt deklarerade spann, sin ordlista eller sin flagga";
  if (d.utfall === "UTANFÖR SPANN") return "utanför det deklarerade spannet, eller värden av fel slag";
  if (d.utfall === "SENTINEL?") return "ett takvärde tar en stor andel av fältet";
  if (d.utfall === "–") return "för få rader för en dom";
  return d.varfor.replace(/\d/g, "#");
}

export type Falt = {
  tabell: string; kolumn: string; rader: number; nollor: number;
  min: number | null; max: number | null; distinkta: number;
  toppVarde: number | null; toppAndel: number;
};

export type Dom = { utfall: "OK" | "OBESIKTIGAT" | "UTANFÖR SPANN" | "SENTINEL?" | "OKÄNT ORD" | "ID" | "–"; varfor: string };

export type OrdFalt = { tabell: string; kolumn: string; rader: number; varden: { ord: string; n: number }[] };
/** Domen för en kodlista i text: varje ord ska stå i den deklarerade ordlistan, oavsett versaler. Ett okänt väglagsord (condition_info)
 *  bär motorns svar, så att den som läser ser båda frågorna på en gång (#915). */
export function domaOrd(f: OrdFalt): Dom {
  const d = ordFor(f.tabell, f.kolumn);
  if (!d) return { utfall: "OBESIKTIGAT", varfor: "ingen deklarerad ordlista — får inte bära en mätning" };
  if (f.rader < MIN_RADER) return { utfall: "–", varfor: `${f.rader} rader, kräver ${MIN_RADER}` };
  const okanda = f.varden.filter((v) => !d.ord.includes(v.ord.toLowerCase()));
  const svar = (ord: string) => (f.kolumn === "condition_info" ? `; motorn: ${motornsSvar(ord)}` : "");
  if (okanda.length) return { utfall: "OKÄNT ORD", varfor: `${okanda.slice(0, 5).map((v) => `"${v.ord}" (${v.n}${svar(v.ord)})`).join(", ")} står inte i ordlistan` };
  return { utfall: "OK", varfor: d.not };
}

export type FlaggFalt = { tabell: string; kolumn: string; rader: number };
/** Domen för en flagga: deklarationen. Obesiktigat slår allt annat, som för talen. */
export function domaFlagga(f: FlaggFalt): Dom {
  if (STATUSFLAGGOR.has(f.kolumn)) return { utfall: "ID", varfor: "statusflagga — bokföring, inte ett mätvärde" };
  const d = flaggaFor(f.tabell, f.kolumn);
  if (!d) return { utfall: "OBESIKTIGAT", varfor: "ingen deklarerad flagga — får inte bära en mätning" };
  if (f.rader < MIN_RADER) return { utfall: "–", varfor: `${f.rader} rader, kräver ${MIN_RADER}` };
  return { utfall: "OK", varfor: d };
}

/** Domen för ett fält. Ordningen är avsiktlig: obesiktigat slår allt annat, för ett fält vi inte
 *  vet något om kan inte friskförklaras av att dess tal råkar se rimliga ut. */
export function doma(f: Falt): Dom {
  if (IDFALT.has(f.kolumn)) return { utfall: "ID", varfor: "identifierare — inte ett mätvärde, får inte bära en tröskel" };
  const s = spannFor(f.tabell, f.kolumn);
  if (!s) return { utfall: "OBESIKTIGAT", varfor: "inget deklarerat spann — får inte bära en mätning" };
  if (f.rader < MIN_RADER) return { utfall: "–", varfor: `${f.rader} rader, kräver ${MIN_RADER}` };
  const [lo, hi, enhet] = s;
  if (f.min !== null && f.min < lo) return { utfall: "UTANFÖR SPANN", varfor: `min ${f.min} < ${lo} ${enhet}` };
  if (f.max !== null && f.max > hi) return { utfall: "UTANFÖR SPANN", varfor: `max ${f.max} > ${hi} ${enhet}` };
  if (f.distinkta >= MANGA_DISTINKTA && f.toppAndel >= DOMINANS && f.toppVarde === f.max)
    return { utfall: "SENTINEL?", varfor: `TAKVÄRDET ${f.toppVarde} tar ${(100 * f.toppAndel).toFixed(1)} % av ${f.distinkta} distinkta` };
  return { utfall: "OK", varfor: `${f.min}…${f.max} ${enhet}` };
}

const ikon = (u: Dom["utfall"]) =>
  u === "OK" ? "✅" : u === "OBESIKTIGAT" ? "⊘" : u === "–" ? "·" : u === "ID" ? "🔖" : "⚠️";

// Körs filen själv, eller importeras SPANN av en annan vakt (vägdatalagrets hämtare, kort #301)? Importerad kör den varken
// självtest eller huvudvarv — spannen är det som delas.
const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
// ── Självtest: de fyra verkliga fallen från 12/9, plus ett obesiktigat fält.
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — värdevakten mot de fyra fall som faktiskt lurade oss\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); ok = false; }
    else console.log(`  ok: ${namn} = ${fick}`);
  };
  const f = (kolumn: string, o: Partial<Falt> = {}): Falt => ({
    tabell: "t", kolumn, rader: 10000, nollor: 0, min: 0, max: 1, distinkta: 500,
    toppVarde: 0, toppAndel: 0.001, ...o });
  // 1. Byvinden 85,5 m/s — hade fastnat på spannet.
  k("byvind 85,5 m/s fälls", doma(f("wind_gust_ms", { min: 0, max: 85.5 })).utfall, "UTANFÖR SPANN");
  k("byvind 25 m/s passerar", doma(f("wind_gust_ms", { min: 0, max: 25 })).utfall, "OK");
  // 2. Sikten: 20 000 i halva materialet — dominansen fångar den även inom spannet.
  k("sikt 20 000 i 50 % fälls som sentinel",
    doma(f("visibility_m", { min: 8, max: 20000, distinkta: 4000, toppVarde: 20000, toppAndel: 0.5 })).utfall, "SENTINEL?");
  k("sikt utan dominans passerar",
    doma(f("visibility_m", { min: 8, max: 19000, distinkta: 4000, toppVarde: 12000, toppAndel: 0.01 })).utfall, "OK");
  // 3. Kodlistor ska INTE fällas för dominans — condition_code 1 är legitimt vanligast.
  k("väglagsklass 1 i 80 % är inte en sentinel",
    doma(f("condition_code", { min: 1, max: 4, distinkta: 4, toppVarde: 1, toppAndel: 0.8 })).utfall, "OK");
  k("väglagsklass 7 fälls på spannet",
    doma(f("condition_code", { min: 1, max: 7, distinkta: 5 })).utfall, "UTANFÖR SPANN");
  // 4. Molnmängden 113 % — utanför skalan, hade fastnat om fältet fanns i arkivet.
  k("molnliknande 113 mot 0–100 fälls", doma(f("humidity_pct", { min: 0, max: 113 })).utfall, "UTANFÖR SPANN");
  // 5. Det obekväma: ett nytt fält är OBESIKTIGAT tills någon deklarerar det.
  k("okänt fält är obesiktigat", doma(f("nytt_falt_2027")).utfall, "OBESIKTIGAT");
  k("obesiktigat slår även rimliga tal",
    doma(f("nytt_falt_2027", { min: 0, max: 1, distinkta: 2 })).utfall, "OBESIKTIGAT");
  // 6. DE FALSKA LARMEN FRÅN FÖRSTA KÖRNINGEN — noll nederbörd är väder, inte en sentinel.
  k("noll regn i 58 % är inte en sentinel",
    doma(f("rain_sum_mm", { min: 0, max: 24.2, distinkta: 123, toppVarde: 0, toppAndel: 0.583 })).utfall, "OK");
  k("noll snö i 99,9 % är inte en sentinel",
    doma(f("snow_wateq_mm", { min: 0, max: 1.05, distinkta: 68, toppVarde: 0, toppAndel: 0.999 })).utfall, "OK");
  k("vanlig låg vind i 7 % är inte en sentinel",
    doma(f("wind_speed_ms", { min: 0.1, max: 12.2, distinkta: 119, toppVarde: 0.5, toppAndel: 0.068 })).utfall, "OK");
  k("identifierare är inte obesiktigad", doma(f("event_id", { min: 1, max: 9e5 })).utfall, "ID");
  k("radarartefakt 727 mm/h fälls",
    doma(f("rate_max_mmh", { min: 0.1, max: 727.54, distinkta: 117 })).utfall, "UTANFÖR SPANN");
  // 6. Underlagsvakten.
  k("för få rader ger ingen dom", doma(f("wind_gust_ms", { rader: 99 })).utfall, "–");
  k("byggtiden som mättes 17/11 passerar", doma(f("bygget_ms", { min: 7668, max: 9566 })).utfall, "OK");
  k("en byggtid på en timme fälls", doma(f("bygget_ms", { min: 7668, max: 3_600_000 })).utfall, "UTANFÖR SPANN");
  k("deklarationen täcker de fält motorn läser",
    ["surface_temp_c", "severity_code", "speed_limit_kmh", "bearing"].every((x) => x in SPANN), true);
  // 7. Ordlistor och flaggor (körlistan B3): det som inte är tal men ändå bär en mätning.
  const o = (kolumn: string, varden: [string, number][], rader?: number): OrdFalt => ({
    tabell: "t", kolumn, varden: varden.map(([ord, n]) => ({ ord, n })), rader: rader ?? varden.reduce((s, v) => s + v[1], 0) });
  k("nederbördens ord passerar", domaOrd(o("precipitation", [["no", 9000], ["rain", 800], ["snow", 200]])).utfall, "OK");
  k("versaler gör inget ord okänt", domaOrd(o("precipitation", [["no", 9000], ["Dry", 500]])).utfall, "OK");
  k("ett ord utanför listan fälls", domaOrd(o("precipitation", [["no", 9000], ["hail", 3]])).utfall, "OKÄNT ORD");
  k("väglagsklassens ord passerar", domaOrd(o("condition_text", [["Normalt", 600], ["Besvärligt (risk för)", 180]])).utfall, "OK");
  k("Trafikverkets varningar från 17/11 passerar", domaOrd(o("trv_varning", [["Risk för halka", 154], ["Hal vägbana", 2], ["Snörök", 1]])).utfall, "OK");
  k("en varning som inte har setts förut fälls", domaOrd(o("trv_varning", [["Risk för halka", 154], ["Översvämning", 4]])).utfall, "OKÄNT ORD");
  k("vinterns varning och orsak 20/11 passerar", domaOrd(o("trv_varning", [["Risk för halka", 154], ["Snödrev", 9]])).utfall === "OK"
    && domaOrd(o("trv_orsak", [["Snöfall", 142], ["Underkylt regn", 16]])).utfall === "OK", true);
  k("vinterns väglagsord 20/11 passerar", domaOrd(o("condition_info", [["Våt", 431], ["fläckvis Is med bart i hjulspår", 55], ["Lössnö", 145],
    ["fläckvis Moddsträngar", 64], ["Packad snö", 20]])).utfall, "OK");
  k("ett väglagsord utanför listan fälls", domaOrd(o("condition_info", [["Våt", 431], ["Spårslitage", 12]])).utfall, "OKÄNT ORD");
  k("ett okänt väglagsord bär motorns svar (#915)", domaOrd(o("condition_info", [["Våt", 431], ["Spårslitage", 12], ["Snömodd", 3]])).varfor,
    `"Spårslitage" (12; motorn: inte halt), "Snömodd" (3; motorn: halt) står inte i ordlistan`);
  k("Trafikverkets orsaker från 17/11 passerar", domaOrd(o("trv_orsak", [["Fallande temperatur", 71], ["Regn", 34], ["Frost", 18], ["Snöfall", 14], ["Smältvatten", 1]])).utfall, "OK");
  k("odeklarerad kodlista är obesiktigad", domaOrd(o("ny_kodlista_2027", [["a", 9000]])).utfall, "OBESIKTIGAT");
  k("för få rader ger ingen dom för en ordlista", domaOrd(o("precipitation", [["hail", 3]])).utfall, "–");
  k("ytvattnets flagga är deklarerad", domaFlagga({ tabell: "t", kolumn: "surface_water", rader: 5000 }).utfall, "OK");
  k("odeklarerad flagga är obesiktigad", domaFlagga({ tabell: "t", kolumn: "ny_flagga_2027", rader: 5000 }).utfall, "OBESIKTIGAT");
  k("statusflagga är inte ett mätvärde", domaFlagga({ tabell: "t", kolumn: "deleted", rader: 5000 }).utfall, "ID");
  k("flagga med för få rader får ingen dom", domaFlagga({ tabell: "t", kolumn: "surface_water", rader: 12 }).utfall, "–");
  k("ordet no är sant som sanningsvärde, därför en ordlista", Boolean("no") && ORD.precipitation.ord.includes("no"), true);
  // MET:s daggpunkt vid stadspunkterna (#908): F38:s spann, strängare än stationernas.
  k("MET:s daggpunkt −52 °C fälls", doma(f("met_td_c", { min: -52, max: 2 })).utfall, "UTANFÖR SPANN");
  k("MET:s daggpunkt +31 °C fälls", doma(f("met_td_c", { min: -20, max: 31 })).utfall, "UTANFÖR SPANN");
  k("samma −52 °C passerar som stationens daggpunkt", doma(f("dewpoint_c", { min: -52, max: 2 })).utfall, "OK");
  k("MET:s fukt som procent fälls", doma(f("rh2m", { min: 0.3, max: 95 })).utfall, "UTANFÖR SPANN");
  k("småvägsröstens ned är deklarerad", domaFlagga({ tabell: "smavag_live", kolumn: "ned", rader: 5000 }).utfall, "OK");
  // 8. Storstäderna i säsongsfacit (TROSKLAR-SASONGSFACIT §11.7, DECISIONS #913): tabellens nyckel före kolumnens (V2), och jsonb (V4).
  k("stadsloggens 70 punkter i en grupp passerar", doma({ ...f("punkter", { max: 70 }), tabell: "ny_kandidat_skugga_stad" }).utfall, "OK");
  k("samma 70 punkter på en vägsträcka fälls", doma({ ...f("punkter", { max: 70 }), tabell: "ny_kandidat_skugga" }).utfall, "UTANFÖR SPANN");
  k("en negativ ytan över 0 fälls", doma({ ...f("ytan_over_0", { min: -1, max: 40 }), tabell: "sasongsfacit_stad_dag" }).utfall, "UTANFÖR SPANN");
  k("26 timmar på ett dygn fälls", doma({ ...f("timmar_raknad", { max: 26 }), tabell: "sasongsfacit_stad_dag" }).utfall, "UTANFÖR SPANN");
  k("aggregatets kolumn utan tabellen är obesiktigad", doma(f("timmar_raknad", { max: 3 })).utfall, "OBESIKTIGAT");
  k("olycksfacits lager passerar under sin tabell", domaOrd({ ...o("lager", [["A1", 300], ["K", 300], ["tackning", 300]]), tabell: "olycksfacit_lager" }).utfall, "OK");
  k("samma lager i stadsloggen är okända ord", domaOrd({ ...o("lager", [["A1", 300], ["K", 300]]), tabell: "ny_kandidat_skugga_stad" }).utfall, "OKÄNT ORD");
  k("stadspunktens besked passerar", domaOrd({ ...o("detalj.stad.orsak", [["varnar", 80], ["brytaren av", 40]]), tabell: "olycksfacit_lager" }).utfall, "OK");
  k("ett besked som inte finns fälls", domaOrd({ ...o("detalj.stad.orsak", [["varnar", 80], ["ingen stadspunkt", 40]]), tabell: "olycksfacit_lager" }).utfall, "OKÄNT ORD");
  k("stadspunktens flagga är deklarerad", domaFlagga({ tabell: "olycksfacit_lager", kolumn: "detalj.stad.aktiv", rader: 500 }).utfall, "OK");
  k("en jsonb-nyckel utan deklaration är obesiktigad", domaFlagga({ tabell: "olycksfacit_lager", kolumn: "detalj.stad.ny", rader: 500 }).utfall, "OBESIKTIGAT");
  k("varnande_km 2 500 km fälls", doma({ ...f("detalj.stad.varnande_km", { max: 2500 }), tabell: "olycksfacit_lager" }).utfall, "UTANFÖR SPANN");
  k("varje jsonb-nyckel har sin deklaration", JSONB.every((j) => j.slag === "tal" ? !!spannFor(j.tabell, j.falt) : j.slag === "flagga" ? !!flaggaFor(j.tabell, j.falt)
    : !!ordFor(j.tabell, j.falt)), true);
  k("ett fält utan tal skriver inget tal", /\d/.test(utanTal(doma({ ...f("punkter", { min: 0, max: 100001 }), tabell: "ny_kandidat_skugga_stad" }))), false);
  k("ett okänt ord utan tal skriver inget antal", /\d/.test(utanTal(domaOrd({ ...o("status", [["räknad", 300], ["ny", 12]]), tabell: "ny_kandidat_skugga_stad_korning" }))), false);
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK: alla fyra fall som lurade oss 12/9 fastnar, kodlistor fälls inte");
  console.log("för dominans, och ett odeklarerat fält är obesiktigat även när talen ser rimliga ut.");
  process.exit(0);
}

if (korsSjalv) {
// ── Skarpt (läser bara).
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const DAGAR = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 30);
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await pool.query("SET statement_timeout = '600s'");
const q = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows as any[];

// Tidskolumn per tabell, så stora tabeller kan fönstras. Speglar scripts/kallkollen.ts.
const TID: Record<string, string> = {
  weather_observations: "sample_time", weather_latest: "sample_time",
  road_conditions: "modified_time", road_condition_history: "modified_time",
  radar_precip: "observed_at", situation_archive: "last_seen", shadow_log: "run_at",
  polisen_events: "ingested_at", smhi_warnings: "published", smhi_warnings_history: "published",
  cameras: "modified_time", deviations: "start_time",
  // 15/9: tabellen saknades här, så dess fält skannades aldrig — inte ens som OBESIKTIGADE.
  trend_kandidater: "observed_at",
  // Kort #257: den stigande halvan, samma kolumner och spann — fött besiktigad, inte upptäckt i efterhand som trend_kandidater.
  trend_stigande: "observed_at",
  // Kort #343: kandidatens två tabeller (sql/050). Utan raden här skannas deras fält aldrig, inte ens som OBESIKTIGADE
  // — samma fälla som trend_kandidater gick i 15/9.
  kandidat_ph: "tid", kandidat_live: "tid",
  // DECISIONS #573/#575: domloggen och stationsvärdena — de bär måtten i mars.
  kandidat_skugga: "observed_at", kandidat_station: "observed_at",
  // Den nya kandidatens skugga (sql/068, DECISIONS #692): samma kolumner som den frystas, alltså samma spann — fött besiktigad.
  ny_kandidat_ph: "tid", ny_kandidat_live: "tid", ny_kandidat_skugga: "observed_at", ny_kandidat_station: "observed_at",
  // Publiceringens byggtid (sql/115, DECISIONS #896): bär avbrottsvillkoret i #833 — fött besiktigad.
  publicera_bygge: "t",
  // The moisture shadow in the cities and its runs (sql/127, DECISIONS #907): born inspected, with the time columns of the export.
  ny_kandidat_fuktskugga_stad: "observed_at", ny_kandidat_fuktskugga_stad_korning: "korning",
  // Svartis and rimfrost (DECISIONS #908; halkvakt-kuvos F75 §8, §13 point 1): MET's moisture at the city points (sql/126), born
  // inspected; and the three tables the rules already read, which were missing here, so their fields were never scanned, not even as
  // OBESIKTIGADE: the small roads' rows (sql/105) and the radar per city group and per small-road piece (sql/090, sql/104).
  ny_kandidat_met_stad: "tid", smavag_live: "tid", radar_stad: "observed_at", radar_smavag: "observed_at",
  // The cities in säsongsfacit (TROSKLAR-SASONGSFACIT §11.7 V1, DECISIONS #913): the city log and its runs (sql/096), which were missing
  // here, so their fields were never scanned, not even as OBESIKTIGADE (the trap of trend_kandidater 15/9); the accident layers (sql/084),
  // without a time column and so scanned whole; and the daily aggregate (sql/128), born inspected.
  ny_kandidat_skugga_stad: "observed_at", ny_kandidat_skugga_stad_korning: "korning", olycksfacit_lager: "", sasongsfacit_stad_dag: "dag",
  // Fuktskuggan och basfrekvensen (sql/138, DECISIONS #940), födda besiktigade.
  fuktskugga_timmar: "dag", fuktskugga_olycka: "dag", strackdel_timme: "timme", strackdel_olycka: "dag", vagnummer_punkt: "hamtad",
  // The weekly report (körlistan D1, DECISIONS #951): the counter and säsongsfacit's three tables, which were missing here, so their
  // fields were never scanned, not even as OBESIKTIGADE.
  app_raknare: "dag", lagesfil_dag: "dag", sasongsfacit_dag: "dag", sasongsfacit_ledtid: "dag", sasongsfacit_olyckor: "dag",
};

console.log(`Värdevakten — besiktning av arkivets numeriska fält (${DAGAR} dygns fönster)\n`);

// Schemat läses UR DATABASEN, inte ur en lista här. Ett nytt fält är därmed med från dag ett.
const kolumner = await q(`
  SELECT table_name, column_name, data_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND data_type IN ('numeric','integer','bigint','smallint','double precision','real')
    AND table_name = ANY($1::text[])
  ORDER BY table_name, ordinal_position`, [Object.keys(TID)]);
console.log(`Schemat ur databasen: ${kolumner.length} numeriska fält i ${new Set(kolumner.map((k) => k.table_name)).size} tabeller.`);
console.log(`Deklarerade spann: ${Object.keys(SPANN).length}.\n`);

const falt: { f: Falt; d: Dom }[] = [];
for (const { table_name: t, column_name: c } of kolumner) {
  const fonster = TID[t] ? `WHERE ${TID[t]} > now() - ${DAGAR} * interval '1 day'` : "";
  const g = (await q(`SELECT count(*)::bigint AS rader,
      count(*) FILTER (WHERE "${c}" IS NULL)::bigint AS nollor,
      min("${c}") AS mn, max("${c}") AS mx, count(DISTINCT "${c}")::bigint AS distinkta
    FROM "${t}" ${fonster}`))[0];
  const rader = Number(g.rader) - Number(g.nollor);
  let toppVarde: number | null = null, toppAndel = 0;
  if (rader > 0) {
    const topp = (await q(`SELECT "${c}" AS v, count(*)::bigint AS n FROM "${t}"
      ${fonster} ${fonster ? "AND" : "WHERE"} "${c}" IS NOT NULL
      GROUP BY 1 ORDER BY 2 DESC LIMIT 1`))[0];
    if (topp) { toppVarde = Number(topp.v); toppAndel = Number(topp.n) / rader; }
  }
  const f: Falt = { tabell: t, kolumn: c, rader, nollor: Number(g.nollor),
    min: g.mn === null ? null : Number(g.mn), max: g.mx === null ? null : Number(g.mx),
    distinkta: Number(g.distinkta), toppVarde, toppAndel };
  falt.push({ f, d: doma(f) });
}

let tabell = "";
for (const { f, d } of falt) {
  if (f.tabell !== tabell) { tabell = f.tabell; console.log(`\n${tabell}${UTAN_TAL.has(tabell) ? " (talen skrivs inte ut, #768)" : ""}`); }
  if (UTAN_TAL.has(f.tabell)) console.log(`  ${ikon(d.utfall)} ${f.kolumn.padEnd(22)} ${utanTal(d)}`);
  else console.log(`  ${ikon(d.utfall)} ${f.kolumn.padEnd(22)} ${String(f.rader).padStart(9)} rader · ` +
    `${f.min ?? "–"}…${f.max ?? "–"} · ${f.distinkta} distinkta` +
    (f.toppVarde !== null && f.toppAndel >= 0.05 ? ` · vanligast ${f.toppVarde} (${(100 * f.toppAndel).toFixed(0)} %)` : ""));
  if (d.utfall !== "OK" && !UTAN_TAL.has(f.tabell)) console.log(`     ${d.utfall}: ${d.varfor}`);
}

// ── Flaggor och ordlistor (körlistan B3, 17/11): det numeriska varvet ovan ser dem inte, och F-halka i kuvösens prov vilar på två.
const ovriga: { namn: string; d: Dom }[] = [];
const fonsterFor = (t: string) => (TID[t] ? `WHERE ${TID[t]} > now() - ${DAGAR} * interval '1 day'` : "");
const flaggor = await q(`
  SELECT table_name, column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND data_type = 'boolean' AND table_name = ANY($1::text[])
  ORDER BY table_name, ordinal_position`, [Object.keys(TID)]);
const medStation = new Set((await q(`
  SELECT table_name FROM information_schema.columns
  WHERE table_schema = 'public' AND column_name = 'station_id' AND table_name = ANY($1::text[])`, [Object.keys(TID)])).map((r) => r.table_name));
console.log(`\nFLAGGOR (${flaggor.length} sanningsvärden; NULL = mäts inte)`);
for (const { table_name: t, column_name: c } of flaggor) {
  const fonster = fonsterFor(t);
  const g = (await q(`SELECT count(*)::bigint AS alla, count("${c}")::bigint AS rader, count(*) FILTER (WHERE "${c}")::bigint AS sant
    FROM "${t}" ${fonster}`))[0];
  const rader = Number(g.rader), d = domaFlagga({ tabell: t, kolumn: c, rader });
  if (UTAN_TAL.has(t)) {
    console.log(`  ${ikon(d.utfall)} ${`${t}.${c}`.padEnd(40)} ${utanTal(d)}`);
    ovriga.push({ namn: `${t}.${c}`, d });
    continue;
  }
  let stationer = "";
  if (d.utfall === "OK" && medStation.has(t)) {
    const s = (await q(`SELECT count(*)::int AS n, count(*) FILTER (WHERE sant = 0)::int AS aldrig, count(*) FILTER (WHERE sant = rader)::int AS alltid
      FROM (SELECT station_id, count("${c}") AS rader, count(*) FILTER (WHERE "${c}") AS sant FROM "${t}" ${fonster}
            GROUP BY 1 HAVING count("${c}") >= ${MIN_RADER}) x`))[0];
    stationer = ` · ${s.n} stationer med minst ${MIN_RADER} rader: ${s.aldrig} aldrig sant, ${s.alltid} alltid sant`;
  }
  console.log(`  ${ikon(d.utfall)} ${`${t}.${c}`.padEnd(40)} ${String(rader).padStart(9)} rader av ${g.alla}` +
    (rader ? ` · sant ${(100 * Number(g.sant) / rader).toFixed(1)} %` : "") + stationer);
  if (d.utfall !== "OK") console.log(`     ${d.utfall}: ${d.varfor}`);
  ovriga.push({ namn: `${t}.${c}`, d });
}
// A word list is declared under the column's name or under "table.column" (V2), so the columns are filtered here and not in the query.
const ordfalt = (await q(`
  SELECT table_name, column_name, data_type FROM information_schema.columns
  WHERE table_schema = 'public' AND (data_type IN ('text', 'character varying') OR (data_type = 'ARRAY' AND udt_name = '_text'))
    AND table_name = ANY($1::text[])
  ORDER BY table_name, ordinal_position`, [Object.keys(TID)])).filter((r) => ordFor(r.table_name, r.column_name));
console.log(`\nORDLISTOR (${ordfalt.length} deklarerade kodlistor i text)`);
for (const { table_name: t, column_name: c, data_type } of ordfalt) {
  const fonster = fonsterFor(t);
  // En textlista (text[]) räknas per element: varje ord i listan är ett värde ur kodlistan.
  const v = await q(data_type === "ARRAY"
    ? `SELECT u.ord, count(*)::bigint AS n FROM "${t}" CROSS JOIN LATERAL unnest("${c}") AS u(ord) ${fonster} GROUP BY 1 ORDER BY 2 DESC LIMIT 200`
    : `SELECT "${c}" AS ord, count(*)::bigint AS n FROM "${t}" ${fonster} ${fonster ? "AND" : "WHERE"} "${c}" IS NOT NULL
    GROUP BY 1 ORDER BY 2 DESC LIMIT 200`);
  const varden = v.map((r) => ({ ord: String(r.ord), n: Number(r.n) })), rader = varden.reduce((s, x) => s + x.n, 0);
  const d = domaOrd({ tabell: t, kolumn: c, rader, varden });
  if (UTAN_TAL.has(t)) console.log(`  ${ikon(d.utfall)} ${`${t}.${c}`.padEnd(40)} ${utanTal(d)}`);
  else {
    console.log(`  ${ikon(d.utfall)} ${`${t}.${c}`.padEnd(40)} ${String(rader).padStart(9)} rader · ` +
      varden.slice(0, 8).map((x) => `${x.ord} ${(100 * x.n / Math.max(1, rader)).toFixed(1)} %`).join(", "));
    if (d.utfall !== "OK") console.log(`     ${d.utfall}: ${d.varfor}`);
  }
  ovriga.push({ namn: `${t}.${c}`, d });
}

// ── Keys in jsonb (V4, TROSKLAR-SASONGSFACIT §11.7, DECISIONS #913): each declared key is read as a number, a word, a flag or a list of
// words, and judged by its declaration under "table.column.key.key". A value of the wrong kind is a hinder of its own.
console.log(`\nJSONB (${JSONB.length} deklarerade nycklar)`);
for (const { tabell: t, falt: namn, slag } of JSONB) {
  if (!(await q("SELECT to_regclass($1) AS t", [`public.${t}`]))[0].t) { console.log(`  · ${`${t}.${namn}`.padEnd(40)} tabellen finns inte`); continue; }
  const [kol, ...vag] = namn.split(".");
  const fonster = fonsterFor(t);
  const v = vag.length ? `"${kol}" #> '{${vag.join(",")}}'` : `"${kol}"`;
  const fran = `(SELECT ${v} AS v FROM "${t}" ${fonster}) x`;
  let d: Dom;
  if (slag === "tal") {
    const g = (await q(`SELECT count(*) FILTER (WHERE jsonb_typeof(v) = 'number')::bigint AS rader,
        count(*) FILTER (WHERE jsonb_typeof(v) NOT IN ('number', 'null'))::bigint AS fel,
        min((v #>> '{}')::numeric) FILTER (WHERE jsonb_typeof(v) = 'number') AS mn, max((v #>> '{}')::numeric) FILTER (WHERE jsonb_typeof(v) = 'number') AS mx,
        count(DISTINCT v #>> '{}') FILTER (WHERE jsonb_typeof(v) = 'number')::bigint AS distinkta FROM ${fran}`))[0];
    const topp = (await q(`SELECT (v #>> '{}')::numeric AS v, count(*)::bigint AS n FROM ${fran} WHERE jsonb_typeof(v) = 'number'
      GROUP BY 1 ORDER BY 2 DESC LIMIT 1`))[0];
    const rader = Number(g.rader);
    d = Number(g.fel) > 0 ? { utfall: "UTANFÖR SPANN", varfor: `${g.fel} värden som inte är tal` }
      : doma({ tabell: t, kolumn: namn, rader, nollor: 0, min: g.mn === null ? null : Number(g.mn), max: g.mx === null ? null : Number(g.mx),
          distinkta: Number(g.distinkta), toppVarde: topp ? Number(topp.v) : null, toppAndel: topp && rader ? Number(topp.n) / rader : 0 });
  } else if (slag === "flagga") {
    const g = (await q(`SELECT count(*) FILTER (WHERE jsonb_typeof(v) = 'boolean')::bigint AS rader,
        count(*) FILTER (WHERE jsonb_typeof(v) NOT IN ('boolean', 'null'))::bigint AS fel FROM ${fran}`))[0];
    d = Number(g.fel) > 0 ? { utfall: "OKÄNT ORD", varfor: `${g.fel} värden som inte är sanningsvärden` }
      : domaFlagga({ tabell: t, kolumn: namn, rader: Number(g.rader) });
  } else {
    // A word, or the words of a list (a value that is not a list is read as a list of one, so it can never pass unseen).
    const ord = slag === "lista"
      ? `SELECT CASE WHEN jsonb_typeof(e) = 'string' THEN e #>> '{}' ELSE e::text END AS ord, count(*)::bigint AS n FROM ${fran}
           CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(v) = 'array' THEN v ELSE jsonb_build_array(v) END) e
           WHERE v IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 200`
      : `SELECT CASE WHEN jsonb_typeof(v) = 'string' THEN v #>> '{}' ELSE v::text END AS ord, count(*)::bigint AS n FROM ${fran}
           WHERE v IS NOT NULL AND jsonb_typeof(v) <> 'null' GROUP BY 1 ORDER BY 2 DESC LIMIT 200`;
    const varden = (await q(ord)).map((r) => ({ ord: String(r.ord), n: Number(r.n) }));
    d = domaOrd({ tabell: t, kolumn: namn, rader: varden.reduce((s, x) => s + x.n, 0), varden });
  }
  console.log(`  ${ikon(d.utfall)} ${`${t}.${namn}`.padEnd(40)} ${UTAN_TAL.has(t) ? utanTal(d) : d.varfor}`);
  ovriga.push({ namn: `${t}.${namn}`, d });
}

const rakna = (u: Dom["utfall"]) => falt.filter((x) => x.d.utfall === u).length + ovriga.filter((x) => x.d.utfall === u).length;
console.log(`\nSAMMANFATTNING`);
console.log(`  ✅ ${rakna("OK")} besiktade och rimliga`);
console.log(`  ⚠️  ${rakna("UTANFÖR SPANN")} utanför deklarerat spann · ${rakna("SENTINEL?")} misstänkt sentinel · ${rakna("OKÄNT ORD")} med okänt ord`);
console.log(`  ⊘ ${rakna("OBESIKTIGAT")} OBESIKTIGADE — inget deklarerat spann, ingen ordlista eller ingen flagga`);
console.log(`  · ${rakna("–")} för tunt underlag för en dom`);

const arHinder = (u: Dom["utfall"]) => u === "OBESIKTIGAT" || u === "UTANFÖR SPANN" || u === "SENTINEL?" || u === "OKÄNT ORD";
const hinder = [...falt.filter((x) => arHinder(x.d.utfall)), ...ovriga.filter((x) => arHinder(x.d.utfall)).map((x) => ({
  f: { tabell: x.namn.slice(0, x.namn.indexOf(".")), kolumn: x.namn.slice(x.namn.indexOf(".") + 1) }, d: x.d }))];
if (hinder.length) {
  console.log(`\nFÄLT SOM INTE FÅR BÄRA EN MÄTNING, TRÖSKEL ELLER VARNING (husregeln i CLAUDE.md):`);
  for (const { f, d } of hinder) console.log(`  ${ikon(d.utfall)} ${f.tabell}.${f.kolumn} — ${UTAN_TAL.has(f.tabell) ? utanTal(d) : d.varfor}`);
  console.log(`\n  Ett obesiktigat fält friskförklaras inte av att talen ser rimliga ut. Deklarera`);
  console.log(`  spannet i SPANN här ovan, eller låt bli att bygga på fältet.`);
} else {
  console.log(`\nAlla fält är besiktade och inom sina spann.`);
}
await pool.end();
}
