// Platsdelningen (DECISIONS #917, #918). Spegel av servern: supabase/functions/app-enhet och sql/130_app_enhet.sql.
//
// VAD SOM LÄMNAR TELEFONEN, och bara efter förarens ja: {id, app, kommun, erbj, token} till app-enhet. id är slumpat här i appen,
// kommun är koden för kommunen telefonen senast var i, räknad i telefonen ur Kommunkarta. Aldrig koordinater, aldrig en resa.
// token är notisadressen Apple ger appen på den här telefonen (DECISIONS #924), och den följer bara med när föraren också har
// tillåtit notiser. Utan den går det inte att skicka en notis hit.
// Servern sparar en rad per id och skriver över den; Radera min data tar bort den.
// Bara i TestFlight och i utvecklarbyggen tills orden är bytta överallt (#918): ett App Store-bygge frågar inte och skickar inget.
// Skickas när bilen står: appen öppnas, vakten stannar eller föraren svarar. Aldrig under körning, inga timers (som Raknare).
import Foundation
import CoreLocation
import UIKit
import UserNotifications
import Observation
import HalkvaktEngine

/// Orden om platsen. Utanför MainActor, så att vyernas statiska texter kan läsa dem.
enum Platsord {
    /// TestFlight känns igen på kvittots namn, som betatestet (#681).
    static let testbygge: Bool = {
        #if DEBUG
        return true
        #else
        return Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt"
        #endif
    }()
    /// Meningen som står på Redo, i introduktionen och under Integritet. App Store-bygget bär den gamla tills platsdelningen släpps.
    static let lofte = testbygge
        ? "Din exakta position skickas aldrig till Halkvakt av sig själv."
        : "Din position skickas aldrig till Halkvakt av sig själv."
    static let nyttLofte = "Din exakta position skickas inte till Halkvakt."
}

@MainActor
@Observable
final class Platsdelning {
    static let shared = Platsdelning()
    static let url = URL(string: "https://xmpfztykhyvhmrzsnjrc.supabase.co/functions/v1/app-enhet")!
    static let tillaten = Platsord.testbygge

    enum Svar: String { case ja, nej }

    @ObservationIgnored private let d = UserDefaults.standard
    /// nil = föraren har inte fått frågan.
    var svar: Svar? { didSet { d.set(svar?.rawValue, forKey: "k.plats.svar") } }
    var erbjudanden: Bool {
        didSet {
            d.set(erbjudanden, forKey: "k.plats.erbjudanden")
            if oldValue != erbjudanden { andrad = true; uppdatera() }
        }
    }
    private(set) var id: String? { didSet { d.set(id, forKey: "k.plats.id") } }
    private(set) var kommun: String? { didSet { d.set(kommun, forKey: "k.plats.kommun") } }
    private(set) var kommunNamn: String? { didSet { d.set(kommunNamn, forKey: "k.plats.kommunNamn") } }
    private(set) var skickad: Date? { didSet { d.set(skickad, forKey: "k.plats.skickad") } }
    /// Notisadressen från Apple, som hex. nil tills föraren tillåtit notiser och Apple svarat.
    private(set) var notisadress: String? { didSet { d.set(notisadress, forKey: "k.plats.notisadress") } }
    /// Senaste försöket föll. Raden under Din data säger det, och nästa tillfälle försöker igen.
    private(set) var sandningFel = false

    @ObservationIgnored private var andrad = false
    @ObservationIgnored private var pagar = false
    @ObservationIgnored private lazy var karta: Kommunkarta? = Bundle.main.url(forResource: "kommuner", withExtension: "json")
        .flatMap { try? Data(contentsOf: $0) }
        .flatMap { try? Kommunkarta(data: $0) }

    var skaFraga: Bool { Self.tillaten && svar == nil }
    /// Bladet med frågan (DECISIONS #979). RootView visar det; raden på startsidan, notisen och Din data öppnar det.
    var visaBladet = false
    /// Bladet har öppnats av sig självt en gång. Sedan öppnas det bara när föraren trycker.
    @ObservationIgnored private var bladVisat: Bool {
        get { d.bool(forKey: "k.plats.bladVisat") }
        set { d.set(newValue, forKey: "k.plats.bladVisat") }
    }
    @ObservationIgnored private var notisSkickad: Bool {
        get { d.bool(forKey: "k.plats.fragenotis") }
        set { d.set(newValue, forKey: "k.plats.fragenotis") }
    }
    static let fragenotis = "halkvakt.foreresan.fragan"

