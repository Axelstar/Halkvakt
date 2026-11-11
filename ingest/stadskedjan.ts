// STORSTÄDERNAS PUNKTER I KANDIDATENS KEDJA (DECISIONS #804, kort #378). Rörarbetet runt kuvösens del A och del B, som körs
// oförändrade (fysik/ny_kandidat/levande.py) efter dagens punkter, i egna steg i ny-kandidat-fysik.yml och ny-kandidat-timme.yml:
//   dygn    vilka analysdygn del A läser för stadspunkterna: för varje dygn den fil som har flest timrader bland källorna, i
//           ordningen kuvos-stads cache (MET:s arkiv) och sedan kedjans egna levande dygn.
//   indata  stadspunkternas rader i indatan delas i n delar (del A tar en del om högst cirka 8 000 punkter i minnet); de andra
//           filerna länkas.
//   ph      del A räknar med pilotens id (s00000 …, radnumret i kuvösens punktfil); här blir de driftens fasta id (B00001 …, C00001 …)
//           och skrivs till ny_kandidat_ph. Punktfilen måste vara samma version som driftens lista (kontrollsumman i listan).
//   lagen   stadspunkternas lägen ur stadspunkt (sql/089), som del B:s punktfil.
// Punkterna, särdragen och PH stannar i jobbet. Loggen säger bara klart eller fel (DECISIONS #768: inga antal, lägen eller tal).
//   node --experimental-strip-types ingest/stadskedjan.ts dygn <lista.txt> <från> <till> <källa> [<källa> …]
//   node --experimental-strip-types ingest/stadskedjan.ts indata <indata> <n> <prefix>
//   node --experimental-strip-types ingest/stadskedjan.ts ph <ny_kandidat_ph_R.csv.gz> [… fler delar]
//   node --experimental-strip-types ingest/stadskedjan.ts lagen <punkter.csv>
//   node --experimental-strip-types ingest/stadskedjan.ts --sjalvtest
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, linkSync, mkdtempSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { lasCsv, delar } from "./kandidat-db.ts";
import { SATS as NY, lasFlagga, FLAGGA } from "./ny-kandidat-db.ts";

export const PILOT = fileURLToPath(new URL("../data/vagdata/stadspunkter-2026-27.json", import.meta.url));
export const LISTA = fileURLToPath(new URL("../kuvos/stadspunkter-drift-2026-27.json", import.meta.url));
const DAGFIL = /^\d{4}-\d{2}-\d{2}\.csv\.gz$/u;
const PILOT_ID = /^s(\d{5})$/u;

export const SATS = {
  lagen: `SELECT punkt, lat, lon FROM stadspunkt ORDER BY punkt`,
};

const timrader = (fil: string) => gunzipSync(readFileSync(fil)).toString("utf8").split("\n").filter(Boolean).length;

/** Analysdygnen i [fran, till]: per dygn filen med flest rader bland <källa>/dagar/<dygn>.csv.gz; vid lika vinner den först nämnda
 *  källan. Luckor = dygn utan fil i någon källa. */
export function valjDygn(kallor: string[], fran: string, till: string): { filer: string[]; luckor: string[] } {
  const bast = new Map<string, { fil: string; n: number }>();
  for (const k of kallor) {
    const d = join(k, "dagar");
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d).sort()) {
      if (!DAGFIL.test(f)) continue;
      const dag = f.slice(0, 10);
      if (dag < fran || dag > till) continue;
      const fil = join(d, f), n = timrader(fil), b = bast.get(dag);
      if (!b || n > b.n) bast.set(dag, { fil, n });
    }
  }
  const luckor: string[] = [];
  for (let t = Date.parse(`${fran}T00:00:00Z`); t <= Date.parse(`${till}T00:00:00Z`); t += 86_400_000) {
    const dag = new Date(t).toISOString().slice(0, 10);
    if (!bast.has(dag)) luckor.push(dag);
  }
  return { filer: [...bast.keys()].sort().map((d) => bast.get(d)!.fil), luckor };
}

/** Indatans stadspunkter (sid s…, lagda av smavagar_pilot.py indata) i n delar: <prefix>1 … <prefix>n, var och en med stations.csv för
 *  sin del och hårda länkar till de andra filerna (samma disk; inga kopior). Dagens punkter står inte med: de är räknade i steget före. → punkter per del. */
