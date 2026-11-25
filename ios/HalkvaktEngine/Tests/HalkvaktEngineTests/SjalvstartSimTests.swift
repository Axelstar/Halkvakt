// The self-start rule against whole trips: does the guard start, and how late? Deterministic, 1 Hz, speeds in km/h.
//
// The probe (Fartkollen) is the real one. What wakes it is a MODEL of GuardManager and iOS, written out so it can be argued with:
//   * the first wake comes when the phone is `firstWakeM` from where it was parked: the parking fence is 150 m
//     (GuardManager.parkingRadiusM) and iOS reports an exit some way outside it;
//   * a probe that gave up is not repeated for `cooldownS` (GuardManager.probeCooldownS, 5 min), and the next wake after that
//     comes when the phone is `nextWakeM` from the last wake (iOS significant location change, about 500 m).
// iOS may wake later than this (never earlier than the fence), so every "starts after" below is the best case.
import XCTest
@testable import HalkvaktEngine

final class SjalvstartSimTests: XCTestCase {
    static let firstWakeM = 200.0, nextWakeM = 500.0, cooldownS = 300.0

    /// One second of a trip: the true speed, and what the phone says (nil = a poor fix or no speed of its own).
    struct Sec { let trueKmh: Double; let fixKmh: Double? }
    struct Result: Equatable { let startS: Int?; let startM: Int; let gpsS: Int; let probes: Int }

    // ── Building blocks ──
    static func hold(_ kmh: Double, _ s: Int) -> [Double] { Array(repeating: kmh, count: s) }
    static func ramp(_ from: Double, _ to: Double, _ s: Int) -> [Double] { (1...s).map { from + (to - from) * Double($0) / Double(s) } }
    static func times(_ n: Int, _ part: [Double]) -> [Double] { (0..<n).flatMap { _ in part } }
    static func good(_ v: [Double]) -> [Sec] { v.map { Sec(trueKmh: $0, fixKmh: $0) } }

    // ── The profiles ──
    /// (a) City: the car park at walking pace for a minute, then streets with red lights. The first three greens reach 42 km/h
    /// for only three seconds; after that 48 km/h for fifteen.
    static let cityCar = good(hold(6, 60)
        + times(3, ramp(0, 42, 10) + hold(42, 3) + ramp(42, 0, 8) + hold(0, 30))
        + times(6, ramp(0, 48, 12) + hold(48, 15) + ramp(48, 0, 9) + hold(0, 25)))
    /// (b) Twenty seconds out of the drive, three minutes of 30 zone with one stop, then a 70 road.
    static let thirtyZoneThenSeventy = good(hold(8, 20) + ramp(8, 30, 6) + hold(30, 80) + ramp(30, 0, 6) + hold(0, 10)
        + ramp(0, 30, 8) + hold(30, 70) + ramp(30, 70, 12) + hold(70, 600))
    /// (c) Five minutes of queue (stop and go, 12 km/h at most), then normal driving.
    static let queueThenDriving = good(times(15, ramp(0, 12, 4) + hold(12, 6) + ramp(12, 0, 4) + hold(0, 6))
        + ramp(0, 50, 12) + hold(50, 60) + ramp(50, 70, 8) + hold(70, 600))
    /// (c2) The whole trip in a 30 zone: never above 32 km/h. Twenty minutes.
    static let onlyThirtyZone = good(hold(8, 20) + times(12, ramp(0, 32, 8) + hold(32, 70) + ramp(32, 0, 7) + hold(0, 15)))
    /// (c3) A 40 road driven at the limit: the phone says 38–41, never five seconds in a row at 40 or more. Twenty minutes.
    static let fortyRoadAtTheLimit = good(hold(8, 20) + ramp(8, 39, 10) + times(240, [39, 40, 41, 40, 38]))
    /// (d) Commuter on a bicycle, 15–25 km/h with a stop at every fourth minute. Thirty minutes.
    static let commuterCyclist = good(times(8, ramp(0, 20, 8) + hold(20, 60) + ramp(20, 25, 5) + hold(25, 60) + ramp(25, 15, 5)
        + hold(15, 60) + ramp(15, 0, 5) + hold(0, 22)))
    /// (e) E-bike at a steady 25 km/h. Thirty minutes.
    static let eBike = good(ramp(0, 25, 6) + hold(25, 1794))
    /// (f) Road cyclist, 30–38 km/h, with one downhill at 45 km/h for twenty seconds after ten minutes. Thirty minutes.
    static let roadCyclist = good(ramp(0, 34, 15) + times(5, hold(34, 50) + hold(38, 37) + hold(30, 30))
        + ramp(34, 45, 5) + hold(45, 20) + ramp(45, 34, 5) + times(10, hold(34, 50) + hold(38, 37) + hold(30, 30)))
    /// (f3) The same rider with the downhill after three minutes, while the first probe is still watching.
    static let roadCyclistEarlyDownhill = good(ramp(0, 34, 15) + hold(34, 165) + ramp(34, 45, 5) + hold(45, 20) + ramp(45, 34, 5)
        + times(13, hold(34, 50) + hold(38, 37) + hold(30, 30)))
    /// (f2) The same rider without the downhill.
    static let roadCyclistFlat = good(ramp(0, 34, 15) + times(15, hold(34, 50) + hold(38, 37) + hold(30, 30)))
    /// (g) City bus: 0–50 km/h, twenty seconds at 50 between stops.
    static let cityBus = good(times(20, ramp(0, 50, 15) + hold(50, 20) + ramp(50, 0, 10) + hold(0, 25)))
    /// (h) A walk at 5 km/h for thirty minutes. Every tenth fix is a poor one (no speed), and once a minute the phone claims
    /// 60 km/h on a single good fix; at the tenth minute on four good fixes in a row.
    static let walkWithJumps: [Sec] = (0..<1800).map { s in
        if s % 10 == 7 { return Sec(trueKmh: 5, fixKmh: nil) }
        if s % 60 == 30 || (600...603).contains(s) { return Sec(trueKmh: 5, fixKmh: 60) }
        return Sec(trueKmh: 5, fixKmh: 5)
    }

