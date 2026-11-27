// Every autostart rule as an executable claim. Runs on the JVM in CI — no emulator needed
// for the brain; only the thin Android glue remains device-territory.
package se.halkvakt.app

import kotlin.test.Test
import kotlin.test.assertTrue
import kotlin.test.assertEquals

class AutostartControllerTest {

    @Test fun vehicleEnterStarts_exitStops() {
        val c = AutostartController()
        assertEquals(AutoCmd.START, c.onVehicleEnter(guardRunning = false))
        assertEquals(AutoCmd.STOP, c.onVehicleExit())
    }

    @Test fun exitWithoutAutoStartIsIgnored_manualDrivesAreNeverKilled() {
        val c = AutostartController()
        // Guard was started by hand in the UI; AR later claims we exited a vehicle.
        assertEquals(AutoCmd.NONE, c.onVehicleExit())
    }

    /** The rule at the top of Autostart.kt: an event that meets a guard already running by hand must not claim it. */
    @Test fun aHandStartedGuardIsNotClaimedByALaterEvent() {
        val c = AutostartController(learnedCars = setOf("AA:BB"))
        assertEquals(AutoCmd.START, c.onVehicleEnter(guardRunning = true))
        assertEquals(AutoCmd.START, c.onAclConnected("AA:BB", guardRunning = true))
        assertEquals(false, c.isAutoStarted())
        assertEquals(AutoCmd.NONE, c.onVehicleExit())
        assertEquals(AutoCmd.NONE, c.onAclDisconnected("AA:BB"))
    }

    @Test fun knownCarConnectingStartsInstantly() {
        val c = AutostartController(learnedCars = setOf("AA:BB"))
        assertEquals(AutoCmd.START, c.onAclConnected("AA:BB", guardRunning = false))
        assertEquals(AutoCmd.STOP, c.onAclDisconnected("AA:BB"))
    }

    @Test fun unknownDeviceDuringDriveIsLearned() {
        val c = AutostartController()
        assertEquals(AutoCmd.LEARN, c.onAclConnected("CA:FE", guardRunning = true, deviceClass = 0x0420))
        assertEquals(setOf("CA:FE"), c.learnedCars())
        // Next time: turbo path.
        assertEquals(AutoCmd.START, c.onAclConnected("CA:FE", guardRunning = false))
    }

    /** Only a car's own unit is learned: a watch or earbuds that connect during a drive used to start the guard at home. */
    @Test fun onlyCarAudioAndHandsFreeAreLearned() {
        val c = AutostartController()
        // Wrist watch, wearable headset, headphones, loudspeaker, phone, and a class that could not be read.
        for (cls in listOf(0x0704, 0x0404, 0x0418, 0x0414, 0x020C, null))
            assertEquals(AutoCmd.NONE, c.onAclConnected("DE:AD", guardRunning = true, deviceClass = cls), "class $cls")
        assertEquals(emptySet<String>(), c.learnedCars())
        assertEquals(AutoCmd.LEARN, c.onAclConnected("CA:FE", guardRunning = true, deviceClass = 0x0408))   // hands-free
        assertEquals(setOf("CA:FE"), c.learnedCars())
    }

    /** A car learned before the class rule keeps starting the guard whatever it reports: the saved list is not touched. */
    @Test fun anAlreadyLearnedDeviceStillStarts() {
        val c = AutostartController(learnedCars = setOf("AA:BB"))
        assertEquals(AutoCmd.START, c.onAclConnected("AA:BB", guardRunning = false, deviceClass = 0x0704))
    }

    @Test fun unknownDeviceWhileIdleDoesNothing_headphonesAtHome() {
        val c = AutostartController()
        assertEquals(AutoCmd.NONE, c.onAclConnected("DE:AD", guardRunning = false))
        assertEquals(emptySet<String>(), c.learnedCars())
    }

    @Test fun unknownDeviceDisconnectNeverStops() {
        val c = AutostartController(learnedCars = setOf("AA:BB"))
        c.onVehicleEnter(guardRunning = false)
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
        assertEquals(AutoCmd.START, c.onVehicleEnter(guardRunning = true))   // AR arrives late: idempotent start
        assertEquals(AutoCmd.STOP, c.onAclDisconnected("CA:FE"))
        assertEquals(AutoCmd.NONE, c.onVehicleExit())        // already stopped: no double stop
    }

