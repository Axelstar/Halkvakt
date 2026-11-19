// SMÅVÄGSRÖSTEN — timmens rader till databasen (DECISIONS #828, kort #647; sql/105). kuvos-smavag-timme.yml kör den efter del B och
// kuvösens regel D (fysik/ny_kandidat/smavag_drift.py rader). En timme skrivs i en transaktion: timmens gamla rader bort, de nya in och
// körningens rad sist, så att regeln aldrig ser en halv timme (smavag_timme() kräver körningens rad). Rader äldre än sex timmar gallras.
// Laddaren rör aldrig brytarna. Loggen säger bara klart eller fel (DECISIONS #768: inga antal, lägen eller tal).
//   node --experimental-strip-types ingest/smavag-live-db.ts lagen <ut.csv>                  punkternas lägen, som del B:s punktfil
//   node --experimental-strip-types ingest/smavag-live-db.ts skriv <rader.csv> <tid> <antal>  rader.csv: punkt,ned eller punkt,ned,rim,n6
//       rim och n6 är svartisens och rimfrostens flaggor (sql/128, DECISIONS #908, kuvösen F75 §12 punkt 3). En fil utan dem skrivs som
//       förut, med flaggorna NULL, så att kedjan och databasen kan bytas i vilken ordning som helst efter migrationen.
//   node --experimental-strip-types ingest/smavag-live-db.ts underlag <ut.csv> <tid>          taktens underlag (kuvösen F55, F50 §7 punkt 3):
//       regelns varnande punkter i timmen, med N3 och radarns medel i biten, så att takten kan räknas med och utan radarn sedan
//       radar_smavag gallrats. Är timmen inte regelns (smavag_timme()) skrivs ingenting, kod 3. Filen går bara till den privata hinken.
//   node --experimental-strip-types ingest/smavag-live-db.ts fukt <ut.csv> <tid>              fuktflaggornas underlag (sql/128, #908):
//       varje rad i timmen med ned, rim, n6 och om smavag_regel() säger varnar, också där regeln är torr (F75 §12 punkt 3). Är timmen
//       inte regelns skrivs ingenting, kod 3. Filen går bara till den privata hinken.
//   node --experimental-strip-types ingest/smavag-live-db.ts jamfor <tid>                    regeln utanför databasen (smavag-regel.ts,
//       DECISIONS #843, kuvösen F57 §9 punkt 3) mot smavag_regel() för samma timme, i samma ögonblicksbild: lika (kod 0), olika (kod 1)
//       eller timmen är inte regelns (kod 3). Bara utfallet skrivs, inga punkter eller tal.
//   node --experimental-strip-types ingest/smavag-live-db.ts --sjalvtest
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { radarPerBit, varnande, type Punkt } from "./smavag-regel.ts";

export type Rad = { punkt: string; ned: boolean; rim?: boolean; n6?: boolean };

/** Filens rader, prövade: driftens r-id, ned (och rim och n6 med den nya rubriken) 0 eller 1, och inget id två gånger. Kastar vid
 *  första felet. */
export function lasRader(text: string): Rad[] {
  const [rubrik, ...rr] = text.trim().split(/\r?\n/u);
  const flaggor = rubrik === "punkt,ned,rim,n6";
  if (rubrik !== "punkt,ned" && !flaggor) throw new Error("rubriken är inte punkt,ned eller punkt,ned,rim,n6");
  const sedda = new Set<string>();
  const bit = (v: string | undefined, namn: string, i: number) => {
    if (v !== "0" && v !== "1") throw new Error(`rad ${i + 2}: ${namn} är inte 0 eller 1`);
    return v === "1";
  };
  return rr.map((r, i) => {
    const c = r.split(",");
    if (c.length !== (flaggor ? 4 : 2)) throw new Error(`rad ${i + 2}: fel antal kolumner`);
    const [punkt, ned, rim, n6] = c;
    if (!/^r\d{5,}$/u.test(punkt)) throw new Error(`rad ${i + 2}: id:t är inget r-id`);
    const rad: Rad = { punkt, ned: bit(ned, "ned", i) };
    if (flaggor) { rad.rim = bit(rim, "rim", i); rad.n6 = bit(n6, "n6", i); }
    if (sedda.has(punkt)) throw new Error(`rad ${i + 2}: id:t står två gånger`);
    sedda.add(punkt);
    return rad;
  });
}

