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
// Med { natt: true } delas varje kandidat också på klara stilla nätter (#471:s definition, tillägg 3 i DECISIONS #536); prognosläsningen
// kuvos-blandning-prognos-2026-10-11.ts slår på den.
// Kör: DATABASE_URL=... node --experimental-strip-types scripts/matningar/kuvos-blandning-2026-10-08.ts [--sjalvtest]
import { readFileSync } from "node:fs";
import { evaluate, stats, BANDS, type Station, type Eval } from "../../publish/grind-a.ts";
import { RADVAKT_SQL, karantanSql } from "../../publish/snapshot-core.ts";
import { skrivFrysflaggan } from "../../publish/frysflagga.ts";
import { lasFysik, fysikVid, linjera, spannkontroll, type Fysik } from "./kuvos-fysik-2026-10-08.ts";
import { lasTrafikvikter, regionsrapport, type Rad } from "./regioner.ts";
import { haversineKm } from "../../publish/moln.ts";

const BUCKET_S = 1800, NORR_LAT = 62;
export type Fil = { namn: string; lage: string; fysik: Fysik };
const pct = (x: number) => (Number.isFinite(x) ? `${(100 * x).toFixed(2).replace(".", ",")} %` : "—");
const rad = (s: ReturnType<typeof stats>) =>
  `n ${s.n} · A1 MAE ${Number.isFinite(s.mae) ? s.mae.toFixed(2).replace(".", ",") : "—"} °C · A2 grova ${pct(s.gross)} · A3 frysklass ${pct(s.freeze)}`;

/** Kandidaterna på RÅ:s punkter: RÅ, OFFSET (taket) och varje fil. Måtten på de punkter där alla har ett värde. */
export function blandningILkuvosen(stations: Map<string, Station>, filer: Fil[], vikt: Map<string, number>, regim?: Regim,
  statistik?: Map<string, ReturnType<typeof stats>>): Record<string, number> {
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
  const klass = regim ? RA.map((e, k) => (med[k] ? regim(e.station, e.t) : "")) : undefined;   // en gång per punkt, inte per kandidat
  console.log(`\n═══ Grind A:s mått på de ${nMed} gemensamma punkterna (bandet = RÅ:s närmaste bidragande granne) ═══`);
  const ut: Record<string, number> = {};
  for (const [namn, v] of kand) {
    const ev: Eval[] = [], evKlass: string[] = [];
    for (let k = 0; k < N; k++) if (med[k]) { ev.push({ ...RA[k], pred: v[k]! }); if (klass) evKlass.push(klass[k]); }
    const tot = stats(ev); ut[namn] = tot.gross; statistik?.set(namn, tot);
    console.log(`  ${namn}: ${rad(tot)}`);
    for (const [b, lo, hi] of BANDS) console.log(`      ${b.padEnd(8)} ${rad(stats(ev.filter((e) => e.ankKm >= lo && e.ankKm < hi)))}`);
    const norr = ev.filter((e) => stations.get(e.station)!.lat >= NORR_LAT), soder = ev.filter((e) => stations.get(e.station)!.lat < NORR_LAT);
    console.log(`      norr ≥ ${NORR_LAT}° grova ${pct(stats(norr).gross)} (n ${norr.length}) · söder grova ${pct(stats(soder).gross)} (n ${soder.length})`);
    console.log(`      ${ytbandsrad(ev)}`);
    if (klass) console.log(`      ${regimrad(ev, evKlass, (s) => stations.get(s)!.lat)}`);
  }
  const rader: { measured: number; ankKm: number; station: string; v: (number | null)[] }[] = [];
  for (let k = 0; k < N; k++) if (med[k]) rader.push({ measured: RA[k].measured, ankKm: RA[k].ankKm, station: RA[k].station, v: kand.map(([, v]) => v[k]) });
  for (const r of skrivFrysflaggan(rader, kand.map(([namn], j) => ({ namn, pick: (r: { v: (number | null)[] }) => r.v[j] })), BANDS)) console.log(r);
  const reg: Rad[] = RA.map((e) => ({ station: e.station, lat: stations.get(e.station)!.lat, ankKm: e.ankKm, measured: e.measured }));
  for (const r of regionsrapport(reg, kand.map(([namn, v]) => ({ namn, v })), vikt)) console.log(r);
  return ut;
}

/** A2 PER YTBAND (kort #329, DECISIONS #520): de grova felen per uppmätt yttemperatur och hur stor del av alla grova fel som ligger
 *  i varje band — särskilt +3…+5 °C, där appen ändå inte varnar. Bara redovisning: ingen grind och ingen population ändras. */
