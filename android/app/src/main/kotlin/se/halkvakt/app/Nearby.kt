// "I NÄRHETEN" — REN Kotlin (JVM-testbar). Människorader ur snapshotens maskindata:
// frysrisk "+0,4° och vått", kameror "80 km/h", halka Trafikverkets infotext.
// API-form enligt UI-kontraktet i ui/App.kt (nearest/distM/secondary/distText).
package se.halkvakt.app

import se.halkvakt.engine.Geo
import se.halkvakt.engine.Hazard
import se.halkvakt.engine.HazardKind
import se.halkvakt.engine.PointHazard
import se.halkvakt.engine.SegmentHazard
import kotlin.math.roundToInt

data class NearbyItem(val kind: HazardKind, val distM: Double, val secondary: String?)

object Nearby {
    /** Radie för "omkring dig" — sex mil. */
    const val MAX_M = 60_000.0

    fun nearest(hazards: List<Hazard>, lon: Double, lat: Double, n: Int = 6): List<NearbyItem> =
        hazards.asSequence()
            .mapNotNull { h ->
                val d = distanceM(h, lon, lat)
                if (d > MAX_M) null else NearbyItem(h.kind, d, secondary(h))
            }
            .sortedBy { it.distM }
            .take(n)
            .toList()

    fun distanceM(h: Hazard, lon: Double, lat: Double): Double = when (h) {
        is PointHazard -> Geo.haversineM(lon, lat, h.lon, h.lat)
        is SegmentHazard -> h.line.minOf { Geo.haversineM(lon, lat, it[0], it[1]) }
    }

    /** Detaljrad, eller null när källraden räcker (vilt/olycka). */
    fun secondary(h: Hazard): String? = when (h) {
        is SegmentHazard -> h.meta.info.firstOrNull()
        is PointHazard -> when (h.kind) {
            HazardKind.ICING_POINT -> buildString {
                val t = h.meta.surfaceTempC
                if (t != null) append(("%.1f°".format(t)).let { if (t >= 0) "+$it" else it }.replace('.', ','))
                else append("Nära noll")
                if (h.meta.moisture) append(" och vått")
            }
            HazardKind.CAMERA -> h.meta.speedLimitKmh?.let { "$it km/h" }
            else -> null
        }
    }

    fun distText(m: Double): String =
        if (m < 950) "${((m / 50).roundToInt() * 50).coerceAtLeast(50)} m"
        else "%.1f km".format(m / 1000).replace('.', ',')
}