    /** #248: the glue recreates the controller per system event; the start must survive that. */
    @Test fun autoStartSurvivesANewController() {
        val first = AutostartController(learnedCars = setOf("AA:BB"))
        assertEquals(AutoCmd.START, first.onAclConnected("AA:BB", guardRunning = false))
        val second = AutostartController(first.learnedCars(), first.isAutoStarted())
        assertEquals(AutoCmd.STOP, second.onAclDisconnected("AA:BB"))
        val third = AutostartController(autoStarted = AutostartController().also { it.onVehicleEnter(guardRunning = false) }.isAutoStarted())
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

    // GPS-kvalitet: indoors after the drive the positions come from wifi, one every ten seconds, and move 300 m every forty seconds
    // (18 km/h over the window). They move the clock and nothing else: the guard stops on one of them when the quarter is up.
    @Test fun poorFixesJumpingIndoorsDoNotKeepTheGuardAlive() {
        val s = IdleStop()
        val (_, lat) = s.drive(0, 300, 50.0)
        var stoppedAt = -1
        for (sec in 310..300 + 30 * 60 step 10) {
            if (s.onFix(sec * 1000L, 13.0, lat + if (sec / 40 % 2 == 0) 0.0027 else 0.0, exact = false)) { stoppedAt = sec; break }
        }
        assertTrue(stoppedAt in 300 + 15 * 60..300 + 16 * 60 + 10, "stopped at $stoppedAt")
    }

    @Test fun theSameJumpsAsExactFixesDidKeepItAlive() {   // the counter-proof: what the rule was before
        val s = IdleStop()
        val (_, lat) = s.drive(0, 300, 50.0)
        var stopped = false
        for (sec in 310..300 + 30 * 60 step 10) {
            stopped = s.onFix(sec * 1000L, 13.0, lat + if (sec / 40 % 2 == 0) 0.0027 else 0.0)
            if (stopped) break
        }
        assertEquals(false, stopped)
    }

    @Test fun poorFixesInATunnelThenAnExactOneCountsAsDriving() {
        val s = IdleStop()
        s.drive(0, 60, 80.0)
        for (sec in 61..61 + 10 * 60 step 5) assertEquals(false, s.onFix(sec * 1000L, 13.0, 55.6, exact = false))
        assertEquals(false, s.onFix(61_000L + 14 * 60_000L, 13.0, 55.7))
        assertEquals(false, s.onFix(61_000L + 20 * 60_000L, 13.0, 55.7))
    }

    @Test fun aTunnelGapCountsAsDriving() {
        val s = IdleStop()
        s.drive(0, 60, 80.0)
        assertEquals(false, s.onFix(61_000L, 13.0, 55.6))
        assertEquals(false, s.onFix(61_000L + 14 * 60_000L, 13.0, 55.7))  // 11 km later after a long gap: drove
        assertEquals(false, s.onFix(61_000L + 20 * 60_000L, 13.0, 55.7))
    }

    // The second road (27/11): a sampled reading starts the guard only when it is sure, the guard is off, the last try is
    // old enough and the driver has not just stopped the guard by hand.
    private val min = 60_000L
    @Test fun aSureVehicleReadingStartsTheGuard() =
        assertTrue(sampleStarts(inVehicle = true, confidence = 80, guardRunning = false, nowMs = 100 * min, lastTryMs = 0, handStopMs = 0))
    @Test fun anUnsureReadingOrAnotherActivityDoesNot() {
        assertEquals(false, sampleStarts(true, 74, false, 100 * min, 0, 0))
        assertEquals(false, sampleStarts(false, 100, false, 100 * min, 0, 0))
    }
    @Test fun aRunningGuardIsLeftAlone() = assertEquals(false, sampleStarts(true, 100, true, 100 * min, 0, 0))
    @Test fun oneTryInFiveMinutes() {
        assertEquals(false, sampleStarts(true, 100, false, 100 * min, 96 * min, 0))
        assertTrue(sampleStarts(true, 100, false, 100 * min, 95 * min, 0))
    }
    @Test fun aStopByHandKeepsItAwayForFiveMinutes() {
        assertEquals(false, sampleStarts(true, 100, false, 100 * min, 0, 96 * min))
        assertTrue(sampleStarts(true, 100, false, 100 * min, 0, 95 * min))
    }
}
