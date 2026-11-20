// STADENS GATOR — hämtaren (DECISIONS #935; Bengt 21/11: "Bygg linjer"). Storstädernas punkter (stadspunkt, sql/089) ritas på kartan som
// bitar längs vägen eller gatan de ligger på (STAD_BITAR_SQL i publish/map-core.ts). Linjerna hämtas här ur Trafikverkets öppna API (NVDB i
// Vägdata.NVDB_DK_O 1.2, licens CC0, samma nyckel som driften) och skrivs till stadsgata (sql/135), en rad per element_id.
//
// ELEMENTEN står i kuvösens driftlista (kuvos/stadspunkter-drift-2026-27.json genom överlägget, halkvakt-kuvos F79) och är av tre slag:
//   "1000:1289"         B: NVDB:s element (Lastkajens ROUTE_ID = API:ets Element_Id)
//   "rutt:10133:74621"  C utan gatunamn: elementet efter "rutt:"
//   "gata:<namn>"       C med gatunamn: gatan, alltså alla element som bär namnet (Gatunamn.Namn) kring gatans punkter
// REKOGNOSERINGEN (körning 44839273321, 21/11, tio element av varje slag): filter på Element_Id fungerar, ett åt gången (EQ) och flera i
// samma förfrågan (IN), med samma element som svar; B:s element är i median 945 m och C:s rutt-element 84 m, och punkterna ligger högst
// 0,5 m från linjen. Gatunamn med namnet och en cirkel kring gatan gav alla tio gatorna (i median 861 m, högst 0,5 m från punkterna).
// En punkt och en radie hade träffat 1–37 element inom 30 m i staden och prövas därför inte. Därför:
//   - element och rutt: FunktionellVägklass med IN, 50 element per förfrågan; de som saknas en gång till med Vägtrafiknät.
//   - gator: Gatunamn med EQ på Namn och INTERSECTS en cirkel kring gatans punkter (deras mitt, största avståndet + 1 500 m), tio
//     gator (tio QUERY) per förfrågan.
// Delarna per element slås ihop: Z tas bort, lika delsträckor tas bort, delar som möts i en ände utan förgrening fogas ihop, varje linje
// förenklas lätt (1 m) och avrundas till 5 decimaler (~1 m). Rotelementet räknas på varje svar, aldrig statuskoden; felkroppen skrivs ut.
// ~2 förfrågningar/s: nyckeln delas med driftens ingest. Loggen bär bara antal och avstånd: inga id, inga lägen, inga särdrag.
//   prov  [lista]   hämtar och räknar; skriver inget i databasen; linjerna till stadsgator-ut/stadsgator.geojson (flödets artefakt)
//   skriv [lista]   samma hämtning, sedan upsert i stadsgata (DATABASE_URL); fler än 2 % fallna förfrågningar ⇒ inget skrivs
//   --sjalvtest     utan nät
import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export const LISTA = fileURLToPath(new URL("../kuvos/stadspunkter-drift-2026-27.json", import.meta.url));
const API = "https://api.trafikinfo.trafikverket.se/v2/data.json";
const UA = "Halkvakt-stadsgator/0.1 (+https://github.com/Axelstar/Halkvakt)";
const GEO = "Geometry.WKT-WGS84-3D";
const NS = "Vägdata.NVDB_DK_O", VER = "1.2";
const PAUS_MS = 500;            // ~2 förfrågningar/s
const PER_IN = 50, PER_GATA = 10, TAK = 2000;
const MARGINAL_M = 1500;        // gatans cirkel: största avståndet från punkternas mitt + detta (bitens halva längd + 300 m ryms med råge)
const FORENKLA_M = 1;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export type Pkt = [number, number];
export type Element = { element_id: string; lager: "B" | "C"; punkter: Pkt[] };
export const slag = (e: string) => (e.startsWith("gata:") ? "gata" : e.startsWith("rutt:") ? "rutt" : "element");
/** API:ets Element_Id för ett element- eller ruttnyckel. */
export const nvdbId = (e: string) => e.replace(/^rutt:/, "");

