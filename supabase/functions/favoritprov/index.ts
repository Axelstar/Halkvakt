// ═══ GENERERAD av scripts/bundle-favoritprov.ts — ÄNDRA INTE HÄR ═══
// Källor: engine/src/{types,geo,segment,rutfilter,snapshot}.ts + publish/rapport-core.ts + skuggmotorns ROUTES och ROUTES_C + supabase/functions/favoritprov/main.ts

// ═══ engine/src/types.ts ═══
// Alert engine v0 — pure, deterministic, platform-free (PLAN §1, §2).
// This module must never import: clocks, randomness, network, DB, Node APIs.
// The Kotlin (and later Swift) port must pass the identical vectors in engine/vectors/.

export type HazardKind =
  | "accident"          // A3 — Trafikverket Situation/Deviation
  | "slippery_segment"  // A1 — Trafikverket RoadCondition (operator-classified)
  | "icing_point"       // A2 — WeatherMeasurepoint showing icing conditions
  | "wildlife"          // A4 — historical hotspot / fresh polisen event
  | "camera";           // A5 — TrafficSafetyCamera

/** Spoken priority, highest first. Lower priority candidates are DROPPED, never queued. */
export const PRIORITY: readonly HazardKind[] = [
  "accident",
  "slippery_segment",
  "icing_point",
  "wildlife",
  "camera",
] as const;

export interface PointHazard {
  id: string;
  kind: Exclude<HazardKind, "slippery_segment">;
  lon: number;
  lat: number;
  /** Camera: monitored direction of travel (deg). Warn only when roughly co-directional. */
  bearing?: number | null;
  meta?: {
    /** accident — vägnummer ur Trafikverket ("E18", "25"). Rösten säger VAR (Bengt+Axel 2/9). */
    road?: string | null;
    /** icing_point */
    surfaceTempC?: number | null;
    moisture?: boolean; // rain/snow/wet surface at the station
    /** icing_point — S3, efterhalkan som märkt beta (DECISIONS #222, #524): hours since the station's gauge last saw
     *  rain (`regn_h`) and the surface's fall over 30 min, positive = falling (`lutning30`). null = unknown ⇒ silent. */
    rainH?: number | null;
    fall30C?: number | null;
    /** icing_point — this point is a BRIDGE (#38): surfaceTempC/moisture come from the
     *  nearest road weather station; bridges freeze first, so the threshold is +3 °C. */
    bridge?: boolean;
    /** wildlife */
    active?: boolean;   // precomputed by data layer (season × hour); default true
    /** camera */
    speedLimitKmh?: number | null;
    /** accident — Trafikverket SeverityCode. Measured range in our archive:
     *  1 Ingen påverkan, 2 Liten påverkan, 4 Stor påverkan, 5 Mycket stor påverkan.
     *  (Code 3 has never appeared.) null = unclassified ⇒ treated as mild. */
    severityCode?: number | null;
    /** accident — Trafikverket EndTime pre-formatted as "HH:MM" Europe/Stockholm by the
     *  data layer. The engine reads no clocks and knows no timezones (see header), so the
     *  string arrives ready to speak or not at all. */
    endTimeLocal?: string | null;
  };
}

export interface SegmentHazard {
  id: string;
  kind: "slippery_segment";
  /** WGS84 [lon, lat] polyline. */
  line: [number, number][];
  meta?: {
    /** Trafikverket ConditionCode: 1 Normalt, 2 Besvärligt, 3 Mycket besvärligt, 4 Extremt. */
    code?: number | null;
    /** ConditionInfo strings, e.g. ["Is", "Snöfläckar"]. */
    info?: string[];
  };
}

export type Hazard = PointHazard | SegmentHazard;

export interface Fix {
  /** Seconds. Any epoch; only deltas matter. Engine reads no clocks. */
  t: number;
  lon: number;
  lat: number;
  /** Optional; derived from consecutive fixes when absent. */
  speedKmh?: number;
  headingDeg?: number;
}

export interface Alert {
  t: number;
  hazardId: string;
  kind: HazardKind;
  /** Great-circle metres to the hazard at the moment of speaking, rounded. */
  distanceM: number;
  text: string;
  /** Serious accidents only: which of the two-step calls this is (DECISIONS #28). Absent for
   *  every other alert, so the log shape of all other vectors is unchanged. The warning card
   *  shows it as a stage chip (design handoff 2/10, DECISIONS #443). */
  step?: AccidentStep;
  /** S3 only: the frost-risk call came from the post-rain beta rule, not from surface + moisture (DECISIONS #524).
   *  Absent otherwise, so the log shape of every other vector is unchanged. The warning card marks it as beta. */
  beta?: true;
}

export interface EngineConfig {
  corridorHalfAngleDeg: number; // how far off-heading a hazard may sit and still count as "ahead"
  minSpeedKmh: number;          // below this we do not evaluate (parking-lot jitter guard)
  globalCooldownS: number;      // max 1 spoken alert per this window — hard, no exceptions
  repeatMinS: number;           // same hazard silent for at least this long ...
  repeatMinM: number;           // ... AND until this much further driven (both must have elapsed)
  cameraTriggerM: number;       // A5 fires at this distance
  accidentMaxAheadM: number;    // A3 eligibility horizon = the EARLY call for serious accidents
  /** A3 grading (DECISIONS #28). severityCode >= this ⇒ serious ⇒ two-step warning. */
  accidentSeriousMinSeverity: number;
  /** A3 second step: the reminder distance for serious accidents. */
  accidentNearM: number;
  warnLeadS: number;            // A1/A2/A4 lead time; distance = speed × this, clamped:
  leadMinM: number;
  leadMaxM: number;
  segmentSampleM: number;       // polyline sampling step for corridor tests
  cameraBearingToleranceDeg: number; // co-directionality gate for cameras with known bearing
  /** S3, efterhalkan som märkt beta (DECISIONS #222): surface within [min, max] °C, fallen at least fall30 °C in 30 min,
   *  and rain within regnH hours. Start values written before the frost, frozen by the calibration (#468). */
  efterhalkaYtaMinC: number;
  efterhalkaYtaMaxC: number;
  efterhalkaFall30C: number;
  efterhalkaRegnH: number;
}

