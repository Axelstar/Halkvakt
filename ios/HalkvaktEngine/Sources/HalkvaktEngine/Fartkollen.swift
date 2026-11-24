// The auto-wake speed probe (DECISIONS #40, kort #359). iPhone only: Android is woken by activity recognition (Autostart.kt),
// so this rule has no Kotlin twin. Lives in the engine package because it is pure and the package is what CI tests (as IdleStop).
//
// iOS wakes the app on a significant location change; the app then watches the speed for at most `maxS`. Car speed
// (>= `startKmh`) starts the guard, otherwise the app goes back to sleep. Kort #359 (the couch test 17/10): when the driver
// started the guard BY HAND while the probe was running, the probe was not reset, and when it gave up it turned location off —
// the guard stood "running" without positions and could not warn. Starting or stopping the guard therefore calls `end()`, and
// after that `onFix` never answers `.sleep`.
//
// Ej bil: a fix faster than the engine's maxSpeedKmh, or higher than its maxAltitudeM, is a plane or a fast train. The probe
// ends at once with `.sleep`, so the guard is not started a moment later when the plane or the train slows to car speed.
import Foundation

public struct Fartkollen {
    public static let maxS: TimeInterval = 90
    public static let startKmh = 15.0

    // Never a case named `none` (CLAUDE.md: on an Optional it silently becomes nil).
    public enum Outcome: Equatable { case waiting, startGuard, sleep }

    public private(set) var active = false
    private var startedT: TimeInterval?

    public init() {}

    /// iOS woke the app while the guard is off.
    public mutating func begin(t: TimeInterval) { active = true; startedT = t }

    /// The guard was started (by hand or by the probe) or stopped: the probe is over.
    public mutating func end() { active = false; startedT = nil }

    /// A fix during the probe. `t` in seconds (any epoch). `altitudeM` only when the platform says it is valid.
    /// `.startGuard` and `.sleep` end the probe.
    public mutating func onFix(t: TimeInterval, kmh: Double, altitudeM: Double? = nil) -> Outcome {
        guard active, let t0 = startedT else { return .waiting }
        let cfg = EngineConfig()
        if kmh > cfg.maxSpeedKmh || (altitudeM ?? 0) > cfg.maxAltitudeM { end(); return .sleep }
        if kmh >= Self.startKmh { end(); return .startGuard }
        if t - t0 > Self.maxS { end(); return .sleep }
        return .waiting
    }
}
