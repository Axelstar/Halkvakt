// Förarens missar — "appen missade" (kort #203 lager 2; Axels ja 20/9, DECISIONS #267 punkt 3–5; Bengts "gör 203" 26/9,
// DECISIONS #379). Spegel av Androids Missar.kt, samma regler, samma kropp. Ren Swift, ingen UIKit.
//
// I BILEN ett ord eller ett tryck: "Hej Siri, appen missade i Halkvakt" eller knappen i körläget. Appen sparar klockslaget,
// närmaste mätstation ur snapshotens stationslista och närmaste halkavsnitt inom 2 km — som id:n, samma ordförråd som
// varningarna. Ingen koordinat. EFTER RESAN väljer föraren vad det var; först då kan missen skickas (tystnad är inget svar).
//
// VAD SOM LÄMNAR TELEFONEN, och inget annat: klockslaget, vad, station-id, segment-id, plattform, appversion. Ärligt (Axels
// ord): station-id plus klockslag säger ungefär var föraren var. Bara betatestare med brytaren på.
import Foundation
import HalkvaktEngine

struct Station: Codable, Equatable, Sendable {
    let id: String
    let lon: Double
    let lat: Double
}

struct MissEntry: Codable, Equatable, Hashable, Sendable {
    let t: Date
    let station: String      // "wx:2135"
    let segment: String?     // "seg:16010" eller nil
    let vad: String?         // förarens val efter resan; nil = inte valt än
    let sent: Bool
}

enum Missar {
    /// Förarens fem val — samma ord som tabellens CHECK (sql/038).
    static let vad = ["halka", "vatten", "vilt", "olycka", "annat"]
    static let segmentM = 2_000.0
    static let max = 50

    /// Närmaste station som "wx:<id>" — nil bara om telefonen inte har någon stationslista än.
    static func narmasteStation(_ stations: [Station], lon: Double, lat: Double) -> String? {
        stations.min { Nearby.haversineM(lon, lat, $0.lon, $0.lat) < Nearby.haversineM(lon, lat, $1.lon, $1.lat) }
            .map { "wx:\($0.id)" }
    }

    /// Närmaste halkavsnitt ur snapshoten, om någon av dess punkter ligger inom `segmentM`.
    static func narmasteSegment(_ hazards: [Hazard], lon: Double, lat: Double) -> String? {
        var basta: (id: String, m: Double)?
        for h in hazards {
            guard case .segment(let id, _, _) = h else { continue }
            let m = Nearby.distanceM(h, lon: lon, lat: lat)
            if m <= segmentM, m < (basta?.m ?? .infinity) { basta = (id, m) }
        }
        return basta?.id
    }

    /// Ett tryck eller ett ord i bilen. Utan station finns inget att peka på — då sparas ingenting.
    static func markera(_ list: [MissEntry], t: Date, station: String?, segment: String?) -> [MissEntry] {
        guard let station else { return list }
        let out = list + [MissEntry(t: t, station: station, segment: segment, vad: nil, sent: false)]
        return out.count > max ? Array(out.suffix(max)) : out
    }

    /// Förarens val efter resan. Ett nytt val ersätter det förra och blir osänt igen.
    static func valj(_ list: [MissEntry], t: Date, vad v: String) -> [MissEntry] {
        guard vad.contains(v) else { return list }
        return list.map { $0.t == t ? MissEntry(t: $0.t, station: $0.station, segment: $0.segment, vad: v, sent: false) : $0 }
    }

    static func omarkerade(_ list: [MissEntry], sedan: Date) -> [MissEntry] {
        list.filter { $0.t >= sedan && $0.vad == nil }
    }

    /// Det som kan skickas: valda, osända och inom serverns fönster (samma 47 h som svaren).
    static func pending(_ list: [MissEntry], now: Date = .now) -> [MissEntry] {
        list.filter { !$0.sent && $0.vad != nil && now.timeIntervalSince($0.t) < Facit.maxAge }
    }

    static func markSent(_ list: [MissEntry], _ sent: [MissEntry]) -> [MissEntry] {
        list.map { e in
            sent.contains { $0.t == e.t && $0.vad == e.vad }
                ? MissEntry(t: e.t, station: e.station, segment: e.segment, vad: e.vad, sent: true) : e
        }
    }

    /// Kroppen som skickas — hela kroppen. Läs den: det är allt som lämnar telefonen.
    static func body(_ e: MissEntry, app: String, ver: String) -> Data {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime]
        let o: [String: Any] = ["miss": true, "t": iso.string(from: e.t), "vad": e.vad ?? "", "station": e.station,
                                "segment": e.segment ?? NSNull(), "app": app, "ver": String(ver.prefix(20))]
        return (try? JSONSerialization.data(withJSONObject: o)) ?? Data()
    }

    /// Notisens och kortets fråga när resan bara bar missar.
    static func fraga(_ antal: Int) -> String {
        antal == 1 ? "Du markerade att appen missade något — vad var det?" : "Du markerade \(antal) missar — vad var det?"
    }
}