export const DEFAULT_CONFIG: EngineConfig = {
  corridorHalfAngleDeg: 35,
  minSpeedKmh: 15,
  // 10 s (var 45 t.o.m. 13/9, #127): härlett ur kamerornas minimidistans i samma
  // riktning — 520 m ⇒ 15,6 s vid 120 km/h. Spärren är dessutom prioritetsmedveten nu.
  globalCooldownS: 10,
  repeatMinS: 600,   // 10 min ...
  repeatMinM: 5000,  // ... / 5 km (PLAN §1)
  cameraTriggerM: 500,
  accidentMaxAheadM: 10_000,
  accidentSeriousMinSeverity: 5, // "Mycket stor påverkan" only (Axel 31/8, DECISIONS #30a: 4 made two-step the norm)
  accidentNearM: 2_000,
  warnLeadS: 30,
  leadMinM: 400,
  leadMaxM: 3000,
  segmentSampleM: 100,
  // 60° (var 100° t.o.m. 1/9): 100 gav ett fönster på 200° — mer än en halvcirkel — så en
  // kamera som bevakar MÖTANDE trafik gled in så fort vägen svängde 30°. Bengt på E4:
  // "den mäter alltid mot kameran i motsatt färdriktning". Mätt på publicerad data: 382 av
  // 388 kamerapar inom 300 m pekar isär >135°, dvs. riktningen är tillförlitlig — grinden
  // var bara för vid. 60° släpper igenom egen riktning i kurvor och på ramper och stänger
  // ute mötande.
  cameraBearingToleranceDeg: 60,
  // S3 (DECISIONS #222, #524): betans startvärden — samma tal som sql/028 och uppspelningen (kontraktsgrinden).
  efterhalkaYtaMinC: 1.0,
  efterhalkaYtaMaxC: 3.0,
  efterhalkaFall30C: 0.8,
  efterhalkaRegnH: 2.0,
};


// ═══ engine/src/geo.ts ═══
// Minimal geodesy for the alert engine. WGS84 throughout, metres out.
// Haversine is accurate to ~0.5 % — far inside our tolerances (alerts are 100s of metres).

const R = 6_371_000; // mean Earth radius, metres
const D2R = Math.PI / 180;

export interface LonLat { lon: number; lat: number; }

export function haversineM(a: LonLat, b: LonLat): number {
  const dLat = (b.lat - a.lat) * D2R;
  const dLon = (b.lon - a.lon) * D2R;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * D2R) * Math.cos(b.lat * D2R) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Initial great-circle bearing a→b, degrees [0, 360). */
