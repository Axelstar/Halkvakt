// Which municipality a position lies in (DECISIONS #917). Pure geometry over the bundled table data/kommuner/kommuner.json;
// nothing is sent from here. The borders are simplified, so a position in a sliver along a coast or a border may fall outside
// every area: then the nearest centre within reservM answers, and beyond that there is no answer (abroad, at sea).
import Foundation

public struct Kommun: Codable, Sendable, Equatable {
    /// Four-digit municipality code; the first two digits are the county.
    public let k: String
    public let n: String
    /// Centre, [lon, lat].
    public let c: [Double]
    /// Rings of [lon, lat]. Even-odd over all rings, so islands and holes both work.
    public let p: [[[Double]]]

    public init(k: String, n: String, c: [Double], p: [[[Double]]]) {
        self.k = k; self.n = n; self.c = c; self.p = p
    }
}

public struct Kommunkarta: Sendable {
    public static let reservM = 15_000.0
    public let kommuner: [Kommun]

    public init(_ kommuner: [Kommun]) { self.kommuner = kommuner }

    public init(data: Data) throws {
        kommuner = try JSONDecoder().decode(Fil.self, from: data).kommuner
    }

    private struct Fil: Decodable { let kommuner: [Kommun] }

    public func kommun(lon: Double, lat: Double) -> Kommun? {
        if let inne = kommuner.first(where: { Self.innanfor($0.p, lon, lat) }) { return inne }
        var narmast: Kommun?
        var kortast = Self.reservM
        for k in kommuner where k.c.count == 2 {
            let d = Self.avstandM(lon, lat, k.c[0], k.c[1])
            if d <= kortast { kortast = d; narmast = k }
        }
        return narmast
    }

    static func innanfor(_ ringar: [[[Double]]], _ x: Double, _ y: Double) -> Bool {
        var inne = false
        for ring in ringar where ring.count >= 3 {
            var j = ring.count - 1
            for i in 0..<ring.count {
                let xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1]
                if (yi > y) != (yj > y), x < (xj - xi) * (y - yi) / (yj - yi) + xi { inne.toggle() }
                j = i
            }
        }
        return inne
    }

    /// Flat-earth distance in metres; good to well under a percent at these ranges.
    static func avstandM(_ lon1: Double, _ lat1: Double, _ lon2: Double, _ lat2: Double) -> Double {
        let kx = cos((lat1 + lat2) / 2 * .pi / 180) * 111_320
        let dx = (lon2 - lon1) * kx, dy = (lat2 - lat1) * 110_540
        return (dx * dx + dy * dy).squareRoot()
    }
}
