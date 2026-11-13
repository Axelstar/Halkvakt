// Introduktionen (DECISIONS #36), ombyggd 13/11 (kort #651, DECISIONS #851): sex steg — Välkommen, varningarna, hur en
// varning märks, platsen, notiserna och en slutskärm. Före varje ruta från iOS står vilken knapp som ska väljas, och
// varje svar har ett eget läge. Introduktionen kan visas igen från Inställningar, och allt går att ändra där.
import SwiftUI
import UIKit
import UserNotifications
import HalkvaktEngine

struct OnboardingView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @Environment(\.scenePhase) private var scenePhase
    @State private var steg = Steg.valkommen
    @State private var guardM = GuardManager.shared
    @State private var prefs = Prefs.shared
    @State private var notifStatus: UNAuthorizationStatus = .notDetermined
    /// iOS säger inte att föraren avböjde Alltid — status står kvar på "vid användning". Vi vet att vi frågade.
    /// Tillåt en gång ser likadant ut för appen: iOS visar då ingen andra ruta, och läget blir detsamma.
    @State private var askedAlways = false

    private enum Steg: Int {
        case valkommen, varningarna, markningen, platsen, notiserna, klar
    }

    var body: some View {
        ZStack {
            Brand.bg.ignoresSafeArea()
            VStack(spacing: 0) {
                topBar
                Group {
                    switch steg {
                    case .valkommen: valkommen
                    case .varningarna: varningarna
                    case .markningen: markningen
                    case .platsen: platsen
                    case .notiserna: notiserna
                    case .klar: klar
                    }
                }
                .transition(.opacity)
            }
        }
        .preferredColorScheme(.dark)
        .task { notifStatus = await HeadsUpService.shared.status() }
        // Tillbaka från Inställningar: läs om notisläget, annars står sidan kvar på "avslagna".
        .onChange(of: scenePhase) { _, fas in
            if fas == .active { Task { notifStatus = await HeadsUpService.shared.status() } }
        }
    }

    // MARK: - Ramen

    private var always: Bool { guardM.authStatus == .authorizedAlways }
    private var narAppenAnvands: Bool { guardM.authStatus == .authorizedWhenInUse }
    private var notiserPa: Bool { [.authorized, .provisional, .ephemeral].contains(notifStatus) }

    private var stegText: String {
        switch steg {
        case .valkommen: return "Välkommen"
        case .varningarna: return "Steg 1 av 4"
        case .markningen: return "Steg 2 av 4"
        case .platsen: return "Steg 3 av 4"
        case .notiserna: return "Steg 4 av 4"
        case .klar: return always || narAppenAnvands ? "Klart" : "En sak kvar"
        }
    }

    private var topBar: some View {
        HStack(spacing: 7) {
            Lockup()
            Spacer()
            MonoLabel(text: stegText)
            StatusLight(color: always ? Brand.green : Brand.yellow)
        }
        .frame(height: 48)
        .padding(.horizontal, 28)
    }

    private func ga(till nytt: Steg) { withAnimation(.easeOut(duration: 0.3)) { steg = nytt } }

    private func oppnaInstallningar() {
        if let u = URL(string: UIApplication.openSettingsURLString) { openURL(u) }
    }

    // MARK: - Stegen

    private var valkommen: some View {
        Sida(knapp: "Visa mig", action: { ga(till: .varningarna) }, lank: "Hoppa över", lankAction: { ga(till: .klar) }) {
            Rubrik(titel: "Rösten som varnar innan du är där",
                   text: "Halkvakt säger till i bilens högtalare om faror på vägen framför dig.")
            Etikett(text: "Tre steg, ungefär en minut")
            RowPanel {
                StegRad(nummer: 1, titel: "Se vad vakten varnar för")
                StegRad(nummer: 2, titel: "Ge appen två tillstånd")
                StegRad(nummer: 3, titel: "Kör. Resten sköter vakten.", divider: false)
            }
            Etikett(text: "Din plats")
            VStack(alignment: .leading, spacing: 6) {
                Text(Self.platsText).font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text)
                // Kort #357 (DECISIONS #616): introduktionen säger att resor kan sparas, och var.
                Text("Sparar du resor som favoriter stannar de också i telefonen.").font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2)
            }
            .padding(.horizontal, 4)
            Etikett(text: "Bra att veta")
            // Ansvaret (kort #648, DECISIONS #830), en gång, innan vakten används.
            Text("Halkvakt är ett stöd, inte en garanti. Den varnar inte överallt och kan ha fel. Kör alltid efter väglaget.")
                .font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2).padding(.horizontal, 4)
        }
    }

    /// Platsen i klartext (Axels val 13/11, DECISIONS #851). Inställningar bär fortfarande löftets gamla mening.
    private static let platsText = "Din plats stannar i telefonen. Appen hämtar samma vägdata till alla och jämför med var du är, i din telefon. Inget konto behövs."

    private var varningarna: some View {
        Sida(knapp: "Nästa", action: { ga(till: .markningen) }) {
            Rubrik(titel: "Halka, fartkameror och mer", text: "Fem slags varningar, alla påslagna från början.")
            RowPanel {
                VarningsRad(kind: .slippery_segment, titel: "Halka", text: "Rapporterade hala vägsträckor")
                VarningsRad(kind: .camera, titel: "Fartkameror", text: "Fasta kameror på din väg, 500 meter innan och med hastighetsgränsen")
                VarningsRad(kind: .accident, titel: "Olyckor och hinder", text: "Trafikverkets pågående lägen")
                VarningsRad(kind: .wildlife, titel: "Vilt", text: "Djur på vägen")
                VarningsRad(kind: .icing_point, titel: "Frysrisk", text: "Vägbanan nära noll och vått, även på broar", divider: false)
            }
            .padding(.top, 24)
            MonoLabel(text: "Du väljer själv vilka i Inställningar", color: Brand.faint)
                .frame(maxWidth: .infinity, alignment: .leading).padding(.top, 16).padding(.horizontal, 4)
        }
    }

    private var markningen: some View {
        Sida(knapp: "Nästa", action: { ga(till: .platsen) }) {
            Rubrik(titel: "Du hör den först",
                   text: "Rösten säger vad som ligger framför dig, ungefär 30 sekunder innan du är framme.")
            ExempelKort().padding(.top, 24)
            RowPanel {
                StegRad(nummer: 1, titel: "Rösten i bilens högtalare", text: "Eller i telefonens, om den inte är kopplad till bilen.")
                StegRad(nummer: 2, titel: "Gult kort i åtta sekunder", text: "Som en banner om en annan app ligger framme.")
                StegRad(nummer: 3, titel: "Tyst annars", text: "Vakten talar bara när det finns något att varna för.", divider: false)
            }
            .padding(.top, 14)
        }
    }

    @ViewBuilder private var platsen: some View {
        switch guardM.authStatus {
        case .notDetermined:
            // Apple 5.1.1(iv), 5/10: knappen före systemdialogen får inte säga "Tillåt" — bara "Fortsätt".
            Sida(knapp: "Fortsätt", action: { guardM.requestLocationPermission() }) {
                Rubrik(titel: "Platsen, bara i telefonen",
                       text: "Vakten behöver veta var du är för att kunna varna. Din plats stannar i telefonen.")
                Etikett(text: "I nästa ruta från iOS")
                IosVal(rader: ["Tillåt en gång", "Tillåt när appen används", "Tillåt inte"], vald: 1)
                Fot(text: "Sedan frågar iOS en gång till. Vi visar vad du väljer då också.")
            }
        case .authorizedWhenInUse where !askedAlways:
            Sida(knapp: "Fortsätt", action: { askedAlways = true; guardM.requestAlwaysUpgrade() }) {
                Rubrik(titel: "Bra. En ruta till: Alltid",
                       text: "Med Alltid startar vakten själv när du kör. Utan det öppnar du appen och trycker Starta vakten före varje resa.")
                Etikett(text: "I nästa ruta från iOS")
                IosVal(rader: ["Behåll Endast när appen används", "Ändra till Tillåt alltid"], vald: 1)
                Fot(text: "Platsen stannar i telefonen, även med Alltid.")
            }
        case .authorizedWhenInUse:
            Sida(knapp: "Fortsätt", action: { ga(till: .notiserna) }, lank: "Ändra till Alltid", lankAction: oppnaInstallningar) {
                Rubrik(titel: "Du startar vakten själv",
                       text: "Platsen står på När appen används. Det fungerar, men vakten vaknar inte av sig själv när du kör.")
                Etikett(text: "Så blir det")
                RowPanel {
                    StegRad(bock: true, titel: "Varningar när vakten är på", text: "Tryck Starta vakten före resan.")
                    StegRad(bock: false, titel: "Självstart när du kör", text: "Kräver att platsen står på Alltid.", marke: "Av", divider: false)
                }
            }
        case .authorizedAlways:
            Sida(knapp: "Fortsätt", action: { ga(till: .notiserna) }) {
                Rubrik(titel: "Platsen är klar", text: "Du valde Alltid. Vakten startar själv när du kör.")
                Etikett(text: "Så blir det")
                RowPanel {
                    ValRad(titel: "Platsen", varde: "Alltid")
                    ValRad(titel: "Självstart när du kör", varde: prefs.autoWake ? "På" : "Av", divider: false)
                }
                Fot(text: Self.platsText)
            }
        default:
            Sida(knapp: "Öppna Inställningar", action: oppnaInstallningar, lank: "Fortsätt utan plats", lankAction: { ga(till: .notiserna) }) {
                MonoLabel(text: "Platsen är av", color: Brand.yellow, size: 11)
                    .frame(maxWidth: .infinity, alignment: .leading).padding(.bottom, 10)
                Rubrik(titel: "Vakten kan inte varna",
                       text: "Utan platsen vet Halkvakt inte vad som ligger framför dig. iOS frågar inte igen, så det ändras i telefonens inställningar.")
                Etikett(text: "Så gör du")
                RowPanel {
                    StegRad(nummer: 1, titel: "Tryck Öppna Inställningar")
                    StegRad(nummer: 2, titel: "Tryck Plats")
                    StegRad(nummer: 3, titel: "Välj Alltid eller När appen används")
                    StegRad(nummer: 4, titel: "Kom tillbaka hit", divider: false)
                }
            }
        }
    }

    @ViewBuilder private var notiserna: some View {
        let innehall = Group {
            Rubrik(titel: "Se varningen på skärmen",
                   text: "Rösten varnar alltid. Med notiser syns varningen också som en banner överst på skärmen, vilken app du än har framme.")
            ExempelBanner().opacity(notifStatus == .denied ? 0.35 : 1).padding(.top, 34).padding(.bottom, 12)
                .frame(maxWidth: .infinity)
            if notiserPa {
                RowPanel { ValRad(titel: "Notiser", varde: "På", divider: false) }
            } else if notifStatus == .denied {
                Fot(text: "Notiserna är avslagna. Rösten varnar ändå, bara utan banner.")
            } else {
                Etikett(text: "Halkvakt skickar")
                RowPanel {
                    StegRad(bock: true, titel: "Varningar medan du kör")
                    StegRad(bock: true, titel: "En fråga efter resan, om du vill spara den", divider: false)
                }
            }
        }
        if notiserPa {
            Sida(knapp: "Fortsätt", action: { ga(till: .klar) }) { innehall }
        } else if notifStatus == .denied {
            Sida(knapp: "Fortsätt", action: { ga(till: .klar) }, lank: "Slå på i Inställningar", lankAction: oppnaInstallningar) { innehall }
        } else {
            Sida(knapp: "Fortsätt", action: {
                Task {
                    await HeadsUpService.shared.requestAuthorizationIfNeeded()
                    notifStatus = await HeadsUpService.shared.status()
                    ga(till: .klar)
                }
            }, lank: "Inte nu", lankAction: { ga(till: .klar) }) { innehall }
        }
    }

    private var antalPa: Int { [prefs.accident, prefs.slippery, prefs.icing, prefs.wildlife, prefs.camera].filter { $0 }.count }

    @ViewBuilder private var bannerRad: some View {
        if notiserPa {
            ValRad(titel: "Banner på skärmen", varde: "På", divider: false)
        } else {
            StegRad(bock: false, titel: "Banner på skärmen", text: "Rösten varnar ändå.", marke: "Av", divider: false)
        }
    }

    @ViewBuilder private var klar: some View {
        if always || narAppenAnvands {
            let sjalv = always && prefs.autoWake
            Sida(knapp: "Klar", action: { dismiss() },
                 lank: always ? nil : "Ändra till Alltid", lankAction: oppnaInstallningar,
                 fot: always ? "Allt går att ändra i Inställningar" : nil) {
                Rubrik(titel: sjalv ? "Vakten är redo" : "Redo när du startar",
                       text: sjalv ? "Nästa gång du kör säger rösten till om något ligger framför dig."
                                   : "Vakten varnar så fort du tryckt Starta vakten. Den vaknar inte av sig själv.")
                Etikett(text: "Det här har du nu")
                RowPanel {
                    ValRad(titel: "Varningar", varde: "\(antalPa) av 5")
                    ValRad(titel: "Start", varde: sjalv ? "Själv när du kör" : "Du trycker själv")
                    bannerRad
                }
                Etikett(text: "Så fungerar det")
                RowPanel {
                    if sjalv {
                        StegRad(nummer: 1, titel: "Du kör iväg", text: "Vakten startar själv.")
                    } else {
                        StegRad(nummer: 1, titel: "Öppna Halkvakt före resan", text: "Tryck Starta vakten.")
                    }
                    StegRad(nummer: 2, titel: "Rösten säger till", text: "Innan du är framme vid faran.")
                    StegRad(nummer: 3, titel: "Du parkerar", text: "Vakten stänger av sig efter 15 minuter.", divider: false)
                }
            }
        } else {
            Sida(knapp: "Slå på platsen", action: {
                if guardM.authStatus == .notDetermined { ga(till: .platsen) } else { oppnaInstallningar() }
            }, lank: "Gör det senare", lankAction: { dismiss() }) {
                Rubrik(titel: "Nästan redo", text: "En sak saknas för att vakten ska kunna varna.")
                Etikett(text: "Det här saknas")
                RowPanel {
                    StegRad(bock: false, titel: "Platsen", text: "Utan plats vet vakten inte vad som ligger framför dig.", marke: "Av",
                            markeFarg: Brand.yellow, divider: false)
                }
                Etikett(text: "Det här har du nu")
                RowPanel {
                    ValRad(titel: "Varningar", varde: "\(antalPa) av 5")
                    bannerRad
                }
            }
        }
    }
}

