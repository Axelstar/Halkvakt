// INSTÄLLNINGAR + OM + appens ingång. Samma svenska som Android, ordagrant
// där kontraktet kräver det (kategoribeskrivningarna, integritetslöftet).
import SwiftUI
import HalkvaktEngine

struct InstallningarView: View {
    @State private var prefs = Prefs.shared

    var body: some View {
        ZStack {
            Brand.bg.ignoresSafeArea()
            ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                BrandHeader()
                Text("Inställningar").font(.system(size: 30, weight: .heavy)).foregroundStyle(Brand.text)
                Text("Fem källor. Slå av det du inte vill höra.").foregroundStyle(Brand.dim)

                SectionHeader(text: "Varna för")
                Panel {
                    ToggleRow(title: "Olyckor & hinder", sub: "Trafikverkets pågående lägen", isOn: $prefs.accident)
                    ToggleRow(title: "Halt väglag", sub: "Rapporterade hala vägsträckor", isOn: $prefs.slippery)
                    ToggleRow(title: "Frysrisk", sub: "Vägväderstationer nära noll och vått", isOn: $prefs.icing)
                    ToggleRow(title: "Vilt", sub: "Polisens viltolyckor senaste dygnen", isOn: $prefs.wildlife)
                    ToggleRow(title: "Fartkameror", sub: "Fasta kameror på din väg", isOn: $prefs.camera)
                }

                SectionHeader(text: "Förvarning")
                Panel {
                    Text("Längsta avstånd för en varning: \(Int(prefs.leadMaxM)) m")
                        .foregroundStyle(Brand.text)
                    Slider(value: $prefs.leadMaxM, in: 400...3000, step: 100)
                        .tint(Brand.yellow)
                    Text("I hög fart varnar vakten tidigare inom denna gräns.")
                        .font(.system(size: 13)).foregroundStyle(Brand.dim)
                }

                SectionHeader(text: "Vakna själv när du kör")
                Panel {
                    ToggleRow(title: "Starta av sig själv", sub: "Kräver platsen Alltid. Vakten vaknar några minuter in i resan.", isOn: $prefs.autoWake)
                    if GuardManager.shared.authStatus != .authorizedAlways {
                        Text("Platsen är inte Alltid än — Inställningar → Halkvakt → Plats → Alltid.")
                            .font(.system(size: 13)).foregroundStyle(Brand.yellow)
                    }
                }

                SectionHeader(text: "Starta direkt (valfritt)")
                Panel {
                    Text("Vill du att vakten startar i första metern, inte några minuter in: säg \"Hej Siri, starta Halkvakt\", eller bygg en automation i Genvägar — en minut, en gång.")
                        .font(.system(size: 14)).foregroundStyle(Brand.dim)
                }
                AutostartGuideView()

                SectionHeader(text: "Rösten")
                Panel {
                    Button {
                        SpeechService.shared.speak("Halka rapporterad om åttahundra meter. Sänk farten.")
                    } label: {
                        Label("Provlyssna rösten", systemImage: "speaker.wave.2.fill")
                            .foregroundStyle(Brand.yellow)
                    }
                    Text("Byt svensk röst i Inställningar → Tillgänglighet → Talat innehåll → Röster.")
                        .font(.system(size: 13)).foregroundStyle(Brand.dim)
                }

                Button {
                    prefs.onboardingDone = false
                } label: {
                    Label("Visa introduktionen igen", systemImage: "arrow.counterclockwise")
                        .foregroundStyle(Brand.dim)
                }
                .padding(.top, 4)
            }
            .padding(18)
            .padding(.bottom, 96)
            }
            .scrollIndicators(.hidden)
        }
        .background(Brand.bg)
    }
}

private struct ToggleRow: View {
    let title: String
    let sub: String
    @Binding var isOn: Bool
    var body: some View {
        Toggle(isOn: $isOn) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).foregroundStyle(Brand.text).bold()
                Text(sub).font(.system(size: 13)).foregroundStyle(Brand.dim)
            }
        }
        .tint(Brand.yellow)
        .padding(.vertical, 4)
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
                    .font(.system(size: 13)).foregroundStyle(Brand.faint)
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
