// SMÅVÄGSRÖSTENS KEDJA (DECISIONS #828, kort #647). Rörarbetet runt kuvösens del A, som körs oförändrad (fysik/ny_kandidat/levande.py)
// i kuvos-smavag.yml:
//   historik   analysdygnen delade per del: <ut><i>/dagar/<dygn>.csv.gz med bara delens punkter (stations.csv i <indata><i>), så att
//              varje del A bara läser sina punkters historik. Provet på en fjärdedel 11/11 visade samma PH och samma minne med delens egen
//              historik som med hela, och kortare tid (#828).
// Punkterna, särdragen och historiken stannar i jobbet. Loggen säger bara klart eller fel.
//   hela       dygnsfilerna i <mnsv>/dagar som inte bär 24 timmar för varje punkt i <mnsv>/pilot_punkter.csv tas bort, så att nästa
//              hämtning tar om dem. MET:s arkiv svarade 404 under en störning 11/11, historiken räknade timmarna som saknade i arkivet och
//              sparade dygnen med luckor, och nästa körning hämtar aldrig ett sparat dygn. Kod 3 när något togs bort.
//   korningar  backtestens prognosdygn (kuvos/metnordic-prognos.ts, dagar/<dygn>.csv.gz med alla dygnets körningar) delade per körning i
//              driftens form och namn: <ut>/metnordic_korning_<ÅÅÅÅMMDDTHHZ>.csv.gz med prognosfilens rubrik först, som
//              metnordic-live.ts --korning skriver i drift, så att kedjans bakåtläge läser dem som driften läser sin körning (F57, F58).
//              Alla körningar ska ha lika många rader; annars ett fel.
// Kedjans bakåtläge (kuvos-smavag-bakat.yml, kedjan-a och kedjan-b, DECISIONS #848) matar driftens program med filer där driften läser
// databasen. Varje fil får driftens form:
//   ph         stationernas PH vid timmen ur del A:s fil (ny_kandidat_ph_<R>.csv.gz), som ny-kandidat-db.ts ph läser det ur
//              ny_kandidat_ph: punkt,ph för raderna med timmen och ett PH, i punktens ordning, med PH som tabellens real (fyra byte).
//              Ingen rad: kod 3, som där.
//   ankare     backtestens ankarfil (kuvos/ankare-bakat.ts: tid,punkt,yta,lon,lat) per timme i formen ur kandidat-db.ts ankare
//              (punkt,yta,lon,lat): <ut>/ankare_<ÅÅÅÅMMDDTHH>.csv för varje timme från <från> till <till>.
//   lagen      småvägspunkternas lägen ur punktfilen (sid,lat,lon i id-ordning), som smavag-live-db.ts lagen läser dem ur smavagspunkt.
//   underlag   regeln utanför databasen (smavag-regel.ts) på timmens rader (smavag_drift.py rader) med radarn ur backtestens dygnsfil
//              (kuvos/radar-smavag-vinter.ts), vid kuvösens klocka för timmen (kuvos/ankare-bakat.ts klockan: timmen + 50 minuter, när
//              driftens timjobb läser ankarna), i underlagets form (smavag-live-db.ts underlagCsv). Bär timmen färre än 95 % av punkterna
//              (smavag_timme()) skrivs ingenting: kod 3, som smavag-live-db.ts underlag.
//   node --experimental-strip-types ingest/smavagskedjan.ts historik <lista.txt> <indata-prefix> <n> <ut-prefix>
//   node --experimental-strip-types ingest/smavagskedjan.ts hela <mnsv>
//   node --experimental-strip-types ingest/smavagskedjan.ts korningar <dagar> <ut>     (rubriken ur kuvösens metnordic-prognos.ts)
//   node --experimental-strip-types ingest/smavagskedjan.ts bitar <från> <till>      MET-hämtningens veckor (JSON), steget met
//   node --experimental-strip-types ingest/smavagskedjan.ts kedjan <från> <till>     kedjans jobb (st=, veckor=, dagar=), steget kedjan
//   node --experimental-strip-types ingest/smavagskedjan.ts ph <ny_kandidat_ph_R.csv.gz> <tid> <ut.csv>
//   node --experimental-strip-types ingest/smavagskedjan.ts ankare <ankare.csv.gz> <från-tid> <till-tid> <ut>
//   node --experimental-strip-types ingest/smavagskedjan.ts lagen <punkter.json> <ut.csv>
//   node --experimental-strip-types ingest/smavagskedjan.ts underlag <rader.csv> <antal> <punkter.json> <radar.csv.gz> <tid> <ut.csv>
//   node --experimental-strip-types ingest/smavagskedjan.ts --sjalvtest
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { fullstandig, radarPerBit, varnande, type Punkt } from "./smavag-regel.ts";
import { lasRader, underlagCsv } from "./smavag-live-db.ts";

