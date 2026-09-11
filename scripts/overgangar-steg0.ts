// Steg 0 för kort #89 (övergångarna, systemanalysens §2.2) — sex frågor till arkivet.
//
// FRÅGAN BAKOM ALLA SEX. Motorns frysrisk larmar bara när `moisture` är sann, och `moisture`
// betyder "det faller nederbörd NU" (ingest/sources/weather.ts:42–56, publish/snapshot-core.ts:42).
// Efterhalkan — blöt väg som fryser när regnet slutat — ligger därför per definition utanför
// regeln. Förstudien (docs/OVERGANGAR-ANALYS.md) föreslår att fuktvillkoret vidgas med
// regnhistorik, radar och operatörens "Våt". Innan något byggs ska hålet MÄTAS:
//
//   0a  Eftersläpningen.  När fukt slår om till falskt — visar regnmätaren fortfarande regn?
//                         Hur länge? Det är hålets bredd, uttryckt i minuter.
//   0b  Torkningskurvan.  Luftfuktighet och yttemperatur de fyra timmarna efter. Ger N och RH_min.
//   0c  Underlag (a).     Hur ofta följs ett regnstopp av yta <= 1 °C inom 1/2/3/4 h — med
//                         motorn tyst? Det är populationen vinterns B3-grind ska dömas på.
//   0d  Underlag (b).     Torrperioder >= 3/5/7 dygn följda av regn, och olyckor i deras första
//                         20 minuter. Avgör om oljefilmens V-B-grind alls är nåbar i höst.
//   0e  Operatörens Våt.  Hur länge står en "Våt"-klassning? Avgör om den duger som blöt-proxy.
//   0f  Radarns tid.      Hur stor del av tiden ser vi radarn alls? Timsampling av 5-min-bilder
//                         betyder att elva tolftedelar aldrig observeras.
//
// VAD DEN INTE MÄTER. Ingen dom fälls här: alla trösklar (N, RH_min, D, T) är förstudiens
// svep och sätts av grinden i vinter. 0f mäter bara TIDSTÄCKNINGEN — radarns träffsäkerhet mot
// regnmätaren är redan mätt av scripts/cell-matning-v3.ts (kort #43) och byggs inte om här.
//
// FALSIFIERBARHETSVAKTEN (DECISIONS #71). Varje fråga har ett eget underlagskrav. Under det
// skrivs OAVGJORT — aldrig ett tal. Ett tomt arkiv är inte ett svar.
//
// Helt läsande. Run: DATABASE_URL=... node --experimental-strip-types scripts/overgangar-steg0.ts [dagar=14]
// Självtest utan DB: scripts/overgangar-steg0.ts --sjalvtest

const MIN_HANDELSER = 20;   // förstudiens underlagsvakt: färre än så ⇒ OAVGJORT
const UTHALL_MIN = 30;      // ett regnstopp måste hålla i sig så länge, annars är det flimmer
const MAXGAP_MIN = 20;      // längre lucka före omslaget ⇒ arkivdieten, inte vädret, gjorde det
const DIST_M = 15000;       // station <-> olycka (förstudiens §9 0f; cellmätningen kör 5 km)
const OLYCKSFONSTER_MIN = 20;

// ── Motorns fuktdefinition, ordagrant ur publish/snapshot-core.ts:42. Den finns här i TVÅ
// former: som funktion (självtestad) och som SQL (frågan nedan). Att de går isär är den
// troligaste tysta felkällan i hela mätningen, så körningen jämför dem rad för rad och
// rapporterar utfallet. Inget annat i skriptet får definiera fukt.
const DRY = new Set(["no", "dry"]);
export function fukt(r: { rain?: unknown; snow?: unknown; precipitation?: unknown }): boolean {
  return Boolean(r.rain || r.snow || (r.precipitation && !DRY.has(String(r.precipitation).toLowerCase())));
}
const FUKT_SQL =
  "(rain OR snow OR (precipitation IS NOT NULL AND precipitation <> ''" +
  " AND lower(precipitation) NOT IN ('no','dry')))";

