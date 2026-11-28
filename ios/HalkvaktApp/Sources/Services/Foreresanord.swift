// Orden på frågan om varningen före resan (DECISIONS #979, #980). Samlade här, eftersom de läses av en jurist och ska kunna
// bytas utan att skärmarna byggs om. Frågan visas bara där Platsdelning.tillaten är sann.
import Foundation

enum Foreresanord {
    static let rubrik = "Vill du ha en varning innan du kör?"
    static let text = "När det är halt i din kommun säger Halkvakt till före resan."
    static let exempelRubrik = "Exempel på notis"
    static let exempel = "Risk för halka i din kommun i morse. Kör försiktigt."
    /// Vad som sparas, i tre rader.
    static let sparas = [
        "Vi sparar din kommun och en kod som gör att notisen hittar den här telefonen",
        "Kopplat till ett slumpat nummer som appen hittar på. Vi vet inte vem du är",
        "Tas bort när du vill under Integritet, eller när du inte har använt appen på 30 dagar",
    ]
    static let fot = "Lagerlöf Labs HB ansvarar för uppgifterna. De används till varningen före resan och till statistik per kommun. Säger du nej fungerar Halkvakt som i dag. Vill vi spara något mer frågar vi först."
    static let policyLank = "Läs integritetspolicyn"
    static let policy = URL(string: "https://halkvakt.se/integritet.html")!
    static let ja = "Ja, varna mig"
    static let nej = "Inte nu"
    /// Står på frågan tills servern skickar notiser av sig själv. nil när de gör det.
    static let intePaAn: String? = "Testbygge: notiserna är inte påslagna än."

    // Raden på startsidan (DECISIONS #979 punkt 5, #981 punkt 5).
    static let rad = "Varning före resan"
    static let radNytt = "Nytt"
    static let radPa = "På"
    static let radAv = "Av"
    static let radAvNotiser = "Av · notiser avstängda"

    // Bladet för den som redan har appen (#979 punkt 4).
    static let bladEtikett = "Nytt i Halkvakt"
    /// Fall 3: föraren har sagt ja men nekat notiser i telefonen.
    static let notiserAvRubrik = "Notiserna är avstängda"
    static let notiserAvText = "Varningen före resan är en notis. Slå på notiser för Halkvakt i telefonens inställningar, så kommer den fram."
    static let notiserAvKnapp = "Öppna Inställningar"
    /// Varningen är på: bladet visar läget och var den stängs av.
    static let paRubrik = "Varningen före resan är på"
    static let paText = "Du stänger av den under Inställningar, Din data, med Radera min data."
    static let klar = "Klar"
    /// Fall 2: notisen telefonen skickar till sig själv när en resa är slut, en gång.
    static let notisRubrik = "Nytt i Halkvakt"
    static let notisText = "Vill du ha en varning innan du kör, när det är halt i din kommun? Tryck för att välja."
}