export const SATS = {
  lagen: `SELECT punkt, lat, lon FROM smavagspunkt ORDER BY punkt`,
  rensa: `DELETE FROM smavag_live WHERE tid = $1::timestamptz`,
  skriv: `INSERT INTO smavag_live (tid, punkt, ned) SELECT $1::timestamptz, u.p, u.n FROM unnest($2::text[], $3::boolean[]) AS u(p, n)`,
  // Med svartisens och rimfrostens flaggor (sql/128, #908). Regeln läser dem inte.
  skrivFlaggor: `INSERT INTO smavag_live (tid, punkt, ned, rim, n6) SELECT $1::timestamptz, u.p, u.n, u.r, u.s
    FROM unnest($2::text[], $3::boolean[], $4::boolean[], $5::boolean[]) AS u(p, n, r, s)`,
  korning: `INSERT INTO smavag_korning (tid, punkter, skriven_at) VALUES ($1::timestamptz, $2::int, now())
    ON CONFLICT (tid) DO UPDATE SET punkter = EXCLUDED.punkter, skriven_at = EXCLUDED.skriven_at`,
  gallra: `DELETE FROM smavag_live WHERE tid < now() - interval '6 hours'`,
  timmen: `SELECT coalesce(smavag_timme() = $1::timestamptz, false) AS ok`,
  underlag: `SELECT r.punkt, r.ned, r.radar_mmh FROM smavag_regel() r WHERE r.utfall = 'varnar' AND r.tid = $1::timestamptz
    ORDER BY r.punkt COLLATE "C"`,
  // Fuktflaggornas underlag (sql/128, #908): varje rad i timmen, också de där regeln är torr, och regelns utfall bredvid. En punkt som
  // regeln inte läser (inte längre i smavagspunkt) har tomt utfall.
  fukt: `SELECT l.punkt, l.ned, l.rim, l.n6, r.utfall = 'varnar' AS varnar FROM smavag_live l
    LEFT JOIN smavag_regel() r ON r.punkt = l.punkt AND r.tid = l.tid
    WHERE l.tid = $1::timestamptz ORDER BY l.punkt COLLATE "C"`,
  // Jämförelsens råvaror, utan regelns gränser: timmens rader med punkternas väg och ordning, all radar som står kvar efter gallringen,
  // och transaktionens now(), som smavag_regel() räknar fönstret från. Brytarna läses inte (laddaren rör dem aldrig): sql/105 kräver
  // en brytare för punktens grupp, så en grupp utan brytare ger "olika", och det är ett fel värt att se.
  jamforRader: `SELECT l.punkt, l.ned, p.vag, p.ordning FROM smavag_live l JOIN smavagspunkt p ON p.punkt = l.punkt
    WHERE l.tid = $1::timestamptz`,
  jamforRadar: `SELECT bit, observed_at, rate_mean_mmh::text AS mmh FROM radar_smavag`,
  nu: `SELECT now() AS nu`,
};

/** Underlagets fil: punkt, ned (1 eller 0) och radarns medel i biten (tomt utan radarrad). */
export function underlagCsv(rr: { punkt: string; ned: boolean; radar_mmh: string | number | null }[]): string {
  return "punkt,ned,radar_mmh\n" + rr.map((r) => `${r.punkt},${r.ned ? 1 : 0},${r.radar_mmh ?? ""}\n`).join("");
}

/** Fuktflaggornas fil: punkt, ned, rim, n6 och varnar som 1 eller 0, och tomt där värdet saknas (NULL). */
export function fuktCsv(rr: { punkt: string; ned: boolean; rim: boolean | null; n6: boolean | null; varnar: boolean | null }[]): string {
  const b = (v: boolean | null) => (v === null ? "" : v ? 1 : 0);
  return "punkt,ned,rim,n6,varnar\n" + rr.map((r) => `${r.punkt},${b(r.ned)},${b(r.rim)},${b(r.n6)},${b(r.varnar)}\n`).join("");
}

type Klient = { query: (s: string, p?: unknown[]) => Promise<unknown> };

/** En timme i en transaktion, och sedan gallringen. Samma timme en gång till ersätter den. */
export async function skrivTimme(c: Klient, tid: string, rader: Rad[], punkter: number): Promise<void> {
  await c.query("BEGIN");
  try {
    await c.query(SATS.rensa, [tid]);
    if (rader.some((r) => r.rim !== undefined))
      await c.query(SATS.skrivFlaggor, [tid, rader.map((r) => r.punkt), rader.map((r) => r.ned), rader.map((r) => r.rim ?? null), rader.map((r) => r.n6 ?? null)]);
    else await c.query(SATS.skriv, [tid, rader.map((r) => r.punkt), rader.map((r) => r.ned)]);
    await c.query(SATS.korning, [tid, punkter]);
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  }
  await c.query(SATS.gallra);
}

/** Timmens underlag, eller null när timmen inte är regelns (för gammal, ofullständig eller en annan). */
export async function underlag(c: Klient, tid: string): Promise<string | null> {
  const ok = ((await c.query(SATS.timmen, [tid])) as any).rows[0].ok;
  return ok ? underlagCsv(((await c.query(SATS.underlag, [tid])) as any).rows) : null;
}

