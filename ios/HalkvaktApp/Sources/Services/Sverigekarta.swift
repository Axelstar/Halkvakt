// Sveriges kontur och de större orterna (DECISIONS #930), ur Natural Earth, som är fri att använda (data/KALLOR.json).
// Konturen ritas bakom vägen på skärmen Planerad resa, och orterna är brytpunkterna för resans sträckor (Resstrackor).
import Foundation
import HalkvaktEngine

enum Sverigekarta {
    private struct Fil: Decodable {
        struct O: Decodable { let n: String; let c: [Double] }
        let kontur: [[[Double]]]
        let orter: [O]
    }

    private static let fil: Fil? = Bundle.main.url(forResource: "sverige", withExtension: "json")
        .flatMap { try? Data(contentsOf: $0) }
        .flatMap { try? JSONDecoder().decode(Fil.self, from: $0) }

    /// Ringar av [lon, lat], fastlandet först.
    static let kontur: [[[Double]]] = fil?.kontur ?? []
    static let orter: [Ort] = (fil?.orter ?? []).filter { $0.c.count == 2 }.map { Ort(namn: $0.n, lon: $0.c[0], lat: $0.c[1]) }
}
