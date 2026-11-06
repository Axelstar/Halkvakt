// FAVORITERNA (kort #357; DECISIONS #616, #625, #806): körda vägar sparas bara på förarens begäran, bara i telefonen och
// aldrig i en säkerhetskopia. Brytaren "Erbjud att spara resor" i fliken Favoriter är av från början; av ⇒ ingen väg samlas
// in och ingen fil skrivs. Glesningen (en punkt per 75 m), listans regler (högst fem, den sjätte nekas) och dagens resor (högst
// tre i väntan på namn, ett dygn, dit och hem som en) bor i motorpaketet, HalkvaktEngine/Rutter.swift, prövade mot
// engine/fixtures/rutter.json i tre språk.
//
// Favoriter 2a (DECISIONS #806): frågan kommer som notis efter resan, där föraren kan skriva namnet utan att öppna appen.
// Resan räknas som slut när bilens CarPlay eller Bluetooth kopplas bort, när bilen stått still i tio minuter eller när vakten
// stannar — aldrig medan bilen rullar. Högst en notis per dag, för den första resan som inte liknar en sparad; senare resor
// samlas tyst i Dagens resor. Notisen bär bara längden och antalet, inga klockslag och ingen plats.
//
// Tre filer under Application Support/favoriter/. Mappen och filerna undantas från säkerhetskopian (isExcludedFromBackup),
// och flaggan läses tillbaka: går den inte att sätta raderas filen hellre än att en körd väg följer med i iCloud.
//   rutter.json         de sparade rutterna
//   senaste-resan.json  dagens resor i väntan på namn, var och en högst ett dygn (FAVORITER §6)
//   kollen.json         förra kollen per resa: när rapporten öppnades och vilka faror den visade (steg 3b). Farornas id pekar på
//                       platser längs vägen, så filen behandlas som rutterna.
// Inget här når nätet. scripts/rutterspar.ts i ci fäller en fil som både når nätet och rör rutterna.
import Foundation
import Observation
import UserNotifications
import HalkvaktEngine

@MainActor
@Observable
final class Favoriter {
    static let shared = Favoriter()

    /// Kortare resor erbjuds inte: en vakt som startades i en parkering eller bars av en gående är ingen väg att spara.
    /// Minst 2 km och 5 minuters körtid (DECISIONS #701): på tåget 24/10 kom frågan två gånger på en minut.
    static let minstaResaKm = 2.0
    static let minstaResaMin = 5.0
    /// Raden Kör du den här ofta? på Redo: efter en resa på minst så här många km med brytaren av, och igen tidigast en vecka
    /// efter Inte nu (DECISIONS #806).
    static let erbjudEfterKm = 10.0
    static let erbjudIgenEfterS: TimeInterval = 7 * 24 * 3600

    var erbjud: Bool {
        didSet {
            UserDefaults.standard.set(erbjud, forKey: "k.favErbjud")
            if !erbjud { slangAlla() }   // av ⇒ ingen väg samlas in, och de som väntade raderas
        }
    }
    /// När föraren tryckte Inte nu på raden Kör du den här ofta? (en tidpunkt, ingen väg).
    var erbjudDold: Date? {
        didSet { UserDefaults.standard.set(erbjudDold, forKey: "k.favErbjudDold") }
    }
    private(set) var rutter: [SparadRutt] = []
    /// Dagens resor i väntan på namn, äldst först.
    private(set) var dagens: [Vantande] = []
    /// Sätts av notisen och raden på Redo; RootView byter till fliken och nollar den.
    var visaFliken = false

    /// Förra kollen av en resas rapport, åt båda hållen (steg 3b): det som tillkommit sedan dess är Nytt.
    struct Koll: Codable, Equatable {
        let tid: Date
        let ids: [String]
    }
    private(set) var kollar: [String: Koll] = [:]
    private var insamlare: Ruttinsamlare?
    /// Vaktpassets id: en resa som slutar två gånger (bilen stod still, sedan körde den vidare) uppdaterar sin egen rad.
    private var pass = UUID().uuidString

    private init() {
        erbjud = UserDefaults.standard.bool(forKey: "k.favErbjud")
        erbjudDold = UserDefaults.standard.object(forKey: "k.favErbjudDold") as? Date
        rutter = Self.las(Rutter.self, Self.rutterFil)?.rutter ?? []
        dagens = Self.las([Vantande].self, Self.vantandeFil) ?? []
        kollar = Self.las([String: Koll].self, Self.kollenFil) ?? [:]
        rensaGamla()
    }

