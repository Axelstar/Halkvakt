// KUVÖSENS FACIT UR TRAFIKVERKETS VÄGLAG — LÄSNINGEN (DECISIONS #591, #592; docs/FORREGISTRERING-FACIT-TRV-2024-25.md). LÄSER UTFALL.
// Vägrar utan båda signaturerna i förregistreringens §8. Samma kontroll står först i kuvos.yml, så att fysikkedjans tre timmar inte
// körs förgäves. Namnet ger jobbet väg B varv 1 (fysik/niva2/vagb.py och fysik/blandning/vagb_blandning.py, #544) och Trafikverkets
// filer i trv/ med manifestets summor (#1007). Indata, som förregistreringen §4 *Indata* säger:
//   kandidaten    NIVÅ 2 ÄRLIG+BLANDNING i analysläget, den frysta proceduren (#552). Filen måste ha körning 38368369876:s sha256,
//                 annars är det inte den frysta kandidaten och läsningen vägrar (vagb.py gav samma summa i två körningar 13/10).
//                 En kall timme: något halvtimmesvärde i UTC-timmen ≤ 0 °C; tillfällets tid är timmens början.
//   egen yta      stationens uppmätta yta med grind A:s vakter som korBlandning (#490), senaste raden per halvtimme; en kall timme
//                 som kandidatens. Bara kandidatens stationer.
//   efterhalkan   fyrningarna ur ögonblicksvarianten av sql/028 (#456) med betans startvärden, som riktningsprovet (#467: 1 109).
//   nederbörden   givarens ord per station och timme, klassade med motorns givarklass (engine/src/nederbord.ts); missens orsak.
//   hela regeln   (#593) radarns medel per sträcka och fönster ur kuvösens radar_precip; varma stationer med driftens vakter
//                 (#75, radvakten, karantänen) för vetot; stationernas yta vid timmen (grind A:s population) för spridningen.
//   sträckorna    vaglag.geojson som Körflödet hämtar det, med nätets summa över id och geometri (#594); stationernas lägen ur
//                 data/vagdata/stationer.json.
// Utskriften är aggregat per månad och band; Trafikverkets rader och stationernas värden skrivs aldrig ut (PUBLIKT REPO).
// Kör: DATABASE_URL=... node --experimental-strip-types scripts/matningar/kuvos-blandning-vagb-facit-trv-2026-10-16.ts [--sjalvtest]
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { lasFysik, spannkontroll, type Fysik } from "./kuvos-fysik-2026-10-08.ts";
import { RADVAKT_SQL, karantanSql } from "../../publish/snapshot-core.ts";
import { givarklass } from "../../engine/src/nederbord.ts";
import { lasning, linjerUr, natsumma, signerad, KALL_C, RADAR_MMH, RADAR_MIN, VETO_MIN, VETO_YTA_C, type Regelindata, type Tillfalle, type Timklass }
  from "../../kuvos/facit-trv.ts";

const BUCKET_S = 1800, H = 3_600_000;
const FORREG = "docs/FORREGISTRERING-FACIT-TRV-2024-25.md";
const VAGLAG = "https://axelstar.github.io/halkvakt-karta/data/vaglag.geojson";
export const FRYST = { fil: "niva2-arlig-blandning-analys-2024-25.csv.gz", sha256: "dee13cd1319c212aaf608cf0eb6146732ec41da3762c68deaf9156a4b31e6481", korning: 38368369876 };

/** Kandidatens kalla timmar: UTC-timmar där något halvtimmesvärde är KALL_C eller kallare, tiden är timmens början. */
export function kallaTimmar(f: Fysik): Tillfalle[] {
  const ut: Tillfalle[] = [];
  for (const [station, a] of f.serie) {
    const timmar = new Set<number>();
    for (let i = 0; i < f.nb; i++) if (a[i] <= KALL_C) timmar.add(Math.floor(((f.b0 + i) * BUCKET_S * 1000) / H) * H);
    for (const t of timmar) ut.push({ station, t });
  }
  return ut;
}

/** En timmes klass ur givarens ord: regn, snöblandat eller snö ⇒ nederbörd; annars uppehåll om något ord är torrt; annars okänd. */
export function timklass(ord: string[]): Timklass | null {
  const k = ord.map(givarklass);
  return k.some((x) => x === "regn" || x === "slask" || x === "sno") ? "nederbord" : k.includes("ingen") ? "uppehall" : null;
}

