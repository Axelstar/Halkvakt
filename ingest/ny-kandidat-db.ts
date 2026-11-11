// DEN NYA KANDIDATENS SKUGGA — databasens in- och utgång (ersättningsregeln docs/FORREGISTRERING-ERSATTNING-2027-28.md §4, DECISIONS
// #692; tabellerna i sql/068). Som ingest/kandidat-db.ts för den frysta, vars läsare och delning används oförändrade, med två skillnader:
//   1. tabellerna är den nyas (TABELLER) — den frystas kandidat_ph, kandidat_live och logg rörs aldrig härifrån;
//   2. ingenting skrivs utan FLAGGAN i kuvos/ny-kandidat-skugga.json: skriv = true OCH ett klarat paritetsprov med körningens nummer.
//      Med flaggan av slutar varje skrivande kommando innan databasen ens öppnas.
//   node --experimental-strip-types ingest/ny-kandidat-db.ts --flagga                 "på" eller "av<TAB>skälet" (ingen databas)
//   node --experimental-strip-types ingest/ny-kandidat-db.ts skriv-ph <ny_kandidat_ph_<R>.csv.gz>   del A:s fil → ny_kandidat_ph
//   node --experimental-strip-types ingest/ny-kandidat-db.ts ph <tid-iso> <ut.csv>    PH vid timmen ur ny_kandidat_ph → punkt,ph
//   node --experimental-strip-types ingest/ny-kandidat-db.ts skriv-live <live.csv>    del B:s fil → ny_kandidat_live, sedan gallringen
//   node --experimental-strip-types ingest/ny-kandidat-db.ts logga                    ny_kandidat_logga(): domloggen för timmen
//   node --experimental-strip-types ingest/ny-kandidat-db.ts logga-stad               ny_kandidat_logga_stad(): storstädernas punkter
//                                                                                  för olycksfacit (sql/096, #815); skriver bara klart
//   node --experimental-strip-types ingest/ny-kandidat-db.ts skriv-punkter <punkter.csv>   del A:s punkter → kandidat_punkter (sql/078)
//   node --experimental-strip-types ingest/ny-kandidat-db.ts skriv-par <kandidatfil.json>  paret ur kandidatfilen → kandidat_par (sql/078)
//   node --experimental-strip-types ingest/ny-kandidat-db.ts --sjalvtest
// skriv-punkter och skriv-par är kandidaten på en kvart (DECISIONS #782, kort #373): kandidat_snabb() läser lägena och paret därifrån.
// Paret skrivs aldrig ut — inte i loggen och inte i felen — eftersom Actions-loggen här är publik.
// Ankarna läses med den frystas `ingest/kandidat-db.ts ankare` (vagpunkt_ankare(), bara läsning): samma population som den frystas RÅ.
//
// BYTET (förberett, INTE byggt): att den nya talar i stället för den frysta är att den här kedjan skriver i den frystas tabeller
// (TABELLER → kandidat_ph, kandidat_live, gallra_kandidat, och kandidat_logga() i pg_cron), så att kandidat_regel() — som
// publiceringen, skuggmotorn och kartan läser — räknar på den nyas värden, och att den frystas två pulsrader i scripts/pulsklocka.ts
// byts mot den nyas. Det kräver ett daterat beslut med båda signaturerna (ersättningsregeln §1 och §7: den nya talar inte i appen
// 2026/27) och ett nytt paritetsprov (§5). Självtestet fäller en tabell utan ny_ i namnet, så bytet är en uttrycklig ändring här.
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { lasCsv, delar } from "./kandidat-db.ts";

export const FLAGGA = fileURLToPath(new URL("../kuvos/ny-kandidat-skugga.json", import.meta.url));

/** Den nya kedjans tabeller och funktioner (sql/068). Ett ställe; bytet ovan är en ändring här. */
export const TABELLER = { ph: "ny_kandidat_ph", live: "ny_kandidat_live", gallra: "gallra_ny_kandidat", logga: "ny_kandidat_logga" } as const;

