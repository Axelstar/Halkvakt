// "I NÄRHETEN" — ren Swift-tvilling av android Nearby.kt. Människorader ur
// snapshotens maskindata: frysrisk "+0,4° och vått", kameror "80 km/h",
// halka Trafikverkets infotext. Håll i takt med Kotlin-versionen.
import Foundation
import HalkvaktEngine

struct NearbyItem: Identifiable {
    let id: String
    let kind: HazardKind
    let distM: Double
    let secondary: String?
}

enum Nearby {
    /// Radie för "omkring dig" — sex mil.
    static let maxM = 60_000.0

    static func nearest(_ hazards: [Hazard], lon: Double, lat: Double, n: Int = 6) -> [NearbyItem] {
        hazards.compactMap { h -> NearbyItem? in
            let d = distanceM(h, lon: lon, lat: lat)
            guard d <= maxM else { return nil }
            return NearbyItem(id: h.id, kind: kind(of: h), distM: d, secondary: secondary(h))
        }
        .sorted { $0.distM < $1.distM }
        .prefix(n)
        .map { $0 }
    }

    static func kind(of h: Hazard) -> HazardKind {
        switch h {
        case .point(_, let kind, _, _, _, _): return kind
        case .segment: return .slippery_segment
        }
    }

    static func distanceM(_ h: Hazard, lon: Double, lat: Double) -> Double {
        switch h {
        case .point(_, _, let plon, let plat, _, _):
            return haversineM(lon, lat, plon, plat)
        case .segment(_, let line, _):
            return line.map { haversineM(lon, lat, $0[0], $0[1]) }.min() ?? .infinity
        }
    }

    /// Detaljrad, eller nil när källraden räcker (vilt/olycka).
    static func secondary(_ h: Hazard) -> String? {
        switch h {
        case .segment(_, _, let meta):
            return meta.info.first
        case .point(_, let kind, _, _, _, let meta):
            switch kind {
            case .icing_point:
                var s: String
                if let t = meta.surfaceTempC {
                    s = String(format: "%.1f°", t).replacingOccurrences(of: ".", with: ",")
                    if t >= 0 { s = "+" + s }
                } else {
                    s = "Nära noll"
                }
                if meta.moisture { s += " och vått" }
                return s
            case .camera:
                return meta.speedLimitKmh.map { "\($0) km/h" }
            default:
                return nil
            }
        }
    }

    static func distText(_ m: Double) -> String {
        if m < 950 {
            let steg = max(50, Int((m / 50).rounded()) * 50)
            return "\(steg) m"
        }
        return String(format: "%.1f km", m / 1000).replacingOccurrences(of: ".", with: ",")
    }

    static func haversineM(_ lon1: Double, _ lat1: Double, _ lon2: Double, _ lat2: Double) -> Double {
        let r = 6_371_000.0
        let dLat = (lat2 - lat1) * .pi / 180
        let dLon = (lon2 - lon1) * .pi / 180
        let a = sin(dLat / 2) * sin(dLat / 2) +
                cos(lat1 * .pi / 180) * cos(lat2 * .pi / 180) * sin(dLon / 2) * sin(dLon / 2)
        return 2 * r * atan2(sqrt(a), sqrt(1 - a))
    }
}