export const YTBAND: [string, number, number][] = [["≤ −3", -Infinity, -3], ["−3…+1", -3, 1], ["+1…+3", 1, 3], ["+3…+5", 3, 5.0001]];
export function ytbandsrad(ev: { measured: number; pred: number }[]): string {
  const grova = ev.filter((e) => Math.abs(e.pred - e.measured) > 2).length;
  return "ytband " + YTBAND.map(([namn, lo, hi]) => {
    const i = ev.filter((e) => e.measured > lo && e.measured <= hi), g = i.filter((e) => Math.abs(e.pred - e.measured) > 2).length;
    return `${namn} °C grova ${pct(i.length ? g / i.length : NaN)} (n ${i.length}, ${pct(grova ? g / grova : NaN)} av felen)`;
  }).join(" · ");
}

/** KLARA STILLA NÄTTER FÖR SIG (tillägg 3, DECISIONS #536) med #471:s definition, satt efter hur det faktiskt var vid t: molnmängd
 *  ≤ 25 % ur SMHI (p16) vid närmaste station inom 50 km, målstationens medelvind ≤ 2 m/s och solen under −6°. Solhöjden och klasserna
 *  är kopierade ur kuvos-prognoslagret-2026-10-06.ts, som inte går att importera utan att dess läsning startar. Bara redovisning, som
 *  ytbanden: ingen grind och ingen population ändras. */
const NATT_SOLHOJD = -6, MOLN_KLAR_PCT = 25, VIND_STILLA = 2, MOLN_MAX_KM = 50;
export type Regim = (station: string, t: number) => string;
export const REGIMER = ["klar stilla natt", "natt övrigt", "dag", "okänd"];
/** Solhöjd i grader (USNO:s approximation, fel under en grad) — samma form som regimgrinden 30/9. */
export function solhojd(lat: number, lon: number, tUnix: number): number {
  const rad = Math.PI / 180, d = (tUnix - 946728000) / 86400;
  const g = (357.529 + 0.98560028 * d) * rad, q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad, e = (23.439 - 0.00000036 * d) * rad;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = ((18.697374558 + 24.06570982441908 * d) % 24 + 24) % 24;
  const ha = ((gmst + lon / 15) * 15) * rad - ra;
  return Math.asin(Math.sin(lat * rad) * Math.sin(dec) + Math.cos(lat * rad) * Math.cos(dec) * Math.cos(ha)) / rad;
}
export const regimklass = (moln: number | undefined, vind: number | undefined, sol: number) =>
  sol >= NATT_SOLHOJD ? "dag" : moln === undefined || vind === undefined ? "okänd" : moln <= MOLN_KLAR_PCT && vind <= VIND_STILLA ? "klar stilla natt" : "natt övrigt";
/** Grova fel per klass, med klassens andel av punkterna och norr/söder om 62°. klass[j] hör till ev[j]. */
export function regimrad(ev: Eval[], klass: string[], lat: (station: string) => number): string {
  const g = (x: Eval[]) => pct(stats(x).gross);
  return "regim " + REGIMER.map((kl) => {
    const i = ev.filter((_, j) => klass[j] === kl);
    return `${kl} grova ${g(i)} (n ${i.length} = ${pct(ev.length ? i.length / ev.length : NaN)} av punkterna; norr ${g(i.filter((e) => lat(e.station) >= NORR_LAT))}, söder ${g(i.filter((e) => lat(e.station) < NORR_LAT))})`;
  }).join(" · ");
}
/** Regimen per (station, hink) som i prognoslagret 6/10: molnmängden per timme vid närmaste SMHI-station ≤ 50 km (raderna ur
 *  kuvos_ra.smhi_obs, p16, som pg lämnar dem), målstationens vind i hinken och solen mitt i hinken. */
