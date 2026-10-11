// Rutfiltret (kort #244, DECISIONS #360). Ren logik, inget I/O.
//
// Skuggmotorns huvudvarv slog i datorkraftens tak (546 kl 04:32 och 05:02Z 25/9, på :02/:32 — flytten från :00/:30 löste det inte).
// Arbetet låg i två loopar som prövade HELA Sverige för varje rutt: motorn prövar varje fara i varje fix (tusentals kameror, olyckor
// och stationer, några tusen fixar per rutt), och segmentprognosen mäter avståndet från varje provpunkt till alla ankare. En fara
// längre från rutten än motorns längsta räckvidd kan aldrig tala, och ett ankare längre bort än MAX_KM kan aldrig väga in. Filtret
// tar bort bara sådana, så utfallet är detsamma byte för byte — test/rutfilter.test.ts låser det.
import type { Hazard } from "./types.ts";
import { DEFAULT_CONFIG } from "./types.ts";
import { MAX_KM, UPPMATT_KM } from "./segment.ts";
import { haversineM } from "./geo.ts";

/** Motorns längsta räckvidd (olyckornas tidiga rop, 10 km) plus fem km slack — härledd, aldrig skriven för hand. */
export const FARA_MARGINAL_KM =
  Math.max(DEFAULT_CONFIG.accidentMaxAheadM, DEFAULT_CONFIG.leadMaxM, DEFAULT_CONFIG.cameraTriggerM) / 1000 + 5;
/** Prognosens grannradie plus holdoutens avstånd till rutten plus tre km slack. */
export const ANKARE_MARGINAL_KM = MAX_KM + UPPMATT_KM + 3;

export type Ruta = { x0: number; x1: number; y0: number; y1: number };

/** Rutans ruta, vidgad med `marginalKm` åt alla håll. Försiktig: longitudgraden räknas vid den nordligaste punkten, där den är
 *  kortast i km, och latitudgraden som 110 km — rutan blir hellre för stor än för liten. */
export function rutaKring(line: [number, number][], marginalKm: number): Ruta {
  const lons = line.map((p) => p[0]), lats = line.map((p) => p[1]);
  const nord = Math.max(...lats.map((y) => Math.abs(y)));
  const dLat = marginalKm / 110, dLon = marginalKm / (111.32 * Math.cos((nord * Math.PI) / 180));
  return { x0: Math.min(...lons) - dLon, x1: Math.max(...lons) + dLon, y0: Math.min(...lats) - dLat, y1: Math.max(...lats) + dLat };
}

const iRutan = (x: number, y: number, r: Ruta) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

/** Farorna som kan tala på rutten. En punkt ska ligga i rutan; ett segment räcker att dess egen ruta skär rutans — ett långt
 *  segment kan korsa rutten utan att någon av dess brytpunkter ligger nära. */
export function farorNaraRutten(hazards: Hazard[], line: [number, number][], marginalKm = FARA_MARGINAL_KM): Hazard[] {
  const r = rutaKring(line, marginalKm);
  return hazards.filter((h) => {
    if (h.kind === "slippery_segment") {
      const xs = h.line.map((p) => p[0]), ys = h.line.map((p) => p[1]);
      return Math.max(...xs) >= r.x0 && Math.min(...xs) <= r.x1 && Math.max(...ys) >= r.y0 && Math.min(...ys) <= r.y1;
    }
    return iRutan((h as { lon: number }).lon, (h as { lat: number }).lat, r);
  });
}

/** Ankarna som kan väga in i prognosen eller holdouten längs rutten. */
export function ankareNaraRutten<T extends { lon: number; lat: number }>(ankare: T[], line: [number, number][],
  marginalKm = ANKARE_MARGINAL_KM): T[] {
  const r = rutaKring(line, marginalKm);
  return ankare.filter((a) => iRutan(a.lon, a.lat, r));
}

// LÄNGS RUTTEN (favoriterna, DECISIONS #528). Rektangeln ovan tar allt inom rutans ruta plus marginalen — för en diagonal rutt en stor
// del av landet. Urvalet nedan tar det som ligger inom `marginalM` från själva linjen, och säger var längs den, så att en rapport kan
// ordna farorna i körordning. Samma räkning i android/engine/…/RouteFilter.kt och HalkvaktEngine/RouteFilter.swift, prövad mot
// engine/fixtures/langsrutten.json i alla tre.
//
// Avståndet är plant i en lokal projektion kring punkten (x = R·Δλ·cos φ, y = R·Δφ, R som haversineM), punkt mot sträcka utan
// sampling — billigt och lika i alla tre språk. Ett segment mäts brytpunkt mot linjen, linjens brytpunkter mot segmentet, och två
// sträckor som korsar varandra ger 0. Platsen längs rutten är längden fram till närmaste sträcka (haversine per sträcka) plus andelen
// av den.

