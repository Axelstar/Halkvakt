// VÄGNUMREN VID SMÅVÄGSRÖSTENS OCH STORSTÄDERNAS PUNKTER (DECISIONS #962, kort #678; sql/144). Bengt 24/11: "då vill jag att du
// hämtar vägnummer på alla huvudvägar och småvägar". Väglagssträckorna bär redan vägnumret (road_conditions.road_number); här hämtas det
// för småvägsröstens vägar (smavagspunkt.vag) och storstädernas punkter (stadspunkt.punkt), som inte har något.
// Varje plats frågas i Trafikverkets öppna API, NVDB Vägnummer (Vägdata.NVDB_DK_O 1.2, CC0), inom RADIE_M från punkten, som
// scripts/vagdata-vagnummer.ts (DECISIONS #553). En småvägsväg frågas vid upp till tre av sina punkter, spridda längs vägen, och får det
// nummer som mer än hälften av svaren bär; en storstadspunkt frågas vid sig själv. Svaren skrivs till vagnummer_punkt i omgångar, och
// en körning som stannar fortsätter nästa gång där den slutade (FARSK_DYGN).
// Punkterna är kuvösens (DECISIONS #768): loggen säger bara klart eller fel, inga antal och inga lägen. Rotelementet räknas, aldrig
// statuskoden. Nyckeln delas med driftens ingest: ~2 förfrågningar/s.
// Sist skrivs småvägarnas punktfil om med numren (DECISIONS #965), och publiceringen laddar upp den när den ändrats: rösten säger numret.
//   DATABASE_URL=... TRAFIKVERKET_API_KEY=... node --experimental-strip-types ingest/vagnummer-punkter.ts
//   node --experimental-strip-types ingest/vagnummer-punkter.ts --sjalvtest
import { pathToFileURL } from "node:url";
import { skrivPunktfil } from "./smavagspunkter-db.ts";

const API = "https://api.trafikinfo.trafikverket.se/v2/data.json";
const UA = "Halkvakt-vagnummer-punkter/0.1 (+https://github.com/Axelstar/Halkvakt)";
const GEO = "Geometry.WKT-WGS84-3D";
export const RADIE_M = 25;      // punkterna ligger på vägen; 25 m tar vägen men sällan korsande vägar
export const PER_VAG = 3;       // punkter per småvägsväg
const PAUS_MS = 350;
export const OMGANG = 200;     // nycklar per skrivning
export const FARSK_DYGN = 30;  // ett svar yngre än så frågas inte igen
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** Ett svar vid en punkt: v = huvudnummer, 0 = inget Vägnummer (onumrerad), null = flera olika nummer; e = Europaväg. */
export type Punktsvar = { v: number | null; e: boolean | null } | "fel";

/** API:ets Europaväg är ett tal: −1 = Ja, 0 = Nej (DECISIONS #553, körning 38473909973); Ja/Nej läses också. Annat → null. */
export function europa(x: unknown): boolean | null {
  if (x === -1 || x === true || (typeof x === "string" && /^ja$/i.test(x.trim()))) return true;
  if (x === 0 || x === false || (typeof x === "string" && /^nej$/i.test(x.trim()))) return false;
  return null;
}

/** Svaret vid en punkt ur API:ets objekt: bara levande objekt, och bara ett heltal 1–9999 som huvudnummer. */
export function vidPunkt(objekt: any[], falt: string | null, nu = Date.now()): Punktsvar {
  const levande = objekt.filter((o) => o?.Deleted !== true && (!o?.Valid_To || Date.parse(o.Valid_To) > nu));
  const nr = new Map<number, any>();
  for (const o of levande) {
    const h = Number(o?.Huvudnummer);
    if (!Number.isInteger(h) || h < 1 || h > 9999) return { v: null, e: null };
    if (!nr.has(h)) nr.set(h, o);
  }
  if (nr.size === 0) return { v: 0, e: null };
  if (nr.size > 1) return { v: null, e: null };
  const [[h, o]] = [...nr];
  return { v: h, e: falt ? europa(o[falt]) : null };
}

/** En nyckels utfall ur punkternas svar: det värde som mer än hälften av svaren bär, annars oenig; inga svar ger fel. */
export function samman(svar: Punktsvar[]) {
  const s = svar.filter((x): x is Exclude<Punktsvar, "fel"> => x !== "fel");
  const bas = { fragade: svar.length, svar: s.length };
  if (!s.length) return { ...bas, utfall: "fel" as const, huvudnummer: null, europavag: null, lika: 0 };
  const tal = new Map<string, number>();
  for (const x of s) tal.set(String(x.v), (tal.get(String(x.v)) ?? 0) + 1);
  const [topp, n] = [...tal].sort((a, b) => b[1] - a[1])[0];
  if (topp === "null" || 2 * n <= s.length) return { ...bas, utfall: "oenig" as const, huvudnummer: null, europavag: null, lika: n };
  if (topp === "0") return { ...bas, utfall: "onumrerad" as const, huvudnummer: null, europavag: null, lika: n };
  const h = Number(topp);
  const e = s.filter((x) => x.v === h).map((x) => x.e).find((x) => x !== null) ?? null;
  return { ...bas, utfall: "nummer" as const, huvudnummer: h, europavag: e, lika: n };
}