export function bearingDeg(a: LonLat, b: LonLat): number {
  const φ1 = a.lat * D2R, φ2 = b.lat * D2R, dλ = (b.lon - a.lon) * D2R;
  const y = Math.sin(dλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
  const θ = Math.atan2(y, x) / D2R;
  return (θ + 360) % 360;
}

/** Absolute angular difference, degrees [0, 180]. */
export function angDiffDeg(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Is point p inside the forward corridor from `pos` along `headingDeg`?
 * Very-near points (< nearM) count as ahead: bearing is numerically unstable there,
 * and something 20 m away is on top of us regardless of angle.
 */
export function isAhead(
  pos: LonLat, headingDeg_: number, p: LonLat, halfAngleDeg: number, nearM = 30,
): { ahead: boolean; distM: number } {
  const distM = haversineM(pos, p);
  if (distM < nearM) return { ahead: true, distM };
  const ahead = angDiffDeg(bearingDeg(pos, p), headingDeg_) <= halfAngleDeg;
  return { ahead, distM };
}

/** Resample a polyline to points at most stepM apart (vertices always included). */
export function samplePolyline(line: [number, number][], stepM: number): LonLat[] {
  const out: LonLat[] = [];
  for (let i = 0; i < line.length; i++) {
    const a = { lon: line[i][0], lat: line[i][1] };
    out.push(a);
    if (i === line.length - 1) break;
    const b = { lon: line[i + 1][0], lat: line[i + 1][1] };
    const segLen = haversineM(a, b);
    const n = Math.floor(segLen / stepM);
    for (let k = 1; k <= n; k++) {
      const f = (k * stepM) / segLen;
      if (f >= 1) break;
      // Linear interpolation in lon/lat — fine at ≤100 m steps in Sweden.
      out.push({ lon: a.lon + (b.lon - a.lon) * f, lat: a.lat + (b.lat - a.lat) * f });
    }
  }
  return out;
}


// ═══ engine/src/segment.ts ═══
// Segmentprognosen — vad vägytan är MELLAN stationerna (kort #38b steg 4, DECISIONS #322/#324/#325).
//
// Rå avståndsviktning, ingen offset: vägpunktsgrinden 23/9 (DECISIONS #324) visade att grannarnas yttemperatur
// viktad 1/km, upp till fem ankare inom 50 km, klarar grind A:s mått utan målets historik (A1 0,71 °C, A2 3,8 %,
// A3 0,0 %) — lika bra som den lärda offseten. Ankarna är grind A:s population (#75, radvakten, karantänen), som
// skuggmotorn hämtar ur databasen (sql/032 vagpunkt_ankare). Rent och plattformsfritt som resten av motorn;
// skuggmotorn buntar filen (scripts/bundle-skuggmotor.ts). Telefonen kör den inte — prognosen är loggad, aldrig
// hörd, tills domen i mars 2027 (TROSKLAR-SKUGGAN §4: karta och förstärkare, aldrig röst ensam).
//
// Utdata per provpunkt var STEG_KM längs rutten, kompakt för databasens skull:
//   [km, yta, narm, n, status, frys, spr]
//   km     läge längs rutten (km)
//   yta    skattad yttemperatur (°C, en decimal) eller null när inget ankare når
//   narm   avstånd till närmaste bidragande ankare (km, en decimal) eller null
//   n      antal bidragande ankare (0–5)
//   status 2 = uppmätt (ankare inom UPPMATT_KM, facitradien i §2) · 1 = modellerat · 0 = okänt (inget ankare inom MAX_KM)
//   frys   1 när yta ≤ FRYS_C (A3:s klassgräns), annars 0 — "prognosen flaggade segmentet" i §2:s mening
//   spr    ankarnas spridning: störst minus minst bidragande ankares yta (°C, en decimal), 0 med ett ankare, null utan
//          ankare — spridningsgrindens underlag (TROSKLAR-SKUGGAN §3, DECISIONS #474). Loggas rå: status och frys bär
//          INTE grinden, domen räknar (DECISIONS #196). Rader loggade före spridningen har sex fält.
// Tidsdelen (risk vid beräknad ankomsttid, §1) är INTE med: grinden bevisade den rumsliga delen, inget har prövat
// den tidsliga. Kolumnen loggar nuläget per segment; tiden väntar på trendregeln (kort #88).

export type Ankare = { id: string; lon: number; lat: number; yta: number };
export type Provpunkt = [number, number | null, number | null, number, 0 | 1 | 2, 0 | 1, number | null];
export type Prognos = { steg_km: number; p: Provpunkt[] };

export const STEG_KM = 2;        // provpunkt var annan kilometer — facit matchas inom 2 km (§2)
const K_NEIGHBOURS = 5;          // som grind A (publish/grind-a.ts) — kontraktsgrinden vaktar
export const MAX_KM = 50;        // bortom det är en station väder, inte ankare — som grind A (rutfiltret läser den, #360)
export const UPPMATT_KM = 2;     // §2:s facitradie: ett ankare så nära är en mätning, inte en modell
export const FRYS_C = 1;         // A3:s klassgräns (TROSKLAR-SKUGGAN §3)

/** Provpunkter var stegKm längs linjen, med läget i km. Sista brytpunkten alltid med. */
export function provpunkter(line: [number, number][], stegKm = STEG_KM): { km: number; lon: number; lat: number }[] {
  const ut: { km: number; lon: number; lat: number }[] = [];
  let kum = 0, nasta = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const a = { lon: line[i][0], lat: line[i][1] }, b = { lon: line[i + 1][0], lat: line[i + 1][1] };
    const seg = haversineM(a, b) / 1000;
    while (seg > 0 && nasta <= kum + seg) {
      const f = (nasta - kum) / seg;
      ut.push({ km: nasta, lon: a.lon + (b.lon - a.lon) * f, lat: a.lat + (b.lat - a.lat) * f });
      nasta += stegKm;
    }
    kum += seg;
  }
  if (line.length && (!ut.length || ut[ut.length - 1].km < kum)) {
    const s = line[line.length - 1];
    ut.push({ km: Math.round(kum * 10) / 10, lon: s[0], lat: s[1] });
  }
  return ut;
}

const r1 = (x: number) => Math.round(x * 10) / 10;

/** En provpunkt: de K närmaste ankarna inom MAX_KM, viktade 1/max(km, 1) — grind A:s grannvikt, ordagrant. Spridningen är
 *  störst minus minst av samma ankares yta, som grind A:s `spridning` utan offset (kuvösens L1 för RÅ, DECISIONS #471). */
export function skatta(p: { lon: number; lat: number }, ankare: Ankare[]): { yta: number | null; narm: number | null; n: number; spr: number | null } {
  const nara: { km: number; yta: number }[] = [];
  for (const a of ankare) {
    const km = haversineM(p, a) / 1000;
    if (km <= MAX_KM) nara.push({ km, yta: a.yta });
  }
  nara.sort((x, y) => x.km - y.km);
  const k = nara.slice(0, K_NEIGHBOURS);
  if (!k.length) return { yta: null, narm: null, n: 0, spr: null };
  let w = 0, s = 0, hi = -Infinity, lo = Infinity;
  for (const a of k) { const v = 1 / Math.max(a.km, 1); w += v; s += v * a.yta; if (a.yta > hi) hi = a.yta; if (a.yta < lo) lo = a.yta; }
  return { yta: s / w, narm: k[0].km, n: k.length, spr: hi - lo };
}

export type Holdout = [number, string, number, number | null, number | null, number, number | null];

/** Närmaste punkt på linjen: avstånd (km) och läge längs linjen (km), i en lokal planprojektion per delsträcka. */
export function narmastLangs(p: { lon: number; lat: number }, line: [number, number][]): { km: number; vid: number } {
  let best = Infinity, vid = 0, kum = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i], [bx, by] = line[i + 1];
    const c = Math.cos(((ay + by) / 2) * Math.PI / 180);
    const X = (x: number, y: number): [number, number] => [(x - ax) * c * 111.32, (y - ay) * 110.57];
    const B = X(bx, by), P = X(p.lon, p.lat);
    const l2 = B[0] ** 2 + B[1] ** 2;
    const t = l2 > 0 ? Math.max(0, Math.min(1, (P[0] * B[0] + P[1] * B[1]) / l2)) : 0;
    const d = Math.hypot(P[0] - t * B[0], P[1] - t * B[1]);
    const seg = haversineM({ lon: ax, lat: ay }, { lon: bx, lat: by }) / 1000;
    if (d < best) { best = d; vid = kum + t * seg; }
    kum += seg;
  }
  return { km: best, vid };
}

/** HOLDOUT (kort #38b 4c, DECISIONS #326): varje ankare inom UPPMATT_KM av rutten skattas ur de ÖVRIGA ankarna — samma
 *  leave-one-out som grind A, varje varv — och loggas med sin egen mätning. Inget tas bort ur prognosen ovan: stationen
 *  bär prognosen för alla andra punkter och är facit för sin egen (TROSKLAR-SKUGGAN §2: stationen får fälla).
 *  Rad: [km längs rutten, id, mätt yta, skattad yta, avstånd till närmaste övriga ankare, antal ankare, de övrigas spridning]. */
