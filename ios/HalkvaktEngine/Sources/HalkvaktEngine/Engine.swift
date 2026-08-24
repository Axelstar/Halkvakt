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
    public var active: Bool = true
    public var speedLimitKmh: Int? = nil
    public init(surfaceTempC: Double? = nil, moisture: Bool = false, active: Bool = true, speedLimitKmh: Int? = nil) {
        self.surfaceTempC = surfaceTempC; self.moisture = moisture; self.active = active; self.speedLimitKmh = speedLimitKmh
    }
}

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
}

public struct EngineConfig {
    public var corridorHalfAngleDeg = 35.0
    public var minSpeedKmh = 15.0
    public var globalCooldownS = 45.0
    public var repeatMinS = 600.0
    public var repeatMinM = 5000.0
    public var cameraTriggerM = 500.0
    public var accidentMaxAheadM = 10_000.0
    public var warnLeadS = 30.0
    public var leadMinM = 400.0
    public var leadMaxM = 3000.0
    public var segmentSampleM = 100.0
    public var cameraBearingToleranceDeg = 100.0
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
    static func alertText(_ kind: HazardKind, _ distanceM: Double, _ speedLimitKmh: Int?) -> String {
        switch kind {
        case .accident:
            let km = max(1, Int((distanceM / 1000).rounded()))
            return "Olycka rapporterad \(km) kilometer framför dig."
        case .slippery_segment:
            return "Varning: halka rapporterad på vägen framför dig."
        case .icing_point:
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
    private var fired: [String: (t: Double, odo: Double)] = [:]

    private let slipperyInfo = try! NSRegularExpression(
        pattern: "(?<![a-zåäö])(is|snö|halka|frost|mycket besvärligt)",
        options: [.caseInsensitive])

    public init(_ hazards: [Hazard], _ cfg: EngineConfig = EngineConfig()) {
        self.cfg = cfg
        for h in hazards {
            switch h {
            case .point(let id, let kind, let lon, let lat, let bearing, let meta):
                points.append(Point(id: id, kind: kind, lon: lon, lat: lat, bearing: bearing, meta: meta))
            case .segment(let id, let line, let meta):
                segments.append(Segment(id: id, meta: meta, samples: Geo.samplePolyline(line, cfg.segmentSampleM)))
            }
        }
    }

    public func step(_ fix: Fix) -> Alert? {
        let (speedKmhOpt, headingOpt) = kinematics(fix)
        if let p = prevFix { odometerM += Geo.haversineM(p.lon, p.lat, fix.lon, fix.lat) }
        prevFix = fix
        if let h = headingOpt { lastHeadingDeg = h }

        guard let speedKmh = speedKmhOpt, speedKmh >= cfg.minSpeedKmh else { return nil }
        guard let heading = lastHeadingDeg else { return nil }

        let speedMps = speedKmh * 1000 / 3600
        let leadM = min(cfg.leadMaxM, max(cfg.leadMinM, speedMps * cfg.warnLeadS))

        struct Candidate { let id: String; let kind: HazardKind; let distM: Double; let limit: Int? }
        var candidates: [Candidate] = []

        for p in points {
            let (ahead, distM) = isAhead(fix, heading, p.lon, p.lat)
            if !ahead { continue }
            switch p.kind {
            case .camera:
                if distM > cfg.cameraTriggerM { continue }
                if let b = p.bearing, Geo.angDiffDeg(b, heading) > cfg.cameraBearingToleranceDeg { continue }
                candidates.append(Candidate(id: p.id, kind: p.kind, distM: distM, limit: p.meta.speedLimitKmh))
            case .accident:
                if distM <= cfg.accidentMaxAheadM {
                    candidates.append(Candidate(id: p.id, kind: p.kind, distM: distM, limit: nil))
                }
            case .icing_point:
                if let t = p.meta.surfaceTempC, t <= 1, p.meta.moisture, distM <= leadM {
                    candidates.append(Candidate(id: p.id, kind: p.kind, distM: distM, limit: nil))
                }
            case .wildlife:
                if p.meta.active, distM <= leadM {
                    candidates.append(Candidate(id: p.id, kind: p.kind, distM: distM, limit: nil))
                }
            case .slippery_segment:
                continue
            }
        }
        for s in segments {
            let slippery = (s.meta.code ?? 0) >= 2 || s.meta.info.contains { info in
                slipperyInfo.firstMatch(in: info, range: NSRange(info.startIndex..., in: info)) != nil
            }
            if !slippery { continue }
            var best: Double?
            for pt in s.samples {
                let (ahead, distM) = isAhead(fix, heading, pt[0], pt[1])
                if ahead && (best == nil || distM < best!) { best = distM }
            }
            if let b = best, b <= leadM {
                candidates.append(Candidate(id: s.id, kind: .slippery_segment, distM: b, limit: nil))
            }
        }
        if candidates.isEmpty { return nil }

        let eligible = candidates.filter { c in
            guard let f = fired[c.id] else { return true }
            return fix.t - f.t >= cfg.repeatMinS && odometerM - f.odo >= cfg.repeatMinM
        }
        if eligible.isEmpty { return nil }

        let win = eligible.sorted {
            if $0.kind.priority != $1.kind.priority { return $0.kind.priority < $1.kind.priority }
            if $0.distM != $1.distM { return $0.distM < $1.distM }
            return $0.id < $1.id
        }[0]

        if let last = lastSpokenT, fix.t - last < cfg.globalCooldownS { return nil }

        lastSpokenT = fix.t
        fired[win.id] = (fix.t, odometerM)
        return Alert(
            t: fix.t, hazardId: win.id, kind: win.kind,
            distanceM: Int(win.distM.rounded()),
            text: Texts.alertText(win.kind, win.distM, win.limit))
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
