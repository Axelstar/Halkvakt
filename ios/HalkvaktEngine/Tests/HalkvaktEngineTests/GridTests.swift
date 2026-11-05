// The grid is an optimisation, not a rule (DECISIONS #795) — the Swift twin of test/motorns-rutnat.test.ts and GridTest.kt. The
// engine evaluates only the hazards in the fix's grid cell; `bruteForce` (test only) evaluates every hazard on every fix, as before
// 5/11. Both paths run side by side over seeded random hazard sets and traces that sit on the bounds — hazards just inside and just
// outside each reach, on cell borders, around the antimeridian and the pole, broken coordinates and fixes, NaN speeds, duplicate
// ids, snapshot swaps and odd configurations — over the Skåne fixture with 2 000 kandidat points and 3 000 wildlife points, and at
// the window's tight north and south edges.
// Every step's alert must be equal. Fewer scenarios than the TS and Kotlin twins: the debug build on Linux is slow.
import Foundation
import Testing
@testable import HalkvaktEngine

struct GridTests {

    /// mulberry32, as in the TS test: small and seeded, the same sequence on every machine.
    final class Rng {
        private var a: UInt32
        init(_ seed: Int) { a = UInt32(truncatingIfNeeded: seed) }
        func next() -> Double {
            a = a &+ 0x6d2b79f5
            var t = a
            t = (t ^ (t >> 15)) &* (t | 1)
            t ^= t &+ ((t ^ (t >> 7)) &* (t | 61))
            return Double(t ^ (t >> 14)) / 4_294_967_296
        }
        func between(_ lo: Double, _ hi: Double) -> Double { lo + (hi - lo) * next() }
        func pick<T>(_ xs: [T]) -> T { xs[Int(next() * Double(xs.count))] }
    }

    /// The point dM metres from (lon, lat) along bearing bDeg on the sphere, longitude folded into [−180, 180).
    static func dest(_ lon: Double, _ lat: Double, _ dM: Double, _ bDeg: Double) -> [Double] {
        let d2r = Double.pi / 180
        let d = dM / 6_371_000, th = bDeg * d2r, p1 = lat * d2r, l1 = lon * d2r
        let p2 = asin(sin(p1) * cos(d) + cos(p1) * sin(d) * cos(th))
        let l2 = l1 + atan2(sin(th) * sin(d) * cos(p1), cos(d) - sin(p1) * sin(p2))
        return [(l2 / d2r + 540).truncatingRemainder(dividingBy: 360) - 180, p2 / d2r]
    }

    static let places: [(String, Double, Double)] = [
        ("Skåne", 13.15, 55.38), ("Kiruna", 20.22, 67.85), ("southern hemisphere", 151.2, -33.9),
        ("western hemisphere", -74.0, 40.7), ("zero meridian", 0.004, 0.004), ("antimeridian", 179.97, 65.0), ("pole", 10, 89.8),
    ]

    static func makeTrace(_ r: Rng, _ lon0: Double, _ lat0: Double, _ n: Int) -> (fixes: [Fix], headings: [Double]) {
        var fixes: [Fix] = [], headings: [Double] = []
        var lon = lon0, lat = lat0, heading = r.between(0, 360), speed = r.between(30, 130), t = 0.0
        for _ in 0..<n {
            let u = r.next()
            if u < 0.03 { speed = r.between(150, 400) }        // leads up to the 3 000 m ceiling
            else if u < 0.05 { speed = r.between(0, 14) }      // below minSpeedKmh
            else { speed = min(400, max(0, speed + r.between(-6, 6))) }
            heading = r.next() < 0.02 ? r.between(0, 360) : (heading + r.between(-6, 6) + 360).truncatingRemainder(dividingBy: 360)
            let dt = r.next() < 0.9 ? 1.0 : r.pick([0, 0.5, 2, 5])
            t += dt
            let p = dest(lon, lat, speed / 3.6 * dt, heading)
            lon = p[0]; lat = p[1]
            let v: Double? = r.next() < 0.7 ? speed : nil
            let h: Double? = r.next() < 0.5 ? heading : nil
            fixes.append(Fix(t: t, lon: lon, lat: lat, speedKmh: v, headingDeg: h))
            headings.append(heading)
        }
        return (fixes, headings)
    }