export function holdoutRader(line: [number, number][], ankare: Ankare[]): Holdout[] {
  const ut: Holdout[] = [];
  for (const a of ankare) {
    const n = narmastLangs(a, line);
    if (n.km > UPPMATT_KM) continue;
    const s = skatta(a, ankare.filter((o) => o.id !== a.id));
    ut.push([r1(n.vid), a.id, a.yta, s.yta === null ? null : r1(s.yta), s.narm === null ? null : r1(s.narm), s.n,
             s.spr === null ? null : r1(s.spr)]);
  }
  ut.sort((x, y) => x[0] - y[0]);
  return ut;
}

/** Hela rutten: en rad per provpunkt. Flaggan sätts på den oavrundade skattningen. */
export function segmentPrognos(line: [number, number][], ankare: Ankare[], stegKm = STEG_KM): Prognos {
  const p: Provpunkt[] = provpunkter(line, stegKm).map((pp) => {
    const s = skatta(pp, ankare);
    const status: 0 | 1 | 2 = s.narm === null ? 0 : s.narm <= UPPMATT_KM ? 2 : 1;
    const frys: 0 | 1 = s.yta !== null && s.yta <= FRYS_C ? 1 : 0;
    return [pp.km, s.yta === null ? null : r1(s.yta), s.narm === null ? null : r1(s.narm), s.n, status, frys,
            s.spr === null ? null : r1(s.spr)];
  });
  return { steg_km: stegKm, p };
}


// ═══ engine/src/rutfilter.ts ═══
// Rutfiltret (kort #244, DECISIONS #360). Ren logik, inget I/O.
//
// Skuggmotorns huvudvarv slog i datorkraftens tak (546 kl 04:32 och 05:02Z 25/9, på :02/:32 — flytten från :00/:30 löste det inte).
// Arbetet låg i två loopar som prövade HELA Sverige för varje rutt: motorn prövar varje fara i varje fix (tusentals kameror, olyckor
// och stationer, några tusen fixar per rutt), och segmentprognosen mäter avståndet från varje provpunkt till alla ankare. En fara
// längre från rutten än motorns längsta räckvidd kan aldrig tala, och ett ankare längre bort än MAX_KM kan aldrig väga in. Filtret
// tar bort bara sådana, så utfallet är detsamma byte för byte — test/rutfilter.test.ts låser det.

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


// ═══ engine/src/snapshot.ts ═══
// Snapshot → Hazard adapter. THE reference mapping from the published app files
// (data/app/v1/{static,live}.json) into the engine's hazard vocabulary. The Kotlin
// port must mirror this file 1:1 — it is deliberately boring.

export interface StaticDoc {
  schema: number;
  cameras: { id: string; lon: number; lat: number; bearing: number | null; road: string | null }[];
}

export interface LiveDoc {
  schema: number;
  generated_at: string;
  segments: { id: string; line: [number, number][]; code: number | null; info: string[]; road: string | null }[];
  weather: { id: string; lon: number; lat: number; yta: number | null; fukt: boolean;
             /** S3 (#524): timmar sedan regn och ytans fall på 30 min, positivt = faller (snapshot-core.ts). */
             regn_h?: number | null; lutning30?: number | null }[];
  deviations: {
    id: string; lon: number; lat: number; typ: string | null; road: string | null;
    /** Trafikverket SeverityCode, present only for real accidents (#28). */
    sev?: number | null;
    /** Clearance time as "HH:MM" Swedish wall clock, pre-formatted by the publisher. */
    slut?: string | null;
  }[];
  smhi: unknown[]; // not consumed by the engine v1 (map/UI layer)
  wildlife?: { id: string; lon: number; lat: number; art: string | null }[];
  /** #318 — Trafikverkets djur på vägen (AnimalPresenceObstruction). Ersätter `wildlife`, som publiceras tom. */
  djur?: { id: string; lon: number; lat: number; art: string | null; slut?: string | null }[];
  /** #38 — bridges whose nearest station is near freezing. Publisher pre-filters; engine re-checks. */
  bridges?: { id: string; lon: number; lat: number; road: string | null; yta: number | null; fukt: boolean }[];
}

export function snapshotToHazards(staticDoc: StaticDoc, liveDoc: LiveDoc): Hazard[] {
  const out: Hazard[] = [];
  for (const c of staticDoc.cameras) {
    out.push({ id: `cam:${c.id}`, kind: "camera", lon: c.lon, lat: c.lat, bearing: c.bearing });
  }
  for (const s of liveDoc.segments) {
    out.push({ id: `seg:${s.id}`, kind: "slippery_segment", line: s.line, meta: { code: s.code, info: s.info } });
  }
  for (const w of liveDoc.weather) {
    out.push({ id: `wx:${w.id}`, kind: "icing_point", lon: w.lon, lat: w.lat,
               meta: { surfaceTempC: w.yta, moisture: w.fukt, rainH: w.regn_h ?? null, fall30C: w.lutning30 ?? null } });
  }
  for (const d of liveDoc.deviations) {
    out.push({
      id: `dev:${d.id}`, kind: "accident", lon: d.lon, lat: d.lat,
      meta: { severityCode: d.sev ?? null, endTimeLocal: d.slut ?? null, road: d.road ?? null },
    });
  }
  for (const v of liveDoc.wildlife ?? []) {
    out.push({ id: `vilt:${v.id}`, kind: "wildlife", lon: v.lon, lat: v.lat });
  }
  for (const v of liveDoc.djur ?? []) {
    out.push({ id: `djur:${v.id}`, kind: "wildlife", lon: v.lon, lat: v.lat });
  }
  for (const b of liveDoc.bridges ?? []) {
    out.push({ id: `bro:${b.id}`, kind: "icing_point", lon: b.lon, lat: b.lat,
               meta: { surfaceTempC: b.yta, moisture: b.fukt, bridge: true } });
  }
  return out;
}