/** Analysdygnen i <lista> delade per del efter delarnas stations.csv. En rad vars punkt inte står i någon del är ett fel: historiken
 *  ska vara räknad på samma punkter. → rader per del. */
export function delaHistorik(lista: string[], prefix: string, n: number, ut: string): number[] {
  const del = new Map<string, number>();
  for (let i = 1; i <= n; i++) {
    const [rubrik, ...rr] = readFileSync(join(`${prefix}${i}`, "stations.csv"), "utf8").trim().split(/\r?\n/u);
    if (!rubrik.startsWith("sid,")) throw new Error(`${prefix}${i}/stations.csv: rubriken börjar inte med sid`);
    for (const r of rr) del.set(r.split(",")[0], i);
  }
  const antal = Array.from({ length: n }, () => 0);
  for (const fil of lista) {
    const ut_ = Array.from({ length: n }, () => [] as string[]);
    for (const r of gunzipSync(readFileSync(fil)).toString("utf8").split("\n")) {
      if (!r) continue;
      const i = del.get(r.slice(0, r.indexOf(",")));
      if (!i) throw new Error(`${basename(fil)}: en rad för en punkt som inte står i någon del`);
      ut_[i - 1].push(r);
    }
    ut_.forEach((rr, i) => {
      const d = join(`${ut}${i + 1}`, "dagar");
      mkdirSync(d, { recursive: true });
      writeFileSync(join(d, basename(fil)), gzipSync(rr.join("\n") + "\n"));
      antal[i] += rr.length;
    });
  }
  return antal;
}

/** Dygnsfilerna som inte bär 24 rader per punkt tas bort. Raderna räknas som radslut i den uppackade filen. → de borttagna dygnen. */
export function hela(mnsv: string): string[] {
  const n = readFileSync(join(mnsv, "pilot_punkter.csv"), "utf8").trim().split(/\r?\n/u).length - 1;
  const d = join(mnsv, "dagar"), bort: string[] = [];
  for (const f of existsSync(d) ? readdirSync(d).filter((x) => /^\d{4}-\d\d-\d\d\.csv\.gz$/u.test(x)).sort() : []) {
    const b = gunzipSync(readFileSync(join(d, f)));
    let rader = 0;
    for (let i = 0; i < b.length; i++) if (b[i] === 10) rader++;
    if (rader !== 24 * n) { rmSync(join(d, f)); bort.push(f); }
  }
  return bort;
}

/** Prognosdygnen i <dagar> delade per körning (andra kolumnen, körningens tid) till <ut>/metnordic_korning_<stämpel>.csv.gz med <rubrik>
 *  först. En rad med fel antal kolumner eller en tid som inte är en körning 00, 06, 12 eller 18 UTC är ett fel, liksom körningar med
 *  olika många rader (alla bär samma punkter och timsteg). → körningarnas stämplar i ordning. */
