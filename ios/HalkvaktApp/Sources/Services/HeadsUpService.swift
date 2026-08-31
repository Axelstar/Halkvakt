// #23: heads-up-bannern på iPhone. När rösten varnar och Halkvakt ligger bakom Apple
// Kartor/Google Maps visas en banner i några sekunder och försvinner själv. Löftesvänlig
// form: en vanlig notisbehörighet, ingen knapp, inget att trycka på — rösten är budskapet,
// bannern är ögats kvitto. Tyst (ingen sound): rösten talar redan.
//
// .timeSensitive får bannern att bryta igenom Fokus-lägen (t.ex. "Kör"), vilket är exakt
// när den behövs. Kräver capability "Time Sensitive Notifications" — ligger i
// Halkvakt.entitlements via project.yml. Saknas den faller iOS tyst tillbaka till .active,
// som fortfarande visar bannern över andra appar när Halkvakt är i bakgrunden.
import Foundation
import UserNotifications
import HalkvaktEngine

@MainActor
final class HeadsUpService {
    static let shared = HeadsUpService()
    private let center = UNUserNotificationCenter.current()
    private let identifier = "halkvakt.headsup"
    private static let visibleFor: TimeInterval = 8   // samma 8 s som varningskortet

    private init() {}

    /// Be om tillstånd en gång, tyst om det redan är avgjort. Anropas när vakten startar.
    func requestAuthorizationIfNeeded() async {
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .notDetermined else { return }
        _ = try? await center.requestAuthorization(options: [.alert])
    }

    /// Nuläget — introduktionens sida tre visar en bock när det är klart.
    func status() async -> UNAuthorizationStatus {
        await center.notificationSettings().authorizationStatus
    }

    /// Visa bannern för ett larm. Ersätter en eventuell föregående — aldrig en kö.
    func show(_ alert: Alert) async {
        let content = UNMutableNotificationContent()
        content.title = "Halkvakt"
        content.body = alert.text
        content.interruptionLevel = .timeSensitive
        content.threadIdentifier = identifier

        let request = UNNotificationRequest(identifier: identifier, content: content, trigger: nil)
        center.removeDeliveredNotifications(withIdentifiers: [identifier])
        try? await center.add(request)

        try? await Task.sleep(for: .seconds(Self.visibleFor))
        center.removeDeliveredNotifications(withIdentifiers: [identifier])
    }
}