// MARK: - Byggstenarna

/// Ett steg: innehållet rullar, knappen står fast nederst med en valfri länk eller fotrad under.
private struct Sida<Content: View>: View {
    let knapp: String
    let action: () -> Void
    var lank: String? = nil
    var lankAction: () -> Void = {}
    var fot: String? = nil
    @ViewBuilder var content: Content

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) { content }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 28).padding(.top, 28).padding(.bottom, 24)
            }
            .scrollIndicators(.hidden)
            .scrollBounceBehavior(.basedOnSize)
            YellowPill(title: knapp, action: action)
            Group {
                if let lank {
                    MonoLink(title: lank, action: lankAction)
                } else if let fot {
                    MonoLabel(text: fot, color: Brand.faint)
                }
            }
            .frame(height: 44)
            .padding(.bottom, 8)
        }
    }
}

private struct Rubrik: View {
    let titel: String
    let text: String
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(titel).font(Typo.sans(32, .semibold)).tracking(-0.8).foregroundStyle(Brand.text)
                .accessibilityAddTraits(.isHeader)
            Text(text).font(Typo.sans(15)).lineSpacing(4).foregroundStyle(Brand.text2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Mono-etiketten över en panel.
private struct Etikett: View {
    let text: String
    var body: some View {
        MonoLabel(text: text).frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 24).padding(.bottom, 10).padding(.horizontal, 4)
    }
}

/// En rad löptext under en panel.
private struct Fot: View {
    let text: String
    var body: some View {
        Text(text).font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2)
            .frame(maxWidth: .infinity, alignment: .leading).padding(.top, 14).padding(.horizontal, 4)
    }
}

