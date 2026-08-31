// Engångsguiden för #22: hur man bygger Bluetooth-automationen i Genvägar.
// Visas som en panel i Inställningar. Ingen egen state — Genvägar äger automationen,
// vi kan varken läsa eller skapa den åt användaren (Apples lås). Vi kan bara förklara
// och öppna rätt app.
import SwiftUI

struct AutostartGuideView: View {
    @Environment(\.openURL) private var openURL

    var body: some View {
        Panel {
            Text("Vakten kan starta av sig själv när bilen kopplar upp — via en automation i Genvägar. Det tar en minut, en gång.")
                .foregroundStyle(Brand.text)

            VStack(alignment: .leading, spacing: 8) {
                GuideStep(n: 1, text: "Öppna Genvägar → fliken Automation → +")
                GuideStep(n: 2, text: "Välj Bluetooth → välj din bil → Är ansluten")
                GuideStep(n: 3, text: "Välj Kör direkt (inte Fråga innan) → Nästa")
                GuideStep(n: 4, text: "Sök \"Halkvakt\" → välj Starta vakten → Klar")
                GuideStep(n: 5, text: "Gör om det med Är frånkopplad → Stoppa vakten")
            }

            Text("Har bilen CarPlay: välj CarPlay i stället för Bluetooth i steg 2.")
                .font(.system(size: 13)).foregroundStyle(Brand.dim)

            Button {
                if let url = URL(string: "shortcuts://") { openURL(url) }
            } label: {
                Label("Öppna Genvägar", systemImage: "arrow.up.forward.app")
                    .foregroundStyle(Brand.yellow)
            }
            .accessibilityHint("Öppnar appen Genvägar där automationen skapas")
        }
    }
}

private struct GuideStep: View {
    let n: Int
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Text("\(n)")
                .font(.system(size: 13, weight: .bold, design: .monospaced))
                .foregroundStyle(Brand.bg)
                .frame(width: 22, height: 22)
                .background(Brand.yellow, in: Circle())
            Text(text).foregroundStyle(Brand.text)
        }
        .accessibilityElement(children: .combine)
    }
}
