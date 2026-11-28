// INSTÄLLNINGAR + OM + appens ingång. Samma svenska som Android, ordagrant
// där kontraktet kräver det (kategoribeskrivningarna, integritetslöftet).
import SwiftUI
import UIKit
import HalkvaktEngine

struct InstallningarView: View {
    @State private var prefs = Prefs.shared
    @State private var guardM = GuardManager.shared
    @State private var matningen = Matningen.shared

    enum Sida: Hashable { case varnaFor, forvarning, start, rosten, betatest, integritet, om }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Inställningar").font(Typo.sans(32, .semibold)).tracking(-0.8).foregroundStyle(Brand.text)
                    Text("Allt är på från början.").font(Typo.sans(15)).foregroundStyle(Brand.text2).padding(.top, 10)

                    RowPanel {
                        NavigationLink(value: Sida.varnaFor) { NavRowLabel(title: "Varna för", value: "\(antalPa) av 5") }
                        NavigationLink(value: Sida.forvarning) { NavRowLabel(title: "Förvarning", value: Self.avstand(prefs.leadMaxM)) }
                        NavigationLink(value: Sida.start) { NavRowLabel(title: "Start", value: prefs.autoWake ? "Själv" : "Med Siri") }
                        NavigationLink(value: Sida.rosten) { NavRowLabel(title: "Rösten", value: "iOS", divider: false) }
                    }
                    .padding(.top, 28)

                    RowPanel {
                        if Prefs.betatestTillaten {   // bara i TestFlight (#681)
                            NavigationLink(value: Sida.betatest) { NavRowLabel(title: "Betatest", value: prefs.facitOn ? "På" : "Av") }
                        }
                        NavigationLink(value: Sida.integritet) { NavRowLabel(title: "Integritet") }
                        Button { prefs.onboardingDone = false } label: { NavRowLabel(title: "Visa introduktionen igen") }
                        NavigationLink(value: Sida.om) { NavRowLabel(title: "Om Halkvakt", divider: false) }
                    }
                    .padding(.top, 14)

                    // DECISIONS #829: tipsa, tyck till och betygsätt. Delningsarket, förarens mejlapp och App Store; appen sänder inget.
                    MonoLabel(text: "Halkvakt").padding(.top, 24).padding(.horizontal, 4)
                    RowPanel {
                        ShareLink(item: Tipsa.lank, message: Text(Tipsa.text)) { NavRowLabel(title: "Tipsa en vän") }
                        Button { tyckTill() } label: { NavRowLabel(title: "Tyck till") }
                        Button { openURL(Tipsa.betyg) } label: { NavRowLabel(title: "Betygsätt Halkvakt", divider: false) }
                    }
                    .padding(.top, 10)

