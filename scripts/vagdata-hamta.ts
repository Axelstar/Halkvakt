// VÄGDATALAGRETS HÄMTARE (kort #301 steg 2, DECISIONS #473; Bengts ja 7/10 "ja till hämtaren"). Skriver det statiska vägdatalagret
// data/vagdata/{stationer,segment,vagpunkter}.json ur Trafikverkets öppna API (NVDB i API:et sedan 7/2 2025, licens CC0) med nyckeln
// driften redan har. En knapptryckning per säsong; filerna committas i en PR efter att sammanfattningen lästs — aldrig av flödet självt.
//
// PLATSERNA: VViS-stationerna (static.json), väglagsnätets 818 segment (mittpunkten på linjen), vägpunkterna var 2 km längs de 20
// svenska skuggrutterna (engine/src/segment.ts provpunkter, samma som prognoslagret) och — Bengts val (a) 7/10 — VÄGLAGSPUNKTERNA: var
// 2 km längs väglagsnätets egna linjer (Trafikverkets riktiga geometri, 23 681 km, ~11 800 punkter; premissmätningens population B, #406).
// Skuggrutterna är handritade (109 brytpunkter på 3 107 km, ~35 km per rak sträcka), så rutternas vägpunkter snappas INTE — prognoslagret
// räknar på just de koordinaterna och lagret ska beskriva dem — radien vidgas i stället (150 → 400 → 1 000 m) och den radie som bar skrivs ut.
//
// VÄGVALET (rekognoseringen #472: 5–7 objekt per träff på 150 m, en sidoväg kan ta platsen): alla sex datamängderna hämtas i EN förfrågan
// per plats (sex QUERY i samma REQUEST), objekten grupperas på NVDB:s Element_Id, raderade och utgångna (Valid_To passerad) kastas, och ETT
// element väljs: lägst funktionell vägklass ⇒ statlig väghållare ⇒ störst ÅDT_fordon ⇒ första. Vad som avgjorde skrivs på raden (vald_pa),
// liksom antalet kandidater. Saknar det valda elementet en datamängd blir fältet null — aldrig ett värde från en annan väg.
//
// VÄRDEVAKTEN: spannen för de nya fälten står i scripts/vardevakten.ts (SPANN) och importeras hit; en rad utanför spannet fäller körningen.
// Rotelementet räknas, aldrig statuskoden; felkroppen skrivs ut. Självtest utan nät: --sjalvtest. Stickprov: --stickprov (var 40:e plats).
// Run: TRAFIKVERKET_API_KEY=... node --experimental-strip-types scripts/vagdata-hamta.ts [--stickprov] [--ut data/vagdata]
import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { provpunkter } from "../engine/src/segment.ts";
import { SPANN } from "./vardevakten.ts";

const KEY = process.env.TRAFIKVERKET_API_KEY;
const API = "https://api.trafikinfo.trafikverket.se/v2/data.json";
const UA = "Halkvakt-vagdata-hamtare/0.1 (+https://github.com/Axelstar/Halkvakt)";
const GEO = "Geometry.WKT-WGS84-3D";          // NVDB-posternas geometri (rekognoseringen #472)
const RADIER_M = [150, 400, 1000];           // vidgas tills något element finns; den radie som bar skrivs på raden
const PAUS_MS = 350;                         // ~2 förfrågningar/s — nyckeln delas med driftens ingest
const KALLA = "Trafikverkets öppna API (api.trafikinfo.trafikverket.se), NVDB via Datautbytesportalen, licens CC0";

