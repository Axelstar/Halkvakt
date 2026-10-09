// VÄDERKÄLLAN, NIVÅ 1B (kort #318, DECISIONS #505; Bengt 9/10: "kör nivå 1b nu"). INGEN DOM och inget val av källa (Axels, #504).
// Nivå 1 (#504) jämförde ECMWF IFS och MET Nordic mot SMHI:s luft vid 70 punkter. Här jämförs samma två källor mot Trafikverkets
// vägstationers EGEN luft och daggpunkt, vid alla stationer med data i kuvösen — samma stationer som FYSIK prövades på (#485).
// MET Norways dokumentation (läst 9/10) nämner inte vägstationerna bland det MET Nordic korrigerar mot, så facit är oberoende.
//   Källorna i stationens punkt: MET Nordic Analysis i rutan närmast (release kuvos-metnordic-2024-25), ECMWF IFS ur Open-Meteos
//   arkiv i stationens koordinat (release kuvos-ecmwf-2024-25, hämtad av vaderkallan-1b-hamta-ecmwf-2026-10-09.py).
//   Daggpunkten räknas ur luft och relativ fukt med Magnus formel för båda källorna (samma formel, så skillnaden är källans).
//   Facit: vägstationens luft (air_temp_c) och daggpunkt (dewpoint_c) i avläsningen närmast hela timmen (±15 min), stationer i
//   karantän utelämnade (#299, med givarvakten #75), värdevaktens spann hållna. Bara timmar där facit och båda källorna finns.
// Måtten: grova fel (> 2 °C), MAE och medelfel, för alla timmar, nära noll (facit −3…+2 °C) och frost (≤ 0 °C); norr och söder om
// 62° (#502); avståndsband = stationens avstånd till närmaste andra station; och vägt med trafiken — varje väglagspunkt (#490)
// räknas till närmaste station med sin ÅDT × 2 km, och en stations andel grova fel väger med den trafiken.
// Kör: DATABASE_URL=... METNORDIC=metnordic/metnordic_2024-25.csv.gz node --experimental-strip-types scripts/matningar/kuvos-metnordic-ecmwf-1b-2026-10-09.ts [--sjalvtest]
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { karantanSql } from "../../publish/snapshot-core.ts";
import { BANDS } from "../../publish/grind-a.ts";
import { lasVader, NT, T0 } from "./kuvos-c8-metnordic-2026-10-07.ts";
import { km } from "./kuvos-trafik-per-band-2026-10-08.ts";
import { SPANN } from "../vardevakten.ts";

const GROVT_C = 2, NORR_LAT = 62, KM_PER_PUNKT = 2;
const ECMWF_URL = "https://github.com/Axelstar/Halkvakt/releases/download/kuvos-ecmwf-2024-25/ecmwf_1b_2024-25.csv.gz";

/** Daggpunkt ur luft (°C) och relativ fukt (andel 0–1), Magnus över vatten (Alduchov–Eskridge, b 17,62, c 243,12 °C). */
export function dagg(t: number, rh: number): number {
  if (!(rh > 0)) return NaN;
  const g = Math.log(Math.min(rh, 1)) + (17.62 * t) / (243.12 + t);
  return (243.12 * g) / (17.62 - g);
}

type Mal = { n: number; abs: number; sum: number; grova: number };
const tom = (): Mal => ({ n: 0, abs: 0, sum: 0, grova: 0 });
const lagg = (m: Mal, fel: number) => { m.n++; m.abs += Math.abs(fel); m.sum += fel; if (Math.abs(fel) > GROVT_C) m.grova++; };
const pct = (a: number, b: number) => (b ? `${(100 * a / b).toFixed(1).replace(".", ",")} %` : "—");
const rad = (m: Mal) => m.n ? `grova ${pct(m.grova, m.n).padStart(7)} · MAE ${(m.abs / m.n).toFixed(2)} · medel ${(m.sum / m.n >= 0 ? "+" : "")}${(m.sum / m.n).toFixed(2)} °C (n ${m.n})` : "n 0";

export type Obs = { station: string; h: number; luft: number; dagg: number | null };   // h = timme sedan epoken
export type Kalla = Map<string, { t: Float32Array; rh: Float32Array }>;               // rh som andel 0–1, NT timmar från T0