/** Timmens fuktflaggor, eller null när timmen inte är regelns, som underlaget. */
export async function fukt(c: Klient, tid: string): Promise<string | null> {
  const ok = ((await c.query(SATS.timmen, [tid])) as any).rows[0].ok;
  return ok ? fuktCsv(((await c.query(SATS.fukt, [tid])) as any).rows) : null;
}

/** Regeln utanför databasen mot smavag_regel() för timmen, i en ögonblicksbild (REPEATABLE READ: samma now() och samma radar i båda).
 *  true när underlagen är lika, false när de skiljer, null när timmen inte är regelns. */
export async function jamfor(c: Klient, tid: string): Promise<boolean | null> {
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
  try {
    const rows = async (s: string, p?: unknown[]) => ((await c.query(s, p)) as any).rows as any[];
    if (!(await rows(SATS.timmen, [tid]))[0].ok) return null;
    const db = underlagCsv(await rows(SATS.underlag, [tid]));
    const nu = new Date((await rows(SATS.nu))[0].nu);
    const rader = await rows(SATS.jamforRader, [tid]);
    const punkter = new Map<string, Punkt>(rader.map((r) => [r.punkt, { vag: r.vag, ordning: Number(r.ordning) }]));
    const radar = radarPerBit((await rows(SATS.jamforRadar)).map((r) => ({ bit: r.bit, observed_at: new Date(r.observed_at), rate_mean_mmh: Number(r.mmh) })), nu);
    const egen = underlagCsv(varnande(rader.map((r) => ({ punkt: r.punkt, ned: r.ned })), punkter, radar));
    // Radarns medel jämförs som tal: databasen skriver numeric med sin egen decimalform, kopian med JavaScripts.
    const tal = (t: string) => t.split("\n").map((r) => r.split(",")).map(([p, n, m]) => [p, n, m === "" || m === undefined ? m : String(Number(m))].join(","));
    return JSON.stringify(tal(db)) === JSON.stringify(tal(egen));
  } finally {
    await c.query("COMMIT").catch(() => {});
  }
}

async function klient<T>(f: (c: any) => Promise<T>): Promise<T> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL saknas");
  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
  const c = await pool.connect();
  try { return await f(c); } finally { c.release(); await pool.end(); }
}

function sjalvtest(): number {
  const fel: string[] = [];
  const vagra = (t: string, namn: string) => { try { lasRader(t); fel.push(`släppte igenom: ${namn}`); } catch { /* väntat */ } };
  const r = lasRader("punkt,ned\nr00001,1\nr00002,0\n");
  if (r.length !== 2 || r[0].ned !== true || r[1].ned !== false || r[1].punkt !== "r00002") fel.push("två riktiga rader");
  if (lasRader("punkt,ned\n").length !== 0) fel.push("en timme utan rader är tillåten");
  vagra("sid,ned\nr00001,1\n", "fel rubrik");
  vagra("punkt,ned\nv00001,1\n", "ett v-id");
  vagra("punkt,ned\nB00001,1\n", "ett B-id");
  vagra("punkt,ned\nr00001,2\n", "ned 2");
  vagra("punkt,ned\nr00001,1\nr00001,0\n", "dubblett");
  // Svartisens och rimfrostens flaggor (sql/128, #908): den nya rubriken bär dem, den gamla lämnar dem odefinierade.
  const f = lasRader("punkt,ned,rim,n6\nr00001,0,1,0\nr00002,1,0,1\n");
  if (f.length !== 2 || f[0].ned !== false || f[0].rim !== true || f[0].n6 !== false || f[1].ned !== true || f[1].rim !== false || f[1].n6 !== true)
    fel.push("två rader med flaggorna");
  if (r[0].rim !== undefined || r[0].n6 !== undefined) fel.push("den gamla rubriken bär inga flaggor");
  vagra("punkt,ned,rim\nr00001,1,0\n", "en flagga utan den andra");
  vagra("punkt,ned,rim,n6\nr00001,1,2,0\n", "rim 2");
  vagra("punkt,ned,rim,n6\nr00001,1,0,\n", "n6 tom");
  vagra("punkt,ned,rim,n6\nr00001,1\n", "en rad utan flaggorna under den nya rubriken");
  vagra("punkt,ned\nr00001,1,0,1\n", "flaggor under den gamla rubriken");
  if (!/INSERT INTO smavag_live \(tid, punkt, ned, rim, n6\)/.test(SATS.skrivFlaggor) || !/INSERT INTO smavag_live \(tid, punkt, ned\) /.test(SATS.skriv))
    fel.push("satserna med och utan flaggorna");
  if (fuktCsv([{ punkt: "r00001", ned: false, rim: true, n6: false, varnar: false }, { punkt: "r00002", ned: true, rim: null, n6: null, varnar: true },
    { punkt: "r00003", ned: false, rim: false, n6: true, varnar: null }]) !== "punkt,ned,rim,n6,varnar\nr00001,0,1,0,0\nr00002,1,,,1\nr00003,0,0,1,\n")
    fel.push("fuktflaggornas rader");
  if (fuktCsv([]) !== "punkt,ned,rim,n6,varnar\n") fel.push("fuktflaggornas fil utan rader är bara rubriken");
  if (!/FROM smavag_live l\s+LEFT JOIN smavag_regel\(\)/.test(SATS.fukt) || /0[.,]1\b|interval|>=/.test(SATS.fukt)) fel.push("fuktflaggorna tar varje rad och regelns utfall, utan egen gräns");
  if (!/smavag_live/.test(SATS.skriv) || !/smavag_korning/.test(SATS.korning) || /brytare|vagpunkt\b|ny_kandidat/.test(Object.values(SATS).join(" ").replace(/smavagspunkt/g, "")))
    fel.push("satserna rör annat än småvägstabellerna");
  if (underlagCsv([{ punkt: "r00001", ned: true, radar_mmh: null }, { punkt: "r00002", ned: false, radar_mmh: "0.25" }]) !==
      "punkt,ned,radar_mmh\nr00001,1,\nr00002,0,0.25\n") fel.push("underlagets rader");
  if (underlagCsv([]) !== "punkt,ned,radar_mmh\n") fel.push("ett underlag utan varnande punkter är bara rubriken");
  if (!/utfall = 'varnar'/.test(SATS.underlag) || /0[.,]1\b/.test(SATS.underlag)) fel.push("underlaget tar regelns utfall, utan egen radargräns");
  if (/interval|0[.,]1\b|>=/.test(SATS.jamforRader + SATS.jamforRadar)) fel.push("jämförelsens råvaror bär ingen egen gräns eller eget fönster");
  console.log(`självtest smavag-live-db: ${fel.length ? "FEL" : "klart"}`);
  for (const f of fel) console.log(`  ${f}`);
  return fel.length ? 1 : 0;
}

