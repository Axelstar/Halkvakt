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
                is PointHazard -> when (h.kind) {
                    HazardKind.ICING_POINT -> false             // frysrisk: bort
                    HazardKind.ACCIDENT -> keepAccidents
                    else -> true                                // kameror/vilt: statiska
                }
            }
        }
        return Result(kept, true)
    }

    const val STALE_LINE = "Ingen färsk väglagsdata – kör som om det kan vara halt."
}
