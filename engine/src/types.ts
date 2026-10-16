// Alert engine v0 — pure, deterministic, platform-free (PLAN §1, §2).
// This module must never import: clocks, randomness, network, DB, Node APIs.
// The Kotlin (and later Swift) port must pass the identical vectors in engine/vectors/.
import type { AccidentStep } from "./texts.ts";

export type HazardKind =
  | "accident"          // A3 — Trafikverket Situation/Deviation
  | "slippery_segment"  // A1 — Trafikverket RoadCondition (operator-classified)
  | "icing_point"       // A2 — WeatherMeasurepoint showing icing conditions
  | "wildlife"          // A4 — historical hotspot / fresh polisen event
  | "camera"            // A5 — TrafficSafetyCamera
  | "kandidat";         // K — kandidatens betavarning: modellerad halka per sträcka (NIVÅ 2+BLANDNING, DECISIONS #562, #577)

/** Spoken priority, highest first. Lower priority candidates are DROPPED, never queued. */
export const PRIORITY: readonly HazardKind[] = [
  "accident",
  "slippery_segment",
  "icing_point",
  "wildlife",
  "camera",
  // LAST on purpose (DECISIONS #577): every other kind outranks it, so the priority-aware cooldown can never drop or delay
  // another warning because the candidate spoke — the other kinds behave exactly as without it, and the shadow's
  // pre-registered measurements still describe what the app says about them.
  "kandidat",
] as const;

export interface PointHazard {
  id: string;
  kind: Exclude<HazardKind, "slippery_segment" | "kandidat">;
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

/** K — one road stretch where the candidate's rule says `varnar` (live.json `kandidat`, DECISIONS #576). The threshold lives
 *  in the database rule; the engine only gets the warning points. One hazard per stretch, so the repeat rule holds per stretch,
 *  not per point (the points sit about every 2 km). */
export interface KandidatHazard {
  id: string;
  kind: "kandidat";
  /** WGS84 [lon, lat] of the stretch's warning points. */
  points: [number, number][];
}

export type Hazard = PointHazard | SegmentHazard | KandidatHazard;

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
  /** S3: the frost-risk call came from the post-rain beta rule, not from surface + moisture (DECISIONS #524). K: always —
   *  the candidate is a beta warning (DECISIONS #562). Absent otherwise, so the log shape of every other vector is unchanged.
   *  The warning card marks it as beta. */
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
