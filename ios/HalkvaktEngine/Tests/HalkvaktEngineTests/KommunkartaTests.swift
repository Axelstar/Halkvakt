// The municipality lookup (DECISIONS #917): inside an area, in a hole, in a sliver near a centre, and far away.
import XCTest
@testable import HalkvaktEngine

final class KommunkartaTests: XCTestCase {
    private func ruta(_ x0: Double, _ y0: Double, _ x1: Double, _ y1: Double) -> [[Double]] {
        [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]
    }

    private var karta: Kommunkarta {
        Kommunkarta([
            // A square with a square hole, and the hole is its own municipality.
            Kommun(k: "1280", n: "Yttre", c: [13.5, 55.5], p: [ruta(13, 55, 14, 56), ruta(13.4, 55.4, 13.6, 55.6)]),
            Kommun(k: "1281", n: "Inre", c: [13.5, 55.5], p: [ruta(13.4, 55.4, 13.6, 55.6)]),
            Kommun(k: "2584", n: "Norr", c: [20, 67.5], p: [ruta(19, 67, 21, 68)]),
        ])
    }

    func testAPositionInsideAnAreaGetsThatMunicipality() {
        XCTAssertEqual(karta.kommun(lon: 13.1, lat: 55.1)?.k, "1280")
        XCTAssertEqual(karta.kommun(lon: 20.5, lat: 67.2)?.k, "2584")
    }

    func testAHoleBelongsToTheMunicipalityThatFillsIt() {
        XCTAssertEqual(karta.kommun(lon: 13.5, lat: 55.5)?.k, "1281")
    }

    func testASliverJustOutsideFallsBackToTheNearestCentreWithinTheReserve() {
        // 0.05 degrees of latitude north of the northern square: about 5.5 km outside, 61 km from the centre.
        XCTAssertNil(karta.kommun(lon: 20, lat: 68.05))
        // Just outside a small area whose centre is close.
        let liten = Kommunkarta([Kommun(k: "0180", n: "Liten", c: [18.05, 59.33], p: [ruta(18, 59.3, 18.1, 59.36)])])
        XCTAssertEqual(liten.kommun(lon: 18.11, lat: 59.33)?.k, "0180")
    }

    func testFarAwayHasNoMunicipality() {
        XCTAssertNil(karta.kommun(lon: 12.57, lat: 55.68 - 3))
        XCTAssertNil(karta.kommun(lon: 0, lat: 0))
    }

    func testTheFileFormatDecodes() throws {
        let json = #"{"kommuner":[{"k":"1280","n":"Malmö","c":[13.0,55.6],"p":[[[12.9,55.5],[13.1,55.5],[13.1,55.7],[12.9,55.7],[12.9,55.5]]]}]}"#
        let k = try Kommunkarta(data: Data(json.utf8))
        XCTAssertEqual(k.kommun(lon: 13.0, lat: 55.6)?.n, "Malmö")
    }
}
