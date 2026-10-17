// Swift twin of engine/src/*.ts and android/engine — keep the three in lockstep.
// No clocks, no randomness, no I/O. Any semantic change lands in ALL THREE and is
// proven by the shared vectors.
import Foundation

public enum HazardKind: String, CaseIterable {
    case accident, slippery_segment, icing_point, wildlife, camera, kandidat
    // Spoken priority = declaration order above. Losers are DROPPED, never queued.
    // `kandidat` (DECISIONS #562, #577) is LAST on purpose: every other kind outranks it, so the cooldown can never drop or
    // delay another warning because the candidate spoke. Mirrors PRIORITY in engine/src/types.ts.
    var priority: Int { HazardKind.allCases.firstIndex(of: self)! }
}

public struct PointMeta {
    public var surfaceTempC: Double? = nil
    public var moisture: Bool = false
    /// icing_point — punkten är en BRO (#38): temp/fukt från närmaste station, tröskel +3.
    public var bridge: Bool = false
    /// accident — vägnummer ur Trafikverket ("E18", "25"). Rösten säger VAR (2/9).
    public var road: String? = nil
    public var active: Bool = true
    public var speedLimitKmh: Int? = nil
    /// accident — Trafikverket SeverityCode (1 Ingen, 2 Liten, 4 Stor, 5 Mycket stor påverkan).
    public var severityCode: Int? = nil
    /// accident — EndTime pre-formatted "HH:MM" Europe/Stockholm by the publisher.
    /// The engine reads no clocks and knows no timezones; the string arrives ready to speak.
    public var endTimeLocal: String? = nil
    /// icing_point — S3 (DECISIONS #222, #524): timmar sedan regn och ytans fall på 30 min, positivt = faller. nil ⇒ tyst.
    public var rainH: Double? = nil
    public var fall30C: Double? = nil
    public init(surfaceTempC: Double? = nil, moisture: Bool = false, active: Bool = true,
                speedLimitKmh: Int? = nil, severityCode: Int? = nil, endTimeLocal: String? = nil,
                bridge: Bool = false, road: String? = nil, rainH: Double? = nil, fall30C: Double? = nil) {
        self.surfaceTempC = surfaceTempC; self.moisture = moisture; self.active = active
        self.speedLimitKmh = speedLimitKmh; self.severityCode = severityCode; self.endTimeLocal = endTimeLocal
        self.bridge = bridge; self.road = road; self.rainH = rainH; self.fall30C = fall30C
    }
}

/// Which utterance of a serious accident this is (DECISIONS #28). Mirrors AccidentStep in texts.ts.
public enum AccidentStep: String { case early, reminder, late }

public struct SegmentMeta {
    public var code: Int? = nil
    public var info: [String] = []
    public init(code: Int? = nil, info: [String] = []) { self.code = code; self.info = info }
}

public enum Hazard {
    case point(id: String, kind: HazardKind, lon: Double, lat: Double, bearing: Double?, meta: PointMeta)
    case segment(id: String, line: [[Double]], meta: SegmentMeta)
    /// One stretch where the candidate's database rule says `varnar` (live.json `kandidat`, DECISIONS #576, #577): only the
    /// warning points [lon, lat], no threshold. One hazard per stretch, so the repeat rule holds per stretch.
    case kandidat(id: String, points: [[Double]], segmentHazardId: String?)

    public var id: String {
        switch self {
        case .point(let id, _, _, _, _, _): return id
        case .segment(let id, _, _): return id
        case .kandidat(let id, _, _): return id
        }
    }
}

public struct Fix {
    public let t: Double, lon: Double, lat: Double
    public let speedKmh: Double?, headingDeg: Double?
    public init(t: Double, lon: Double, lat: Double, speedKmh: Double? = nil, headingDeg: Double? = nil) {
        self.t = t; self.lon = lon; self.lat = lat; self.speedKmh = speedKmh; self.headingDeg = headingDeg
    }
}

