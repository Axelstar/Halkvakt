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
                    ready.tag(3)
                }
                .tabViewStyle(.page(indexDisplayMode: .always))
                .indexViewStyle(.page(backgroundDisplayMode: .always))

                HStack(spacing: 16) {
                    Button("Hoppa över") { dismiss() }
                        .font(.system(size: 16))
                        .foregroundStyle(Brand.dim)
                        .opacity(page < pages - 1 ? 1 : 0)   // håller platsen så Nästa/Klar inte hoppar
                        .frame(minWidth: 96, alignment: .leading)
                    PillButton(title: page < pages - 1 ? "Nästa" : "Klar",
                               icon: page < pages - 1 ? "chevron.right" : "checkmark",
                               color: Brand.green) {
                        if page < pages - 1 { withAnimation { page += 1 } } else { dismiss() }
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 8)
                .padding(.bottom, 12)
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

    private var ready: some View {
        OnboardingPage(
            icon: "checkmark.circle.fill",
            title: "Du är klar",
            text: "Två sätt att starta vakten. Inget mer att ställa in."
        ) {
            Panel {
                Label("Tryck på Starta vakten i appen", systemImage: "play.fill")
                    .foregroundStyle(Brand.text)
                Label("Eller säg: \"Hej Siri, starta Halkvakt\"", systemImage: "mic.fill")
                    .foregroundStyle(Brand.text)
                Text("Siri fungerar med telefonen i facket, utan att du rör den. Vakten stoppar sig själv när bilen stått still en kvart.")
                    .font(.system(size: 13)).foregroundStyle(Brand.dim)
            }
            Text("Vill du att vakten startar helt av sig själv när bilen startar? Det går, via en automation i Genvägar — guiden finns under Inställningar → Autostart i bilen. Valfritt.")
                .font(.system(size: 13)).foregroundStyle(Brand.dim)
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
                Spacer(minLength: 56)   // fri höjd under innehållet så sidprickarna inte täcker något
            }
            .padding(18)
        }
        .scrollIndicators(.hidden)
    }
}
