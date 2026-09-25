// Grind V-B (kort #42 steg E, kort #81; docs/TROSKLAR-VATTENPLANING.md §3, fastställd av Axel
// DECISIONS #68): TALAR SKUGGAN FÖR OFTA, OCH TALAR DEN OM INGENTING?
//
// Skuggan skriver sedan 15/9 vad vattenplaningsrösten SKULLE sagt i `shadow_log.vb` (DECISIONS #191).
// Den här knappen dömer de raderna mot §3:s fällda värden — och bara dem; loggen är rå, domen räknar
// (Axel, DECISIONS #196). Ingen tröskel sätts här: utlösaren är fastställd (#155/#156) och importeras
// ur snapshotkärnan, så det finns ingen kopia att driva isär.
//
// VAD VARJE MÅTT VILAR PÅ, och var det INTE räcker:
//  · V-B1 falsklarm ≤ 20 % — mätbart nu. §2 ger stationens `rain_sum_mm` rätten att fälla: nådde
//    närmaste station aldrig tröskeln inom ±30 min är varningen falsk. Trippeldelning som i V-A
//    (BEKRÄFTAD · DELVIS · TORRT) för ärlighetens skull, men §2:s definition styr talet: allt under
//    tröskeln är falsklarm, och delvis-kolumnen står bredvid så att man ser vad man dömer.
//  · V-B3 frekvens ≤ 3 per rutt och regndygn — mätbart nu. Regndygn = ett dygn då rutten faktiskt
//    hade något att varna för; utan regn finns ingen frekvens att mäta.
//  · V-B2 missandel ≤ 40 % — INTE mätbart här, och skriptet säger det i stället för att låtsas.
//    `situation_archive` bär ingen orsak (situations.ts:37): en olycka är facit på att NÅGOT hände,
//    inte på att det var vattenplaning. Dessutom kör skuggan åtta rutter, inte hela landet — en
//    olycka någon annanstans kunde aldrig ha fått en varning. Talet redovisas som UNDERLAG.
//
// EN VARNING UTAN STATION INOM RÄCKHÅLL ÄR OMÄTBAR, aldrig "rätt". Samma nollpolitik som radarns
// `regn: null`: frånvaro av mätning är inte frånvaro av regn. De räknas separat och aldrig in i V-B1.
// MEN EN TYST STATION ÄR INTE ALLTID EN FRÅNVARANDE (kort #251, DECISIONS #351, Bengts ja 25/9): arkivet sparar bara
// kalla, blöta eller ändrade avläsningar (DECISIONS #4), så en varm, torr och stilla station lämnar ingen rad. Har den
// dömande stationen rader inom ±3 h men ingen inom ±30 min var den igång och torr — TORRT, alltså falsklarm enligt §2.
// Utan rader inom ±3 h förblir den OMÄTBAR. Regn sparas alltid (varje avläsning under regnet har regnflaggan på).
//
// FACIT FÖR V-C1 (DECISIONS #349, Bengts ja 25/9 — definitionen skriven före första räkningen): en olycka i
// situation_archive inom FACIT_KM (2 km, samma radie som den delade facitlistan) från en svensk skuggrutt, där den
// dömande stationen — samma som V-B1 — mätte regn (> 0) inom ±30 min från olyckans start. Olyckan får bara bekräfta,
// aldrig fälla (§2). Till 25/9 skrev knappen alltid 0 här, och eftersom testarlogg kräver en röst som i sin tur väntar
// på V-C kunde spärren aldrig släppa. FÖNSTRET är hela perioden sedan vb-loggens start 15/9: §3 har inget fönster.
// BLINDNINGEN (DECISIONS #350): under domspärren skrivs bara räkningar ut, aldrig en andel. Andelarna för V-B1 och V-B3
// syns först när V-C är uppfylld, så att måttet inte formas av siffror man redan sett.
//
// Run: DATABASE_URL=... node --experimental-strip-types publish/grind-v-b.ts [dagar — utan: hela perioden sedan 15/9]
// Självtest utan DB: publish/grind-v-b.ts --sjalvtest
import { REGN_UTLOSARE_MMH, RADAR_FAKTOR } from "./snapshot-core.ts";
import { Z, andelSe, utfallTak, grindutfall, type Utfall } from "./marginal.ts";
import { vaktdiagnos } from "./vaktdiagnos.ts";
import { FACIT_KM, skuggmotornsRutter, ruttWkt } from "./skuggfacit.ts";

