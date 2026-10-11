// RAPPORTFILEN OCH FAVORITPROVET (favoriterna, DECISIONS #529). Ren logik, inget I/O — Deno-kopplingen bor i
// supabase/functions/favoritprov/main.ts, och index.ts där är genererad av scripts/bundle-favoritprov.ts.
//
// 1. byggRapport: det lägesfilen saknar, ur Trafikverkets öppna API när filen byggs (ingen ny tabell, docs/FAVORITER.html §7):
//    stationernas namn och lufttemperatur, olyckornas och djurens text, hinder, kömeddelanden, vägarbeten, hastigheter, omledningar,
//    restider och färjor. Delad i en SNABB del (statusar, punkter, texter) och en LÅNGSAM (linjerna), så att linjerna bara skrivs när
//    de ändras (§7: annars ~17 MB om dygnet i en historik).
// 2. favoritRapport: det fliken skulle visa för en sparad rutt, ur lägesfilen och rapportfilen, i favoritsidans viktordning (§3).
//    Urvalet längs rutten är motorns farorLangsRutten (#528). Avstånden per slag är PROVMILJÖNS parametrar (MARGINALER nedan), inte
//    appens trösklar: de hör till Axels form och skrivs som trösklar först då.
// Allt är Trafikverkets och SMHI:s öppna data. Ingen rutt för en verklig förare finns här — provets rutter är skuggans.
import { farorLangsRutten } from "../engine/src/rutfilter.ts";
import type { Hazard } from "../engine/src/types.ts";
import type { LiveDoc, StaticDoc } from "../engine/src/snapshot.ts";
import { DEFAULT_CONFIG } from "../engine/src/types.ts";

export type Linje = [number, number][];
export type Slag = "frysrisk" | "halka" | "olycka" | "hinder" | "vilt" | "ko" | "restid" | "vagarbete" | "hastighet" | "omledning"
  | "farja" | "kamera" | "smhi";
/** Favoritsidans viktordning (docs/FAVORITER.html §3, punkt 3): halka och frysrisk först, SMHI sist. */
export const ORDNING: Slag[] = ["halka", "frysrisk", "olycka", "hinder", "vilt", "ko", "restid", "vagarbete", "hastighet", "omledning",
  "farja", "kamera", "smhi"];
export const RUBRIK: Record<Slag, string> = { halka: "halt väglag på sträckorna", frysrisk: "frysrisk vid stationerna", olycka: "olyckor",
  hinder: "hinder", vilt: "vilt", ko: "köer", restid: "restider", vagarbete: "vägarbeten", hastighet: "hastighet",
  omledning: "omledningar", farja: "färjor", kamera: "fartkameror", smhi: "SMHI-varningar" };

/** Provmiljöns avstånd till rutten per slag, i meter (DECISIONS #529). Provets rutter är skuggans: raka sträckor mellan
 *  brytpunkter, inte vägens geometri — därför 1,5 km. En riktig sparad rutt följer GPS-spåret, och Axels form sätter de riktiga. */
export const MARGINALER: Record<Slag, number> = { halka: 1500, frysrisk: 2000, olycka: 1500, hinder: 1500, vilt: 1500, ko: 1500,
  restid: 1500, vagarbete: 1500, hastighet: 1500, omledning: 1500, farja: 2000, kamera: 1500, smhi: 0 };

/** En post i rapportfilens snabba del. `p` en punkt, `l` id för en linje i den långsamma delen. */
export type Post = { id: string; slag: Slag; rubrik: string; text: string; p?: [number, number]; l?: string; [k: string]: unknown };
export type Rapport = { schema: 1; generated_at: string; poster: Post[]; noter: string[];
  stationer: Record<string, { namn: string; luft: number | null }> };
export type Linjer = { schema: 1; generated_at: string; linjer: Record<string, Linje[]> };