/** Listans element: distinkta element_id med sina punkter. En nyckel som inte är något av de tre slagen fäller. */
export function element(lista: { rader?: unknown }): Element[] {
  if (!Array.isArray(lista.rader) || !lista.rader.length) throw new Error("listan saknar rader");
  const per = new Map<string, Element>();
  for (const [i, x] of (lista.rader as any[]).entries()) {
    const e = String(x?.element_id ?? "");
    if (!/^(\d+:\d+|rutt:\d+:\d+|gata:.+)$/.test(e)) throw new Error(`rad ${i + 1}: element_id saknas eller är okänt`);
    const el = per.get(e) ?? { element_id: e, lager: x.lager, punkter: [] };
    el.punkter.push([Number(x.lon), Number(x.lat)]);
    per.set(e, el);
  }
  return [...per.values()];
}

// ---- geometrin ----
const M_LAT = 111_132;
const kos = (lat: number) => Math.cos(lat * Math.PI / 180);
export function avstandM(a: Pkt, b: Pkt): number {
  const k = kos((a[1] + b[1]) / 2);
  return Math.hypot((a[0] - b[0]) * M_LAT * k, (a[1] - b[1]) * M_LAT);
}
/** WKT (LINESTRING/MULTILINESTRING, med eller utan Z) → delar med [lon, lat]. */
export function wktLinjer(wkt: string): Pkt[][] {
  if (!/^\s*(MULTI)?LINESTRING/i.test(wkt ?? "")) return [];
  return [...String(wkt).matchAll(/\(([^()]+)\)/g)].map((m) => m[1].split(",").map((p) => {
    const [x, y] = p.trim().split(/\s+/).map(Number);
    return [x, y] as Pkt;
  })).filter((d) => d.length >= 2 && d.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)));
}
const r5 = (x: number) => Math.round(x * 1e5) / 1e5;
const nyckel = (p: Pkt) => `${r5(p[0])} ${r5(p[1])}`;
/** Douglas–Peucker i meter (lokal skala), ändpunkterna kvar. */
export function forenkla(d: Pkt[], tol = FORENKLA_M): Pkt[] {
  if (d.length <= 2) return d;
  const k = kos(d[0][1]);
  const xy = d.map(([x, y]) => [x * M_LAT * k, y * M_LAT]);
  const behall = new Uint8Array(d.length); behall[0] = behall[d.length - 1] = 1;
  const stack: [number, number][] = [[0, d.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = xy[a], [bx, by] = xy[b], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy);
    let max = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = xy[i];
      const dd = l ? Math.abs(dy * px - dx * py + bx * ay - by * ax) / l : Math.hypot(px - ax, py - ay);
      if (dd > max) { max = dd; idx = i; }
    }
    if (max > tol) { behall[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return d.filter((_, i) => behall[i]);
}
/** Elementets linjer: avrundade, utan lika delsträckor, ihopfogade där två delar möts utan förgrening, förenklade. */
export function linjer(delar: Pkt[][]): Pkt[][] {
  // Delsträckorna, en gång var (åt vilket håll de än gick).
  const kant = new Map<string, [string, string]>(), pt = new Map<string, Pkt>();
  for (const d of delar) for (let i = 1; i < d.length; i++) {
    const a = nyckel(d[i - 1]), b = nyckel(d[i]);
    if (a === b) continue;
    pt.set(a, [r5(d[i - 1][0]), r5(d[i - 1][1])]); pt.set(b, [r5(d[i][0]), r5(d[i][1])]);
    kant.set(a < b ? `${a}|${b}` : `${b}|${a}`, [a, b]);
  }
  const grannar = new Map<string, string[]>();
  for (const [a, b] of kant.values()) { (grannar.get(a) ?? grannar.set(a, []).get(a)!).push(b); (grannar.get(b) ?? grannar.set(b, []).get(b)!).push(a); }
  const sedd = new Set<string>(), ut: Pkt[][] = [];
  const k = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const ga = (start: string, nasta: string) => {
    const kedja = [start, nasta]; sedd.add(k(start, nasta));
    let fore = start, nu = nasta;
    while ((grannar.get(nu)?.length ?? 0) === 2) {
      const vidare = grannar.get(nu)!.find((g) => g !== fore);
      if (!vidare || sedd.has(k(nu, vidare))) break;
      sedd.add(k(nu, vidare)); kedja.push(vidare); fore = nu; nu = vidare;
    }
    return kedja;
  };
  // Först från ändar och förgreningar, sedan det som är kvar (slingor).
  for (const [n, g] of grannar) if (g.length !== 2) for (const m of g) if (!sedd.has(k(n, m))) ut.push(ga(n, m).map((x) => pt.get(x)!));
  for (const [n, g] of grannar) for (const m of g) if (!sedd.has(k(n, m))) ut.push(ga(n, m).map((x) => pt.get(x)!));
  return ut.map((d) => forenkla(d)).filter((d) => d.length >= 2);
}
/** Kortaste avståndet i meter från en punkt till linjerna, och var längs den närmaste linjen (meter från dess början). */
export function narmast(p: Pkt, ls: Pkt[][]): { d: number; linje: number; langs: number } {
  const k = kos(p[1]), X = (q: Pkt) => q[0] * M_LAT * k, Y = (q: Pkt) => q[1] * M_LAT;
  let best = { d: Infinity, linje: -1, langs: 0 };
  ls.forEach((l, li) => {
    let s = 0;
    for (let i = 1; i < l.length; i++) {
      const ax = X(l[i - 1]), ay = Y(l[i - 1]), bx = X(l[i]), by = Y(l[i]);
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, seg = Math.sqrt(l2);
      const t = l2 ? Math.max(0, Math.min(1, ((X(p) - ax) * dx + (Y(p) - ay) * dy) / l2)) : 0;
      const d = Math.hypot(X(p) - (ax + t * dx), Y(p) - (ay + t * dy));
      if (d < best.d) best = { d, linje: li, langs: s + t * seg };
      s += seg;
    }
  });
  return best;
}
/** Avstånden längs linjen mellan grannpunkter på samma element och samma linje (punkter mer än 25 m från linjen räknas inte). */
export function luckor(punkter: Pkt[], ls: Pkt[][]): number[] {
  const per = new Map<number, number[]>();
  for (const p of punkter) { const n = narmast(p, ls); if (n.d <= 25) (per.get(n.linje) ?? per.set(n.linje, []).get(n.linje)!).push(n.langs); }
  return [...per.values()].flatMap((v) => v.sort((a, b) => a - b).slice(1).map((x, i) => x - v[i])).filter((x) => x > 1);
}
export const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN; };
/** Gatans cirkel: punkternas mitt och största avståndet dit + marginalen, uppåt till hela 100 m. */
export function cirkel(punkter: Pkt[]): { mitt: Pkt; radie: number } {
  const mitt: Pkt = [punkter.reduce((s, p) => s + p[0], 0) / punkter.length, punkter.reduce((s, p) => s + p[1], 0) / punkter.length];
  return { mitt, radie: Math.ceil((Math.max(...punkter.map((p) => avstandM(p, mitt))) + MARGINAL_M) / 100) * 100 };
}

// ---- frågorna ----
export const levande = (o: any, nu = Date.now()) => o?.Deleted !== true && (!o?.Valid_To || Date.parse(o.Valid_To) > nu);
const INCL = `<INCLUDE>Element_Id</INCLUDE><INCLUDE>${GEO}</INCLUDE><INCLUDE>Deleted</INCLUDE><INCLUDE>Valid_To</INCLUDE>`;
export const fragaIn = (typ: string, ids: string[]) =>
  `<QUERY objecttype="${typ}" namespace="${NS}" schemaversion="${VER}" limit="${TAK}"><FILTER><IN name="Element_Id" value="${esc(ids.join(","))}"/></FILTER>${INCL}</QUERY>`;
export function fragaGata(e: Element): string {
  const { mitt, radie } = cirkel(e.punkter);
  return `<QUERY objecttype="Gatunamn" namespace="${NS}" schemaversion="${VER}" limit="${TAK}"><FILTER><AND><EQ name="Namn" value="${esc(e.element_id.slice(5))}"/>` +
    `<INTERSECTS name="${GEO}" shape="center" value="${mitt[0].toFixed(5)} ${mitt[1].toFixed(5)}" radius="${radie}m"/></AND></FILTER>${INCL}</QUERY>`;
}
type Svar = { ok: boolean; status: number; delar: any[][]; rot: string[]; fel: string };
/** En förfrågan med en eller flera QUERY. delar[i] = objekten i svar i; rot[i] = svarets rotelement (nycklarna) eller ERROR. */
export function tolka(txt: string, typer: string[]): Omit<Svar, "ok" | "status"> {
  const res: any[] = JSON.parse(txt)?.RESPONSE?.RESULT ?? [];
  const rot = typer.map((_, i) => Object.keys(res[i] ?? {}).join(",") || "(tomt)");
  const fel = res.map((r) => r?.ERROR?.MESSAGE).filter(Boolean).join("; ");
  const delar = typer.map((t, i) => (res[i]?.[t] ?? []) as any[]);
  if (!fel && delar.some((d) => d.length >= TAK)) return { delar, rot, fel: `taket ${TAK} objekt nått i ett svar` };
  return { delar, rot, fel };
}
async function skicka(nyckel: string, queries: string[], typer: string[]): Promise<Svar> {
  const body = `<REQUEST><LOGIN authenticationkey="${esc(nyckel)}"/>${queries.join("")}</REQUEST>`;
  for (let forsok = 0; forsok < 3; forsok++) {
    try {
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "text/xml", "User-Agent": UA }, body });
      const txt = await r.text();
      await new Promise((ok) => setTimeout(ok, PAUS_MS));
      if (!r.ok) {
        if (r.status >= 500 || r.status === 429) { await new Promise((ok) => setTimeout(ok, 5000 * (forsok + 1))); continue; }
        return { ok: false, status: r.status, delar: [], rot: [], fel: txt.replace(/\s+/g, " ").slice(0, 300) };
      }
      const t = tolka(txt, typer);
      return { ok: !t.fel, status: r.status, ...t };
    } catch (e) {
      await new Promise((ok) => setTimeout(ok, 5000 * (forsok + 1)));
      if (forsok === 2) return { ok: false, status: 0, delar: [], rot: [], fel: String((e as Error).message).slice(0, 200) };
    }
  }
  return { ok: false, status: 0, delar: [], rot: [], fel: "tre försök" };
}
const klumpar = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