type Mangd = { namn: string; ns: string; ver: string };
const MANGDER: Mangd[] = [
  { namn: "Trafik", ns: "Vägdata.TRAFIK_DK_O", ver: "1.2" },
  { namn: "FunktionellVägklass", ns: "Vägdata.NVDB_DK_O", ver: "1.2" },
  { namn: "Slitlager", ns: "Vägdata.NVDB_DK_O", ver: "1.2" },
  { namn: "Vägbredd", ns: "Vägdata.NVDB_DK_O", ver: "1.2" },
  { namn: "Hastighetsgräns", ns: "Vägdata.NVDB_DK_O", ver: "1.2" },
  { namn: "Väghållare", ns: "Vägdata.NVDB_DK_O", ver: "1.2" },
];
export type Rad = {
  id: string; lon: number; lat: number; element_id: string | null; kandidater: number; radie_m: number | null; vald_pa: string | null;
  klass: number | null; vaghallare: string | null; vaghallarnamn: string | null; slitlager: string | null; bredd_m: number | null;
  hastighet_kmh: number | null; adt_fordon: number | null; adt_lastbilar: number | null; adt_latta_22_06: number | null;
  adt_matar: number | null; adt_matmetod: string | null;
};
const FALT_SPANN: (keyof Rad)[] = ["klass", "bredd_m", "hastighet_kmh", "adt_fordon", "adt_lastbilar", "adt_latta_22_06", "adt_matar"];
const tal = (v: unknown): number | null => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
const str = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** Levande objekt: inte raderade, inte utgångna. */
export const levande = (o: any, nu = Date.now()) => o?.Deleted !== true && (!o?.Valid_To || Date.parse(o.Valid_To) > nu);

/** Vägvalet: ett element ur kandidaterna. Returnerar elementet och skälet. */
export function valj(kand: Map<string, Record<string, any>>): { element: string; vald_pa: string } | null {
  const ids = [...kand.keys()];
  if (!ids.length) return null;
  if (ids.length === 1) return { element: ids[0], vald_pa: "enda" };
  const klass = (id: string) => tal(kand.get(id)!.FunktionellVägklass?.Klass) ?? 99;
  const minK = Math.min(...ids.map(klass)); let kvar = ids.filter((id) => klass(id) === minK);
  if (kvar.length === 1) return { element: kvar[0], vald_pa: "klass" };
  const statlig = kvar.filter((id) => kand.get(id)!.Väghållare?.Väghållartyp === "statlig");
  if (statlig.length === 1) return { element: statlig[0], vald_pa: "statlig" };
  if (statlig.length) kvar = statlig;
  const adt = (id: string) => tal(kand.get(id)!.Trafik?.ÅDT_fordon) ?? -1;
  const maxA = Math.max(...kvar.map(adt));
  const topp = kvar.filter((id) => adt(id) === maxA);
  return { element: topp[0], vald_pa: topp.length === 1 && maxA >= 0 ? "adt" : "första" };
}
/** Raden ur det valda elementets objekt. */
export function rad(id: string, lon: number, lat: number, kand: Map<string, Record<string, any>>, radie: number | null): Rad {
  const v = valj(kand);
  const o = v ? kand.get(v.element)! : {};
  const mat = str(o.Trafik?.Mätårsperiod);
  return { id, lon, lat, element_id: v?.element ?? null, kandidater: kand.size, radie_m: v ? radie : null, vald_pa: v?.vald_pa ?? null,
    klass: tal(o.FunktionellVägklass?.Klass), vaghallare: str(o.Väghållare?.Väghållartyp), vaghallarnamn: str(o.Väghållare?.Väghållarnamn),
    slitlager: str(o.Slitlager?.Slitlagertyp), bredd_m: tal(o.Vägbredd?.Bredd), hastighet_kmh: tal(o.Hastighetsgräns?.Högsta_tillåtna_hastighet),
    adt_fordon: tal(o.Trafik?.ÅDT_fordon), adt_lastbilar: tal(o.Trafik?.ÅDT_lastbilar), adt_latta_22_06: tal(o.Trafik?.ÅDT_lätta_fordon_22_06),
    adt_matar: mat && mat.length >= 4 ? Number(mat.slice(0, 4)) : null, adt_matmetod: str(o.Trafik?.Mätmetod) };
}
/** Grupperar svaren (en lista per datamängd, i MANGDER:s ordning) på Element_Id. */
export function kandidater(svar: any[][], nu = Date.now()): Map<string, Record<string, any>> {
  const kand = new Map<string, Record<string, any>>();
  svar.forEach((items, i) => {
    for (const o of items) {
      if (!levande(o, nu) || !o.Element_Id) continue;
      const k = kand.get(String(o.Element_Id)) ?? {};
      if (!k[MANGDER[i].namn]) k[MANGDER[i].namn] = o;   // första levande objektet per element och datamängd
      kand.set(String(o.Element_Id), k);
    }
  });
  return kand;
}
/** Spannkontroll mot värdevaktens SPANN: min/max per fält, fäller vid brott. */
export function spannkontroll(rader: Rad[]): { fel: string[]; sammanfattning: string[] } {
  const fel: string[] = [], sam: string[] = [];
  for (const f of FALT_SPANN) {
    const v = rader.map((r) => r[f]).filter((x): x is number => typeof x === "number");
    const s = SPANN[f];
    if (!s) { fel.push(`${f}: OBESIKTIGAT — inget spann i scripts/vardevakten.ts`); continue; }
    if (!v.length) { sam.push(`${f}: inga värden`); continue; }
    const lo = Math.min(...v), hi = Math.max(...v);
    sam.push(`${f}: ${v.length} värden, ${lo}–${hi} ${s[2].split(" ")[0]}`);
    if (lo < s[0] || hi > s[1]) fel.push(`${f}: ${lo}–${hi} utanför spannet ${s[0]}–${s[1]}`);
  }
  return { fel, sammanfattning: sam };
}