/** Stationens egen yta: grind A:s WHERE som korBlandning (#490), senaste raden per halvtimme, kalla timmar som kandidatens. */
export const EGEN_YTA_SQL = `
  WITH b AS (
    SELECT DISTINCT ON (station_id, b) station_id, floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c
    FROM weather_observations
    WHERE surface_temp_c IS NOT NULL AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12
      AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}
    ORDER BY station_id, b, sample_time DESC)
  SELECT station_id, (b * ${BUCKET_S} / 3600) * 3600000 AS t FROM b GROUP BY 1, 2 HAVING min(surface_temp_c) <= ${KALL_C}`;
/** Hela regelns indata (#593). Ett värde hör till fönstret som slutar vid nästa hela timme e (en avläsning på timmen till samma
 *  timme), om det ligger inom fönstrets längd före e — som driftens "senaste N minuterna" när regeln körs vid e. */
const fonsterSlut = (kol: string, min: number) =>
  `ceil(extract(epoch FROM ${kol}) / 3600)::bigint * 3600 AS e, extract(epoch FROM ${kol}) AS s, ${min * 60} AS l`;
export const YTA_TIMME_SQL = `
  WITH b AS (
    SELECT DISTINCT ON (station_id, b) station_id, floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c
    FROM weather_observations
    WHERE surface_temp_c IS NOT NULL AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12
      AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}
    ORDER BY station_id, b, sample_time DESC)
  SELECT station_id, array_agg(b * ${BUCKET_S} * 1000) AS t, array_agg(surface_temp_c) AS y FROM b WHERE b % 2 = 0 GROUP BY 1`;
export const VARMA_SQL = `
  SELECT station_id, array_agg(DISTINCT e * 1000) AS e FROM (
    SELECT station_id, ${fonsterSlut("sample_time", VETO_MIN)} FROM weather_observations
    WHERE surface_temp_c > ${VETO_YTA_C} AND (air_temp_c IS NULL OR surface_temp_c >= air_temp_c - 12)
      AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}) x
  WHERE s > e - l GROUP BY 1`;
export const RADAR_SQL = `
  SELECT segment_id, array_agg(DISTINCT e * 1000) AS e FROM (
    SELECT segment_id, ${fonsterSlut("observed_at", RADAR_MIN)} FROM radar_precip WHERE rate_mean_mmh >= ${RADAR_MMH}) x
  WHERE s > e - l GROUP BY 1`;
export const NEDERBORD_SQL = `
  SELECT station_id, floor(extract(epoch FROM sample_time) / 3600)::bigint * 3600000 AS t, array_agg(DISTINCT precipitation) AS ord
  FROM weather_observations
  WHERE precipitation IS NOT NULL AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}
  GROUP BY 1, 2`;

function sjalvtest() {
  let fel = 0; const k = (ok: boolean, m: string) => { if (!ok) { fel++; console.error("✗ " + m); } else console.log("  ok: " + m); };
  const T = (s: string) => Date.parse(s), b = (s: string) => T(s) / 1000 / BUCKET_S;
  // Halvtimmarna 10:30 +0,5 · 11:00 +0,2 · 11:30 −0,1 · 12:00 0,0 · 12:30 saknas · 13:00 +0,01.
  const a = Float32Array.from([0.5, 0.2, -0.1, 0.0, NaN, 0.01]);
  const f: Fysik = { b0: b("2025-01-10T10:30Z"), nb: 6, serie: new Map([["1001", a]]), rader: 5, sha256: "", lo: -0.1, hi: 0.5 };
  const kt = kallaTimmar(f).map((x) => new Date(x.t).toISOString().slice(11, 16));
  k(JSON.stringify(kt) === JSON.stringify(["11:00", "12:00"]), `kalla timmar: 11 (11:30 −0,1) och 12 (12:00 noll räknas), inte 10 (+0,5) och 13 (+0,01): ${JSON.stringify(kt)}`);
  k(timklass(["no", "rain"]) === "nederbord" && timklass(["no"]) === "uppehall" && timklass(["Dry"]) === "uppehall" && timklass(["snow"]) === "nederbord",
    "timmens nederbörd: regn går före uppehåll, Dry och no är torrt, snö är nederbörd");
  k(timklass(["yes", "freezing_rain"]) === null, "ord som motorn inte känner (yes, freezing_rain) ger okänd, aldrig torrt");
  k(VARMA_SQL.includes("surface_temp_c > 2 AND (air_temp_c IS NULL OR surface_temp_c >= air_temp_c - 12)") && VARMA_SQL.includes("2700 AS l")
    && RADAR_SQL.includes("rate_mean_mmh >= 0.5") && RADAR_SQL.includes("3600 AS l") && YTA_TIMME_SQL.includes("WHERE b % 2 = 0"),
    "hela regelns frågor: vetot över +2 °C på 45 min med driftens vakter, radarn ≥ 0,5 på 60 min, ytan vid timmen");
  k(EGEN_YTA_SQL.includes("surface_temp_c >= air_temp_c - 12") && EGEN_YTA_SQL.includes(RADVAKT_SQL) && EGEN_YTA_SQL.includes(karantanSql("weather_observations"))
    && EGEN_YTA_SQL.includes("ORDER BY station_id, b, sample_time DESC"), "egen yta: grind A:s vakter och senaste raden per halvtimme, som korBlandning");
  if (fel) process.exit(1);
  console.log("SJÄLVTEST OK: kuvos-blandning-vagb-facit-trv");
}

