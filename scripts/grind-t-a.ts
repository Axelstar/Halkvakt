// GRIND T-A (kort #88, TROSKLAR-TRENDEN §4): har trenden signal?
//
// FRÅGAN, ordagrant ur dokumentet: skiljer sig lutningsprofilen på nätter som slutar i frost från
// nätter som inte gör det? Metoden är en tvågruppsjämförelse — för varje station och natt, räkna
// lutning och daggpunktsgap i timmen före nattens kallaste stund, och jämför nätter där ytan nådde
// ≤ 1 °C med nätter där den stannade över +1.
//
// (§4 kallar metoden "leave-one-out mot arkivet". Metodmeningen som följer är entydig och beskriver
// en tvågruppsjämförelse, inte grind A:s grannprognos. Det är metodmeningen som implementeras.)
//
// VARFÖR DEN BYGGS FÖRE SKUGGKOLUMNEN, tvärtemot §7:s ordning: T-A läser ARKIVET, inte skuggloggen.
// De tre kolumnerna i §7 steg 2 matar T-B, inte T-A. Och risken som motiverar avvikelsen är mätt:
// i dag låg grind V-A och cellmätningen döda i fem dygn utan att någon visste, och steg 0:s
// instrument hade två fel som bara upptäcktes av att det kördes. Ett instrument som aldrig körts är
// ett antagande. T-A:s fönster är en engångschans — höstens första frostnätter — och den ska inte
// mötas med otestad kod.
//
// VAD DEN GER I DAG: OAVGJORT. Domspärren kräver ≥ 30 frostnätter och ≥ 20 stationer; i september
// finns en handfull. Det är rätt utfall och det bevisar att spärren fungerar.
//
// Helt läsande. Run: DATABASE_URL=... node --experimental-strip-types scripts/grind-t-a.ts [dagar=7]
// Självtest utan DB: scripts/grind-t-a.ts --sjalvtest

// ── Svepet, ordagrant ur TROSKLAR-TRENDEN §2. Ändras BARA där, aldrig här.
const FONSTER = [15, 30, 60];                  // minuter
const LUTNING = [0.4, 0.6, 0.8, 1.2];          // °C per fönster, fallande
const DAGGGAP = [0, 0.5, 1.0, 2.0];            // yta − dagg ≤ detta
const STARTBAND: [number, number][] = [[1, 3], [1, 4], [1, 6]];

// Domspärren, §4.
const MIN_FROSTNATTER = 30;
const MIN_STATIONER = 20;

export type Rad = {
  t: number;        // minuter sedan epok
  yta: number;
  dagg: number | null;
  rh: number | null;
  luft: number | null;
};

/** Givarvakterna ur §3, alla tre. En station som faller på någon ger INGET utfall — tystnad. */
export function rimlig(r: Rad): boolean {
  if (r.luft !== null && r.yta < r.luft - 12) return false;       // #75, yttemperaturen
  if (r.dagg === null) return false;                              // trenden behöver daggpunkten
  if (r.yta - r.dagg < -5) return false;                          // #46, daggpunktsgivaren
  if (r.rh !== null && r.rh < 90 && r.yta - r.dagg <= 0) return false; // #46:s korsgivare
  return true;
}

/** Lutning över fönstret som slutar vid index i, °C per fönster (positivt = fallande).
 *  null när trendens EGEN vakt fäller: < 3 mätningar i fönstret, eller ett givarhopp > 3 °C. */
export function lutning(rader: Rad[], i: number, fonsterMin: number): number | null {
  const slut = rader[i];
  const start = slut.t - fonsterMin;
  const f: Rad[] = [];
  for (let j = i; j >= 0 && rader[j].t >= start; j--) f.unshift(rader[j]);
  if (f.length < 3) return null;
  for (let j = 1; j < f.length; j++) if (Math.abs(f[j].yta - f[j - 1].yta) > 3) return null;
  return f[0].yta - slut.yta;   // positivt när ytan FALLER
}

export type Param = { fonster: number; lut: number; gap: number; band: [number, number] };

