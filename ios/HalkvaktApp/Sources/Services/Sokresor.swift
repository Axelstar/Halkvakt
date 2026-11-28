// Sparade sökta resor (DECISIONS #982 punkt 3, #985). Det som sparas är namnet föraren ger resan och adressen som söktes, som
// text. Vägen sparas inte: Apples villkor (utvecklaravtalet, bilaga 6 punkt 2.5) tillåter inte att deras kartdata lagras annat
// än tillfälligt, och vägen är deras koordinater. När resan öppnas frågar appen Apple om vägen igen.
// En fil under Application Support/sokresor/, undantagen från säkerhetskopian som de körda resorna. Inget här når nätet.
import Foundation
import Observation

struct Sokresa: Codable, Equatable, Identifiable {
    let id: String
    var namn: String
    /// Adressen som text, som föraren valde den i söklistan.
    let fraga: String
}

@MainActor
@Observable
final class Sokresor {
    static let shared = Sokresor()
    static let max = 5

    private(set) var resor: [Sokresa] = []

    private init() {
        resor = (try? Data(contentsOf: Self.fil)).flatMap { try? JSONDecoder().decode([Sokresa].self, from: $0) } ?? []
    }

    enum Svar { case sparad, fullt, fel }

    func finns(_ fraga: String) -> Bool { resor.contains { $0.fraga == fraga } }

    /// Sparar adressen under ett namn. Tomt namn ger adressen som namn. Samma adress sparas inte två gånger.
    func spara(namn: String, fraga: String) -> Svar {
        if finns(fraga) { return .sparad }
        guard resor.count < Self.max else { return .fullt }
        let n = namn.trimmingCharacters(in: .whitespacesAndNewlines)
        let lista = resor + [Sokresa(id: UUID().uuidString, namn: n.isEmpty ? fraga : n, fraga: fraga)]
        guard Self.skriv(lista) else { return .fel }
        resor = lista
        return .sparad
    }

    func taBort(id: String) {
        let lista = resor.filter { $0.id != id }
        if lista.isEmpty {
            try? FileManager.default.removeItem(at: Self.fil)
            resor = []
        } else if Self.skriv(lista) {
            resor = lista
        }
    }

    private static var fil: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("sokresor", isDirectory: true).appendingPathComponent("sokresor.json")
    }

    /// Skriver filen och undantar den från säkerhetskopian. Går flaggan inte att sätta raderas filen hellre än att den följer med.
    private static func skriv(_ lista: [Sokresa]) -> Bool {
        do {
            try FileManager.default.createDirectory(at: fil.deletingLastPathComponent(), withIntermediateDirectories: true)
            try JSONEncoder().encode(lista).write(to: fil, options: .atomic)
            var u = fil
            var rv = URLResourceValues()
            rv.isExcludedFromBackup = true
            try u.setResourceValues(rv)
            u.removeAllCachedResourceValues()
            guard try u.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup == true else {
                throw CocoaError(.fileWriteUnknown)
            }
            return true
        } catch {
            try? FileManager.default.removeItem(at: fil)
            return false
        }
    }
}