    // MARK: - Under resan (GuardManager)

    /// Vakten startar. En ny resa börjar om insamlingen; en resa som fortsätter efter en paus behåller den och sitt pass.
    func resanBorjar(ny: Bool) {
        guard erbjud else { insamlare = nil; return }
        if ny || insamlare == nil { insamlare = Ruttinsamlare(); pass = UUID().uuidString }
    }

    func fix(lon: Double, lat: Double) { insamlare?.add(lon: lon, lat: lat) }

    /// Resan är slut eller ser ut att vara det (CarPlay eller Bluetooth bort, tio minuter stilla, vakten stannar). Vägen så långt
    /// läggs i dagens resor; en ny resa som inte liknar en sparad ger dagens notis, om ingen kommit i dag.
    func resanSlutar(km: Double, minuter: Double, nu: Date = .now) {
        guard erbjud, km >= Self.minstaResaKm, minuter >= Self.minstaResaMin, let r = insamlare?.route(), r.count >= 2 else { return }
        // DECISIONS #637: vägen hem, eller samma väg igen, är redan sparad — en resa räcker för båda hållen, så ingen ny fråga.
        guard !rutter.contains(where: { Rutter.sammaResa($0.punkter, r) }) else { return }
        let fore = dagens
        let lista = Vantande.dagensResor(dagens, Vantande(id: pass, slutS: nu.timeIntervalSince1970, km: km, punkter: r),
                                         nuS: nu.timeIntervalSince1970)
        guard Self.skriv(lista, Self.vantandeFil) else { return }
        dagens = lista
        // Ny rad i listan (inte samma pass igen, inte hemresan som slogs ihop): då kan dagens notis komma.
        let ny = lista.contains { $0.id == pass } && !fore.contains { $0.id == pass }
        if ny { FavoritNotis.fraga(km: km, antal: lista.count, id: pass, nu: nu) }
    }

    // MARK: - Föraren svarar (notisen, fliken)

    enum Svar { case sparad, fullt, fel }

    /// Sparar en av dagens resor. Tomt namn sparar som Resa d/m (resans dag).
    func spara(id: String, namn: String, nu: Date = .now) -> Svar {
        guard let v = dagens.first(where: { $0.id == id }) else { return .fel }
        let n = namn.trimmingCharacters(in: .whitespacesAndNewlines)
        let ny = SparadRutt(id: UUID().uuidString, namn: n.isEmpty ? Self.datumnamn(v) : n, sparad: nu.formatted(.iso8601),
                            punkter: v.punkter)
        guard let lista = Rutter(rutter: rutter).laggTill(ny) else { return .fullt }
        guard Self.skriv(lista, Self.rutterFil) else { return .fel }
        rutter = lista.rutter
        slang(id: id)
        return .sparad
    }

    /// Släng en av dagens resor: vägen raderas.
    func slang(id: String) {
        let lista = dagens.filter { $0.id != id }
        if lista.isEmpty { slangAlla(); return }
        if Self.skriv(lista, Self.vantandeFil) { dagens = lista }
    }

    /// Brytaren av: allt som väntade raderas, och en resa som pågår börjar om.
    func slangAlla() {
        dagens = []
        insamlare = nil
        try? FileManager.default.removeItem(at: Self.vantandeFil)
        FavoritNotis.taBort()
    }

    /// Resor äldre än ett dygn raderas; körs vid start och när fliken eller Redo visas.
    func rensaGamla(nu: Date = .now) {
        let kvar = dagens.filter { nu.timeIntervalSince1970 - $0.slutS < Vantande.vantandeKvarS }
        guard kvar.count != dagens.count else { return }
        if kvar.isEmpty { dagens = []; try? FileManager.default.removeItem(at: Self.vantandeFil) }
        else if Self.skriv(kvar, Self.vantandeFil) { dagens = kvar }
    }

    /// "Resa 3/11" — resans dag, samma ord som namnförslaget.
    static func datumnamn(_ v: Vantande) -> String {
        let c = Calendar.current.dateComponents([.day, .month], from: Date(timeIntervalSince1970: v.slutS))
        return Rutter.namnforslag(dag: c.day ?? 1, manad: c.month ?? 1).last ?? "Resa"
    }

    // MARK: - Raden Kör du den här ofta? (brytaren av)

