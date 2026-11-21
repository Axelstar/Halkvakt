// FUKTSKUGGAN I MOTORN — vad A2 skulle ha sagt längs skuggans rutter med fuktregeln (Bengt 21/11: "jag vill att du sätter upp
// skuggkörningen och jag utgår från att den kan göra backtester på det material vi redan har samlat"; DECISIONS #945).
// EN SKUGGA, ALDRIG EN RÖST: skriptet läser arkivet och skriver bara ut räkningar. Ingen motor, ingen snapshot och ingen app ändras.
//
// FRÅGAN. Förslag 2 ur analysen 21/11: A2 läser stationer inom 15 km i stället för stationens egen punkt, och fukt är nederbörd
// vid stationen ELLER ytan kallare än daggpunkten (rimfrost och kondens). Ytgränsen är dagens, +1 °C. sql/138 räknar stationstimmarna
// och olyckorna; det här räknar det föraren skulle HÖRA: hur ofta A2 talar på en körning, och takten (DECISIONS #200: tätaste följd,
// följder inom 60 s) när A1:s sträckor talar i samma körning.
//
// UPPSPELNINGEN. Varje halvtimme (:00 och :30 UTC) i fönstret körs skuggans huvudrutter (ROUTES i skuggmotorn, längs vägnätet ur
// data/favoritprov/rutter-osrm.json, 80 km/h och en fix var 5:e s, som skuggmotorn) genom motorn tre gånger:
//   BAS      dagens A2: varje stations senaste vaktade rad de 45 minuterna före tiden, på stationens plats, fukt = FUKT_SQL.
//   DAGG     samma plats, fukt = FUKT_SQL eller ytan under daggpunkten (daggpunkten -50…+30 °C, som sql/138).
//   RACKVIDD dagens fukt, och stationerna inom 15 km flyttas till rutten som i FORSLAG2: räckvidden ensam.
//   *_ZON    den nya skuggan (Bengt 21/11: "på 2 gör vi ny skugga"): RACKVIDD och FORSLAG2, men en kedja av stationer längs rutten
//            där nästa ligger högst 15 km längre fram är en fara (ZON_M), så att föraren hör den en gång.
//   FORSLAG2 DAGG:s fukt, och varje station inom 15 km från rutten flyttas till närmaste punkt på rutten: vägen inom 15 km får
//            stationens varning, och motorns disciplin (prioritet, 10 s, 10 min/5 km) gäller som förut.
// A1:s sträckor (road_condition_history, som rekonstruktionen) är med i alla tre, så att A2 tävlar som i bilen. Broarna (+3 °C) och
// efterhalkan (S3) är inte med i någon av dem: de bär egna regler som förslaget inte rör.
// VAKTERNA är driftens, importerade: #75, radvakten, karantänen och den långsamma vakten (publish/snapshot-core.ts, läxan 23/9).
//
// UTSKRIFTEN är aggregat per variant, dygn och rutt: körningar, A2-yttranden, körningar med A2, nya A2 (en station som basen inte
// talade om i samma körning), alla yttranden och takten. Ingen station, ingen tid finare än dygnet. --json <fil> skriver samma
// aggregat som fil (flödets artefakt). Repot är publikt.
//
// Run: DATABASE_URL=... node --experimental-strip-types scripts/fuktskuggan-takt.ts <från ÅÅÅÅ-MM-DD> [till ÅÅÅÅ-MM-DD] [--steg minuter] [--json fil]
// Självtest utan databas: --sjalvtest
import { readFileSync, writeFileSync } from "node:fs";
import { AlertEngine } from "../engine/src/engine.ts";
import { farorLangsRutten, farorVidLinjen, farorNaraRutten, punktLangs } from "../engine/src/rutfilter.ts";
import { haversineM } from "../engine/src/geo.ts";
import type { Alert, Fix, Hazard } from "../engine/src/types.ts";
import { RADVAKT_SQL, karantanSql } from "../publish/snapshot-core.ts";
import { FUKT_SQL, segmentAt } from "../publish/rekonstruktion.ts";
import { skuggmotornsRutter } from "../publish/skuggfacit.ts";

