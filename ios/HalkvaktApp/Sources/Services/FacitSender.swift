// Sändaren för förarfacit (S4). Skickar osända svar — och bara dem — till facit-svar.
// Anropas när bilen står stilla (GuardManager) eller när appen blir aktiv (HalkvaktApp): aldrig under
// körning, inga timers, ingen bakgrundspolling. Nätet borta ⇒ försök igen vid nästa stopp.
import Foundation

enum FacitSender {
    /// Antalet svar som gick iväg. 0 när betatestet är av eller inget väntar.
    @MainActor
    static func flush() async -> Int {
        let prefs = Prefs.shared
        guard prefs.facitOn else { return 0 }
        let pending = Facit.pending(prefs.facit)
        if pending.isEmpty { return 0 }
        let ver = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "?"
        var sent: [FacitEntry] = []
        for e in pending {
            var req = URLRequest(url: Facit.url)
            req.httpMethod = "POST"
            req.timeoutInterval = 10
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = Facit.body(e, app: "ios", ver: ver)
            guard let (_, resp) = try? await URLSession.shared.data(for: req),
                  (resp as? HTTPURLResponse)?.statusCode == 204 else { break }
            sent.append(e)
        }
        if !sent.isEmpty { prefs.facit = Facit.markSent(prefs.facit, sent) }
        return sent.count
    }
}