export type Hamtat = { linjer: Map<string, Pkt[][]>; anrop: number; fel: number; exempelFel: string; rot: Map<string, number>; andra: number };
async function hamta(nyckel: string, els: Element[]): Promise<Hamtat> {
  const h: Hamtat = { linjer: new Map(), anrop: 0, fel: 0, exempelFel: "", rot: new Map(), andra: 0 };
  const rakna = (s: Svar) => {
    h.anrop++;
    for (const r of s.rot) h.rot.set(r, (h.rot.get(r) ?? 0) + 1);
    if (!s.ok) { h.fel++; if (!h.exempelFel) h.exempelFel = `HTTP ${s.status} ${s.fel}`; }
    return s.ok;
  };
  const geom = (o: any) => wktLinjer(o?.Geometry?.["WKT-WGS84-3D"] ?? "");
  // Element och rutter: API:ets Element_Id → nycklarna i listan (samma element kan stå både naket och som rutt:).
  const tillNyckel = new Map<string, string[]>();
  for (const e of els) if (slag(e.element_id) !== "gata") {
    const id = nvdbId(e.element_id);
    (tillNyckel.get(id) ?? tillNyckel.set(id, []).get(id)!).push(e.element_id);
  }
  const ettPass = async (typ: string, ids: string[]) => {
    for (const k of klumpar(ids, PER_IN)) {
      const s = await skicka(nyckel, [fragaIn(typ, k)], [typ]);
      if (!rakna(s)) continue;
      const per = new Map<string, Pkt[][]>();
      for (const o of s.delar[0]) {
        const id = String(o?.Element_Id);
        if (levande(o) && tillNyckel.has(id)) (per.get(id) ?? per.set(id, []).get(id)!).push(...geom(o));
      }
      for (const [id, d] of per) { const l = linjer(d); if (l.length) for (const n of tillNyckel.get(id)!) if (!h.linjer.has(n)) h.linjer.set(n, l); }
    }
  };
  await ettPass("FunktionellVägklass", [...tillNyckel.keys()]);
  const kvar = [...tillNyckel.keys()].filter((id) => !tillNyckel.get(id)!.some((n) => h.linjer.has(n)));
  if (kvar.length) {
    const fore = h.linjer.size;
    await ettPass("Vägtrafiknät", kvar);
    h.andra = h.linjer.size - fore;
  }
  // Gatorna: tio QUERY per förfrågan; svar i hör till gatan i.
  for (const k of klumpar(els.filter((e) => slag(e.element_id) === "gata"), PER_GATA)) {
    const s = await skicka(nyckel, k.map(fragaGata), k.map(() => "Gatunamn"));
    if (!rakna(s)) continue;
    s.delar.forEach((objekt, i) => { const l = linjer(objekt.filter((o) => levande(o)).flatMap(geom)); if (l.length) h.linjer.set(k[i].element_id, l); });
  }
  return h;
}

