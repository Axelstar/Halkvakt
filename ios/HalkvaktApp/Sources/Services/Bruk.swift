// App usage counts, iOS only (DECISIONS #746). The thin app side of HalkvaktEngine/Bruket.swift: which day it is, which build,
// and the switch "Dela anonym statistik". Counting only touches the phone; BruketSender sends finished days.
import Foundation
import HalkvaktEngine

@MainActor
enum Bruk {
    /// What a new install starts with. #746 decides it; the switch under Integritet changes it.
    static let standard = true

    static func rakna(_ namn: String) {
        let p = Prefs.shared
        guard p.bruketPa else { return }
        p.bruket = Bruket.rakna(p.bruket, namn, dag: dag(.now))
    }

    /// The app became active: one "oppnad", and the settings that held today.
    static func oppnad(alltid: Bool) {
        let p = Prefs.shared
        guard p.bruketPa else { return }
        let idag = dag(.now)
        var d = Bruket.rakna(p.bruket, "oppnad", dag: idag)
        let lage = [("lage_alltid", alltid), ("lage_sjalvstart", p.autoWake), ("lage_intro_klar", p.onboardingDone),
                    ("av_olycka", !p.accident), ("av_halka", !p.slippery), ("av_frysrisk", !p.icing),
                    ("av_vilt", !p.wildlife), ("av_kamera", !p.camera)]
        for (namn, sant) in lage where sant { d = Bruket.satt(d, namn, dag: idag) }
        p.bruket = d
    }

    /// The Swedish calendar day, YYYY-MM-DD.
    static func dag(_ t: Date) -> String {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "Europe/Stockholm") ?? .current
        let k = cal.dateComponents([.year, .month, .day], from: t)
        return String(format: "%04d-%02d-%02d", k.year ?? 0, k.month ?? 0, k.day ?? 0)
    }

    /// Our own builds are counted but kept apart: the statistics page shows "appstore" unless asked for more.
    static var kanal: String {
        #if DEBUG
        return "debug"
        #else
        return Prefs.betatestTillaten ? "testflight" : "appstore"
        #endif
    }
}