export const RACKVIDD_M = 15_000;       // förslag 2: stationer inom 15 km
export const SLOT_S = 1800;
export type Variant = "BAS" | "DAGG" | "RACKVIDD" | "FORSLAG2" | "RACKVIDD_ZON" | "FORSLAG2_ZON";
export const VARIANTER: Variant[] = ["BAS", "DAGG", "RACKVIDD", "FORSLAG2", "RACKVIDD_ZON", "FORSLAG2_ZON"];
export const ZON_M = 15_000;          // den nya skuggan (Bengt 21/11): stationer längs rutten inom 15 km från varandra är en fara
export type Station = { id: string; lon: number; lat: number; yta: number; fukt: boolean; dagg: boolean };

/** Skuggmotorns spår: rak interpolation mellan brytpunkterna, 80 km/h, en fix var 5:e s (supabase/functions/skuggmotor/main.ts). */
export function traceAlong(line: [number, number][], kmh = 80, stepS = 5): Fix[] {
  const mps = (kmh * 1000) / 3600;
  const fixes: Fix[] = []; let t = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [lon1, lat1] = line[i], [lon2, lat2] = line[i + 1];
    const d = haversineM({ lon: lon1, lat: lat1 }, { lon: lon2, lat: lat2 });
    const steps = Math.max(1, Math.round(d / (mps * stepS)));
    for (let s = 0; s < steps; s++) {
      const f = s / steps;
      fixes.push({ t, lon: lon1 + (lon2 - lon1) * f, lat: lat1 + (lat2 - lat1) * f, speedKmh: kmh });
      t += stepS;
    }
  }
  return fixes;
}

/** A2:s faror för en variant och en rutt: bara stationerna som kan tala (yta <= +1 °C och variantens fukt; utan broar och S3 talar
 *  ingen annan). FORSLAG2 flyttar varje sådan station inom räckvidden till närmaste punkt på rutten. */
export function a2Faror(stationer: Station[], variant: Variant, line: [number, number][]): Hazard[] {
  const fukt = (s: Station) => s.fukt || ((variant === "DAGG" || variant === "FORSLAG2" || variant === "FORSLAG2_ZON") && s.dagg);
  const st = stationer.filter((s) => s.yta <= 1 && fukt(s));
  const punkt = (s: Station, lon: number, lat: number): Hazard =>
    ({ id: `wx:${s.id}`, kind: "icing_point", lon, lat, meta: { surfaceTempC: s.yta, moisture: true } });
  if (variant === "BAS" || variant === "DAGG") return st.map((s) => punkt(s, s.lon, s.lat));
  const som = st.map((s) => punkt(s, s.lon, s.lat));
  const langsRutten = farorLangsRutten(som, line, RACKVIDD_M);   // i körordning
  if (variant === "RACKVIDD_ZON" || variant === "FORSLAG2_ZON") {
    // En kedja av stationer längs rutten där nästa ligger högst ZON_M längre fram är EN fara, på den första stationens punkt och med
    // dess id: motorns regel om samma fara (10 min / 5 km) gäller då för hela kedjan, som halkzonen (DECISIONS #624) för sträckorna.
    const ut: Hazard[] = [];
    let forra = -Infinity;
    for (const x of langsRutten) {
      if (x.langsM - forra > ZON_M) { const [lon, lat] = punktLangs(line, x.langsM); ut.push({ ...x.hazard, lon, lat }); }
      forra = x.langsM;
    }
    return ut;
  }
  const langs = new Map(langsRutten.map((x) => [x.hazard.id, x.langsM]));
  return st.map((s) => {
    const l = langs.get(`wx:${s.id}`);
    if (l === undefined) return punkt(s, s.lon, s.lat);
    const [lon, lat] = punktLangs(line, l);
    return punkt(s, lon, lat);
  });
}