// ---- utskriften ----
export function sammanfatta(els: Element[], ls: Map<string, Pkt[][]>) {
  const rad: string[] = [];
  const av = (xs: Element[]) => xs.flatMap((e) => (ls.has(e.element_id) ? e.punkter.map((p) => narmast(p, ls.get(e.element_id)!).d) : []));
  for (const s of ["element", "rutt", "gata"] as const) {
    const xs = els.filter((e) => slag(e.element_id) === s), med = xs.filter((e) => ls.has(e.element_id)), d = av(xs);
    const pp = xs.map((e) => e.punkter.length);
    rad.push(`${s}: ${xs.length} element, ${med.length} hämtade, ${xs.length - med.length} saknade; punkter per element median ${median(pp)}, högst ${Math.max(0, ...pp)}, ` +
      `${pp.filter((n) => n === 1).length} med en punkt; punkternas avstånd till linjen median ${median(d).toFixed(1)} m, över 25 m ${d.filter((x) => x > 25).length}, över 300 m ${d.filter((x) => x > 300).length} av ${d.length}`);
  }
  const bit: Record<string, { n: number; median: number; element: number }> = {};
  for (const l of ["B", "C"] as const) {
    const xs = els.filter((e) => e.lager === l && e.punkter.length >= 2 && ls.has(e.element_id));
    const v = xs.flatMap((e) => luckor(e.punkter, ls.get(e.element_id)!));
    bit[l] = { n: v.length, median: Math.round(median(v)), element: xs.length };
    rad.push(`lager ${l}: avståndet längs linjen mellan grannpunkter på samma element median ${bit[l].median} m (${v.length} avstånd på ${xs.length} element med minst två punkter)`);
  }
  return { rad, bit };
}