/** En fara längs rutten: kortaste avståndet till linjen och platsen längs den, båda i meter. */
export type LangsRutten = { hazard: Hazard; avstandM: number; langsM: number };

const R_M = 6_371_000;
const RAD = Math.PI / 180;

/** Kortaste plana avståndet från p till sträckan a–b, och andelen t ∈ [0, 1] längs sträckan där det nås. */
function tillStracka(p: [number, number], a: [number, number], b: [number, number]): { d: number; t: number } {
  const k = Math.cos(p[1] * RAD) * R_M * RAD, m = R_M * RAD;
  const ax = (a[0] - p[0]) * k, ay = (a[1] - p[1]) * m, bx = (b[0] - p[0]) * k, by = (b[1] - p[1]) * m;
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  const t = L === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L));
  return { d: Math.hypot(ax + t * dx, ay + t * dy), t };
}

/** Var sträckan p1–p2 korsar q1–q2, som andel t ∈ (0, 1) längs p1–p2, eller null. Plant i grader, räcker för att avgöra korsning. */
function korsning(p1: [number, number], p2: [number, number], q1: [number, number], q2: [number, number]): number | null {
  const rx = p2[0] - p1[0], ry = p2[1] - p1[1], sx = q2[0] - q1[0], sy = q2[1] - q1[1];
  const den = rx * sy - ry * sx;
  if (den === 0) return null;
  const t = ((q1[0] - p1[0]) * sy - (q1[1] - p1[1]) * sx) / den, u = ((q1[0] - p1[0]) * ry - (q1[1] - p1[1]) * rx) / den;
  return t > 0 && t < 1 && u > 0 && u < 1 ? t : null;
}

/** Farorna inom `marginalM` från linjen, i körordning (plats längs rutten, sedan id). En linje med en punkt duger inte. */
export function farorLangsRutten(hazards: Hazard[], line: [number, number][], marginalM: number): LangsRutten[] {
  if (line.length < 2) return [];
  const kum = [0];
  for (let i = 1; i < line.length; i++) kum.push(kum[i - 1] + haversineM({ lon: line[i - 1][0], lat: line[i - 1][1] }, { lon: line[i][0], lat: line[i][1] }));
  // Närmast linjen för en punkt: kortaste avståndet och platsen längs rutten där det nås.
  const narmast = (p: [number, number]) => {
    let d = Infinity, langs = 0;
    for (let i = 0; i < line.length - 1; i++) {
      const s = tillStracka(p, line[i], line[i + 1]);
      if (s.d < d) { d = s.d; langs = kum[i] + s.t * (kum[i + 1] - kum[i]); }
    }
    return { d, langs };
  };
  const ut: LangsRutten[] = [];
  for (const h of hazards) {
    let d: number, langs: number;
    if (h.kind === "slippery_segment") {
      ({ d, langs } = narmast(h.line[0]));
      for (const p of h.line.slice(1)) { const n = narmast(p); if (n.d < d) ({ d, langs } = n); }
      // Linjens brytpunkter mot segmentet: ett segment kan gå nära linjen mellan sina egna brytpunkter.
      for (let i = 0; i < line.length; i++) for (let j = 0; j < h.line.length - 1; j++) {
        const s = tillStracka(line[i], h.line[j], h.line[j + 1]);
        if (s.d < d) { d = s.d; langs = kum[i]; }
      }
      for (let i = 0; i < line.length - 1 && d > 0; i++) for (let j = 0; j < h.line.length - 1; j++) {
        const t = korsning(line[i], line[i + 1], h.line[j], h.line[j + 1]);
        if (t !== null) { d = 0; langs = kum[i] + t * (kum[i + 1] - kum[i]); break; }
      }
    } else {
      ({ d, langs } = narmast([h.lon, h.lat]));
    }
    if (d <= marginalM) ut.push({ hazard: h, avstandM: d, langsM: langs });
  }
  return ut.sort((a, b) => a.langsM - b.langsM || (a.hazard.id < b.hazard.id ? -1 : a.hazard.id > b.hazard.id ? 1 : 0));
}
