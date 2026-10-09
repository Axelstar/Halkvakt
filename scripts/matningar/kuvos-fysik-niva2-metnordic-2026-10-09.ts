// VÄDERKÄLLAN NIVÅ 2 I KUVÖSEN — fysikspåret på MET Nordic mot fysikspåret på ECMWF (kort #319, DECISIONS #509; Bengt 9/10: "kör nivå 2").
// INGEN DOM. Kedjan i fysik/ har körts i samma jobb (fysik/niva2/kedja.py): KONTROLL är den frysta kedjan omkörd på ECMWF, NIVÅ 2 samma
// kedja på MET Nordic med fysiken omkalibrerad och de tre ECMWF-fälten ersatta (fysik/README.md). Båda lämnar filer i FYSIK:s format,
// och här läses de exakt som FYSIK lästes (#485): RÅ:s punkter ur grind A med vakterna, bandet = RÅ:s närmaste bidragande granne.
//   Kandidaterna:  RÅ (kontrollen på populationen) · FYSIK (den frysta filen, #485) · KONTROLL (kedjan omkörd) · NIVÅ 2 ·
//                  fysiken ensam på ECMWF och på MET Nordic (utan rättelsen — vädrets egen skillnad) · OFFSET (taket).
//   Måtten:        grind A:s A1/A2/A3 per band och totalt på de punkter där alla har ett värde; frysflaggan; norr och söder om 62°
//                  per band och vägt med trafiken (regioner.ts, #507). Dessutom hur stor del av punkterna där KONTROLL = FYSIK.
// Kör: DATABASE_URL=... FYSIK=fysik/fysik-2024-25.csv.gz KONTROLL=niva2-ut/kontroll-fysik-2024-25.csv.gz ... node --experimental-strip-types scripts/matningar/kuvos-fysik-niva2-metnordic-2026-10-09.ts [--sjalvtest]
import { readFileSync } from "node:fs";
import { evaluate, stats, BANDS, type Station, type Eval } from "../../publish/grind-a.ts";
import { RADVAKT_SQL, karantanSql } from "../../publish/snapshot-core.ts";
import { skrivFrysflaggan } from "../../publish/frysflagga.ts";
import { fysikVid, lasFysik, linjera, spannkontroll, type Fysik } from "./kuvos-fysik-2026-10-08.ts";
import { lasTrafikvikter, regionsrapport, NORR_LAT, type Rad } from "./regioner.ts";

const BUCKET_S = 1800;
export const FILER: [string, string, string][] = [   // [kandidatens namn, miljövariabel, standardfil]
  ["FYSIK (fryst)", "FYSIK", "fysik/fysik-2024-25.csv.gz"],
  ["KONTROLL", "KONTROLL", "niva2-ut/kontroll-fysik-2024-25.csv.gz"],
  ["NIVÅ 2", "NIVA2", "niva2-ut/niva2-fysik-2024-25.csv.gz"],
  ["ECMWF ensam", "KONTROLL_TS", "niva2-ut/kontroll-ts-2024-25.csv.gz"],
  ["MET N. ensam", "NIVA2_TS", "niva2-ut/niva2-ts-2024-25.csv.gz"],
];
const pct = (x: number) => (Number.isFinite(x) ? `${(100 * x).toFixed(2).replace(".", ",")} %` : "—");
const rad = (s: ReturnType<typeof stats>) =>
  s.n ? `n ${s.n} · MAE ${s.mae.toFixed(2)} °C · grova ${pct(s.gross)} [±${(1.96 * 100 * s.grossSe).toFixed(2)} pe] · frysklassfel ${pct(s.freeze)}` : "n 0";

