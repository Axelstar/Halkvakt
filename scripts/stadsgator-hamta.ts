// STADENS GATOR — rekognoseringen (första varvet). Läser bara; skriver inget i databasen. Skrivs om till hämtaren när svaren är lästa.
//   TRAFIKVERKET_API_KEY=... node --experimental-strip-types scripts/stadsgator-hamta.ts rekognosering [kuvos/stadspunkter-drift-2026-27.json]
import { readFileSync } from "node:fs";

const KEY = process.env.TRAFIKVERKET_API_KEY;
const API = "https://api.trafikinfo.trafikverket.se/v2/data.json";
const UA = "Halkvakt-stadsgator/0.1 (+https://github.com/Axelstar/Halkvakt)";
const GEO = "Geometry.WKT-WGS84-3D";
const NS = "Vägdata.NVDB_DK_O", VER = "1.2";
const PAUS_MS = 500;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const vila = () => new Promise((ok) => setTimeout(ok, PAUS_MS));

type Svar = { ok: boolean; status: number; rot: string; objekt: any[]; fel: string };
async function fraga(typ: string, filter: string, limit: number, extra = ""): Promise<Svar> {
  const body = `<REQUEST><LOGIN authenticationkey="${esc(KEY!)}"/><QUERY objecttype="${typ}" namespace="${NS}" schemaversion="${VER}" limit="${limit}">` +
    `<FILTER>${filter}</FILTER>${extra}</QUERY></REQUEST>`;
  for (let forsok = 0; forsok < 3; forsok++) {
    try {
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "text/xml", "User-Agent": UA }, body });
      const txt = await r.text();
      await vila();
      if (!r.ok) {
        if (r.status >= 500 || r.status === 429) { await new Promise((ok) => setTimeout(ok, 5000 * (forsok + 1))); continue; }
        return { ok: false, status: r.status, rot: "", objekt: [], fel: txt.replace(/\s+/g, " ").slice(0, 300) };
      }
      const res = JSON.parse(txt)?.RESPONSE?.RESULT?.[0] ?? {};
      return { ok: true, status: r.status, rot: Object.keys(res).join(",") || "(tomt)", objekt: res[typ] ?? [], fel: "" };
    } catch (e) {
      await new Promise((ok) => setTimeout(ok, 5000 * (forsok + 1)));
      if (forsok === 2) return { ok: false, status: 0, rot: "", objekt: [], fel: String((e as Error).message).slice(0, 200) };
    }
  }
  return { ok: false, status: 0, rot: "", objekt: [], fel: "tre försök" };
}

/** WKT (LINESTRING/MULTILINESTRING, med eller utan Z) → delar med [lon, lat]. */
export function wktLinjer(wkt: string): [number, number][][] {
  const typ = /^\s*(MULTI)?LINESTRING/i.exec(wkt ?? "");
  if (!typ) return [];
  return [...String(wkt).matchAll(/\(([^()]+)\)/g)].map((m) => m[1].split(",").map((p) => {
    const [x, y] = p.trim().split(/\s+/).map(Number);
    return [x, y] as [number, number];
  })).filter((d) => d.length >= 2 && d.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)));
}
const M_LAT = 111_132;
const meter = (lat0: number) => ({ x: (lon: number) => lon * M_LAT * Math.cos(lat0 * Math.PI / 180), y: (lat: number) => lat * M_LAT });
export function langd(delar: [number, number][][]): number {
  let s = 0;
  for (const d of delar) for (let i = 1; i < d.length; i++) {
    const m = meter(d[i][1]);
    s += Math.hypot(m.x(d[i][0]) - m.x(d[i - 1][0]), m.y(d[i][1]) - m.y(d[i - 1][1]));
  }
  return s;
}
/** Kortaste avståndet i meter från en punkt till delarna. */
export function avstand(lon: number, lat: number, delar: [number, number][][]): number {
  const m = meter(lat), px = m.x(lon), py = m.y(lat);
  let best = Infinity;
  for (const d of delar) for (let i = 1; i < d.length; i++) {
    const ax = m.x(d[i - 1][0]), ay = m.y(d[i - 1][1]), bx = m.x(d[i][0]), by = m.y(d[i][1]);
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
    best = Math.min(best, Math.hypot(px - (ax + t * dx), py - (ay + t * dy)));
  }
  return best;
}
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const r1 = (x: number) => Math.round(x * 10) / 10;

