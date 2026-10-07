// RUTNÄTSMODELLEN I KUVÖSEN — RN OCH RN+R (kort #302, DECISIONS #481; förregistrerad 6/10 på Axels ord, körd på Bengts "kör RN" 7/10).
// INGEN DOM, inga trösklar. Kandidaterna är fasta sedan 6/10 (#481, ursprungligen #470 på grenen kuvos/rutnatet-469):
//   RN    yta(p,t) = luft_rutnät(p,t) + Δ̂(p,t), där Δ̂ är det invers-distansviktade medlet av Δ_N = yta_N(t) − luft_rutnät(N,t) över
//         samma grannar som RÅ (fem närmaste inom 50 km, vikt 1/max(km, 1), målet uteslutet). Vägens skillnad mot luften sprids ut.
//   RN+R  som RN, men Δ:s beroende av vädret dras först ur: Δ = g(moln, vind, långvåg, kortvåg, fukt) + rest, g linjär och anpassad på
//         alla stationer UTOM målet; grannarnas rest sprids ut. g:s koefficienter skrivs ut.
//   Bredvid, oförändrade: RÅ, RÅ+HÖJD (varje granne korrigerad med 0,0065 °C/m · höjdskillnaden, höjder ur EU-DEM som höjdprovet) och
//   OFFSET (taket).
// GENOMFÖRANDET (fast i #481 före körningen): alla kandidater räknas av grind A:s evaluate() med utanOffset och en justering per granne,
// så att "samma grannar som RÅ" är exakt sant — för RN är justeringen luft(mål) − luft(granne), för RN+R dessutom g(mål) − g(granne)
// med målets g, för RÅ+HÖJD −0,0065 · (h_mål − h_granne). En halvtimmeshink läser analysen vid sin början. Måtten: grind A:s A1, A2
// och A3 per band (närmaste bidragande granne) och totalt, och frysflaggan med tre marginaler mot K-A:s måttstock (#437,
// publish/frysflagga.ts), allt på de punkter där alla kandidater har ett värde.
// Kör: DATABASE_URL=... METNORDIC=metnordic/metnordic_2024-25.csv.gz node --experimental-strip-types scripts/matningar/kuvos-rn-2026-10-07.ts [--sjalvtest]
import { evaluate, BANDS, type Station, type Eval } from "../../publish/grind-a.ts";
import { RADVAKT_SQL, karantanSql } from "../../publish/snapshot-core.ts";
import { skrivFrysflaggan } from "../../publish/frysflagga.ts";
import { lasVader, spannkontroll, timIndex, matt, los, NT, T0, FALT, type Vader } from "./kuvos-c8-metnordic-2026-10-07.ts";

const BUCKET_S = 1800;
const LAPSE = 0.0065;                     // °C per meter, som höjdprovet (scripts/hojd-prov.ts)
const POPULATION_C = 5;                   // grind A:s population: yta ≤ +5 °C
export const R_NAMN = ["konstant", "moln", "vind m/s", "långvåg W/m²", "kortvåg W/m²", "fukt"];

/** RN+R:s väderkolumner i #470:s ordning: moln, vind, långvåg och kortvåg i W/m², fukt. Null om något saknas. */
export function vaderX(v: Float32Array[] | undefined, i: number): number[] | null {
  if (!v || i < 0 || i >= NT) return null;
  const x = [v[3][i], v[2][i], v[5][i] / 3600, v[6][i] / 3600, v[1][i]];
  return x.some((a) => Number.isNaN(a)) ? null : x;
}
export const luft = (v: Float32Array[] | undefined, i: number) => (v && i >= 0 && i < NT && !Number.isNaN(v[0][i]) ? v[0][i] : null);