/** Tröskeln i STATIONENS skala — härledd ur de två fastställda talen, aldrig skriven för hand.
 *  Radarn utlöser på 2,0 mm/h rått; stationen mäter i sin egen skala, alltså 2,0 / 0,65 ≈ 3,1. */
export const TROSKEL_STATION_MMH = REGN_UTLOSARE_MMH / RADAR_FAKTOR;
/** Hur nära en station måste ligga för att få DÖMA en varning. V-A3:s domband, inte ett nytt tal.
 *  Heter INTE `MAX_KM`: det namnet bär husets ankarradie (50 km, sju filer) — hur långt bort en
 *  station får vara och ändå räknas som GRANNE i en interpolation. En annan storhet, ett annat tal, och
 *  kontraktsgrinden fällde bygget när namnen krockade (DECISIONS #211). Namnet säger vad det är. */
const DOMANDE_STATION_KM = 10;
const FONSTER_MIN = 30;                     // §2: "inom ±30 min"
const IGANG_H = 3;                          // #351: rader inom ±3 h bevisar att stationen var igång
const V_B1 = 0.20, V_B3 = 3;                // fällda värden (Bengt 4/9, Axel DECISIONS #68)
const MIN_VARNINGAR = 200, MIN_FACIT = 15;  // V-C1
const MIN_REGNDYGN = 5, MIN_LAN = 3;        // V-C2
/** vb-loggens första dygn (DECISIONS #191) — fönstret för V-C och alla mått (DECISIONS #349). */
export const VB_START = "2026-09-15";
export function dagarSedanStart(nu: Date = new Date()): number {
  return Math.ceil((nu.getTime() - Date.parse(`${VB_START}T00:00:00Z`)) / 86_400_000);
}

export type Varning = { tid: Date; rutt: string; segment: string; lon: number; lat: number };
export type Matning = { lon: number; lat: number; bucket: number; mmh: number };
export type Olycka = { tid: Date; lon: number; lat: number };
export type FacitUtfall = { olyckor: number; facit: number; torra: number; omatbara: number };

