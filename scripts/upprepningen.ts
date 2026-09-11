// UPPREPNINGEN (kort #100, Bengts beställning 11/9): hör en förare samma mening om och om igen?
//
// FRÅGAN. Vinterdagen (#99) spelade fem PÅHITTADE vinterdagar genom motorn och hörde sex
// identiska "Isrisk framöver — vägbanan nära noll grader." på en timme. Frysrisken är en
// PUNKTkälla: varje väderstation längs vägen är sitt eget hazardId, och reprisregeln tystar
// samma id — inte samma FARA. Frågan det här skriptet svarar på: händer det redan på riktigt,
// eller var det ett syntetiskt kuriosum?
//
// VARFÖR DET GÅR ATT SVARA UTAN ATT BYGGA NÅGOT. Skuggmotorn har sedan kort #20 loggat varje
// larm den skulle ha sagt på fasta referensrutter, var 30:e minut, med kind, id, text och tid
// i `shadow_log.alerts`. Det som ligger där är larm som REDAN passerat motorns egna spärrar
// (45 s global cooldown, ingen repris av samma id inom 10 min/5 km). Alltså: exakt det en
// förare skulle ha hört. Ingen ny kod, ingen ny insamling, ingen vinter att vänta på.
//
// OBJEKT MOT TILLSTÅND — den enda uppdelning som betyder något här.
// RÄTTAT 11/9 andra gången, av Bengts fältkörning Malmö–Boden och tillbaka: kamerorna fyrade
// "helt perfekt hela vägen", en varning 500 m före varje verklig kamera. Alltså är upprepad
// IDENTISK TEXT inte i sig ett fel — och min första version mätte just det och drog fel slutsats.
//
// Skillnaden går mellan vad faran ÄR:
//   OBJEKTFAROR (camera, accident, wildlife) — distinkta saker föraren passerar. Varje varning
//   följs av sitt eget objekt. Fem varningar om fem kameror är fem korrekta varningar, även om
//   meningen är ordagrant densamma. Kontexten skiljer dem åt: du hör, du passerar, klart.
//   RÖR INTE. Fältverifierat.
//   TILLSTÅNDSFAROR (slippery_segment, icing_point) — ett sammanhängande tillstånd som råkar
//   observeras av flera givare. Sex stationer längs samma väg beskriver EN halka, inte sex.
//   Andra meningen bär ingen ny information och kräver ingen ny åtgärd. Det är här dämpning hör
//   hemma, och bara här.
//
// Regeln: varna en gång per OBJEKT, en gång per TILLSTÅND — aldrig en gång per givare.
//
// VAD DEN INTE GÖR. Den dömer ingen tröskel och föreslår ingen dämpningsregel. Den ger
// FÖRE-värdet till kort #100:s Verify-rad, så att samma fråga kan ställas efteråt och visa
// att upprepningarna föll utan att någon NY fara tystnade.
//
// Helt läsande. Run: DATABASE_URL=... node --experimental-strip-types scripts/upprepningen.ts [dagar=14]
// Självtest utan DB: scripts/upprepningen.ts --sjalvtest

const MIN_RESOR = 20;   // underlagsvakt: färre resor med larm ⇒ OAVGJORT, aldrig ett tal

export type Larm = { t: number; kind: string; id: string; text: string };

/** Faror som är distinkta saker föraren passerar. Upprepning är KORREKT och rörs inte. */
export const OBJEKT = new Set(["camera", "accident", "wildlife"]);
/** Faror som är ett sammanhängande tillstånd observerat av flera givare. Här hör dämpning hemma. */
export const TILLSTAND = new Set(["slippery_segment", "icing_point"]);
export type Resa = {
  n: number;                    // antal larm på resan
  varst: number;                // flest identiska MENINGAR
  varstText: string | null;     // vilken mening
  varstKind: string | null;
  varstSpannS: number;          // sekunder mellan första och sista av den meningen
  varstTyp: number;             // flest larm av samma TYP (kind), oavsett text
};

/** En resa = en traversering av en rutt vid en körning. Räknar identiska meningar.
 *  `bara` filtrerar till en faroklass — domen ställs på TILLSTAND, aldrig på allt. */
export function analysera(larm: Larm[], bara?: Set<string>): Resa {
  if (bara) larm = larm.filter((l) => bara.has(l.kind));
  const perText = new Map<string, Larm[]>();
  const perKind = new Map<string, number>();
  for (const l of larm) {
    const a = perText.get(l.text) ?? [];
    a.push(l); perText.set(l.text, a);
    perKind.set(l.kind, (perKind.get(l.kind) ?? 0) + 1);
  }
  let varst = 0, varstText: string | null = null, varstKind: string | null = null, varstSpannS = 0;
  for (const [text, a] of perText) {
    if (a.length > varst) {
      varst = a.length; varstText = text; varstKind = a[0].kind;
      varstSpannS = Math.max(...a.map((x) => x.t)) - Math.min(...a.map((x) => x.t));
    }
  }
  return {
    n: larm.length, varst, varstText, varstKind, varstSpannS,
    varstTyp: perKind.size ? Math.max(...perKind.values()) : 0,
  };
}

