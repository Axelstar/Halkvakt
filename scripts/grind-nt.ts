// GRIND NT — nederbördstypen: regn, slask eller snö (kort #45, docs/TROSKLAR-NEDERBORDSTYPEN.md, fastställt 25/9 av Bengt,
// DECISIONS #361; Axels kontrasignatur väntar).
//
// VAD DEN PRÖVAR (§5): A — kan stationens typgivare tros, mot SMHI:s rådande väder i par inom 5 km · B — klassar våtbulben som
// givaren vid samma station · C — klassar den som givaren när stationens Tw skattas ur grannarna (lämna-en-ute, segmentprognosens
// grannmodell) · D — bär vintern en dom alls.
//
// SPÄRREN ÄR STANDARD (§5). Utan --dom skriver skriptet bara räkningar på facitsidan: rader, episoder, stationer, band och dygn per
// givarklass, SMHI:s timmar per klass och antalet par. Aldrig modellens klasser och aldrig en överensstämmelse (som V-B, DECISIONS
// #350). --dom är låst till DOM_FRAN och vägrar före det.
//
// ALLT UR ARKIVET, INGET NYTT JOBB (§4). Givaren och fälten ligger i weather_observations sedan 24/8; SMHI hämtas vid körningen ur
// latest-months (≈ 130 dygn) och corrected-archive. Raderna läses genom #75, radvakten och karantänen (läxan 23/9) — en dag i taget,
// så att minnet håller en vinter.
//
// Helt läsande. Run: DATABASE_URL=... node --experimental-strip-types scripts/grind-nt.ts [dagar=30] [--dom]
// Självtest utan DB och nät: scripts/grind-nt.ts --sjalvtest
import pg from "pg";
import { RADVAKT_SQL, karantanSql } from "../publish/snapshot-core.ts";
import { vatbulb, klassa, givarklass, smhiKlass, SVEP, BAND_C, type Klass, type Givarklass, type SmhiKlass } from "../engine/src/nederbord.ts";
import { skatta } from "../engine/src/segment.ts";
import { haversineM } from "../engine/src/geo.ts";

// §5, fastställda 25/9. En kopia, här.
const A1_TACKNING = 0.7, A2_TRAFF = 0.7, A2_FARLIGT = 0.15;
const B1_TRAFF = 0.8, B2_FARLIGT = 0.1, B3_SLASK = 0.4;
const C1_TRAFF = 0.75, C2_FARLIGT = 0.15, C3_SLASK = 0.3;
const D_SNO_EP = 100, D_SLASK_EP = 40, D_STATIONER = 30, D_BAND = 3, D_SLASK_DYGN = 10, D_PARTIMMAR = 50;
const PAR_KM = 5, PAR_KM_RESERV = 10, PAR_MIN = 20;   // §4
const PAR_TID_S = 600;                                // ±10 min mot SMHI:s hela timme
const EPISOD_LUCKA_S = 3600;                          // §5 NT-D
const GRANNAR_MIN = 2;                                // §5 NT-C
const BUCKET_S = 1800;                                // 30-minutershinken, som grind A och skuggmotorn
const BAND_GRANSER = [57.5, 60, 63];                  // breddgradsbanden i NT-D
const DOM_FRAN = "2027-03-01T00:00:00Z", FONSTER_FRAN = "2026-12-01T00:00:00Z", MARS_TILL = "2027-04-01T00:00:00Z";
const VINTERMANADER = ["2026-12", "2027-01", "2027-02"];

// DYGN OCH MÅNADER I SVENSK TID (Bengts ja 25/9, DECISIONS #367). I UTC räknades en slasknatt över midnatt UTC (01–02 svensk tid)
// som två dygn i NT-D, och månadsgränsen låg en–två timmar fel. Samma zon som T-A:s och R-A:s nätter.
const ZONDAG = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" });
export function lokalDag(epochS: number): string {
  const d = Object.fromEntries(ZONDAG.formatToParts(new Date(epochS * 1000)).map((x) => [x.type, x.value]));
  return `${d.year}-${d.month}-${d.day}`;
}

