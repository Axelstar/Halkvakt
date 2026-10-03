// LÄSARKONTRAKTET (kort #210, #289; DECISIONS #278, #448) — the Swift side. The shared vectors start where the hazard
// is already parsed, so they can never see a fault in the JSON reading; #210 ("på väg <null>") sat exactly there.
// engine/fixtures/lasarprov.json is the static + live the apps download, with the cases that are easy to read wrong,
// and the parsed outcome every reader must give. TS: test/lasarkontraktet.test.ts; Kotlin: LasarkontraktetTest.kt in
// android/app. A missing field and null are the same outcome; a number or a word never is.
// CI runs this on Linux Foundation; the app runs Apple's — Axel runs it once on the Mac too (kort #289, step 4).
import Foundation
import Testing
@testable import HalkvaktEngine

struct LasarkontraktetTests {

    /// The repository root, found by walking up from this file (as VectorTests does).
    private static func repoRoot() -> URL {
        var d = URL(fileURLWithPath: #filePath)
        while !FileManager.default.fileExists(atPath: d.appendingPathComponent("engine/fixtures").path) {
            let parent = d.deletingLastPathComponent()
            precondition(parent.path != d.path, "engine/fixtures not found above \(#filePath)")
            d = parent
        }
        return d
    }

    private static func kind(_ h: Hazard) -> String {
        switch h {
        case .point(_, let kind, _, _, _, _): return kind.rawValue
        case .segment: return HazardKind.slippery_segment.rawValue
        }
    }

    /// The field as the reader produced it; nil when the reader leaves it out.
    private static func falt(_ h: Hazard, _ nyckel: String) -> Any? {
        switch h {
        case .segment(_, _, let meta):
            if nyckel == "code" { return meta.code }
        case .point(_, _, _, _, let bearing, let meta):
            switch nyckel {
            case "bearing": return bearing
            case "surfaceTempC": return meta.surfaceTempC
            case "bridge": return meta.bridge
            case "severityCode": return meta.severityCode
            case "endTimeLocal": return meta.endTimeLocal
            case "road": return meta.road
            case "speedLimitKmh": return meta.speedLimitKmh
            default: break
            }
        }
        Issue.record("\(h.id): okänt fält \(nyckel) i provfilen")
        return nil
    }

    /// Equal as the fixture means it: NSNull and nil are both "no value", numbers compare by value.
    private static func lika(_ fick: Any?, _ vantat: Any) -> Bool {
        guard let fick else { return vantat is NSNull }
        if vantat is NSNull { return false }
        switch fick {
        case let s as String: return (vantat as? String) == s
        case let b as Bool: return (vantat as? Bool) == b
        case let i as Int: return (vantat as? NSNumber)?.doubleValue == Double(i)
        case let d as Double: return (vantat as? NSNumber)?.doubleValue == d
        default: return false
        }
    }

    @Test func swiftLasarenGerProvfilensUtfallOchNullBlirAldrigEttTalEllerEttOrd() throws {
        let url = Self.repoRoot().appendingPathComponent("engine/fixtures/lasarprov.json")
        let prov = try #require(try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
        let staticDoc = try #require(prov["static"] as? [String: Any])
        let liveDoc = try #require(prov["live"] as? [String: Any])
        let vantat = try #require(prov["vantat"] as? [[String: Any]])
        let faror = SnapshotReader.toHazards(staticDoc: staticDoc, liveDoc: liveDoc)

        #expect(faror.map(\.id) == vantat.map { $0["id"] as? String ?? "" }, "samma id i samma ordning som referensen")
        for v in vantat {
            let id = try #require(v["id"] as? String)
            let h = try #require(faror.first { $0.id == id }, "\(id) saknas")
            #expect(Self.kind(h) == v["kind"] as? String, "\(id): kind")
            for (nyckel, forvantat) in v where nyckel != "id" && nyckel != "kind" && !nyckel.hasPrefix("_") {
                let fick = Self.falt(h, nyckel)
                #expect(Self.lika(fick, forvantat),
                        "\(id): \(nyckel) — väntade \(forvantat), fick \(String(describing: fick)). \(v["_varfor"] as? String ?? "")")
            }
        }

        // What #210 was about, said plainly: no reader may ever leave a word where the data says null.
        let d2 = try #require(faror.first { $0.id == "dev:d2" })
        if case .point(_, _, _, _, _, let meta) = d2 {
            #expect(meta.road == nil, "road måste vara nil — aldrig \"<null>\", \"null\" eller tom sträng")
        } else {
            Issue.record("dev:d2 är ingen punkt")
        }
        #expect(faror.contains { $0.id == "dev:4711" }, "ett id som tal ska bli \"dev:4711\"")
    }
}