// ── Klassningen av ett omslag. Bara ANVÄNDBAR räknas; de andra tre räknas separat och
// skrivs ut, för de säger något om arkivet självt.
export type Klass = "ANVÄNDBAR" | "GAP" | "FLIMMER" | "AVKORTAD";
export function klassa(v: { gapMin: number | null; vataEfter: number; raderEfter4h: number }): Klass {
  if (v.gapMin === null || v.gapMin > MAXGAP_MIN) return "GAP";
  if (v.vataEfter > 0) return "FLIMMER";
  if (v.raderEfter4h === 0) return "AVKORTAD";
  return "ANVÄNDBAR";
}

export function percentil(xs: number[], p: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))];
}

/** Underlagsvakten. Returnerar null när frågan inte får besvaras — anropsplatsen skriver OAVGJORT. */
export function dom<T>(n: number, svar: T, min = MIN_HANDELSER): T | null {
  return n >= min ? svar : null;
}

const tid = (s: number) => s < 90 ? `${Math.round(s)} s` : s < 5400 ? `${(s / 60).toFixed(0)} min` : `${(s / 3600).toFixed(1)} h`;
const pct = (a: number, b: number) => b ? `${((100 * a) / b).toFixed(0)} %` : "–";
const tal = (x: unknown, d = 1) => x === null || x === undefined ? "–" : Number(x).toFixed(d);

