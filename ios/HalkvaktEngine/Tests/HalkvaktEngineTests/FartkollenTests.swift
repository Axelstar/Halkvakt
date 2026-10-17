import XCTest
@testable import HalkvaktEngine

// The auto-wake speed probe (kort #359): car speed starts the guard, 90 s without it goes back to sleep, and a guard started
// by hand during the probe ends it — the probe must never turn location off under a running guard.
final class FartkollenTests: XCTestCase {
    func testCarSpeedStartsTheGuard() {
        var p = Fartkollen()
        p.begin(t: 1000)
        XCTAssertEqual(p.onFix(t: 1010, kmh: 8), .waiting)
        XCTAssertEqual(p.onFix(t: 1020, kmh: 15), .startGuard)
        XCTAssertFalse(p.active)
        XCTAssertEqual(p.onFix(t: 1030, kmh: 50), .waiting, "over once the guard is started")
    }

    func testNinetySecondsWithoutCarSpeedGoesBackToSleep() {
        var p = Fartkollen()
        p.begin(t: 1000)
        XCTAssertEqual(p.onFix(t: 1090, kmh: 5), .waiting, "90 s is still inside the probe")
        XCTAssertEqual(p.onFix(t: 1091, kmh: 5), .sleep)
        XCTAssertFalse(p.active)
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

    func testNothingWithoutAProbe() {
        var p = Fartkollen()
        XCTAssertEqual(p.onFix(t: 0, kmh: 100), .waiting)
    }
}
