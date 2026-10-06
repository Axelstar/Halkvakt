// Cadence rules as executable claims. Kort #218: the claims are behaviour, not the policy's own
// constants — a tier may loosen as long as the guard is at full cadence before any hazard can
// speak, and fullCadenceBeforeAnyHazardCanSpeak() fails the moment it is not.
package se.halkvakt.app

import se.halkvakt.engine.EngineConfig
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.fail

class CadencePolicyTest {

    @Test fun noSnapshotMeansFullAlertness() {
        assertTrue(CadencePolicy.intervalMs(null) <= 1_000L)
    }

    /**
     * A drive at worst-case speed straight at a hazard, sampled the way GuardService samples (the next fix comes
     * intervalMs(distance) later), from every start 3.6–60 km in 50 m steps. Inside the engine's reach
     * (leadMaxM + cameraTriggerM) every fix must arrive at most one second after the previous one.
     */
    @Test fun fullCadenceBeforeAnyHazardCanSpeak() {
        val cfg = EngineConfig()
        val reachM = cfg.leadMaxM + cfg.cameraTriggerM
        val mps = 140.0 / 3.6
        for (start in 3_600..60_000 step 50) {
            var d = start.toDouble(); var gapMs = 0L
            while (d > 0) {
                if (d <= reachM && gapMs > 1_000L) fail("start $start m: fix at ${d.toInt()} m came $gapMs ms after the previous one")
                gapMs = CadencePolicy.intervalMs(d)
                d -= mps * gapMs / 1000.0
            }
        }
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

    // ── Å2, the standstill tier (DECISIONS #461) ──────────────────────────────────────────────────────────

    @Test fun aStillPhoneNearAHazardSamplesAtMid() {
        assertEquals(CadencePolicy.MID_MS, CadencePolicy.intervalMs(2_000.0, 0.0))
        assertEquals(CadencePolicy.MID_MS, CadencePolicy.intervalMs(2_000.0, 2.9))
    }

    @Test fun aRollingCarKeepsItsCadence() {
        assertEquals(CadencePolicy.NEAR_MS, CadencePolicy.intervalMs(2_000.0, 3.0))
        assertEquals(CadencePolicy.NEAR_MS, CadencePolicy.intervalMs(2_000.0, 90.0))
        assertEquals(CadencePolicy.FAR_MS, CadencePolicy.intervalMs(50_000.0, 90.0))
    }

    @Test fun unknownSpeedIsNotStill() {
        assertEquals(CadencePolicy.NEAR_MS, CadencePolicy.intervalMs(2_000.0, null))
        assertEquals(CadencePolicy.NEAR_MS, CadencePolicy.intervalMs(null, null))
    }

    @Test fun standstillNeverSpeedsUpAFarTier() {
        assertEquals(CadencePolicy.FAR_MS, CadencePolicy.intervalMs(50_000.0, 0.0))
    }

    /** Pull away hard (3 m/s²) from standstill next to a hazard: the car must be back on 1 s cadence within 50 m. */
    @Test fun pullingAwayFromStandstillIsBackOnFullCadenceWithinFiftyMetres() {
        val a = 3.0
        var t = 0.0; var v = 0.0; var travelled = 0.0
        var gapMs = CadencePolicy.intervalMs(1_000.0, 0.0)     // the fix that saw the car still
        while (gapMs > CadencePolicy.NEAR_MS) {
            val dt = gapMs / 1000.0
            travelled += v * dt + 0.5 * a * dt * dt; v += a * dt; t += dt
            gapMs = CadencePolicy.intervalMs(1_000.0 - travelled, v * 3.6)
        }
        assertTrue(travelled <= 50.0, "travelled $travelled m before full cadence")
    }
}