                    VStack(alignment: .leading, spacing: 6) {
                        MonoLabel(text: "Löftet")
                        Text(Platsord.lofte).font(Typo.sans(15)).foregroundStyle(Brand.text2)
                    }
                    .padding(.top, 24).padding(.horizontal, 4)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 24).padding(.top, 24).padding(.bottom, 150)
            }
            .scrollIndicators(.hidden)
            .background(Brand.bg)
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: Sida.self) { sida in
                Undersida { innehall(sida) }
            }
            .sheet(isPresented: $ingenMejl) { IngenMejlVy() }
        }
    }

    @Environment(\.openURL) private var openURL
    @State private var ingenMejl = false

    /// Förarens egen mejlapp med adressen och tre tekniska rader; tar ingen app emot mailto visas adressen i stället.
    private func tyckTill() {
        let info = Bundle.main.infoDictionary
        let url = Tipsa.mejl(version: info?["CFBundleShortVersionString"] as? String ?? "",
                             bygge: info?["CFBundleVersion"] as? String ?? "",
                             modell: Tipsa.modell,
                             system: "iOS \(UIDevice.current.systemVersion)")
        openURL(url) { ok in
            if !ok { Task { @MainActor in ingenMejl = true } }
        }
    }

    private var antalPa: Int { [prefs.accident, prefs.slippery, prefs.icing, prefs.wildlife, prefs.camera].filter { $0 }.count }

    static func avstand(_ m: Double) -> String {
        m >= 1000 ? String(format: "%.1f km", m / 1000).replacingOccurrences(of: ".", with: ",") : "\(Int(m)) m"
    }

    /// "86 km/h · höjd 40 m · ±12 m · läget 0,4 s gammalt · sagd efter 0,3 s"
    private static func sparText(_ s: Varningsspar) -> String {
        func tal(_ v: Double, _ decimaler: Int = 0) -> String {
            String(format: "%.\(decimaler)f", v).replacingOccurrences(of: ".", with: ",")
        }
        return ["\(tal(s.kmh)) km/h", s.hojdM.map { "höjd \(tal($0)) m" } ?? "ingen höjd", "±\(tal(s.noggrM)) m",
                "läget \(tal(s.alderS, 1)) s gammalt", s.sagdEfterS.map { "sagd efter \(tal($0, 1)) s" } ?? "inte sagd"]
            .joined(separator: " · ")
    }

    @ViewBuilder private func innehall(_ sida: Sida) -> some View {
        switch sida {
        case .varnaFor:
            Rubrik(titel: "Varna för", text: "Slå av det du inte vill höra.")
            VStack(spacing: 10) {
                KallRuta(titel: "Olyckor & hinder", text: "Trafikverkets pågående lägen", pa: $prefs.accident)
                KallRuta(titel: "Halt väglag", text: "Rapporterade hala vägsträckor", pa: $prefs.slippery)
                KallRuta(titel: "Frysrisk", text: "Vägväderstationer nära noll och vått", pa: $prefs.icing)
                KallRuta(titel: "Vilt", text: "Djur på vägen enligt Trafikverket", pa: $prefs.wildlife)
                KallRuta(titel: "Fartkameror", text: "Fasta kameror på din väg", pa: $prefs.camera)
            }
            .padding(.top, 24)
        case .forvarning:
            Rubrik(titel: "Förvarning", text: "Rösten varnar ungefär 30 sekunder före. Du kan korta det, aldrig förlänga.")
            RowPanel {
                ForEach([400.0, 800.0, 1200.0], id: \.self) { m in
                    let namn = m == 400 ? "Kortast" : m == 800 ? "Mellan" : "Fullt — standard"
                    Button { prefs.leadMaxM = m } label: {
                        VStack(spacing: 0) {
                            HStack(spacing: 12) {
                                Text(Self.avstand(m).uppercased()).font(Typo.mono(15, .medium)).foregroundStyle(Brand.text)
                                    .frame(width: 72, alignment: .leading)
                                Text(namn).font(Typo.sans(14)).foregroundStyle(Brand.dim)
                                Spacer()
                                Circle().strokeBorder(prefs.leadMaxM == m ? Brand.green : Color(hex: 0x34424A), lineWidth: 2)
                                    .overlay(Circle().fill(prefs.leadMaxM == m ? Brand.green : .clear).padding(6))
                                    .frame(width: 22, height: 22)
                            }
                            .frame(height: 60).contentShape(Rectangle())
                            if m < 1200 { DashedDivider() }
                        }
                    }
                    .accessibilityAddTraits(prefs.leadMaxM == m ? .isSelected : [])
                }
            }
            .padding(.top, 24)
        case .start:
            Rubrik(titel: "Start", text: "Vakten känner igen när du kör och vaknar själv.")
            RowPanel {
                GreenToggleRow(title: "Vaknar själv när du kör", sub: "Inget att trycka på", isOn: $prefs.autoWake)
                if prefs.autoWake && guardM.authStatus != .authorizedAlways {
                    Text("Kräver platsen Alltid: Inställningar → Halkvakt → Plats → Alltid.")
                        .font(Typo.sans(13)).foregroundStyle(Brand.yellow).padding(.bottom, 14)
                }
            }
            .padding(.top, 24)
            VStack(alignment: .leading, spacing: 4) {
                MonoLabel(text: "Eller säg", size: 11)
                Text("”Hej Siri, starta Halkvakt”").font(Typo.sans(16, .medium)).foregroundStyle(Brand.text)
            }
            .padding(.horizontal, 20).padding(.vertical, 16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
            .padding(.top, 10)
            MonoLabel(text: "Stoppar själv efter 15 min parkerad", color: Brand.faint).padding(.top, 16).padding(.horizontal, 4)
            GenvagarGuide().padding(.top, 32)
        case .rosten:
            Rubrik(titel: "Rösten", text: "Halkvakt talar med iOS-rösten du valt i systemet.")
            Text("BYT RÖST: INSTÄLLNINGAR → TILLGÄNGLIGHET → TALAT INNEHÅLL → RÖSTER")
                .font(Typo.mono(10)).tracking(1).lineSpacing(6).foregroundStyle(Brand.dim)
                .padding(.horizontal, 20).padding(.vertical, 16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
                .padding(.top, 24)
            HStack {
                Spacer()
                // En riktig replik ur motorn (DECISIONS #444) — aldrig en påhittad.
                YellowPill(title: "Testa rösten", playIcon: true) { SpeechService.shared.speak("Fartkamera om 500 meter. Gränsen är 80.") }
                Spacer()
            }
            .padding(.top, 32)
            HStack {
                Spacer()
                MonoLink(title: "Testa i bakgrunden (talar om 5 s)") {
                    SpeechService.shared.speakLater("Fartkamera om 500 meter. Gränsen är 80.")
                }
                Spacer()
            }
            .padding(.top, 16)
        case .betatest:
            Rubrik(titel: "Betatest", text: "Hjälp oss göra varningarna bättre.")
            RowPanel {
                GreenToggleRow(title: "Svara på varningarna", sub: "Tryck Stämde eller Stämde inte efter en varning", isOn: $prefs.facitOn)
            }
            .padding(.top, 24)
            MonoLabel(text: "Vad skickas").padding(.top, 28).padding(.bottom, 10).padding(.horizontal, 4)
            // S4 (Bengt #186, Axel #196): texten säger exakt vad som skickas — inget mer, inget mindre.
            RowPanel {
                ReceiptRow(label: "Skickas", value: "Varningens id, klockslag, ditt svar")
                ReceiptRow(label: "Vid missad", value: "Klockslag, närmaste mätstation, vad det var")
                ReceiptRow(label: "Aldrig", value: "Konto, resa, position", divider: false)
            }
            Text("Ett varnings-id pekar på en fara på kartan, så vi ser ungefär var du var just då. Appens namn och version följer med. Bara för betatestare. Betatest slår också på betavarningen efter regn (*Halkvakt tror: frysrisk framöver*), som prövas bland testarna först.")
                .font(Typo.sans(13)).lineSpacing(3).foregroundStyle(Brand.dim)
                .padding(.top, 14).padding(.horizontal, 4)
            // Fas 2 (DECISIONS #741 punkt 5): mätningen per resa, bara i telefonen (Matningen.swift).
            MonoLabel(text: "Mätningen").padding(.top, 28).padding(.bottom, 6).padding(.horizontal, 4)
            Text("Hur färska varningarna var när de kom fram, och vad det kostade i batteri. Stannar i telefonen.")
                .font(Typo.sans(13)).lineSpacing(3).foregroundStyle(Brand.dim)
                .padding(.bottom, 10).padding(.horizontal, 4)
            RowPanel {
                if matningen.resor.isEmpty {
                    Text("Inga resor mätta än.").font(Typo.sans(15)).foregroundStyle(Brand.dim)
                        .padding(.vertical, 15).frame(maxWidth: .infinity, alignment: .leading)
                } else {
                    ForEach(matningen.resor) { resa in
                        MatningRad(resa: resa, divider: resa.id != matningen.resor.last?.id)
                    }
                }
            }
            // Felsökningen (DECISIONS #987): vad GPS:en sa när de senaste varningarna bestämdes. Ingen position, och inget skickas.
            MonoLabel(text: "Felsökning").padding(.top, 28).padding(.bottom, 6).padding(.horizontal, 4)
            Text("Vad telefonens GPS sa när de senaste varningarna kom: fart, höjd och noggrannhet. Ingen position. Stannar i telefonen.")
                .font(Typo.sans(13)).lineSpacing(3).foregroundStyle(Brand.dim)
                .padding(.bottom, 10).padding(.horizontal, 4)
            RowPanel {
                if prefs.varningsspar.isEmpty {
                    Text("Inga varningar än.").font(Typo.sans(15)).foregroundStyle(Brand.dim)
                        .padding(.vertical, 15).frame(maxWidth: .infinity, alignment: .leading)
                } else {
                    ForEach(Array(prefs.varningsspar.reversed().enumerated()), id: \.element) { i, s in
                        VStack(alignment: .leading, spacing: 4) {
                            Text("\(s.t.dagOchKlockslag) · \(s.kind)").font(Typo.sans(15, .medium)).foregroundStyle(Brand.text)
                            Text(Self.sparText(s)).font(Typo.mono(11)).foregroundStyle(Brand.text2).textSelection(.enabled)
                        }
                        .padding(.vertical, 12).frame(maxWidth: .infinity, alignment: .leading)
                        if i < prefs.varningsspar.count - 1 { DashedDivider() }
                    }
                }
            }
        case .integritet:
            Rubrik(titel: "Integritet", text: nil)
            VStack(alignment: .leading, spacing: 12) {
                MonoLabel(text: "Löftet", size: 11)
                Text(Platsord.lofte).font(Typo.sans(20, .medium)).foregroundStyle(Brand.text)
                // Kort #357 (DECISIONS #616, #625): "ingen spårning" blev osant när resor kan sparas — en sparad resa är ett spår,
                // även om det bara finns hos föraren. Texten säger var de ligger och hur de tas bort.
                Text(Prefs.betatestTillaten
                     ? "All matchning mot vägdata sker lokalt i appen. Inget konto. Två undantag, bara om du själv säger ja: betatestet, och platsdelningen, som sparar vilken kommun du är i."
                     : "All matchning mot vägdata sker lokalt i appen. Inget konto.")
                    .font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2)
                // #772: räknaren är alltid på och står här — texten "inget skickas" var sann till 0.3.15. #787: de sex områdena.
                Text("Appen räknar anonymt hur många som går igenom introduktionen, vilka behörigheter som väljs, hur ofta och ungefär hur länge vakten är på, vilka varningar som sägs, vilka inställningar som ändras och vad som går fel. Ett ord per händelse, med appens version. Aldrig var du är, hur långt du kör eller vem du är.")
                    .font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2)
                Text("Slår du på Fråga om jag vill spara resan under Resor sparas vägarna du väljer, bara i telefonen och aldrig i en säkerhetskopia. Du tar bort dem där.")
                    .font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2)
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
            .padding(.top, 24)
            // Platsdelningen (DECISIONS #917, #918): bara i TestFlight tills orden är bytta överallt.
            if Platsdelning.tillaten { DinDataView().padding(.top, 28).padding(.bottom, 18) }
            RowPanel {
                if Prefs.betatestTillaten {
                    NavigationLink(value: Sida.betatest) { NavRowLabel(title: "Betatest", value: prefs.facitOn ? "På" : "Av") }
                }
                LankRad(titel: "Integritetspolicy", url: "https://axelstar.github.io/halkvakt-karta/integritet.html", divider: false)
            }
            .padding(.top, 10)
        case .om:
            Rubrik(titel: "Om Halkvakt", text: nil)
            RowPanel {
                LankRad(titel: "Livekartan — läget just nu", url: "https://axelstar.github.io/halkvakt-karta/karta.html")
                LankRad(titel: "Om appen & vanliga frågor", url: "https://axelstar.github.io/halkvakt-karta/om.html")
                LankRad(titel: "Ansvar och källor", url: "https://axelstar.github.io/halkvakt-karta/ansvar.html")
                LankRad(titel: "Press & material", url: "https://axelstar.github.io/halkvakt-karta/press.html", divider: false)
            }
            .padding(.top, 24)
            // Var Halkvakt varnar och ansvaret (kort #648, DECISIONS #899), sedan källraden (#898).
            Text("Halkvakt varnar för halka på omkring 800 vägsträckor där Trafikverket rapporterar väglaget: europavägar, riksvägar och större länsvägar, sammanlagt omkring 24 000 km. Där varnar Halkvakt också när dess egna prognoser tror att det är halt; de är betavarningar. Isrisk varnas vid omkring 800 vägväderstationer. Runt Stockholm, Göteborg och Malmö varnar prognoserna också på fler statliga vägar, och i Stockholms stad på gatorna. På de flesta mindre vägar, kommunala gator och enskilda vägar varnar Halkvakt inte för halka. Is som bildas utan regn eller snö, till exempel en klar natt, varnas bara där Trafikverket har rapporterat den eller en station mäter den. Varningarna kan vara fel, komma sent eller saknas, och att appen är tyst betyder inte att vägen är säker. Du ansvarar alltid för att köra efter väglag och sikt.")
                .font(Typo.sans(13)).lineSpacing(3).foregroundStyle(Brand.text2)
                .padding(.top, 20).padding(.horizontal, 4)
            Text("Data: Trafikverket (CC0), SMHI, MET Norway (CC BY 4.0; prognoserna räknas ur deras data), Statens vegvesen (NLOD), Fintraffic (CC BY 4.0), broar © OpenStreetMap-bidragsgivare (ODbL). Halkvakt är fristående och har ingen koppling till myndigheterna.")
                .font(Typo.sans(12)).lineSpacing(3).foregroundStyle(Brand.faint)
                .padding(.top, 12).padding(.horizontal, 4)
            MonoLabel(text: "Halkvakt \(Self.version) · beta", color: Brand.faint2).padding(.top, 16).padding(.horizontal, 4)
        }
    }

    private static var version: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? ""
    }
}

