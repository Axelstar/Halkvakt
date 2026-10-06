// EFTERHALKANS MÅTT OCH DAGGPUNKT — TVÅ LÄSNINGAR (kort #297, docs/KUVOS-GRANSKNING-2026-10-06.md §6, DECISIONS #470; Bengts ja
// 6/10 "ja till 297"). INGEN DOM: inga trösklar rörs, startvärdena står frysta (#468), kalibreringen görs inte om här (D7).
//   M1 — PRISET PER FYRNING. Dagens ovanpå-mått (#456) dömer nattens första fyrning: uteblev om ytan inte nått +1,5 inom 90 min efter
//        den. Här räknas varje fyrning i de tillkomna nätterna (nätter utan baslinje) med sitt eget 90-minutersfönster — Ö-B2:s "av
//        tillkomna fyrningar" — för startvärdena och de 32 räknebara punkterna, hela vintern och båda halvorna (mittnatten som T-A).
//        Per natt (nådde stationen +1,5 någon gång senare samma natt?) skrivs bredvid som övre gräns, aldrig som mått.
//        Läsning i förväg: har någon punkt pris per fyrning ≤ 25 % på ≥ 20 fyrningar med utfall, hela vintern och i båda halvorna, är
//        kalibreringens "ingen vinnare" (#468) måttets artefakt — och frågan om en kalibrering på rätt mått är Bengts och Axels (D7).
//   M2 — DAGGPUNKTEN VID FYRNINGEN. Startvärdenas fyrningar delas på dewpoint_c vid fyrningen (≤ +1 °C mot > +1) och på yta − dagg
//        (≤ 0 · 0–1 · 1–2 · > 2 °C): utfallet per episod (90 min, band 0,5), per fyrning, och nettonyttan per klass (den fyrning som
//        fångade facit). Förutsägelse, skriven före talen (#470): episoder med dagg ≤ +1 faller ut i klar majoritet; de över +1
//        uteblir i majoritet.
// Svepen, startvärdena och rutnätet härleds ur sql/028 (kuvos/kalibrering.ts). Facit och fukt som i ovanpå.
// Kör: DATABASE_URL=... node --experimental-strip-types scripts/matningar/kuvos-mattet-2026-10-06.ts [--sjalvtest]
import { readFileSync } from "node:fs";
import { FRYS_C } from "../../engine/src/segment.ts";
import { natt } from "../../kuvos/baslinjen.ts";
import { rutnat, startvarden, namn, samma, TAK_PRIS, GOLV_EPISODER } from "../../kuvos/kalibrering.ts";
import { NARA_BAND_C, UTFALLSFONSTER_MIN, type Facit, type Fyrning } from "../../kuvos/ovanpa.ts";

export type Klass = "foll" | "nara" | "uteblev";
export const klass = (min: number, band = NARA_BAND_C): Klass => (min <= FRYS_C ? "foll" : min <= FRYS_C + band ? "nara" : "uteblev");
export const daggklass = (dagg: number | null) => (dagg === null ? "okänd" : dagg <= FRYS_C ? `dagg ≤ +${FRYS_C}` : `dagg > +${FRYS_C}`);
export const gapklass = (yta: number | null, dagg: number | null) => {
  if (yta === null || dagg === null) return "okänd";
  const g = yta - dagg;
  return g <= 0 ? "yta − dagg ≤ 0" : g <= 1 ? "0–1" : g <= 2 ? "1–2" : "> 2";
};
export type Rakning = { n: number; foll: number; nara: number; uteblev: number };
export const rakna = (mins: (number | null)[], band = NARA_BAND_C): Rakning => {
  const r: Rakning = { n: 0, foll: 0, nara: 0, uteblev: 0 };
  for (const m of mins) { if (m === null) continue; r.n++; r[klass(m, band)]++; }
  return r;
};
export const pris = (r: Rakning) => (r.n ? r.uteblev / r.n : null);
const pct = (x: number | null) => (x === null ? "–" : `${(100 * x).toFixed(1).replace(".", ",")} %`);
const rad = (r: Rakning) => `föll ut ${r.foll} · nära ${r.nara} · uteblev ${r.uteblev} av ${r.n} ⇒ PRIS ${pct(pris(r))}`;
const kandidat = (r: Rakning) => r.n >= GOLV_EPISODER && r.uteblev / r.n <= TAK_PRIS;

