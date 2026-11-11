// MÄTNINGEN I TELEFONEN (fas 2, DECISIONS #741 punkt 5): hur färska varningarna var när de kom fram, och vad det kostade i
// batteri. Per körning (vaktens start → stopp) räknas kollarna, de nya filerna och varven ur reserven, varje ny fils ålder vid
// ankomsten och den äldsta väderstationens ålder, och batterinivån läses vid start och stopp. Körningen sparas när den slutar,
// om den var minst två minuter, och de tio senaste behålls. Bara medan vakten går räknas något.
//
// Produktinvarianten: ingenting här lämnar telefonen, och inga koordinater sparas. Filen Application Support/matningen.json
// undantas från säkerhetskopian (isExcludedFromBackup, mönstret ur Favoriter.swift), och ingen kod som når nätet läser den —
// den visas bara under Betatest. En trasig fil ger en tom lista, aldrig en krasch.
import Foundation
import Observation
import UIKit
import HalkvaktEngine

@MainActor
@Observable
final class Matningen {
    static let shared = Matningen()

    struct Resa: Codable, Equatable, Identifiable {
        let start: Date
        let slut: Date
        let kollar: Int
        let nya: Int
        let reserv: Int
        /// För varje NY: nu − generated_at, sekunder (filens ålder vid ankomsten).
        let alderS: [Int]
        /// För varje NY där weather_oldest_at finns: nu − weather_oldest_at, sekunder.
        let stationS: [Int]
        /// Procent, nil när iOS inte kan läsa nivån.
        let batteriStart: Int?
        let batteriSlut: Int?

        var id: Date { start }

        enum CodingKeys: String, CodingKey {
            case start, slut, kollar, nya, reserv
            case alderS = "alder_s", stationS = "station_s", batteriStart = "batteri_start", batteriSlut = "batteri_slut"
        }

        /// Som den syntetiserade, men en batterinivå som inte gick att läsa skrivs som null i stället för att nyckeln saknas.
        func encode(to encoder: Encoder) throws {
            var c = encoder.container(keyedBy: CodingKeys.self)
            try c.encode(start, forKey: .start)
            try c.encode(slut, forKey: .slut)
            try c.encode(kollar, forKey: .kollar)
            try c.encode(nya, forKey: .nya)
            try c.encode(reserv, forKey: .reserv)
            try c.encode(alderS, forKey: .alderS)
            try c.encode(stationS, forKey: .stationS)
            try c.encode(batteriStart, forKey: .batteriStart)
            try c.encode(batteriSlut, forKey: .batteriSlut)
        }
    }

    static let behall = 10
    static let minstaResaS: TimeInterval = 2 * 60

    /// De sparade körningarna, nyast först.
    private(set) var resor: [Resa] = []

    /// Den pågående körningen; nil när vakten är av.
    private struct Pagaende {
        let start: Date
        let batteri: Int?
        var kollar = 0, nya = 0, reserv = 0
        var alder: [Int] = [], station: [Int] = []
    }
    @ObservationIgnored private var pagaende: Pagaende?

    private init() {
        resor = Self.las()
    }

    // MARK: - Under körningen (GuardManager)

    /// Vakten startar: en ny mätning, med batterinivån nu.
    func resanBorjar(nu: Date = .now) {
        UIDevice.current.isBatteryMonitoringEnabled = true
        pagaende = Pagaende(start: nu, batteri: Self.batteri())
    }

    /// Ett varv medan vakten går; nil = laddningen föll och det fanns ingen sparad snapshot (FEL).
    func koll(_ snap: SnapshotRepo.Snapshot?, nu: Date = .now) {
        guard var p = pagaende else { return }
        p.kollar += 1
        if snap?.kalla == .reserv { p.reserv += 1 }
        if let snap, snap.utfall == .ny {
            p.nya += 1
            if snap.generatedAt > .distantPast { p.alder.append(Self.sekunder(nu, snap.generatedAt)) }
            if let w = snap.weatherOldestAt { p.station.append(Self.sekunder(nu, w)) }
        }
        pagaende = p
    }

