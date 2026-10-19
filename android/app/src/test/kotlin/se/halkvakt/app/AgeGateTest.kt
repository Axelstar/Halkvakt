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

    @Test fun `djuret åldras som olyckan (#318)`() {
        val med = hazards + PointHazard("djur:1", HazardKind.WILDLIFE, 18.0, 59.0)
        assertTrue(AgeGate.filter(med, t0, t0 + 50 * 60_000).hazards.any { it.id == "djur:1" })
        assertFalse(AgeGate.filter(med, t0, t0 + 121 * 60_000).hazards.any { it.id == "djur:1" })
    }

    @Test fun `kandidaten åldras som halksträckorna (#577)`() {
        val med = hazards + KandidatHazard("kand:S1", listOf(doubleArrayOf(18.0, 59.0)))
        assertTrue(AgeGate.filter(med, t0, t0 + 44 * 60_000).hazards.any { it.id == "kand:S1" })
        assertFalse(AgeGate.filter(med, t0, t0 + 50 * 60_000).hazards.any { it.id == "kand:S1" })
    }

    // Provkörning 18/10: gammal data ur den sparade filen sägs först när den står kvar vid nästa försök.
    @Test fun gammalSparadFilSagsForstVidAndraForsoket() {
        val g = AgeGate.StaleGrace()
        assertFalse(g.announce(stale = true, fromCache = true))    // nätmiss: tyst, nytt försök om en minut
        assertTrue(g.announce(stale = true, fromCache = true))     // står kvar: raden sägs
    }

    @Test fun nathamtningEmellanNollstallerFristen() {
        val g = AgeGate.StaleGrace()
        assertFalse(g.announce(stale = true, fromCache = true))
        assertFalse(g.announce(stale = false, fromCache = false))  // färsk från nätet: tyst
        assertFalse(g.announce(stale = true, fromCache = true))    // ny nätmiss: tyst igen
    }

    @Test fun gammalDataFranNatetSagsDirekt() {
        assertTrue(AgeGate.StaleGrace().announce(stale = true, fromCache = false))
        assertFalse(AgeGate.StaleGrace().announce(stale = false, fromCache = true))
    }
}