/** g: Δ = yta − luft regresserat på väderkolumnerna, per station anpassat på alla ANDRA stationer (summorna minus stationens egna). */
export function anpassaG(stations: Map<string, Station>, vader: Vader): { beta: Map<string, number[]>; hel: number[]; rader: number } {
  const p = 6, tomA = () => Array.from({ length: p }, () => new Array(p).fill(0)), tomB = () => new Array(p).fill(0);
  const AS = new Map<string, number[][]>(), BS = new Map<string, number[]>(), A = tomA(), B = tomB();
  let rader = 0;
  for (const [id, s] of stations) {
    const v = vader.get(id); if (!v) continue;
    const As = tomA(), Bs = tomB();
    for (const [t, yta] of s.series) {
      if (yta > POPULATION_C) continue;
      const i = timIndex(t), l = luft(v, i), x = vaderX(v, i);
      if (l === null || !x) continue;
      const z = [1, ...x], d = yta - l;
      for (let a = 0; a < p; a++) { Bs[a] += z[a] * d; for (let b = 0; b < p; b++) As[a][b] += z[a] * z[b]; }
      rader++;
    }
    AS.set(id, As); BS.set(id, Bs);
    for (let a = 0; a < p; a++) { B[a] += Bs[a]; for (let b = 0; b < p; b++) A[a][b] += As[a][b]; }
  }
  const stab = (a: number, b: number) => (a === b && a > 0 ? 1e-6 : 0);
  const beta = new Map<string, number[]>();
  for (const [id, As] of AS) beta.set(id, los(A.map((r, a) => r.map((x, b) => x - As[a][b] + stab(a, b))), B.map((x, a) => x - BS.get(id)![a])));
  return { beta, hel: los(A.map((r, a) => r.map((x, b) => x + stab(a, b))), B), rader };
}

/** RÅ+HÖJD:s justering, som höjdprovet: högre mål är kallare — −0,0065 °C/m gånger (h_mål − h_granne); saknad höjd = grannen bidrar inte. */
export const hojdJustering = (hojd: Map<string, number>) => (m: string, n: string): number | undefined => {
  const a = hojd.get(m), b = hojd.get(n);
  return a === undefined || b === undefined ? undefined : -LAPSE * (a - b);
};

/** En kandidat är en delföljd av RÅ i samma ordning (grind A går stationerna och hinkarna i samma ordning för alla varianter);
 *  ger kandidatens skattning per RÅ-punkt, eller null. Fäller om kandidaten har en punkt som RÅ saknar. */
export function linjera(RA: Eval[], K: Eval[]): (number | null)[] {
  const ut: (number | null)[] = new Array(RA.length).fill(null);
  let j = 0;
  for (let i = 0; i < RA.length && j < K.length; i++) if (K[j].station === RA[i].station && K[j].t === RA[i].t) { ut[i] = K[j].pred; j++; }
  if (j !== K.length) throw new Error(`kandidaten har ${K.length - j} punkter som RÅ saknar`);
  return ut;
}

