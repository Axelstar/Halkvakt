// Introduktionen (DECISIONS #36) i designöverlämningen v2 (DECISIONS #443): fyra sidor — Löftet, Platsen,
// Bannern, Du är klar — med systemets egna frågor och vad som händer när föraren säger nej. Varje sida får
// hoppas över; allt går att ändra i Inställningar, och introduktionen kan visas igen därifrån.
import SwiftUI
import UIKit
import UserNotifications

struct OnboardingView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var page = 0
    @State private var guardM = GuardManager.shared
    @State private var notifStatus: UNAuthorizationStatus = .notDetermined
    /// iOS säger inte att föraren avböjde Alltid — status står kvar på "vid användning". Vi vet att vi frågade.
    @State private var askedAlways = false
    @State private var playing = false

    private let pages = 4

    var body: some View {
        ZStack {
            Brand.bg.ignoresSafeArea()
            VStack(spacing: 0) {
                topBar
                TabView(selection: $page) {
                    loftet.tag(0)
                    platsen.tag(1)
                    bannern.tag(2)
                    klar.tag(3)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.timingCurve(0.2, 0.8, 0.2, 1, duration: 0.52), value: page)
                bottomBar
            }
        }
        .preferredColorScheme(.dark)
        .task { notifStatus = await HeadsUpService.shared.status() }
    }

    // MARK: - Ramen

    private var always: Bool { guardM.authStatus == .authorizedAlways }

    private var topBar: some View {
        ZStack {
            Lockup().opacity(page == 0 ? 0 : 1).animation(.easeOut(duration: 0.3), value: page)
            HStack(spacing: 7) {
                Spacer()
                MonoLabel(text: always ? "På" : "Vaken")
                StatusLight(color: always ? Brand.green : Brand.yellow)
            }
        }
        .frame(height: 48)
        .padding(.horizontal, 28)
    }

    private var bottomBar: some View {
        HStack {
            Button { withAnimation { page = pages - 1 } } label: {
                MonoLabel(text: "Hoppa över", size: 11).frame(height: 44)
            }
            .opacity(page < pages - 1 ? 1 : 0)
            .disabled(page == pages - 1)
            .frame(maxWidth: .infinity, alignment: .leading)
            HStack(spacing: 6) {
                ForEach(0..<pages, id: \.self) { i in
                    Capsule().fill(i == page ? Brand.text : Color(hex: 0x2A3439))
                        .frame(width: i == page ? 22 : 6, height: 6)
                        .animation(.easeOut(duration: 0.3), value: page)
                }
            }
            .accessibilityElement().accessibilityLabel("Sida \(page + 1) av \(pages)")
            Button {
                if page < pages - 1 { withAnimation { page += 1 } } else { dismiss() }
            } label: {
                Text(page < pages - 1 ? "NÄSTA" : "KLAR").font(Typo.mono(11, .medium)).tracking(1.5)
                    .foregroundStyle(Brand.text).frame(height: 44)
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding(.horizontal, 28).padding(.bottom, 12)
    }

    // MARK: - Sidorna

    private var loftet: some View {
        Sida {
            Lockup(markSize: 30, textSize: 18).padding(.bottom, 28)
            Rubrik(titel: "Varnar med rösten",
                   text: "Halka, olyckor, frysrisk, vilt och fartkameror från Trafikverket — i din högtalare, innan du är där.")
            Plinth(name: "plinth-logo").frame(minHeight: 160, maxHeight: 220)
            VStack(alignment: .leading, spacing: 8) {
                MonoLabel(text: "Löftet")
                Text("Din position lämnar inte telefonen av sig själv.").font(Typo.sans(17, .medium)).foregroundStyle(Brand.text)
            }
            .padding(.horizontal, 20).padding(.vertical, 18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
            // En riktig replik ur motorn (DECISIONS #443) — aldrig en påhittad.
            YellowPill(title: playing ? "Spelar…" : "Testa rösten", playIcon: !playing) {
                guard !playing else { return }
                playing = true
                SpeechService.shared.speak("Fartkamera om 500 meter. Gränsen är 80.")
                Task { try? await Task.sleep(for: .seconds(4)); playing = false }
            }
            .padding(.top, 16)
        }
    }

    private var platsen: some View {
        Sida {
            Rubrik(titel: "Platsen — bara i telefonen", text: "Välj Alltid så kan vakten starta själv när du kör.")
            Plinth(name: platsSockel).frame(minHeight: 180, maxHeight: 240)
            Group {
                switch guardM.authStatus {
                case .notDetermined:
                    YellowPill(title: "Tillåt plats") { guardM.requestLocationPermission() }
                case .authorizedWhenInUse where askedAlways:
                    VStack(spacing: 6) {
                        HStack(spacing: 12) {
                            Circle().strokeBorder(Brand.faint2, lineWidth: 2)
                                .overlay(Circle().fill(Brand.dim).padding(7)).frame(width: 28, height: 28)
                            Text("Bara när appen är öppen — vakten startar inte själv").font(Typo.sans(15, .medium)).foregroundStyle(Brand.text)
                        }
                        MonoLink(title: "Ändra till Alltid") { oppnaInstallningar() }
                    }
                case .authorizedWhenInUse:
                    YellowPill(title: "Tillåt Alltid", color: Brand.green) { askedAlways = true; guardM.requestAlwaysUpgrade() }
                case .authorizedAlways:
                    Bock(text: "Alltid — vakten vaknar själv när du kör")
                default:
                    VStack(spacing: 16) {
                        VStack(spacing: 6) {
                            MonoLabel(text: "Plats · av")
                            Text("Utan plats vet vakten inte vad som ligger framför dig.")
                                .font(Typo.sans(15)).foregroundStyle(Brand.text2).multilineTextAlignment(.center).frame(maxWidth: 280)
                        }
                        YellowPill(title: "Öppna Inställningar") { oppnaInstallningar() }
                    }
                }
            }
            .frame(minHeight: 56)
        }
    }

    private var platsSockel: String {
        switch guardM.authStatus {
        case .authorizedAlways: return "plinth-pin-always"
        case .authorizedWhenInUse: return askedAlways ? "plinth-pin-whenonly" : "plinth-pin"
        case .notDetermined: return "plinth-pin"
        default: return "plinth-pin-denied"
        }
    }

    private var notiserPa: Bool { [.authorized, .provisional, .ephemeral].contains(notifStatus) }

    private var bannern: some View {
        Sida {
            Rubrik(titel: "Bannern över kartappen",
                   text: "Kör du med Google Maps eller Kartor visas rösten som en banner i åtta sekunder.")
            ZStack {
                Plinth(name: "plinth-map").padding(.top, 60)
                ExempelBanner().opacity(notifStatus == .denied ? 0.35 : 1).offset(y: -40)
            }
            .frame(minHeight: 220, maxHeight: 280)
            Group {
                if notiserPa {
                    Bock(text: "Notiser på")
                } else if notifStatus == .denied {
                    VStack(spacing: 6) {
                        Text("Rösten varnar ändå — bara utan banner.").font(Typo.sans(15)).foregroundStyle(Brand.text2)
                        MonoLink(title: "Slå på i Inställningar") { oppnaInstallningar() }
                    }
                } else {
                    YellowPill(title: "Tillåt notiser") {
                        Task {
                            await HeadsUpService.shared.requestAuthorizationIfNeeded()
                            notifStatus = await HeadsUpService.shared.status()
                        }
                    }
                }
            }
            .frame(minHeight: 56)
        }
    }

    private var klar: some View {
        let platsSaknas = !(always || guardM.authStatus == .authorizedWhenInUse)
        let status: (String, Color) = always ? (notiserPa ? ("REDO", Brand.green) : ("REDO · UTAN BANNER", Brand.dim))
                                             : (platsSaknas ? ("EJ REDO", Brand.dim) : ("BEGRÄNSAD", Brand.dim))
        return Sida {
            Rubrik(titel: "Du är klar",
                   text: always ? "Vakten startar själv när du kör."
                        : platsSaknas ? "Vakten behöver din plats för att kunna varna." : "Vakten varnar när appen är öppen.")
            Spacer(minLength: 20)
            VStack(spacing: 0) {
                HStack {
                    MonoLabel(text: "Kvitto")
                    Spacer()
                    MonoLabel(text: Date.now.formatted(.dateTime.day(.twoDigits).month(.twoDigits).year()))
                }
                .padding(.top, 14).padding(.bottom, 16)
                DashedDivider()
                ReceiptRow(label: "Start", value: always ? "Själv när du kör" : platsSaknas ? "Plats saknas" : "När appen är öppen",
                           valueColor: always ? Brand.text : Brand.text2)
                ReceiptRow(label: "Direkt", value: "”Hej Siri, starta Halkvakt”")
                ReceiptRow(label: "Stopp", value: "Efter 15 min parkerad")
                ReceiptRow(label: "Banner", value: notiserPa ? "På" : "Av — bara röst", valueColor: notiserPa ? Brand.text : Brand.text2)
                HStack {
                    MonoLabel(text: "Status", size: 11)
                    Spacer()
                    HStack(spacing: 8) {
                        Circle().fill(status.1).frame(width: 8, height: 8)
                        Text(status.0).font(Typo.mono(11, .medium)).tracking(1.3).foregroundStyle(status.1)
                    }
                }
                .padding(.vertical, 16)
            }
            .padding(.horizontal, 20)
            .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
            if always && notiserPa {
                MonoLabel(text: "Allt går att ändra i Inställningar", color: Brand.faint).padding(.top, 14)
            } else {
                MonoLink(title: "Åtgärda i Inställningar") { withAnimation { page = always ? 2 : 1 } }.padding(.top, 6)
            }
        }
    }

    private func oppnaInstallningar() {
        if let u = URL(string: UIApplication.openSettingsURLString) { openURL(u) }
    }
}

/// En introduktionssida: centrerat innehåll, padding 36/32/56 (56 fritt ovanför bottenraden).
private struct Sida<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        ScrollView {
            VStack(spacing: 0) { content }
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 32).padding(.top, 36).padding(.bottom, 56)
        }
        .scrollIndicators(.hidden)
        .scrollBounceBehavior(.basedOnSize)
    }
}

