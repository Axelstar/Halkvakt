import XCTest
@testable import HalkvaktEngine

// Not a car, remembered (DECISIONS #987): Axel's flight 27/11. The engine alone is silent on a fix above 160 km/h or 1 500 m;
// these tests are about the fixes in between, which look like a car.
final class EjbilTests: XCTestCase {
    /// Metres north of a point near Arlanda, as a latitude.
    private func lat(_ m: Double) -> Double { 59.65 + m / 111_320 }

    /// Drives `s` seconds at `kmh` from `t0`, one fix a second, and returns what the rule said on the last fix.
    @discardableResult
    private func kor(_ e: inout Ejbil, t0: Double, s: Int, kmh: Double, franM: Double = 0) -> Bool {
        var tyst = false
        for i in 0..<s {
            tyst = e.onFix(t: t0 + Double(i), lon: 17.92, lat: lat(franM + kmh / 3.6 * Double(i)), kmh: kmh)
        }
        return tyst
    }

    func testACarIsNeverSilenced() {
        var e = Ejbil()
        for i in 0..<600 {
            XCTAssertFalse(e.onFix(t: Double(i), lon: 17.92, lat: lat(110 / 3.6 * Double(i)), kmh: 110), "second \(i)")
        }
        XCTAssertNil(e.sedan)
    }

    func testOneThrownPositionInACarDoesNotLock() {
        var e = Ejbil()
        kor(&e, t0: 0, s: 60, kmh: 110)
        // One fix thrown 2 km ahead, then the car is back on its road.
        XCTAssertTrue(e.onFix(t: 60, lon: 17.92, lat: lat(110 / 3.6 * 60 + 2000), kmh: 110), "the thrown fix itself is silent")
        XCTAssertFalse(e.onFix(t: 61, lon: 17.92, lat: lat(110 / 3.6 * 61), kmh: 110))
        XCTAssertNil(e.sedan)
    }

    func testOneOddSpeedInACarDoesNotLock() {
        var e = Ejbil()
        kor(&e, t0: 0, s: 60, kmh: 110)
        XCTAssertTrue(e.onFix(t: 60, lon: 17.92, lat: lat(110 / 3.6 * 60), kmh: 240))
        XCTAssertFalse(e.onFix(t: 61, lon: 17.92, lat: lat(110 / 3.6 * 61), kmh: 110))
        XCTAssertNil(e.sedan)
    }

    // The flight: the take-off locks the rule, the cabin loses the GPS, and fifteen minutes later a fix comes that looks like a
    // car — 90 km/h, no altitude. It must be silent.
    func testACarLikeFixInTheCabinIsSilentAfterTheTakeOff() {
        var e = Ejbil()
        kor(&e, t0: 0, s: 20, kmh: 280)
        XCTAssertNotNil(e.sedan, "two fixes above 160 km/h lock the rule")
        XCTAssertTrue(e.onFix(t: 900, lon: 16.5, lat: 58.4, kmh: 90))
        XCTAssertTrue(e.onFix(t: 901, lon: 16.5, lat: 58.4002, kmh: 90))
    }

    // The same without any speed above the limit: the speed field says 90 the whole time, but the positions move like a plane.
    func testPositionsThatMoveLikeAPlaneLockTheRuleWhateverTheSpeedSays() {
        var e = Ejbil()
        var tyst = false
        for i in 0..<60 {
            tyst = e.onFix(t: Double(i), lon: 17.92, lat: lat(800 / 3.6 * Double(i)), kmh: 90)
        }
        XCTAssertTrue(tyst)
        XCTAssertNotNil(e.sedan)
    }

    func testSparseCabinFixesLockTheRuleToo() {
        var e = Ejbil()
        var tyst = false
        // One fix every 40 s, 800 km/h over the ground, no speed and no altitude.
        for i in 0..<4 { tyst = e.onFix(t: Double(i) * 40, lon: 17.92, lat: lat(800 / 3.6 * Double(i) * 40), kmh: nil) }
        XCTAssertTrue(tyst)
        XCTAssertNotNil(e.sedan)
    }

    func testTwoMinutesOfCarFixesOpenTheRuleAgain() {
        var e = Ejbil()
        kor(&e, t0: 0, s: 20, kmh: 280)
        XCTAssertTrue(kor(&e, t0: 4000, s: 120, kmh: 40), "119 s is not enough")
        XCTAssertFalse(e.onFix(t: 4120, lon: 17.92, lat: lat(40 / 3.6 * 120), kmh: 40))
        XCTAssertNil(e.sedan)
    }

    func testAGapStartsTheTwoMinutesOver() {
        var e = Ejbil()
        kor(&e, t0: 0, s: 20, kmh: 280)
        kor(&e, t0: 4000, s: 100, kmh: 40)
        // 30 s without a fix, then 100 s more: the first 100 s do not count.
        XCTAssertTrue(kor(&e, t0: 4130, s: 100, kmh: 40, franM: 1500))
        XCTAssertNotNil(e.sedan)
    }

    func testFixesWithoutTheirOwnSpeedDoNotOpenTheRule() {
        var e = Ejbil()
        kor(&e, t0: 0, s: 20, kmh: 280)
        var tyst = false
        for i in 0..<300 { tyst = e.onFix(t: 4000 + Double(i), lon: 17.92, lat: lat(Double(i) * 10), kmh: nil) }
        XCTAssertTrue(tyst)
    }

    func testTheRuleOpensByItselfAfterTwoHours() {
        var e = Ejbil()
        kor(&e, t0: 0, s: 20, kmh: 280)
        XCTAssertFalse(e.onFix(t: 19 + Ejbil.hallS + 1, lon: 13.0, lat: 55.6, kmh: 50))
        XCTAssertNil(e.sedan)
    }

    func testTheAppRestoresALockedRuleAfterARestart() {
        var e = Ejbil(sedan: 1000)
        XCTAssertTrue(e.onFix(t: 1600, lon: 16.5, lat: 58.4, kmh: 90))
    }
}
