// Välkomstens tre bilder (DECISIONS #979): Kartan, Rösten och Ikonerna. De går vidare av sig själva efter 5,5 sekunder och
// stannar på den sista; ett tryck byter bild. Med VoiceOver byts bilden bara av ett tryck, och med Minska rörelse står bilderna
// stilla. Replikerna är motorns riktiga (DECISIONS #444), aldrig påhittade.
import SwiftUI
import HalkvaktEngine

struct Valkomstbilder: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityVoiceOverEnabled) private var voiceOver
    @State private var bild = Bild.kartan

    private enum Bild: Int, CaseIterable {
        case kartan, rosten, ikonerna

        var titel: String {
            switch self {
            case .kartan: return "Varnad innan du är framme"
            case .rosten: return "En röst i bilen, inget att titta på"
            case .ikonerna: return "Vi varnar för"
            }
        }
        var text: String {
            switch self {
            case .kartan: return "Kör som vanligt. Halkvakt säger till i bilens högtalare."
            case .rosten: return "Halkvakt säger till när något ligger framför dig. Sedan är den tyst."
            case .ikonerna: return "Fem slags varningar, alla påslagna från början."
            }
        }
        /// Det bilden visar, för den som inte ser den.
        var syns: String {
            switch self {
            case .kartan: return "Exempel: Risk för halka på väg 40 framför dig."
            case .rosten: return "Exempel: Olycka rapporterad på E6 2 kilometer framför dig."
            case .ikonerna: return IkonBild.rader.map(\.titel).joined(separator: ", ") + "."
            }
        }
        var nasta: Bild { Bild(rawValue: (rawValue + 1) % Bild.allCases.count) ?? .kartan }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(spacing: 6) {
                ForEach(Bild.allCases, id: \.self) { b in
                    Capsule().fill(b.rawValue <= bild.rawValue ? Brand.text : Brand.trackOff).frame(height: 3)
                }
            }
            .accessibilityHidden(true)
            Button(action: byt) {
                VStack(alignment: .leading, spacing: 16) {
                    Text(bild.titel).font(Typo.sans(32, .semibold)).tracking(-0.8).foregroundStyle(Brand.text)
                    Text(bild.text).font(Typo.sans(15)).lineSpacing(4).foregroundStyle(Brand.text2)
                    switch bild {
                    case .kartan: KartBild(stilla: reduceMotion)
                    case .rosten: RostBild(stilla: reduceMotion)
                    case .ikonerna: IkonBild(stilla: reduceMotion)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .id(bild)
            .transition(.opacity)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("\(bild.titel). \(bild.text) \(bild.syns)")
            .accessibilityHint("Bild \(bild.rawValue + 1) av \(Bild.allCases.count). Tryck för nästa.")
        }
        .task(id: bild) { await gaVidare() }
    }

    private func byt() { withAnimation(.easeOut(duration: 0.3)) { bild = bild.nasta } }

    private func gaVidare() async {
        guard !voiceOver, bild != .ikonerna else { return }
        try? await Task.sleep(for: .seconds(5.5))
        guard !Task.isCancelled else { return }
        byt()
    }
}

/// Kartan: en väg, en gul sträcka med halka, en prick som kör mot den och kortet med repliken innan pricken är framme.
private struct KartBild: View {
    let stilla: Bool
    @State private var start = Date.now

    /// Vägen i bildens egna mått, 340 × 300.
    private static let vag: Path = {
        var p = Path()
        p.move(to: CGPoint(x: 40, y: 282))
        p.addCurve(to: CGPoint(x: 170, y: 190), control1: CGPoint(x: 40, y: 215), control2: CGPoint(x: 150, y: 245))
        p.addCurve(to: CGPoint(x: 300, y: 118), control1: CGPoint(x: 190, y: 135), control2: CGPoint(x: 290, y: 180))
        return p
    }()
    private static let rutnat: Path = {
        var p = Path()
        for x in stride(from: 40.0, through: 280.0, by: 60.0) { p.move(to: CGPoint(x: x, y: 100)); p.addLine(to: CGPoint(x: x, y: 300)) }
        for y in stride(from: 130.0, through: 280.0, by: 50.0) { p.move(to: CGPoint(x: 0, y: y)); p.addLine(to: CGPoint(x: 340, y: y)) }
        return p
    }()

    var body: some View {
        TimelineView(.animation(paused: stilla)) { ctx in
            // Ett varv är sju sekunder. Stilla: pricken en bit före sträckan och kortet framme.
            let t = stilla ? 0.5 : ctx.date.timeIntervalSince(start).truncatingRemainder(dividingBy: 7) / 7
            GeometryReader { g in
                let s = g.size.width / 340
                let skala = CGAffineTransform(scaleX: s, y: s)
                let vag = Self.vag.applying(skala)
                let linje = StrokeStyle(lineWidth: 7 * s, lineCap: .round)
                let prick = vag.trimmedPath(from: 0, to: min(1, max(0.001, t / 0.88))).currentPoint ?? CGPoint(x: 40 * s, y: 282 * s)
                ZStack(alignment: .topLeading) {
                    Self.rutnat.applying(skala).stroke(Color(hex: 0x141B1F), lineWidth: 1)
                    vag.stroke(Color(hex: 0x33424A), style: linje)
                    vag.trimmedPath(from: 0.66, to: 0.9).stroke(Brand.yellow, style: linje)
                    HStack(spacing: 8) {
                        HazardIcon(kind: .slippery_segment, size: 26)
                        MonoLabel(text: "Halka", color: Brand.yellow, size: 11)
                    }
                    .foregroundStyle(Brand.yellow)
                    .offset(x: 206 * s, y: 208 * s)
                    MonoLabel(text: "Du kör", size: 11).offset(x: 62 * s, y: 268 * s)
                    Circle().fill(Brand.text).frame(width: 18, height: 18)
                        .overlay(Circle().strokeBorder(Color(hex: 0x0B1013), lineWidth: 3))
                        .position(prick)
                        .opacity(t < 0.88 ? 1 : max(0, 1 - (t - 0.88) / 0.08))
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("HALKVAKT VARNAR")
                            Spacer()
                            Text("HALKA")
                        }
                        .font(Typo.mono(11, .semibold)).tracking(1.5)
                        Text("”Risk för halka på väg 40 framför dig.”").font(Typo.sans(16, .medium)).lineSpacing(2)
                    }
                    .foregroundStyle(Brand.onAmber)
                    .padding(.horizontal, 16).padding(.vertical, 14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Brand.amber, in: RoundedRectangle(cornerRadius: 16))
                    .padding(14)
                    .opacity(Self.kortet(t))
                }
            }
        }
        .aspectRatio(340.0 / 300.0, contentMode: .fit)
        .background(Color(hex: 0x0B1013))
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(Brand.line, lineWidth: 1))
    }

    /// Kortet tonar in när pricken närmar sig sträckan och ut när den har passerat.
    private static func kortet(_ t: Double) -> Double {
        if t < 0.26 || t > 0.88 { return 0 }
        if t < 0.31 { return (t - 0.26) / 0.05 }
        if t > 0.78 { return (0.88 - t) / 0.1 }
        return 1
    }
}