export function korningar(dagar: string, ut: string, rubrik: string): string[] {
  const kolumner = rubrik.split(",").length, per = new Map<string, string[]>();
  for (const f of readdirSync(dagar).filter((x) => /^\d{4}-\d\d-\d\d\.csv\.gz$/u.test(x)).sort()) {
    for (const r of gunzipSync(readFileSync(join(dagar, f))).toString("utf8").split("\n")) {
      if (!r) continue;
      const c = r.split(",");
      if (c.length !== kolumner) throw new Error(`${f}: en rad med ${c.length} kolumner, väntat ${kolumner}`);
      const m = /^(\d{4})-(\d\d)-(\d\d)T(00|06|12|18):00:00Z$/u.exec(c[1]);
      if (!m) throw new Error(`${f}: körningens tid ${c[1].slice(0, 30)} är ingen körning`);
      const s = `${m[1]}${m[2]}${m[3]}T${m[4]}Z`;
      let l = per.get(s); if (!l) per.set(s, (l = []));
      l.push(r);
    }
  }
  const storlek = new Set([...per.values()].map((l) => l.length));
  if (storlek.size > 1) throw new Error(`körningarna har olika många rader: ${[...storlek].sort((a, b) => a - b).join(", ")}`);
  mkdirSync(ut, { recursive: true });
  const stamplar = [...per.keys()].sort();
  for (const s of stamplar) writeFileSync(join(ut, `metnordic_korning_${s}.csv.gz`), gzipSync(rubrik + "\n" + per.get(s)!.join("\n") + "\n"));
  return stamplar;
}

export type Bit = { typ: "stationer" | "analys" | "prognos"; fran: string; till: string };
const dygn = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
function veckor(typ: Bit["typ"], fran: string, till: string): Bit[] {
  const ut: Bit[] = [];
  for (let d = fran; d <= till; ) { const e = dygn(d, 6) < till ? dygn(d, 6) : till; ut.push({ typ, fran: d, till: e }); d = dygn(e, 1); }
  return ut;
}

/** MET-hämtningens bitar för backtestens fönster (steget met), veckor från sina första dygn: stationerna från 30 augusti (som driftens
 *  säsongsrelease) till 48 dygn före fran, dygnet 47 före fran för sig (de första körningarna läser 47 dygn; veckorna från 46 dygn före
 *  fran hämtades 12/11 och behåller sina nycklar), analysen från 46 dygn före fran och prognoserna från fran − 1 dygn, alla till till. */
export function bitar(fran: string, till: string): Bit[] {
  let sasong = `${fran.slice(0, 4)}-08-30`;
  if (sasong > fran) sasong = `${Number(fran.slice(0, 4)) - 1}-08-30`;
  const d47 = dygn(fran, -47);
  return [...veckor("stationer", sasong, dygn(d47, -1)), ...veckor("analys", d47, d47), ...veckor("analys", dygn(fran, -46), till),
    ...veckor("prognos", dygn(fran, -1), till)];
}

/** Bitens nyckel i Actions-cachen (steget met). */
export const nyckel = (b: Bit) => `kuvos-smavag-bakat-met-${b.typ}-${b.fran}-${b.till}`;
/** Analysbitarna en prognosvecka högst läser: så många steg har kedjan-a för att läsa dem ur cachen. */
export const MAX_ANALYS = 9;

/** Kedjans jobb: bitarna som stationernas dygn plockas ur (st), prognosveckorna med nycklarna till de analysbitar som småvägarnas 47
 *  dygn före veckans körningar ligger i (veckor: från 47 dygn före veckans första dygn till dygnet efter dess sista), och dygnen. */
export function kedjan(fran: string, till: string): { st: Bit[]; veckor: { fran: string; till: string; a: string[] }[]; dagar: string[] } {
  const bb = bitar(fran, till);
  const ut = bb.filter((b) => b.typ === "prognos").map((p) => {
    const fore = dygn(p.fran, -47), efter = dygn(p.till, 1);
    const a = bb.filter((b) => b.typ === "analys" && b.till >= fore && b.fran <= efter).map(nyckel);
    if (a.length > MAX_ANALYS) throw new Error(`prognosveckan ${p.fran} läser ${a.length} analysbitar, flödet har ${MAX_ANALYS} steg`);
    return { fran: p.fran, till: p.till, a };
  });
  const dagar: string[] = [];
  for (let d = fran; d <= till; d = dygn(d, 1)) dagar.push(d);
  return { st: bb.filter((b) => b.typ !== "prognos"), veckor: ut, dagar };
}

