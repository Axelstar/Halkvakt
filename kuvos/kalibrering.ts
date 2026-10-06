// KUVÖSENS KALIBRERING (kort #232; regel D i docs/TROSKLAR-KOMBINATIONEN.md §5; DECISIONS #425, #428, #468): säsongens enda
// gemensamma kalibrering av efterhalkans kombination, på vintern 2024/25, efter riktningsprovet (#467). Förregistrerad i #468.
//
// RUTNÄTET (§3, DECISIONS #219): N × trendfönster × fall — 4 × 3 × 4 = 48 punkter, med minsta regn > 0, startband +1…+3, radar av,
// N_varning av. Svepen och startvärdena HÄRLEDS ur sql/028 vid körning (listorna i D1-vakten och standardvärdena), aldrig kopierade;
// ett värde utanför svepen avvisas av funktionen själv. 15-minutersfönstret går inte att räkna i kuvösen (en rad per halvtimme,
// väg A): de punkterna redovisas som ej räknebara, aldrig som noll (D5). Om trendarkivet ändå bär 15-minuterslutningar räknas de.
//
// MÅTTET är ovanpå-tabellens (DECISIONS #456, kuvos/ovanpa.ts): nettonytt = facittillfällen som bara punkten fångar, inte baslinjen;
// pris = uteblev av punktens tillkomna episoder med utfall. Samma facit som riktningsprovet: stationens egen yta, det blev kallt.
//
// REGELN (D4, skriven i #468 innan något tal lästs): KANDIDAT = räknebar punkt med pris ≤ TAK_PRIS (Ö-B2) räknat på minst
// GOLV_EPISODER tillkomna episoder med utfall, och nettonytt > 0. VINNARE = kandidaten med störst nettonytt över hela vintern;
// lika ⇒ lägst pris ⇒ färst ändrade dimensioner mot startvärdena ⇒ rutnätets ordning. Vinnaren HÅLLER om den är kandidat på samma
// villkor i BÅDA halvorna av vintern, delade vid facitnätternas mittnatt som T-A. Håller den inte, eller finns ingen kandidat,
// står startvärdena. Alla punkter skrivs ut (D5). Skriptet föreslår; frysningen (D6) är Bengts ord, skrivet i DECISIONS.
//
// Kör: DATABASE_URL=... node --experimental-strip-types kuvos/kalibrering.ts   (läser utfall — bara i kuvösen, på Bengts ord)
import { readFileSync } from "node:fs";
import { natt } from "./baslinjen.ts";
import { ovanpa, type Facit, type Fyrning } from "./ovanpa.ts";

export const TAK_PRIS = 0.25;      // Ö-B2, TROSKLAR-OVERGANGAR §4 — första kopian i kod; dokumentet är källan
export const GOLV_EPISODER = 20;   // #468: ett pris räknat på färre tillkomna episoder med utfall bär ingen dom — punkten är "för tunn"

export type Punkt = { n: number; fonster: number; fall: number };
export type Tal = { fyrningar: number; episoder: number; fangade: number; nettonytt: number; tillkomna: number; medUtfall: number; uteblev: number };
export type Utfall = { punkt: Punkt; raknebar: boolean; hel: Tal; a: Tal; b: Tal };

const lista = (sql: string, form: RegExp, vad: string): number[] => {
  const m = sql.match(form);
  if (!m) throw new Error(`sql/028: hittar inte svepet för ${vad} — D1-vakten har ändrats; läs om kalibreringen (DECISIONS #468)`);
  return m[1].split(",").map((x) => Number(x.replace(/[^\d.]/g, "")));
};
/** Svepen ur D1-vakten i sql/028: N i timmar, trendfönster i minuter, fall i °C. */
export function svepen(sql028: string): { n: number[]; fonster: number[]; fall: number[] } {
  return {
    n: lista(sql028, /p_n NOT IN \(((?:interval '\d+ hours?'(?:, )?)+)\)/, "N"),
    fonster: lista(sql028, /p_trendfonster NOT IN \(([\d, ]+)\)/, "trendfönstret"),
    fall: lista(sql028, /p_fall NOT IN \(([\d., ]+)\)/, "fallet"),
  };
}
/** Betans startvärden ur funktionens standardvärden (sql/028, DECISIONS #222). */
export function startvarden(sql028: string): Punkt {
  const tal = (form: RegExp, vad: string) => {
    const m = sql028.match(form);
    if (!m) throw new Error(`sql/028: hittar inte startvärdet för ${vad} (DECISIONS #468)`);
    return Number(m[1]);
  };
  return { n: tal(/p_n interval DEFAULT '(\d+) hours?'/, "N"), fonster: tal(/p_trendfonster int DEFAULT (\d+)/, "trendfönstret"),
    fall: tal(/p_fall numeric DEFAULT ([\d.]+)/, "fallet") };
}
export function rutnat(sql028: string): Punkt[] {
  const s = svepen(sql028);
  return s.n.flatMap((n) => s.fonster.flatMap((fonster) => s.fall.map((fall) => ({ n, fonster, fall }))));
}
export const samma = (a: Punkt, b: Punkt) => a.n === b.n && a.fonster === b.fonster && a.fall === b.fall;
export const pris = (t: Tal): number | null => (t.medUtfall > 0 ? t.uteblev / t.medUtfall : null);
export const kandidat = (t: Tal) => t.medUtfall >= GOLV_EPISODER && t.uteblev / t.medUtfall <= TAK_PRIS && t.nettonytt > 0;

