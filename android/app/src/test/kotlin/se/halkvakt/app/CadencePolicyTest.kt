// Cadence rules as executable claims, including the safety-margin arithmetic from the
// policy header — if anyone ever loosens a tier, the margin proof fails loudly.
package se.halkvakt.app

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class CadencePolicyTest {

    @Test fun noSnapshotMeansFullAlertness() {
        assertEquals(CadencePolicy.NEAR_MS, CadencePolicy.intervalMs(null))
    }

    @Test fun tiers() {
        assertEquals(CadencePolicy.NEAR_MS, CadencePolicy.intervalMs(0.0))
        assertEquals(CadencePolicy.NEAR_MS, CadencePolicy.intervalMs(5_000.0))
        assertEquals(CadencePolicy.MID_MS, CadencePolicy.intervalMs(5_001.0))
        assertEquals(CadencePolicy.MID_MS, CadencePolicy.intervalMs(20_000.0))
        assertEquals(CadencePolicy.FAR_MS, CadencePolicy.intervalMs(20_001.0))
        assertEquals(CadencePolicy.FAR_MS, CadencePolicy.intervalMs(150_000.0))
    }

    @Test fun safetyMarginAtWorstCaseSpeedHolds() {
        val worstMps = 140.0 / 3.6                       // 140 km/h
        val maxAlertLeadM = 3_000.0                      // engine leadMaxM
        // MID tier: distance travelled in one 5 s gap after we last saw d = NEAR boundary
        val midGapM = worstMps * (CadencePolicy.MID_MS / 1000.0)
        assertTrue(
            CadencePolicy.NEAR_WITHIN_M - midGapM > maxAlertLeadM + 1_000.0,
            "NEAR boundary minus one MID gap must clear max alert lead by ≥1 km",
        )
        // FAR tier: one 15 s gap must not be able to jump past the whole MID band
        val farGapM = worstMps * (CadencePolicy.FAR_MS / 1000.0)
        assertTrue(
            CadencePolicy.MID_WITHIN_M - CadencePolicy.NEAR_WITHIN_M > farGapM * 2,
            "MID band must be wider than two FAR gaps at worst-case speed",
        )
    }
}
