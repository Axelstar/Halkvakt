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
//     drive is remembered as "the car" — if it says it is a car (isCarClass below). No
//     configuration screens.
//   * STOP only ends drives WE started (autoStarted flag): a manually started guard is
//     never killed by AR flakiness or a dropped headset.
package se.halkvakt.app

import se.halkvakt.engine.Geo

enum class AutoCmd { START, STOP, LEARN, NONE }

// #248 (24/9): the glue builds a NEW controller for every system event, so `autoStarted` must come in from
// persistence and go back out after each command — otherwise every STOP event met a fresh `false` and the
// guard never stopped. The flag is state, not a field of one object's lifetime.
class AutostartController(learnedCars: Set<String> = emptySet(), autoStarted: Boolean = false) {
    private val cars = learnedCars.toMutableSet()
    private var autoStarted = autoStarted

    fun learnedCars(): Set<String> = cars.toSet()
    fun isAutoStarted(): Boolean = autoStarted

    // A guard that already runs was started by hand, or by an earlier event whose flag is already set: START is then a
    // no-op in the glue, and setting the flag here let the next exit or disconnect stop a hand-started guard.
    fun onVehicleEnter(guardRunning: Boolean): AutoCmd {
        if (!guardRunning) autoStarted = true
        return AutoCmd.START
    }

    fun onVehicleExit(): AutoCmd {
        if (!autoStarted) return AutoCmd.NONE
        autoStarted = false
        return AutoCmd.STOP
    }

    /** [deviceClass] is BluetoothClass.getDeviceClass(), null when it cannot be read; only learning looks at it. */
    fun onAclConnected(address: String, guardRunning: Boolean, deviceClass: Int? = null): AutoCmd {
        if (address in cars) {
            if (!guardRunning) autoStarted = true
            return AutoCmd.START
        }
        if (guardRunning && isCarClass(deviceClass)) {
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

/**
 * Which Bluetooth devices may be learned as the car: the two device classes a car's own unit reports, Audio/Video
 * Car audio (0x0420) and Audio/Video Hands-free (0x0408) — BluetoothClass.Device.AUDIO_VIDEO_CAR_AUDIO and
 * AUDIO_VIDEO_HANDSFREE, written as numbers because this file has no Android imports. Everything else is left out:
 * a watch (major class Wearable, 0x07xx), earbuds and headphones (0x0404, 0x0418), a loudspeaker (0x0414), a phone
 * or a computer. Before this, any device that connected during a drive was learned, and then started the guard at
 * home. Not exact: a hands-free kit or speakerphone also says 0x0408, and a car unit that reports another class is
 * not learned (Activity Recognition still starts the guard there).
 */
fun isCarClass(deviceClass: Int?): Boolean = deviceClass == 0x0420 || deviceClass == 0x0408

/**
 * The second road to a start (27/11): Activity Recognition's sampled readings, beside its transitions. The transition
 * event never reached Bengt's Galaxy J6 (Android 10) on a fresh install with every permission granted, so a reading
 * that says "in a vehicle" with enough confidence starts the guard too. Not while the guard runs, not within
 * [SAMPLE_RETRY_MS] of the last try (a refused start shows a notification, and one is enough), and not within
 * [SAMPLE_PAUSE_MS] of a stop by hand: the driver who stopped the guard in the car must not get it back half a minute later.
 */
const val SAMPLE_INTERVAL_MS = 30_000L
const val SAMPLE_CONFIDENCE = 75
const val SAMPLE_RETRY_MS = 5 * 60_000L
const val SAMPLE_PAUSE_MS = 5 * 60_000L   // Axel 27/11: thirty minutes left the next leg unguarded

fun sampleStarts(
    inVehicle: Boolean, confidence: Int, guardRunning: Boolean,
    nowMs: Long, lastTryMs: Long, handStopMs: Long,
): Boolean =
    inVehicle && confidence >= SAMPLE_CONFIDENCE && !guardRunning &&
        nowMs - lastTryMs >= SAMPLE_RETRY_MS && nowMs - handStopMs >= SAMPLE_PAUSE_MS

/**
 * Idle stop, the same rule as iOS (HalkvaktEngine IdleStop.swift): a guard whose car has not driven for fifteen
 * minutes has finished its trip. Pure, so the JVM proves it (#248).
 *
 * "Driving" is measured on DISPLACEMENT, not on one speed reading (kort #262 Å3, DECISIONS #461). The first rule
 * restarted the clock on any single fix >= 5 km/h, which is walking pace — a carried phone never filled its
 * fifteen minutes and one tester's guard ran 11 h 39 m. Now: compare the fix with the newest fix at least
 * [windowMs] older; the car drove if the average over that span is >= [drivingKmh] (12 km/h = 200 m a minute,
 * above walking and above GPS drift). One noisy fix can restart the clock at most twice, not on every reading.
 * A gap longer than the window (tunnel, lost GPS) is measured over the whole gap, so a car that came out of a
 * tunnel 3 km on has driven. Trade-off said out loud: a queue that averages under 12 km/h for fifteen whole
 * minutes stops the guard; autostart wakes it again when the drive resumes.
 *
 * GPS-kvalitet: a fix whose position is not a car's GPS position (`exact` false: wifi or cell mast, indoors) only moves the
 * clock. Its jump is never a displacement, so poor fixes cannot keep the guard alive, and the guard still stops on them when
 * the fifteen minutes are up. The next exact fix is measured against the last exact one, like a tunnel gap.
 */
class IdleStop(
    private val afterMs: Long = AFTER_MS,
    private val windowMs: Long = WINDOW_MS,
    private val drivingKmh: Double = DRIVING_KMH,
) {
    private data class P(val t: Long, val lon: Double, val lat: Double)
    private val recent = ArrayDeque<P>()
    private var lastDroveMs = -1L

    /** true = stop now. The clock starts at the first fix. [exact] false = time passes, the position is not used. */
    fun onFix(timeMs: Long, lon: Double, lat: Double, exact: Boolean = true): Boolean {
        if (lastDroveMs < 0) lastDroveMs = timeMs
        if (!exact) return timeMs - lastDroveMs >= afterMs
        recent.addLast(P(timeMs, lon, lat))
        // Keep recent.first() as the newest fix that is at least windowMs old (or the oldest we have).
        while (recent.size >= 2 && timeMs - recent[1].t >= windowMs) recent.removeFirst()
        val ref = recent.first()
        val dtMs = timeMs - ref.t
        if (dtMs >= windowMs) {
            val kmh = Geo.haversineM(ref.lon, ref.lat, lon, lat) / (dtMs / 1000.0) * 3.6
            if (kmh >= drivingKmh) lastDroveMs = timeMs
        }
        return timeMs - lastDroveMs >= afterMs
    }

    companion object {
        const val AFTER_MS = 15 * 60 * 1000L
        const val WINDOW_MS = 60_000L
        const val DRIVING_KMH = 12.0
    }
}
