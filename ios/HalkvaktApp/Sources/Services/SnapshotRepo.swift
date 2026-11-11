// Hämtar app/v1/{manifest,static,live}.json, cachar i Documents (offline = senaste snapshoten gäller),
// verifierar sha256 ur manifestet. Spegel av android SnapshotRepo.kt — samma fält, samma id-prefix.
//
// Fas 2 (DECISIONS #741 punkt 4): hinken först, Pages som reserv BARA när hinken inte svarar på manifestet, och manifest och
// filer kommer alltid ur samma källa. Ett varv (en koll) hämtar manifestet och bara de filer vars sha256 ändrats sedan det
// sparade manifestet (static ändras sällan). Hinkens adress går genom Cloudflare, och en ny fil syns där 40–60 s efter att den
// skrevs (mätt 29/10): manifestet kan vara nytt medan live.json fortfarande är gammal. Då är utfallet OFÖRÄNDRAD och ingenting
// skrivs. Filerna skrivs atomiskt och manifestet sist, så att det sparade manifestet aldrig lovar mer än filerna bredvid.
// Takten — när nästa koll görs — bor i motorpaketet (HalkvaktEngine/Kolltakten.swift).
import Foundation
import CryptoKit
import HalkvaktEngine

enum SnapshotError: Error { case checksum(String), http(Int) }

enum SnapshotRepo {
    static let hink = "https://xmpfztykhyvhmrzsnjrc.supabase.co/storage/v1/object/public/app/v1/"
    static let reserv = "https://axelstar.github.io/halkvakt-karta/data/app/v1/"

    /// Varifrån varvets manifest och filer kom. `ingen`: ingen av källorna svarade.
    enum Kalla { case hink, reserv, ingen }

    /// `fromCache`: hämtningen föll och den sparade filen gäller — då kan åldern bero på nätet, inte på datan.
    /// `utfall` (NY, OFÖRÄNDRAD, FEL) och `kalla` styr takten och mätningen. `weatherOldestAt`: den äldsta mättiden bland de
    /// publicerade väderstationerna (live.json:s `weather_oldest_at`), nil när fältet saknas eller är null.
    struct Snapshot {
        let hazards: [Hazard]; let generatedAt: Date; var stations: [Station] = []; var fromCache = false
        let utfall: Kolltakten.Utfall; let kalla: Kalla; let weatherOldestAt: Date?
    }

    static func loadSnapshot() async throws -> Snapshot {
        // Provkörning 18/10: ett manifest från nästa publicering fällde kontrollsumman och lämnade en gammal sparad fil — det är
        // OFÖRÄNDRAD sedan fas 2. När nätet föll görs fortfarande ett nytt försök innan den sparade filen får gälla.
        var varv = try await koll()
        if varv.utfall == .fel { varv = try await koll() }
        let (staticDoc, liveDoc) = (varv.stat, varv.live)
        let gen = tid(liveDoc["generated_at"]) ?? .distantPast

        // Tolkningen bor i motorpaketet (kort #289) och prövas där mot engine/fixtures/lasarprov.json.
        let lasta = SnapshotReader.toHazards(staticDoc: staticDoc, liveDoc: liveDoc)
        // Efterhalkan (S3) bara för den som slagit på Betatest — Kompisarna först (Bengt 22/10, DECISIONS #676/#677).
        // Prefs bor på huvudaktören, så läsningen väntas in (utan await byggdes inte appen, prov-bygget 22/10, #679).
        let betatest = await Prefs.shared.facitOn
        let out = betatest ? lasta : SnapshotReader.utanEfterhalka(lasta)
        // Kort #203 lager 2: alla stationers id och position (static.json sedan 26/9) — missens plats. Inga faror.
        let stations = SnapshotReader.arr(staticDoc, "stations")
            .map { Station(id: SnapshotReader.str($0, "id"), lon: SnapshotReader.dbl($0, "lon"), lat: SnapshotReader.dbl($0, "lat")) }
            .filter { !$0.id.isEmpty }
        return Snapshot(hazards: out, generatedAt: gen, stations: stations, fromCache: varv.utfall == .fel,
                        utfall: varv.utfall, kalla: varv.kalla, weatherOldestAt: tid(liveDoc["weather_oldest_at"]))
    }

    /// static.json och live.json som de ligger, ur samma koll som vaktens — för favoriternas rapport (kort #357), som läser fler
    /// fält än motorn (vägen på sträckorna, broarna, SMHI:s områden).
    static func dokument() async throws -> (stat: [String: Any], live: [String: Any]) {
        let varv = try await koll()
        return (varv.stat, varv.live)
    }

    // MARK: - Ett varv

    private struct Varv { let stat: [String: Any]; let live: [String: Any]; let utfall: Kolltakten.Utfall; let kalla: Kalla }
    private struct Svar { let data: Data; let manifest: [String: Any]; let bas: String; let kalla: Kalla }

