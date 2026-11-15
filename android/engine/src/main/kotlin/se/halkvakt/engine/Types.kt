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
    CAMERA("camera"),
    /** K — kandidatens betavarning (DECISIONS #562, #577). LAST on purpose: every other kind outranks it, so the cooldown can
     *  never drop or delay another warning because the candidate spoke. Mirrors PRIORITY in engine/src/types.ts. */
    KANDIDAT("kandidat"),
    /** S — småvägsröstens betavarning (DECISIONS #828, #844). After K: it never silences or delays another warning, the candidate
     *  included. Mirrors PRIORITY in engine/src/types.ts. */
    SMAVAG("smavag");
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
    /** icing_point — S3 (DECISIONS #222, #524): timmar sedan regn och ytans fall på 30 min, positivt = faller. null ⇒ tyst. */
    val rainH: Double? = null,
    val fall30C: Double? = null,
    /** accident — vägnummer ur Trafikverket ("E18", "25"). Rösten säger VAR (2/9). */
    val road: String? = null,
)

/** Which utterance of a serious accident this is (DECISIONS #28). Mirrors AccidentStep in texts.ts. */
enum class AccidentStep(val wire: String) { EARLY("early"), REMINDER("reminder"), LATE("late") }

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
/** K — one stretch where the candidate's database rule says `varnar` (live.json `kandidat`, DECISIONS #576, #577). The engine
 *  gets only the warning points — no threshold — and one hazard per stretch, so the repeat rule holds per stretch. */
data class KandidatHazard(
    override val id: String,
    val points: List<DoubleArray>, // [lon, lat]
    /** The A1 hazard on the same stretch ("seg:<id>"): silent for kandidatEfterHalkaS after it spoke (DECISIONS #581). */
    val segmentHazardId: String? = null,
) : Hazard { override val kind = HazardKind.KANDIDAT }
/** S — one state road without road-condition measurement (DECISIONS #828, #844), mirror of SmavagHazard in types.ts: its points in
 *  order along the road and the indices of those that warn. Roads without a warning point belong here too: the road test first
 *  decides which road the car is on, among all of them. */
data class SmavagHazard(
    override val id: String,
    val points: List<DoubleArray>, // [lon, lat], in order along the road
    val warn: List<Int>,
) : Hazard { override val kind = HazardKind.SMAVAG }

data class Fix(
    val t: Double, val lon: Double, val lat: Double,
    val speedKmh: Double? = null, val headingDeg: Double? = null,
)