if (process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  k(klass(1.0) === "foll" && klass(1.5) === "nara" && klass(1.51) === "uteblev" && klass(1.9, 1.0) === "nara", "T-B:s klasser vid gränserna");
  k(daggklass(1.0) === "dagg ≤ +1" && daggklass(1.1) === "dagg > +1" && daggklass(null) === "okänd", "daggklassen");
  k(gapklass(2.5, 2.5) === "yta − dagg ≤ 0" && gapklass(2.5, 1.6) === "0–1" && gapklass(2.5, 0.5) === "1–2" && gapklass(3, 0) === "> 2", "gapklassen");
  const r = rakna([0.5, 1.2, 1.6, 2.5, null]);
  k(r.n === 4 && r.foll === 1 && r.nara === 1 && r.uteblev === 2 && pris(r) === 0.5, `räkningen ${JSON.stringify(r)}`);
  k(!kandidat(r) && kandidat({ n: 20, foll: 15, nara: 0, uteblev: 5 }) && !kandidat({ n: 19, foll: 19, nara: 0, uteblev: 0 }), "kandidat: taket 25 % inklusive, golvet 20");
  console.log("✓ självtest: klasserna, daggklassen, gapklassen, räkningen och kandidatvillkoret");
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
if (!kuvos) { console.error("Inte kuvösen (kuvos.now() saknas): läsningen gäller bara vintern 2024/25 (DECISIONS #470)"); process.exit(1); }
const { installera, FUNKTION } = await import("../../kuvos/efterhalkan.ts");
const { FACIT_SQL } = await import("../../kuvos/ovanpa.ts");
await installera((s) => q(s));
const sql028 = readFileSync(new URL("../../sql/028_uppspelning_varianter.sql", import.meta.url), "utf8");
const start = startvarden(sql028), natet = rutnat(sql028);
const [{ fonster, l15 }] = await q(`SELECT (now() - (SELECT min(sample_time) FROM weather_observations) + interval '1 day')::text AS fonster,
  (SELECT count(lutning15_c) FROM trend_kandidater)::int AS l15`);
const facit: Facit[] = (await q(FACIT_SQL)).map((r) => ({ sid: String(r.sid), tFacit: Number(r.t_facit), tBas: r.t_bas === null ? null : Number(r.t_bas) }));
const nattFor = (ms: number) => natt(ms / 1000);
const basNatter = new Set(facit.filter((f) => f.tBas !== null).map((f) => `${f.sid}|${nattFor(f.tFacit)}`));
const natter = [...new Set(facit.map((f) => nattFor(f.tFacit)))].sort();
const mitt = natter[Math.floor(natter.length / 2)] ?? "";
const MIN = 60_000;
console.log(`EFTERHALKANS MÅTT OCH DAGGPUNKT (kort #297, DECISIONS #470) — facit ${facit.length} stationsnätter, baslinjenätter ${basNatter.size}, halvorna delas vid ${mitt}. Ingen dom.`);

const hamta = async (p: { n: number; fall: number; fonster: number }): Promise<Fyrning[]> =>
  (await q(`SELECT sid, extract(epoch FROM t) * 1000 AS t, min_efter, rader FROM ${FUNKTION}(p_fonster := $1::interval, p_n := $2::interval, p_fall := $3, p_trendfonster := $4)`,
    [fonster, `${p.n} hours`, p.fall, p.fonster]))
    .map((r) => ({ sid: String(r.sid), t: Number(r.t), minEfter: r.min_efter === null ? null : Number(r.min_efter), rader: r.rader === null ? null : Number(r.rader) }));
/** Lägsta ytan efter fyrningen, resten av natten (middag till middag svensk tid), ur weather_observations. */
const perNatt = async (fyr: Fyrning[]): Promise<Map<string, number | null>> => {
  const rows = await q(`
    WITH e AS (SELECT unnest($1::text[]) AS sid, unnest($2::timestamptz[]) AS t)
    SELECT e.sid, extract(epoch FROM e.t) * 1000 AS t, min(w.surface_temp_c) AS m
    FROM e LEFT JOIN weather_observations w ON w.station_id = e.sid AND w.surface_temp_c IS NOT NULL AND w.sample_time > e.t
      AND ((w.sample_time AT TIME ZONE 'Europe/Stockholm') - interval '12 hours')::date = ((e.t AT TIME ZONE 'Europe/Stockholm') - interval '12 hours')::date
    GROUP BY e.sid, e.t`, [fyr.map((x) => x.sid), fyr.map((x) => new Date(x.t).toISOString())]);
  // extract(epoch …) kommer som numeric-sträng ("…000.000"): nyckeln måste byggas av talet, annars matchar inget — och "0 av 0" är
  // inte ett utfall utan ett nyckelfel (första körningen 37522992220 skrev just så). Därför vakten: tomt ⇒ stopp.
  const m = new Map<string, number | null>(rows.map((r) => [`${r.sid}|${Number(r.t)}`, r.m === null ? null : Number(r.m)]));
  if (fyr.length && ![...m.values()].some((x) => x !== null)) throw new Error("perNatt: ingen fyrning fick en lägsta yta — nyckelfel, inte ett utfall (DECISIONS #470)");
  return m;
};
type Mått = { perFyrning: Rakning; perEpisod: Rakning; perNatt: Rakning };
const matt = (fyr: Fyrning[], nattMin: Map<string, number | null>, urval: (f: Fyrning) => boolean): Mått => {
  const till = fyr.filter((f) => !basNatter.has(`${f.sid}|${nattFor(f.t)}`) && urval(f)).sort((a, b) => a.t - b.t);
  const ep = new Map<string, Fyrning>();
  for (const f of till) { const k = `${f.sid}|${nattFor(f.t)}`; if (!ep.has(k)) ep.set(k, f); }
  const utfall = (f: Fyrning) => ((f.rader ?? 0) > 0 ? f.minEfter : null);
  return { perFyrning: rakna(till.map(utfall)), perEpisod: rakna([...ep.values()].map(utfall)),
    perNatt: rakna([...ep.values()].map((f) => nattMin.get(`${f.sid}|${f.t}`) ?? null)) };
};

// ── M1 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
console.log(`\n═══ M1 — priset per fyrning (Ö-B2: av tillkomna fyrningar), per episod (dagens mått, #456) och per natt (övre gräns) ═══`);
let kandidater = 0, raknebara = 0;
for (const p of natet) {
  if (p.fonster === 15 && l15 === 0) continue;
  raknebara++;
  const fyr = await hamta(p);
  const nattMin = await perNatt(fyr);
  const hel = matt(fyr, nattMin, () => true), a = matt(fyr, nattMin, (f) => nattFor(f.t) < mitt), b = matt(fyr, nattMin, (f) => nattFor(f.t) >= mitt);
  const kand = kandidat(hel.perFyrning) && kandidat(a.perFyrning) && kandidat(b.perFyrning);
  if (kand) kandidater++;
  console.log(`  ${namn(p)}${samma(p, start) ? " (START)" : ""}: per fyrning ${rad(hel.perFyrning)} ${kandidat(hel.perFyrning) ? "✓" : "✗"} · A ${pct(pris(a.perFyrning))} B ${pct(pris(b.perFyrning))}` +
    `${kand ? "  ⇐ KANDIDAT PER FYRNING, båda halvorna" : ""}\n      per episod ${rad(hel.perEpisod)} · per natt ${rad(hel.perNatt)}`);
}
console.log(`  ⇒ ${kandidater} av ${raknebara} räknebara punkter har pris per fyrning ≤ ${TAK_PRIS * 100} % på ≥ ${GOLV_EPISODER} fyrningar, hela vintern och i båda halvorna.` +
  ` ${kandidater ? "Kalibreringens \"ingen vinnare\" (#468) beror på måttet — en kalibrering på rätt mått är Bengts och Axels fråga (D7)." : "Måttet ändrar inte kalibreringens utfall."}`);

// ── M2 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
console.log(`\n═══ M2 — daggpunkten vid fyrningen, startvärdena ${namn(start)} (förutsägelse #470: dagg ≤ +${FRYS_C} faller ut i majoritet, dagg > +${FRYS_C} uteblir i majoritet) ═══`);
const fyr0 = await hamta(start);
const vader = new Map((await q(`
  WITH e AS (SELECT unnest($1::text[]) AS sid, unnest($2::timestamptz[]) AS t)
  SELECT e.sid, extract(epoch FROM e.t) * 1000 AS t, w.surface_temp_c AS yta, w.dewpoint_c AS dagg
  FROM e JOIN weather_observations w ON w.station_id = e.sid AND w.sample_time = e.t`, [fyr0.map((x) => x.sid), fyr0.map((x) => new Date(x.t).toISOString())]))
  .map((r) => [`${r.sid}|${Number(r.t)}`, { yta: r.yta === null ? null : Number(r.yta), dagg: r.dagg === null ? null : Number(r.dagg) }]));
if (fyr0.length && !fyr0.some((f) => vader.get(`${f.sid}|${f.t}`)?.dagg !== undefined && vader.get(`${f.sid}|${f.t}`)!.dagg !== null))
  throw new Error("M2: ingen fyrning fick en daggpunkt — nyckelfel eller tomt fält, inte ett utfall (DECISIONS #470)");
console.log(`  fyrningar ${fyr0.length}, med väderrad ${fyr0.filter((f) => vader.has(`${f.sid}|${f.t}`)).length}, med daggpunkt ${fyr0.filter((f) => vader.get(`${f.sid}|${f.t}`)?.dagg != null).length}`);
const nattMin0 = await perNatt(fyr0);
const v = (f: Fyrning) => vader.get(`${f.sid}|${f.t}`) ?? { yta: null, dagg: null };
for (const [rubrik, klassa] of [["Daggpunkten", (f: Fyrning) => daggklass(v(f).dagg)], ["Yta − dagg", (f: Fyrning) => gapklass(v(f).yta, v(f).dagg)]] as const) {
  console.log(`  ${rubrik}:`);
  const klasser = [...new Set(fyr0.map(klassa))].sort();
  for (const kl of klasser) {
    const m = matt(fyr0, nattMin0, (f) => klassa(f) === kl);
    console.log(`    ${kl}: per episod ${rad(m.perEpisod)} · per fyrning ${rad(m.perFyrning)} · per natt ${rad(m.perNatt)}`);
  }
}
// Nettonyttan per daggklass: den tidigaste fyrningen inom 90 min före facit, samma natt, där baslinjen inte fångade (som ovanpå).
const tider = new Map<string, Fyrning[]>();
for (const f of fyr0) tider.set(f.sid, [...(tider.get(f.sid) ?? []), f]);
const netto = new Map<string, number>(), fangade = new Map<string, number>();
for (const fa of facit) {
  const tr = (tider.get(fa.sid) ?? []).filter((f) => f.t >= fa.tFacit - UTFALLSFONSTER_MIN * MIN && f.t < fa.tFacit && nattFor(f.t) === nattFor(fa.tFacit)).sort((x, y) => x.t - y.t)[0];
  if (!tr) continue;
  const kl = daggklass(v(tr).dagg);
  fangade.set(kl, (fangade.get(kl) ?? 0) + 1);
  if (!(fa.tBas !== null && fa.tBas <= fa.tFacit)) netto.set(kl, (netto.get(kl) ?? 0) + 1);
}
console.log(`  Nettonyttan (facit bara efterhalkan fångar) per daggklass vid den fångande fyrningen:`);
for (const kl of [...new Set([...fangade.keys(), ...netto.keys()])].sort()) console.log(`    ${kl}: fångar ${fangade.get(kl) ?? 0} · nettonytt ${netto.get(kl) ?? 0}`);
await db.end();
