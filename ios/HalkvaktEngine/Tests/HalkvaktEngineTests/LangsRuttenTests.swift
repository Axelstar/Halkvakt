// URVALET LÄNGS RUTTEN (DECISIONS #528): RouteFilter.alongRoute mot det delade facit engine/fixtures/langsrutten.json, som
// TypeScript (test/langsrutten.test.ts) och Kotlin (LangsRuttenTest.kt) prövas mot. Samma id i samma ordning, talen inom 0,01 m.
import XCTest
@testable import HalkvaktEngine

final class LangsRuttenTests: XCTestCase {

    private static func repoRoot() -> URL {
        var d = URL(fileURLWithPath: #filePath)
        while !FileManager.default.fileExists(atPath: d.appendingPathComponent("engine/fixtures").path) {
            let parent = d.deletingLastPathComponent()
            precondition(parent.path != d.path, "engine/fixtures not found above \(#filePath)")
            d = parent
        }
        return d
    }

    private static func punkter(_ a: Any?) -> [[Double]] {
        (a as! [[Any]]).map { [($0[0] as! NSNumber).doubleValue, ($0[1] as! NSNumber).doubleValue] }
    }

    private static func fara(_ o: [String: Any]) -> Hazard {
        let id = "\(o["id"]!)", kind = o["kind"] as! String
        if kind == "slippery_segment" { return .segment(id: id, line: punkter(o["line"]), meta: SegmentMeta()) }
        return .point(id: id, kind: HazardKind(rawValue: kind)!, lon: (o["lon"] as! NSNumber).doubleValue,
                      lat: (o["lat"] as! NSNumber).doubleValue, bearing: nil, meta: PointMeta())
    }

    func testAllaFallenSomTypeScript() throws {
        let url = Self.repoRoot().appendingPathComponent("engine/fixtures/langsrutten.json")
        let doc = try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as! [String: Any]
        let fall = doc["fall"] as! [[String: Any]]
        XCTAssertGreaterThanOrEqual(fall.count, 3, "facit bär sina fall")
        for f in fall {
            let namn = f["namn"] as! String
            let faror = (f["faror"] as! [[String: Any]]).map(Self.fara)
            let vantat = f["vantat"] as! [[String: Any]]
            let r = RouteFilter.alongRoute(faror, Self.punkter(f["linje"]), marginM: (f["marginalM"] as! NSNumber).doubleValue)
            XCTAssertEqual(r.map { $0.hazard.id }, vantat.map { "\($0["id"]!)" }, "\(namn): samma faror i samma ordning")
            for (i, x) in r.enumerated() where i < vantat.count {
                XCTAssertEqual(x.distanceM, (vantat[i]["avstandM"] as! NSNumber).doubleValue, accuracy: 0.01, "\(namn) \(x.hazard.id): avståndet")
                XCTAssertEqual(x.alongM, (vantat[i]["langsM"] as! NSNumber).doubleValue, accuracy: 0.01, "\(namn) \(x.hazard.id): platsen")
            }
        }
    }
}