export type Rad = { station: string; hink: number; t: number; lon: number; lat: number; tw: number | null; givare: Givarklass };
export type Smhi = { id: string; lon: number; lat: number };
const arKlass = (g: string): g is Klass => g === "regn" || g === "slask" || g === "sno";
export const bandFor = (lat: number) => BAND_GRANSER.filter((g) => lat >= g).length;
const iBand = (tw: number | null): tw is number => tw !== null && tw >= BAND_C[0] && tw <= BAND_C[1];
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
const kvot = (a: number, b: number) => (b > 0 ? r4(a / b) : null);

/** NT-D:s episoder, strömmande: en stations följd av rader med samma givarklass och högst EPISOD_LUCKA_S lucka. `state` bär
 *  varje stations senaste klassrad över dygnsgränsen. Rader utan klass (uppehåll, okänt) bryter inte en episod inom luckan. */
export function raknaEpisoder(rader: Rad[], state: Map<string, { k: Klass; t: number }>, ut: Record<Klass, number>): void {
  const s = rader.filter((r) => arKlass(r.givare)).sort((a, b) => (a.station < b.station ? -1 : a.station > b.station ? 1 : a.t - b.t));
  for (const r of s) {
    const k = r.givare as Klass, f = state.get(r.station);
    if (!f || f.k !== k || r.t - f.t > EPISOD_LUCKA_S) ut[k]++;
    state.set(r.station, { k, t: r.t });
  }
}
export function episoder(rader: Rad[]): Record<Klass, number> {
  const ut = { regn: 0, slask: 0, sno: 0 };
  raknaEpisoder(rader, new Map(), ut);
  return ut;
}

export type Tuppel = { manad: string; egen: number; skattad: number | null; facit: Klass };
export type Jmf = { n: number; traff: number; farligtN: number; farligt: number; slaskN: number; slaskTraff: number };
/** Jämförelsen i bandet (§4): bandet avgörs av EGEN Tw, klassen av `skattad` (= egen i B, grannarnas i C). */
export function jamfor(tupler: Tuppel[], L: number, U: number, skattad: (t: Tuppel) => number | null): Jmf {
  const j = { n: 0, traff: 0, farligtN: 0, farligt: 0, slaskN: 0, slaskTraff: 0 };
  for (const p of tupler) {
    const v = skattad(p);
    if (!iBand(p.egen) || v === null) continue;
    const m = klassa(v, L, U);
    j.n++; if (m === p.facit) j.traff++;
    if (p.facit !== "regn") { j.farligtN++; if (m === "regn") j.farligt++; }
    if (p.facit === "slask") { j.slaskN++; if (m === "slask") j.slaskTraff++; }
  }
  return j;
}
export function doma(j: Jmf, traff: number, farligt: number, slask: number) {
  const t = kvot(j.traff, j.n), f = kvot(j.farligt, j.farligtN), s = kvot(j.slaskTraff, j.slaskN);
  return { t, f, s, klarar: t !== null && f !== null && s !== null && t >= traff && f <= farligt && s >= slask };
}

/** §4: varje vägstation paras med närmaste aktiva SMHI-station inom `km`. */
export function paraIhop(vag: Smhi[], smhi: Smhi[], km: number): Map<string, Smhi> {
  const ut = new Map<string, Smhi>();
  for (const v of vag) {
    let best: Smhi | null = null, bd = Infinity;
    for (const s of smhi) { const d = haversineM(v, s) / 1000; if (d < bd) { bd = d; best = s; } }
    if (best && bd <= km) ut.set(v.id, best);
  }
  return ut;
}
/** Vägstationens rad närmast SMHI:s hela timme H, inom ±PAR_TID_S — eller null. */
export function radVid(perHink: Map<number, Rad>, H: number): Rad | null {
  let best: Rad | null = null;
  for (const h of [Math.floor(H / BUCKET_S) - 1, Math.floor(H / BUCKET_S)]) {
    const r = perHink.get(h);
    if (r && Math.abs(r.t - H) <= PAR_TID_S && (!best || Math.abs(r.t - H) < Math.abs(best.t - H))) best = r;
  }
  return best;
}

