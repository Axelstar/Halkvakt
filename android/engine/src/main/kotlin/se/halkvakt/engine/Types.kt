// Kotlin twin of engine/src/{types,geo,texts}.ts — keep 1:1 with the TS module.
// No clocks, no randomness, no I/O. Any semantic change must land in BOTH and
// be proven by the shared vectors.
package se.halkvakt.engine

import kotlin.math.*

enum class HazardKind(val wire: String) {
    ACCIDENT("accident"),
    SLIPPERY_SEGMENT("slippery_segment"),
    ICING_POINT("icing_point"),
    WILDLIFE("wildlife"),
    CAMERA("camera");
    companion object { fun of(s: String) = entries.first { it.wire == s } }
}

/** Spoken priority = ordinal order above. Losers are DROPPED, never queued. */

data class PointMeta(
    val surfaceTempC: Double? = null,
    val moisture: Boolean = false,
    val active: Boolean = true,
    val speedLimitKmh: Int? = null,
    /** accident — Trafikverket SeverityCode (1 Ingen, 2 Liten, 4 Stor, 5 Mycket stor). */
    val severityCode: Int? = null,
    /** accident — EndTime pre-formatted "HH:MM" Europe/Stockholm by the publisher. */
    val endTimeLocal: String? = null,
    /** icing_point — punkten är en BRO (#38): temp/fukt från närmaste station, tröskel +3. */
    val bridge: Boolean = false,
    /** accident — vägnummer ur Trafikverket ("E18", "25"). Rösten säger VAR (2/9). */
    val road: String? = null,
)

/** Which utterance of a serious accident this is (DECISIONS #28). Mirrors AccidentStep in texts.ts. */
enum class AccidentStep { EARLY, REMINDER, LATE }

data class SegmentMeta(val code: Int? = null, val info: List<String> = emptyList())

sealed interface Hazard { val id: String; val kind: HazardKind }
data class PointHazard(
    override val id: String, override val kind: HazardKind,
    val lon: Double, val lat: Double, val bearing: Double? = null,
    val meta: PointMeta = PointMeta(),
) : Hazard
data class SegmentHazard(
    override val id: String,
    val line: List<DoubleArray>, // [lon, lat]
    val meta: SegmentMeta = SegmentMeta(),
) : Hazard { override val kind = HazardKind.SLIPPERY_SEGMENT }

data class Fix(
    val t: Double, val lon: Double, val lat: Double,
    val speedKmh: Double? = null, val headingDeg: Double? = null,
)

data class Alert(
    val t: Double, val hazardId: String, val kind: HazardKind,
    val distanceM: Long, val text: String,
)

data class EngineConfig(
    val corridorHalfAngleDeg: Double = 35.0,
    val minSpeedKmh: Double = 15.0,
    val globalCooldownS: Double = 10.0,   // #127: var 45; prioritetsmedveten nu
    val repeatMinS: Double = 600.0,
    val repeatMinM: Double = 5000.0,
    val cameraTriggerM: Double = 500.0,
    val accidentMaxAheadM: Double = 10_000.0,
    val accidentSeriousMinSeverity: Int = 5,
    val accidentNearM: Double = 2_000.0,
    val warnLeadS: Double = 30.0,
    val leadMinM: Double = 400.0,
    val leadMaxM: Double = 3000.0,
    val segmentSampleM: Double = 100.0,
    val cameraBearingToleranceDeg: Double = 60.0,
)

// ---- geo (mirror of geo.ts, same formula sequences) ----
object Geo {
    private const val R = 6_371_000.0
    private const val D2R = PI / 180.0

    fun haversineM(aLon: Double, aLat: Double, bLon: Double, bLat: Double): Double {
        val dLat = (bLat - aLat) * D2R
        val dLon = (bLon - aLon) * D2R
        val s = sin(dLat / 2).pow(2) + cos(aLat * D2R) * cos(bLat * D2R) * sin(dLon / 2).pow(2)
        return 2 * R * asin(sqrt(s))
    }

    fun bearingDeg(aLon: Double, aLat: Double, bLon: Double, bLat: Double): Double {
        val p1 = aLat * D2R; val p2 = bLat * D2R; val dl = (bLon - aLon) * D2R
        val y = sin(dl) * cos(p2)
        val x = cos(p1) * sin(p2) - sin(p1) * cos(p2) * cos(dl)
        val th = atan2(y, x) / D2R
        return (th + 360.0) % 360.0
    }

    fun angDiffDeg(a: Double, b: Double): Double {
        val d = abs(a - b) % 360.0
        return if (d > 180.0) 360.0 - d else d
    }

    fun samplePolyline(line: List<DoubleArray>, stepM: Double): List<DoubleArray> {
        val out = ArrayList<DoubleArray>()
        for (i in line.indices) {
            val a = line[i]
            out.add(a)
            if (i == line.size - 1) break
            val b = line[i + 1]
            val segLen = haversineM(a[0], a[1], b[0], b[1])
            val n = floor(segLen / stepM).toInt()
            for (k in 1..n) {
                val f = (k * stepM) / segLen
                if (f >= 1.0) break
                out.add(doubleArrayOf(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f))
            }
        }
        return out
    }
}

// ---- texts (mirror of texts.ts — exact strings, they are product copy) ----
object Texts {
    /** " på E18" / " på väg 25" / "" när numret saknas. */
    fun roadPhrase(road: String?): String {
        val r = road?.trim().orEmpty()
        if (r.isEmpty()) return ""
        return if (r.first().isLetter()) " på $r" else " på väg $r"
    }

    fun alertText(
        kind: HazardKind,
        distanceM: Double,
        hazard: PointHazard?,
        step: AccidentStep? = null,
    ): String = when (kind) {
        HazardKind.ACCIDENT -> {
            val km = max(1L, Math.round(distanceM / 1000.0))
            // VAR, inte bara hur långt. "E18" läses "E arton"; blott nummer blir "olycka på
            // 25" — därför "väg 25" när numret saknar bokstav.
            val on = roadPhrase(hazard?.meta?.road)
            when (step) {
                AccidentStep.EARLY -> {
                    val base = "Allvarlig olycka$on $km kilometer framför dig — stor påverkan på trafiken. " +
                        "Överväg annan väg."
                    hazard?.meta?.endTimeLocal?.let { "$base Beräknas röjd vid $it." } ?: base
                }
                AccidentStep.REMINDER -> "Sakta ner — olycksplats strax framför dig."
                AccidentStep.LATE -> "Allvarlig olycka$on $km kilometer framför dig — stor påverkan. Sakta ner."
                null -> "Olycka rapporterad$on $km kilometer framför dig."
            }
        }
        HazardKind.SLIPPERY_SEGMENT -> "Varning: halka rapporterad på vägen framför dig."
        HazardKind.ICING_POINT ->
            if (hazard?.meta?.bridge == true) {
                // Bro (#38): säg VAD och ungefär VAR — föraren letar efter bron.
                val m = max(100L, Math.round(distanceM / 100.0) * 100)
                "Frysrisk framöver — bro om $m meter."
            } else "Isrisk framöver — vägbanan nära noll grader."
        HazardKind.WILDLIFE -> "Viltrisk framöver."
        HazardKind.CAMERA -> hazard?.meta?.speedLimitKmh?.let { "Fartkamera om 500 meter. Gränsen är $it." }
            ?: "Fartkamera om 500 meter."
    }
}
