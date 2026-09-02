// ═══ GENERERAD av scripts/bundle-skuggmotor.ts — ÄNDRA INTE HÄR ═══
// Källor: engine/src/{types,geo,texts,engine,snapshot}.ts + supabase/functions/skuggmotor/main.ts

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
  globalCooldownS: 45,
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
      return "Viltrisk — vanlig olycksplats för älg den här tiden.";
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
//   1. Max 1 spoken alert per 45 s. Priority accident > slippery > icing > wildlife > camera.
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
 * This is the "step-aware warning id" of DECISIONS #28. It stays internal on purpose:
 * the emitted Alert keeps its hazardId, so the cross-platform log shape is unchanged
 * and none of the 14 frozen vectors had to be regenerated.
 */
interface Candidate {
  hazard: Hazard; kind: HazardKind; distM: number;
  alertKey: string;
  step?: AccidentStep;
}

// Swedish word-start boundary: "Isfläckar"/"Svår halka" match; "fläckvis Våt" must NOT
// (the substring 'is' inside "fläckvis" produced 8 false halka-segments on real August
// data — see test "fläckvis is not halka").
const SLIPPERY_INFO = /(?<![a-zåäö])(is|snö|halka|frost|mycket besvärligt)/i;

export class AlertEngine {
  private readonly cfg: EngineConfig;
  private points: PointHazard[] = [];
  private segments: { h: SegmentHazard; samples: LonLat[] }[] = [];

  private prevFix: Fix | null = null;
  private lastHeadingDeg: number | null = null;
  private odometerM = 0;
  private lastSpokenT: number | null = null;
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

    const candidates: Candidate[] = [];
    for (const p of this.points) {
      const c = this.evaluatePoint(fix, heading, p, leadM);
      if (c) candidates.push(c);
    }
    for (const s of this.segments) {
      const c = this.evaluateSegment(fix, heading, s, leadM);
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

    // Rule 1b: hard global throttle. Winner inside the window is dropped, not queued.
    if (this.lastSpokenT !== null && fix.t - this.lastSpokenT < this.cfg.globalCooldownS) {
      return null;
    }

    this.lastSpokenT = fix.t;
    this.fired.set(win.alertKey, { t: fix.t, odometerM: this.odometerM });
    const pointHazard = win.hazard.kind === "slippery_segment" ? undefined : (win.hazard as PointHazard);
    return {
      t: fix.t,
      hazardId: win.hazard.id,
      kind: win.kind,
      distanceM: Math.round(win.distM),
      text: alertText(win.kind, win.distM, pointHazard, win.step),
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
    return { hazard: p, kind: "accident", distM, alertKey: `${p.id}#early`, step: "early" };
  }

  private evaluateSegment(
    fix: Fix, heading: number, s: { h: SegmentHazard; samples: LonLat[] }, leadM: number,
  ): Candidate | null {
    const meta = s.h.meta ?? {};
    const slippery =
      (meta.code != null && meta.code >= 2) ||
      (meta.info ?? []).some((i) => SLIPPERY_INFO.test(i));
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

let facitBudget = 5;
async function archiveFacit(alerts: Alert[], route: string): Promise<number> {
  if (facitBudget <= 0) return 0;
  if (!alerts.length) return 0;
  const cams = await trvCameras();
  if (!cams.length) return 0;
  const bucket3h = Math.floor(Date.now() / 10_800_000);
  const day = new Date().toISOString().slice(0, 10);
  let saved = 0;
  const seen = new Set<string>();
  for (const a of alerts) {
    let best = null as null | typeof cams[0]; let bd = 15_000;
    for (const c of cams) {
      const d = haversineM({ lon: a.lon, lat: a.lat }, { lon: c.lon, lat: c.lat });
      if (d < bd) { bd = d; best = c; }
    }
    if (!best || seen.has(best.id)) continue;
    seen.add(best.id);
    const path = `${day}/${best.id}-${bucket3h}.jpg`;
    const img = await fetch(best.url).then((r) => r.ok ? r.arrayBuffer() : null).catch(() => null);
    if (!img) continue;
    const up = await fetch(`${SB}/storage/v1/object/facit/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SRK}`, "Content-Type": "image/jpeg" },
      body: img });
    if (up.ok) saved++;               // 409 = fanns redan (dedupe) — helt ok
  }
  return saved;
}

Deno.serve(async (req) => {
  const k = Deno.env.get("INGEST_KEY");
  if (!k || req.headers.get("x-halkvakt-key") !== k) return new Response("forbidden", { status: 403 });
  try {
    const land = (new URL(req.url).searchParams.get("land") ?? "se").toLowerCase();
    const CDN = CDN_BY_LAND[land]; if (!CDN) return new Response("okänt land", { status: 400 });
    const routes = land === "fi" ? ROUTES_FI : land === "no" ? ROUTES_NO : land === "dk" ? ROUTES_DK : ROUTES;
    const bust = `?t=${Date.now()}`;
    const [st, lv] = await Promise.all([
      fetch(CDN + "static.json" + bust).then((r) => r.json()),
      fetch(CDN + "live.json" + bust).then((r) => r.json()),
    ]);
    const hazards = snapshotToHazards(st, lv);
    const results: Record<string, unknown> = {};
    let facitTotal = 0;
    // Rotation: 3 rutter per varv (CPU-taket, läxa 29/8) — alla 20 täcks varje 3,5 h,
    // i båda länderna.
    const allNames = Object.keys(routes).sort();
    const slots = 7;
    const slot = Math.floor(Date.now() / 1800e3) % slots;
    const batch = allNames.filter((_, i) => i % slots === slot);
    for (const name of batch) {
      const line = routes[name];
      {
      const trace = traceAlong(line);
      const alerts = new AlertEngine(hazards).run(trace);
      // Facit-bilder finns bara i Sverige (Trafikverkets väglagskameror).
      const f = land === "se" ? await archiveFacit(alerts, name) : 0; facitBudget -= f; facitTotal += f;
      results[name] = { fixes: trace.length, alerts: alerts.length };
      const body = JSON.stringify({
        route: name, land: land.toUpperCase(), snapshot_generated_at: lv.generated_at,
        n_hazards: hazards.length, n_alerts: alerts.length,
        alerts: alerts.map((a) => ({ t: a.t, kind: a.kind, id: a.hazardId, text: a.text, lon: a.lon, lat: a.lat })),
      });
      await fetch(`${SB}/rest/v1/shadow_log`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "application/json" },
        body });
      }
    }
    return new Response(JSON.stringify({ ok: true, results, facit: facitTotal }), {
      headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