/** Satserna, som kandidat-db.ts SATS med den nyas tabeller, så att självtestet kan läsa dem. */
export const SATS = {
  skrivPh: `INSERT INTO ${TABELLER.ph} (korning, tid, punkt, ts_fysik, ph)
    SELECT * FROM UNNEST($1::timestamptz[], $2::timestamptz[], $3::text[], $4::real[], $5::real[])
    ON CONFLICT (tid, punkt) DO UPDATE SET korning = EXCLUDED.korning, ts_fysik = EXCLUDED.ts_fysik, ph = EXCLUDED.ph`,
  ph: `SELECT punkt, ph FROM ${TABELLER.ph} WHERE tid = $1::timestamptz AND ph IS NOT NULL ORDER BY punkt`,
  skrivLive: `INSERT INTO ${TABELLER.live} (tid, punkt, ph, pg, ra, ank_km, pb, n_ank, spr, frys_min)
    SELECT * FROM UNNEST($1::timestamptz[], $2::text[], $3::real[], $4::real[], $5::real[], $6::real[], $7::real[], $8::smallint[], $9::real[], $10::float8[])
    ON CONFLICT (tid, punkt) DO UPDATE SET ph = EXCLUDED.ph, pg = EXCLUDED.pg, ra = EXCLUDED.ra, ank_km = EXCLUDED.ank_km, pb = EXCLUDED.pb,
      n_ank = EXCLUDED.n_ank, spr = EXCLUDED.spr, frys_min = EXCLUDED.frys_min`,
  gallra: `SELECT ${TABELLER.gallra}() AS n`,
  logga: `SELECT ${TABELLER.logga}() AS m`,
  loggaStad: `SELECT ny_kandidat_logga_stad() AS m`,   // sql/096 (#815)
};

/** Kandidaten på en kvart (DECISIONS #782, sql/078): punkternas lägen och paret, som kandidat_snabb() läser. Ett läge som inte ändrats
 *  skrivs inte om, så att `andrad` bara flyttas när grannlistorna behöver byggas om. */
export const SNABB = {
  skrivPunkter: `INSERT INTO kandidat_punkter (punkt, lon, lat)
    SELECT * FROM UNNEST($1::text[], $2::float8[], $3::float8[])
    ON CONFLICT (punkt) DO UPDATE SET lon = EXCLUDED.lon, lat = EXCLUDED.lat, andrad = now()
      WHERE (kandidat_punkter.lon, kandidat_punkter.lat) IS DISTINCT FROM (EXCLUDED.lon, EXCLUDED.lat)`,
  skrivPar: `INSERT INTO kandidat_par (id, w, l_km, skriven) VALUES (1, $1, $2, now())
    ON CONFLICT (id) DO UPDATE SET w = EXCLUDED.w, l_km = EXCLUDED.l_km, skriven = EXCLUDED.skriven`,
};

/** Punkterna ur del A:s punktfil (MET Nordics punkter, kolumnerna station_id eller sid, lon och lat). Id:t läses som text: en
 *  station med siffror i namnet ska inte bli ett tal. */
export function lasPunkter(fil: string): { punkt: string; lon: number; lat: number }[] {
  const [rubrik, ...rader] = readFileSync(fil, "utf8").trim().split(/\r?\n/u);
  const kol = rubrik.split(",");
  const id = kol.indexOf("station_id") >= 0 ? kol.indexOf("station_id") : kol.indexOf("sid");
  const lo = kol.indexOf("lon"), la = kol.indexOf("lat");
  if (id < 0 || lo < 0 || la < 0) throw new Error(`${fil}: rubriken ska ha station_id (eller sid), lon och lat: ${rubrik}`);
  return rader.map((r, i) => {
    const c = r.split(",");
    const p = { punkt: c[id], lon: Number(c[lo]), lat: Number(c[la]) };
    if (!p.punkt || !Number.isFinite(p.lon) || !Number.isFinite(p.lat)) throw new Error(`${fil}: rad ${i + 2} saknar id eller läge`);
    return p;
  });
}

/** Paret ur kandidatfilen (par.W, par.L_km). Felet nämner aldrig talen. */
export function lasPar(fil: string): { w: number; l: number } {
  const k = JSON.parse(readFileSync(fil, "utf8"));
  const w = Number(k?.par?.W), l = Number(k?.par?.L_km);
  if (!(Number.isFinite(w) && w > 0 && w <= 1 && Number.isFinite(l) && l > 0)) throw new Error(`${fil}: paret saknas eller är ogiltigt`);
  return { w, l };
}

export type Flagga = { pa: boolean; skal: string };

/** Flaggan: på bara med skriv === true och ett klarat paritetsprov med körningens nummer. Allt annat — också en trasig eller saknad
 *  fil — är av, med skälet. */
