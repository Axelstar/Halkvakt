// RAPPORTFILEN OCH FAVORITPROVET (favoriterna, DECISIONS #529). Ren logik, inget I/O — Deno-kopplingen bor i
// supabase/functions/favoritprov/main.ts (testmiljön) och supabase/functions/favoriter/main.ts (appens fil, DECISIONS #617), och
// index.ts där är genererade av scripts/bundle-favoritprov.ts och scripts/bundle-favoriter.ts.
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
import { haversineM, samplePolyline } from "../engine/src/geo.ts";

export type Linje = [number, number][];
export type Slag = "frysrisk" | "halka" | "olycka" | "hinder" | "vilt" | "ko" | "restid" | "vagarbete" | "hastighet" | "omledning"
  | "farja" | "kamera" | "smhi";
/** Favoritsidans viktordning (docs/FAVORITER.html §3, punkt 3): halka och frysrisk först, SMHI sist. */
export const ORDNING: Slag[] = ["halka", "frysrisk", "olycka", "hinder", "vilt", "ko", "restid", "vagarbete", "hastighet", "omledning",
  "farja", "kamera", "smhi"];
export const RUBRIK: Record<Slag, string> = { halka: "halt väglag på sträckorna", frysrisk: "frysrisk vid stationerna", olycka: "olyckor",
  hinder: "hinder", vilt: "vilt", ko: "köer", restid: "restider", vagarbete: "vägarbeten", hastighet: "hastighet",
  omledning: "omledningar", farja: "färjor", kamera: "fartkameror", smhi: "SMHI-varningar" };

/** Provmiljöns avstånd till rutten per slag, i meter, när rutten följer vägen (OSRM på OpenStreetMap, kort #338, DECISIONS #531):
 *  linjer och kameror 100 m (Trafikverkets och OpenStreetMaps vägmitt skiljer några tiotal meter, och en motorvägs körbanor ligger
 *  isär), olyckor, hinder och djur 150 m, stationer och färjor 500 m (en station står vid vägen, en färjeled är en punkt mitt i
 *  överfarten). Sedan DECISIONS #637 är de också appens trösklar, i Swift och Kotlin, och kontraktsgrinden vaktar kopiorna. */
export const MARGINALER: Record<Slag, number> = { halka: 100, frysrisk: 500, olycka: 150, hinder: 150, vilt: 150, ko: 100,
  restid: 100, vagarbete: 100, hastighet: 100, omledning: 100, farja: 500, kamera: 100, smhi: 0 };
/** Avstånden för raka rutter, som skuggans brytpunkter (DECISIONS #529): 1,5 km, 2 km för stationer och färjor. */
export const MARGINALER_RAKA: Record<Slag, number> = { halka: 1500, frysrisk: 2000, olycka: 1500, hinder: 1500, vilt: 1500, ko: 1500,
  restid: 1500, vagarbete: 1500, hastighet: 1500, omledning: 1500, farja: 2000, kamera: 1500, smhi: 0 };
/** En LINJE ligger längs rutten först när minst LANGS_ANDEL av den, eller LANGS_MINST_M, ligger inom marginalen — en väg som bara
 *  korsar rutten är 0 m från den i korsningen, och då hade varje vägarbete och restidssträcka på en tvärväg kommit med (#531). */
export const LANGS_ANDEL = 0.5, LANGS_MINST_M = 500, LANGS_STEG_M = 100;

/** En post i rapportfilens snabba del (schema 2, #530). `t` är Trafikverkets egen rubrik; körfält, gräns, slut och restid är fält,
 *  och den läsbara texten sätts ihop av visning() — som appen skulle göra. `p` en punkt, `l` id för en linje i den långsamma delen. */
export type Post = { id: string; slag: Slag; rubrik: string; t?: string; p?: [number, number]; l?: string; vag?: string | null;
  start?: string | null; slut?: string | null; korfalt?: number; grans?: number; sev?: number | null; tid?: number; normal?: number;
  status?: string | null; text?: string; [k: string]: unknown };
export type Rapport = { schema: 2; generated_at: string; poster: Post[]; noter: string[];
  stationer: Record<string, { namn: string; luft: number | null }> };
export type Linjer = { schema: 2; generated_at: string; linjer: Record<string, Linje[]> };