/** Fyrar triggern någon gång under natten? Kräver att alla tre villkor håller SAMTIDIGT. */
export function fyrar(rader: Rad[], p: Param): boolean {
  for (let i = 0; i < rader.length; i++) {
    const r = rader[i];
    if (!rimlig(r)) continue;
    if (r.yta < p.band[0] || r.yta > p.band[1]) continue;
    if (r.dagg === null || r.yta - r.dagg > p.gap) continue;
    const l = lutning(rader, i, p.fonster);
    if (l !== null && l >= p.lut) return true;
  }
  return false;
}

export type Natt = { station: string; halva: 0 | 1; frost: boolean; rader: Rad[]; kallastTim: number };

/** Separationen: andel frostnätter som fyrar minus andel icke-frostnätter som fyrar. */
export function separation(natter: Natt[], p: Param) {
  const f = natter.filter((n) => n.frost), i = natter.filter((n) => !n.frost);
  const fF = f.filter((n) => fyrar(n.rader, p)).length;
  const fI = i.filter((n) => fyrar(n.rader, p)).length;
  const tr = f.length ? fF / f.length : 0;
  const fa = i.length ? fI / i.length : 0;
  return { traff: tr, falsk: fa, sep: tr - fa, nFrost: f.length, nIcke: i.length, fF, fI };
}

const pct = (x: number) => `${(100 * x).toFixed(0)} %`;

// ── Självtest med känd sanning, utan DB.
if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — vakter, lutning och separation mot känd sanning\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); ok = false; }
    else console.log(`  ok: ${namn} = ${fick}`);
  };
  const r = (t: number, yta: number, dagg: number | null = 0, rh: number | null = 95, luft: number | null = 3): Rad =>
    ({ t, yta, dagg, rh, luft });

  // Givarvakterna, var och en för sig.
  k("rimlig: normal rad", rimlig(r(0, 2)), true);
  k("rimlig: yta 13 under luften (#75)", rimlig({ t: 0, yta: -10, dagg: -11, rh: 95, luft: 3 }), false);
  k("rimlig: daggpunkt saknas", rimlig({ t: 0, yta: 2, dagg: null, rh: 95, luft: 3 }), false);
  k("rimlig: yta − dagg = −28 (#46)", rimlig({ t: 0, yta: 2, dagg: 30, rh: 95, luft: 3 }), false);
  k("rimlig: torr luft men gap slutet", rimlig({ t: 0, yta: 2, dagg: 2, rh: 40, luft: 3 }), false);

  // Lutningen och trendens egen vakt. Daggpunkten följer ytan 0,5 ° under — annars faller
  // triggern på gapvillkoret i stället för på lutningen, och testet mäter fel sak.
  const fall = [r(0, 5, 4.5), r(10, 4.5, 4), r(20, 4, 3.5), r(30, 3.5, 3)];
  k("lutning 30 min på jämnt fall", lutning(fall, 3, 30), 1.5);
  k("lutning: för få mätningar", lutning([r(0, 5), r(30, 3)], 1, 30), null);
  k("lutning: givarhopp > 3 °C", lutning([r(0, 5), r(10, 0.5), r(20, 4), r(30, 3.5)], 3, 30), null);

  // Fyrar: alla tre villkoren måste hålla samtidigt.
  const p: Param = { fonster: 30, lut: 1.0, gap: 1.0, band: [1, 4] };
  k("fyrar på fallande natt i bandet", fyrar(fall, p), true);
  k("fyrar inte när ytan är utanför bandet", fyrar([r(0, 9, 8.5), r(10, 8.5, 8), r(20, 8, 7.5), r(30, 7.5, 7)], p), false);
  k("fyrar inte när daggpunktsgapet är för stort", fyrar(fall.map((x) => ({ ...x, dagg: -5 })), p), false);
  // Stigande yta med SLUTET gap: testet ska falla på lutningen, inte på daggpunkten.
  k("fyrar inte på stigande yta", fyrar([r(0, 2, 1.5), r(10, 2.5, 2), r(20, 3, 2.5), r(30, 3.5, 3)], p), false);

  // Separationen.
  const natt = (frost: boolean, rader: Rad[]): Natt => ({ station: "s", halva: 0, frost, rader, kallastTim: 4 });
  const s = separation([natt(true, fall), natt(true, fall), natt(false, [r(0, 9, 8.5), r(10, 8.5, 8), r(20, 8, 7.5), r(30, 7.5, 7)])], p);
  k("separation: träff", s.traff, 1);
  k("separation: falsklarm", s.falsk, 0);
  k("separation: sep", s.sep, 1);
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK: vakterna fäller rätt rader, lutningen räknar rätt håll, triggern kräver alla tre villkoren.");
  process.exit(0);
}

