// VÄGNUMMER OCH EUROPAVÄG UR DET ÖPPNA API:ET (DECISIONS #553, kort #303; Bengt 13/10: "2 ja").
// Kandidatens rättelse läser e_road (Axels road_all.csv: Vagnummer_Europavag "Ja"/"Nej", ur Lastkajens NVDB-lager Vagnummer). Det
// öppna API:ets datamodell har objekttypen Vägnummer i Vägdata.NVDB_DK_O 1.2 (läst 13/10), men fälten har ingen läst.
//   --prov: ett anrop med limit 1 (rotelementet och fältens namn och typer), och var tolfte station. Fältet för Europaväg är det enda
//           vars namn innehåller "europa"; finns inget eller flera fälls körningen.
//   (utan): alla 12 960 väglagspunkter och alla stationer; rader i väglagspunkternas ordning (sid = radnumret, som
//           vaglagspunkter-sardrag.json) och per station, skrivna till --ut.
// Varje plats frågas där vägdatalagret valde vägen: samma radie som bar (radie_m) och objektet på samma NVDB-element (element_id).
// Saknas Vägnummer på elementet är vägen onumrerad och värdet 0, räknat; null bara vid fallerat anrop eller oläsbart värde. API:ets
// Europaväg är ett tal: −1 = Ja och 0 = Nej (Esris och Access sanningsvärde; råvärdena i provet 38473909973). Vid stationerna jämförs
// med Axels road_all.csv (--road-all), bara som
// aggregat: överensstämmelsen ska vara minst 95 %, annars används filen inte förrän skälet är läst.
// Rotelementet räknas, aldrig statuskoden; felkroppen skrivs ut. Nyckeln delas med driftens ingest: ~2 förfrågningar/s.
// Run: TRAFIKVERKET_API_KEY=... node --experimental-strip-types scripts/vagdata-vagnummer.ts [--prov] [--road-all <csv>] [--ut <dir>]
import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";

const KEY = process.env.TRAFIKVERKET_API_KEY;
const API = "https://api.trafikinfo.trafikverket.se/v2/data.json";
const UA = "Halkvakt-vagdata-vagnummer/0.1 (+https://github.com/Axelstar/Halkvakt)";
const GEO = "Geometry.WKT-WGS84-3D";
const PAUS_MS = 350;
const KRAV = 0.95;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** "Ja"/true/1 → 1, "Nej"/false/0 → 0, annat → null. */
export function jaNej(v: unknown): 0 | 1 | null {
  if (v === true || v === 1 || (typeof v === "string" && /^(ja|true|1)$/i.test(v.trim()))) return 1;
  if (v === false || v === 0 || (typeof v === "string" && /^(nej|false|0)$/i.test(v.trim()))) return 0;
  return null;
}
/** API:ets Europaväg är ett TAL med Esris och Access sanningsvärde: −1 = Ja, 0 = Nej. Råvärdena vid 72 stationer (körning 38473909973)
 *  var 0 (50) och −1 (21) och inget annat; gissningen före det, att talet var E-vägens nummer, var fel. Ja/Nej läses som jaNej; allt
 *  annat ger null, och jämförelsen med Axels Ja/Nej vid stationerna räknar det som fel. */
export function europa(v: unknown): 0 | 1 | null {
  if (typeof v === "number") return v === -1 ? 1 : v === 0 ? 0 : null;
  return jaNej(v);
}
/** En CSV-rad med citattecken: ett namn med kommatecken (stationens eller driftområdets) får inte flytta kolumnerna. */
export function csvRad(r: string): string[] {
  const ut: string[] = []; let f = "", i = 0, cit = false;
  for (; i < r.length; i++) {
    const c = r[i];
    if (cit) { if (c === '"' && r[i + 1] === '"') { f += '"'; i++; } else if (c === '"') cit = false; else f += c; }
    else if (c === '"') cit = true; else if (c === ",") { ut.push(f); f = ""; } else f += c;
  }
  ut.push(f.replace(/\r$/, "")); return ut;
}
/** Det levande objektet på platsens element, annars null. */
export function pa(objekt: any[], element: string, nu = Date.now()): any | null {
  return objekt.find((o) => String(o?.Element_Id) === element && o?.Deleted !== true && (!o?.Valid_To || Date.parse(o.Valid_To) > nu)) ?? null;
}
/** Fältet för Europaväg: det enda namnet som innehåller "europa". */
export function europafalt(nycklar: string[]): string {
  const f = nycklar.filter((k) => /europa/i.test(k));
  if (f.length !== 1) throw new Error(`fältet för Europaväg är inte entydigt bland ${JSON.stringify(nycklar)}: ${JSON.stringify(f)}`);
  return f[0];
}
/** Överensstämmelsen mot road_all.csv vid de frågade stationerna där Axel har ett värde: {n, lika, saknas}. Ett saknat värde ur API:et
 *  räknas som FEL och ingår i n — det första provet räknade bort dem och såg 47 av 47 lika, fast Europavägarna var just de saknade. */
