// OVANPÅ I KUVÖSEN (kort #232, DECISIONS #455 punkt 1, räknebart enligt #456). Ren räkning; frågan bor i FACIT_SQL.
//
// Facittillfället är en stationsnatt (middag till middag i svensk tid) där stationens yta når ≤ K1 (FRYS_C, uppspelningens "föll
// ut"). Baslinjen — dagens icing_point för stationen (motorn: yta ≤ 1 och fukt) — fångar det om den hade talat senast i det
// ögonblicket. En del fångar det om den fyrat för stationen samma natt inom UTFALLSFONSTER_MIN före. Nettonytt är det bara delen
// fångar; priset räknas på delens tillkomna episoder (nätter där varken baslinjen eller en annan del talat för stationen): de som
// "uteblev", där ytan inte ens kom inom nära-miss-bandet. "Nära" är inte falsklarm, och tidsvinsten står bredvid men räknas aldrig
// som nettonytt (KB-B).
import { FRYS_C } from "../engine/src/segment.ts";
import { FUKT_SQL } from "../publish/rekonstruktion.ts";
import { RADVAKT_SQL, karantanSql } from "../publish/snapshot-core.ts";
import { natt } from "./baslinjen.ts";

export const UTFALLSFONSTER_MIN = 90;   // uppspelningens p_utfall (sql/028) — kontraktsgrinden vaktar kopiorna
export const NARA_BAND_C = 0.5;          // uppspelningens p_band, T-B:s nära-miss-band (sql/028)

/** Per stationsnatt: första ögonblicket ytan når ≤ K1, och första ögonblicket med fukt (baslinjen). Bara rader som klarar vakterna:
 *  #75, radvakten, karantänen och den långsamma vakten, som grindarna. Fukten och vakterna importeras, aldrig kopierade. */
export const FACIT_SQL = `
  WITH r AS (
    SELECT w.station_id AS sid, w.sample_time AS t, ${FUKT_SQL} AS fukt
    FROM weather_observations w
    WHERE w.surface_temp_c IS NOT NULL AND w.surface_temp_c <= ${FRYS_C}
      AND w.air_temp_c IS NOT NULL AND w.surface_temp_c >= w.air_temp_c - 12 AND ${RADVAKT_SQL} AND ${karantanSql("w")}),
  n AS (
    SELECT sid, ((t AT TIME ZONE 'Europe/Stockholm') - interval '12 hours')::date AS natt, t, fukt FROM r)
  SELECT sid, extract(epoch FROM min(t)) * 1000 AS t_facit, extract(epoch FROM min(t) FILTER (WHERE fukt)) * 1000 AS t_bas
  FROM n GROUP BY sid, natt`;

export type Facit = { sid: string; tFacit: number; tBas: number | null };
export type Fyrning = { sid: string; t: number; minEfter: number | null; rader: number | null };
export type Deltal = {
  del: string; fyrningar: number; episoder: number; fangade: number; nettonytt: number; medBaslinjen: number;
  tidsvinstMedianMin: number | null; tillkomna: number; medUtfall: number; follUt: number; nara: number; uteblev: number;
};

const MIN = 60_000;
const nattFor = (ms: number) => natt(ms / 1000);

export function ovanpa(facit: Facit[], delar: Record<string, Fyrning[]>): { facit: number; baslinjen: number; delar: Deltal[] } {
  const tider = new Map<string, Map<string, number[]>>();
  for (const [n, fs] of Object.entries(delar)) {
    const m = new Map<string, number[]>();
    for (const f of fs) m.set(f.sid, [...(m.get(f.sid) ?? []), f.t]);
    tider.set(n, m);
  }
  // Uppspelningens utfallsfönster (t, t + 90 min], samma natt: en fyrning i facitögonblicket har inget försprång.
  const fangar = (n: string, f: Facit) => (tider.get(n)!.get(f.sid) ?? [])
    .filter((t) => t >= f.tFacit - UTFALLSFONSTER_MIN * MIN && t < f.tFacit && nattFor(t) === nattFor(f.tFacit)).sort((a, b) => a - b)[0];
  const bas = (f: Facit) => f.tBas !== null && f.tBas <= f.tFacit;
  const basNatter = new Set(facit.filter((f) => f.tBas !== null).map((f) => `${f.sid}|${nattFor(f.tFacit)}`));
  const ut = Object.keys(delar).map((n): Deltal => {
    const andra = Object.keys(delar).filter((x) => x !== n);
    let fangade = 0, nettonytt = 0;
    const vinster: number[] = [];
    for (const f of facit) {
      const tP = fangar(n, f);
      if (tP === undefined) continue;
      fangade++;
      if (bas(f)) vinster.push((f.tFacit - tP) / MIN);
      else if (!andra.some((a) => fangar(a, f) !== undefined)) nettonytt++;
    }
    const ep = new Map<string, Fyrning>();
    for (const x of [...delar[n]].sort((a, b) => a.t - b.t)) { const k = `${x.sid}|${nattFor(x.t)}`; if (!ep.has(k)) ep.set(k, x); }
    const andrasNatter = new Set(andra.flatMap((a) => delar[a].map((x) => `${x.sid}|${nattFor(x.t)}`)));
    const tillkomna = [...ep].filter(([k]) => !basNatter.has(k) && !andrasNatter.has(k)).map(([, x]) => x);
    const med = tillkomna.filter((x) => (x.rader ?? 0) > 0 && x.minEfter !== null);
    const follUt = med.filter((x) => x.minEfter! <= FRYS_C).length;
    const nara = med.filter((x) => x.minEfter! > FRYS_C && x.minEfter! <= FRYS_C + NARA_BAND_C).length;
    vinster.sort((a, b) => a - b);
    return { del: n, fyrningar: delar[n].length, episoder: ep.size, fangade, nettonytt, medBaslinjen: vinster.length,
      tidsvinstMedianMin: vinster.length ? vinster[Math.floor(vinster.length / 2)] : null,
      tillkomna: tillkomna.length, medUtfall: med.length, follUt, nara, uteblev: med.length - follUt - nara };
  });
  return { facit: facit.length, baslinjen: facit.filter(bas).length, delar: ut };
}

const pct = (x: number, n: number) => (n ? `${(100 * x / n).toFixed(1).replace(".", ",")} %` : "–");
export function skrivOvanpa(r: ReturnType<typeof ovanpa>): string[] {
  const rader = [`\nOVANPÅ (DECISIONS #456): ${r.facit} facittillfällen (stationsnätter med yta ≤ +${FRYS_C} °C, vakterna klarade) · ` +
    `baslinjen (dagens icing_point) fångar ${r.baslinjen} (${pct(r.baslinjen, r.facit)})`];
  for (const d of r.delar) {
    rader.push(`  ${d.del}: ${d.fyrningar} fyrningar i ${d.episoder} episoder · fångar ${d.fangade} · NETTONYTT ${d.nettonytt} (${pct(d.nettonytt, r.facit)} av facit)`);
    rader.push(`    tillkomna episoder ${d.tillkomna}, ${d.medUtfall} med utfall: föll ut ${d.follUt} · nära ${d.nara} · uteblev ${d.uteblev} ` +
      `⇒ PRIS ${pct(d.uteblev, d.medUtfall)} · tidsvinst mot baslinjen ${d.tidsvinstMedianMin === null ? "–" : `${d.tidsvinstMedianMin} min (median, ${d.medBaslinjen} tillfällen)`}, inte nettonytt`);
  }
  rader.push("  Riktningsprov, ingen dom: inga golv (DECISIONS #455).");
  return rader;
}