export function km(a: { lon: number; lat: number }, b: { lon: number; lat: number }): number {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type Utslag = "BEKRÄFTAD" | "DELVIS" | "TORRT" | "OMÄTBAR";

/** Vad säger närmaste station om varningen? Max över bucketarna i fönstret — regnet behöver bara
 *  ha nått tröskeln en gång inom ±30 min för att varningen ska ha haft fog för sig. */
const stationsindex = new WeakMap<Matning[], Map<string, Matning[]>>();
function perStation(matningar: Matning[]): Map<string, Matning[]> {
  let index = stationsindex.get(matningar);
  if (!index) {
    index = new Map();
    for (const m of matningar) {
      const nyckel = `${m.lon},${m.lat}`;
      (index.get(nyckel) ?? index.set(nyckel, []).get(nyckel)!).push(m);
    }
    stationsindex.set(matningar, index);
  }
  return index;
}

export function dom(v: Varning, matningar: Matning[]): { utslag: Utslag; km: number | null; mmh: number | null } {
  let bastaKm = Infinity, bast: Matning[] = [];
  for (const [, ms] of perStation(matningar)) {
    const d = km(v, ms[0]);
    if (d < bastaKm) { bastaKm = d; bast = ms; }
  }
  if (!bast.length || bastaKm > DOMANDE_STATION_KM) return { utslag: "OMÄTBAR", km: bast.length ? bastaKm : null, mmh: null };
  const t = v.tid.getTime();
  const inom = bast.filter((m) => Math.abs(m.bucket * 1800_000 + 900_000 - t) <= FONSTER_MIN * 60_000);
  if (!inom.length) {
    // #351: igång men tyst ⇒ torr (arkivdieten sparar inte en varm, torr och stilla avläsning); helt tyst ⇒ omätbar.
    const igang = bast.some((m) => Math.abs(m.bucket * 1800_000 + 900_000 - t) <= IGANG_H * 3600_000);
    return igang ? { utslag: "TORRT", km: bastaKm, mmh: 0 } : { utslag: "OMÄTBAR", km: bastaKm, mmh: null };
  }
  const mmh = Math.max(...inom.map((m) => m.mmh));
  return { utslag: mmh >= TROSKEL_STATION_MMH ? "BEKRÄFTAD" : mmh > 0 ? "DELVIS" : "TORRT", km: bastaKm, mmh };
}

/** V-C1:s facit (DECISIONS #349): regnade det hos den dömande stationen när olyckan inträffade? Samma station, samma
 *  ±30 min och samma nollpolitik som V-B1 — men gränsen är regn > 0, inte utlösarens tröskel: §2 säger *olycka i
 *  regnväder*. Olyckorna kommer redan filtrerade på avståndet till rutterna (SQL, FACIT_KM). */
export function facit(olyckor: Olycka[], matningar: Matning[]): FacitUtfall {
  const ut: FacitUtfall = { olyckor: olyckor.length, facit: 0, torra: 0, omatbara: 0 };
  for (const o of olyckor) {
    const u = dom({ tid: o.tid, rutt: "", segment: "", lon: o.lon, lat: o.lat }, matningar).utslag;
    if (u === "OMÄTBAR") ut.omatbara++;
    else if (u === "TORRT") ut.torra++;
    else ut.facit++;
  }
  return ut;
}

/** V-B3: varningar per rutt och regndygn. Ett regndygn för en rutt är ett dygn då rutten hade minst
 *  en skuggvarning — fanns inget regn fanns ingen frekvens att mäta, och att räkna torra dygn i
 *  nämnaren skulle dölja brus bakom soliga veckor. */
export function frekvens(varningar: Varning[]): { rutt: string; dygn: number; n: number; snitt: number }[] {
  const per = new Map<string, Map<string, number>>();
  for (const v of varningar) {
    const dag = v.tid.toISOString().slice(0, 10);
    const m = per.get(v.rutt) ?? per.set(v.rutt, new Map()).get(v.rutt)!;
    m.set(dag, (m.get(dag) ?? 0) + 1);
  }
  return [...per.entries()].map(([rutt, dagar]) => {
    const n = [...dagar.values()].reduce((a, b) => a + b, 0);
    return { rutt, dygn: dagar.size, n, snitt: n / dagar.size };
  }).sort((a, b) => b.snitt - a.snitt);
}

const brus = (p: number, n: number) => (n > 0 ? Z * andelSe(p, n) : NaN);

export function rapport(varningar: Varning[], matningar: Matning[], f: FacitUtfall, lan: number, label: string, saknade: string[] = []) {
  console.log(`Grind V-B — talar skuggan för ofta, och talar den om ingenting? (${label})`);
  console.log(`Krav ur TROSKLAR-VATTENPLANING §3: V-B1 falsklarm ≤ ${(100 * V_B1).toFixed(0)} %, V-B2 miss ≤ 40 %,`);
  console.log(`V-B3 ≤ ${V_B3} varningar per rutt och regndygn. Tröskeln i stationens skala:`);
  console.log(`${REGN_UTLOSARE_MMH} / ${RADAR_FAKTOR} = ${TROSKEL_STATION_MMH.toFixed(1)} mm/h (härledd, #155/#156).\n`);

  const utslag = varningar.map((v) => dom(v, matningar));
  const antal = (u: Utslag) => utslag.filter((x) => x.utslag === u).length;
  const bekraftad = antal("BEKRÄFTAD"), delvis = antal("DELVIS"), torrt = antal("TORRT"), omatbar = antal("OMÄTBAR");
  const matta = bekraftad + delvis + torrt;
  const regndygn = new Set(varningar.map((v) => v.tid.toISOString().slice(0, 10))).size;

  // ── UNDERLAGET: bara räkningar. Inget här får avslöja utfallet (DECISIONS #350).
  console.log(`UNDERLAG — bara räkningar`);
  console.log(`  skuggvarningar ${varningar.length}  ·  mätbara ${matta}  ·  OMÄTBARA ${omatbar} (ingen station inom ${DOMANDE_STATION_KM} km och ±${FONSTER_MIN} min — räknas aldrig in)`);
  console.log(`  olyckor inom ${FACIT_KM} km från skuggrutterna ${f.olyckor}  ·  i regn (facit) ${f.facit}  ·  torrt ${f.torra}  ·  omätbara ${f.omatbara}`);
  console.log(`  regndygn ${regndygn}  ·  län ${lan}`);
  if (saknade.length)
    console.log(`  ⚠ väderarkivet saknar ${saknade.length} dygn i fönstret (${saknade.join(", ")}): varningar och olyckor de dygnen blir omätbara, aldrig torra — läs tillbaka ur exporten före en dom`);

  // ── V-C: domens giltighet. Utan C fälls ingen dom och skrivs ingen andel.
  const sparr: string[] = [];
  if (varningar.length < MIN_VARNINGAR) sparr.push(`${varningar.length} varningar (kräver ≥ ${MIN_VARNINGAR})`);
  if (f.facit < MIN_FACIT) sparr.push(`${f.facit} facitbekräftade händelser (kräver ≥ ${MIN_FACIT})`);
  if (regndygn < MIN_REGNDYGN) sparr.push(`${regndygn} regndygn (kräver ≥ ${MIN_REGNDYGN})`);
  if (lan < MIN_LAN) sparr.push(`${lan} län (kräver ≥ ${MIN_LAN})`);
  console.log(`\nV-C GILTIGHET: ${varningar.length} varningar · ${f.facit} facit · ${regndygn} regndygn · ${lan} län`);
  if (sparr.length) {
    console.log(`\n⊘ DOMSPÄRR — ingen dom går att läsa av:`);
    for (const s of sparr) console.log(`   · ${s}`);
    console.log(`\nUnder spärren skrivs bara räkningarna ut (DECISIONS #350): måttet ska inte formas av siffror man redan`);
    console.log(`sett. V-B1 och V-B3 visas första gången när V-C är uppfylld. Mätningen upprepas varje måndag.`);
    return;
  }

  // ── DOMEN: V-C uppfylld — nu, och först nu, andelarna.
  console.log(`\nV-B1 FALSKLARM — vad sa närmaste station inom ${DOMANDE_STATION_KM} km och ±${FONSTER_MIN} min?`);
  const falska = delvis + torrt, p = matta ? falska / matta : 1;
  console.log(`  BEKRÄFTAD ${bekraftad} (${(100 * bekraftad / Math.max(matta, 1)).toFixed(0)} %)  ·  DELVIS ${delvis} (blöt men under tröskeln)  ·  TORRT ${torrt}`);
  console.log(`  falsklarm enligt §2 (allt under tröskeln): ${(100 * p).toFixed(0)}±${(100 * brus(p, matta)).toFixed(0)} %  (krav ≤ ${(100 * V_B1).toFixed(0)} %)`);
  const avst = utslag.filter((x) => x.km != null).map((x) => x.km!).sort((a, b) => a - b);
  if (avst.length) console.log(`  avstånd till dömande station: median ${avst[avst.length >> 1].toFixed(1)} km, längst ${avst[avst.length - 1].toFixed(1)} km\n`);

  console.log(`V-B3 FREKVENS — varningar per rutt och regndygn (dygn med minst en varning)`);
  const fr = frekvens(varningar);
  for (const r of fr) console.log(`  ${r.rutt.padEnd(28)} ${String(r.n).padStart(4)} varningar / ${r.dygn} dygn = ${r.snitt.toFixed(1)}${r.snitt > V_B3 ? "  ⚠ över " + V_B3 : ""}`);
  const over = fr.filter((r) => r.snitt > V_B3).length;
  console.log(`  ${over} av ${fr.length} rutter över ${V_B3}\n`);

  console.log(`V-B2 MISSANDEL — ⊘ GÅR INTE ATT MÄTA HÄR: en olycka i regn bekräftar att något hände, inte att det var`);
  console.log(`  vattenplaning, och skuggan kör tjugo rutter, inte hela landet. Måttet kräver testarlogg eller granskad`);
  console.log(`  kamerabild (§2) — det är betans uppgift, inte knappens.\n`);

  const utf: Utfall = grindutfall([utfallTak(p, V_B1, andelSe(p, matta)), over ? "FALLER" : "KLARAR"]);
  console.log(`DOM: V-B ${utf === "KLARAR" ? "KLARAS" : utf === "OAVGJORT" ? "OAVGJORT (inom bruset)" : "FALLER"} på V-B1 och V-B3. V-B2 saknas fortfarande (se ovan).`);
}

// ── Självtest med känd sanning: två poler som måste ge motsatta svar ────────────────────────
if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — grind V-B mot påhittade fall med känd sanning\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (JSON.stringify(fick) !== JSON.stringify(vantat)) { console.error(`  FEL: ${namn} = ${JSON.stringify(fick)}, väntat ${JSON.stringify(vantat)}`); ok = false; }
    else console.log(`  ok: ${namn} = ${JSON.stringify(fick)}`);
  };
  const t0 = new Date("2026-09-16T12:15:00Z");
  const b = Math.floor(t0.getTime() / 1800_000);
  const v = (lon: number): Varning => ({ tid: t0, rutt: "E18", segment: "S1", lon, lat: 59.0 });
  // Station på plats: 4,0 mm/h ≥ 3,1 ⇒ BEKRÄFTAD. 1,0 ⇒ DELVIS. 0 ⇒ TORRT. Station 30 km bort ⇒ OMÄTBAR.
  k("tröskeln i stationens skala", Number(TROSKEL_STATION_MMH.toFixed(2)), 3.08);
  k("station över tröskeln", dom(v(15.0), [{ lon: 15.0, lat: 59.0, bucket: b, mmh: 4 }]).utslag, "BEKRÄFTAD");
  k("blöt men under", dom(v(15.0), [{ lon: 15.0, lat: 59.0, bucket: b, mmh: 1 }]).utslag, "DELVIS");
  k("helt torr", dom(v(15.0), [{ lon: 15.0, lat: 59.0, bucket: b, mmh: 0 }]).utslag, "TORRT");
  k("ingen station inom räckhåll", dom(v(15.0), [{ lon: 15.6, lat: 59.0, bucket: b, mmh: 9 }]).utslag, "OMÄTBAR");
  k("rätt station vinner (närmast, inte högst)", dom(v(15.0), [
    { lon: 15.01, lat: 59.0, bucket: b, mmh: 0 }, { lon: 15.08, lat: 59.0, bucket: b, mmh: 9 }]).utslag, "TORRT");
  // #351 (ändrat 25/9 på Bengts beslut, inte för att få testet grönt): en station med rader inom ±3 h men ingen inom
  // ±30 min var igång och torr. Helt tyst i ±3 h är fortfarande omätbart.
  k("igång men tyst i ±30 min är torrt", dom(v(15.0), [{ lon: 15.0, lat: 59.0, bucket: b - 4, mmh: 9 }]).utslag, "TORRT");
  k("tyst i ±3 h är omätbart", dom(v(15.0), [{ lon: 15.0, lat: 59.0, bucket: b - 8, mmh: 9 }]).utslag, "OMÄTBAR");
  k("igång efteråt räknas också", dom(v(15.0), [{ lon: 15.0, lat: 59.0, bucket: b + 5, mmh: 0 }]).utslag, "TORRT");
  // Max över fönstret: regnet behöver ha nått tröskeln EN gång inom ±30 min.
  k("max över fönstret gäller", dom(v(15.0), [
    { lon: 15.0, lat: 59.0, bucket: b, mmh: 0 }, { lon: 15.0, lat: 59.0, bucket: b - 1, mmh: 5 }]).utslag, "BEKRÄFTAD");
  const f = frekvens([v(15), v(15), { ...v(15), tid: new Date("2026-09-17T12:15:00Z") }]);
  k("frekvens: 3 varningar på 2 dygn = 1,5", f[0].snitt, 1.5);

  // V-C1:s facit (DECISIONS #349). Fällan: duggregn UNDER utlösarens tröskel är ändå regnväder — räknas den inte
  // har någon bytt gränsen mot tröskeln, och §2 säger "olycka i regnväder", inte "olycka över tröskeln".
  const o = (lon: number): Olycka => ({ tid: t0, lon, lat: 59.0 });
  k("facit: olycka i duggregn under tröskeln räknas", facit([o(15.0)], [{ lon: 15.0, lat: 59.0, bucket: b, mmh: 1 }]),
    { olyckor: 1, facit: 1, torra: 0, omatbara: 0 });
  k("facit: olycka i torrt räknas inte", facit([o(15.0)], [{ lon: 15.0, lat: 59.0, bucket: b, mmh: 0 }]),
    { olyckor: 1, facit: 0, torra: 1, omatbara: 0 });
  k("facit: olycka utan station inom räckhåll är omätbar", facit([o(15.0)], [{ lon: 15.6, lat: 59.0, bucket: b, mmh: 9 }]),
    { olyckor: 1, facit: 0, torra: 0, omatbara: 1 });
  // Fällan ligger där den annars ger noll torra: stationen har bara en rad två timmar före (#351).
  k("facit: station igång men tyst i ±30 min ger en torr olycka", facit([o(15.0)], [{ lon: 15.0, lat: 59.0, bucket: b - 4, mmh: 0 }]),
    { olyckor: 1, facit: 0, torra: 1, omatbara: 0 });
  k("fönstret: 25/9 12:00 är 11 dygn sedan 15/9", dagarSedanStart(new Date("2026-09-25T12:00:00Z")), 11);

  // Blindningen (DECISIONS #350): under spärren får ingen andel skrivas; när V-C är uppfylld ska domen komma.
  const fanga = (fn: () => void) => {
    const rader: string[] = [], orig = console.log;
    console.log = (...a: unknown[]) => { rader.push(a.join(" ")); };
    try { fn(); } finally { console.log = orig; }
    return rader.join("\n");
  };
  const station: Matning = { lon: 15.0, lat: 59.0, bucket: b, mmh: 4 };
  const under = fanga(() => rapport([v(15.0), v(15.0)], [station], { olyckor: 3, facit: 1, torra: 1, omatbara: 1 }, 1, "prov"));
  k("under spärren: ingen procentsats efter kraven", /%/.test(under.slice(under.indexOf("UNDERLAG"))), false);
  k("under spärren: ingen dom", under.includes("DOM: V-B"), false);
  const manga = Array.from({ length: 200 }, (_, i) => ({ ...v(15.0), tid: new Date(t0.getTime() + (i % 5) * 86_400_000) }));
  const mangaStationer = [0, 1, 2, 3, 4].map((d) => ({ ...station, bucket: b + d * 48 }));
  const over = fanga(() => rapport(manga, mangaStationer, { olyckor: 20, facit: 15, torra: 5, omatbara: 0 }, 3, "prov"));
  k("V-C uppfylld: domen skrivs", over.includes("DOM: V-B"), true);
  console.log(ok ? "\nSJÄLVTEST OK: utslagen och facit följer §2, en tyst men igång station är torr, nämnaren är regndygn, och under spärren syns inga andelar." : "\nSJÄLVTEST FALLERAR");
  process.exit(ok ? 0 : 1);
}