// ── Trafikverkets geometri ──────────────────────────────────────────────────────────────────────────────────────────────────
const tal = (s: string) => Math.round(Number(s) * 1e5) / 1e5;
export function punktUr(wkt: unknown): [number, number] | null {
  const m = /POINT\s*Z?\s*\(\s*([-\d.]+)\s+([-\d.]+)/.exec(String(wkt ?? ""));
  return m ? [tal(m[1]), tal(m[2])] : null;
}
/** LINESTRING och MULTILINESTRING (även med Z) till en lista av linjer. */
export function linjerUr(wkt: unknown): Linje[] {
  const s = String(wkt ?? "");
  if (!/LINESTRING/.test(s)) return [];
  return [...s.matchAll(/\(([^()]+)\)/g)].map((m) => m[1].split(",").map((par) => {
    const [x, y] = par.trim().split(/\s+/); return [tal(x), tal(y)] as [number, number];
  })).filter((l) => l.length >= 2);
}

const ren = (s: unknown, n = 140) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const klocka = (iso: unknown) => {
  const t = Date.parse(String(iso ?? "")); if (!Number.isFinite(t)) return null;
  return new Date(t).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" });
};
const datum = (iso: unknown) => {
  const t = Date.parse(String(iso ?? "")); if (!Number.isFinite(t)) return null;
  return new Date(t).toLocaleDateString("sv-SE", { day: "numeric", month: "long", timeZone: "Europe/Stockholm" });
};
const VAGARBETE = new Set(["MaintenanceWorks", "RoadOrCarriagewayOrLaneManagement"]);
const HINDER = new Set(["obstructionOnTheRoad", "objectOnTheRoad", "brokenDownVehicle"]);
const HASTIGHET = /hastighet|speedRestriction/i, OMLEDNING = /omled|divers|detour/i;   // som mätningen #528, efter rättelsen

/** Vilket slag en aktiv avvikelse är, eller null. Olyckor och djur finns redan i lägesfilen; här får de text och plats. */
export function slagFor(d: any): Slag | null {
  const kod = `${d.MessageCode ?? ""} ${d.MessageCodeValue ?? ""}`;
  if (d.MessageTypeValue === "Accident") return "olycka";
  if (d.MessageTypeValue === "AnimalPresenceObstruction" || d.MessageCodeValue === "animalsOnTheRoad") return "vilt";
  if (d.MessageTypeValue === "AbnormalTraffic") return "ko";
  if (HINDER.has(d.MessageCodeValue)) return "hinder";
  if (OMLEDNING.test(kod) || OMLEDNING.test(String(d.TemporaryLimit ?? ""))) return "omledning";
  if (HASTIGHET.test(String(d.TemporaryLimit ?? "")) || HASTIGHET.test(kod)) return "hastighet";
  if (VAGARBETE.has(d.MessageTypeValue)) return "vagarbete";
  return null;
}

export type In = {
  nu: number;
  situationer: any[];                       // Situation 1.6
  restider: any[];                          // TravelTimeRoute 1.6
  farjor: any[];                            // FerryAnnouncement 1.2, de närmaste 24 timmarna
  farjeleder: any[];                        // FerryRoute 1.2
  stationer: { id: string; namn: string; luft: number | null }[];   // weather_latest
};

/** Rapportfilens två delar ur Trafikverkets svar. Rena data; texten är Trafikverkets egen, bara kortad. */
export function byggRapport(x: In): { snabb: Rapport; lang: Linjer } {
  const iso = new Date(x.nu).toISOString();
  const poster: Post[] = [], linjer: Record<string, Linje[]> = {}, noter: string[] = [];
  for (const s of x.situationer) for (const d of s.Deviation ?? []) {
    if (s.Deleted || d.Deleted || d.Suspended) continue;
    const start = d.StartTime ? Date.parse(d.StartTime) : -Infinity, slut = d.EndTime ? Date.parse(d.EndTime) : Infinity;
    if (!(start <= x.nu && x.nu < slut)) continue;
    const slag = slagFor(d); if (!slag) continue;
    const p = punktUr(d.Geometry?.Point?.WGS84), l = linjerUr(d.Geometry?.Line?.WGS84);
    if (!p && !l.length) continue;
    const id = `dev:${d.Id}`;
    if (l.length) linjer[id] = l;
    const vag = ren(d.RoadNumber, 20) || null, plats = ren(d.LocationDescriptor, 120) || null;
    const rubrik = slag === "hastighet" ? (ren(d.TemporaryLimit, 60) || "Tillfälligt nedsatt hastighet")
      : slag === "omledning" ? "Omledning" : ren(d.MessageCode, 60) || RUBRIK[slag];
    const delar = [ren(d.Header ?? d.Message, 160), d.NumberOfLanesRestricted ? `${d.NumberOfLanesRestricted} körfält avstängda` : "",
      d.SeverityText ? ren(d.SeverityText, 40).toLowerCase() : "",
      d.ValidUntilFurtherNotice ? "tills vidare" : d.EndTime && slag !== "olycka" ? `till ${datum(d.EndTime)}` : "",
      slag === "olycka" || slag === "ko" || slag === "hinder" ? `rapporterad ${klocka(d.StartTime ?? d.CreationTime) ?? "–"}` : ""].filter(Boolean);
    poster.push({ id, slag, rubrik, text: delar.join(" · "), ...(p ? { p } : {}), ...(l.length ? { l: id } : {}), vag, plats,
      start: d.StartTime ?? null, slut: d.EndTime ?? null, sev: d.SeverityCode ?? null });
  }
  for (const r of x.restider) {
    const l = linjerUr(r.Geometry?.WGS84); if (!l.length) continue;
    const id = `tt:${r.Id}`; linjer[id] = l;
    const tid = Number(r.TravelTime), normal = Number(r.FreeFlowTravelTime);
    const min = (s: number) => Math.round(s / 60);
    const extra = Number.isFinite(tid) && Number.isFinite(normal) ? min(tid) - min(normal) : null;
    poster.push({ id, slag: extra !== null && extra >= 2 ? "ko" : "restid", rubrik: ren(r.Name, 80) || "Restidssträcka",
      text: Number.isFinite(tid) ? `${min(tid)} minuter, normalt ${Number.isFinite(normal) ? min(normal) : "–"}` : "restid saknas",
      l: id, status: r.TrafficStatus ?? null, extraMin: extra, matt: r.MeasureTime ?? null });
  }
  const ledLinje = new Map<string, string>();
  for (const f of x.farjeleder) {
    const l = linjerUr(f.Geometry?.WGS84); if (!l.length) continue;
    const id = `led:${f.Id}`; linjer[id] = l; ledLinje.set(String(f.Id), id);
  }
  if (x.farjeleder.length && !ledLinje.size) noter.push(`färjelederna saknar geometri (${Object.keys(x.farjeleder[0] ?? {}).join(", ")})`);
  const perLed = new Map<string, any[]>();
  for (const a of x.farjor) {
    if (a.Deleted) continue;
    const led = String(a.Route?.Id ?? ""); const l = perLed.get(led) ?? []; l.push(a); perLed.set(led, l);
  }
  for (const [led, avg] of perLed) {
    const lid = ledLinje.get(led); if (!lid) continue;
    avg.sort((a, b) => Date.parse(a.DepartureTime) - Date.parse(b.DepartureTime));
    const nasta = avg.slice(0, 3).map((a) => `${klocka(a.DepartureTime)} från ${ren(a.FromHarbor?.Name, 40)}`);
    poster.push({ id: `farja:${led}`, slag: "farja", rubrik: ren(avg[0].Route?.Name, 60) || "Färja", text: `nästa ${nasta.join(", ")}`,
      l: lid, avgangar24h: avg.length });
  }
  const stationer = Object.fromEntries(x.stationer.map((s) => [s.id, { namn: s.namn, luft: s.luft }]));
  return { snabb: { schema: 1, generated_at: iso, poster, noter, stationer }, lang: { schema: 1, generated_at: iso, linjer } };
}

// ── Favoritprovet: det fliken skulle visa för en rutt ───────────────────────────────────────────────────────────────────────
export type Rad = { id: string; slag: Slag; rubrik: string; text: string; avstandM: number; langsM: number };

const grader = (v: number | null | undefined) => v == null ? "–" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1).replace(".", ",")} °C`;
/** Punkt i polygon (GeoJSON-ringar, jämn–udda), för SMHI:s områden. */
function iRing(x: number, y: number, ring: number[][]): boolean {
  let inne = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inne = !inne;
  }
  return inne;
}
function polygonTraffar(geom: any, rutt: Linje): boolean {
  const polys: number[][][][] = geom?.type === "Polygon" ? [geom.coordinates] : geom?.type === "MultiPolygon" ? geom.coordinates : [];
  // Rutten provas var 0,02:e grad (~1–2 km): räcker för ett länsstort område.
  for (let i = 0; i < rutt.length - 1; i++) {
    const [ax, ay] = rutt[i], [bx, by] = rutt[i + 1]; const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.02));
    for (let k = 0; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n;
      if (polys.some((poly) => iRing(x, y, poly[0]) && !poly.slice(1).some((hal) => iRing(x, y, hal)))) return true;
    }
  }
  return false;
}

/** Det fliken skulle visa för rutten: rader i viktordning, inom slagets ordning i körordning. */
export function favoritRapport(rutt: Linje, live: LiveDoc, stat: StaticDoc, snabb: Rapport, lang: Linjer,
  marginal: Record<Slag, number> = MARGINALER): Rad[] {
  // Varje kandidat har en eller flera geometrier: en punkt, eller linjens delar var för sig (en multilinje sammanfogad till en linje
  // skulle få en falsk sträcka mellan delarna, som kan korsa rutten). Den närmaste delen räknas.
  const kand: { id: string; slag: Slag; rubrik: string; text: string; geo: Hazard[] }[] = [];
  const pkt = (id: string, lon: number, lat: number) => [{ id, kind: "accident", lon, lat } as Hazard];
  const lin = (id: string, delar: Linje[]) => delar.filter((l) => l.length >= 2).map((line, i) => ({ id: `${id}#${i}`, kind: "slippery_segment", line } as Hazard));
  const st = snabb.stationer;
  const cfg = DEFAULT_CONFIG;
  for (const s of live.segments) kand.push({ id: `seg:${s.id}`, slag: "halka", rubrik: `Halt väglag${s.road ? ` på ${s.road}` : ""}`,
    text: s.info.join(", ") || "halka rapporterad på sträckan", geo: lin(`seg:${s.id}`, [s.line]) });
  for (const w of live.weather) {
    const t = w.yta, frys = t != null && t <= 1 && w.fukt;
    // S3 (#524): samma villkor som motorn, med motorns startvärden.
    const beta = !frys && t != null && w.regn_h != null && w.lutning30 != null && t >= cfg.efterhalkaYtaMinC && t <= cfg.efterhalkaYtaMaxC
      && w.lutning30 >= cfg.efterhalkaFall30C && w.regn_h <= cfg.efterhalkaRegnH;
    if (!frys && !beta) continue;
    const namn = st[w.id]?.namn;
    kand.push({ id: `wx:${w.id}`, slag: "frysrisk", rubrik: `Frysrisk vid stationen${namn ? ` i ${namn}` : ""}${beta ? " (beta)" : ""}`,
      text: `Vägytan ${grader(t)}, luften ${grader(st[w.id]?.luft)}${w.fukt ? ", fukt på vägbanan" : ""}${beta ? ", efter regnet" : ""}`,
      geo: pkt(`wx:${w.id}`, w.lon, w.lat) });
  }
  for (const b of live.bridges ?? []) if (b.yta != null && b.yta <= 3 && b.fukt) kand.push({ id: `bro:${b.id}`, slag: "frysrisk",
    rubrik: `Frysrisk på bron${b.road ? ` på ${b.road}` : ""}`, text: `närmaste station ${grader(b.yta)}`, geo: pkt(`bro:${b.id}`, b.lon, b.lat) });
  for (const c of stat.cameras) kand.push({ id: `cam:${c.id}`, slag: "kamera", rubrik: "Fartkamera", text: c.road ?? "",
    geo: pkt(`cam:${c.id}`, c.lon, c.lat) });
  for (const p of snabb.poster) {
    const geo = p.l ? lin(p.id, lang.linjer[p.l] ?? []) : p.p ? pkt(p.id, p.p[0], p.p[1]) : [];
    if (geo.length) kand.push({ id: p.id, slag: p.slag, rubrik: p.rubrik, text: p.text, geo });
  }
  const rader: Rad[] = [];
  for (const k of kand) {
    const traff = farorLangsRutten(k.geo, rutt, marginal[k.slag]).sort((a, b) => a.avstandM - b.avstandM)[0];
    if (traff) rader.push({ id: k.id, slag: k.slag, rubrik: k.rubrik, text: k.text, avstandM: Math.round(traff.avstandM), langsM: Math.round(traff.langsM) });
  }
  for (const w of live.smhi as any[]) if (polygonTraffar(w.geom, rutt)) rader.push({ id: `smhi:${w.id}:${w.event}`, slag: "smhi",
    rubrik: `SMHI: ${w.event ?? "varning"}`, text: `nivå ${w.niva ?? "–"}`, avstandM: 0, langsM: 0 });
  return rader.sort((a, b) => ORDNING.indexOf(a.slag) - ORDNING.indexOf(b.slag) || a.langsM - b.langsM || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Det som är nytt sedan förra kollen: id som inte fanns då. Första kollen har inget nytt. */
export function nyttSedan(fore: Rad[] | null, nu: Rad[]): string[] {
  if (!fore) return [];
  const fanns = new Set(fore.map((r) => r.id));
  return nu.filter((r) => !fanns.has(r.id)).map((r) => r.id);
}

/** Det tomma på en rad (§3, punkt 4): slagen utan något, i viktordning. Köerna mäts bara där en restidssträcka går längs rutten. */
export function tomma(rader: Rad[]): { inget: Slag[]; koerMatsInte: boolean } {
  const finns = new Set(rader.map((r) => r.slag));
  return { inget: ORDNING.filter((s) => !finns.has(s) && s !== "restid"), koerMatsInte: !rader.some((r) => r.id.startsWith("tt:")) };
}
