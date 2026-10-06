// KUVÖSENS GRANSKNING — TRE LÄSNINGAR (kort #295, docs/KUVOS-GRANSKNING-2026-10-06.md, DECISIONS #469; Bengts ja 6/10
// "ja till 295"). INGEN DOM: inga trösklar rörs, startvärdena står frysta (#468), grind A:s driftdom står. Varje del är
// namngiven i DECISIONS innan knappen trycks, och alla tal skrivs ut.
//   F1 — grind A i kuvösen på 60-DYGNSFÖNSTER vid tre klockslag (1/1, 1/3, vinterns slut): är vinterns A2 5,5 % (#467, 152 dygn)
//        en hårdare vinter eller ett längre offsetfönster? publish/grind-a.ts körs OFÖRÄNDRAD som barnprocess, med klockan i
//        anslutningen som riktningsprovet (kuvos.yml). Dess "DOM"-rader är läsning här.
//   F2 — efterhalkans pris (startvärdena) räknat om på SAMMA tillkomna episoder med utfallsfönstren och nära-banden ur T-A:s svep
//        (härledda ur sql/028:s D1-vakt, aldrig kopierade), lägsta ytan direkt ur weather_observations. 90 min · 0,5 ska ge
//        riktningsprovets 45,1 % (kontroll). Dessutom priset per startyta vid 90 min — fönstrets aritmetik mot de långsamma fallen.
//   F3 — "inom räckvidd" för Ö-B1: facittillfällen (stationsnätter ≤ +1 °C, vakterna klarade) där efterhalkan kunde ha talat:
//        regn (rain_sum_mm > 0) inom N h före facitögonblicket, och inom N h + utfallsfönstret (så att en fyrning före facit ryms).
//        N = startvärdet och svepets vidaste. Riktningsprovets nettonytt (#467) som andel av dem. Definitionen är ett förslag till
//        TROSKLAR-OVERGANGAR före mars-domen, inte en regel.
// Kör: DATABASE_URL=... node --experimental-strip-types scripts/matningar/kuvos-granskning-2026-10-06.ts [--sjalvtest]
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { FRYS_C } from "../../engine/src/segment.ts";
import { natt } from "../../kuvos/baslinjen.ts";

const lista = (sql: string, form: RegExp, vad: string): number[] => {
  const m = sql.match(form);
  if (!m) throw new Error(`sql/028: hittar inte svepet för ${vad} — D1-vakten har ändrats; läs om läsningen (DECISIONS #469)`);
  return m[1].split(",").map((x) => Number(x.replace(/[^\d.]/g, "")));
};
/** T-A:s och övergångarnas svep ur sql/028:s D1-vakt: nära-band (°C), utfallsfönster (min), N (h); startvärdet N. */
export function svep(sql028: string) {
  const n = sql028.match(/p_n interval DEFAULT '(\d+) hours?'/);
  if (!n) throw new Error("sql/028: hittar inte startvärdet N (DECISIONS #469)");
  return {
    band: lista(sql028, /p_band NOT IN \(([\d., ]+)\)/, "nära-bandet"),
    utfall: lista(sql028, /p_utfall NOT IN \(((?:interval '\d+ minutes'(?:, )?)+)\)/, "utfallsfönstret"),
    n: lista(sql028, /p_n NOT IN \(((?:interval '\d+ hours?'(?:, )?)+)\)/, "N"),
    nStart: Number(n[1]),
  };
}
/** T-B:s klasser på en lista lägsta ytor: föll ut (≤ K1), nära (≤ K1 + band), uteblev; pris = uteblev av dem med utfall. */
export function klasser(min: (number | null)[], band: number) {
  const med = min.filter((m): m is number => m !== null);
  const foll = med.filter((m) => m <= FRYS_C).length, nara = med.filter((m) => m > FRYS_C && m <= FRYS_C + band).length;
  const uteblev = med.length - foll - nara;
  return { med: med.length, foll, nara, uteblev, pris: med.length ? uteblev / med.length : null };
}
const pct = (x: number | null) => (x === null ? "–" : `${(100 * x).toFixed(1).replace(".", ",")} %`);
const sv = (x: number) => String(x).replace(".", ",");

