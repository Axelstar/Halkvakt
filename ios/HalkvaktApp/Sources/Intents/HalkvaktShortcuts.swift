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
        // Kort #203 lager 2 (Axels ja, DECISIONS #267 punkt 3): de två fraserna som inte kan vänta till efter resan.
        AppShortcut(
            intent: StamdeInteIntent(),
            phrases: ["Stämde inte i \(.applicationName)"],
            shortTitle: "Stämde inte",
            systemImageName: "hand.thumbsdown"
        )
        AppShortcut(
            intent: AppenMissadeIntent(),
            phrases: ["Appen missade i \(.applicationName)", "Halt här i \(.applicationName)"],
            shortTitle: "Appen missade",
            systemImageName: "exclamationmark.bubble"
        )
    }
}