/** D4. Returnerar vinnaren om den håller i båda halvorna, annars null med skälet. */
export function valj(utfall: Utfall[], start: Punkt): { vinnare: Utfall | null; skal: string } {
  const andrade = (p: Punkt) => Number(p.n !== start.n) + Number(p.fonster !== start.fonster) + Number(p.fall !== start.fall);
  const kand = utfall.map((u, i) => ({ u, i })).filter(({ u }) => u.raknebar && kandidat(u.hel));
  if (kand.length === 0) return { vinnare: null, skal: `ingen punkt är kandidat över hela vintern (pris ≤ ${TAK_PRIS * 100} % på ≥ ${GOLV_EPISODER} episoder och nettonytt > 0) — startvärdena står (D4)` };
  kand.sort((x, y) => y.u.hel.nettonytt - x.u.hel.nettonytt || pris(x.u.hel)! - pris(y.u.hel)! || andrade(x.u.punkt) - andrade(y.u.punkt) || x.i - y.i);
  const v = kand[0].u;
  const fel = (["a", "b"] as const).filter((h) => !kandidat(v[h]));
  if (fel.length) return { vinnare: null, skal: `vinnaren ${namn(v.punkt)} håller inte i ${fel.length === 2 ? "någon halva" : `halva ${fel[0].toUpperCase()}`} — startvärdena står (D4)` };
  return { vinnare: v, skal: `${namn(v.punkt)} är kandidat över hela vintern och i båda halvorna, bland ${kand.length} kandidater av ${utfall.filter((u) => u.raknebar).length} räknebara` };
}

const sv = (x: number) => String(x).replace(".", ",");
export const namn = (p: Punkt) => `N ${p.n} h · ${p.fonster} min · fall ${sv(p.fall)}`;
const pct = (x: number | null) => (x === null ? "–" : `${(100 * x).toFixed(1).replace(".", ",")} %`);
export const rad = (t: Tal) => `${t.fyrningar} fyrn · ${t.episoder} ep · fångar ${t.fangade} · NETTO ${t.nettonytt} · tillk ${t.tillkomna}/${t.medUtfall} uteblev ${t.uteblev} ⇒ PRIS ${pct(pris(t))}`;

const tom: Tal = { fyrningar: 0, episoder: 0, fangade: 0, nettonytt: 0, tillkomna: 0, medUtfall: 0, uteblev: 0 };