/// Undersida: tillbakalänk "← INSTÄLLNINGAR" i mono, innehållet under. Glider in från höger (NavigationStack).
private struct Undersida<Content: View>: View {
    @ViewBuilder var content: Content
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Button { dismiss() } label: {
                    Text("← INSTÄLLNINGAR").font(Typo.mono(11)).tracking(1.5).foregroundStyle(Brand.text).frame(height: 44)
                }
                content
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 24).padding(.top, 8).padding(.bottom, 150)
        }
        .scrollIndicators(.hidden)
        .background(Brand.bg)
        .toolbar(.hidden, for: .navigationBar)
    }
}

private struct Rubrik: View {
    let titel: String
    let text: String?
    var body: some View {
        Text(titel).font(Typo.sans(32, .semibold)).tracking(-0.8).foregroundStyle(Brand.text).padding(.top, 8).padding(.horizontal, 4)
        if let text {
            Text(text).font(Typo.sans(15)).lineSpacing(3).foregroundStyle(Brand.text2).padding(.top, 10).padding(.horizontal, 4)
        }
    }
}

/// "Varna för": hela rutan är knappen. På = panel, grön prick; Av = mark, grå prick, dämpad text.
private struct KallRuta: View {
    let titel: String
    let text: String
    @Binding var pa: Bool
    var body: some View {
        Button { pa.toggle() } label: {
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(titel).font(Typo.sans(16, .medium)).foregroundStyle(pa ? Brand.text : Brand.faint)
                    Text(text).font(Typo.sans(13)).foregroundStyle(pa ? Brand.dim : Brand.faint2)
                }
                Spacer()
                HStack(spacing: 7) {
                    Circle().fill(pa ? Brand.green : Brand.faint).frame(width: 7, height: 7)
                    Text(pa ? "PÅ" : "AV").font(Typo.mono(10)).tracking(1.4)
                }
                .foregroundStyle(pa ? Brand.green : Brand.faint)
            }
            .padding(.horizontal, 18).padding(.vertical, 14)
            .frame(minHeight: 76)
            .background(pa ? Brand.panel : Brand.bg, in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(pa ? Brand.line : Brand.raisedSolid, lineWidth: 1))
            .animation(.easeOut(duration: 0.2), value: pa)
        }
        .buttonStyle(PressScale())
        .accessibilityValue(pa ? "På" : "Av")
    }
}

