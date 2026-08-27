// Varumärkets mörka värld — samma palett som Android/webben.
import SwiftUI

enum Brand {
    static let bg = Color(red: 0x06/255, green: 0x09/255, blue: 0x0D/255)
    static let panel = Color(red: 0x0E/255, green: 0x1B/255, blue: 0x25/255)
    static let stroke = Color(red: 0x26/255, green: 0x31/255, blue: 0x3C/255)
    static let yellow = Color(red: 1.0, green: 0xC4/255, blue: 0x00/255)
    static let green = Color(red: 0x2F/255, green: 0xBF/255, blue: 0x71/255)
    static let amber = Color(red: 0xFF/255, green: 0xB0/255, blue: 0x20/255)
    static let text = Color(red: 0xF3/255, green: 0xF6/255, blue: 0xF9/255)
    static let dim = Color(red: 0x8F/255, green: 0xA3/255, blue: 0xB5/255)
    static let faint = Color(red: 0x54/255, green: 0x67/255, blue: 0x7A/255)
}

struct SectionHeader: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 12, weight: .bold, design: .monospaced))
            .tracking(2)
            .foregroundStyle(Brand.yellow)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct Panel<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 12) { content }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Brand.panel, in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Brand.stroke, lineWidth: 1))
    }
}

struct PillButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(Brand.bg)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(color, in: Capsule())
        }
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
            HStack {
                Text("→ \(title)").foregroundStyle(Color(red: 0x7E/255, green: 0xC8/255, blue: 0xE3/255))
                Spacer()
            }
        }
        .padding(.vertical, 6)
    }
}