export type Stat = {
  ordlista: Map<string, number>; klassRader: Record<Klass, number>; klassStationer: Record<Klass, Set<string>>;
  ep: Record<Klass, number>; band: Set<number>; slaskDygn: Set<string>; iBandet: number; medGrannar: number;
  medFalt: number; medTyp: number; par: number; parKm: number; smhiTimmar: Record<string, number>; partimmar: number; snoSlaskPartimmar: number;
};
/** Spärrens utskrift (§5): bara räkningar på facitsidan. Självtestet vaktar att inget annat slinker in. */
export function sparrRader(s: Stat): string[] {
  const ut = [`Givarens ordlista: ${[...s.ordlista].map(([k, n]) => `${k} ${n}`).join(" · ")}`];
  const okanda = [...s.ordlista.keys()].filter((k) => k !== "(null)" && givarklass(k) === "okand");
  if (okanda.length) ut.push(`LARM: okända strängar i ordlistan (§7 punkt 5): ${okanda.join(", ")} — räknas som okänd`);
  for (const k of ["regn", "slask", "sno"] as Klass[])
    ut.push(`  ${k.padEnd(5)} ${String(s.klassRader[k]).padStart(8)} rader · ${String(s.klassStationer[k].size).padStart(4)} stationer · ${String(s.ep[k]).padStart(6)} episoder`);
  ut.push(`Rader i bandet med givarklass: ${s.iBandet} · varav med minst ${GRANNAR_MIN} grannar i samma halvtimme: ${s.medGrannar}`);
  ut.push(`Stationer med luft och fuktighet: ${s.medFalt} · varav med typsträng: ${s.medTyp}`);
  ut.push(`SMHI: ${s.par} par inom ${s.parKm} km · timmar per klass vid paren: ${Object.entries(s.smhiTimmar).map(([k, n]) => `${k} ${n}`).join(" · ")}`);
  ut.push(`       partimmar med en vägrad inom ±10 min: ${s.partimmar} · varav snö eller slask enligt SMHI: ${s.snoSlaskPartimmar}`);
  const snoSlask = new Set([...s.klassStationer.sno, ...s.klassStationer.slask]).size;
  ut.push(`NT-D (giltighet, räkningar): snöepisoder ${s.ep.sno}/${D_SNO_EP} · slaskepisoder ${s.ep.slask}/${D_SLASK_EP} · stationer med snö/slask ` +
    `${snoSlask}/${D_STATIONER} · band ${s.band.size}/${D_BAND} · slaskdygn ${s.slaskDygn.size}/${D_SLASK_DYGN} · SMHI-partimmar ${s.snoSlaskPartimmar}/${D_PARTIMMAR}`);
  return ut;
}
export function domD(s: Stat): boolean {
  const snoSlask = new Set([...s.klassStationer.sno, ...s.klassStationer.slask]).size;
  return s.ep.sno >= D_SNO_EP && s.ep.slask >= D_SLASK_EP && snoSlask >= D_STATIONER && s.band.size >= D_BAND &&
    s.slaskDygn.size >= D_SLASK_DYGN && s.snoSlaskPartimmar >= D_PARTIMMAR;
}