/// Grön bock eller tom ring, 22 pt.
private struct Marke: View {
    let bock: Bool
    var body: some View {
        if bock {
            Image(systemName: "checkmark").font(.system(size: 11, weight: .bold)).foregroundStyle(Brand.bg)
                .frame(width: 22, height: 22).background(Brand.green, in: Circle())
                .accessibilityLabel("På")
        } else {
            Circle().strokeBorder(Brand.dim, lineWidth: 2).frame(width: 22, height: 22)
                .accessibilityLabel("Av")
        }
    }
}

/// Rad med en siffra, en bock eller en ring först, sedan rubrik, en valfri rad text och ett valfritt märke till höger.
private struct StegRad: View {
    var nummer: Int? = nil
    var bock: Bool? = nil
    let titel: String
    var text: String? = nil
    var marke: String? = nil
    var markeFarg: Color = Brand.dim
    var divider = true

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: 14) {
                if let nummer {
                    Text("\(nummer)").font(Typo.mono(11, .semibold)).foregroundStyle(Brand.text)
                        .frame(width: 22, height: 22).overlay(Circle().strokeBorder(Brand.dim, lineWidth: 1))
                } else if let bock {
                    Marke(bock: bock)
                }
                VStack(alignment: .leading, spacing: 3) {
                    Text(titel).font(Typo.sans(16, .medium)).foregroundStyle(Brand.text)
                    if let text { Text(text).font(Typo.sans(14)).lineSpacing(2).foregroundStyle(Brand.text2) }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                if let marke { MonoLabel(text: marke, color: markeFarg, size: 11) }
            }
            .padding(.vertical, 15)
            .accessibilityElement(children: .combine)
            if divider { DashedDivider() }
        }
    }
}