// ═══ publish/rapport-core.ts ═══
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
const klocka = (iso: unknown) => {
  const t = Date.parse(String(iso ?? "")); if (!Number.isFinite(t)) return null;
  return new Date(t).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" });
};
const datum = (iso: unknown) => {
  const t = Date.parse(String(iso ?? "")); if (!Number.isFinite(t)) return null;
  return new Date(t).toLocaleDateString("sv-SE", { day: "numeric", month: "long", timeZone: "Europe/Stockholm" });
};
/** Svenskt datum som ÅÅÅÅ-MM-DD (sv-SE skriver så). */
const datumIso = (iso: unknown) => {
  const v = Date.parse(String(iso ?? "")); if (!Number.isFinite(v)) return null;
  return new Date(v).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
};
/** Den läsbara texten för en post, ur fälten — som appen skulle sätta ihop den (#530). */
export function visning(p: Post): string {
  if (p.text) return p.text;   // färjorna bär sin text färdig
  if (p.slag === "restid" || (p.slag === "ko" && p.id.startsWith("tt:")))
    return p.tid != null ? `${p.tid} minuter, normalt ${p.normal ?? "–"}` : "restid saknas";
  const slut = p.slut === "tv" ? "tills vidare" : p.slut ? `till ${datum(p.slut + "T12:00:00Z")}` : "";
  return [p.t ?? "", p.korfalt ? `${p.korfalt} körfält avstängda` : "", p.grans ? `${p.grans} km/h förbi vägarbetet` : "", slut,
    p.slag === "olycka" || p.slag === "hinder" || p.slag === "ko" ? `rapporterad ${klocka(p.start) ?? "–"}` : ""].filter(Boolean).join(" · ");
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

/** Rapportfilens två delar ur Trafikverkets svar. Rena data; texten är Trafikverkets egen, bara kortad. */
export function byggRapport(x: In): { snabb: Rapport; lang: Linjer } {
  const iso = new Date(x.nu).toISOString();
  const poster: Post[] = [], linjer: Record<string, Linje[]> = {}, noter: string[] = [];
  let lagda = 0;
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
        : slag === "omledning" ? "Omledning" : ren(d.MessageCode, 60) || RUBRIK[slag],
        t: ren(d.Header ?? d.Message, 100) || ren(d.LocationDescriptor, 100) || undefined,
        ...(p ? { p } : {}), ...(l.length ? { l: id } : {}), vag: ren(d.RoadNumber, 20) || null,
        ...(slag === "vagarbete" || slag === "olycka" || slag === "hinder" || slag === "ko" ? { start: d.StartTime ?? d.CreationTime ?? null } : {}),
        ...(slag !== "olycka" ? { slut: d.ValidUntilFurtherNotice ? "tv" : d.EndTime ? datumIso(d.EndTime) : null } : {}),
        ...(d.NumberOfLanesRestricted ? { korfalt: Number(d.NumberOfLanesRestricted) } : {}), sev: d.SeverityCode ?? null };
      if (l.length) linjer[id] = l;
      if (slag === "hastighet" && Number.isFinite(kmh)) granser.push(kmh);
      egna.push(post);
    }
    // Hastigheten vid ett vägarbete är vägarbetets (795 av 841 låg inom 100 m av ett, #530): den lägsta gränsen läggs på situationens
    // vägarbeten, och hastighetsposterna stryks. En hastighet utan vägarbete i samma situation står kvar för sig.
    const va = egna.filter((q) => q.slag === "vagarbete");
    for (const q of egna) {
      if (q.slag === "hastighet" && va.length && granser.length) { lagda++; delete linjer[q.id]; continue; }
      if (q.slag === "vagarbete" && granser.length) q.grans = Math.min(...granser);
      poster.push(q);
    }
  }
  if (lagda) noter.push(`${lagda} hastigheter lagda på sitt vägarbete`);
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

/** Det fliken skulle visa för rutten: rader i viktordning, inom slagets ordning i körordning. */
export function favoritRapport(rutt: Linje, live: LiveDoc, stat: StaticDoc, snabb: Rapport, lang: Linjer,
  marginal: Record<Slag, number> = MARGINALER): Rad[] {
  // Varje kandidat har en eller flera geometrier: en punkt, eller linjens delar var för sig (en multilinje sammanfogad till en linje
  // skulle få en falsk sträcka mellan delarna, som kan korsa rutten). Den närmaste delen räknas.
  const kand: { id: string; slag: Slag; rubrik: string; text: string; geo: Hazard[]; vag?: string | null; start?: string | null }[] = [];
  const pkt = (id: string, lon: number, lat: number) => [{ id, kind: "accident", lon, lat } as Hazard];
  const lin = (id: string, delar: Linje[]) => delar.filter((l) => l.length >= 2).map((line, i) => ({ id: `${id}#${i}`, kind: "slippery_segment", line } as Hazard));
  const st = snabb.stationer;
  const cfg = DEFAULT_CONFIG;
  for (const s of live.segments) kand.push({ id: `seg:${s.id}`, slag: "halka", rubrik: `Halt väglag${s.road ? ` på ${s.road}` : ""}`,
    text: s.info.join(", ") || "halka rapporterad på sträckan", geo: lin(`seg:${s.id}`, [s.line]), vag: s.road });
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
    rubrik: `Frysrisk på bron${b.road ? ` på ${b.road}` : ""}`, text: `närmaste station ${grader(b.yta)}`, geo: pkt(`bro:${b.id}`, b.lon, b.lat), vag: b.road });
  for (const c of stat.cameras) kand.push({ id: `cam:${c.id}`, slag: "kamera", rubrik: "Fartkamera", text: c.road ?? "",
    geo: pkt(`cam:${c.id}`, c.lon, c.lat), vag: c.road });
  for (const p of snabb.poster) {
    const geo = p.l ? lin(p.id, lang.linjer[p.l] ?? []) : p.p ? pkt(p.id, p.p[0], p.p[1]) : [];
    if (geo.length) kand.push({ id: p.id, slag: p.slag, rubrik: p.rubrik, text: visning(p), geo, vag: (p.vag as string | null) ?? null,
      start: (p.start as string | null) ?? null });
  }
  // Grovt förfilter per rutt, som skuggans rektangel (rutaKring): bara kandidater vars ruta skär rutans ruta plus den största
  // marginalen mäts mot linjen. Utfallet är detsamma — farorLangsRutten tar ändå bara det inom marginalen — men arbetet en bråkdel.
  const ruta = rutaKring(rutt, Math.max(...Object.values(marginal)) / 1000 + 1);
  const skar = (geo: Hazard[]) => geo.some((h) => {
    const ps: number[][] = h.kind === "slippery_segment" ? h.line : [[(h as any).lon, (h as any).lat]];
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of ps) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 >= ruta.x0 && x0 <= ruta.x1 && y1 >= ruta.y0 && y0 <= ruta.y1;
  });
  const rader: Rad[] = [];
  for (const k of kand) {
    if (!skar(k.geo)) continue;
    const traff = farorLangsRutten(k.geo, rutt, marginal[k.slag]).sort((a, b) => a.avstandM - b.avstandM)[0];
    if (traff) rader.push({ id: k.id, slag: k.slag, rubrik: k.rubrik, text: k.text, avstandM: Math.round(traff.avstandM), langsM: Math.round(traff.langsM),
      vag: k.vag ?? null, start: k.start ?? null });
  }
  for (const w of live.smhi as any[]) if (polygonTraffar(w.geom, rutt)) rader.push({ id: `smhi:${w.id}:${w.event}`, slag: "smhi",
    rubrik: `SMHI: ${w.event ?? "varning"}`, text: `nivå ${w.niva ?? "–"}`, avstandM: 0, langsM: 0, vag: null, start: null });
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