export function jamfor(api: Map<string, 0 | 1 | null>, axel: Map<string, 0 | 1>) {
  let n = 0, lika = 0, saknas = 0;
  for (const [id, a] of axel) { const v = api.get(id); if (v === undefined) continue; n++; if (v === null) saknas++; else if (v === a) lika++; }
  return { n, lika, saknas };
}

if (process.argv.includes("--sjalvtest")) {
  const fel: string[] = [];
  if (!(jaNej("Ja") === 1 && jaNej(" nej ") === 0 && jaNej(true) === 1 && jaNej(false) === 0 && jaNej("E4") === null && jaNej(null) === null)) fel.push("jaNej");
  const o = [{ Element_Id: "1:2", Europaväg: "Nej", Deleted: true }, { Element_Id: "1:2", Europaväg: "Ja" }, { Element_Id: "3:4", Europaväg: "Nej" }];
  if (pa(o, "1:2")?.Europaväg !== "Ja" || pa(o, "9:9") !== null) fel.push("objektet på elementet, raderade hoppas över");
  if (europafalt(["Huvudnummer", "Europaväg", "Element_Id"]) !== "Europaväg") fel.push("europafältet");
  let kastat = false; try { europafalt(["Huvudnummer"]); } catch { kastat = true; } if (!kastat) fel.push("inget europafält fäller");
  const j = jamfor(new Map([["a", 1], ["b", 0], ["c", null], ["d", 1]]), new Map([["a", 1], ["b", 1], ["c", 0], ["e", 0]]));
  if (j.n !== 3 || j.lika !== 1 || j.saknas !== 1) fel.push(`jämförelsen räknar ett saknat värde som fel: ${JSON.stringify(j)}`);
  if (!(europa(-1) === 1 && europa(0) === 0 && europa(1) === null && europa(4) === null && europa("Ja") === 1 && europa(null) === null))
    fel.push("europa: −1 → 1, 0 → 0, Ja/Nej, annat (också 1 och 4) → null");
  if (JSON.stringify(csvRad('1001,"Ödeshög, E4",Ja\r')) !== JSON.stringify(["1001", "Ödeshög, E4", "Ja"])) fel.push("csvRad: kommatecken inom citattecken");
  for (const f of fel) console.log("✗", f);
  if (fel.length) process.exit(1);
  console.log("✓ självtest: Ja/Nej och API:ets tal (−1 = Ja, 0 = Nej) läses, objektet tas på platsens element och raderade hoppas över, europafältet måste vara entydigt, och jämförelsen räknar ett saknat värde som fel");
  process.exit(0);
}

if (!KEY) { console.error("TRAFIKVERKET_API_KEY saknas"); process.exit(1); }
const prov = process.argv.includes("--prov");
const arg = (n: string) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const ut = arg("--ut") ?? "vagnummer-ut";

async function fraga(filter: string, limit: number): Promise<{ ok: boolean; status: number; objekt: any[]; fel: string; rot: string }> {
  const body = `<REQUEST><LOGIN authenticationkey="${esc(KEY!)}"/><QUERY objecttype="Vägnummer" namespace="Vägdata.NVDB_DK_O" schemaversion="1.2" limit="${limit}">` +
    `<FILTER>${filter}</FILTER><EXCLUDE>Geometry</EXCLUDE></QUERY></REQUEST>`;
  for (let forsok = 0; forsok < 3; forsok++) {
    try {
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "text/xml", "User-Agent": UA }, body });
      const txt = await r.text();
      if (!r.ok) {
        if (r.status >= 500 || r.status === 429) { await new Promise((ok) => setTimeout(ok, 5000 * (forsok + 1))); continue; }
        return { ok: false, status: r.status, objekt: [], fel: txt.replace(/\s+/g, " ").slice(0, 300), rot: "" };
      }
      const j = JSON.parse(txt); const res = j?.RESPONSE?.RESULT?.[0] ?? {};
      return { ok: true, status: r.status, objekt: res["Vägnummer"] ?? [], fel: "", rot: Object.keys(res).join(",") || "(tomt)" };
    } catch (e) { await new Promise((ok) => setTimeout(ok, 5000 * (forsok + 1))); if (forsok === 2) return { ok: false, status: 0, objekt: [], fel: String((e as Error).message).slice(0, 200), rot: "" }; }
  }
  return { ok: false, status: 0, objekt: [], fel: "tre försök", rot: "" };
}
const vid = (lon: number, lat: number, radie: number) => `<INTERSECTS name="${GEO}" shape="center" value="${lon.toFixed(5)} ${lat.toFixed(5)}" radius="${radie}m"/>`;

const ett = await fraga(`<EQ name="Deleted" value="false"/>`, 1);
if (!ett.ok || !ett.objekt.length) { console.error(`Vägnummer svarade inte med ett objekt: status ${ett.status}, rotelement ${ett.rot}, ${ett.fel}`); process.exit(1); }
const nycklar = Object.keys(ett.objekt[0]);
console.log(`VÄGNUMMER I DET ÖPPNA API:ET (DECISIONS #553): rotelementet ${ett.rot}; fälten ${nycklar.map((k) => `${k} (${typeof ett.objekt[0][k]})`).join(", ")}`);
const FALT = europafalt(nycklar);
console.log(`fältet för Europaväg: ${FALT}`);