export function percentil(xs: number[], p: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))];
}

export function dom<T>(n: number, svar: T, min = MIN_RESOR): T | null {
  return n >= min ? svar : null;
}

const pct = (a: number, b: number) => b ? `${((100 * a) / b).toFixed(0)} %` : "–";
const tid = (s: number) => s < 90 ? `${Math.round(s)} s` : s < 5400 ? `${(s / 60).toFixed(0)} min` : `${(s / 3600).toFixed(1)} h`;

// ── Självtest med känd sanning, utan DB.
if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — upprepningsräkningen mot känd sanning\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); ok = false; }
    else console.log(`  ok: ${namn} = ${fick}`);
  };
  // Vinterdagens fall: sex identiska frysrisklarm från sex olika stationer.
  const sex: Larm[] = [0, 600, 1200, 1800, 2400, 3000].map((t, i) => ({
    t, kind: "icing_point", id: `st${i}`, text: "Isrisk framöver — vägbanan nära noll grader.",
  }));
  const r1 = analysera(sex);
  k("sex identiska: varst", r1.varst, 6);
  k("sex identiska: kind", r1.varstKind, "icing_point");
  k("sex identiska: spann", r1.varstSpannS, 3000);
  // Fem OLIKA fartkameror: samma typ, olika text ⇒ ingen upprepning av mening.
  const kameror: Larm[] = [0, 300, 600, 900, 1200].map((t, i) => ({
    t, kind: "camera", id: `k${i}`, text: `Fartkamera om ${400 + i * 10} meter.`,
  }));
  const r2 = analysera(kameror);
  k("fem kameror: varst text", r2.varst, 1);
  k("fem kameror: varst TYP", r2.varstTyp, 5);
  // Blandat: två identiska halkvarningar + en olycka.
  const blandat: Larm[] = [
    { t: 0, kind: "slippery_segment", id: "a", text: "Halka på vägen framför." },
    { t: 700, kind: "slippery_segment", id: "b", text: "Halka på vägen framför." },
    { t: 900, kind: "accident", id: "c", text: "Olycka framför." },
  ];
  const r3 = analysera(blandat);
  k("blandat: varst", r3.varst, 2);
  k("blandat: n", r3.n, 3);
  k("blandat: spann", r3.varstSpannS, 700);
  // Tom resa.
  k("tom resa: varst", analysera([]).varst, 0);
  // Uppdelningen objekt/tillstånd: kameror räknas INTE i domen, is gör det.
  const blandat2: Larm[] = [...kameror, ...sex];
  k("blandat: allt", analysera(blandat2).varst, 6);
  k("blandat: bara TILLSTAND", analysera(blandat2, TILLSTAND).varst, 6);
  k("blandat: bara OBJEKT", analysera(blandat2, OBJEKT).varst, 1);
  k("kameror är objekt", OBJEKT.has("camera"), true);
  k("is är tillstånd", TILLSTAND.has("icing_point"), true);
  k("halka är tillstånd", TILLSTAND.has("slippery_segment"), true);
  // Vakterna.
  k("percentil p50 av 1..5", percentil([1, 2, 3, 4, 5], 0.5), 3);
  k("dom(19)", dom(19, "svar"), null);
  k("dom(20)", dom(20, "svar"), "svar");
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK: identiska meningar räknas, olika meningar av samma typ gör det inte.");
  process.exit(0);
}

// ── Skarpt (läser bara).
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const DAGAR = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 14);
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await pool.query("SET statement_timeout = '300s'");
const q = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows as any[];

console.log(`Upprepningen (kort #100) — hör en förare samma mening om och om igen?\n`);

const spann = (await q(`SELECT count(*)::int AS rader, count(DISTINCT route)::int AS rutter,
    min(run_at) AS forst, max(run_at) AS sist,
    count(*) FILTER (WHERE jsonb_array_length(alerts) > 0)::int AS med_larm
  FROM shadow_log WHERE land = 'SE'`))[0];
console.log(`SKUGGLOGGEN (hela arkivet, land = SE)`);
console.log(`  ${spann.rader} körningar · ${spann.rutter} rutter · ${spann.med_larm} med minst ett larm (${pct(spann.med_larm, spann.rader)})`);
console.log(`  ${String(spann.forst).slice(0, 16)} → ${String(spann.sist).slice(0, 16)}`);

const rows = await q(`SELECT route, run_at, alerts FROM shadow_log
  WHERE land = 'SE' AND run_at > now() - $1 * interval '1 day' AND jsonb_array_length(alerts) > 0
  ORDER BY run_at DESC LIMIT 60000`, [DAGAR]);

const parsade = rows.map((r) => {
  const a = typeof r.alerts === "string" ? JSON.parse(r.alerts) : r.alerts;
  return { route: r.route, run_at: r.run_at, larm: (Array.isArray(a) ? a : []) as Larm[] };
});

