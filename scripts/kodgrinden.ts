// Kodgrinden (kort #52, Bengts order 11/9): håller Trafikverkets ConditionCode som grind?
//
// FRÅGAN. Motorn larmar i dag om ConditionCode >= 2 ELLER om någon ConditionInfo-sträng
// matchar is/halka/halkrisk/halkig/halt/mycket besvärligt i ordbörjan eller snö/frost var som helst
// (sedan 16/9, kort #97). Den andra grenen gör att ett segment som
// Trafikverket klassat 1 (Normalt) ändå larmar, bara för att ordet "snö" står i infotexten.
// Förslaget på kortet är att dela ordlistan: FARLIGHETSORD larmar oavsett kod, YTORD larmar
// bara när koden är 2 eller högre. Då tystnar "Packad snö" på kod 1, och bara den.
//
// Förslaget vilar på en premiss: att Trafikverket aldrig lämnar ett farlighetsord på kod 1.
// Den här mätningen prövar premissen mot arkivet och svarar på fyra frågor:
//   A  Kodhålet.      Hur ofta saknas koden? Ingesten skriver 0 när TV utelämnar ConditionCode
//                     (ingest/sources/roadcondition.ts:28). På kod 0 är regexen enda larmgrunden,
//                     så en kodgrind utan reservregel skulle tysta dem helt.
//   B  Ordförrådet.   Vilka infosträngar finns, per kod? Visar exakt vad "snö" kommer att tysta,
//                     och om ordet "mycket besvärligt" (motorns femte term) alls förekommer.
//   C  Premissen.     Finns kod 1 tillsammans med is/halka/frost? Varje träff ska läsas för hand.
//   D  Varaktigheten. Hur länge står en klassning? Underlag för reprisregeln (spak 2), som
//                     annars gissar på "högst 30 minuter".
//
// VAD DEN INTE MÄTER. Packad snö på kod 1 finns inte i arkivet förrän det snöat (arkivet
// börjar 24/8). C prövas därför nu med höstens frost och is, vilket är en ANALOGI för
// snöfallet — inte samma sak. Det ska stå i rapporten, inte bara här.
//
// Helt läsande. Run: DATABASE_URL=... node --experimental-strip-types scripts/kodgrinden.ts
// Självtest utan DB: scripts/kodgrinden.ts --sjalvtest

// Motorns ordlista, delad i de två nivåer förslaget bygger på. Lookbehind som engine/src/engine.ts:43.
// Sedan 16/9 (kort #97): halkrisk/halkig/halt står explicit, och snö/frost räknas även inuti ord.
const FARLIGHET = /(?<![a-zåäö])(is|halka|halkrisk|halkig|halt)|frost/i;
const YTA = /snö/i;
const FEMTE_TERMEN = /(?<![a-zåäö])(mycket besvärligt)/i;   // finns i motorn, saknas i publish-filtret

// UNDERLAGSSPÄRREN PÅ C (DECISIONS #510, Bengts förslag 9/10 efter ärende #815). Premissen "inga farlighetsord på kod 1" kan bara
// prövas där kod 1 bär vinterord alls: C kräver minst C_MIN_RADER sådana rader från minst C_MIN_LAN län innan noll träffar får
// läsas som att premissen håller. Med ett enda vinterord i arkivet (Lössnö 8/10) hade raden annars skrivit grönt på ett ord.
// 30 rader: lämnade Trafikverket farlighetsord på kod 1 i var tionde sådan rad hade 30 rader visat minst ett med 96 % sannolikhet.
export const C_MIN_RADER = 30, C_MIN_LAN = 3;
export function cSparr(rader: number, lan: number): boolean { return rader >= C_MIN_RADER && lan >= C_MIN_LAN; }

type Niva = "FARLIGHET" | "YTA" | "NEUTRAL";
export function niva(info: string): Niva {
  if (FARLIGHET.test(info) || FEMTE_TERMEN.test(info)) return "FARLIGHET";
  if (YTA.test(info)) return "YTA";
  return "NEUTRAL";
}

// Motorns lookbehind sattes för att "fläckvis Våt" inte skulle läsas som halka (engine.ts:40,
// åtta falsklarm på augustidata). Priset VAR att den blev blind för SAMMANSÄTTNINGAR: "Rimfrost",
// "Nysnö", "Halkrisk" och "Halt" tystnade. Sedan 16/9 (kort #97) räknas snö/frost även inuti ord och
// halkrisk/halkig/halt står explicit. Blindlistan visar nu det som fortfarande delar en farostam
// utan att vara en fara: "fläckvis …" (augustis falsklarm) och "Halkbekämpning"/"Halkskydd"
// (motåtgärder). Allt ANNAT som dyker upp här är en ny miss och ska läsas.
const STAM = /(is|snö|halk|frost)/i;
export function blind(info: string): boolean {
  return niva(info) === "NEUTRAL" && STAM.test(info);
}