export type Rakning = { korningar: number; a2: number; korningarMedA2: number; nyaA2: number; alla: number;
  tatastFoljdS: number | null; foljderInom60s: number };
export const tom = (): Rakning => ({ korningar: 0, a2: 0, korningarMedA2: 0, nyaA2: 0, alla: 0, tatastFoljdS: null, foljderInom60s: 0 });

/** Lägger räkningen `b` till `a`. */
export function slaIhop(a: Rakning, b: Rakning): void {
  a.korningar += b.korningar; a.a2 += b.a2; a.korningarMedA2 += b.korningarMedA2; a.nyaA2 += b.nyaA2; a.alla += b.alla;
  a.foljderInom60s += b.foljderInom60s;
  if (b.tatastFoljdS !== null && (a.tatastFoljdS === null || b.tatastFoljdS < a.tatastFoljdS)) a.tatastFoljdS = b.tatastFoljdS;
}

/** Lägger en körnings yttranden till räkningen. `basA2` är stationerna basen talade om i samma körning. */
export function rakna(r: Rakning, alerts: Alert[], basA2: Set<string>): void {
  r.korningar++;
  const a2 = alerts.filter((a) => a.kind === "icing_point");
  r.a2 += a2.length;
  if (a2.length) r.korningarMedA2++;
  r.nyaA2 += new Set(a2.filter((a) => !basA2.has(a.hazardId)).map((a) => a.hazardId)).size;
  r.alla += alerts.length;
  const ts = alerts.map((a) => a.t).sort((x, y) => x - y);
  for (let i = 1; i < ts.length; i++) {
    const d = ts[i] - ts[i - 1];
    if (r.tatastFoljdS === null || d < r.tatastFoljdS) r.tatastFoljdS = d;
    if (d <= 60) r.foljderInom60s++;
  }
}

/** En halvtimme: varje rutt genom motorn i de tre varianterna. */
export function korSlot(st: Station[], segment: Hazard[], rutter: [string, [number, number][]][],
  ut: (variant: Variant, rutt: string) => Rakning): void {
  for (const [namn, line] of rutter) {
    const trace = traceAlong(line);
    const segNara = farorNaraRutten(segment, line);
    let basA2 = new Set<string>();
    // En variant vars A2-faror är desamma som förra variantens ger samma körning (motorn är deterministisk): den återanvänds.
    let forra: { nyckel: string; alerts: Alert[] } | null = null;
    for (const v of VARIANTER) {
      const a2 = farorNaraRutten(a2Faror(st, v, line), line);
      const nyckel = JSON.stringify(a2.map((h) => h.kind === "icing_point" ? [h.id, h.lon, h.lat] : 0));
      const alerts = forra?.nyckel === nyckel ? forra.alerts : new AlertEngine(farorVidLinjen([...segNara, ...a2], line)).run(trace);
      forra = { nyckel, alerts };
      if (v === "BAS") basA2 = new Set(alerts.filter((a) => a.kind === "icing_point").map((a) => a.hazardId));
      rakna(ut(v, namn), alerts, basA2);
    }
  }
}

export const STATIONER_SQL = `
  SELECT DISTINCT ON (station_id) station_id, ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat, surface_temp_c,
    ${FUKT_SQL} AS fukt,
    (dewpoint_c BETWEEN -50 AND 30 AND surface_temp_c < dewpoint_c) AS dagg
  FROM weather_observations w
  WHERE sample_time BETWEEN $1::timestamptz - interval '45 min' AND $1::timestamptz
    AND geom IS NOT NULL AND surface_temp_c IS NOT NULL
    AND (air_temp_c IS NULL OR surface_temp_c >= air_temp_c - 12)   -- #75:s vakt
    AND ${RADVAKT_SQL} AND ${karantanSql("w")}                      -- radvakten, karantänen och den långsamma vakten
  ORDER BY station_id, sample_time DESC`;

