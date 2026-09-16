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
        let klockan = Date.now.formatted(.dateTime.hour().minute())
        for e in pending {
            var req = URLRequest(url: Facit.url)
            req.httpMethod = "POST"
            req.timeoutInterval = 10
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = Facit.body(e, app: "ios", ver: ver)
            do {
                let (data, resp) = try await URLSession.shared.data(for: req)
                let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
                if code == 204 { sent.append(e); continue }
                // Servern sa nej: skriv ut vad den sa, kortat — det är det testaren och Claude behöver se.
                prefs.facitStatus = "Kunde inte skicka \(klockan): HTTP \(code) \(String(data: data, encoding: .utf8).map { String($0.prefix(80)) } ?? "")"
                break
            } catch {
                prefs.facitStatus = "Kunde inte skicka \(klockan): \(error.localizedDescription.prefix(80))"
                break
            }
        }
        if !sent.isEmpty {
            prefs.facit = Facit.markSent(prefs.facit, sent)
            prefs.facitStatus = "Skickat \(klockan) (\(sent.count) svar)"
        }
        return sent.count
    }
}
