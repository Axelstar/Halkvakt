// Gör intents synliga i Genvägar-appen och för Siri utan att användaren behöver
// leta: "Starta Halkvakt" / "Stoppa Halkvakt". Frasen måste innehålla appnamnet
// (Apples regel), därav .applicationName.
import AppIntents

struct HalkvaktShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: StartGuardIntent(),
            phrases: [
                "Starta \(.applicationName)",
                "Starta vakten i \(.applicationName)",
            ],
            shortTitle: "Starta vakten",
            systemImageName: "car.fill"
        )
        AppShortcut(
            intent: StopGuardIntent(),
            phrases: [
                "Stoppa \(.applicationName)",
                "Stoppa vakten i \(.applicationName)",
            ],
            shortTitle: "Stoppa vakten",
            systemImageName: "car"
        )
    }
}
