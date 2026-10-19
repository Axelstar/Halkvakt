// Åldersvakten (Bengts granskning 2026-08-28): appen får aldrig tala lugnt på
// gammal data. Ren funktion utan klocka/IO — trösklarna är policy, inte motor,
// och ligger därför FÖRE motorn så kontraktet förblir orört.
package se.halkvakt.app

import se.halkvakt.engine.*

object AgeGate {
    /** Väglagsdata (frysrisk + halksträckor) äldre än så här filtreras bort. */
    const val WEATHER_MAX_MIN = 45L
    /** Olyckor/hinder får leva längre — läget röjs långsammare. */
    const val ACCIDENT_MAX_MIN = 120L

    data class Result(
        val hazards: List<Hazard>,
        /** true = tröskeln passerad ⇒ en (1) röstrad per körning, sedan tyst. */
        val stale: Boolean,
    )

    fun filter(hazards: List<Hazard>, generatedAtMs: Long, nowMs: Long): Result {
        val ageMin = (nowMs - generatedAtMs) / 60_000
        if (ageMin < WEATHER_MAX_MIN) return Result(hazards, false)
        val keepAccidents = ageMin < ACCIDENT_MAX_MIN
        val kept = hazards.filter { h ->
            when (h) {
                is SegmentHazard -> false                       // halksträckor: bort
                is KandidatHazard -> false                      // kandidaten (#577): väglag, åldras som halksträckorna
                is PointHazard -> when (h.kind) {
                    HazardKind.ICING_POINT -> false             // frysrisk: bort
                    HazardKind.ACCIDENT -> keepAccidents
                    // #318: djuren är läget nu (Trafikverket, median 73 min) — de åldras som olyckorna.
                    HazardKind.WILDLIFE -> keepAccidents
                    else -> true                                // kameror: statiska
                }
            }
        }
        return Result(kept, true)
    }

    const val STALE_LINE = "Ingen färsk väglagsdata. Kör som om det kan vara halt."

    /** Provkörning 18/10: raden sades fast servern publicerat var tionde minut — telefonen hade fallit tillbaka på en
     *  gammal sparad fil. Gammal data ur cachen kan vara en tillfällig nätmiss, så raden sägs först om den står kvar vid
     *  nästa försök (en minut senare). Gammal data som kom färsk från nätet sägs direkt. */
    class StaleGrace {
        private var cacheLoads = 0
        fun announce(stale: Boolean, fromCache: Boolean): Boolean {
            cacheLoads = if (stale && fromCache) cacheLoads + 1 else 0
            return stale && (!fromCache || cacheLoads >= 2)
        }
    }
}
