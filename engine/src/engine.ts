// Halkvakt alert engine v0 — the module that decides when to speak and when to stay silent.
// Deterministic by construction: no clocks, no randomness, no I/O. Time comes from fixes.
// Discipline rules (PLAN §1) are hard requirements, encoded here and proven by engine/vectors/.
//
//   1. Within 10 s of an utterance only a MORE important hazard may speak (priority-aware
//      cooldown, globalCooldownS; kort #127, v23 — replaced the blind 45 s). Priority
//      accident > slippery > icing > wildlife > camera > kandidat (the beta candidate: #577) > smavag (the small roads: #828).
//      Losers are DROPPED, not queued. No exceptions, not even for accidents (logged in
//      DECISIONS — revisit only on beta evidence).
//   2. Same hazard never repeats until BOTH 10 min have passed AND 5 km been driven. Slippery stretches whose lines lie
//      within halkZonM of each other are one hazard for this rule (the halka zone, kort #360, DECISIONS #621, #624).
//      SINGLE EXCEPTION (DECISIONS #28): a serious accident speaks twice by design —
//      once early (10 km, while exits remain) and once close (2 km, "slow down").
//      These are two different messages about one hazard, not a repeat of one message,
//      and they are held apart by two distinct alert keys rather than by weakening rule 2.
//   3. Point sources say "framöver"; only segment sources may say "på vägen framför dig"
//      (enforced in texts.ts).
//   4. Silence is the default. No hazard in corridor ⇒ no sound. Ever.

import type {
  Alert, EngineConfig, Fix, Hazard, HazardKind, KandidatHazard, PointHazard, SegmentHazard, SmavagHazard,
} from "./types.ts";
import { DEFAULT_CONFIG, PRIORITY } from "./types.ts";
import {
  angDiffDeg, bearingDeg, boxOf, distToSegmentM, haversineM, isAhead, minDistToBoxM, reachWindow, samplePolyline, type Box,
  type LonLat,
} from "./geo.ts";
import { alertText, EFTERHALKA_TEXT, type AccidentStep } from "./texts.ts";
import { farorLangsRutten } from "./rutfilter.ts";

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
  /** S3: the frost-risk call came from the post-rain beta rule (DECISIONS #524). */
  beta?: true;
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

// THE GRID (DECISIONS #795). Until 5/11 every fix evaluated every hazard; 16 000 more kandidat points made step() seven times
// slower. Every candidate needs its distance within a reach the configuration bounds (reachOf below), so a hazard is listed in
// every grid cell that holds a position within that reach of one of its points (reachWindow in geo.ts), and a fix evaluates only
// its own cell's lists. A hazard left out would have returned null in the full scan, and the lists keep the hazards' order, so
// the candidates — and everything after them — are the full scan's, byte for byte. The halka zone's loop over all stretches
// (#360) is a rule, not a scan, and is untouched.
/** Cell size in degrees, latitude and longitude alike (5.6 km north–south, 2.8 km east–west at 60° N). Only speed depends on it.
 *  Samma tal i Engine.kt och Engine.swift (kontraktsgrinden). */
const GRID_CELL_DEG = 0.05;
/** Metres added to every reach before its window is drawn: rounding in reachWindow and haversineM is far below a millimetre.
 *  Samma tal i Engine.kt och Engine.swift (kontraktsgrinden). */
const GRID_MARGIN_M = 100;
/** A window wider than this many cells per point (near a pole, or an odd configuration's reach) is not listed: the hazard goes to
 *  the always-list instead, which is exact and keeps the build small. Samma tal i Engine.kt och Engine.swift (kontraktsgrinden). */
const GRID_MAX_CELLS = 4096;

/** The hazards of one list (points, stretches or kandidat stretches) by grid cell, each list ascending as the hazards came. */
class HazardGrid {
  /** Every hazard, ascending: what a fix outside the grid, and the test's full scan, evaluate. */
  readonly all: number[] = [];
  private readonly cells = new Map<number, number[]>();
  /** Hazards no window bounds (reachWindow gave null): evaluated on every fix, as before the grid. */
  private readonly always: number[] = [];