export const SATS = `INSERT INTO stadsgata (element_id, geom, hamtad_at)
  SELECT e, ST_Multi(ST_LineMerge(ST_SetSRID(ST_GeomFromGeoJSON(g), 4326))), now() FROM unnest($1::text[], $2::text[]) AS x(e, g)
  ON CONFLICT (element_id) DO UPDATE SET geom = EXCLUDED.geom, hamtad_at = EXCLUDED.hamtad_at`;

async function kor(lage: "prov" | "skriv", fil: string) {
  const nyckel = process.env.TRAFIKVERKET_API_KEY;
  if (!nyckel) throw new Error("TRAFIKVERKET_API_KEY saknas");
  if (lage === "skriv" && !process.env.DATABASE_URL) throw new Error("DATABASE_URL saknas");
  const els = element(JSON.parse(readFileSync(fil, "utf8")));
  const t0 = performance.now();
  const h = await hamta(nyckel, els);
  console.log(`STADENS GATOR (${lage}): ${els.length} element ur listan; ${h.anrop} förfrågningar, ${h.fel} fallna${h.exempelFel ? ` (exempel: ${h.exempelFel})` : ""}; ` +
    `rotelementen ${[...h.rot].map(([k, v]) => `${k} ×${v}`).join(", ")}; ${h.andra} element ur Vägtrafiknät; ${((performance.now() - t0) / 60_000).toFixed(1)} min`);
  const s = sammanfatta(els, h.linjer);
  for (const r of s.rad) console.log(`  ${r}`);
  if (h.fel > h.anrop * 0.02) throw new Error(`UNDERLAGSVAKT: ${h.fel} av ${h.anrop} förfrågningar föll — mer än 2 %, inget skrivs`);
  if (lage === "prov") {
    mkdirSync("stadsgator-ut", { recursive: true });
    const fc = { type: "FeatureCollection", features: [...h.linjer].map(([e, l]) => ({ type: "Feature", properties: { element_id: e }, geometry: { type: "MultiLineString", coordinates: l } })) };
    writeFileSync("stadsgator-ut/stadsgator.geojson.tmp", JSON.stringify(fc)); renameSync("stadsgator-ut/stadsgator.geojson.tmp", "stadsgator-ut/stadsgator.geojson");
    console.log(`prov: ${h.linjer.size} linjer i stadsgator-ut/stadsgator.geojson (artefakten); databasen är orörd`);
    return;
  }
  const url = process.env.DATABASE_URL!;
  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    let n = 0;
    for (const k of klumpar([...h.linjer], 500)) {
      n += (await c.query(SATS, [k.map(([e]) => e), k.map(([, l]) => JSON.stringify({ type: "MultiLineString", coordinates: l }))])).rowCount ?? 0;
    }
    await c.query("COMMIT");
    console.log(`skriv: ${n} rader i stadsgata`);
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally { c.release(); await pool.end(); }
}

