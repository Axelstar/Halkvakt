package se.halkvakt.app

import org.junit.Assert.*
import org.junit.Test
import se.halkvakt.engine.*

class AgeGateTest {
    private val hazards = listOf(
        PointHazard("wx:1", HazardKind.ICING_POINT, 18.0, 59.0),
        SegmentHazard("seg:1", listOf(doubleArrayOf(18.0, 59.0), doubleArrayOf(18.1, 59.1))),
        PointHazard("dev:1", HazardKind.ACCIDENT, 18.0, 59.0),
        PointHazard("cam:1", HazardKind.CAMERA, 18.0, 59.0),
    )
    private val t0 = 1_000_000_000_000L

    @Test fun `färsk snapshot släpper igenom allt`() {
        val r = AgeGate.filter(hazards, t0, t0 + 44 * 60_000)
        assertEquals(4, r.hazards.size); assertFalse(r.stale)
    }

    @Test fun `45 min droppar väglag men behåller olycka och kamera`() {
        val r = AgeGate.filter(hazards, t0, t0 + 50 * 60_000)
        assertTrue(r.stale)
        assertEquals(setOf("dev:1", "cam:1"), r.hazards.map { it.id }.toSet())
    }

    @Test fun `2 h droppar även olyckan, kameran består`() {
        val r = AgeGate.filter(hazards, t0, t0 + 121 * 60_000)
        assertTrue(r.stale)
        assertEquals(listOf("cam:1"), r.hazards.map { it.id })
    }
}
