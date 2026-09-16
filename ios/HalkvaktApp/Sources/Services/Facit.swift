// Förarfacit — betatestarnas "stämde det?" (bedömning v3 S4, DECISIONS #186/#196/#201/#203).
// Spegel av Androids Facit.kt: ett svar per varning (id + tid), ett nytt svar ersätter det förra
// och blir osänt igen — förarens senaste ord gäller. Ren Swift, ingen UIKit.
//
// VAD SOM LÄMNAR TELEFONEN, och inget annat: kroppen i body(_:app:ver:) — varningens id, klockslaget,
// svaret, plattform, appversion. Ingen position, ingen resa, inget konto. Men ärligt: ett varnings-id
// pekar på en fara på kartan och klockslaget säger när, så ett svar säger ungefär var bilen var just då.
// Det står i Om-avsnittet, och knappen finns bara för den som själv slagit på betatestet.
import Foundation

struct FacitEntry: Codable, Equatable, Sendable {
    let id: String     // motorns hazardId, t.ex. "wx:2135" eller "seg:16010"
    let t: Date        // när varningen talade
    let svar: Bool     // true = Stämde
    let sent: Bool
}

enum Facit {
    static let max = 200
    static let url = URL(string: "https://xmpfztykhyvhmrzsnjrc.supabase.co/functions/v1/facit-svar")!

    /// Svara på en varning. Ett tidigare svar på samma varning ersätts; det nya är osänt.
    static func answer(_ list: [FacitEntry], id: String, t: Date, svar: Bool) -> [FacitEntry] {
        var out = list.filter { !($0.id == id && $0.t == t) }
        out.append(FacitEntry(id: id, t: t, svar: svar, sent: false))
        return out.count > max ? Array(out.suffix(max)) : out
    }

    static func answerFor(_ list: [FacitEntry], id: String, t: Date) -> Bool? {
        list.last { $0.id == id && $0.t == t }?.svar
    }

    static func pending(_ list: [FacitEntry]) -> [FacitEntry] { list.filter { !$0.sent } }

    /// Markerar exakt de svar som gick iväg — ett svar som hunnit ändras under sändningen förblir osänt.
    static func markSent(_ list: [FacitEntry], _ sent: [FacitEntry]) -> [FacitEntry] {
        list.map { e in
            sent.contains { $0.id == e.id && $0.t == e.t && $0.svar == e.svar }
                ? FacitEntry(id: e.id, t: e.t, svar: e.svar, sent: true) : e
        }
    }

    /// Kroppen som skickas — hela kroppen. Läs den: det är allt som lämnar telefonen.
    static func body(_ e: FacitEntry, app: String, ver: String) -> Data {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime]
        let o: [String: String] = ["id": e.id, "t": iso.string(from: e.t), "svar": e.svar ? "ja" : "nej",
                                   "app": app, "ver": String(ver.prefix(20))]
        return (try? JSONSerialization.data(withJSONObject: o)) ?? Data()
    }
}
