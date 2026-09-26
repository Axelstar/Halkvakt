// "Hej Siri, stämde inte i Halkvakt" — svar på den senaste varningen, under resan, med händerna på ratten (kort #203 lager 2;
// Axels ja, DECISIONS #267 punkt 3: de två första fraserna — "stämde" behövs inte under körning, det är låsskärmen till för).
// Ingen mikrofonbehörighet: Siri lyssnar, inte appen. Svaret sparas som alla andra och skickas när bilen står stilla.
import AppIntents

struct StamdeInteIntent: AppIntent {
    static let title: LocalizedStringResource = "Stämde inte"
    static let description = IntentDescription("Svarar Stämde inte på Halkvakts senaste varning, om den är yngre än tio minuter.")
    static let openAppWhenRun = false
    /// Äldre än så är inte "varningen jag just hörde" — då gissar Siri, och en gissning är inget facit.
    static let maxAlder: TimeInterval = 10 * 60

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let p = Prefs.shared
        guard p.facitOn else { return .result(dialog: "Slå på Betatest i Halkvakts inställningar först.") }
        guard let id = p.lastSaidId, let at = p.lastSaidAt, Date.now.timeIntervalSince(at) < Self.maxAlder else {
            return .result(dialog: "Ingen varning de senaste tio minuterna.")
        }
        p.facit = Facit.answer(p.facit, id: id, t: at, svar: false)
        return .result(dialog: "Tack.")
    }
}