// ── Skarpt ────────────────────────────────────────────────────────────────────────────────
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
const q = (s: string, p?: unknown[]) => pool.query(s, p as any[]).then((r) => r.rows);
const arg = process.argv[2];
const DAGAR = arg ? Number(arg) : dagarSedanStart();
if (!Number.isFinite(DAGAR) || DAGAR <= 0) { console.error(`ogiltigt antal dagar: ${arg}`); process.exit(1); }

// Vaktdiagnosen först (DECISIONS #141): bär raderna fälten alls?
await vaktdiagnos(q, "shadow_log", `WHERE run_at > now() - ${DAGAR} * interval '1 day' AND land = 'SE'`, [
  { namn: "vb-kolumnen finns", bar: "vb IS NOT NULL", villkor: "true" },
  { namn: "vb bär varningar", bar: "vb IS NOT NULL", villkor: "jsonb_array_length(vb) > 0" },
]);

const rader = await q(`
  SELECT run_at, route, vb FROM shadow_log
  WHERE land = 'SE' AND run_at > now() - $1 * interval '1 day' AND jsonb_array_length(vb) > 0
  ORDER BY run_at`, [DAGAR]);
const varningar: Varning[] = [];
for (const r of rader)
  for (const a of r.vb as any[])
    if (typeof a.lon === "number" && typeof a.lat === "number")
      varningar.push({ tid: new Date(r.run_at), rutt: r.route, segment: String(a.id), lon: a.lon, lat: a.lat });

