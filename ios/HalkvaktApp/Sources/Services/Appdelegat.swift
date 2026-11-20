// Appdelegaten finns för en enda sak (DECISIONS #924): iOS lämnar notisadressen till appens delegat och ingen annanstans.
// Adressen går vidare till Platsdelning, som bara skickar den efter förarens ja.
import UIKit

@MainActor
final class Appdelegat: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Platsdelning.shared.nyAdress(deviceToken.map { String(format: "%02x", $0) }.joined())
    }
}