    /// Visas efter en lång resa när brytaren är av, en gång, och igen tidigast en vecka efter Inte nu.
    func erbjudRaden(senasteKm: Double, senasteSlut: Date?, nu: Date = .now) -> Bool {
        guard !erbjud, senasteKm >= Self.erbjudEfterKm, let slut = senasteSlut,
              nu.timeIntervalSince1970 - slut.timeIntervalSince1970 < Vantande.vantandeKvarS else { return false }
        guard let dold = erbjudDold else { return true }
        return slut > dold && nu.timeIntervalSince(dold) >= Self.erbjudIgenEfterS
    }

    // MARK: - Fliken

    func bytNamn(id: String, till namn: String) {
        let n = namn.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !n.isEmpty else { return }
        let lista = Rutter(rutter: rutter.map { $0.id == id ? SparadRutt(id: $0.id, namn: n, sparad: $0.sparad, punkter: $0.punkter) : $0 })
        if Self.skriv(lista, Self.rutterFil) { rutter = lista.rutter }
    }

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

/// Notisen Spara resan? och kvittot (Favoriter 2a, DECISIONS #806). Kategorin och svaren tas emot av EfterResanNotis, som är
/// notiscentralens delegat. Ingen plats och inga klockslag i texten: notisen syns på låsskärmen.
@MainActor
enum FavoritNotis {
    static let kategori = "halkvakt.favorit"
    nonisolated static let namnge = "halkvakt.favorit.namnge"
    nonisolated static let slang = "halkvakt.favorit.slang"
    nonisolated static let resaNyckel = "resa"
    private static let notisId = "halkvakt.favorit.notis"
    private static let dagNyckel = "k.favNotisDag"

    static var kategorin: UNNotificationCategory {
        let namnge = UNTextInputNotificationAction(identifier: Self.namnge, title: "Namnge", options: [],
                                                   textInputButtonTitle: "Spara", textInputPlaceholder: "Vad var det för resa?")
        let slang = UNNotificationAction(identifier: Self.slang, title: "Släng", options: [.destructive])
        return UNNotificationCategory(identifier: kategori, actions: [namnge, slang], intentIdentifiers: [], options: [])
    }

    /// Dagens notis: högst en per dag, för den första nya resan.
    static func fraga(km: Double, antal: Int, id: String, nu: Date) {
        let dag = nu.formatted(.iso8601.year().month().day())
        guard UserDefaults.standard.string(forKey: dagNyckel) != dag else { return }
        UserDefaults.standard.set(dag, forKey: dagNyckel)
        let c = UNMutableNotificationContent()
        c.title = "Spara resan?"
        c.body = "\(kmText(km)), \(antal) \(antal == 1 ? "resa" : "resor") i dag. Dra ut notisen och skriv vad det var för resa."
        c.categoryIdentifier = kategori
        c.threadIdentifier = notisId
        c.userInfo = [resaNyckel: id]
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [notisId])
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: notisId, content: c, trigger: nil))
    }

    /// Svaret i notisen. Kvittot ersätter frågan och pekar vidare om fler resor väntar.
    static func svar(action: String, id: String, text: String?) {
        let fav = Favoriter.shared
        switch action {
        case namnge:
            let namn = (text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            let v = fav.dagens.first { $0.id == id }
            switch fav.spara(id: id, namn: namn) {
            case .sparad:
                kvitto(rubrik: "Sparad som \(namn.isEmpty ? (v.map(Favoriter.datumnamn) ?? "Resa") : namn)", kvar: fav.dagens.count)
            case .fullt:
                kvitto(rubrik: "Resan sparades inte", text: "Du har redan fem resor. Ta bort en under Favoriter, så står dagens resor kvar där.")
            case .fel:
                kvitto(rubrik: "Resan sparades inte", text: "Försök igen under Favoriter.")
            }
        case slang:
            fav.slang(id: id)
            taBort()
        default:   // ett vanligt tryck öppnar Favoriter med dagens resor överst
            fav.visaFliken = true
        }
    }

    private static func kvitto(rubrik: String, kvar: Int = 0, text: String? = nil) {
        let c = UNMutableNotificationContent()
        c.title = rubrik
        c.body = text ?? "Du ser läget längs den under Favoriter." +
            (kvar > 0 ? " \(kvar) \(kvar == 1 ? "resa" : "resor") till i dag att spara." : "")
        c.threadIdentifier = notisId
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [notisId])
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: notisId, content: c, trigger: nil))
    }

    static func taBort() {
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [notisId])
    }

    static func kmText(_ km: Double) -> String {
        km >= 10 ? "\(Int(km.rounded())) km" : String(format: "%.1f km", km).replacingOccurrences(of: ".", with: ",")
    }
}
