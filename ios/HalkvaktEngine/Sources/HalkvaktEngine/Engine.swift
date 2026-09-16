// Swift twin of engine/src/*.ts and android/engine — keep the three in lockstep.
// No clocks, no randomness, no I/O. Any semantic change lands in ALL THREE and is
// proven by the shared vectors.
import Foundation

public enum HazardKind: String, CaseIterable {
    case accident, slippery_segment, icing_point, wildlife, camera
    // Spoken priority = declaration order above. Losers are DROPPED, never queued.
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
    public init(surfaceTempC: Double? = nil, moisture: Bool = false, active: Bool = true,
                speedLimitKmh: Int? = nil, severityCode: Int? = nil, endTimeLocal: String? = nil,
                bridge: Bool = false, road: String? = nil) {
        self.surfaceTempC = surfaceTempC; self.moisture = moisture; self.active = active
        self.speedLimitKmh = speedLimitKmh; self.severityCode = severityCode; self.endTimeLocal = endTimeLocal
        self.bridge = bridge; self.road = road
    }
}

/// Which utterance of a serious accident this is (DECISIONS #28). Mirrors AccidentStep in texts.ts.
public enum AccidentStep { case early, reminder, late }

public struct SegmentMeta {
    public var code: Int? = nil
    public var info: [String] = []
    public init(code: Int? = nil, info: [String] = []) { self.code = code; self.info = info }
}

public enum Hazard {
    case point(id: String, kind: HazardKind, lon: Double, lat: Double, bearing: Double?, meta: PointMeta)
    case segment(id: String, line: [[Double]], meta: SegmentMeta)

    public var id: String {
        switch self {
        case .point(let id, _, _, _, _, _): return id
        case .segment(let id, _, _): return id
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
    public init(t: Double, hazardId: String, kind: HazardKind, distanceM: Int, text: String) {
        self.t = t; self.hazardId = hazardId; self.kind = kind; self.distanceM = distanceM; self.text = text
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
            return "Viltrisk — vanlig olycksplats för älg den här tiden."
        case .camera:
            if let limit = speedLimitKmh { return "Fartkamera om 500 meter. Gränsen är \(limit)." }
            return "Fartkamera om 500 meter."
        }
    }
}

// MARK: - Engine (mirror of engine.ts state machine)

public final class AlertEngine {
    private let cfg: EngineConfig
    private struct Point { let id: String; let kind: HazardKind; let lon, lat: Double; let bearing: Double?; let meta: PointMeta }
    private struct Segment { let id: String; let meta: SegmentMeta; let samples: [[Double]] }
    private var points: [Point] = []
    private var segments: [Segment] = []

    private var prevFix: Fix?
    private var lastHeadingDeg: Double?
    private var odometerM = 0.0
    private var lastSpokenT: Double?
    /// Vad som senast sades — spärren får bara tysta något som INTE är viktigare (#127).
    private var lastSpokenKind: HazardKind?
    private var fired: [String: (t: Double, odo: Double)] = [:]

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
        for h in hazards {
            switch h {
            case .point(let id, let kind, let lon, let lat, let bearing, let meta):
                points.append(Point(id: id, kind: kind, lon: lon, lat: lat, bearing: bearing, meta: meta))
            case .segment(let id, let line, let meta):
                segments.append(Segment(id: id, meta: meta, samples: Geo.samplePolyline(line, cfg.segmentSampleM)))
            }
        }
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
                    } else {
                        candidates.append(Candidate(id: p.id, kind: p.kind, distM: distM, limit: nil,
                                                    alertKey: "\(p.id)#early", step: .early,
                                                    endTimeLocal: p.meta.endTimeLocal, road: p.meta.road))
                    }
                }
            case .icing_point:
                // Broar (#38): brobanan fryser först — närmaste station på +3 räcker.
                if let t = p.meta.surfaceTempC, t <= (p.meta.bridge ? 3 : 1), p.meta.moisture, distM <= leadM {
                    candidates.append(Candidate(id: p.id, kind: p.kind, distM: distM, limit: nil, alertKey: p.id,
                                                bridge: p.meta.bridge, road: p.meta.road))
                }
            case .wildlife:
                if p.meta.active, distM <= leadM {
                    candidates.append(Candidate(id: p.id, kind: p.kind, distM: distM, limit: nil, alertKey: p.id))
                }
            case .slippery_segment:
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
        if candidates.isEmpty { return nil }

        let eligible = candidates.filter { c in
            guard let f = fired[c.alertKey] else { return true }
            return fix.t - f.t >= cfg.repeatMinS && odometerM - f.odo >= cfg.repeatMinM
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
        fired[win.alertKey] = (fix.t, odometerM)
        return Alert(
            t: fix.t, hazardId: win.id, kind: win.kind,
            distanceM: Int(win.distM.rounded()),
            text: Texts.alertText(win.kind, win.distM, win.limit, win.step, win.endTimeLocal, win.bridge, win.road))
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
