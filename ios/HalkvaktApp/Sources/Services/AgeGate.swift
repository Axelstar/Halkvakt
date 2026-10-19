// Åldersvakten — Swift-tvilling av android AgeGate.kt. Håll trösklarna i takt.
import Foundation
import HalkvaktEngine

enum AgeGate {
    static let weatherMaxMin: Double = 45
    static let accidentMaxMin: Double = 120
    static let staleLine = "Ingen färsk väglagsdata. Kör som om det kan vara halt."

    /// Provkörning 18/10: raden sades fast servern publicerat var tionde minut — telefonen hade fallit tillbaka på en
    /// gammal sparad fil. Gammal data ur cachen kan vara en tillfällig nätmiss, så raden sägs först om den står kvar vid
    /// nästa försök (en minut senare). Gammal data som kom färsk från nätet sägs direkt. Tvilling av StaleGrace i AgeGate.kt.
    struct StaleGrace {
        private var cacheLoads = 0
        mutating func announce(stale: Bool, fromCache: Bool) -> Bool {
            cacheLoads = (stale && fromCache) ? cacheLoads + 1 : 0
            return stale && (!fromCache || cacheLoads >= 2)
        }
    }

    struct Result { let hazards: [Hazard]; let stale: Bool }

    static func filter(_ hazards: [Hazard], generatedAt: Date, now: Date) -> Result {
        let ageMin = now.timeIntervalSince(generatedAt) / 60
        if ageMin < weatherMaxMin { return Result(hazards: hazards, stale: false) }
        let keepAccidents = ageMin < accidentMaxMin
        let kept = hazards.filter { h in
            switch h {
            case .segment: return false
            case .kandidat: return false   // kandidaten (#577): väglag, åldras som halksträckorna
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