public struct Alert: Equatable {
    public let t: Double
    public let hazardId: String
    public let kind: HazardKind
    public let distanceM: Int
    public let text: String
    /// Serious accidents only — which of the two-step calls (DECISIONS #28, #443). nil otherwise.
    public let step: AccidentStep?
    /// S3: the frost-risk call came from the post-rain beta rule (DECISIONS #524). Kandidaten: always (DECISIONS #562).
    /// The warning card marks it as beta.
    public let beta: Bool
    public init(t: Double, hazardId: String, kind: HazardKind, distanceM: Int, text: String, step: AccidentStep? = nil, beta: Bool = false) {
        self.t = t; self.hazardId = hazardId; self.kind = kind; self.distanceM = distanceM; self.text = text; self.step = step
        self.beta = beta
    }
}

public struct EngineConfig {
    public var corridorHalfAngleDeg = 35.0
    public var minSpeedKmh = 15.0
    public var globalCooldownS = 10.0   // #127: var 45; prioritetsmedveten nu
    public var repeatMinS = 600.0
    public var repeatMinM = 5000.0
    public var cameraTriggerM = 500.0
    public var accidentMaxAheadM = 10_000.0
    public var accidentSeriousMinSeverity = 5
    public var accidentNearM = 2_000.0
    public var warnLeadS = 30.0
    public var leadMinM = 400.0
    public var leadMaxM = 3000.0
    public var segmentSampleM = 100.0
    public var cameraBearingToleranceDeg = 60.0
    // S3 (DECISIONS #222, #524): betans startvärden — samma tal som engine/src/types.ts och sql/028 (kontraktsgrinden).
    public var efterhalkaYtaMinC = 1.0
    public var efterhalkaYtaMaxC = 3.0
    public var efterhalkaFall30C = 0.8
    public var efterhalkaRegnH = 2.0
    // K (DECISIONS #581): tyst så här länge efter samma sträckas halkvarning — samma tal som engine/src/types.ts (kontraktsgrinden).
    public var kandidatEfterHalkaS = 120.0
    // Taket (DECISIONS #606): högst en kandidat per så här många sekunder — samma tal som engine/src/types.ts (kontraktsgrinden).
    public var kandidatTakS = 600.0
    // Halkzonen (DECISIONS #622): sträckor inom så här många meter är en zon för reprisregeln — samma tal som engine/src/types.ts
    // (kontraktsgrinden).
    public var halkZonM = 500.0
    public init() {}
}

// MARK: - Geo (mirror of geo.ts — same formula sequences)

enum Geo {
    static let R = 6_371_000.0
    static let D2R = Double.pi / 180.0

    static func haversineM(_ aLon: Double, _ aLat: Double, _ bLon: Double, _ bLat: Double) -> Double {
        let dLat = (bLat - aLat) * D2R
        let dLon = (bLon - aLon) * D2R
        let s = pow(sin(dLat / 2), 2) + cos(aLat * D2R) * cos(bLat * D2R) * pow(sin(dLon / 2), 2)
        return 2 * R * asin(sqrt(s))
    }

    static func bearingDeg(_ aLon: Double, _ aLat: Double, _ bLon: Double, _ bLat: Double) -> Double {
        let p1 = aLat * D2R, p2 = bLat * D2R, dl = (bLon - aLon) * D2R
        let y = sin(dl) * cos(p2)
        let x = cos(p1) * sin(p2) - sin(p1) * cos(p2) * cos(dl)
        let th = atan2(y, x) / D2R
        return (th + 360).truncatingRemainder(dividingBy: 360)
    }

    static func angDiffDeg(_ a: Double, _ b: Double) -> Double {
        let d = abs(a - b).truncatingRemainder(dividingBy: 360)
        return d > 180 ? 360 - d : d
    }

    static func samplePolyline(_ line: [[Double]], _ stepM: Double) -> [[Double]] {
        var out: [[Double]] = []
        for i in 0..<line.count {
            let a = line[i]
            out.append(a)
            if i == line.count - 1 { break }
            let b = line[i + 1]
            let segLen = haversineM(a[0], a[1], b[0], b[1])
            let n = Int(floor(segLen / stepM))
            if n >= 1 {
                for k in 1...n {
                    let f = (Double(k) * stepM) / segLen
                    if f >= 1 { break }
                    out.append([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f])
                }
            }
        }
        return out
    }
}

