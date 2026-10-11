// BLANDNINGEN I KUVÖSEN — fysikspårets FYSIK+GRANNAR och FYSIK+BLANDNING som filer, i analysläge och i operativt läge (DECISIONS #490,
// förslag 1 och 2; Bengts ja 8/10). INGEN DOM, inga trösklar. Kandidaterna är FILER i FYSIK-filens form (#485), räknade i kuvösjobbet
// av Axels frysta fysik/kuvos_replica.py (fysik/blandning/grannar_blandning.py, DECISIONS #516) och aldrig utanför det:
// en skattning av ytan per station och halvtimme för vintern 2024/25, där målet aldrig är indata och dess region är gömd i rättelsen.
//   analysläge   vädret är ECMWF:s analys, det som hände — samma som replikan 7/10 (docs/FYSIKSPARET-FRYS-2026-10-07.md)
//   operativt    vid varje halvtimme bara den väderprognos som hade funnits tillgänglig då; grannarnas mätningar (RÅ, grannarnas fel)
//                vid samma halvtimme, eftersom de finns i realtid. Ledtiden står i manifestet per fil.
// Filerna och blandning/manifest.json skrivs i jobbet och lämnar det aldrig (de bär grannarnas uppmätta yta, #506); mätningen fäller en
// fil vars summa inte är manifestets.
// Måtten som FYSIK 8/10: grind A:s A1/A2/A3 per band (bandet = RÅ:s närmaste bidragande granne) och totalt på de punkter där alla
// kandidater har ett värde, norr/söder om 62° per band och vägt med trafiken (regioner.ts, #502), och frysflaggan (#437). RÅ är
// kontrollen och ska landa i 7,4–7,6 %. korBlandning() är hela läsningen; kuvos-blandning-niva2-2026-10-11.ts kör den på nivå 2 (#517).
// Kör: DATABASE_URL=... node --experimental-strip-types scripts/matningar/kuvos-blandning-2026-10-08.ts [--sjalvtest]
import { readFileSync } from "node:fs";
import { evaluate, stats, BANDS, type Station, type Eval } from "../../publish/grind-a.ts";
import { RADVAKT_SQL, karantanSql } from "../../publish/snapshot-core.ts";
import { skrivFrysflaggan } from "../../publish/frysflagga.ts";
import { lasFysik, fysikVid, linjera, spannkontroll, type Fysik } from "./kuvos-fysik-2026-10-08.ts";
import { lasTrafikvikter, regionsrapport, type Rad } from "./regioner.ts";

const BUCKET_S = 1800, NORR_LAT = 62;
export type Fil = { namn: string; lage: string; fysik: Fysik };
const pct = (x: number) => (Number.isFinite(x) ? `${(100 * x).toFixed(2).replace(".", ",")} %` : "—");
const rad = (s: ReturnType<typeof stats>) =>
  `n ${s.n} · A1 MAE ${Number.isFinite(s.mae) ? s.mae.toFixed(2).replace(".", ",") : "—"} °C · A2 grova ${pct(s.gross)} · A3 frysklass ${pct(s.freeze)}`;