// ═══ skuggans rutter (30) ═══
const RUTTER_PROV: Record<string, [number, number][]> = {"E22 Malmö→Kristianstad":[[13.05,55.6],[13.19,55.7],[13.35,55.76],[13.54,55.83],[13.74,55.85],[13.95,55.9],[14.05,55.95],[14.16,56.03]],"Väg 23 Höör→Osby":[[13.54,55.94],[13.62,56.02],[13.7,56.09],[13.77,56.16],[13.85,56.25],[13.93,56.32],[13.98,56.38]],"Väg 19 Ystad→Kristianstad":[[13.82,55.43],[13.87,55.5],[13.95,55.55],[14.02,55.63],[14.1,55.72],[14.13,55.82],[14.15,55.92],[14.16,56.02]],"E6 Malmö→Halmstad":[[12.99,55.61],[12.83,55.87],[12.7,56.05],[12.86,56.24],[12.85,56.42],[13.04,56.51],[12.86,56.67]],"E6 Halmstad→Göteborg":[[12.86,56.67],[12.49,56.9],[12.25,57.11],[12.08,57.49],[11.97,57.71]],"E6 Göteborg→Strömstad":[[11.97,57.71],[11.98,57.87],[11.82,58.07],[11.94,58.35],[11.68,58.47],[11.32,58.72],[11.17,58.94]],"Rv40 Göteborg→Jönköping":[[11.97,57.71],[12.22,57.68],[12.94,57.72],[13.42,57.79],[14.16,57.78]],"E4 Helsingborg→Jönköping":[[12.7,56.05],[13.28,56.28],[13.6,56.46],[13.94,56.83],[14.04,57.19],[14.16,57.78]],"E4 Jönköping→Linköping":[[14.16,57.78],[14.47,58.02],[14.65,58.23],[15.13,58.32],[15.62,58.41]],"E4 Linköping→Södertälje":[[15.62,58.41],[16.19,58.59],[17.01,58.75],[17.63,59.2]],"E4 Södertälje→Uppsala":[[17.63,59.2],[18.07,59.33],[17.92,59.65],[17.64,59.86]],"E4 Uppsala→Gävle":[[17.64,59.86],[17.51,60.34],[17.14,60.67]],"E4 Gävle→Sundsvall":[[17.14,60.67],[17.06,61.3],[17.11,61.73],[17.31,62.39]],"E4 Sundsvall→Umeå":[[17.31,62.39],[17.94,62.63],[18.72,63.29],[19.5,63.57],[20.26,63.83]],"E4 Umeå→Luleå":[[20.26,63.83],[21.06,64.75],[21.48,65.32],[22.15,65.58]],"E10 Luleå→Kiruna":[[22.15,65.58],[21.69,65.83],[20.66,67.13],[20.23,67.86]],"E14 Sundsvall→Åre":[[17.31,62.39],[15.66,62.53],[15.42,62.75],[14.64,63.18],[13.08,63.4]],"E18 Karlstad→Örebro":[[13.5,59.38],[14.11,59.31],[14.52,59.33],[15.21,59.27]],"E18 Örebro→Stockholm":[[15.21,59.27],[15.84,59.39],[16.55,59.61],[17.07,59.64],[18.07,59.33]],"Rv70 Enköping→Mora":[[17.07,59.64],[16.6,59.92],[16.17,60.15],[15.98,60.28],[15.43,60.48],[15.13,60.55],[14.99,60.73],[15.12,60.89],[14.54,61]],"C Värmland: Eda→Mångsbodarna":[[12.275,59.911],[12.623,60.02],[12.609,60.209],[12.615,60.385],[12.704,60.654],[13.114,61.158],[13.62,61.079]],"C Klarälvdalen: S Berga→Ruskåsen":[[13.134,59.726],[13.403,59.867],[13.253,60.207],[13.172,60.354]],"C Bergslagen: Gumhöjden→Gruvorna":[[13.909,60.022],[14.176,60.113],[14.2,60.327],[13.956,60.501],[14.334,60.86]],"C Ludvika: Basttjärn→Mårtanberg":[[14.979,60.025],[14.523,60.16],[14.674,60.467],[15.253,60.823]],"C Orsa finnmark: Lillhärdal→Gruvberget":[[14.04,61.843],[14.798,61.388],[15.135,61.167],[15.796,61.071],[16.177,61.132]],"C Norrlandskusten: Hammarbacken→Bönhamn":[[17.185,61.9],[17.277,62.078],[17.37,62.195],[17.453,62.517],[17.847,62.686],[18.446,62.876]],"C Fjällen: Blåsjöfjället→Kåtaviken":[[14.04,64.772],[15.379,64.968],[14.815,65.422],[15.095,66.01],[14.805,66.118]],"C Kiruna: Nikkaluokta→Riksgränsen":[[19.027,67.86],[20.294,67.856],[19.782,68.148],[18.575,68.434],[18.269,68.43],[18.116,68.433]],"C Lule lappmark: Porjus→Stora Sjöfallet":[[19.821,66.96],[18.367,67.474]],"C Tornedalen: Limingojärvi→Kätkesuando":[[22.899,66.689],[23.482,67.442],[23.311,68.12]]};

