// INSTÄLLNINGAR + OM + appens ingång. Samma svenska som Android, ordagrant
// där kontraktet kräver det (kategoribeskrivningarna, integritetslöftet).
import SwiftUI
import HalkvaktEngine

struct InstallningarView: View {
    @State private var prefs = Prefs.shared
    @State private var guardM = GuardManager.shared
    @State private var showStartDirect = false

    var body: some View {
        ZStack {
            Brand.bg.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Inställningar").font(Typo.sans(34, .semibold)).tracking(-1).foregroundStyle(Brand.text)
                        Text("Fem källor. Slå av det du inte vill höra.").font(Typo.sans(15)).foregroundStyle(Brand.dim)
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        SectionHeader(text: "Varna för")
                        Panel {
                            ToggleRow(title: "Olyckor & hinder", sub: "Trafikverkets pågående lägen", isOn: $prefs.accident)
                            Divider().overlay(Brand.stroke)
                            ToggleRow(title: "Halt väglag", sub: "Rapporterade hala vägsträckor", isOn: $prefs.slippery)
                            Divider().overlay(Brand.stroke)
                            ToggleRow(title: "Frysrisk", sub: "Vägväderstationer nära noll och vått", isOn: $prefs.icing)
                            Divider().overlay(Brand.stroke)
                            ToggleRow(title: "Vilt", sub: "Polisens viltolyckor senaste dygnen", isOn: $prefs.wildlife)
                            Divider().overlay(Brand.stroke)
                            ToggleRow(title: "Fartkameror", sub: "Fasta kameror på din väg", isOn: $prefs.camera)
                        }
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        SectionHeader(text: "Vakten")
                        Panel {
                            ToggleRow(title: "Vaknar själv när du kör", sub: "Startar av rörelsemönstret — inget att trycka på", isOn: $prefs.autoWake)
                            if guardM.authStatus != .authorizedAlways {
                                Text("Kräver platsen Alltid: Inställningar → Halkvakt → Plats → Alltid.")
                                    .font(Typo.sans(13)).foregroundStyle(Brand.yellow)
                            }
                            Divider().overlay(Brand.stroke)
                            HStack {
                                Text("Varna på avstånd").font(Typo.sans(15, .semibold)).foregroundStyle(Brand.text2)
                                Spacer()
                                Text(leadText).font(Typo.mono(13, .medium)).foregroundStyle(Brand.yellow)
                            }
                            Slider(value: $prefs.leadMaxM, in: 400...3000, step: 100).tint(Brand.yellow)
                            HStack {
                                Text("Sent — 400 m"); Spacer(); Text("Tidigt — 3 km")
                            }
                            .font(Typo.sans(12)).foregroundStyle(Brand.faint)
                        }
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        SectionHeader(text: "Rösten")
                        Panel {
                            HStack(alignment: .top) {
                                Text("Halkvakt talar med iOS-rösten du valt i systemet.")
                                    .font(Typo.sans(13)).foregroundStyle(Brand.dim)
                                Spacer()
                                Text("iOS").font(Typo.sans(13, .semibold)).foregroundStyle(Brand.blue)
                            }
                            Text("Byt röst: Inställningar → Tillgänglighet → Talat innehåll → Röster.")
                                .font(Typo.sans(12)).foregroundStyle(Brand.faint)
                            OutlineButton(title: "Testa rösten", icon: "waveform", color: Brand.yellow) {
                                SpeechService.shared.speak("Halka rapporterad om åttahundra meter. Sänk farten.")
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        Button { withAnimation { showStartDirect.toggle() } } label: {
                            HStack {
                                SectionHeader(text: "Starta direkt (valfritt)", color: Brand.dim)
                                Image(systemName: showStartDirect ? "chevron.up" : "chevron.down")
                                    .font(Typo.sans(12)).foregroundStyle(Brand.dim)
                            }
                        }
                        if showStartDirect {
                            Panel {
                                Text("Vakten vaknar själv några hundra meter in. Vill du ha första metern: säg \"Hej Siri, starta Halkvakt\", eller bygg en automation i Genvägar — en minut, en gång.")
                                    .font(Typo.sans(13)).foregroundStyle(Brand.dim)
                            }
                            AutostartGuideView()
                        }
                    }

                    Button { prefs.onboardingDone = false } label: {
                        Label("Visa introduktionen igen", systemImage: "arrow.counterclockwise")
                            .font(Typo.sans(14)).foregroundStyle(Brand.dim)
                    }

                    Text("Ingen inloggning, ingen spårning. Din position stannar i telefonen och matchas mot vägdata lokalt.")
                        .font(Typo.sans(12)).foregroundStyle(Brand.faint)
                        .padding(.top, 4)
                }
                .padding(.horizontal, 20).padding(.top, 10)
                .padding(.bottom, 96)
            }
            .scrollIndicators(.hidden)
        }
        .background(Brand.bg)
    }

    private var leadText: String {
        let m = Int(prefs.leadMaxM)
        return m >= 1000 ? String(format: "%.1f km", Double(m) / 1000).replacingOccurrences(of: ".", with: ",") : "\(m) m"
    }
}