  /** Hazard i — added in ascending order — produces a candidate only within reachM of one of pts. */
  add(i: number, pts: LonLat[], reachM: number): void {
    this.all.push(i);
    const w = reachWindow(pts, reachM + GRID_MARGIN_M);
    if (w === null || (2 * w.dLat / GRID_CELL_DEG + 2) * (2 * w.dLon / GRID_CELL_DEG + 2) > GRID_MAX_CELLS) {
      this.always.push(i);
      return;
    }
    let r0p = NaN, r1p = NaN, c0p = NaN, c1p = NaN;
    for (const p of pts) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;   // never within reach (reachWindow)
      const r0 = Math.floor((p.lat - w.dLat) / GRID_CELL_DEG), r1 = Math.floor((p.lat + w.dLat) / GRID_CELL_DEG);
      const c0 = Math.floor((p.lon - w.dLon) / GRID_CELL_DEG), c1 = Math.floor((p.lon + w.dLon) / GRID_CELL_DEG);
      if (r0 === r0p && r1 === r1p && c0 === c0p && c1 === c1p) continue;   // same cells as the previous point
      r0p = r0; r1p = r1; c0p = c0; c1p = c1;
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const key = cellKey(r, c);
          const list = this.cells.get(key);
          if (list === undefined) this.cells.set(key, [i]);
          else if (list[list.length - 1] !== i) list.push(i);
        }
      }
    }
  }

  /** The hazards that can produce a candidate at the fix, ascending. A fix outside [−90, 90] × [−180, 180] gets all of them:
   *  reachWindow's bound holds only inside. */
  near(fix: LonLat): readonly number[] {
    if (!(Math.abs(fix.lat) <= 90 && Math.abs(fix.lon) <= 180)) return this.all;
    const cell = this.cells.get(cellKey(Math.floor(fix.lat / GRID_CELL_DEG), Math.floor(fix.lon / GRID_CELL_DEG)));
    if (this.always.length === 0) return cell ?? this.always;
    if (cell === undefined) return this.always;
    const out: number[] = [];   // two ascending lists without common members (a hazard is in cells or in always)
    let a = 0, b = 0;
    while (a < cell.length || b < this.always.length) {
      out.push(b >= this.always.length || (a < cell.length && cell[a] < this.always[b]) ? cell[a++] : this.always[b++]);
    }
    return out;
  }
}

/** One number per cell: rows and columns stay within ±3 600 at 0.05°, so 65 536 keeps them apart (a clash would only add). */
function cellKey(r: number, c: number): number { return r * 65536 + c; }

export class AlertEngine {
  private readonly cfg: EngineConfig;
  private points: PointHazard[] = [];
  private segments: { h: SegmentHazard; samples: LonLat[]; box: Box }[] = [];
  private kandidater: { h: KandidatHazard; samples: LonLat[] }[] = [];
  private pointGrid = new HazardGrid();
  private segmentGrid = new HazardGrid();
  private kandidatGrid = new HazardGrid();
  /** S (DECISIONS #844): the small roads, each with its points and whether the line to the previous point exists (neighbours at
   *  most smavagKordaMaxM apart), listed in the grid by the line's samples so that a fix within the road test's reach finds them. */
  private smavagar: { h: SmavagHazard; pts: LonLat[]; linje: boolean[] }[] = [];
  private smavagGrid = new HazardGrid();
  private smavagById = new Map<string, number>();
  /** Test only (DECISIONS #795): evaluate every hazard on every fix, as before the grid. The differential test runs both paths
   *  side by side; their answers are the same by construction, so nothing else sets it. */
  bruteForce = false;

