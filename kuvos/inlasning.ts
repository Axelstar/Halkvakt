// KUVÖSENS INLÄSNING (kort #232, PLAN-KUVOSEN steg 3, DECISIONS #439). Läser Trafikverkets leverans (Halkvakt_YYMM.csv eller .csv.gz)
// till den RÅA tabellen kuvos_ra.trv_obs — värdena som de står i filen, bara decimalkommat och sidfoten hanterade — och stationslistan
// till kuvos_ra.stationer. Sedan körs kuvos/oversattning.sql, som bär varje tolkningsregel. Två steg med flit: när Micke svarar ändras
// översättningen och körs om, utan att filerna läses igen.
//
// Skrivningarna görs med den VANLIGA sökvägen (aldrig kuvös-klockans, kuvos/klocka.sql). Idempotent: en omkörning ersätter rader.
// Läser inget utfall: allt den skriver ut är antal rader, stationer och fält.
//
// Kör: DATABASE_URL=... node --experimental-strip-types kuvos/inlasning.ts <mapp med leveransen> <static.json>
import { createReadStream, readdirSync, readFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { delaRad } from "./inventering.ts";

/** Leveransens kolumner i filens ordning (KUVOS-LEVERANSEN §2). En fil med annan rubrik avvisas — inget gissas om ordningen. */
export const KOLUMNER = ["measurepoint", "measuretime", "tyta", "tluft", "daggp", "lu_fu", "ned_typ", "ned_maengd",
  "vimax", "vimed", "virik", "vind30", "siktdjup"] as const;
const TAL = ["tyta", "tluft", "daggp", "lu_fu", "ned_maengd", "vimax", "vimed", "vind30", "siktdjup"] as const;

export type RaRad = {
  measurepoint: string; measuretime: string; ned_typ: number | null; virik: string | null;
} & Record<(typeof TAL)[number], number | null>;

const TID = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(?:\.\d+)?$/;
const TALET = /^[+-]?\d+(?:,\d+)?$/;

/** En datarad → rå rad, eller null för det som inte är data (sidfoten, tomma rader). Kastar på en rad med rätt antal fält men ett
 *  värde av fel sort: då är formatet ett annat än det besiktigade, och det ska larma, inte tystas. */
export function tolkaRad(rad: string): RaRad | null {
  const ren = rad.replace(/^﻿/, "").replace(/\r$/, "");
  if (!ren.trim()) return null;
  const f = delaRad(ren, ";");
  if (f.length !== KOLUMNER.length) return null;            // SSMS-sidfoten: "(N rows affected)", "Completion time: …"
  const v: Record<string, string> = {};
  KOLUMNER.forEach((k, i) => { v[k] = f[i]; });
  if (!/^\d+$/.test(v.measurepoint)) throw new Error(`measurepoint är inte ett id: ${JSON.stringify(v.measurepoint)}`);
  const t = TID.exec(v.measuretime);
  if (!t) throw new Error(`measuretime har okänd form: ${JSON.stringify(v.measuretime)}`);
  const ut: any = { measurepoint: v.measurepoint, measuretime: `${t[1]} ${t[2]}` };
  for (const k of TAL) {
    if (v[k] === "") { ut[k] = null; continue; }
    if (!TALET.test(v[k])) throw new Error(`${k} är inte ett tal: ${JSON.stringify(v[k])}`);
    ut[k] = Number(v[k].replace(",", "."));
  }
  if (v.ned_typ === "") ut.ned_typ = null;
  else if (/^-?\d+$/.test(v.ned_typ)) ut.ned_typ = Number(v.ned_typ);
  else throw new Error(`ned_typ är inte en kod: ${JSON.stringify(v.ned_typ)}`);
  ut.virik = v.virik === "" ? null : v.virik;                  // trim görs i översättningen; −9 blir NULL där (inget streck)
  return ut as RaRad;
}

export async function* lasFil(fil: string): AsyncGenerator<string> {
  const strom = fil.endsWith(".gz") ? createReadStream(fil).pipe(createGunzip()) : createReadStream(fil);
  const rl = createInterface({ input: strom.setEncoding("utf8"), crlfDelay: Infinity });
  let forsta = true;
  for await (const rad of rl) {
    if (forsta) {
      forsta = false;
      const rubrik = delaRad(rad.replace(/^﻿/, ""), ";");
      if (rubrik.join(";") !== KOLUMNER.join(";")) throw new Error(`${fil}: rubriken är ${rubrik.join(";")}, väntade ${KOLUMNER.join(";")}`);
      continue;
    }
    yield rad;
  }
}

export const RA_SCHEMA = `
CREATE SCHEMA IF NOT EXISTS kuvos_ra;
CREATE TABLE IF NOT EXISTS kuvos_ra.trv_obs (
  measurepoint text NOT NULL, measuretime timestamp NOT NULL,   -- svensk lokaltid, som i filen
  tyta numeric, tluft numeric, daggp numeric, lu_fu numeric, ned_typ int, ned_maengd numeric,
  vimax numeric, vimed numeric, virik text, vind30 numeric, siktdjup numeric,
  fil text NOT NULL,
  PRIMARY KEY (measurepoint, measuretime));
CREATE TABLE IF NOT EXISTS kuvos_ra.stationer (station_id text PRIMARY KEY, lon double precision NOT NULL, lat double precision NOT NULL);`;

const BATCH = 5000;

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!)) {
  const [mapp, statisk] = process.argv.slice(2);
  const url = process.env.DATABASE_URL;
  if (!mapp || !statisk || !url) { console.error("användning: DATABASE_URL=... inlasning.ts <mapp> <static.json>"); process.exit(1); }
  const filer = readdirSync(mapp).filter((f) => /^Halkvakt_\d{4}\.csv(\.gz)?$/.test(f)).sort();
  if (!filer.length) { console.error(`inga Halkvakt_YYMM.csv i ${mapp}`); process.exit(1); }

  const pg = (await import("pg")).default;
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  await db.query(RA_SCHEMA);

  const stationer: { id: string; lon: number; lat: number }[] = JSON.parse(readFileSync(statisk, "utf8")).stations;
  await db.query("TRUNCATE kuvos_ra.stationer");
  await db.query(`INSERT INTO kuvos_ra.stationer SELECT * FROM unnest($1::text[], $2::float8[], $3::float8[])`,
    [stationer.map((s) => String(s.id)), stationer.map((s) => s.lon), stationer.map((s) => s.lat)]);
  console.log(`stationslistan: ${stationer.length} stationer med läge (${statisk})`);

  const kol = [...KOLUMNER, "fil"];
  const typer = ["text", "timestamp", "numeric", "numeric", "numeric", "numeric", "int", "numeric", "numeric", "numeric", "text", "numeric", "numeric", "text"];
  const insert = `INSERT INTO kuvos_ra.trv_obs (${kol.join(", ")})
    SELECT * FROM unnest(${typer.map((t, i) => `$${i + 1}::${t}[]`).join(", ")})
    ON CONFLICT (measurepoint, measuretime) DO UPDATE SET ${kol.slice(2).map((k) => `${k} = EXCLUDED.${k}`).join(", ")}`;

  for (const fil of filer) {
    let rader = 0, hoppade = 0, buf: RaRad[] = [];
    const skriv = async () => {
      if (!buf.length) return;
      await db.query(insert, [...KOLUMNER.map((k) => buf.map((r) => (r as any)[k])), buf.map(() => fil)]);
      buf = [];
    };
    for await (const rad of lasFil(join(mapp, fil))) {
      const r = tolkaRad(rad);
      if (!r) { if (rad.trim()) hoppade++; continue; }
      buf.push(r); rader++;
      if (buf.length >= BATCH) await skriv();
    }
    await skriv();
    console.log(`${fil}: ${rader} rader inlästa råa · ${hoppade} rader som inte är data (sidfoten)`);
  }

  await db.query(readFileSync(new URL("./oversattning.sql", import.meta.url), "utf8"));
  const [s] = (await db.query(`
    SELECT (SELECT count(*) FROM kuvos_ra.trv_obs) AS ra,
           (SELECT count(DISTINCT measurepoint) FROM kuvos_ra.trv_obs) AS ra_stationer,
           (SELECT count(*) FROM kuvos_ra.trv_obs r WHERE NOT EXISTS (SELECT 1 FROM kuvos_ra.stationer s WHERE s.station_id = r.measurepoint)) AS utan_lage_rader,
           (SELECT count(DISTINCT measurepoint) FROM kuvos_ra.trv_obs r WHERE NOT EXISTS (SELECT 1 FROM kuvos_ra.stationer s WHERE s.station_id = r.measurepoint)) AS utan_lage,
           (SELECT count(*) FROM weather_observations) AS arkiv,
           (SELECT count(DISTINCT station_id) FROM weather_observations) AS arkiv_stationer,
           (SELECT min(sample_time) FROM weather_observations) AS forst,
           (SELECT max(sample_time) FROM weather_observations) AS sist`)).rows;
  console.log(`rått: ${s.ra} rader, ${s.ra_stationer} stationer · utan läge: ${s.utan_lage} stationer, ${s.utan_lage_rader} rader (läses inte in)`);
  console.log(`arkivet: ${s.arkiv} rader, ${s.arkiv_stationer} stationer, ${new Date(s.forst).toISOString()} … ${new Date(s.sist).toISOString()} (UTC)`);
  const nb = (await db.query(`SELECT coalesce(precipitation, '(NULL)') AS ord, count(*)::bigint AS n FROM weather_observations GROUP BY 1 ORDER BY 2 DESC`)).rows;
  console.log(`nederbördstypen i arkivet: ${nb.map((r) => `${r.ord} ${r.n}`).join(" · ")}`);
  await db.end();
}