private struct Rubrik: View {
    let titel: String
    let text: String
    var body: some View {
        VStack(spacing: 14) {
            Text(titel).font(Typo.sans(32, .semibold)).tracking(-0.8).foregroundStyle(Brand.text)
            Text(text).font(Typo.sans(15)).lineSpacing(4).foregroundStyle(Brand.text2).frame(maxWidth: 300)
        }
        .multilineTextAlignment(.center)
    }
}

/// Grön bock + text — "Alltid — vakten vaknar själv när du kör", "Notiser på".
private struct Bock: View {
    let text: String
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "checkmark").font(.system(size: 13, weight: .bold)).foregroundStyle(Brand.bg)
                .frame(width: 28, height: 28).background(Brand.green, in: Circle())
            Text(text).font(Typo.sans(15, .medium)).foregroundStyle(Brand.text)
        }
        .frame(minHeight: 56)
        .accessibilityElement(children: .combine)
    }
}

/// Bannern som den ser ut över kartappen: märket, faran, motorns riktiga replik, nedräkning. Svävar ±6 pt.
private struct ExempelBanner: View {
    @State private var up = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        TimelineView(.periodic(from: .now, by: 0.1)) { ctx in
            let t = ctx.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 10)
            let kvar = max(0, 8 - t)
            VStack(spacing: 0) {
                HStack(spacing: 11) {
                    Image("ikon-mark").renderingMode(.template).resizable().scaledToFit().frame(width: 18, height: 16)
                        .foregroundStyle(Brand.yellow)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("FARTKAMERA · 500 M").font(Typo.mono(9)).tracking(1.1).foregroundStyle(Brand.dim)
                        Text("Fartkamera om 500 meter. Gränsen är 80.").font(Typo.sans(14, .medium)).foregroundStyle(Brand.text)
                            .lineLimit(1).minimumScaleFactor(0.8)
                    }
                    Spacer(minLength: 0)
                    Text("\(Int(kvar.rounded(.up))) S").font(Typo.mono(10)).foregroundStyle(Brand.dim)
                }
                .padding(.horizontal, 13).padding(.vertical, 11)
                GeometryReader { g in
                    ZStack(alignment: .leading) {
                        Rectangle().fill(Brand.trackOff)
                        Rectangle().fill(Brand.text).frame(width: g.size.width * kvar / 8)
                    }
                }
                .frame(height: 2)
            }
            .frame(width: 270)
            .background(Brand.raisedSolid, in: RoundedRectangle(cornerRadius: 14))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .shadow(color: Brand.panel, radius: 0, y: 5)
            .shadow(color: .black.opacity(0.55), radius: 15, y: 22)
        }
        .offset(y: up ? -6 : 0)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) { up = true }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Exempel på bannern: Fartkamera om 500 meter. Gränsen är 80.")
    }
}
