// Skinnet v3 (DECISIONS #47) — portat från docs/design/Halkvakt-App-v3.dc.html.
// Tokens är designens, inte mina: ändra i designen, sedan här. Typsnitt: Instrument Sans
// (text) och IBM Plex Mono (siffror, etiketter), båda OFL, buntade i Sources/Fonts.
import SwiftUI

enum Brand {
    // Ytor
    static let bg     = Color(hex: 0x080B0D)
    static let panel  = Color(hex: 0x0F1518)
    static let raised = Color.white.opacity(0.04)
    static let stroke = Color.white.opacity(0.12)
    // Accent
    static let yellow = Color(hex: 0xFFC94A)
    static let amber  = Color(hex: 0xFFC94A)          // varningskortets yta = gul
    static let onAmber = Color(hex: 0x140F00)         // text på gult
    static let green  = Color(hex: 0x1FB25A)
    static let greenText = Color(hex: 0x7FD9A4)
    static let blue   = Color(hex: 0x6EC9E8)
    // Text
    static let text   = Color(hex: 0xE9EFF2)
    static let text2  = Color(hex: 0xC7D3D9)
    static let dim    = Color(hex: 0x8FA0A9)
    static let faint  = Color(hex: 0x6C7B84)
}

extension Color {
    init(hex: UInt32) {
        self.init(red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255)
    }
}

enum Typo {
    /// Instrument Sans (variabel). Vikter: 400 regular, 500 medium, 600 semibold, 700 bold.
    static func sans(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        // Variabel TTF exponerar en familj; SwiftUI väljer instans via weight-modifier.
        Font.custom("Instrument Sans", size: size).weight(weight)
    }
    /// IBM Plex Mono — siffror och versaletiketter.
    static func mono(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        switch weight {
        case .semibold, .bold, .heavy, .black: return Font.custom("IBM Plex Mono SemiBold", size: size)
        case .medium: return Font.custom("IBM Plex Mono Medium", size: size)
        default: return Font.custom("IBM Plex Mono", size: size)
        }
    }
}

/// Versaletikett i mono, spärrad — "SENAST SAGT", "PÅ DIN VÄG", "VARNA FÖR".
struct SectionHeader: View {
    let text: String
    var color: Color = Brand.yellow
    var body: some View {
        Text(text.uppercased())
            .font(Typo.mono(11))
            .tracking(1.8)
            .foregroundStyle(color)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Panel: 20 pt radie, #0F1518, tunn kant.
struct Panel<Content: View>: View {
    var dashed = false
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 12) { content }
            .padding(.horizontal, 20).padding(.vertical, 18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Brand.panel, in: RoundedRectangle(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20)
                .strokeBorder(Brand.stroke, style: StrokeStyle(lineWidth: 1, dash: dashed ? [5, 5] : [])))
    }
}

/// Fylld kapselknapp, 56 pt hög.
struct PillButton: View {
    let title: String
    let icon: String
    let color: Color
    var foreground: Color = Brand.bg
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .font(Typo.sans(17, .semibold))
                .foregroundStyle(foreground)
                .frame(maxWidth: .infinity)
                .frame(height: 56)
                .background(color, in: Capsule())
        }
    }
}

/// Konturkapsel, 56 pt — "Avsluta vakten", "Testa rösten".
struct OutlineButton: View {
    let title: String
    var icon: String? = nil
    var color: Color = Brand.text2
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if let icon { Image(systemName: icon) }
                Text(title)
            }
            .font(Typo.sans(16, .semibold))
            .foregroundStyle(color)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .overlay(Capsule().stroke(color == Brand.text2 ? Color.white.opacity(0.16) : color, lineWidth: 1))
        }
    }
}

/// Källchip — "HALKA", "VILT", "KAMEROR AV".
struct Chip: View {
    let text: String
    var on = true
    var body: some View {
        Text(text.uppercased())
            .font(Typo.mono(10, .medium))
            .tracking(1.2)
            .foregroundStyle(on ? Brand.yellow : Brand.faint)
            .padding(.horizontal, 10).padding(.vertical, 6)
            .overlay(Capsule().stroke(on ? Brand.yellow.opacity(0.5) : Brand.stroke, lineWidth: 1))
    }
}

struct LinkRow: View {
    let title: String
    let url: String
    @Environment(\.openURL) private var openURL
    var body: some View {
        Button {
            if let u = URL(string: url) { openURL(u) }
        } label: {
            HStack { Text("→ \(title)").font(Typo.sans(15)).foregroundStyle(Brand.blue); Spacer() }
        }
        .padding(.vertical, 6)
    }
}

/// Toppraden: ▲ Halkvakt + statuspill.
struct BrandHeader: View {
    var trailing: String? = nil
    var trailingColor: Color = Brand.green
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "triangle.fill")
                .font(.system(size: 11, weight: .black))
                .foregroundStyle(Brand.yellow)
            Text("HALKVAKT")
                .font(Typo.mono(11, .medium))
                .tracking(2)
                .foregroundStyle(Brand.dim)
            Spacer()
            if let t = trailing {
                HStack(spacing: 6) {
                    Circle().fill(trailingColor).frame(width: 6, height: 6)
                    Text(t).font(Typo.mono(10, .medium)).tracking(1.2)
                }
                .padding(.horizontal, 10).padding(.vertical, 6)
                .background(Capsule().fill(Brand.raised))
                .overlay(Capsule().stroke(Brand.stroke, lineWidth: 1))
                .foregroundStyle(trailingColor)
            }
        }
    }
}