/// Rad med grön bock, rubrik och värdet i grönt till höger — "Platsen · ALLTID".
private struct ValRad: View {
    let titel: String
    let varde: String
    var divider = true

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 14) {
                Marke(bock: true)
                Text(titel).font(Typo.sans(16, .medium)).foregroundStyle(Brand.text)
                    .frame(maxWidth: .infinity, alignment: .leading)
                MonoLabel(text: varde, color: Brand.green, size: 11)
            }
            .frame(minHeight: 52)
            .accessibilityElement(children: .combine)
            if divider { DashedDivider() }
        }
    }
}

/// En fara i listan över varningarna: ikonen, namnet och en rad om källan.
private struct VarningsRad: View {
    let kind: HazardKind
    let titel: String
    let text: String
    var divider = true

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 16) {
                HazardIcon(kind: kind, size: 28).foregroundStyle(Brand.text).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text(titel).font(Typo.sans(16, .medium)).foregroundStyle(Brand.text)
                    Text(text).font(Typo.sans(13)).lineSpacing(2).foregroundStyle(Brand.text2)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.vertical, 12)
            .accessibilityElement(children: .combine)
            if divider { DashedDivider() }
        }
    }
}

/// Knapparna i iOS nästa ruta, uppställda som i rutan, med den som ska väljas förbockad och märkt.
private struct IosVal: View {
    let rader: [String]
    let vald: Int