type OrdRad = { code: number; info: string; n: number };
type Kors = Map<number, { per: Map<Niva, number>; ord: Map<string, { n: number; niva: Niva }> }>;

export function korstabulera(rows: OrdRad[]): Kors {
  const k: Kors = new Map();
  for (const r of rows) {
    const c = k.get(r.code) ?? { per: new Map(), ord: new Map() };
    const nv = niva(r.info);
    c.per.set(nv, (c.per.get(nv) ?? 0) + r.n);
    const o = c.ord.get(r.info) ?? { n: 0, niva: nv };
    o.n += r.n; c.ord.set(r.info, o);
    k.set(r.code, c);
  }
  return k;
}

const KODTEXT: Record<number, string> = { 0: "(kod saknas i TV:s svar)", 1: "Normalt", 2: "Delvis hal", 3: "Hal vägbana", 4: "Mycket halt" };
const tid = (s: number) => s < 90 ? `${Math.round(s)} s` : s < 5400 ? `${(s / 60).toFixed(0)} min` : `${(s / 3600).toFixed(1)} h`;

function rapportB(k: Kors) {
  console.log(`\nB — ORDFÖRRÅDET per kod (vad "snö" skulle tysta, och var farlighetsorden sitter)`);
  for (const code of [...k.keys()].sort((a, b) => a - b)) {
    const c = k.get(code)!;
    const tot = [...c.per.values()].reduce((a, b) => a + b, 0);
    const d = (n: Niva) => c.per.get(n) ?? 0;
    console.log(`\n  kod ${code} ${(KODTEXT[code] ?? "okänd").padEnd(24)} ${tot} förekomster` +
      `  [farlighet ${d("FARLIGHET")} · yta ${d("YTA")} · neutral ${d("NEUTRAL")}]`);
    for (const [ord, o] of [...c.ord].sort((a, b) => b[1].n - a[1].n)) {
      const mark = o.niva === "FARLIGHET" ? "⚠ " : o.niva === "YTA" ? "❄ " : blind(ord) ? "? " : "  ";
      console.log(`    ${mark}${String(o.n).padStart(7)}  ${ord}`);
    }
  }
}

function rapportBlind(k: Kors) {
  const b = new Map<string, number>();
  for (const c of k.values()) for (const [ord, o] of c.ord) if (blind(ord)) b.set(ord, (b.get(ord) ?? 0) + o.n);
  console.log(`\n  BLINDLISTA — strängar med farostam som motorns regex INTE matchar:`);
  if (!b.size) { console.log(`    (inga) — lookbehinden döljer ingenting i det ordförråd som finns.`); return; }
  for (const [ord, n] of [...b].sort((x, y) => y[1] - x[1])) console.log(`    ${String(n).padStart(7)}  ${ord}`);
  console.log(`    Läses för hand. "fläckvis …" och "Halkbekämpning"/"Halkskydd" är de kända ofarliga träffarna.`);
  console.log(`    Övriga, om några, är MISSAR i dag — motorn är tyst på dem oavsett kod.`);
}

