// Kotlin twin of engine/src/engine.ts. Same discipline rules, same state machine,
// same tie-breaking — proven equal by the shared vectors in VectorTest.
package se.halkvakt.engine

import kotlin.math.abs
import kotlin.math.floor

/** The grid (DECISIONS #795), mirror of engine.ts: cell size in degrees, latitude and longitude alike. Only speed depends on it.
 *  Samma tal i engine.ts och Engine.swift (kontraktsgrinden). */
private const val GRID_CELL_DEG = 0.05
/** Metres added to every reach before its window is drawn. Samma tal i engine.ts och Engine.swift (kontraktsgrinden). */
private const val GRID_MARGIN_M = 100.0
/** A window wider than this many cells per point goes to the always-list. Samma tal i engine.ts och Engine.swift (kontraktsgrinden). */
private const val GRID_MAX_CELLS = 4096.0

/** Mirror of HazardGrid in engine.ts: one hazard list by grid cell, each cell's list ascending as the hazards came. */
private class HazardGrid {
    private val building = HashMap<Long, ArrayList<Int>>()
    private val alwaysBuilding = ArrayList<Int>()
    private var count = 0
    private var cells: Map<Long, IntArray> = emptyMap()
    private var always = IntArray(0)
    /** Every hazard, ascending: what a fix outside the grid, and the test's full scan, evaluate. */
    var all = IntArray(0)
        private set

    /** Hazard i — added in ascending order from 0 — produces a candidate only within reachM of one of pts. */
    fun add(i: Int, pts: List<DoubleArray>, reachM: Double) {
        count = i + 1
        val w = Geo.reachWindow(pts, reachM + GRID_MARGIN_M)
        if (w == null || (2 * w[0] / GRID_CELL_DEG + 2) * (2 * w[1] / GRID_CELL_DEG + 2) > GRID_MAX_CELLS) {
            alwaysBuilding.add(i)
            return
        }
        var r0p = Int.MIN_VALUE; var r1p = 0; var c0p = 0; var c1p = 0
        for (p in pts) {
            val lon = p[0]; val lat = p[1]
            if (!lat.isFinite() || !lon.isFinite()) continue   // never within reach (reachWindow)
            val r0 = floor((lat - w[0]) / GRID_CELL_DEG).toInt(); val r1 = floor((lat + w[0]) / GRID_CELL_DEG).toInt()
            val c0 = floor((lon - w[1]) / GRID_CELL_DEG).toInt(); val c1 = floor((lon + w[1]) / GRID_CELL_DEG).toInt()
            if (r0 == r0p && r1 == r1p && c0 == c0p && c1 == c1p) continue   // same cells as the previous point
            r0p = r0; r1p = r1; c0p = c0; c1p = c1
            for (r in r0..r1) {
                for (c in c0..c1) {
                    val list = building.getOrPut(cellKey(r, c)) { ArrayList() }
                    if (list.isEmpty() || list[list.size - 1] != i) list.add(i)
                }
            }
        }
    }

    /** After the last add: the lists as arrays, and the building lists let go. */
    fun freeze() {
        cells = building.mapValues { it.value.toIntArray() }
        always = alwaysBuilding.toIntArray()
        all = IntArray(count) { it }
        building.clear()
        alwaysBuilding.clear()
    }

    /** The hazards that can produce a candidate at the fix, ascending; a fix outside [−90, 90] × [−180, 180] gets all of them. */
    fun near(lon: Double, lat: Double): IntArray {
        if (!(abs(lat) <= 90.0 && abs(lon) <= 180.0)) return all
        val cell = cells[cellKey(floor(lat / GRID_CELL_DEG).toInt(), floor(lon / GRID_CELL_DEG).toInt())]
        if (always.isEmpty()) return cell ?: always
        if (cell == null) return always
        val out = IntArray(cell.size + always.size)   // two ascending lists without common members
        var a = 0; var b = 0
        for (k in out.indices) out[k] = if (b >= always.size || (a < cell.size && cell[a] < always[b])) cell[a++] else always[b++]
        return out
    }
}

/** One number per cell, as in engine.ts (a clash would only add hazards to a cell). */
private fun cellKey(r: Int, c: Int): Long = r.toLong() * 65536L + c

class AlertEngine(hazards: List<Hazard>, private val cfg: EngineConfig = EngineConfig()) {

