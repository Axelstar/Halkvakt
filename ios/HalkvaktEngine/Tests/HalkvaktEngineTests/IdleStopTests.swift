// Self-stop on displacement (kort #262 Å3, DECISIONS #461). Kotlin twin: AutostartControllerTest.kt — keep the cases identical.
import XCTest
@testable import HalkvaktEngine

final class IdleStopTests: XCTestCase {
    /// One fix per `step` seconds moving north at `kmh`; returns the last verdict and the latitude reached.
    private func drive(_ s: inout IdleStop, _ from: Int, _ to: Int, kmh: Double, step: Int = 1, lat0: Double = 55.6) -> (Bool, Double) {
        var stopped = false, lat = lat0
        for sec in stride(from: from, through: to, by: step) {
            stopped = s.onFix(t: TimeInterval(sec), lon: 13.0, lat: lat)
            lat += kmh / 3.6 * Double(step) / 111_195.0
        }
        return (stopped, lat)
    }

    func testStopsFifteenMinutesAfterTheCarParks() {
        var s = IdleStop()
        let (_, lat) = drive(&s, 0, 600, kmh: 50)
        XCTAssertFalse(drive(&s, 601, 600 + 14 * 60, kmh: 0, lat0: lat).0)
        XCTAssertTrue(drive(&s, 600 + 14 * 60 + 1, 600 + 15 * 60 + 60, kmh: 0, lat0: lat).0)
    }

    func testWalkingAfterTheDriveDoesNotKeepTheGuardAlive() {   // the 11 h 39 m bug
        var s = IdleStop()
        var (_, lat) = drive(&s, 0, 300, kmh: 50)
        var stoppedAt = -1
        for sec in 301...(301 + 30 * 60) {
            if s.onFix(t: TimeInterval(sec), lon: 13.0, lat: lat) { stoppedAt = sec; break }
            lat += 5.5 / 3.6 / 111_195.0
        }
        XCTAssert((300 + 15 * 60)...(300 + 16 * 60 + 1) ~= stoppedAt, "stopped at \(stoppedAt)")
    }

    func testOneGpsJumpWhileParkedDoesNotRestartTheClockForever() {
        var s = IdleStop()
        _ = drive(&s, 0, 120, kmh: 50)
        var stopped = false
        for sec in 121...(121 + 30 * 60) {
            stopped = s.onFix(t: TimeInterval(sec), lon: 13.0, lat: 55.62 + (sec == 600 ? 0.0036 : 0))
            if stopped { break }
        }
        XCTAssertTrue(stopped)
    }

    func testASlowQueueAboveTwelveKmhKeepsTheGuard() {
        var s = IdleStop()
        XCTAssertFalse(drive(&s, 0, 40 * 60, kmh: 13).0)
    }

    func testATunnelGapCountsAsDriving() {
        var s = IdleStop()
        _ = drive(&s, 0, 60, kmh: 80)
        XCTAssertFalse(s.onFix(t: 61, lon: 13.0, lat: 55.6))
        XCTAssertFalse(s.onFix(t: 61 + 14 * 60, lon: 13.0, lat: 55.7))
        XCTAssertFalse(s.onFix(t: 61 + 20 * 60, lon: 13.0, lat: 55.7))
    }
}
