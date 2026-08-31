// Introduktionen (DECISIONS #36): det första man ser, en gång. Fyra sidor i ordning —
// löftet, platsen, bannern, autostarten — och sedan är man igång. Varje steg får
// hoppas över; inget låser. Allt som ställs in här går att ändra senare i Inställningar,
// och introduktionen kan visas igen därifrån.
import SwiftUI

struct OnboardingView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var page = 0
    @State private var guardM = GuardManager.shared

    private let pages = 4

    var body: some View {
        ZStack {
            Brand.bg.ignoresSafeArea()
            VStack(spacing: 0) {
                BrandHeader()
                    .padding(.horizontal, 18)

                TabView(selection: $page) {
                    welcome.tag(0)
                    location.tag(1)
                    banner.tag(2)
                    autostart.tag(3)
                }
                .tabViewStyle(.page(indexDisplayMode: .always))
                .indexViewStyle(.page(backgroundDisplayMode: .always))

                HStack {
                    if page < pages - 1 {
                        Button("Hoppa över") { dismiss() }
                            .foregroundStyle(Brand.dim)
                    }
                    Spacer()
                    PillButton(title: page < pages - 1 ? "Nästa" : "Klar",
                               icon: page < pages - 1 ? "chevron.right" : "checkmark",
                               color: Brand.green) {
                        if page < pages - 1 { withAnimation { page += 1 } } else { dismiss() }
                    }
                    .frame(maxWidth: 200)
                }
                .padding(18)
            }
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Sidorna

    private var welcome: some View {
        OnboardingPage(
            icon: "exclamationmark.triangle.fill",
            title: "Halkvakt varnar med rösten",
            text: "Halka, olyckor, frysrisk, vilt och fartkameror — från Trafikverket, i din högtalare, innan du är där. Inga knappar under körning. Tystnad betyder att vägen är lugn."
        ) {
            Panel {
                Text("Din position lämnar aldrig telefonen. Vi samlar in: ingenting.")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Brand.text)
            }
        }
    }

    private var location: some View {
        OnboardingPage(
            icon: "location.fill",
            title: "Platsen — bara i telefonen",
            text: "Vakten jämför din position med vägfarorna lokalt. Välj \"Vid användning\" nu; nästa gång du kör frågar iOS om \"Alltid\", som behövs för att rösten ska tala med släckt skärm."
        ) {
            if guardM.authStatus == .notDetermined {
                PillButton(title: "Tillåt plats", icon: "location.fill", color: Brand.yellow) {
                    guardM.requestLocationPermission()
                }
            } else {
                Label("Platsen är tillåten", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(Brand.green)
            }
        }
    }

    private var banner: some View {
        OnboardingPage(
            icon: "bell.badge.fill",
            title: "Bannern över kartappen",
            text: "Kör du med Google Maps eller Kartor framme visas rösten som en kort banner i åtta sekunder, sedan försvinner den själv. Inget ljud utöver rösten, inget att trycka på."
        ) {
            PillButton(title: "Tillåt notiser", icon: "bell.fill", color: Brand.yellow) {
                Task { await HeadsUpService.shared.requestAuthorizationIfNeeded() }
            }
        }
    }

    private var autostart: some View {
        OnboardingPage(
            icon: "car.fill",
            title: "Starta av sig själv — en gång, sedan aldrig mer",
            text: "Apple låter inte appar starta sig själva i bilen, så du bygger en automation i Genvägar. Svara på en fråga så får du bara de steg som gäller dig."
        ) {
            AutostartGuideView()
        }
    }
}

/// En introduktionssida: ikon, rubrik, brödtext, och ett fritt innehåll under.
private struct OnboardingPage<Content: View>: View {
    let icon: String
    let title: String
    let text: String
    @ViewBuilder var content: Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Image(systemName: icon)
                    .font(.system(size: 44))
                    .foregroundStyle(Brand.yellow)
                    .accessibilityHidden(true)
                Text(title)
                    .font(.system(size: 28, weight: .heavy))
                    .foregroundStyle(Brand.text)
                Text(text)
                    .foregroundStyle(Brand.dim)
                content
                Spacer(minLength: 24)
            }
            .padding(18)
        }
        .scrollIndicators(.hidden)
    }
}