/// En mätt resa under Betatest (fas 2): dag, klockslag och längd, raderna under i dämpad text.
private struct MatningRad: View {
    let resa: Matningen.Resa
    var divider = true
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 4) {
                Text(resa.rubrik).font(Typo.sans(15, .medium)).foregroundStyle(Brand.text)
                ForEach(resa.rader, id: \.self) { rad in
                    Text(rad).font(Typo.sans(13)).foregroundStyle(Brand.dim)
                }
            }
            .padding(.vertical, 15)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityElement(children: .combine)
            if divider { DashedDivider() }
        }
    }
}

private struct LankRad: View {
    let titel: String
    let url: String
    var divider = true
    @Environment(\.openURL) private var openURL
    var body: some View {
        Button { if let u = URL(string: url) { openURL(u) } } label: { NavRowLabel(title: titel, divider: divider) }
    }
}

/// "Starta med Genvägar (valfritt)" — designens två spår, stegen rättade mot appen 2/10 ("Kör direkt",
/// åtgärden "Starta vakten"). Knappen öppnar Genvägar direkt på Ny automation (shortcuts://create-automation).
private struct GenvagarGuide: View {
    @Environment(\.openURL) private var openURL
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            MonoLabel(text: "Starta med Genvägar (valfritt)").padding(.horizontal, 4).padding(.bottom, 6)
            Text("Låt vakten starta i samma stund som telefonen ansluter till bilen.")
                .font(Typo.sans(14)).foregroundStyle(Brand.text2).padding(.horizontal, 4).padding(.bottom, 10)
            steg(["Öppna Genvägar → Automation → Ny automation", "Välj CarPlay eller Bluetooth och din bil",
                  "Välj Kör direkt", "Sök på Halkvakt och välj ”Starta vakten”"])
            MonoLabel(text: "Utan CarPlay eller Bluetooth").padding(.horizontal, 4).padding(.top, 24).padding(.bottom, 6)
            Text("Telefonen känner själv av när du kör, via fokus Kör.")
                .font(Typo.sans(14)).foregroundStyle(Brand.text2).padding(.horizontal, 4).padding(.bottom, 10)
            steg(["Inställningar → Fokus → Kör → Aktivera automatiskt → Automatiskt",
                  "Genvägar → Automation → Ny automation → Fokus → Kör → Slås på",
                  "Välj Kör direkt", "Sök på Halkvakt och välj ”Starta vakten”"])
            // Kvittot (DECISIONS #39): Apple låter oss inte läsa om automationen finns, men vi vet när den startade oss.
            if let at = Prefs.shared.lastIntentStartAt {
                HStack(spacing: 8) {
                    Circle().fill(Brand.green).frame(width: 7, height: 7)
                    MonoLabel(text: "Fungerar — startad senast \(at.dagOchKlockslag)", color: Brand.green)
                }
                .padding(.top, 14).padding(.horizontal, 4)
            }
            HStack {
                Spacer()
                MonoLink(title: "Öppna Genvägar") {
                    guard let deep = URL(string: "shortcuts://create-automation") else { return }
                    openURL(deep) { ok in if !ok, let plain = URL(string: "shortcuts://") { openURL(plain) } }
                }
                Spacer()
            }
            .padding(.top, 12)
        }
    }

    private func steg(_ rader: [String]) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(rader.enumerated()), id: \.offset) { i, rad in
                VStack(spacing: 0) {
                    HStack(alignment: .firstTextBaseline, spacing: 14) {
                        Text("\(i + 1)").font(Typo.mono(12, .semibold)).foregroundStyle(Brand.dim).frame(width: 16, alignment: .leading)
                        Text(rad).font(Typo.sans(15)).foregroundStyle(Brand.text)
                        Spacer(minLength: 0)
                    }
                    .padding(.vertical, 13)
                    if i < rader.count - 1 { DashedDivider() }
                }
            }
        }
        .padding(.horizontal, 20)
        .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
    }
}

