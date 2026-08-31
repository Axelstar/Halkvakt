// Autostart-guiden (#22, DECISIONS #34/#37). Först EN fråga — hur kopplas telefonen i
// bilen? — sedan bara de steg som gäller det svaret. Bengt med CarPlay ska inte läsa om
// Fokus Kör; Axel utan CarPlay ska inte läsa om CarPlay. Svaret sparas så Inställningar
// visar samma guide, med möjlighet att byta.
// Genvägar äger automationen; vi kan varken läsa eller skapa den (Apples lås). Vi förklarar
// och öppnar rätt app. Vakten stoppar sig själv (DECISIONS #35), så en automation räcker.
import SwiftUI

struct AutostartGuideView: View {
    @Environment(\.openURL) private var openURL
    @State private var prefs = Prefs.shared

    var body: some View {
        Panel {
            if let setup = prefs.carSetup {
                steps(for: setup)
                Button {
                    prefs.carSetup = nil
                } label: {
                    Label("Byt bilkoppling", systemImage: "arrow.left")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Brand.yellow)
                }
                .padding(.top, 4)
            } else {
                question
            }
        }
    }

    // MARK: - Frågan

    private var question: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Hur kopplar du telefonen i bilen?")
                .font(.system(size: 17, weight: .semibold)).foregroundStyle(Brand.text)
            ChoiceButton(title: "CarPlay", sub: "Bilens skärm visar telefonen") { prefs.carSetup = .carplay }
            ChoiceButton(title: "Bluetooth", sub: "Handsfree eller musik, men ingen CarPlay") { prefs.carSetup = .bluetooth }
            ChoiceButton(title: "Inte alls", sub: "Kartan på mobilen, telefonen i facket") { prefs.carSetup = .none }
        }
    }

    // MARK: - Stegen per svar

    @ViewBuilder
    private func steps(for setup: CarSetup) -> some View {
        switch setup {
        case .carplay:
            Intro("Vakten startar när bilens skärm tänds. En automation i Genvägar, en gång.")
            GuideStep(n: 1, text: "Öppna Genvägar → fliken Automation → +")
            GuideStep(n: 2, text: "Välj CarPlay → Ansluts")
            GuideStep(n: 3, text: "Välj Kör direkt (inte Fråga innan) → Nästa")
            GuideStep(n: 4, text: "Sök \"Halkvakt\" → välj Starta vakten → Klar")
            openShortcuts
        case .bluetooth:
            Intro("Vakten startar när bilen kopplar upp. Parkoppla telefonen med bilen först om du inte redan gjort det.")
            GuideStep(n: 1, text: "Öppna Genvägar → fliken Automation → +")
            GuideStep(n: 2, text: "Välj Bluetooth → välj din bil → Är ansluten")
            GuideStep(n: 3, text: "Välj Kör direkt (inte Fråga innan) → Nästa")
            GuideStep(n: 4, text: "Sök \"Halkvakt\" → välj Starta vakten → Klar")
            openShortcuts
        case .none:
            Intro("Telefonen känner själv av när du kör, med rörelsesensorerna. Två inställningar, en gång.")
            GuideStep(n: 1, text: "Inställningar → Fokus → Kör → Aktivera automatiskt → När du kör")
            GuideStep(n: 2, text: "Öppna Genvägar → fliken Automation → +")
            GuideStep(n: 3, text: "Välj Fokus → Kör → Slås på")
            GuideStep(n: 4, text: "Välj Kör direkt (inte Fråga innan) → Nästa")
            GuideStep(n: 5, text: "Sök \"Halkvakt\" → välj Starta vakten → Klar")
            Text("Kör du oftast med kartan framme kan du lägga till en automation till: App → Google Maps eller Kartor → Öppnas → Starta vakten. Då hinner vakten före Fokus.")
                .font(.system(size: 13)).foregroundStyle(Brand.dim)
            Button {
                if let url = URL(string: "App-prefs:") { openURL(url) }
            } label: {
                Label("Öppna Inställningar", systemImage: "gearshape")
                    .foregroundStyle(Brand.yellow)
            }
            .accessibilityHint("Öppnar telefonens inställningar, där Fokus finns")
            openShortcuts
        }
        Text("Det räcker. Vakten stoppar sig själv när bilen stått still i en kvart. Ge Halkvakt platsen \"Alltid\" så startar den tyst i bakgrunden.")
            .font(.system(size: 13)).foregroundStyle(Brand.dim)
    }

    private var openShortcuts: some View {
        Button {
            if let url = URL(string: "shortcuts://") { openURL(url) }
        } label: {
            Label("Öppna Genvägar", systemImage: "arrow.up.forward.app")
                .foregroundStyle(Brand.yellow)
        }
        .accessibilityHint("Öppnar appen Genvägar där automationen skapas")
    }
}

private struct Intro: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View { Text(text).foregroundStyle(Brand.text) }
}

private struct ChoiceButton: View {
    let title: String
    let sub: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.system(size: 15, weight: .semibold)).foregroundStyle(Brand.text)
                    Text(sub).font(.system(size: 13)).foregroundStyle(Brand.dim)
                }
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(Brand.yellow)
                    .accessibilityHidden(true)
            }
            .padding(12)
            .background(Brand.bg, in: RoundedRectangle(cornerRadius: 12))
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