// ── Självtest med känd sanning, utan DB.
if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — nivådelningen och korstabellen mot känd sanning\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); ok = false; }
    else console.log(`  ok: ${namn} = ${fick}`);
  };
  // Nivådelningen: orden som ska tystna på kod 1, och de som aldrig får tystna.
  k('niva("Packad snö")', niva("Packad snö"), "YTA");
  k('niva("Snömodd")', niva("Snömodd"), "YTA");
  k('niva("Isfläckar")', niva("Isfläckar"), "FARLIGHET");
  k('niva("Svår halka")', niva("Svår halka"), "FARLIGHET");
  k('niva("Risk för halka")', niva("Risk för halka"), "FARLIGHET");
  k('niva("Is och snö")', niva("Is och snö"), "FARLIGHET");   // farlighet vinner över yta
  k('niva("Torrt")', niva("Torrt"), "NEUTRAL");
  k('niva("Våt")', niva("Våt"), "NEUTRAL");
  // Lookbehind: ord som RÅKAR innehålla is/snö inuti sig får inte matcha. Den regeln sattes
  // mot augustis åtta falsklarm på "fläckvis" och är rätt för sitt syfte.
  k('niva("fläckvis Våt")', niva("fläckvis Våt"), "NEUTRAL");
  k('niva("Diesel")', niva("Diesel"), "NEUTRAL");             // "is" inuti ordet
  // Sammansättningarna lookbehinden tystade talar sedan 16/9 (kort #97).
  k('niva("Rimfrost")', niva("Rimfrost"), "FARLIGHET");
  k('niva("Nysnö")', niva("Nysnö"), "YTA");
  k('niva("Halkrisk")', niva("Halkrisk"), "FARLIGHET");
  k('niva("Halt")', niva("Halt"), "FARLIGHET");
  k('blind("Rimfrost")', blind("Rimfrost"), false);
  k('blind("Halkrisk")', blind("Halkrisk"), false);
  // Det blindlistan fortfarande ska visa en läsare: farostam men ingen fara.
  k('blind("Halkbekämpning")', blind("Halkbekämpning"), true);
  k('blind("fläckvis Våt")', blind("fläckvis Våt"), true);
  k('blind("Torrt")', blind("Torrt"), false);
  k('blind("Isfläckar")', blind("Isfläckar"), false);         // matchas redan, alltså inte blind
  // Korstabellen summerar per kod och nivå.
  const kt = korstabulera([
    { code: 1, info: "Torrt", n: 10 }, { code: 1, info: "Packad snö", n: 3 },
    { code: 2, info: "Isfläckar", n: 5 }, { code: 2, info: "Packad snö", n: 2 },
  ]);
  k("kod 1 neutral", kt.get(1)!.per.get("NEUTRAL"), 10);
  k("kod 1 yta", kt.get(1)!.per.get("YTA"), 3);
  k("kod 1 farlighet", kt.get(1)!.per.get("FARLIGHET") ?? 0, 0);
  k("kod 2 farlighet", kt.get(2)!.per.get("FARLIGHET"), 5);
  // Falsifierbarhetsvakten (DECISIONS #71): ett arkiv utan vinterord får aldrig läsas som stöd.
  const vinterord = (kk: Kors) => [...kk.values()].reduce((s, c) => s + (c.per.get("FARLIGHET") ?? 0) + (c.per.get("YTA") ?? 0), 0);
  k("vinterord i rikt arkiv", vinterord(kt), 10);
  k("vinterord i tomt arkiv", vinterord(korstabulera([{ code: 1, info: "Torrt", n: 99 }])), 0);
  // Underlagsspärren på C (DECISIONS #510): 30 rader med vinterord på kod 1 från 3 län — båda leden.
  k("spärren: 29 rader fäller", cSparr(29, 3), false);
  k("spärren: 30 rader från 2 län fäller", cSparr(30, 2), false);
  k("spärren: 30 rader från 3 län släpper", cSparr(30, 3), true);
  k("spärren: ett vinterord släpper inte (8/10:s läge)", cSparr(1, 1), false);
  rapportB(kt);
  rapportBlind(korstabulera([{ code: 1, info: "Halkbekämpning", n: 2 }, { code: 1, info: "Torrt", n: 9 }]));
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK: nivådelningen och korstabellen återfinner den kända sanningen.");
  process.exit(0);
}

// ── Skarpt (läser bara).
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });

const q = async (sql: string) => (await pool.query(sql)).rows as any[];

const spann = (await q(`SELECT count(*)::int AS rader, count(DISTINCT segment_id)::int AS segment,
    min(modified_time) AS forst, max(modified_time) AS sist,
    EXTRACT(epoch FROM max(modified_time) - min(modified_time)) / 86400.0 AS dygn
  FROM road_condition_history`))[0];

const stillestand = (Date.now() - new Date(spann.sist).getTime()) / 86400000;
console.log(`Kodgrinden (kort #52) — håller ConditionCode som grind?\n`);
console.log(`ARKIVET: ${spann.rader} rader, ${spann.segment} segment, ${Number(spann.dygn).toFixed(1)} dygn`);
console.log(`  ${String(spann.forst).slice(0, 16)} → ${String(spann.sist).slice(0, 16)}`);
console.log(`  ${(spann.rader / spann.segment).toFixed(2)} rader per segment · senaste omklassning för ${stillestand.toFixed(0)} dygn sedan`);