if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — episoderna, banden, jämförelsen, paren, tidsparningen och spärren mot känd sanning\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    const lika = JSON.stringify(fick) === JSON.stringify(vantat);
    if (!lika) { console.error(`  FEL: ${namn} = ${JSON.stringify(fick)}, väntat ${JSON.stringify(vantat)}`); ok = false; }
    else console.log(`  ok: ${namn}`);
  };
  const rad = (station: string, min: number, givare: Givarklass, lat = 60): Rad =>
    ({ station, hink: Math.floor((min * 60) / BUCKET_S), t: min * 60, lon: 15, lat, tw: 0, givare });
  k("banden: 55 → 0, 58 → 1, 61 → 2, 65 → 3", [55, 58, 61, 65].map(bandFor), [0, 1, 2, 3]);
  k("snö 0 och 30 min ⇒ en episod", episoder([rad("A", 0, "sno"), rad("A", 30, "sno")]).sno, 1);
  k("lucka 90 min ⇒ två episoder", episoder([rad("A", 0, "sno"), rad("A", 90, "sno")]).sno, 2);
  k("snö → slask ⇒ en av varje", episoder([rad("A", 0, "sno"), rad("A", 30, "slask")]), { regn: 0, slask: 1, sno: 1 });
  k("uppehåll 30 min emellan bryter inte", episoder([rad("A", 0, "sno"), rad("A", 30, "ingen"), rad("A", 60, "sno")]).sno, 1);
  k("två stationer ⇒ två episoder", episoder([rad("A", 0, "sno"), rad("B", 0, "sno")]).sno, 2);
  const st = new Map<string, { k: Klass; t: number }>(), ut = { regn: 0, slask: 0, sno: 0 };
  raknaEpisoder([rad("A", 1410, "sno")], st, ut); raknaEpisoder([rad("A", 1440, "sno")], st, ut);
  k("episoden håller över dygnsgränsen", ut.sno, 1);
  const tp = (egen: number, facit: Klass, skattad: number | null = egen): Tuppel => ({ manad: "2026-12", egen, skattad, facit });
  const B = jamfor([tp(-1, "sno"), tp(1, "slask"), tp(2, "slask"), tp(3, "regn"), tp(7, "regn"), tp(-5, "sno")], 0, 1.5, (t) => t.egen);
  k("bandet utesluter 7 och −5", B.n, 4);
  k("träff 3 av 4, farligt 1 av 3 (slask som regn), slask 1 av 2", [B.traff, B.farligt, B.farligtN, B.slaskTraff, B.slaskN], [3, 1, 3, 1, 2]);
  k("domen: 0,75 < 0,80 ⇒ klarar inte", doma(B, B1_TRAFF, B2_FARLIGT, B3_SLASK).klarar, false);
  const C = jamfor([tp(1, "slask", null), tp(1, "slask", 1)], 0, 1.5, (t) => t.skattad);
  k("C hoppar över rader utan grannskattning", C.n, 1);
  const smhi = [{ id: "S", lon: 15, lat: 60 }];
  k("3 km paras inom 5 km", paraIhop([{ id: "V", lon: 15, lat: 60.027 }], smhi, PAR_KM).size, 1);
  k("7 km paras inte inom 5 km", paraIhop([{ id: "V", lon: 15, lat: 60.063 }], smhi, PAR_KM).size, 0);
  k("7 km paras inom reservens 10 km", paraIhop([{ id: "V", lon: 15, lat: 60.063 }], smhi, PAR_KM_RESERV).size, 1);
  const H = 1_800_000_000 - (1_800_000_000 % 3600);
  const hinkar = new Map<number, Rad>([[Math.floor((H - 300) / BUCKET_S), { ...rad("V", 0, "sno"), t: H - 300 }]]);
  k("raden 5 min före timmen väljs", radVid(hinkar, H)?.t, H - 300);
  const langt = new Map<number, Rad>([[Math.floor((H - 1200) / BUCKET_S), { ...rad("V", 0, "sno"), t: H - 1200 }]]);
  k("raden 20 min före timmen väljs inte", radVid(langt, H), null);
  // DECISIONS #367: dygn och månader i svensk tid.
  k("22:30Z 24/9 är 25/9 i Sverige (sommartid)", lokalDag(Date.UTC(2026, 8, 24, 22, 30) / 1000), "2026-09-25");
  k("23:30Z 31/12 är januari i Sverige (vintertid)", lokalDag(Date.UTC(2026, 11, 31, 23, 30) / 1000).slice(0, 7), "2027-01");
  const s: Stat = { ordlista: new Map([["rain", 5], ["freezingRain", 1]]), klassRader: { regn: 5, slask: 0, sno: 0 },
    klassStationer: { regn: new Set(["V"]), slask: new Set(), sno: new Set() }, ep: { regn: 1, slask: 0, sno: 0 }, band: new Set([2]),
    slaskDygn: new Set(), iBandet: 3, medGrannar: 2, medFalt: 10, medTyp: 8, par: 1, parKm: 5, smhiTimmar: { regn: 4 }, partimmar: 3, snoSlaskPartimmar: 0 };
  const rader = sparrRader(s);
  k("spärren larmar på en okänd sträng", rader.some((r) => r.startsWith("LARM") && r.includes("freezingRain")), true);
  k("spärren skriver ingen andel, träff eller överensstämmelse", rader.some((r) => /träff|överens|andel|%/i.test(r)), false);
  k("D klarar inte på en tunn höst", domD(s), false);
  console.log(ok ? "\nSJÄLVTEST OK" : "\nSJÄLVTEST FÄLLER");
  process.exit(ok ? 0 : 1);
}

