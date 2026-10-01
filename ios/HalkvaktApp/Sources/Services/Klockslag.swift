// Klockslag och datum på svenska, oavsett telefonens språk. Alla andra strängar i appen är svenska
// (CLAUDE.md: user-facing strings sv first), men `Date.formatted` följer telefonens locale — på Axels
// iPhone (engelsk) stod det "Senaste tur · 1 Oct at 12:39" under svensk text (skärmbild 1/10, kort #279).
// Samma locale ger också 24-timmarsklocka på en telefon som visar 12.
import Foundation

extension Date {
    private static let sv = Locale(identifier: "sv_SE")

    /// "13:16"
    var klockslag: String { formatted(.dateTime.hour().minute().locale(Date.sv)) }

    /// "1 okt. 12:39"
    var dagOchKlockslag: String { formatted(.dateTime.day().month(.abbreviated).hour().minute().locale(Date.sv)) }
}