// ── Trafikverkets geometri ──────────────────────────────────────────────────────────────────────────────────────────────────
// Fyra decimaler, ungefär 11 m — nog för att jämföra med en rutt, och en sjättedel av punkternas vikt (#530).
const tal = (s: string) => Math.round(Number(s) * 1e4) / 1e4;
export function punktUr(wkt: unknown): [number, number] | null {
  const m = /POINT\s*Z?\s*\(\s*([-\d.]+)\s+([-\d.]+)/.exec(String(wkt ?? ""));
  return m ? [tal(m[1]), tal(m[2])] : null;
}
/** LINESTRING och MULTILINESTRING (även med Z) till en lista av linjer. */
export function linjerUr(wkt: unknown): Linje[] {
  const s = String(wkt ?? "");
  if (!/LINESTRING/.test(s)) return [];
  return [...s.matchAll(/\(([^()]+)\)/g)].map((m) => glesa(m[1].split(",").map((par) => {
    const [x, y] = par.trim().split(/\s+/); return [tal(x), tal(y)] as [number, number];
  }))).filter((l) => l.length >= 2);
}
/** Stryker brytpunkter närmare än GLES_M den förra som behölls; den sista behålls alltid, så linjen slutar där den slutade (#530). */
export const GLES_M = 20;
export function glesa(l: Linje): Linje {
  if (l.length <= 2) return l;
  const ut: Linje = [l[0]];
  for (let i = 1; i < l.length - 1; i++) {
    const [x0, y0] = ut[ut.length - 1], [x, y] = l[i];
    if (Math.hypot((x - x0) * 111_320 * Math.cos((y0 * Math.PI) / 180), (y - y0) * 110_574) >= GLES_M) ut.push(l[i]);
  }
  ut.push(l[l.length - 1]);
  return ut;
}

const ren = (s: unknown, n = 140) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
// Formaterarna skapas EN gång: toLocale…String med tidszon bygger en ny vid varje anrop, och rutterna tog 1 895 ms i stället för
// 152 när visning() anropades för varje post (torrkörningen 38138648357).
const FMT_KLOCKA = new Intl.DateTimeFormat("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" });
const FMT_DATUM = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "long", timeZone: "Europe/Stockholm" });
const FMT_ISO = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" });
const klocka = (iso: unknown) => {
  const t = Date.parse(String(iso ?? "")); if (!Number.isFinite(t)) return null;
  return FMT_KLOCKA.format(t);
};
const datum = (iso: unknown) => {
  const t = Date.parse(String(iso ?? "")); if (!Number.isFinite(t)) return null;
  return FMT_DATUM.format(t);
};
/** Svenskt datum som ÅÅÅÅ-MM-DD (sv-SE skriver så). */
const datumIso = (iso: unknown) => {
  const v = Date.parse(String(iso ?? "")); if (!Number.isFinite(v)) return null;
  return FMT_ISO.format(v);
};
/** Trafikverkets påverkan (SeverityCode; 3 förekommer inte, CLAUDE.md) i texten för meddelandena, som skissen i FAVORITER §3
 *  (*liten påverkan*): en avstängning med *ingen påverkan* är inte en väg som är stängd för föraren (DECISIONS #641). */
export const PAVERKAN: Record<number, string> = { 1: "ingen påverkan", 2: "liten påverkan", 4: "stor påverkan", 5: "mycket stor påverkan" };
const MED_PAVERKAN: Slag[] = ["vagarbete", "olycka", "hinder"];
/** Den läsbara texten för en post, ur fälten — som appen skulle sätta ihop den (#530). */
export function visning(p: Post): string {
  if (p.text) return p.text;   // färjorna bär sin text färdig
  if (p.slag === "restid" || (p.slag === "ko" && p.id.startsWith("tt:")))
    return p.tid != null ? `${p.tid} minuter, normalt ${p.normal ?? "–"}` : "restid saknas";
  const slut = p.slut === "tv" ? "tills vidare" : p.slut ? `till ${datum(p.slut + "T12:00:00Z")}` : "";
  const paverkan = p.sev != null && PAVERKAN[p.sev] && MED_PAVERKAN.includes(p.slag) ? `${PAVERKAN[p.sev]} enligt Trafikverket` : "";
  return [p.t ?? "", p.korfalt ? `${p.korfalt} körfält avstängda` : "", p.grans ? `${p.grans} km/h förbi vägarbetet` : "", paverkan, slut,
    p.slag === "olycka" || p.slag === "hinder" || p.slag === "ko" ? `rapporterad ${klocka(p.start) ?? "–"}` : ""].filter(Boolean).join(" · ");
}
/** Vägnamnen skrivna lika, så att sammanslagningen per väg träffar: E-vägar som "E22", övriga som "väg 17" — Trafikverket skriver
 *  "17", "Väg 17" och "väg 17" om vartannat (kamerornas *17* i visningen). Inget namn blir null. */