data class Alert(
    val t: Double, val hazardId: String, val kind: HazardKind,
    val distanceM: Long, val text: String,
    /** Serious accidents only — which of the two-step calls (DECISIONS #28, #443). Null otherwise. */
    val step: AccidentStep? = null,
    /** S3: the frost-risk call came from the post-rain beta rule (DECISIONS #524). K: always (DECISIONS #562). The warning
     *  card marks it as beta. */
    val beta: Boolean = false,
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
    // S3 (DECISIONS #222, #524): betans startvärden — samma tal som engine/src/types.ts och sql/028 (kontraktsgrinden).
    val efterhalkaYtaMinC: Double = 1.0,
    val efterhalkaYtaMaxC: Double = 3.0,
    val efterhalkaFall30C: Double = 0.8,
    val efterhalkaRegnH: Double = 2.0,
    // K (DECISIONS #581): tyst så här länge efter samma sträckas halkvarning — samma tal som engine/src/types.ts (kontraktsgrinden).
    val kandidatEfterHalkaS: Double = 120.0,
    // Taket (DECISIONS #606): högst en kandidat per så här många sekunder — samma tal som engine/src/types.ts (kontraktsgrinden).
    val kandidatTakS: Double = 600.0,
    // Halkzonen (DECISIONS #624): sträckor inom så här många meter är en zon för reprisregeln — samma tal som engine/src/types.ts
    // (kontraktsgrinden).
    val halkZonM: Double = 500.0,
    // S, vägtestet (DECISIONS #844): inom så här många meter och grader från linjen mellan två grannpunkter, så många fixar i rad;
    // grannar längre isär än smavagKordaMaxM har ingen linje — samma tal som engine/src/types.ts (kontraktsgrinden).
    val smavagPaM: Double = 80.0,
    val smavagPaGrader: Double = 30.0,
    val smavagPaFixar: Int = 3,
    val smavagKordaMaxM: Double = 3000.0,
    // S, tystnaden efter ett besked (DECISIONS #828, #863): båda ska ha gått — samma tal som engine/src/types.ts (kontraktsgrinden).
    val smavagTystS: Double = 1800.0,
    val smavagTystM: Double = 20000.0,
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

    /** Mirror of distToSegmentM in geo.ts (DECISIONS #844): metres from p to the straight segment a–b in a flat plane around p,
     *  the same arithmetic step for step. */
    fun distToSegmentM(pLon: Double, pLat: Double, aLon: Double, aLat: Double, bLon: Double, bLat: Double): Double {
        val kx = R * D2R * cos(pLat * D2R); val ky = R * D2R
        val ax = (aLon - pLon) * kx; val ay = (aLat - pLat) * ky
        val dx = (bLon - aLon) * kx; val dy = (bLat - aLat) * ky
        val l2 = dx * dx + dy * dy
        val t = if (l2 > 0) max(0.0, min(1.0, -(ax * dx + ay * dy) / l2)) else 0.0
        return hypot(ax + t * dx, ay + t * dy)
    }

    fun angDiffDeg(a: Double, b: Double): Double {
        val d = abs(a - b) % 360.0
        return if (d > 180.0) 360.0 - d else d
    }

    /**
     * Mirror of reachWindow in geo.ts (DECISIONS #795): half-widths [dLat, dLon] in degrees of a window around the points that holds
     * every position within distM of one of them, for a position inside [−90, 90] × [−180, 180] — the proof is in geo.ts. null when
     * no window proves anything (distM not in [0, πR), the window reaching a pole or the antimeridian, no finite point), and for a
     * point shorter than [lon, lat]: the full scan reads it on every fix and fails there, as before the grid.
     */
    fun reachWindow(pts: List<DoubleArray>, distM: Double): DoubleArray? {
        if (!(distM >= 0.0 && distM < PI * R)) return null
        var minLat = Double.POSITIVE_INFINITY
        var maxLat = Double.NEGATIVE_INFINITY
        var maxAbsLon = Double.NEGATIVE_INFINITY
        for (p in pts) {
            if (p.size < 2) return null
            val lon = p[0]; val lat = p[1]
            if (!lat.isFinite() || !lon.isFinite()) continue
            if (lat < minLat) minLat = lat
            if (lat > maxLat) maxLat = lat
            if (abs(lon) > maxAbsLon) maxAbsLon = abs(lon)
        }
        val dLat = distM / R / D2R
        val latMax = max(abs(minLat - dLat), abs(maxLat + dLat))
        if (!(latMax < 90.0)) return null
        val k = sin(distM / (2 * R)) / cos(latMax * D2R)
        if (!(k < 1.0)) return null
        val dLon = 2 * asin(k) / D2R
        if (!(maxAbsLon + dLon < 180.0)) return null
        return doubleArrayOf(dLat, dLon)
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
    /** S3, efterhalkan som märkt beta (DECISIONS #222, #524) — spegel av EFTERHALKA_TEXT i texts.ts. */
    const val EFTERHALKA_TEXT = "Halkvakt tror: frysrisk framöver."

    /** K, kandidatens betavarning (DECISIONS #562, #573) — spegel av KANDIDAT_TEXT i texts.ts. */
    const val KANDIDAT_TEXT = "Halkvakt tror: halka framöver."

    /** S, småvägsröstens betavarning (DECISIONS #828) — spegel av SMAVAG_TEXT i texts.ts. */
    const val SMAVAG_TEXT = "Betavarning: risk för halka på småvägarna framöver."

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
        HazardKind.KANDIDAT -> KANDIDAT_TEXT
        HazardKind.SMAVAG -> SMAVAG_TEXT
    }
}
