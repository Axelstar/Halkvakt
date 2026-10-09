// NORR OCH SÖDER PER BAND OCH VÄGT MED TRAFIKEN — RÅ, FYSIK OCH OFFSET (kort #317 (a), DECISIONS #502, #507; Bengt 9/10: "ja till a nu").
// INGEN DOM. Utgångsläget i samma form som allt som kommer efter (nivå 2, kort #319; FYSIK+BLANDNING, kort #308): de tre läsningar
// som gjordes före #502 har bara norr och söder totalt. Underlaget och kandidaterna exakt som FYSIK i kuvösen (#485,
// kuvos-fysik-2026-10-08.ts): grind A:s WHERE med vakterna, RÅ (utanOffset), FYSIK på RÅ:s punkter, OFFSET som tak; redovisningen ur den
// gemensamma regioner.ts.
// Kör: DATABASE_URL=... FYSIK=fysik/fysik-2024-25.csv.gz node --experimental-strip-types scripts/matningar/kuvos-fysik-regioner-2026-10-09.ts [--sjalvtest]
import { readFileSync } from "node:fs";
import { evaluate, type Station } from "../../publish/grind-a.ts";
import { RADVAKT_SQL, karantanSql } from "../../publish/snapshot-core.ts";
import { fysikVid, lasFysik, linjera, spannkontroll, type Fysik } from "./kuvos-fysik-2026-10-08.ts";
import { lasTrafikvikter, regionsrapport, type Rad } from "./regioner.ts";

const BUCKET_S = 1800;

/** Kandidaterna och raderna för regionsrapporten — RÅ:s punkter, i RÅ:s ordning. */
export function kandidater(stations: Map<string, Station>, fysik: Fysik) {
  const RA = evaluate(stations, { utanOffset: true }), OFF = evaluate(stations);
  const rader: Rad[] = RA.map((e) => ({ station: e.station, lat: stations.get(e.station)!.lat, ankKm: e.ankKm, measured: e.measured }));
  return { rader, kand: [
    { namn: "RÅ", v: RA.map((e) => e.pred) as (number | null)[] },
    { namn: "FYSIK", v: RA.map((e) => fysikVid(fysik, e.station, e.t)) },
    { namn: "OFFSET (taket)", v: linjera(RA, OFF) }] };
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  // Fyra stationer på en linje i norr och fyra i söder, 8 km isär; FYSIK = ytan exakt utom vid en station i norr (+3 °C).
  const stations = new Map<string, Station>(), serie = new Map<string, Float32Array>();
  const b0 = Math.floor(Date.parse("2025-01-10T00:00:00Z") / 1000 / BUCKET_S), nb = 48;
  for (const [pre, lat] of [["n", 66], ["s", 56]] as const)
    for (let s = 0; s < 4; s++) {
      const id = `${pre}${s}`, series = new Map<number, number>(), f = new Float32Array(nb);
      for (let h = 0; h < nb; h++) { const y = -1 + Math.sin(h / 6) + 0.6 * s; series.set(b0 + h, y); f[h] = y + (id === "n0" ? 3 : 0); }
      stations.set(id, { lon: 15 + s * 0.15, lat, series }); serie.set(id, f);
    }
  const fysik: Fysik = { b0, nb, serie, rader: 8 * nb, sha256: "", lo: -2, hi: 5 };
  const { rader, kand } = kandidater(stations, fysik);
  k(rader.length > 0 && kand.every((x) => x.v.length === rader.length), "kandidaterna följer RÅ:s punkter");
  const t = regionsrapport(rader, kand, new Map([["n0", 100], ["s0", 900]])).join("\n");
  k(/norr · alla band\s+\S+ %\s+2\d,\d %/.test(t) && /söder · alla band\s+\S+ %\s+0,0 %/.test(t), "FYSIK fel bara i norr (en station av fyra)");
  k(t.includes("vägt m. trafik") && !t.includes("NaN"), "trafikvägt och utan NaN");
  console.log("✓ självtest: RÅ, FYSIK och OFFSET på RÅ:s punkter, norr och söder per band, vägt med trafiken");
  process.exit(0);
}

if (korsSjalv) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const t0 = performance.now(), min = () => `${((performance.now() - t0) / 60_000).toFixed(1)} min`;
  console.log("NORR OCH SÖDER PER BAND OCH VÄGT MED TRAFIKEN (kort #317 (a), DECISIONS #507): RÅ, FYSIK och OFFSET, vintern 2024/25. Ingen dom.");
  const fil = process.env.FYSIK ?? "fysik/fysik-2024-25.csv.gz";
  const fysik = lasFysik(readFileSync(fil));
  const vantad = JSON.parse(readFileSync(new URL("../../kuvos/fysik-leverans.json", import.meta.url), "utf8")).filer.find((f: { fil: string }) => fil.endsWith(f.fil))?.sha256;
  console.log(`  FYSIK ${fil}: sha256 ${fysik.sha256}${vantad === fysik.sha256 ? " = manifestet" : " ≠ MANIFESTET"}; ${spannkontroll(fysik)}`);
  if (vantad !== fysik.sha256) process.exit(1);
  const vikt = lasTrafikvikter();
  console.log(`  trafiken: ${vikt.size} stationer med väglagspunkter närmast sig`);
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
  console.log(`  ${stations.size} stationer, ${res.length} bucketade avläsningar (${min()})`);
  if (stations.size < 100 || res.length < 1000) { console.error("UNDERLAGSVAKT: för lite"); process.exit(1); }
  const { rader, kand } = kandidater(stations, fysik);
  for (const r of regionsrapport(rader, kand, vikt)) console.log(r);
  console.log(`\nKlart (${min()}). Ingen dom: utgångsläget för nivå 2 (kort #319) och FYSIK+BLANDNING (kort #308).`);
}