/** Hela läsningen. hojd = stationshöjd i meter (null = RÅ+HÖJD hoppas över). Returnerar MAE och grova fel per kandidat (för självtestet). */
export function rn(stations: Map<string, Station>, vader: Vader, hojd: Map<string, number> | null) {
  const g = anpassaG(stations, vader);
  console.log(`  RN+R:s g: ${g.rader} hinkar (yta ≤ +${POPULATION_C} °C med väder) från ${g.beta.size} stationer; på hela landet: ` +
    g.hel.map((b, j) => `${R_NAMN[j]} ${b.toFixed(4)}`).join(" · "));
  const L = (id: string, t: number) => luft(vader.get(id), timIndex(t));
  const RA = evaluate(stations, { utanOffset: true });
  const OFF = evaluate(stations);
  const RN = evaluate(stations, { utanOffset: true, justering: (m, n, t) => { const a = L(m, t), b = L(n, t); return a === null || b === null ? undefined : a - b; } });
  const RNR = evaluate(stations, { utanOffset: true, justering: (m, n, t) => {
    const i = timIndex(t), vm = vader.get(m), vn = vader.get(n), a = luft(vm, i), b = luft(vn, i), xm = vaderX(vm, i), xn = vaderX(vn, i), be = g.beta.get(m);
    if (a === null || b === null || !xm || !xn || !be) return undefined;
    return a - b + xm.reduce((s, x, j) => s + be[j + 1] * (x - xn[j]), 0);
  } });
  const HOJD = hojd ? evaluate(stations, { utanOffset: true, justering: hojdJustering(hojd) }) : [];
  const kand: [string, (number | null)[]][] = [["RÅ", RA.map((e) => e.pred)], ["RÅ+HÖJD", hojd ? linjera(RA, HOJD) : RA.map(() => null)],
    ["RN", linjera(RA, RN)], ["RN+R", linjera(RA, RNR)], ["OFFSET (taket)", linjera(RA, OFF)]];
  const aktiva = kand.filter(([n]) => hojd || n !== "RÅ+HÖJD");
  const N = RA.length, M = Float64Array.from(RA.map((e) => e.measured)), ANK = Float64Array.from(RA.map((e) => e.ankKm));
  const med = new Uint8Array(N);
  for (let k = 0; k < N; k++) med[k] = aktiva.every(([, v]) => v[k] !== null) ? 1 : 0;
  const nMed = med.reduce((a, b) => a + b, 0);
  console.log(`  punkter: ${aktiva.map(([n, v]) => `${n} ${v.filter((x) => x !== null).length}`).join(" · ")} · gemensamma ${nMed}` +
    (hojd ? "" : " · RÅ+HÖJD hoppas över (höjderna räcker inte)"));
  const pct = (x: number) => (Number.isFinite(x) ? `${(100 * x).toFixed(1).replace(".", ",")} %` : "—");
  const rad = (s: { n: number; mae: number; gross: number; freeze: number }) => (s.n ? `n ${s.n} · MAE ${s.mae.toFixed(2)} °C · grova ${pct(s.gross)} · frysklassfel ${pct(s.freeze)}` : "n 0");
  console.log(`\n═══ Grind A:s mått på de ${nMed} gemensamma punkterna (bandet = närmaste bidragande granne) ═══`);
  const sammanfattning: Record<string, { mae: number; gross: number }> = {};
  for (const [namn, v] of aktiva) {
    const P = Float64Array.from(v.map((x) => x ?? NaN));
    const r = matt(M, P, ANK, med);
    sammanfattning[namn] = { mae: r.tot.mae, gross: r.tot.gross };
    console.log(`  ${namn}: ${rad(r.tot)}`);
    BANDS.forEach(([b], i) => console.log(`      ${b.padEnd(8)} ${rad(r.band[i])}`));
  }
  // Frysflaggan (#437) på samma punkter.
  const rader: { measured: number; ankKm: number; station: string; v: (number | null)[] }[] = [];
  for (let k = 0; k < N; k++) if (med[k]) rader.push({ measured: M[k], ankKm: ANK[k], station: RA[k].station, v: aktiva.map(([, v]) => v[k]) });
  for (const r of skrivFrysflaggan(rader, aktiva.map(([namn], j) => ({ namn, pick: (r: { v: (number | null)[] }) => r.v[j] })), BANDS)) console.log(r);
  return sammanfattning;
}

