// Kort #218: the guard's road-data loads as executable claims. The first two tests each lean on ONE guard in
// SnapshotSchedule (the running load, the wait after a failure), so a mutation of one fails its own test and not the other's.
// DECISIONS #741 punkt 4: the next koll on publicera's grid (gen + 180 s, then every 120 s), an omkoll once after 30 s.
package se.halkvakt.app

import se.halkvakt.app.SnapshotRepo.Utfall
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class SnapshotScheduleTest {
    private val gen = 1_792_299_600_000L   // 2026-10-18T05:00:00Z

    @Test fun oneLoadAtATime_fixesDuringASlowLoadStartNothing() {
        val s = SnapshotSchedule()
        assertTrue(s.tryBegin(0L, force = true))            // the guard starts
        for (t in 1L..120L) assertFalse(s.tryBegin(t * 1000L), "fix at $t s started a second load")
    }

    @Test fun aFailedLoadWaitsAMinute() {
        val s = SnapshotSchedule()
        assertTrue(s.tryBegin(0L))
        s.done(5_000L, Utfall.FEL, gen)
        assertFalse(s.tryBegin(64_999L))
        assertTrue(s.tryBegin(65_000L))
    }

    @Test fun nyLaggerNastaKollPaGenPlus180s() {
        val s = SnapshotSchedule()
        assertTrue(s.tryBegin(gen + 20_000L))
        s.done(gen + 21_000L, Utfall.NY, gen)
        assertFalse(s.tryBegin(gen + 180_000L - 1))
        assertTrue(s.tryBegin(gen + 180_000L))
    }

    /** A late NY (the file older than three minutes on arrival) lands on the next grid point: never in the past, never more than
     *  120 s away, and on the grid gen + 180 s + k · 120 s. */
    @Test fun enSenNyHamnarPaNastaRutnatspunkten() {
        for (alder in 180_000L..3_600_000L step 7_001L) {
            val nu = gen + alder
            val (nasta, omkoll) = SnapshotSchedule.nastaKoll(nu, Utfall.NY, gen, omkollad = false)
            assertTrue(nasta > nu, "ålder $alder ms: nästa koll $nasta ligger inte efter nu $nu")
            assertTrue(nasta - nu <= SnapshotSchedule.PUBLICERING_MS, "ålder $alder ms: nästa koll ${nasta - nu} ms bort")
            assertEquals(0L, (nasta - gen - 180_000L) % SnapshotSchedule.PUBLICERING_MS, "ålder $alder ms: utanför rutnätet")
            assertFalse(omkoll)
        }
        assertEquals(gen + 300_000L, SnapshotSchedule.rutnat(gen + 180_000L, gen), "exakt på punkten ⇒ nästa punkt")
        assertEquals(gen + 420_000L, SnapshotSchedule.rutnat(gen + 300_000L, gen))
    }

    @Test fun oforandradGerTrettioSekunderEnGangOchSedanRutnatet() {
        val s = SnapshotSchedule()
        assertTrue(s.tryBegin(gen + 190_000L))
        s.done(gen + 190_000L, Utfall.OFORANDRAD, gen)
        assertFalse(s.tryBegin(gen + 220_000L - 1))
        assertTrue(s.tryBegin(gen + 220_000L), "omkollen 30 s senare")
        s.done(gen + 220_000L, Utfall.OFORANDRAD, gen)
        assertFalse(s.tryBegin(gen + 250_000L), "ingen andra omkoll")
        assertFalse(s.tryBegin(gen + 300_000L - 1))
        assertTrue(s.tryBegin(gen + 300_000L), "sedan rutnätet: gen + 180 s + 120 s")
    }

    @Test fun felGerSextioSekunderOchNollstallerOmkollen() {
        assertEquals(1_060_000L to false, SnapshotSchedule.nastaKoll(1_000_000L, Utfall.FEL, gen, omkollad = true))
        assertEquals(1_060_000L to false, SnapshotSchedule.nastaKoll(1_000_000L, Utfall.FEL, 0L, omkollad = false))
    }

    @Test fun oktantGenGerEttHundraTjugoSekunder() {
        assertEquals(1_120_000L to false, SnapshotSchedule.nastaKoll(1_000_000L, Utfall.NY, 0L, omkollad = false))
        assertEquals(1_120_000L to false, SnapshotSchedule.nastaKoll(1_000_000L, Utfall.OFORANDRAD, 0L, omkollad = true))
    }

    @Test fun startSkipsTheWait() {
        val s = SnapshotSchedule()
        assertTrue(s.tryBegin(gen))
        s.done(gen, Utfall.NY, gen)
        assertTrue(s.tryBegin(gen + 1_000L, force = true))
    }

    /** A koll at the start is no omkoll: OFORANDRAD there gets its own 30 s, even when an omkoll was pending. */
    @Test fun enKollVidStartArIngenOmkoll() {
        val s = SnapshotSchedule()
        assertTrue(s.tryBegin(gen + 190_000L))
        s.done(gen + 190_000L, Utfall.OFORANDRAD, gen)     // an omkoll is now pending
        assertTrue(s.tryBegin(gen + 200_000L, force = true))
        s.done(gen + 200_000L, Utfall.OFORANDRAD, gen)
        assertTrue(s.tryBegin(gen + 230_000L), "the forced koll got its own omkoll")
    }

    /** The phone's clock is an hour behind: gen lies an hour in the phone's future, and the koll still comes within 180 s. */
    @Test fun enKlockaSomGarEfterSkjuterAldrigKollenMerAnTreMinuter() {
        val nu = 1_000_000_000L
        assertEquals(nu + 180_000L, SnapshotSchedule.nastaKoll(nu, Utfall.NY, nu + 3_600_000L, false).first)
        assertEquals(nu + 180_000L, SnapshotSchedule.nastaKoll(nu, Utfall.OFORANDRAD, nu + 3_600_000L, true).first)
    }

    /** The card's case: ten minutes of 1 Hz fixes without network, each failed load taking 3 s. Before the fix: 600 loads. */
    @Test fun tenMinutesWithoutNetworkGiveTenLoadsNotSixHundred() {
        val s = SnapshotSchedule()
        var loads = 0; var endsAt = -1L
        for (t in 0L until 600L) {
            val now = t * 1000L
            if (now == endsAt) s.done(now, Utfall.FEL, 0L)
            if (s.tryBegin(now, force = t == 0L)) { loads++; endsAt = now + 3_000L }
        }
        assertEquals(10, loads)
    }
}