const SMHI_API = "https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/13";
async function smhiStationer(): Promise<Smhi[]> {
  const r = await fetch(`${SMHI_API}.json`);
  if (!r.ok) throw new Error(`SMHI:s stationslista svarade ${r.status}`);
  const j = await r.json() as { station?: { key: string; latitude: number; longitude: number; active: boolean }[] };
  return (j.station ?? []).filter((s) => s.active).map((s) => ({ id: String(s.key), lon: s.longitude, lat: s.latitude }));
}
/** SMHI:s timvärden från `fran` (ms): latest-months, och corrected-archive för det som ligger före den. */
async function smhiTimmar(id: string, fran: number): Promise<Map<number, SmhiKlass>> {
  const ut = new Map<number, SmhiKlass>();
  let lmFran = Infinity;
  const r = await fetch(`${SMHI_API}/station/${id}/period/latest-months/data.json`);
  if (r.ok) {
    const j = await r.json() as { period?: { from?: number }; value?: { date: number; value: string }[] };
    lmFran = j.period?.from ?? Infinity;
    for (const v of j.value ?? []) if (v.date >= fran) ut.set(Math.round(v.date / 1000), smhiKlass(v.value));
  } else throw new Error(`SMHI ${id} latest-months svarade ${r.status}`);
  if (fran < lmFran) {
    const c = await fetch(`${SMHI_API}/station/${id}/period/corrected-archive/data.csv`);
    if (!c.ok) throw new Error(`SMHI ${id} corrected-archive svarade ${c.status}`);
    for (const rad of (await c.text()).split("\n")) {
      const m = /^(\d{4}-\d{2}-\d{2});(\d{2}:\d{2}:\d{2});(\d+);/.exec(rad);
      if (!m) continue;
      const t = Date.parse(`${m[1]}T${m[2]}Z`) / 1000;
      if (t * 1000 >= fran && !ut.has(t)) ut.set(t, smhiKlass(m[3]));
    }
  }
  return ut;
}

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
// KUVÖSEN (kort #232, DECISIONS #424, #455): domens mått på vintern 2024/25, men bara startvärdet (det primära paret, SVEP[0]),
// inget svep och ingen valregel — ett riktningsprov, ingen dom. Tiden kommer som argument, vägstationerna ur arkivet och SMHI:s
// parameter 13 ur kuvösens arkiv (kuvos_ra.smhi_obs), eftersom API:ts perioder inte når den vintern.
const KUVOS = process.argv.includes("--kuvos");
const flagga = (namn: string) => { const i = process.argv.indexOf(namn); return i > 0 ? process.argv[i + 1] : undefined; };
const DOM = process.argv.includes("--dom");
if (DOM && Date.now() < Date.parse(DOM_FRAN)) {
  console.error(`--dom är låst till ${DOM_FRAN.slice(0, 10)} (TROSKLAR-NEDERBORDSTYPEN §5, domspärren). Utan flaggan visas räkningarna.`);
  process.exit(1);
}
const DAGAR = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 30);
const FRAN = KUVOS ? Date.parse(flagga("--fran")!) : DOM ? Date.parse(FONSTER_FRAN) : Date.now() - DAGAR * 864e5;
const TILL = KUVOS ? Date.parse(flagga("--till")!) : DOM ? Math.min(Date.now(), Date.parse(MARS_TILL)) : Date.now();
if (KUVOS && !(FRAN < TILL)) { console.error("--kuvos kräver --fran och --till (ISO)"); process.exit(1); }
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await pool.query("SET statement_timeout = '300s'");

console.log(`Grind NT — nederbördstypen (kort #45), ${new Date(FRAN).toISOString().slice(0, 10)} → ${new Date(TILL).toISOString().slice(0, 16)}Z, ` +
  `${KUVOS ? "KUVÖSENS RIKTNINGSPROV: startvärdet L 0 · U +1,5, inget svep, ingen dom (DECISIONS #424, #455)" : DOM ? "DOMLÄGE" : "SPÄRRAT: bara räkningar på facitsidan (§5)"}\n`);

