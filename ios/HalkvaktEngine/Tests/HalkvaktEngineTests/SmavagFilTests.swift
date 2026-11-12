// SMÅVÄGSPROVET (DECISIONS #828 byggsteg 7, #844) — the Swift side. engine/fixtures/smavagprov.json holds the point file and the
// besked for each case and the hazards every reader must give: TS (test/smavagfil.test.ts), Kotlin (SmavagFilTest.kt) and this.
import Foundation
import Testing
@testable import HalkvaktEngine

struct SmavagFilTests {

    private static func repoRoot() -> URL {
        var d = URL(fileURLWithPath: #filePath)
        while !FileManager.default.fileExists(atPath: d.appendingPathComponent("engine/fixtures").path) {
            let parent = d.deletingLastPathComponent()
            precondition(parent.path != d.path, "engine/fixtures not found above \(#filePath)")
            d = parent
        }
        return d
    }

    @Test func everyCaseGivesTheExpectedHazards() throws {
        let data = try Data(contentsOf: Self.repoRoot().appendingPathComponent("engine/fixtures/smavagprov.json"))
        let prov = try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
        let fall = try #require(prov["fall"] as? [[String: Any]])
        #expect(fall.count >= 10, "the fixture has its cases")
        for f in fall {
            let namn = f["namn"] as? String ?? "?"
            let fil = (f["fil"] as? [String: Any]).flatMap { SmavagFil.parse($0) }
            let got = fil?.hazards(besked: f["besked"] as? [String: Any], filSha: f["filSha"] as? String) ?? []
            let vantat = f["vantat"] as? [[String: Any]] ?? []
            #expect(got.count == vantat.count, "\(namn): count \(got.count)")
            for (v, h) in zip(vantat, got) {
                guard case let .smavag(id, points, warn) = h else { Issue.record("\(namn): not a smavag hazard"); continue }
                #expect(id == v["id"] as? String, "\(namn): id \(id)")
                let pts = (v["points"] as? [[Any]] ?? []).map { $0.compactMap { ($0 as? NSNumber)?.doubleValue } }
                #expect(points == pts, "\(namn) \(id): points")
                let w = (v["warn"] as? [Any] ?? []).compactMap { ($0 as? NSNumber)?.intValue }
                #expect(warn == w, "\(namn) \(id): warn \(warn)")
            }
        }
    }
}
