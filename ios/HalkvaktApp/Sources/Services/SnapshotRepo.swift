// Hämtar data/app/v1/{manifest,static,live}.json från CDN, cachar i Documents
// (offline = senaste snapshoten gäller), verifierar sha256 ur manifestet.
// Spegel av android SnapshotRepo.kt — samma fält, samma id-prefix.
import Foundation
import CryptoKit
import HalkvaktEngine

enum SnapshotError: Error { case checksum(String), http(Int) }

enum SnapshotRepo {
    static let base = "https://axelstar.github.io/halkvakt-karta/data/app/v1/"

    struct Snapshot { let hazards: [Hazard]; let generatedAt: Date }

    static func loadSnapshot() async throws -> Snapshot {
        let manifest = try await fetchJSON("manifest.json")
        let files = manifest["files"] as? [String: Any] ?? [:]
        let staticDoc = try await fetchVerified("static.json", manifestFiles: files)
        let liveDoc = try await fetchVerified("live.json", manifestFiles: files)
        let gen = (liveDoc["generated_at"] as? String)
            .flatMap { ISO8601DateFormatter.withFraction.date(from: $0) } ?? .distantPast

        var out: [Hazard] = []

        for c in arr(staticDoc, "cameras") {
            out.append(.point(id: "cam:\(str(c, "id"))", kind: .camera,
                              lon: dbl(c, "lon"), lat: dbl(c, "lat"),
                              bearing: optDbl(c, "bearing"),
                              meta: PointMeta(speedLimitKmh: optInt(c, "limit"))))
        }
        for s in arr(liveDoc, "segments") {
            let rawLine = s["line"] as? [[Any]] ?? []
            var line: [[Double]] = []
            for p in rawLine where p.count >= 2 {
                let lon = (p[0] as? NSNumber)?.doubleValue ?? 0
                let lat = (p[1] as? NSNumber)?.doubleValue ?? 0
                line.append([lon, lat])
            }
            let info = s["info"] as? [String] ?? []
            out.append(.segment(id: "seg:\(str(s, "id"))", line: line,
                                meta: SegmentMeta(code: optInt(s, "code"), info: info)))
        }
        for w in arr(liveDoc, "weather") {
            out.append(.point(id: "wx:\(str(w, "id"))", kind: .icing_point,
                              lon: dbl(w, "lon"), lat: dbl(w, "lat"), bearing: nil,
                              meta: PointMeta(surfaceTempC: optDbl(w, "yta"),
                                              moisture: (w["fukt"] as? Bool) ?? false)))
        }
        for b in arr(liveDoc, "bridges") {   // #38
            out.append(.point(id: "bro:\(str(b, "id"))", kind: .icing_point,
                              lon: dbl(b, "lon"), lat: dbl(b, "lat"), bearing: nil,
                              meta: PointMeta(surfaceTempC: optDbl(b, "yta"),
                                              moisture: (b["fukt"] as? Bool) ?? false, bridge: true)))
        }
        for v in arr(liveDoc, "wildlife") {
            out.append(.point(id: "vilt:\(str(v, "id"))", kind: .wildlife,
                              lon: dbl(v, "lon"), lat: dbl(v, "lat"), bearing: nil,
                              meta: PointMeta()))
        }
        for d in arr(liveDoc, "deviations") {
            // Olyckslyftet (#28): sev/slut are absent in snapshots published before this
            // shipped, and absent for non-accident deviation types by design. Missing ⇒ nil
            // ⇒ the engine grades it mild and speaks the old line. Never louder by accident.
            out.append(.point(id: "dev:\(str(d, "id"))", kind: .accident,
                              lon: dbl(d, "lon"), lat: dbl(d, "lat"), bearing: nil,
                              meta: PointMeta(severityCode: optInt(d, "sev"),
                                              endTimeLocal: d["slut"] as? String)))
        }
        return Snapshot(hazards: out, generatedAt: gen)
    }

    // MARK: - Hämtning med verifiering + cache

    private static func fetchVerified(_ name: String, manifestFiles: [String: Any]) async throws -> [String: Any] {
        let cacheURL = cacheDir().appendingPathComponent(name)
        do {
            let key = String(name.dropLast(".json".count))
            let meta = manifestFiles[key] as? [String: Any] ?? [:]
            let expected = (meta["sha256"] as? String) ?? ""
            let body = try await httpGet(name)
            let sha = SHA256.hash(data: body).map { String(format: "%02x", $0) }.joined()
            guard sha == expected else { throw SnapshotError.checksum(name) }
            try? body.write(to: cacheURL)
            return try parse(body)
        } catch {
            // Offline eller trasig hämtning: senaste verifierade snapshoten gäller.
            if let cached = try? Data(contentsOf: cacheURL) { return try parse(cached) }
            throw error
        }
    }

    private static func fetchJSON(_ name: String) async throws -> [String: Any] {
        try parse(try await httpGet(name))
    }

    private static func httpGet(_ name: String) async throws -> Data {
        var req = URLRequest(url: URL(string: base + name)!)
        req.timeoutInterval = 15
        req.cachePolicy = .reloadIgnoringLocalCacheData
        let (data, resp) = try await URLSession.shared.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard code == 200 else { throw SnapshotError.http(code) }
        return data
    }

    private static func parse(_ data: Data) throws -> [String: Any] {
        (try JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
    }

    private static func cacheDir() -> URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }

    // MARK: - JSON-plockare (speglar org.json-anropens tolerans)
    private static func arr(_ d: [String: Any], _ k: String) -> [[String: Any]] { d[k] as? [[String: Any]] ?? [] }
    private static func str(_ d: [String: Any], _ k: String) -> String { d[k] as? String ?? "\(d[k] ?? "")" }
    private static func dbl(_ d: [String: Any], _ k: String) -> Double { (d[k] as? NSNumber)?.doubleValue ?? 0 }
    private static func optDbl(_ d: [String: Any], _ k: String) -> Double? { (d[k] as? NSNumber)?.doubleValue }
    private static func optInt(_ d: [String: Any], _ k: String) -> Int? { (d[k] as? NSNumber)?.intValue }
}


extension ISO8601DateFormatter {
    /// live.json:s generated_at har millisekunder ("…T10:58:01.993Z").
    static let withFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
}
