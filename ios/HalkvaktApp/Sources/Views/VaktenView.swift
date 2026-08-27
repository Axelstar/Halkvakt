// VAKTEN — levande hemskärm: status, startpill, I NÄRHETEN. Körläget och
// varningskortet ligger som fullskärmslager ovanpå, precis som i Android.
import SwiftUI
import HalkvaktEngine

struct VaktenView: View {
    @State private var guardM = GuardManager.shared

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Panel {
                    SectionHeader(text: "Status")
                    Text(guardM.running ? "Vakten kör" : "Redo att köra")
                        .font(.system(size: 30, weight: .heavy))
                        .foregroundStyle(Brand.text)
                    Text(guardM.running
                         ? "Lyssnar på vägen framför dig."
                         : "Vakten lyssnar på vägen framför dig så fort du startar.")
                        .foregroundStyle(Brand.dim)
                    PillButton(title: guardM.running ? "Stoppa vakten" : "Starta vakten",
                               icon: guardM.running ? "stop.fill" : "play.fill",
                               color: guardM.running ? Brand.yellow : Brand.green) {
                        guardM.running ? guardM.stop() : guardM.requestPermissionAndStart()
                    }
                }

                HStack {
                    SectionHeader(text: "I närheten")
                    if let info = guardM.snapshotInfo {
                        Text(info.components(separatedBy: " · ").last ?? "")
                            .font(.system(size: 12))
                            .foregroundStyle(Brand.faint)
                    }
                }
                if guardM.nearby.isEmpty {
                    Text("Ger dig läget omkring dig så fort platsen är på — tryck start en första gång.")
                        .foregroundStyle(Brand.dim)
                } else {
                    VStack(spacing: 10) {
                        ForEach(guardM.nearby) { item in
                            NearbyRow(item: item)
                        }
                    }
                }
            }
            .padding(18)
        }
        .background(Brand.bg)
        .fullScreenCover(isPresented: $guardM.running) {
            KorlageView()
        }
        .task {
            await guardM.refreshSnapshot()
        }
    }
}

struct NearbyRow: View {
    let item: NearbyItem
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(Brand.yellow)
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text(Prefs.shared.label(item.kind)).foregroundStyle(Brand.text).bold()
                if let s = item.secondary {
                    Text(s).font(.system(size: 13)).foregroundStyle(Brand.dim)
                }
            }
            Spacer()
            Text(Nearby.distText(item.distM))
                .font(.system(size: 14, weight: .semibold, design: .monospaced))
                .foregroundStyle(Brand.dim)
        }
        .padding(12)
        .background(Brand.panel, in: RoundedRectangle(cornerRadius: 12))
    }

    private var icon: String {
        switch item.kind {
        case .accident: "exclamationmark.triangle.fill"
        case .slippery_segment: "snowflake"
        case .icing_point: "thermometer.snowflake"
        case .wildlife: "hare.fill"
        case .camera: "camera.fill"
        }
    }
}