  private prevFix: Fix | null = null;
  private lastHeadingDeg: number | null = null;
  private odometerM = 0;
  private lastSpokenT: number | null = null;
  /** Vad som senast sades — spärren får bara tysta något som INTE är viktigare (#127). */
  private lastSpokenKind: HazardKind | null = null;
  /** När kandidaten senast talade — taket räknas därifrån, oavsett sträcka (DECISIONS #606). */
  private lastKandidatT: number | null = null;
  /** S, the road test (DECISIONS #844): the road the car followed on the last fixes and for how many fixes in a row. Kept by id,
   *  so a fresh snapshot does not restart it. */
  private smavagVag: string | null = null;
  private smavagFixar = 0;
  /** S: when and where the small-roads voice last spoke — its silence runs from there, whatever the road (DECISIONS #828). */
  private lastSmavagT: number | null = null;
  private lastSmavagOdoM = 0;
  /** Skuggmotorn lyssnar här (#127 a): vad spärren kastar syns annars ingenstans. */
  onSuppressed?: (c: { kind: HazardKind; hazardId: string; distM: number; by: HazardKind; sinceS: number; zon?: string }) => void;
  /** FÖRSPRÅNGET (kort #153 beslut 1, docs/TROSKLAR-FORSPRANG.md §4): valfri krok som ger förvarningsavståndet per fara. Utan
   *  krok är motorn byte för byte densamma — vektorerna rörs inte. Svaret klämms till leadMinM och MOTORNS leadMaxM (3 000 m),
   *  inte till appens reglage (kort #275 väg (a)). Bara skuggan sätter den i vinter; portarna får den först vid steg 7, efter domen. */
  leadFor?: (h: Hazard, leadM: number, speedMps: number) => number;
  private fired = new Map<string, FiredState>();
  /** Halkzonen (#360): whether two stretches are neighbours, per sorted id pair — the geometry is the same in every snapshot. */
  private zonGrannar = new Map<string, boolean>();
  /** A zone silencing is reported once per stretch and neighbour warning, not on every fix inside the lead distance. */
  private zonRapporterad = new Set<string>();

  constructor(hazards: Hazard[], cfg: Partial<EngineConfig> = {}) {
    this.cfg = { ...DEFAULT_CONFIG, ...cfg };
    this.ingest(hazards);
  }

  private ingest(hazards: Hazard[]): void {
    this.points = [];
    this.segments = [];
    this.kandidater = [];
    this.pointGrid = new HazardGrid();
    this.segmentGrid = new HazardGrid();
    this.kandidatGrid = new HazardGrid();
    this.smavagar = [];
    this.smavagGrid = new HazardGrid();
    this.smavagById = new Map();
    for (const h of hazards) {
      if (h.kind === "slippery_segment") {
        const samples = samplePolyline(h.line, this.cfg.segmentSampleM);
        this.segmentGrid.add(this.segments.length, samples, this.reachOf(h.kind));
        this.segments.push({ h, samples, box: boxOf(samples) });
      } else if (h.kind === "kandidat") {
        const samples = h.points.map(([lon, lat]) => ({ lon, lat }));
        this.kandidatGrid.add(this.kandidater.length, samples, this.reachOf(h.kind));
        this.kandidater.push({ h, samples });
      } else if (h.kind === "smavag") {
        const pts = h.points.map(([lon, lat]) => ({ lon, lat }));
        const linje = pts.map((p, k) => k > 0 && haversineM(pts[k - 1], p) <= this.cfg.smavagKordaMaxM);
        this.smavagGrid.add(this.smavagar.length, samplePolyline(h.points, this.cfg.segmentSampleM), this.reachOf(h.kind));
        this.smavagById.set(h.id, this.smavagar.length);
        this.smavagar.push({ h, pts, linje });
      } else {
        this.pointGrid.add(this.points.length, [h], this.reachOf(h.kind));
        this.points.push(h);
      }
    }
  }

