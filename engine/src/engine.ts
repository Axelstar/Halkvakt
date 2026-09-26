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

import type {
  Alert, EngineConfig, Fix, Hazard, HazardKind, PointHazard, SegmentHazard,
} from "./types.ts";
import { DEFAULT_CONFIG, PRIORITY } from "./types.ts";
import { angDiffDeg, bearingDeg, haversineM, isAhead, samplePolyline, type LonLat } from "./geo.ts";
import { alertText, type AccidentStep } from "./texts.ts";

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
   *  inte till appens reglage (kort #261 väg (a)). Bara skuggan sätter den i vinter; portarna får den först vid steg 7, efter domen. */
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

    // Kort #261 väg (a) (Bengt 26/9, DECISIONS #381): försprånget kläms till MOTORNS tak, aldrig till cfg.leadMaxM — i apparna
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