// Paren först: vägstationernas lägen ur weather_latest, SMHI:s aktiva stationer ur API:t. En tyst tom lista vore ett tyst aldrig.
const vag = (await pool.query(KUVOS
  ? `SELECT DISTINCT ON (station_id) station_id AS id, ST_X(geom) AS lon, ST_Y(geom) AS lat FROM weather_observations
     WHERE geom IS NOT NULL ORDER BY station_id, sample_time DESC`
  : `SELECT station_id AS id, ST_X(geom) AS lon, ST_Y(geom) AS lat FROM weather_latest`)).rows
  .map((r: any) => ({ id: String(r.id), lon: Number(r.lon), lat: Number(r.lat) }));
const kuvosStationer = async (): Promise<Smhi[]> => (await pool.query(`SELECT DISTINCT ON (station_id) station_id AS id, lon, lat
  FROM kuvos_ra.smhi_obs WHERE parameter = 13 AND lon IS NOT NULL ORDER BY station_id, tid DESC`)).rows
  .map((r: any) => ({ id: String(r.id), lon: Number(r.lon), lat: Number(r.lat) }));
const kuvosTimmar = async (id: string, fran: number): Promise<Map<number, SmhiKlass>> => new Map((await pool.query(`SELECT
  extract(epoch FROM tid)::bigint AS t, varde FROM kuvos_ra.smhi_obs WHERE parameter = 13 AND station_id = $1 AND varde IS NOT NULL
  AND tid >= $2`, [id, new Date(fran).toISOString()])).rows.map((r: any) => [Number(r.t), smhiKlass(String(r.varde))] as [number, SmhiKlass]));
let smhi: Smhi[] = [], smhiFel = "";
try { smhi = KUVOS ? await kuvosStationer() : await smhiStationer(); } catch (e) { smhiFel = String((e as Error).message); }
let parKm = PAR_KM, par = paraIhop(vag, smhi, PAR_KM);
if (par.size < PAR_MIN) { parKm = PAR_KM_RESERV; par = paraIhop(vag, smhi, PAR_KM_RESERV); }
if (smhiFel) console.log(`SMHI EJ NÅBART (${smhiFel}) — A2 och SMHI-räkningarna är EJ MÄTTA, inte noll.`);

const DAG_SQL = `
  SELECT DISTINCT ON (station_id, floor(extract(epoch FROM sample_time) / ${BUCKET_S}))
    station_id, floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS hink, extract(epoch FROM sample_time)::bigint AS t,
    ST_X(geom) AS lon, ST_Y(geom) AS lat, air_temp_c AS luft, humidity_pct AS rh, precipitation
  FROM weather_observations w
  WHERE sample_time >= $1 AND sample_time < $2 AND geom IS NOT NULL
    AND (air_temp_c IS NULL OR surface_temp_c IS NULL OR surface_temp_c >= air_temp_c - 12)   -- #75:s vakt
    AND ${RADVAKT_SQL} AND ${karantanSql("w")}                                                 -- kort #234: radvakten och karantänen
  ORDER BY station_id, floor(extract(epoch FROM sample_time) / ${BUCKET_S}), sample_time DESC`;

const stat: Stat = { ordlista: new Map(), klassRader: { regn: 0, slask: 0, sno: 0 },
  klassStationer: { regn: new Set(), slask: new Set(), sno: new Set() }, ep: { regn: 0, slask: 0, sno: 0 }, band: new Set(),
  slaskDygn: new Set(), iBandet: 0, medGrannar: 0, medFalt: 0, medTyp: 0, par: par.size, parKm, smhiTimmar: {}, partimmar: 0, snoSlaskPartimmar: 0 };
const epState = new Map<string, { k: Klass; t: number }>();
const tupler: Tuppel[] = [];
const vidPar = new Map<string, Map<number, Rad>>();   // parade vägstationers rader per hink, för A2