    static func makeConfig(_ r: Rng) -> EngineConfig {
        var c = EngineConfig()
        if r.next() < 0.35 { return c }
        if r.next() < 0.5 { c.leadMaxM = r.pick([400, 1200, 2000, 3000, 6000, 12000]) }
        if r.next() < 0.3 { c.leadMinM = r.pick([100, 400, 900]) }
        if r.next() < 0.3 { c.warnLeadS = r.pick([10, 30, 90, 200]) }
        if r.next() < 0.3 { c.cameraTriggerM = r.pick([150, 500, 1500]) }
        if r.next() < 0.3 { c.accidentMaxAheadM = r.pick([3000, 10000, 25000]) }
        if r.next() < 0.2 { c.accidentNearM = r.pick([500, 2000, 4000]) }
        if r.next() < 0.3 { c.segmentSampleM = r.pick([30, 100, 400]) }
        if r.next() < 0.3 { c.corridorHalfAngleDeg = r.pick([20, 35, 90, 180]) }
        if r.next() < 0.4 { c.repeatMinS = r.pick([30, 120, 600]); c.repeatMinM = r.pick([200, 1000, 5000]) }
        if r.next() < 0.2 { c.globalCooldownS = r.pick([0, 3, 10]) }
        if r.next() < 0.2 { c.kandidatTakS = r.pick([0, 60, 600]) }
        if r.next() < 0.2 { c.kandidatEfterHalkaS = r.pick([0, 120, 900]) }
        if r.next() < 0.2 { c.halkZonM = r.pick([0, 500, 3000]) }
        if r.next() < 0.05 { c.leadMaxM = r.pick([Double.nan, Double.infinity, -5]) }   // windows that bound nothing
        if r.next() < 0.05 { c.cameraTriggerM = r.pick([Double.nan, Double.infinity]) }
        return c
    }