// MARK: - Texts (exact product copy — mirror of texts.ts)

enum Texts {
    /// S3, efterhalkan som märkt beta (DECISIONS #222, #524) — spegel av EFTERHALKA_TEXT i texts.ts.
    static let efterhalkaText = "Halkvakt tror: frysrisk framöver."
    /// Kandidatens betavarning (DECISIONS #562, #573) — spegel av KANDIDAT_TEXT i texts.ts.
    static let kandidatText = "Halkvakt tror: halka framöver."

    /// " på E18" / " på väg 25" / "" när numret saknas.
    static func roadPhrase(_ road: String?) -> String {
        guard let r = road?.trimmingCharacters(in: .whitespaces), !r.isEmpty else { return "" }
        return r.first!.isLetter ? " på \(r)" : " på väg \(r)"
    }

    static func alertText(_ kind: HazardKind, _ distanceM: Double, _ speedLimitKmh: Int?,
                          _ step: AccidentStep? = nil, _ endTimeLocal: String? = nil,
                          _ bridge: Bool = false, _ road: String? = nil) -> String {
        switch kind {
        case .accident:
            // VAR, inte bara hur långt. "E18" läses "E arton"; blott nummer blir "olycka på
            // 25" — därför "väg 25" när numret saknar bokstav.
            let on = Texts.roadPhrase(road)
            let km = max(1, Int((distanceM / 1000).rounded()))
            switch step {
            case .early:
                let base = "Allvarlig olycka\(on) \(km) kilometer framför dig — stor påverkan på trafiken. "
                    + "Överväg annan väg."
                if let t = endTimeLocal { return "\(base) Beräknas röjd vid \(t)." }
                return base
            case .reminder:
                return "Sakta ner — olycksplats strax framför dig."
            case .late:
                return "Allvarlig olycka\(on) \(km) kilometer framför dig — stor påverkan. Sakta ner."
            case .none:
                return "Olycka rapporterad\(on) \(km) kilometer framför dig."
            }
        case .slippery_segment:
            return "Varning: halka rapporterad på vägen framför dig."
        case .icing_point:
            if bridge {
                // Bro (#38): säg VAD och ungefär VAR — föraren letar efter bron.
                let m = max(100, Int((distanceM / 100).rounded()) * 100)
                return "Frysrisk framöver — bro om \(m) meter."
            }
            return "Isrisk framöver — vägbanan nära noll grader."
        case .wildlife:
            return "Viltrisk framöver."
        case .camera:
            if let limit = speedLimitKmh { return "Fartkamera om 500 meter. Gränsen är \(limit)." }
            return "Fartkamera om 500 meter."
        case .kandidat:
            return kandidatText
        }
    }
}

// MARK: - Engine (mirror of engine.ts state machine)

public final class AlertEngine {
    private let cfg: EngineConfig
    private struct Point { let id: String; let kind: HazardKind; let lon, lat: Double; let bearing: Double?; let meta: PointMeta }
    private struct Segment { let id: String; let meta: SegmentMeta; let samples: [[Double]]; let line: [[Double]] }
    private struct Kandidat { let id: String; let points: [[Double]]; let segmentHazardId: String? }
    private var points: [Point] = []
    private var segments: [Segment] = []
    private var kandidater: [Kandidat] = []

    private var prevFix: Fix?
    private var lastHeadingDeg: Double?
    private var odometerM = 0.0
    private var lastSpokenT: Double?
    /// Vad som senast sades — spärren får bara tysta något som INTE är viktigare (#127).
    private var lastSpokenKind: HazardKind?
    /// När kandidaten senast talade — taket räknas därifrån, oavsett sträcka (DECISIONS #606).
    private var lastKandidatT: Double?
    private var fired: [String: (t: Double, odo: Double)] = [:]
    /// Halkzonen (kort #360): whether two stretches are neighbours, per sorted id pair (the geometry does not change).
    private var zonGrannar: [String: Bool] = [:]

    private let slipperyInfo = try! NSRegularExpression(
        pattern: "(?<![a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)",
        options: [.caseInsensitive])
    // Snow/frost also count inside compounds — "Nysnö", "Rimfrost" (kort #97). Mirrors engine.ts SLIPPERY_STAM.
    private let slipperyStam = try! NSRegularExpression(pattern: "(snö|frost)", options: [.caseInsensitive])