type Plats = { id: string; lon: number; lat: number; element_id: string; radie_m: number | null };
const las = (f: string): Plats[] => JSON.parse(readFileSync(`data/vagdata/${f}`, "utf8")).rader;
const stationer = las("stationer.json"), punkter = las("vaglagspunkter.json");
const urval = prov ? { stationer: stationer.filter((_, i) => i % 12 === 0), punkter: [] as Plats[] } : { stationer, punkter };
// Ett element utan Vägnummer är en väg utan vägnummer och därmed ingen Europaväg: 0, som Axels koppling ger när inget vägnummer finns
// inom 150 m (road_all.csv saknar då värdet, och kedjan läser e_road som "Ja" eller inte). Bara ett fallerat anrop eller ett oläsbart
// värde ger null. Råvärdena räknas och skrivs ut.
const raa = new Map<string, number>();
const ur = async (p: Plats) => {
  if (!p.element_id) { raa.set("(inget element)", (raa.get("(inget element)") ?? 0) + 1); return { varde: 0 as 0 | 1 | null, huvud: null as unknown, fel: false }; }
  const s = await fraga(vid(p.lon, p.lat, p.radie_m ?? 150), 40);
  await new Promise((ok) => setTimeout(ok, PAUS_MS));
  if (!s.ok) return { varde: null, huvud: null, fel: true };
  const o = pa(s.objekt, String(p.element_id));
  const nyckel = o ? `${FALT}=${JSON.stringify(o[FALT])}` : "(inget Vägnummer på elementet)";
  raa.set(nyckel, (raa.get(nyckel) ?? 0) + 1);
  return { varde: o ? europa(o[FALT]) : 0, huvud: o?.Huvudnummer ?? null, fel: false };
};
const varden = new Map<string, 0 | 1 | null>(); let felanrop = 0; const vardeTyper = new Map<string, number>();
for (const p of urval.stationer) {
  const r = await ur(p); varden.set(String(p.id), r.varde); if (r.fel) felanrop++;
}
console.log(`råvärdena vid stationerna: ${JSON.stringify(Object.fromEntries([...raa].sort((a, b) => b[1] - a[1]).slice(0, 25)))}`);
const rader: any[] = [];
for (let i = 0; i < urval.punkter.length; i++) {
  const p = urval.punkter[i]; const r = await ur(p); if (r.fel) felanrop++;
  rader.push({ sid: String(i).padStart(5, "0"), id: p.id, europavag: r.varde, huvudnummer: r.huvud });
  if (i % 1000 === 0) console.log(`  ${i} av ${urval.punkter.length}`);
}
for (const v of varden.values()) vardeTyper.set(String(v), (vardeTyper.get(String(v)) ?? 0) + 1);
console.log(`stationer: ${urval.stationer.length} frågade, värden ${JSON.stringify(Object.fromEntries(vardeTyper))}, ${felanrop} anrop som föll`);
const ra = arg("--road-all");
if (ra) {
  const [h, ...rr] = readFileSync(ra, "utf8").trim().split("\n"); const k = csvRad(h), iS = k.indexOf("sid"), iE = k.indexOf("Vagnummer_Europavag");
  const axel = new Map<string, 0 | 1>(rr.map(csvRad).filter((c) => jaNej(c[iE]) !== null).map((c) => [c[iS], jaNej(c[iE]) as 0 | 1]));
  const j = jamfor(varden, axel);
  console.log(`mot Axels road_all.csv: ${j.lika} av ${j.n} lika (${(100 * j.lika / Math.max(j.n, 1)).toFixed(1)} %, kravet ${100 * KRAV} %), ${j.saknas} utan läsbart värde (räknas som fel)`);
  if (j.n && j.lika / j.n < KRAV) { console.log("ÖVERENSSTÄMMELSEN RÄCKER INTE: filen används inte förrän skälet är läst"); process.exitCode = 1; }
}
if (!prov) {
  mkdirSync(ut, { recursive: true });
  const saknas = rader.filter((r) => r.europavag === null).length;
  const huvud = { kalla: "Trafikverkets öppna API (api.trafikinfo.trafikverket.se), NVDB Vägnummer (Vägdata.NVDB_DK_O 1.2), licens CC0",
    datum: new Date().toISOString(), falt: FALT, beslut: "DECISIONS #553", kort: "#303", platser: rader.length, utan_varde: saknas, felanrop,
    nyckel: "sid = radnumret i vaglagspunkter.json, som vaglagspunkter-sardrag.json; vägen är den vägdatalagret valde (element_id, radie_m)" };
  const fil = `${ut}/vaglagspunkter-europavag.json`;
  writeFileSync(`${fil}.tmp`, JSON.stringify({ huvud, rader })); renameSync(`${fil}.tmp`, fil);
  console.log(`${fil}: ${rader.length} platser, ${rader.filter((r) => r.europavag === 1).length} på Europaväg, ${saknas} utan värde`);
}
