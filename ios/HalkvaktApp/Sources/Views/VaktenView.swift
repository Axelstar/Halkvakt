// VAKTEN — hemskärmen, skinnet v3 (1b): ett ord, en knapp. "Redo." svarar på
// "är jag skyddad?" med en blick. Källchips under, Starta-knappen, senaste tur i en rad.
// När vakten kör visas KorlageView i helskärm.
import SwiftUI
import HalkvaktEngine

struct VaktenView: View {
    @State private var guardM = GuardManager.shared
    @State private var prefs = Prefs.shared

    var body: some View {
        ZStack {
            Brand.bg.ignoresSafeArea()
            VStack(alignment: .leading, spacing: 0) {
                BrandHeader(trailing: guardM.snapshotInfo == nil ? "Hämtar" : "Trafikverket live",
                            trailingColor: guardM.snapshotInfo == nil ? Brand.faint : Brand.green)

                Spacer()

                VStack(alignment: .leading, spacing: 18) {
                    Text("Redo.")
                        .font(Typo.sans(78, .bold))
                        .tracking(-3.5)
                        .lineSpacing(-8)
                        .foregroundStyle(Brand.text)
                    Text(subtitle)
                        .font(Typo.sans(15))
                        .lineSpacing(6)
                        .foregroundStyle(Brand.dim)
                    chips
                }
                .padding(.bottom, 20)

                Spacer()

                PillButton(title: "Starta vakten", icon: "play.fill", color: Brand.green) {
                    guardM.requestPermissionAndStart()
                }
                if guardM.locationDenied { LocationDeniedRow() }

                HStack {
                    Text(lastTrip)
                        .font(Typo.sans(13))
                        .foregroundStyle(Brand.faint)
                    Spacer()
                }
                .padding(.top, 16)
            }
            .padding(.horizontal, 22).padding(.top, 10)
            .padding(.bottom, 96)
        }
        .fullScreenCover(isPresented: $guardM.running) { KorlageView() }
        .task { await guardM.refreshSnapshot() }
    }

    private var subtitle: String {
        let n = [prefs.slippery, prefs.icing, prefs.accident, prefs.wildlife, prefs.camera].filter { $0 }.count
        let wake = prefs.autoWake && guardM.authStatus == .authorizedAlways
        return "\(n == 5 ? "Fem" : "\(n)") källor bevakade. Din position stannar i telefonen." +
               (wake ? " Vakten vaknar själv när du kör." : "")
    }

    private var chips: some View {
        // Flöde av chips; "KAMEROR AV" visar en avslagen källa utan att gnälla.
        let items: [(String, Bool)] = [("Halka", prefs.slippery), ("Vilt", prefs.wildlife),
                                       ("Olyckor", prefs.accident), ("Frysrisk", prefs.icing),
                                       (prefs.camera ? "Kameror" : "Kameror av", prefs.camera)]
        return FlowChips(items: items)
    }

    private var lastTrip: String {
        if let at = prefs.lastAutoWakeAt {
            let d = at.formatted(.dateTime.day().month(.abbreviated).hour().minute())
            return "Senaste tur · \(d)" + (prefs.lastAutoWakeMinutes > 0 ? ", \(prefs.lastAutoWakeMinutes) min, vaknade själv" : "")
        }
        if let t = prefs.lastSaidText { return "Senast sagt · ”\(t)”" }
        return "Ingen tur än."
    }
}

/// Enkel radbrytande chip-rad (två rader räcker för fem chips).
private struct FlowChips: View {
    let items: [(String, Bool)]
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) { ForEach(Array(items.prefix(4)), id: \.0) { Chip(text: $0.0, on: $0.1) } }
            HStack(spacing: 8) { ForEach(Array(items.dropFirst(4)), id: \.0) { Chip(text: $0.0, on: $0.1) } }
        }
    }
}

/// Farokort — används i körläget ("På din väg").
struct NearbyRow: View {
    let item: NearbyItem
    var body: some View {
        HStack(spacing: 14) {
            Text(Nearby.distText(item.distM))
                .font(Typo.mono(14, .semibold))
                .foregroundStyle(Brand.yellow)
                .frame(width: 64, alignment: .leading)
            VStack(alignment: .leading, spacing: 2) {
                Text(Prefs.shared.label(item.kind)).font(Typo.sans(15, .semibold)).foregroundStyle(Brand.text)
                if let s = item.secondary { Text(s).font(Typo.sans(12)).foregroundStyle(Brand.dim) }
            }
            Spacer()
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
        .background(Brand.raised, in: RoundedRectangle(cornerRadius: 14))
    }
}
