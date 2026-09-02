// Radarpiloten (kort #43 steg 3, docs/RADAR-PLAN.md; källbeslut DECISIONS #60):
// senaste SMHI-kompositen (5-min, ODIM HDF5) hämtas, samplas mot 818-segmentskelettet
// och skrivs HÄNDELSEFILTRERAT till radar_precip (bara segment där radarn ser regn).
// Grids lagras aldrig. Skugga: ingen produkt läser detta — piloten bevisas med
// kalibreringsjämförelsen (v3) + uppmätt volym efter en vecka.
//
// RoadNumber-läxan tillämpad på binärformat: --prov parsar och skriver ut filens
// VERKLIGA struktur (grupper, attribut, geometri-diagnostik) utan DB-skrivning —
// skarp drift litar bara på det som provet bevisat, och geometrivakter fäller
// körningen högljutt om filen inte ser ut som antaget.
//
// dBZ → regn via Marshall–Palmer (Z = 200·R^1.6) — pilotens enkla standardval,
// kalibreras mot stationernas rain_sum_mm i v3, inte gissas bättre här.
//
// Run:  DATABASE_URL=... node --experimental-strip-types ingest/radar.ts        (skarp)
//       node --experimental-strip-types ingest/radar.ts --prov                  (diagnos, ingen DB)
// Källa: SMHI öppna data (CC BY 4.0). User-Agent: repo-URL, inga personuppgifter.

import { readFileSync } from "node:fs";
import h5wasm from "h5wasm";
import proj4 from "proj4";

const UA = "Halkvakt-radarpilot/0.1 (+https://github.com/Axelstar/Halkvakt)";
const API = "https://opendata-download-radar.smhi.se/api/version/latest/area/sweden/product/comp";
const SAMPLE_KM = 2;        // samma steg som ankaranalysen
const MIN_RATE_MMH = 0.1;   // händelsegräns: under detta skrivs inget
const PROV = process.argv.includes("--prov");

// ── 1. Senaste filen ur dagens (eller gårdagens, runt midnatt) listning.
async function latestFile(): Promise<{ link: string; validIso: string }> {
  for (const back of [0, 1]) {
    const d = new Date(Date.now() - back * 86400000);
    const url = `${API}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${String(d.getUTCDate()).padStart(2, "0")}.json`;
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!r.ok) { console.log(`radar: ${url} → HTTP ${r.status}`); continue; }
    const j: any = await r.json();
    const files = j.files ?? [];
    if (!files.length) continue;
    const f = files[files.length - 1];
    const link = (f.formats ?? []).find((x: any) => x.key === "h5")?.link;
    if (!link) throw new Error(`senaste filposten saknar h5-format: ${JSON.stringify(f).slice(0, 200)}`);
    // "valid": "2026-09-02 09:40" (UTC per API:ets timeZone)
    return { link, validIso: String(f.valid).replace(" ", "T") + ":00Z" };
  }
  throw new Error("ingen fillistning för idag eller igår");
}

// ── 2. ODIM-parsning. Attribut kan sitta på olika nivåer — leta, och säg vad som fanns.
function attr(groups: any[], name: string): number | string | null {
  for (const g of groups) {
    const a = g?.attrs?.[name];
    if (a === undefined) continue;
    const v = a.value;
    if (Array.isArray(v) || ArrayBuffer.isView(v)) return typeof (v as any)[0] === "bigint" ? Number((v as any)[0]) : (v as any)[0];
    return typeof v === "bigint" ? Number(v) : v;
  }
  return null;
}

const { link, validIso } = await latestFile();
console.log(`radar: hämtar ${link} (giltig ${validIso})`);
const buf = new Uint8Array(await (await fetch(link, { headers: { "User-Agent": UA } })).arrayBuffer());
// FS bor på modulen som ready resolvar till — inte på importen (radar-pilot #1 föll på det).
const Module: any = await h5wasm.ready;
Module.FS.writeFile("comp.h5", buf);
const file = new h5wasm.File("comp.h5", "r");

if (PROV) {
  console.log(`PROV: toppgrupper: ${JSON.stringify(file.keys())}`);
  for (const k of ["where", "what", "dataset1/what", "dataset1/data1/what", "dataset1/where"]) {
    const g: any = file.get(k);
    if (g?.attrs) console.log(`PROV: ${k}: ${JSON.stringify(Object.fromEntries(Object.entries(g.attrs).map(([n, a]: any) => [n, a.value?.toString?.().slice(0, 60) ?? String(a.value)])))}`);
  }
}

const where: any = file.get("where");
const projdef = String(attr([where], "projdef"));
const xsize = Number(attr([where], "xsize")), ysize = Number(attr([where], "ysize"));
const xscale = Number(attr([where], "xscale")), yscale = Number(attr([where], "yscale"));
const LL = [Number(attr([where], "LL_lon")), Number(attr([where], "LL_lat"))];
const UR = [Number(attr([where], "UR_lon")), Number(attr([where], "UR_lat"))];
const dwhatGroups = [file.get("dataset1/data1/what"), file.get("dataset1/what"), file.get("what")];
const gain = Number(attr(dwhatGroups, "gain")), offset = Number(attr(dwhatGroups, "offset"));
const nodata = Number(attr(dwhatGroups, "nodata")), undetect = Number(attr(dwhatGroups, "undetect"));
const quantity = String(attr(dwhatGroups, "quantity"));
const ds: any = file.get("dataset1/data1/data");
const data = ds.value as Uint8Array | Uint16Array;
const [rows, cols] = ds.shape as number[];

