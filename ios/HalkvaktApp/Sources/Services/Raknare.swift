// Appens anonyma dagsräknare (DECISIONS #772; Axel och Bengt 1/11; sex områden DECISIONS #787, 3/11). Spegel av Androids Raknare.kt.
//
// VAD SOM LÄMNAR TELEFONEN, och inget annat: ett ord per händelse — {h, v, app, ver, k} — till app-raknare, som räknar upp EN
// rad per dygn, app, version, kohort, händelse och värde. Ingen position, ingen sträcka, inget enhets-id, ingen tid. Det som
// finns på servern är "i dag valde 14 iPhone-ägare Alltid", aldrig vem. Alltid på (variant A); står i integritet.html och i
// appens Integritet. ver = appens version; k = ny (telefonen började räkna med en tom app) eller befintlig (den hade appen förut).
// Händelserna, i sex områden (värdelistan bor i supabase/functions/app-raknare/index.ts):
//   1 vägen in       onboarding_klar, behorighet (alltid | nar | nekad), notiser (pa | nekad), forsta_starten, forsta_varningen
//   2 aktiva förare  aktiv_dag: en gång per dygn som vakten gick, med dagar sedan telefonen började räkna (0 | 1-7 | 8-30 | over30)
//   3 vaktpasset     vakt_startad (hand | sjalv) och resa_slut start:längd:slut — sjalv|knapp|intent, längd i fyra hinkar
//                    (okand när appen dog mitt i), parkerad|hand|avbruten. Aldrig sträcka.
//   4 varningarna    varning fara:avstånd i hinkar, varning_ersatt (faran vars kort byttes ut), banner (visad | tyst)
//   5 inställningar  installning fara:pa|av, forvarning:400|800|1200, autostart:pa|av
//   6 fel            plats_borta, gammal_data, hamtning_fel — en gång per vaktpass och sort
// En gång per enhet och värde för område 1; resten räknas när det händer.
// Skickas när vakten inte kör — introduktionen, behörighetsrutan, appen öppnas — och annars när vakten stannar: aldrig under
// körning, inga timers (samma disciplin som FacitSender). Nätet borta ⇒ kön står kvar till nästa tillfälle.
import Foundation
import CoreLocation
import UserNotifications

struct RaknadHandelse: Codable, Equatable, Sendable {
    let h: String
    let v: String
}

/// Hur vaktpasset startade (#787): självväckningen, knappen, eller intentet (Siri, Genvägar, automationen).
enum Startmetod: String, Sendable { case sjalv, knapp, intent }

enum Raknare {
    static let url = URL(string: "https://xmpfztykhyvhmrzsnjrc.supabase.co/functions/v1/app-raknare")!
    static let maxKo = 50

    @MainActor static func onboardingKlar() { raknaEnGang("onboarding_klar") }
    @MainActor static func forstaVarningen() { raknaEnGang("forsta_varningen") }

    static let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""

    /// Notistillståndet som appen ser det när den öppnas (#787). notDetermined: inget val gjort.
    @MainActor static func notiser(_ status: UNAuthorizationStatus) {
        switch status {
        case .authorized, .provisional, .ephemeral: raknaEnGang("notiser", "pa")
        case .denied: raknaEnGang("notiser", "nekad")
        default: break
        }
    }

    @MainActor static func behorighet(_ status: CLAuthorizationStatus) {
        switch status {
        case .authorizedAlways: raknaEnGang("behorighet", "alltid")
        case .authorizedWhenInUse: raknaEnGang("behorighet", "nar")
        case .denied, .restricted: raknaEnGang("behorighet", "nekad")
        default: break   // notDetermined: inget val gjort
        }
    }

    /// Varje start räknas; sjalv = självväckningen, hand = knappen, intentet eller automationen.
    /// Ett pass som aldrig fick sitt slut (appen dog under körning) räknas först, som avbrutet (#787).
    @MainActor static func vaktStartad(_ metod: Startmetod) {
        guard aktiv else { return }
        let p = Prefs.shared
        if let gammal = p.raknarePass?.split(separator: "|").first { lagg("resa_slut", "\(gammal):okand:avbruten") }
        p.raknarePass = "\(metod.rawValue)|\(Date.now.timeIntervalSince1970)"
        felIPasset = []
        lagg("vakt_startad", metod == .sjalv ? "sjalv" : "hand")
        raknaEnGang("forsta_starten")
        let dag = Self.dagFormat.string(from: .now)
        if p.raknareAktivDag != dag {
            p.raknareAktivDag = dag
            lagg("aktiv_dag", dagarHink(Date.now.timeIntervalSince(p.raknareForst)))
        }
    }

