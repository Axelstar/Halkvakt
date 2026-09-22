// Introduktionen (DECISIONS #36): det första man ser, en gång. Fyra sidor i ordning —
// löftet, platsen, bannern, autostarten — och sedan är man igång. Varje steg får
// hoppas över; inget låser. Allt som ställs in här går att ändra senare i Inställningar,
// och introduktionen kan visas igen därifrån.
import SwiftUI
import UserNotifications

struct OnboardingView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var page = 0
    @State private var guardM = GuardManager.shared
    @State private var notifStatus: UNAuthorizationStatus = .notDetermined

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
                        .font(Typo.sans(16))
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
                Text("Din position lämnar aldrig telefonen. Vi samlar in: ingenting — om du inte själv slår på betatestets facit i Inställningar.")
                    .font(Typo.sans(15, .semibold))
                    .foregroundStyle(Brand.text)
            }
        }
    }

    private var location: some View {
        OnboardingPage(
            icon: "location.fill",
            title: "Platsen — bara i telefonen",
            text: "Vakten jämför din position med vägfarorna lokalt. Välj \"Vid användning\" nu — det räcker för att vakten ska tala med släckt skärm. Strax frågar iOS om \"Alltid\" — säg ja, så startar vakten av sig själv när du kör."
        ) {
            switch guardM.authStatus {
            case .notDetermined:
                PillButton(title: "Tillåt plats", icon: "location.fill", color: Brand.yellow) {
                    guardM.requestLocationPermission()
                }
            case .authorizedWhenInUse:
                Label("Vid användning — bra. Ett steg till:", systemImage: "checkmark.circle")
                    .foregroundStyle(Brand.text)
                PillButton(title: "Tillåt Alltid", icon: "car.fill", color: Brand.green) {
                    guardM.requestAlwaysUpgrade()
                }
                Text("Kommer ingen fråga: Inställningar → Halkvakt → Plats → Alltid.")
                    .font(Typo.sans(13)).foregroundStyle(Brand.dim)
            case .authorizedAlways:
                Label("Alltid — vakten vaknar själv när du kör", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(Brand.green)
            default:
                LocationDeniedRow()
            }
        }
    }

    private var banner: some View {
        OnboardingPage(
            icon: "bell.badge.fill",
            title: "Bannern över kartappen",
            text: "Kör du med Google Maps eller Kartor framme visas rösten som en kort banner i åtta sekunder, sedan försvinner den själv. Inget ljud utöver rösten, inget att trycka på."
        ) {
            switch notifStatus {
            case .authorized, .provisional, .ephemeral:
                Label("Notiser tillåtna — bannern visas över kartan", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(Brand.green)
            case .denied:
                Text("Notiser är avslagna. Rösten talar ändå; bannern uteblir. Ändra i Inställningar → Halkvakt → Notiser.")
                    .font(Typo.sans(13)).foregroundStyle(Brand.yellow)
            default:
                PillButton(title: "Tillåt notiser", icon: "bell.fill", color: Brand.yellow) {
                    Task {
                        await HeadsUpService.shared.requestAuthorizationIfNeeded()
                        notifStatus = await HeadsUpService.shared.status()
                    }
                }
            }
        }
        .task { notifStatus = await HeadsUpService.shared.status() }
    }

    private var ready: some View {
        OnboardingPage(
            icon: "checkmark.circle.fill",
            title: "Du är klar",
            text: "Vakten startar av sig själv när du kör, om platsen är Alltid. Inget mer att ställa in."
        ) {
            Panel {
                Label("Med platsen Alltid vaknar vakten själv några minuter in i resan", systemImage: "car.fill")
                    .foregroundStyle(Brand.text)
                Label("Vill du starta direkt: tryck på knappen, eller säg \"Hej Siri, starta Halkvakt\"", systemImage: "mic.fill")
                    .foregroundStyle(Brand.text)
                Text("Vakten stoppar sig själv när bilen stått still en kvart.")
                    .font(Typo.sans(13)).foregroundStyle(Brand.dim)
            }
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
                    .font(Typo.sans(44))
                    .foregroundStyle(Brand.yellow)
                    .accessibilityHidden(true)
                Text(title)
                    .font(Typo.sans(28, .bold))
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
