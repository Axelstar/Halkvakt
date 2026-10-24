// FAVORITERNA STEG 2 (kort #357; DECISIONS #616, #625): körda vägar sparas bara på förarens begäran, bara i telefonen och
// aldrig i en säkerhetskopia. Brytaren "Erbjud att spara resor" i fliken Favoriter är av från början; av ⇒ ingen väg samlas
// in och ingen fil skrivs. Glesningen (en punkt per 75 m) och listans regler (högst fem, den sjätte nekas) bor i motorpaketet,
// HalkvaktEngine/Rutter.swift, prövade mot engine/fixtures/rutter.json i tre språk.
//
// Två filer under Application Support/favoriter/. Mappen och filerna undantas från säkerhetskopian (isExcludedFromBackup),
// och flaggan läses tillbaka: går den inte att sätta raderas filen hellre än att en körd väg följer med i iCloud.
//   rutter.json         de sparade rutterna
//   senaste-resan.json  den senaste resans väg tills föraren svarat, högst ett dygn (FAVORITER §6)
//   kollen.json         förra kollen per resa: när rapporten öppnades och vilka faror den visade (steg 3b). Farornas id pekar på
//                       platser längs vägen, så filen behandlas som rutterna.
// Inget här når nätet. scripts/rutterspar.ts i ci fäller en fil som både når nätet och rör rutterna.
import Foundation
import Observation
import HalkvaktEngine

@MainActor
@Observable
final class Favoriter {
    static let shared = Favoriter()

    /// Den senaste resans väg i väntan på förarens svar.
    struct VantandeResa: Codable, Equatable {
        let slut: Date
        let punkter: [[Double]]   // [lon, lat], WGS84
    }

    /// Frågan står kvar ett dygn; sedan raderas vägen (FAVORITER §6).
    static let fragaKvarS: TimeInterval = 24 * 3600
    /// Kortare resor erbjuds inte: en vakt som startades i en parkering eller bars av en gående är ingen väg att spara.
    /// Minst 2 km och 5 minuters körtid (DECISIONS #701): på tåget 24/10 kom frågan två gånger på en minut.
    static let minstaResaKm = 2.0
    static let minstaResaMin = 5.0

    var erbjud: Bool {
        didSet {
            UserDefaults.standard.set(erbjud, forKey: "k.favErbjud")
            if !erbjud { avsta() }   // av ⇒ ingen väg samlas in, och den som väntade raderas
        }
    }
    private(set) var rutter: [SparadRutt] = []
    private(set) var vantande: VantandeResa?

    /// Förra kollen av en resas rapport, åt båda hållen (steg 3b): det som tillkommit sedan dess är Nytt.
    struct Koll: Codable, Equatable {
        let tid: Date
        let ids: [String]
    }
    private(set) var kollar: [String: Koll] = [:]
    private var insamlare: Ruttinsamlare?

    private init() {
        erbjud = UserDefaults.standard.bool(forKey: "k.favErbjud")
        rutter = Self.las(Rutter.self, Self.rutterFil)?.rutter ?? []
        vantande = Self.las(VantandeResa.self, Self.vantandeFil)
        kollar = Self.las([String: Koll].self, Self.kollenFil) ?? [:]
        if let v = vantande, Date.now.timeIntervalSince(v.slut) >= Self.fragaKvarS { avsta() }
    }

    // MARK: - Under resan (GuardManager)

    /// Vakten startar. En ny resa börjar om insamlingen; en resa som fortsätter efter en paus behåller den.
    func resanBorjar(ny: Bool) {
        guard erbjud else { insamlare = nil; return }
        if ny || insamlare == nil { insamlare = Ruttinsamlare() }
    }

    func fix(lon: Double, lat: Double) { insamlare?.add(lon: lon, lat: lat) }

    /// Vakten stoppar: vägen så långt läggs i den tillfälliga filen, och Redo. frågar om den ska sparas.
    func resanSlutar(km: Double, minuter: Double, nu: Date = .now) {
        guard erbjud, km >= Self.minstaResaKm, minuter >= Self.minstaResaMin, let r = insamlare?.route(), r.count >= 2 else { return }
        // DECISIONS #637: vägen hem, eller samma väg igen, är redan sparad — en resa räcker för båda hållen, så ingen ny fråga.
        guard !rutter.contains(where: { Rutter.sammaResa($0.punkter, r) }) else { return }
        let v = VantandeResa(slut: nu, punkter: r)
        if Self.skriv(v, Self.vantandeFil) { vantande = v }
    }

    // MARK: - Föraren svarar (Redo.)

    enum Svar { case sparad, fullt, fel }

    func spara(namn: String, nu: Date = .now) -> Svar {
        let n = namn.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let v = vantande, !n.isEmpty else { return .fel }
        let ny = SparadRutt(id: UUID().uuidString, namn: n, sparad: nu.formatted(.iso8601), punkter: v.punkter)
        guard let lista = Rutter(rutter: rutter).laggTill(ny) else { return .fullt }
        guard Self.skriv(lista, Self.rutterFil) else { return .fel }
        rutter = lista.rutter
        avsta()
        return .sparad
    }

    /// Nej tack, brytaren av eller ett dygn utan svar: den tillfälliga filen raderas, och en resa som fortsätter börjar om.
    func avsta() {
        vantande = nil
        insamlare = nil
        try? FileManager.default.removeItem(at: Self.vantandeFil)
    }

    // MARK: - Fliken

    func taBort(id: String) {
        let lista = Rutter(rutter: rutter).taBort(id: id)
        if lista.rutter.isEmpty { taBortAlla(); return }
        if Self.skriv(lista, Self.rutterFil) { rutter = lista.rutter }
        if kollar[id] != nil { var k = kollar; k[id] = nil; if Self.skriv(k, Self.kollenFil) { kollar = k } }
    }

    func taBortAlla() {
        try? FileManager.default.removeItem(at: Self.rutterFil)
        try? FileManager.default.removeItem(at: Self.kollenFil)
        rutter = []
        kollar = [:]
    }

    /// Föraren har läst rapporten: det den visade, åt båda hållen, är grunden för nästa Nytt.
    func kollad(rutt id: String, ids: [String], nu: Date = .now) {
        guard rutter.contains(where: { $0.id == id }) else { return }
        var k = kollar
        k[id] = Koll(tid: nu, ids: ids)
        if Self.skriv(k, Self.kollenFil) { kollar = k }
    }

    // MARK: - Filerna

    private static var mapp: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("favoriter", isDirectory: true)
    }
    static var rutterFil: URL { mapp.appendingPathComponent("rutter.json") }
    static var vantandeFil: URL { mapp.appendingPathComponent("senaste-resan.json") }
    static var kollenFil: URL { mapp.appendingPathComponent("kollen.json") }

    private static func skriv<T: Encodable>(_ v: T, _ url: URL) -> Bool {
        do {
            try FileManager.default.createDirectory(at: mapp, withIntermediateDirectories: true)
            try undanta(mapp)
            let e = JSONEncoder()
            e.dateEncodingStrategy = .iso8601
            try e.encode(v).write(to: url, options: .atomic)
            try undanta(url)
            return true
        } catch {
            try? FileManager.default.removeItem(at: url)
            print("[Favoriter] kunde inte skriva \(url.lastPathComponent): \(error)")   // aldrig en koordinat i loggen
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

    private static func las<T: Decodable>(_ t: T.Type, _ url: URL) -> T? {
        guard let data = try? Data(contentsOf: url) else { return nil }
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return try? d.decode(t, from: data)
    }
}
