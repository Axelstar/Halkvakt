// SMÅVÄGSRÖSTENS KEDJA, PROVET PÅ EN FJÄRDEDEL (DECISIONS #828, kort #647; byggplanen steg 4). Rörarbetet runt kuvösens del A och
// del B, som körs oförändrade (fysik/ny_kandidat/levande.py) i kuvos-smavag.yml:
//   fjardedel  var fjärde väg i kuvösens punktfil (vägens nummer modulo 4 = 0), hela vägar i punktfilens ordning, och platsdragen för
//              samma punkter omnumrerade i samma ordning (sid 00000 …), så att smavagar_pilot.py läser dem som en pilotfil.
//   historik   analysdygnen delade per del: <ut><i>/dagar/<dygn>.csv.gz med bara delens punkter (stations.csv i <indata><i>), så att
//              varje del A bara läser sina punkters historik. Piloten lämnade öppet om del A:s minne växer med historiken, eftersom
//              varje historikfil läses hel och filtreras (halkvakt-kuvos F22); provet kör del 1 också med hela historiken bredvid.
// Punkterna, särdragen och historiken stannar i jobbet. Loggen säger bara klart eller fel och antal (inga lägen eller värden).
//   node --experimental-strip-types ingest/smavagskedjan.ts fjardedel <punkter.json> <sardrag.csv> <ut.json> <ut-sardrag.csv>
//   node --experimental-strip-types ingest/smavagskedjan.ts historik <lista.txt> <indata-prefix> <n> <ut-prefix>
//   node --experimental-strip-types ingest/smavagskedjan.ts --sjalvtest
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

/** En fjärdedel av vägarna: vägens nummer (v00012 → 12) modulo 4 = 0. */
export const FJARDEDEL = (vag: string) => Number(vag.slice(1)) % 4 === 0;

type Rad = { id: string; vag: string; lon: number; lat: number; [k: string]: unknown };

/** Var fjärde väg ur punktfilen och platsdragen för samma punkter, omnumrerade. Platsdragens rader ska bära punktfilens id i samma
 *  ordning (som vagpunkter-sardrag skriver dem). → antal punkter och vägar. */
export function fjardedel(punkterFil: string, sardragFil: string, utJson: string, utSardrag: string): { punkter: number; vagar: number } {
  const p = JSON.parse(readFileSync(punkterFil, "utf8")) as { huvud?: Record<string, unknown>; rader: Rad[] };
  const [rubrik, ...sd] = readFileSync(sardragFil, "utf8").trim().split(/\r?\n/u);
  const kol = rubrik.split(",");
  if (kol[0] !== "sid" || kol[1] !== "id") throw new Error(`${sardragFil}: rubriken börjar inte med sid,id`);
  if (sd.length !== p.rader.length) throw new Error(`platsdragen har ${sd.length} rader, punktfilen ${p.rader.length}`);
  const valda: Rad[] = [], rader: string[] = [];
  p.rader.forEach((r, i) => {
    const f = sd[i].split(",");
    if (f[1] !== String(r.id)) throw new Error(`rad ${i + 1}: platsdragen bär ${f[1]}, punktfilen ${r.id}`);
    if (!FJARDEDEL(String(r.vag))) return;
    rader.push([String(valda.length).padStart(5, "0"), ...f.slice(1)].join(","));
    valda.push(r);
  });
  if (!valda.length) throw new Error("fjärdedelen blev tom");
  const huvud = { ...(p.huvud ?? {}), urval: "var fjärde väg (vägens nummer modulo 4 = 0), hela vägar i punktfilens ordning (ingest/smavagskedjan.ts)" };
  writeFileSync(utJson, JSON.stringify({ huvud, rader: valda }));
  writeFileSync(utSardrag, [rubrik, ...rader].join("\n") + "\n");
  return { punkter: valda.length, vagar: new Set(valda.map((r) => r.vag)).size };
}

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

