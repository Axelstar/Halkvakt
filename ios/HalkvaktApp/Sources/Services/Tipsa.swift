// TIPSA EN VÄN, TYCK TILL OCH BETYGSÄTT (DECISIONS #829) — spegel av Tipsa.kt i Android, samma texter ordagrant.
// Inget här når nätet av sig självt: delningen går genom telefonens delningsark, åsikten genom förarens egen mejlapp,
// betyget genom App Store. Appens datasändning är oförändrad (CLAUDE.md, produktinvarianterna).
import Foundation

enum Tipsa {
    /// Länken bär kampanjkoden `r=dela`, som webbplatsens egen räknare redan räknar (integritet.html, Webbplatsen).
    static let lank = URL(string: "https://halkvakt.se/?r=dela")!
    static let text = "Jag kör med Halkvakt. Den säger till med rösten om halka, olyckor och vilt på vägen framför mig, innan jag är där."
    static let adress = "hej@halkvakt.se"
    static let betyg = URL(string: "https://apps.apple.com/app/id6806939784?action=write-review")!

    /// Kortet på Redo.: efter femte avslutade vaktpasset, tills föraren tipsat eller tryckt Inte nu. Aldrig medan vakten kör.
    static let passForeKortet = 5
    static func visaKortet(pass: Int, dold: Bool, vaktenKor: Bool) -> Bool {
        !dold && !vaktenKor && pass >= passForeKortet
    }

    /// Mejlet till hej@: ämne och tre tekniska rader som föraren ser och kan ta bort före Skicka. Ingen plats, inga resor.
    static func mejl(version: String, bygge: String, modell: String, system: String) -> URL {
        var c = URLComponents()
        c.scheme = "mailto"
        c.path = adress
        c.queryItems = [
            URLQueryItem(name: "subject", value: "Synpunkter på Halkvakt"),
            URLQueryItem(name: "body", value: "\n\n\n- - -\nDet här skickas med så att vi kan hjälpa dig:\nApp: Halkvakt \(version) (\(bygge))\nTelefon: \(modell)\nSystem: \(system)\nIngen plats och inga resor. Ta bort raderna om du vill.\n"),
        ]
        return c.url!
    }

    /// Telefonens modellnamn som systemet anger det (t.ex. iPhone15,2), utan att fråga något annat om telefonen.
    static var modell: String {
        var u = utsname()
        uname(&u)
        return withUnsafeBytes(of: &u.machine) { b in String(decoding: b.prefix { $0 != 0 }, as: UTF8.self) }
    }
}