export function lasFlagga(fil: string = FLAGGA): Flagga {
  let f: any;
  try { f = JSON.parse(readFileSync(fil, "utf8")); } catch (e) { return { pa: false, skal: `flaggfilen går inte att läsa (${fil}): ${String(e).slice(0, 80)}` }; }
  if (f?.skriv !== true) return { pa: false, skal: "skriv är inte true" };
  const p = f.paritet;
  if (!p || p.klarat !== true || !/^\d{6,}$/u.test(String(p.korning ?? ""))) {
    return { pa: false, skal: "paritetsprovet saknas: paritet.klarat ska vara true och paritet.korning körningens nummer" };
  }
  return { pa: true, skal: `skriv true, paritetsprovet klarat i körningen ${p.korning}` };
}

const SKRIVANDE = new Set(["skriv-ph", "skriv-live", "logga", "logga-stad", "skriv-punkter", "skriv-par"]);

async function pool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL saknas");
  const pg = (await import("pg")).default;
  return new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
}

/** Kommandona. Ett skrivande kommando med flaggan av returnerar "av" innan databasen öppnas. */
export async function main(arg: string[], flaggfil: string = FLAGGA): Promise<string> {
  const [kmd, a, b] = arg;
  if (kmd === "--flagga") {
    const f = lasFlagga(flaggfil);
    console.log(f.pa ? "på" : `av\t${f.skal}`);
    return f.pa ? "på" : "av";
  }
  if (SKRIVANDE.has(kmd)) {
    const f = lasFlagga(flaggfil);
    if (!f.pa) { console.log(`den nya kandidatens skugga: flaggan är av (${f.skal}) — ingenting skrivs`); return "av"; }
  }
  if (kmd === "skriv-ph") {
    const rader = lasCsv(a, ["punkt", "korning_utc", "tid_utc", "ts_fysik", "ph"]);
    const p = await pool();
    try {
      let n = 0;
      for (const d of delar(rader)) {
        await p.query(SATS.skrivPh, [d.map((r) => r.korning_utc), d.map((r) => r.tid_utc), d.map((r) => r.punkt), d.map((r) => r.ts_fysik), d.map((r) => r.ph)]);
        n += d.length;
      }
      console.log(`${TABELLER.ph}: ${n} rader skrivna ur ${a}`);
    } finally { await p.end(); }
  } else if (kmd === "ph") {
    const p = await pool();
    try {
      const r = await p.query(SATS.ph, [a]);
      writeFileSync(b, "punkt,ph\n" + r.rows.map((x) => `${x.punkt},${x.ph}`).join("\n") + (r.rows.length ? "\n" : ""));
      console.log(`${TABELLER.ph} vid ${a}: ${r.rows.length} punkter → ${b}`);
      if (!r.rows.length) process.exit(3);                                   // ingen PH för timmen: del A har inte skrivit den
    } finally { await p.end(); }
  } else if (kmd === "skriv-live") {
    const rader = lasCsv(a, ["tid_utc", "punkt", "ph", "pg", "ra", "ank_km", "pb", "n_ank", "spr"]);
    const p = await pool();
    try {
      let n = 0;
      for (const d of delar(rader)) {
        await p.query(SATS.skrivLive, [d.map((r) => r.tid_utc), d.map((r) => r.punkt), d.map((r) => r.ph), d.map((r) => r.pg), d.map((r) => r.ra),
          d.map((r) => r.ank_km), d.map((r) => r.pb), d.map((r) => r.n_ank), d.map((r) => r.spr), d.map((r) => r.frys_min ?? null)]);   // frys_min: F1 (kort #377)
        n += d.length;
      }
      const g = await p.query(SATS.gallra);
      console.log(`${TABELLER.live}: ${n} rader skrivna ur ${a}; gallringen tog ${g.rows[0].n} rader`);
    } finally { await p.end(); }
  } else if (kmd === "logga") {
    const p = await pool();
    try { console.log(`${TABELLER.logga}: ${(await p.query(SATS.logga)).rows[0].m}`); } finally { await p.end(); }
  } else if (kmd === "logga-stad") {
    // Storstädernas punkter (#815): funktionen svarar klart, tyst eller brytarna av, aldrig ett tal (#768).
    const p = await pool();
    try { console.log(`ny_kandidat_logga_stad: ${(await p.query(SATS.loggaStad)).rows[0].m}`); } finally { await p.end(); }
  } else if (kmd === "skriv-punkter") {
    const rader = lasPunkter(a);
    const p = await pool();
    try {
      let n = 0;
      for (const d of delar(rader)) n += (await p.query(SNABB.skrivPunkter, [d.map((r) => r.punkt), d.map((r) => r.lon), d.map((r) => r.lat)])).rowCount ?? 0;
      console.log(`kandidat_punkter: ${rader.length} punkter lästa ur ${a}, ${n} nya eller flyttade`);
    } finally { await p.end(); }
  } else if (kmd === "skriv-par") {
    const { w, l } = lasPar(a);
    const p = await pool();
    try { await p.query(SNABB.skrivPar, [w, l]); console.log(`kandidat_par: paret skrivet ur ${a}`); } finally { await p.end(); }
  } else {
    console.error("kör: ny-kandidat-db.ts --flagga | skriv-ph <fil> | ph <tid> <ut> | skriv-live <fil> | logga | skriv-punkter <fil> | skriv-par <fil> | --sjalvtest");
    process.exit(2);
  }
  return "klart";
}