const SVDAG = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" });
const procent = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)} %` : "–");

function huvudrutter(): [string, [number, number][]][] {
  const osrm = JSON.parse(readFileSync(new URL("../data/favoritprov/rutter-osrm.json", import.meta.url), "utf8")).rutter as
    Record<string, { punkter: [number, number][] }>;
  return Object.keys(skuggmotornsRutter()).sort().map((n) => {
    if (!osrm[n]) throw new Error(`rutter-osrm.json saknar ${n}`);
    return [n, osrm[n].punkter];
  });
}

if (process.argv.includes("--sjalvtest")) {
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    const lika = JSON.stringify(fick) === JSON.stringify(vantat);
    if (!lika) ok = false;
    console.log(`  ${lika ? "ok" : "FEL"}: ${namn}${lika ? "" : ` — fick ${JSON.stringify(fick)}, väntat ${JSON.stringify(vantat)}`}`);
  };
  console.log("SJÄLVTEST — fuktskuggan i motorn\n");
  // En rak rutt österut längs 60° N, 100 km. 1° longitud ≈ 55,8 km där.
  const line: [number, number][] = [[15.0, 60.0], [16.8, 60.0]];
  const s = (id: string, lon: number, lat: number, yta: number, fukt: boolean, dagg: boolean): Station => ({ id, lon, lat, yta, fukt, dagg });
  const kor = (st: Station[]) => {
    const r = new Map<string, Rakning>();
    korSlot(st, [], [["prov", line]], (v) => { if (!r.has(v)) r.set(v, tom()); return r.get(v)!; });
    return Object.fromEntries([...r].map(([v, x]) => [v, [x.a2, x.nyaA2]]));
  };
  // En enda station ger samma svar med och utan zonen.
  const med = (x: Record<string, number[]>) => ({ ...x, RACKVIDD_ZON: x.RACKVIDD, FORSLAG2_ZON: x.FORSLAG2 });
  k("våt kall station på vägen talar i alla", kor([s("a", 15.5, 60.0, 0, true, false)]), med({ BAS: [1, 0], DAGG: [1, 0], RACKVIDD: [1, 0], FORSLAG2: [1, 0] }));
  k("rimfrost 10 km bort: bara förslag 2", kor([s("g", 15.5, 60.09, -1, false, true)]), med({ BAS: [0, 0], DAGG: [0, 0], RACKVIDD: [0, 0], FORSLAG2: [1, 1] }));
  k("rimfrost på vägen: bara daggvarianterna talar, som nya", kor([s("b", 15.5, 60.0, -1, false, true)]), med({ BAS: [0, 0], DAGG: [1, 1], RACKVIDD: [0, 0], FORSLAG2: [1, 1] }));
  // 0,09° nord ≈ 10 km från vägen: utanför motorns räckvidd (högst 3 km) men inom 15 km.
  k("våt station 10 km bort: bara räckvidden och förslag 2", kor([s("c", 15.5, 60.09, 0, true, false)]), med({ BAS: [0, 0], DAGG: [0, 0], RACKVIDD: [1, 1], FORSLAG2: [1, 1] }));
  // 0,18° nord ≈ 20 km: utanför 15 km.
  k("våt station 20 km bort: ingen", kor([s("d", 15.5, 60.18, 0, true, false)]), med({ BAS: [0, 0], DAGG: [0, 0], RACKVIDD: [0, 0], FORSLAG2: [0, 0] }));
  k("varm yta (+1,5 °C) med dagg: ingen", kor([s("e", 15.5, 60.0, 1.5, false, true)]), med({ BAS: [0, 0], DAGG: [0, 0], RACKVIDD: [0, 0], FORSLAG2: [0, 0] }));
  k("torr kall station: ingen", kor([s("f", 15.5, 60.0, -3, false, false)]), med({ BAS: [0, 0], DAGG: [0, 0], RACKVIDD: [0, 0], FORSLAG2: [0, 0] }));
  // Tre våta stationer 5 km isär längs vägen: tre faror i dag, en med zonen. 0,09° ≈ 5 km österut längs 60° N.
  const kedja = [s("h1", 15.3, 60.0, 0, true, false), s("h2", 15.39, 60.0, 0, true, false), s("h3", 15.48, 60.0, 0, true, false)];
  k("en kedja inom 15 km är en fara med zonen", kor(kedja), { BAS: [3, 0], DAGG: [3, 0], RACKVIDD: [3, 0], FORSLAG2: [3, 0], RACKVIDD_ZON: [1, 0], FORSLAG2_ZON: [1, 0] });
  // Två stationer 22 km isär (0,4°): två faror också med zonen.
  k("stationer mer än 15 km isär är två faror", kor([s("i1", 15.3, 60.0, 0, true, false), s("i2", 15.7, 60.0, 0, true, false)]),
    { BAS: [2, 0], DAGG: [2, 0], RACKVIDD: [2, 0], FORSLAG2: [2, 0], RACKVIDD_ZON: [2, 0], FORSLAG2_ZON: [2, 0] });
  const p = punktLangs(line, 50_000);
  k("punkten 50 km längs rutten", Math.round(haversineM({ lon: line[0][0], lat: line[0][1] }, { lon: p[0], lat: p[1] }) / 100), 500);
  const r = tom();
  rakna(r, [{ t: 0, hazardId: "wx:a", kind: "icing_point", distanceM: 0, text: "" }, { t: 40, hazardId: "seg:1", kind: "slippery_segment", distanceM: 0, text: "" },
    { t: 200, hazardId: "wx:b", kind: "icing_point", distanceM: 0, text: "" }], new Set(["wx:a"]));
  k("takten: tätaste följd och följder inom 60 s", [r.a2, r.nyaA2, r.alla, r.tatastFoljdS, r.foljderInom60s], [2, 1, 3, 40, 1]);
  console.log(ok ? "\nSJÄLVTEST OK" : "\nSJÄLVTEST FEL");
  process.exit(ok ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && all[i - 1] !== "--json" && all[i - 1] !== "--steg");
  const stegI = process.argv.indexOf("--steg");
  const STEG_S = stegI > 0 ? Number(process.argv[stegI + 1]) * 60 : SLOT_S;   // ett stickprov var N:e minut (standard: varje halvtimme)
  if (!(STEG_S >= SLOT_S && STEG_S % SLOT_S === 0)) throw new Error("--steg ska vara en multipel av 30 minuter");
  const jsonI = process.argv.indexOf("--json");
  const fran = arg[0] ?? "2026-11-06";
  const till = arg[1] ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fran) || !/^\d{4}-\d{2}-\d{2}$/.test(till)) throw new Error(`ogiltigt datum: ${fran} / ${till}`);
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL saknas");
  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
  await pool.query("SET TimeZone = 'UTC'");   // läxan 2/10 (DECISIONS #439)
  const fraga = async (sql: string, params?: unknown[]) => (await pool.query(sql, params)).rows;
  const rutter = huvudrutter();

  // Fönstret i svensk tid: från midnatt det första dygnet till midnatt efter det sista, och aldrig efter nu.
  const t0 = Math.ceil(Date.parse(new Date(`${fran}T00:00:00+01:00`).toISOString()) / 1000 / SLOT_S) * SLOT_S;
  const t1 = Math.min(Date.parse(`${till}T23:00:00Z`) / 1000 + 3600, Date.now() / 1000);
  const perDag = new Map<string, Map<Variant, Rakning>>(), perRutt = new Map<string, Map<Variant, Rakning>>();
  const summa = new Map<Variant, Rakning>(VARIANTER.map((v) => [v, tom()]));
  const hamta = (m: Map<string, Map<Variant, Rakning>>, k: string, v: Variant) => {
    if (!m.has(k)) m.set(k, new Map(VARIANTER.map((x) => [x, tom()])));
    return m.get(k)!.get(v)!;
  };
  let tomma = 0, slots = 0;
  const efter: (() => void)[] = [];
  const ms = { sql: 0, motor: 0, start: Date.now() };
  for (let t = t0; t < t1; t += STEG_S) {
    const tid = new Date(t * 1000);
    if (slots % 48 === 0) console.error(`${tid.toISOString()} · ${slots} halvtimmar · sql ${Math.round(ms.sql / 1000)} s · motor ${Math.round(ms.motor / 1000)} s`);
    let m0 = Date.now();
    const st: Station[] = (await fraga(STATIONER_SQL, [tid])).map((r: any) => ({ id: String(r.station_id), lon: +r.lon, lat: +r.lat,
      yta: +r.surface_temp_c, fukt: !!r.fukt, dagg: !!r.dagg }));
    slots++;
    if (!st.length) { tomma++; continue; }
    const segment = await segmentAt(fraga, tid);
    ms.sql += Date.now() - m0; m0 = Date.now();
    const dag = SVDAG.format(tid);
    // Varje körning räknas en gång och läggs sedan till dygnet, rutten och summan.
    korSlot(st, segment, rutter, (v, rutt) => {
      const r = tom();
      efter.push(() => { for (const m of [hamta(perDag, dag, v), hamta(perRutt, rutt, v), summa.get(v)!]) slaIhop(m, r); });
      return r;
    });
    for (const f of efter.splice(0)) f();
    ms.motor += Date.now() - m0;
  }
  await pool.end();

  const cell = (r: Rakning, nya: boolean) => `${r.a2} · ${procent(r.korningarMedA2, r.korningar)}${nya ? ` · nya ${r.nyaA2}` : ""}`;
  const rad = (namn: string, m: Map<Variant, Rakning>) => {
    const x = VARIANTER.map((v) => m.get(v)!);
    return `| ${namn} | ${x[0].korningar} | ${x.map((r, i) => cell(r, i > 0)).join(" | ")} | ${x.map((r) => r.foljderInom60s).join(" / ")} | ` +
      `${x.map((r) => r.tatastFoljdS ?? "–").join(" / ")} |`;
  };
  const huvud = "| | körningar | BAS: A2 · körningar med A2 | DAGG: A2 · med A2 · nya | RÄCKVIDD | FÖRSLAG 2 | RÄCKVIDD, EN FARA | FÖRSLAG 2, EN FARA | följder ≤ 60 s B/D/R/F/RZ/FZ | tätaste följd s B/D/R/F/RZ/FZ |\n| :-- | --: | --: | --: | --: | --: | --: | --: | --: | --: |";
  console.log(`FUKTSKUGGAN I MOTORN — ${fran} till ${till} (svensk tid), ${slots} tidpunkter var ${STEG_S / 60}:e minut, ${tomma} utan väderrader, ${rutter.length} rutter\n`);
  console.log(`## Summa\n${huvud}\n${rad("alla", summa)}\n`);
  console.log(`## Per dygn\n${huvud}\n${[...perDag].sort().map(([d, m]) => rad(d, m)).join("\n")}\n`);
  console.log(`## Per rutt\n${huvud}\n${[...perRutt].sort().map(([n, m]) => rad(n, m)).join("\n")}`);
  if (jsonI > 0) {
    const obj = (m: Map<string, Map<Variant, Rakning>>) => Object.fromEntries([...m].map(([k, x]) => [k, Object.fromEntries(x)]));
    writeFileSync(process.argv[jsonI + 1], JSON.stringify({ fran, till, slots, tomma, rutter: rutter.length,
      summa: Object.fromEntries(summa), perDag: obj(perDag), perRutt: obj(perRutt) }, null, 1));
  }
}