/// Tre flikar under en flytande kapsel (designen v2, DECISIONS #444; Resor i mitten, förut Favoriter, kort #357, #616, #982) — Vakten,
/// Resor och Inställningar. Ingen flikrad medan vakten kör: körläget täcker allt.
struct RootView: View {
    @State private var tab = 0
    @State private var resplan = Resplan.shared
    @State private var guardM = GuardManager.shared
    @State private var fav = Favoriter.shared
    @State private var prefs = Prefs.shared
    @State private var plats = Platsdelning.shared
    @State private var notis = Servernotis.shared
    @State private var tangentbord = false
    @State private var resorHem = 0
    @Environment(\.scenePhase) private var fas
    var body: some View {
        ZStack(alignment: .bottom) {
            // Flikarna lever hela tiden, som i TabView: ingen omladdning och ingen tappad undersida vid flikbyte.
            VaktenView().opacity(tab == 0 ? 1 : 0).allowsHitTesting(tab == 0).accessibilityHidden(tab != 0)
            FavoriterView(synlig: tab == 1, hem: resorHem).opacity(tab == 1 ? 1 : 0).allowsHitTesting(tab == 1).accessibilityHidden(tab != 1)
            InstallningarView().opacity(tab == 2 ? 1 : 0).allowsHitTesting(tab == 2).accessibilityHidden(tab != 2)
            LinearGradient(colors: [Brand.bg.opacity(0), Brand.bg], startPoint: .top, endPoint: .init(x: 0.5, y: 0.6))
                .frame(height: 130).allowsHitTesting(false)
                .ignoresSafeArea(edges: .bottom)
                .ignoresSafeArea(.keyboard, edges: .bottom)
                .opacity(tangentbord ? 0 : 1)
            // Flikraden står kvar längst ner när tangentbordet kommer upp (Eget namn i Spara resan?) och göms bakom det,
            // i stället för att flyta upp över innehållet (Axels skärmbild 24/10). Under Resor flöt den ändå upp över
            // sökningens text (Maestros skärmbild 28/11), så den göms också medan tangentbordet är uppe.
            // Ett tryck på Resor när fliken redan visas går hem till listan, som i en vanlig flikrad (Axels inspelning 28/11:
            // trycket gjorde ingenting från en planerad resa).
            FloatingTabBar(tab: Binding(get: { tab }, set: { if $0 == 1 && tab == 1 { resorHem += 1 }; tab = $0 })).padding(.bottom, 8)
                .ignoresSafeArea(.keyboard, edges: .bottom)
                .opacity(tangentbord ? 0 : 1).allowsHitTesting(!tangentbord)
        }
        .background(Brand.bg)
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)) { _ in tangentbord = true }
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in tangentbord = false }
        // Skärmens bakgrund bakom klockan: flikarna döljer navigeringsfältet, så texten rullade annars upp under statusfältet
        // (Bengts skärmbilder 18/10, DECISIONS #643). Gäller flikarna och sidorna under dem; körläget är en egen skärm.
        .safeAreaInset(edge: .top, spacing: 0) { Color.clear.frame(height: 0).background(Brand.bg) }
        // Här och inte i VaktenView: vakten kan starta (Siri, Genvägar, självväckning) medan Inställningar visas.
        .fullScreenCover(isPresented: $guardM.running) { KorlageView() }
        // Favoriter 2a (#817): notisen och raden på Redo öppnar fliken med dagens resor överst.
        .onChange(of: fav.visaFliken) { _, visa in if visa { tab = 1; fav.visaFliken = false } }
        // Startsidans Planera resa och raden Planerad resa (DECISIONS #982): fliken Resor, som själv ställer markören eller öppnar resan.
        .onChange(of: resplan.sokBegard) { _, _ in tab = 1 }
        .onChange(of: resplan.resanBegard) { _, _ in tab = 1 }
        // Ett tryck på en varning från servern (DECISIONS #926): startsidan med kartan Nära dig. Ett erbjudande: bladet.
        .onChange(of: notis.visaStart) { _, visa in if visa { tab = 0; notis.visaStart = false } }
        .sheet(item: $notis.erbjudande) { ErbjudandeBlad(erbjudande: $0) }
        // Frågan om varningen före resan för den som redan har appen (DECISIONS #979): ett blad över startsidan, en gång av sig
        // självt, bara med platsen på och aldrig under körning. Sedan öppnas det från raden på startsidan.
        .sheet(isPresented: $plats.visaBladet) { ForeResanBlad() }
        .onChange(of: fas, initial: true) { _, f in
            if f == .active && prefs.onboardingDone && guardM.platsTillaten && !guardM.running { plats.appenOppnad() }
        }
        .onChange(of: prefs.onboardingDone) { _, klar in
            if klar && guardM.platsTillaten && !guardM.running { plats.appenOppnad() }
        }
    }
}

