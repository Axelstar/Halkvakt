// Every autostart rule as an executable claim. Runs on the JVM in CI — no emulator needed
// for the brain; only the thin Android glue remains device-territory.
package se.halkvakt.app

import kotlin.test.Test
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

    @Test fun idleStopAfterFifteenStillMinutes() {
        val s = IdleStop()
        assertEquals(false, s.onFix(0, 60.0))
        assertEquals(false, s.onFix(14 * 60_000L, 1.0))
        assertEquals(true, s.onFix(15 * 60_000L, 0.0))
    }

    @Test fun idleStopClockRestartsWhenMoving() {
        val s = IdleStop()
        s.onFix(0, 0.0)
        assertEquals(false, s.onFix(10 * 60_000L, 30.0))      // rolled again
        assertEquals(false, s.onFix(24 * 60_000L, 0.0))
        assertEquals(true, s.onFix(25 * 60_000L, null))
    }
}
