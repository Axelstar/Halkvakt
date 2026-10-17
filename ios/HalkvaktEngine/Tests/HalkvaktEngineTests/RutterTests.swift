// DE SPARADE RUTTERNA (DECISIONS #616, #625): Ruttinsamlare och Rutter mot det delade facit engine/fixtures/rutter.json, som
// TypeScript (test/rutter.test.ts) och Kotlin (RutterTest.kt) prövas mot. Samma punkter, exakt.
import XCTest
@testable import HalkvaktEngine

final class RutterTests: XCTestCase {

    private static func repoRoot() -> URL {
        var d = URL(fileURLWithPath: #filePath)
        while !FileManager.default.fileExists(atPath: d.appendingPathComponent("engine/fixtures").path) {
            let parent = d.deletingLastPathComponent()
            precondition(parent.path != d.path, "engine/fixtures not found above \(#filePath)")
            d = parent
        }
        return d
    }

    private static func facit() throws -> [String: Any] {
        let url = repoRoot().appendingPathComponent("engine/fixtures/rutter.json")
        return try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as! [String: Any]
    }

    private static func rutt(_ id: String) -> SparadRutt {
        SparadRutt(id: id, namn: id, sparad: "2026-10-17T18:00:00Z", punkter: [[15, 59]])
    }

    func testTalenArDeIFacit() throws {
        let f = try Self.facit()
        XCTAssertEqual((f["ruttStegM"] as! NSNumber).doubleValue, Rutter.stegM)
        XCTAssertEqual((f["maxRutter"] as! NSNumber).intValue, Rutter.max)
    }

    func testInsamlarenSomTypeScript() throws {
        let fall = try Self.facit()["fall"] as! [[String: Any]]
        XCTAssertGreaterThanOrEqual(fall.count, 5, "facit bär sina fall")
        for f in fall {
            let fixar = (f["fixar"] as! [[Any]]).map { [($0[0] as! NSNumber).doubleValue, ($0[1] as! NSNumber).doubleValue] }
            var r = Ruttinsamlare()
            for p in fixar { r.add(lon: p[0], lat: p[1]) }
            XCTAssertEqual(r.route(), (f["sparas"] as! [NSNumber]).map { fixar[$0.intValue] }, f["namn"] as! String)
        }
    }

    func testListanSomTypeScript() throws {
        let l = try Self.facit()["lista"] as! [String: Any]
        var full = Rutter()
        for i in 1...Rutter.max { full = full.laggTill(Self.rutt("r\(i)"))! }
        XCTAssertEqual(full.rutter.count, (l["fullAntal"] as! NSNumber).intValue)
        XCTAssertEqual(l["sjatteSvar"] as! String, "null")
        XCTAssertNil(full.laggTill(Self.rutt("r6")), "den sjätte nekas, inget trängs ut tyst")
        XCTAssertEqual(full.taBort(id: "r3").rutter.map(\.id), l["efterTaBortR3"] as! [String])
        XCTAssertEqual(full.taBort(id: "okand").rutter.map(\.id), l["efterTaBortOkand"] as! [String])
    }

    func testNamnforslagenSomTypeScript() throws {
        let n = try Self.facit()["namnforslag"] as! [String: Any]
        XCTAssertEqual(Rutter.namnforslag(dag: (n["dag"] as! NSNumber).intValue, manad: (n["manad"] as! NSNumber).intValue),
                       n["svar"] as! [String])
    }

    func testFilenTurOchRetur() throws {
        let r = Rutter(rutter: [Self.rutt("r1")])
        XCTAssertEqual(try JSONDecoder().decode(Rutter.self, from: JSONEncoder().encode(r)), r)
    }
}
