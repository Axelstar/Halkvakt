// The grid is an optimisation, not a rule (DECISIONS #795) — the Kotlin twin of test/motorns-rutnat.test.ts. The engine evaluates
// only the hazards in the fix's grid cell; `bruteForce` (test only) evaluates every hazard on every fix, as before 5/11. Both paths
// run side by side over seeded random hazard sets and traces that sit on the bounds — hazards just inside and just outside each
// reach, on cell borders, around the antimeridian and the pole, broken coordinates and fixes, NaN speeds, duplicate ids, snapshot
// swaps and odd configurations — over the Skåne fixture with 2 000 kandidat points and 3 000 wildlife points, and at the window's
// tight north and south edges. Every step's alert must be equal. The motprov is run on the TS twin (DECISIONS #795); the counts
// below keep the scenarios on the bounds.
package se.halkvakt.engine

import org.json.JSONObject
import java.io.File
import kotlin.math.PI
import kotlin.math.asin
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class GridTest {

    /** mulberry32, as in the TS test: small and seeded, the same sequence on every machine. */
    private class Rng(seed: Int) {
        private var a = seed
        fun next(): Double {
            a += 0x6d2b79f5
            var t = a
            t = (t xor (t ushr 15)) * (t or 1)
            t = t xor (t + (t xor (t ushr 7)) * (t or 61))
            return ((t xor (t ushr 14)).toLong() and 0xffffffffL) / 4294967296.0
        }
        fun between(lo: Double, hi: Double) = lo + (hi - lo) * next()
        fun <T> pick(xs: List<T>): T = xs[(next() * xs.size).toInt()]
    }

    /** The point dM metres from (lon, lat) along bearing bDeg on the sphere, longitude folded into [−180, 180). */
    private fun dest(lon: Double, lat: Double, dM: Double, bDeg: Double): DoubleArray {
        val d2r = PI / 180
        val d = dM / 6_371_000.0; val th = bDeg * d2r; val p1 = lat * d2r; val l1 = lon * d2r
        val p2 = asin(sin(p1) * cos(d) + cos(p1) * sin(d) * cos(th))
        val l2 = l1 + atan2(sin(th) * sin(d) * cos(p1), cos(d) - sin(p1) * sin(p2))
        return doubleArrayOf((l2 / d2r + 540.0) % 360.0 - 180.0, p2 / d2r)
    }

    private val places = listOf(
        Triple("Skåne", 13.15, 55.38), Triple("Kiruna", 20.22, 67.85), Triple("southern hemisphere", 151.2, -33.9),
        Triple("western hemisphere", -74.0, 40.7), Triple("zero meridian", 0.004, 0.004), Triple("antimeridian", 179.97, 65.0),
        Triple("pole", 10.0, 89.8),
    )

    private class Trace(val fixes: MutableList<Fix>, val headings: List<Double>)

    private fun makeTrace(r: Rng, lon0: Double, lat0: Double, n: Int): Trace {
        val fixes = ArrayList<Fix>()
        val headings = ArrayList<Double>()
        var lon = lon0; var lat = lat0
        var heading = r.between(0.0, 360.0); var speed = r.between(30.0, 130.0); var t = 0.0
        repeat(n) {
            val u = r.next()
            speed = when {
                u < 0.03 -> r.between(150.0, 400.0)   // leads up to the 3 000 m ceiling
                u < 0.05 -> r.between(0.0, 14.0)      // below minSpeedKmh
                else -> min(400.0, max(0.0, speed + r.between(-6.0, 6.0)))
            }
            heading = if (r.next() < 0.02) r.between(0.0, 360.0) else (heading + r.between(-6.0, 6.0) + 360.0) % 360.0
            val dt = if (r.next() < 0.9) 1.0 else r.pick(listOf(0.0, 0.5, 2.0, 5.0))
            t += dt
            val p = dest(lon, lat, speed / 3.6 * dt, heading)
            lon = p[0]; lat = p[1]
            val v = if (r.next() < 0.7) speed else null
            val h = if (r.next() < 0.5) heading else null
            fixes.add(Fix(t, lon, lat, v, h))
            headings.add(heading)
        }
        return Trace(fixes, headings)
    }

    private fun makeConfig(r: Rng): EngineConfig {
        var c = EngineConfig()
        if (r.next() < 0.35) return c
        if (r.next() < 0.5) c = c.copy(leadMaxM = r.pick(listOf(400.0, 1200.0, 2000.0, 3000.0, 6000.0, 12000.0)))
        if (r.next() < 0.3) c = c.copy(leadMinM = r.pick(listOf(100.0, 400.0, 900.0)))
        if (r.next() < 0.3) c = c.copy(warnLeadS = r.pick(listOf(10.0, 30.0, 90.0, 200.0)))
        if (r.next() < 0.3) c = c.copy(cameraTriggerM = r.pick(listOf(150.0, 500.0, 1500.0)))
        if (r.next() < 0.3) c = c.copy(accidentMaxAheadM = r.pick(listOf(3000.0, 10000.0, 25000.0)))
        if (r.next() < 0.2) c = c.copy(accidentNearM = r.pick(listOf(500.0, 2000.0, 4000.0)))
        if (r.next() < 0.3) c = c.copy(segmentSampleM = r.pick(listOf(30.0, 100.0, 400.0)))
        if (r.next() < 0.3) c = c.copy(corridorHalfAngleDeg = r.pick(listOf(20.0, 35.0, 90.0, 180.0)))
        if (r.next() < 0.4) {
            val s = r.pick(listOf(30.0, 120.0, 600.0))
            c = c.copy(repeatMinS = s, repeatMinM = r.pick(listOf(200.0, 1000.0, 5000.0)))
        }
        if (r.next() < 0.2) c = c.copy(globalCooldownS = r.pick(listOf(0.0, 3.0, 10.0)))
        if (r.next() < 0.2) c = c.copy(kandidatTakS = r.pick(listOf(0.0, 60.0, 600.0)))
        if (r.next() < 0.2) c = c.copy(kandidatEfterHalkaS = r.pick(listOf(0.0, 120.0, 900.0)))
        if (r.next() < 0.2) c = c.copy(halkZonM = r.pick(listOf(0.0, 500.0, 3000.0)))
        if (r.next() < 0.05) c = c.copy(leadMaxM = r.pick(listOf(Double.NaN, Double.POSITIVE_INFINITY, -5.0)))   // windows that bound nothing
        if (r.next() < 0.05) c = c.copy(cameraTriggerM = r.pick(listOf(Double.NaN, Double.POSITIVE_INFINITY)))
        return c
    }

    private fun makeHazards(r: Rng, tr: Trace, cfg: EngineConfig, n: Int, tag: String, broken: Double): List<Hazard> {
        val out = ArrayList<Hazard>()
        val leadReach = max(cfg.leadMaxM, EngineConfig().leadMaxM)
        fun finite(x: Double, alt: Double) = if (x.isFinite()) x else alt
        fun distance(bound: Double): Double {
            val u = r.next()
            return when {
                u < 0.35 -> max(0.0, bound + r.between(-60.0, 60.0))   // on the edge of the reach
                u < 0.5 -> bound + r.between(60.0, 400.0)              // just outside
                else -> r.between(0.0, min(bound * 1.3, 15000.0))
            }
        }
        var heading = 0.0   // the anchor fix's heading, for a camera's bearing
        fun place(bound: Double): DoubleArray {
            val i = (r.next() * tr.fixes.size).toInt()
            val f = tr.fixes[i]
            heading = tr.headings[i]
            val b = if (r.next() < 0.75) heading + r.between(-40.0, 40.0) else r.between(0.0, 360.0)
            val p = dest(f.lon, f.lat, distance(bound), b)
            if (r.next() < 0.08) p[1] = Math.round(p[1] / 0.05) * 0.05 + r.pick(listOf(-1e-9, 0.0, 1e-9))   // on a cell border
            if (r.next() < 0.08) p[0] = Math.round(p[0] / 0.05) * 0.05 + r.pick(listOf(-1e-9, 0.0, 1e-9))
            if (r.next() < broken) {
                if (r.next() < 0.5) p[0] = r.pick(listOf(Double.NaN, Double.POSITIVE_INFINITY, 181.0, -200.0, 360.0001))
                else p[1] = r.pick(listOf(Double.NaN, Double.NEGATIVE_INFINITY, 91.0, -95.0))
            }
            return p
        }
        val ids = HashMap<String, MutableList<String>>()
        fun id(kind: String): String {
            val seen = ids.getOrPut(kind) { ArrayList() }
            if (seen.isNotEmpty() && r.next() < 0.05) return r.pick(seen)   // duplicate id: order must not matter more than before
            val v = "$tag$kind${seen.size}"
            seen.add(v)
            return v
        }
        repeat(n) {
            when (r.pick(listOf("camera", "camera", "accident", "icing_point", "wildlife", "slippery_segment", "kandidat", "kandidat"))) {
                "camera" -> {
                    val p = place(finite(cfg.cameraTriggerM, 500.0))
                    val bearing = if (r.next() < 0.6) (heading + 180.0 + r.between(-90.0, 90.0) + 360.0) % 360.0 else null
                    out.add(PointHazard(id("camera"), HazardKind.CAMERA, p[0], p[1], bearing,
                        PointMeta(speedLimitKmh = r.pick(listOf(null, 70, 90)))))
                }
                "accident" -> {
                    val p = place(if (r.next() < 0.3) cfg.accidentNearM else finite(cfg.accidentMaxAheadM, 10000.0))
                    out.add(PointHazard(id("accident"), HazardKind.ACCIDENT, p[0], p[1], null, PointMeta(
                        severityCode = r.pick(listOf(null, 1, 2, 4, 5, 5)), road = r.pick(listOf(null, "E22", "108")),
                        endTimeLocal = r.pick(listOf(null, "14:30")))))
                }
                "icing_point" -> {
                    val p = place(finite(leadReach, 3000.0))
                    out.add(PointHazard(id("icing_point"), HazardKind.ICING_POINT, p[0], p[1], null, PointMeta(
                        surfaceTempC = r.pick(listOf(-3.0, 0.5, 1.0, 1.5, 2.5, 3.0, 4.0, null)), moisture = r.next() < 0.6,
                        bridge = r.next() < 0.2, rainH = r.pick(listOf(null, 0.5, 1.9, 3.0)), fall30C = r.pick(listOf(null, 0.5, 0.8, 1.5)))))
                }
                "wildlife" -> {
                    val p = place(finite(leadReach, 3000.0))
                    val meta = if (r.next() < 0.3) PointMeta() else PointMeta(active = r.next() < 0.8)
                    out.add(PointHazard(id("wildlife"), HazardKind.WILDLIFE, p[0], p[1], null, meta))
                }
                "slippery_segment" -> {
                    val line = arrayListOf(place(finite(leadReach, 3000.0)))
                    var b = r.between(0.0, 360.0)
                    var k = 1 + (r.next() * 5).toInt()
                    while (k-- > 0) {
                        val last = line[line.size - 1]
                        b += r.between(-30.0, 30.0)
                        line.add(if (last[0].isFinite() && last[1].isFinite()) dest(last[0], last[1], r.between(50.0, 1500.0), b) else place(3000.0))
                    }
                    val code = r.pick(listOf(null, 1, 2, 3, 4))
                    val info = r.pick(listOf(emptyList<String>(), listOf("Is"), listOf("Våt"), listOf("fläckvis Våt"), listOf("Snöfläckar"), listOf("Normalt")))
                    out.add(SegmentHazard(id("slippery_segment"), line, SegmentMeta(code, info)))
                }
                else -> {
                    val pts = arrayListOf(place(finite(leadReach, 3000.0)))
                    val b = r.between(0.0, 360.0)
                    val step = r.between(200.0, 2500.0)
                    var k = (r.next() * 12).toInt()
                    while (k-- > 0) {
                        val last = pts[pts.size - 1]
                        pts.add(if (last[0].isFinite() && last[1].isFinite()) dest(last[0], last[1], step, b + r.between(-20.0, 20.0)) else place(3000.0))
                    }
                    val segs = out.filterIsInstance<SegmentHazard>()
                    val seg = if (segs.isNotEmpty() && r.next() < 0.5) r.pick(segs).id else null
                    out.add(KandidatHazard(id("kandidat"), pts, seg))
                }
            }
        }
        return out
    }

    private class Scenario(
        val name: String, val cfg: EngineConfig, val hazards: List<Hazard>, val trace: List<Fix>,
        val updates: List<Pair<Int, List<Hazard>>>,
    )

    private fun scenario(seed: Int): Scenario {
        val r = Rng(seed)
        val place = places[seed % places.size]
        val cfg = makeConfig(r)
        val tr = makeTrace(r, place.second, place.third, 200 + (r.next() * 300).toInt())
        val broken = if (seed % 5 == 0) 0.05 else 0.0
        if (broken > 0) {   // fixes the grid cannot place (outside [−90, 90] × [−180, 180], not numbers) and a NaN speed (a NaN lead)
            repeat(4) {
                val i = (r.next() * tr.fixes.size).toInt()
                val f = tr.fixes[i]
                tr.fixes[i] = when ((r.next() * 5).toInt()) {
                    0 -> f.copy(lon = f.lon + 360.0)
                    1 -> f.copy(lon = 180.5)
                    2 -> f.copy(lat = 90.5)
                    3 -> f.copy(lon = Double.NaN)
                    else -> f.copy(speedKmh = Double.NaN)
                }
            }
        }
        val hazards = makeHazards(r, tr, cfg, (r.next() * 130).toInt(), "a", broken)
        val updates = ArrayList<Pair<Int, List<Hazard>>>()
        if (r.next() < 0.3) {   // a fresh snapshot mid-drive: some hazards kept (reordered), some new
            val kept = hazards.filter { r.next() < 0.6 }.map { it to r.next() }.sortedBy { it.second }.map { it.first }
            val at = (r.next() * tr.fixes.size).toInt()
            updates.add(at to kept + makeHazards(r, tr, cfg, (r.next() * 80).toInt(), "b", broken))
        }
        return Scenario("seed $seed (${place.first})", cfg, hazards, tr.fixes, updates)
    }

    /** Both paths side by side; every step's answer must be equal. */
    private fun runBoth(s: Scenario): List<Alert> {
        val g = AlertEngine(s.hazards, s.cfg)
        val f = AlertEngine(s.hazards, s.cfg).also { it.bruteForce = true }
        val alerts = ArrayList<Alert>()
        var u = 0
        for ((i, fix) in s.trace.withIndex()) {
            while (u < s.updates.size && s.updates[u].first == i) {
                g.updateHazards(s.updates[u].second); f.updateHazards(s.updates[u].second); u++
            }
            val a = g.step(fix)
            val b = f.step(fix)
            assertEquals(b, a, "${s.name}, fix $i: the grid and the full scan disagree")
            if (a != null) alerts.add(a)
        }
        return alerts
    }

    @Test
    fun theGridSaysExactlyWhatTheFullScanSays() {
        val kinds = HashMap<HazardKind, Int>()
        val steps = HashSet<String>()
        var edgeCamera = 0; var edgeAccident = 0; var edgeLead = 0; var alerts = 0
        val leadKinds = setOf(HazardKind.ICING_POINT, HazardKind.WILDLIFE, HazardKind.SLIPPERY_SEGMENT, HazardKind.KANDIDAT)
        for (seed in 1..300) {
            val s = scenario(seed)
            for (a in runBoth(s)) {
                alerts++
                kinds[a.kind] = (kinds[a.kind] ?: 0) + 1
                a.step?.let { steps.add(it.wire) }
                if (a.beta && a.kind == HazardKind.ICING_POINT) steps.add("beta")
                // Alerts within 60 m of their reach: what a shrunk bound would lose first.
                if (a.kind == HazardKind.CAMERA && s.cfg.cameraTriggerM - a.distanceM <= 60) edgeCamera++
                if (a.kind == HazardKind.ACCIDENT && (a.step == null || a.step == AccidentStep.EARLY) &&
                    s.cfg.accidentMaxAheadM - a.distanceM <= 60) edgeAccident++
                if (a.kind in leadKinds && s.cfg.leadMaxM - a.distanceM <= 60) edgeLead++
            }
        }
        // Not a vacuous comparison: every kind spoke, every accident step and the beta occurred, many alerts sat on a bound.
        for (k in HazardKind.entries) assertTrue((kinds[k] ?: 0) >= 50, "only ${kinds[k] ?: 0} $k alerts")
        for (st in listOf("early", "reminder", "late", "beta")) assertTrue(st in steps, "no $st alert")
        assertTrue(alerts >= 2500, "only $alerts alerts")
        assertTrue(edgeCamera >= 80 && edgeAccident >= 80 && edgeLead >= 80,
            "too few alerts on a bound: camera $edgeCamera, accident $edgeAccident, lead $edgeLead")
    }

    private fun repoRoot(): File {
        var d = File(System.getProperty("user.dir")).absoluteFile
        while (!File(d, "engine/vectors").isDirectory) {
            d = d.parentFile ?: error("engine/vectors not found above ${System.getProperty("user.dir")}")
        }
        return d
    }

    /** The Skåne fixture's hazards: cameras, stretches and icing points. */
    private fun fixtureHazard(o: JSONObject): Hazard {
        val m = o.optJSONObject("meta")
        val kind = HazardKind.of(o.getString("kind"))
        if (kind == HazardKind.SLIPPERY_SEGMENT) {
            val line = o.getJSONArray("line").let { a -> (0 until a.length()).map { val p = a.getJSONArray(it); doubleArrayOf(p.getDouble(0), p.getDouble(1)) } }
            return SegmentHazard(o.getString("id"), line, SegmentMeta(
                code = m?.let { if (it.has("code") && !it.isNull("code")) it.getInt("code") else null },
                info = m?.optJSONArray("info")?.let { a -> (0 until a.length()).map { a.getString(it) } } ?: emptyList()))
        }
        return PointHazard(o.getString("id"), kind, o.getDouble("lon"), o.getDouble("lat"),
            if (o.has("bearing") && !o.isNull("bearing")) o.getDouble("bearing") else null,
            PointMeta(surfaceTempC = m?.let { if (it.has("surfaceTempC") && !it.isNull("surfaceTempC")) it.getDouble("surfaceTempC") else null },
                      moisture = m?.optBoolean("moisture", false) ?: false))
    }

    @Test
    fun skaneFixtureWithKandidatAndWildlifePoints() {
        val doc = JSONObject(File(repoRoot(), "engine/fixtures/skane_vag108.json").readText())
        val trace = doc.getJSONArray("trace").let { a ->
            (0 until a.length()).map { val o = a.getJSONObject(it); Fix(o.getDouble("t"), o.getDouble("lon"), o.getDouble("lat"), o.getDouble("speedKmh")) }
        }
        val hazards = ArrayList<Hazard>()
        doc.getJSONArray("hazards").let { a -> for (j in 0 until a.length()) hazards.add(fixtureHazard(a.getJSONObject(j))) }
        val r = Rng(108)
        for (s in 0 until 200) {   // 2 000 kandidat points within 4 km of the road
            val f = trace[(r.next() * trace.size).toInt()]
            hazards.add(KandidatHazard("k$s", (0 until 10).map { dest(f.lon, f.lat, r.between(0.0, 4000.0), r.between(0.0, 360.0)) }))
        }
        for (w in 0 until 3000) {   // 3 000 wildlife points in the county, thirty by the road
            val f = trace[(r.next() * trace.size).toInt()]
            val p = if (w % 100 == 0) dest(f.lon, f.lat, r.between(0.0, 300.0), r.between(0.0, 360.0))
                    else doubleArrayOf(r.between(12.5, 14.5), r.between(55.3, 56.5))
            hazards.add(PointHazard("w$w", HazardKind.WILDLIFE, p[0], p[1]))
        }
        val alerts = runBoth(Scenario("Skåne + kandidater", EngineConfig(), hazards, trace, emptyList()))
        assertTrue(alerts.any { it.kind == HazardKind.KANDIDAT }, "the kandidat points must speak")
        assertTrue(alerts.any { it.kind == HazardKind.WILDLIFE }, "the wildlife points must speak")
    }

    @Test
    fun theWindowsNorthAndSouthEdges() {
        // The latitude bound is reached exactly due north and due south (|Δφ| = distM / R), so a fix there tests the margin itself:
        // the window's edge sweeps across the cell borders in 2.2 m steps, and every hazard has one fix 0.5 m inside its reach.
        class Case(val reach: Double, val speedKmh: Double, val kind: HazardKind)
        val cases = listOf(Case(500.0, 80.0, HazardKind.CAMERA), Case(10_000.0, 80.0, HazardKind.ACCIDENT), Case(3000.0, 400.0, HazardKind.WILDLIFE))
        var spoke = 0
        for (c in cases) {
            for (j in 0 until 3000) {
                for (north in listOf(true, false)) {
                    val lon = 15.0
                    val lat = 59.0 + j * 0.00002
                    val p = dest(lon, lat, c.reach - 0.5, if (north) 0.0 else 180.0)
                    val fix = Fix(0.0, p[0], p[1], c.speedKmh, if (north) 180.0 else 0.0)
                    val name = "${c.reach} m ${if (north) "north" else "south"}, step $j"
                    spoke += runBoth(Scenario(name, EngineConfig(), listOf(PointHazard(c.kind.wire, c.kind, lon, lat)), listOf(fix), emptyList())).size
                }
            }
        }
        assertEquals(cases.size * 3000 * 2, spoke, "every hazard 0.5 m inside its reach must speak")
    }
}
