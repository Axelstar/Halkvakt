// ═══ GENERERAD av scripts/bundle-skuggmotor.ts — ÄNDRA INTE HÄR ═══
// Källor: engine/src/{types,geo,segment,texts,engine,forsprang,rutfilter,snapshot}.ts + supabase/functions/skuggmotor/main.ts

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


// ═══ engine/src/texts.ts ═══
// Spoken Swedish copy (PLAN §1 taxonomy). Phrasing rule, hard:
// segment sources may claim "på vägen framför dig"; point sources only "framöver".

/**
 * Which utterance of a serious accident this is (DECISIONS #28, "Olyckslyftet").
 *   "early"    — the first call, made far out while exits still remain. Carries the
 *                routing decision ("Överväg annan väg") because this is the only
 *                moment the driver can still act on it.
 *   "reminder" — the second call at close range, AFTER an early call was spoken.
 *                Short by design: the decision is already made, this is just speed.
 *   "late"     — close range with NO early call (driver joined the road inside the
 *                early horizon). Must still say WHAT it is — otherwise this driver
 *                gets strictly less information than one who came from further away.
 * Mild accidents and every other hazard kind ignore this.
 */
export type AccidentStep = "early" | "reminder" | "late";

/** " på E18" / " på väg 25" / "" — tomt när vägnumret saknas. */
export function roadPhrase(road?: string | null): string {
  const r = (road ?? "").trim();
  if (!r) return "";
  return /^[A-Za-zÅÄÖåäö]/.test(r) ? ` på ${r}` : ` på väg ${r}`;
}

export function alertText(
  kind: HazardKind,
  distanceM: number,
  hazard?: PointHazard,
  step?: AccidentStep,
): string {
  switch (kind) {
    case "accident": {
      const km = Math.max(1, Math.round(distanceM / 1000));
      // VAR, inte bara hur långt (Bengt+Axel 2/9). "E18" läses "E arton" av talsyntesen,
      // men ett blott nummer blir "olycka på 25" — därför "väg 25" när numret saknar bokstav.
      const on = roadPhrase(hazard?.meta?.road);
      switch (step) {
        case "early": {
          const clearedAt = hazard?.meta?.endTimeLocal;
          const base =
            `Allvarlig olycka${on} ${km} kilometer framför dig — stor påverkan på trafiken. ` +
            `Överväg annan väg.`;
          return clearedAt ? `${base} Beräknas röjd vid ${clearedAt}.` : base;
        }
        case "reminder":
          return "Sakta ner — olycksplats strax framför dig.";
        case "late":
          return `Allvarlig olycka${on} ${km} kilometer framför dig — stor påverkan. Sakta ner.`;
        default:
          return `Olycka rapporterad${on} ${km} kilometer framför dig.`;
      }
    }
    case "slippery_segment":
      return "Varning: halka rapporterad på vägen framför dig.";
    case "icing_point":
      if (hazard?.meta?.bridge) {
        // Bridge (#38): say WHAT and roughly WHERE — the driver looks for the bridge.
        const m = Math.max(100, Math.round(distanceM / 100) * 100);
        return `Frysrisk framöver — bro om ${m} meter.`;
      }
      return "Isrisk framöver — vägbanan nära noll grader.";
    case "wildlife":
      return "Viltrisk framöver."; // DECISIONS #266/#318 — punktkälla ⇒ "framöver"
    case "camera": {
      const limit = hazard?.meta?.speedLimitKmh;
      return limit != null
        ? `Fartkamera om 500 meter. Gränsen är ${limit}.`
        : "Fartkamera om 500 meter.";
    }
  }
}


// ═══ engine/src/engine.ts ═══
// Halkvakt alert engine v0 — the module that decides when to speak and when to stay silent.
// Deterministic by construction: no clocks, no randomness, no I/O. Time comes from fixes.
// Discipline rules (PLAN §1) are hard requirements, encoded here and proven by engine/vectors/.
//
//   1. Within 10 s of an utterance only a MORE important hazard may speak (priority-aware
//      cooldown, globalCooldownS; kort #127, v23 — replaced the blind 45 s). Priority
//      accident > slippery > icing > wildlife > camera.
//      Losers are DROPPED, not queued. No exceptions, not even for accidents (logged in
//      DECISIONS — revisit only on beta evidence).
//   2. Same hazard never repeats until BOTH 10 min have passed AND 5 km been driven.
//      SINGLE EXCEPTION (DECISIONS #28): a serious accident speaks twice by design —
//      once early (10 km, while exits remain) and once close (2 km, "slow down").
//      These are two different messages about one hazard, not a repeat of one message,
//      and they are held apart by two distinct alert keys rather than by weakening rule 2.
//   3. Point sources say "framöver"; only segment sources may say "på vägen framför dig"
//      (enforced in texts.ts).
//   4. Silence is the default. No hazard in corridor ⇒ no sound. Ever.


interface FiredState { t: number; odometerM: number; }

/**
 * `alertKey` is what the repeat rules remember — normally the hazard id, but a SERIOUS
 * accident owns two independent voice slots ("<id>#early" and "<id>#near") so the 2 km
 * reminder is not swallowed by the 10-min/5-km suppression that follows the 10 km call.
 * This is the "step-aware warning id" of DECISIONS #28. The key stays internal: the
 * emitted Alert keeps its hazardId. Since DECISIONS #443 the Alert also carries `step`
 * (serious accidents only) so the warning card can show which call it is.
 */
interface Candidate {
  hazard: Hazard; kind: HazardKind; distM: number;
  alertKey: string;
  step?: AccidentStep;
}

