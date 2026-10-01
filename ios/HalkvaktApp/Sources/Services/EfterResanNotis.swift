// Frågan som kommer till FÖRAREN — föraren letar aldrig (kort #203, Bengt 19/9: "som det är i dag
// är det oerhört krångligt … det kommer inte många svar"). Spegel av Androids visaEfterResan() +
// FacitSvarReceiver: när vakten stannar och resan lämnat obesvarade varningar visas en notis med
// knapparna I SIG, så att svaret kan ges från låsskärmen utan att appen öppnas.
//
// "Ja, alla stämde" hanteras här, utan att appen öppnas (ingen .foreground-option). "Något stämde
// inte" öppnar appen: en avvikelse måste pekas ut på en RAD, och det går inte från en notisknapp —
// kortet överst på Redo. bär resans rader, så föraren landar rätt.
//
// ORDNINGEN ÄR AVSIKTLIG, som på Android: svaret sparas FÖRST, sändningen är det som får misslyckas
// och försöka igen. Misslyckas den ligger svaren kvar som osända och går iväg vid nästa stillastående
// eller appstart — samma seghet som FacitSender redan har.
import Foundation
import UserNotifications

@MainActor
final class EfterResanNotis: NSObject, UNUserNotificationCenterDelegate {
    static let shared = EfterResanNotis()

    static let categoryId = "halkvakt.efterresan"
    nonisolated static let actionJa = "halkvakt.facit.ja"   // läses i nonisolated didReceive — Xcode 26 varnade vid bygge (19)
    static let actionAvvikelse = "halkvakt.facit.avvikelse"
    /// Egen identitet — får aldrig krocka med heads-up-bannern ("halkvakt.headsup").
    private static let notisId = "halkvakt.efterresan.notis"

    private let center = UNUserNotificationCenter.current()

    private override init() { super.init() }

    /// Anropas vid appstart, innan något kan levereras. Kategorin MÅSTE vara registrerad när notisen
    /// visas, annars saknar den knappar — och delegaten måste finnas när föraren trycker, även om
    /// appen startades av just det trycket.
    func register() {
        let ja = UNNotificationAction(identifier: Self.actionJa, title: "Ja, alla stämde", options: [])
        let avvikelse = UNNotificationAction(identifier: Self.actionAvvikelse, title: "Något stämde inte",
                                             options: [.foreground])
        center.setNotificationCategories([
            UNNotificationCategory(identifier: Self.categoryId, actions: [ja, avvikelse],
                                   intentIdentifiers: [], options: [])
        ])
        center.delegate = self
    }

    /// Visa frågan. En åt gången — en ny resa ersätter den förra, aldrig en kö.
    /// Kort #203 lager 2: bara missar ⇒ ingen kategori, alltså inga knappar — det finns inget att bekräfta; notisen öppnar kortet.
    func visa(antal: Int, missar: Int = 0) async {
        let c = UNMutableNotificationContent()
        c.title = antal > 0 ? Resan.fraga(antal) : Missar.fraga(missar)
        c.body = antal > 0 ? "Ett tryck räcker. Tystnad räknas aldrig som ja." : "Välj i appen — utan val skickas ingenting."
        if antal > 0 { c.categoryIdentifier = Self.categoryId }
        c.threadIdentifier = Self.notisId
        center.removeDeliveredNotifications(withIdentifiers: [Self.notisId])
        try? await center.add(UNNotificationRequest(identifier: Self.notisId, content: c, trigger: nil))
    }

    func ta_bort() {
        center.removeDeliveredNotifications(withIdentifiers: [Self.notisId])
    }

    // MARK: - UNUserNotificationCenterDelegate

    /// I förgrunden visas ingen banner — exakt som innan appen fick en delegat alls. Heads-up-bannern
    /// (#23) är till för när Halkvakt ligger BAKOM kartan; står föraren i appen säger skärmen redan allt.
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter,
                                            willPresent notification: UNNotification) async
        -> UNNotificationPresentationOptions { [] }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter,
                                            didReceive response: UNNotificationResponse) async {
        guard response.actionIdentifier == Self.actionJa else { return }   // avvikelse ⇒ appen öppnas, kortet tar vid
        await Self.svaraAlla()
    }

    /// Ett tryck, hela resan. Läser fönstret ur Prefs — utan starttid vet vi inte vad "alla" betyder.
    @MainActor
    private static func svaraAlla() async {
        let p = Prefs.shared
        guard p.facitOn, let sedan = p.tripStart else { return }
        let obes = Resan.obesvarade(p.history, p.facit, sedan: sedan)
        guard !obes.isEmpty else { return }
        p.facit = Resan.svaraAlla(p.facit, obes, svar: true)   // sparat — det dyrbara är i hamn
        shared.ta_bort()
        _ = await FacitSender.flush()                          // får misslyckas; svaren ligger kvar osända
    }
}
