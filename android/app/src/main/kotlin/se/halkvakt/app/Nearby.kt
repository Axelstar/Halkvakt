// "I närheten"-listan — REN logik över motortyperna (JVM-testbar).
// Snapshotten bär inga vägnamn (ännu) — sekundärraden byggs ärligt ur metadatan.
package se.halkvakt.app

import se.halkvakt.engine.*

data class NearbyItem(val kind: HazardKind, val distM: Double, val secondary: String?)

object Nearby {
    /** Närmaste faror från (lon,lat), sorterade, max [n] st inom [maxKm]. */
    fun nearest(hazards: List<Hazard>, lon: Double, lat: Double, n: Int = 4, maxKm: Double = 60.0): List<NearbyItem> =
        hazards.asSequence().mapNotNull { h ->
            val (hl, ha) = when (h) {
                is PointHazard -> h.lon to h.lat
                is SegmentHazard -> h.line.firstOrNull()?.let { it[0] to it[1] } ?: return@mapNotNull null
            }
            val d = Geo.haversineM(lon, lat, hl, ha)
            if (d > maxKm * 1000) null else NearbyItem(h.kind, d, secondary(h))
        }.sortedBy { it.distM }.take(n).toList()

    private fun secondary(h: Hazard): String? = when (h) {
        is SegmentHazard -> h.meta.info.filter { it.isNotBlank() }.take(2).joinToString(" · ").ifBlank { null }
        is PointHazard -> when (h.kind) {
            HazardKind.CAMERA -> h.meta.speedLimitKmh?.let { "$it km/h" }
            HazardKind.ICING_POINT -> buildList {
                h.meta.surfaceTempC?.let { add("${if (it >= 0) "+" else ""}${"%.1f".format(it).replace('.', ',')}°") }
                if (h.meta.moisture) add("vått")
            }.joinToString(" och ").ifBlank { null }
            else -> null
        }
    }

    fun distText(m: Double): String =
        if (m < 950) "${(Math.round(m / 50.0) * 50)} m"
        else "${"%.1f".format(m / 1000.0).replace('.', ',')} km"
}