function sjalvtest(): number {
  const fel: string[] = [];
  const ok = (v: boolean, t: string) => { if (!v) fel.push(t); };
  const els = element({ rader: [
    { punkt: "B00001", lager: "B", lon: 18, lat: 59.3, element_id: "1000:1" }, { punkt: "B00002", lager: "B", lon: 18.01, lat: 59.3, element_id: "1000:1" },
    { punkt: "C00001", lager: "C", lon: 18.05, lat: 59.33, element_id: "rutt:10133:2" }, { punkt: "C00002", lager: "C", lon: 18.06, lat: 59.33, element_id: "gata:Prov & Gata" }] });
  ok(els.length === 3 && els[0].punkter.length === 2 && slag("gata:x") === "gata" && slag("rutt:1:2") === "rutt" && slag("1:2") === "element" && nvdbId("rutt:10133:2") === "10133:2", "listans element");
  for (const [namn, r] of [["utan element_id", { lon: 18, lat: 59 }], ["okänt slag", { lon: 18, lat: 59, element_id: "väg 73" }]] as const) {
    try { element({ rader: [r] }); fel.push(`släppte igenom: ${namn}`); } catch { /* väntat */ }
  }
  ok(JSON.stringify(wktLinjer("LINESTRING Z (18 59 10, 18.1 59 11)")) === "[[[18,59],[18.1,59]]]", "wkt med Z");
  ok(wktLinjer("MULTILINESTRING Z ((18 59 1, 18.1 59 1), (18.2 59 1, 18.3 59 1))").length === 2 && wktLinjer("POINT (18 59)").length === 0, "wkt multi och punkt");
  // Två delar som möts i en ände blir en linje; en lika delsträcka åt andra hållet räknas en gång; en förgrening blir tre linjer.
  const a: Pkt[] = [[18, 59], [18.001, 59], [18.002, 59]], b: Pkt[] = [[18.002, 59], [18.003, 59.0000001]], bak: Pkt[] = [[18.001, 59], [18, 59]];
  const l1 = linjer([a, b, bak]);
  ok(l1.length === 1 && JSON.stringify(l1[0][0]) === "[18,59]" && JSON.stringify(l1[0][l1[0].length - 1]) === "[18.003,59]", `ihopfogning och avrundning: ${JSON.stringify(l1)}`);
  ok(l1[0].length === 2, "rak linje förenklas till sina ändar");
  const gren = linjer([a, b, [[18.002, 59], [18.002, 59.001]]]);
  ok(gren.length === 3, `förgrening ger tre linjer: ${gren.length}`);
  ok(forenkla([[18, 59], [18.0005, 59.0001], [18.001, 59]]).length === 3, "en krök på 11 m förenklas inte bort");
  const n = narmast([18.0015, 59.0001], l1);
  ok(Math.abs(n.d - 11.1) < 0.2 && Math.abs(n.langs - 0.0015 * M_LAT * kos(59)) < 1, `närmast: ${JSON.stringify(n)}`);
  const v = luckor([[18, 59], [18.002, 59], [18.001, 59.00001], [18.003, 59.01]], l1);
  ok(v.length === 2 && v.every((x) => Math.abs(x - 0.001 * M_LAT * kos(59)) < 1), `luckorna längs linjen (punkten 1 km bort räknas inte): ${JSON.stringify(v)}`);
  ok(median([3, 1, 2]) === 2 && median([1, 2, 3, 10]) === 2.5 && Number.isNaN(median([])), "median");
  const c = cirkel([[18, 59.3], [18.02, 59.3]]);
  ok(Math.abs(c.mitt[0] - 18.01) < 1e-9 && c.radie === 2100, `cirkeln: ${JSON.stringify(c)}`);
  const q = fragaGata(els[2]);
  ok(q.includes(`value="Prov &amp; Gata"`) && q.includes(`objecttype="Gatunamn"`) && q.includes(`<AND><EQ name="Namn"`) && q.includes(`radius="1500m"`), `gatans fråga: ${q}`);
  ok(fragaIn("FunktionellVägklass", ["1000:1", "10133:2"]).includes(`<IN name="Element_Id" value="1000:1,10133:2"/>`), "IN-frågan");
  const t = tolka(JSON.stringify({ RESPONSE: { RESULT: [{ Gatunamn: [{ Element_Id: "1:1" }] }, {}, { ERROR: { MESSAGE: "Invalid" } }] } }), ["Gatunamn", "Gatunamn", "Gatunamn"]);
  ok(t.rot.join(";") === "Gatunamn;(tomt);ERROR" && t.delar[0].length === 1 && t.delar[1].length === 0 && t.fel === "Invalid", `rotelementen och felet: ${JSON.stringify(t)}`);
  ok(tolka(JSON.stringify({ RESPONSE: { RESULT: [{ Gatunamn: Array(TAK).fill({}) }] } }), ["Gatunamn"]).fel.startsWith("taket"), "taket nått fäller svaret");
  ok(levande({ Deleted: false }, 0) && !levande({ Deleted: true }, 0) && !levande({ Valid_To: "2020-01-01" }, Date.parse("2026-11-21")), "levande");
  const s = sammanfatta(els, new Map([["1000:1", [[[18, 59.3], [18.02, 59.3]]] as Pkt[][]]]));
  ok(s.bit.B.n === 1 && Math.abs(s.bit.B.median - 568) <= 1 && s.bit.C.n === 0 && s.rad[0].includes("1 hämtade, 0 saknade") && s.rad[1].includes("1 element, 0 hämtade, 1 saknade"), `sammanfattningen: ${JSON.stringify(s)}`);
  ok(!/särdrag|adt|klass|vinterklass|population|kommun/i.test(s.rad.join(" ")), "utskriften bär inga särdrag");
  ok(SATS.startsWith("INSERT INTO stadsgata") && SATS.includes("ON CONFLICT (element_id)") && !/stadspunkt\b|vagpunkt/.test(SATS), "satsen rör bara stadsgata");
  console.log(`självtest stadsgator-hamta: ${fel.length ? "FEL" : "klart"}`);
  for (const f of fel) console.log(`  ${f}`);
  return fel.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [kmd, fil] = process.argv.slice(2);
  if (kmd === "--sjalvtest") process.exit(sjalvtest());
  else if (kmd === "prov" || kmd === "skriv") kor(kmd, fil ?? LISTA).catch((e) => { console.error(`stadsgator: ${String(e?.message ?? e).slice(0, 300)}`); process.exit(1); });
  else { console.error("prov [lista], skriv [lista] eller --sjalvtest"); process.exit(2); }
}
