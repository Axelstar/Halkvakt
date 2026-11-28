// Not a car, remembered (DECISIONS #987). The engine judges every fix alone: silent above maxSpeedKmh or maxAltitudeM. A phone in
// a plane cabin gives a few good fixes, long gaps and odd readings, and one fix that looks like a car slipped through 27/11
// (a spoken warning fifteen minutes into a flight, flight mode on, the 160 km/h and 1 500 m rule in the build). This rule
// remembers. iPhone only for now: it sits in front of the engine in GuardManager, so the engine and its vectors are untouched.
//
// Evidence that the phone is not in a car, on a good fix (the app's GPS-kvalitet):
//   - its own speed above the engine's maxSpeedKmh, or a valid altitude above maxAltitudeM (the engine's rule), or
//   - it has moved further since a fix 30–120 s ago than a car at maxSpeedKmh could: the positions, whatever the speed says.
// Two such fixes in a row lock the rule, so that one thrown position or one odd speed in a car never does. Locked, the
// phone is silent until it has given `friS` seconds of good fixes with their own speed and no evidence, with no gap longer
// than `glappS` — taxiing in, or the first two minutes in the car from the airport — or until `hallS` has passed.
import Foundation

public struct Ejbil {
    public static let fonsterS: ClosedRange<TimeInterval> = 30...120
    public static let iRad = 2
    public static let friS: TimeInterval = 120
    public static let glappS: TimeInterval = 10
    public static let hallS: TimeInterval = 7200

    /// The time of the latest evidence while the rule is locked; nil when it is open. The app keeps it across restarts.
    public private(set) var sedan: TimeInterval?
    private var spar: [(t: TimeInterval, lon: Double, lat: Double)] = []
    private var rad = 0
    private var friFran: TimeInterval?
    private var forra: TimeInterval?

    public init(sedan: TimeInterval? = nil) { self.sedan = sedan }

    /// A good fix. `kmh` is the phone's own speed, nil when it has none; `altitudeM` only when the platform says it is valid.
    /// True when the engine must not speak on this fix.
    public mutating func onFix(t: TimeInterval, lon: Double, lat: Double, kmh: Double?, altitudeM: Double? = nil) -> Bool {
        let cfg = EngineConfig()
        spar.removeAll { t - $0.t > Self.fonsterS.upperBound || $0.t >= t }
        var bevis = (kmh ?? 0) > cfg.maxSpeedKmh || (altitudeM ?? 0) > cfg.maxAltitudeM
        if let aldst = spar.first, t - aldst.t >= Self.fonsterS.lowerBound,
           Geo.haversineM(aldst.lon, aldst.lat, lon, lat) / (t - aldst.t) * 3.6 > cfg.maxSpeedKmh {
            bevis = true
        }
        spar.append((t, lon, lat))
        rad = bevis ? rad + 1 : 0

        if let s = sedan, t - s > Self.hallS { sedan = nil; friFran = nil }
        if rad >= Self.iRad {
            sedan = t
            friFran = nil
        } else if sedan != nil {
            if bevis || kmh == nil {
                friFran = nil
            } else {
                if let f = forra, t - f > Self.glappS { friFran = nil }
                let fran = friFran ?? t
                friFran = fran
                if t - fran >= Self.friS { sedan = nil; friFran = nil }
            }
        }
        forra = t
        return bevis || sedan != nil
    }
}
