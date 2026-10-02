// The warning card's content for cards A–L of the design handoff v2 (DECISIONS #443).
// Kotlin twin: android/engine/src/test/.../WarningCardTest.kt — keep the cases identical.
import XCTest
@testable import HalkvaktEngine

final class WarningCardTests: XCTestCase {
    private func alert(_ kind: HazardKind, _ d: Int, _ text: String, _ step: AccidentStep? = nil) -> Alert {
        Alert(t: 0, hazardId: "h", kind: kind, distanceM: d, text: text, step: step)
    }

    func testAccidentPlainWithRoad() {   // A
        let c = WarningCard.make(alert(.accident, 3120, "Olycka rapporterad på E18 3 kilometer framför dig."), meta: PointMeta(road: "E18"))
        XCTAssertEqual(c.title, "Olycka"); XCTAssertNil(c.stage)
        XCTAssertEqual(c.distance, .number("3", unit: "KM")); XCTAssertEqual(c.road, "E18"); XCTAssertNil(c.advice)
    }

    func testAccidentBareRoadNumberAndNoRoad() {   // I, J
        XCTAssertEqual(WarningCard.make(alert(.accident, 4000, "x"), meta: PointMeta(road: "25")).road, "VÄG 25")
        XCTAssertNil(WarningCard.make(alert(.accident, 3000, "x"), meta: PointMeta(road: nil)).road)
        XCTAssertNil(WarningCard.make(alert(.accident, 3000, "x"), meta: PointMeta(road: "  ")).road)
    }

    func testAccidentUnderOneKmSaysOneKm() {   // the voice says "1 kilometer" (max 1)
        XCTAssertEqual(WarningCard.make(alert(.accident, 420, "x"), meta: nil).distance, .number("1", unit: "KM"))
    }

    func testSeriousEarlyWithClearanceTime() {   // F
        let c = WarningCard.make(alert(.accident, 8200, "x", .early), meta: PointMeta(endTimeLocal: "19:30", road: "E18"))
        XCTAssertEqual(c.stage, "ALLVARLIG · TIDIGT"); XCTAssertEqual(c.title, "Allvarlig olycka")
        XCTAssertEqual(c.distance, .number("8", unit: "KM")); XCTAssertEqual(c.road, "E18")
        XCTAssertEqual(c.advice, "Överväg annan väg"); XCTAssertEqual(c.adviceSub, "STOR PÅVERKAN · RÖJD CA 19:30")
        XCTAssertEqual(WarningCard.make(alert(.accident, 8200, "x", .early), meta: PointMeta(road: "E18")).adviceSub, "STOR PÅVERKAN")
    }

    func testSeriousReminder() {   // G
        let c = WarningCard.make(alert(.accident, 1500, "Sakta ner — olycksplats strax framför dig.", .reminder), meta: PointMeta(road: "E18"))
        XCTAssertEqual(c.stage, "PÅMINNELSE"); XCTAssertEqual(c.title, "Sakta ner"); XCTAssertEqual(c.sub, "Olycksplats strax framför dig")
        XCTAssertEqual(c.distance, .words("STRAX FRAMFÖR")); XCTAssertNil(c.road); XCTAssertNil(c.advice)
    }

    func testSeriousLate() {   // H
        let c = WarningCard.make(alert(.accident, 1900, "x", .late), meta: PointMeta(road: "E18"))
        XCTAssertEqual(c.stage, "ALLVARLIG · SENT"); XCTAssertEqual(c.distance, .number("2", unit: "KM"))
        XCTAssertEqual(c.advice, "Sakta ner"); XCTAssertEqual(c.adviceSub, "STOR PÅVERKAN")
    }

    func testWordsInsteadOfNumbers() {   // B, C, D
        let b = WarningCard.make(alert(.slippery_segment, 900, "Varning: halka rapporterad på vägen framför dig."), meta: nil)
        XCTAssertEqual(b.title, "Halka"); XCTAssertEqual(b.distance, .words("FRAMFÖR DIG")); XCTAssertEqual(b.icon, .halka)
        let c = WarningCard.make(alert(.icing_point, 700, "x"), meta: PointMeta())
        XCTAssertEqual(c.icon, .frys); XCTAssertEqual(c.sub, "Vägbanan nära noll grader"); XCTAssertEqual(c.distance, .words("FRAMÖVER"))
        let d = WarningCard.make(alert(.wildlife, 650, "Viltrisk framöver."), meta: nil)
        XCTAssertEqual(d.title, "Vilt"); XCTAssertEqual(d.distance, .words("FRAMÖVER"))
    }

    func testBridgeInHundredsOfMetresLikeTheVoice() {   // K
        let k = WarningCard.make(alert(.icing_point, 640, "Frysrisk framöver — bro om 600 meter."), meta: PointMeta(bridge: true))
        XCTAssertEqual(k.icon, .bro); XCTAssertEqual(k.sub, "Bro"); XCTAssertEqual(k.distance, .number("600", unit: "M"))
        XCTAssertEqual(WarningCard.make(alert(.icing_point, 1240, "x"), meta: PointMeta(bridge: true)).distance, .number("1200", unit: "M"))
        XCTAssertEqual(WarningCard.make(alert(.icing_point, 30, "x"), meta: PointMeta(bridge: true)).distance, .number("100", unit: "M"))
    }

    func testCameraAlwaysFiveHundredAndLimitOnlyWhenKnown() {   // E, L
        let e = WarningCard.make(alert(.camera, 472, "Fartkamera om 500 meter. Gränsen är 80."), meta: PointMeta(speedLimitKmh: 80))
        XCTAssertEqual(e.distance, .number("500", unit: "M")); XCTAssertEqual(e.limit, 80)
        XCTAssertNil(WarningCard.make(alert(.camera, 472, "Fartkamera om 500 meter."), meta: PointMeta()).limit)
    }

    func testQuoteIsTheVoiceLineVerbatim() {
        let text = "Allvarlig olycka på E18 2 kilometer framför dig — stor påverkan. Sakta ner."
        XCTAssertEqual(WarningCard.make(alert(.accident, 2000, text, .late), meta: nil).quote, text)
    }
}