/** Hela jämförelsen. stLage: station → läge; vikt: station → trafik (fordonskm per dygn). Returnerar talen för självtestet. */
export function jamfor(obs: Obs[], mn: Kalla, ec: Kalla, stLage: Map<string, { lat: number; lon: number }>, vikt: Map<string, number>) {
  const isolering = new Map<string, number>();
  const lagen = [...stLage.entries()];
  for (const [id, p] of lagen) {
    let b = Infinity;
    for (const [id2, q] of lagen) if (id2 !== id) b = Math.min(b, km(p, q));
    isolering.set(id, b);
  }
  const bandAv = (id: string) => BANDS.find(([, lo, hi]) => (isolering.get(id) ?? Infinity) >= lo && (isolering.get(id) ?? Infinity) < hi)?.[0] ?? BANDS[BANDS.length - 1][0];
  const nycklar = ["alla", "nära noll (−3…+2 °C)", "frost (≤ 0 °C)", "norr om 62°", "söder om 62°", ...BANDS.map(([b]) => `band ${b}`)];
  const T: Record<string, [Mal, Mal]> = {}, D: Record<string, [Mal, Mal]> = {};
  for (const k of nycklar) { T[k] = [tom(), tom()]; D[k] = [tom(), tom()]; }
  const perStation = new Map<string, { t: [Mal, Mal]; d: [Mal, Mal] }>();
  const stationer = new Set<string>();
  for (const o of obs) {
    const i = o.h - T0;
    if (i < 0 || i >= NT) continue;
    const a = mn.get(o.station), b = ec.get(o.station), p = stLage.get(o.station);
    if (!a || !b || !p) continue;
    const tm = a.t[i], te = b.t[i];
    if (!Number.isFinite(tm) || !Number.isFinite(te)) continue;
    stationer.add(o.station);
    const reg = p.lat >= NORR_LAT ? "norr om 62°" : "söder om 62°";
    const grupper = ["alla", reg, `band ${bandAv(o.station)}`];
    if (o.luft >= -3 && o.luft <= 2) grupper.push("nära noll (−3…+2 °C)");
    if (o.luft <= 0) grupper.push("frost (≤ 0 °C)");
    let s = perStation.get(o.station);
    if (!s) { s = { t: [tom(), tom()], d: [tom(), tom()] }; perStation.set(o.station, s); }
    for (const g of grupper) { lagg(T[g][0], tm - o.luft); lagg(T[g][1], te - o.luft); }
    lagg(s.t[0], tm - o.luft); lagg(s.t[1], te - o.luft);
    if (o.dagg !== null) {
      const dm = dagg(tm, a.rh[i]), de = dagg(te, b.rh[i]);
      if (Number.isFinite(dm) && Number.isFinite(de)) {
        for (const g of grupper) { lagg(D[g][0], dm - o.dagg); lagg(D[g][1], de - o.dagg); }
        lagg(s.d[0], dm - o.dagg); lagg(s.d[1], de - o.dagg);
      }
    }
  }
  // Trafikvägt: stationens andel grova fel vägd med trafiken närmast den, för hela landet och per region.
  const vagt = (falt: "t" | "d", j: 0 | 1, region?: string) => {
    let w = 0, x = 0;
    for (const [id, s] of perStation) {
      const m = s[falt][j], v = vikt.get(id) ?? 0, p = stLage.get(id)!;
      if (!m.n || !v) continue;
      if (region && (p.lat >= NORR_LAT ? "norr om 62°" : "söder om 62°") !== region) continue;
      w += v; x += v * (m.grova / m.n);
    }
    return w ? x / w : NaN;
  };
  return { T, D, nycklar, stationer: stationer.size, vagt };
}

function skrivUt(r: ReturnType<typeof jamfor>) {
  console.log(`  stationer med facit och båda källorna: ${r.stationer}`);
  for (const [namn, M] of [["LUFTTEMPERATUR", r.T], ["DAGGPUNKT", r.D]] as const) {
    console.log(`\n═══ ${namn} — källan minus vägstationens mätning ═══`);
    for (const k of r.nycklar) {
      console.log(`  ${k}`);
      console.log(`      MET Nordic  ${rad(M[k][0])}`);
      console.log(`      ECMWF       ${rad(M[k][1])}`);
    }
  }
  console.log(`\n═══ VÄGT MED TRAFIKEN (andel grova fel per station, vägd med ÅDT × 2 km närmast stationen) ═══`);
  for (const [falt, namn] of [["t", "luft"], ["d", "daggpunkt"]] as const)
    for (const reg of [undefined, "norr om 62°", "söder om 62°"]) {
      const f = (x: number) => (Number.isFinite(x) ? `${(100 * x).toFixed(1).replace(".", ",")} %` : "—");
      console.log(`  ${namn.padEnd(10)} ${(reg ?? "hela landet").padEnd(14)} MET Nordic ${f(r.vagt(falt, 0, reg))} · ECMWF ${f(r.vagt(falt, 1, reg))}`);
    }
}

