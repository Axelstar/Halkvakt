// #22 Autostart på iPhone — "Starta vakten" som App Intent.
//
// Apple låter inte appar starta sig själva när bilen kopplar (BACKLOG #22). Vägen runt är
// Genvägar: en personlig automation som kör DIREKT och trycker på det här intentet.
// Utlösaren är användarens val — Bluetooth, Fokus "Kör", kartappen öppnas, laddaren.
//
// ForegroundContinuableIntent (iOS 17) i stället för openAppWhenRun, av en anledning:
// utlösaren "när Google Maps öppnas" får INTE leda till att Halkvakt lägger sig över
// kartan. Så perform() kör i bakgrunden när det går — dvs. när platsbehörigheten är
// "Alltid", för då får CoreLocation startas utan förgrund — och ber om förgrunden bara
// när den måste: vid "Vid användning" eller när tillstånd saknas. Det är Apples egen
// modell för exakt det här: starta tyst om du kan, visa dig om du måste.
import AppIntents
import CoreLocation

struct StartGuardIntent: ForegroundContinuableIntent {
    static let title: LocalizedStringResource = "Starta vakten"
    static let description = IntentDescription(
        "Startar Halkvakts röstvakt. Tänkt att köras av en Genvägar-automation: när bilens Bluetooth ansluts, när Fokus Kör slås på, eller när kartappen öppnas."
    )

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let guardManager = GuardManager.shared
        // Kvittot (DECISIONS #39): guiden kan visa "automationen fungerar — startade HH:mm".
        // Apple låter oss inte läsa om automationen finns, men vi vet när den TRYCKT på oss.
        Prefs.shared.lastIntentStartAt = .now
        if guardManager.running {
            return .result(dialog: "Vakten är redan igång.")
        }
        // "Alltid" ⇒ tyst start i bakgrunden; kartan stannar kvar på skärmen.
        if CLLocationManager().authorizationStatus == .authorizedAlways {
            guardManager.requestPermissionAndStart()
            return .result(dialog: "Halkvakt vaktar.")
        }
        // Annars måste appen synas för att platsen ska få starta (eller för att fråga).
        try await requestToContinueInForeground(
            "Halkvakt behöver visas en kort stund för att starta vakten."
        )
        guardManager.requestPermissionAndStart()
        return .result(dialog: "Halkvakt vaktar.")
    }
}
