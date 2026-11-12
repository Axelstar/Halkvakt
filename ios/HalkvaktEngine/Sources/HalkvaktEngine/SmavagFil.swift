// Mirror of engine/src/smavagfil.ts — keep 1:1 (DECISIONS #828 byggsteg 7, #844). Held to engine/fixtures/smavagprov.json by
// SmavagFilTests, like the TS and Kotlin readers. The point file (smavag.json, schema 2) lists every small-road point in the order of
// the bits in live.json's `smavag`; each point carries its road (`vag`) and place along it (`ordning`). Silence is a feature: an
// unknown schema, a besked for another file, a wrong point or byte count or a value that is not a whole number gives no hazards.
// Only roads with a warning point become hazards, and a road with a single point is left out (the road test needs two neighbours).
import Foundation

public struct SmavagFil: Sendable {
    public let lon: [Double], lat: [Double], vag: [Int], ordning: [Int]
    public var n: Int { lon.count }

    /// smavag.json as downloaded. nil = not JSON, an unknown schema or an invalid file.
    public static func parse(_ data: Data) -> SmavagFil? {
        guard let o = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return nil }
        return parse(o)
    }

    public static func parse(_ o: [String: Any]) -> SmavagFil? {
        guard (o["schema"] as? NSNumber)?.doubleValue == 2, let p = o["punkter"] as? [[Any]],
              let v = o["vag"] as? [Any], let r = o["ordning"] as? [Any], v.count == p.count, r.count == p.count else { return nil }
        var lon: [Double] = [], lat: [Double] = [], vag: [Int] = [], ordning: [Int] = []
        lon.reserveCapacity(p.count); lat.reserveCapacity(p.count); vag.reserveCapacity(p.count); ordning.reserveCapacity(p.count)
        for i in 0..<p.count {
            guard p[i].count >= 2, let x = (p[i][0] as? NSNumber)?.doubleValue, let y = (p[i][1] as? NSNumber)?.doubleValue,
                  let a = heltal(v[i]), let b = heltal(r[i]) else { return nil }
            lon.append(x); lat.append(y); vag.append(a); ordning.append(b)
        }
        return SmavagFil(lon: lon, lat: lat, vag: vag, ordning: ordning)
    }

    /// A whole number, or nil (a fraction, a word or null). A JSON boolean is not tested: on Apple an NSNumber 1 also casts to Bool.
    private static func heltal(_ x: Any) -> Int? {
        guard let n = x as? NSNumber else { return nil }
        let d = n.doubleValue
        return d.isFinite && d == d.rounded() ? Int(d) : nil
    }

    /// The hazards for live.json's `smavag` besked, read against this file, whose verified sha256 is `filSha`.
    public func hazards(besked: [String: Any]?, filSha: String?) -> [Hazard] {
        guard let b = besked, let sha = filSha, let bfil = b["fil"] as? String, bfil == sha,
              let bn = (b["n"] as? NSNumber)?.doubleValue, bn == Double(n),
              let bitar = b["bitar"] as? String, let data = Data(base64Encoded: bitar), data.count == (n + 7) / 8 else { return [] }
        let bytes = [UInt8](data)
        func varnar(_ i: Int) -> Bool { (bytes[i >> 3] >> UInt8(i & 7)) & 1 == 1 }
        var varnandeVagar = Set<Int>()
        for i in 0..<n where varnar(i) { varnandeVagar.insert(vag[i]) }
        var perVag: [Int: [Int]] = [:]
        for i in 0..<n where varnandeVagar.contains(vag[i]) { perVag[vag[i], default: []].append(i) }
        var out: [Hazard] = []
        for v in perVag.keys.sorted() {
            let idx = perVag[v]!.sorted { ordning[$0] < ordning[$1] }
            if idx.count < 2 { continue }
            out.append(.smavag(id: "smv:\(v)", points: idx.map { [lon[$0], lat[$0]] },
                               warn: idx.indices.filter { varnar(idx[$0]) }))
        }
        return out
    }
}
