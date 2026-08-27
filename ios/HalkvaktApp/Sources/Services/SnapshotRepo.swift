// Hämtar data/app/v1/{manifest,static,live}.json från CDN, cachar i Documents
// (offline = senaste snapshoten gäller), verifierar sha256 ur manifestet.
// Spegel av android SnapshotRepo.kt — samma fält, samma id-prefix.
import Foundation
import CryptoKit
import HalkvaktEngine

enum SnapshotError: Error { case checksum(String), http(Int) }

enum SnapshotRepo {
    static let base = "https://axelstar.github.io/halkvakt-karta/data/app/v1/"

    static func loadHazards() async throws -> [Hazard] {
        let manifest = try await fetchJSON("manifest.json")
        let files = manifest["files"] as? [String: Any] ?? [:]
        let staticDoc = try await fetchVerified("static.json", manifestFiles: files)
        let liveDoc = try await fetchVerified("live.json", manifestFiles: files)

        var out: [Hazard] = []

        for c in arr(staticDoc, "cameras") {
            out.append(.point(id: "cam:\(str(c, "id"))", kind: .camera,
                              lon: dbl(c, "lon"), lat: dbl(c, "lat"),
                              bearing: optDbl(c, "bearing"),
                              meta: PointMeta(speedLimitKmh: optInt(c, "limit"))))
        }
        for s in arr(liveDoc, "segments") {
            let line = (s["line"] as? [[Any]] ?? []).map { p in
                [(p[0] as? NSNumber)?.doubleValue ?? 0, (p[1] as? NSNumber)?.doubleValue ?? 0]
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
        for d in arr(liveDoc, "deviations") {
            out.append(.point(id: "dev:\(str(d, "id"))", kind: .accident,
                              lon: dbl(d, "lon"), lat: dbl(d, "lat"), bearing: nil,
                              meta: PointMeta()))
        }
        return out
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
