// App usage counts, iOS only (DECISIONS #746). Pure: no clocks, no storage — the app passes the day and keeps the result.
//
// WHAT LEAVES THE PHONE, and nothing else: one body per FINISHED day — the day (YYYY-MM-DD), the build channel, the app version
// and the counters below. No device id, no account, no position, no time of day, no warning id, no station, no trip length.
// A day is sent only after it has ended, so nothing about today, and nothing while driving.
import Foundation

public enum Bruket {
    /// Day (YYYY-MM-DD, Europe/Stockholm) → counter → value.
    public typealias Dagar = [String: [String: Int]]

    /// Every counter the app may count. `rakna` and `satt` ignore anything else.
    public static let namn: Set<String> = [
        // Use: the app opened, how the guard started, a new trip.
        "oppnad", "vakt_hand", "vakt_siri", "vakt_sjalv", "resa",
        // Warnings spoken, by kind only.
        "varning_olycka", "varning_halka", "varning_frysrisk", "varning_vilt", "varning_kamera", "varning_kandidat",
        // State that day (1 = true): location Always, self-start on, intro finished, a warning kind switched off.
        "lage_alltid", "lage_sjalvstart", "lage_intro_klar",
        "av_olycka", "av_halka", "av_frysrisk", "av_vilt", "av_kamera",
    ]
    /// A phone that stays offline keeps at most this many days; the oldest go first.
    public static let maxDagar = 14
    /// No counter grows past this in one day.
    public static let tak = 999

    public static func namn(_ kind: HazardKind) -> String {
        switch kind {
        case .accident: return "varning_olycka"
        case .slippery_segment: return "varning_halka"
        case .icing_point: return "varning_frysrisk"
        case .wildlife: return "varning_vilt"
        case .camera: return "varning_kamera"
        case .kandidat: return "varning_kandidat"
        }
    }

    /// One more of `namn` on `dag`.
    public static func rakna(_ d: Dagar, _ namn: String, dag: String) -> Dagar {
        guard Self.namn.contains(namn) else { return d }
        var ut = d
        ut[dag, default: [:]][namn] = min(tak, (d[dag]?[namn] ?? 0) + 1)
        return gallra(ut)
    }

    /// A state that held on `dag` (stored as 1, never summed).
    public static func satt(_ d: Dagar, _ namn: String, dag: String) -> Dagar {
        guard Self.namn.contains(namn) else { return d }
        var ut = d
        ut[dag, default: [:]][namn] = 1
        return gallra(ut)
    }

    /// The finished days, oldest first. Today is never sent.
    public static func attSkicka(_ d: Dagar, idag: String) -> [String] {
        d.keys.filter { $0 < idag && !(d[$0]?.isEmpty ?? true) }.sorted()
    }

    /// The whole body for one day. Keys sorted, so the same day always gives the same bytes.
    public static func body(dag: String, raknare: [String: Int], kanal: String, ver: String) -> Data {
        let r = raknare.filter { namn.contains($0.key) }
        let enc = JSONEncoder()
        enc.outputFormatting = [.sortedKeys]
        return (try? enc.encode(Kropp(dag: dag, kanal: kanal, ver: ver, r: r))) ?? Data()
    }

    public static func utan(_ d: Dagar, _ dag: String) -> Dagar {
        var ut = d
        ut[dag] = nil
        return ut
    }

    private static func gallra(_ d: Dagar) -> Dagar {
        guard d.count > maxDagar else { return d }
        var ut = d
        for dag in d.keys.sorted().prefix(d.count - maxDagar) { ut[dag] = nil }
        return ut
    }

    private struct Kropp: Encodable {
        let dag: String
        let kanal: String
        let ver: String
        let r: [String: Int]
    }
}