/** Hela läsningen; returnerar grova fel per kandidat på de gemensamma punkterna och andelen punkter där KONTROLL = FYSIK. */
export function niva2ILkuvosen(stations: Map<string, Station>, filer: { namn: string; f: Fysik }[], vikt: Map<string, number>) {
  const RA = evaluate(stations, { utanOffset: true }), OFF = evaluate(stations);
  const kand: { namn: string; v: (number | null)[] }[] = [
    { namn: "RÅ", v: RA.map((e) => e.pred) },
    ...filer.map(({ namn, f }) => ({ namn, v: RA.map((e) => fysikVid(f, e.station, e.t)) })),
    { namn: "OFFSET (taket)", v: linjera(RA, OFF) },
  ];
  const N = RA.length, med = new Uint8Array(N);
  for (let k = 0; k < N; k++) med[k] = kand.every((x) => x.v[k] !== null) ? 1 : 0;
  const nMed = med.reduce((a, b) => a + b, 0);
  console.log(`  punkter: ${kand.map((x) => `${x.namn} ${x.v.filter((y) => y !== null).length}`).join(" · ")} · gemensamma ${nMed}`);
  const ut: Record<string, number> = {};
  console.log(`\n═══ Grind A:s mått på de ${nMed} gemensamma punkterna (bandet = RÅ:s närmaste bidragande granne) ═══`);
  for (const { namn, v } of kand) {
    const ev: Eval[] = [];
    for (let k = 0; k < N; k++) if (med[k]) ev.push({ ...RA[k], pred: v[k]! });
    const tot = stats(ev); ut[namn] = tot.gross;
    console.log(`  ${namn}: ${rad(tot)}`);
    for (const [b, lo, hi] of BANDS) console.log(`      ${b.padEnd(8)} ${rad(stats(ev.filter((e) => e.ankKm >= lo && e.ankKm < hi)))}`);
  }
  // Återskapandet: KONTROLL mot den frysta FYSIK-filen, punkt för punkt.
  const iF = kand.findIndex((x) => x.namn.startsWith("FYSIK")), iK = kand.findIndex((x) => x.namn === "KONTROLL");
  if (iF > 0 && iK > 0) {
    let lika = 0, nara = 0;
    for (let k = 0; k < N; k++) if (med[k]) { const d = Math.abs(kand[iF].v[k]! - kand[iK].v[k]!); if (d < 0.005) lika++; if (d < 0.1) nara++; }
    ut["kontroll=fysik"] = lika / nMed;
    console.log(`\n  KONTROLL mot FYSIK (fryst): lika inom 0,005 °C på ${pct(lika / nMed)} av punkterna, inom 0,1 °C på ${pct(nara / nMed)}`);
  }
  const rader: { measured: number; ankKm: number; station: string; v: (number | null)[] }[] = [];
  for (let k = 0; k < N; k++) if (med[k]) rader.push({ measured: RA[k].measured, ankKm: RA[k].ankKm, station: RA[k].station, v: kand.map((x) => x.v[k]) });
  for (const r of skrivFrysflaggan(rader, kand.map(({ namn }, j) => ({ namn, pick: (r: { v: (number | null)[] }) => r.v[j] })), BANDS)) console.log(r);
  const reg: Rad[] = RA.map((e) => ({ station: e.station, lat: stations.get(e.station)!.lat, ankKm: e.ankKm, measured: e.measured }));
  for (const r of regionsrapport(reg, kand, vikt)) console.log(r);
  return ut;
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  // Åtta stationar på en rad 10 km isär, fyra norr om 62° och fyra söder; ytan = vinterkurva + stationens konstant.
  const B0 = Math.floor(Date.UTC(2025, 0, 10) / 1000 / BUCKET_S), NB = 200;
  const stations = new Map<string, Station>();
  for (let i = 0; i < 8; i++) {
    const series = new Map<number, number>();
    for (let b = 0; b < NB; b++) series.set(B0 + b, -3 + 3 * Math.sin(b / 20) + 0.4 * i);
    stations.set(`S${i}`, { lon: 15 + i * 0.165, lat: i < 4 ? 66 : 58, series });
  }
  // Filerna: FYSIK = yta + 0,5; KONTROLL = FYSIK exakt utom på S7 (+0,2); NIVÅ 2 = yta + 0,3 utom S0 (+3); ensamma = yta ± 2,5.
  const fil = (f: (id: string, y: number) => number) => {
    const rader = ["station_id,t_utc,fysik_c"];
    for (const [id, s] of stations) for (const [b, y] of s.series) rader.push(`${id},${new Date(b * BUCKET_S * 1000).toISOString().replace(".000Z", "Z")},${f(id, y).toFixed(2)}`);
    return lasFysik(Buffer.from(rader.join("\n") + "\n"));
  };
  const filer = [
    { namn: "FYSIK (fryst)", f: fil((_, y) => y + 0.5) },
    { namn: "KONTROLL", f: fil((id, y) => y + (id === "S7" ? 0.7 : 0.5)) },
    { namn: "NIVÅ 2", f: fil((id, y) => y + (id === "S0" ? 3 : 0.3)) },
    { namn: "ECMWF ensam", f: fil((_, y) => y + 2.5) },
    { namn: "MET N. ensam", f: fil((_, y) => y - 2.5) },
  ];
  const vikt = new Map([...stations.keys()].map((id, i) => [id, i < 4 ? 100 : 900]));
  const log = console.log; const fangat: string[] = []; console.log = (...a: unknown[]) => { fangat.push(a.join(" ")); };
  const ut = niva2ILkuvosen(stations, filer, vikt);
  console.log = log;
  k(ut["RÅ"] === 0 && ut["FYSIK (fryst)"] === 0 && ut["OFFSET (taket)"] < 0.01, `RÅ, FYSIK och OFFSET utan grova fel: ${ut["RÅ"]}, ${ut["FYSIK (fryst)"]}, ${ut["OFFSET (taket)"]}`);
  k(ut["NIVÅ 2"] > 0.08 && ut["NIVÅ 2"] < 0.2, `NIVÅ 2:s grova fel = S0:s andel (${ut["NIVÅ 2"]})`);
  k(ut["ECMWF ensam"] === 1 && ut["MET N. ensam"] === 1, "de ensamma fysikerna ±2,5 °C är grova fel överallt");
  k(ut["kontroll=fysik"] > 0.8 && ut["kontroll=fysik"] < 0.95, `KONTROLL = FYSIK på sju av åtta stationer (${ut["kontroll=fysik"]})`);
  k(fangat.some((r) => r.includes("FRYSFLAGGAN")) && fangat.some((r) => r.includes("NORR OCH SÖDER")), "frysflaggan och norr/söder skrivs");
  const n2 = fangat.find((r) => r.startsWith("  norr · alla band")) ?? "";
  k(/norr · alla band\s+0,0 %\s+0,0 %\s+0,0 %\s+\d+,\d %\s+100,0 %/.test(n2), `norr-raden: NIVÅ 2:s fel ligger i norr (S0): ${n2.trim()}`);
  console.log("✓ självtest: fem filer läses mot RÅ:s punkter, måtten per band, återskapandet KONTROLL = FYSIK, frysflaggan, norr och söder vägt med trafiken");
  process.exit(0);
}

