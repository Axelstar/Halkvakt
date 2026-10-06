// Self-stop for the guard (kort #262 Å3, DECISIONS #461). Kotlin twin: android/app/.../Autostart.kt IdleStop — same rule,
// same numbers (kontraktsgrinden vaktar dem). Lives in the engine package because it is pure and the package is what CI tests.
//
// A guard whose car has not driven for fifteen minutes has finished its trip. "Driven" is measured on DISPLACEMENT, not on
// one speed reading: the first rule restarted the clock on any fix >= 5 km/h, which is walking pace, so a carried phone never
// filled its fifteen minutes (one tester's guard ran 11 h 39 m). Now the fix is compared with the newest fix at least
// `windowS` older, and the car drove if the average over that span is >= `drivingKmh` (12 km/h = 200 m a minute — above
// walking and above GPS drift). A gap longer than the window (tunnel) is measured over the whole gap.
// Trade-off said out loud: a queue averaging under 12 km/h for fifteen whole minutes stops the guard.
import Foundation

public struct IdleStop {
    public static let afterS: TimeInterval = 15 * 60
    public static let windowS: TimeInterval = 60
    public static let drivingKmh = 12.0

    private var recent: [(t: TimeInterval, lon: Double, lat: Double)] = []
    private var lastDroveT: TimeInterval?

    public init() {}

    /// true = stop now. `t` in seconds (any epoch). The clock starts at the first fix.
    public mutating func onFix(t: TimeInterval, lon: Double, lat: Double) -> Bool {
        if lastDroveT == nil { lastDroveT = t }
        recent.append((t, lon, lat))
        // Keep recent[0] as the newest fix that is at least windowS old (or the oldest we have).
        var drop = 0
        while recent.count - drop >= 2 && t - recent[drop + 1].t >= Self.windowS { drop += 1 }
        if drop > 0 { recent.removeFirst(drop) }
        let ref = recent[0]
        let dt = t - ref.t
        if dt >= Self.windowS {
            let kmh = Geo.haversineM(ref.lon, ref.lat, lon, lat) / dt * 3.6
            if kmh >= Self.drivingKmh { lastDroveT = t }
        }
        return t - (lastDroveT ?? t) >= Self.afterS
    }
}