export function vagNamn(v: unknown): string | null {
  const s = String(v ?? "").trim(); if (!s) return null;
  const e = /^e\s*(\d+)$/i.exec(s); if (e) return `E${e[1]}`;
  const n = /^(?:väg|rv|riksväg|länsväg)?\s*(\d+)$/i.exec(s); if (n) return `väg ${n[1]}`;
  return s.slice(0, 20);
}
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

/** En fråga till Trafikverkets öppna API. */
export type Fraga = { objecttype: string; version: string; ns: string; filter: string; include: string[] };
/** Frågorna bakom rapportfilen, i ordningen situationer, restider, färjor, färjeleder. Delade av favoritprovet och favoriter (appens
 *  fil, DECISIONS #617), så att testmiljön och appens fil aldrig ställer olika frågor. Bara de slag rapporten bär, bara aktiva, och
 *  bara fälten den läser — svaret för hela Situation är stort. */
export function rapportFragor(nu: number): Fraga[] {
  const fran = new Date(nu).toISOString(), till = new Date(nu + 24 * 3_600_000).toISOString();
  const TYPER = "Accident,AnimalPresenceObstruction,AbnormalTraffic,MaintenanceWorks,RoadOrCarriagewayOrLaneManagement,VehicleObstruction,GeneralObstruction";
  // Deviation.Deleted finns inte (torrkörningen 38135721921: "Invalid query attribute"); Situation.Deleted gör det.
  const DEV = ["Id", "Suspended", "StartTime", "EndTime", "CreationTime", "ValidUntilFurtherNotice", "MessageTypeValue", "MessageCode",
    "MessageCodeValue", "Header", "Message", "RoadNumber", "LocationDescriptor", "SeverityCode", "SeverityText", "NumberOfLanesRestricted",
    "TemporaryLimit", "TrafficRestrictionType", "Geometry.Point.WGS84", "Geometry.Line.WGS84"].map((f) => `Deviation.${f}`);
  return [
    // Inget tidsfilter här: avvikelser utan sluttid (vägarbeten tills vidare) skulle falla bort. byggRapport avgör vad som är aktivt.
    { objecttype: "Situation", version: "1.6", ns: "road.trafficinfo", filter: `<IN name="Deviation.MessageTypeValue" value="${TYPER}"/>`, include: ["Id", "Deleted", ...DEV] },
    { objecttype: "TravelTimeRoute", version: "1.6", ns: "road.trafficinfo", filter: "",
      include: ["Id", "Name", "TravelTime", "FreeFlowTravelTime", "TrafficStatus", "MeasureTime", "Geometry.WGS84"] },
    { objecttype: "FerryAnnouncement", version: "1.2", ns: "ferry.trafficinfo", filter: `<AND><GTE name="DepartureTime" value="${fran}"/><LT name="DepartureTime" value="${till}"/></AND>`, include: [] },
    { objecttype: "FerryRoute", version: "1.2", ns: "ferry.trafficinfo", filter: "", include: [] },
  ];
}

/** Stationerna rapporten bär: bara de i lägesfilens weather[] (ytan högst +3 °C), de enda som kan stå som frysrisk — namnen för alla
 *  855 vägde 8,8 kB (#530). `latest` är raderna ur weather_latest. */
export function kallaStationer(live: Pick<LiveDoc, "weather">, latest: { station_id: unknown; name: unknown; air_temp_c: unknown }[]): In["stationer"] {
  const kalla = new Set((live.weather as any[]).map((w) => String(w.id)));
  return latest.filter((w) => kalla.has(String(w.station_id)))
    .map((w) => ({ id: String(w.station_id), namn: String(w.name ?? ""), luft: w.air_temp_c == null ? null : Number(w.air_temp_c) }));
}

