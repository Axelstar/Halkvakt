// Sändaren för förarfacit (S4). Skickar osända svar — och bara dem — till facit-svar.
// Anropas när bilen står stilla (GuardManager) eller när appen blir aktiv (HalkvaktApp): aldrig under
// körning, inga timers, ingen bakgrundspolling. Nätet borta ⇒ försök igen vid nästa stopp.
// Kort #203 lager 2: efter svaren skickas förarens valda missar till samma funktion (Missar.body).
import Foundation

enum FacitSender {
    /// Antalet svar och missar som gick iväg. 0 när betatestet är av eller inget väntar.
    @MainActor
    static func flush() async -> Int {
        let prefs = Prefs.shared
        guard prefs.facitOn else { return 0 }
        let pending = Facit.pending(prefs.facit)
        let missar = Missar.pending(prefs.missar)
        if pending.isEmpty && missar.isEmpty { return 0 }
        let ver = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "?"
        let klockan = Date.now.formatted(.dateTime.hour().minute())
        var sent: [FacitEntry] = []
        var sentMissar: [MissEntry] = []
        var fel: String?
        for e in pending {
            fel = await posta(Facit.body(e, app: "ios", ver: ver))
            if fel != nil { break }
            sent.append(e)
        }
        if fel == nil {
            for m in missar {
                fel = await posta(Missar.body(m, app: "ios", ver: ver))
                if fel != nil { break }
                sentMissar.append(m)
            }
        }
        if !sent.isEmpty { prefs.facit = Facit.markSent(prefs.facit, sent) }
        if !sentMissar.isEmpty { prefs.missar = Missar.markSent(prefs.missar, sentMissar) }
        let delar = [sent.isEmpty ? nil : "\(sent.count) svar", sentMissar.isEmpty ? nil : "\(sentMissar.count) missar"].compactMap { $0 }
        if let fel { prefs.facitStatus = "Kunde inte skicka \(klockan): \(fel)" }
        else if !delar.isEmpty { prefs.facitStatus = "Skickat \(klockan) (\(delar.joined(separator: ", ")))" }
        return sent.count + sentMissar.count
    }

    /// Ett anrop. nil = 204; annars felet i läsbar form — det testaren och Claude behöver se under knapparna.
    private static func posta(_ kropp: Data) async -> String? {
        var req = URLRequest(url: Facit.url)
        req.httpMethod = "POST"
        req.timeoutInterval = 10
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = kropp
        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
            if code == 204 { return nil }
            return "HTTP \(code) \(String(data: data, encoding: .utf8).map { String($0.prefix(80)) } ?? "")"
        } catch {
            return String(error.localizedDescription.prefix(80))
        }
    }
}