const mat = await q(`
  SELECT DISTINCT ON (station_id, b) ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
    floor(extract(epoch FROM sample_time) / 1800)::bigint AS b, rain_sum_mm * 2 AS mmh
  FROM weather_observations
  WHERE sample_time > now() - ($1 + 1) * interval '1 day' AND rain_sum_mm IS NOT NULL
  ORDER BY station_id, b, sample_time DESC`, [DAGAR]);
const matningar: Matning[] = mat.map((r) => ({ lon: +r.lon, lat: +r.lat, bucket: Number(r.b), mmh: Number(r.mmh) }));

// Olyckorna inom FACIT_KM från de svenska skuggrutterna (DECISIONS #349) — samma radie och samma rutter som den
// delade facitlistan, lästa ur skuggmotorns källa.
const olyckor: Olycka[] = (await q(`
  SELECT COALESCE(start_time, first_seen) AS t, ST_X(geom::geometry) AS lon, ST_Y(geom::geometry) AS lat
  FROM situation_archive
  WHERE geom IS NOT NULL AND message_type_value = 'Accident'
    AND COALESCE(start_time, first_seen) > now() - $1 * interval '1 day'
    AND ST_DWithin(geom::geography, ST_GeomFromText($2, 4326)::geography, $3)`,
  [DAGAR, ruttWkt(skuggmotornsRutter()), FACIT_KM * 1000])).map((r) => ({ tid: new Date(r.t), lon: +r.lon, lat: +r.lat }));