export function byggRegim(stations: Map<string, Station>, vind: Map<string, Map<number, number>>,
  smhi: { station_id: string; lat: number | string; lon: number | string; s: number | string; varde: number | string }[]): { regim: Regim; rad: string; moln: number } {
  const smhiPos = new Map<string, { lat: number; lon: number }>(), moln = new Map<string, number>();
  for (const r of smhi) { smhiPos.set(r.station_id, { lat: +r.lat, lon: +r.lon }); moln.set(`${r.station_id}|${Math.floor(Number(r.s) / 3600)}`, Number(r.varde)); }
  const narmasteMoln = new Map<string, string | null>();
  for (const [id, s] of stations) {
    let best: string | null = null, bk = MOLN_MAX_KM;
    for (const [sid, p] of smhiPos) { const km = haversineKm(s.lon, s.lat, p.lon, p.lat); if (km < bk) { bk = km; best = sid; } }
    narmasteMoln.set(id, best);
  }
  const utanfor = [...moln.values()].filter((v) => v < 0 || v > 100), kod = utanfor.filter((v) => v === 113).length;
  const rad = `nattdelningen (#471): SMHI-molnstationer ${smhiPos.size}, ${moln.size} timvärden (utanför 0–100 %: ${utanfor.length}, varav ${kod} med koden 113 = himlen skymd, räknas som inte klar); VViS-stationer med molnstation ≤ ${MOLN_MAX_KM} km: ${[...narmasteMoln.values()].filter(Boolean).length} av ${stations.size}`;
  const regim: Regim = (id, t) => {
    const sid = narmasteMoln.get(id), s = stations.get(id)!;
    return regimklass(sid ? moln.get(`${sid}|${Math.floor(t * BUCKET_S / 3600)}`) : undefined, vind.get(id)?.get(t), solhojd(s.lat, s.lon, (t + 0.5) * BUCKET_S));
  };
  return { regim, rad, moln: moln.size };
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
  k(fangat.some((r) => r.includes("ytband ≤ −3 °C")), "ytbanden skrivs per kandidat (#329)");
  const yb = ytbandsrad([{ measured: -4, pred: -4 }, { measured: 0, pred: 3 }, { measured: 4, pred: 0 }, { measured: 4, pred: 4.5 }]);
  k(yb.includes("+3…+5 °C grova 50,00 % (n 2, 50,00 % av felen)") && yb.includes("≤ −3 °C grova 0,00 % (n 1, 0,00 % av felen)"), `ytbandsraden: ${yb}`);
  // Nattdelningen (tillägg 3, #536): solhöjden, klasserna, att raden skrivs per kandidat bara med en regim, och raden själv.
  const midsommar = Date.parse("2025-06-21T11:00:00Z") / 1000, vinternatt = Date.parse("2025-01-10T23:00:00Z") / 1000;
  k(solhojd(56, 13, midsommar) > 55 && solhojd(56, 13, vinternatt) < -30, "solhöjden midsommar/vinternatt");
  k(regimklass(10, 1, -20) === "klar stilla natt" && regimklass(25, 2, -6.1) === "klar stilla natt" && regimklass(80, 1, -20) === "natt övrigt"
    && regimklass(26, 1, -20) === "natt övrigt" && regimklass(10, 2.1, -20) === "natt övrigt"
    && regimklass(10, 5, -20) === "natt övrigt" && regimklass(113, 1, -20) === "natt övrigt" && regimklass(undefined, 1, -20) === "okänd"
    && regimklass(10, undefined, -20) === "okänd" && regimklass(10, 1, -6) === "dag", "regimklasserna med #471:s gränser (25 %, 2 m/s, −6°)");
  k(!fangat.some((r) => r.includes("regim klar stilla natt")), "utan regim skrivs ingen nattrad (analysläsningarna oförändrade)");
  fangat.length = 0; console.log = (...a: unknown[]) => { fangat.push(a.join(" ")); };
  blandningILkuvosen(stations, filer, new Map(), (s, t) => (Number(s.slice(1)) < 6 && (t - b0) % 2 === 0 ? "klar stilla natt" : "dag"));
  console.log = logg;
  k(fangat.filter((r) => r.includes("regim klar stilla natt")).length === 4, `nattraden skrivs för var och en av de fyra kandidaterna: ${fangat.filter((r) => r.includes("regim ")).length}`);
  const ev = (m: number, p: number, st: string): Eval => ({ measured: m, pred: p, ankKm: 6, station: st, t: 0, spridning: 0, ankare: 1 });
  const rr = regimrad([ev(0, 0, "N"), ev(0, 3, "N"), ev(0, 3, "S"), ev(1, 1, "S")], ["klar stilla natt", "klar stilla natt", "klar stilla natt", "dag"], (s) => (s === "N" ? 65 : 58));
  k(rr.includes("klar stilla natt grova 66,67 % (n 3 = 75,00 % av punkterna; norr 50,00 %, söder 100,00 %)") && rr.includes("dag grova 0,00 % (n 1 = 25,00 %")
    && rr.includes("natt övrigt grova — (n 0"), `nattraden: ${rr}`);
  // byggRegim: S0 (60° N, 15° E) har en molnstation 11 km bort, S11 (16,1° E) ingen inom 50 km; vinternatt kl. 23 UTC.
  const hb = Math.floor(vinternatt / BUCKET_S), vindS = new Map([["S0", new Map([[hb, 1.5], [hb + 1, 4], [hb + 2, 1], [hb + 4, 1]])], ["S11", new Map([[hb, 1]])]]);
  const br = byggRegim(stations, vindS, [
    { station_id: "M1", lat: "60.1", lon: "15", s: String(vinternatt), varde: "12.5" },
    { station_id: "M1", lat: "60.1", lon: "15", s: String(vinternatt + 3600), varde: "113" },
    { station_id: "M2", lat: "62", lon: "15", s: String(vinternatt), varde: "0" }]);
  k(br.regim("S0", hb) === "klar stilla natt" && br.regim("S0", hb + 1) === "natt övrigt" && br.regim("S0", hb + 2) === "natt övrigt"
    && br.regim("S0", hb + 4) === "okänd" && br.regim("S11", hb) === "okänd" && br.regim("S0", Math.floor(midsommar / BUCKET_S)) === "dag",
    `byggRegim: ${["S0|0", "S0|1", "S0|2", "S0|4", "S11|0"].map((x) => br.regim(x.split("|")[0], hb + Number(x.split("|")[1]))).join(", ")}`);
  k(br.moln === 3 && br.rad.includes("SMHI-molnstationer 2, 3 timvärden (utanför 0–100 %: 1, varav 1 med koden 113") && br.rad.includes("molnstation ≤ 50 km: 9 av 12"), `byggRegims rad: ${br.rad}`);
  if (fel) process.exit(1);
  console.log("✓ självtest: filerna läses som FYSIK, mäts på RÅ:s punkter per band med taket bredvid, frysflaggan, norr/söder med trafikvikten, ytbanden och klara stilla nätter (#471) skrivs, och manifestet fäller en fil utan läge eller summa");
  process.exit(0);
}