function sjalvtest(): number {
  const fel: string[] = [], k = (ok: boolean, namn: string) => { if (!ok) fel.push(namn); };
  const rot = mkdtempSync(join(tmpdir(), "smavagskedjan-"));
  const vagra = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
  try {
    // fjardedel: vägarna 4 och 8 tas med (hela), 3 och 5 inte; platsdragen omnumreras i samma ordning.
    const rader = [["r00001", "v00004"], ["r00002", "v00004"], ["r00003", "v00003"], ["r00004", "v00008"], ["r00005", "v00005"]]
      .map(([id, vag], i) => ({ id, vag, ordning: i, lon: 15, lat: 60 + i / 100 }));
    const pf = join(rot, "p.json"), sf = join(rot, "s.csv");
    writeFileSync(pf, JSON.stringify({ huvud: { kalla: "prov" }, rader }));
    writeFileSync(sf, "sid,id,lon,lat,elev\n" + rader.map((r, i) => `${String(i).padStart(5, "0")},${r.id},${r.lon},${r.lat},${i * 10}`).join("\n") + "\n");
    const n = fjardedel(pf, sf, join(rot, "u.json"), join(rot, "u.csv"));
    const u = JSON.parse(readFileSync(join(rot, "u.json"), "utf8"));
    k(n.punkter === 3 && n.vagar === 2 && u.rader.map((r: Rad) => r.id).join() === "r00001,r00002,r00004", `fjärdedelen: ${JSON.stringify(n)}`);
    k(readFileSync(join(rot, "u.csv"), "utf8") === "sid,id,lon,lat,elev\n00000,r00001,15,60,0\n00001,r00002,15,60.01,10\n00002,r00004,15,60.03,30\n",
      "platsdragen omnumrerade i samma ordning, med sina värden");
    k(String(u.huvud.kalla) === "prov" && String(u.huvud.urval).includes("modulo 4"), "huvudet står kvar med urvalet");
    writeFileSync(sf, "sid,id,lon,lat,elev\n" + rader.map((r, i) => `${String(i).padStart(5, "0")},${i === 2 ? "r09999" : r.id},15,60,0`).join("\n") + "\n");
    k(vagra(() => fjardedel(pf, sf, join(rot, "x.json"), join(rot, "x.csv"))), "platsdrag med ett annat id vägras");
    writeFileSync(sf, "sid,id,elev\n00000,r00001,0\n");
    k(vagra(() => fjardedel(pf, sf, join(rot, "x.json"), join(rot, "x.csv"))), "platsdrag med fel antal rader vägras");
    writeFileSync(pf, JSON.stringify({ rader: rader.filter((r) => r.vag === "v00003") }));
    writeFileSync(sf, "sid,id\n00000,r00003\n");
    k(vagra(() => fjardedel(pf, sf, join(rot, "x.json"), join(rot, "x.csv"))), "en tom fjärdedel vägras");

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
  } finally { rmSync(rot, { recursive: true, force: true }); }
  console.log(`självtest smavagskedjan: ${fel.length ? "FEL" : "klart"}`);
  for (const f of fel) console.log(`  ${f}`);
  return fel.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [kmd, ...a] = process.argv.slice(2);
  try {
    if (kmd === "--sjalvtest") process.exit(sjalvtest());
    else if (kmd === "fjardedel" && a.length === 4) {
      const n = fjardedel(a[0], a[1], a[2], a[3]);
      console.log(`småvägsröstens fjärdedel: klart, ${n.punkter} punkter på ${n.vagar} vägar`);
    } else if (kmd === "historik" && a.length === 4) {
      const lista = readFileSync(a[0], "utf8").split("\n").filter(Boolean);
      const n = delaHistorik(lista, a[1], Number(a[2]), a[3]);
      console.log(`historiken per del: klart, ${lista.length} dygn, ${n.length} delar`);
    } else { console.error("fjardedel <punkter.json> <sardrag.csv> <ut.json> <ut-sardrag.csv> | historik <lista> <indata> <n> <ut> | --sjalvtest"); process.exit(2); }
  } catch (e: any) { console.error(`smavagskedjan ${kmd}: ${String(e?.message ?? e).slice(0, 200)}`); process.exit(1); }
}