/** Stationshöjder ur EU-DEM via opentopodata, som höjdprovet: 100 per anrop, ~1 anrop per sekund. */
async function hamtaHojder(stations: Map<string, Station>): Promise<Map<string, number>> {
  const ids = [...stations.keys()], ut = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const locs = batch.map((id) => { const s = stations.get(id)!; return `${s.lat.toFixed(5)},${s.lon.toFixed(5)}`; }).join("|");
    try {
      const r = await fetch(`https://api.opentopodata.org/v1/eudem25m?locations=${locs}`, { headers: { Accept: "application/json" } });
      if (!r.ok) { console.error(`  opentopodata: HTTP ${r.status} på batch ${i / 100 + 1}`); continue; }
      const j: any = await r.json();
      (j.results ?? []).forEach((res: any, k: number) => { if (typeof res?.elevation === "number") ut.set(batch[k], res.elevation); });
    } catch (e) { console.error(`  opentopodata: ${String(e).slice(0, 100)} på batch ${i / 100 + 1}`); }
    await new Promise((ok) => setTimeout(ok, 1200));
  }
  return ut;
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  let seed = 5; const slump = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  // Tio stationer längs en linje, 8 km isär. Luften skiljer sig ojämnt mellan stationerna (2·sin(1,3·s)) och har en dygnsgång; vägen ligger 0,5 °C över luften
  // plus en väderdel 1,2·moln − 0,3·vind. RN ska nästan träffa (bara väderdelen skiljer grannarna åt), RN+R ännu bättre, RÅ sämre.
  const stations = new Map<string, Station>(), vader: Vader = new Map(), hojd = new Map<string, number>();
  const t0 = T0 * 2;
  for (let s = 0; s < 10; s++) {
    const id = `s${s}`, series = new Map<number, number>(), v = FALT.map(() => new Float32Array(NT).fill(NaN));
    for (let h = 0; h < 120; h++) {
      const i = h, l = -3 + 2 * Math.sin(1.3 * s) + 1.5 * Math.sin(h / 4), moln = slump(), vind = 1 + 5 * slump();
      v[0][i] = l; v[1][i] = 0.8; v[2][i] = vind; v[3][i] = moln; v[4][i] = 0; v[5][i] = 9e5; v[6][i] = 0;
      const yta = l + 0.5 + 1.2 * moln - 0.3 * vind;
      series.set(t0 + 2 * h, yta); series.set(t0 + 2 * h + 1, yta);
    }
    stations.set(id, { lon: 13 + s * 0.13, lat: 56, series }); vader.set(id, v); hojd.set(id, 50 + 10 * s);
  }
  // g återfinner väderdelen.
  const g = anpassaG(stations, vader);
  k(Math.abs(g.hel[0] - 0.5) < 0.05 && Math.abs(g.hel[1] - 1.2) < 0.05 && Math.abs(g.hel[2] + 0.3) < 0.02, `g återfinner Δ = 0,5 + 1,2·moln − 0,3·vind (${g.hel.map((b) => b.toFixed(3)).join(", ")})`);
  // g tränas UTAN målet: en station vars väg går 5 °C varmare ska inte se sin egen avvikelse i sin g, men landets g ska se den.
  const avv = new Map([...stations].map(([id, s]) => [id, id === "s9" ? { ...s, series: new Map([...s.series].map(([t, y]) => [t, y + 5])) } : s]));
  const ga = anpassaG(avv, vader);
  k(Math.abs(ga.beta.get("s9")![0] - 0.5) < 0.05 && ga.hel[0] > 0.8, `g utan målet (s9:s konstant ${ga.beta.get("s9")![0].toFixed(3)}, landets ${ga.hel[0].toFixed(3)})`);
  // Linjeringen fäller på en främmande punkt och lämnar luckor som null.
  const RA0 = [{ station: "a", t: 1 }, { station: "a", t: 2 }, { station: "b", t: 1 }] as Eval[];
  const l1 = linjera(RA0, [{ station: "a", t: 2, pred: 7 }] as Eval[]);
  k(l1[0] === null && l1[1] === 7 && l1[2] === null, "linjeringen: luckor blir null");
  let fall = false; try { linjera(RA0, [{ station: "c", t: 9, pred: 1 }] as Eval[]); } catch { fall = true; }
  k(fall, "linjeringen fäller på en punkt RÅ saknar");
  // Hela läsningen.
  const skrivet: string[] = []; const orig = console.log; console.log = (x?: unknown) => { skrivet.push(String(x)); };
  let r: ReturnType<typeof rn>;
  try { r = rn(stations, vader, hojd); } finally { console.log = orig; }
  k(r!["RN+R"].mae < 0.02, `RN+R träffar den syntetiska vägen (MAE ${r!["RN+R"].mae.toFixed(3)})`);
  k(r!["RN"].mae < r!["RÅ"].mae, `RN slår RÅ när luften bär gradienten (RN ${r!["RN"].mae.toFixed(3)} mot RÅ ${r!["RÅ"].mae.toFixed(3)})`);
  k(!skrivet.some((s) => s.includes("NaN")), "utskriften utan NaN");
  k(skrivet.some((s) => s.includes("FRYSFLAGGAN MED TRE MARGINALER")) && skrivet.some((s) => s.startsWith("  RÅ+HÖJD:")), "utskriften når RÅ+HÖJD och frysflaggan");
  // RÅ+HÖJD: högre mål är kallare — en granne 100 m lägre drar ned skattningen 0,65 °C.
  const h2 = new Map([["s0", 100], ["s1", 0]]), one = new Map([...stations].slice(0, 2));
  const hh = evaluate(one, { utanOffset: true, justering: hojdJustering(h2) }), rr = evaluate(one, { utanOffset: true });
  k(hh.length > 0 && Math.abs(hh[0].pred - rr[0].pred + 0.65) < 1e-9, "RÅ+HÖJD: högre mål kallare");
  console.log("✓ självtest: g, linjeringen, RN och RN+R på syntetisk väg, RÅ+HÖJD:s tecken, utskriften med frysflaggan");
  process.exit(0);
}