    static func makeHazards(_ r: Rng, _ fixes: [Fix], _ headings: [Double], _ cfg: EngineConfig, _ n: Int, _ tag: String,
                            _ broken: Double) -> [Hazard] {
        var out: [Hazard] = []
        let leadReach = max(cfg.leadMaxM, EngineConfig().leadMaxM)
        func finite(_ x: Double, _ alt: Double) -> Double { x.isFinite ? x : alt }
        func distance(_ bound: Double) -> Double {
            let u = r.next()
            if u < 0.35 { return max(0, bound + r.between(-60, 60)) }   // on the edge of the reach
            if u < 0.5 { return bound + r.between(60, 400) }            // just outside
            return r.between(0, min(bound * 1.3, 15000))
        }
        var heading = 0.0   // the anchor fix's heading, for a camera's bearing
        func place(_ bound: Double) -> [Double] {
            let i = Int(r.next() * Double(fixes.count))
            let f = fixes[i]
            heading = headings[i]
            let b = r.next() < 0.75 ? heading + r.between(-40, 40) : r.between(0, 360)
            var p = dest(f.lon, f.lat, distance(bound), b)
            if r.next() < 0.08 { p[1] = (p[1] / 0.05).rounded() * 0.05 + r.pick([-1e-9, 0, 1e-9]) }   // on a cell border
            if r.next() < 0.08 { p[0] = (p[0] / 0.05).rounded() * 0.05 + r.pick([-1e-9, 0, 1e-9]) }
            if r.next() < broken {
                if r.next() < 0.5 { p[0] = r.pick([Double.nan, Double.infinity, 181, -200, 360.0001]) }
                else { p[1] = r.pick([Double.nan, -Double.infinity, 91, -95]) }
            }
            return p
        }
        var ids: [String: [String]] = [:]
        func id(_ kind: String) -> String {
            let seen = ids[kind, default: []]
            if !seen.isEmpty && r.next() < 0.05 { return r.pick(seen) }   // duplicate id: order must not matter more than before
            let v = "\(tag)\(kind)\(seen.count)"
            ids[kind, default: []].append(v)
            return v
        }
        for _ in 0..<n {
            switch r.pick(["camera", "camera", "accident", "icing_point", "wildlife", "slippery_segment", "kandidat", "kandidat"]) {
            case "camera":
                let p = place(finite(cfg.cameraTriggerM, 500))
                let bearing: Double? = r.next() < 0.6 ? (heading + 180 + r.between(-90, 90) + 360).truncatingRemainder(dividingBy: 360) : nil
                let hid = id("camera")
                out.append(.point(id: hid, kind: .camera, lon: p[0], lat: p[1], bearing: bearing,
                                  meta: PointMeta(speedLimitKmh: r.pick([nil, 70, 90]))))
            case "accident":
                let p = place(r.next() < 0.3 ? cfg.accidentNearM : finite(cfg.accidentMaxAheadM, 10000))
                let hid = id("accident")
                let sev: Int? = r.pick([nil, 1, 2, 4, 5, 5])
                let end: String? = r.pick([nil, "14:30"])
                let road: String? = r.pick([nil, "E22", "108"])
                out.append(.point(id: hid, kind: .accident, lon: p[0], lat: p[1], bearing: nil,
                                  meta: PointMeta(severityCode: sev, endTimeLocal: end, road: road)))
            case "icing_point":
                let p = place(finite(leadReach, 3000))
                let hid = id("icing_point")
                let temp: Double? = r.pick([-3, 0.5, 1, 1.5, 2.5, 3, 4, nil])
                let moisture = r.next() < 0.6, bridge = r.next() < 0.2
                let rainH: Double? = r.pick([nil, 0.5, 1.9, 3]), fall30: Double? = r.pick([nil, 0.5, 0.8, 1.5])
                out.append(.point(id: hid, kind: .icing_point, lon: p[0], lat: p[1], bearing: nil,
                                  meta: PointMeta(surfaceTempC: temp, moisture: moisture, bridge: bridge, rainH: rainH, fall30C: fall30)))
            case "wildlife":
                let p = place(finite(leadReach, 3000))
                let meta = r.next() < 0.3 ? PointMeta() : PointMeta(active: r.next() < 0.8)
                out.append(.point(id: id("wildlife"), kind: .wildlife, lon: p[0], lat: p[1], bearing: nil, meta: meta))
            case "slippery_segment":
                var line = [place(finite(leadReach, 3000))]
                var b = r.between(0, 360)
                var k = 1 + Int(r.next() * 5)
                while k > 0 {
                    k -= 1
                    let last = line[line.count - 1]
                    b += r.between(-30, 30)
                    line.append(last[0].isFinite && last[1].isFinite ? dest(last[0], last[1], r.between(50, 1500), b) : place(3000))
                }
                let code: Int? = r.pick([nil, 1, 2, 3, 4])
                let info: [String] = r.pick([[], ["Is"], ["Våt"], ["fläckvis Våt"], ["Snöfläckar"], ["Normalt"]])
                out.append(.segment(id: id("slippery_segment"), line: line, meta: SegmentMeta(code: code, info: info)))
            default:
                var pts = [place(finite(leadReach, 3000))]
                let b = r.between(0, 360), step = r.between(200, 2500)
                var k = Int(r.next() * 12)
                while k > 0 {
                    k -= 1
                    let last = pts[pts.count - 1]
                    pts.append(last[0].isFinite && last[1].isFinite ? dest(last[0], last[1], step, b + r.between(-20, 20)) : place(3000))
                }
                let segs: [String] = out.compactMap { (h: Hazard) -> String? in
                    if case .segment(let sid, _, _) = h { return sid }
                    return nil
                }
                let seg: String? = !segs.isEmpty && r.next() < 0.5 ? r.pick(segs) : nil
                out.append(.kandidat(id: id("kandidat"), points: pts, segmentHazardId: seg))
            }
        }
        return out
    }

    struct Scenario {
        let name: String, cfg: EngineConfig, hazards: [Hazard], trace: [Fix], updates: [(at: Int, hazards: [Hazard])]
    }

