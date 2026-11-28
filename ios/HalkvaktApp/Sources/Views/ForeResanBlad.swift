// Bladet med frågan om varningen före resan, för den som redan har appen (DECISIONS #979 punkt 4). Samma innehåll som
// introduktionens fråga (ForeResanFraga). Tre lägen: frågan, notiserna avstängda i telefonen (fall 3) och varningen på.
import SwiftUI
import UserNotifications

struct ForeResanBlad: View {
    @State private var plats = Platsdelning.shared
    @State private var notiser: UNAuthorizationStatus = .notDetermined
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @Environment(\.scenePhase) private var fas

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                if plats.svar == .ja && notiser == .denied {
                    lage(rubrik: Foreresanord.notiserAvRubrik, text: Foreresanord.notiserAvText)
                    knappar(Foreresanord.notiserAvKnapp, { if let u = URL(string: UIApplication.openSettingsURLString) { openURL(u) } },
                            lank: Foreresanord.nej) { dismiss() }
                } else if plats.svar == .ja {
                    lage(rubrik: Foreresanord.paRubrik, text: Foreresanord.paText)
                    knappar(Foreresanord.klar, { dismiss() })
                } else {
                    MonoLabel(text: Foreresanord.bladEtikett, size: 11).padding(.bottom, 12)
                    ForeResanFraga()
                    knappar(Foreresanord.ja, svaraJa, lank: Foreresanord.nej) { plats.svara(ja: false); dismiss() }
                }
            }
            .padding(.horizontal, 28).padding(.top, 36).padding(.bottom, 32)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .scrollIndicators(.hidden)
        .background(Brand.bg.ignoresSafeArea())
        .presentationDragIndicator(.visible)
        // Tillbaka från telefonens inställningar: läget läses om.
        .task(id: fas) { notiser = await HeadsUpService.shared.status() }
    }

    private func lage(rubrik: String, text: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(rubrik).font(Typo.sans(30, .semibold)).tracking(-0.6).foregroundStyle(Brand.text).accessibilityAddTraits(.isHeader)
            Text(text).font(Typo.sans(15)).lineSpacing(4).foregroundStyle(Brand.text2)
        }
    }

    private func knappar(_ titel: String, _ action: @escaping () -> Void, lank: String? = nil, lankAction: @escaping () -> Void = {}) -> some View {
        VStack(spacing: 12) {
            YellowPill(title: titel, action: action)
            if let lank { MonoLink(title: lank, action: lankAction) }
        }
        .frame(maxWidth: .infinity).padding(.top, 28)
    }

    /// Ja: svaret sparas och iOS frågar om notiser, eftersom varningen är en notis. Den som nekat får läget som pekar till
    /// Inställningar; annars stängs bladet.
    private func svaraJa() {
        plats.svara(ja: true)
        Task {
            await HeadsUpService.shared.requestAuthorizationIfNeeded()
            notiser = await HeadsUpService.shared.status()
            plats.uppdatera()
            if notiser != .denied { dismiss() }
        }
    }
}