// ═══ supabase/functions/favoritprov/main.ts ═══
// FAVORITPROVET (favoriterna, DECISIONS #529, Bengt 11/10: "vi bygger det nu … en testmiljö … under faktiska förhållanden och inte
// når ut till själva telefonen"). Bygger rapportfilen som den är tänkt för appen, och det fliken skulle visa för skuggans 30 rutter,
// var 30:e minut (:08/:38, sql/047), med raderna sammanslagna och notisen simulerad (#530) — men skriver ALLT till hinken `favoritprov` i Supabase Storage, aldrig till kartrepot eller
// data/app/v1/, så ingen app läser något av det. Filerna skrivs över (ingen historik som växer); visningen är docs/favoritprov.html.
//
// index.ts är GENERERAD av scripts/bundle-favoritprov.ts ur engine/src, publish/rapport-core.ts, skuggans rutter (RUTTER_PROV, ur
// skuggmotor/main.ts) och den här filen — ändra aldrig i index.ts. Svaret bär tiden per steg och storlekarna, så att provet mot
// resursfelen (546, DECISIONS #344, #360) går att läsa ur net._http_response.
const SB = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TRV = Deno.env.get("TRAFIKVERKET_API_KEY")!;
const CDN = "https://axelstar.github.io/halkvakt-karta/data/app/v1/";
const HINK = "favoritprov";
const HISTORIK = 48;   // ett dygn med två körningar i timmen

async function trv(objekt: string, version: string, ns: string, filter: string, include: string[] = [], limit = 20000): Promise<{ rader: any[]; byte: number }> {
  const inc = include.map((f) => `<INCLUDE>${f}</INCLUDE>`).join("");
  const q = `<REQUEST><LOGIN authenticationkey="${TRV}"/><QUERY objecttype="${objekt}" schemaversion="${version}" namespace="${ns}" limit="${limit}">` +
    `${filter ? `<FILTER>${filter}</FILTER>` : ""}${inc}</QUERY></REQUEST>`;
  const r = await fetch("https://api.trafikinfo.trafikverket.se/v2/data.json", { method: "POST", headers: { "Content-Type": "text/xml" }, body: q });
  const text = await r.text();
  // Felet bär svarskroppen (CLAUDE.md: "TRV 400" utan kropp kostade ett diagnosvarv).
  if (!r.ok) throw new Error(`${objekt} ${r.status}: ${text.slice(0, 300)}`);
  const rader = JSON.parse(text)?.RESPONSE?.RESULT?.[0]?.[objekt] ?? [];
  if (rader.length >= limit) throw new Error(`${objekt}: taket ${limit} nått — svaret är ofullständigt`);
  return { rader, byte: text.length };
}

