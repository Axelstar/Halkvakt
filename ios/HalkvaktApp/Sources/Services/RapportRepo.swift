// RAPPORTFILEN (favoriterna steg 3b, kort #357; DECISIONS #617, #636): hämtar favoriternas rapportfil ur den publika hinken
// `favoriter`, som funktionen `favoriter` skriver var tionde minut. Samma fil för alla: anropet bär ingen fråga, ingen plats och
// ingen resa — matchningen mot förarens vägar sker i telefonen (Rapporten.swift), och den filen når aldrig nätet (ruttspärren).
//
// manifest.json bär sha256 för de två delarna. En del hämtas bara när kontrollsumman ändrats; en del vars sha256 inte stämmer
// förkastas och den förra behålls (CLAUDE.md). Cachen ligger i Caches: allmän data, återskapbar, ingen säkerhetskopia behövs.
import Foundation
import CryptoKit

enum RapportRepo {
    static let base = "https://xmpfztykhyvhmrzsnjrc.supabase.co/storage/v1/object/public/favoriter/"

    struct Filer { let snabb: [String: Any]; let lang: [String: Any] }

    static func hamta() async throws -> Filer {
        // Utan nät faller manifestet: då gäller de sparade delarna, som i SnapshotRepo (kort #258).
        let manifest = (try? parse(try await httpGet("manifest.json"))) ?? [:]
        let snabb = try await del("rapport-snabb.json", manifest["snabb"] as? [String: Any])
        let lang = try await del("rapport-lang.json", manifest["lang"] as? [String: Any])
        return Filer(snabb: snabb, lang: lang)
    }

    private static func del(_ namn: String, _ meta: [String: Any]?) async throws -> [String: Any] {
        let cache = cacheDir().appendingPathComponent(namn)
        let sparad = try? Data(contentsOf: cache)
        let vantad = (meta?["sha256"] as? String) ?? ""
        if let sparad, !vantad.isEmpty, sha(sparad) == vantad { return try parse(sparad) }
        do {
            let body = try await httpGet(namn)
            guard !vantad.isEmpty, sha(body) == vantad else { throw SnapshotError.checksum(namn) }
            try? body.write(to: cache, options: .atomic)
            return try parse(body)
        } catch {
            if let sparad { return try parse(sparad) }
            throw error
        }
    }

    private static func sha(_ d: Data) -> String { SHA256.hash(data: d).map { String(format: "%02x", $0) }.joined() }

    private static func httpGet(_ namn: String) async throws -> Data {
        var req = URLRequest(url: URL(string: base + namn)!)
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
        FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
    }
}