export function tal(facit: Facit[], fyrningar: Fyrning[]): Tal {
  const d = ovanpa(facit, { p: fyrningar }).delar[0];
  return { fyrningar: d.fyrningar, episoder: d.episoder, fangade: d.fangade, nettonytt: d.nettonytt, tillkomna: d.tillkomna, medUtfall: d.medUtfall, uteblev: d.uteblev };
}
/** Hela vintern och de två halvorna, delade vid facitnätternas mittnatt (som grind T-A). */
export function halvor(facit: Facit[], fyrningar: Fyrning[], mitt: string): { hel: Tal; a: Tal; b: Tal } {
  const n = (ms: number) => natt(ms / 1000);
  return { hel: tal(facit, fyrningar),
    a: tal(facit.filter((f) => n(f.tFacit) < mitt), fyrningar.filter((f) => n(f.t) < mitt)),
    b: tal(facit.filter((f) => n(f.tFacit) >= mitt), fyrningar.filter((f) => n(f.t) >= mitt)) };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!)) {
  const { installera, FUNKTION } = await import("./efterhalkan.ts");
  const { FACIT_SQL } = await import("./ovanpa.ts");
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const pg = (await import("pg")).default;
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  await db.query("SET TimeZone = 'UTC'");
  await db.query("SET statement_timeout = 0");
  const q = async (sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows as any[];
  // Bara kuvösen: driftens arkiv bär vintern 2026/27, och D6 säger att den inte läses före domen.
  const [{ kuvos }] = await q("SELECT to_regprocedure('kuvos.now()') IS NOT NULL AS kuvos");
  if (!kuvos) { console.error("Inte kuvösen (kuvos.now() saknas): kalibreringen läser bara vintern 2024/25 (DECISIONS #425, D6)"); process.exit(1); }
  const sql028 = readFileSync(new URL("../sql/028_uppspelning_varianter.sql", import.meta.url), "utf8");
  const start = startvarden(sql028), natet = rutnat(sql028);
  console.log(`KALIBRERINGEN I KUVÖSEN (regel D, DECISIONS #425, #468) — ${natet.length} punkter ur sql/028:s svep, startvärdena ${namn(start)}`);
  if (!natet.some((p) => samma(p, start))) throw new Error("startvärdena står inte i rutnätet — D1");
  await installera((s) => q(s));
  const [{ fonster, l15 }] = await q(`SELECT (now() - (SELECT min(sample_time) FROM weather_observations) + interval '1 day')::text AS fonster,
    (SELECT count(lutning15_c) FROM trend_kandidater)::int AS l15`);
  const facit: Facit[] = (await q(FACIT_SQL)).map((r) => ({ sid: String(r.sid), tFacit: Number(r.t_facit), tBas: r.t_bas === null ? null : Number(r.t_bas) }));
  const natter = [...new Set(facit.map((f) => natt(f.tFacit / 1000)))].sort();
  const mitt = natter[Math.floor(natter.length / 2)] ?? "";
  console.log(`  facit ${facit.length} stationsnätter över ${natter.length} nätter · halvorna delas vid ${mitt} · 15-minuterslutningar i trendarkivet: ${l15}` +
    `${l15 === 0 ? " ⇒ 15-minutersfönstret är ej räknebart (väg A)" : ""}\n`);
  const utfall: Utfall[] = [];
  for (const punkt of natet) {
    if (punkt.fonster === 15 && l15 === 0) {
      utfall.push({ punkt, raknebar: false, hel: tom, a: tom, b: tom });
      console.log(`  ${namn(punkt)}: EJ RÄKNEBAR i kuvösen`); continue;
    }
    const t0 = performance.now();
    const fyr: Fyrning[] = (await q(`SELECT sid, extract(epoch FROM t) * 1000 AS t, min_efter, rader FROM ${FUNKTION}(
        p_fonster := $1::interval, p_n := $2::interval, p_fall := $3, p_trendfonster := $4)`, [fonster, `${punkt.n} hours`, punkt.fall, punkt.fonster]))
      .map((r) => ({ sid: String(r.sid), t: Number(r.t), minEfter: r.min_efter === null ? null : Number(r.min_efter), rader: r.rader === null ? null : Number(r.rader) }));
    const h = halvor(facit, fyr, mitt);
    const u = { punkt, raknebar: true, ...h };
    utfall.push(u);
    console.log(`  ${namn(punkt)}${samma(punkt, start) ? " (START)" : ""}: ${rad(h.hel)} ${kandidat(h.hel) ? "✓" : "✗"}` +
      `\n      A: ${rad(h.a)} ${kandidat(h.a) ? "✓" : "✗"}\n      B: ${rad(h.b)} ${kandidat(h.b) ? "✓" : "✗"}   (${((performance.now() - t0) / 1000).toFixed(0)} s)`);
  }
  const v = valj(utfall, start);
  console.log(`\nD4: ${v.skal}`);
  const s = utfall.find((u) => samma(u.punkt, start))!;
  console.log(`  startvärdena ${namn(start)}: ${rad(s.hel)} · nettonytt ${pct(s.hel.nettonytt / facit.length)} av facit (Ö-B1 kräver ≥ 5 %, döms inte här)`);
  if (v.vinnare) console.log(`  vinnaren ${namn(v.vinnare.punkt)}: ${rad(v.vinnare.hel)} · nettonytt ${pct(v.vinnare.hel.nettonytt / facit.length)} av facit`);
  console.log(`\nFÖRSLAG TILL FRYSNING (D6, Bengts ord): ${v.vinnare ? namn(v.vinnare.punkt) : `startvärdena ${namn(start)}`} · ` +
    `${natet.length} punkter prövade, ${utfall.filter((u) => u.raknebar).length} räknebara · vintern 2024/25 · facit ${facit.length}`);
  await db.end();
}