// DOMEN STÄLLS PÅ TILLSTÅNDSFARORNA. Första versionen satte underlagsvakten på "resor med
// något larm" (678) och rapporterade 50 % upprepning — men 337 av 340 var kameror, som ska
// upprepa sig. Vakten passerade alltså på gott om data om FEL sak. Samma klass av fel som
// kodgrindens falska gröna (#71): mycket underlag är inte rätt underlag.
const tillstand = parsade.map((r) => ({ ...r, ...analysera(r.larm, TILLSTAND) })).filter((r) => r.n > 0);
const objekt = parsade.map((r) => ({ ...r, ...analysera(r.larm, OBJEKT) })).filter((r) => r.n > 0);

console.log(`
FÖNSTRET: ${DAGAR} dygn · ${parsade.length} resor med minst ett larm`);
console.log(`  varav ${tillstand.length} har en TILLSTÅNDSfara (halka, frysrisk) och ${objekt.length} en OBJEKTfara`);

console.log(`
OBJEKTFAROR — kamera, olycka, vilt: RÖRS INTE`);
const objUpp = objekt.filter((r) => r.varst >= 2).length;
console.log(`  ${objUpp} av ${objekt.length} resor upprepar en identisk mening, värst ${objekt.length ? Math.max(...objekt.map((r) => r.varst)) : 0} gånger.`);
console.log(`  Det är KORREKT beteende och fältverifierat: Bengt körde Malmö–Boden och tillbaka och`);
console.log(`  fick en varning 500 m före varje verklig kamera, hela vägen. Varje varning följs av`);
console.log(`  sitt eget objekt, så identisk text förvirrar inte — kontexten skiljer dem åt.`);
console.log(`  Siffran står här som kontroll att objektfarorna FORTSÄTTER tala, inte som ett problem.`);

console.log(`
TILLSTÅNDSFAROR — halka och frysrisk: HÄR HÖR DÄMPNING HEMMA`);
if (!dom(tillstand.length, true)) {
  console.log(`  ⊘ OAVGJORT. ${tillstand.length} resor med en tillståndsfara, kräver ${MIN_RESOR}.`);
  console.log(`    Det är september: halka och frysrisk kvalificerar nästan aldrig. Mätningen är`);
  console.log(`    byggd och knappen finns — frågan mognar med vintern, inte med mer kod.`);
  console.log(`    Vinterdagens sex identiska isvarningar är alltså varken bekräftade eller`);
  console.log(`    motbevisade av verkligt väder ännu.`);
  await pool.end(); process.exit(0);
}
const varstar = tillstand.map((r) => r.varst);
console.log(`  ${tillstand.length} resor. Identiska meningar per resa:`);
console.log(`  median ${percentil(varstar, 0.5)} · tre fjärdedelar ${percentil(varstar, 0.75)} · nio av tio ${percentil(varstar, 0.9)} · värst ${Math.max(...varstar)}`);
for (const g of [2, 3, 4, 6]) {
  const n = tillstand.filter((r) => r.varst >= g).length;
  console.log(`    ${String(n).padStart(6)} resor (${pct(n, tillstand.length)}) hör samma mening ${g} gånger eller fler`);
}
const perKind = new Map<string, { resor: number; varst: number }>();
for (const r of tillstand) {
  if (!r.varstKind || r.varst < 2) continue;
  const k = perKind.get(r.varstKind) ?? { resor: 0, varst: 0 };
  k.resor++; k.varst = Math.max(k.varst, r.varst);
  perKind.set(r.varstKind, k);
}
for (const [kind, v] of [...perKind].sort((a, b) => b[1].resor - a[1].resor)) {
  console.log(`    ${kind.padEnd(18)} ${String(v.resor).padStart(6)} resor med upprepning · värst ${v.varst} gånger`);
}
console.log(`
  DE VÄRSTA RESORNA — att läsa för hand`);
for (const r of [...tillstand].sort((a, b) => b.varst - a.varst).slice(0, 8)) {
  if (r.varst < 2) break;
  const nar = new Date(r.run_at).toISOString().slice(0, 16).replace("T", " ");
  console.log(`    ${nar}  ${String(r.route).padEnd(32).slice(0, 32)} ${r.varst} ggr på ${tid(r.varstSpannS)}`);
  console.log(`      "${r.varstText}"`);
}
const medUpprepning = tillstand.filter((r) => r.varst >= 2).length;
console.log(`
FÖRE-VÄRDET FÖR KORT #100`);
console.log(`  ${medUpprepning} av ${tillstand.length} resor (${pct(medUpprepning, tillstand.length)}) hör samma tillståndsmening minst två gånger.`);
console.log(`  Efter dämpningen ska samma knapp tryckas igen. KRAVET ÄR TVÅDELAT:`);
console.log(`    1. upprepningarna ovan faller, UTAN att antalet distinkta meningar per resa gör det`);
console.log(`    2. objektfarornas siffra står STILLA — kamerorna ska fortsätta låta som de gör`);
await pool.end();
