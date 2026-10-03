// Snapshot → Hazard reader: the Swift mirror of snapshotToHazards() in engine/src/snapshot.ts (THE reference) and of
// SnapshotRepo.toHazards in android/app. Moved here from the app's SnapshotRepo (kort #289, DECISIONS #448) so the
// package tests run it against engine/fixtures/lasarprov.json — the reader contract (#210), one layer below the
// vectors. Pure: dictionaries in, hazards out. Fetching, sha256 and the cache stay in the app.
import Foundation

public enum SnapshotReader {

    /// Mirror of snapshotToHazards() in engine/src/snapshot.ts — keep 1:1, same order.
    public static func toHazards(staticDoc: [String: Any], liveDoc: [String: Any]) -> [Hazard] {
        var out: [Hazard] = []
        // Cameras carry no speed limit: TS and Kotlin read none, and static.json publishes none (DECISIONS #448 b).
        for c in arr(staticDoc, "cameras") {
            out.append(.point(id: "cam:\(str(c, "id"))", kind: .camera,
                              lon: dbl(c, "lon"), lat: dbl(c, "lat"),
                              bearing: optDbl(c, "bearing"), meta: PointMeta()))
        }
        for s in arr(liveDoc, "segments") {
            let rawLine = s["line"] as? [[Any]] ?? []
            var line: [[Double]] = []
            for p in rawLine where p.count >= 2 {
                let lon = (p[0] as? NSNumber)?.doubleValue ?? 0
                let lat = (p[1] as? NSNumber)?.doubleValue ?? 0
                line.append([lon, lat])
            }
            let info = s["info"] as? [String] ?? []
            out.append(.segment(id: "seg:\(str(s, "id"))", line: line,
                                meta: SegmentMeta(code: optInt(s, "code"), info: info)))
        }
        for w in arr(liveDoc, "weather") {
            out.append(.point(id: "wx:\(str(w, "id"))", kind: .icing_point,
                              lon: dbl(w, "lon"), lat: dbl(w, "lat"), bearing: nil,
                              meta: PointMeta(surfaceTempC: optDbl(w, "yta"),
                                              moisture: (w["fukt"] as? Bool) ?? false)))
        }
        for d in arr(liveDoc, "deviations") {
            // Olyckslyftet (#28): sev/slut are absent in snapshots published before this
            // shipped, and absent for non-accident deviation types by design. Missing ⇒ nil
            // ⇒ the engine grades it mild and speaks the old line. Never louder by accident.
            out.append(.point(id: "dev:\(str(d, "id"))", kind: .accident,
                              lon: dbl(d, "lon"), lat: dbl(d, "lat"), bearing: nil,
                              meta: PointMeta(severityCode: optInt(d, "sev"),
                                              endTimeLocal: d["slut"] as? String,
                                              // `road` is published as JSON null when Trafikverket has no
                                              // number (5 % of accidents). str() turned NSNull into the
                                              // string "<null>" and the voice said "på väg <null>" (#210).
                                              road: d["road"] as? String)))
        }
        for v in arr(liveDoc, "wildlife") {
            out.append(.point(id: "vilt:\(str(v, "id"))", kind: .wildlife,
                              lon: dbl(v, "lon"), lat: dbl(v, "lat"), bearing: nil, meta: PointMeta()))
        }
        for v in arr(liveDoc, "djur") {   // #318 — Trafikverkets djur på vägen
            out.append(.point(id: "djur:\(str(v, "id"))", kind: .wildlife,
                              lon: dbl(v, "lon"), lat: dbl(v, "lat"), bearing: nil, meta: PointMeta()))
        }
        for b in arr(liveDoc, "bridges") {   // #38
            out.append(.point(id: "bro:\(str(b, "id"))", kind: .icing_point,
                              lon: dbl(b, "lon"), lat: dbl(b, "lat"), bearing: nil,
                              meta: PointMeta(surfaceTempC: optDbl(b, "yta"),
                                              moisture: (b["fukt"] as? Bool) ?? false, bridge: true)))
        }
        return out
    }

    // MARK: - JSON pickers (mirror the tolerance of the org.json calls in the Kotlin reader)

    public static func arr(_ d: [String: Any], _ k: String) -> [[String: Any]] { d[k] as? [[String: Any]] ?? [] }

    /// ROTFIXEN till #210 (20/9). Den gamla raden var `d[k] as? String ?? "\(d[k] ?? "")"`, och JSON-null
    /// blir `NSNull` — inte `nil` — från JSONSerialization. `NSNull` överlevde alltså `??` och
    /// stränginterpolerades till literalen **"<null>"**, som gick hela vägen ut i rösten: *"på väg <null>"*.
    /// `road` rättades på sin egen rad; det här stänger klassen. Funktionen bär i dag sju id-fält
    /// (cam/seg/wx/dev/vilt/djur/bro) — ett null där hade gett `"cam:<null>"` som farans id, alltså en nyckel i
    /// reprisspärren och i facitsvaret. Ett id som TAL blir texten ("dev:4711"), som i TS och Kotlin.
    public static func str(_ d: [String: Any], _ k: String) -> String {
        if let s = d[k] as? String { return s }
        guard let v = d[k], !(v is NSNull) else { return "" }
        return "\(v)"
    }
    public static func dbl(_ d: [String: Any], _ k: String) -> Double { (d[k] as? NSNumber)?.doubleValue ?? 0 }
    public static func optDbl(_ d: [String: Any], _ k: String) -> Double? { (d[k] as? NSNumber)?.doubleValue }
    public static func optInt(_ d: [String: Any], _ k: String) -> Int? { (d[k] as? NSNumber)?.intValue }
}
