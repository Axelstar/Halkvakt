// #22 Autostart på iPhone — "Starta vakten" som App Intent.
//
// Apple låter inte appar starta sig själva när bilens Bluetooth kopplar (BACKLOG #22).
// Vägen runt är Genvägar: en personlig automation "När [bilen] ansluts → Kör 'Starta vakten'"
// som kör DIREKT, utan att fråga. Automationen kan bara trycka på intents som appen
// exponerar — den här är knappen.
//
// openAppWhenRun = true ÄR designen, inte en brist. Vakten behöver CoreLocation, och med
// "Vid användning" får platsuppdateringar bara startas i förgrunden. Appen tänds alltså,
// vakten startar, föraren lägger undan telefonen — bakgrundsläget (UIBackgroundModes:
// location) tar över när skärmen släcks. Med "Alltid" fungerar det likadant, bara tystare.
import AppIntents

struct StartGuardIntent: AppIntent {
    static let title: LocalizedStringResource = "Starta vakten"
    static let description = IntentDescription(
        "Startar Halkvakts röstvakt. Tänkt att köras av en Genvägar-automation när bilens Bluetooth ansluts."
    )
    static let openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let guardManager = GuardManager.shared
        if guardManager.running {
            return .result(dialog: "Vakten är redan igång.")
        }
        guardManager.requestPermissionAndStart()
        return .result(dialog: "Halkvakt vaktar.")
    }
}
