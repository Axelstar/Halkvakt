// VAKTEN — hemskärmen, designöverlämningen v2 (DECISIONS #443): 01 Redo och 01b Redo efter tur.
// "Redo." svarar på "är jag skyddad?" med en blick; efter en tur står kvittot över varningarna tills nästa tur.
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
                        .padding(.horizontal, 24)
                        .padding(.bottom, 120)   // den flytande flikraden
                        .frame(minHeight: geo.size.height, alignment: .top)
                }
                .scrollBounceBehavior(.basedOnSize)
                .scrollIndicators(.hidden)
            }
        }
        .task { await guardM.refreshSnapshot() }
    }

    private var innehall: some View {
        let resa = efterResan
        let tur = senasteTuren
        return VStack(spacing: 0) {
            BrandHeader(trailing: guardM.snapshotInfo == nil ? "Hämtar" : "Live",
                        trailingColor: guardM.snapshotInfo == nil ? Brand.faint : Brand.yellow)

            // Kort #203: frågan om resan står överst, före allt annat — den som öppnar appen efter
            // en körning ska se den utan att leta. Försvinner när allt är besvarat, och efter ett dygn.
            // Designen v2 visar inte betatestets kort; det står kvar här för betatestarna (DECISIONS #267, #443).
            if let resa {
                EfterResanKort(varningar: resa.obes, missar: prefs.missar.filter { $0.t >= resa.sedan }, sedan: resa.sedan)
                    .padding(.top, 14)
            }

            if tur == nil && resa == nil {
                Spacer(minLength: 12)
                Plinth(name: "plinth-logo").frame(height: 220)
            } else {
                Spacer(minLength: 24)
            }

            VStack(spacing: 14) {
                Text("Redo.")
                    .font(Typo.sans(44, .semibold)).tracking(-1.3)
                    .foregroundStyle(Brand.text)
                Text(tur == nil ? subtitle : (wakes ? "Vakten vaknar själv när du kör." : "Din position lämnar inte telefonen av sig själv."))
                    .font(Typo.sans(15)).lineSpacing(4)
                    .foregroundStyle(Brand.text2)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 290)
                if tur == nil {
                    Text(kallor).font(Typo.mono(10)).tracking(1.4).foregroundStyle(Brand.dim)
                        .multilineTextAlignment(.center).padding(.top, 4)
                }
            }
            .padding(.top, 12)

            if let tur { kvitto(tur).padding(.top, 24) }

            Spacer(minLength: 24)

            YellowPill(title: "Starta vakten", playIcon: true) { guardM.requestPermissionAndStart() }
            if guardM.locationDenied { LocationDeniedRow().padding(.top, 10) }

            Text(tur.map { "\($0.varningar.count) \($0.varningar.count == 1 ? "VARNING" : "VARNINGAR") · VISAS TILLS NÄSTA TUR" } ?? "INGEN TUR ÄN")
                .font(Typo.mono(10)).tracking(1.4).foregroundStyle(Brand.faint)
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

    /// Kvittot över senaste turen (designen 01b): klockslag, ikon, rubrik och det rösten sa, en rad per varning.
    private func kvitto(_ tur: SenasteTur) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                MonoLabel(text: "Senaste turen")
                Text(tur.rubrik).font(Typo.mono(12, .medium)).tracking(0.6).foregroundStyle(Brand.text)
            }
            .padding(.vertical, 16)
            ForEach(tur.varningar, id: \.self) { v in
                DashedDivider()
                HStack(alignment: .top, spacing: 12) {
                    Text(v.t.klockslag).font(Typo.mono(12, .medium)).foregroundStyle(Brand.dim)
                    if let k = HazardKind(rawValue: v.kind) {
                        HazardIcon(kind: k, size: 22).foregroundStyle(Brand.text)
                    }
                    VStack(alignment: .leading, spacing: 3) {
                        Text(Self.rubrik(v.kind)).font(Typo.sans(15, .medium)).foregroundStyle(Brand.text)
                        Text("”\(v.text)”").font(Typo.sans(13)).foregroundStyle(Brand.text2)
                    }
                    Spacer(minLength: 0)
                }
                .padding(.vertical, 14)
                .accessibilityElement(children: .combine)
            }
        }
        .padding(.horizontal, 20)
        .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
    }

    private struct SenasteTur { let rubrik: String; let varningar: [AlertEntry] }

    /// Senaste avslutade turen med minst en varning; nil ⇒ Redo utan kvitto ("INGEN TUR ÄN").
    private var senasteTuren: SenasteTur? {
        guard let start = prefs.tripStart, let slut = prefs.lastTripEnd, slut >= start else { return nil }
        let v = prefs.history.filter { $0.t >= start && $0.t <= slut }.sorted { $0.t < $1.t }
        guard !v.isEmpty else { return nil }
        let min = Int(slut.timeIntervalSince(start) / 60)
        let km = String(format: "%.0f", prefs.lastTripKm)
        return SenasteTur(rubrik: "\(start.klockslag)–\(slut.klockslag) · \(min) MIN · \(km) KM", varningar: v)
    }

    /// Kortets rubriker (DECISIONS #443) — samma ord på iPhone och Android.
    static func rubrik(_ kind: String) -> String {
        switch HazardKind(rawValue: kind) {
        case .accident: return "Olycka"
        case .slippery_segment: return "Halka"
        case .icing_point: return "Frysrisk"
        case .wildlife: return "Vilt"
        case .camera: return "Fartkamera"
        case nil: return kind
        }
    }

    /// Resans obesvarade varningar och resans start — nil när kortet Efter resan inte ska visas.
    private var efterResan: (obes: [AlertEntry], sedan: Date)? {
        guard prefs.facitOn, let sedan = prefs.tripStart else { return nil }
        let obes = Resan.obesvarade(prefs.history, prefs.facit, sedan: sedan)
        let omarkerade = Missar.omarkerade(prefs.missar, sedan: sedan)   // #203 lager 2
        return Resan.fragaKvar(sedan: sedan, nu: .now, obesvarade: obes.count + omarkerade.count) ? (obes: obes, sedan: sedan) : nil
    }

    private var wakes: Bool { prefs.autoWake && guardM.authStatus == .authorizedAlways }

    private var subtitle: String {
        // "lämnar inte telefonen av sig själv" — samma ord som Android, introduktionen och produktboken (DECISIONS #320);
        // "stannar i telefonen" blev osant 16/9 när facitsvaret kom (`docs/TILL-AXEL-BYGGE-19.md` p. 1).
        (wakes ? "Vakten vaknar själv när du kör. " : "") + "Din position lämnar inte telefonen av sig själv."
    }

    /// "HALKA · VILT · OLYCKOR · FRYSRISK · KAMEROR" — bara de källor som är på.
    private var kallor: String {
        let items: [(String, Bool)] = [("Halka", prefs.slippery), ("Vilt", prefs.wildlife), ("Olyckor", prefs.accident),
                                       ("Frysrisk", prefs.icing), ("Kameror", prefs.camera)]
        let on = items.filter { $0.1 }.map { $0.0.uppercased() }
        return on.isEmpty ? "ALLA KÄLLOR AV" : on.joined(separator: " · ")
    }
}

/// Rad i "På din väg" (designen 02): ikon, avstånd i mono, faran, vägen.
struct NearbyRow: View {
    let item: NearbyItem
    var divider = false
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 14) {
                HazardIcon(kind: item.kind, size: 20).foregroundStyle(Brand.dim)
                Text(Nearby.distText(item.distM).uppercased())
                    .font(Typo.mono(14)).foregroundStyle(Brand.text)
                    .frame(width: 70, alignment: .leading)
                Text(VaktenView.rubrik(item.kind.rawValue)).font(Typo.sans(15, .medium)).foregroundStyle(Brand.text)
                Spacer(minLength: 8)
                if let s = item.secondary {
                    Text(s.uppercased()).font(Typo.mono(10)).tracking(1.2).foregroundStyle(Brand.faint).lineLimit(1)
                }
            }
            .frame(height: 52)
            if divider { DashedDivider() }
        }
        .accessibilityElement(children: .combine)
    }
}