async function sjalvtest() {
  let fel = 0; const k = (ok: boolean, m: string) => { if (!ok) { fel++; console.error("✗ " + m); } };
  const d = mkdtempSync(join(tmpdir(), "nkdb-"));
  const flagga = (namn: string, x: unknown) => { const f = join(d, namn); writeFileSync(f, typeof x === "string" ? x : JSON.stringify(x)); return f; };
  // Flaggan: av utan skriv, av utan paritetsprov, av med ett prov som inte är klarat eller saknar körning, av med en trasig och en saknad
  // fil — och på bara med båda.
  const av = flagga("av.json", { skriv: false, paritet: { korning: null, klarat: false } });
  const utanProv = flagga("utan.json", { skriv: true, paritet: { korning: null, klarat: false } });
  const ejKlarat = flagga("ejklarat.json", { skriv: true, paritet: { korning: "40100000000", klarat: false } });
  const utanNummer = flagga("utannr.json", { skriv: true, paritet: { korning: "senaste", klarat: true } });
  const strang = flagga("strang.json", { skriv: "true", paritet: { korning: "40100000000", klarat: true } });
  const trasig = flagga("trasig.json", "{ skriv: true");
  const pa = flagga("pa.json", { skriv: true, paritet: { korning: "40100000000", klarat: true } });
  for (const [f, namn] of [[av, "skriv false"], [utanProv, "utan paritetsprov"], [ejKlarat, "provet inte klarat"], [utanNummer, "utan körningens nummer"],
    [strang, "skriv som sträng"], [trasig, "trasig fil"], [join(d, "finns-inte.json"), "saknad fil"]] as const)
    k(lasFlagga(f).pa === false, `flaggan ska vara av: ${namn} (${lasFlagga(f).skal})`);
  k(lasFlagga(pa).pa === true, `flaggan på med skriv true och klarat prov: ${lasFlagga(pa).skal}`);
  // Repots flaggfil går att läsa och har formen (värdet prövas inte: Bengt slår på den).
  const repo = JSON.parse(readFileSync(FLAGGA, "utf8"));
  k(existsSync(FLAGGA) && typeof repo.skriv === "boolean" && repo.paritet && "korning" in repo.paritet && "klarat" in repo.paritet,
    `kuvos/ny-kandidat-skugga.json har formen { skriv, paritet: { korning, klarat } }: ${JSON.stringify(repo).slice(0, 120)}`);
  // Flaggan av ⇒ ingenting skrivs, och databasen öppnas aldrig: utan DATABASE_URL hade pool() kastat.
  const sparad = process.env.DATABASE_URL; delete process.env.DATABASE_URL;
  const fil = join(d, "ph.csv.gz");
  writeFileSync(fil, gzipSync("punkt,korning_utc,tid_utc,ts_fysik,ph\nv00001,2026-11-01T06:00:00Z,2026-11-01T12:00:00Z,-1.25,-0.9\n"));
  const tyst = console.log; const ut: string[] = []; console.log = (...x: unknown[]) => { ut.push(x.join(" ")); };
  try {
    for (const kmd of [["skriv-ph", fil], ["skriv-live", fil], ["logga"], ["logga-stad"], ["skriv-punkter", fil], ["skriv-par", fil]]) {
      const r = await main(kmd, av);
      k(r === "av" && ut.at(-1)!.includes("ingenting skrivs"), `${kmd[0]} med flaggan av: ${r} ${ut.at(-1)}`);
    }
    let kastade = "";
    try { await main(["skriv-ph", fil], pa); } catch (e) { kastade = String(e); }
    k(kastade.includes("DATABASE_URL saknas"), `motprovet: med flaggan på försöker skriv-ph nå databasen (${kastade || "kastade inte"})`);
    k((await main(["--flagga"], av)) === "av" && ut.at(-1)!.startsWith("av\t") && (await main(["--flagga"], pa)) === "på" && ut.at(-1) === "på",
      "--flagga skriver på eller av med skälet");
  } finally { console.log = tyst; if (sparad !== undefined) process.env.DATABASE_URL = sparad; }
  // Tabellerna: bara den nyas. Ingen sats nämner den frystas tabeller eller funktioner — bytet är inte byggt.
  k(Object.values(TABELLER).every((t) => /^(ny_kandidat_|gallra_ny_kandidat$)/u.test(t)), `TABELLER bär bara den nyas namn: ${JSON.stringify(TABELLER)}`);
  const alla = Object.values(SATS).join("\n");
  k(!/(?<![\w])kandidat_(ph|live|logga|skugga|station|timme|regel)\b|gallra_kandidat\(/u.test(alla), "satserna nämner aldrig den frystas tabeller eller funktioner");
  k(SATS.skrivPh.includes("INSERT INTO ny_kandidat_ph") && SATS.skrivLive.includes("INSERT INTO ny_kandidat_live") && SATS.gallra.includes("gallra_ny_kandidat()")
    && SATS.logga.includes("ny_kandidat_logga()") && SATS.ph.includes("FROM ny_kandidat_ph"), "satserna skriver och läser den nyas tabeller");
  // Samma form som den frystas satser, bara namnen bytta: ingen kolumn eller konflikt som skiljer.
  const { SATS: FRYST } = await import("./kandidat-db.ts");
  const byt = (s: string) => s.replace(/(?<![\w])kandidat_/gu, "ny_kandidat_").replace("gallra_kandidat()", "gallra_ny_kandidat()");
  k(byt(FRYST.skrivPh) === SATS.skrivPh && byt(FRYST.skrivLive) === SATS.skrivLive && byt(FRYST.ph) === SATS.ph && byt(FRYST.gallra) === SATS.gallra,
    "satserna är den frystas med bara tabellnamnen bytta");
  // Kandidaten på en kvart (#782): punkterna med id som text, paret utan tal i felen, och satserna bara mot sql/078:s tabeller.
  const pf = join(d, "punkter.csv");
  writeFileSync(pf, "station_id,name,lon,lat\n0123,Ett,15.5,60.25\nv00001,,16,61\n");
  const pk = lasPunkter(pf);
  k(pk.length === 2 && pk[0].punkt === "0123" && pk[0].lon === 15.5 && pk[1].punkt === "v00001" && pk[1].lat === 61,
    `lasPunkter läser id som text och lägena som tal: ${JSON.stringify(pk)}`);
  writeFileSync(pf, "sid,lon,lat\nS1,15,x\n");
  let kast = ""; try { lasPunkter(pf); } catch (e) { kast = String(e); }
  k(kast.includes("saknar id eller läge"), `lasPunkter vägrar ett läge som inte är ett tal (${kast || "kastade inte"})`);
  const kf = join(d, "kandidat.json");
  writeFileSync(kf, JSON.stringify({ par: { W: 0.375, L_km: 77.5 } }));
  k(JSON.stringify(lasPar(kf)) === JSON.stringify({ w: 0.375, l: 77.5 }), "lasPar läser par.W och par.L_km");
  for (const trasigt of [{}, { par: { W: 0, L_km: 77.5 } }, { par: { W: 1.5, L_km: 77.5 } }, { par: { W: 0.375 } }]) {
    writeFileSync(kf, JSON.stringify(trasigt));
    kast = ""; try { lasPar(kf); } catch (e) { kast = String(e); }
    k(kast.includes("paret saknas eller är ogiltigt") && !/\d\.\d|77/u.test(kast.replace(kf, "")), `lasPar vägrar ${JSON.stringify(trasigt)} utan att nämna talen (${kast})`);
  }
  k(SNABB.skrivPunkter.includes("INSERT INTO kandidat_punkter") && SNABB.skrivPar.includes("INSERT INTO kandidat_par")
    && !/ny_kandidat_|(?<![\w])kandidat_(ph|live|logga|skugga|station|timme|regel)\b/u.test(Object.values(SNABB).join("\n")),
    "skriv-punkter och skriv-par skriver bara kandidat_punkter och kandidat_par");
  if (fel) process.exit(1);
  console.log("✓ självtest: flaggan (av utan skriv, utan klarat paritetsprov, utan körningens nummer, trasig och saknad fil; på bara med båda), "
    + "flaggan av skriver ingenting och öppnar aldrig databasen (motprov: på försöker), bara den nyas tabeller, satserna som den frystas med bytta namn, "
    + "punkterna och paret för kandidaten på en kvart");
}

const direkt = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("ingest/ny-kandidat-db.ts");
if (direkt) {
  if (process.argv.includes("--sjalvtest")) await sjalvtest();
  else await main(process.argv.slice(2));
}