    var body: some View {
        VStack(spacing: 0) {
            ForEach(Array(rader.enumerated()), id: \.offset) { i, rad in
                HStack(spacing: 14) {
                    Marke(bock: i == vald).accessibilityHidden(true)
                    Text(rad).font(Typo.sans(16, i == vald ? .semibold : .regular))
                        .foregroundStyle(i == vald ? Brand.text : Brand.dim)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    if i == vald { MonoLabel(text: "Välj den", color: Brand.green) }
                }
                .frame(minHeight: 56)
                .accessibilityElement(children: .combine)
                if i < rader.count - 1 { DashedDivider() }
            }
        }
        .padding(.horizontal, 20)
        .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(Brand.line, lineWidth: 1))
    }
}

/// Varningskortet i litet format: märket, faran och motorns riktiga replik (DECISIONS #444) — aldrig en påhittad.
private struct ExempelKort: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Image("ikon-mark").renderingMode(.template).resizable().scaledToFit().frame(width: 16, height: 14)
                Text("HALKVAKT VARNAR").font(Typo.mono(11, .semibold)).tracking(1.5)
                Spacer()
                Text("8 S").font(Typo.mono(11, .medium))
            }
            HStack(spacing: 16) {
                HazardIcon(kind: .slippery_segment, size: 56)
                VStack(alignment: .leading, spacing: 8) {
                    Text("Halka").font(Typo.sans(32, .semibold)).tracking(-1)
                    Text("FRAMFÖR DIG").font(Typo.mono(13, .semibold)).tracking(1.6)
                }
            }
            .padding(.top, 16)
            Text("”Varning: halka rapporterad på vägen framför dig.”").font(Typo.sans(14)).lineSpacing(2)
                .foregroundStyle(Color(hex: 0x3A2E0B)).padding(.top, 14)
        }
        .foregroundStyle(Brand.bg)
        .padding(.horizontal, 20).padding(.vertical, 18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Brand.amber, in: RoundedRectangle(cornerRadius: 18))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Exempel på varningskortet: Halka framför dig. Varning: halka rapporterad på vägen framför dig.")
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