    private var points: List<PointHazard> = emptyList()
    private var segments: List<Pair<SegmentHazard, List<DoubleArray>>> = emptyList()
    private var kandidater: List<KandidatHazard> = emptyList()
    /** S (DECISIONS #844), mirror of engine.ts: each small road, and whether the line to the previous point exists. */
    private var smavagar: List<Pair<SmavagHazard, BooleanArray>> = emptyList()
    private var smavagById: Map<String, Int> = emptyMap()
    // Declared before init: an initializer below it would run after ingest and empty the grids again.
    private var pointGrid = HazardGrid()
    private var segmentGrid = HazardGrid()
    private var kandidatGrid = HazardGrid()
    private var smavagGrid = HazardGrid()
    /** S, the road test (DECISIONS #844): the road the car followed on the last fixes and for how many fixes in a row, by id.
     *  Declared before init for the same reason as the grids. */
    private var smavagVag: String? = null
    private var smavagFixar = 0
    /** S: when and where the small-roads voice last spoke (DECISIONS #828). */
    private var lastSmavagT: Double? = null
    private var lastSmavagOdoM = 0.0

    /** Test only (DECISIONS #795): evaluate every hazard on every fix, as before the grid. GridTest runs both paths side by side;
     *  their answers are the same by construction, so nothing else sets it. */
    internal var bruteForce = false

    init { ingest(hazards) }

    private fun ingest(hazards: List<Hazard>) {
        points = hazards.filterIsInstance<PointHazard>()
        segments = hazards.filterIsInstance<SegmentHazard>()
            .map { it to Geo.samplePolyline(it.line, cfg.segmentSampleM) }
        kandidater = hazards.filterIsInstance<KandidatHazard>()
        smavagar = hazards.filterIsInstance<SmavagHazard>().map { h ->
            h to BooleanArray(h.points.size) { k ->
                k > 0 && Geo.haversineM(h.points[k - 1][0], h.points[k - 1][1], h.points[k][0], h.points[k][1]) <= cfg.smavagKordaMaxM
            }
        }
        smavagById = smavagar.withIndex().associate { (i, v) -> v.first.id to i }
        // The grid (DECISIONS #795), mirror of ingest in engine.ts.
        pointGrid = HazardGrid().apply {
            points.forEachIndexed { i, p -> add(i, listOf(doubleArrayOf(p.lon, p.lat)), reachOf(p.kind)) }
            freeze()
        }
        segmentGrid = HazardGrid().apply {
            segments.forEachIndexed { i, (_, samples) -> add(i, samples, reachOf(HazardKind.SLIPPERY_SEGMENT)) }
            freeze()
        }
        kandidatGrid = HazardGrid().apply {
            kandidater.forEachIndexed { i, k -> add(i, k.points, reachOf(HazardKind.KANDIDAT)) }
            freeze()
        }
        smavagGrid = HazardGrid().apply {
            smavagar.forEachIndexed { i, (h, _) -> add(i, Geo.samplePolyline(h.points, cfg.segmentSampleM), reachOf(HazardKind.SMAVAG)) }
            freeze()
        }
    }

    /** The grid's reach (DECISIONS #795), mirror of reachOf in engine.ts — the derivation is there. maxOf keeps a NaN, and NaN or
     *  infinity gives a reach no window bounds: always evaluated. */
    private fun reachOf(kind: HazardKind): Double = when (kind) {
        HazardKind.CAMERA -> cfg.cameraTriggerM
        HazardKind.ACCIDENT -> cfg.accidentMaxAheadM
        HazardKind.ICING_POINT, HazardKind.WILDLIFE, HazardKind.SLIPPERY_SEGMENT, HazardKind.KANDIDAT ->
            maxOf(cfg.leadMaxM, EngineConfig().leadMaxM)
        // S: the road test needs a line within smavagPaM, and every point of a line lies within half a sample step of a sample.
        HazardKind.SMAVAG -> cfg.smavagPaM + cfg.segmentSampleM
    }

    /**
     * Swap the hazard set mid-drive (fresh snapshot) WITHOUT losing memory: odometer,
     * heading, cooldown clock and the fired-map survive, so the guard never re-announces
     * something it just said. Ids are stable across snapshots; entries for vanished ids
     * are kept on purpose (flicker-out/in must still obey the repeat rules).
     */
    fun updateHazards(hazards: List<Hazard>) = ingest(hazards)

