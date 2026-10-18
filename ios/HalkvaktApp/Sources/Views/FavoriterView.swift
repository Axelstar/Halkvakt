// FLIKEN FAVORITER, steg 2 (kort #357; DECISIONS #616, #625): brytaren och de sparade resorna. Steg 3 lägger till lägena
// (Nytt, Inget nytt, Lugnt) och rapporten. Ingen karta bakom linjen: ingen kartserver får veta var en resa går (#616, 6.2).
import SwiftUI
import CoreLocation
import HalkvaktEngine

struct FavoriterView: View {
    @State private var fav = Favoriter.shared
    @State private var fragaTaBortAlla = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text("Favoriter").font(Typo.sans(32, .semibold)).tracking(-0.8).foregroundStyle(Brand.text)
                Text("Vägar du kör ofta, sparade efter en resa.").font(Typo.sans(15)).foregroundStyle(Brand.text2).padding(.top, 10)

                RowPanel {
                    GreenToggleRow(title: "Erbjud att spara resor", sub: "Appen frågar efter resan", isOn: $fav.erbjud)
                }
                .padding(.top, 28)

                if fav.rutter.isEmpty {
                    Text(fav.erbjud
                         ? "Kör en resa, så frågar appen efteråt om du vill spara den."
                         : "Slå på, så frågar appen efter en resa om du vill spara vägen du körde. Högst fem resor.")
                        .font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2)
                        .padding(.top, 14).padding(.horizontal, 4)
                } else {
                    MonoLabel(text: "Dina resor · \(fav.rutter.count) av \(Rutter.max)").padding(.top, 28).padding(.bottom, 10).padding(.horizontal, 4)
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
        .confirmationDialog("Ta bort alla sparade resor?", isPresented: $fragaTaBortAlla, titleVisibility: .visible) {
            Button("Ta bort alla", role: .destructive) { fav.taBortAlla() }
            Button("Avbryt", role: .cancel) {}
        }
    }

    private func rad(_ r: SparadRutt, divider: Bool) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(r.namn).font(Typo.sans(16, .medium)).foregroundStyle(Brand.text)
                    Text(Self.under(r)).font(Typo.mono(11)).tracking(1.1).foregroundStyle(Brand.dim)
                }
                Spacer()
                Button("Ta bort") { fav.taBort(id: r.id) }
                    .font(Typo.sans(14, .medium)).foregroundStyle(Brand.text2)
                    .frame(minHeight: 44)
                    .accessibilityLabel("Ta bort \(r.namn)")
            }
            .padding(.vertical, 10)
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