/** Talet som en real (fyra byte) i Postgres kortaste decimalform: den som node-postgres läser tillbaka ur ny_kandidat_ph (ph real). */
export function real(x: number): string {
  const f = Math.fround(x);
  for (let p = 1; p < 9; p++) { const s = String(Number(f.toPrecision(p))); if (Math.fround(Number(s)) === f) return s; }
  return String(Number(f.toPrecision(9)));
}

/** Stationernas PH vid timmen ur del A:s text, som ny-kandidat-db.ts ph skriver det: punkt,ph för raderna med timmen och ett PH, i
 *  punktens ordning, med PH som en real. null när ingen rad bär ett PH för timmen. */
export function stationsPh(text: string, tid: string): string | null {
  const [rubrik, ...rr] = text.trim().split(/\r?\n/u);
  const c = rubrik.split(","), ip = c.indexOf("punkt"), it = c.indexOf("tid_utc"), iv = c.indexOf("ph");
  if (ip < 0 || it < 0 || iv < 0) throw new Error("del A:s rubrik saknar punkt, tid_utc eller ph");
  const ut: [string, string][] = [];
  for (const r of rr) { const x = r.split(","); if (x[it] === tid && x[iv] !== "") ut.push([x[ip], real(Number(x[iv]))]); }
  if (!ut.length) return null;
  ut.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return "punkt,ph\n" + ut.map(([p, v]) => `${p},${v}\n`).join("");
}

/** Ankarfilens rader per timme i driftens form: <ut>/ankare_<ÅÅÅÅMMDDTHH>.csv (punkt,yta,lon,lat) för varje timme från <fran> till
 *  <till>, med bara rubriken för en timme utan ankare. → timmarna. */
export function ankarePerTimme(text: string, fran: string, till: string, ut: string): string[] {
  const [rubrik, ...rr] = text.trim().split(/\r?\n/u);
  if (rubrik !== "tid,punkt,yta,lon,lat") throw new Error("ankarfilens rubrik är inte tid,punkt,yta,lon,lat");
  const per = new Map<string, string[]>();
  for (let t = Date.parse(fran); t <= Date.parse(till); t += 3600e3) per.set(new Date(t).toISOString().replace(".000Z", "Z"), []);
  for (const r of rr) { const i = r.indexOf(","); per.get(r.slice(0, i))?.push(r.slice(i + 1)); }
  mkdirSync(ut, { recursive: true });
  for (const [t, l] of per) writeFileSync(join(ut, `ankare_${t.slice(0, 13).replace(/-/gu, "")}.csv`), "punkt,yta,lon,lat\n" + l.map((x) => x + "\n").join(""));
  return [...per.keys()];
}

type Punktfil = { rader: { id: unknown; lat: unknown; lon: unknown; vag: unknown; ordning: unknown }[] };

/** Småvägspunkternas lägen ur punktfilen, som smavag-live-db.ts lagen skriver dem ur smavagspunkt: sid,lat,lon i id-ordning. */
export function lagen(pf: Punktfil): string {
  const rr = pf.rader.map((x) => [String(x.id), Number(x.lat), Number(x.lon)] as const).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return "sid,lat,lon\n" + rr.map(([p, la, lo]) => `${p},${la},${lo}\n`).join("");
}

/** Timmens underlag ur regeln utanför databasen, som smavag-live-db.ts underlag skriver det ur smavag_regel(): raderna (punkt,ned) med
 *  punktfilens väg och ordning och radarn ur dygnsfilen (bit,observed_at,rate_max_mmh,rate_mean_mmh) vid klockan `nu`. null när timmen
 *  bär för få punkter (`antal` av punktfilens). Dygnsfilen räcker: kompositerna står var 15:e minut, så fönstret på 60 minuter före
 *  timmen + 50 minuter börjar aldrig i dygnet före. */
export function underlagBakat(rader: string, antal: number, pf: Punktfil, radar: string, nu: Date): string | null {
  if (!fullstandig(antal, pf.rader.length)) return null;
  const punkter = new Map<string, Punkt>(pf.rader.map((x) => [String(x.id), { vag: String(x.vag), ordning: Number(x.ordning) }]));
  const [rubrik, ...rr] = radar.trim().split(/\r?\n/u);
  if (rubrik !== "bit,observed_at,rate_max_mmh,rate_mean_mmh") throw new Error("radarfilens rubrik är inte bit,observed_at,rate_max_mmh,rate_mean_mmh");
  const rad = rr.map((r) => { const c = r.split(","); return { bit: c[0], observed_at: new Date(c[1]), rate_mean_mmh: Number(c[3]) }; });
  return underlagCsv(varnande(lasRader(rader), punkter, radarPerBit(rad, nu)));
}

