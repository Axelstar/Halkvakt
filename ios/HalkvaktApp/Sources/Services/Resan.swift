// Resan — vad som hände under ETT körpass, och vad föraren ännu inte svarat på.
// Kort #203 (Bengts fråga 18/9, Axels svar på §8 20/9 — DECISIONS #267/#277).
// Spegel av Androids Resan.kt + AlertHistory.kt, rad för rad i beteende.
//
// VARFÖR DEN FINNS. Dagens facit kräver att föraren stannar, avslutar vakten, öppnar appen och
// hittar knapparna — och bara resans SISTA varning går att svara på. Fälttesten 16/9 och 18/9 gav
// noll svar. Undantagsprincipen med underskrift (KB-D7): svaret är en HANDLING, men handlingen får
// vara EN per resa.
//
// TYSTNAD ÄR INGET SVAR. En resa utan tryck ger noll rader — aldrig ett antaget "ja". Den regeln
// bor inte här utan i frånvaron av kod: ingenting i den här filen skriver ett svar av sig själv.
//
// SKILLNAD MOT ANDROID, medvetet: Android kodar historiken som tabbseparerade rader i DataStore och
// bär därför en tolerant avkodare. iOS har redan JSON i UserDefaults för facit (Facit.swift), så
// historiken följer samma väg. Formatet är internt; inget av det lämnar telefonen.
import Foundation

/// En uppläst varning som överlever omstart. `id` = motorns hazardId — facitsvaret behöver veta VILKEN.
/// Tomt id är möjligt i teorin (motorn utan hazardId) och betyder "går inte att svara på".
struct AlertEntry: Codable, Equatable, Hashable, Sendable {
    let t: Date
    let kind: String
    let text: String
    let id: String
}

enum AlertLog {
    static let max = 50

    /// Nyaste SIST — samma ordning som Androids AlertHistory.append. Trimmar äldsta först.
    /// (GuardManager.history, minnesloggen för körläget, är tvärtom nyast först. Den är en annan sak.)
    static func append(_ list: [AlertEntry], _ e: AlertEntry) -> [AlertEntry] {
        let out = list + [e]
        return out.count > max ? Array(out.suffix(max)) : out
    }
}

enum Resan {
    /// Ett dygn, sedan tiger frågan.
    static let dygn: TimeInterval = 24 * 60 * 60

    /// Resans obesvarade varningar: historikens rader från och med `sedan` som saknar svar. Nyast sist.
    ///
    /// Rader UTAN id går inte att svara på — ett svar utan varnings-id kan inte matchas mot något i
    /// domen. De räknas därför inte som obesvarade: annars hade varje sådan rad hållit frågan öppen
    /// för evigt.
    static func obesvarade(_ historik: [AlertEntry], _ facit: [FacitEntry], sedan: Date) -> [AlertEntry] {
        historik.filter { $0.t >= sedan && !$0.id.isEmpty && Facit.answerFor(facit, id: $0.id, t: $0.t) == nil }
    }

    /// Ett tryck, samma svar på allt. Bygger på `Facit.answer`, så ett tidigare svar ersätts och det
    /// nya blir osänt — förarens senaste ord gäller, precis som för ett enskilt svar.
    static func svaraAlla(_ facit: [FacitEntry], _ varningar: [AlertEntry], svar: Bool) -> [FacitEntry] {
        varningar.reduce(facit) { acc, v in Facit.answer(acc, id: v.id, t: v.t, svar: svar) }
    }

    /// Står frågan kvar? En fråga som aldrig försvinner blir tapet, och ett svar på en resa man inte
    /// minns är inte ett facit — det är en gissning.
    static func fragaKvar(sedan: Date?, nu: Date, obesvarade: Int) -> Bool {
        guard let sedan, obesvarade > 0 else { return false }
        return nu.timeIntervalSince(sedan) < dygn
    }

    /// Notisens och kortets fråga. Singular när det bara var en varning — "alla 1 varningarna" är inte svenska.
    static func fraga(_ antal: Int) -> String {
        antal == 1 ? "Resan klar — stämde varningen?" : "Resan klar — stämde alla \(antal) varningarna?"
    }
}
