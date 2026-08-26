package se.halkvakt.app

import se.halkvakt.engine.HazardKind
import se.halkvakt.engine.PointHazard
import se.halkvakt.engine.PointMeta
import se.halkvakt.engine.SegmentHazard
import se.halkvakt.engine.SegmentMeta
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class NearbyTest {
    private val cam = PointHazard("c1", HazardKind.CAMERA, 18.06, 59.33, meta = PointMeta(speedLimitKmh = 80))
    private val ice = PointHazard("i1", HazardKind.ICING_POINT, 18.10, 59.36, meta = PointMeta(surfaceTempC = 0.4, moisture = true))
    private val seg = SegmentHazard("s1", listOf(doubleArrayOf(17.9, 59.5), doubleArrayOf(17.95, 59.52)),
        meta = SegmentMeta(info = listOf("Risk för frost och is")))
    private val far = PointHazard("f1", HazardKind.CAMERA, 12.0, 57.7) // Göteborg — utanför sex mil

    @Test fun sortsByDistanceAndCapsAtSixtyKm() {
        val l = Nearby.nearest(listOf(seg, far, ice, cam), lon = 18.06, lat = 59.33)
        assertEquals(3, l.size) // Göteborg utsållad
        assertEquals(HazardKind.CAMERA, l[0].kind)
        assertTrue(l[0].distM < 100.0)
        assertEquals(HazardKind.ICING_POINT, l[1].kind)
    }
    @Test fun humanSecondaries() {
        assertEquals("+0,4° och vått", Nearby.secondary(ice))
        assertEquals("80 km/h", Nearby.secondary(cam))
        assertEquals("Risk för frost och is", Nearby.secondary(seg))
        assertNull(Nearby.secondary(PointHazard("w", HazardKind.WILDLIFE, 18.0, 59.0)))
    }
    @Test fun distanceFormatting() {
        assertEquals("50 m", Nearby.distText(10.0))
        assertEquals("800 m", Nearby.distText(812.0))
        assertEquals("1,2 km", Nearby.distText(1234.0))
    }
}
