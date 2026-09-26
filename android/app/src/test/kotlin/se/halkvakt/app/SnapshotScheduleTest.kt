// Kort #218: the guard's road-data loads as executable claims. The first two tests each lean on ONE guard in
// SnapshotSchedule (the running load, the wait after a failure), so a mutation of one fails its own test and not the other's.
package se.halkvakt.app

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class SnapshotScheduleTest {

    @Test fun oneLoadAtATime_fixesDuringASlowLoadStartNothing() {
        val s = SnapshotSchedule()
        assertTrue(s.tryBegin(0L, force = true))            // the guard starts
        for (t in 1L..120L) assertFalse(s.tryBegin(t * 1000L), "fix at $t s started a second load")
    }

    @Test fun aFailedLoadWaitsAMinute() {
        val s = SnapshotSchedule()
        assertTrue(s.tryBegin(0L))
        s.done(5_000L, ok = false)
        assertFalse(s.tryBegin(64_999L))
        assertTrue(s.tryBegin(65_000L))
    }

    @Test fun aGoodLoadIsRefreshedAfterHalfAnHour() {
        val s = SnapshotSchedule()
        assertTrue(s.tryBegin(0L))
        s.done(0L, ok = true)
        assertFalse(s.tryBegin(30 * 60_000L - 1))
        assertTrue(s.tryBegin(30 * 60_000L))
    }

    @Test fun startSkipsTheWait() {
        val s = SnapshotSchedule()
        assertTrue(s.tryBegin(0L))
        s.done(0L, ok = true)
        assertTrue(s.tryBegin(1_000L, force = true))
    }

    /** The card's case: ten minutes of 1 Hz fixes without network, each failed load taking 3 s. Before the fix: 600 loads. */
    @Test fun tenMinutesWithoutNetworkGiveTenLoadsNotSixHundred() {
        val s = SnapshotSchedule()
        var loads = 0; var endsAt = -1L
        for (t in 0L until 600L) {
            val now = t * 1000L
            if (now == endsAt) s.done(now, ok = false)
            if (s.tryBegin(now, force = t == 0L)) { loads++; endsAt = now + 3_000L }
        }
        assertEquals(10, loads)
    }
}
