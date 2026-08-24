// The cross-platform contract, third runtime: replays every shared vector from
// /engine/vectors/ + the real Skåne fixture and requires the Swift engine to produce
// the SAME alert log as the frozen TypeScript output — field for field.
import XCTest
import Foundation
@testable import HalkvaktEngine

final class VectorTests: XCTestCase {

    func repoRoot() -> URL {
        var d = URL(fileURLWithPath: #filePath)
        while !FileManager.default.fileExists(atPath: d.appendingPathComponent("engine/vectors").path) {
            let parent = d.deletingLastPathComponent()
            precondition(parent.path != d.path, "engine/vectors not found above \(#filePath)")
            d = parent
        }
        return d
    }

    func parseHazard(_ o: [String: Any]) -> Hazard {
        let kind = HazardKind(rawValue: o["kind"] as! String)!
        if kind == .slippery_segment {
            let line = (o["line"] as! [[Any]]).map { $0.map { ($0 as! NSNumber).doubleValue } }
            let m = o["meta"] as? [String: Any]
            return .segment(
                id: o["id"] as! String, line: line,
                meta: SegmentMeta(
                    code: (m?["code"] as? NSNumber)?.intValue,
                    info: m?["info"] as? [String] ?? []))
        }
        let m = o["meta"] as? [String: Any]
        return .point(
            id: o["id"] as! String, kind: kind,
            lon: (o["lon"] as! NSNumber).doubleValue,
            lat: (o["lat"] as! NSNumber).doubleValue,
            bearing: (o["bearing"] as? NSNumber)?.doubleValue,
            meta: PointMeta(
                surfaceTempC: (m?["surfaceTempC"] as? NSNumber)?.doubleValue,
                moisture: m?["moisture"] as? Bool ?? false,
                active: m?["active"] as? Bool ?? true,
                speedLimitKmh: (m?["speedLimitKmh"] as? NSNumber)?.intValue))
    }

    func runFile(_ url: URL) throws -> ([Alert], [[String: Any]]) {
        let doc = try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as! [String: Any]
        let hazards = (doc["hazards"] as! [[String: Any]]).map(parseHazard)
        let trace = (doc["trace"] as! [[String: Any]]).map { f in
            Fix(t: (f["t"] as! NSNumber).doubleValue,
                lon: (f["lon"] as! NSNumber).doubleValue,
                lat: (f["lat"] as! NSNumber).doubleValue,
                speedKmh: (f["speedKmh"] as? NSNumber)?.doubleValue,
                headingDeg: (f["headingDeg"] as? NSNumber)?.doubleValue)
        }
        let updates: [(Double, [Hazard])] = (doc["updates"] as? [[String: Any]] ?? []).map { o in
            ((o["atT"] as! NSNumber).doubleValue, (o["hazards"] as! [[String: Any]]).map(parseHazard))
        }
        let engine = AlertEngine(hazards)
        var u = 0
        var got: [Alert] = []
        for fix in trace {
            while u < updates.count, fix.t >= updates[u].0 { engine.updateHazards(updates[u].1); u += 1 }
            if let a = engine.step(fix) { got.append(a) }
        }
        return (got, doc["expected"] as! [[String: Any]])
    }

    func assertLogEquals(_ name: String, _ got: [Alert], _ expected: [[String: Any]]) {
        XCTAssertEqual(expected.count, got.count, "\(name): alert count")
        for (i, g) in got.enumerated() where i < expected.count {
            let e = expected[i]
            XCTAssertEqual((e["t"] as! NSNumber).doubleValue, g.t, accuracy: 1e-9, "\(name)[\(i)].t")
            XCTAssertEqual(e["hazardId"] as! String, g.hazardId, "\(name)[\(i)].hazardId")
            XCTAssertEqual(e["kind"] as! String, g.kind.rawValue, "\(name)[\(i)].kind")
            XCTAssertEqual((e["distanceM"] as! NSNumber).intValue, g.distanceM, "\(name)[\(i)].distanceM")
            XCTAssertEqual(e["text"] as! String, g.text, "\(name)[\(i)].text")
        }
    }

    func testAllSharedVectorsIdentical() throws {
        let dir = repoRoot().appendingPathComponent("engine/vectors")
        let files = try FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)
            .filter { $0.pathExtension == "json" }
            .sorted { $0.lastPathComponent < $1.lastPathComponent }
        XCTAssertGreaterThanOrEqual(files.count, 13, "expected the full vector suite")
        for f in files {
            let (got, expected) = try runFile(f)
            assertLogEquals(f.lastPathComponent, got, expected)
        }
    }

    func testRealSkaneFixtureIdentical() throws {
        let f = repoRoot().appendingPathComponent("engine/fixtures/skane_vag108.json")
        let (got, expected) = try runFile(f)
        assertLogEquals("skane_vag108", got, expected)
        XCTAssertTrue(got.allSatisfy { $0.kind == .camera }, "August drive must be cameras-only")
    }

    func testDeterminism() throws {
        let f = repoRoot().appendingPathComponent("engine/vectors/v04_priority_drop.json")
        let (a, _) = try runFile(f)
        let (b, _) = try runFile(f)
        XCTAssertEqual(a, b)
    }
}