/** Upp till k punkter spridda längs vägen (första, mitten, sista i ordningen). */
export function spridda<T extends { ordning: number }>(p: T[], k = PER_VAG): T[] {
  const s = [...p].sort((a, b) => a.ordning - b.ordning);
  if (s.length <= k) return s;
  const idx = new Set<number>();
  for (let i = 0; i < k; i++) idx.add(Math.round((i * (s.length - 1)) / (k - 1)));
  return [...idx].sort((a, b) => a - b).map((i) => s[i]);
}

function sjalvtest() {
  const fel: string[] = [];
  const eq = (a: unknown, b: unknown, t: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) fel.push(`${t}: ${JSON.stringify(a)}`); };
  eq(vidPunkt([], "Europaväg"), { v: 0, e: null }, "inget objekt är onumrerad");
  eq(vidPunkt([{ Huvudnummer: 4, Europaväg: -1 }, { Huvudnummer: 4, Europaväg: -1 }], "Europaväg"), { v: 4, e: true }, "samma nummer två gånger");
  eq(vidPunkt([{ Huvudnummer: 222, Europaväg: 0 }, { Huvudnummer: 274, Europaväg: 0 }], "Europaväg"), { v: null, e: null }, "två nummer är oenigt");
  eq(vidPunkt([{ Huvudnummer: 222, Deleted: true }, { Huvudnummer: 1053, Valid_To: "2000-01-01T00:00:00Z" }], null), { v: 0, e: null }, "raderade och utgångna hoppas över");
  eq(vidPunkt([{ Huvudnummer: "E4" }], null), { v: null, e: null }, "ett oläsbart nummer gissas inte");
  eq(samman(["fel", "fel"]).utfall, "fel", "inga svar är fel");
  eq(samman([{ v: 1053, e: false }, { v: 1053, e: false }, { v: 0, e: null }]), { fragade: 3, svar: 3, utfall: "nummer", huvudnummer: 1053, europavag: false, lika: 2 }, "två av tre");
  eq(samman([{ v: 1053, e: false }, { v: 0, e: null }]).utfall, "oenig", "hälften räcker inte");
  eq(samman([{ v: 0, e: null }, { v: 0, e: null }, "fel"]).utfall, "onumrerad", "onumrerad med ett fel");
  eq(samman([{ v: null, e: null }, { v: null, e: null }, { v: 12, e: false }]).utfall, "oenig", "oeniga punkter ger inget nummer");
  eq(spridda([5, 1, 3, 2, 4].map((ordning) => ({ ordning }))).map((x) => x.ordning), [1, 3, 5], "första, mitten och sista");
  eq(spridda([{ ordning: 2 }, { ordning: 0 }]).map((x) => x.ordning), [0, 2], "färre punkter än tre");
  eq([europa(-1), europa(0), europa(1), europa("Ja"), europa(null)], [true, false, null, true, null], "Europaväg");
  for (const f of fel) console.log("✗", f);
  if (fel.length) process.exit(1);
  console.log("✓ självtest: onumrerad, oenig och nummer vid en punkt, raderade och oläsbara gissas inte, mer än hälften krävs, punkterna sprids");
}

async function fraga(key: string, filter: string, limit: number): Promise<{ ok: boolean; objekt: any[] }> {
  const body = `<REQUEST><LOGIN authenticationkey="${esc(key)}"/><QUERY objecttype="Vägnummer" namespace="Vägdata.NVDB_DK_O" schemaversion="1.2" limit="${limit}">` +
    `<FILTER>${filter}</FILTER><EXCLUDE>Geometry</EXCLUDE></QUERY></REQUEST>`;
  for (let forsok = 0; forsok < 3; forsok++) {
    try {
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "text/xml", "User-Agent": UA }, body });
      const txt = await r.text();
      if (!r.ok) { if (r.status >= 500 || r.status === 429) { await new Promise((ok) => setTimeout(ok, 5000 * (forsok + 1))); continue; } return { ok: false, objekt: [] }; }
      const res = JSON.parse(txt)?.RESPONSE?.RESULT?.[0];
      // Rotelementet räknas: ett svar utan RESULT är inget svar, ett tomt RESULT är en plats utan Vägnummer.
      if (!res || typeof res !== "object") return { ok: false, objekt: [] };
      return { ok: true, objekt: Array.isArray(res["Vägnummer"]) ? res["Vägnummer"] : [] };
    } catch { await new Promise((ok) => setTimeout(ok, 5000 * (forsok + 1))); }
  }
  return { ok: false, objekt: [] };
}