if (korsSjalv) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const t0 = performance.now(), min = () => `${((performance.now() - t0) / 60_000).toFixed(1)} min`;
  console.log("VÄDERKÄLLAN NIVÅ 2 I KUVÖSEN (kort #319, DECISIONS #509): fysikspåret på MET Nordic mot ECMWF, vintern 2024/25. Ingen dom.");
  const filer: { namn: string; f: Fysik }[] = [];
  for (const [namn, env, std] of FILER) {
    const fil = process.env[env] ?? std;
    const f = lasFysik(readFileSync(fil));
    console.log(`  ${namn}: ${fil} — ${f.rader} rader, ${f.serie.size} stationer, ${f.nb} hinkar från ${new Date(f.b0 * BUCKET_S * 1000).toISOString()}; sha256 ${f.sha256}; ${spannkontroll(f)}`);
    if (env === "FYSIK") {
      const vantad = JSON.parse(readFileSync(new URL("../../kuvos/fysik-leverans.json", import.meta.url), "utf8")).filer.find((x: { fil: string }) => fil.endsWith(x.fil))?.sha256;
      if (vantad !== f.sha256) { console.error("FYSIK-filen är inte den frysta (kuvos/fysik-leverans.json)"); process.exit(1); }
      console.log("    = manifestet");
    }
    filer.push({ namn, f });
  }
  const vikt = lasTrafikvikter();
  const pg = (await import("pg")).default;
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  await db.query("SET TimeZone = 'UTC'");
  await db.query("SET statement_timeout = 0");
  const [{ kuvos }] = (await db.query("SELECT to_regprocedure('kuvos.now()') IS NOT NULL AS kuvos")).rows;
  if (!kuvos) { console.error("Inte kuvösen (kuvos.now() saknas)"); process.exit(1); }
  const res = (await db.query(`
    SELECT DISTINCT ON (station_id, b) station_id, ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat,
      floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c
    FROM weather_observations
    WHERE surface_temp_c IS NOT NULL AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12
      AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}
    ORDER BY station_id, b, sample_time DESC`)).rows as any[];
  await db.end();
  const stations = new Map<string, Station>();
  for (const r of res) {
    let s = stations.get(r.station_id);
    if (!s) { s = { lon: +r.lon, lat: +r.lat, series: new Map() }; stations.set(r.station_id, s); }
    s.series.set(Number(r.b), +r.surface_temp_c);
  }
  console.log(`  ${stations.size} stationer, ${res.length} bucketade avläsningar (${min()}); ${vikt.size} stationer med trafik; norr = lat ≥ ${NORR_LAT}°`);
  if (stations.size < 100 || res.length < 1000) { console.error("UNDERLAGSVAKT: för lite"); process.exit(1); }
  niva2ILkuvosen(stations, filer, vikt);
  console.log(`\nKlart (${min()}). Ingen dom: nivå 2 läses mot FYSIK och mot RÅ per band, norr och söder; valet av källa är Axels (kort #319).`);
}