/** ECMWF-filen: station_id,tid_utc,t2m_c,rh_pct. Fäller vid fel rubrik, en timme utanför fönstret eller ett värde utanför spannet. */
export function lasEcmwf(text: string): Kalla {
  const [tLo, tHi] = SPANN["t2m_c"], [rLo, rHi] = SPANN["rh_pct"] ?? [NaN, NaN];
  if (!Number.isFinite(rLo)) throw new Error("rh_pct: OBESIKTIGAT — inget spann i scripts/vardevakten.ts");
  const ut: Kalla = new Map();
  const rader = text.trim().split(/\r?\n/);
  if (rader[0] !== "station_id,tid_utc,t2m_c,rh_pct") throw new Error(`oväntad rubrik: ${rader[0]}`);
  for (const r of rader.slice(1)) {
    const [id, tid, t, rh] = r.split(",");
    const i = Date.parse(tid) / 3_600_000 - T0;
    if (!Number.isInteger(i) || i < 0 || i >= NT) throw new Error(`timme utanför fönstret: ${tid}`);
    let k = ut.get(id);
    if (!k) { k = { t: new Float32Array(NT).fill(NaN), rh: new Float32Array(NT).fill(NaN) }; ut.set(id, k); }
    if (t !== "") { const v = Number(t); if (v < tLo || v > tHi) throw new Error(`t2m_c ${v} utanför spannet`); k.t[i] = v; }
    if (rh !== "") { const v = Number(rh); if (v < rLo || v > rHi) throw new Error(`rh_pct ${v} utanför spannet`); k.rh[i] = v / 100; }
  }
  return ut;
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  k(Math.abs(dagg(0, 1)) < 1e-9 && Math.abs(dagg(10, 0.5) - 0.06) < 0.1 && Math.abs(dagg(-10, 0.8) - (-12.6)) < 0.3, "Magnus: 0 °C/100 % ger 0, 10 °C/50 % ≈ 0,1, −10 °C/80 % ≈ −12,6");
  // Två stationer, en norr och en söder. MET Nordic träffar luften exakt, ECMWF ligger 3 °C för varmt; fukten 100 % i båda.
  const stLage = new Map([["n", { lat: 66, lon: 20 }], ["s", { lat: 56, lon: 13 }]]);
  const mn: Kalla = new Map(), ec: Kalla = new Map(), obs: Obs[] = [];
  for (const id of ["n", "s"]) {
    const a = { t: new Float32Array(NT).fill(NaN), rh: new Float32Array(NT).fill(NaN) };
    const b = { t: new Float32Array(NT).fill(NaN), rh: new Float32Array(NT).fill(NaN) };
    for (let i = 0; i < 48; i++) {
      const luft = -1 + Math.sin(i / 5);
      a.t[i] = luft; a.rh[i] = 1; b.t[i] = luft + 3; b.rh[i] = 1;
      obs.push({ station: id, h: T0 + i, luft, dagg: luft });
    }
    mn.set(id, a); ec.set(id, b);
  }
  obs.push({ station: "n", h: T0 + NT + 5, luft: 0, dagg: 0 });   // utanför fönstret: räknas inte
  const skrivet: string[] = []; const orig = console.log; console.log = (x?: unknown) => { skrivet.push(String(x)); };
  let r: ReturnType<typeof jamfor>;
  try { r = jamfor(obs, mn, ec, stLage, new Map([["n", 1], ["s", 3]])); skrivUt(r); } finally { console.log = orig; }
  k(r!.T["alla"][0].n === 96 && r!.T["alla"][0].grova === 0 && r!.T["alla"][1].grova === 96, "luften: MET Nordic utan grova fel, ECMWF med 96 av 96");
  k(r!.D["alla"][0].grova === 0 && r!.D["alla"][1].grova === 96, "daggpunkten följer luften när fukten är 100 %");
  k(r!.T["norr om 62°"][0].n === 48 && r!.T["söder om 62°"][0].n === 48, "norr och söder var för sig");
  k(Math.abs(r!.vagt("t", 1) - 1) < 1e-9 && r!.vagt("t", 0) === 0, "trafikvägningen");
  k(!skrivet.some((s) => s.includes("NaN")), "utskriften utan NaN");
  let fall = ""; try { lasEcmwf("station_id,tid_utc,t2m_c,rh_pct\n1,2024-11-01T00:00:00Z,99,50\n"); } catch (e) { fall = String(e); }
  k(fall.includes("utanför spannet"), "ett värde utanför spannet fäller");
  const e = lasEcmwf("station_id,tid_utc,t2m_c,rh_pct\n1,2024-10-31T01:00:00Z,-2.5,80\n");
  k(e.get("1")!.t[1] === -2.5 && Math.abs(e.get("1")!.rh[1] - 0.8) < 1e-6, "ECMWF-filen läses in på rätt timme, fukten som andel");
  console.log("✓ självtest: Magnus, MET Nordic exakt mot ECMWF +3 °C, daggpunkten, norr och söder, trafikvägningen, ECMWF-filen och spannet");
  process.exit(0);
}

