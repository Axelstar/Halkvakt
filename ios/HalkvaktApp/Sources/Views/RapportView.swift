// RAPPORTEN FÖR EN SPARAD RESA (favoriterna steg 3b, kort #357; FAVORITER §3, DECISIONS #636, #637) — det föraren läser innan
// bilen startar. Dit och Hem är samma sparade väg; Hem är den vända, så farorna kommer i körordning och köerna gäller förarens håll.
// Överst när läget är från, sedan det nya sedan förra kollen, allt längs vägen i viktordning, det tomma på en rad, prognosens plats
// och vakten. Inga avstånd på raderna: en station ligger vid en plats och får aldrig ett avstånd som mätningen inte bär.
import SwiftUI
import HalkvaktEngine

struct RapportView: View {
    let ruttId: String
    @State private var fav = Favoriter.shared
    @State private var rapporten = Rapporten.shared
    @State private var hem = false
    @State private var fore: Favoriter.Koll?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Button { dismiss() } label: {
                    Text("← FAVORITER").font(Typo.mono(11)).tracking(1.5).foregroundStyle(Brand.text).frame(height: 44)
                }
                if let rutt = fav.rutter.first(where: { $0.id == ruttId }) {
                    Text(rutt.namn).font(Typo.sans(32, .semibold)).tracking(-0.8).foregroundStyle(Brand.text).padding(.top, 8)
                    RiktningsVal(hem: $hem).padding(.top, 18)
                    if let resa = rapporten.resor[ruttId] {
                        RapportInnehall(rader: hem ? resa.hem : resa.dit, fore: fore, kollat: rapporten.kollat,
                                        lagesfil: rapporten.lagesfil, gammaltVaglag: rapporten.gammaltVaglag,
                                        gamlaOlyckor: rapporten.gamlaOlyckor)
                    } else {
                        Text(rapporten.gickInte ? "Läget kunde inte hämtas. Dra nedåt för att försöka igen." : "Kollar läget …")
                            .font(Typo.sans(15)).foregroundStyle(Brand.text2).padding(.top, 28)
                    }
                    HStack {
                        Spacer()
                        YellowPill(title: "Starta vakten", playIcon: true, action: startaVakten)
                        Spacer()
                    }
                    .padding(.top, 32)
                }
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 24).padding(.top, 8).padding(.bottom, 150)
        }
        .scrollIndicators(.hidden)
        .background(Brand.bg)
        .toolbar(.hidden, for: .navigationBar)
        .refreshable { await uppdatera() }
        .task {
            fore = fav.kollar[ruttId]   // före den här kollen: grunden för Nytt
            await uppdatera()
        }
    }

    /// Hämtar om, och det som nu visas åt båda hållen blir förra kollen till nästa gång.
    private func uppdatera() async {
        await rapporten.uppdatera()
        if rapporten.resor[ruttId] != nil { fav.kollad(rutt: ruttId, ids: rapporten.ids(ruttId)) }
    }

    private func startaVakten() { GuardManager.shared.requestPermissionAndStart() }
}

/// Dit eller Hem — samma väg, åt två håll.
private struct RiktningsVal: View {
    @Binding var hem: Bool
    var body: some View {
        HStack(spacing: 4) {
            knapp("Dit", vald: !hem) { hem = false }
            knapp("Hem", vald: hem) { hem = true }
        }
        .padding(4)
        .background(Brand.panel, in: Capsule())
    }

    private func knapp(_ titel: String, vald: Bool, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(titel).font(Typo.sans(15, .semibold)).foregroundStyle(vald ? Brand.text : Brand.dim)
                .padding(.horizontal, 22).frame(minHeight: 40)
                .background(vald ? Brand.raisedSolid : .clear, in: Capsule())
        }
        .accessibilityAddTraits(vald ? .isSelected : [])
    }
}

private struct RapportInnehall: View {
    let rader: [RapportRad]
    let fore: Favoriter.Koll?
    let kollat: Date?
    let lagesfil: Date?
    let gammaltVaglag: Bool
    let gamlaOlyckor: Bool