    /** Halkzonen (kort #360): whether two stretches are neighbours, per sorted id pair (the geometry does not change). */
    private val zonGrannar = HashMap<String, Boolean>()

    /** Halkzonen (#360): the two stretches' lines lie within halkZonM — measured line to line by the route filter, the same
     *  function as engine/src/rutfilter.ts. Cached per pair. */
    private fun grannar(a: SegmentHazard, b: SegmentHazard): Boolean {
        val nyckel = if (a.id < b.id) "${a.id}|${b.id}" else "${b.id}|${a.id}"
        return zonGrannar.getOrPut(nyckel) { RouteFilter.alongRoute(listOf(b), a.line, cfg.halkZonM).isNotEmpty() }
    }

    private var prevFix: Fix? = null
    private var lastHeadingDeg: Double? = null
    private var odometerM = 0.0
    private var lastSpokenT: Double? = null
    /** Vad som senast sades — spärren får bara tysta något som INTE är viktigare (#127). */
    private var lastSpokenKind: HazardKind? = null
    /** När kandidaten senast talade — taket räknas därifrån, oavsett sträcka (DECISIONS #606). */
    private var lastKandidatT: Double? = null
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
        val beta: Boolean = false,
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

        // The grid (DECISIONS #795), mirror of step in engine.ts: only the hazards whose reach holds the fix, in the full scan's
        // order. A stretch tests `b > leadM`, so a NaN lead (a NaN speed or setting) lets it speak at any distance: then the
        // stretches take the full scan.
        val allStretches = bruteForce || leadM.isNaN()
        // S, the road test (DECISIONS #844): which small road the car follows, before any of its warning points may speak.
        smavagPa(fix, heading)
        val candidates = ArrayList<Candidate>()
        for (i in if (bruteForce) pointGrid.all else pointGrid.near(fix.lon, fix.lat)) {
            evaluatePoint(fix, heading, points[i], leadM)?.let { candidates.add(it) }
        }
        for (i in if (allStretches) segmentGrid.all else segmentGrid.near(fix.lon, fix.lat)) {
            val (s, samples) = segments[i]
            evaluateSegment(fix, heading, s, samples, leadM)?.let { candidates.add(it) }
        }
        for (i in if (allStretches) kandidatGrid.all else kandidatGrid.near(fix.lon, fix.lat)) {
            evaluateKandidat(fix, heading, kandidater[i], leadM)?.let { candidates.add(it) }
        }
        evaluateSmavag(fix, heading, leadM)?.let { candidates.add(it) }
        if (candidates.isEmpty()) return null