// Underlagsvakt: grön-men-tom räknas inte (samma regel som grind-a och vinterbältet).
if (!spann.rader || Number(spann.dygn) < 5) {
  console.error(`\nUNDERLAGSVAKT: ${spann.rader} rader över ${Number(spann.dygn).toFixed(1)} dygn — för tunt eller trasigt. Avbryter.`);
  await pool.end(); process.exit(1);
}

// A — kodfördelning och kodhålet. Historiken OCH nuläget, för de kan skilja sig.
const a = await q(`SELECT condition_code AS code, condition_text AS text, count(*)::int AS n,
    count(DISTINCT segment_id)::int AS segment
  FROM road_condition_history GROUP BY 1, 2 ORDER BY 1, 3 DESC`);
const aNu = await q(`SELECT condition_code AS code, count(*)::int AS n FROM road_conditions WHERE NOT deleted GROUP BY 1 ORDER BY 1`);
console.log(`\nA — KODFÖRDELNING (historik) och kodens egen etikett`);
for (const r of a) {
  console.log(`  kod ${r.code} ${String(r.text || "(tom)").padEnd(24)} ${String(r.n).padStart(8)} rader  ${String(r.segment).padStart(4)} segment`);
}
const kod0 = a.filter((r) => r.code === 0).reduce((s, r) => s + r.n, 0);
const kod0Nu = aNu.filter((r) => r.code === 0).reduce((s, r) => s + r.n, 0);
console.log(`  nuläget: ${aNu.map((r) => `kod ${r.code}: ${r.n}`).join(" · ")}`);
console.log(`\n  KODHÅLET: ${kod0} rader i historiken och ${kod0Nu} segment just nu saknar kod.`);
console.log(kod0 || kod0Nu
  ? `  ⚠ Hålet finns. En kodgrind måste ha en reservregel för kod 0, annars tystnar de helt.`
  : `  ✓ Inget hål. Trafikverket har lämnat ConditionCode på varje rad i arkivet.`);

// B — ordförrådet per kod.
const b = await q(`SELECT condition_code AS code, i AS info, count(*)::int AS n
  FROM road_condition_history, unnest(condition_info) AS i GROUP BY 1, 2 ORDER BY 1, 3 DESC`);
const kors = korstabulera(b.map((r) => ({ code: Number(r.code), info: String(r.info), n: Number(r.n) })));
rapportB(kors);
rapportBlind(kors);
const femte = b.filter((r) => FEMTE_TERMEN.test(String(r.info)));
console.log(`\n  Motorns femte term "mycket besvärligt" som INFOsträng: ${femte.length ? `${femte.length} varianter` : "förekommer inte"}.`);

// C — premissen: kod 1 tillsammans med farlighetsord.
const c = await q(`SELECT h.segment_id, h.condition_text AS text, h.condition_info AS info, h.modified_time AS tid,
    CASE WHEN array_length(r.county_nos, 1) IS NULL THEN NULL ELSE r.county_nos[1] END AS lan
  FROM road_condition_history h LEFT JOIN road_conditions r USING (segment_id)
  WHERE h.condition_code = 1
    AND EXISTS (SELECT 1 FROM unnest(h.condition_info) i WHERE i ~* '(^|[^a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)|frost')
  ORDER BY h.modified_time DESC LIMIT 25`);
const cAntal = (await q(`SELECT count(*)::int AS n FROM road_condition_history h WHERE h.condition_code = 1
  AND EXISTS (SELECT 1 FROM unnest(h.condition_info) i WHERE i ~* '(^|[^a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)|frost')`))[0].n;
// Falsifierbarhetsvakt (DECISIONS #71:s läxa): en mätning som inte KAN falsifiera hypotesen
// med det underlag som finns får aldrig rapportera "premissen håller". Saknas vinterorden helt
// är noll träffar i C ett utsagolöst noll, inte ett stöd.
const vinterord = [...kors.values()].reduce((s, c) => s + (c.per.get("FARLIGHET") ?? 0) + (c.per.get("YTA") ?? 0), 0);
// Underlagsspärren (DECISIONS #510): kod 1-rader som bär något vinterord alls (farlighet eller yta), och deras län.
const cUnderlag = (await q(`SELECT count(*)::int AS rader,
    count(DISTINCT CASE WHEN array_length(r.county_nos, 1) IS NULL THEN NULL ELSE r.county_nos[1] END)::int AS lan
  FROM road_condition_history h LEFT JOIN road_conditions r USING (segment_id)
  WHERE h.condition_code = 1
    AND EXISTS (SELECT 1 FROM unnest(h.condition_info) i WHERE i ~* '(^|[^a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)|frost' OR i ~* 'snö')`))[0];
