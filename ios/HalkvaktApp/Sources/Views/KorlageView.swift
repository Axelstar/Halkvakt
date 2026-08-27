// KÖRLÄGET — passageraren är vaken. Stor status, sessionens siffror,
// PÅ DIN VÄG-listan, avsluta lågt. Varningskortet tar hela skärmen i 8 s.
import SwiftUI
import HalkvaktEngine

struct KorlageView: View {
    @State private var guardM = GuardManager.shared
    @State private var now = Date.now
    private let clock = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            Brand.bg.ignoresSafeArea()
            VStack(spacing: 22) {
                SectionHeader(text: "Passageraren är vaken")
                    .frame(maxWidth: .infinity, alignment: .center)
                    .multilineTextAlignment(.center)

                HStack(spacing: 14) {
                    Stat(value: elapsed, label: "TID")
                    Stat(value: String(format: "%.1f", guardM.distanceKm).replacingOccurrences(of: ".", with: ","), label: "KM")
                    Stat(value: "\(guardM.alertCount)", label: "VARNINGAR")
                }

                if let said = guardM.lastSaid {
                    Panel {
                        SectionHeader(text: "Senast sagt")
                        Text("”\(said)”").foregroundStyle(Brand.text).italic()
                    }
                }

                VStack(alignment: .leading, spacing: 10) {
                    SectionHeader(text: "På din väg")
                    if guardM.nearby.isEmpty {
                        Text("Fri väg så långt datat ser.").foregroundStyle(Brand.dim)
                    } else {
                        ForEach(guardM.nearby.prefix(4)) { NearbyRow(item: $0) }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                Spacer()

                Button("Avsluta körningen") { guardM.stop() }
                    .foregroundStyle(Brand.faint)
                    .padding(.bottom, 8)
            }
            .padding(20)

            if let w = guardM.currentWarning {
                WarningOverlayView(alert: w) { guardM.currentWarning = nil }
                    .transition(.opacity)
            }
        }
        .onReceive(clock) { now = $0 }
        .preferredColorScheme(.dark)
        .persistentSystemOverlays(.hidden)
    }

    private var elapsed: String {
        guard let s = guardM.startedAt else { return "0:00" }
        let sec = Int(now.timeIntervalSince(s))
        return String(format: "%d:%02d", sec / 60, sec % 60)
    }
}

private struct Stat: View {
    let value: String
    let label: String
    var body: some View {
        VStack(spacing: 4) {
            Text(value).font(.system(size: 26, weight: .heavy, design: .monospaced))
                .foregroundStyle(Brand.text)
            Text(label).font(.system(size: 10, weight: .bold, design: .monospaced))
                .tracking(2).foregroundStyle(Brand.faint)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(Brand.panel, in: RoundedRectangle(cornerRadius: 14))
    }
}

struct WarningOverlayView: View {
    let alert: HalkvaktEngine.Alert
    let dismiss: () -> Void

    var body: some View {
        ZStack {
            Brand.amber.ignoresSafeArea()
            VStack(spacing: 24) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 64))
                Text(alert.text)
                    .font(.system(size: 30, weight: .heavy))
                    .multilineTextAlignment(.center)
                Text("\(alert.distanceM) m")
                    .font(.system(size: 18, weight: .bold, design: .monospaced))
                Button(action: dismiss) {
                    Text("Uppfattat")
                        .font(.system(size: 18, weight: .bold))
                        .padding(.horizontal, 40).padding(.vertical, 14)
                        .background(Color.black.opacity(0.85), in: Capsule())
                        .foregroundStyle(Brand.amber)
                }
            }
            .foregroundStyle(Color.black)
            .padding(28)
        }
    }
}