// ── Skarpt (läser bara).
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const DAGAR = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 7);
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await pool.query("SET statement_timeout = '300s'");

console.log(`Grind T-A (kort #88) — har trenden signal? (${DAGAR} dygns fönster)\n`);

if (DAGAR > 7) {
  console.log(`⚠️  GALLRINGSVARNING (DECISIONS #97): fönstret är ${DAGAR} dygn, men gallringen tunnar`);
  console.log(`    allt äldre än sju dygn till en rad per halvtimme. 15-minutersfönstret i svepet`);
  console.log(`    kan då inte räknas alls, och 30-minutersfönstret får exakt två mätningar — under`);
  console.log(`    trendens egen vakt (≥ 3). Läs talen nedan som "det gallringen lämnade kvar".\n`);
}

// Natten tillhör det dygn den började: skifta 12 h så att en natt inte delas av midnatt.
const rows = await pool.query(`
  SELECT station_id,
         (date_trunc('day', sample_time - interval '12 hours'))::date AS natt,
         EXTRACT(epoch FROM sample_time) / 60 AS t,
         EXTRACT(hour FROM sample_time) AS tim,
         surface_temp_c AS yta, dewpoint_c AS dagg, humidity_pct AS rh, air_temp_c AS luft
  FROM weather_observations
  WHERE sample_time > now() - $1 * interval '1 day' AND surface_temp_c IS NOT NULL
  ORDER BY station_id, sample_time`, [DAGAR]);

// Gruppera till station-nätter.
const kartan = new Map<string, { station: string; natt: string; rader: Rad[]; timmar: number[] }>();
for (const r of rows.rows as any[]) {
  const nyckel = `${r.station_id}|${String(r.natt).slice(0, 10)}`;
  let g = kartan.get(nyckel);
  if (!g) { g = { station: r.station_id, natt: String(r.natt).slice(0, 10), rader: [], timmar: [] }; kartan.set(nyckel, g); }
  g.rader.push({ t: Number(r.t), yta: Number(r.yta), dagg: r.dagg === null ? null : Number(r.dagg), rh: r.rh === null ? null : Number(r.rh), luft: r.luft === null ? null : Number(r.luft) });
  g.timmar.push(Number(r.tim));
}

const alla = [...kartan.values()];
const datum = [...new Set(alla.map((g) => g.natt))].sort();
const mitt = datum[Math.floor(datum.length / 2)] ?? "";
const natter: Natt[] = alla.filter((g) => g.rader.length >= 3).map((g) => {
  let min = Infinity, minIdx = 0;
  g.rader.forEach((r, i) => { if (r.yta < min) { min = r.yta; minIdx = i; } });
  return { station: g.station, halva: (g.natt < mitt ? 0 : 1) as 0 | 1, frost: min <= 1, rader: g.rader, kallastTim: g.timmar[minIdx] };
});

const frostN = natter.filter((n) => n.frost);
const stationer = new Set(frostN.map((n) => n.station)).size;
console.log(`UNDERLAGET: ${natter.length} station-nätter över ${datum.length} dygn`);
console.log(`  frostnätter (yta nådde <= 1 °C): ${frostN.length} på ${stationer} stationer`);
console.log(`  icke-frostnätter: ${natter.length - frostN.length}`);
console.log(`  halvorna delas vid ${mitt}`);

// ── Domspärren FÖRST, så att ingen läser tabellen som en dom.
const domFaller = frostN.length >= MIN_FROSTNATTER && stationer >= MIN_STATIONER;
if (!domFaller) {
  console.log(`\n⊘ INGEN DOM — domspärren i §4 håller.`);
  console.log(`  Kräver >= ${MIN_FROSTNATTER} frostnätter och >= ${MIN_STATIONER} stationer; finns ${frostN.length} och ${stationer}.`);
  console.log(`  Tabellen nedan är en TABELL, inte en dom. Den visar att instrumentet fungerar och`);
  console.log(`  vad det kommer att räkna när frosten är här — ingenting mer.`);
}