/** Rapportfilens två delar ur Trafikverkets svar. Rena data; texten är Trafikverkets egen, bara kortad. */
export function byggRapport(x: In): { snabb: Rapport; lang: Linjer } {
  const iso = new Date(x.nu).toISOString();
  const poster: Post[] = [], linjer: Record<string, Linje[]> = {}, noter: string[] = [];
  let lagda = 0, sammanslagna = 0;
  for (const s of x.situationer) {
    if (s.Deleted) continue;
    const egna: Post[] = [], granser: number[] = [];
    for (const d of s.Deviation ?? []) {
      if (d.Suspended) continue;
      const start = d.StartTime ? Date.parse(d.StartTime) : -Infinity, slut = d.EndTime ? Date.parse(d.EndTime) : Infinity;
      if (!(start <= x.nu && x.nu < slut)) continue;
      const slag = slagFor(d); if (!slag) continue;
      const p = punktUr(d.Geometry?.Point?.WGS84), l = linjerUr(d.Geometry?.Line?.WGS84);
      if (!p && !l.length) continue;
      const id = `dev:${d.Id}`;
      const kmh = Number(/(\d+)\s*km\/h/i.exec(String(d.TemporaryLimit ?? ""))?.[1]);
      const post: Post = { id, slag, rubrik: slag === "hastighet" ? (Number.isFinite(kmh) ? `${kmh} km/h` : "Tillfälligt nedsatt hastighet")
        : slag === "omledning" ? "Omledning"
        // Trafikverkets *Vägen avstängd* som rubrik fick det att låta som att förarens väg var stängd, också för en tunnel med
        // nattarbete och *ingen påverkan* (Bengt 18/10, DECISIONS #641). Rubriken är vår egen; Trafikverkets mening står i texten.
        : ren(d.MessageCode, 60) === "Vägen avstängd" ? "Avstängning" : ren(d.MessageCode, 60) || RUBRIK[slag],
        t: ren(d.Header ?? d.Message, 100) || ren(d.LocationDescriptor, 100) || undefined,
        ...(p ? { p } : {}), ...(l.length ? { l: id } : {}), vag: vagNamn(d.RoadNumber),
        ...(slag === "vagarbete" || slag === "olycka" || slag === "hinder" || slag === "ko" ? { start: d.StartTime ?? d.CreationTime ?? null } : {}),
        ...(slag !== "olycka" ? { slut: d.ValidUntilFurtherNotice ? "tv" : d.EndTime ? datumIso(d.EndTime) : null } : {}),
        ...(d.NumberOfLanesRestricted ? { korfalt: Number(d.NumberOfLanesRestricted) } : {}), sev: d.SeverityCode ?? null };
      if (l.length) linjer[id] = l;
      if (slag === "hastighet" && Number.isFinite(kmh)) granser.push(kmh);
      egna.push(post);
    }
    // Hastigheten vid ett vägarbete är vägarbetets (795 av 841 låg inom 100 m av ett, #530): den lägsta gränsen läggs på situationens
    // vägarbete, och hastighetsposterna stryks. En hastighet utan vägarbete i samma situation står kvar för sig.
    // Och en situation är ETT vägarbete: Trafikverket skriver ofta samma arbete som både *Vägarbete* och *Körfältsavstängningar*
    // (visningen mot första körningen, "Vägarbete söder om Vä" två gånger). De slås ihop i den första: flest avstängda körfält,
    // högsta påverkan, första texten och geometrin; de andras linjer stryks.
    const va = egna.filter((q) => q.slag === "vagarbete");
    const forsta = va[0];
    for (const q of egna) {
      if (q.slag === "hastighet" && va.length && granser.length) { lagda++; delete linjer[q.id]; continue; }
      if (q.slag === "vagarbete" && q !== forsta) {
        if (q.korfalt && (!forsta.korfalt || q.korfalt > forsta.korfalt)) forsta.korfalt = q.korfalt;
        if (q.sev != null && (forsta.sev == null || q.sev > forsta.sev)) forsta.sev = q.sev;
        if (!forsta.t && q.t) forsta.t = q.t;
        if (!forsta.p && !forsta.l) { forsta.p = q.p; forsta.l = q.l; } else if (q.l && q.l !== forsta.l) delete linjer[q.l];
        sammanslagna++; continue;
      }
      if (q === forsta && granser.length) q.grans = Math.min(...granser);
      poster.push(q);
    }
  }
  if (lagda) noter.push(`${lagda} hastigheter lagda på sitt vägarbete`);
  if (sammanslagna) noter.push(`${sammanslagna} avvikelser sammanslagna med sitt vägarbete i samma situation`);
  for (const r of x.restider) {
    const l = linjerUr(r.Geometry?.WGS84); if (!l.length) continue;
    const id = `tt:${r.Id}`; linjer[id] = l;
    const tid = Number(r.TravelTime), normal = Number(r.FreeFlowTravelTime);
    const min = (s: number) => Math.round(s / 60);
    const extra = Number.isFinite(tid) && Number.isFinite(normal) ? min(tid) - min(normal) : null;
    poster.push({ id, slag: extra !== null && extra >= 2 ? "ko" : "restid", rubrik: ren(r.Name, 80) || "Restidssträcka", l: id,
      ...(Number.isFinite(tid) ? { tid: min(tid) } : {}), ...(Number.isFinite(normal) ? { normal: min(normal) } : {}), status: r.TrafficStatus ?? null });
  }
  const ledLinje = new Map<string, string>();
  // FerryRoute bär en PUNKT för leden, inte en linje (torrkörningen 38135721921). Överfarterna är korta, så punkten mäts mot rutten
  // med färjans marginal; en led med linje mäts som linje.
  const ledPunkt = new Map<string, [number, number]>();
  for (const f of x.farjeleder) {
    const l = linjerUr(f.Geometry?.WGS84), p = punktUr(f.Geometry?.WGS84);
    if (l.length) { const id = `led:${f.Id}`; linjer[id] = l; ledLinje.set(String(f.Id), id); } else if (p) ledPunkt.set(String(f.Id), p);
  }
  if (x.farjeleder.length && !ledLinje.size && !ledPunkt.size) noter.push(`färjelederna saknar geometri (${Object.keys(x.farjeleder[0] ?? {}).join(", ")})`);
  const perLed = new Map<string, any[]>();
  for (const a of x.farjor) {
    if (a.Deleted) continue;
    const led = String(a.Route?.Id ?? ""); const l = perLed.get(led) ?? []; l.push(a); perLed.set(led, l);
  }
  for (const [led, avg] of perLed) {
    const lid = ledLinje.get(led), lp = ledPunkt.get(led); if (!lid && !lp) continue;
    avg.sort((a, b) => Date.parse(a.DepartureTime) - Date.parse(b.DepartureTime));
    const nasta = avg.slice(0, 3).map((a) => `${klocka(a.DepartureTime)} från ${ren(a.FromHarbor?.Name, 40)}`);
    poster.push({ id: `farja:${led}`, slag: "farja", rubrik: ren(avg[0].Route?.Name, 60) || "Färja", text: `nästa ${nasta.join(", ")}`,
      ...(lid ? { l: lid } : { p: lp }), avgangar24h: avg.length });
  }
  const stationer = Object.fromEntries(x.stationer.map((s) => [s.id, { namn: s.namn, luft: s.luft }]));
  return { snabb: { schema: 2, generated_at: iso, poster, noter, stationer }, lang: { schema: 2, generated_at: iso, linjer } };
}

