// FLIKEN FAVORITER (kort #357; DECISIONS #616, #625, #637, #817): brytaren, dagens resor i väntan på namn (Favoriter 2a: fältet är
// sparknappen, Släng för sig, taket synligt) och de sparade resorna, var och en med sitt läge (Nytt,
// Inget nytt, Lugnt; FAVORITER §2) och sin rapport (RapportView, steg 3b). Läget räknas om när fliken visas och när föraren drar
// nedåt. Ingen karta bakom linjen: ingen kartserver får veta var en resa går (#616, 6.2).
import SwiftUI
import CoreLocation
import HalkvaktEngine

struct FavoriterView: View {
    let synlig: Bool
    @State private var fav = Favoriter.shared
    @State private var rapporten = Rapporten.shared
    @State private var fragaTaBortAlla = false
    @State private var byterNamn: SparadRutt?
    @State private var nyttNamn = ""

    enum Sida: Hashable { case rapport(String) }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Favoriter").font(Typo.sans(32, .semibold)).tracking(-0.8).foregroundStyle(Brand.text)
                    Text("Vägar du kör ofta. Båda hållen räknas som en.").font(Typo.sans(15)).foregroundStyle(Brand.text2).padding(.top, 10)

                    RowPanel {
                        GreenToggleRow(title: "Erbjud att spara resor", sub: "Appen frågar efter resan", isOn: $fav.erbjud)
                    }
                    .padding(.top, 28)

                    if fav.erbjud && !fav.dagens.isEmpty {
                        MonoLabel(text: "Dagens resor · \(fav.dagens.count) att spara").padding(.top, 28).padding(.bottom, 10).padding(.horizontal, 4)
                        VStack(spacing: 10) {
                            ForEach(fav.dagens, id: \.id) { v in DagensRad(resa: v, full: fav.rutter.count >= Rutter.max) }
                        }
                    }

                    if fav.rutter.isEmpty {
                        Text(fav.erbjud
                             ? "Kör en resa, så frågar appen efteråt om du vill spara den."
                             : "Slå på, så frågar appen efter en resa om du vill spara vägen du körde. Högst fem resor.")
                            .font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2)
                            .padding(.top, 14).padding(.horizontal, 4)
                    } else {
                        MonoLabel(text: fav.rutter.count >= Rutter.max ? "\(Rutter.max) av \(Rutter.max) · listan är full"
                                                                       : "Dina resor · \(fav.rutter.count) av \(Rutter.max)")
                            .padding(.top, 28).padding(.bottom, 10).padding(.horizontal, 4)
                        RowPanel {
                            ForEach(Array(fav.rutter.enumerated()), id: \.element.id) { i, r in
                                rad(r, divider: i < fav.rutter.count - 1)
                            }
                        }
                        HStack {
                            Spacer()
                            MonoLink(title: "Ta bort alla") { fragaTaBortAlla = true }
                            Spacer()
                        }
                        .padding(.top, 12)
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        MonoLabel(text: "Bara i telefonen")
                        Text("Resorna sparas bara i telefonen och följer inte med i säkerhetskopian. De försvinner när du tar bort dem eller appen.")
                            .font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2)
                    }
                    .padding(.top, 24).padding(.horizontal, 4)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 24).padding(.top, 24).padding(.bottom, 150)
            }
            .scrollIndicators(.hidden)
            .background(Brand.bg)
            .refreshable { await rapporten.uppdatera() }
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: Sida.self) { sida in
                switch sida {
                case .rapport(let id): RapportView(ruttId: id)
                }
            }
            .confirmationDialog("Ta bort alla sparade resor?", isPresented: $fragaTaBortAlla, titleVisibility: .visible) {
                Button("Ta bort alla", role: .destructive) { fav.taBortAlla() }
                Button("Avbryt", role: .cancel) {}
            }
            .alert("Byt namn", isPresented: Binding(get: { byterNamn != nil }, set: { if !$0 { byterNamn = nil } })) {
                TextField("Namn", text: $nyttNamn)
                Button("Spara") { if let r = byterNamn { fav.bytNamn(id: r.id, till: nyttNamn) }; byterNamn = nil }
                Button("Avbryt", role: .cancel) { byterNamn = nil }
            }
        }
        // När fliken visas, och när en resa sparas eller tas bort medan den visas.
        .task(id: synlig ? fav.rutter.map(\.id) : []) {
            guard synlig else { return }
            fav.rensaGamla()
            await rapporten.uppdatera()
        }
    }

    private func rad(_ r: SparadRutt, divider: Bool) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                NavigationLink(value: Sida.rapport(r.id)) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(r.namn).font(Typo.sans(16, .medium)).foregroundStyle(Brand.text)
                        Text(Self.under(r)).font(Typo.mono(11)).tracking(1.1).foregroundStyle(Brand.dim)
                        RadLageText(lage: rapporten.radlage(r.id, koll: fav.kollar[r.id]), laddar: rapporten.laddar,
                                    gickInte: rapporten.gickInte)
                            .padding(.top, 3)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .contentShape(Rectangle())
                }
                .accessibilityHint("Öppnar rapporten för resan")
            }
            .padding(.top, 10)
            // Dämpade länkar (Gult bara för det som gör något, DECISIONS #817): Byt namn och Ta bort på samma ställe på varje rad.
            HStack(spacing: 18) {
                MonoLink(title: "Byt namn") { nyttNamn = r.namn; byterNamn = r }
                    .accessibilityLabel("Byt namn på \(r.namn)")
                MonoLink(title: "Ta bort") { fav.taBort(id: r.id) }
                    .accessibilityLabel("Ta bort \(r.namn)")
                Spacer()
            }
            .padding(.bottom, 4)
            if divider { DashedDivider() }
        }
    }

    /// "34 KM · SPARAD 18/10" — längden räknas ur punkterna i telefonen.
    private static func under(_ r: SparadRutt) -> String {
        var m = 0.0
        for (a, b) in zip(r.punkter, r.punkter.dropFirst()) {
            m += CLLocation(latitude: a[1], longitude: a[0]).distance(from: CLLocation(latitude: b[1], longitude: b[0]))
        }
        let km = m >= 10_000 ? String(format: "%.0f", m / 1000) : String(format: "%.1f", m / 1000).replacingOccurrences(of: ".", with: ",")
        let datum = (try? Date(r.sparad, strategy: .iso8601)).map { $0.formatted(.dateTime.day().month(.defaultDigits).locale(Locale(identifier: "sv_SE"))) } ?? ""
        return "\(km) KM · SPARAD \(datum)"
    }
}

