// Designöverlämningen v2 (DECISIONS #444) — de delar som återkommer på flera skärmar:
// logotypen, statusljuset, gula och neutrala kapselknappar, monoetiketter, navigeringsrader,
// kvittorader, gröna vippor och den flytande flikraden. Tokens bor i Theme.swift.
import SwiftUI

/// Logomärket (triangeln med urstansat "!") + HALKVAKT i Plex Mono. Mellanrum ≈ 0,33 × märkets bredd.
struct Lockup: View {
    var markSize: CGFloat = 16
    var textSize: CGFloat = 12
    var body: some View {
        HStack(spacing: markSize * 0.56) {
            Image("ikon-mark").renderingMode(.template).resizable().scaledToFit()
                .frame(width: markSize, height: markSize * 83 / 94)
                .foregroundStyle(Brand.yellow)
            Text("HALKVAKT").font(Typo.mono(textSize, .semibold)).tracking(textSize * 0.12)
                .foregroundStyle(Brand.text)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Halkvakt")
    }
}

/// 7 pt ljus som andas (opacitet 1 → 0,45, skala 1 → 0,8, 2,4 s). Står still med Reduce Motion.
struct StatusLight: View {
    let color: Color
    @State private var dim = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        Circle().fill(color).frame(width: 7, height: 7)
            .shadow(color: color, radius: 4)
            .opacity(dim ? 0.45 : 1).scaleEffect(dim ? 0.8 : 1)
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true)) { dim = true }
            }
            .accessibilityHidden(true)
    }
}

/// Monoetikett i versaler — "LÖFTET", "PÅ DIN VÄG", "TYST SÅ LÄNGE".
struct MonoLabel: View {
    let text: String
    var color: Color = Brand.dim
    var size: CGFloat = 10
    var body: some View {
        Text(text.uppercased()).font(Typo.mono(size, .medium)).tracking(size * 0.14).foregroundStyle(color)
    }
}

/// Gul kapsel 220 × 56 — bara för knappar som GÖR något (Starta vakten, Tillåt plats, Testa rösten).
struct YellowPill: View {
    let title: String
    var color: Color = Brand.yellow
    var playIcon = false
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                if playIcon { Image(systemName: "play.fill").font(.system(size: 13)) }
                Text(title).font(Typo.sans(17, .semibold))
            }
            .foregroundStyle(Brand.bg)
            .frame(width: 220, height: 56)
            .background(color, in: Capsule())
        }
        .buttonStyle(PressScale())
    }
}

/// Neutral kapsel — "Avsluta vakten": panelbakgrund, 1 pt kant.
struct NeutralPill: View {
    let title: String
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title).font(Typo.sans(17, .semibold)).foregroundStyle(Brand.text)
                .frame(width: 220, height: 56)
                .background(Brand.panel, in: Capsule())
                .overlay(Capsule().strokeBorder(Brand.trackOff, lineWidth: 1))
        }
        .buttonStyle(PressScale())
    }
}

/// Understruken monolänk — "APPEN MISSADE NÅGOT", "ÄNDRA TILL ALLTID".
struct MonoLink: View {
    let title: String
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title.uppercased()).font(Typo.mono(11, .medium)).tracking(1.5)
                .underline(color: Color(hex: 0x34424A))
                .foregroundStyle(Brand.text)
                .frame(minHeight: 44)
        }
    }
}

struct PressScale: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.scaleEffect(configuration.isPressed ? 0.97 : 1)
    }
}

/// 1 pt streckad avdelare inuti paneler.
struct DashedDivider: View {
    var body: some View {
        Line().stroke(Brand.divider, style: StrokeStyle(lineWidth: 1, dash: [4, 3])).frame(height: 1)
    }
    private struct Line: Shape {
        func path(in r: CGRect) -> Path { Path { p in p.move(to: .init(x: 0, y: 0.5)); p.addLine(to: .init(x: r.width, y: 0.5)) } }
    }
}

