// Visas under startknappen när platsen är avslagen. Vakten KAN inte starta utan plats,
// och det ska stå i klartext med en knapp till rätt ställe — aldrig en knapp som svalt
// trycket tyst (Axel 31/8).
import SwiftUI
import UIKit

struct LocationDeniedRow: View {
    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Platsen är avstängd för Halkvakt", systemImage: "location.slash")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Brand.yellow)
            Text("Vakten behöver din position i telefonen för att kunna varna. Slå på Plats → Vid användning eller Alltid.")
                .font(.system(size: 13))
                .foregroundStyle(Brand.dim)
            Button {
                if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
            } label: {
                Label("Öppna Inställningar", systemImage: "gearshape")
                    .foregroundStyle(Brand.yellow)
            }
            .accessibilityHint("Öppnar Halkvakts sida i telefonens inställningar")
        }
        .padding(.top, 8)
    }
}