// Geometrivakter: projicera hörnen och kräv att de stämmer med skalan/storleken.
const toGrid = proj4("EPSG:4326", projdef);
const [xll, yll] = toGrid.forward(LL);
const [xur, yur] = toGrid.forward(UR);
const colsCheck = (xur - xll) / xscale, rowsCheck = (yur - yll) / yscale;
console.log(`radar: ${quantity} ${cols}×${rows} px à ${xscale}×${yscale} m, gain=${gain} offset=${offset}, hörnkontroll ${colsCheck.toFixed(1)}×${rowsCheck.toFixed(1)}`);
if (cols !== xsize || rows !== ysize || Math.abs(colsCheck - xsize) > 2 || Math.abs(rowsCheck - ysize) > 2)
  throw new Error(`GEOMETRIVAKT: shape ${cols}×${rows}, where säger ${xsize}×${ysize}, hörnen ger ${colsCheck.toFixed(1)}×${rowsCheck.toFixed(1)} — formatantagandet håller inte`);
if (!quantity.includes("DBZ"))
  throw new Error(`GEOMETRIVAKT: quantity=${quantity} — Z–R-omvandlingen förutsätter DBZH`);

function rateAt(lon: number, lat: number): number | null {
  const [x, y] = toGrid.forward([lon, lat]);
  const c = Math.floor((x - xll) / xscale), r = Math.floor((yur - y) / yscale); // rad 0 = övre kanten
  if (c < 0 || c >= cols || r < 0 || r >= rows) return null; // utanför kompositen
  const raw = data[r * cols + c];
  if (raw === nodata) return null;       // utanför radartäckning
  if (raw === undetect) return 0;        // täckt, inget eko
  const dbz = raw * gain + offset;
  return Math.pow(Math.pow(10, dbz / 10) / 200, 1 / 1.6); // Marshall–Palmer, mm/h
}

// ── 3. Skelettet ur databasen, samplat var 2:a km.
function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371, dLa = (b[1] - a[1]) * Math.PI / 180, dLo = (b[0] - a[0]) * Math.PI / 180;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function sampleLine(line: [number, number][], stepKm: number): [number, number][] {
  const out: [number, number][] = [];
  let carry = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const d = haversineKm(line[i], line[i + 1]);
    if (d === 0) continue;
    let t = carry;
    while (t < d) {
      const f = t / d;
      out.push([line[i][0] + (line[i + 1][0] - line[i][0]) * f, line[i][1] + (line[i + 1][1] - line[i][1]) * f]);
      t += stepKm;
    }
    carry = t - d;
  }
  if (line.length) out.push(line[line.length - 1]);
  return out;
}

const url = process.env.DATABASE_URL;
if (!url && !PROV) { console.error("DATABASE_URL not set"); process.exit(1); }
let segments: { id: string; line: [number, number][] }[] = [];
if (url) {
  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
  const res = await pool.query(`SELECT segment_id, ST_AsGeoJSON(geom)::json AS g FROM road_conditions WHERE NOT deleted AND geom IS NOT NULL`);
  segments = res.rows.map((r: any) => ({ id: r.segment_id, line: r.g.coordinates }));

  let events = 0, sampled = 0, outside = 0, maxRate = 0;
  const ids: string[] = [], maxes: number[] = [], means: number[] = [];
  for (const seg of segments) {
    let mx = 0, sum = 0, n = 0;
    for (const p of sampleLine(seg.line, SAMPLE_KM)) {
      const rr = rateAt(p[0], p[1]);
      sampled++;
      if (rr === null) { outside++; continue; }
      mx = Math.max(mx, rr); sum += rr; n++;
    }
    if (n > 0 && mx >= MIN_RATE_MMH) {
      events++; maxRate = Math.max(maxRate, mx);
      ids.push(seg.id); maxes.push(Math.round(mx * 100) / 100); means.push(Math.round((sum / n) * 100) / 100);
    }
  }
  if (!PROV && ids.length) {
    await pool.query(readMigration());
    await pool.query(
      `INSERT INTO radar_precip (segment_id, observed_at, rate_max_mmh, rate_mean_mmh)
       SELECT u.segment_id, $2::timestamptz, u.mx, u.mn
       FROM UNNEST($1::text[], $3::numeric[], $4::numeric[]) AS u(segment_id, mx, mn)
       ON CONFLICT (segment_id, observed_at) DO NOTHING`,
      [ids, validIso, maxes, means]);
  } else if (!PROV) {
    await pool.query(readMigration()); // tabellen ska finnas även torra dygn
  }
  // Bevisraden + färskhet (fail-soft-läxan: första publiceringen syns i sin egen logg).
  console.log(`radar-pilot: fil ${validIso}, ${segments.length} segment, ${sampled} provpunkter (${outside} utanför täckning/komposit), ${events} segment med regn ≥ ${MIN_RATE_MMH} mm/h, max ${maxRate.toFixed(2)} mm/h${PROV ? " [PROV — inget skrivet]" : ""}`);
  if (!PROV) {
    const fr = await pool.query(`SELECT count(*) AS n, count(DISTINCT observed_at) AS filer, max(observed_at) AS senaste FROM radar_precip WHERE observed_at > now() - interval '24 hours'`);
    console.log(`radar_precip senaste dygnet: ${fr.rows[0].n} rader över ${fr.rows[0].filer} kompositer, senaste ${fr.rows[0].senaste ?? "—"}`);
  }
  await pool.end();
} else {
  // PROV utan DB: sampla tre kända punkter så Z–R-vägen bevisas ändå.
  for (const [label, lon, lat] of [["Hörby", 13.74, 55.85], ["Sundsvall", 17.31, 62.39], ["Kiruna", 20.23, 67.86]] as const)
    console.log(`PROV ${label}: ${JSON.stringify(rateAt(lon, lat))} mm/h`);
}
file.close();

function readMigration(): string {
  return readFileSync(new URL("../sql/009_radar_precip.sql", import.meta.url), "utf8");
}