/// 1 pt streckad lodrät avdelare (mellan räknarna i På vakt).
struct VerticalDash: View {
    var body: some View {
        Line().stroke(Brand.divider, style: StrokeStyle(lineWidth: 1, dash: [4, 3])).frame(width: 1)
    }
    private struct Line: Shape {
        func path(in r: CGRect) -> Path { Path { p in p.move(to: .init(x: 0.5, y: 0)); p.addLine(to: .init(x: 0.5, y: r.height)) } }
    }
}

/// Panel med rader (radie 18, horisontell marginal 20) — raderna själva bär sina avdelare.
struct RowPanel<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        VStack(spacing: 0) { content }
            .padding(.horizontal, 20)
            .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
    }
}

/// Inställningsrad: rubrik, värde i mono, pil. 56 pt.
struct NavRowLabel: View {
    let title: String
    var value: String? = nil
    var divider = true
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                Text(title).font(Typo.sans(16, .medium)).foregroundStyle(Brand.text)
                Spacer()
                if let value { Text(value.uppercased()).font(Typo.mono(11, .medium)).tracking(1.3).foregroundStyle(Brand.dim) }
                Text("→").font(Typo.mono(13)).foregroundStyle(Brand.dim)
            }
            .frame(height: 56)
            .contentShape(Rectangle())
            if divider { DashedDivider() }
        }
    }
}

/// Kvittorad: monoetikett till vänster, värde till höger.
struct ReceiptRow: View {
    let label: String
    let value: String
    var valueColor: Color = Brand.text
    var divider = true
    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .firstTextBaseline, spacing: 16) {
                MonoLabel(text: label, size: 11)
                Spacer()
                Text(value).font(Typo.sans(15, .medium)).foregroundStyle(valueColor).multilineTextAlignment(.trailing)
            }
            .padding(.vertical, 15)
            if divider { DashedDivider() }
        }
        .accessibilityElement(children: .combine)
    }
}

/// Vippa enligt designen: grön när den är på, aldrig gul.
struct GreenToggleRow: View {
    let title: String
    var sub: String? = nil
    @Binding var isOn: Bool
    var body: some View {
        Toggle(isOn: $isOn) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(Typo.sans(16, .medium)).foregroundStyle(Brand.text)
                if let sub { Text(sub).font(Typo.sans(13)).foregroundStyle(Brand.dim) }
            }
        }
        .tint(Brand.green)
        .padding(.vertical, 14)
    }
}

/// En 3D-sockel ur designen, renderad till bild (scripts/design-socklar.py) — 300 × 240 pt.
struct Plinth: View {
    let name: String
    var body: some View {
        Image(name).resizable().scaledToFit().frame(maxWidth: 300).accessibilityHidden(true)
    }
}

/// Den flytande flikraden: Vakten / Inställningar, 112 × 52 per flik.
struct FloatingTabBar: View {
    @Binding var tab: Int
    var body: some View {
        HStack(spacing: 4) {
            item(0, "VAKTEN") {
                Image("ikon-mark").renderingMode(.template).resizable().scaledToFit().frame(width: 16, height: 14)
                    .foregroundStyle(tab == 0 ? Brand.yellow : Brand.dim)
            }
            item(1, "INSTÄLLNINGAR") {
                VStack(spacing: 3) { ForEach(0..<3, id: \.self) { _ in Capsule().frame(width: 16, height: 2) } }
                    .foregroundStyle(tab == 1 ? Brand.text : Brand.dim)
            }
        }
        .padding(4)
        .background(Brand.panel, in: Capsule())
        .overlay(Capsule().strokeBorder(Brand.line, lineWidth: 1))
    }

    private func item<I: View>(_ i: Int, _ title: String, @ViewBuilder icon: () -> I) -> some View {
        Button { tab = i } label: {
            VStack(spacing: 6) {
                icon()
                Text(title).font(Typo.mono(10)).tracking(1.2).foregroundStyle(tab == i ? Brand.text : Brand.dim)
            }
            .frame(width: 112, height: 52)
            .background(tab == i ? Brand.raisedSolid : .clear, in: Capsule())
        }
        .accessibilityLabel(i == 0 ? "Vakten" : "Inställningar")
        .accessibilityAddTraits(tab == i ? .isSelected : [])
    }
}
