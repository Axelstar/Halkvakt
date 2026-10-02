// What the warning card shows for one alert (design handoff v2, DECISIONS #444).
// Swift twin: ios/HalkvaktEngine/Sources/HalkvaktEngine/WarningCard.swift — same cases, same strings.
// Rule from the design: the card shows what the voice said and nothing more. A number appears only
// when the voice speaks one; halka, vilt and the weather station get words instead.
package se.halkvakt.engine

import kotlin.math.roundToLong

data class WarningCard(
    val icon: Icon,
    val stage: String?,       // dark chip, serious accidents only
    val title: String,
    val sub: String?,
    val distance: Distance,
    val road: String?,        // road sign: "E18", "VÄG 25"
    val limit: Int?,          // speed-limit sign
    val advice: String?,      // dark box: "Överväg annan väg", "Sakta ner"
    val adviceSub: String?,   // "STOR PÅVERKAN · RÖJD CA 19:30"
    val quote: String,        // the voice line, verbatim
) {
    enum class Icon { OLYCKA, HALKA, FRYS, BRO, VILT, KAMERA }

    sealed interface Distance {
        data class Number(val value: String, val unit: String) : Distance   // "3" KM, "500" M
        data class Words(val text: String) : Distance                       // "FRAMFÖR DIG", "FRAMÖVER", "STRAX FRAMFÖR"
    }

    companion object {
        /** `meta` is the hazard's own metadata (looked up by `alert.hazardId`); null for segments or when the
         *  hazard is gone from the snapshot — the card then simply drops road, limit and clearance time. */
        fun make(alert: Alert, meta: PointMeta?): WarningCard {
            // Same rounding as the voice (half away from zero, like Swift's .rounded()). alert.distanceM is
            // already whole metres, so a distance within half a metre below a 500-mark can round one step higher.
            val d = alert.distanceM.toDouble()
            val q = alert.text
            return when (alert.kind) {
                HazardKind.ACCIDENT -> {
                    val km = Distance.Number(maxOf(1L, (d / 1000).roundToLong()).toString(), "KM")
                    val road = roadSign(meta?.road)
                    when (alert.step) {
                        AccidentStep.EARLY -> WarningCard(Icon.OLYCKA, "ALLVARLIG · TIDIGT", "Allvarlig olycka", null, km, road, null,
                            "Överväg annan väg", "STOR PÅVERKAN" + (meta?.endTimeLocal?.let { " · RÖJD CA $it" } ?: ""), q)
                        AccidentStep.REMINDER -> WarningCard(Icon.OLYCKA, "PÅMINNELSE", "Sakta ner", "Olycksplats strax framför dig",
                            Distance.Words("STRAX FRAMFÖR"), null, null, null, null, q)
                        AccidentStep.LATE -> WarningCard(Icon.OLYCKA, "ALLVARLIG · SENT", "Allvarlig olycka", null, km, road, null,
                            "Sakta ner", "STOR PÅVERKAN", q)
                        null -> WarningCard(Icon.OLYCKA, null, "Olycka", null, km, road, null, null, null, q)
                    }
                }
                HazardKind.SLIPPERY_SEGMENT ->
                    WarningCard(Icon.HALKA, null, "Halka", null, Distance.Words("FRAMFÖR DIG"), null, null, null, null, q)
                HazardKind.ICING_POINT ->
                    if (meta?.bridge == true) {
                        // The voice says the bridge distance in metres ("bro om 1200 meter"), so the card does too.
                        val m = maxOf(100L, (d / 100).roundToLong() * 100)
                        WarningCard(Icon.BRO, null, "Frysrisk", "Bro", Distance.Number(m.toString(), "M"), null, null, null, null, q)
                    } else {
                        WarningCard(Icon.FRYS, null, "Frysrisk", "Vägbanan nära noll grader", Distance.Words("FRAMÖVER"),
                            null, null, null, null, q)
                    }
                HazardKind.WILDLIFE ->
                    WarningCard(Icon.VILT, null, "Vilt", null, Distance.Words("FRAMÖVER"), null, null, null, null, q)
                // The voice always says 500 m (the trigger distance), whatever the exact distance was.
                HazardKind.CAMERA ->
                    WarningCard(Icon.KAMERA, null, "Fartkamera", null, Distance.Number("500", "M"), null, meta?.speedLimitKmh, null, null, q)
            }
        }

        /** "E18" stays "E18"; a bare number becomes "VÄG 25" — the same rule as the voice's roadPhrase. */
        fun roadSign(road: String?): String? {
            val r = road?.trim().orEmpty()
            if (r.isEmpty()) return null
            return if (r.first().isLetter()) r.uppercase() else "VÄG $r"
        }
    }
}
