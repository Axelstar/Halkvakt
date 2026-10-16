import Foundation

/// A hazard along a route: shortest distance to the line and position along it, both in metres (DECISIONS #528).
public struct AlongRoute {
    public let hazard: Hazard
    public let distanceM: Double
    public let alongM: Double
}

/// LÄNGS RUTTEN (favoriterna, DECISIONS #528) — spegel av farorLangsRutten i engine/src/rutfilter.ts, prövad mot
/// engine/fixtures/langsrutten.json i alla tre språk. Plant i en lokal projektion kring punkten (x = R·Δλ·cos φ, y = R·Δφ),
/// punkt mot sträcka utan sampling; ett segment mäts brytpunkt mot linjen, linjens brytpunkter mot segmentet, och två sträckor
/// som korsar varandra ger 0. Platsen längs rutten är längden fram till närmaste sträcka (haversine per sträcka) plus andelen av den.
public enum RouteFilter {
    private static let R = 6_371_000.0
    private static let RAD = Double.pi / 180.0

    /// Shortest planar distance from p to the segment a–b, and the fraction t ∈ [0, 1] along it where it is reached.
    private static func toSegment(_ p: [Double], _ a: [Double], _ b: [Double]) -> (d: Double, t: Double) {
        let k = cos(p[1] * RAD) * R * RAD, m = R * RAD
        let ax = (a[0] - p[0]) * k, ay = (a[1] - p[1]) * m, bx = (b[0] - p[0]) * k, by = (b[1] - p[1]) * m
        let dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy
        let t = l == 0 ? 0 : max(0, min(1, -(ax * dx + ay * dy) / l))
        return (hypot(ax + t * dx, ay + t * dy), t)
    }

    /// Where p1–p2 crosses q1–q2, as a fraction t ∈ (0, 1) along p1–p2, or nil. Planar in degrees.
    private static func crossing(_ p1: [Double], _ p2: [Double], _ q1: [Double], _ q2: [Double]) -> Double? {
        let rx = p2[0] - p1[0], ry = p2[1] - p1[1], sx = q2[0] - q1[0], sy = q2[1] - q1[1]
        let den = rx * sy - ry * sx
        if den == 0 { return nil }
        let t = ((q1[0] - p1[0]) * sy - (q1[1] - p1[1]) * sx) / den
        let u = ((q1[0] - p1[0]) * ry - (q1[1] - p1[1]) * rx) / den
        return t > 0 && t < 1 && u > 0 && u < 1 ? t : nil
    }

    /// The hazards within `marginM` of the line, in driving order (position along the route, then id).
    public static func alongRoute(_ hazards: [Hazard], _ line: [[Double]], marginM: Double) -> [AlongRoute] {
        if line.count < 2 { return [] }
        var cum = [Double](repeating: 0, count: line.count)
        for i in 1..<line.count { cum[i] = cum[i - 1] + Geo.haversineM(line[i - 1][0], line[i - 1][1], line[i][0], line[i][1]) }
        func nearest(_ p: [Double]) -> (d: Double, along: Double) {
            var d = Double.infinity, along = 0.0
            for i in 0..<(line.count - 1) {
                let s = toSegment(p, line[i], line[i + 1])
                if s.d < d { d = s.d; along = cum[i] + s.t * (cum[i + 1] - cum[i]) }
            }
            return (d, along)
        }
        var out: [AlongRoute] = []
        for h in hazards {
            var d: Double, along: Double
            switch h {
            case let .segment(_, seg, _):
                (d, along) = nearest(seg[0])
                for p in seg.dropFirst() { let n = nearest(p); if n.d < d { (d, along) = n } }
                // The line's vertices against the segment: a segment can pass near the line between its own vertices.
                for i in 0..<line.count { for j in 0..<(seg.count - 1) {
                    let s = toSegment(line[i], seg[j], seg[j + 1])
                    if s.d < d { d = s.d; along = cum[i] }
                } }
                var i = 0
                while i < line.count - 1 && d > 0 {
                    for j in 0..<(seg.count - 1) {
                        if let t = crossing(line[i], line[i + 1], seg[j], seg[j + 1]) { d = 0; along = cum[i] + t * (cum[i + 1] - cum[i]); break }
                    }
                    i += 1
                }
            case let .point(_, _, lon, lat, _, _):
                (d, along) = nearest([lon, lat])
            case .kandidat:
                // Kandidaten (DECISIONS #577) hör inte till favoriternas urval — hoppas över, som i rutfilter.ts.
                continue
            }
            if d <= marginM { out.append(AlongRoute(hazard: h, distanceM: d, alongM: along)) }
        }
        return out.sorted { $0.alongM != $1.alongM ? $0.alongM < $1.alongM : $0.hazard.id < $1.hazard.id }
    }
}