/** Kuvösens indata utan kandidaten och utan facit: stationernas egna kalla timmar (alla stationer), nederbörden, efterhalkans
 *  fyrningar, sträckorna och stationernas lägen. Antalen skrivs ut; inga värden. Kan köras före signaturerna
 *  (kuvos-facit-trv-indata-2026-10-16.ts), eftersom Trafikverkets filer inte öppnas. */
export async function kuvosIndata() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const pg = (await import("pg")).default;
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  await db.query("SET TimeZone = 'UTC'");
  await db.query("SET statement_timeout = 0");
  const q = async (sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows as any[];
  const [{ kuvos }] = await q("SELECT to_regprocedure('kuvos.now()') IS NOT NULL AS kuvos");
  if (!kuvos) { console.error("Inte kuvösen (kuvos.now() saknas): läsningen gäller bara vintern 2024/25"); process.exit(1); }
  const kalla: Tillfalle[] = (await q(EGEN_YTA_SQL)).map((r) => ({ station: String(r.station_id), t: Number(r.t) }));
  const nederbord = new Map<string, Map<number, Timklass>>(), ordlista = new Map<string, number>();
  for (const r of await q(NEDERBORD_SQL)) {
    for (const o of r.ord) ordlista.set(o, (ordlista.get(o) ?? 0) + 1);
    const kl = timklass(r.ord);
    if (kl) (nederbord.get(r.station_id) ?? nederbord.set(r.station_id, new Map()).get(r.station_id)!).set(Number(r.t), kl);
  }
  const nyckel = (rader: any[], id: string) => new Map<string, Set<number>>(rader.map((r) => [String(r[id]), new Set((r.e as unknown[]).map(Number))]));
  const regel: Regelindata = { varma: nyckel(await q(VARMA_SQL), "station_id"), radar: nyckel(await q(RADAR_SQL), "segment_id"), yta: new Map() };
  for (const r of await q(YTA_TIMME_SQL)) regel.yta.set(String(r.station_id), new Map((r.t as unknown[]).map((t, i) => [Number(t), Number(r.y[i])])));
  const summa = (m: Map<string, Set<number>> | Map<string, Map<number, number>>) => [...m.values()].reduce((n, x) => n + x.size, 0);
  console.log(`  hela regeln: varma fönster ${summa(regel.varma)} vid ${regel.varma.size} stationer · radarfönster med ≥ ${RADAR_MMH} mm/h ` +
    `${summa(regel.radar)} på ${regel.radar.size} sträckor · ytan vid timmen ${summa(regel.yta)} värden vid ${regel.yta.size} stationer`);
  const { installera, FUNKTION } = await import("../../kuvos/efterhalkan.ts");
  await installera((s) => q(s));
  const [{ fonster }] = await q("SELECT (now() - min(sample_time) + interval '1 day')::text AS fonster FROM weather_observations");
  const fyrningar: Tillfalle[] = (await q(`SELECT sid, extract(epoch FROM t) * 1000 AS t FROM ${FUNKTION}(p_fonster := $1::interval)`, [fonster]))
    .map((r) => ({ station: String(r.sid), t: Number(r.t) }));
  await db.end();
  const nKand = [...nederbord.values()].reduce((n, x) => n + [...x.values()].filter((k) => k === "nederbord").length, 0);
  console.log(`  stationernas egna kalla timmar ${kalla.length} vid ${new Set(kalla.map((x) => x.station)).size} stationer · efterhalkans fyrningar ` +
    `${fyrningar.length} vid ${new Set(fyrningar.map((x) => x.station)).size} stationer (riktningsprovet 6/10: 1 109)`);
  console.log(`  nederbörden: känd i ${[...nederbord.values()].reduce((n, x) => n + x.size, 0)} station-timmar vid ${nederbord.size} stationer, varav ${nKand} med nederbörd; ` +
    `givarens ord (station-timmar per ord): ${[...ordlista].sort((x, y) => y[1] - x[1]).map(([o, n]) => `${o} ${n}`).join(" · ")}`);
  const svar = await fetch(VAGLAG);
  if (!svar.ok) { console.error(`vaglag.geojson: HTTP ${svar.status}`); process.exit(1); }
  const text = await svar.text(), linjer = linjerUr(JSON.parse(text));
  console.log(`  vaglag.geojson: ${linjer.length} sträckor; nätets summa (id och geometri, #594) ${natsumma(linjer)} · filens sha256 ${createHash("sha256").update(text).digest("hex")}`);
  const stationer: { id: string; lon: number; lat: number }[] = JSON.parse(readFileSync("data/vagdata/stationer.json", "utf8")).rader
    .map((s: any) => ({ id: String(s.id), lon: Number(s.lon), lat: Number(s.lat) }));
  const lagen = new Set(stationer.map((s) => s.id));
  console.log(`  stationer.json: ${stationer.length} lägen; utan läge där: ${new Set(kalla.filter((x) => !lagen.has(x.station)).map((x) => x.station)).size} stationer med kalla timmar, ` +
    `${new Set(fyrningar.filter((x) => !lagen.has(x.station)).map((x) => x.station)).size} med fyrningar`);
  return { kalla, nederbord, fyrningar, linjer, stationer, regel };
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) sjalvtest();
else if (korsSjalv) {
  const forreg = readFileSync(FORREG, "utf8"), sig = signerad(forreg);
  if (!sig.bengt || !sig.axel) { console.error(`vägrar: ${FORREG} är inte signerad av båda (Bengt ${sig.bengt}, Axel ${sig.axel})`); process.exit(2); }
  console.log("KUVÖSENS FACIT UR TRAFIKVERKETS VÄGLAG (DECISIONS #591, #592) — kandidaten, efterhalkan och åtgärderna mot väglaget 2024/25. Diagnos, ingen dom.");
  const m = JSON.parse(readFileSync("blandning/manifest.json", "utf8")).filer.find((x: any) => x.fil === FRYST.fil);
  if (!m) { console.error(`${FRYST.fil} saknas i blandning/manifest.json — väg B varv 1 kördes inte`); process.exit(1); }
  const fysik = lasFysik(readFileSync(`blandning/${FRYST.fil}`));
  console.log(`  ${FRYST.fil} (${m.namn}, ${m.lage}): ${fysik.rader} rader, ${fysik.serie.size} stationer; sha256 ${fysik.sha256}`);
  if (fysik.sha256 !== m.sha256 || fysik.sha256 !== FRYST.sha256) {
    console.error(`vägrar: summan är inte ${fysik.sha256 !== m.sha256 ? "manifestets" : `körning ${FRYST.korning}:s — inte den frysta kandidaten (#552)`}`); process.exit(1);
  }
  console.log(`  = manifestet och körning ${FRYST.korning} (den frysta kandidaten, #552) · ${spannkontroll(fysik)}`);
  const kandidatStationer = new Set(fysik.serie.keys()), kandidat = kallaTimmar(fysik);
  const ind = await kuvosIndata();
  const kalla = ind.kalla.filter((x) => kandidatStationer.has(x.station)), lagen = new Set(ind.stationer.map((s) => s.id));
  console.log(`  kandidatens kalla timmar ${kandidat.length} vid ${new Set(kandidat.map((x) => x.station)).size} av ${kandidatStationer.size} stationer · ` +
    `stationernas egna vid kandidatens stationer ${kalla.length} · kandidatens stationer utan läge i stationer.json: ${[...kandidatStationer].filter((s) => !lagen.has(s)).length}`);
  lasning({ xlsx: "trv", linjer: ind.linjer, stationer: ind.stationer, kandidatStationer, kalla, kandidat, fyrningar: ind.fyrningar, nederbord: ind.nederbord, regel: ind.regel, forreg });
}