// Län: grov spridningsmätning på varningarnas positioner — en cell om ~1° ≈ ett län i storlek.
const lan = new Set(varningar.map((v) => `${Math.floor(v.lon)},${Math.floor(v.lat * 2)}`)).size;
await pool.end();

// Arkivets hål: ett dygn helt utan väderrader är exporterat och raderat (eller aldrig hämtat) — inte torrt.
const medData = new Set(matningar.map((m) => new Date(m.bucket * 1800_000).toISOString().slice(0, 10)));
const fran = new Date(Date.now() - DAGAR * 86_400_000);
const saknade: string[] = [];
for (let d = new Date(`${fran.toISOString().slice(0, 10)}T00:00:00Z`); d.getTime() < Date.now(); d = new Date(d.getTime() + 86_400_000)) {
  const dag = d.toISOString().slice(0, 10);
  if (dag >= VB_START && !medData.has(dag)) saknade.push(dag);
}

console.log(`Skuggloggen: ${rader.length} körningar med varningar, ${DAGAR} dygn bakåt`);
console.log(`Regnarkivet: ${matningar.length} bucketade avläsningar\n`);
rapport(varningar, matningar, facit(olyckor, matningar), lan, `från ${fran.toISOString().slice(0, 10)}, ${DAGAR} dygn`, saknade);
