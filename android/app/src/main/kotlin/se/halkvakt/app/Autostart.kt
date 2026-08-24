// Autostart brain — PURE decision logic, no Android imports, same philosophy as the
// engine: deterministic, unit-tested on the JVM, wrapped by thin glue (AutostartManager).
//
// Signals and roles:
//   * Activity Recognition "IN_VEHICLE" enter/exit  → primary trigger (works for any car,
//     rentals, buses excluded by nothing — accepted for v0; false starts are cheap: the
//     guard is silent unless a hazard is truly ahead).
//   * Bluetooth ACL connect/disconnect              → turbo path for the LEARNED car:
//     instant start the moment the phone pairs with the car, often before AR reacts.
//     Learning: an unknown device that connects WHILE the guard is running during a
//     drive is remembered as "the car". No configuration screens.
//   * STOP only ends drives WE started (autoStarted flag): a manually started guard is
//     never killed by AR flakiness or a dropped headset.
package se.halkvakt.app

enum class AutoCmd { START, STOP, LEARN, NONE }

class AutostartController(learnedCars: Set<String> = emptySet()) {
    private val cars = learnedCars.toMutableSet()
    private var autoStarted = false

    fun learnedCars(): Set<String> = cars.toSet()

    fun onVehicleEnter(): AutoCmd {
        autoStarted = true
        return AutoCmd.START
    }

    fun onVehicleExit(): AutoCmd {
        if (!autoStarted) return AutoCmd.NONE
        autoStarted = false
        return AutoCmd.STOP
    }

    fun onAclConnected(address: String, guardRunning: Boolean): AutoCmd {
        if (address in cars) {
            autoStarted = true
            return AutoCmd.START
        }
        if (guardRunning) {
            cars.add(address)
            return AutoCmd.LEARN
        }
        return AutoCmd.NONE
    }

    fun onAclDisconnected(address: String): AutoCmd {
        if (address !in cars || !autoStarted) return AutoCmd.NONE
        autoStarted = false
        return AutoCmd.STOP
    }

    /** Manual stop from the UI must also disarm auto-stop bookkeeping. */
    fun onManualStop() { autoStarted = false }
}