export function delaIndata(src: string, n: number, prefix: string): number[] {
  const [rubrik, ...rader] = readFileSync(join(src, "stations.csv"), "utf8").trim().split(/\r?\n/u);
  if (!rubrik.startsWith("sid,")) throw new Error(`${src}/stations.csv: rubriken börjar inte med sid`);
  const stad = rader.filter((r) => PILOT_ID.test(r.split(",")[0]));
  if (!stad.length) throw new Error(`${src}/stations.csv: inga stadspunkter (kördes smavagar_pilot.py indata?)`);
  const stor = Math.ceil(stad.length / n), ut: number[] = [];
  for (let i = 0; i < n; i++) {
    const d = `${prefix}${i + 1}`, del = stad.slice(i * stor, (i + 1) * stor);
    mkdirSync(d, { recursive: true });
    for (const f of readdirSync(src)) if (f !== "stations.csv") linkSync(resolve(src, f), join(d, f));
    writeFileSync(join(d, "stations.csv"), [rubrik, ...del].join("\n") + "\n");
    ut.push(del.length);
  }
  return ut;
}

/** Del A:s rader med pilotens id → driftens id. Punktfilen och listan ska vara samma version, och varje id ska finnas i listan. */
export function tillDrift<T extends { punkt: unknown }>(rader: T[], pilot: Buffer, lista: { kalla?: { sha256?: string }; rader?: { punkt: string }[] }): T[] {
  if (createHash("sha256").update(pilot).digest("hex") !== lista.kalla?.sha256) throw new Error("punktfilen och driftens lista är inte samma version");
  const id = (JSON.parse(pilot.toString("utf8")).rader as { id: string }[]).map((x) => String(x.id));
  const drift = new Set((lista.rader ?? []).map((x) => x.punkt));
  return rader.map((r, i) => {
    const m = PILOT_ID.exec(String(r.punkt));
    const p = m ? id[Number(m[1])] : undefined;
    if (!p || !drift.has(p)) throw new Error(`rad ${i + 1}: id:t går inte att översätta till driftens`);
    return { ...r, punkt: p };
  });
}

async function pool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL saknas");
  const pg = (await import("pg")).default;
  return new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
}

/** PH-filerna till ny_kandidat_ph med driftens id. Med flaggan av (kuvos/ny-kandidat-skugga.json, som den nya kedjan) skrivs inget. */
export async function skrivPh(filer: string[], pilotFil = PILOT, listaFil = LISTA, flaggfil = FLAGGA) {
  const f = lasFlagga(flaggfil);
  if (!f.pa) { console.log("stadspunkternas PH: flaggan är av — ingenting skrivs"); return; }
  const rader = tillDrift(filer.flatMap((x) => lasCsv(x, ["punkt", "korning_utc", "tid_utc", "ts_fysik", "ph"])), readFileSync(pilotFil),
    JSON.parse(readFileSync(listaFil, "utf8")));
  const p = await pool();
  try {
    for (const d of delar(rader))
      await p.query(NY.skrivPh, [d.map((r) => r.korning_utc), d.map((r) => r.tid_utc), d.map((r) => r.punkt), d.map((r) => r.ts_fysik), d.map((r) => r.ph)]);
  } finally { await p.end(); }
  console.log("stadspunkternas PH: klart");
}

/** Stadspunkternas lägen som del B:s punktfil (sid, lat, lon). En tom tabell är ett fel: då hade del B inget att räkna. */
export async function lagen(ut: string) {
  const p = await pool();
  try {
    const r = await p.query(SATS.lagen);
    writeFileSync(ut, "sid,lat,lon\n" + r.rows.map((x: any) => `${x.punkt},${x.lat},${x.lon}`).join("\n") + (r.rows.length ? "\n" : ""));
    if (!r.rows.length) throw new Error("stadspunkt är tom");
  } finally { await p.end(); }
  console.log("stadspunkternas lägen: klart");
}

