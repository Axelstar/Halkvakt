import XCTest
@testable import HalkvaktEngine

// The auto-wake speed probe (kort #359): car speed starts the guard, five minutes without it goes back to sleep, and a guard
// started by hand during the probe ends it — the probe must never turn location off under a running guard. Car speed is five
// good fixes in a row at 40 km/h or more. Whole trips: SjalvstartSimTests.
final class FartkollenTests: XCTestCase {
    func testCarSpeedStartsTheGuard() {
        var p = Fartkollen()
        p.begin(t: 1000)
        XCTAssertEqual(p.onFix(t: 1010, kmh: 8), .waiting)
        for i in 0..<4 { XCTAssertEqual(p.onFix(t: 1020 + Double(i), kmh: 40), .waiting, "fix \(i + 1) of five") }
        XCTAssertEqual(p.onFix(t: 1024, kmh: 40), .startGuard)
        XCTAssertFalse(p.active)
        XCTAssertEqual(p.onFix(t: 1030, kmh: 50), .waiting, "over once the guard is started")
    }

    func testFiveMinutesWithoutCarSpeedGoesBackToSleep() {
        var p = Fartkollen()
        p.begin(t: 1000)
        XCTAssertEqual(p.onFix(t: 1300, kmh: 5), .waiting, "five minutes is still inside the probe")
        XCTAssertEqual(p.onFix(t: 1301, kmh: 5), .sleep)
        XCTAssertFalse(p.active)
    }

    // A bicycle: the old rule started the guard on one fix at 15 km/h.
    func testBicycleSpeedNeverStartsTheGuard() {
        var p = Fartkollen()
        p.begin(t: 1000)
        for i in 1...300 { XCTAssertEqual(p.onFix(t: 1000 + Double(i), kmh: i % 2 == 0 ? 25 : 39), .waiting) }
    }

    func testFourFastFixesAndASlowOneStartOver() {
        var p = Fartkollen()
        p.begin(t: 1000)
        for i in 0..<4 { XCTAssertEqual(p.onFix(t: 1001 + Double(i), kmh: 60), .waiting) }
        XCTAssertEqual(p.onFix(t: 1005, kmh: 39), .waiting)
        for i in 0..<4 { XCTAssertEqual(p.onFix(t: 1006 + Double(i), kmh: 60), .waiting) }
        XCTAssertEqual(p.onFix(t: 1010, kmh: 60), .startGuard)
    }

    // GPS-kvalitet: a poor fix (no speed of the phone's own, or a position that is not a car's) is given as nil. It neither
    // counts nor breaks the row, and the clock still runs on it.
    func testAPoorFixNeitherCountsNorBreaksTheRow() {
        var p = Fartkollen()
        p.begin(t: 1000)
        for i in 0..<4 { XCTAssertEqual(p.onFix(t: 1001 + Double(i), kmh: 50), .waiting) }
        XCTAssertEqual(p.onFix(t: 1005, kmh: nil), .waiting, "does not count")
        XCTAssertEqual(p.onFix(t: 1006, kmh: 50), .startGuard, "did not break the row")
    }

    func testOnlyPoorFixesGoBackToSleepWhenTheTimeIsUp() {
        var p = Fartkollen()
        p.begin(t: 1000)
        XCTAssertEqual(p.onFix(t: 1300, kmh: nil), .waiting)
        XCTAssertEqual(p.onFix(t: 1301, kmh: nil), .sleep)
    }

    // Kort #359: the driver presses "Starta vakten" while the probe runs. The guard's start() calls end(); a later fix
    // must not answer .sleep, which would turn location off under the running guard.
    func testGuardStartedByHandDuringTheProbeEndsIt() {
        var p = Fartkollen()
        p.begin(t: 1000)
        XCTAssertEqual(p.onFix(t: 1030, kmh: 4), .waiting)
        p.end()
        XCTAssertFalse(p.active)
        XCTAssertEqual(p.onFix(t: 1200, kmh: 4), .waiting, "no .sleep after the guard started")
    }

    // Ej bil: a plane or a fast train must not start the guard, and not a moment later either when it slows to car speed.
    func testFasterThanACarGoesBackToSleep() {
        var p = Fartkollen()
        p.begin(t: 1000)
        XCTAssertEqual(p.onFix(t: 1010, kmh: 165), .sleep)
        XCTAssertFalse(p.active)
        XCTAssertEqual(p.onFix(t: 1020, kmh: 50), .waiting, "the probe is over: car speed afterwards starts nothing")
    }

    func testHigherThanAnyRoadGoesBackToSleep() {
        var p = Fartkollen()
        p.begin(t: 1000)
        XCTAssertEqual(p.onFix(t: 1010, kmh: 80, altitudeM: 1600), .sleep)
        XCTAssertFalse(p.active)
    }

    func testJustInsideTheLimitsStartsTheGuard() {
        var p = Fartkollen()
        p.begin(t: 1000)
        for i in 0..<4 { XCTAssertEqual(p.onFix(t: 1010 + Double(i), kmh: 155, altitudeM: 1400), .waiting) }
        XCTAssertEqual(p.onFix(t: 1014, kmh: 155, altitudeM: 1400), .startGuard)
        var q = Fartkollen()
        q.begin(t: 1000)
        for i in 0..<4 { XCTAssertEqual(q.onFix(t: 1010 + Double(i), kmh: 80), .waiting) }
        XCTAssertEqual(q.onFix(t: 1014, kmh: 80), .startGuard, "no altitude from the phone is not a reason to stay asleep")
    }

    func testNothingWithoutAProbe() {
        var p = Fartkollen()
        XCTAssertEqual(p.onFix(t: 0, kmh: 100), .waiting)
    }
}
