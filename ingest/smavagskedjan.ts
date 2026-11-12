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
//   node --experimental-strip-types ingest/smavagskedjan.ts historik <lista.txt> <indata-prefix> <n> <ut-prefix>
//   node --experimental-strip-types ingest/smavagskedjan.ts hela <mnsv>
//   node --experimental-strip-types ingest/smavagskedjan.ts korningar <dagar> <ut>     (rubriken ur kuvösens metnordic-prognos.ts)
//   node --experimental-strip-types ingest/smavagskedjan.ts --sjalvtest
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

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
    } else { console.error("hela <mnsv> | historik <lista> <indata> <n> <ut> | korningar <dagar> <ut> | --sjalvtest"); process.exit(2); }
  } catch (e: any) { console.error(`smavagskedjan ${kmd}: ${String(e?.message ?? e).slice(0, 200)}`); process.exit(1); }
}
