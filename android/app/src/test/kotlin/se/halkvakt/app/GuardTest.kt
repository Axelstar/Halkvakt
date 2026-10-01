// Kort #262 Å5: the cached nearest-hazard distance may be a lower bound between sweeps — and a lower bound
// may only ever make the GPS cadence FASTER than the exact distance would, never slower. The exact value
// is recomputed here independently, the same way Guard does it, so the claim is about behaviour.
package se.halkvakt.app

import se.halkvakt.engine.Geo
import se.halkvakt.engine.HazardKind
import se.halkvakt.engine.PointHazard
import se.halkvakt.engine.SegmentHazard
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class GuardTest {

    private fun guard(hazards: List<se.halkvakt.engine.Hazard>) =
        Guard(hazards, speak = {}, notify = {})

    private fun exact(coords: List<DoubleArray>, lon: Double, lat: Double) =
        coords.minOf { Geo.haversineM(lon, lat, it[0], it[1]) }

    @Test fun boundNeverSlowsTheCadence() {
        val rnd = Random(262)
        // A few hundred hazards spread over southern Sweden: points plus one segment with vertices.
        val points = (1..300).map { PointHazard("p$it", HazardKind.CAMERA, 12.0 + rnd.nextDouble() * 6, 55.5 + rnd.nextDouble() * 4) }
        val line = (0..40).map { doubleArrayOf(13.0 + it * 0.02, 58.0 + it * 0.01) }
        val hazards = points + SegmentHazard("s1", line)
        val coords = points.map { doubleArrayOf(it.lon, it.lat) } + line
        val g = guard(hazards)

        // A drive: 20 000 fixes, ~39 m/s (140 km/h) in a slowly turning heading, 1 s apart.
        var lon = 13.0; var lat = 56.0; var heading = 0.3
        repeat(20_000) { i ->
            heading += (rnd.nextDouble() - 0.5) * 0.05
            lon += 39.0 * kotlin.math.cos(heading) / (111_320.0 * kotlin.math.cos(Math.toRadians(lat)))
            lat += 39.0 * kotlin.math.sin(heading) / 111_320.0
            val truth = exact(coords, lon, lat)
            val bound = g.nearestHazardM(lon, lat)!!
            assertTrue(bound <= truth + 0.01, "fix $i: bound ${bound.toInt()} m above the truth ${truth.toInt()} m")
            assertTrue(CadencePolicy.intervalMs(bound) <= CadencePolicy.intervalMs(truth),
                "fix $i: bound ${bound.toInt()} m picked a slower tier than the truth ${truth.toInt()} m")
            assertTrue(bound >= truth / 3, "fix $i: bound ${bound.toInt()} m is uselessly far below the truth ${truth.toInt()} m")
        }
    }

    @Test fun newSnapshotDropsTheOldBound() {
        val far = PointHazard("far", HazardKind.CAMERA, 18.0, 63.0)
        val g = guard(listOf(far))
        val first = g.nearestHazardM(13.0, 56.0)!!
        assertTrue(first > 500_000)                                   // Norrland: FAR tier
        // A hazard appears right here mid-drive — the cached bound from the old set must not hide it.
        g.updateHazards(listOf(far, PointHazard("here", HazardKind.ACCIDENT, 13.001, 56.0)))
        val after = g.nearestHazardM(13.0, 56.0)!!
        assertTrue(after < 100, "after updateHazards the nearest should be ~60 m, got ${after.toInt()} m")
        assertEquals(CadencePolicy.NEAR_MS, CadencePolicy.intervalMs(after))
    }

    @Test fun emptySnapshotStaysNull() {
        assertNull(guard(emptyList()).nearestHazardM(13.0, 56.0))
    }
}
