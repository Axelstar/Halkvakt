// Skinnet v4 = designöverlämningen v2 (DECISIONS #443), byggt på v3 (DECISIONS #47).
// Tokens är designens, inte mina: ändra i designen, sedan här. Typsnitt: Instrument Sans
// (text) och IBM Plex Mono (siffror, etiketter), båda OFL, buntade i Sources/Fonts.
import SwiftUI

enum Brand {
    // Ytor
    static let bg     = Color(hex: 0x080B0D)
    static let panel  = Color(hex: 0x0F1518)
    static let raised = Color.white.opacity(0.04)
    static let raisedSolid = Color(hex: 0x1A2327)     // aktiv flik, upphöjda chips, toast
    static let stroke = Color.white.opacity(0.12)
    static let line = Color(hex: 0x1E282D)            // panelkant
    static let divider = Color(hex: 0x253036)         // streckade avdelare i paneler
    static let trackOff = Color(hex: 0x26323A)        // avslagen vippa, ringar
    // Accent
    static let yellow = Color(hex: 0xFFC94A)
    static let amber  = Color(hex: 0xFFC94A)          // varningskortets yta = gul
    static let onAmber = Color(hex: 0x140F00)         // text på gult
    static let green  = Color(hex: 0x1FB25A)
    static let greenDim = Color(hex: 0x167F41)
    static let greenText = Color(hex: 0x7FD9A4)
    static let blue   = Color(hex: 0x6EC9E8)
    // Text
    static let text   = Color(hex: 0xE9EFF2)
    static let text2  = Color(hex: 0xA9B5BB)
    static let dim    = Color(hex: 0x8FA0A9)
    static let faint  = Color(hex: 0x6F7C83)
    static let faint2 = Color(hex: 0x4A5A63)          // versionsraden, avstängt
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

/// Panel: 18 pt radie, #0F1518, tunn kant.
struct Panel<Content: View>: View {
    var dashed = false
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 12) { content }
            .padding(.horizontal, 20).padding(.vertical, 18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(dashed ? Color.clear : Brand.panel, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18)
                .strokeBorder(dashed ? Brand.divider : Brand.line, style: StrokeStyle(lineWidth: 1, dash: dashed ? [4, 4] : [])))
    }
}

/// Toppraden (designen v2): logomärket + HALKVAKT i mitten, läget till höger med ett pulserande ljus
/// (gult LIVE när vakten väntar, grönt PÅ när den kör). Utan `trailing` står bara ordbilden.
struct BrandHeader: View {
    var trailing: String? = nil
    var trailingColor: Color = Brand.green
    var body: some View {
        ZStack {
            Lockup(markSize: 16, textSize: 12)
            if let t = trailing {
                HStack(spacing: 7) {
                    Spacer()
                    Text(t.uppercased()).font(Typo.mono(10, .medium)).tracking(1.2)
                        .foregroundStyle(trailingColor == Brand.yellow ? Brand.dim : trailingColor)
                    StatusLight(color: trailingColor)
                }
            }
        }
        .frame(height: 48)
    }
}