function sjalvtest(): number {
  const fel: string[] = [], k = (ok: boolean, namn: string) => { if (!ok) fel.push(namn); };
  const rot = mkdtempSync(join(tmpdir(), "smavagskedjan-"));
  const vagra = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
  try {
    // historik: raderna går till sin del, varje del får varje dygn, och en okänd punkt fäller.
    for (const [i, s] of [[1, "s00000\ns00001"], [2, "s00002"]] as const) {
      mkdirSync(join(rot, `in${i}`));
      writeFileSync(join(rot, `in${i}`, "stations.csv"), `sid,lon,lat\n${s.split("\n").map((x) => `${x},15,60`).join("\n")}\n`);
    }
    const dag = (d: string, ids: string[]) => {
      const f = join(rot, `${d}.csv.gz`);
      writeFileSync(f, gzipSync(ids.flatMap((id) => [0, 1].map((t) => `${id},${d}T0${t}:00:00Z,1.5`)).join("\n") + "\n"));
      return f;
    };
    const lista = [dag("2026-11-01", ["s00000", "s00001", "s00002"]), dag("2026-11-02", ["s00002", "s00000"])];
    const a = delaHistorik(lista, join(rot, "in"), 2, join(rot, "h"));
    k(JSON.stringify(a) === "[6,4]", `raderna per del: ${a}`);
    const las = (p: string) => gunzipSync(readFileSync(p)).toString("utf8");
    k(las(join(rot, "h2", "dagar", "2026-11-01.csv.gz")) === "s00002,2026-11-01T00:00:00Z,1.5\ns00002,2026-11-01T01:00:00Z,1.5\n", "del 2 bär bara sin punkt");
    k(existsSync(join(rot, "h1", "dagar", "2026-11-02.csv.gz")) && !las(join(rot, "h1", "dagar", "2026-11-02.csv.gz")).includes("s00002"), "del 1 utan del 2:s punkt");
    k(vagra(() => delaHistorik([dag("2026-11-03", ["s00009"])], join(rot, "in"), 2, join(rot, "h"))), "en punkt utanför delarna vägras");

    // hela: ett helt dygn står kvar, ett med en timme för lite, ett tomt och ett med en rad för mycket tas bort.
    const mn = join(rot, "mn");
    mkdirSync(join(mn, "dagar"), { recursive: true });
    writeFileSync(join(mn, "pilot_punkter.csv"), "station_id,lat,lon,ruta_y,ruta_x,avstand_km\ns00000,60,15,1,1,0.1\ns00001,60,15,1,2,0.1\n");
    const fil = (d: string, timmar: number, extra = 0) => writeFileSync(join(mn, "dagar", `${d}.csv.gz`),
      gzipSync(Array.from({ length: timmar * 2 + extra }, (_, i) => `s0000${i % 2},${d}T00:00:00Z,1`).join("\n") + (timmar * 2 + extra ? "\n" : "")));
    fil("2026-11-01", 24); fil("2026-11-02", 23); fil("2026-11-03", 0); fil("2026-11-04", 24, 1);
    const b = hela(mn);
    k(JSON.stringify(b) === JSON.stringify(["2026-11-02.csv.gz", "2026-11-03.csv.gz", "2026-11-04.csv.gz"]), `hela tar bort: ${b}`);
    k(readdirSync(join(mn, "dagar")).join() === "2026-11-01.csv.gz", "det hela dygnet står kvar");
    k(hela(mn).length === 0, "en andra kontroll tar inget");

    // korningar: två dygn med tre körningar delas i tre filer med rubriken först och raderna i ordning; olika många rader och en tid
    // som inte är en körning vägras.
    const pd = join(rot, "pd");
    mkdirSync(pd);
    const RUB = "station_id,korning_utc,ledtid_h,tid_utc,a";
    const rad = (id: string, k: string, l: number) => `${id},${k},${l},x,1`;
    writeFileSync(join(pd, "2024-01-01.csv.gz"), gzipSync([rad("s1", "2024-01-01T12:00:00Z", 0), rad("s2", "2024-01-01T12:00:00Z", 0),
      rad("s1", "2024-01-01T18:00:00Z", 0), rad("s2", "2024-01-01T18:00:00Z", 0)].join("\n") + "\n"));
    writeFileSync(join(pd, "2024-01-02.csv.gz"), gzipSync([rad("s1", "2024-01-02T00:00:00Z", 0), rad("s2", "2024-01-02T00:00:00Z", 0)].join("\n") + "\n"));
    const st = korningar(pd, join(rot, "pk"), RUB);
    k(st.join() === "20240101T12Z,20240101T18Z,20240102T00Z", `körningarnas stämplar: ${st}`);
    k(las(join(rot, "pk", "metnordic_korning_20240101T18Z.csv.gz")) === `${RUB}\n${rad("s1", "2024-01-01T18:00:00Z", 0)}\n${rad("s2", "2024-01-01T18:00:00Z", 0)}\n`,
      "körningsfilen: rubriken och körningens rader");
    writeFileSync(join(pd, "2024-01-03.csv.gz"), gzipSync(rad("s1", "2024-01-03T06:00:00Z", 0) + "\n"));
    k(vagra(() => korningar(pd, join(rot, "pk2"), RUB)), "körningar med olika många rader vägras");
    writeFileSync(join(pd, "2024-01-03.csv.gz"), gzipSync([rad("s1", "2024-01-03T07:00:00Z", 0), rad("s2", "2024-01-03T07:00:00Z", 0)].join("\n") + "\n"));
    k(vagra(() => korningar(pd, join(rot, "pk3"), RUB)), "en tid som inte är en körning vägras");

    // bitar: nycklarna för analysveckorna som hämtades 12/11 är oförändrade; stationerna från 30 augusti; dygnet 47 före för sig.
    const bb = bitar("2024-01-01", "2024-03-31"), typ = (t: string) => bb.filter((b) => b.typ === t);
    k(bb.length === 46 && typ("stationer").length === 11 && typ("analys").length === 21 && typ("prognos").length === 14, `bitarna: ${bb.length}`);
    k(nyckel(typ("stationer")[0]) === "kuvos-smavag-bakat-met-stationer-2023-08-30-2023-09-05" && typ("stationer")[10].till === "2023-11-14",
      "bitar: stationerna 30 augusti till 14 november");
    k(nyckel(typ("analys")[0]) === "kuvos-smavag-bakat-met-analys-2023-11-15-2023-11-15" &&
      nyckel(typ("analys")[1]) === "kuvos-smavag-bakat-met-analys-2023-11-16-2023-11-22" &&
      nyckel(typ("analys")[7]) === "kuvos-smavag-bakat-met-analys-2023-12-28-2024-01-03" && typ("analys")[20].till === "2024-03-31",
      "bitar: analysveckornas nycklar som i cachen 12/11");
    k(nyckel(typ("prognos")[0]) === "kuvos-smavag-bakat-met-prognos-2023-12-31-2024-01-06" && typ("prognos")[13].fran === "2024-03-31",
      "bitar: prognosveckorna som 12/11");
    const kj = kedjan("2024-01-01", "2024-03-31");
    k(kj.st.length === 32 && kj.dagar.length === 91 && kj.dagar[90] === "2024-03-31" && kj.veckor.length === 14, "kedjan: bitarna och dygnen");
    k(kj.veckor[0].a.length === 9 && kj.veckor[0].a[0].endsWith("analys-2023-11-15-2023-11-15") && kj.veckor[0].a[8].endsWith("2024-01-04-2024-01-10"),
      `kedjan: första veckans analysbitar ${kj.veckor[0].a.length}`);
    k(kj.veckor.every((v) => v.a.length <= MAX_ANALYS && v.a.length >= 8), "kedjan: varje vecka läser 8 eller 9 analysbitar");

    // real: Postgres kortaste form för en real; 0,1 som real är inte 0,1 som double.
    k(real(0.1) === "0.1" && real(-1.2345678901) === "-1.2345679" && real(3) === "3" && real(0.30000001192092896) === "0.3", "real: kortaste formen");
    k(Math.fround(Number(real(-7.123456789))) === Math.fround(-7.123456789), "real: samma fyra byte tillbaka");

    // ph: timmens rader med PH, sorterade; en timme utan PH ger null.
    const PH = "punkt,korning_utc,tid_utc,ts_fysik,ph\n";
    const dela = PH + "v00001,2024-01-01T00:00:00Z,2024-01-01T06:00:00Z,1,0.5\n1004,2024-01-01T00:00:00Z,2024-01-01T06:00:00Z,1,-1.2345678901\n" +
      "1001,2024-01-01T00:00:00Z,2024-01-01T06:00:00Z,1,\n1001,2024-01-01T00:00:00Z,2024-01-01T07:00:00Z,1,2\n";
    k(stationsPh(dela, "2024-01-01T06:00:00Z") === "punkt,ph\n1004,-1.2345679\nv00001,0.5\n", "ph: timmens punkter med PH, sorterade, som real");
    k(stationsPh(dela, "2024-01-01T08:00:00Z") === null, "ph: en timme utan PH ger null");
    k(vagra(() => stationsPh("punkt,tid,ph\n", "x")), "ph: fel rubrik vägras");

    // ankare: varje timme får en fil, en timme utan ankare bara rubriken, en timme utanför fönstret ingen.
    const ank = "tid,punkt,yta,lon,lat\n2024-01-01T00:00:00Z,a1,-1.5,15,60\n2024-01-01T00:00:00Z,a2,0.5,16,61\n2024-01-01T02:00:00Z,a1,-2,15,60\n2024-01-01T03:00:00Z,a1,-3,15,60\n";
    const tt = ankarePerTimme(ank, "2024-01-01T00:00:00Z", "2024-01-01T02:00:00Z", join(rot, "ank"));
    k(tt.join() === "2024-01-01T00:00:00Z,2024-01-01T01:00:00Z,2024-01-01T02:00:00Z", `ankare: timmarna ${tt}`);
    k(readFileSync(join(rot, "ank", "ankare_20240101T00.csv"), "utf8") === "punkt,yta,lon,lat\na1,-1.5,15,60\na2,0.5,16,61\n", "ankare: timmens rader utan tiden");
    k(readFileSync(join(rot, "ank", "ankare_20240101T01.csv"), "utf8") === "punkt,yta,lon,lat\n", "ankare: en timme utan ankare är rubriken");
    k(!existsSync(join(rot, "ank", "ankare_20240101T03.csv")), "ankare: timmen utanför fönstret skrivs inte");

    // lagen och underlaget: punktfilen i id-ordning; regeln med radarn vid klockan; för få punkter ger null.
    const pf = { rader: [{ id: "r00002", lat: 60.5, lon: 15.25, vag: "v00001", ordning: 5 }, { id: "r00001", lat: 60, lon: 15, vag: "v00001", ordning: 0 }] };
    k(lagen(pf) === "sid,lat,lon\nr00001,60,15\nr00002,60.5,15.25\n", "lagen: id-ordning, som smavagspunkt");
    const radar = "bit,observed_at,rate_max_mmh,rate_mean_mmh\nv00001-1,2024-01-01T06:45:00.000Z,0.3,0.2\nv00001-0,2024-01-01T05:45:00.000Z,9,9\n";
    const nu = new Date("2024-01-01T06:50:00Z");
    k(underlagBakat("punkt,ned\nr00001,0\nr00002,0\n", 2, pf, radar, nu) === "punkt,ned,radar_mmh\nr00002,0,0.2\n",
      "underlaget: radarn i punktens bit inom fönstret, inte kompositen före");
    k(underlagBakat("punkt,ned\nr00001,1\n", 2, pf, radar, nu) === "punkt,ned,radar_mmh\nr00001,1,\n", "underlaget: N3 utan radar");
    k(underlagBakat("punkt,ned\nr00001,1\n", 1, pf, radar, nu) === null, "underlaget: under 95 % av punkterna ger null");
  } finally { rmSync(rot, { recursive: true, force: true }); }
  console.log(`självtest smavagskedjan: ${fel.length ? "FEL" : "klart"}`);
  for (const f of fel) console.log(`  ${f}`);
  return fel.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [kmd, ...a] = process.argv.slice(2);
  try {
    if (kmd === "--sjalvtest") process.exit(sjalvtest());
    else if (kmd === "historik" && a.length === 4) {
      const lista = readFileSync(a[0], "utf8").split("\n").filter(Boolean);
      delaHistorik(lista, a[1], Number(a[2]), a[3]);
      console.log("historiken per del: klart");
    } else if (kmd === "korningar" && a.length === 2) {
      // Rubriken ur kuvösens prognoshämtning, som ligger ovanpå i flödet (DECISIONS #768); självtestet ovan klarar sig utan den.
      const { RUBRIK } = await import(pathToFileURL(join(process.cwd(), "kuvos", "metnordic-prognos.ts")).href);
      const st = korningar(a[0], a[1], RUBRIK);
      console.log(st.length ? "körningarna: klart" : "körningarna: inga"); if (!st.length) process.exit(1);
    } else if (kmd === "hela" && a.length === 1) {
      const b = hela(a[0]);
      console.log(b.length ? `dygnen: ${b.length} ofullständiga borttagna, hämtas om` : "dygnen: klart");
      if (b.length) process.exit(3);
    } else if (kmd === "bitar" && a.length === 2) {
      console.log(JSON.stringify(bitar(a[0], a[1])));
    } else if (kmd === "kedjan" && a.length === 2) {
      const kj = kedjan(a[0], a[1]);
      console.log(`st=${JSON.stringify(kj.st)}\nveckor=${JSON.stringify(kj.veckor)}\ndagar=${JSON.stringify(kj.dagar)}`);
    } else if (kmd === "ph" && a.length === 3) {
      const t = stationsPh(gunzipSync(readFileSync(a[0])).toString("utf8"), a[1]);
      if (t === null) { console.log("stationernas PH: inget för timmen"); process.exit(3); }
      writeFileSync(a[2], t);
      console.log("stationernas PH: klart");
    } else if (kmd === "ankare" && a.length === 4) {
      ankarePerTimme(gunzipSync(readFileSync(a[0])).toString("utf8"), a[1], a[2], a[3]);
      console.log("ankarna per timme: klart");
    } else if (kmd === "lagen" && a.length === 2) {
      writeFileSync(a[1], lagen(JSON.parse(readFileSync(a[0], "utf8"))));
      console.log("småvägspunkternas lägen: klart");
    } else if (kmd === "underlag" && a.length === 6 && /^\d+$/u.test(a[1])) {
      // Klockan ur kuvösens ankare (kuvos/ankare-bakat.ts), som ligger ovanpå i flödet: ankarna och regeln ser samma ögonblick.
      const { klockan } = await import(pathToFileURL(join(process.cwd(), "kuvos", "ankare-bakat.ts")).href);
      const u = underlagBakat(readFileSync(a[0], "utf8"), Number(a[1]), JSON.parse(readFileSync(a[2], "utf8")),
        gunzipSync(readFileSync(a[3])).toString("utf8"), klockan(new Date(a[4])));
      if (u === null) { console.log("underlaget: timmen är inte regelns"); process.exit(3); }
      writeFileSync(a[5], u);
      console.log("underlaget: klart");
    } else {
      console.error("hela <mnsv> | historik <lista> <indata> <n> <ut> | korningar <dagar> <ut> | ph <del-a> <tid> <ut> | ankare <fil> <från> <till> <ut> | " +
        "lagen <punkter.json> <ut> | underlag <rader> <antal> <punkter.json> <radar> <tid> <ut> | --sjalvtest");
      process.exit(2);
    }
  } catch (e: any) { console.error(`smavagskedjan ${kmd}: ${String(e?.message ?? e).slice(0, 200)}`); process.exit(1); }
}
