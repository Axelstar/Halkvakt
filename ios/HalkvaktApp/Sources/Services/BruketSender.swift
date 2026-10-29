// Sends finished days of app usage counts to appbruk (DECISIONS #746). Called when the app becomes active and when the guard stops,
// like FacitSender: never while driving, no timers, no background polling. Network gone ⇒ the days wait for the next time.
import Foundation
import HalkvaktEngine

@MainActor
enum BruketSender {
    static let url = URL(string: "https://xmpfztykhyvhmrzsnjrc.supabase.co/functions/v1/appbruk")!
    /// Two callers can arrive together (app active and guard stop); one sending is enough, and a day must not go twice.
    private static var skickar = false

    static func flush() async {
        let p = Prefs.shared
        guard p.bruketPa, !skickar else { return }
        skickar = true
        defer { skickar = false }
        let ver = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "?"
        for dag in Bruket.attSkicka(p.bruket, idag: Bruk.dag(.now)) {
            guard let r = p.bruket[dag] else { continue }
            guard await posta(Bruket.body(dag: dag, raknare: r, kanal: Bruk.kanal, ver: ver)) else { return }
            p.bruket = Bruket.utan(p.bruket, dag)
        }
    }

    /// true = 204, the day is stored.
    private static func posta(_ kropp: Data) async -> Bool {
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 10
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = kropp
        guard let (_, resp) = try? await URLSession.shared.data(for: req) else { return false }
        return (resp as? HTTPURLResponse)?.statusCode == 204
    }
}