if (process.argv.includes("--sjalvtest")) {
  const sql = readFileSync(new URL("../../sql/028_uppspelning_varianter.sql", import.meta.url), "utf8");
  const s = svep(sql);
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  k(JSON.stringify(s) === JSON.stringify({ band: [0.3, 0.5, 1.0], utfall: [60, 90, 120], n: [1, 2, 3, 4], nStart: 2 }), `svepen ur sql/028: ${JSON.stringify(s)}`);
  const r = klasser([0.5, 1.2, 1.6, 2.5, null], 0.5);
  k(r.med === 4 && r.foll === 1 && r.nara === 1 && r.uteblev === 2 && r.pris === 0.5, `klasserna: ${JSON.stringify(r)}`);
  k(klasser([1.6, 2.5], 1.0).uteblev === 1 && klasser([], 0.5).pris === null, "bandet 1,0 flyttar 1,6 till nära; tomt ger inget pris");
  console.log("✓ självtest: svepen härleds ur sql/028, T-B:s klasser och priset räknas som uppspelningen");
  process.exit(0);
}

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const db = new pg.Client({ connectionString: url });
await db.connect();
await db.query("SET TimeZone = 'UTC'");
await db.query("SET statement_timeout = 0");
const q = async (sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows as any[];
const [{ kuvos }] = await q("SELECT to_regprocedure('kuvos.now()') IS NOT NULL AS kuvos");
if (!kuvos) { console.error("Inte kuvösen (kuvos.now() saknas): läsningen gäller bara vintern 2024/25 (DECISIONS #469)"); process.exit(1); }
const sql028 = readFileSync(new URL("../../sql/028_uppspelning_varianter.sql", import.meta.url), "utf8");
const S = svep(sql028);
const [{ forst, sist }] = await q("SELECT min(sample_time)::text AS forst, (max(sample_time) + interval '1 second')::text AS sist FROM weather_observations");
console.log(`KUVÖSENS GRANSKNING — TRE LÄSNINGAR (kort #295, DECISIONS #469), vintern ${forst} – ${sist}. Ingen dom.`);

// ── F1: grind A på 60 dygn vid tre klockslag ──────────────────────────────────────────────────────────────────────────
const klockslag = ["2025-01-01T00:00:00Z", "2025-03-01T00:00:00Z", new Date(sist).toISOString().replace(/\.\d{3}Z$/, "Z")];
for (const nu of klockslag) {
  const klocka = `${url}${url.includes("?") ? "&" : "?"}options=-c%20search_path%3Dkuvos%2Cpublic%2Cpg_catalog%20-c%20kuvos.nu%3D${nu}%20-c%20TimeZone%3DUTC`;
  console.log(`\n═══ F1 — grind A, 60 dygn bakåt från klockan ${nu} (läsning, ingen dom; publish/grind-a.ts oförändrad) ═══`);
  execFileSync(process.execPath, ["--experimental-strip-types", "publish/grind-a.ts", "60"], { env: { ...process.env, DATABASE_URL: klocka }, stdio: "inherit" });
}

// ── F2: efterhalkans pris på samma episoder, fönster × band ur svepet ──────────────────────────────────────────────────
const { installera, FUNKTION } = await import("../../kuvos/efterhalkan.ts");
const { FACIT_SQL, ovanpa } = await import("../../kuvos/ovanpa.ts");
await installera((s) => q(s));
const [{ fonster }] = await q("SELECT (now() - min(sample_time) + interval '1 day')::text AS fonster FROM weather_observations");
const fyr = (await q(`SELECT sid, extract(epoch FROM t) * 1000 AS t, min_efter, rader FROM ${FUNKTION}(p_fonster := $1::interval)`, [fonster]))
  .map((r) => ({ sid: String(r.sid), t: Number(r.t), minEfter: r.min_efter === null ? null : Number(r.min_efter), rader: r.rader === null ? null : Number(r.rader) }));
const facit = (await q(FACIT_SQL)).map((r) => ({ sid: String(r.sid), tFacit: Number(r.t_facit), tBas: r.t_bas === null ? null : Number(r.t_bas) }));
const nattFor = (ms: number) => natt(ms / 1000);
const basNatter = new Set(facit.filter((f) => f.tBas !== null).map((f) => `${f.sid}|${nattFor(f.tFacit)}`));
const ep = new Map<string, { sid: string; t: number }>();
for (const x of [...fyr].sort((a, b) => a.t - b.t)) { const k = `${x.sid}|${nattFor(x.t)}`; if (!ep.has(k)) ep.set(k, x); }
const tillkomna = [...ep].filter(([k]) => !basNatter.has(k)).map(([, x]) => x);
const o = ovanpa(facit, { efterhalkan: fyr }).delar[0];
console.log(`\n═══ F2 — efterhalkans pris (startvärdena) på de ${tillkomna.length} tillkomna episoderna (ovanpå: ${o.tillkomna}, uteblev ${o.uteblev} av ${o.medUtfall} ⇒ ${pct(o.medUtfall ? o.uteblev / o.medUtfall : null)}) ═══`);
const filter = S.utfall.map((m) => `min(w.surface_temp_c) FILTER (WHERE w.sample_time <= e.t + interval '${m} minutes') AS m${m}`).join(",\n    ");
const rader = await q(`
  WITH e AS (SELECT unnest($1::text[]) AS sid, unnest($2::timestamptz[]) AS t)
  SELECT e.sid, extract(epoch FROM e.t) * 1000 AS t,
    (SELECT s.surface_temp_c FROM weather_observations s WHERE s.station_id = e.sid AND s.sample_time = e.t) AS yta0,
    ${filter}
  FROM e LEFT JOIN weather_observations w ON w.station_id = e.sid AND w.surface_temp_c IS NOT NULL
    AND w.sample_time > e.t AND w.sample_time <= e.t + interval '${Math.max(...S.utfall)} minutes'
  GROUP BY e.sid, e.t`, [tillkomna.map((x) => x.sid), tillkomna.map((x) => new Date(x.t).toISOString())]);
const tal = (r: any, m: number) => (r[`m${m}`] === null ? null : Number(r[`m${m}`]));
console.log(`  fönster × nära-band (T-A:s svep): uteblev av episoder med utfall ⇒ pris`);
for (const m of S.utfall) for (const b of S.band) {
  const k = klasser(rader.map((r) => tal(r, m)), b);
  console.log(`    ${m} min · band ${sv(b)}: föll ut ${k.foll} · nära ${k.nara} · uteblev ${k.uteblev} av ${k.med} ⇒ PRIS ${pct(k.pris)}${m === 90 && b === 0.5 ? "   ← ska vara riktningsprovets tal" : ""}`);
}
console.log(`  per startyta vid fyrningen, 90 min · band 0,5 (fönstrets aritmetik):`);
for (const [lo, hi] of [[1, 2], [2, 3]] as const) {
  const del = rader.filter((r) => r.yta0 !== null && Number(r.yta0) >= lo && Number(r.yta0) < hi + (hi === 3 ? 0.001 : 0));
  const k = klasser(del.map((r) => tal(r, 90)), 0.5);
  console.log(`    yta +${lo}…+${hi} °C: ${del.length} episoder · föll ut ${k.foll} · nära ${k.nara} · uteblev ${k.uteblev} ⇒ PRIS ${pct(k.pris)}`);
}
console.log(`  (lägsta ytan ur weather_observations: ${S.utfall.map((m) => `${m} min`).join(" · ")}; i kuvösen tre halvtimmesrader per 90 min, i driften arton)`);

// ── F3: inom räckvidd för Ö-B1 ────────────────────────────────────────────────────────────────────────────────────────
console.log(`\n═══ F3 — "inom räckvidd": facittillfällen där efterhalkan kunde ha talat (förslag till definition, ingen regel) ═══`);
console.log(`  facit ${facit.length} stationsnätter (yta ≤ +${FRYS_C} °C, vakterna klarade); riktningsprovets nettonytt ${o.nettonytt} (${pct(o.nettonytt / facit.length)} av alla)`);
const sids = facit.map((f) => f.sid), tider = facit.map((f) => new Date(f.tFacit).toISOString());
for (const N of [S.nStart, Math.max(...S.n)]) for (const extra of [0, 90]) {
  const [{ n }] = await q(`
    WITH f AS (SELECT unnest($1::text[]) AS sid, unnest($2::timestamptz[]) AS t)
    SELECT count(*)::int AS n FROM f WHERE EXISTS (SELECT 1 FROM weather_observations w WHERE w.station_id = f.sid AND w.rain_sum_mm > 0
      AND w.sample_time <= f.t AND w.sample_time > f.t - $3::interval)`, [sids, tider, `${N * 60 + extra} minutes`]);
  console.log(`    regn inom ${N} h${extra ? ` + ${extra} min (fyrningen ryms före facit)` : ""} före facit: ${n} tillfällen (${pct(n / facit.length)} av facit) ⇒ nettonytt ${o.nettonytt} = ${pct(n ? o.nettonytt / n : null)} inom räckvidd (Ö-B1 ≥ 5 %, döms inte här)`);
}
await db.end();
