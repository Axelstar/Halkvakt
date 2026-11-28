// RESANS STRÄCKOR PÅ SKÄRMEN (DECISIONS #930, Förslag A #933): sträckorna i den ordning föraren kör, en per större ort. Etiketten
// är antalet ställen med halka, i gult; stapeln är grå som vägen på kartan. Ett tryck öppnar sträckan och visar det rapporten
// har där, också vägarbeten, hinder och fartkameror. Alla börjar stängda (Axel 20/11, DECISIONS #931). Indelningen och texterna
// räknas i motorn (Resstrackor).
import SwiftUI
import HalkvaktEngine

struct ResansStrackor: View {
    let strackor: [Resstracka]
    let mal: String
    let totalM: Int
    let restidS: Double?
    let avresa: Date
    @State private var oppen: Int?

    /// En rad på skärmen: en sträcka, eller flera lugna sträckor i följd (DECISIONS #983).
    private struct Del: Identifiable {
        let forsta: Int
        var sista: Int
        var id: Int { forsta }
    }

    /// Lugna sträckor i följd slås ihop till en rad. En ensam lugn sträcka går att öppna som de andra.
    private var delar: [Del] {
        var ut: [Del] = []
        for i in strackor.indices {
            if strackor[i].lage == .lugnt, let senast = ut.last, strackor[senast.sista].lage == .lugnt {
                ut[ut.count - 1].sista = i
            } else {
                ut.append(Del(forsta: i, sista: i))
            }
        }
        return ut
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(delar) { del in
                let i = del.forsta
                let s = strackor[i]
                plats(s.fran ?? "Start", m: s.franM, fylld: false)
                HStack(alignment: .top, spacing: 12) {
                    Stapel().frame(width: 20)
                    if del.sista > del.forsta {
                        Text("Lugnt i \(Int((Double(strackor[del.sista].tillM - s.franM) / 1000).rounded())) km. Inget halt rapporterat.")
                            .font(Typo.sans(13)).lineSpacing(2).foregroundStyle(Brand.text2)
                            .frame(maxWidth: .infinity, minHeight: 36, alignment: .leading)
                            .padding(.top, 4).padding(.bottom, 8)
                    } else {
                        VStack(alignment: .leading, spacing: 0) {
                            Button { oppen = oppen == i ? nil : i } label: { rubrik(s, oppen: oppen == i) }
                                .buttonStyle(.plain)
                                .accessibilityHint(oppen == i ? "Döljer det som finns på sträckan" : "Visar det som finns på sträckan")
                            if oppen == i { detaljer(s) }
                        }
                        .padding(.top, 4).padding(.bottom, 8)
                    }
                }
            }
            plats(mal, m: totalM, fylld: true)
        }
    }

    /// Raden för en plats: ringen, namnet och hur långt in på resan den ligger, med klocktiden när restiden är känd.
    private func plats(_ namn: String, m: Int, fylld: Bool) -> some View {
        HStack(spacing: 12) {
            Circle().fill(fylld ? Brand.text : Brand.panel).overlay { Circle().stroke(Brand.text, lineWidth: 2) }
                .frame(width: 10, height: 10).frame(width: 20)
            Text(namn).font(Typo.sans(15, .medium)).foregroundStyle(Brand.text).lineLimit(1)
            Spacer(minLength: 8)
            MonoLabel(text: marke(m), size: 11)
        }
        .frame(minHeight: 28)
        .accessibilityElement(children: .combine)
    }

    private func marke(_ m: Int) -> String {
        let km = "\(Int((Double(m) / 1000).rounded())) km"
        guard let t = Resstrackor.tidVid(m, totalM: totalM, restidS: restidS, avresa: avresa) else { return km }
        return "\(km) · ca \(t.klockslag)"
    }

    private func rubrik(_ s: Resstracka, oppen: Bool) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                Text(Resstrackor.rubrik(s)).font(Typo.sans(16, .medium)).foregroundStyle(Brand.text)
                Spacer(minLength: 8)
                Text("\(Resstrackor.tagg(s)) \(oppen ? "−" : "+")").font(Typo.mono(11, .semibold)).tracking(1.5)
                    .foregroundStyle(s.lage == .halt ? Brand.yellow : s.lage == .frysrisk ? Brand.text : Brand.dim)
            }
            Text(Resstrackor.under(s)).font(Typo.sans(13)).lineSpacing(2).foregroundStyle(Brand.text2)
                .multilineTextAlignment(.leading)
        }
        .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
        .contentShape(Rectangle())
    }

    private func detaljer(_ s: Resstracka) -> some View {
        let perId = Dictionary(s.rader.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        // Restidssträckorna är mätpunkter och inga händelser (DECISIONS #983): de visas inte.
        let grupper = ResansRapport.grupperade(s.rader.filter { $0.slag != .restid }).sorted { $0.langsM < $1.langsM }
        return VStack(alignment: .leading, spacing: 0) {
            ForEach(grupper, id: \.id) { g in
                DashedDivider()
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    MonoLabel(text: Self.etikett[g.slag] ?? g.slag.rawValue).frame(width: 82, alignment: .leading)
                    Text(Self.varde(g, vag: perId[g.id]?.vag)).font(Typo.sans(13)).lineSpacing(2).foregroundStyle(Brand.text)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(.vertical, 11)
                .accessibilityElement(children: .combine)
            }
        }
        .padding(.bottom, 6)
    }

    private static let etikett: [RapportSlag: String] = [.halka: "Halka", .frysrisk: "Frysrisk", .olycka: "Olycka", .hinder: "Hinder",
        .vilt: "Vilt", .ko: "Kö", .restid: "Restid", .vagarbete: "Vägarbete", .hastighet: "Hastighet", .omledning: "Omledning",
        .farja: "Färja", .kamera: "Kameror", .smhi: "SMHI"]

    /// Rapportens rubrik och text på en rad: "Halt väglag på E4: fläckvis is". Halkans ord skrivs som vanlig svenska.
    private static func varde(_ g: RapportGrupp, vag: String?) -> String {
        let ensam = g.antal == 1 && !g.id.hasPrefix("grupp:")
        let rubrik = ensam ? ResansRapport.titel(g.rubrik, vag: vag) : g.rubrik
        let text = g.slag == .halka && ensam ? Resstrackor.rentVaglag(g.text) : g.text
        guard let forsta = text.first else { return rubrik }
        return forsta.isLowercase || forsta.isNumber ? "\(rubrik): \(text)" : "\(rubrik). \(text)"
    }
}

/// Strecket till vänster om en sträcka: grått, som vägen på kartan.
private struct Stapel: View {
    var body: some View {
        GeometryReader { geo in
            Path { p in
                p.move(to: CGPoint(x: geo.size.width / 2, y: 2))
                p.addLine(to: CGPoint(x: geo.size.width / 2, y: geo.size.height - 2))
            }
            .stroke(Brand.dim, lineWidth: 4)
        }
        .accessibilityHidden(true)
    }
}