/** Kandidaterna på RÅ:s punkter: RÅ, OFFSET (taket) och varje fil. Måtten på de punkter där alla har ett värde. */
export function blandningILkuvosen(stations: Map<string, Station>, filer: Fil[], vikt: Map<string, number>): Record<string, number> {
  const RA = evaluate(stations, { utanOffset: true });
  const OFF = evaluate(stations);
  const kand: [string, (number | null)[]][] = [
    ["RÅ", RA.map((e) => e.pred)],
    ...filer.map((f): [string, (number | null)[]] => [`${f.namn} (${f.lage})`, RA.map((e) => fysikVid(f.fysik, e.station, e.t))]),
    ["OFFSET (taket)", linjera(RA, OFF)],
  ];
  const N = RA.length, med = new Uint8Array(N);
  for (let k = 0; k < N; k++) med[k] = kand.every(([, v]) => v[k] !== null) ? 1 : 0;
  const nMed = med.reduce((a, b) => a + b, 0);
  console.log(`  punkter: ${kand.map(([n, v]) => `${n} ${v.filter((x) => x !== null).length}`).join(" · ")} · gemensamma ${nMed}`);
  console.log(`\n═══ Grind A:s mått på de ${nMed} gemensamma punkterna (bandet = RÅ:s närmaste bidragande granne) ═══`);
  const ut: Record<string, number> = {};
  for (const [namn, v] of kand) {
    const ev: Eval[] = [];
    for (let k = 0; k < N; k++) if (med[k]) ev.push({ ...RA[k], pred: v[k]! });
    const tot = stats(ev); ut[namn] = tot.gross;
    console.log(`  ${namn}: ${rad(tot)}`);
    for (const [b, lo, hi] of BANDS) console.log(`      ${b.padEnd(8)} ${rad(stats(ev.filter((e) => e.ankKm >= lo && e.ankKm < hi)))}`);
    const norr = ev.filter((e) => stations.get(e.station)!.lat >= NORR_LAT), soder = ev.filter((e) => stations.get(e.station)!.lat < NORR_LAT);
    console.log(`      norr ≥ ${NORR_LAT}° grova ${pct(stats(norr).gross)} (n ${norr.length}) · söder grova ${pct(stats(soder).gross)} (n ${soder.length})`);
  }
  const rader: { measured: number; ankKm: number; station: string; v: (number | null)[] }[] = [];
  for (let k = 0; k < N; k++) if (med[k]) rader.push({ measured: RA[k].measured, ankKm: RA[k].ankKm, station: RA[k].station, v: kand.map(([, v]) => v[k]) });
  for (const r of skrivFrysflaggan(rader, kand.map(([namn], j) => ({ namn, pick: (r: { v: (number | null)[] }) => r.v[j] })), BANDS)) console.log(r);
  const reg: Rad[] = RA.map((e) => ({ station: e.station, lat: stations.get(e.station)!.lat, ankKm: e.ankKm, measured: e.measured }));
  for (const r of regionsrapport(reg, kand.map(([namn, v]) => ({ namn, v })), vikt)) console.log(r);
  return ut;
}

/** Manifestet: varje fil med namn, läge (analys eller operativt, med ledtiden) och sha256. Tomt = grannarna och blandningen räknades inte i jobbet. */
export function lasManifest(m: { filer?: { fil: string; namn?: string; lage?: string; sha256?: string }[] }): { fil: string; namn: string; lage: string; sha256: string }[] {
  const f = (m.filer ?? []).filter((x) => x.fil.endsWith(".csv.gz"));
  if (!f.length) throw new Error("blandning/manifest.json saknar filer — grannarna och blandningen har inte räknats i jobbet (DECISIONS #516)");
  for (const x of f) if (!x.namn || !x.lage || !/^[0-9a-f]{64}$/.test(x.sha256 ?? "")) throw new Error(`manifestet: ${x.fil} saknar namn, läge eller sha256`);
  return f as { fil: string; namn: string; lage: string; sha256: string }[];
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  let fel = 0; const k = (ok: boolean, m: string) => { if (!ok) { fel++; console.error("✗ " + m); } };
  // Tolv stationer på en linje, 6 km isär, med yta som faller jämnt; två filer: en som träffar och en som ligger 3 °C fel.
  const b0 = Math.floor(Date.parse("2025-01-10T00:00:00Z") / 1000 / BUCKET_S);
  const stations = new Map<string, Station>();
  const filRader = { ratt: ["station_id,t_utc,fysik_c"], fel: ["station_id,t_utc,fysik_c"] };
  for (let i = 0; i < 12; i++) {
    const s: Station = { lon: 15 + i * 0.1, lat: 60, series: new Map() };
    for (let j = 0; j < 60; j++) {
      const v = -2 + 0.05 * j + 0.1 * Math.sin(i + j); s.series.set(b0 + j, v);
      const t = new Date((b0 + j) * BUCKET_S * 1000).toISOString().replace(".000", "");
      filRader.ratt.push(`S${i},${t},${v.toFixed(2)}`); filRader.fel.push(`S${i},${t},${(v + 3).toFixed(2)}`);
    }
    stations.set(`S${i}`, s);
  }
  const filer: Fil[] = [
    { namn: "FYSIK+BLANDNING", lage: "analys", fysik: lasFysik(Buffer.from(filRader.ratt.join("\n") + "\n")) },
    { namn: "FYSIK+BLANDNING", lage: "operativt +6 h", fysik: lasFysik(Buffer.from(filRader.fel.join("\n") + "\n")) },
  ];
  const logg = console.log; const fangat: string[] = []; console.log = (...a: unknown[]) => { fangat.push(a.join(" ")); };
  const ut = blandningILkuvosen(stations, filer, new Map([...stations.keys()].map((id, i) => [id, i < 4 ? 100 : 900])));
  console.log = logg;
  k(ut["FYSIK+BLANDNING (analys)"] === 0, `filen som träffar har inga grova fel: ${ut["FYSIK+BLANDNING (analys)"]}`);
  k(ut["FYSIK+BLANDNING (operativt +6 h)"] === 1, `filen 3 °C fel har bara grova fel: ${ut["FYSIK+BLANDNING (operativt +6 h)"]}`);
  k("RÅ" in ut && "OFFSET (taket)" in ut, "RÅ och taket räknas bredvid");
  k(fangat.some((r) => r.includes("FRYSFLAGGAN")), "frysflaggan skrivs");
  k(fangat.some((r) => r.includes("NORR OCH SÖDER")) && fangat.some((r) => r.includes("vägt m. trafik")), "norr och söder per band och vägt med trafiken skrivs (#502)");
  let mfel = ""; try { lasManifest({ filer: [] }); } catch (e) { mfel = String(e); }
  k(mfel.includes("har inte räknats"), "ett tomt manifest fälls");
  mfel = ""; try { lasManifest({ filer: [{ fil: "a.csv.gz", namn: "X", lage: "analys", sha256: "abc" }] }); } catch (e) { mfel = String(e); }
  k(mfel.includes("saknar namn, läge eller sha256"), "en fil utan riktig summa fälls");
  k(spannkontroll(filer[0].fysik).startsWith("fysik_c:"), "värdevakten: fältet har spann");
  if (fel) process.exit(1);
  console.log("✓ självtest: filerna läses som FYSIK, mäts på RÅ:s punkter per band med taket bredvid, frysflaggan och norr/söder med trafikvikten skrivs, och manifestet fäller en fil utan läge eller summa");
  process.exit(0);
}

