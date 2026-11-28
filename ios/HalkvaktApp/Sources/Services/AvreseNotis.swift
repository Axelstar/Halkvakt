// PÅMINNELSEN FÖRE AVRESAN (kort #659, DECISIONS #870): en lokal notis en kvart före den tid föraren valt. Telefonen
// schemalägger den själv, och ingenting skickas. iOS låter inte appen hämta läget vid ett klockslag, så notisen säger inte
// vad som finns längs vägen: den öppnar appen, där rapporten hämtas färsk (DECISIONS #616 punkt 7.1).
import Foundation
import UserNotifications

enum AvreseNotis {
    static let id = "halkvakt.avresa"
    /// Så långt före avresan kommer notisen.
    static let foreS: TimeInterval = 15 * 60

    /// Schemalägger notisen. Falskt när notiserna är avslagna eller tiden för notisen redan har passerat.
    static func schemalagg(mal: String, avresa: Date) async -> Bool {
        let nar = avresa.addingTimeInterval(-foreS)
        guard nar > .now else { return false }
        await HeadsUpService.shared.requestAuthorizationIfNeeded()
        let status = await HeadsUpService.shared.status()
        guard status == .authorized || status == .provisional || status == .ephemeral else { return false }
        let innehall = UNMutableNotificationContent()
        // Målet först: rubriken klipptes på låsskärmen mitt i namnet (Axels skärmbild 28/11, Dags att se vägen till Stora Trädgår…).
        innehall.title = "\(mal) om en kvart"
        innehall.body = "Öppna Halkvakt och se läget längs vägen."
        innehall.sound = .default
        let delar = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: nar)
        let utlosare = UNCalendarNotificationTrigger(dateMatching: delar, repeats: false)
        do {
            try await UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: innehall, trigger: utlosare))
            return true
        } catch {
            return false
        }
    }

    static func taBort() {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
    }
}