function sjalvtest(): number {
  const fel: string[] = [], k = (ok: boolean, namn: string) => { if (!ok) fel.push(namn); };
  const rot = mkdtempSync(join(tmpdir(), "stadskedjan-"));
  try {
    // dygn: arkivet först; den egna källan vinner bara med fler timmar; ett dygn utanför fönstret räknas inte; en lucka syns.
    const dag = (k: string, d: string, n: number) => {
      mkdirSync(join(rot, k, "dagar"), { recursive: true });
      writeFileSync(join(rot, k, "dagar", `${d}.csv.gz`), gzipSync(Array.from({ length: n }, (_, i) => `s00000,t${i},1`).join("\n") + "\n"));
    };
    dag("arkiv", "2026-11-01", 24); dag("arkiv", "2026-11-02", 24); dag("arkiv", "2026-10-01", 24);
    dag("egen", "2026-11-02", 24); dag("egen", "2026-11-03", 20); dag("egen", "2026-11-01", 23);
    const v = valjDygn([join(rot, "arkiv"), join(rot, "egen"), join(rot, "saknas")], "2026-11-01", "2026-11-05");
    k(v.filer.length === 3 && v.filer[0].includes(join("arkiv", "dagar", "2026-11-01")) && v.filer[1].includes(join("arkiv", "dagar", "2026-11-02"))
      && v.filer[2].includes(join("egen", "dagar", "2026-11-03")), `dygnen: ${v.filer.map((x) => x.slice(rot.length)).join(" ")}`);
    k(JSON.stringify(v.luckor) === JSON.stringify(["2026-11-04", "2026-11-05"]), `luckorna: ${v.luckor}`);
    dag("egen", "2026-11-01", 24 + 1);
    k(valjDygn([join(rot, "arkiv"), join(rot, "egen")], "2026-11-01", "2026-11-01").filer[0].includes("egen"), "den egna vinner med fler timmar");

    // indata: bara stadspunkterna, i delar, med länkar till de andra filerna.
    const src = join(rot, "indata");
    mkdirSync(src);
    writeFileSync(join(src, "stations.csv"), "sid,lon,lat\nv00001,18,59\nSE123,18,59\ns00000,18,59\ns00001,18,59\ns00002,18,59\n");
    writeFileSync(join(src, "elev.csv"), "sid,elev\n");
    const n = delaIndata(src, 2, join(rot, "del"));
    k(JSON.stringify(n) === "[2,1]", `delarna: ${n}`);
    k(readFileSync(join(rot, "del2", "stations.csv"), "utf8") === "sid,lon,lat\ns00002,18,59\n", "del 2 bär bara sin stadspunkt");
    k(existsSync(join(rot, "del1", "elev.csv")) && !readFileSync(join(rot, "del1", "stations.csv"), "utf8").includes("v00001"), "länken och inga vägpunkter");
    writeFileSync(join(src, "stations.csv"), "sid,lon,lat\nv00001,18,59\n");
    let kastade = false;
    try { delaIndata(src, 2, join(rot, "tom")); } catch { kastade = true; }
    k(kastade, "indata utan stadspunkter vägras");

    // ph: pilotens id → driftens; fel version, okänt id och id utanför listan vägras.
    const pilot = Buffer.from(JSON.stringify({ rader: [{ id: "B00007" }, { id: "C00003" }] }));
    const lista = { kalla: { sha256: createHash("sha256").update(pilot).digest("hex") }, rader: [{ punkt: "B00007" }, { punkt: "C00003" }] };
    const r = tillDrift([{ punkt: "s00000", ph: 1 }, { punkt: "s00001", ph: 2 }], pilot, lista);
    k(r[0].punkt === "B00007" && r[1].punkt === "C00003" && r[1].ph === 2, `översättningen: ${JSON.stringify(r)}`);
    for (const [namn, rad, l] of [["fel version", { punkt: "s00000" }, { ...lista, kalla: { sha256: "0" } }],
      ["id utanför punktfilen", { punkt: "s00002" }, lista], ["ett v-id", { punkt: "v00001" }, lista],
      ["id som inte står i listan", { punkt: "s00001" }, { ...lista, rader: [{ punkt: "B00007" }] }]] as const) {
      let ok = false;
      try { tillDrift([rad], pilot, l); } catch { ok = true; }
      k(ok, `vägrade inte: ${namn}`);
    }
    k(NY.skrivPh.includes("INSERT INTO ny_kandidat_ph") && SATS.lagen.includes("FROM stadspunkt") && !/vagpunkt|stadsbrytare/.test(SATS.lagen),
      "satserna: PH till ny_kandidat_ph, lägena bara ur stadspunkt");
  } finally { rmSync(rot, { recursive: true, force: true }); }
  console.log(`självtest stadskedjan: ${fel.length ? "FEL" : "klart"}`);
  for (const f of fel) console.log(`  ${f}`);
  return fel.length ? 1 : 0;
}

// Bara när filen körs, inte när integrationsprovet importerar den.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [kmd, ...a] = process.argv.slice(2);
  const fel = (e: any) => { console.error(`stadskedjan ${kmd}: ${String(e?.message ?? e).slice(0, 200)}`); process.exit(1); };
  try {
    if (kmd === "--sjalvtest") process.exit(sjalvtest());
    else if (kmd === "dygn" && a.length >= 4) {
      const v = valjDygn(a.slice(3), a[1], a[2]);
      writeFileSync(a[0], v.filer.join("\n") + "\n");
      console.log(`stadspunkternas dygn: ${v.luckor.length ? `klart, ${v.luckor.length} dygn saknas` : "klart"}`);
    } else if (kmd === "indata" && a.length === 3) { delaIndata(a[0], Number(a[1]), a[2]); console.log("stadspunkternas indata: klart"); }
    else if (kmd === "ph" && a.length) await skrivPh(a).catch(fel);
    else if (kmd === "lagen" && a.length === 1) await lagen(a[0]).catch(fel);
    else { console.error("dygn <lista> <från> <till> <källa…> | indata <indata> <n> <prefix> | ph <fil…> | lagen <ut> | --sjalvtest"); process.exit(2); }
  } catch (e) { fel(e); }
}