    private init() {
        svar = d.string(forKey: "k.plats.svar").flatMap(Svar.init(rawValue:))
        // Valet om erbjudanden är borta ur appen (DECISIONS #979 punkt 3). Den som sa ja i ett tidigare testbygge har ingen
        // växlare att stänga av med längre, så värdet nollas och raden skickas om.
        erbjudanden = false
        if d.bool(forKey: "k.plats.erbjudanden") { d.set(false, forKey: "k.plats.erbjudanden"); andrad = true }
        id = d.string(forKey: "k.plats.id")
        kommun = d.string(forKey: "k.plats.kommun")
        kommunNamn = d.string(forKey: "k.plats.kommunNamn")
        skickad = d.object(forKey: "k.plats.skickad") as? Date
        notisadress = d.string(forKey: "k.plats.notisadress")
    }

    func svara(ja: Bool, erbjudanden: Bool = false) {
        if ja, id == nil { id = UUID().uuidString.lowercased() }
        svar = ja ? .ja : .nej
        self.erbjudanden = ja && erbjudanden
        andrad = true
        uppdatera()
    }

    /// Appen öppnas av den som redan gått igenom introduktionen och inte fått frågan: bladet visas en gång (#979 fall 1).
    func appenOppnad() {
        guard skaFraga, !bladVisat else { return }
        bladVisat = true
        visaBladet = true
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [Self.fragenotis])
    }

    /// En resa är slut och bilen står (#979 fall 2): den som inte har sett bladet får en notis, en gång. Ett tryck öppnar bladet.
    func resanSlut() {
        guard skaFraga, !bladVisat, !notisSkickad else { return }
        notisSkickad = true
        Task {
            guard await HeadsUpService.shared.status() == .authorized else { return }
            let c = UNMutableNotificationContent()
            c.title = Foreresanord.notisRubrik
            c.body = Foreresanord.notisText
            c.userInfo = ["slag": "fragan"]
            try? await UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: Self.fragenotis, content: c, trigger: nil))
        }
    }

    /// Räknar kommunen ur senast kända position och skickar raden om den är ny, ändrad eller äldre än ett dygn.
    /// Ett dygn: servern gallrar en rad som inte hört av sig på 30 dygn.
    func uppdatera() {
        guard Self.tillaten, svar == .ja, !GuardManager.shared.running else { return }
        begarAdress()
        let plats = GuardManager.shared.lastLoc
            ?? CLLocationManager().location.map { (lon: $0.coordinate.longitude, lat: $0.coordinate.latitude) }
        if let plats, let k = karta?.kommun(lon: plats.lon, lat: plats.lat), k.k != kommun {
            kommun = k.k
            kommunNamn = k.n
            andrad = true
        }
        guard kommun != nil else { return }
        let gammal = skickad.map { Date.now.timeIntervalSince($0) > 86_400 } ?? true
        if andrad || gammal { Task { await skicka() } }
    }

    /// Ber Apple om notisadressen när föraren har tillåtit notiser. Svaret kommer till Appdelegat, som anropar nyAdress.
    private func begarAdress() {
        Task {
            guard await HeadsUpService.shared.status() == .authorized else { return }
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    /// Apple har gett appen en notisadress. Skickas med raden om den är ny.
    func nyAdress(_ hex: String) {
        guard Self.tillaten, svar == .ja, hex != notisadress else { return }
        notisadress = hex
        andrad = true
        uppdatera()
    }

    private func skicka() async {
        guard Raknare.aktiv, !pagar, let id, let kommun else { return }
        pagar = true
        defer { pagar = false }
        var kropp: [String: Any] = ["id": id, "app": "ios", "kommun": kommun, "erbj": erbjudanden]
        if let notisadress { kropp["token"] = notisadress }
        if await anropa("POST", kropp) == 204 {
            skickad = .now
            andrad = false
            sandningFel = false
        } else {
            sandningFel = true
        }
    }

    /// Radera min data: raden tas bort på servern och allt om den i telefonen. Svaret blir nej, så inget skickas igen.
    /// Falskt när servern inte gick att nå; då står allt kvar, så att föraren kan försöka igen.
    func radera() async -> Bool {
        if Raknare.aktiv, let id, await anropa("DELETE", ["id": id]) != 204 { return false }
        id = nil
        kommun = nil
        kommunNamn = nil
        skickad = nil
        notisadress = nil
        UIApplication.shared.unregisterForRemoteNotifications()
        sandningFel = false
        svar = .nej
        erbjudanden = false
        andrad = false
        return true
    }

    private func anropa(_ metod: String, _ kropp: [String: Any]) async -> Int {
        var req = URLRequest(url: Self.url)
        req.httpMethod = metod
        req.timeoutInterval = 10
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: kropp)
        guard let svar = try? await URLSession.shared.data(for: req) else { return 0 }
        return (svar.1 as? HTTPURLResponse)?.statusCode ?? 0
    }
}