    /// Runs one trip. `startM` is how far the phone had travelled when the guard started; `gpsS` is how long the probe kept the
    /// full position stream on (the battery cost of probing).
    static func run(_ trip: [Sec], maxS: TimeInterval = Fartkollen.maxS) -> Result {
        var p = Fartkollen(maxS: maxS)
        var m = 0.0, lastWakeM = 0.0, firstWake = true, failedAt: Double?
        var gpsS = 0, probes = 0
        for (s, sec) in trip.enumerated() {
            m += sec.trueKmh / 3.6
            let t = Double(s)
            if !p.active {
                let far = m - lastWakeM >= (firstWake ? firstWakeM : nextWakeM)
                let rested = failedAt.map { t - $0 >= cooldownS } ?? true
                guard far, rested else { continue }
                p.begin(t: t); firstWake = false; lastWakeM = m; probes += 1
            }
            gpsS += 1
            switch p.onFix(t: t, kmh: sec.fixKmh) {
            case .startGuard: return Result(startS: s, startM: Int(m.rounded()), gpsS: gpsS, probes: probes)
            case .sleep: failedAt = t
            case .waiting: break
            }
        }
        return Result(startS: nil, startM: Int(m.rounded()), gpsS: gpsS, probes: probes)
    }

    static let trips: [(String, [Sec])] = [
        ("a  city car, short bursts first", cityCar), ("b  30 zone 3 min, then 70 road", thirtyZoneThenSeventy),
        ("c  queue 5 min, then driving", queueThenDriving), ("c2 only 30 zone, 20 min", onlyThirtyZone),
        ("c3 40 road at the limit, 20 min", fortyRoadAtTheLimit), ("d  commuter cyclist 15-25", commuterCyclist),
        ("e  e-bike steady 25", eBike), ("f  road cyclist, 45 downhill 20 s", roadCyclist),
        ("f3 road cyclist, 45 downhill at 3 min", roadCyclistEarlyDownhill), ("f2 road cyclist, flat", roadCyclistFlat), ("g  city bus", cityBus), ("h  walk with GPS jumps", walkWithJumps),
    ]

    /// The table in the pull request: every trip under the old window (90 s) and the candidates.
    func testPrintTheTable() {
        print("SJALVSTART  trip                               length    90 s window         180 s window        300 s window")
        for (name, trip) in Self.trips {
            let cells = [90.0, 180, 300].map { w -> String in
                let r = Self.run(trip, maxS: w)
                let start = r.startS.map { "start \($0) s \(r.startM) m" } ?? "never"
                return "\(start), gps \(r.gpsS) s".padding(toLength: 30, withPad: " ", startingAt: 0)
            }
            print("SJALVSTART  \(name.padding(toLength: 38, withPad: " ", startingAt: 0)) \(trip.count) s   \(cells.joined())")
        }
    }

    // ── The rule as shipped (Fartkollen.startKmh 30, maxS 300), frozen ──
    func testCarTripsStartWhenTheCarFirstHoldsThirtyForFiveSeconds() {
        XCTAssertEqual(Self.run(Self.cityCar).startS, 122)                 // the first burst that holds 30 for five seconds
        XCTAssertEqual(Self.run(Self.thirtyZoneThenSeventy).startS, 44)    // already in the 30 zone
        XCTAssertEqual(Self.run(Self.queueThenDriving).startS, 311)        // eleven seconds after the queue lets go
    }

    /// With the 90 s window the queue is still missed by minutes; the other two no longer need the longer window.
    func testTheOldWindowStillMissesTheQueueByMinutes() {
        XCTAssertEqual(Self.run(Self.cityCar, maxS: 90).startS, 122)
        XCTAssertEqual(Self.run(Self.thirtyZoneThenSeventy, maxS: 90).startS, 44)
        XCTAssertEqual(Self.run(Self.queueThenDriving, maxS: 90).startS, 507)
    }

    /// At 40 km/h these two never started. At 30 they do: a trip that stays in a 30 zone, and a 40 road at the limit.
    func testACarInAThirtyZoneOrOnAFortyRoadStarts() {
        XCTAssertEqual(Self.run(Self.onlyThirtyZone).startS, 45)
        XCTAssertEqual(Self.run(Self.fortyRoadAtTheLimit).startS, 41)
    }

    func testOrdinaryBicyclesAndAWalkDoNotStart() {
        for trip in [Self.commuterCyclist, Self.eBike, Self.walkWithJumps] {
            XCTAssertNil(Self.run(trip).startS)
        }
    }

    /// Said plainly: these are not cars, and they start the guard. The price of 30 instead of 40 is the road cyclist,
    /// who holds 30 to 38 km/h on the flat.
    func testABusAndARoadCyclistDoStart() {
        XCTAssertEqual(Self.run(Self.cityBus).startS, 25)
        XCTAssertEqual(Self.run(Self.roadCyclistFlat).startS, 32)
        XCTAssertEqual(Self.run(Self.roadCyclist).startS, 32)
        XCTAssertEqual(Self.run(Self.roadCyclistEarlyDownhill).startS, 32)
    }
}
