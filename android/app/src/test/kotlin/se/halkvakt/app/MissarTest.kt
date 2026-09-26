// Kort #203 lager 2: förarens missar som körbara påståenden. Det som lämnar telefonen står i body() — provet läser den.
package se.halkvakt.app

import se.halkvakt.engine.SegmentHazard
import se.halkvakt.engine.SegmentMeta
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class MissarTest {
    private val stationer = listOf(Station("2135", 13.00, 55.60), Station("2551", 16.01, 66.73), Station("1712", 14.29, 59.31))

    @Test fun narmasteStationArAlltidEnStation() {
        assertEquals("wx:2135", Missar.narmasteStation(stationer, 13.10, 55.65))
        assertEquals("wx:1712", Missar.narmasteStation(stationer, 14.00, 59.00))
        assertNull(Missar.narmasteStation(emptyList(), 13.10, 55.65), "utan stationslista finns inget att peka på")
    }

    @Test fun segmentBaraInomTvaKilometer() {
        val nara = SegmentHazard("seg:1", listOf(doubleArrayOf(13.000, 55.600), doubleArrayOf(13.010, 55.600)), SegmentMeta(code = 4))
        val langt = SegmentHazard("seg:2", listOf(doubleArrayOf(13.500, 55.600)), SegmentMeta(code = 4))
        assertEquals("seg:1", Missar.narmasteSegment(listOf(langt, nara), 13.005, 55.610))   // ~1,1 km från seg:1
        assertNull(Missar.narmasteSegment(listOf(langt), 13.005, 55.610), "seg:2 ligger ~31 km bort")
    }

    @Test fun enOmarkeradMissSkickasAldrig() {
        var l = Missar.markera(emptyList(), 1_000L, "wx:2135", null)
        assertEquals(1, Missar.omarkerade(l, 0L).size)
        assertTrue(Missar.pending(l, now = 2_000L).isEmpty(), "tystnad är inget svar — utan val skickas ingenting")
        l = Missar.valj(l, 1_000L, "halka")
        assertEquals(listOf("halka"), Missar.pending(l, now = 2_000L).map { it.vad })
        assertTrue(Missar.omarkerade(l, 0L).isEmpty())
    }

    @Test fun ettNyttValErsatterOchBlirOsantIgen() {
        var l = Missar.valj(Missar.markera(emptyList(), 1_000L, "wx:2135", null), 1_000L, "vilt")
        l = Missar.markSent(l, Missar.pending(l, now = 2_000L))
        assertTrue(Missar.pending(l, now = 2_000L).isEmpty())
        l = Missar.valj(l, 1_000L, "olycka")
        assertEquals(listOf("olycka"), Missar.pending(l, now = 2_000L).map { it.vad })
        assertEquals(l, Missar.valj(l, 1_000L, "is"), "ett ord utanför de fem ändrar ingenting")
    }

    @Test fun utanStationSparasIngenting() {
        assertTrue(Missar.markera(emptyList(), 1_000L, null, "seg:1").isEmpty())
    }

    @Test fun kroppenArHelaKroppen() {
        val e = MissEntry(Facit.MAX_AGE_MS, "wx:2135", "seg:16010", "vatten", false)
        assertEquals("{\"miss\":true,\"t\":\"1970-01-02T23:00:00Z\",\"vad\":\"vatten\",\"station\":\"wx:2135\"," +
            "\"segment\":\"seg:16010\",\"app\":\"android\",\"ver\":\"0.3.9\"}", Missar.body(e, "android", "0.3.9"))
        assertTrue(Missar.body(e.copy(segment = null), "android", "0.3.9").contains("\"segment\":null"))
    }

    @Test fun avkodarenTalarEnKorruptRad() {
        val l = listOf(MissEntry(1L, "wx:1", null, null, false), MissEntry(2L, "wx:2", "seg:3", "annat", true))
        assertEquals(l, Missar.decode(Missar.encode(l) + "\nskräp\n3\t\t\t\t0"))
    }
}
