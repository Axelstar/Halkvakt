// SMÅVÄGSRÖSTENS KEDJA (DECISIONS #828, kort #647). Rörarbetet runt kuvösens del A, som körs oförändrad (fysik/ny_kandidat/levande.py)
// i kuvos-smavag.yml:
//   historik   analysdygnen delade per del: <ut><i>/dagar/<dygn>.csv.gz med bara delens punkter (stations.csv i <indata><i>), så att
//              varje del A bara läser sina punkters historik. Provet på en fjärdedel 11/11 visade samma PH och samma minne med delens egen
//              historik som med hela, och kortare tid (#828).
// Punkterna, särdragen och historiken stannar i jobbet. Loggen säger bara klart eller fel.
//   node --experimental-strip-types ingest/smavagskedjan.ts historik <lista.txt> <indata-prefix> <n> <ut-prefix>
//   node --experimental-strip-types ingest/smavagskedjan.ts --sjalvtest
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
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
    } else { console.error("historik <lista> <indata> <n> <ut> | --sjalvtest"); process.exit(2); }
  } catch (e: any) { console.error(`smavagskedjan ${kmd}: ${String(e?.message ?? e).slice(0, 200)}`); process.exit(1); }
}
