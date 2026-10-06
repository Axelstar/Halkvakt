// Every autostart rule as an executable claim. Runs on the JVM in CI — no emulator needed
// for the brain; only the thin Android glue remains device-territory.
package se.halkvakt.app

import kotlin.test.Test
import kotlin.test.assertTrue
import kotlin.test.assertEquals

class AutostartControllerTest {

    @Test fun vehicleEnterStarts_exitStops() {
        val c = AutostartController()
        assertEquals(AutoCmd.START, c.onVehicleEnter())
        assertEquals(AutoCmd.STOP, c.onVehicleExit())
    }

    @Test fun exitWithoutAutoStartIsIgnored_manualDrivesAreNeverKilled() {
        val c = AutostartController()
        // Guard was started by hand in the UI; AR later claims we exited a vehicle.
        assertEquals(AutoCmd.NONE, c.onVehicleExit())
    }

    @Test fun knownCarConnectingStartsInstantly() {
        val c = AutostartController(learnedCars = setOf("AA:BB"))
        assertEquals(AutoCmd.START, c.onAclConnected("AA:BB", guardRunning = false))
        assertEquals(AutoCmd.STOP, c.onAclDisconnected("AA:BB"))
    }

    @Test fun unknownDeviceDuringDriveIsLearned() {
        val c = AutostartController()
        assertEquals(AutoCmd.LEARN, c.onAclConnected("CA:FE", guardRunning = true))
        assertEquals(setOf("CA:FE"), c.learnedCars())
        // Next time: turbo path.
        assertEquals(AutoCmd.START, c.onAclConnected("CA:FE", guardRunning = false))
    }

    @Test fun unknownDeviceWhileIdleDoesNothing_headphonesAtHome() {
        val c = AutostartController()
        assertEquals(AutoCmd.NONE, c.onAclConnected("DE:AD", guardRunning = false))
        assertEquals(emptySet<String>(), c.learnedCars())
    }

    @Test fun unknownDeviceDisconnectNeverStops() {
        val c = AutostartController(learnedCars = setOf("AA:BB"))
        c.onVehicleEnter()
        assertEquals(AutoCmd.NONE, c.onAclDisconnected("DE:AD"))
    }

    @Test fun manualStopDisarmsAutoStop() {
        val c = AutostartController(learnedCars = setOf("AA:BB"))
        c.onAclConnected("AA:BB", guardRunning = false)
        c.onManualStop()
        assertEquals(AutoCmd.NONE, c.onAclDisconnected("AA:BB"))
        assertEquals(AutoCmd.NONE, c.onVehicleExit())
    }

    @Test fun fullCommute_btFirstThenArBackup() {
        val c = AutostartController(learnedCars = setOf("CA:FE"))
        assertEquals(AutoCmd.START, c.onAclConnected("CA:FE", guardRunning = false))
        assertEquals(AutoCmd.START, c.onVehicleEnter())      // AR arrives late: idempotent start
        assertEquals(AutoCmd.STOP, c.onAclDisconnected("CA:FE"))
        assertEquals(AutoCmd.NONE, c.onVehicleExit())        // already stopped: no double stop
    }

    /** #248: the glue recreates the controller per system event; the start must survive that. */
    @Test fun autoStartSurvivesANewController() {
        val first = AutostartController(learnedCars = setOf("AA:BB"))
        assertEquals(AutoCmd.START, first.onAclConnected("AA:BB", guardRunning = false))
        val second = AutostartController(first.learnedCars(), first.isAutoStarted())
        assertEquals(AutoCmd.STOP, second.onAclDisconnected("AA:BB"))
        val third = AutostartController(autoStarted = AutostartController().also { it.onVehicleEnter() }.isAutoStarted())
        assertEquals(AutoCmd.STOP, third.onVehicleExit())
    }

    // ── Idle stop on displacement (kort #262 Å3, DECISIONS #461) ──────────────────────────────────────────
    // 0.001° latitude ≈ 111 m. Helpers: one fix per [stepS] seconds moving north at [kmh].
    private fun IdleStop.drive(fromS: Int, toS: Int, kmh: Double, stepS: Int = 1, lat0: Double = 55.6): Pair<Boolean, Double> {
        var stopped = false; var lat = lat0
        for (s in fromS..toS step stepS) {
            stopped = onFix(s * 1000L, 13.0, lat)
            lat += kmh / 3.6 * stepS / 111_195.0
        }
        return stopped to lat
    }

    @Test fun idleStopFifteenMinutesAfterTheCarParks() {
        val s = IdleStop()
        val (_, lat) = s.drive(0, 600, 50.0)                               // ten minutes of driving
        assertEquals(false, s.drive(601, 600 + 14 * 60, 0.0, lat0 = lat).first)
        assertEquals(true, s.drive(600 + 14 * 60 + 1, 600 + 15 * 60 + 60, 0.0, lat0 = lat).first)
    }

    /** The bug: one tester's guard ran 11 h 39 m because walking pace restarted the clock on every fix. */
    @Test fun walkingAfterTheDriveDoesNotKeepTheGuardAlive() {
        val s = IdleStop()
        val (_, lat) = s.drive(0, 300, 50.0)
        var stoppedAt = -1
        var l = lat
        for (sec in 301..301 + 30 * 60) {
            if (s.onFix(sec * 1000L, 13.0, l)) { stoppedAt = sec; break }
            l += 5.5 / 3.6 / 111_195.0                                    // brisk walk, 5.5 km/h
        }
        assertTrue(stoppedAt in 300 + 15 * 60..300 + 16 * 60 + 1, "stopped at $stoppedAt")
    }

    @Test fun oneGpsJumpWhileParkedDoesNotRestartTheClockForever() {
        val s = IdleStop()
        s.drive(0, 120, 50.0)
        var stopped = false
        for (sec in 121..121 + 30 * 60) {
            val jump = sec == 600                                        // one 400 m outlier
            stopped = s.onFix(sec * 1000L, 13.0, 55.62 + if (jump) 0.0036 else 0.0)
            if (stopped) break
        }
        assertEquals(true, stopped)
    }

    @Test fun aSlowQueueAboveTwelveKmhKeepsTheGuard() {
        val s = IdleStop()
        assertEquals(false, s.drive(0, 40 * 60, 13.0).first)
    }

    @Test fun aTunnelGapCountsAsDriving() {
        val s = IdleStop()
        s.drive(0, 60, 80.0)
        assertEquals(false, s.onFix(61_000L, 13.0, 55.6))
        assertEquals(false, s.onFix(61_000L + 14 * 60_000L, 13.0, 55.7))  // 11 km later after a long gap: drove
        assertEquals(false, s.onFix(61_000L + 20 * 60_000L, 13.0, 55.7))
    }
}
