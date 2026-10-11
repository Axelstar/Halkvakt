package se.halkvakt.engine

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min

/** A hazard along a route: shortest distance to the line and position along it, both in metres (DECISIONS #528). */
data class AlongRoute(val hazard: Hazard, val distanceM: Double, val alongM: Double)

/**
 * LÄNGS RUTTEN (favoriterna, DECISIONS #528) — spegel av farorLangsRutten i engine/src/rutfilter.ts, prövad mot
 * engine/fixtures/langsrutten.json i alla tre språk. Plant i en lokal projektion kring punkten (x = R·Δλ·cos φ, y = R·Δφ),
 * punkt mot sträcka utan sampling; ett segment mäts brytpunkt mot linjen, linjens brytpunkter mot segmentet, och två sträckor
 * som korsar varandra ger 0. Platsen längs rutten är längden fram till närmaste sträcka (haversine per sträcka) plus andelen av den.
 */
object RouteFilter {
    private const val R = 6_371_000.0
    private const val RAD = PI / 180.0

    /** Shortest planar distance from p to the segment a–b, and the fraction t ∈ [0, 1] along it where it is reached. */
    private fun toSegment(p: DoubleArray, a: DoubleArray, b: DoubleArray): Pair<Double, Double> {
        val k = cos(p[1] * RAD) * R * RAD
        val m = R * RAD
        val ax = (a[0] - p[0]) * k; val ay = (a[1] - p[1]) * m
        val bx = (b[0] - p[0]) * k; val by = (b[1] - p[1]) * m
        val dx = bx - ax; val dy = by - ay; val l = dx * dx + dy * dy
        val t = if (l == 0.0) 0.0 else max(0.0, min(1.0, -(ax * dx + ay * dy) / l))
        return hypot(ax + t * dx, ay + t * dy) to t
    }

    /** Where p1–p2 crosses q1–q2, as a fraction t ∈ (0, 1) along p1–p2, or null. Planar in degrees. */
    private fun crossing(p1: DoubleArray, p2: DoubleArray, q1: DoubleArray, q2: DoubleArray): Double? {
        val rx = p2[0] - p1[0]; val ry = p2[1] - p1[1]; val sx = q2[0] - q1[0]; val sy = q2[1] - q1[1]
        val den = rx * sy - ry * sx
        if (den == 0.0) return null
        val t = ((q1[0] - p1[0]) * sy - (q1[1] - p1[1]) * sx) / den
        val u = ((q1[0] - p1[0]) * ry - (q1[1] - p1[1]) * rx) / den
        return if (t > 0 && t < 1 && u > 0 && u < 1) t else null
    }

    /** The hazards within [marginM] of the line, in driving order (position along the route, then id). */
    fun alongRoute(hazards: List<Hazard>, line: List<DoubleArray>, marginM: Double): List<AlongRoute> {
        if (line.size < 2) return emptyList()
        val cum = DoubleArray(line.size)
        for (i in 1 until line.size) cum[i] = cum[i - 1] + Geo.haversineM(line[i - 1][0], line[i - 1][1], line[i][0], line[i][1])
        fun nearest(p: DoubleArray): Pair<Double, Double> {
            var d = Double.POSITIVE_INFINITY; var along = 0.0
            for (i in 0 until line.size - 1) {
                val (sd, t) = toSegment(p, line[i], line[i + 1])
                if (sd < d) { d = sd; along = cum[i] + t * (cum[i + 1] - cum[i]) }
            }
            return d to along
        }
        val out = ArrayList<AlongRoute>()
        for (h in hazards) {
            var d: Double; var along: Double
            when (h) {
                is SegmentHazard -> {
                    nearest(h.line[0]).let { d = it.first; along = it.second }
                    for (p in h.line.drop(1)) { val n = nearest(p); if (n.first < d) { d = n.first; along = n.second } }
                    // The line's vertices against the segment: a segment can pass near the line between its own vertices.
                    for (i in line.indices) for (j in 0 until h.line.size - 1) {
                        val (sd, _) = toSegment(line[i], h.line[j], h.line[j + 1])
                        if (sd < d) { d = sd; along = cum[i] }
                    }
                    var i = 0
                    while (i < line.size - 1 && d > 0) {
                        for (j in 0 until h.line.size - 1) {
                            val t = crossing(line[i], line[i + 1], h.line[j], h.line[j + 1])
                            if (t != null) { d = 0.0; along = cum[i] + t * (cum[i + 1] - cum[i]); break }
                        }
                        i++
                    }
                }
                is PointHazard -> nearest(doubleArrayOf(h.lon, h.lat)).let { d = it.first; along = it.second }
            }
            if (d <= marginM) out.add(AlongRoute(h, d, along))
        }
        return out.sortedWith(compareBy<AlongRoute> { it.alongM }.thenBy { it.hazard.id })
    }
}