/// Radens läge under namnet: Nytt med ett gult märke, Inget nytt med det största som pågår, eller Lugnt (FAVORITER §2).
private struct RadLageText: View {
    let lage: ResansRapport.Radlage?
    let laddar: Bool
    let gickInte: Bool
    var body: some View {
        switch lage {
        case .nytt(let antal, let viktigast):
            HStack(spacing: 8) {
                Text(antal == 1 ? "1 NY" : "\(antal) NYA").font(Typo.mono(10, .semibold)).tracking(1.2).foregroundStyle(Brand.onAmber)
                    .padding(.horizontal, 7).padding(.vertical, 3)
                    .background(Brand.yellow, in: Capsule())
                Text(ResansRapport.titel(viktigast.rubrik, vag: viktigast.vag)).font(Typo.sans(14)).foregroundStyle(Brand.yellow).lineLimit(2)
            }
        case .ingetNytt(let storst):
            Text("Inget nytt · \(ResansRapport.titel(storst.rubrik, vag: storst.vag))").font(Typo.sans(14)).foregroundStyle(Brand.text2).lineLimit(2)
        case .lugnt:
            Text("Lugnt · inget rapporterat längs vägen just nu").font(Typo.sans(14)).foregroundStyle(Brand.greenText)
        case nil:
            if laddar || gickInte {
                Text(laddar ? "Kollar läget …" : "Läget kunde inte hämtas").font(Typo.sans(14)).foregroundStyle(Brand.dim)
            }
        }
    }
}

/// En av dagens resor (Favoriter 2a, DECISIONS #817): fältet först, förslagen under det (de väljer namn, sparar inte), Spara och
/// Släng för sig. Är listan full står taket i raden i stället för Spara.
private struct DagensRad: View {
    let resa: Vantande
    let full: Bool
    @State private var fav = Favoriter.shared
    @State private var namn = ""
    @State private var gickInte = false
    @FocusState private var faltet: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(rubrik).font(Typo.mono(12, .medium)).tracking(0.6).foregroundStyle(Brand.text)
                Spacer()
                MonoLink(title: "Släng") { fav.slang(id: resa.id) }.accessibilityLabel("Släng resan")
            }
            if full {
                Text("Listan är full. Ta bort en resa nedan för att spara den här.")
                    .font(Typo.sans(14)).foregroundStyle(Brand.text2).fixedSize(horizontal: false, vertical: true)
            } else {
                HStack(spacing: 10) {
                    TextField("t.ex. Jobbet", text: $namn)
                        .font(Typo.sans(16)).foregroundStyle(Brand.text)
                        .focused($faltet).submitLabel(.done)
                        .onSubmit { spara() }
                    Button("Spara") { spara() }
                        .font(Typo.sans(15, .semibold)).foregroundStyle(Brand.yellow)
                }
                .padding(.horizontal, 14).frame(minHeight: 48)
                .background(Brand.raisedSolid, in: RoundedRectangle(cornerRadius: 12))
                HStack(spacing: 8) {
                    Text("Förslag:").font(Typo.sans(13)).foregroundStyle(Brand.dim)
                    ForEach(forslag, id: \.self) { f in
                        Button { namn = f } label: {
                            Text(f).font(Typo.sans(14, .medium)).foregroundStyle(Brand.text)
                                .padding(.horizontal, 12).frame(minHeight: 36)
                                .background(Brand.raisedSolid, in: Capsule())
                        }
                        .buttonStyle(PressScale())
                        .accessibilityHint("Väljer namnet, sparar inte")
                    }
                }
                Text(gickInte ? "Resan kunde inte sparas. Försök igen." : "Tomt namn sparar som \(Favoriter.datumnamn(resa)).")
                    .font(Typo.sans(12)).foregroundStyle(gickInte ? Brand.yellow : Brand.dim)
            }
        }
        .padding(16)
        .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
    }

    private var rubrik: String {
        let km = FavoritNotis.kmText(resa.km)
        return resa.dithem ? "\(km) · dit och hem" : "\(km) · slutade \(Date(timeIntervalSince1970: resa.slutS).klockslag)"
    }

    private var forslag: [String] {
        let c = Calendar.current.dateComponents([.day, .month], from: Date(timeIntervalSince1970: resa.slutS))
        return Array(Rutter.namnforslag(dag: c.day ?? 1, manad: c.month ?? 1).dropLast())   // datumet är det tomma fältets namn
    }

    private func spara() {
        switch fav.spara(id: resa.id, namn: namn) {
        case .sparad: gickInte = false
        case .fullt, .fel: gickInte = true
        }
    }
}
