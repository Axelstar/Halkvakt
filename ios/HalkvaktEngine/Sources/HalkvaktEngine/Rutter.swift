// SAVED ROUTES (favoriterna steg 2, kort #357; DECISIONS #616, #625) — spegel av engine/src/rutter.ts, prövad mot
// engine/fixtures/rutter.json i alla tre språk (scripts/rutter-facit.ts); talen vaktas av kontraktsgrinden. Ren logik utan I/O:
// appen håller filen själv, på telefonen och utanför varje backup.
//
// A route is the road the driver actually drove, collected during the trip and offered after it — never an address, never a
// route search on the net. The collector keeps one point per `stegM` and always the last fix, so the route ends where the trip did.
import Foundation

/// Thins a trip's fixes as they arrive: a fix is kept when it lies at least `Rutter.stegM` from the last kept one.
public struct Ruttinsamlare {
    private var kept: [[Double]] = []
    private var last: [Double]?
    private var lastKept = false

    public init() {}

    public mutating func add(lon: Double, lat: Double) {
        last = [lon, lat]
        if let k = kept.last { lastKept = Geo.haversineM(k[0], k[1], lon, lat) >= Rutter.stegM } else { lastKept = true }
        if lastKept { kept.append([lon, lat]) }
    }

    /// The route so far: the kept points, plus the last fix when it was not kept, so the route ends where the trip did.
    public func route() -> [[Double]] {
        guard let last, !lastKept else { return kept }
        return kept + [last]
    }
}

public struct SparadRutt: Codable, Equatable {
    public let id: String
    public let namn: String
    public let sparad: String          // UTC ISO-8601
    public let punkter: [[Double]]     // [lon, lat], WGS84

    public init(id: String, namn: String, sparad: String, punkter: [[Double]]) {
        self.id = id; self.namn = namn; self.sparad = sparad; self.punkter = punkter
    }
}

public struct Rutter: Codable, Equatable {
    /// One kept point per this many metres of driving (FAVORITER §6).
    public static let stegM = 75.0
    /// At most this many saved routes (DECISIONS #616, 5.2).
    public static let max = 5

    public var schema = 1
    public var rutter: [SparadRutt] = []

    public init(rutter: [SparadRutt] = []) { self.rutter = rutter }

    /// Adds a route, or answers nil when `max` are already saved — the driver removes one first; nothing is pushed out silently.
    public func laggTill(_ ny: SparadRutt) -> Rutter? {
        rutter.count >= Self.max ? nil : Rutter(rutter: rutter + [ny])
    }

    /// Removes one route by id; an unknown id leaves the list as it is.
    public func taBort(id: String) -> Rutter {
        Rutter(rutter: rutter.filter { $0.id != id })
    }

    /// The name suggestions after a trip (DECISIONS #625): fixed ones and the date. Free text is always possible in the app.
    public static func namnforslag(dag: Int, manad: Int) -> [String] {
        ["Till jobbet", "Hem", "Resa \(dag)/\(manad)"]
    }

    /// Recognising the way home (DECISIONS #637): at least `sammaAndel` of each trip within `sammaM` of the other, in either direction.
    public static let sammaM = 100.0
    public static let sammaAndel = 0.8

    private static func andelNara(_ a: [[Double]], _ b: [[Double]]) -> Double {
        let prov: [Hazard] = Geo.samplePolyline(a, sammaM).enumerated().map { i, q in
            .point(id: "p\(i)", kind: .accident, lon: q[0], lat: q[1], bearing: nil, meta: PointMeta())
        }
        return prov.isEmpty ? 0 : Double(RouteFilter.alongRoute(prov, b, marginM: sammaM).count) / Double(prov.count)
    }

    /// Is b the same trip as a, in either direction?
    public static func sammaResa(_ a: [[Double]], _ b: [[Double]]) -> Bool {
        a.count >= 2 && b.count >= 2 && andelNara(a, b) >= sammaAndel && andelNara(b, a) >= sammaAndel
    }
}