/** Hela läsningen i kuvösen: filerna ur blandning/manifest.json (skrivna i jobbet) mot vinterns arkiv. */
export async function korBlandning(rubrik: string) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const t0 = performance.now();
  const min = (ms: number) => `${((performance.now() - ms) / 60_000).toFixed(1)} min`;
  console.log(rubrik);
  const manifest = JSON.parse(readFileSync("blandning/manifest.json", "utf8"));        // skrivet i jobbet (DECISIONS #516)
  const filer: Fil[] = [];
  for (const m of lasManifest(manifest)) {
    const fysik = lasFysik(readFileSync(`blandning/${m.fil}`));
    console.log(`  ${m.fil} (${m.namn}, ${m.lage}): ${fysik.rader} rader, ${fysik.serie.size} stationer; sha256 ${fysik.sha256}${fysik.sha256 === m.sha256 ? " = manifestet" : " ≠ MANIFESTET"}`);
    if (fysik.sha256 !== m.sha256) { console.error(`${m.fil} har inte manifestets summa (blandning/manifest.json)`); process.exit(1); }
    console.log(`  ${spannkontroll(fysik)}`);
    filer.push({ namn: m.namn, lage: m.lage, fysik });
  }
  const vikt = lasTrafikvikter();
  const pg = (await import("pg")).default;
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  await db.query("SET TimeZone = 'UTC'");
  await db.query("SET statement_timeout = 0");
  const q = async (sql: string) => (await db.query(sql)).rows as any[];
  const [{ kuvos }] = await q("SELECT to_regprocedure('kuvos.now()') IS NOT NULL AS kuvos");
  if (!kuvos) { console.error("Inte kuvösen (kuvos.now() saknas): läsningen gäller bara vintern 2024/25"); process.exit(1); }
  // Underlaget exakt som FYSIK 8/10 och prognoslagret 6/10 (grind A:s WHERE).
  const res = await q(`
    SELECT DISTINCT ON (station_id, b) station_id, ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
      floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c
    FROM weather_observations
    WHERE surface_temp_c IS NOT NULL AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12
      AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}
    ORDER BY station_id, b, sample_time DESC`);
  const stations = new Map<string, Station>();
  for (const r of res) {
    let s = stations.get(r.station_id);
    if (!s) { s = { lon: +r.lon, lat: +r.lat, series: new Map() }; stations.set(r.station_id, s); }
    s.series.set(Number(r.b), +r.surface_temp_c);
  }
  console.log(`  ${stations.size} stationer, ${res.length} bucketade avläsningar (${min(t0)}); ${vikt.size} stationer med trafik; norr = lat ≥ ${NORR_LAT}°`);
  if (stations.size < 100 || res.length < 1000) { console.error("UNDERLAGSVAKT: för lite — arkivet eller vakterna är trasiga"); process.exit(1); }
  blandningILkuvosen(stations, filer, vikt);
  console.log(`\nklart (${min(t0)})`);
  await db.end();
}

if (korsSjalv) await korBlandning("BLANDNINGEN I KUVÖSEN (DECISIONS #490) — fysikspåret som filer, analysläge och operativt läge, hela vintern 2024/25. Ingen dom.");