// ── Svepet.
console.log(`\nSVEPET — ${FONSTER.length} × ${LUTNING.length} × ${DAGGGAP.length} × ${STARTBAND.length} = ${FONSTER.length * LUTNING.length * DAGGGAP.length * STARTBAND.length} kombinationer`);
console.log(`  Visar de tio med störst separation (träffandel minus falsklarmsandel).\n`);
type Rad2 = { p: Param; s: ReturnType<typeof separation>; sepA: number; sepB: number };
const ut: Rad2[] = [];
for (const fonster of FONSTER) for (const lut of LUTNING) for (const gap of DAGGGAP) for (const band of STARTBAND) {
  const p: Param = { fonster, lut, gap, band };
  const s = separation(natter, p);
  const a = separation(natter.filter((n) => n.halva === 0), p);
  const b = separation(natter.filter((n) => n.halva === 1), p);
  ut.push({ p, s, sepA: a.sep, sepB: b.sep });
}
ut.sort((x, y) => y.s.sep - x.s.sep);
console.log(`  fönster  lutn  gap  band      träff        falsklarm     separation   halva A   halva B`);
for (const { p, s, sepA, sepB } of ut.slice(0, 10)) {
  const badaHalvor = sepA > 0 && sepB > 0;
  console.log(`  ${String(p.fonster).padStart(5)} m  ${p.lut.toFixed(1)}  ${p.gap.toFixed(1)}  +${p.band[0]}..+${p.band[1]}   ` +
    `${pct(s.traff).padStart(5)} (${s.fF}/${s.nFrost})  ${pct(s.falsk).padStart(5)} (${s.fI}/${s.nIcke})  ` +
    `${pct(s.sep).padStart(8)}   ${pct(sepA).padStart(6)}  ${pct(sepB).padStart(6)}  ${badaHalvor ? "✓" : "✗ ej båda halvor"}`);
}

// ── Fysikkontrollen, §4.
console.log(`\nFYSIKKONTROLLEN (den som fällde #46:s första körning)`);
const timmar = new Map<number, number>();
for (const n of frostN) timmar.set(n.kallastTim, (timmar.get(n.kallastTim) ?? 0) + 1);
const iNatt = frostN.filter((n) => n.kallastTim >= 3 && n.kallastTim <= 7).length;
console.log(`  Kallaste stunden kl 03–07: ${iNatt} av ${frostN.length} frostnätter (${frostN.length ? pct(iNatt / frostN.length) : "–"})`);
console.log(`  Fördelning per timme: ${[...timmar].sort((a, b) => a[0] - b[0]).map(([h, n]) => `${h}:${n}`).join(" ")}`);
console.log(`  ⚠️  ANDRA HALVAN AV FYSIKKONTROLLEN GÅR INTE ATT KÖRA I DAG. §4 kräver att träffarna ska`);
console.log(`     vara "vanligast klara nätter" — men molnmängd finns inte i arkivet. scripts/smhi-prov.ts`);
console.log(`     hämtar bara lufttemperatur och lagrar ingenting (OVERGANGAR-ANALYS §3). Klarhetsdelen`);
console.log(`     av T-A:s fysikkontroll är alltså BEROENDE AV kort #95 (systemanalysens §2.8), och det`);
console.log(`     beroendet står inte i TROSKLAR-TRENDEN. Det bör skrivas in där.`);

console.log(`\nMÄTNINGENS GRÄNS`);
console.log(`  Ingen tröskel sätts här. Svepet väljer värde först när domspärren släpper, och den`);
console.log(`  kräver höstens första frostnätter — ett fönster som inte kan tas ikapp.`);
console.log(`  Läsningen måste dessutom ske inom sju dygn efter frostnätterna (DECISIONS #97):`);
console.log(`  efter gallringen finns bara halvtimmesrader, och då faller 15-minutersfönstret bort`);
console.log(`  helt och 30-minutersfönstret på trendens egen vakt (>= 3 mätningar).`);
await pool.end();