/** Hela läsningen i kuvösen: filerna ur blandning/manifest.json (skrivna i jobbet) mot vinterns arkiv. natt: dela på klara stilla nätter. */
export async function korBlandning(rubrik: string, { natt = false } = {}) {
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
      floor(extract(epoch FROM sample_time) / ${BUCKET_S})::bigint AS b, surface_temp_c, wind_speed_ms
    FROM weather_observations
    WHERE surface_temp_c IS NOT NULL AND air_temp_c IS NOT NULL AND surface_temp_c >= air_temp_c - 12
      AND ${RADVAKT_SQL} AND ${karantanSql("weather_observations")}
    ORDER BY station_id, b, sample_time DESC`);
  const stations = new Map<string, Station>(), vind = new Map<string, Map<number, number>>();
  for (const r of res) {
    let s = stations.get(r.station_id);
    if (!s) { s = { lon: +r.lon, lat: +r.lat, series: new Map() }; stations.set(r.station_id, s); vind.set(r.station_id, new Map()); }
    s.series.set(Number(r.b), +r.surface_temp_c);
    if (r.wind_speed_ms !== null) vind.get(r.station_id)!.set(Number(r.b), +r.wind_speed_ms);
  }
  console.log(`  ${stations.size} stationer, ${res.length} bucketade avläsningar (${min(t0)}); ${vikt.size} stationer med trafik; norr = lat ≥ ${NORR_LAT}°`);
  if (stations.size < 100 || res.length < 1000) { console.error("UNDERLAGSVAKT: för lite — arkivet eller vakterna är trasiga"); process.exit(1); }
  // Nattdelningen (tillägg 3, #536) som i prognoslagret 6/10: molnmängden per timme vid närmaste SMHI-station ≤ 50 km, vinden och
  // solen vid t. Saknas molnet fälls jobbet först EFTER läsningen, så att timmarna av fysik inte går förlorade för de andra måtten.
  let regim: Regim | undefined, nattFel = "";
  if (natt) {
    const smhi = await q("SELECT station_id, lat, lon, extract(epoch FROM tid)::bigint AS s, varde FROM kuvos_ra.smhi_obs WHERE parameter = 16 AND varde IS NOT NULL")
      .catch((e) => { nattFel = String(e); return []; });
    const b = byggRegim(stations, vind, smhi);
    console.log(`  ${b.rad}`);
    if (!b.moln) nattFel ||= "inga molnvärden (SMHI p16) i kuvos_ra.smhi_obs";
    if (nattFel) console.error(`::error::NATTDELNINGEN GJORDES INTE (tillägg 3, DECISIONS #536): ${nattFel}`);
    else regim = b.regim;
  }
  const statistik = new Map<string, ReturnType<typeof stats>>();   // identitetsprovet läser dem (#597)
  blandningILkuvosen(stations, filer, vikt, regim, statistik);
  console.log(`\nklart (${min(t0)})`);
  await db.end();
  if (nattFel) process.exit(1);
  return statistik;
}

if (korsSjalv) await korBlandning("BLANDNINGEN I KUVÖSEN (DECISIONS #490) — fysikspåret som filer, analysläge och operativt läge, hela vintern 2024/25. Ingen dom.");