if (korsSjalv) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const fil = process.env.METNORDIC ?? "metnordic/metnordic_2024-25.csv.gz";
  const t0 = performance.now();
  const min = () => `${((performance.now() - t0) / 60_000).toFixed(1)} min`;
  console.log("RUTNÄTSMODELLEN I KUVÖSEN (kort #302, DECISIONS #481): RN och RN+R mot RÅ, RÅ+HÖJD och OFFSET, vintern 2024/25. Ingen dom.");
  const { vader, rader } = await lasVader(fil);
  console.log(`  MET Nordic: ${rader} rader, ${vader.size} stationer (${min()})`);
  const sk = spannkontroll(vader);
  if (sk.fel.length) { console.error(`VÄRDEVAKTEN FÄLLER: ${sk.fel.join("; ")}`); process.exit(1); }
  console.log(`  värdevakten: alla ${FALT.length} fält inom spannen`);
  const pg = (await import("pg")).default;
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  await db.query("SET TimeZone = 'UTC'");
  await db.query("SET statement_timeout = 0");
  const q = async (sql: string) => (await db.query(sql)).rows as any[];
  const [{ kuvos }] = await q("SELECT to_regprocedure('kuvos.now()') IS NOT NULL AS kuvos");
  if (!kuvos) { console.error("Inte kuvösen (kuvos.now() saknas): läsningen gäller bara vintern 2024/25 (DECISIONS #481)"); process.exit(1); }
  const res = await q(`
    SELECT DISTINCT ON (station_id, b) station_id, ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
      floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c
    FROM weather_observations
    WHERE surface_temp_c IS NOT NULL AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12
      AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}
    ORDER BY station_id, b, sample_time DESC`);
  await db.end();
  const stations = new Map<string, Station>();
  for (const r of res) {
    let s = stations.get(r.station_id);
    if (!s) { s = { lon: +r.lon, lat: +r.lat, series: new Map() }; stations.set(r.station_id, s); }
    s.series.set(Number(r.b), +r.surface_temp_c);
  }
  console.log(`  ${stations.size} stationer, ${res.length} bucketade avläsningar; med väder ${[...stations.keys()].filter((id) => vader.has(id)).length} (${min()})`);
  if (stations.size < 100 || res.length < 1000) { console.error("UNDERLAGSVAKT: för lite — arkivet eller vakterna är trasiga"); process.exit(1); }
  const hojder = await hamtaHojder(stations);
  console.log(`  höjder: ${hojder.size} av ${stations.size} stationer fick EU-DEM-höjd (© Europeiska unionen, Copernicus, via opentopodata.org)`);
  const r = rn(stations, vader, hojder.size >= stations.size * 0.9 ? hojder : null);
  console.log(`\n  kontroll mot C8 och K1 (RÅ 7,5 % grova fel på 4 353 206 punkter): RÅ här ${(100 * r["RÅ"].gross).toFixed(1).replace(".", ",")} % på de gemensamma punkterna`);
  console.log(`\nKlart (${min()}). Ingen dom: domen läses på vintern 2026/27, förregistrerad före den (DECISIONS #481).`);
}