if (korsSjalv) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const t0 = performance.now(), min = () => `${((performance.now() - t0) / 60_000).toFixed(1)} min`;
  console.log("VÄDERKÄLLAN NIVÅ 1B (kort #318, DECISIONS #505): MET Nordic och ECMWF mot vägstationernas luft och daggpunkt, vintern 2024/25. Ingen dom.");
  const man = JSON.parse(readFileSync(new URL("../../kuvos/ecmwf-leverans.json", import.meta.url), "utf8"));
  const svar = await fetch(ECMWF_URL);
  if (!svar.ok) { console.error(`ECMWF-releasen: HTTP ${svar.status}`); process.exit(1); }
  const gz = Buffer.from(await svar.arrayBuffer()), sha = createHash("sha256").update(gz).digest("hex");
  console.log(`  ECMWF: ${ECMWF_URL.split("/").pop()} sha256 ${sha}${sha === man.filer[0].sha256 ? " = manifestet" : " ≠ MANIFESTET"}`);
  if (sha !== man.filer[0].sha256) process.exit(1);
  const ec = lasEcmwf(gunzipSync(gz).toString("utf8"));
  const { vader } = await lasVader(process.env.METNORDIC ?? "metnordic/metnordic_2024-25.csv.gz");
  const mn: Kalla = new Map();
  for (const [id, v] of vader) mn.set(id, { t: v[0], rh: v[1] });
  console.log(`  MET Nordic ${mn.size} stationer, ECMWF ${ec.size} (${min()})`);
  const stationerFil: { id: string; lat: number; lon: number }[] = JSON.parse(readFileSync(new URL("../../data/vagdata/stationer.json", import.meta.url), "utf8")).rader;
  const stLage = new Map(stationerFil.map((s) => [String(s.id), { lat: s.lat, lon: s.lon }]));
  const punkter: { lon: number; lat: number; adt_fordon: number | null }[] = JSON.parse(readFileSync(new URL("../../data/vagdata/vaglagspunkter.json", import.meta.url), "utf8")).rader;
  const lista = [...stLage.entries()], vikt = new Map<string, number>();
  for (const p of punkter) {
    if (p.adt_fordon == null) continue;
    let b = Infinity, id = "";
    for (const [sid, q] of lista) { const d = km(p, q); if (d < b) { b = d; id = sid; } }
    vikt.set(id, (vikt.get(id) ?? 0) + p.adt_fordon * KM_PER_PUNKT);
  }
  const pg = (await import("pg")).default;
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  await db.query("SET TimeZone = 'UTC'");
  await db.query("SET statement_timeout = 0");
  const [lo, hi] = SPANN["air_temp_c"], [dlo, dhi] = SPANN["dewpoint_c"];
  const rows = (await db.query(`
    SELECT DISTINCT ON (station_id, h) station_id, h, air_temp_c, dewpoint_c FROM (
      SELECT station_id, round(extract(epoch FROM sample_time) / 3600)::bigint AS h,
             abs(extract(epoch FROM sample_time) - round(extract(epoch FROM sample_time) / 3600) * 3600) AS ifran, air_temp_c, dewpoint_c
      FROM weather_observations
      WHERE air_temp_c IS NOT NULL AND air_temp_c BETWEEN ${lo} AND ${hi} AND ${karantanSql("weather_observations")}) x
    WHERE ifran <= 900
    ORDER BY station_id, h, ifran`)).rows as any[];
  await db.end();
  const obs: Obs[] = rows.map((r) => ({ station: String(r.station_id), h: Number(r.h), luft: +r.air_temp_c,
    dagg: r.dewpoint_c == null || +r.dewpoint_c < dlo || +r.dewpoint_c > dhi ? null : +r.dewpoint_c }));
  console.log(`  vägstationernas timmar: ${obs.length} (${new Set(obs.map((o) => o.station)).size} stationer, daggpunkt i ${obs.filter((o) => o.dagg !== null).length}) (${min()})`);
  if (obs.length < 100_000) { console.error("UNDERLAGSVAKT: för lite — arkivet eller vakterna är trasiga"); process.exit(1); }
  skrivUt(jamfor(obs, mn, ec, stLage, vikt));
  console.log(`\nKlart (${min()}). Ingen dom och inget val av källa (#504: Axels).`);
}