    public init(_ hazards: [Hazard], _ cfg: EngineConfig = EngineConfig()) {
        self.cfg = cfg
        ingest(hazards)
    }

    private func ingest(_ hazards: [Hazard]) {
        points = []
        segments = []
        kandidater = []
        for h in hazards {
            switch h {
            case .point(let id, let kind, let lon, let lat, let bearing, let meta):
                points.append(Point(id: id, kind: kind, lon: lon, lat: lat, bearing: bearing, meta: meta))
            case .segment(let id, let line, let meta):
                segments.append(Segment(id: id, meta: meta, samples: Geo.samplePolyline(line, cfg.segmentSampleM), line: line))
            case .kandidat(let id, let pts, let seg):
                kandidater.append(Kandidat(id: id, points: pts, segmentHazardId: seg))
            }
        }
    }

    /// Halkzonen (#360): the two stretches' lines lie within halkZonM — measured line to line by the route filter, the same
    /// function as engine/src/rutfilter.ts. Cached per pair.
    private func grannar(_ a: Segment, _ b: Segment) -> Bool {
        let nyckel = a.id < b.id ? "\(a.id)|\(b.id)" : "\(b.id)|\(a.id)"
        if let v = zonGrannar[nyckel] { return v }
        let v = !RouteFilter.alongRoute([.segment(id: b.id, line: b.line, meta: b.meta)], a.line, marginM: cfg.halkZonM).isEmpty
        zonGrannar[nyckel] = v
        return v
    }

    /// Swap the hazard set mid-drive (fresh snapshot) WITHOUT losing memory: odometer,
    /// heading, cooldown clock and the fired-map survive, so the guard never re-announces
    /// something it just said. Ids are stable across snapshots; entries for vanished ids
    /// are kept on purpose (flicker-out/in must still obey the repeat rules).
    public func updateHazards(_ hazards: [Hazard]) { ingest(hazards) }

