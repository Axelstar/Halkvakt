// Appens anonyma dagsräknare (DECISIONS #772; Axel och Bengt 1/11). Spegel av Androids Raknare.kt.
//
// VAD SOM LÄMNAR TELEFONEN, och inget annat: ett ord per händelse — {h, v, app} — till app-raknare, som räknar upp EN rad
// per dygn, app, händelse och värde. Ingen position, ingen resa, inget enhets-id, ingen version, ingen tid. Det som finns på
// servern är "i dag valde 14 iPhone-ägare Alltid", aldrig vem. Alltid på (variant A); står i integritet.html och i appens
// Integritet. Fyra händelser:
//   onboarding_klar    introduktionen gick igenom
//   behorighet         platsbehörigheten blev alltid | nar | nekad
//   vakt_startad       vakten startade: hand (knappen eller intentet) | sjalv (vaknade själv vid körning)
//   forsta_varningen   första repliken någonsin på enheten
// En gång per enhet och värde, utom vakt_startad som räknas varje gång (också en omstart efter ett kvartsstopp).
// Skickas när vakten inte kör — introduktionen, behörighetsrutan, appen öppnas — och annars när vakten stannar: aldrig under
// körning, inga timers (samma disciplin som FacitSender). Nätet borta ⇒ kön står kvar till nästa tillfälle.
import Foundation
import CoreLocation

struct RaknadHandelse: Codable, Equatable, Sendable {
    let h: String
    let v: String
}

enum Raknare {
    static let url = URL(string: "https://xmpfztykhyvhmrzsnjrc.supabase.co/functions/v1/app-raknare")!
    static let maxKo = 50

    @MainActor static func onboardingKlar() { raknaEnGang("onboarding_klar") }
    @MainActor static func forstaVarningen() { raknaEnGang("forsta_varningen") }

    @MainActor static func behorighet(_ status: CLAuthorizationStatus) {
        switch status {
        case .authorizedAlways: raknaEnGang("behorighet", "alltid")
        case .authorizedWhenInUse: raknaEnGang("behorighet", "nar")
        case .denied, .restricted: raknaEnGang("behorighet", "nekad")
        default: break   // notDetermined: inget val gjort
        }
    }

    /// Varje start räknas; sjalv = självväckningen, hand = knappen, intentet eller automationen.
    @MainActor static func vaktStartad(sjalv: Bool) { lagg("vakt_startad", sjalv ? "sjalv" : "hand") }

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
        for e in prefs.raknareKo {
            guard await posta(e) else { break }
            sent += 1
        }
        if sent > 0 { prefs.raknareKo = Array(prefs.raknareKo.dropFirst(sent)) }
        return sent
    }

    private static func posta(_ e: RaknadHandelse) async -> Bool {
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 10
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONEncoder().encode(["h": e.h, "v": e.v, "app": "ios"])
        guard let svar = try? await URLSession.shared.data(for: req) else { return false }
        let code = (svar.1 as? HTTPURLResponse)?.statusCode ?? 0
        return code == 204 || code == 400   // 400 = servern känner inte ordet: kasta, kön får inte fastna bakom det
    }
}
