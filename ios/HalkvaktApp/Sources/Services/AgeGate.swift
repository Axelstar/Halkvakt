// Åldersvakten — Swift-tvilling av android AgeGate.kt. Håll trösklarna i takt.
import Foundation
import HalkvaktEngine

enum AgeGate {
    static let weatherMaxMin: Double = 45
    static let accidentMaxMin: Double = 120
    static let staleLine = "Ingen färsk väglagsdata – kör som om det kan vara halt."

    struct Result { let hazards: [Hazard]; let stale: Bool }

    static func filter(_ hazards: [Hazard], generatedAt: Date, now: Date) -> Result {
        let ageMin = now.timeIntervalSince(generatedAt) / 60
        if ageMin < weatherMaxMin { return Result(hazards: hazards, stale: false) }
        let keepAccidents = ageMin < accidentMaxMin
        let kept = hazards.filter { h in
            switch h {
            case .segment: return false
            case .point(_, let kind, _, _, _, _):
                switch kind {
                case .icing_point: return false
                case .accident: return keepAccidents
                case .wildlife: return keepAccidents   // #318: djuren är läget nu, åldras som olyckorna
                default: return true
                }
            }
        }
        return Result(hazards: kept, stale: true)
    }
}
