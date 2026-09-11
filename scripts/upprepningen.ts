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
// IDENTISK TEXT, INTE BARA SAMMA TYP. Fem olika fartkameror längs en väg ger fem larm, och det
// är rätt beteende — de är fem verkliga saker att sakta in för. Men fem IDENTISKA meningar är
// något annat: samma information, samma åtgärd, fem gånger. Därför mäts texten. Typen
// redovisas bredvid, så att läsaren kan se skillnaden själv.
//
// VAD DEN INTE GÖR. Den dömer ingen tröskel och föreslår ingen dämpningsregel. Den ger
// FÖRE-värdet till kort #100:s Verify-rad, så att samma fråga kan ställas efteråt och visa
// att upprepningarna föll utan att någon NY fara tystnade.
//
// Helt läsande. Run: DATABASE_URL=... node --experimental-strip-types scripts/upprepningen.ts [dagar=14]
// Självtest utan DB: scripts/upprepningen.ts --sjalvtest

const MIN_RESOR = 20;   // underlagsvakt: färre resor med larm ⇒ OAVGJORT, aldrig ett tal

export type Larm = { t: number; kind: string; id: string; text: string };
export type Resa = {
  n: number;                    // antal larm på resan
  varst: number;                // flest identiska MENINGAR
  varstText: string | null;     // vilken mening
  varstKind: string | null;
  varstSpannS: number;          // sekunder mellan första och sista av den meningen
  varstTyp: number;             // flest larm av samma TYP (kind), oavsett text
};

/** En resa = en traversering av en rutt vid en körning. Räknar identiska meningar. */
export function analysera(larm: Larm[]): Resa {
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

const resor = rows.map((r) => {
  const a = typeof r.alerts === "string" ? JSON.parse(r.alerts) : r.alerts;
  return { route: r.route, run_at: r.run_at, ...analysera(Array.isArray(a) ? a : []) };
});

console.log(`\nFÖNSTRET: ${DAGAR} dygn · ${resor.length} resor med minst ett larm`);
if (!dom(resor.length, true)) {
  console.log(`  ⊘ OAVGJORT. Kräver ${MIN_RESOR} resor med larm; det finns ${resor.length}.`);
  console.log(`    Skuggloggen bär bara larm när något kvalificerar, och i september kvalificerar`);
  console.log(`    nästan bara fartkameror. Frågan mognar med vintern — men mätningen finns nu.`);
  await pool.end(); process.exit(0);
}

const varstar = resor.map((r) => r.varst);
console.log(`\nIDENTISKA MENINGAR PER RESA — det en förare faktiskt hör`);
console.log(`  median ${percentil(varstar, 0.5)} · tre fjärdedelar ${percentil(varstar, 0.75)} · nio av tio ${percentil(varstar, 0.9)} · värst ${Math.max(...varstar)}`);
for (const g of [2, 3, 4, 6]) {
  const n = resor.filter((r) => r.varst >= g).length;
  console.log(`    ${String(n).padStart(6)} resor (${pct(n, resor.length)}) hör samma mening ${g} gånger eller fler`);
}

console.log(`\nPER FARA — var upprepningen sitter`);
const perKind = new Map<string, { resor: number; varst: number }>();
for (const r of resor) {
  if (!r.varstKind || r.varst < 2) continue;
  const k = perKind.get(r.varstKind) ?? { resor: 0, varst: 0 };
  k.resor++; k.varst = Math.max(k.varst, r.varst);
  perKind.set(r.varstKind, k);
}
if (!perKind.size) console.log(`  (ingen resa har någon mening två gånger)`);
for (const [kind, v] of [...perKind].sort((a, b) => b[1].resor - a[1].resor)) {
  console.log(`    ${kind.padEnd(18)} ${String(v.resor).padStart(6)} resor med upprepning · värst ${v.varst} gånger`);
}
console.log(`  Fem OLIKA fartkameror är fem olika saker att sakta in för — rätt beteende, och de`);
console.log(`  räknas inte här eftersom deras texter skiljer sig. Det som räknas är samma MENING.`);

console.log(`\nDE VÄRSTA RESORNA — att läsa för hand`);
for (const r of [...resor].sort((a, b) => b.varst - a.varst).slice(0, 8)) {
  if (r.varst < 2) break;
  console.log(`    ${String(r.run_at).slice(0, 16)}  ${String(r.route).padEnd(32).slice(0, 32)} ${r.varst} ggr på ${tid(r.varstSpannS)}`);
  console.log(`      "${r.varstText}"`);
}

const medUpprepning = resor.filter((r) => r.varst >= 2).length;
console.log(`\nSVARET PÅ KORT #100:S FRÅGA`);
console.log(`  ${medUpprepning} av ${resor.length} resor (${pct(medUpprepning, resor.length)}) innehåller minst en mening två gånger.`);
console.log(`  Vinterdagens sex identiska frysrisklarm var ${Math.max(...varstar) >= 6 ? "INTE" : ""} ett syntetiskt kuriosum.`);
console.log(`\nFÖRE-VÄRDET är sparat i den här utskriften. Efter att dämpningen byggts ska samma fråga`);
console.log(`ställas igen: upprepningarna ska falla utan att antalet DISTINKTA meningar per resa gör det.`);
await pool.end();