/// Rösten: staplar som rör sig som ljud, och repliken som kommer ord för ord.
private struct RostBild: View {
    let stilla: Bool
    @State private var start = Date.now

    private static let hojder: [Double] = [30, 67, 44, 81, 58, 35, 72, 49, 86, 63, 40, 77, 54, 31, 68, 45, 82, 59, 36, 73, 50, 87, 64, 41, 78, 55]
    private static let ord = ["Olycka", "rapporterad", "på", "E6", "2", "kilometer", "framför", "dig."]

    var body: some View {
        TimelineView(.animation(paused: stilla)) { ctx in
            let tid = ctx.date.timeIntervalSince(start)
            VStack(alignment: .leading, spacing: 18) {
                HStack(spacing: 4) {
                    ForEach(Self.hojder.indices, id: \.self) { n in
                        RoundedRectangle(cornerRadius: 3).fill(Brand.yellow)
                            .frame(height: Self.hojder[n] * (stilla ? 0.6 : Self.utslag(tid, n)))
                            .frame(maxWidth: .infinity)
                    }
                }
                .frame(height: 96)
                VStack(alignment: .leading, spacing: 8) {
                    MonoLabel(text: "Olycka", color: Brand.yellow, size: 11)
                    Text(Self.replik(stilla ? nil : tid.truncatingRemainder(dividingBy: 5.5)))
                        .font(Typo.sans(22, .semibold)).lineSpacing(4)
                        .frame(maxWidth: .infinity, minHeight: 64, alignment: .topLeading)
                }
            }
        }
        .padding(.horizontal, 20).padding(.vertical, 22)
        .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(Brand.line, lineWidth: 1))
    }

    /// Stapelns höjd som andel, 0,12 till 1, med 0,9 sekunder per svängning och staplarna i otakt.
    private static func utslag(_ tid: Double, _ n: Int) -> Double {
        0.12 + 0.88 * (0.5 - 0.5 * cos(2 * .pi * (tid + Double(n) * 0.13) / 0.9))
    }

    /// Repliken med varje ord tonat efter tiden i varvet. nil: alla ord syns.
    private static func replik(_ varv: Double?) -> AttributedString {
        var hela = AttributedString()
        for (n, o) in ord.enumerated() {
            var del = AttributedString(n == 0 ? o : " " + o)
            del.swiftUI.foregroundColor = Brand.text.opacity(varv.map { synlighet($0, n) } ?? 1)
            hela.append(del)
        }
        return hela
    }

    private static func synlighet(_ varv: Double, _ n: Int) -> Double {
        if varv > 4.5 { return max(0, 1 - (varv - 4.5) / 0.55) }
        return min(1, max(0, (varv - 0.5 - 0.24 * Double(n)) / 0.25))
    }
}

