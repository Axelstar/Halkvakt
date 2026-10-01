// VAKTEN — hemskärmen, skinnet v3 (1b): ett ord, en knapp. "Redo." svarar på
// "är jag skyddad?" med en blick. Källchips under, Starta-knappen, senaste tur i en rad.
// När vakten kör visas KorlageView i helskärm.
//
// Skärmen RULLAR när den måste (kort #279, Axels skärmbild 1/10): kortet *Efter resan* med fyra varningar
// var högre än skärmen, och en VStack utan ScrollView svarade med att trycka ihop allt — rubriken och
// tystnadsraden klipptes till "…", kortets topp låg under statusraden och facitraden under tabraden.
// `frame(minHeight:)` ger Spacer-arna skärmhöjden när innehållet är kort, så "Redo." står där det stod.
import SwiftUI
import HalkvaktEngine

struct VaktenView: View {
    @State private var guardM = GuardManager.shared
    @State private var prefs = Prefs.shared

    var body: some View {
        ZStack {
            Brand.bg.ignoresSafeArea()
            GeometryReader { geo in
                ScrollView {
                    innehall
                        .padding(.horizontal, 22).padding(.top, 10)
                        .padding(.bottom, 96)
                        .frame(minHeight: geo.size.height, alignment: .top)
                }
                .scrollBounceBehavior(.basedOnSize)
                .scrollIndicators(.hidden)
            }
        }
        .fullScreenCover(isPresented: $guardM.running) { KorlageView() }
        .task { await guardM.refreshSnapshot() }
    }

    private var innehall: some View {
        let resa = efterResan
        return VStack(alignment: .leading, spacing: 0) {
            BrandHeader(trailing: guardM.snapshotInfo == nil ? "Hämtar" : "Trafikverket live",
                        trailingColor: guardM.snapshotInfo == nil ? Brand.faint : Brand.green)

            // Kort #203: frågan om resan står överst, före allt annat — den som öppnar appen efter
            // en körning ska se den utan att leta. Försvinner när allt är besvarat, och efter ett dygn.
            if let resa {
                EfterResanKort(varningar: resa.obes, missar: prefs.missar.filter { $0.t >= resa.sedan }, sedan: resa.sedan)
                    .padding(.top, 14)
            }

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
            // S4 (DECISIONS #210): facitknapparna hör hemma där "Senast sagt" faktiskt visas — här, inte i
            // LastSaidCard som ingen vy använder sedan skinnet v3. Bara betatestare, bara på en varning med id.
            // Inte medan kortet Efter resan visas: det bär samma varning med samma knappar (kort #279).
            if resa == nil, prefs.facitOn, prefs.lastSaidText != nil, let id = prefs.lastSaidId, let at = prefs.lastSaidAt,
               Date.now.timeIntervalSince(at) < Facit.maxAge {   // äldre än så tar servern inte emot
                FacitRow(id: id, at: at).padding(.top, 10)
            }
        }
    }

    /// Resans obesvarade varningar och resans start — nil när kortet Efter resan inte ska visas.
    private var efterResan: (obes: [AlertEntry], sedan: Date)? {
        guard prefs.facitOn, let sedan = prefs.tripStart else { return nil }
        let obes = Resan.obesvarade(prefs.history, prefs.facit, sedan: sedan)
        let omarkerade = Missar.omarkerade(prefs.missar, sedan: sedan)   // #203 lager 2
        return Resan.fragaKvar(sedan: sedan, nu: .now, obesvarade: obes.count + omarkerade.count) ? (obes: obes, sedan: sedan) : nil
    }

    private var subtitle: String {
        let n = [prefs.slippery, prefs.icing, prefs.accident, prefs.wildlife, prefs.camera].filter { $0 }.count
        let wake = prefs.autoWake && guardM.authStatus == .authorizedAlways
        // "lämnar inte telefonen av sig själv" — samma ord som Android, introduktionen och produktboken (DECISIONS #320);
        // "stannar i telefonen" blev osant 16/9 när facitsvaret kom (`docs/TILL-AXEL-BYGGE-19.md` p. 1).
        return "\(n == 5 ? "Fem" : "\(n)") källor bevakade. Din position lämnar inte telefonen av sig själv." +
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
            let d = at.dagOchKlockslag
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
            HazardIcon(kind: item.kind, size: 24).foregroundStyle(Brand.yellow)
            Text(Nearby.distText(item.distM))
                .font(Typo.mono(14, .semibold))
                .foregroundStyle(Brand.yellow)
                .frame(width: 60, alignment: .leading)
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