  /**
   * The grid's reach (DECISIONS #795): no candidate of this kind lies farther from the fix than this. Read off the evaluators:
   * a camera needs distM ≤ cameraTriggerM, an accident distM ≤ accidentMaxAheadM, and icing, wildlife, a stretch's nearest sample
   * and a kandidat's nearest point distM ≤ the lead — at most cfg.leadMaxM, and DEFAULT_CONFIG.leadMaxM under leadFor (TS only;
   * the ports keep the same bound so the three stay one algorithm), or NaN, which step() handles. The 30 m near zone of isAhead
   * only widens the angle, never a distance. NaN (Math.max keeps it), ∞ and an unknown kind give a reach no window bounds: always
   * evaluated.
   */
  private reachOf(kind: HazardKind): number {
    switch (kind) {
      case "camera": return this.cfg.cameraTriggerM;
      case "accident": return this.cfg.accidentMaxAheadM;
      case "icing_point": case "wildlife": case "slippery_segment": case "kandidat":
        return Math.max(this.cfg.leadMaxM, DEFAULT_CONFIG.leadMaxM);
      // S: the road test needs a line within smavagPaM, and every point of a line lies within half a sample step of a sample.
      case "smavag": return this.cfg.smavagPaM + this.cfg.segmentSampleM;
      default: return Infinity;
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
    // The grid (DECISIONS #795): only the hazards whose reach holds the fix, in the full scan's order. A stretch (segment or
    // kandidat) tests `best > lead`, so a NaN lead lets it speak at ANY distance — the points test `distM <= lead` and stay silent.
    // The reach bounds a number only: with a NaN lead (a NaN speed or setting), or leadFor's lead per hazard, the stretches take
    // the full scan.
    const points = this.bruteForce ? this.pointGrid.all : this.pointGrid.near(fix);
    const allStretches = this.bruteForce || this.leadFor !== undefined || Number.isNaN(leadM);
    const stretches = (g: HazardGrid) => allStretches ? g.all : g.near(fix);
    // S, the road test (DECISIONS #844): which small road the car follows, before any of its warning points may speak.
    this.smavagPa(fix, heading);
    const candidates: Candidate[] = [];
    for (const i of points) {
      const p = this.points[i];
      const c = this.evaluatePoint(fix, heading, p, lead(p));
      if (c) candidates.push(c);
    }
    for (const i of stretches(this.segmentGrid)) {
      const s = this.segments[i];
      const c = this.evaluateSegment(fix, heading, s, lead(s.h));
      if (c) candidates.push(c);
    }
    for (const i of stretches(this.kandidatGrid)) {
      const k = this.kandidater[i];
      const c = this.evaluateKandidat(fix, heading, k, lead(k.h));
      if (c) candidates.push(c);
    }
    const sv = this.evaluateSmavag(fix, heading, lead);
    if (sv) candidates.push(sv);
    if (candidates.length === 0) return null;

    // Rule 2: per-hazard repeat suppression (both time AND distance must have elapsed).
    const rearmed = (f: FiredState) =>
      fix.t - f.t >= this.cfg.repeatMinS && this.odometerM - f.odometerM >= this.cfg.repeatMinM;
    const eligible = candidates.filter((c) => {
      const f = this.fired.get(c.alertKey);
      if (f && !rearmed(f)) return false;
      // The halka zone (kort #360): a neighbour stretch within halkZonM spoke and is not re-armed ⇒ this one is the same zone.
      if (c.kind === "slippery_segment") {
        for (const s of this.segments) {
          if (s.h.id === c.hazard.id) continue;
          const g = this.fired.get(s.h.id);
          if (!g || rearmed(g) || !this.grannar(c.hazard as SegmentHazard, s.h)) continue;
          const nyckel = `${c.hazard.id}|${s.h.id}|${g.t}`;
          if (!this.zonRapporterad.has(nyckel)) {
            this.zonRapporterad.add(nyckel);
            this.onSuppressed?.({ kind: c.kind, hazardId: c.hazard.id, distM: c.distM, by: "slippery_segment", sinceS: fix.t - g.t, zon: s.h.id });
          }
          return false;
        }
      }
      return true;
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
    if (win.kind === "kandidat") this.lastKandidatT = fix.t;
    if (win.kind === "smavag") { this.lastSmavagT = fix.t; this.lastSmavagOdoM = this.odometerM; }
    this.fired.set(win.alertKey, { t: fix.t, odometerM: this.odometerM });
    const pointHazard = win.hazard.kind === "slippery_segment" || win.hazard.kind === "kandidat" || win.hazard.kind === "smavag"
      ? undefined : (win.hazard as PointHazard);
    return {
      t: fix.t,
      hazardId: win.hazard.id,
      kind: win.kind,
      distanceM: Math.round(win.distM),
      text: win.beta && win.kind === "icing_point" ? EFTERHALKA_TEXT : alertText(win.kind, win.distM, pointHazard, win.step),
      ...(win.step ? { step: win.step } : {}),
      ...(win.beta ? { beta: true as const } : {}),
    };
  }

  /** Halkzonen (#360): the two stretches' lines lie within halkZonM — measured line to line by the route filter (break points both
   *  ways, a crossing is 0), the same function in all three languages. Cached per pair; stretch geometry does not change. */
  private grannar(a: SegmentHazard, b: SegmentHazard): boolean {
    const nyckel = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
    let v = this.zonGrannar.get(nyckel);
    if (v === undefined) {
      v = farorLangsRutten([b], a.line, this.cfg.halkZonM).length > 0;
      this.zonGrannar.set(nyckel, v);
    }
    return v;
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
        if (icy) return distM <= leadM ? { hazard: p, kind: p.kind, distM, alertKey: p.id } : null;
        // S3 — efterhalkan som märkt beta (DECISIONS #222, #524): the surface is still above the freezing rule but within
        // +1…+3 °C, has fallen fast after rain, and the gauge saw rain within 2 h. Stations only — bridges keep their +3 rule.
        const rainH = p.meta?.rainH, fall30 = p.meta?.fall30C;
        const beta = !p.meta?.bridge && t != null && rainH != null && fall30 != null &&
          t >= this.cfg.efterhalkaYtaMinC && t <= this.cfg.efterhalkaYtaMaxC &&
          fall30 >= this.cfg.efterhalkaFall30C && rainH <= this.cfg.efterhalkaRegnH;
        return beta && distM <= leadM ? { hazard: p, kind: p.kind, distM, alertKey: p.id, beta: true } : null;
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
    fix: Fix, heading: number, s: { h: SegmentHazard; samples: LonLat[]; box: Box }, leadM: number,
  ): Candidate | null {
    const meta = s.h.meta ?? {};
    const slippery =
      (meta.code != null && meta.code >= 2) ||
      (meta.info ?? []).some((i) => SLIPPERY_INFO.test(i) || SLIPPERY_STAM.test(i));
    if (!slippery) return null; // "Normalt"/"Våt" segments make no sound — silence is default
    // Kort #375: a stretch whose box lies farther away than the lead holds no sample within it, and only a sample within the lead
    // can speak (best > leadM ⇒ null below), so the samples are not walked. Exact: the bound never exceeds the true distance, and
    // 1 m covers rounding. Walking every sample of long stretches at every fix ran the skugga's försprång out of compute (546).
    if (minDistToBoxM(fix, s.box) > leadM + 1) return null;

    let best: number | null = null;
    for (const pt of s.samples) {
      const { ahead, distM } = isAhead(fix, heading, pt, this.cfg.corridorHalfAngleDeg);
      if (ahead && (best === null || distM < best)) best = distM;
    }
    if (best === null || best > leadM) return null;
    return { hazard: s.h, kind: "slippery_segment", distM: best, alertKey: s.h.id };
  }

  /**
   * K — kandidatens betavarning (DECISIONS #562, #577). The rule lives in the database (kandidat_regel, #576): every point
   * published is one where it says `varnar`, so the engine adds no threshold — only the corridor and the lead, like a
   * segment, over the stretch's points. One alert key per stretch: the repeat rule holds per stretch, not per point.
   */
  private evaluateKandidat(
    fix: Fix, heading: number, k: { h: KandidatHazard; samples: LonLat[] }, leadM: number,
  ): Candidate | null {
    let best: number | null = null;
    for (const pt of k.samples) {
      const { ahead, distM } = isAhead(fix, heading, pt, this.cfg.corridorHalfAngleDeg);
      if (ahead && (best === null || distM < best)) best = distM;
    }
    if (best === null || best > leadM) return null;
    // (c), DECISIONS #581: tyst i kandidatEfterHalkaS efter att samma sträckas halkvarning (A1) talat.
    const a1 = k.h.segmentHazardId ? this.fired.get(k.h.segmentHazardId) : undefined;
    if (a1 && fix.t - a1.t < this.cfg.kandidatEfterHalkaS) return null;
    // Taket, DECISIONS #606: högst en kandidat per kandidatTakS, vilken sträcka det än gäller.
    if (this.lastKandidatT !== null && fix.t - this.lastKandidatT < this.cfg.kandidatTakS) return null;
    return { hazard: k.h, kind: "kandidat", distM: best, alertKey: k.h.id, beta: true };
  }

  /**
   * S, the road test (DECISIONS #844): the nearest straight line between two neighbouring points of any small road within
   * smavagPaM of the fix and within smavagPaGrader of its direction, either way along the road. The same road on consecutive
   * fixes counts up; another road, or none, starts over. Lines in ascending road and point order, and a strictly nearer line
   * wins, so the three ports pick the same road.
   */
  private smavagPa(fix: Fix, heading: number): void {
    let bestId: string | null = null, bestD = Infinity;
    for (const i of this.bruteForce ? this.smavagGrid.all : this.smavagGrid.near(fix)) {
      const v = this.smavagar[i];
      for (let k = 1; k < v.pts.length; k++) {
        if (!v.linje[k]) continue;
        const d = distToSegmentM(fix, v.pts[k - 1], v.pts[k]);
        if (!(d <= this.cfg.smavagPaM) || !(d < bestD)) continue;
        const r = bearingDeg(v.pts[k - 1], v.pts[k]);
        if (Math.min(angDiffDeg(r, heading), angDiffDeg((r + 180) % 360, heading)) > this.cfg.smavagPaGrader) continue;
        bestId = v.h.id; bestD = d;
      }
    }
    if (bestId !== null && bestId === this.smavagVag) this.smavagFixar++;
    else { this.smavagVag = bestId; this.smavagFixar = bestId === null ? 0 : 1; }
  }

  /**
   * S — småvägsröstens betavarning (DECISIONS #828, #844). The rule lives in the database (smavag_regel, sql/105): every warning
   * point is one where it says `varnar`. Only the road the car follows (smavagPaFixar fixes in a row) may speak, with K's corridor
   * and lead over its warning points; then one call per slippery area: silent until both smavagTystS and smavagTystM have passed.
   */
  private evaluateSmavag(fix: Fix, heading: number, lead: (h: Hazard) => number): Candidate | null {
    if (this.smavagVag === null || this.smavagFixar < this.cfg.smavagPaFixar) return null;
    if (this.lastSmavagT !== null &&
        (fix.t - this.lastSmavagT < this.cfg.smavagTystS || this.odometerM - this.lastSmavagOdoM < this.cfg.smavagTystM)) return null;
    const i = this.smavagById.get(this.smavagVag);
    if (i === undefined) return null;
    const v = this.smavagar[i];
    const leadM = lead(v.h);
    let best: number | null = null;
    for (const j of v.h.warn) {
      const p = v.pts[j];
      if (p === undefined) continue;
      const { ahead, distM } = isAhead(fix, heading, p, this.cfg.corridorHalfAngleDeg);
      if (ahead && distM <= leadM && (best === null || distM < best)) best = distM;
    }
    if (best === null) return null;
    return { hazard: v.h, kind: "smavag", distM: best, alertKey: v.h.id, beta: true };
  }
}
