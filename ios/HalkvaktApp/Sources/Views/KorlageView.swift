// KÖRLÄGET — skinnet v3 (1a): PÅ VAKT, tid · km stort, tre siffror, SENAST SAGT,
// PÅ DIN VÄG, avsluta lågt som kontur. Skärmen ligger i hållaren; ingenting ska läsas.
// Varningskortet (1b) tar hela skärmen i gult i 8 s och försvinner själv — ingen knapp.
import SwiftUI
import HalkvaktEngine

struct KorlageView: View {
    @State private var guardM = GuardManager.shared
    @State private var now = Date.now
    /// Granskningsläge: håll på "PÅ VAKT" ⇒ kortet med en låtsasvarning, utan röst.
    @State private var demoWarning: HalkvaktEngine.Alert?
    private let clock = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            Brand.bg.ignoresSafeArea()
            VStack(alignment: .leading, spacing: 16) {
                BrandHeader(trailing: "Vakten på", trailingColor: Brand.green)

                Panel {
                    VStack(alignment: .leading, spacing: 5) {
                        SectionHeader(text: "På vakt", color: Brand.greenText)
                            .frame(height: 28)
                            .contentShape(Rectangle())   // hela raden tryckbar, inte bara bokstäverna
                            .onLongPressGesture(minimumDuration: 0.5, maximumDistance: 30) {
                                demoWarning = HalkvaktEngine.Alert(t: 0, hazardId: "demo", kind: .slippery_segment,
                                    distanceM: 2000, text: "Halt väglag om två kilometer.")
                                Task { try? await Task.sleep(for: .seconds(8)); demoWarning = nil }
                            }
                        Text("\(elapsedMin) min · \(distKm) km")
                            .font(Typo.sans(34, .semibold)).tracking(-1)
                            .foregroundStyle(Brand.text)
                        Text("Rösten talar ungefär 30 sekunder före, som längst \(String(format: "%.1f", Prefs.shared.leadMaxM / 1000).replacingOccurrences(of: ".", with: ",")) km. En olycka längre fram kan nämnas tidigare.")
                            .font(Typo.sans(13)).foregroundStyle(Brand.dim)
                    }
                    HStack(spacing: 10) {
                        Stat(value: "\(guardM.alertCount)", label: "Varningar")
                        Stat(value: "\(count(.slippery_segment))", label: "Halka")
                        Stat(value: "\(count(.wildlife))", label: "Vilt")
                    }
                }

                if let said = guardM.lastSaid {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            SectionHeader(text: "Senast sagt")
                            // #250 (b): när repliken sades, inte klockan nu
                            Text((Prefs.shared.lastSaidAt ?? now).formatted(.dateTime.hour().minute())).font(Typo.mono(11)).foregroundStyle(Brand.faint)
                        }
                        Text("”\(said)”").font(Typo.sans(16)).italic().foregroundStyle(Brand.text)
                    }
                    .padding(.horizontal, 20).padding(.vertical, 16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Brand.yellow.opacity(0.08), in: RoundedRectangle(cornerRadius: 20))
                    .overlay(RoundedRectangle(cornerRadius: 20).stroke(Brand.yellow.opacity(0.3), lineWidth: 1))
                } else {
                    Panel(dashed: true) {
                        SectionHeader(text: "Tyst så länge", color: Brand.faint)
                        Text("Inget på din väg än. Du hör det direkt när något dyker upp.")
                            .font(Typo.sans(14)).foregroundStyle(Brand.dim)
                    }
                }

                VStack(alignment: .leading, spacing: 10) {
                    SectionHeader(text: "På din väg", color: Brand.dim)
                    ForEach(guardM.nearby.prefix(3)) { NearbyRow(item: $0) }
                }

                Spacer()

                OutlineButton(title: "Avsluta vakten") { guardM.stop() }
            }
            .padding(.horizontal, 20).padding(.top, 10).padding(.bottom, 18)

            if let w = guardM.currentWarning ?? demoWarning {
                WarningOverlayView(alert: w).transition(.opacity)
            }
        }
        .onReceive(clock) { now = $0 }
        .preferredColorScheme(.dark)
        .persistentSystemOverlays(.hidden)
    }

    private var elapsedMin: Int { Int(guardM.drivingSeconds / 60) }
    private var distKm: String { String(format: "%.0f", guardM.distanceKm) }
    private func count(_ k: HazardKind) -> Int { guardM.history.filter { $0.kind == k }.count }
}

private struct Stat: View {
    let value: String
    let label: String
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value).font(Typo.mono(22, .semibold)).foregroundStyle(Brand.text)
            Text(label).font(Typo.sans(11)).tracking(0.3).foregroundStyle(Brand.dim)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 14).padding(.vertical, 12)
        .background(Brand.raised, in: RoundedRectangle(cornerRadius: 14))
    }
}

/// Varningskortet (1b): helgult, ikon, typ stort, avstånd, repliken i kursiv. Ingen knapp —
/// GuardManager släcker det efter 8 s. Tunn stapel längst ner visar tiden som rinner.
struct WarningOverlayView: View {
    let alert: HalkvaktEngine.Alert
    @State private var progress = 0.0

    var body: some View {
        ZStack {
            Brand.amber.ignoresSafeArea()
            VStack(alignment: .leading, spacing: 22) {
                HStack {
                    Text("HALKVAKT VARNAR").font(Typo.mono(12)).tracking(2.4)
                    Spacer()
                    Text(Date.now.formatted(.dateTime.hour().minute())).font(Typo.mono(12))
                }
                .foregroundStyle(Brand.onAmber.opacity(0.6))

                Image(systemName: "triangle.fill").font(.system(size: 44)).foregroundStyle(Brand.onAmber)

                // Ikonen intill namnet — aldrig i triangelns plats (designens notering).
                HStack(alignment: .top, spacing: 14) {
                    HazardIcon(kind: alert.kind, size: 48).foregroundStyle(Brand.onAmber).padding(.top, 10)
                    Text(Prefs.shared.label(alert.kind))
                        .font(Typo.sans(64, .bold)).tracking(-2.5).lineSpacing(-6)
                        .foregroundStyle(Brand.onAmber)
                        .fixedSize(horizontal: false, vertical: true)
                }

                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text("\(alert.distanceM)").font(Typo.mono(44, .semibold))
                    Text("meter").font(Typo.sans(22))
                }
                .foregroundStyle(Brand.onAmber)

                Spacer()

                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "waveform").font(.system(size: 16))
                    Text("”\(alert.text)”").font(Typo.sans(16)).italic().lineSpacing(4)
                }
                .foregroundStyle(Brand.onAmber.opacity(0.78))

                GeometryReader { g in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Brand.onAmber.opacity(0.18))
                        Capsule().fill(Brand.onAmber).frame(width: g.size.width * progress)
                    }
                }
                .frame(height: 5)
            }
            .padding(.horizontal, 24).padding(.top, 18).padding(.bottom, 24)
        }
        .onAppear { withAnimation(.linear(duration: 8)) { progress = 1 } }
    }
}