for (let d = FRAN; d < TILL; d += 864e5) {
  const rows = (await pool.query(DAG_SQL, [new Date(d).toISOString(), new Date(Math.min(d + 864e5, TILL)).toISOString()])).rows as any[];
  const dag: Rad[] = rows.map((r) => {
    const s = r.precipitation == null ? "(null)" : String(r.precipitation);
    stat.ordlista.set(s, (stat.ordlista.get(s) ?? 0) + 1);
    return { station: String(r.station_id), hink: Number(r.hink), t: Number(r.t), lon: Number(r.lon), lat: Number(r.lat),
      tw: vatbulb(r.luft == null ? null : Number(r.luft), r.rh == null ? null : Number(r.rh)), givare: givarklass(r.precipitation) };
  });
  raknaEpisoder(dag, epState, stat.ep);
  const perHink = new Map<number, Rad[]>();
  for (const r of dag) {
    if (!perHink.has(r.hink)) perHink.set(r.hink, []);
    perHink.get(r.hink)!.push(r);
    if (par.has(r.station)) { if (!vidPar.has(r.station)) vidPar.set(r.station, new Map()); vidPar.get(r.station)!.set(r.hink, r); }
    if (!arKlass(r.givare)) continue;
    stat.klassRader[r.givare]++; stat.klassStationer[r.givare].add(r.station);
    if (r.givare !== "regn") stat.band.add(bandFor(r.lat));
    if (r.givare === "slask") stat.slaskDygn.add(lokalDag(r.t));
  }
  for (const [, ihink] of perHink) {
    const ankare = ihink.filter((r) => r.tw !== null).map((r) => ({ id: r.station, lon: r.lon, lat: r.lat, yta: r.tw as number }));
    for (const r of ihink) {
      if (!arKlass(r.givare) || !iBand(r.tw)) continue;
      stat.iBandet++;
      const g = skatta(r, ankare.filter((a) => a.id !== r.station));
      const skattad = g.n >= GRANNAR_MIN && g.yta !== null ? g.yta : null;
      if (skattad !== null) stat.medGrannar++;
      tupler.push({ manad: lokalDag(r.t).slice(0, 7), egen: r.tw, skattad, facit: r.givare });
    }
  }
}

const tack = (await pool.query(`
  SELECT count(DISTINCT station_id) FILTER (WHERE air_temp_c IS NOT NULL AND humidity_pct IS NOT NULL) AS med_falt,
         count(DISTINCT station_id) FILTER (WHERE air_temp_c IS NOT NULL AND humidity_pct IS NOT NULL
           AND precipitation IS NOT NULL AND precipitation <> '') AS med_typ
  FROM weather_observations WHERE sample_time >= $1 AND sample_time < $2`, [new Date(FRAN).toISOString(), new Date(TILL).toISOString()])).rows[0];
stat.medFalt = Number(tack.med_falt); stat.medTyp = Number(tack.med_typ);

// SMHI vid paren: facitsidans timmar, och de partimmar där vägstationen har en rad inom ±10 min.
const parTimmar: { vag: Klass; smhi: Klass; tw: number | null; manad: string }[] = [];
let smhiStationFel = 0;
for (const [vid, s] of par) {
  let timmar: Map<number, SmhiKlass>;
  try { timmar = KUVOS ? await kuvosTimmar(s.id, FRAN) : await smhiTimmar(s.id, FRAN); } catch { smhiStationFel++; continue; }
  const rader = vidPar.get(vid) ?? new Map<number, Rad>();
  for (const [H, klass] of timmar) {
    if (H * 1000 >= TILL) continue;
    stat.smhiTimmar[klass] = (stat.smhiTimmar[klass] ?? 0) + 1;
    const r = radVid(rader, H);
    if (!r || !arKlass(klass)) continue;
    stat.partimmar++;
    if (klass !== "regn") stat.snoSlaskPartimmar++;
    if (arKlass(r.givare)) parTimmar.push({ vag: r.givare, smhi: klass, tw: r.tw, manad: lokalDag(H).slice(0, 7) });
  }
}
await pool.end();
if (smhiStationFel) console.log(`SMHI: ${smhiStationFel} av ${par.size} parstationer gick inte att hämta — deras timmar saknas, de är inte noll.`);

for (const r of sparrRader(stat)) console.log(r);
if (!DOM && !KUVOS) {
  console.log(`\nSPÄRRAT till ${DOM_FRAN.slice(0, 10)}. Modellens klasser och all överensstämmelse visas först i domläget (§5).`);
  process.exit(0);
}

