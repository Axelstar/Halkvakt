// Notiser från servern (app-push, DECISIONS #924, #926). Slaget står i notisens userInfo under "slag": prov, varning eller
// erbjudande. Ett tryck på en varning eller ett prov öppnar startsidan med kartan Nära dig. Ett tryck på ett erbjudande öppnar
// ett blad som säger vem det kommer från och har en länk dit. Under körning öppnas inget erbjudande.
import Foundation
import Observation

@MainActor
@Observable
final class Servernotis {
    static let shared = Servernotis()

    struct Erbjudande: Identifiable {
        let id = UUID()
        let rubrik: String
        let text: String
        let partner: String
        let lank: URL
    }

    /// Bladet som RootView visar.
    var erbjudande: Erbjudande?
    /// RootView går till startsidan och nollställer.
    var visaStart = false

    private init() {}

    func tryckt(slag: String, rubrik: String, text: String, partner: String?, lank: String?) {
        if slag == "erbjudande" {
            guard !GuardManager.shared.running, let partner, let url = lank.flatMap(URL.init(string:)), url.scheme == "https" else { return }
            erbjudande = Erbjudande(rubrik: rubrik, text: text, partner: partner, lank: url)
        } else if slag == "fragan" {
            // Frågan om varningen före resan (DECISIONS #979 fall 2): startsidan med bladet över.
            guard !GuardManager.shared.running else { return }
            visaStart = true
            Platsdelning.shared.visaBladet = true
        } else {
            visaStart = true
        }
    }
}