// Bara när filen körs, inte när integrationsprovet importerar satserna.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [kmd, a, b, n] = process.argv.slice(2);
  const fel = (e: any) => { console.error(`smavag-live-db: ${String(e?.message ?? e).slice(0, 200)}`); process.exit(1); };
  if (kmd === "--sjalvtest") process.exit(sjalvtest());
  else if (kmd === "lagen" && a) {
    klient(async (c) => {
      const r = await c.query(SATS.lagen);
      writeFileSync(a, "sid,lat,lon\n" + r.rows.map((x: any) => `${x.punkt},${x.lat},${x.lon}`).join("\n") + (r.rows.length ? "\n" : ""));
      console.log("småvägspunkternas lägen: klart");
    }).catch(fel);
  } else if (kmd === "skriv" && a && /^\d{4}-\d\d-\d\dT\d\d:00:00Z$/u.test(b ?? "") && /^\d+$/u.test(n ?? "")) {
    klient(async (c) => { await skrivTimme(c, b, lasRader(readFileSync(a, "utf8")), Number(n)); console.log("småvägsraderna: klart"); }).catch(fel);
  } else if (kmd === "underlag" && a && /^\d{4}-\d\d-\d\dT\d\d:00:00Z$/u.test(b ?? "")) {
    klient(async (c) => {
      const u = await underlag(c, b);
      if (u === null) { console.log("underlaget: timmen är inte regelns"); process.exit(3); }
      writeFileSync(a, u);
      console.log("underlaget: klart");
    }).catch(fel);
  } else if (kmd === "fukt" && a && /^\d{4}-\d\d-\d\dT\d\d:00:00Z$/u.test(b ?? "")) {
    klient(async (c) => {
      const u = await fukt(c, b);
      if (u === null) { console.log("fuktflaggorna: timmen är inte regelns"); process.exit(3); }
      writeFileSync(a, u);
      console.log("fuktflaggorna: klart");
    }).catch(fel);
  } else if (kmd === "jamfor" && /^\d{4}-\d\d-\d\dT\d\d:00:00Z$/u.test(a ?? "")) {
    klient(async (c) => {
      const lika = await jamfor(c, a);
      if (lika === null) { console.log("jämförelsen: timmen är inte regelns"); process.exit(3); }
      console.log(`jämförelsen med databasens regel: ${lika ? "lika" : "OLIKA"}`);
      process.exit(lika ? 0 : 1);
    }).catch(fel);
  } else { console.error("lagen <ut.csv> | skriv <rader.csv> <tid> <antal> | underlag <ut.csv> <tid> | fukt <ut.csv> <tid> | jamfor <tid> | --sjalvtest"); process.exit(2); }
}