if (process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  const nu = Date.parse("2026-10-07T00:00:00Z");
  k(levande({ Deleted: false }, nu) && !levande({ Deleted: true }, nu) && !levande({ Valid_To: "2020-01-01" }, nu) && levande({ Valid_To: "2030-01-01" }, nu), "levande");
  const svar = [
    [{ Element_Id: "A", ÅDT_fordon: 9000, ÅDT_lastbilar: 900, ÅDT_lätta_fordon_22_06: 300, Mätårsperiod: 202201, Mätmetod: "Stickprovsmätning" }, { Element_Id: "B", ÅDT_fordon: 200 }],
    [{ Element_Id: "A", Klass: "2" }, { Element_Id: "B", Klass: "7" }, { Element_Id: "C", Klass: "2", Deleted: true }],
    [{ Element_Id: "A", Slitlagertyp: "belagd" }, { Element_Id: "B", Slitlagertyp: "grus" }],
    [{ Element_Id: "A", Bredd: "8.5" }],
    [{ Element_Id: "A", Högsta_tillåtna_hastighet: "90" }, { Element_Id: "B", Högsta_tillåtna_hastighet: "50" }],
    [{ Element_Id: "A", Väghållartyp: "statlig", Väghållarnamn: "Trafikverket" }, { Element_Id: "B", Väghållartyp: "enskild" }],
  ];
  const kand = kandidater(svar, nu);
  k(kand.size === 2 && !kand.has("C"), "raderade element kastas, två kandidater kvar");
  const r = rad("s1", 13, 56, kand, 150);
  k(r.element_id === "A" && r.vald_pa === "klass" && r.klass === 2 && r.adt_fordon === 9000 && r.adt_latta_22_06 === 300 && r.adt_matar === 2022
    && r.bredd_m === 8.5 && r.hastighet_kmh === 90 && r.slitlager === "belagd" && r.vaghallare === "statlig" && r.kandidater === 2 && r.radie_m === 150, `vägvalet: ${JSON.stringify(r)}`);
  // Lika klass ⇒ statlig; lika statlig ⇒ störst ÅDT; en sidoväg utan Trafik ger null, aldrig grannens tal.
  const k2 = kandidater([[{ Element_Id: "X", ÅDT_fordon: 100 }, { Element_Id: "Y", ÅDT_fordon: 5000 }], [{ Element_Id: "X", Klass: "4" }, { Element_Id: "Y", Klass: "4" }], [], [], [], [{ Element_Id: "X", Väghållartyp: "statlig" }, { Element_Id: "Y", Väghållartyp: "statlig" }]], nu);
  k(valj(k2)?.element === "Y" && valj(k2)?.vald_pa === "adt", "lika klass och väghållare ⇒ störst ÅDT");
  const tom = rad("t", 0, 0, new Map(), null);
  k(tom.element_id === null && tom.kandidater === 0 && tom.adt_fordon === null, "ingen kandidat ⇒ null överallt");
  const sp = spannkontroll([r]);
  k(sp.fel.length === 0 && sp.sammanfattning.length === FALT_SPANN.length, `spannen deklarerade: ${sp.fel.join("; ")}`);
  k(spannkontroll([{ ...r, adt_fordon: 10_000_000 }]).fel.length === 1, "utanför spannet fälls");
  console.log("✓ självtest: levande, kandidater, vägvalet, raden, spannkontrollen");
  process.exit(0);
}
if (!KEY) { console.error("TRAFIKVERKET_API_KEY not set"); process.exit(1); }
const stickprov = process.argv.includes("--stickprov");
const ut = process.argv.includes("--ut") ? process.argv[process.argv.indexOf("--ut") + 1] : "data/vagdata";
mkdirSync(ut, { recursive: true });

