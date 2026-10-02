// Kotlin twin of engine/src/engine.ts. Same discipline rules, same state machine,
// same tie-breaking — proven equal by the shared vectors in VectorTest.
package se.halkvakt.engine

class AlertEngine(hazards: List<Hazard>, private val cfg: EngineConfig = EngineConfig()) {

    private var points: List<PointHazard> = emptyList()
    private var segments: List<Pair<SegmentHazard, List<DoubleArray>>> = emptyList()

    init { ingest(hazards) }

    private fun ingest(hazards: List<Hazard>) {
        points = hazards.filterIsInstance<PointHazard>()
        segments = hazards.filterIsInstance<SegmentHazard>()
            .map { it to Geo.samplePolyline(it.line, cfg.segmentSampleM) }
    }

    /**
     * Swap the hazard set mid-drive (fresh snapshot) WITHOUT losing memory: odometer,
     * heading, cooldown clock and the fired-map survive, so the guard never re-announces
     * something it just said. Ids are stable across snapshots; entries for vanished ids
     * are kept on purpose (flicker-out/in must still obey the repeat rules).
     */
    fun updateHazards(hazards: List<Hazard>) = ingest(hazards)

    private var prevFix: Fix? = null
    private var lastHeadingDeg: Double? = null
    private var odometerM = 0.0
    private var lastSpokenT: Double? = null
    /** Vad som senast sades — spärren får bara tysta något som INTE är viktigare (#127). */
    private var lastSpokenKind: HazardKind? = null
    private val fired = HashMap<String, Pair<Double, Double>>() // id -> (t, odometerM)

    private val slipperyInfo = Regex("(?<![a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)", RegexOption.IGNORE_CASE)
    // Snow/frost also count inside compounds — "Nysnö", "Rimfrost" (kort #97). Mirrors engine.ts SLIPPERY_STAM.
    private val slipperyStam = Regex("(snö|frost)", RegexOption.IGNORE_CASE)

    /**
     * `alertKey` is what the repeat rules remember — normally the hazard id, but a SERIOUS
     * accident owns two voice slots ("<id>#early" / "<id>#near") so the 2 km reminder is not
     * swallowed by the suppression that follows the 10 km call (DECISIONS #28). Internal on
     * purpose: the emitted Alert keeps its hazardId, so the shared vector log shape is unchanged.
     */
    private data class Candidate(
        val hazard: Hazard,
        val kind: HazardKind,
        val distM: Double,
        val alertKey: String,
        val step: AccidentStep? = null,
    )

    fun step(fix: Fix): Alert? {
        val (speedKmh, headingDeg) = kinematics(fix)
        prevFix?.let { odometerM += Geo.haversineM(it.lon, it.lat, fix.lon, fix.lat) }
        prevFix = fix
        if (headingDeg != null) lastHeadingDeg = headingDeg

        if (speedKmh == null || speedKmh < cfg.minSpeedKmh) return null
        val heading = lastHeadingDeg ?: return null

        val speedMps = speedKmh * 1000.0 / 3600.0
        val leadM = minOf(cfg.leadMaxM, maxOf(cfg.leadMinM, speedMps * cfg.warnLeadS))

        val candidates = ArrayList<Candidate>()
        for (p in points) evaluatePoint(fix, heading, p, leadM)?.let { candidates.add(it) }
        for ((s, samples) in segments) evaluateSegment(fix, heading, s, samples, leadM)?.let { candidates.add(it) }
        if (candidates.isEmpty()) return null

        val eligible = candidates.filter { c ->
            val f = fired[c.alertKey] ?: return@filter true
            fix.t - f.first >= cfg.repeatMinS && odometerM - f.second >= cfg.repeatMinM
        }
        if (eligible.isEmpty()) return null

        val win = eligible.sortedWith(
            compareBy({ it.kind.ordinal }, { it.distM }, { it.alertKey })
        ).first()

        // Regel 1b: PRIORITETSMEDVETEN spärr (#127). Får bara kasta en vinnare vars prioritet
        // inte är högre än det senast sagda. Is får avbryta en kamera; en kamera aldrig is.
        lastSpokenT?.let { last ->
            if (fix.t - last < cfg.globalCooldownS) {
                val lastP = lastSpokenKind?.ordinal ?: Int.MAX_VALUE
                if (win.kind.ordinal >= lastP) return null
            }
        }

        lastSpokenT = fix.t
        lastSpokenKind = win.kind
        fired[win.alertKey] = fix.t to odometerM
        val ph = win.hazard as? PointHazard
        return Alert(
            t = fix.t, hazardId = win.hazard.id, kind = win.kind,
            distanceM = Math.round(win.distM),
            text = Texts.alertText(win.kind, win.distM, ph, win.step),
            step = win.step,
        )
    }