private struct ToggleRow: View {
    let title: String
    let sub: String
    @Binding var isOn: Bool
    var body: some View {
        Toggle(isOn: $isOn) {
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(Typo.sans(15, .semibold)).foregroundStyle(Brand.text)
                Text(sub).font(Typo.sans(12)).foregroundStyle(Brand.dim)
            }
        }
        .tint(Brand.yellow)
        .padding(.vertical, 6)
    }
}

struct OmView: View {
    var body: some View {
        ZStack {
            Brand.bg.ignoresSafeArea()
            ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                BrandHeader()
                SectionHeader(text: "Om Halkvakt")
                Text("Halkvakt varnar dig med rösten — som en passagerare som läst allt Trafikverket vet om vägen framför dig.")
                    .foregroundStyle(Brand.text)

                Panel {
                    Text("Din position lämnar aldrig telefonen.")
                        .foregroundStyle(Brand.yellow).bold()
                    Text("All matchning mot vägdata sker lokalt i appen. Inget konto, ingen spårning.")
                        .foregroundStyle(Brand.dim)
                }

                VStack(alignment: .leading, spacing: 2) {
                    LinkRow(title: "Livekartan — läget just nu", url: "https://axelstar.github.io/halkvakt-karta/karta.html")
                    LinkRow(title: "Om appen & vanliga frågor", url: "https://axelstar.github.io/halkvakt-karta/om.html")
                    LinkRow(title: "Press & material", url: "https://axelstar.github.io/halkvakt-karta/press.html")
                    LinkRow(title: "Integritetspolicy", url: "https://axelstar.github.io/halkvakt-karta/integritet.html")
                }

                Text("Varnar vid Trafikverkets mätstationer och rapporterade väglag — mellan stationerna är vägen oövervakad. Datakällor: Trafikverket (CC0), Polisen, SMHI. Halkvakt är fristående och har ingen koppling till myndigheterna.")
                    .font(Typo.sans(13)).foregroundStyle(Brand.faint)
            }
            .padding(18)
            .padding(.bottom, 96)
            }
            .scrollIndicators(.hidden)
        }
        .background(Brand.bg)
    }
}

@main
struct HalkvaktApp: App {
    @State private var prefs = Prefs.shared

    init() {
        // Måste finnas från första millisekunden: när iOS väcker oss i bakgrunden på
        // betydande förflyttning levereras platsen till DEN delegat som skapas vid start.
        GuardManager.shared.armAutoWake()
    }

    var body: some Scene {
        WindowGroup {
            TabView {
                VaktenView()
                    .tabItem { Label("Vakten", systemImage: "exclamationmark.triangle.fill") }
                InstallningarView()
                    .tabItem { Label("Inställningar", systemImage: "gearshape.fill") }
                OmView()
                    .tabItem { Label("Om", systemImage: "info.circle.fill") }
            }
            .tint(Brand.yellow)
            .preferredColorScheme(.dark)
            // DECISIONS #36: introduktionen är det första man ser, en gång.
            .fullScreenCover(isPresented: Binding(
                get: { !prefs.onboardingDone },
                set: { if !$0 { prefs.onboardingDone = true } }
            )) {
                OnboardingView()
            }
        }
    }
}