    static func scenario(_ seed: Int) -> Scenario {
        let r = Rng(seed)
        let place = places[seed % places.count]
        let cfg = makeConfig(r)
        let trace = makeTrace(r, place.1, place.2, 150 + Int(r.next() * 200))
        var fixes = trace.fixes
        let headings = trace.headings
        let broken = seed % 5 == 0 ? 0.05 : 0
        if broken > 0 {   // fixes the grid cannot place (outside [−90, 90] × [−180, 180], not numbers) and a NaN speed (a NaN lead)
            for _ in 0..<4 {
                let i = Int(r.next() * Double(fixes.count))
                let f = fixes[i]
                switch Int(r.next() * 5) {
                case 0: fixes[i] = Fix(t: f.t, lon: f.lon + 360, lat: f.lat, speedKmh: f.speedKmh, headingDeg: f.headingDeg)
                case 1: fixes[i] = Fix(t: f.t, lon: 180.5, lat: f.lat, speedKmh: f.speedKmh, headingDeg: f.headingDeg)
                case 2: fixes[i] = Fix(t: f.t, lon: f.lon, lat: 90.5, speedKmh: f.speedKmh, headingDeg: f.headingDeg)
                case 3: fixes[i] = Fix(t: f.t, lon: .nan, lat: f.lat, speedKmh: f.speedKmh, headingDeg: f.headingDeg)
                default: fixes[i] = Fix(t: f.t, lon: f.lon, lat: f.lat, speedKmh: .nan, headingDeg: f.headingDeg)
                }
            }
        }
        let hazards = makeHazards(r, fixes, headings, cfg, Int(r.next() * 130), "a", broken)
        var updates: [(at: Int, hazards: [Hazard])] = []
        if r.next() < 0.3 {   // a fresh snapshot mid-drive: some hazards kept (reordered), some new
            let kept = hazards.filter { _ in r.next() < 0.6 }.map { ($0, r.next()) }.sorted { $0.1 < $1.1 }.map { $0.0 }
            let at = Int(r.next() * Double(fixes.count))
            updates.append((at, kept + makeHazards(r, fixes, headings, cfg, Int(r.next() * 80), "b", broken)))
        }
        return Scenario(name: "seed \(seed) (\(place.0))", cfg: cfg, hazards: hazards, trace: fixes, updates: updates)
    }

    /// Both paths side by side; every step's answer must be equal.
    static func runBoth(_ s: Scenario) throws -> [Alert] {
        let g = AlertEngine(s.hazards, s.cfg), f = AlertEngine(s.hazards, s.cfg)
        f.bruteForce = true
        var alerts: [Alert] = []
        var u = 0
        for (i, fix) in s.trace.enumerated() {
            while u < s.updates.count, s.updates[u].at == i {
                g.updateHazards(s.updates[u].hazards); f.updateHazards(s.updates[u].hazards); u += 1
            }
            let a = g.step(fix), b = f.step(fix)
            try #require(a == b, "\(s.name), fix \(i): the grid and the full scan disagree")
            if let a { alerts.append(a) }
        }
        return alerts
    }