    fun run(trace: List<Fix>): List<Alert> = trace.mapNotNull { step(it) }

    private fun kinematics(fix: Fix): Pair<Double?, Double?> {
        var speedKmh = fix.speedKmh
        var headingDeg = fix.headingDeg
        prevFix?.let { p ->
            val dt = fix.t - p.t
            val dM = Geo.haversineM(p.lon, p.lat, fix.lon, fix.lat)
            if (speedKmh == null && dt > 0) speedKmh = dM / dt * 3.6
            if (headingDeg == null && dM >= 5.0) headingDeg = Geo.bearingDeg(p.lon, p.lat, fix.lon, fix.lat)
        }
        return speedKmh to headingDeg
    }

    private fun isAhead(fix: Fix, heading: Double, lon: Double, lat: Double, nearM: Double = 30.0): Pair<Boolean, Double> {
        val distM = Geo.haversineM(fix.lon, fix.lat, lon, lat)
        if (distM < nearM) return true to distM
        val ahead = Geo.angDiffDeg(Geo.bearingDeg(fix.lon, fix.lat, lon, lat), heading) <= cfg.corridorHalfAngleDeg
        return ahead to distM
    }

    private fun evaluatePoint(fix: Fix, heading: Double, p: PointHazard, leadM: Double): Candidate? {
        val (ahead, distM) = isAhead(fix, heading, p.lon, p.lat)
        if (!ahead) return null
        return when (p.kind) {
            HazardKind.CAMERA -> {
                if (distM > cfg.cameraTriggerM) return null
                // Trafikverkets Bearing = riktningen kameran TITTAR, rakt MOT trafiken den
                // fotograferar (mätplats för norrgående trafik har bäring ~158°). Övervakad
                // färdriktning = bearing + 180° (Bengts mätning på E4 2/9).
                val b = p.bearing
                if (b != null && Geo.angDiffDeg((b + 180.0) % 360.0, heading) > cfg.cameraBearingToleranceDeg) return null
                Candidate(p, p.kind, distM, p.id)
            }
            HazardKind.ACCIDENT -> evaluateAccident(p, distM)
            HazardKind.ICING_POINT -> {
                val t = p.meta.surfaceTempC
                // Broar (#38): brobanan fryser först — närmaste station på +3 räcker.
                val threshold = if (p.meta.bridge) 3.0 else 1.0
                val icy = t != null && t <= threshold && p.meta.moisture
                if (icy && distM <= leadM) Candidate(p, p.kind, distM, p.id) else null
            }
            HazardKind.WILDLIFE ->
                if (p.meta.active && distM <= leadM) Candidate(p, p.kind, distM, p.id) else null
            else -> null
        }
    }

    /**
     * A3 grading (DECISIONS #28). Mild/unclassified accidents keep the single old line.
     * Serious ones speak early (routing decision, while exits remain) and again inside
     * 2 km (speed only). A driver who joined the road inside 2 km never heard the early
     * call, so the near slot speaks the LATE copy instead — same facts, no reroute advice
     * that can no longer be acted on.
     */
    private fun evaluateAccident(p: PointHazard, distM: Double): Candidate? {
        if (distM > cfg.accidentMaxAheadM) return null

        val sev = p.meta.severityCode
        val serious = sev != null && sev >= cfg.accidentSeriousMinSeverity
        if (!serious) return Candidate(p, HazardKind.ACCIDENT, distM, p.id)

        if (distM <= cfg.accidentNearM) {
            val earlySpoken = fired.containsKey("${p.id}#early")
            return Candidate(
                p, HazardKind.ACCIDENT, distM, "${p.id}#near",
                if (earlySpoken) AccidentStep.REMINDER else AccidentStep.LATE,
            )
        }
        // The early call is ONE-SHOT per hazard (#211, 20/9): rule 2 would re-arm it after
        // 10 min + 5 km, which a slow approach passes before 2 km. Exactly two (DECISIONS #28).
        if (fired.containsKey("${p.id}#early")) return null
        return Candidate(p, HazardKind.ACCIDENT, distM, "${p.id}#early", AccidentStep.EARLY)
    }

    private fun evaluateSegment(
        fix: Fix, heading: Double, s: SegmentHazard, samples: List<DoubleArray>, leadM: Double,
    ): Candidate? {
        val slippery = (s.meta.code ?: 0) >= 2 || s.meta.info.any { slipperyInfo.containsMatchIn(it) || slipperyStam.containsMatchIn(it) }
        if (!slippery) return null
        var best: Double? = null
        for (pt in samples) {
            val (ahead, distM) = isAhead(fix, heading, pt[0], pt[1])
            if (ahead && (best == null || distM < best!!)) best = distM
        }
        val b = best ?: return null
        if (b > leadM) return null
        return Candidate(s, HazardKind.SLIPPERY_SEGMENT, b, s.id)
    }
}