        val rearmed = { f: Pair<Double, Double> -> fix.t - f.first >= cfg.repeatMinS && odometerM - f.second >= cfg.repeatMinM }
        val eligible = candidates.filter { c ->
            val f = fired[c.alertKey]
            if (f != null && !rearmed(f)) return@filter false
            // Halkzonen (kort #360, DECISIONS #621, #624): a neighbour stretch within halkZonM spoke and is not re-armed.
            val a = c.hazard as? SegmentHazard
            if (c.kind == HazardKind.SLIPPERY_SEGMENT && a != null &&
                segments.any { (s, _) -> s.id != a.id && fired[s.id]?.let { !rearmed(it) } == true && grannar(a, s) }) return@filter false
            true
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
        if (win.kind == HazardKind.KANDIDAT) lastKandidatT = fix.t
        if (win.kind == HazardKind.SMAVAG) { lastSmavagT = fix.t; lastSmavagOdoM = odometerM }
        fired[win.alertKey] = fix.t to odometerM
        val ph = win.hazard as? PointHazard
        return Alert(
            t = fix.t, hazardId = win.hazard.id, kind = win.kind,
            distanceM = Math.round(win.distM),
            text = if (win.beta && win.kind == HazardKind.ICING_POINT) Texts.EFTERHALKA_TEXT
                   else Texts.alertText(win.kind, win.distM, ph, win.step),
            step = win.step,
            beta = win.beta,
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
                if (icy) return if (distM <= leadM) Candidate(p, p.kind, distM, p.id) else null
                // S3 — efterhalkan som märkt beta (DECISIONS #222, #524), spegel av engine.ts: +1…+3 °C, fallit snabbt
                // efter regn inom 2 h. Bara stationer — broarna behåller sin +3-regel.
                val rainH = p.meta.rainH
                val fall30 = p.meta.fall30C
                val beta = !p.meta.bridge && t != null && rainH != null && fall30 != null &&
                    t >= cfg.efterhalkaYtaMinC && t <= cfg.efterhalkaYtaMaxC &&
                    fall30 >= cfg.efterhalkaFall30C && rainH <= cfg.efterhalkaRegnH
                if (beta && distM <= leadM) Candidate(p, p.kind, distM, p.id, beta = true) else null
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

    /**
     * K — kandidatens betavarning (DECISIONS #562, #577), spegel av evaluateKandidat i engine.ts. The rule lives in the
     * database; the engine adds no threshold — only the corridor and the lead over the stretch's points. One key per stretch.
     */
    private fun evaluateKandidat(fix: Fix, heading: Double, k: KandidatHazard, leadM: Double): Candidate? {
        var best: Double? = null
        for (pt in k.points) {
            val (ahead, distM) = isAhead(fix, heading, pt[0], pt[1])
            if (ahead && (best == null || distM < best!!)) best = distM
        }
        val b = best ?: return null
        if (b > leadM) return null
        // (c), DECISIONS #581: tyst i kandidatEfterHalkaS efter att samma sträckas halkvarning (A1) talat.
        val a1 = k.segmentHazardId?.let { fired[it] }
        if (a1 != null && fix.t - a1.first < cfg.kandidatEfterHalkaS) return null
        // Taket, DECISIONS #606: högst en kandidat per kandidatTakS, vilken sträcka det än gäller.
        lastKandidatT?.let { if (fix.t - it < cfg.kandidatTakS) return null }
        return Candidate(k, HazardKind.KANDIDAT, b, k.id, beta = true)
    }

    /**
     * S, the road test (DECISIONS #844), mirror of smavagPa in engine.ts: the nearest straight line between two neighbouring points
     * of any small road within smavagPaM of the fix and within smavagPaGrader of its direction, either way. The same road on
     * consecutive fixes counts up; another road, or none, starts over. Ascending road and point order; a strictly nearer line wins.
     */
    private fun smavagPa(fix: Fix, heading: Double) {
        var bestId: String? = null
        var bestD = Double.POSITIVE_INFINITY
        for (i in if (bruteForce) smavagGrid.all else smavagGrid.near(fix.lon, fix.lat)) {
            val (h, linje) = smavagar[i]
            for (k in 1 until h.points.size) {
                if (!linje[k]) continue
                val a = h.points[k - 1]; val b = h.points[k]
                val d = Geo.distToSegmentM(fix.lon, fix.lat, a[0], a[1], b[0], b[1])
                if (!(d <= cfg.smavagPaM) || !(d < bestD)) continue
                val r = Geo.bearingDeg(a[0], a[1], b[0], b[1])
                if (minOf(Geo.angDiffDeg(r, heading), Geo.angDiffDeg((r + 180.0) % 360.0, heading)) > cfg.smavagPaGrader) continue
                bestId = h.id; bestD = d
            }
        }
        if (bestId != null && bestId == smavagVag) smavagFixar++
        else { smavagVag = bestId; smavagFixar = if (bestId == null) 0 else 1 }
    }

    /**
     * S — småvägsröstens betavarning (DECISIONS #828, #844), mirror of evaluateSmavag in engine.ts: only the road the car follows
     * may speak, with K's corridor and lead over its warning points; then silent until both smavagTystS and smavagTystM have passed.
     */
    private fun evaluateSmavag(fix: Fix, heading: Double, leadM: Double): Candidate? {
        val vag = smavagVag ?: return null
        if (smavagFixar < cfg.smavagPaFixar) return null
        lastSmavagT?.let { if (fix.t - it < cfg.smavagTystS || odometerM - lastSmavagOdoM < cfg.smavagTystM) return null }
        val i = smavagById[vag] ?: return null
        val h = smavagar[i].first
        var best: Double? = null
        for (j in h.warn) {
            val p = h.points.getOrNull(j) ?: continue
            val (ahead, distM) = isAhead(fix, heading, p[0], p[1])
            if (ahead && distM <= leadM && (best == null || distM < best!!)) best = distM
        }
        val b = best ?: return null
        return Candidate(h, HazardKind.SMAVAG, b, h.id, beta = true)
    }
}
