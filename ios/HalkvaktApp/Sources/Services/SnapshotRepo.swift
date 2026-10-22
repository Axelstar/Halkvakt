// Hämtar data/app/v1/{manifest,static,live}.json från CDN, cachar i Documents
// (offline = senaste snapshoten gäller), verifierar sha256 ur manifestet.
// Spegel av android SnapshotRepo.kt — samma fält, samma id-prefix.
import Foundation
import CryptoKit
import HalkvaktEngine

enum SnapshotError: Error { case checksum(String), http(Int) }

enum SnapshotRepo {
    static let base = "https://axelstar.github.io/halkvakt-karta/data/app/v1/"

    /// `fromCache`: hämtningen föll och den sparade filen gäller — då kan åldern bero på nätet, inte på datan.
    struct Snapshot { let hazards: [Hazard]; let generatedAt: Date; var stations: [Station] = []; var fromCache = false }

    static func loadSnapshot() async throws -> Snapshot {
        // Provkörning 18/10: ett manifest från nästa publicering (var tionde minut) fäller kontrollsumman och lämnar en gammal
        // sparad fil. Ett nytt försök innan den sparade filen får gälla.
        var docs = try await fetchBoth()
        if docs.fromCache { docs = try await fetchBoth() }
        let (staticDoc, liveDoc) = (docs.stat, docs.live)
        let gen = (liveDoc["generated_at"] as? String)
            .flatMap { ISO8601DateFormatter.withFraction.date(from: $0) } ?? .distantPast

        // Tolkningen bor i motorpaketet (kort #289) och prövas där mot engine/fixtures/lasarprov.json.
        let lasta = SnapshotReader.toHazards(staticDoc: staticDoc, liveDoc: liveDoc)
        // Efterhalkan (S3) bara för den som slagit på Betatest — Kompisarna först (Bengt 22/10, DECISIONS #676/#677).
        let out = Prefs.shared.facitOn ? lasta : SnapshotReader.utanEfterhalka(lasta)
        // Kort #203 lager 2: alla stationers id och position (static.json sedan 26/9) — missens plats. Inga faror.
        let stations = SnapshotReader.arr(staticDoc, "stations")
            .map { Station(id: SnapshotReader.str($0, "id"), lon: SnapshotReader.dbl($0, "lon"), lat: SnapshotReader.dbl($0, "lat")) }
            .filter { !$0.id.isEmpty }
        return Snapshot(hazards: out, generatedAt: gen, stations: stations, fromCache: docs.fromCache)
    }

    private static func fetchBoth() async throws -> (stat: [String: Any], live: [String: Any], fromCache: Bool) {
        // Kort #258: utan nät faller manifestet — då ska den sparade snapshoten gälla (fetchVerified), inte hela laddningen
        // falla. Tomt manifest ⇒ kontrollsumman fäller varje hämtning ⇒ cachen, som Androids SnapshotRepo gör.
        let manifest = (try? await fetchJSON("manifest.json")) ?? [:]
        let files = manifest["files"] as? [String: Any] ?? [:]
        let stat = try await fetchVerified("static.json", manifestFiles: files)
        let live = try await fetchVerified("live.json", manifestFiles: files)
        return (stat.doc, live.doc, stat.fromCache || live.fromCache)
    }

    /// static.json och live.json som de ligger, verifierade som ovan — för favoriternas rapport (kort #357), som läser fler fält än
    /// motorn (vägen på sträckorna, broarna, SMHI:s områden).
    static func dokument() async throws -> (stat: [String: Any], live: [String: Any]) {
        let manifest = (try? await fetchJSON("manifest.json")) ?? [:]
        let files = manifest["files"] as? [String: Any] ?? [:]
        return (try await fetchVerified("static.json", manifestFiles: files).doc, try await fetchVerified("live.json", manifestFiles: files).doc)
    }

    // MARK: - Hämtning med verifiering + cache

    /// Dokumentet, och true om det kom ur den sparade filen.
    private static func fetchVerified(_ name: String, manifestFiles: [String: Any]) async throws -> (doc: [String: Any], fromCache: Bool) {
        let cacheURL = cacheDir().appendingPathComponent(name)
        do {
            let key = String(name.dropLast(".json".count))
            let meta = manifestFiles[key] as? [String: Any] ?? [:]
            let expected = (meta["sha256"] as? String) ?? ""
            let body = try await httpGet(name)
            let sha = SHA256.hash(data: body).map { String(format: "%02x", $0) }.joined()
            guard sha == expected else { throw SnapshotError.checksum(name) }
            try? body.write(to: cacheURL)
            return (try parse(body), false)
        } catch {
            // Offline eller trasig hämtning: senaste verifierade snapshoten gäller.
            if let cached = try? Data(contentsOf: cacheURL) { return (try parse(cached), true) }
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
}


extension ISO8601DateFormatter {
    /// live.json:s generated_at har millisekunder ("…T10:58:01.993Z").
    static let withFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
}
