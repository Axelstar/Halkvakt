import XCTest
@testable import HalkvaktEngine

// On a runway (DECISIONS #988): within 300 m of a runway's centre line the phone is not on a road.
final class FlygbanorTests: XCTestCase {
    // Arlanda 01L/19R, from data/flygplatser/flygbanor.json.
    private let arlanda = Flygbanor([[17.9132, 59.6373, 17.9238, 59.6664]])

    func testTheMiddleOfTheRunwayIsOnIt() {
        XCTAssertTrue(arlanda.pa(lon: 17.9185, lat: 59.65185))
    }

    func testAParallelTaxiwayTwoHundredMetresAsideIsOnIt() {
        // 200 m east of the middle: 200 / (111 320 · cos 59.65°) degrees of longitude.
        XCTAssertTrue(arlanda.pa(lon: 17.9185 + 200 / (111_320 * cos(59.65 * .pi / 180)), lat: 59.65185))
    }

    func testFiveHundredMetresAsideIsNot() {
        XCTAssertFalse(arlanda.pa(lon: 17.9185 + 500 / (111_320 * cos(59.65 * .pi / 180)), lat: 59.65185))
    }

    func testBeyondTheEndOfTheRunwayIsNot() {
        // 500 m south of the southern threshold, on the extended centre line: the approach, over roads.
        XCTAssertFalse(arlanda.pa(lon: 17.9132, lat: 59.6373 - 500 / 111_320))
    }

    func testTheE4WestOfArlandaIsNot() {
        XCTAssertFalse(arlanda.pa(lon: 17.86, lat: 59.65))
    }

    func testTheBundledTableReads() throws {
        let fil = #"{"kalla":"x","urval":"y","banor":[{"flygplats":"ESSA","bana":"01L/19R","linje":[17.9132,59.6373,17.9238,59.6664]}]}"#
        let b = try Flygbanor(data: Data(fil.utf8))
        XCTAssertEqual(b.linjer.count, 1)
        XCTAssertTrue(b.pa(lon: 17.9185, lat: 59.65185))
    }
}
