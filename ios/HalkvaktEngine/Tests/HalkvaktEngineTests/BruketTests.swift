// App usage counts (DECISIONS #746): what is counted, what is sent, and that nothing outside the list gets through.
import XCTest
@testable import HalkvaktEngine

final class BruketTests: XCTestCase {
    func testCountsKnownNamesAndIgnoresEverythingElse() {
        var d: Bruket.Dagar = [:]
        d = Bruket.rakna(d, "vakt_hand", dag: "2026-11-02")
        d = Bruket.rakna(d, "vakt_hand", dag: "2026-11-02")
        d = Bruket.rakna(d, "position", dag: "2026-11-02")
        d = Bruket.rakna(d, "wx:2135", dag: "2026-11-02")
        XCTAssertEqual(d, ["2026-11-02": ["vakt_hand": 2]])
    }

    func testEveryHazardKindHasACounter() {
        for kind in HazardKind.allCases {
            XCTAssertTrue(Bruket.namn.contains(Bruket.namn(kind)), "\(kind)")
        }
    }

    func testStateIsOneNotASum() {
        var d: Bruket.Dagar = [:]
        for _ in 0..<5 { d = Bruket.satt(d, "lage_alltid", dag: "2026-11-02") }
        XCTAssertEqual(d["2026-11-02"]?["lage_alltid"], 1)
    }

    func testCapPerDay() {
        var d: Bruket.Dagar = [:]
        for _ in 0..<(Bruket.tak + 50) { d = Bruket.rakna(d, "oppnad", dag: "2026-11-02") }
        XCTAssertEqual(d["2026-11-02"]?["oppnad"], Bruket.tak)
    }

    func testTodayIsNeverSent() {
        var d: Bruket.Dagar = [:]
        d = Bruket.rakna(d, "oppnad", dag: "2026-11-01")
        d = Bruket.rakna(d, "oppnad", dag: "2026-10-31")
        d = Bruket.rakna(d, "oppnad", dag: "2026-11-02")
        XCTAssertEqual(Bruket.attSkicka(d, idag: "2026-11-02"), ["2026-10-31", "2026-11-01"])
        XCTAssertEqual(Bruket.attSkicka(Bruket.utan(d, "2026-10-31"), idag: "2026-11-02"), ["2026-11-01"])
    }

    func testOfflinePhoneKeepsOnlyTheLatestDays() {
        var d: Bruket.Dagar = [:]
        for i in 1...(Bruket.maxDagar + 6) { d = Bruket.rakna(d, "oppnad", dag: String(format: "2026-11-%02d", i)) }
        XCTAssertEqual(d.count, Bruket.maxDagar)
        XCTAssertNil(d["2026-11-01"])
        XCTAssertNotNil(d[String(format: "2026-11-%02d", Bruket.maxDagar + 6)])
    }

    /// The body is the whole promise: four keys, and the counters only from the list.
    func testBodyCarriesOnlyDayChannelVersionAndCounters() throws {
        let data = Bruket.body(dag: "2026-11-01", raknare: ["oppnad": 3, "varning_halka": 2, "lat": 59], kanal: "appstore", ver: "0.4.0")
        let o = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertEqual(Set(o.keys), ["dag", "kanal", "ver", "r"])
        XCTAssertEqual(o["r"] as? [String: Int], ["oppnad": 3, "varning_halka": 2])
        XCTAssertEqual(String(data: data, encoding: .utf8),
                       #"{"dag":"2026-11-01","kanal":"appstore","r":{"oppnad":3,"varning_halka":2},"ver":"0.4.0"}"#)
    }
}