// ── Favoritprovet: det fliken skulle visa för en rutt ───────────────────────────────────────────────────────────────────────
export type Rad = { id: string; slag: Slag; rubrik: string; text: string; avstandM: number; langsM: number;
  /** Vägnumret när källan säger det, och starttiden för avvikelser — sammanslagningen och notisregeln läser dem (#530). */
  vag: string | null; start: string | null };

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

/** Rutnätet längs rutten: rutor om RUTA_GRAD grader, och i varje ruta indexen för ruttens sträckor som — vidgade med marginM — når in
 *  i den. Svaret för en kandidat (punkt eller linjens rektangel) är det första och sista sträckindexet i dess rutor, eller null om
 *  ingen sträcka ligger nära. Kandidaten behöver då bara mätas mot den biten av rutten: en sträcka utanför rutorna ligger längre bort
 *  än marginalen (#531; rutterna längs vägen har 200–1 460 punkter, och varje linje mot hela rutten tog sekunder). Försiktigt: hellre
 *  en ruta för mycket än en för lite. */
export const RUTA_GRAD = 0.05;
export function rutnat(rutt: Linje, marginM: number): (geo: Hazard[]) => [number, number] | null {
  const rutor = new Map<string, number[]>();
  const nord = Math.max(...rutt.map((p) => Math.abs(p[1])));
  const dy = marginM / 110_000, dx = marginM / (111_320 * Math.cos((nord * Math.PI) / 180));
  const cell = (v: number) => Math.floor(v / RUTA_GRAD);
  for (let i = 0; i < rutt.length - 1; i++) {
    const [ax, ay] = rutt[i], [bx, by] = rutt[i + 1];
    for (let cx = cell(Math.min(ax, bx) - dx); cx <= cell(Math.max(ax, bx) + dx); cx++)
      for (let cy = cell(Math.min(ay, by) - dy); cy <= cell(Math.max(ay, by) + dy); cy++) {
        const k = `${cx},${cy}`; const l = rutor.get(k); if (l) l.push(i); else rutor.set(k, [i]);
      }
  }
  return (geo) => {
    let i0 = Infinity, i1 = -Infinity;
    for (const h of geo) {
      const ps: number[][] = h.kind === "slippery_segment" ? h.line : [[(h as any).lon, (h as any).lat]];
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const [x, y] of ps) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      for (let cx = cell(x0); cx <= cell(x1); cx++) for (let cy = cell(y0); cy <= cell(y1); cy++) {
        const l = rutor.get(`${cx},${cy}`);
        if (l) for (const s of l) { if (s < i0) i0 = s; if (s > i1) i1 = s; }
      }
    }
    return i0 === Infinity ? null : [i0, i1];
  };
}

