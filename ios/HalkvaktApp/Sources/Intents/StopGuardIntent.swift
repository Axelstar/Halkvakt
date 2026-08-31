// Motsvarigheten till StartGuardIntent för automationen "När [bilen] kopplas från".
// Spegel av Androids onAclDisconnected → STOP: vakten som startades automatiskt
// ska också sluta automatiskt, annars drar den batteri på parkeringen.
import AppIntents

struct StopGuardIntent: AppIntent {
    static let title: LocalizedStringResource = "Stoppa vakten"
    static let description = IntentDescription(
        "Stoppar Halkvakts röstvakt. Tänkt att köras av en Genvägar-automation när bilens Bluetooth kopplas från."
    )
    // Stopp behöver ingen förgrund: inget att starta, bara att släcka.
    static let openAppWhenRun = false

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let guardManager = GuardManager.shared
        guard guardManager.running else {
            return .result(dialog: "Vakten var inte igång.")
        }
        guardManager.stop()
        return .result(dialog: "Halkvakt vilar.")
    }
}