// ---- DOMEN (§5–§6) ---- I kuvösen samma mått som läsning: bara startvärdet, inget val, ingen dom.
console.log(`\n${"─".repeat(78)}\n${KUVOS ? "KUVÖSENS RIKTNINGSPROV — domens mått som läsning, ingen dom" : "DOMEN"}\n`);
const ar = new Date(FRAN).getUTCFullYear();
const manaderna = KUVOS ? [`${ar}-12`, `${ar + 1}-01`, `${ar + 1}-02`] : VINTERMANADER;
const a1 = kvot(stat.medTyp, stat.medFalt);
const aPar = parTimmar.length, aTraff = parTimmar.filter((p) => p.vag === p.smhi).length;
const aFarligtN = parTimmar.filter((p) => p.smhi !== "regn").length, aFarligt = parTimmar.filter((p) => p.smhi !== "regn" && p.vag === "regn").length;
const a2t = kvot(aTraff, aPar), a2f = kvot(aFarligt, aFarligtN);
const A = !smhiFel && a1 !== null && a1 >= A1_TACKNING && a2t !== null && a2f !== null && a2t >= A2_TRAFF && a2f <= A2_FARLIGT;
console.log(`NT-A  täckning ${a1} (≥ ${A1_TACKNING}) · mot SMHI ${a2t} (≥ ${A2_TRAFF}) · farligt ${a2f} (≤ ${A2_FARLIGT}) ⇒ ${A ? "KLARAR" : "FALLER"}`);
const D = domD(stat);
console.log(`NT-D  ${D ? "KLARAR" : "FALLER — OAVGJORT (§5: fönstret förlängs med mars, räcker inte det bärs domen till nästa vinter)"}`);
// Faller A döms B och C mot SMHI i paren (§5 NT-A).
const facitTupler: Tuppel[] = A ? tupler
  : parTimmar.filter((p) => p.tw !== null).map((p) => ({ manad: p.manad, egen: p.tw as number, skattad: null, facit: p.smhi }));
if (!A) console.log(`      A faller ⇒ B döms mot SMHI i paren (${facitTupler.length} partimmar); C kan inte dömas utan givarfacit.`);
const utfall = (KUVOS ? SVEP.slice(0, 1) : SVEP).map(({ L, U }) => {
  const b = doma(jamfor(facitTupler, L, U, (t) => t.egen), B1_TRAFF, B2_FARLIGT, B3_SLASK);
  const manader = manaderna.filter((m) => {
    const j = jamfor(facitTupler.filter((t) => t.manad === m), L, U, (t) => t.egen);
    const t = kvot(j.traff, j.n);
    return t !== null && t >= B1_TRAFF;
  }).length;
  const c = A ? doma(jamfor(tupler, L, U, (t) => t.skattad), C1_TRAFF, C2_FARLIGT, C3_SLASK) : null;
  const B = b.klarar && manader >= 2;
  console.log(`L ${L} · U ${U}:  NT-B träff ${b.t} farligt ${b.f} slask ${b.s} · månader ${manader}/3 ⇒ ${B ? "KLARAR" : "FALLER"}` +
    (c ? `   NT-C träff ${c.t} farligt ${c.f} slask ${c.s} ⇒ ${c.klarar ? "KLARAR" : "FALLER"}` : ""));
  return { L, U, B, bf: b.f ?? 1, C: c?.klarar ?? false };
});
if (KUVOS) { console.log(`\nInget val (DECISIONS #424): bara startvärdet är räknat. Läsningen förs in i riktningsprovets tabell.`); process.exit(0); }
const klarar = utfall.filter((u) => u.B).sort((x, y) => x.bf - y.bf || (x.L === SVEP[0].L && x.U === SVEP[0].U ? -1 : 1));
const vald = klarar[0];
console.log(`\nValregeln (§3): ${vald ? `L ${vald.L} · U ${vald.U}${vald.C ? " — NT-C klarar också" : " — NT-C faller"}` : "ingen kombination klarar NT-B"}.`);
console.log(`Domslutet fälls av Axel mot den här utskriften (§6). ${D ? "" : "D faller: utskriften är OAVGJORD, inte ett nej."}`);
