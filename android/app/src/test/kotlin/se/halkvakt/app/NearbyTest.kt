package se.halkvakt.app

import se.halkvakt.engine.*
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class NearbyTest {
    private val here = 18.06 to 59.33 // Sthlm
    private fun cam(lon: Double, limit: Int? = 80) =
        PointHazard("c$lon", HazardKind.CAMERA, lon, 59.33, meta = PointMeta(speedLimitKmh = limit))

    @Test fun sortsByDistanceAndCaps() {
        val h = listOf(cam(18.20), cam(18.08), cam(18.50), cam(19.20), cam(25.0))
        val r = Nearby.nearest(h, here.first, here.second, n = 3, maxKm = 60.0)
        assertEquals(3, r.size)
        assert(r[0].distM < r[1].distM && r[1].distM < r[2].distM)
        assertEquals("80 km/h", r[0].secondary)
    }
    @Test fun icingSecondaryFromMeta() {
        val p = PointHazard("i", HazardKind.ICING_POINT, 18.07, 59.33,
            meta = PointMeta(surfaceTempC = 0.4, moisture = true))
        assertEquals("+0,4° och vått", Nearby.nearest(listOf(p), here.first, here.second)[0].secondary)
    }
    @Test fun segmentUsesInfoStrings() {
        val s = SegmentHazard("s", listOf(doubleArrayOf(18.07, 59.33)), SegmentMeta(info = listOf("is", "snö", "x")))
        assertEquals("is · snö", Nearby.nearest(listOf(s), here.first, here.second)[0].secondary)
        assertEquals(HazardKind.SLIPPERY_SEGMENT, Nearby.nearest(listOf(s), here.first, here.second)[0].kind)
    }
    @Test fun emptySecondaryBecomesNull() {
        val p = PointHazard("w", HazardKind.WILDLIFE, 18.07, 59.33)
        assertNull(Nearby.nearest(listOf(p), here.first, here.second)[0].secondary)
    }
    @Test fun distTextRounding() {
        assertEquals("450 m", Nearby.distText(447.0))
        assertEquals("1,2 km", Nearby.distText(1234.0))
    }
}