const hinkUrl = (namn: string) => `${SB}/storage/v1/object/${HINK}/${namn}`;
async function lasHink(namn: string): Promise<any | null> {
  const r = await fetch(hinkUrl(namn), { headers: { Authorization: `Bearer ${SRK}`, apikey: SRK } });
  return r.ok ? r.json() : null;
}
async function skrivHink(namn: string, json: string) {
  const r = await fetch(hinkUrl(namn), { method: "POST", body: json, headers: { Authorization: `Bearer ${SRK}`, apikey: SRK,
    "Content-Type": "application/json", "x-upsert": "true", "cache-control": "max-age=60" } });
  if (!r.ok) throw new Error(`hinken ${namn} ${r.status}: ${(await r.text()).slice(0, 200)}`);
}
async function sha256(s: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function gzBytes(s: string): Promise<number> {
  const cs = new CompressionStream("gzip"); const w = cs.writable.getWriter(); w.write(new TextEncoder().encode(s)); w.close();
  return (await new Response(cs.readable).arrayBuffer()).byteLength;
}

Deno.serve(async (req) => {
  const k = Deno.env.get("INGEST_KEY");
  if (!k || req.headers.get("x-halkvakt-key") !== k) return new Response("forbidden", { status: 403 });
  const t0 = performance.now(); const ms: Record<string, number> = {}; const steg = (n: string, t: number) => { ms[n] = Math.round(performance.now() - t); };
  try {
    const nu = Date.now(); const fran = new Date(nu).toISOString(), till = new Date(nu + 24 * 3_600_000).toISOString();
    let t = performance.now();
    // Bara de slag rapporten bär, bara aktiva, och bara fälten den läser — svaret för hela Situation är stort.
    const TYPER = "Accident,AnimalPresenceObstruction,AbnormalTraffic,MaintenanceWorks,RoadOrCarriagewayOrLaneManagement,VehicleObstruction,GeneralObstruction";
    // Deviation.Deleted finns inte (torrkörningen 38135721921: "Invalid query attribute"); Situation.Deleted gör det.
    const DEV = ["Id", "Suspended", "StartTime", "EndTime", "CreationTime", "ValidUntilFurtherNotice", "MessageTypeValue", "MessageCode",
      "MessageCodeValue", "Header", "Message", "RoadNumber", "LocationDescriptor", "SeverityCode", "SeverityText", "NumberOfLanesRestricted",
      "TemporaryLimit", "TrafficRestrictionType", "Geometry.Point.WGS84", "Geometry.Line.WGS84"].map((f) => `Deviation.${f}`);
    const [sit, tt, fa, fr, lv, st, wl] = await Promise.all([
      // Inget tidsfilter här: avvikelser utan sluttid (vägarbeten tills vidare) skulle falla bort. byggRapport avgör vad som är aktivt.
      trv("Situation", "1.6", "road.trafficinfo", `<IN name="Deviation.MessageTypeValue" value="${TYPER}"/>`, ["Id", "Deleted", ...DEV]),
      trv("TravelTimeRoute", "1.6", "road.trafficinfo", "", ["Id", "Name", "TravelTime", "FreeFlowTravelTime", "TrafficStatus", "MeasureTime", "Geometry.WGS84"]),
      trv("FerryAnnouncement", "1.2", "ferry.trafficinfo", `<AND><GTE name="DepartureTime" value="${fran}"/><LT name="DepartureTime" value="${till}"/></AND>`),
      trv("FerryRoute", "1.2", "ferry.trafficinfo", ""),
      fetch(CDN + "live.json?t=" + nu).then((r) => r.json()),
      fetch(CDN + "static.json?t=" + nu).then((r) => r.json()),
      fetch(`${SB}/rest/v1/weather_latest?select=station_id,name,air_temp_c`, { headers: { Authorization: `Bearer ${SRK}`, apikey: SRK } }).then((r) => r.json()),
    ]);
    steg("hamtning", t);
    t = performance.now();
    const kalla = new Set((lv.weather as any[]).map((w) => String(w.id)));
    const { snabb, lang } = byggRapport({ nu, situationer: sit.rader, restider: tt.rader, farjor: fa.rader, farjeleder: fr.rader,
      // Bara stationerna i lägesfilens weather[] (ytan högst +3 °C) — de enda som kan stå som frysrisk; namnen för alla 855 vägde 8,8 kB (#530).
      stationer: (wl as any[]).filter((w) => kalla.has(String(w.station_id)))
        .map((w) => ({ id: String(w.station_id), namn: String(w.name ?? ""), luft: w.air_temp_c == null ? null : Number(w.air_temp_c) })) });
    if (fr.rader.length) snabb.noter.push(`färjeledens fält: ${Object.keys(fr.rader[0]).join(", ")}`);
    steg("rapport", t);
    t = performance.now();
    const sSnabb = JSON.stringify(snabb), sLang = JSON.stringify(lang);
    const fore = await lasHink("manifest.json");
    const shaLang = await sha256(sLang);
    // Den långsamma delen skrivs bara när linjerna ändrats (docs/FAVORITER.html §7) — generated_at räknas inte.
    const shaLangUtanTid = await sha256(JSON.stringify(lang.linjer));
    const nyLang = fore?.lang?.innehall !== shaLangUtanTid;
    const manifest = { schema: 1, generated_at: snabb.generated_at, lagesfil: lv.generated_at,
      snabb: { sha256: await sha256(sSnabb), byte: sSnabb.length, gz_byte: await gzBytes(sSnabb) },
      lang: nyLang ? { sha256: shaLang, innehall: shaLangUtanTid, byte: sLang.length, gz_byte: await gzBytes(sLang), skriven: snabb.generated_at } : fore.lang };
    await skrivHink("rapport-snabb.json", sSnabb);
    if (nyLang) await skrivHink("rapport-lang.json", sLang);
    await skrivHink("manifest.json", JSON.stringify(manifest));
    steg("skrivning", t);
    t = performance.now();
    const forra = await lasHink("favoriter.json");
    const rutter: Record<string, unknown> = {};
    for (const [namn, linje] of Object.entries(RUTTER_PROV)) {
      const rader = favoritRapport(linje, lv, st, snabb, lang);
      const nytt = nyttSedan(forra?.rutter?.[namn]?.rader ?? null, rader);
      // Skärmen visar grupperna (#530: sammanslagna per slag och väg); raderna står kvar under dem, och notisen räknas på det nya.
      rutter[namn] = { km: Math.round(linje.reduce((s, p, i) => i ? s + haversineM({ lon: linje[i - 1][0], lat: linje[i - 1][1] }, { lon: p[0], lat: p[1] }) : 0, 0) / 1000),
        grupper: grupperade(rader), rader, nytt, notis: notis(rader, nytt, nu), tomma: tomma(rader) };
    }
    steg("rutterna", t);
    const fav = { schema: 1, generated_at: snabb.generated_at, lagesfil: lv.generated_at, forra: forra?.generated_at ?? null, rutter };
    await skrivHink("favoriter.json", JSON.stringify(fav));
    const hist = (await lasHink("historik.json"))?.korningar ?? [];
    hist.push({ t: snabb.generated_at, ms: Math.round(performance.now() - t0), poster: snabb.poster.length, snabb_gz: manifest.snabb.gz_byte,
      lang_gz: manifest.lang.gz_byte, rader: Object.fromEntries(Object.entries(rutter).map(([n, r]: [string, any]) => [n, r.rader.length])),
      nytt: Object.values(rutter).reduce((s: number, r: any) => s + r.nytt.length, 0),
      grupper: Object.values(rutter).reduce((s: number, r: any) => s + r.grupper.length, 0),
      notis: Object.entries(rutter).filter(([, r]: [string, any]) => r.notis.ja).map(([n]) => n) });
    await skrivHink("historik.json", JSON.stringify({ schema: 1, korningar: hist.slice(-HISTORIK) }));
    return new Response(JSON.stringify({ ok: true, generated_at: snabb.generated_at, poster: snabb.poster.length, noter: snabb.noter,
      svar_byte: { situation: sit.byte, restider: tt.byte, farjor: fa.byte, farjeleder: fr.byte }, manifest, ny_lang: nyLang,
      rutter: Object.keys(rutter).length, ms: { ...ms, totalt: Math.round(performance.now() - t0) } }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e), ms }), { status: 500 });
  }
});