async function hamta(lon: number, lat: number, radie: number): Promise<{ ok: boolean; status: number; svar: any[][]; fel: string }> {
  const filter = `<INTERSECTS name="${GEO}" shape="center" value="${lon.toFixed(5)} ${lat.toFixed(5)}" radius="${radie}m"/>`;
  const body = `<REQUEST><LOGIN authenticationkey="${esc(KEY!)}"/>` + MANGDER.map((m) =>
    `<QUERY objecttype="${m.namn}" namespace="${m.ns}" schemaversion="${m.ver}" limit="40"><FILTER>${filter}</FILTER><EXCLUDE>Geometry</EXCLUDE></QUERY>`).join("") + `</REQUEST>`;
  for (let forsok = 0; forsok < 3; forsok++) {
    try {
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "text/xml", "User-Agent": UA }, body });
      const txt = await r.text();
      if (!r.ok) { if (r.status >= 500 || r.status === 429) { await new Promise((ok) => setTimeout(ok, 5000 * (forsok + 1))); continue; } return { ok: false, status: r.status, svar: [], fel: txt.replace(/\s+/g, " ").slice(0, 200) }; }
      const j = JSON.parse(txt); const res: any[] = j?.RESPONSE?.RESULT ?? [];
      return { ok: true, status: r.status, svar: MANGDER.map((m, i) => res[i]?.[m.namn] ?? []), fel: "" };
    } catch (e) { await new Promise((ok) => setTimeout(ok, 5000 * (forsok + 1))); if (forsok === 2) return { ok: false, status: 0, svar: [], fel: String((e as Error).message).slice(0, 200) }; }
  }
  return { ok: false, status: 0, svar: [], fel: "tre försök" };
}

const statik: any = JSON.parse(readFileSync("static.json", "utf8"));
const vaglag: any = JSON.parse(readFileSync("vaglag.geojson", "utf8"));
const src = readFileSync("supabase/functions/skuggmotor/main.ts", "utf8");
const start = src.indexOf("const ROUTES: Record<string, [number, number][]> = {"), slut = src.indexOf("\n};", start);
if (start < 0 || slut < 0) throw new Error("ROUTES hittades inte i skuggmotor/main.ts");
const ROUTES: Record<string, [number, number][]> = new Function(`return ${src.slice(src.indexOf("{", start), slut + 2)}`)();
const glesa = <T,>(xs: T[]) => (stickprov ? xs.filter((_, i) => i % 40 === 0) : xs);
const platser: Record<string, { id: string; lon: number; lat: number }[]> = {
  stationer: glesa(statik.stations.map((s: any) => ({ id: String(s.id), lon: s.lon, lat: s.lat }))),
  segment: glesa(vaglag.features.map((f: any) => { const c = f.geometry.coordinates; const m = c[Math.floor(c.length / 2)]; return { id: String(f.properties.segment_id), lon: m[0], lat: m[1] }; })),
  vagpunkter: glesa(Object.entries(ROUTES).filter(([n]) => !/Finland|Norge|Danmark|FI|NO|DK/.test(n)).flatMap(([n, line]) => provpunkter(line).map((p) => ({ id: `${n}@${p.km}`, lon: p.lon, lat: p.lat })))),
  // (a): riktig geometri — var 2 km längs väglagsnätets 818 linjer, id = segment_id@km.
  vaglagspunkter: glesa(vaglag.features.flatMap((f: any) => provpunkter(f.geometry.coordinates as [number, number][]).map((p) => ({ id: `${f.properties.segment_id}@${p.km}`, lon: p.lon, lat: p.lat })))),
};
const datum = new Date().toISOString();
console.log(`VÄGDATALAGRETS HÄMTARE (kort #301 steg 2, DECISIONS #473) — ${stickprov ? "STICKPROV (var 40:e)" : "alla platser"}: ` +
  Object.entries(platser).map(([k, v]) => `${k} ${v.length}`).join(" · ") + ` · radier ${RADIER_M.join("/")} m · ${datum}`);
