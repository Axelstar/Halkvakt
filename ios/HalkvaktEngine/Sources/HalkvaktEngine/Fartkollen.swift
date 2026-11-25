// The auto-wake speed probe (DECISIONS #40, kort #359). iPhone only: Android is woken by activity recognition (Autostart.kt),
// so this rule has no Kotlin twin. Lives in the engine package because it is pure and the package is what CI tests (as IdleStop).
//
// iOS wakes the app when the phone leaves the parking fence or on a significant location change; the app then watches the
// speed for at most `maxS`. Car speed starts the guard, otherwise the app goes back to sleep. Car speed is `startFixes` good
// fixes in a row at `startKmh` or more: 30 km/h for five seconds is not a commuter on a bicycle (15–25 km/h) and not an
// e-bike (25), and one fix is not a speed. A road cyclist holding 30 or more does start it (Axel 25/11: 30, not 40, so that
// a car in a 30 or 40 zone starts the guard). Kort #359 (the couch test 17/10): when the driver
// started the guard BY HAND while the probe was running, the probe was not reset, and when it gave up it turned location off —
// the guard stood "running" without positions and could not warn. Starting or stopping the guard therefore calls `end()`, and
// after that `onFix` never answers `.sleep`.
//
// Ej bil: a fix faster than the engine's maxSpeedKmh, or higher than its maxAltitudeM, is a plane or a fast train. The probe
// ends at once with `.sleep`, so the guard is not started a moment later when the plane or the train slows to car speed.
import Foundation

public struct Fartkollen {
    public static let maxS: TimeInterval = 300
    public static let startKmh = 30.0
    public static let startFixes = 5

    // Never a case named `none` (CLAUDE.md: on an Optional it silently becomes nil).
    public enum Outcome: Equatable { case waiting, startGuard, sleep }

    public private(set) var active = false
    private var startedT: TimeInterval?
    private var fast = 0
    private let windowS: TimeInterval

    /// `maxS` is only given by the simulation that compares windows (SjalvstartSimTests); the app uses the default.
    public init(maxS: TimeInterval = Fartkollen.maxS) { windowS = maxS }

    /// iOS woke the app while the guard is off.
    public mutating func begin(t: TimeInterval) { active = true; startedT = t; fast = 0 }

    /// The guard was started (by hand or by the probe) or stopped: the probe is over.
    public mutating func end() { active = false; startedT = nil; fast = 0 }

    /// A fix during the probe. `t` in seconds (any epoch). `kmh` is nil when the fix is not a car's GPS position with the phone's
    /// own speed (GPS-kvalitet): such a fix neither counts nor breaks the row, but the clock runs. `altitudeM` only when the
    /// platform says it is valid. `.startGuard` and `.sleep` end the probe.
    public mutating func onFix(t: TimeInterval, kmh: Double?, altitudeM: Double? = nil) -> Outcome {
        guard active, let t0 = startedT else { return .waiting }
        let cfg = EngineConfig()
        if (kmh ?? 0) > cfg.maxSpeedKmh || (altitudeM ?? 0) > cfg.maxAltitudeM { end(); return .sleep }
        if let kmh { fast = kmh >= Self.startKmh ? fast + 1 : 0 }
        if fast >= Self.startFixes { end(); return .startGuard }
        if t - t0 > windowS { end(); return .sleep }
        return .waiting
    }
}