    @Test func theGridSaysExactlyWhatTheFullScanSays() throws {
        var kinds: [HazardKind: Int] = [:]
        var steps: Set<String> = []
        var edgeCamera = 0, edgeAccident = 0, edgeLead = 0, alerts = 0
        let leadKinds: Set<HazardKind> = [.icing_point, .wildlife, .slippery_segment, .kandidat]
        for seed in 1...100 {
            let s = GridTests.scenario(seed)
            for a in try GridTests.runBoth(s) {
                alerts += 1
                kinds[a.kind, default: 0] += 1
                if let st = a.step { steps.insert(st.rawValue) }
                if a.beta && a.kind == .icing_point { steps.insert("beta") }
                // Alerts within 60 m of their reach: what a shrunk bound would lose first.
                if a.kind == .camera && s.cfg.cameraTriggerM - Double(a.distanceM) <= 60 { edgeCamera += 1 }
                if a.kind == .accident && (a.step == nil || a.step == .early) && s.cfg.accidentMaxAheadM - Double(a.distanceM) <= 60 { edgeAccident += 1 }
                if leadKinds.contains(a.kind) && s.cfg.leadMaxM - Double(a.distanceM) <= 60 { edgeLead += 1 }
            }
        }
        // Not a vacuous comparison: every kind spoke, every accident step and the beta occurred, many alerts sat on a bound.
        for k in HazardKind.allCases { #expect(kinds[k, default: 0] >= 20, "only \(kinds[k, default: 0]) \(k) alerts") }
        for st in ["early", "reminder", "late", "beta"] { #expect(steps.contains(st), "no \(st) alert") }
        #expect(alerts >= 800, "only \(alerts) alerts")
        #expect(edgeCamera >= 30 && edgeAccident >= 30 && edgeLead >= 30,
                "too few alerts on a bound: camera \(edgeCamera), accident \(edgeAccident), lead \(edgeLead)")
    }

    static func repoRoot() -> URL {
        var d = URL(fileURLWithPath: #filePath)
        while !FileManager.default.fileExists(atPath: d.appendingPathComponent("engine/vectors").path) {
            let parent = d.deletingLastPathComponent()
            precondition(parent.path != d.path, "engine/vectors not found above \(#filePath)")
            d = parent
        }
        return d
    }

    @Test func skaneFixtureWithKandidatAndWildlifePoints() throws {
        let url = GridTests.repoRoot().appendingPathComponent("engine/fixtures/skane_vag108.json")
        let doc = try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as! [String: Any]
        let trace: [Fix] = (doc["trace"] as! [[String: Any]]).map { f in
            Fix(t: (f["t"] as! NSNumber).doubleValue, lon: (f["lon"] as! NSNumber).doubleValue,
                lat: (f["lat"] as! NSNumber).doubleValue, speedKmh: (f["speedKmh"] as? NSNumber)?.doubleValue)
        }
        // The fixture's hazards: cameras, stretches and icing points.
        var hazards: [Hazard] = (doc["hazards"] as! [[String: Any]]).map { (o: [String: Any]) -> Hazard in
            let m = o["meta"] as? [String: Any]
            let kind = HazardKind(rawValue: o["kind"] as! String)!
            if kind == .slippery_segment {
                let line = (o["line"] as! [[Any]]).map { $0.map { ($0 as! NSNumber).doubleValue } }
                return .segment(id: o["id"] as! String, line: line,
                                meta: SegmentMeta(code: (m?["code"] as? NSNumber)?.intValue, info: m?["info"] as? [String] ?? []))
            }
            return .point(id: o["id"] as! String, kind: kind, lon: (o["lon"] as! NSNumber).doubleValue,
                          lat: (o["lat"] as! NSNumber).doubleValue, bearing: (o["bearing"] as? NSNumber)?.doubleValue,
                          meta: PointMeta(surfaceTempC: (m?["surfaceTempC"] as? NSNumber)?.doubleValue, moisture: m?["moisture"] as? Bool ?? false))
        }
        let r = Rng(108)
        for s in 0..<200 {   // 2 000 kandidat points within 4 km of the road
            let f = trace[Int(r.next() * Double(trace.count))]
            var pts: [[Double]] = []
            for _ in 0..<10 {
                let d = r.between(0, 4000), b = r.between(0, 360)
                pts.append(GridTests.dest(f.lon, f.lat, d, b))
            }
            hazards.append(.kandidat(id: "k\(s)", points: pts, segmentHazardId: nil))
        }
        for w in 0..<3000 {   // 3 000 wildlife points in the county, thirty by the road
            let f = trace[Int(r.next() * Double(trace.count))]
            let p: [Double]
            if w % 100 == 0 {
                let d = r.between(0, 300), b = r.between(0, 360)
                p = GridTests.dest(f.lon, f.lat, d, b)
            } else {
                let lon = r.between(12.5, 14.5), lat = r.between(55.3, 56.5)
                p = [lon, lat]
            }
            hazards.append(.point(id: "w\(w)", kind: .wildlife, lon: p[0], lat: p[1], bearing: nil, meta: PointMeta()))
        }
        let alerts = try GridTests.runBoth(Scenario(name: "Skåne + kandidater", cfg: EngineConfig(), hazards: hazards, trace: trace, updates: []))
        #expect(alerts.contains { $0.kind == .kandidat }, "the kandidat points must speak")
        #expect(alerts.contains { $0.kind == .wildlife }, "the wildlife points must speak")
    }

    @Test func theWindowsNorthAndSouthEdges() throws {
        // The latitude bound is reached exactly due north and due south (|Δφ| = distM / R), so a fix there tests the margin itself:
        // the window's edge sweeps across the cell borders in 2.2 m steps, and every hazard has one fix 0.5 m inside its reach.
        let cases: [(reach: Double, speedKmh: Double, kind: HazardKind)] = [(500, 80, .camera), (10_000, 80, .accident), (3000, 400, .wildlife)]
        var spoke = 0
        for c in cases {
            for j in 0..<3000 {
                for north in [true, false] {
                    let lon = 15.0, lat = 59 + Double(j) * 0.00002
                    let p = GridTests.dest(lon, lat, c.reach - 0.5, north ? 0 : 180)
                    let fix = Fix(t: 0, lon: p[0], lat: p[1], speedKmh: c.speedKmh, headingDeg: north ? 180 : 0)
                    let hazard: Hazard = .point(id: c.kind.rawValue, kind: c.kind, lon: lon, lat: lat, bearing: nil, meta: PointMeta())
                    let name = "\(c.reach) m \(north ? "north" : "south"), step \(j)"
                    spoke += try GridTests.runBoth(Scenario(name: name, cfg: EngineConfig(), hazards: [hazard], trace: [fix], updates: [])).count
                }
            }
        }
        #expect(spoke == cases.count * 3000 * 2, "every hazard 0.5 m inside its reach must speak")
    }
}
