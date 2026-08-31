// Engångsguiden för #22: hur man bygger Bluetooth-automationen i Genvägar.
// Visas som en panel i Inställningar. Ingen egen state — Genvägar äger automationen,
// vi kan varken läsa eller skapa den åt användaren (Apples lås). Vi kan bara förklara
// och öppna rätt app.
import SwiftUI

struct AutostartGuideView: View {
    @Environment(\.openURL) private var openURL

    var body: some View {
        Panel {
            Text("Vakten kan starta av sig själv — via en automation i Genvägar. Det tar en minut, en gång. Välj den utlösare som passar din bil:")
                .foregroundStyle(Brand.text)

            VStack(alignment: .leading, spacing: 6) {
                TriggerRow(title: "Bluetooth", sub: "Bilen har handsfree eller CarPlay: parkoppla, välj bilen → Är ansluten")
                TriggerRow(title: "Fokus Kör", sub: "Ingen Bluetooth: slå på Fokus Kör → Aktivera automatiskt → När du kör. Utlösare: Kör slås på")
                TriggerRow(title: "Kartappen", sub: "Kör du med Google Maps eller Kartor framme: utlösare App → öppnas")
                TriggerRow(title: "Laddaren", sub: "Laddar du i bilen: utlösare Laddare → ansluts")
            }

            VStack(alignment: .leading, spacing: 8) {
                GuideStep(n: 1, text: "Öppna Genvägar → fliken Automation → +")
                GuideStep(n: 2, text: "Välj din utlösare ovan")
                GuideStep(n: 3, text: "Välj Kör direkt (inte Fråga innan) → Nästa")
                GuideStep(n: 4, text: "Sök \"Halkvakt\" → välj Starta vakten → Klar")
                GuideStep(n: 5, text: "Gör om det för motsatsen → Stoppa vakten")
            }

            Text("Ge Halkvakt platsen \"Alltid\" så startar vakten tyst i bakgrunden och kartan stannar på skärmen. Med \"Vid användning\" visas Halkvakt en kort stund vid starten.")
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

private struct TriggerRow: View {
    let title: String
    let sub: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.system(size: 15, weight: .semibold)).foregroundStyle(Brand.text)
            Text(sub).font(.system(size: 13)).foregroundStyle(Brand.dim)
        }
        .accessibilityElement(children: .combine)
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