// ── Självtest med känd sanning, utan DB.
if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — fuktdefinitionen, omslagsklassningen och vakterna mot känd sanning\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); ok = false; }
    else console.log(`  ok: ${namn} = ${fick}`);
  };
  // Fukten: exakt motorns. "no"/"Dry" är uppehåll — Boolean(precipitation) var falsklarmsmaskinen.
  k('fukt({rain:true})', fukt({ rain: true }), true);
  k('fukt({snow:true})', fukt({ snow: true }), true);
  k('fukt({precipitation:"no"})', fukt({ precipitation: "no" }), false);
  k('fukt({precipitation:"Dry"})', fukt({ precipitation: "Dry" }), false);
  k('fukt({precipitation:"rain"})', fukt({ precipitation: "rain" }), true);
  k('fukt({precipitation:""})', fukt({ precipitation: "" }), false);
  k("fukt({})", fukt({}), false);
  // Omslagsklassningen: bara ett rent, uthålligt omslag med svans räknas.
  k("klassa rent omslag", klassa({ gapMin: 10, vataEfter: 0, raderEfter4h: 12 }), "ANVÄNDBAR");
  k("klassa lucka 3 h", klassa({ gapMin: 180, vataEfter: 0, raderEfter4h: 12 }), "GAP");
  k("klassa ingen föregående rad", klassa({ gapMin: null, vataEfter: 0, raderEfter4h: 12 }), "GAP");
  k("klassa flimmer", klassa({ gapMin: 10, vataEfter: 2, raderEfter4h: 12 }), "FLIMMER");
  k("klassa utan svans", klassa({ gapMin: 10, vataEfter: 0, raderEfter4h: 0 }), "AVKORTAD");
  // Percentilen: nearest-rank, som percentile_disc.
  k("percentil p50 av 1..5", percentil([1, 2, 3, 4, 5], 0.5), 3);
  k("percentil p90 av 1..10", percentil([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9), 9);
  k("percentil tom", percentil([], 0.5), null);
  // Falsifierbarhetsvakten: ett tunt underlag får aldrig bli ett tal.
  k("dom(19)", dom(19, "svar"), null);
  k("dom(20)", dom(20, "svar"), "svar");
  k("dom(0)", dom(0, "svar"), null);
  // Driftvakten: prövar att JÄMFÖRELSEN mellan SQL och funktionen fångar en drift.
  const oeniga = [{ sql: true, js: fukt({ precipitation: "no" }) }, { sql: false, js: fukt({ rain: true }) }]
    .filter((r) => r.sql !== r.js).length;
  k("driftvakten fångar två oeniga rader", oeniga, 2);
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK: fukten, klassningen, percentilen och vakterna återfinner den kända sanningen.");
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

// Varje fråga får falla för sig: radartabellen kan vara tom och väglagsarkivet står stilla.
// En tyst tabell ska ge OAVGJORT i sitt eget avsnitt, inte döda de fem andra.
async function avsnitt(namn: string, fn: () => Promise<void>) {
  try { await fn(); }
  catch (e) { console.log(`\n${namn}\n  ✗ FRÅGAN KUNDE INTE STÄLLAS: ${(e as Error).message}`); }
}

console.log(`Steg 0 för kort #89 — sex frågor till arkivet (${DAGAR} dygns fönster)\n`);

// ── ARKIVET: vad vi faktiskt har att mäta på.
const wx = (await q(`SELECT count(*)::int AS rader, count(DISTINCT station_id)::int AS stationer,
    min(sample_time) AS forst, max(sample_time) AS sist,
    count(*) FILTER (WHERE rain_sum_mm IS NOT NULL)::int AS med_mm
  FROM weather_observations WHERE sample_time > now() - $1 * interval '1 day'`, [DAGAR]))[0];
const rch = (await q("SELECT count(*)::int AS rader, max(modified_time) AS sist FROM road_condition_history"))[0];
const rp = (await q(`SELECT count(*)::int AS rader, count(DISTINCT observed_at)::int AS tider,
    count(DISTINCT segment_id)::int AS segment FROM radar_precip`))[0];
const sa = (await q("SELECT count(*)::int AS rader, min(start_time) AS forst, max(start_time) AS sist FROM situation_archive"))[0];
console.log("ARKIVET");
console.log(`  weather_observations   ${String(wx.rader).padStart(8)} rader · ${wx.stationer} stationer · ${pct(wx.med_mm, wx.rader)} med regnmängd`);
console.log(`                         ${String(wx.forst).slice(0, 16)} → ${String(wx.sist).slice(0, 16)}`);
console.log(`  road_condition_history ${String(rch.rader).padStart(8)} rader · senaste omklassning ${String(rch.sist).slice(0, 16)}`);
console.log(`  radar_precip           ${String(rp.rader).padStart(8)} rader · ${rp.tider} komposittider · ${rp.segment} segment`);
console.log(`  situation_archive      ${String(sa.rader).padStart(8)} rader · ${String(sa.forst).slice(0, 16)} → ${String(sa.sist).slice(0, 16)}`);

if (!wx.rader) { console.error("\nUNDERLAGSVAKT: väderarkivet är tomt i fönstret. Avbryter."); await pool.end(); process.exit(1); }

// ── Omslagen: grunden för 0a, 0b och 0c. En rad per regnstopp, med svansen redan uppmätt.
const vandor = await q(`
  WITH s AS (
    SELECT station_id, sample_time, surface_temp_c, humidity_pct, rain_sum_mm,
           rain, snow, precipitation, ${FUKT_SQL} AS fukt
    FROM weather_observations WHERE sample_time > now() - $1 * interval '1 day'
  ),
  m AS (
    SELECT *, lag(fukt) OVER w AS f_fukt, lag(sample_time) OVER w AS f_tid
    FROM s WINDOW w AS (PARTITION BY station_id ORDER BY sample_time)
  ),
  v AS (SELECT * FROM m WHERE f_fukt AND NOT fukt ORDER BY sample_time DESC LIMIT 20000)
  SELECT v.station_id, v.sample_time, v.rain, v.snow, v.precipitation, v.rain_sum_mm,
    EXTRACT(epoch FROM v.sample_time - v.f_tid) / 60 AS gap_min,
    u.vata::int AS vata_efter, e.n::int AS rader_4h,
    EXTRACT(epoch FROM mm.t_slut - v.sample_time) / 60 AS mm_svans_min,
    EXTRACT(epoch FROM f1.t - v.sample_time) / 60 AS till_frys_min,
    h1.humidity_pct AS rh1, h2.humidity_pct AS rh2, h3.humidity_pct AS rh3, h4.humidity_pct AS rh4,
    h1.surface_temp_c AS yta1, h4.surface_temp_c AS yta4
  FROM v
  LEFT JOIN LATERAL (SELECT count(*) FILTER (WHERE ${FUKT_SQL}) AS vata FROM weather_observations w
    WHERE w.station_id = v.station_id AND w.sample_time > v.sample_time
      AND w.sample_time <= v.sample_time + interval '${UTHALL_MIN} minutes') u ON true
  LEFT JOIN LATERAL (SELECT count(*) AS n FROM weather_observations w
    WHERE w.station_id = v.station_id AND w.sample_time > v.sample_time + interval '${UTHALL_MIN} minutes'
      AND w.sample_time <= v.sample_time + interval '4 hours') e ON true
  LEFT JOIN LATERAL (SELECT max(w.sample_time) AS t_slut FROM weather_observations w
    WHERE w.station_id = v.station_id AND w.sample_time >= v.sample_time
      AND w.sample_time <= v.sample_time + interval '2 hours' AND w.rain_sum_mm > 0) mm ON true
  LEFT JOIN LATERAL (SELECT min(w.sample_time) AS t FROM weather_observations w
    WHERE w.station_id = v.station_id AND w.sample_time > v.sample_time
      AND w.sample_time <= v.sample_time + interval '4 hours' AND w.surface_temp_c <= 1) f1 ON true
  LEFT JOIN LATERAL (SELECT w.humidity_pct, w.surface_temp_c FROM weather_observations w
    WHERE w.station_id = v.station_id
      AND w.sample_time BETWEEN v.sample_time + interval '45 minutes' AND v.sample_time + interval '75 minutes'
    ORDER BY w.sample_time LIMIT 1) h1 ON true
  LEFT JOIN LATERAL (SELECT w.humidity_pct FROM weather_observations w
    WHERE w.station_id = v.station_id
      AND w.sample_time BETWEEN v.sample_time + interval '105 minutes' AND v.sample_time + interval '135 minutes'
    ORDER BY w.sample_time LIMIT 1) h2 ON true
  LEFT JOIN LATERAL (SELECT w.humidity_pct FROM weather_observations w
    WHERE w.station_id = v.station_id
      AND w.sample_time BETWEEN v.sample_time + interval '165 minutes' AND v.sample_time + interval '195 minutes'
    ORDER BY w.sample_time LIMIT 1) h3 ON true
  LEFT JOIN LATERAL (SELECT w.humidity_pct, w.surface_temp_c FROM weather_observations w
    WHERE w.station_id = v.station_id
      AND w.sample_time BETWEEN v.sample_time + interval '225 minutes' AND v.sample_time + interval '255 minutes'
    ORDER BY w.sample_time LIMIT 1) h4 ON true`, [DAGAR]);

// Driftvakten: SQL-uttrycket mot motorns funktion, rad för rad. Alla rader här ska ha fukt=falskt.
const oeniga = vandor.filter((r) => fukt({ rain: r.rain, snow: r.snow, precipitation: r.precipitation })).length;
const klassad = vandor.map((r) => ({
  ...r,
  klass: klassa({
    gapMin: r.gap_min === null ? null : Number(r.gap_min),
    vataEfter: Number(r.vata_efter ?? 0),
    raderEfter4h: Number(r.rader_4h ?? 0),
  }),
}));
const bra = klassad.filter((r) => r.klass === "ANVÄNDBAR");
const raknaKlass = (k: Klass) => klassad.filter((r) => r.klass === k).length;

console.log("\nOMSLAGEN (regnstopp) — grunden för 0a, 0b och 0c");
console.log(`  ${vandor.length} omslag i fönstret${vandor.length >= 20000 ? " (taket 20 000 nått — fönstret är för brett)" : ""}`);
console.log(`  användbara ${bra.length} · lucka i arkivet ${raknaKlass("GAP")} · flimmer ${raknaKlass("FLIMMER")} · utan svans ${raknaKlass("AVKORTAD")}`);
console.log(`  DRIFTVAKTEN: SQL-uttrycket och motorns fukt() är ${oeniga ? `OENIGA på ${oeniga} rader — ⚠ MÄTNINGEN ÄR INTE MOTORNS` : `ense om alla ${vandor.length} rader`}`);

// ── 0a EFTERSLÄPNINGEN.
await avsnitt("0a — EFTERSLÄPNINGEN", async () => {
  console.log("\n0a — EFTERSLÄPNINGEN: visar regnmätaren fortfarande regn när fukt slagit om?");
  if (!dom(bra.length, true)) {
    console.log(`  ⊘ OAVGJORT. ${bra.length} användbara omslag, kräver ${MIN_HANDELSER}.`);
    if (raknaKlass("GAP") > bra.length) console.log("    Övervikten ligger på GAP: arkivdieten (DECISIONS #4) gör hålen i serien, inte vädret.");
    return;
  }
  const medMm = bra.filter((r) => Number(r.rain_sum_mm) > 0);
  const svansar = bra.filter((r) => r.mm_svans_min !== null).map((r) => Number(r.mm_svans_min));
  console.log(`  ${bra.length} användbara omslag.`);
  console.log(`  Vid själva omslaget visade regnmätaren regn i de senaste 30 minuterna på ${medMm.length} av ${bra.length} (${pct(medMm.length, bra.length)}).`);
  console.log("    Det är hålet i sin renaste form: motorn kallar vägen torr medan mätaren säger att det regnat.");
  if (svansar.length >= MIN_HANDELSER) {
    console.log(`  Hur länge regnmätaren stod kvar över noll EFTER omslaget (${svansar.length} fall):`);
    console.log(`    median ${tid(60 * (percentil(svansar, 0.5) ?? 0))} · tre fjärdedelar ${tid(60 * (percentil(svansar, 0.75) ?? 0))} · nio av tio ${tid(60 * (percentil(svansar, 0.9) ?? 0))}`);
    console.log("    Bortom det ser INGEN signal i motorn att vägen var blöt. Det är hålets nedre gräns,");
    console.log("    inte dess bredd: 30-minutersmätaren kan inte säga något om timme två.");
  } else {
    console.log(`  ⊘ Svanslängden OAVGJORD: ${svansar.length} fall med mätarregn efter omslaget, kräver ${MIN_HANDELSER}.`);
  }
});

// ── 0b TORKNINGSKURVAN.
await avsnitt("0b — TORKNINGSKURVAN", async () => {
  console.log("\n0b — TORKNINGSKURVAN: vad händer de fyra timmarna efter?");
  if (!dom(bra.length, true)) { console.log(`  ⊘ OAVGJORT. ${bra.length} användbara omslag, kräver ${MIN_HANDELSER}.`); return; }
  const tackning = bra.filter((r) => r.rh4 !== null).length;
  console.log(`  Täckning: ${tackning} av ${bra.length} omslag (${pct(tackning, bra.length)}) har en rad kvar vid +4 h.`);
  console.log("  Saknade rader är arkivdieten, inte torka: en station som varken är kall, våt eller");
  console.log("  svängig skriver inga rader alls (DECISIONS #4). Läs siffrorna som \"de kalla fallen\".");
  const rader: [string, "rh1" | "rh2" | "rh3" | "rh4", "yta1" | "yta4" | null][] =
    [["+1 h", "rh1", "yta1"], ["+2 h", "rh2", null], ["+3 h", "rh3", null], ["+4 h", "rh4", "yta4"]];
  for (const [namn, rh, yta] of rader) {
    const v = bra.map((r) => r[rh]).filter((x) => x !== null && x !== undefined).map(Number);
    if (v.length < MIN_HANDELSER) { console.log(`    ${namn}  ⊘ ${v.length} värden — under vakten`); continue; }
    const over = (g: number) => pct(v.filter((x) => x >= g).length, v.length);
    const ytav = yta ? bra.map((r) => r[yta]).filter((x) => x !== null && x !== undefined).map(Number) : [];
    console.log(`    ${namn}  luftfuktighet median ${tal(percentil(v, 0.5))} %  ·  >= 80 %: ${over(80)}  ·  >= 90 %: ${over(90)}   (n=${v.length})` +
      (ytav.length ? `   yta median ${tal(percentil(ytav, 0.5))} °C` : ""));
  }
  console.log("  Läsning: håller sig fuktigheten hög är RH-guarden i §4.2 verkningslös som filter —");
  console.log("  den skulle släppa igenom nästan allt. Faller den snabbt är den ett skarpt filter.");
});

// ── 0c UNDERLAG (a).
await avsnitt("0c — UNDERLAG (a)", async () => {
  console.log("\n0c — UNDERLAG (a): hur ofta fryser det efter regnet, med motorn tyst?");
  if (!dom(bra.length, true)) { console.log(`  ⊘ OAVGJORT. ${bra.length} användbara omslag, kräver ${MIN_HANDELSER}.`); return; }
  console.log(`  ${bra.length} användbara omslag över ${DAGAR} dygn ≈ ${(bra.length / DAGAR).toFixed(0)} per dygn i hela riket.`);
  for (const n of [1, 2, 3, 4]) {
    const traff = bra.filter((r) => r.till_frys_min !== null && Number(r.till_frys_min) <= n * 60).length;
    console.log(`    N = ${n} h:  ${String(traff).padStart(5)} omslag följdes av yta <= 1 °C inom fönstret  (${pct(traff, bra.length)})`);
  }
  const nagon = bra.filter((r) => r.till_frys_min !== null).length;
  console.log("  Varje sådant fall är ett tillfälle där den vidgade regeln HADE talat och dagens tiger.");
  console.log("  Det är inte samma sak som att det blev halt — det avgör facit i vinter, inte den här raden.");
  if (!nagon) {
    console.log("  ⚠ NOLL frysningar i hela fönstret. Väntat i september: det är ett underlag som ännu");
    console.log("    inte finns, inte ett svar på om hålet spelar roll. Frågan mognar med första frosten.");
  }
});

// ── 0d UNDERLAG (b): oljefilmen.
await avsnitt("0d — UNDERLAG (b)", async () => {
  console.log(`\n0d — UNDERLAG (b): finns torrperioder följda av regn, och olyckor i deras första ${OLYCKSFONSTER_MIN} min?`);
  const r = await q(`
    WITH vat AS (
      SELECT station_id, geom, sample_time
      FROM weather_observations
      WHERE sample_time > now() - $1 * interval '1 day'
        AND (rain_sum_mm > 0 OR ${FUKT_SQL})
    ),
    start AS (
      SELECT station_id, geom, sample_time AS t_start,
        lag(sample_time) OVER (PARTITION BY station_id ORDER BY sample_time) AS t_forra
      FROM vat
    ),
    p AS (
      SELECT *, EXTRACT(epoch FROM t_start - t_forra) / 86400.0 AS torrdygn
      FROM start WHERE t_forra IS NOT NULL
    )
    SELECT p.torrdygn,
      (SELECT count(*) FROM weather_observations w WHERE w.station_id = p.station_id
         AND w.sample_time > p.t_forra AND w.sample_time < p.t_start)::int AS rader_i_luckan,
      (SELECT count(*) FROM situation_archive a WHERE a.geom IS NOT NULL
         AND a.start_time BETWEEN p.t_start AND p.t_start + interval '${OLYCKSFONSTER_MIN} minutes'
         AND a.geom && ST_Expand(p.geom, 0.25)
         AND ST_DWithin(a.geom::geography, p.geom::geography, ${DIST_M}))::int AS olyckor
    FROM p WHERE p.torrdygn >= 3 ORDER BY p.torrdygn DESC LIMIT 3000`, [DAGAR]);
  for (const d of [3, 5, 7]) {
    const rr = r.filter((x) => Number(x.torrdygn) >= d);
    const tysta = rr.filter((x) => Number(x.rader_i_luckan) === 0).length;
    const ol = rr.reduce((s, x) => s + Number(x.olyckor), 0);
    console.log(`    D >= ${d} dygn:  ${String(rr.length).padStart(5)} regnstarter  ·  varav ${tysta} med NOLL rader i luckan  ·  ${ol} olyckor i fönstret`);
  }
  const d5akta = r.filter((x) => Number(x.torrdygn) >= 5 && Number(x.rader_i_luckan) > 0);
  console.log("  ⚠ \"Noll rader i luckan\" är TYST, inte torrt: arkivdieten skriver inga rader för en");
  console.log("    station som är varm, stabil och torr. De fallen kan inte skiljas från ett bortfall,");
  console.log(`    och de får inte räknas som torrperioder. Kvar som ÄKTA vid D >= 5: ${d5akta.length}.`);
  if (!dom(d5akta.length, true)) {
    console.log(`  ⊘ OAVGJORT för V-B-grinden. ${d5akta.length} äkta torrperioder, kräver ${MIN_HANDELSER};`);
    console.log("    grinden i förstudiens §5.5 kräver dessutom 200 fyrningar och 15 facit-olyckor.");
    console.log("    Slutsats: oljefilmen kan inte dömas på det här underlaget i höst.");
  } else {
    const ol = d5akta.reduce((s, x) => s + Number(x.olyckor), 0);
    console.log(`  ${d5akta.length} äkta torrperioder >= 5 dygn, med ${ol} olyckor i de första ${OLYCKSFONSTER_MIN} minuterna.`);
    console.log(`  V-B-grinden kräver 15 facit-olyckor: ${ol >= 15 ? "nåbar" : "ännu inte nåbar"}.`);
  }
});

// ── 0e OPERATÖRENS "VÅT".
await avsnitt("0e — OPERATÖRENS VÅT", async () => {
  console.log("\n0e — OPERATÖRENS \"VÅT\": duger den som blöt-proxy?");
  const r = await q(`
    WITH h AS (
      SELECT segment_id, modified_time,
        EXISTS (SELECT 1 FROM unnest(condition_info) i WHERE i ~* '(^|[^a-zåäö])våt') AS vat,
        lead(modified_time) OVER (PARTITION BY segment_id ORDER BY modified_time) AS t_nasta
      FROM road_condition_history
    )
    SELECT count(*) FILTER (WHERE vat)::int AS vata,
           count(*) FILTER (WHERE vat AND t_nasta IS NOT NULL)::int AS med_slut,
           percentile_disc(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM t_nasta - modified_time))
             FILTER (WHERE vat AND t_nasta IS NOT NULL) AS p50,
           percentile_disc(0.9) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM t_nasta - modified_time))
             FILTER (WHERE vat AND t_nasta IS NOT NULL) AS p90
    FROM h`);
  const v = r[0];
  const farsk = (await q(`SELECT count(*)::int AS n FROM road_condition_history
    WHERE modified_time > now() - $1 * interval '1 day'`, [DAGAR]))[0].n;
  console.log(`  "Våt" i väglagsarkivet: ${v.vata} rader, varav ${v.med_slut} har en efterföljande klassning.`);
  console.log(`  Rader i väglagsarkivet inom fönstret: ${farsk}.`);
  if (!dom(Number(v.med_slut), true)) {
    console.log(`  ⊘ OAVGJORT. ${v.med_slut} mätbara varaktigheter, kräver ${MIN_HANDELSER}.`);
    if (!farsk) {
      console.log(`    Och orsaken är känd: väglagsarkivet står stilla sedan ${String(rch.sist).slice(0, 10)}.`);
      console.log("    Frågan kan inte besvaras förrän operatören klassar om vägar igen — alltså i vinter.");
      console.log("    Tills dess får \"Våt\" INTE räknas in i unionen i §4.2: en oprövad proxy är en gissning.");
    }
    return;
  }
  console.log(`  Varaktighet: median ${tid(Number(v.p50))} · nio av tio ${tid(Number(v.p90))}`);
  console.log("  Läsning: står klassningen kvar timmar efter regnet är den den bästa proxyn vi har.");
  console.log("  Släcks den med regnet bär den ingen historik och tillför inget utöver fukt_nu.");
});

// ── 0f RADARNS TIDSTÄCKNING.
await avsnitt("0f — RADARNS TIDSTÄCKNING", async () => {
  console.log("\n0f — RADARNS TIDSTÄCKNING: hur stor del av tiden ser vi radarn alls?");
  if (!rp.rader) { console.log("  ⊘ OAVGJORT. radar_precip är tom."); return; }
  const t = await q(`SELECT count(DISTINCT observed_at)::int AS tider
    FROM radar_precip WHERE observed_at > now() - $1 * interval '1 day'
    GROUP BY date_trunc('day', observed_at) ORDER BY 1`, [DAGAR]);
  const tider = t.map((x) => Number(x.tider));
  const med = percentil(tider, 0.5) ?? 0;
  console.log(`  ${t.length} dygn med radardata, median ${med} komposittider per dygn.`);
  // RÄTTAD 11/9 efter första körningen: den första versionen räknade ${med} × 5 min som
  // "andel av dygnet observerad". Det var att läsa händelsefiltrering som kadens. Tabellen
  // får en rad bara när radarn ser regn ≥ 0,1 mm/h någonstans (sql/009), så talet mäter hur
  // många timmar som hade regn i landet — inte hur ofta vi tittar.
  console.log("  KADENSEN är 24 prov per dygn: ingest.yml körs en gång i timmen (pulsklockan, kort");
  console.log("  #80) och hämtar EN 5-minuterskomposit per körning ⇒ 24 × 5 min = 8,3 % av tiden samplad.");
  console.log(`  Tabellen är händelsefiltrerad (sql/009), så ${med} säger hur många timmar per dygn som`);
  console.log("  hade regn NÅGONSTANS i landet. De två talen får inte blandas ihop.");
  console.log("  ⚠ De osamplade 91,7 % är hålet: en skur som börjar och slutar mellan två prov lämnar");
  console.log("    inget spår alls i radar_precip.");
  const e = await q(`
    WITH ev AS (
      SELECT w.sample_time FROM weather_observations w
      WHERE w.sample_time > now() - $1 * interval '1 day' AND w.rain_sum_mm >= 0.5
      ORDER BY w.sample_time DESC LIMIT 2000
    ),
    komp AS (SELECT DISTINCT observed_at FROM radar_precip WHERE observed_at > now() - $1 * interval '1 day')
    SELECT count(*)::int AS n,
      count(*) FILTER (WHERE EXISTS (SELECT 1 FROM komp k
        WHERE abs(extract(epoch FROM k.observed_at - ev.sample_time)) <= 2700))::int AS i_tid
    FROM ev`, [DAGAR]);
  const { n, i_tid } = e[0];
  if (!dom(Number(n), true)) { console.log(`  ⊘ Samtidigheten OAVGJORD: ${n} stationsregn >= 0,5 mm, kräver ${MIN_HANDELSER}.`); return; }
  console.log(`  Av ${n} stationsregn (>= 0,5 mm/30 min) låg ${i_tid} (${pct(Number(i_tid), Number(n))}) inom ±45 min från en komposittid.`);
  console.log("  Det talet säger att kompositerna ligger spridda över dygnet — INTE att radarn såg");
  console.log("  regnet. Träffsäkerheten inom de observerade tiderna är mätt i cell-matning-v3.ts");
  console.log("  (kort #43) och byggs inte om här. För (a) är det som räknas att ett N-timmarsfönster");
  console.log("  innehåller ungefär N prov: tunt, men inte tomt.");
});

console.log("\nMÄTNINGENS GRÄNS, och den ska läsas innan siffrorna används:");
console.log("  Ingen tröskel sätts här. N, RH_min, D och T är förstudiens svep och avgörs av");
console.log("  grinden i vinter (TROSKLAR-OVERGANGAR, steg 1). Det här är populationsräkning.");
console.log("  Frysfallen i 0c är septemberfall — höstens första frostnätter är underlaget som räknas,");
console.log("  och de kan inte tas ikapp (samma tidsfönster som #88:s grind T-A).");
await pool.end();
