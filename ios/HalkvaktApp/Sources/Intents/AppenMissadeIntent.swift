// "Hej Siri, appen missade i Halkvakt" — en miss i ögonblicket, ett ord i stället för ett tryck (kort #203 lager 2; Axels ja,
// DECISIONS #267 punkt 3–4). Sparar klockslaget, närmaste station och halkavsnitt inom 2 km; vad det var väljs efter resan.
// Ingen mikrofonbehörighet: Siri lyssnar, inte appen. Ingenting skickas förrän föraren valt.
// 4a/4b (DECISIONS #461): ett andra "appen missade" inom en minut är samma miss, och när vakten är av vägrar Siri — en miss
// hör till en körning, och senaste positionen kan vara från en avslutad resa.
import AppIntents

struct AppenMissadeIntent: AppIntent {
    static let title: LocalizedStringResource = "Appen missade"
    static let description = IntentDescription("Markerar att Halkvakt var tyst här fast den borde ha varnat. Du väljer vad det var efter resan.")
    static let openAppWhenRun = false

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard Prefs.shared.facitOn else { return .result(dialog: "Slå på Betatest i Halkvakts inställningar först.") }
        switch GuardManager.shared.markeraMiss() {
        case .markerat: return .result(dialog: "Markerat. Välj vad det var efter resan.")
        case .redan: return .result(dialog: "Redan markerat.")
        case .vaktenAv: return .result(dialog: "Vakten är inte igång. En miss markeras under körningen.")
        case .ingenPosition: return .result(dialog: "Kunde inte markera — Halkvakt har ingen position än.")
        }
    }
}
