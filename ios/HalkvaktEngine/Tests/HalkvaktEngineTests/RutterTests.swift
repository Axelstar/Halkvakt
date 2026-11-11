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

    func testIgenkanningenSomTypeScript() throws {
        let s = try Self.facit()["samma"] as! [String: Any]
        XCTAssertEqual((s["m"] as! NSNumber).doubleValue, Rutter.sammaM)
        XCTAssertEqual((s["andel"] as! NSNumber).doubleValue, Rutter.sammaAndel)
        let pkt = { (a: Any?) in (a as! [[Any]]).map { [($0[0] as! NSNumber).doubleValue, ($0[1] as! NSNumber).doubleValue] } }
        let a = pkt(s["a"])
        let fall = s["fall"] as! [[String: Any]]
        XCTAssertEqual(fall.count, 5, "facit bär sina fall")
        for f in fall {
            XCTAssertEqual(Rutter.sammaResa(a, pkt(f["b"])), f["svar"] as! Bool, f["namn"] as! String)
            XCTAssertEqual(Rutter.sammaResa(pkt(f["b"]), a), f["svar"] as! Bool, "\(f["namn"] as! String), åt andra hållet")
        }
    }

    func testDagensResorSomTypeScript() throws {
        let d = try Self.facit()["dagens"] as! [String: Any]
        XCTAssertEqual((d["max"] as! NSNumber).intValue, Vantande.vantandeMax)
        XCTAssertEqual((d["kvarS"] as! NSNumber).doubleValue, Vantande.vantandeKvarS)
        let pkt = { (a: Any?) in (a as! [[Any]]).map { [($0[0] as! NSNumber).doubleValue, ($0[1] as! NSNumber).doubleValue] } }
        var l: [Vantande] = []
        let fall = d["fall"] as! [[String: Any]]
        XCTAssertEqual(fall.count, 7, "facit bär sina fall")
        for f in fall {
            let n = f["ny"] as! [String: Any]
            let ny = Vantande(id: n["id"] as! String, slutS: (n["slutS"] as! NSNumber).doubleValue, km: (n["km"] as! NSNumber).doubleValue,
                              punkter: pkt(n["punkter"]), dithem: n["dithem"] as! Bool)
            l = Vantande.dagensResor(l, ny, nuS: (f["nuS"] as! NSNumber).doubleValue)
            let efter = f["efter"] as! [[String: Any]]
            XCTAssertEqual(l.map(\.id), efter.map { $0["id"] as! String }, f["namn"] as! String)
            XCTAssertEqual(l.map(\.slutS), efter.map { ($0["slutS"] as! NSNumber).doubleValue }, f["namn"] as! String)
            XCTAssertEqual(l.map(\.km), efter.map { ($0["km"] as! NSNumber).doubleValue }, f["namn"] as! String)
            XCTAssertEqual(l.map(\.dithem), efter.map { $0["dithem"] as! Bool }, f["namn"] as! String)
            XCTAssertEqual(l.map(\.punkter.count), efter.map { ($0["punkter"] as! NSNumber).intValue }, f["namn"] as! String)
        }
    }

    func testFilenTurOchRetur() throws {
        let r = Rutter(rutter: [Self.rutt("r1")])
        XCTAssertEqual(try JSONDecoder().decode(Rutter.self, from: JSONEncoder().encode(r)), r)
    }
}