    var body: some View {
        let nya = Rapporten.nytt(rader, koll: fore)
        let nyaIds = Set(nya.map(\.id))
        let ovriga = rader.filter { !nyaIds.contains($0.id) }
        let perId = Dictionary(rader.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        VStack(alignment: .leading, spacing: 0) {
            MonoLabel(text: "Just nu · kollat \(kollat?.klockslag ?? "–")").padding(.top, 28).padding(.bottom, 10).padding(.horizontal, 4)
            VStack(alignment: .leading, spacing: 6) {
                Text("Läget från \(lagesfil?.klockslag ?? "okänd tid")").font(Typo.sans(17, .semibold)).foregroundStyle(Brand.text)
                Text("Läget kan ändras under resan, och då säger rösten till.").font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2)
                if gammaltVaglag {
                    Text("Väglaget är äldre än 45 minuter och visas inte som läget just nu.").font(Typo.sans(14)).foregroundStyle(Brand.yellow)
                }
                if gamlaOlyckor {
                    Text("Olyckorna är äldre än två timmar och visas inte som läget just nu.").font(Typo.sans(14)).foregroundStyle(Brand.yellow)
                }
            }
            .padding(20).frame(maxWidth: .infinity, alignment: .leading)
            .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))

            if let fore, !nya.isEmpty {
                MonoLabel(text: "Nytt sedan \(Self.sedan(fore.tid))", color: Brand.yellow).padding(.top, 24).padding(.bottom, 10).padding(.horizontal, 4)
                RowPanel {
                    ForEach(Array(nya.enumerated()), id: \.element.id) { i, r in
                        RapportRadVy(titel: Rapporten.titel(r.rubrik, vag: r.vag), text: r.text, gul: true, divider: i < nya.count - 1)
                    }
                }
            }

            MonoLabel(text: "Längs vägen just nu").padding(.top, 24).padding(.bottom, 10).padding(.horizontal, 4)
            let grupper = ResansRapport.grupperade(ovriga)
            if grupper.isEmpty {
                Text(nya.isEmpty ? "Inget rapporterat längs rutten just nu." : "Inget mer längs rutten just nu.")
                    .font(Typo.sans(15)).foregroundStyle(Brand.text2).padding(.horizontal, 4)
            } else {
                RowPanel {
                    ForEach(Array(grupper.enumerated()), id: \.element.id) { i, g in
                        let ensam = g.antal == 1 && !g.id.hasPrefix("grupp:")
                        RapportRadVy(titel: ensam ? Rapporten.titel(g.rubrik, vag: perId[g.id]?.vag) : g.rubrik, text: g.text,
                                     divider: i < grupper.count - 1)
                    }
                }
            }

            if let tomt = tomtRad() {
                Text(tomt).font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.dim).padding(.top, 14).padding(.horizontal, 4)
            }

            VStack(alignment: .leading, spacing: 6) {
                MonoLabel(text: "Prognosen · kommer senare")
                Text("Prognosen längs vägen visas här tidigast efter domen i mars.").font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2)
            }
            .padding(.top, 24).padding(.horizontal, 4)
        }
    }

    /// "Inget rapporterat: vilt, färjor och SMHI-varningar. Köer mäts inte längs den här vägen." Slag som åldersgränsen dolt
    /// står inte med: där vet appen inte att det är tomt.
    private func tomtRad() -> String? {
        let t = ResansRapport.tomma(rader)
        let namn = t.inget.filter { s in
            !(gammaltVaglag && (s == .halka || s == .frysrisk)) && !(gamlaOlyckor && (s == .olycka || s == .vilt))
        }.compactMap { ResansRapport.namn[$0] }
        var ut = ""
        if let sista = namn.last {
            ut = "Inget rapporterat: " + (namn.count == 1 ? sista : namn.dropLast().joined(separator: ", ") + " och " + sista) + "."
        }
        if t.koerMatsInte { ut += (ut.isEmpty ? "" : " ") + "Köer mäts inte längs den här vägen." }
        return ut.isEmpty ? nil : ut
    }

    /// "16:20" i dag, "i går 16:20", annars "17 okt. 16:20".
    private static func sedan(_ t: Date) -> String {
        if Calendar.current.isDateInToday(t) { return t.klockslag }
        if Calendar.current.isDateInYesterday(t) { return "i går \(t.klockslag)" }
        return t.dagOchKlockslag
    }
}

private struct RapportRadVy: View {
    let titel: String
    let text: String
    var gul = false
    let divider: Bool
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 4) {
                Text(titel).font(Typo.sans(16, .medium)).foregroundStyle(gul ? Brand.yellow : Brand.text)
                if !text.isEmpty { Text(text).font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2) }
            }
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityElement(children: .combine)
            if divider { DashedDivider() }
        }
    }
}
