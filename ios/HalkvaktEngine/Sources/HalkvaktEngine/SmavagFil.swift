// Mirror of engine/src/smavagfil.ts — keep 1:1 (DECISIONS #828 byggsteg 7, #844). Held to engine/fixtures/smavagprov.json by
// SmavagFilTests, like the TS and Kotlin readers. The point file (smavag.json, schema 2) lists every small-road point in the order of
// the bits in live.json's `smavag`; each point carries its road (`vag`) and place along it (`ordning`). Silence is a feature: an
// unknown schema, a besked for another file, a wrong point or byte count, a value that is not a whole number or a broken end gives
// no hazards. Only roads with a warning point become hazards. `andar` (DECISIONS #847): each road's two ends, first and last on the
// road and never warning; a road left with fewer than two points is left out (the road test needs two neighbours).
import Foundation

public struct SmavagFil: Sendable {
    public let lon: [Double], lat: [Double], vag: [Int], ordning: [Int]
    /// Each road's two ends as [lonA, latA, lonB, latB] (DECISIONS #847).
    public let andar: [Int: [Double]]
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
        var andar: [Int: [Double]] = [:]
        if let ao = o["andar"] {
            guard let d = ao as? [String: Any] else { return nil }
            for (k, x) in d {
                guard !k.isEmpty, k.allSatisfy({ $0.isASCII && $0.isNumber }), let v = Int(k), let q = x as? [Any], q.count == 4 else { return nil }
                var a: [Double] = []
                for y in q {
                    guard let n = y as? NSNumber, n.doubleValue.isFinite else { return nil }
                    a.append(n.doubleValue)
                }
                andar[v] = a
            }
        }
        return SmavagFil(lon: lon, lat: lat, vag: vag, ordning: ordning, andar: andar)
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
            let a = andar[v]
            var points: [[Double]] = []
            if let a { points.append([a[0], a[1]]) }
            points += idx.map { [lon[$0], lat[$0]] }
            if let a { points.append([a[2], a[3]]) }
            if points.count < 2 { continue }
            let forst = a == nil ? 0 : 1
            out.append(.smavag(id: "smv:\(v)", points: points, warn: idx.indices.filter { varnar(idx[$0]) }.map { $0 + forst }))
        }
        return out
    }
}
