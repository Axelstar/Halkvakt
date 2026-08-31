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
        VStack(alignment: .leading, spacing: 8) {
            Text("Hur kopplar du telefonen i bilen?")
                .font(.system(size: 17, weight: .semibold)).foregroundStyle(Brand.text)
                .padding(.bottom, 4)
            ChoiceButton(title: "CarPlay", sub: "Bilens skärm visar telefonen") { prefs.carSetup = .carplay }
            ChoiceButton(title: "Bluetooth", sub: "Handsfree eller musik, men ingen CarPlay") { prefs.carSetup = .bluetooth }
            ChoiceButton(title: "Inte alls", sub: "Kartan på mobilen, telefonen i facket") { prefs.carSetup = .noConnection }
        }
    }

    // MARK: - Stegen per svar
    // Knappen först, sedan ett steg per skärm i den ordning användaren SER dem efter
    // knapptrycket. Axel 31/8: "svårt att förstå vad jag ska göra" — stegen beskrev
    // Genvägar i stället för att följa skärmarna. Fetstil = det man trycker på.

    @ViewBuilder
    private func steps(for setup: CarSetup) -> some View {
        switch setup {
        case .carplay:
            Intro("Vakten startar när bilens skärm tänds. En minut, en gång.")
            openShortcuts
            Text("Där gör du så här:").font(.system(size: 13)).foregroundStyle(Brand.dim)
            GuideStep(n: 1, text: "Tryck **CarPlay** i listan")
            GuideStep(n: 2, text: "Bocka **Ansluts** → Nästa")
            GuideStep(n: 3, text: "Välj **Kör direkt** → Nästa (Run Immediately)")
            GuideStep(n: 4, text: "Skriv **Halkvakt** i sökrutan → tryck **Starta vakten**")
            GuideStep(n: 5, text: "Tryck **Klar** (Done)")
        case .bluetooth:
            Intro("Vakten startar när bilen kopplar upp. En minut, en gång.")
            openShortcuts
            Text("Där gör du så här:").font(.system(size: 13)).foregroundStyle(Brand.dim)
            GuideStep(n: 1, text: "Tryck **Bluetooth** i listan")
            GuideStep(n: 2, text: "Välj din bil, bocka **Är ansluten** → Nästa")
            GuideStep(n: 3, text: "Välj **Kör direkt** → Nästa (Run Immediately)")
            GuideStep(n: 4, text: "Skriv **Halkvakt** i sökrutan → tryck **Starta vakten**")
            GuideStep(n: 5, text: "Tryck **Klar** (Done)")
            Text("Har du inte parkopplat telefonen med bilen än: gör det först, i bilen, via Inställningar → Bluetooth.")
                .font(.system(size: 13)).foregroundStyle(Brand.dim)
        case .noConnection:
            Intro("Telefonen känner själv av när du kör. Två korta delar, en gång.")
            Text("Del 1 — slå på Fokus Kör").font(.system(size: 15, weight: .semibold)).foregroundStyle(Brand.text)
            Button {
                if let url = URL(string: "App-prefs:") { openURL(url) }
            } label: {
                Label("Öppna Inställningar", systemImage: "gearshape")
                    .foregroundStyle(Brand.yellow)
            }
            .accessibilityHint("Öppnar telefonens inställningar")
            GuideStep(n: 1, text: "Tryck **Fokus** → **Kör** (Focus → Driving)")
            GuideStep(n: 2, text: "Under Aktivera automatiskt: välj **När du kör** (Turn on Automatically → While Driving)")
            Text("Del 2 — automationen").font(.system(size: 15, weight: .semibold)).foregroundStyle(Brand.text).padding(.top, 6)
            openShortcuts
            GuideStep(n: 3, text: "Tryck **Fokus** i listan → välj **Kör** (Driving)")
            GuideStep(n: 4, text: "Bocka **Slås på** → Nästa (Is turned on → Next)")
            GuideStep(n: 5, text: "Välj **Kör direkt** → Nästa (Run Immediately)")
            GuideStep(n: 6, text: "Skriv **Halkvakt** i sökrutan → tryck **Starta vakten** → Klar")
            Text("Kör du oftast med kartan framme kan du göra automationen en gång till med **App → Google Maps → Öppnas**. Då hinner vakten före Fokus.")
                .font(.system(size: 13)).foregroundStyle(Brand.dim)
        }
        Text("Det räcker. Vakten stoppar sig själv när bilen stått still i en kvart. Ge Halkvakt platsen **Alltid** så startar den tyst i bakgrunden.")
            .font(.system(size: 13)).foregroundStyle(Brand.dim)
            .padding(.top, 4)
    }

    private var openShortcuts: some View {
        Button {
            guard let deep = URL(string: "shortcuts://create-automation") else { return }
            openURL(deep) { accepted in
                if !accepted, let plain = URL(string: "shortcuts://") { openURL(plain) }
            }
        } label: {
            Label("Öppna Genvägar på Ny automation", systemImage: "arrow.up.forward.app")
                .foregroundStyle(Brand.yellow)
        }
        .accessibilityHint("Öppnar appen Genvägar direkt på skärmen för ny automation")
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
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity)
            .background(Brand.bg, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Brand.yellow.opacity(0.25), lineWidth: 1))
        }
        .buttonStyle(.plain)
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
            Text(LocalizedStringKey(text)).foregroundStyle(Brand.text)   // **fet** tolkas
        }
        .accessibilityElement(children: .combine)
    }
}