console.log(`\nC — PREMISSEN: lämnar Trafikverket farlighetsord på kod 1 (Normalt)?`);
console.log(`  underlag: ${cUnderlag.rader} rader med vinterord på kod 1 från ${cUnderlag.lan} län (spärren kräver ≥ ${C_MIN_RADER} från ≥ ${C_MIN_LAN}, DECISIONS #510)`);
if (!vinterord) {
  console.log(`  ⊘ OAVGJORT. Arkivet innehåller noll farlighetsord och noll ytord — oavsett kod.`);
  console.log(`    Frågan KAN alltså inte falsifieras med det här underlaget, och noll träffar`);
  console.log(`    nedan betyder ingenting. Det är läxan i DECISIONS #71: moaten är tom, inte hel.`);
  console.log(`    Mätningen blir avgörande först när ordförrådet i B innehåller vinterord.`);
} else if (!cSparr(Number(cUnderlag.rader), Number(cUnderlag.lan))) {
  console.log(`  ⊘ OAVGJORT — underlagsspärren håller: för få kod 1-rader med vinterord för att noll träffar ska säga något.`);
  console.log(`    Premissen varken håller eller faller här. Kör om när snön legat en vecka i norr.`);
  if (cAntal) {
    console.log(`  ⚠ Men ${cAntal} rader har redan kod 1 OCH ett farlighetsord — de ska läsas för hand oavsett spärren:`);
    for (const r of c) console.log(`    ${String(r.tid).slice(0, 16)}  län ${String(r.lan ?? "?").padStart(2)}  seg ${String(r.segment_id).padEnd(8)} ${r.text} ${JSON.stringify(r.info)}`);
  }
} else if (!cAntal) {
  console.log(`  ✓ NOLL träffar av ${cUnderlag.rader} kod 1-rader med vinterord (${vinterord} vinterord i arkivet). Premissen håller så långt arkivet räcker.`);
} else {
  console.log(`  ⚠ ${cAntal} rader har kod 1 OCH ett farlighetsord. Premissen håller INTE rakt av.`);
  console.log(`  De ${Math.min(25, cAntal)} senaste, att läsa för hand:`);
  for (const r of c) console.log(`    ${String(r.tid).slice(0, 16)}  län ${String(r.lan ?? "?").padStart(2)}  seg ${String(r.segment_id).padEnd(8)} ${r.text} ${JSON.stringify(r.info)}`);
}

// D — hur länge står en klassning? Underlag för reprisregeln.
const d = (await q(`WITH steg AS (
    SELECT EXTRACT(epoch FROM lead(modified_time) OVER (PARTITION BY segment_id ORDER BY modified_time) - modified_time) AS s
    FROM road_condition_history)
  SELECT count(*)::int AS n,
    percentile_disc(0.25) WITHIN GROUP (ORDER BY s) AS p25,
    percentile_disc(0.50) WITHIN GROUP (ORDER BY s) AS p50,
    percentile_disc(0.75) WITHIN GROUP (ORDER BY s) AS p75,
    percentile_disc(0.90) WITHIN GROUP (ORDER BY s) AS p90
  FROM steg WHERE s IS NOT NULL AND s > 0`))[0];
console.log(`\nD — HUR LÄNGE STÅR EN KLASSNING? (${d.n} övergångar)`);
if (d.n >= 30) {
  console.log(`  fjärdedel ${tid(Number(d.p25))} · median ${tid(Number(d.p50))} · tre fjärdedelar ${tid(Number(d.p75))} · nio av tio ${tid(Number(d.p90))}`);
  console.log(`  Läsning: reprisregeln "tystnar tills klassningen ändras" tystar i praktiken ungefär`);
  console.log(`  medianen. Är medianen längre än en typisk resa behövs ingen tidsgräns alls.`);
} else {
  console.log(`  ⊘ För få övergångar för att säga något. Percentiler på ${d.n} värden är inte statistik,`);
  console.log(`    de är fyra avläsningar av samma handfull tal. Kräver minst 30; kommer med vintern.`);
}

console.log(`\nMÄTNINGENS GRÄNS, och den ska läsas innan siffrorna används:`);
console.log(`  Packad snö på kod 1 finns inte i arkivet förrän det snöat. C prövas här med`);
console.log(`  höstens is och frost, vilket är en ANALOGI för snöfallet — inte samma sak.`);
console.log(`  A och B är däremot årstidsoberoende och gäller som de står.`);
await pool.end();