// Swedish word-start boundary: "Isfläckar"/"Svår halka" match; "fläckvis Våt" must NOT
// (the substring 'is' inside "fläckvis" produced 8 false halka-segments on real August
// data — see test "fläckvis is not halka").
const SLIPPERY_INFO = /(?<![a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)/i;
// Snow and frost count INSIDE compounds too (kort #97, Bengt 16/9): the word-start rule above made
// "Nysnö", "Rimfrost", "Blötsnö" and "Nattfrost" silent on code 1 — the operator wrote the word, so
// it speaks. "halk" is NOT a stem: "Halkbekämpning" and "Halkskydd" are countermeasures, not hazards,
// so only halka/halkrisk/halkig are listed above. Vector v24 locks all of it in three ports.
const SLIPPERY_STAM = /(snö|frost)/i;

export class AlertEngine {
  private readonly cfg: EngineConfig;
  private points: PointHazard[] = [];
  private segments: { h: SegmentHazard; samples: LonLat[] }[] = [];

  private prevFix: Fix | null = null;
  private lastHeadingDeg: number | null = null;
  private odometerM = 0;
  private lastSpokenT: number | null = null;
  /** Vad som senast sades — spärren får bara tysta något som INTE är viktigare (#127). */
  private lastSpokenKind: HazardKind | null = null;
  /** Skuggmotorn lyssnar här (#127 a): vad spärren kastar syns annars ingenstans. */
  onSuppressed?: (c: { kind: HazardKind; hazardId: string; distM: number; by: HazardKind; sinceS: number }) => void;
  /** FÖRSPRÅNGET (kort #153 beslut 1, docs/TROSKLAR-FORSPRANG.md §4): valfri krok som ger förvarningsavståndet per fara. Utan
   *  krok är motorn byte för byte densamma — vektorerna rörs inte. Svaret klämms till leadMinM och MOTORNS leadMaxM (3 000 m),
   *  inte till appens reglage (kort #275 väg (a)). Bara skuggan sätter den i vinter; portarna får den först vid steg 7, efter domen. */
  leadFor?: (h: Hazard, leadM: number, speedMps: number) => number;
  private fired = new Map<string, FiredState>();

  constructor(hazards: Hazard[], cfg: Partial<EngineConfig> = {}) {
    this.cfg = { ...DEFAULT_CONFIG, ...cfg };
    this.ingest(hazards);
  }

  private ingest(hazards: Hazard[]): void {
    this.points = [];
    this.segments = [];
    for (const h of hazards) {
      if (h.kind === "slippery_segment") {
        this.segments.push({ h, samples: samplePolyline(h.line, this.cfg.segmentSampleM) });
      } else {
        this.points.push(h);
      }
    }
  }

  /**
   * Swap the hazard set mid-drive (fresh snapshot arrived) WITHOUT losing memory:
   * odometer, heading, cooldown clock and the per-hazard fired-map survive, so the
   * guard never re-announces something it just said. Hazard ids are stable across
   * snapshots (source ids), which is what makes the fired-map carry over meaningful.
   * Entries for ids no longer present are kept on purpose: a hazard that flickers
   * out of one snapshot and back into the next must still obey the repeat rules.
   */
  updateHazards(hazards: Hazard[]): void {
    this.ingest(hazards);
  }

  /** Feed one GPS fix. Returns the spoken alert, or null (the normal case: silence). */
  step(fix: Fix): Alert | null {
    const { speedKmh, headingDeg } = this.kinematics(fix);
    if (this.prevFix) this.odometerM += haversineM(this.prevFix, fix);
    this.prevFix = fix;
    if (headingDeg !== null) this.lastHeadingDeg = headingDeg;

    if (speedKmh === null || speedKmh < this.cfg.minSpeedKmh) return null;
    const heading = this.lastHeadingDeg;
    if (heading === null) return null;

    const speedMps = (speedKmh * 1000) / 3600;
    const leadM = Math.min(this.cfg.leadMaxM, Math.max(this.cfg.leadMinM, speedMps * this.cfg.warnLeadS));

    // Kort #275 väg (a) (Bengt 26/9, DECISIONS #419): försprånget kläms till MOTORNS tak, aldrig till cfg.leadMaxM — i apparna
    // är det reglaget Längsta förvarning (400–1 200 m, #259), som bara tar grundvarningen. Med reglagets tak räckte 90 s bara
    // till 48 km/h. Skuggan kör motorns standard, så där är talet detsamma.
    const lead = (h: Hazard) => this.leadFor
      ? Math.min(DEFAULT_CONFIG.leadMaxM, Math.max(this.cfg.leadMinM, this.leadFor(h, leadM, speedMps)))
      : leadM;
    const candidates: Candidate[] = [];
    for (const p of this.points) {
      const c = this.evaluatePoint(fix, heading, p, lead(p));
      if (c) candidates.push(c);
    }
    for (const s of this.segments) {
      const c = this.evaluateSegment(fix, heading, s, lead(s.h));
      if (c) candidates.push(c);
    }
    if (candidates.length === 0) return null;

    // Rule 2: per-hazard repeat suppression (both time AND distance must have elapsed).
    const eligible = candidates.filter((c) => {
      const f = this.fired.get(c.alertKey);
      if (!f) return true;
      const rearmed =
        fix.t - f.t >= this.cfg.repeatMinS && this.odometerM - f.odometerM >= this.cfg.repeatMinM;
      return rearmed;
    });
    if (eligible.length === 0) return null;

    // Rule 1a: priority selects the single winner; everything else is dropped.
    eligible.sort((a, b) => {
      const pa = PRIORITY.indexOf(a.kind), pb = PRIORITY.indexOf(b.kind);
      if (pa !== pb) return pa - pb;
      if (a.distM !== b.distM) return a.distM - b.distM;
      return a.alertKey < b.alertKey ? -1 : 1; // total order ⇒ determinism
    });
    const win = eligible[0];

    // Rule 1b: PRIORITETSMEDVETEN global spärr (#127, Bengt 13/9). Den gamla spärren var
    // blind: den tystade allt inom 45 s oavsett vad som just sagts. Faror som kvalificerar
    // EFTER varandra i stället för samtidigt fick då inverterad prioritet — kameran talade,
    // isen 20 s senare kastades, och när spärren öppnade var isen 61 m bort (v23).
    // Nu: spärren får bara kasta en vinnare vars prioritet inte är HÖGRE än det som senast
    // sades. En kamera kan aldrig avbryta is; is får avbryta en kamera. Golvet 10 s är
    // härlett ur kamerornas minimidistans (520 m i samma riktning ⇒ 15,6 s vid 120 km/h),
    // så en fartkamera kan aldrig tystas av det. Upprepningsregeln (regel 2) är orörd.
    if (this.lastSpokenT !== null && fix.t - this.lastSpokenT < this.cfg.globalCooldownS) {
      const winP = PRIORITY.indexOf(win.kind);
      const lastP = this.lastSpokenKind === null ? Infinity : PRIORITY.indexOf(this.lastSpokenKind);
      if (winP >= lastP) {   // inte viktigare än det senaste ⇒ kastas, som förr
        this.onSuppressed?.({ kind: win.kind, hazardId: win.hazard.id, distM: win.distM,
                              by: this.lastSpokenKind!, sinceS: fix.t - this.lastSpokenT });
        return null;
      }
      // viktigare ⇒ släpps igenom trots spärren
    }

    this.lastSpokenT = fix.t;
    this.lastSpokenKind = win.kind;
    this.fired.set(win.alertKey, { t: fix.t, odometerM: this.odometerM });
    const pointHazard = win.hazard.kind === "slippery_segment" ? undefined : (win.hazard as PointHazard);
    return {
      t: fix.t,
      hazardId: win.hazard.id,
      kind: win.kind,
      distanceM: Math.round(win.distM),
      text: alertText(win.kind, win.distM, pointHazard, win.step),
      ...(win.step ? { step: win.step } : {}),
    };
  }

  /** Run a whole trace. Convenience for replay/tests. */
  run(trace: Fix[]): Alert[] {
    const out: Alert[] = [];
    for (const f of trace) {
      const a = this.step(f);
      if (a) out.push(a);
    }
    return out;
  }

  // ---------- internals ----------

  private kinematics(fix: Fix): { speedKmh: number | null; headingDeg: number | null } {
    let speedKmh = fix.speedKmh ?? null;
    let headingDeg = fix.headingDeg ?? null;
    if (this.prevFix) {
      const dt = fix.t - this.prevFix.t;
      const dM = haversineM(this.prevFix, fix);
      if (speedKmh === null && dt > 0) speedKmh = (dM / dt) * 3.6;
      if (headingDeg === null && dM >= 5) headingDeg = bearingDeg(this.prevFix, fix);
    }
    return { speedKmh, headingDeg };
  }

  private evaluatePoint(fix: Fix, heading: number, p: PointHazard, leadM: number): Candidate | null {
    const { ahead, distM } = isAhead(fix, heading, p, this.cfg.corridorHalfAngleDeg);
    if (!ahead) return null;

    switch (p.kind) {
      case "camera": {
        if (distM > this.cfg.cameraTriggerM) return null;
        // Trafikverkets Bearing = riktningen kameran TITTAR, alltså rakt MOT trafiken den
        // fotograferar (mätplats för norrgående trafik har bäring ~158°, sydsydost). Den
        // övervakade färdriktningen är därför bearing + 180°. Bengt mätte felet på E4 2/9:
        // med rå jämförelse tystnade kameran på hans sida och den mötande varnade.
        if (p.bearing != null &&
            angDiffDeg((p.bearing + 180) % 360, heading) > this.cfg.cameraBearingToleranceDeg) {
          return null; // camera watches the opposite direction — stay silent
        }
        return { hazard: p, kind: p.kind, distM, alertKey: p.id };
      }
      case "accident":
        return this.evaluateAccident(p, distM);
      case "icing_point": {
        const t = p.meta?.surfaceTempC;
        // Bridges (#38): the deck freezes before the road — nearest station at +3 is enough.
        const threshold = p.meta?.bridge ? 3 : 1;
        const icy = t != null && t <= threshold && p.meta?.moisture === true;
        return icy && distM <= leadM ? { hazard: p, kind: p.kind, distM, alertKey: p.id } : null;
      }
      case "wildlife": {
        const active = p.meta?.active !== false;
        return active && distM <= leadM ? { hazard: p, kind: p.kind, distM, alertKey: p.id } : null;
      }
    }
  }

  /**
   * A3 grading (DECISIONS #28, "Olyckslyftet"). Trafikverket's SeverityCode decides
   * whether this is one utterance or two:
   *
   *   mild / unclassified  → today's single line, unchanged behaviour.
   *   serious (>= cfg)     → EARLY call at the 10 km horizon carrying the routing
   *                          decision, then a REMINDER inside 2 km carrying only speed.
   *
   * A driver who joins the road already inside 2 km never heard the early call, so the
   * near slot speaks "late" copy instead: same facts, no "överväg annan väg" — there is
   * no exit left to take, and telling someone to reroute when they cannot is noise.
   */
  private evaluateAccident(p: PointHazard, distM: number): Candidate | null {
    if (distM > this.cfg.accidentMaxAheadM) return null;

    const sev = p.meta?.severityCode;
    const serious = sev != null && sev >= this.cfg.accidentSeriousMinSeverity;
    if (!serious) return { hazard: p, kind: "accident", distM, alertKey: p.id };

    if (distM <= this.cfg.accidentNearM) {
      const earlySpoken = this.fired.has(`${p.id}#early`);
      return {
        hazard: p, kind: "accident", distM,
        alertKey: `${p.id}#near`,
        step: earlySpoken ? "reminder" : "late",
      };
    }
    // The early call is ONE-SHOT per hazard (#211, 20/9). Rule 2 re-arms a key after 10 min AND
    // 5 km — and a slow approach (≤ 45 km/h over the 8 km between the horizons) passes both
    // before 2 km, so "Överväg annan väg" spoke twice and the reminder made three. DECISIONS
    // #28 says exactly two; the early slot therefore never re-arms. Vector v25 locks it.
    if (this.fired.has(`${p.id}#early`)) return null;
    return { hazard: p, kind: "accident", distM, alertKey: `${p.id}#early`, step: "early" };
  }

  private evaluateSegment(
    fix: Fix, heading: number, s: { h: SegmentHazard; samples: LonLat[] }, leadM: number,
  ): Candidate | null {
    const meta = s.h.meta ?? {};
    const slippery =
      (meta.code != null && meta.code >= 2) ||
      (meta.info ?? []).some((i) => SLIPPERY_INFO.test(i) || SLIPPERY_STAM.test(i));
    if (!slippery) return null; // "Normalt"/"Våt" segments make no sound — silence is default

    let best: number | null = null;
    for (const pt of s.samples) {
      const { ahead, distM } = isAhead(fix, heading, pt, this.cfg.corridorHalfAngleDeg);
      if (ahead && (best === null || distM < best)) best = distM;
    }
    if (best === null || best > leadM) return null;
    return { hazard: s.h, kind: "slippery_segment", distM: best, alertKey: s.h.id };
  }
}


// ═══ engine/src/forsprang.ts ═══
// Allvar som försprång (kort #153 beslut 1, docs/TROSKLAR-FORSPRANG.md, DECISIONS #359). Ren logik, inget I/O.
//
// Rösten säger samma ord, tidigare — aldrig andra ord, aldrig högre prioritet (Axel, kartan §13.1; #90 roll B; E1). Försprånget
// utlöser ingenting: det ändrar bara NÄR en varning sägs som redan utlöses av sin egen mätning (tröskelregeln T3/T6).
// Bara skuggmotorn använder modulen i vinter. Portarna (Kotlin, Swift) får den först vid steg 7, efter domen i mars.

/** §3: nivå 2 prövas med tre försprång i sekunder, klämda av motorn till leadMinM–leadMaxM. Nivå 1 behåller dagens 30 s. */
export const FORSPRANG_SVEP_S = [45, 60, 90] as const;
/** §2: A1 halt väglag — Trafikverkets väglagskod 3 eller 4 (mycket besvärligt / is- och snövägbana). Uppräknade, aldrig ">= 3". */
export const A1_NIVA2_KODER: readonly number[] = [3, 4];
/** §2: A2 frysrisk — ytan ≤ 0 °C (= K1_GRANS[0] i publish/tillstand.ts)… */
export const A2_NIVA2_YTA_C = 0;
/** …och stationen blöt inom 2 h: väta ≥ 3 av 4 i N_SVEP (weather[].bevis.vata, DECISIONS #342). */
export const A2_NIVA2_VATA = 3;

export type ForsprangNiva = 1 | 2;

/** Nivån per fara (§2). null = faran ingår inte (olyckor, kameror, vilt). `vata` är weather[].bevis.vata per `wx:`-id; broarna
 *  saknar stationens id i snapshoten och står därför på nivå 1. */
export function forsprangNiva(h: Hazard, vata: Map<string, number>): ForsprangNiva | null {
  if (h.kind === "slippery_segment") {
    const kod = h.meta?.code;
    return typeof kod === "number" && A1_NIVA2_KODER.includes(kod) ? 2 : 1;
  }
  if (h.kind === "icing_point") {
    const yta = h.meta?.surfaceTempC;
    const v = vata.get(h.id);
    return typeof yta === "number" && yta <= A2_NIVA2_YTA_C && typeof v === "number" && v >= A2_NIVA2_VATA ? 2 : 1;
  }
  return null;
}

/** Kroken till motorn (AlertEngine.leadFor): nivå 2 får svepvärdets försprång, allt annat dagens. Motorn klämmer svaret. */
export function forsprangKrok(nivaer: Map<string, ForsprangNiva>, svepS: number) {
  return (h: Hazard, leadM: number, speedMps: number): number => (nivaer.get(h.id) === 2 ? speedMps * svepS : leadM);
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
  weather: { id: string; lon: number; lat: number; yta: number | null; fukt: boolean }[];
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
    out.push({ id: `wx:${w.id}`, kind: "icing_point", lon: w.lon, lat: w.lat, meta: { surfaceTempC: w.yta, moisture: w.fukt } });
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


// ═══ supabase/functions/skuggmotor/main.ts ═══
// ═══ Skuggmotorn (#20, Bengts design): kör motorn mot färska snapshoten på fasta
// referensrutter var 30:e min och loggar vad den SKULLE ha sagt — varningslogg
// med indata oavsett användarantal. Vid varning: arkivera närmaste väglags-
// kamerabild (facit-hinken, dedupe per station & 3 h). Rör aldrig användare.
// Land (#34): ?land=fi kör de finska rutterna mot den finska snapshoten. Samma motor,
// samma logg (kolumnen land), samma rapport. Sverige är standard.
const CDN_BY_LAND: Record<string, string> = {
  se: "https://axelstar.github.io/halkvakt-karta/data/app/v1/",
  fi: "https://axelstar.github.io/halkvakt-karta/data/app/fi/v1/",
  no: "https://axelstar.github.io/halkvakt-karta/data/app/no/v1/",   // #35, publiceras när Vegvesen-kontot finns
  dk: "https://axelstar.github.io/halkvakt-karta/data/app/dk/v1/",   // #36
};
const SB = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TRV = Deno.env.get("TRAFIKVERKET_API_KEY")!;

// Grova men FASTA referenslinjer (jämförbarhet över tid slår metern):
// Finland (#34): tre referenslinjer, samma grovhet som de svenska. Fejkresorna.
const ROUTES_FI: Record<string, [number, number][]> = {
  // Söder: E18-stråket och kusten
  "E18 Åbo→Helsingfors":        [[22.27,60.45],[22.60,60.43],[23.13,60.40],[23.60,60.38],[24.05,60.32],[24.50,60.24],[24.94,60.17]],
  "E18 Helsingfors→Kotka":      [[24.94,60.17],[25.30,60.27],[25.66,60.39],[26.23,60.46],[26.95,60.47]],
  "E18 Kotka→Vaalimaa":         [[26.95,60.47],[27.20,60.57],[27.55,60.58],[27.85,60.58]],
  "Rv2 Helsingfors→Björneborg": [[24.94,60.17],[24.32,60.33],[23.62,60.81],[23.10,61.02],[22.70,61.18],[21.80,61.49]],
  "Rv8 Åbo→Björneborg":         [[22.27,60.45],[21.98,60.68],[21.69,60.88],[21.51,61.13],[21.80,61.49]],
  // Mitten: vt3, vt4, vt9, vt5
  "Rv3 Helsingfors→Tammerfors": [[24.94,60.17],[24.86,60.63],[24.46,61.00],[23.95,61.27],[23.76,61.50]],
  "Rv3 Tammerfors→Vasa":        [[23.76,61.50],[23.30,61.75],[23.02,62.01],[22.75,62.49],[22.01,62.98],[21.62,63.10]],
  "E75 Helsingfors→Lahtis":     [[24.94,60.17],[25.03,60.36],[25.12,60.52],[25.30,60.70],[25.50,60.85],[25.66,60.98]],
  "E75 Lahtis→Jyväskylä":       [[25.66,60.98],[26.03,61.21],[25.95,61.60],[25.85,61.95],[25.75,62.24]],
  "Rv9 Tammerfors→Jyväskylä":   [[23.76,61.50],[24.36,61.68],[25.19,61.86],[25.75,62.24]],
  "Rv9 Jyväskylä→Kuopio":       [[25.75,62.24],[26.43,62.39],[27.12,62.62],[27.68,62.89]],
  "Rv5 Lahtis→Kuopio":          [[25.66,60.98],[26.03,61.21],[26.70,61.45],[27.27,61.69],[27.87,62.31],[27.68,62.89]],
  "Rv6 Kouvola→Joensuu":        [[26.70,60.87],[27.60,61.00],[28.19,61.06],[28.77,61.17],[29.50,61.55],[29.76,62.60]],
  // Norr: vt4-stråket, kusten, fjällvägarna
  "E75 Jyväskylä→Uleåborg":     [[25.75,62.24],[25.73,62.60],[25.86,63.07],[25.57,63.37],[25.85,63.68],[25.75,63.98],[25.87,64.27],[25.47,65.01]],
  "Rv8 Björneborg→Vasa":        [[21.80,61.49],[21.51,61.86],[21.37,62.27],[21.34,62.47],[21.62,63.10]],
  "Rv8 Vasa→Uleåborg":          [[21.62,63.10],[22.20,63.35],[22.70,63.55],[23.15,63.80],[23.80,64.05],[24.45,64.40],[25.05,64.75],[25.47,65.01]],
  "Rv5 Kuopio→Kajaani":         [[27.68,62.89],[27.66,63.08],[27.19,63.56],[27.50,63.90],[27.73,64.22]],
  "E75 Uleåborg→Rovaniemi":     [[25.47,65.01],[25.37,65.32],[25.05,65.66],[24.56,65.74],[25.00,66.10],[25.73,66.50]],
  "Rv20 Uleåborg→Kuusamo":      [[25.47,65.01],[26.20,65.20],[26.99,65.36],[28.24,65.57],[29.19,65.96]],
  "E8 Torneå→Kilpisjärvi":      [[24.15,65.85],[23.97,66.78],[23.79,67.33],[23.68,67.96],[22.50,68.50],[20.79,69.05]],
};

// Norge (#35): tjugo referenslinjer. Väntar på Vegvesens DATEX-konto; rutterna är klara.
const ROUTES_NO: Record<string, [number, number][]> = {
  "E6 Oslo→Lillehammer":        [[10.75,59.91],[11.03,60.20],[11.17,60.60],[10.93,60.80],[10.69,61.11]],
  "E6 Lillehammer→Dombås":      [[10.69,61.11],[10.48,61.50],[9.70,61.87],[9.13,62.08]],
  "E6 Dombås→Trondheim":        [[9.13,62.08],[9.55,62.35],[9.96,62.58],[10.15,63.00],[10.40,63.43]],
  "E6 Trondheim→Mo i Rana":     [[10.40,63.43],[11.30,63.85],[11.99,64.33],[12.65,64.90],[13.20,65.50],[14.14,66.31]],
  "E6 Mo i Rana→Narvik":        [[14.14,66.31],[15.40,66.95],[15.35,67.25],[16.03,67.70],[16.55,68.10],[17.43,68.44]],
  "E6 Narvik→Alta":             [[17.43,68.44],[18.96,68.85],[19.85,69.30],[20.90,69.60],[22.20,69.70],[23.27,69.97]],
  "E6 Alta→Kirkenes":           [[23.27,69.97],[24.90,70.20],[26.00,70.05],[27.60,70.05],[29.00,69.90],[30.05,69.73]],
  "E18 Oslo→Kristiansand":      [[10.75,59.91],[10.40,59.60],[10.03,59.27],[9.60,59.15],[9.10,58.98],[8.60,58.70],[8.00,58.15]],
  "E39 Kristiansand→Stavanger": [[8.00,58.15],[7.45,58.15],[7.10,58.35],[6.55,58.70],[5.75,58.97]],
  "E39 Stavanger→Bergen":       [[5.75,58.97],[5.75,59.30],[5.65,59.60],[5.55,59.90],[5.35,60.25],[5.33,60.39]],
  "E39 Bergen→Ålesund":         [[5.33,60.39],[5.60,60.85],[5.80,61.20],[6.10,61.50],[6.40,61.80],[6.20,62.20],[6.15,62.47]],
  "E39 Ålesund→Trondheim":      [[6.15,62.47],[6.80,62.55],[7.50,62.90],[8.05,63.05],[9.10,63.10],[10.40,63.43]],
  "E16 Oslo→Bergen":            [[10.75,59.91],[10.30,60.10],[9.80,60.55],[9.10,60.90],[8.20,61.15],[7.40,61.05],[6.70,60.90],[5.90,60.55],[5.33,60.39]],
  "Rv7 Hønefoss→Bergen":        [[10.25,60.17],[9.60,60.50],[8.80,60.55],[8.00,60.42],[7.50,60.45],[7.00,60.50],[6.40,60.45],[5.33,60.39]],
  "E134 Drammen→Haugesund":     [[10.20,59.74],[9.60,59.60],[8.90,59.60],[8.10,59.80],[7.35,59.85],[6.60,59.75],[5.85,59.55],[5.27,59.41]],
  "Rv3 Elverum→Ulsberg":        [[11.56,60.88],[11.20,61.50],[10.80,61.90],[10.45,62.30],[10.05,62.75]],
  "E14 Trondheim→Storlien":     [[10.40,63.43],[11.10,63.32],[11.60,63.30],[12.08,63.30]],
  "E10 Narvik→Å i Lofoten":     [[17.43,68.44],[16.70,68.50],[15.90,68.60],[15.00,68.55],[14.20,68.30],[13.60,68.15],[13.00,67.95]],
  "E8 Skibotn→Kilpisjärvi":     [[20.28,69.39],[20.50,69.20],[20.60,69.10],[20.79,69.05]],
  "Rv15 Otta→Stryn":            [[9.53,61.77],[8.90,61.90],[8.20,62.00],[7.60,62.00],[6.72,61.91]],
};

// Danmark (#36): tjugo referenslinjer — motorvägsnätet + Limfjorden, Bornholm, öarna.
const ROUTES_DK: Record<string, [number, number][]> = {
  "E45 Padborg→Kolding":          [[9.36,54.82],[9.42,55.04],[9.50,55.25],[9.47,55.49]],
  "E45 Kolding→Aarhus":           [[9.47,55.49],[9.75,55.57],[9.54,55.71],[9.85,55.86],[10.05,56.00],[10.20,56.16]],
  "E45 Aarhus→Aalborg":           [[10.20,56.16],[10.04,56.46],[9.85,56.65],[9.73,56.90],[9.92,57.05]],
  "E45 Aalborg→Frederikshavn":    [[9.92,57.05],[10.10,57.20],[10.30,57.35],[10.54,57.44]],
  "E39 Aalborg→Hirtshals":        [[9.92,57.05],[9.90,57.30],[9.96,57.59]],
  "E20 Esbjerg→Kolding":          [[8.45,55.47],[8.90,55.50],[9.20,55.50],[9.47,55.49]],
  "E20 Kolding→Odense":           [[9.47,55.49],[9.75,55.57],[10.05,55.48],[10.39,55.40]],
  "E20 Odense→Storebælt→Slagelse":[[10.39,55.40],[10.79,55.31],[11.00,55.33],[11.14,55.33],[11.35,55.40]],
  "E20 Slagelse→København":       [[11.35,55.40],[11.75,55.45],[12.08,55.55],[12.45,55.63],[12.57,55.68]],
  "E47 København→Rødby":          [[12.57,55.68],[12.18,55.46],[11.98,55.25],[11.87,54.77],[11.39,54.66]],
  "E47 København→Helsingør":      [[12.57,55.68],[12.50,55.80],[12.55,55.92],[12.61,56.03]],
  "Rv21 København→Kalundborg":    [[12.57,55.68],[12.08,55.64],[11.70,55.65],[11.40,55.68],[11.09,55.68]],
  "Rv16 København→Hillerød":      [[12.57,55.68],[12.45,55.78],[12.31,55.93]],
  "Rv15 Aarhus→Grenaa":           [[10.20,56.16],[10.45,56.25],[10.70,56.35],[10.88,56.41]],
  "Rv15 Aarhus→Herning":          [[10.20,56.16],[9.85,56.15],[9.55,56.17],[8.98,56.14]],
  "Rv13 Vejle→Viborg":            [[9.54,55.71],[9.50,56.00],[9.40,56.25],[9.40,56.45]],
  "Rv26 Aarhus→Viborg→Skive":     [[10.20,56.16],[9.80,56.30],[9.40,56.45],[9.03,56.57]],
  "Rv11 Holstebro→Thisted":       [[8.62,56.36],[8.55,56.65],[8.62,56.85],[8.69,56.95]],
  "E20 Esbjerg→Ribe→Padborg":     [[8.45,55.47],[8.77,55.33],[9.10,55.10],[9.36,54.82]],
  "Rv38 Rønne→Nexø (Bornholm)":   [[14.70,55.10],[14.85,55.10],[15.00,55.08],[15.13,55.06]],
};

const ROUTES: Record<string, [number, number][]> = {
  "E22 Malmö→Kristianstad": [[13.05,55.60],[13.19,55.70],[13.35,55.76],[13.54,55.83],[13.74,55.85],[13.95,55.90],[14.05,55.95],[14.16,56.03]],
  "Väg 23 Höör→Osby":       [[13.54,55.94],[13.62,56.02],[13.70,56.09],[13.77,56.16],[13.85,56.25],[13.93,56.32],[13.98,56.38]],
  "Väg 19 Ystad→Kristianstad": [[13.82,55.43],[13.87,55.50],[13.95,55.55],[14.02,55.63],[14.10,55.72],[14.13,55.82],[14.15,55.92],[14.16,56.02]],
  "E6 Malmö→Halmstad": [[12.99,55.61],[12.83,55.87],[12.70,56.05],[12.86,56.24],[12.85,56.42],[13.04,56.51],[12.86,56.67]],
  "E6 Halmstad→Göteborg": [[12.86,56.67],[12.49,56.90],[12.25,57.11],[12.08,57.49],[11.97,57.71]],
  "E6 Göteborg→Strömstad": [[11.97,57.71],[11.98,57.87],[11.82,58.07],[11.94,58.35],[11.68,58.47],[11.32,58.72],[11.17,58.94]],
  "Rv40 Göteborg→Jönköping": [[11.97,57.71],[12.22,57.68],[12.94,57.72],[13.42,57.79],[14.16,57.78]],
  "E4 Helsingborg→Jönköping": [[12.70,56.05],[13.28,56.28],[13.60,56.46],[13.94,56.83],[14.04,57.19],[14.16,57.78]],
  "E4 Jönköping→Linköping": [[14.16,57.78],[14.47,58.02],[14.65,58.23],[15.13,58.32],[15.62,58.41]],
  "E4 Linköping→Södertälje": [[15.62,58.41],[16.19,58.59],[17.01,58.75],[17.63,59.20]],
  "E4 Södertälje→Uppsala": [[17.63,59.20],[18.07,59.33],[17.92,59.65],[17.64,59.86]],
  "E4 Uppsala→Gävle": [[17.64,59.86],[17.51,60.34],[17.14,60.67]],
  "E4 Gävle→Sundsvall": [[17.14,60.67],[17.06,61.30],[17.11,61.73],[17.31,62.39]],
  "E4 Sundsvall→Umeå": [[17.31,62.39],[17.94,62.63],[18.72,63.29],[19.50,63.57],[20.26,63.83]],
  "E4 Umeå→Luleå": [[20.26,63.83],[21.06,64.75],[21.48,65.32],[22.15,65.58]],
  "E10 Luleå→Kiruna": [[22.15,65.58],[21.69,65.83],[20.66,67.13],[20.23,67.86]],
  "E14 Sundsvall→Åre": [[17.31,62.39],[15.66,62.53],[15.42,62.75],[14.64,63.18],[13.08,63.40]],
  "E18 Karlstad→Örebro": [[13.50,59.38],[14.11,59.31],[14.52,59.33],[15.21,59.27]],
  "E18 Örebro→Stockholm": [[15.21,59.27],[15.84,59.39],[16.55,59.61],[17.07,59.64],[18.07,59.33]],
  "Rv70 Enköping→Mora": [[17.07,59.64],[16.60,59.92],[16.17,60.15],[15.98,60.28],[15.43,60.48],[15.13,60.55],[14.99,60.73],[15.12,60.89],[14.54,61.00]],
};

function traceAlong(line: [number, number][], kmh = 80, stepS = 5): Fix[] {
  const mps = (kmh * 1000) / 3600;
  const fixes: Fix[] = []; let t = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [lon1, lat1] = line[i], [lon2, lat2] = line[i + 1];
    const d = haversineM({ lon: lon1, lat: lat1 }, { lon: lon2, lat: lat2 });
    const steps = Math.max(1, Math.round(d / (mps * stepS)));
    for (let s = 0; s < steps; s++) {
      const f = s / steps;
      fixes.push({ t, lon: lon1 + (lon2 - lon1) * f, lat: lat1 + (lat2 - lat1) * f, speedKmh: kmh });
      t += stepS;
    }
  }
  return fixes;
}

async function trvCameras(): Promise<{ id: string; lon: number; lat: number; url: string }[]> {
  const q = `<REQUEST><LOGIN authenticationkey="${TRV}"/><QUERY objecttype="Camera" schemaversion="1" limit="1500"><FILTER><EQ name="Type" value="Väglagskamera"/></FILTER><INCLUDE>Id</INCLUDE><INCLUDE>PhotoUrl</INCLUDE><INCLUDE>Geometry.WGS84</INCLUDE></QUERY></REQUEST>`;
  const r = await fetch("https://api.trafikinfo.trafikverket.se/v2/data.json", {
    method: "POST", headers: { "Content-Type": "text/xml" }, body: q });
  const j = await r.json();
  const rows = j?.RESPONSE?.RESULT?.[0]?.Camera ?? [];
  return rows.flatMap((c: any) => {
    const m = /POINT \(([\d.]+) ([\d.]+)\)/.exec(c?.Geometry?.WGS84 ?? "");
    return m && c.PhotoUrl ? [{ id: String(c.Id), lon: +m[1], lat: +m[2], url: c.PhotoUrl }] : [];
  });
}

// FACITARKIVERINGEN — rättad 14/9 (kort #157, DECISIONS #172/#173, Bengts order).
//
// VAD SOM VAR FEL: bucketen `facit` innehöll NOLL objekt efter 5 657 skuggkörningar, varav 756
// med larm. Sex av sju led i kedjan mättes och höll — bucketen fanns sedan 29/8, TRV-frågan gav
// 749 kameror, bildens URL svarade 200 med en giltig jpeg. Det sjunde ledet, uppladdningen, var
// det enda som inte gick att prova utifrån, och det enda Supabase-anropet i hela repot som
// saknade `apikey`. Varje annat anrop i den här filen skickar både Authorization och apikey.
//
// TRE RÄTTELSER, för en ensam hade dolt de andra två:
//  1. `apikey` läggs till i uppladdningen.
//  2. Budgeten återställs PER ANROP. Den stod på modulnivå och minskades bara vid LYCKAD
//     sparning, så ett isolat som fått sina fem bilder tystnade för gott. Med enbart rättelse 1
//     hade det gett fem bilder och sedan tystnad — och sett ut som att felet var löst.
//  3. VARJE GREN SÄGER VARFÖR. Funktionen returnerade bara en siffra, och noll gick inte att
//     skilja från "inga larm". Nu går skälet med i svaret, och uppladdningens fel bär API:ets
//     SVARSKROPP — kameror-vaglag-läxan i CLAUDE.md, som fanns nedskriven men inte tillämpad här.
//
// VARFÖR DET HASTAR: en kamerabild är ett ögonblick. Trafikverket serverar bara den senaste, så
// det finns inget arkiv att hämta en passerad natt ur. Kamerafacit är därmed den enda källan i
// hela projektet som INTE går att räkna om i efterhand — och den bärande facitkällan för T-B
// (#88), tystnadsfelet (#98) och mars-domen (DECISIONS #94).
//
// RÄTTELSE 4 (15/9, bedömning v3 N1, DECISIONS #189): DEN ÅTTONDE LÄNKEN. Form A (#179) gav
// skuggloggens rader en position — men den här funktionen fick fortfarande motorns Alert, som inte
// bär någon (engine/src/types.ts), och räknade haversine på NaN precis som förut. Facitradien 15/9
// mätte 174 positionerade larm, ALLA inom 13,4 km från en kamera, och bucketen stod ändå på noll.
// Nu tar funktionen PUNKTER, uppslagna ur faran på samma sätt som loggen: punktfaror bär lon/lat,
// segment får ingen punkt (form A:s regel — en centroid kan ligga milsvitt från larmet).
const FACIT_PER_KORNING = 5;
let facitBudget = FACIT_PER_KORNING;

async function archiveFacit(punkter: { lon: number; lat: number }[], route: string): Promise<{ saved: number; skal: string[] }> {
  const skal: string[] = [];
  if (facitBudget <= 0) return { saved: 0, skal: ["budget slut"] };
  if (!punkter.length) return { saved: 0, skal: [] };
  const cams = await trvCameras();
  if (!cams.length) return { saved: 0, skal: ["TRV gav noll väglagskameror"] };
  const bucket3h = Math.floor(Date.now() / 10_800_000);
  const day = new Date().toISOString().slice(0, 10);
  let saved = 0;
  const seen = new Set<string>();
  for (const a of punkter) {
    let best = null as null | typeof cams[0]; let bd = 15_000;
    for (const c of cams) {
      const d = haversineM({ lon: a.lon, lat: a.lat }, { lon: c.lon, lat: c.lat });
      if (d < bd) { bd = d; best = c; }
    }
    if (!best) { skal.push("ingen kamera inom 15 km"); continue; }
    if (seen.has(best.id)) continue;
    seen.add(best.id);
    const path = `${day}/${best.id}-${bucket3h}.jpg`;
    const bild = await fetch(best.url).catch(() => null);
    if (!bild?.ok) { skal.push(`bildhämtning ${bild ? bild.status : "kastade"}`); continue; }
    const img = await bild.arrayBuffer();
    const up = await fetch(`${SB}/storage/v1/object/facit/${path}`, {
      method: "POST",
      // apikey SAKNADES här, och bara här. Det var kort #157:s troliga rotorsak.
      headers: { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "image/jpeg" },
      body: img });
    if (up.ok) { saved++; continue; }
    if (up.status === 409) { skal.push("409 fanns redan"); continue; }   // dedupe — helt ok
    skal.push(`uppladdning ${up.status}: ${(await up.text().catch(() => "")).slice(0, 120)}`);
  }
  return { saved, skal };
}

// STEG E — VATTENPLANINGENS SKUGGA (kort #154/#81, grind V-B, DECISIONS #191, Bengts ja 15/9).
// `rain_segments` (#187) når ingen port; här får de tala för mätningens skull. Samma motor, EGEN
// instans: korridor, försprång, 45 s och 10 min/5 km är motorns egna regler, inte en andra
// implementation av dem. `code: 2` i den syntetiska faran betyder BARA "får tala" i den här
// mätningen — evaluateSegment tiger på kod 1 — och den riktiga koden går med i loggraden.
// Bara segment i ruttens ruta (+0,05° ≈ 5 km, mer än leadMaxM 3 km): CPU-taket (läxa 29/8).
// Positionen är BILENS när rösten skulle talat (geo "bil") — det är där facitbilden ska tas.
// Rör aldrig `alerts`: den listan är motorns ord. Loggas i egen kolumn `vb` (sql/019).
type RainSeg = { id: string; line: [number, number][]; code: number | null; road: string | null; regn: number | null };
function vbAlerts(lv: any, route: [number, number][], trace: Fix[]) {
  const segs: RainSeg[] = Array.isArray(lv?.rain_segments) ? lv.rain_segments : [];
  const M = 0.05;
  const lons = route.map((p) => p[0]), lats = route.map((p) => p[1]);
  const x0 = Math.min(...lons) - M, x1 = Math.max(...lons) + M, y0 = Math.min(...lats) - M, y1 = Math.max(...lats) + M;
  const nara = segs.filter((s) => Array.isArray(s.line) && s.line.some(([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1));
  if (!nara.length) return [];
  const byId = new Map(nara.map((s) => [`vb:${s.id}`, s]));
  const syntetiska: Hazard[] = nara.map((s) => ({ id: `vb:${s.id}`, kind: "slippery_segment", line: s.line, meta: { code: 2, info: [] } }));
  const byT = new Map(trace.map((f) => [f.t, f]));
  return new AlertEngine(syntetiska).run(trace).map((a) => {
    const s = byId.get(a.hazardId)!, f = byT.get(a.t);
    return { t: a.t, id: s.id, regn: s.regn, code: s.code, road: s.road, distanceM: a.distanceM,
             geo: "bil", lon: f?.lon ?? null, lat: f?.lat ?? null };
  });
}

// OLJA PÅ VÄGEN (kort #276 väg (a), Bengt 1/10, DECISIONS #421): var rösten SKULLE ha talat om Trafikverkets
// NonWeatherRelatedRoadConditions — mest olja, diesel och hydraulolja med "risk för halka". Egen motorinstans och egen
// kolumn `olja` (sql/040), aldrig i `alerts`: den listan är motorns ord, och oljan får varken tränga undan eller tystas av
// de riktiga varningarna. Farorna matas som punktfaror med viltets regel (talar inom grundvarningens försprång) bara för att
// få motorns riktnings-, avstånds- och upprepningsregler — ingen text och ingen prioritet prövas; de är Axels efter skuggan.
// Hela klassen loggas med sin text, så mätningen kan skilja olja från potthål i efterhand.
type Olja = { id: string; lon: number; lat: number; text: string | null; sev: number | null };
async function oljaAktiva(): Promise<{ lista: Olja[]; skal: string | null }> {
  try {
    const r = await fetch(`${SB}/rest/v1/rpc/olja_aktiva`, { method: "POST",
      headers: { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "application/json" }, body: "{}" });
    if (!r.ok) return { lista: [], skal: `olja_aktiva ${r.status}: ${(await r.text().catch(() => "")).slice(0, 120)}` };
    const rows: any[] = await r.json();
    const lista = rows.flatMap((x) => (typeof x.lon === "number" && typeof x.lat === "number"
      ? [{ id: String(x.id), lon: x.lon, lat: x.lat, text: x.meddelande ?? null, sev: x.sev ?? null }] : []));
    return { lista, skal: lista.length ? null : "inga aktiva händelser i arkivet" };
  } catch (e) { return { lista: [], skal: `olja_aktiva kastade: ${String(e).slice(0, 120)}` }; }
}
function oljaAlerts(olja: Olja[], route: [number, number][], trace: Fix[]) {
  const M = 0.05;
  const lons = route.map((p) => p[0]), lats = route.map((p) => p[1]);
  const x0 = Math.min(...lons) - M, x1 = Math.max(...lons) + M, y0 = Math.min(...lats) - M, y1 = Math.max(...lats) + M;
  const nara = olja.filter((o) => o.lon >= x0 && o.lon <= x1 && o.lat >= y0 && o.lat <= y1);
  if (!nara.length) return [];
  const byId = new Map(nara.map((o) => [`olja:${o.id}`, o]));
  const syntetiska: Hazard[] = nara.map((o) => ({ id: `olja:${o.id}`, kind: "wildlife", lon: o.lon, lat: o.lat }));
  return new AlertEngine(syntetiska).run(trace).map((a) => {
    const o = byId.get(a.hazardId)!;
    return { t: a.t, id: o.id, text: o.text, sev: o.sev, distanceM: a.distanceM, geo: "punkt", lon: o.lon, lat: o.lat };
  });
}

/** S1: väderpunkter i ruttens ruta (+5 km, samma ruta som vbAlerts) med N4:s råa fält och motorns utfall. */
function efterhalkaRader(lv: any, route: [number, number][], alerts: Alert[]) {
  const wx: any[] = Array.isArray(lv?.weather) ? lv.weather : [];
  if (!wx.length) return [];
  const M = 0.05;
  const lons = route.map((p) => p[0]), lats = route.map((p) => p[1]);
  const x0 = Math.min(...lons) - M, x1 = Math.max(...lons) + M, y0 = Math.min(...lats) - M, y1 = Math.max(...lats) + M;
  const larmade = new Set(alerts.map((a) => a.hazardId));
  return wx.filter((w) => w.lon >= x0 && w.lon <= x1 && w.lat >= y0 && w.lat <= y1).map((w) => ({
    id: String(w.id), yta: w.yta ?? null, fukt: w.fukt ?? null,
    regn_h: w.regn_h ?? null, lutning15: w.lutning15 ?? null, lutning30: w.lutning30 ?? null, lutning60: w.lutning60 ?? null,
    larm: larmade.has(`wx:${w.id}`),
  }));
}

/** SEGMENTPROGNOSENS ANKARE (sql/032 vagpunkt_ankare, DECISIONS #324/#325): vaktade, färska svenska stationer med
 *  yttemperatur — samma population som det appen hör och som grind A dömdes på. Fail-soft med skäl: en tom prognos
 *  utan orsak är omöjlig att skilja från "inga ankare", samma läxa som facit-hinken (#173). */
async function vagpunktAnkare(): Promise<{ lista: Ankare[]; skal: string | null }> {
  try {
    const r = await fetch(`${SB}/rest/v1/rpc/vagpunkt_ankare`, { method: "POST",
      headers: { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "application/json" }, body: "{}" });
    if (!r.ok) return { lista: [], skal: `vagpunkt_ankare ${r.status}: ${(await r.text().catch(() => "")).slice(0, 120)}` };
    const rows: any[] = await r.json();
    const lista = rows.flatMap((x) => (typeof x.lon === "number" && typeof x.lat === "number" && x.yta != null
      ? [{ id: String(x.id), lon: x.lon, lat: x.lat, yta: Number(x.yta) }] : []));
    return { lista, skal: lista.length ? null : "vagpunkt_ankare gav noll ankare" };
  } catch (e) { return { lista: [], skal: `vagpunkt_ankare kastade: ${String(e).slice(0, 120)}` }; }
}

// FÖRSPRÅNGET (kort #153 beslut 1, docs/TROSKLAR-FORSPRANG.md §4, DECISIONS #359). Eget anrop på :12/:42 — huvudvarvet slår redan i
// datorkraftens tak (546 kl 04:32 och 05:02Z 25/9, på :02/:32). Samma halvtimmes rutter som huvudvarvet; bara rutter med en nivå 2-fara
// i rutan körs, och där körs motorn två gånger på samma spår: baskörningen (dagens motor) och varianten (nivå 2 med halvtimmens
// svepvärde). Båda körningarnas varningar och undanträngda loggas i forsprang_log. Aldrig hört. `prov` skriver inget.
async function forsprangVarv(prov: boolean): Promise<Response> {
  const svar = (x: unknown) => new Response(JSON.stringify(x), { headers: { "Content-Type": "application/json" } });
  const halvtimme = Math.floor(Date.now() / 1800e3);
  const svepS = prov ? FORSPRANG_SVEP_S[1] : FORSPRANG_SVEP_S[halvtimme % FORSPRANG_SVEP_S.length];
  const kor = (hazards: Hazard[], trace: Fix[], nivaer: Map<string, ForsprangNiva>, krok: boolean) => {
    const motor = new AlertEngine(hazards);
    if (krok) motor.leadFor = forsprangKrok(nivaer, svepS);
    const suppressed: { kind: string; id: string; distM: number; by: string }[] = [];
    motor.onSuppressed = (c) => suppressed.push({ kind: c.kind, id: c.hazardId, distM: Math.round(c.distM), by: c.by });
    const alerts = motor.run(trace).map((a) => ({ t: a.t, id: a.hazardId, kind: a.kind, distanceM: Math.round(a.distanceM),
      niva: nivaer.get(a.hazardId) ?? null }));
    return { alerts, suppressed };
  };
  if (prov) {
    // Ett rakt spår österut i 80 km/h: ett nivå 1-segment (kod 2) vid ~2 km och ett nivå 2-segment (kod 4) vid ~4 km. Nivå 1 ska tala
    // på samma avstånd i båda körningarna; nivå 2 ska tala tidigare i varianten (60 s mot 30 s ⇒ ungefär dubbla avståndet).
    const hazards: Hazard[] = [
      { id: "prov:niva1", kind: "slippery_segment", line: [[15.035, 59.0], [15.040, 59.0]], meta: { code: 2, info: [] } },
      { id: "prov:niva2", kind: "slippery_segment", line: [[15.070, 59.0], [15.078, 59.0]], meta: { code: 4, info: [] } },
    ];
    const nivaer = new Map<string, ForsprangNiva>(hazards.map((h) => [h.id, forsprangNiva(h, new Map())!]));
    const trace = traceAlong([[15.0, 59.0], [15.1, 59.0]]);
    return svar({ ok: true, prov: "forsprang", svep_s: svepS, bas: kor(hazards, trace, nivaer, false), variant: kor(hazards, trace, nivaer, true) });
  }
  const CDN = CDN_BY_LAND["se"];
  const bust = `?t=${Date.now()}`;
  const [st, lv] = await Promise.all([
    fetch(CDN + "static.json" + bust).then((r) => r.json()),
    fetch(CDN + "live.json" + bust).then((r) => r.json()),
  ]);
  const hazards = snapshotToHazards(st, lv);
  const vata = new Map<string, number>();
  for (const w of (Array.isArray(lv?.weather) ? lv.weather : [])) if (typeof w?.bevis?.vata === "number") vata.set(`wx:${w.id}`, w.bevis.vata);
  const nivaer = new Map<string, ForsprangNiva>();
  for (const h of hazards) { const n = forsprangNiva(h, vata); if (n !== null) nivaer.set(h.id, n); }
  const iRutan = (h: Hazard, x0: number, x1: number, y0: number, y1: number) => {
    const pts: [number, number][] = h.kind === "slippery_segment" ? h.line : [[(h as any).lon, (h as any).lat]];
    return pts.some(([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
  };
  const allNames = Object.keys(ROUTES).sort();
  const slots = 7;
  const batch = allNames.filter((_, i) => i % slots === halvtimme % slots);   // samma halvtimmes rutter som huvudvarvet
  const rader: Record<string, unknown>[] = [];
  for (const name of batch) {
    const line = ROUTES[name];
    const M = 0.05, lons = line.map((q) => q[0]), lats = line.map((q) => q[1]);
    const x0 = Math.min(...lons) - M, x1 = Math.max(...lons) + M, y0 = Math.min(...lats) - M, y1 = Math.max(...lats) + M;
    const niva2 = hazards.filter((h) => nivaer.get(h.id) === 2 && iRutan(h, x0, x1, y0, y1)).length;
    if (!niva2) continue;
    const trace = traceAlong(line);
    const naraFaror = farorNaraRutten(hazards, line);   // rutfiltret (kort #244, DECISIONS #360) — samma utfall, mindre arbete
    const bas = kor(naraFaror, trace, nivaer, false), variant = kor(naraFaror, trace, nivaer, true);
    // FS-B4: en varning i varianten om en fara baskörningen aldrig talade om. Avståndet kvar till rutans slut följer med, så att
    // faror där baskörningens spår tog slut före faran kan redovisas för sig.
    const basIds = new Set(bas.alerts.map((a) => a.id));
    const langdKm = narmastLangs({ lon: line[line.length - 1][0], lat: line[line.length - 1][1] }, line).vid;
    const byId = new Map(hazards.map((h) => [h.id, h]));
    const nytt = variant.alerts.filter((a) => !basIds.has(a.id)).map((a) => {
      const h = byId.get(a.id) as any;
      const pt = h?.kind === "slippery_segment" ? { lon: h.line[0][0], lat: h.line[0][1] } : { lon: h?.lon, lat: h?.lat };
      const vid = typeof pt.lon === "number" ? narmastLangs(pt, line).vid : null;
      return { id: a.id, kind: a.kind, niva: a.niva, kvarKm: vid === null ? null : Math.round((langdKm - vid) * 10) / 10 };
    });
    rader.push({ route: name, svep_s: svepS, niva2, bas: bas.alerts, variant: variant.alerts,
      bas_suppressed: bas.suppressed, variant_suppressed: variant.suppressed, nytt });
  }
  let skrivet = "inget att skriva";
  if (rader.length) {
    const r = await fetch(`${SB}/rest/v1/forsprang_log`, { method: "POST",
      headers: { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(rader) });
    skrivet = r.ok ? `${rader.length} rader` : `forsprang_log ${r.status}: ${(await r.text().catch(() => "")).slice(0, 120)}`;
  }
  return svar({ ok: true, lage: "forsprang", svep_s: svepS, rutter: batch.length, med_niva2: rader.length,
    niva2_i_snapshoten: [...nivaer.values()].filter((n) => n === 2).length, skrivet });
}

Deno.serve(async (req) => {
  const k = Deno.env.get("INGEST_KEY");
  if (!k || req.headers.get("x-halkvakt-key") !== k) return new Response("forbidden", { status: 403 });
  try {
    // SPÄRRPROVET (kort #191 → bevis för #188, DECISIONS #197, Bengts ja 16/9). Två kameror på ett rakt spår
    // österut i 80 km/h: den första talar vid t=5 s, den andra når sin utlösning fem sekunder senare och
    // tystas av regel 1b (samma prioritet inom spärren) — kroken ska då ge EN rad. Septembers farubild ger
    // aldrig två larm så tätt, så beviset kan inte inväntas; det framkallas.
    // FÖRSTA PROVET 02:38Z 16/9 FÖLL: kamerorna stod 300 m isär (~14 s) och BÅDA talade — spärren är 10 s
    // sedan #127 (13/9), inte 45 s som CLAUDE.md:s invariant fortfarande säger. Kamerornas verkliga
    // minimidistans (520 m) ligger utanför spärren med flit; provet sätter dem 100 m isär just för att hamna
    // innanför de 10 sekunderna. Skriver INGET i shadow_log — en provrad hade förorenat tystnadsfelet och
    // upprepningen — svaret läses av dbknapp ur net._http_response.
    // Försprångets eget läge (kort #153 beslut 1) — före allt annat, så att huvudvarvets arbete aldrig körs i samma anrop.
    if (new URL(req.url).searchParams.get("lage") === "forsprang") return await forsprangVarv(new URL(req.url).searchParams.get("prov") === "1");
    // OLJEPROVET (kort #276): en påhittad oljefläck 1,1 km in på ett rakt spår ⇒ EN rad i `olja`, plus hur många aktiva händelser
    // arkivet ger just nu (RPC:n prövad i drift). Skriver INGET i shadow_log, samma skäl som spärrprovet nedan.
    if (new URL(req.url).searchParams.get("oljaprov") === "1") {
      const linje: [number, number][] = [[15.0, 59.0], [15.03, 59.0]];
      const aktiva = await oljaAktiva();
      const olja = oljaAlerts([{ id: "prov:olja", lon: 15.02, lat: 59.0, text: "Prov: olja på vägbanan", sev: null }], linje, traceAlong(linje));
      return new Response(JSON.stringify({ ok: true, prov: "olja", olja, aktiva: aktiva.lista.length, oljaSkal: aktiva.skal }),
        { headers: { "Content-Type": "application/json" } });
    }
    if (new URL(req.url).searchParams.get("sparrprov") === "1") {
      const prov: Hazard[] = [
        { id: "prov:kam1", kind: "camera", lon: 15.0105, lat: 59.0, bearing: null },   // ~600 m från start: talar t=5
        { id: "prov:kam2", kind: "camera", lon: 15.0122, lat: 59.0, bearing: null },   // ~700 m: kandidat t=10, 5 s < 10 ⇒ tystas
      ];
      const motor = new AlertEngine(prov);
      const suppressed: unknown[] = [];
      motor.onSuppressed = (c) => suppressed.push({ kind: c.kind, id: c.hazardId, distM: Math.round(c.distM), by: c.by, sinceS: c.sinceS });
      const alerts = motor.run(traceAlong([[15.0, 59.0], [15.03, 59.0]]));
      return new Response(JSON.stringify({ ok: true, prov: "sparr", alerts: alerts.map((a) => ({ t: a.t, id: a.hazardId, distanceM: a.distanceM })), suppressed }),
        { headers: { "Content-Type": "application/json" } });
    }
    const land = (new URL(req.url).searchParams.get("land") ?? "se").toLowerCase();
    const CDN = CDN_BY_LAND[land]; if (!CDN) return new Response("okänt land", { status: 400 });
    const routes = land === "fi" ? ROUTES_FI : land === "no" ? ROUTES_NO : land === "dk" ? ROUTES_DK : ROUTES;
    const bust = `?t=${Date.now()}`;
    const [st, lv] = await Promise.all([
      fetch(CDN + "static.json" + bust).then((r) => r.json()),
      fetch(CDN + "live.json" + bust).then((r) => r.json()),
    ]);
    const hazards = snapshotToHazards(st, lv);
    // Ankarna hämtas en gång per anrop, inte per rutt. Bara Sverige: funktionen läser det svenska arkivet.
    const ankare = land === "se" ? await vagpunktAnkare() : { lista: [] as Ankare[], skal: "bara Sverige" };
    const oljaLista = land === "se" ? await oljaAktiva() : { lista: [] as Olja[], skal: "bara Sverige" };
    const results: Record<string, unknown> = {};
    let facitTotal = 0;
    const facitSkal: string[] = [];
    facitBudget = FACIT_PER_KORNING;   // per ANROP, inte per isolat — se rättelse 2 ovan
    // Rotation: 3 rutter per varv (CPU-taket, läxa 29/8) — alla 20 täcks varje 3,5 h,
    // i båda länderna.
    const allNames = Object.keys(routes).sort();
    const slots = 7;
    const slot = Math.floor(Date.now() / 1800e3) % slots;
    // TIDMÄTNING PER STEG (kort #244, DECISIONS #360): funktionsloggen är Axels panel, så svaret bär själv var tiden går.
    const ms = { motor: 0, prognos: 0, facit: 0, t0: performance.now() };
    const batch = allNames.filter((_, i) => i % slots === slot);
    for (const name of batch) {
      const line = routes[name];
      {
      const trace = traceAlong(line);
      // SPÄRREN SYNLIG (#127 a, kort #188, DECISIONS #193, Bengts ja 15/9). Kroken fanns i motorn och
      // kolumnen i sql/016 sedan 13/9 — men ingen lyssnade, så kolumnen stod tom. Nu: det regel 1b
      // kastar loggas per körning, med vad som tystade det och med vilken marginal.
      // RUTFILTRET (kort #244, DECISIONS #360): motorn prövar bara faror inom sin längsta räckvidd från rutten — utfallet är
      // detsamma byte för byte (test/rutfilter.test.ts), arbetet en bråkdel. n_hazards nedan är fortsatt hela snapshotens antal.
      const t1 = performance.now();
      const motor = new AlertEngine(farorNaraRutten(hazards, line));
      const suppressed: { kind: string; id: string; distM: number; by: string; sinceS: number }[] = [];
      motor.onSuppressed = (c) => suppressed.push({ kind: c.kind, id: c.hazardId, distM: Math.round(c.distM), by: c.by, sinceS: c.sinceS });
      const alerts = motor.run(trace);
      ms.motor += performance.now() - t1;
      const vb = land === "se" ? vbAlerts(lv, line, trace) : [];
      const olja = oljaAlerts(oljaLista.lista, line, trace);
      // S1 — EFTERHALKANS INDATA (bedömning v3 S1, DECISIONS #198, Bengts "bygg S1 nu" 16/9). N4:s råa fält
      // per station i korridoren + om motorn larmade på stationen. Inget villkor: S2 sätter det, och raden
      // ska kunna spelas upp mot vilket villkor som helst. Axels grind (#196): regn_h döms här innan något
      // mer byggs på det. Tom i september (weather[] saknar stationer ≤ 3 °C) — det är rätt, inte fel.
      const efterhalka = land === "se" ? efterhalkaRader(lv, line, alerts) : [];
      // SEGMENTPROGNOSEN (kort #38b steg 4, DECISIONS #324/#325, Bengts "bygg nu" 23/9): rå avståndsviktning av de
      // vaktade stationerna per provpunkt längs rutten (engine/src/segment.ts). Loggad, aldrig hörd — grind B och C
      // dömer i mars. Tom utan ankare, och skälet står i svaret (ankareSkal), så en tom kolumn aldrig är tvetydig.
      // h = HOLDOUT (4c, DECISIONS #326): varje station inom 2 km av rutten skattad ur de övriga, med sin egen mätning.
      // Samma filter för ankarna: bara de inom prognosens grannradie plus holdoutens 2 km kan väga in (#360).
      const t2 = performance.now();
      const ankRutt = ankareNaraRutten(ankare.lista, line);
      const prognos = ankare.lista.length ? { ...segmentPrognos(line, ankRutt), h: holdoutRader(line, ankRutt) } : {};
      ms.prognos += performance.now() - t2;
      // Facit-bilder finns bara i Sverige (Trafikverkets väglagskameror). Punkterna slås upp ur
      // faran, inte ur larmet — motorns Alert bär ingen position (rättelse 4 ovan, DECISIONS #189).
      const farorById = new Map(hazards.map((h) => [h.id, h]));
      // V1 (Bengts ja 26/9, DECISIONS #380): ingen facitbild vid en fartkameravarning. 94 % av hinkens bilder togs där — torra
      // vägar som ingen dom behöver, ≈ 2 MB/dygn av lagringen och en femtedel av körningens tid.
      const punkter = alerts.flatMap((a) => {
        const h = farorById.get(a.hazardId) as any;
        return h && h.kind !== "slippery_segment" && h.kind !== "camera" && typeof h.lon === "number"
          ? [{ lon: h.lon as number, lat: h.lat as number }] : [];
      });
      // Steg E: också bilens position vid en vattenplaningsvarning — en torr vägbana i bild fäller
      // falsklarm enligt TROSKLAR-VATTENPLANING §2. Motorns punkter först; budgeten är gemensam.
      const vbPunkter = vb.flatMap((v) => (v.lon != null && v.lat != null ? [{ lon: v.lon, lat: v.lat }] : []));
      const t3 = performance.now();
      const f = land === "se" ? await archiveFacit([...punkter, ...vbPunkter], name) : { saved: 0, skal: [] };
      ms.facit += performance.now() - t3;
      // En nolla utan skäl är omöjlig att skilja från "inga larm" (#173) — även den här grenen säger varför.
      if (land === "se" && alerts.length && !punkter.length) f.skal.push("bara segment- eller fartkameralarm — inget som behöver väglagsfacit");
      facitBudget -= f.saved; facitTotal += f.saved; facitSkal.push(...f.skal);
      results[name] = { fixes: trace.length, alerts: alerts.length, vb: vb.length, olja: olja.length, suppressed: suppressed.length, efterhalka: efterhalka.length,
        prognos: (prognos as Prognos).p?.length ?? 0 };
      // LARMETS POSITION (kort #158, DECISIONS #177/#179, Axels ja via Bengt 14/9).
      //
      // FÖRUT SKREVS `lon: a.lon` — OCH DET FÄLTET FINNS INTE. Motorns Alert bär `t`, `hazardId`,
      // `kind`, `distanceM` och `text`, ingen koordinat. Edge-funktioner deployas utan typkontroll,
      // så det blev `undefined` och JSON.stringify tappade nyckeln TYST. Mätt 14/9: 2 103 larm på
      // fjorton dygn, NOLL med lon. Följden var att archiveFacit räknade haversine på NaN, aldrig
      // hittade en kamera och rapporterade "ingen kamera inom 15 km" — kamerafacit har därför
      // aldrig kunnat fyllas, och en kamerabild går inte att hämta i efterhand.
      //
      // POSITIONEN TAS UR FARAN, inte ur motorn. Punktfaror bär lon/lat själva; att slå upp dem på
      // hazardId kräver ingen motorlogik i den här filen (CLAUDE.md: klistra aldrig motorkod i en
      // edge function). `distanceM` skrivs också — Alert har alltid burit det, skuggmotorn kastade
      // bara bort det.
      //
      // SEGMENT FÅR INGEN KOORDINAT, OCH DET SÄGS RAKT UT. En slippery_segment är en polyline; dess
      // centroid kan ligga milsvitt från larmpunkten (Jämtlands segment är 59 km). Att skriva en
      // ungefärlig punkt vore att göra om samma fel en gång till, fast tystare. Fältet `geo` säger
      // därför VARFÖR en koordinat saknas: "punkt" = den finns, "segment" = den finns inte och ska
      // inte finnas, "okänd" = faran hittades inte alls, vilket i sig är ett larm värt att se.
      // Exakt punkt för segment kräver att motorns Alert bär den — det är form B och rör vektorerna.
      const body = JSON.stringify({
        route: name, land: land.toUpperCase(), snapshot_generated_at: lv.generated_at,
        n_hazards: hazards.length, n_alerts: alerts.length, vb, olja, suppressed, efterhalka, prognos,
        alerts: alerts.map((a) => {
          const h = farorById.get(a.hazardId) as any;
          const punkt = h && h.kind !== "slippery_segment" && typeof h.lon === "number";
          return {
            t: a.t, kind: a.kind, id: a.hazardId, text: a.text, distanceM: a.distanceM,
            geo: !h ? "okänd" : punkt ? "punkt" : "segment",
            ...(punkt ? { lon: h.lon, lat: h.lat } : {}),
          };
        }),
      });
      await fetch(`${SB}/rest/v1/shadow_log`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "application/json" },
        body });
      }
    }
    // Skälen går med i svaret. En nolla utan skäl är omöjlig att skilja från "inga larm",
    // och det var precis det som lät bucketen stå tom i sexton dygn utan att någon såg det.
    const tid = { motor: Math.round(ms.motor), prognos: Math.round(ms.prognos), facit: Math.round(ms.facit), totalt: Math.round(performance.now() - ms.t0) };
    return new Response(JSON.stringify({ ok: true, results, ankare: ankare.lista.length, ankareSkal: ankare.skal, olja: oljaLista.lista.length, oljaSkal: oljaLista.skal, facit: facitTotal,
      facitSkal: [...new Set(facitSkal)].slice(0, 8), ms: tid }), {
      headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