async function rekognosering(fil: string) {
  if (!KEY) throw new Error("TRAFIKVERKET_API_KEY saknas");
  const lista = JSON.parse(readFileSync(fil, "utf8"));
  const rader: { lager: string; lon: number; lat: number; element_id: string }[] = lista.rader ?? [];
  const slag = (e: string) => (e.startsWith("gata:") ? "gata" : e.startsWith("rutt:") ? "rutt" : "nvdb");
  const perEl = new Map<string, { lager: string; p: [number, number][] }>();
  for (const r of rader) {
    if (!r.element_id) continue;
    const x = perEl.get(r.element_id) ?? { lager: r.lager, p: [] };
    x.p.push([r.lon, r.lat]); perEl.set(r.element_id, x);
  }
  console.log(`listan: ${rader.length} punkter, ${perEl.size} element (${["nvdb", "rutt", "gata"].map((s) => `${s} ${[...perEl.keys()].filter((e) => slag(e) === s).length}`).join(", ")}), ${rader.filter((r) => !r.element_id).length} utan element_id`);

  // R1: vilka objekttyper finns, och vilka fält bär de (bara namn och typ, inga värden).
  const fakt: Record<string, string[]> = {};
  for (const typ of ["Väghållare", "FunktionellVägklass", "Gatunamn", "Vägtrafiknät", "Länk", "Vägnummer", "Gatutyp"]) {
    const s = await fraga(typ, `<EQ name="Deleted" value="false"/>`, 1);
    const o = s.objekt[0];
    fakt[typ] = o ? Object.keys(o) : [];
    console.log(`R1 ${typ}: status ${s.status}, rotelement ${s.rot || "-"}, ${s.objekt.length} objekt${o ? `; fälten ${Object.entries(o).map(([k, v]) => `${k}:${typeof v === "object" && v ? `{${Object.keys(v).join("/")}}` : typeof v}`).join(", ")}` : ""}${s.fel ? `; fel ${s.fel}` : ""}`);
    if (o?.Geometry) console.log(`   geometrins form: ${Object.entries(o.Geometry).map(([k, v]) => `${k}=${String(v).slice(0, 22)}…`).join(" ")}`);
  }

  // R2: element ur listan med filter på Element_Id — ett åt gången (EQ) och tio i en förfrågan (IN).
  const nvdb = [...perEl.entries()].filter(([e]) => slag(e) === "nvdb"), rutt = [...perEl.entries()].filter(([e]) => slag(e) === "rutt");
  const urval = (xs: typeof nvdb, n: number) => xs.filter((_, i) => i % Math.max(1, Math.floor(xs.length / n)) === 0).slice(0, n);
  const id = (e: string) => e.replace(/^rutt:/, "");
  for (const typ of ["Väghållare", "FunktionellVägklass"]) {
    for (const [namn, xs] of [["B (nvdb)", urval(nvdb, 10)], ["C (rutt:)", urval(rutt, 10)]] as const) {
      const ut: { obj: number; m: number; d: number[] }[] = [];
      for (const [e, x] of xs) {
        const s = await fraga(typ, `<EQ name="Element_Id" value="${esc(id(e))}"/>`, 200, `<INCLUDE>Element_Id</INCLUDE><INCLUDE>${GEO}</INCLUDE><INCLUDE>Deleted</INCLUDE><INCLUDE>Valid_To</INCLUDE>`);
        if (!s.ok) { console.log(`R2 ${typ} EQ ${namn}: status ${s.status}, fel ${s.fel}`); break; }
        const delar = s.objekt.filter((o) => o.Deleted !== true).flatMap((o) => wktLinjer(o?.Geometry?.["WKT-WGS84-3D"] ?? ""));
        ut.push({ obj: s.objekt.length, m: langd(delar), d: x.p.map(([lon, lat]) => (delar.length ? avstand(lon, lat, delar) : Infinity)) });
      }
      const med = ut.filter((u) => u.obj > 0), d = med.flatMap((u) => u.d);
      console.log(`R2 ${typ} EQ ${namn}: ${med.length} av ${ut.length} element gav objekt; objekt per element ${med.map((u) => u.obj).join("/")}; ` +
        `längd per element median ${Math.round(median(med.map((u) => u.m)))} m; punkternas avstånd till linjen median ${r1(median(d))} m, största ${r1(Math.max(...d, 0))} m, över 25 m ${d.filter((x) => x > 25).length} av ${d.length}`);
      const s = await fraga(typ, `<IN name="Element_Id" value="${esc(xs.map(([e]) => id(e)).join(","))}"/>`, 2000, `<INCLUDE>Element_Id</INCLUDE><INCLUDE>${GEO}</INCLUDE>`);
      const sedda = new Set(s.objekt.map((o) => String(o.Element_Id)));
      console.log(`R2 ${typ} IN ${namn}: status ${s.status}, rotelement ${s.rot || "-"}, ${s.objekt.length} objekt på ${sedda.size} av ${xs.length} element${s.fel ? `; fel ${s.fel}` : ""}`);
    }
  }

  // R3: gatorna (gata:<namn>) — Gatunamn med namnet, nära gatans första punkt.
  const gator = urval([...perEl.entries()].filter(([e]) => slag(e) === "gata"), 10);
  const namnFalt = (fakt["Gatunamn"] ?? []).filter((k) => /namn/i.test(k));
  console.log(`R3 Gatunamn: fält med namn i: ${namnFalt.join(", ") || "(inga)"}`);
  for (const f of namnFalt) {
    const ut: { obj: number; el: number; m: number; d: number[] }[] = [];
    for (const [e, x] of gator) {
      const [lon, lat] = x.p[0];
      const filter = `<AND><EQ name="${f}" value="${esc(e.slice(5))}"/><INTERSECTS name="${GEO}" shape="center" value="${lon.toFixed(5)} ${lat.toFixed(5)}" radius="3000m"/></AND>`;
      const s = await fraga("Gatunamn", filter, 500, `<INCLUDE>Element_Id</INCLUDE><INCLUDE>${GEO}</INCLUDE><INCLUDE>Deleted</INCLUDE>`);
      if (!s.ok) { console.log(`R3 Gatunamn ${f}: status ${s.status}, fel ${s.fel}`); break; }
      const delar = s.objekt.filter((o) => o.Deleted !== true).flatMap((o) => wktLinjer(o?.Geometry?.["WKT-WGS84-3D"] ?? ""));
      ut.push({ obj: s.objekt.length, el: new Set(s.objekt.map((o) => String(o.Element_Id))).size, m: langd(delar), d: x.p.map(([a, b]) => (delar.length ? avstand(a, b, delar) : Infinity)) });
    }
    const med = ut.filter((u) => u.obj > 0), d = med.flatMap((u) => u.d);
    console.log(`R3 Gatunamn ${f}: ${med.length} av ${ut.length} gator gav objekt; objekt per gata ${med.map((u) => u.obj).join("/")}; element per gata ${med.map((u) => u.el).join("/")}; ` +
      `längd per gata median ${Math.round(median(med.map((u) => u.m)))} m; punkternas avstånd median ${r1(median(d))} m, största ${r1(Math.max(...d, 0))} m, över 25 m ${d.filter((x) => x > 25).length} av ${d.length}`);
  }
  // R4: punkt och radie (30 m) på Väghållare vid gatornas punkter — hur många element träffas.
  const ut: number[] = [];
  for (const [, x] of gator) {
    const [lon, lat] = x.p[0];
    const s = await fraga("Väghållare", `<INTERSECTS name="${GEO}" shape="center" value="${lon.toFixed(5)} ${lat.toFixed(5)}" radius="30m"/>`, 50, `<INCLUDE>Element_Id</INCLUDE>`);
    ut.push(new Set(s.objekt.map((o) => String(o.Element_Id))).size);
  }
  console.log(`R4 Väghållare inom 30 m från gatornas punkter: element per punkt ${ut.join("/")}`);
}

const [kmd, fil] = process.argv.slice(2);
if (kmd === "rekognosering") rekognosering(fil ?? "kuvos/stadspunkter-drift-2026-27.json").catch((e) => { console.error(`stadsgator: ${String(e?.message ?? e).slice(0, 300)}`); process.exit(1); });
else { console.error("rekognosering [fil]"); process.exit(2); }