@main
struct HalkvaktApp: App {
    @UIApplicationDelegateAdaptor(Appdelegat.self) private var delegat
    @State private var prefs = Prefs.shared
    @Environment(\.scenePhase) private var scenePhase

    init() {
        // Måste finnas från första millisekunden: när iOS väcker oss i bakgrunden på
        // betydande förflyttning levereras platsen till DEN delegat som skapas vid start.
        GuardManager.shared.armAutoWake()
        // Kort #203: kategorin med knapparna måste vara registrerad INNAN en notis kan levereras,
        // och delegaten måste finnas när föraren trycker — även när trycket är det som startar appen.
        EfterResanNotis.shared.register()
        #if DEBUG
        // Fotostudion (S4 steg 4, DECISIONS #206), spegel av Androids fotostudio_facit: startargumentet
        // -fotostudio_facit (Xcode: Edit Scheme → Run → Arguments) slår på betatestet och lägger in en
        // påhittad kameravarning, så simulatorn visar knapparna under "Senast sagt" utan en körning.
        // Kompileras bort ur release-byggen.
        if CommandLine.arguments.contains("-fotostudio_facit") {
            Task { @MainActor in
                let p = Prefs.shared
                p.onboardingDone = true   // annars täcker introduktionen skärmen på en färsk simulator
                Platsdelning.shared.svara(ja: false)   // platsdelningens fråga likaså (#917)
                p.facitOn = true
                // Kort #203: en påhittad RESA, inte bara en varning — så att efter-resan-kortet syns
                // överst på Redo. utan en körning. Samma tidsstämplar i historiken och i "Senast sagt",
                // annars pekar de två på olika facitrader.
                let t0 = Date.now.addingTimeInterval(-1800)
                let t1 = Date.now.addingTimeInterval(-600)
                p.tripStart = t0
                p.history = [
                    AlertEntry(t: t0.addingTimeInterval(120), kind: "slippery_segment",
                               text: "Varning: halka rapporterad på vägen framför dig.", id: "seg:fotostudio"),
                    AlertEntry(t: t1, kind: "camera", text: "Fartkamera om 500 meter.", id: "cam:fotostudio"),
                ]
                p.lastSaidText = "Fartkamera om 500 meter."
                p.lastSaidAt = t1
                p.lastSaidId = "cam:fotostudio"
                // Redo efter tur (designen 01b): turen är slut, kvittot syns.
                p.lastTripEnd = Date.now.addingTimeInterval(-300)
                p.lastTripKm = 31
            }
        }
        #endif
    }

    var body: some Scene {
        WindowGroup {
            RootView()
            .tint(Brand.yellow)
            .preferredColorScheme(.dark)
            // S4: osända facitsvar går iväg när appen blir aktiv — bilen står stilla då. Räknarens kö likaså (#772).
            .onChange(of: scenePhase) { _, phase in
                if phase == .active { Task {
                    Raknare.notiser(await HeadsUpService.shared.status())   // #787: en gång per enhet och värde
                    _ = await FacitSender.flush(); await Raknare.flush()
                    Platsdelning.shared.uppdatera()   // #917: kommunen, bara efter ett ja och bara i TestFlight (#918)
                } }
            }
            // DECISIONS #36: introduktionen är det första man ser, en gång.
            // #772: räknas när föraren gick igenom den — inte när fotostudion hoppar över den (init ovan skriver fältet direkt).
            .fullScreenCover(isPresented: Binding(
                get: { !prefs.onboardingDone },
                set: { if !$0 { prefs.onboardingDone = true; Raknare.onboardingKlar() } }
            )) {
                OnboardingView()
            }
        }
    }
}