    /// Vakten stoppar: körningen sparas om den var minst två minuter.
    func resanSlutar(nu: Date = .now) {
        guard let p = pagaende else { return }
        pagaende = nil
        let batteri = Self.batteri()
        UIDevice.current.isBatteryMonitoringEnabled = false
        guard nu.timeIntervalSince(p.start) >= Self.minstaResaS else { return }
        let resa = Resa(start: p.start, slut: nu, kollar: p.kollar, nya: p.nya, reserv: p.reserv, alderS: p.alder,
                        stationS: p.station, batteriStart: p.batteri, batteriSlut: batteri)
        let lista = Array(([resa] + resor).prefix(Self.behall))
        if Self.skriv(lista) { resor = lista }
    }

    private static func sekunder(_ nu: Date, _ t: Date) -> Int { Int(nu.timeIntervalSince(t).rounded()) }

    /// Batterinivån i procent; iOS ger −1 när den inte går att läsa (och nivån i steg om 5 %).
    private static func batteri() -> Int? {
        let niva = UIDevice.current.batteryLevel
        return niva < 0 ? nil : Int((niva * 100).rounded())
    }

    // MARK: - Filen

    static var fil: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("matningen.json")
    }

    private static func skriv(_ lista: [Resa]) -> Bool {
        do {
            try FileManager.default.createDirectory(at: fil.deletingLastPathComponent(), withIntermediateDirectories: true)
            let e = JSONEncoder()
            e.dateEncodingStrategy = .iso8601
            try e.encode(lista).write(to: fil, options: .atomic)
            try undanta(fil)
            return true
        } catch {
            try? FileManager.default.removeItem(at: fil)
            print("[Mätningen] kunde inte skriva matningen.json: \(error)")
            return false
        }
    }

    /// Sätter flaggan och läser tillbaka den. Kastar om den inte står kvar.
    private static func undanta(_ url: URL) throws {
        var u = url
        var rv = URLResourceValues()
        rv.isExcludedFromBackup = true
        try u.setResourceValues(rv)
        u.removeAllCachedResourceValues()
        guard try u.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup == true else {
            throw CocoaError(.fileWriteUnknown)
        }
    }

    private static func las() -> [Resa] {
        guard let data = try? Data(contentsOf: fil) else { return [] }
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return (try? d.decode([Resa].self, from: data)) ?? []
    }
}

// MARK: - Visningen under Betatest

extension Matningen.Resa {
    private static let sv = Locale(identifier: "sv_SE")

    /// "29 okt 07:20 · 34 min"
    var rubrik: String {
        let dag = start.formatted(.dateTime.day().month(.abbreviated).locale(Self.sv)).replacing(".", with: "")
        return "\(dag) \(start.klockslag) · \(Int((slut.timeIntervalSince(start) / 60).rounded())) min"
    }

    /// Raderna under rubriken. En rad vars data saknas utelämnas.
    var rader: [String] {
        var r = ["\(kollar) kollar · \(nya) nya · \(reserv) ur reserven"]
        if let median = Self.median(alderS), let hogst = alderS.max() {
            r.append("Ålder vid ankomst: median \(Self.minSek(median)), högst \(Self.minSek(Double(hogst)))")
        }
        if let median = Self.median(stationS) {
            r.append("Äldsta station: median \(Int((median / 60).rounded())) min")
        }
        if let b0 = batteriStart, let b1 = batteriSlut {
            let perTimme = Double(b0 - b1) / (slut.timeIntervalSince(start) / 3600)
            let takt = perTimme.formatted(.number.precision(.fractionLength(1)).locale(Self.sv))
            var rad = "Batteri \(b0) → \(b1) % (\(takt) %/h)"
            // iPhone ger nivån i steg om 5 %: en mindre skillnad är mest avrundning.
            if abs(b0 - b1) < 5 { rad += " · iPhone visar i steg om 5 %" }
            r.append(rad)
        }
        return r
    }

    private static func median(_ v: [Int]) -> Double? {
        guard !v.isEmpty else { return nil }
        let s = v.sorted(), m = s.count / 2
        return s.count % 2 == 1 ? Double(s[m]) : Double(s[m - 1] + s[m]) / 2
    }

    /// Sekunder som minuter och sekunder: "3:05".
    private static func minSek(_ s: Double) -> String {
        let n = Int(s.rounded()), a = abs(n), sek = a % 60
        return "\(n < 0 ? "−" : "")\(a / 60):\(sek < 10 ? "0" : "")\(sek)"
    }
}
