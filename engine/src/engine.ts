// Halkvakt alert engine v0 — the module that decides when to speak and when to stay silent.
// Deterministic by construction: no clocks, no randomness, no I/O. Time comes from fixes.
// Discipline rules (PLAN §1) are hard requirements, encoded here and proven by engine/vectors/.
//
//   1. Max 1 spoken alert per 45 s. Priority accident > slippery > icing > wildlife > camera.
//      Losers are DROPPED, not queued. No exceptions, not even for accidents (logged in
//      DECISIONS — revisit only on beta evidence).
//   2. Same hazard never repeats until BOTH 10 min have passed AND 5 km been driven.
//   3. Point sources say "framöver"; only segment sources may say "på vägen framför dig"
//      (enforced in texts.ts).
//   4. Silence is the default. No hazard in corridor ⇒ no sound. Ever.

import type {
  Alert, EngineConfig, Fix, Hazard, HazardKind, PointHazard, SegmentHazard,
} from "./types.ts";
import { DEFAULT_CONFIG, PRIORITY } from "./types.ts";
import { angDiffDeg, bearingDeg, haversineM, isAhead, samplePolyline, type LonLat } from "./geo.ts";
import { alertText } from "./texts.ts";

interface FiredState { t: number; odometerM: number; }

interface Candidate { hazard: Hazard; kind: HazardKind; distM: number; }

// Swedish word-start boundary: "Isfläckar"/"Svår halka" match; "fläckvis Våt" must NOT
// (the substring 'is' inside "fläckvis" produced 8 false halka-segments on real August
// data — see test "fläckvis is not halka").
const SLIPPERY_INFO = /(?<![a-zåäö])(is|snö|halka|frost|mycket besvärligt)/i;

export class AlertEngine {
  private readonly cfg: EngineConfig;
  private readonly points: PointHazard[] = [];
  private readonly segments: { h: SegmentHazard; samples: LonLat[] }[] = [];

  private prevFix: Fix | null = null;
  private lastHeadingDeg: number | null = null;
  private odometerM = 0;
  private lastSpokenT: number | null = null;
  private fired = new Map<string, FiredState>();

  constructor(hazards: Hazard[], cfg: Partial<EngineConfig> = {}) {
    this.cfg = { ...DEFAULT_CONFIG, ...cfg };
    for (const h of hazards) {
      if (h.kind === "slippery_segment") {
        this.segments.push({ h, samples: samplePolyline(h.line, this.cfg.segmentSampleM) });
      } else {
        this.points.push(h);
      }
    }
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
      const f = this.fired.get(c.hazard.id);
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
      return a.hazard.id < b.hazard.id ? -1 : 1; // total order ⇒ determinism
    });
    const win = eligible[0];

    // Rule 1b: hard global throttle. Winner inside the window is dropped, not queued.
    if (this.lastSpokenT !== null && fix.t - this.lastSpokenT < this.cfg.globalCooldownS) {
      return null;
    }

    this.lastSpokenT = fix.t;
    this.fired.set(win.hazard.id, { t: fix.t, odometerM: this.odometerM });
    const pointHazard = win.hazard.kind === "slippery_segment" ? undefined : (win.hazard as PointHazard);
    return {
      t: fix.t,
      hazardId: win.hazard.id,
      kind: win.kind,
      distanceM: Math.round(win.distM),
      text: alertText(win.kind, win.distM, pointHazard),
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
        if (p.bearing != null && angDiffDeg(p.bearing, heading) > this.cfg.cameraBearingToleranceDeg) {
          return null; // camera monitors the opposite direction — stay silent
        }
        return { hazard: p, kind: p.kind, distM };
      }
      case "accident":
        return distM <= this.cfg.accidentMaxAheadM ? { hazard: p, kind: p.kind, distM } : null;
      case "icing_point": {
        const t = p.meta?.surfaceTempC;
        const icy = t != null && t <= 1 && p.meta?.moisture === true;
        return icy && distM <= leadM ? { hazard: p, kind: p.kind, distM } : null;
      }
      case "wildlife": {
        const active = p.meta?.active !== false;
        return active && distM <= leadM ? { hazard: p, kind: p.kind, distM } : null;
      }
    }
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
    return { hazard: s.h, kind: "slippery_segment", distM: best };
  }
}