    public func step(_ fix: Fix) -> Alert? {
        let (speedKmhOpt, headingOpt) = kinematics(fix)
        if let p = prevFix { odometerM += Geo.haversineM(p.lon, p.lat, fix.lon, fix.lat) }
        prevFix = fix
        if let h = headingOpt { lastHeadingDeg = h }

        guard let speedKmh = speedKmhOpt, speedKmh >= cfg.minSpeedKmh else { return nil }
        guard let heading = lastHeadingDeg else { return nil }

        let speedMps = speedKmh * 1000 / 3600
        let leadM = min(cfg.leadMaxM, max(cfg.leadMinM, speedMps * cfg.warnLeadS))

        // `alertKey` is what the repeat rules remember — normally the hazard id, but a SERIOUS
        // accident owns two voice slots ("<id>#early" / "<id>#near") so the 2 km reminder is not
        // swallowed by the suppression following the 10 km call (DECISIONS #28). Internal only:
        // the emitted Alert keeps its hazardId, so the shared vector log shape is unchanged.
        struct Candidate {
            let id: String; let kind: HazardKind; let distM: Double; let limit: Int?
            var alertKey: String; var step: AccidentStep? = nil; var endTimeLocal: String? = nil
            var bridge: Bool = false
            var road: String? = nil
            var beta: Bool = false
        }
        var candidates: [Candidate] = []

        for p in points {
            let (ahead, distM) = isAhead(fix, heading, p.lon, p.lat)
            if !ahead { continue }
            switch p.kind {
            case .camera:
                if distM > cfg.cameraTriggerM { continue }
                // Trafikverkets Bearing = riktningen kameran TITTAR, rakt MOT trafiken den
                // fotograferar. Övervakad färdriktning = bearing + 180° (Bengts mätning E4 2/9).
                if let b = p.bearing,
                   Geo.angDiffDeg((b + 180).truncatingRemainder(dividingBy: 360), heading) > cfg.cameraBearingToleranceDeg { continue }
                candidates.append(Candidate(id: p.id, kind: p.kind, distM: distM,
                                            limit: p.meta.speedLimitKmh, alertKey: p.id))
            case .accident:
                // A3 grading (DECISIONS #28): mild keeps the old single line; serious speaks
                // early (routing decision, exits remain) and again inside 2 km (speed only).
                // Joined the road inside 2 km? Then no early call was heard, so speak LATE copy:
                // same facts, no reroute advice that can no longer be acted on.
                if distM <= cfg.accidentMaxAheadM {
                    let sev = p.meta.severityCode
                    let serious = sev != nil && sev! >= cfg.accidentSeriousMinSeverity
                    if !serious {
                        candidates.append(Candidate(id: p.id, kind: p.kind, distM: distM,
                                                    limit: nil, alertKey: p.id, road: p.meta.road))
                    } else if distM <= cfg.accidentNearM {
                        let earlySpoken = fired["\(p.id)#early"] != nil
                        candidates.append(Candidate(id: p.id, kind: p.kind, distM: distM, limit: nil,
                                                    alertKey: "\(p.id)#near",
                                                    step: earlySpoken ? .reminder : .late,
                                                    endTimeLocal: p.meta.endTimeLocal, road: p.meta.road))
                    } else if fired["\(p.id)#early"] == nil {
                        // The early call is ONE-SHOT per hazard (#211, 20/9): rule 2 would re-arm it
                        // after 10 min + 5 km, which a slow approach passes before 2 km. Exactly two.
                        candidates.append(Candidate(id: p.id, kind: p.kind, distM: distM, limit: nil,
                                                    alertKey: "\(p.id)#early", step: .early,
                                                    endTimeLocal: p.meta.endTimeLocal, road: p.meta.road))
                    }
                }
            case .icing_point:
                // Broar (#38): brobanan fryser först — närmaste station på +3 räcker.
                if let t = p.meta.surfaceTempC, t <= (p.meta.bridge ? 3 : 1), p.meta.moisture {
                    if distM <= leadM {
                        candidates.append(Candidate(id: p.id, kind: p.kind, distM: distM, limit: nil, alertKey: p.id,
                                                    bridge: p.meta.bridge, road: p.meta.road))
                    }
                } else if !p.meta.bridge, let t = p.meta.surfaceTempC, let rainH = p.meta.rainH, let fall30 = p.meta.fall30C,
                          t >= cfg.efterhalkaYtaMinC, t <= cfg.efterhalkaYtaMaxC,
                          fall30 >= cfg.efterhalkaFall30C, rainH <= cfg.efterhalkaRegnH, distM <= leadM {
                    // S3 — efterhalkan som märkt beta (DECISIONS #222, #524), spegel av engine.ts: +1…+3 °C, fallit snabbt
                    // efter regn inom 2 h. Bara stationer — broarna behåller sin +3-regel.
                    candidates.append(Candidate(id: p.id, kind: p.kind, distM: distM, limit: nil, alertKey: p.id, beta: true))
                }
            case .wildlife:
                if p.meta.active, distM <= leadM {
                    candidates.append(Candidate(id: p.id, kind: p.kind, distM: distM, limit: nil, alertKey: p.id))
                }
            case .slippery_segment, .kandidat:
                continue
            }
        }
        for s in segments {
            let slippery = (s.meta.code ?? 0) >= 2 || s.meta.info.contains { info in
                let r = NSRange(info.startIndex..., in: info)
                return slipperyInfo.firstMatch(in: info, range: r) != nil || slipperyStam.firstMatch(in: info, range: r) != nil
            }
            if !slippery { continue }
            var best: Double?
            for pt in s.samples {
                let (ahead, distM) = isAhead(fix, heading, pt[0], pt[1])
                if ahead && (best == nil || distM < best!) { best = distM }
            }
            if let b = best, b <= leadM {
                candidates.append(Candidate(id: s.id, kind: .slippery_segment, distM: b, limit: nil, alertKey: s.id))
            }
        }
        // Kandidaten (DECISIONS #562, #577), spegel av evaluateKandidat i engine.ts: the rule lives in the database, so no
        // threshold here — only the corridor and the lead over the stretch's points. One key per stretch.
        for k in kandidater {
            var best: Double?
            for pt in k.points {
                let (ahead, distM) = isAhead(fix, heading, pt[0], pt[1])
                if ahead && (best == nil || distM < best!) { best = distM }
            }
            // (c), DECISIONS #581: tyst i kandidatEfterHalkaS efter att samma sträckas halkvarning (A1) talat.
            if let s = k.segmentHazardId, let a1 = fired[s], fix.t - a1.t < cfg.kandidatEfterHalkaS { continue }
            // Taket, DECISIONS #606: högst en kandidat per kandidatTakS, vilken sträcka det än gäller.
            if let lk = lastKandidatT, fix.t - lk < cfg.kandidatTakS { continue }
            if let b = best, b <= leadM {
                candidates.append(Candidate(id: k.id, kind: .kandidat, distM: b, limit: nil, alertKey: k.id, beta: true))
            }
        }
        if candidates.isEmpty { return nil }

        let rearmed: ((t: Double, odo: Double)) -> Bool = { f in
            fix.t - f.t >= self.cfg.repeatMinS && self.odometerM - f.odo >= self.cfg.repeatMinM
        }
        var eligible: [Candidate] = []
        for c in candidates {
            if let f = fired[c.alertKey], !rearmed(f) { continue }
            // Halkzonen (kort #360, DECISIONS #621, #622): a neighbour stretch within halkZonM spoke and is not re-armed.
            if c.kind == .slippery_segment, let a = segments.first(where: { $0.id == c.id }),
               segments.contains(where: { s in
                   s.id != c.id && (fired[s.id].map { !rearmed($0) } ?? false) && grannar(a, s)
               }) { continue }
            eligible.append(c)
        }
        if eligible.isEmpty { return nil }

        let win = eligible.sorted {
            if $0.kind.priority != $1.kind.priority { return $0.kind.priority < $1.kind.priority }
            if $0.distM != $1.distM { return $0.distM < $1.distM }
            return $0.alertKey < $1.alertKey
        }[0]

        // Regel 1b: PRIORITETSMEDVETEN spärr (#127). Får bara kasta en vinnare vars prioritet
        // inte är högre än det senast sagda. Is får avbryta en kamera; en kamera aldrig is.
        if let last = lastSpokenT, fix.t - last < cfg.globalCooldownS {
            let lastP = lastSpokenKind?.priority ?? Int.max
            if win.kind.priority >= lastP { return nil }
        }

        lastSpokenT = fix.t
        lastSpokenKind = win.kind
        if win.kind == .kandidat { lastKandidatT = fix.t }
        fired[win.alertKey] = (fix.t, odometerM)
        return Alert(
            t: fix.t, hazardId: win.id, kind: win.kind,
            distanceM: Int(win.distM.rounded()),
            text: win.beta && win.kind == .icing_point ? Texts.efterhalkaText
                           : Texts.alertText(win.kind, win.distM, win.limit, win.step, win.endTimeLocal, win.bridge, win.road),
            step: win.step, beta: win.beta)
    }

    public func run(_ trace: [Fix]) -> [Alert] { trace.compactMap { step($0) } }

    private func kinematics(_ fix: Fix) -> (Double?, Double?) {
        var speedKmh = fix.speedKmh
        var headingDeg = fix.headingDeg
        if let p = prevFix {
            let dt = fix.t - p.t
            let dM = Geo.haversineM(p.lon, p.lat, fix.lon, fix.lat)
            if speedKmh == nil && dt > 0 { speedKmh = dM / dt * 3.6 }
            if headingDeg == nil && dM >= 5 { headingDeg = Geo.bearingDeg(p.lon, p.lat, fix.lon, fix.lat) }
        }
        return (speedKmh, headingDeg)
    }

    private func isAhead(_ fix: Fix, _ heading: Double, _ lon: Double, _ lat: Double, nearM: Double = 30) -> (Bool, Double) {
        let distM = Geo.haversineM(fix.lon, fix.lat, lon, lat)
        if distM < nearM { return (true, distM) }
        let ahead = Geo.angDiffDeg(Geo.bearingDeg(fix.lon, fix.lat, lon, lat), heading) <= cfg.corridorHalfAngleDeg
        return (ahead, distM)
    }
}
