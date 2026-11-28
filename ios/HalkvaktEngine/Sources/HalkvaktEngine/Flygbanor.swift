// On a runway (DECISIONS #988). A plane that taxis or rolls for take-off moves at car speed on the ground, so neither the
// engine's speed and altitude rule nor Ejbil sees it. A position within `narM` of a runway's centre line is not on a road: the
// engine does not speak there and the self-start does not count it. `narM` covers the runway and a parallel taxiway; the
// aprons and the taxiways further out are not covered. Pure geometry over the bundled table data/flygplatser/flygbanor.json
// (OurAirports, public domain); nothing is sent from here. iPhone only for now.
import Foundation

public struct Flygbanor: Sendable {
    public static let narM = 300.0
    /// Each runway as [lon1, lat1, lon2, lat2].
    public let linjer: [[Double]]

    public init(_ linjer: [[Double]]) { self.linjer = linjer.filter { $0.count == 4 } }

    public init(data: Data) throws {
        self.init(try JSONDecoder().decode(Fil.self, from: data).banor.map(\.linje))
    }

    private struct Fil: Decodable {
        struct Bana: Decodable { let linje: [Double] }
        let banor: [Bana]
    }

    /// True when the position is within `narM` of a runway's centre line.
    public func pa(lon: Double, lat: Double) -> Bool {
        let mPerLat = 111_320.0, mPerLon = 111_320.0 * cos(lat * .pi / 180)
        for l in linjer {
            // The runway in metres around the position: flat is fine over a few kilometres.
            let ax = (l[0] - lon) * mPerLon, ay = (l[1] - lat) * mPerLat
            let bx = (l[2] - lon) * mPerLon, by = (l[3] - lat) * mPerLat
            if abs(ax) > 10_000, abs(bx) > 10_000 { continue }
            let dx = bx - ax, dy = by - ay
            let langd2 = dx * dx + dy * dy
            let u = langd2 > 0 ? max(0, min(1, -(ax * dx + ay * dy) / langd2)) : 0
            let px = ax + u * dx, py = ay + u * dy
            if (px * px + py * py).squareRoot() <= Self.narM { return true }
        }
        return false
    }
}