/** Ligger linjen längs rutten och inte bara tvärs över den? Linjen provas var LANGS_STEG_M:e meter. */
export function langsVagen(geo: Hazard[], rutt: Linje, marginalM: number): boolean {
  const prov = geo.flatMap((h) => h.kind === "slippery_segment" ? samplePolyline(h.line, LANGS_STEG_M) : [])
    .map((q, i) => ({ id: `s${i}`, kind: "accident", lon: q.lon, lat: q.lat } as Hazard));
  if (!prov.length) return true;
  const inom = farorLangsRutten(prov, rutt, marginalM).length;
  return inom / prov.length >= LANGS_ANDEL || inom * LANGS_STEG_M >= LANGS_MINST_M;
}

/** Det fliken skulle visa för rutten: rader i viktordning, inom slagets ordning i körordning. */
export function favoritRapport(rutt: Linje, live: LiveDoc, stat: StaticDoc, snabb: Rapport, lang: Linjer,
  marginal: Record<Slag, number> = MARGINALER): Rad[] {
  // Varje kandidat har en eller flera geometrier: en punkt, eller linjens delar var för sig (en multilinje sammanfogad till en linje
  // skulle få en falsk sträcka mellan delarna, som kan korsa rutten). Den närmaste delen räknas.
  const kand: { id: string; slag: Slag; rubrik: string; text: string; geo: Hazard[]; vag?: string | null; start?: string | null; post?: Post }[] = [];
  const pkt = (id: string, lon: number, lat: number) => [{ id, kind: "accident", lon, lat } as Hazard];
  const lin = (id: string, delar: Linje[]) => delar.filter((l) => l.length >= 2).map((line, i) => ({ id: `${id}#${i}`, kind: "slippery_segment", line } as Hazard));
  const st = snabb.stationer;
  const cfg = DEFAULT_CONFIG;
  for (const s of live.segments) kand.push({ id: `seg:${s.id}`, slag: "halka", rubrik: `Halt väglag${vagNamn(s.road) ? ` på ${vagNamn(s.road)}` : ""}`,
    text: s.info.join(", ") || "halka rapporterad på sträckan", geo: lin(`seg:${s.id}`, [s.line]), vag: vagNamn(s.road) });
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
    rubrik: `Frysrisk på bron${vagNamn(b.road) ? ` på ${vagNamn(b.road)}` : ""}`, text: `närmaste station ${grader(b.yta)}`, geo: pkt(`bro:${b.id}`, b.lon, b.lat), vag: b.road });
  for (const c of stat.cameras) kand.push({ id: `cam:${c.id}`, slag: "kamera", rubrik: "Fartkamera", text: vagNamn(c.road) ?? "",
    geo: pkt(`cam:${c.id}`, c.lon, c.lat), vag: vagNamn(c.road) });
  for (const p of snabb.poster) {
    const geo = p.l ? lin(p.id, lang.linjer[p.l] ?? []) : p.p ? pkt(p.id, p.p[0], p.p[1]) : [];
    // Texten sätts ihop först för det som träffar rutten (nedan): visning() för varje post på varje rutt kostade mest av tiden.
    if (geo.length) kand.push({ id: p.id, slag: p.slag, rubrik: p.rubrik, text: "", post: p, geo, vag: (p.vag as string | null) ?? null,
      start: (p.start as string | null) ?? null });
  }
  // Grovt förfilter per rutt: ett RUTNÄT längs vägen (#531). Varje ruta som en av ruttens sträckor — vidgad med den största marginalen
  // och lite till — når in i markeras; en kandidat mäts mot linjen bara om dess egen ruta når in i en markerad ruta. Rektangeln runt
  // hela rutten (rutaKring) släppte igenom en stor del av landet för en diagonal rutt på 300 km. Utfallet är detsamma —
  // farorLangsRutten tar ändå bara det inom marginalen — men arbetet en bråkdel.
  const skar = rutnat(rutt, Math.max(...Object.values(marginal)) + 200);
  const rader: Rad[] = [];
  // Platsen längs rutten räknas som i farorLangsRutten (haversine per sträcka), så att biten plus avståndet fram till den ger samma tal.
  const kum = [0];
  for (let i = 1; i < rutt.length; i++) kum.push(kum[i - 1] + haversineM({ lon: rutt[i - 1][0], lat: rutt[i - 1][1] }, { lon: rutt[i][0], lat: rutt[i][1] }));
  for (const k of kand) {
    const nara = skar(k.geo); if (!nara) continue;
    const bit = rutt.slice(nara[0], nara[1] + 2), fore = kum[nara[0]];
    const traff = farorLangsRutten(k.geo, bit, marginal[k.slag]).sort((a, b) => a.avstandM - b.avstandM)[0];
    if (traff && k.geo[0].kind === "slippery_segment" && !langsVagen(k.geo, bit, marginal[k.slag])) continue;
    if (traff) rader.push({ id: k.id, slag: k.slag, rubrik: k.rubrik, text: k.post ? visning(k.post) : k.text, avstandM: Math.round(traff.avstandM), langsM: Math.round(fore + traff.langsM),
      vag: k.vag ?? null, start: k.start ?? null });
  }
  for (const w of live.smhi as any[]) if (polygonTraffar(w.geom, rutt)) rader.push({ id: `smhi:${w.id}:${w.event}`, slag: "smhi",
    rubrik: `SMHI: ${w.event ?? "varning"}`, text: smhiNiva(w.niva), avstandM: 0, langsM: 0, vag: null, start: null });
  return rader.sort((a, b) => ORDNING.indexOf(a.slag) - ORDNING.indexOf(b.slag) || a.langsM - b.langsM || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** SMHI:s nivåkod i klartext (DECISIONS #701): "nivå YELLOW" stod i rapporten 24/10. Okänd kod ⇒ bara "Varning". */
export function smhiNiva(kod: string | null | undefined): string {
  return kod === "YELLOW" ? "Gul varning" : kod === "ORANGE" ? "Orange varning" : kod === "RED" ? "Röd varning" : "Varning";
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

// ── Sammanslagningen och notisen (DECISIONS #530) ────────────────────────────────────────────────────────────────────────────
/** En rad på skärmen: en enskild sak, eller flera av samma slag på samma väg. `ids` är raderna den står för. */
export type Grupp = { id: string; slag: Slag; rubrik: string; text: string; antal: number; ids: string[]; langsM: number };

/** Det som alltid står för sig: det viktiga och det sällsynta. Resten slås samman per väg från GRUPP_FRAN av samma slag. */
const ENSKILD = new Set<Slag>(["halka", "frysrisk", "olycka", "hinder", "vilt", "ko", "farja", "smhi"]);
export const GRUPP_FRAN = 3;
const ORD: Partial<Record<Slag, [string, string]>> = { kamera: ["fartkamera", "fartkameror"], vagarbete: ["vägarbete", "vägarbeten"],
  hastighet: ["hastighetsbegränsning", "hastighetsbegränsningar"], omledning: ["omledning", "omledningar"], restid: ["restidssträcka", "restidssträckor"] };
const TAL = ["noll", "en", "två", "tre", "fyra", "fem", "sex", "sju", "åtta", "nio", "tio", "elva", "tolv"];
const kmText = (m: number) => `${(m / 1000).toLocaleString("sv-SE", { maximumFractionDigits: 0 })} km`;

/** Raderna sammanslagna för skärmen (favoritsidan §3: "Tre fartkameror"; en rapport som går att läsa på några sekunder). Kameror och
 *  restider i normal trafik slås alltid samman, vägarbeten, hastigheter och omledningar per väg från GRUPP_FRAN. Ordningen är rapportens. */
export function grupperade(rader: Rad[]): Grupp[] {
  const ut: Grupp[] = [], hinkar = new Map<string, Rad[]>();
  for (const r of rader) {
    if (ENSKILD.has(r.slag)) { ut.push({ id: r.id, slag: r.slag, rubrik: r.rubrik, text: r.text, antal: 1, ids: [r.id], langsM: r.langsM }); continue; }
    const nyckel = r.slag === "restid" ? "restid" : `${r.slag}|${r.vag ?? ""}`;
    const l = hinkar.get(nyckel) ?? []; l.push(r); hinkar.set(nyckel, l);
  }
  for (const [nyckel, l] of hinkar) {
    const slag = l[0].slag, vag = l[0].vag;
    const samman = slag === "kamera" || slag === "restid" || l.length >= GRUPP_FRAN;
    if (!samman) { for (const r of l) ut.push({ id: r.id, slag, rubrik: r.rubrik, text: r.text, antal: 1, ids: [r.id], langsM: r.langsM }); continue; }
    const [en, flera] = ORD[slag]!;
    const n = l.length, tal = n < TAL.length ? TAL[n] : String(n);
    const rubrik = `${tal[0].toUpperCase()}${tal.slice(1)} ${n === 1 ? en : flera}${slag !== "restid" && vag ? ` på ${vag}` : ""}`;
    const fran = Math.min(...l.map((r) => r.langsM)), till = Math.max(...l.map((r) => r.langsM));
    const text = slag === "kamera" ? "Rösten säger till före varje kamera."
      : slag === "restid" ? "Normal trafik på sträckorna längs rutten."
      : `${n === 1 ? "" : `Mellan ${kmText(fran)} och ${kmText(till)} in på rutten. `}Närmast: ${l.sort((a, b) => a.langsM - b.langsM)[0].text || l[0].rubrik}`;
    ut.push({ id: `grupp:${nyckel}`, slag, rubrik, text, antal: n, ids: l.map((r) => r.id), langsM: fran });
  }
  return ut.sort((a, b) => ORDNING.indexOf(a.slag) - ORDNING.indexOf(b.slag) || a.langsM - b.langsM || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Vad som ger en notis (favoritsidan §5): ny halka eller frysrisk, en olycka, ett hinder eller djur på vägen, och ett NYTT vägarbete
 *  — ett som började inom NYTT_VAGARBETE_H timmar. Aldrig: vägarbeten som pågått länge, det som stod i förra kollen, prognosen och
 *  SMHI:s varningar (T6). En inställd färja står också i §5, men Trafikverkets fält säger inte inställd (DeviationId bär ett värde på
 *  varje avgång, #528) — den regeln väntar. */
export const NYTT_VAGARBETE_H = 24;
const NOTIS = new Set<Slag>(["halka", "frysrisk", "olycka", "hinder", "vilt"]);
export function notis(rader: Rad[], nytt: string[], nu: number): { ja: boolean; ids: string[] } {
  const ny = new Set(nytt);
  const ids = rader.filter((r) => ny.has(r.id) && (NOTIS.has(r.slag) ||
    (r.slag === "vagarbete" && r.start != null && nu - Date.parse(r.start) <= NYTT_VAGARBETE_H * 3_600_000))).map((r) => r.id);
  return { ja: ids.length > 0, ids };
}