    /// Passet slutade: parkerad = självstoppet efter en kvart, hand = knappen eller intentet (#787). Bara längden i hinkar.
    @MainActor static func vaktStoppad(parkerad: Bool) {
        guard aktiv, let pass = Prefs.shared.raknarePass else { return }
        Prefs.shared.raknarePass = nil
        let delar = pass.split(separator: "|")
        guard delar.count == 2, let t0 = Double(delar[1]) else { return }
        lagg("resa_slut", "\(delar[0]):\(langdHink(Date.now.timeIntervalSince1970 - t0)):\(parkerad ? "parkerad" : "hand")")
    }

    /// Rösten talade (#787): faran och avståndet i hinkar; och faran vars kort byttes ut, om ett kort syntes.
    @MainActor static func varning(_ kind: String, avstandM: Int, ersatte: String?) {
        lagg("varning", "\(kind):\(avstandHink(avstandM))")
        if let ersatte { lagg("varning_ersatt", ersatte) }
    }

    @MainActor static func banner(visad: Bool) { lagg("banner", visad ? "visad" : "tyst") }

    /// Föraren ändrade en inställning (#787): fara:pa|av, forvarning:400|800|1200, autostart:pa|av.
    @MainActor static func installning(_ v: String) { lagg("installning", v) }

    /// Något gick fel under passet (#787): plats_borta | gammal_data | hamtning_fel. En gång per pass och sort.
    @MainActor private static var felIPasset: Set<String> = []
    @MainActor static func fel(_ v: String) {
        guard Prefs.shared.raknarePass != nil, felIPasset.insert(v).inserted else { return }
        lagg("fel", v)
    }

    static func dagarHink(_ s: TimeInterval) -> String {
        let d = Int(s / 86_400)
        return d <= 0 ? "0" : d <= 7 ? "1-7" : d <= 30 ? "8-30" : "over30"
    }
    static func langdHink(_ s: TimeInterval) -> String {
        s < 180 ? "under3" : s < 900 ? "3-15" : s < 2700 ? "15-45" : "over45"
    }
    static func avstandHink(_ m: Int) -> String {
        m < 400 ? "under400" : m < 800 ? "400-800" : m < 1200 ? "800-1200" : m < 3000 ? "1200-3000" : "over3000"
    }
    private static let dagFormat: DateFormatter = {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; f.locale = Locale(identifier: "sv_SE")
        f.timeZone = TimeZone(identifier: "Europe/Stockholm"); return f
    }()

    @MainActor private static func raknaEnGang(_ h: String, _ v: String = "") {
        let nyckel = v.isEmpty ? h : "\(h):\(v)"
        guard aktiv, !Prefs.shared.raknat.contains(nyckel) else { return }   // ett debugbygge får inte "minnas" ett ord det aldrig skickade
        Prefs.shared.raknat.append(nyckel)
        lagg(h, v)
    }

    /// Utvecklarbyggen räknas inte: Xcode-körningar och fotostudion (samma regel som Android, där emulatorn i CI gav rader 1/11).
    /// TestFlight- och App Store-byggen är release.
    static let aktiv: Bool = {
        #if DEBUG
        return false
        #else
        return true
        #endif
    }()

    @MainActor private static func lagg(_ h: String, _ v: String) {
        guard aktiv else { return }
        let prefs = Prefs.shared
        prefs.raknareKo.append(RaknadHandelse(h: h, v: v))
        if prefs.raknareKo.count > maxKo { prefs.raknareKo = Array(prefs.raknareKo.suffix(maxKo)) }
        if !GuardManager.shared.running { Task { await flush() } }   // bilen står stilla — annars vid stoppet
    }

    /// Skickar kön, en händelse per anrop, och stannar vid första felet. Antalet som gick iväg.
    /// En sändning i taget: två samtidiga (appen öppnas + behörighetsrutan) hade skickat samma rad två gånger.
    @MainActor private static var pagar = false
    @MainActor @discardableResult
    static func flush() async -> Int {
        guard !pagar else { return 0 }
        pagar = true
        defer { pagar = false }
        let prefs = Prefs.shared
        var sent = 0
        let k = prefs.raknareBefintlig ? "befintlig" : "ny"
        for e in prefs.raknareKo {
            guard await posta(e, k: k) else { break }
            sent += 1
        }
        if sent > 0 { prefs.raknareKo = Array(prefs.raknareKo.dropFirst(sent)) }
        return sent
    }

    private static func posta(_ e: RaknadHandelse, k: String) async -> Bool {
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 10
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONEncoder().encode(["h": e.h, "v": e.v, "app": "ios", "ver": version, "k": k])
        guard let svar = try? await URLSession.shared.data(for: req) else { return false }
        let code = (svar.1 as? HTTPURLResponse)?.statusCode ?? 0
        return code == 204 || code == 400   // 400 = servern känner inte ordet: kasta, kön får inte fastna bakom det
    }
}