const t0 = performance.now();
let anrop = 0, felAnrop = 0;
for (const [typ, lista] of Object.entries(platser)) {
  const rader: Rad[] = []; let exempelFel = "";
  const radier = new Map<number | null, number>();
  for (const p of lista) {
    let kand = new Map<string, Record<string, any>>(), bar: number | null = null;
    for (const radie of RADIER_M) {
      const r = await hamta(p.lon, p.lat, radie); anrop++;
      await new Promise((ok) => setTimeout(ok, PAUS_MS));
      if (!r.ok) { felAnrop++; if (!exempelFel) exempelFel = `HTTP ${r.status} ${r.fel}`; break; }
      kand = kandidater(r.svar);
      if (kand.size) { bar = radie; break; }
    }
    radier.set(bar, (radier.get(bar) ?? 0) + 1);
    rader.push(rad(p.id, p.lon, p.lat, kand, bar));
  }
  const med = (f: keyof Rad) => rader.filter((r) => r[f] !== null).length;
  const tackning = Object.fromEntries((["element_id", "klass", "vaghallare", "slitlager", "bredd_m", "hastighet_kmh", "adt_fordon", "adt_latta_22_06"] as (keyof Rad)[]).map((f) => [f, med(f)]));
  const valda = Object.fromEntries([...new Set(rader.map((r) => r.vald_pa))].map((v) => [v ?? "ingen", rader.filter((r) => r.vald_pa === v).length]));
  const sp = spannkontroll(rader);
  const huvud = { kalla: KALLA, datum, datamangder: MANGDER.map((m) => `${m.namn} ${m.ns} ${m.ver}`), geometri: GEO, radier_m: RADIER_M,
    regel: "ett NVDB-element per plats: lägst funktionell vägklass ⇒ statlig väghållare ⇒ störst ÅDT_fordon ⇒ första; raderade och utgångna objekt kastas; fält utan objekt på det valda elementet är null",
    platser: rader.length, tackning, radie_som_bar: Object.fromEntries([...radier].map(([k, v]) => [k ?? "ingen", v])), vald_pa: valda,
    spann: sp.sammanfattning, kort: "#301", beslut: "DECISIONS #473" };
  const fil = `${ut}/${typ}.json`;
  writeFileSync(`${fil}.tmp`, JSON.stringify({ huvud, rader }, null, 1)); renameSync(`${fil}.tmp`, fil);
  console.log(`\n${typ}: ${rader.length} platser · täckning ${Object.entries(tackning).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
  console.log(`  radie som bar: ${JSON.stringify(huvud.radie_som_bar)} · vald på: ${JSON.stringify(valda)}${exempelFel ? ` · FEL (exempel): ${exempelFel}` : ""}`);
  console.log(`  spann: ${sp.sammanfattning.join(" · ")}`);
  if (sp.fel.length) { console.error(`  SPANNFEL: ${sp.fel.join("; ")}`); process.exitCode = 1; }
}
console.log(`\nKlart: ${anrop} förfrågningar (${felAnrop} fel), ${((performance.now() - t0) / 60_000).toFixed(1)} min. Filerna i ${ut}/ committas i en PR efter läsning — flödet skriver inget i repot.`);
if (felAnrop > anrop * 0.02) { console.error(`UNDERLAGSVAKT: ${felAnrop} av ${anrop} förfrågningar föll — mer än 2 %, hämtningen är inte hel.`); process.exitCode = 1; }
