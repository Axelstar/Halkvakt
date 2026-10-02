// What the warning card shows for one alert (design handoff v2, DECISIONS #443).
// Kotlin twin: android/engine/.../WarningCard.kt — same cases, same strings.
// Rule from the design: the card shows what the voice said and nothing more. A number appears only
// when the voice speaks one; halka, vilt and the weather station get words instead.
import Foundation

public struct WarningCard: Equatable {
    public enum Icon: String { case olycka, halka, frys, bro, vilt, kamera }
    public enum Distance: Equatable {
        case number(String, unit: String)   // "3" KM, "500" M
        case words(String)                  // "FRAMFÖR DIG", "FRAMÖVER", "STRAX FRAMFÖR"
    }

    public let icon: Icon
    public let stage: String?      // dark chip, serious accidents only
    public let title: String
    public let sub: String?
    public let distance: Distance
    public let road: String?       // road sign: "E18", "VÄG 25"
    public let limit: Int?         // speed-limit sign
    public let advice: String?     // dark box: "Överväg annan väg", "Sakta ner"
    public let adviceSub: String?  // "STOR PÅVERKAN · RÖJD CA 19:30"
    public let quote: String       // the voice line, verbatim

    /// `meta` is the hazard's own metadata (looked up by `alert.hazardId`); nil for segments or when the
    /// hazard is gone from the snapshot — the card then simply drops road, limit and clearance time.
    public static func make(_ alert: Alert, meta: PointMeta?) -> WarningCard {
        // Same rounding as the voice. alert.distanceM is already rounded to whole metres, so a distance
        // within half a metre below a 500-mark can round one step higher than the voice did — never more.
        let d = Double(alert.distanceM)
        switch alert.kind {
        case .accident:
            let km = Distance.number(String(max(1, Int((d / 1000).rounded()))), unit: "KM")
            let road = roadSign(meta?.road)
            switch alert.step {
            case .early:
                let clear = meta?.endTimeLocal.map { " · RÖJD CA \($0)" } ?? ""
                return WarningCard(icon: .olycka, stage: "ALLVARLIG · TIDIGT", title: "Allvarlig olycka", sub: nil,
                                   distance: km, road: road, limit: nil,
                                   advice: "Överväg annan väg", adviceSub: "STOR PÅVERKAN" + clear, quote: alert.text)
            case .reminder:
                return WarningCard(icon: .olycka, stage: "PÅMINNELSE", title: "Sakta ner", sub: "Olycksplats strax framför dig",
                                   distance: .words("STRAX FRAMFÖR"), road: nil, limit: nil,
                                   advice: nil, adviceSub: nil, quote: alert.text)
            case .late:
                return WarningCard(icon: .olycka, stage: "ALLVARLIG · SENT", title: "Allvarlig olycka", sub: nil,
                                   distance: km, road: road, limit: nil,
                                   advice: "Sakta ner", adviceSub: "STOR PÅVERKAN", quote: alert.text)
            case nil:
                return WarningCard(icon: .olycka, stage: nil, title: "Olycka", sub: nil,
                                   distance: km, road: road, limit: nil, advice: nil, adviceSub: nil, quote: alert.text)
            }
        case .slippery_segment:
            return WarningCard(icon: .halka, stage: nil, title: "Halka", sub: nil, distance: .words("FRAMFÖR DIG"),
                               road: nil, limit: nil, advice: nil, adviceSub: nil, quote: alert.text)
        case .icing_point:
            if meta?.bridge == true {
                // The voice says the bridge distance in metres ("bro om 1200 meter"), so the card does too.
                let m = max(100, Int((d / 100).rounded()) * 100)
                return WarningCard(icon: .bro, stage: nil, title: "Frysrisk", sub: "Bro", distance: .number(String(m), unit: "M"),
                                   road: nil, limit: nil, advice: nil, adviceSub: nil, quote: alert.text)
            }
            return WarningCard(icon: .frys, stage: nil, title: "Frysrisk", sub: "Vägbanan nära noll grader",
                               distance: .words("FRAMÖVER"), road: nil, limit: nil, advice: nil, adviceSub: nil, quote: alert.text)
        case .wildlife:
            return WarningCard(icon: .vilt, stage: nil, title: "Vilt", sub: nil, distance: .words("FRAMÖVER"),
                               road: nil, limit: nil, advice: nil, adviceSub: nil, quote: alert.text)
        case .camera:
            // The voice always says 500 m (the trigger distance), whatever the exact distance was.
            return WarningCard(icon: .kamera, stage: nil, title: "Fartkamera", sub: nil, distance: .number("500", unit: "M"),
                               road: nil, limit: meta?.speedLimitKmh, advice: nil, adviceSub: nil, quote: alert.text)
        }
    }

    /// "E18" stays "E18"; a bare number becomes "VÄG 25" — the same rule as the voice's roadPhrase.
    static func roadSign(_ road: String?) -> String? {
        guard let r = road?.trimmingCharacters(in: .whitespaces), !r.isEmpty else { return nil }
        return r.first!.isLetter ? r.uppercased() : "VÄG \(r)"
    }
}