/// Ikonerna: appens fem varningar med sina egna ikoner, en rad i taget.
private struct IkonBild: View {
    let stilla: Bool
    @State private var visas = false

    struct Rad { let kind: HazardKind; let titel: String; let text: String }
    static let rader = [
        Rad(kind: .slippery_segment, titel: "Halka", text: "Rapporterade hala vägsträckor"),
        Rad(kind: .camera, titel: "Fartkameror", text: "500 meter innan, med hastighetsgränsen"),
        Rad(kind: .accident, titel: "Olyckor och hinder", text: "Trafikverkets pågående lägen"),
        Rad(kind: .wildlife, titel: "Vilt", text: "Djur på vägen"),
        Rad(kind: .icing_point, titel: "Frysrisk", text: "Vägbanan nära noll och vått"),
    ]

    var body: some View {
        VStack(spacing: 8) {
            ForEach(Self.rader.indices, id: \.self) { n in
                let rad = Self.rader[n]
                HStack(spacing: 14) {
                    HazardIcon(kind: rad.kind, size: 26).foregroundStyle(Brand.onAmber)
                        .frame(width: 44, height: 44).background(Brand.yellow, in: Circle())
                    VStack(alignment: .leading, spacing: 2) {
                        Text(rad.titel).font(Typo.sans(17, .semibold)).foregroundStyle(Brand.text)
                        Text(rad.text).font(Typo.sans(13)).lineSpacing(2).foregroundStyle(Brand.dim)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(.horizontal, 14).padding(.vertical, 11)
                .background(Brand.panel, in: RoundedRectangle(cornerRadius: 16))
                .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Brand.line, lineWidth: 1))
                .opacity(visas ? 1 : 0)
                .offset(x: visas ? 0 : -14)
                .animation(stilla ? nil : .easeOut(duration: 0.5).delay(0.3 + 0.35 * Double(n)), value: visas)
            }
        }
        .onAppear { visas = true }
    }
}