    private static func koll() async throws -> Varv {
        var sparad: [String: Data] = [:]
        for namn in ["static", "live"] { sparad[namn] = try? Data(contentsOf: fil(namn)) }
        let sparatManifest = (try? Data(contentsOf: fil("manifest"))).flatMap { try? parse($0) }

        // 1. Manifestet ur hinken, ur reserven bara när hinken inte svarar. Svarar ingen gäller den sparade snapshoten (FEL).
        let svar: Svar
        do { svar = try await hamtaManifest(hink, .hink) }
        catch {
            do { svar = try await hamtaManifest(reserv, .reserv) }
            catch { return try sparadVarv(sparad, .fel, .ingen, fel: error) }
        }

        // 2. Inte nyare än det sparade manifestet ⇒ OFÖRÄNDRAD, cachen gäller. Skyddar också mot en reserv som är äldre än cachen.
        // 4. Ingen cache alls (första start, eller sparade filer utan sparat manifest) ⇒ båda filerna hämtas.
        let harCache = sparatManifest != nil && sparad["static"] != nil && sparad["live"] != nil
        let nyGen = tid(svar.manifest["generated_at"])
        if harCache, let gammalGen = tid(sparatManifest?["generated_at"]), nyGen.map({ $0 <= gammalGen }) ?? true {
            return try sparadVarv(sparad, .oforandrad, svar.kalla, fel: SnapshotError.checksum("manifest.json"))
        }

        // 3. Bara de filer vars sha256 skiljer sig från det sparade manifestets, ur samma källa, prövade mot det nya.
        let nyaFiler = svar.manifest["files"] as? [String: Any] ?? [:]
        let gamlaFiler = sparatManifest?["files"] as? [String: Any] ?? [:]
        var nytt: [String: Data] = [:]
        for namn in ["static", "live"] {
            let vantad = vantadSha(nyaFiler, namn)
            if harCache, vantad == vantadSha(gamlaFiler, namn) { continue }
            let body: Data
            do { body = try await httpGet(svar.bas + namn + ".json") }
            catch { return try sparadVarv(sparad, .fel, svar.kalla, fel: error) }
            // Cloudflares cache: manifestet är nytt men filen inte än. Ingenting skrivs, cachen gäller.
            guard sha(body) == vantad else {
                return try sparadVarv(sparad, .oforandrad, svar.kalla, fel: SnapshotError.checksum(namn + ".json"))
            }
            nytt[namn] = body
        }
        guard let stat = nytt["static"] ?? sparad["static"], let live = nytt["live"] ?? sparad["live"] else {
            throw CocoaError(.fileReadNoSuchFile)
        }
        let varv = Varv(stat: try parse(stat), live: try parse(live), utfall: .ny, kalla: svar.kalla)
        spara(nytt, svar)
        return varv
    }

    /// Vakten och rapporten kan kolla samtidigt. Ett varv skriver bara när dess manifest inte är äldre än det sparade, så att ett
    /// långsamt varv aldrig skriver över ett nyare, och under ett lås. Filerna först, manifestet sist och bara om filerna
    /// kom ner på disk: det sparade manifestet säger vad filerna bredvid verifierades mot.
    private static let skrivlas = NSLock()

    private static func spara(_ nytt: [String: Data], _ svar: Svar) {
        skrivlas.lock()
        defer { skrivlas.unlock() }
        let sparadGen = (try? Data(contentsOf: fil("manifest"))).flatMap { try? parse($0) }.flatMap { tid($0["generated_at"]) }
        if let sparadGen, let nyGen = tid(svar.manifest["generated_at"]), nyGen < sparadGen { return }
        do {
            for (namn, body) in nytt { try body.write(to: fil(namn), options: .atomic) }
            try svar.data.write(to: fil("manifest"), options: .atomic)
        } catch {
            print("[Snapshot] kunde inte spara cachen: \(error)")
        }
    }

    /// Den sparade snapshoten gäller. Utan sparade filer finns ingenting att visa, och felet går vidare till vakten.
    private static func sparadVarv(_ sparad: [String: Data], _ utfall: Kolltakten.Utfall, _ kalla: Kalla, fel: Error) throws -> Varv {
        guard let stat = sparad["static"], let live = sparad["live"] else { throw fel }
        return Varv(stat: try parse(stat), live: try parse(live), utfall: utfall, kalla: kalla)
    }

    /// Kastar när källan inte svarar: nätfel, tidsgräns, HTTP ≠ 200, eller ett manifest utan kontrollsumman för båda filerna
    /// (som Android: ett oläsbart manifest är inget svar).
    private static func hamtaManifest(_ bas: String, _ kalla: Kalla) async throws -> Svar {
        let data = try await httpGet(bas + "manifest.json")
        let manifest = try parse(data)
        let filer = manifest["files"] as? [String: Any] ?? [:]
        guard !vantadSha(filer, "static").isEmpty, !vantadSha(filer, "live").isEmpty else {
            throw SnapshotError.checksum("manifest.json")
        }
        return Svar(data: data, manifest: manifest, bas: bas, kalla: kalla)
    }

    // MARK: - Hjälpare

    private static func vantadSha(_ filer: [String: Any], _ namn: String) -> String {
        ((filer[namn] as? [String: Any])?["sha256"] as? String) ?? ""
    }

    private static func sha(_ d: Data) -> String { SHA256.hash(data: d).map { String(format: "%02x", $0) }.joined() }

    /// generated_at och weather_oldest_at har millisekunder ("…T10:58:01.993Z"); utan dem läses de också.
    private static func tid(_ v: Any?) -> Date? {
        (v as? String).flatMap { ISO8601DateFormatter.withFraction.date(from: $0) ?? ISO8601DateFormatter().date(from: $0) }
    }

    private static func httpGet(_ url: String) async throws -> Data {
        var req = URLRequest(url: URL(string: url)!)
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

    /// Cachen ligger där den legat: static.json, live.json och sedan fas 2 manifest.json, i Documents.
    private static func fil(_ namn: String) -> URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent(namn + ".json")
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