async function hamta() {
  const url = process.env.DATABASE_URL, key = process.env.TRAFIKVERKET_API_KEY;
  if (!url || !key) throw new Error("DATABASE_URL eller TRAFIKVERKET_API_KEY saknas");
  const ett = await fraga(key, `<EQ name="Deleted" value="false"/>`, 1);
  if (!ett.ok || !ett.objekt.length) throw new Error("Vägnummer svarade inte med ett objekt");
  const f = Object.keys(ett.objekt[0]).filter((k) => /europa/i.test(k));
  if (f.length !== 1) throw new Error("fältet för Europaväg är inte entydigt");
  if (!("Huvudnummer" in ett.objekt[0])) throw new Error("fältet Huvudnummer saknas");
  const falt = f[0];

  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
  try {
    const sma = (await pool.query(`SELECT vag AS nyckel, ordning, lon, lat FROM smavagspunkt`)).rows;
    const stad = (await pool.query(`SELECT punkt AS nyckel, 0 AS ordning, lon, lat FROM stadspunkt`)).rows;
    const nycklar: { kalla: "smavag" | "stad"; nyckel: string; punkter: { ordning: number; lon: number; lat: number }[] }[] = [];
    const perVag = new Map<string, any[]>();
    for (const p of sma) { if (!perVag.has(p.nyckel)) perVag.set(p.nyckel, []); perVag.get(p.nyckel)!.push(p); }
    for (const [nyckel, p] of perVag) nycklar.push({ kalla: "smavag", nyckel, punkter: spridda(p) });
    for (const p of stad) nycklar.push({ kalla: "stad", nyckel: p.nyckel, punkter: [p] });
    if (!nycklar.length) throw new Error("inga punkter i smavagspunkt eller stadspunkt");

    // Nycklar som inte längre finns bland punkterna tas bort först.
    await pool.query(`DELETE FROM vagnummer_punkt v WHERE NOT EXISTS (SELECT 1 FROM unnest($1::text[], $2::text[]) n(kalla, nyckel)
                      WHERE n.kalla = v.kalla AND n.nyckel = v.nyckel)`, [nycklar.map((k) => k.kalla), nycklar.map((k) => k.nyckel)]);
    // Skrivs i omgångar om OMGANG nycklar, så att en körning som når flödets tidsgräns behåller det den hämtat. En nyckel med ett svar
    // som inte är fel och är yngre än FARSK_DYGN frågas inte igen: nästa körning fortsätter där den förra slutade.
    const farska = new Set((await pool.query(
      `SELECT kalla || '/' || nyckel AS k FROM vagnummer_punkt WHERE utfall <> 'fel' AND hamtad > now() - make_interval(days => $1)`, [FARSK_DYGN])).rows.map((r: any) => r.k));
    const kvar = nycklar.filter((k) => !farska.has(`${k.kalla}/${k.nyckel}`));
    for (let i = 0; i < kvar.length; i += OMGANG) {
      const rader: any[] = [];
      for (const k of kvar.slice(i, i + OMGANG)) {
        const svar: Punktsvar[] = [];
        for (const p of k.punkter) {
          const s = await fraga(key, `<INTERSECTS name="${GEO}" shape="center" value="${Number(p.lon).toFixed(6)} ${Number(p.lat).toFixed(6)}" radius="${RADIE_M}m"/>`, 20);
          svar.push(s.ok ? vidPunkt(s.objekt, falt) : "fel");
          await new Promise((ok) => setTimeout(ok, PAUS_MS));
        }
        rader.push({ kalla: k.kalla, nyckel: k.nyckel, ...samman(svar) });
      }
      // Fler fel än en tiondel i en omgång: något är trasigt (nyckeln, API:et), och omgången skrivs inte.
      if (rader.filter((r) => r.utfall === "fel").length * 10 > rader.length) throw new Error("för många anrop föll");
      await pool.query(
        `INSERT INTO vagnummer_punkt (kalla, nyckel, utfall, huvudnummer, europavag, fragade, svar, lika, hamtad)
         SELECT * , now() FROM unnest($1::text[], $2::text[], $3::text[], $4::int[], $5::bool[], $6::int[], $7::int[], $8::int[])
         ON CONFLICT (kalla, nyckel) DO UPDATE SET utfall = EXCLUDED.utfall, huvudnummer = EXCLUDED.huvudnummer, europavag = EXCLUDED.europavag,
           fragade = EXCLUDED.fragade, svar = EXCLUDED.svar, lika = EXCLUDED.lika, hamtad = EXCLUDED.hamtad`,
        [rader.map((r) => r.kalla), rader.map((r) => r.nyckel), rader.map((r) => r.utfall), rader.map((r) => r.huvudnummer),
         rader.map((r) => r.europavag), rader.map((r) => r.fragade), rader.map((r) => r.svar), rader.map((r) => r.lika)]);
    }
    // Punktfilen med numren (#965), i en transaktion; före sql/106 finns ingen punktfil.
    if ((await pool.query(`SELECT to_regclass('public.smavag_punktfil') IS NOT NULL AS ja`)).rows[0]?.ja) {
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        await skrivPunktfil(c);
        await c.query("COMMIT");
      } catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; } finally { c.release(); }
    }
  } finally { await pool.end(); }
  console.log("vägnumren: klart");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes("--sjalvtest")) sjalvtest();
  else await hamta().catch((e) => { console.log(`vägnumren: fel (${String((e as Error).message).slice(0, 120)})`); process.exit(1); });
}
