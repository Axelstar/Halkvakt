// RESANS RAPPORT (favoriterna steg 3a, DECISIONS #636, #637): ResansRapport mot det delade facit engine/fixtures/rapport.json, som
// TypeScript (test/rapport-app.test.ts) och Kotlin (RapportTest.kt) prövas mot. Indata läses med appens egna läsare. Id, slag, rubrik,
// text och ordning exakt; avstånden och platserna inom en meter (avrundningen av ett tal som slutar på ,5 får skilja).
import XCTest
@testable import HalkvaktEngine

final class RapportTests: XCTestCase {

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
        let url = repoRoot().appendingPathComponent("engine/fixtures/rapport.json")
        return try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as! [String: Any]
    }

    private static func punkter(_ a: Any?) -> [[Double]] {
        (a as! [[Any]]).map { [($0[0] as! NSNumber).doubleValue, ($0[1] as! NSNumber).doubleValue] }
    }

    private struct In { let rutt: [[Double]]; let lage: RapportLage; let kameror: [RapportKamera]; let snabb: Rapportfil
        let linjer: [String: [[[Double]]]] }

    private static func indata(_ f: [String: Any]) -> In {
        let i = f["in"] as! [String: Any]
        return In(rutt: punkter(i["rutt"]), lage: ResansRapport.lasLage(i["live"] as! [String: Any]),
                  kameror: ResansRapport.lasKameror(i["stat"] as! [String: Any]),
                  snabb: ResansRapport.lasRapportfil(i["snabb"] as! [String: Any])!, linjer: ResansRapport.lasLinjer(i["lang"] as! [String: Any]))
    }

    private func jamfor(_ rader: [RapportRad], _ vantat: [[String: Any]], _ namn: String) {
        XCTAssertEqual(rader.map(\.id), vantat.map { $0["id"] as! String }, "\(namn): samma rader i samma ordning")
        for (r, v) in zip(rader, vantat) {
            XCTAssertEqual(r.slag.rawValue, v["slag"] as! String, "\(namn) \(r.id): slaget")
            XCTAssertEqual(r.rubrik, v["rubrik"] as! String, "\(namn) \(r.id): rubriken")
            XCTAssertEqual(r.text, v["text"] as! String, "\(namn) \(r.id): texten")
            XCTAssertLessThanOrEqual(abs(r.avstandM - (v["avstandM"] as! NSNumber).intValue), 1, "\(namn) \(r.id): avståndet")
            XCTAssertLessThanOrEqual(abs(r.langsM - (v["langsM"] as! NSNumber).intValue), 1, "\(namn) \(r.id): platsen")
            XCTAssertEqual(r.vag, v["vag"] as? String, "\(namn) \(r.id): vägen")
            XCTAssertEqual(r.start, v["start"] as? String, "\(namn) \(r.id): starten")
        }
    }

    func testTroskalarnaArDeIFacit() throws {
        let m = try Self.facit()["marginaler"] as! [String: NSNumber]
        XCTAssertEqual(m.count, RapportSlag.allCases.count)
        for (k, v) in m { XCTAssertEqual(ResansRapport.marginaler[RapportSlag(rawValue: k)!], v.doubleValue, k) }
        let l = try Self.facit()["langs"] as! [String: NSNumber]
        XCTAssertEqual(l["andel"]!.doubleValue, ResansRapport.langsAndel)
        XCTAssertEqual(l["minstM"]!.doubleValue, ResansRapport.langsMinstM)
        XCTAssertEqual(l["stegM"]!.doubleValue, ResansRapport.langsStegM)
        XCTAssertEqual((try Self.facit()["gruppFran"] as! NSNumber).intValue, ResansRapport.gruppFran)
    }

    func testNamnenArDeIFacit() throws {
        let n = try Self.facit()["rubrik"] as! [String: String]
        XCTAssertEqual(n.count, RapportSlag.allCases.count)
        for (k, v) in n { XCTAssertEqual(ResansRapport.namn[RapportSlag(rawValue: k)!], v, k) }
    }

    func testDitOchHemSomTypeScript() throws {
        let f = try Self.facit(), i = Self.indata(f)
        for (hem, nyckel) in [(false, "dit"), (true, "hem")] {
            let d = f[nyckel] as! [String: Any]
            let rader = ResansRapport.resansRapport(i.rutt, hem: hem, lage: i.lage, kameror: i.kameror, snabb: i.snabb, linjer: i.linjer)
            jamfor(rader, d["rader"] as! [[String: Any]], nyckel)
            let grupper = ResansRapport.grupperade(rader), vg = d["grupper"] as! [[String: Any]]
            XCTAssertEqual(grupper.map(\.id), vg.map { $0["id"] as! String }, "\(nyckel): grupperna")
            for (g, v) in zip(grupper, vg) {
                XCTAssertEqual(g.rubrik, v["rubrik"] as! String, "\(nyckel) \(g.id): rubriken")
                XCTAssertEqual(g.text, v["text"] as! String, "\(nyckel) \(g.id): texten")
                XCTAssertEqual(g.antal, (v["antal"] as! NSNumber).intValue)
                XCTAssertEqual(g.ids, v["ids"] as! [String], "\(nyckel) \(g.id): raderna i gruppen")
            }
            let t = ResansRapport.tomma(rader), vt = d["tomma"] as! [String: Any]
            XCTAssertEqual(t.inget.map(\.rawValue), vt["inget"] as! [String], "\(nyckel): det tomma")
            XCTAssertEqual(t.koerMatsInte, vt["koerMatsInte"] as! Bool)
        }
    }

    func testRiktningenSomTypeScript() throws {
        let f = try Self.facit(), i = Self.indata(f)
        let fall = f["riktning"] as! [[String: Any]]
        XCTAssertEqual(fall.count, 4)
        for c in fall {
            let delar = (c["delar"] as! [Any]).map { Self.punkter($0) }
            XCTAssertEqual(ResansRapport.riktning(delar, i.rutt, marginalM: 100), (c["svar"] as! NSNumber).intValue, c["namn"] as! String)
        }
    }

    func testNyttSedanSomTypeScript() throws {
        let f = try Self.facit(), i = Self.indata(f)
        let dit = ResansRapport.resansRapport(i.rutt, hem: false, lage: i.lage, kameror: i.kameror, snabb: i.snabb, linjer: i.linjer)
        let n = f["nytt"] as! [String: Any], foreIds = n["fore"] as! [String]
        XCTAssertEqual(ResansRapport.nyttSedan(dit.filter { foreIds.contains($0.id) }, dit), n["ut"] as! [String])
        XCTAssertEqual(ResansRapport.nyttSedan(nil, dit), [])
    }

    func testFlikenOchSkarmenSomTypeScript() throws {
        let f = try Self.facit(), i = Self.indata(f), a = f["app"] as! [String: Any]
        let dit = ResansRapport.resansRapport(i.rutt, hem: false, lage: i.lage, kameror: i.kameror, snabb: i.snabb, linjer: i.linjer)
        let hem = ResansRapport.resansRapport(i.rutt, hem: true, lage: i.lage, kameror: i.kameror, snabb: i.snabb, linjer: i.linjer)
        let ur = { (rader: [RapportRad], ids: Any?) in rader.filter { (ids as! [String]).contains($0.id) } }
        for l in a["lagen"] as! [[String: Any]] {
            let namn = l["namn"] as! String, svar = l["svar"] as! [String: Any]
            switch ResansRapport.radlage(ur(dit, l["dit"]), ur(hem, l["hem"]), sett: l["sett"] as? [String]) {
            case .nytt(let antal, let viktigast):
                XCTAssertEqual(svar["lage"] as? String, "nytt", namn)
                XCTAssertEqual(antal, (svar["antal"] as! NSNumber).intValue, namn)
                XCTAssertEqual(viktigast.id, svar["id"] as? String, namn)
            case .ingetNytt(let storst):
                XCTAssertEqual(svar["lage"] as? String, "ingetNytt", namn)
                XCTAssertEqual(storst.id, svar["id"] as? String, namn)
            case .lugnt:
                XCTAssertEqual(svar["lage"] as? String, "lugnt", namn)
            }
        }
        for n in a["nytt"] as! [[String: Any]] {
            XCTAssertEqual(ResansRapport.nyttSedanKollen(dit, sett: n["sett"] as? [String]).map(\.id), n["svar"] as! [String], n["namn"] as! String)
        }
        XCTAssertEqual(ResansRapport.kollensIds(dit, hem), a["kollen"] as! [String])
        for t in a["titlar"] as! [[String: Any]] {
            XCTAssertEqual(ResansRapport.titel(t["rubrik"] as! String, vag: t["vag"] as? String), t["svar"] as! String)
        }
        for g in a["grind"] as! [[String: Any]] {
            XCTAssertEqual(ResansRapport.aldersgrind(dit, gammaltVaglag: g["vaglag"] as! Bool, gamlaOlyckor: g["olyckor"] as! Bool).map(\.id),
                           g["svar"] as! [String])
        }
        for t in a["tomt"] as! [[String: Any]] {
            let rader = ur((t["hem"] as! Bool) ? hem : dit, t["rader"])
            XCTAssertEqual(ResansRapport.tomtRad(rader, gammaltVaglag: t["vaglag"] as! Bool, gamlaOlyckor: t["olyckor"] as! Bool),
                           t["svar"] as? String, t["namn"] as! String)
        }
    }
}
