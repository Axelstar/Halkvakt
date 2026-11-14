// EN PLANERAD RESA FÖRE START (kort #659, DECISIONS #870): vägen på Apples karta, rapporten längs den, en påminnelse före
// avresan och Starta vakten. Rapporten är samma som för en sparad resa (RapportInnehall), utan förra kollen.
import SwiftUI
import MapKit
import HalkvaktEngine

struct PlaneradResaView: View {
    @State private var plan = Resplan.shared
    @State private var rapport: Rapporten.Planerad?
    @State private var gickInte = false
    @State private var paminn = false
    @State private var avresa = Date.now.addingTimeInterval(3600)
    @State private var notisFel = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Button { dismiss() } label: {
                    Text("← TILLBAKA").font(Typo.mono(11)).tracking(1.5).foregroundStyle(Brand.text).frame(height: 44)
                }
                if let p = plan.plan {
                    Text("Till \(p.mal)").font(Typo.sans(32, .semibold)).tracking(-0.8).foregroundStyle(Brand.text).padding(.top, 8)
                        .accessibilityAddTraits(.isHeader)

                    VStack(spacing: 0) {
                        ResansKarta(punkter: p.punkter)
                        HStack {
                            MonoLabel(text: Self.kmText(p.km))
                            Spacer()
                            MonoLabel(text: p.avresa == nil ? "Resan sparas inte" : "Avresa \(p.avresa?.dagOchKlockslag ?? "")")
                        }
                        .padding(.horizontal, 20).padding(.vertical, 14)
                    }
                    .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
                    .clipShape(RoundedRectangle(cornerRadius: 18))
                    .padding(.top, 18)

                    if let rapport {
                        RapportInnehall(rader: rapport.rader, kandidat: rapport.kandidat, fore: nil, kollat: rapport.kollat,
                                        lagesfil: rapport.lagesfil, rapportfil: rapport.rapportfil,
                                        gammaltVaglag: rapport.gammaltVaglag, gamlaOlyckor: rapport.gamlaOlyckor)
                    } else {
                        Text(gickInte ? "Läget kunde inte hämtas. Dra nedåt för att försöka igen." : "Kollar läget …")
                            .font(Typo.sans(15)).foregroundStyle(Brand.text2).padding(.top, 28)
                    }

                    MonoLabel(text: "När åker du?").padding(.top, 24).padding(.bottom, 10).padding(.horizontal, 4)
                    RowPanel {
                        GreenToggleRow(title: "Påminn mig före avresan", sub: "En notis en kvart innan", isOn: $paminn)
                        if paminn {
                            DashedDivider()
                            DatePicker("Avresa", selection: $avresa, in: Date.now..., displayedComponents: [.date, .hourAndMinute])
                                .font(Typo.sans(16, .medium)).foregroundStyle(Brand.text)
                                .tint(Brand.green)
                                .environment(\.locale, Locale(identifier: "sv_SE"))
                                .padding(.vertical, 10)
                        }
                    }
                    Text(notisFel
                         ? "Påminnelsen kunde inte sättas. Kontrollera att notiserna är på och att tiden ligger minst en kvart fram."
                         : "Notisen säger inte vad som finns längs vägen. Den öppnar Halkvakt, där läget hämtas färskt.")
                        .font(Typo.sans(14)).lineSpacing(3).foregroundStyle(notisFel ? Brand.yellow : Brand.dim)
                        .padding(.top, 14).padding(.horizontal, 4)

                    HStack {
                        Spacer()
                        YellowPill(title: "Starta vakten", playIcon: true) { GuardManager.shared.requestPermissionAndStart() }
                        Spacer()
                    }
                    .padding(.top, 32)
                    if p.avresa != nil {
                        MonoLink(title: "Ta bort resan") { plan.rensa(); dismiss() }
                            .frame(maxWidth: .infinity).padding(.top, 6)
                    }
                } else {
                    Text("Ingen resa är planerad.").font(Typo.sans(15)).foregroundStyle(Brand.text2).padding(.top, 28)
                }
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 24).padding(.top, 8).padding(.bottom, 150)
        }
        .scrollIndicators(.hidden)
        .background(Brand.bg)
        .toolbar(.hidden, for: .navigationBar)
        .refreshable { await hamta() }
        .task {
            if let t = plan.plan?.avresa, t > .now {
                avresa = t
                paminn = true
            }
            await hamta()
        }
        .onChange(of: paminn) { _, _ in Task { await sattAvresa() } }
        .onChange(of: avresa) { _, _ in Task { await sattAvresa() } }
    }

    private func hamta() async {
        guard let p = plan.plan else { return }
        let ny = await Rapporten.shared.planerad(p.punkter)
        if let ny { rapport = ny }
        gickInte = ny == nil
    }

    private func sattAvresa() async {
        let ok = await plan.sattAvresa(paminn ? avresa : nil)
        notisFel = paminn && !ok
    }

    private static func kmText(_ km: Double) -> String {
        km < 10 ? String(format: "%.1f km", km).replacingOccurrences(of: ".", with: ",") : String(format: "%.0f km", km)
    }
}

/// Vägen som en gul linje på Apples karta. Kartan går inte att flytta.
private struct ResansKarta: View {
    let punkter: [[Double]]

    var body: some View {
        let koord = punkter.map { CLLocationCoordinate2D(latitude: $0[1], longitude: $0[0]) }
        let ram = MKPolyline(coordinates: koord, count: koord.count).boundingMapRect
        Map(initialPosition: .rect(ram.insetBy(dx: -ram.size.width * 0.15, dy: -ram.size.height * 0.15)), interactionModes: []) {
            MapPolyline(coordinates: koord).stroke(Brand.yellow, lineWidth: 4)
        }
        .mapStyle(.standard(elevation: .flat, pointsOfInterest: .excludingAll))
        .frame(height: 160)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Karta över vägen")
    }
}
