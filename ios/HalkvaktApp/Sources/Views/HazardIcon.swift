// Ikonsetet (design 31/8, docs/design/icons): fem faror, en linjetjocklek, en färg.
// Halt väglag = bilen tappar greppet (ÄR halt). Frysrisk = termometer + iskristall (KAN BLI).
// Olycka = samma bilkropp med islagsstjärna. Vilt = hjorthuvud framifrån. Kamera = låda på stolpe.
// Triangeln är varumärket och är INTE en av de fem — den står kvar överst på varningskortet.
import SwiftUI
import HalkvaktEngine

struct HazardIcon: View {
    let kind: HazardKind
    var size: CGFloat = 24

    var body: some View {
        Image(Self.name(kind))
            .renderingMode(.template)
            .resizable()
            .scaledToFit()
            .frame(width: size, height: size)
            .accessibilityLabel(Prefs.shared.label(kind))
    }

    static func name(_ kind: HazardKind) -> String {
        switch kind {
        case .slippery_segment: return "ikon-halka"
        case .icing_point:      return "ikon-frysrisk"
        case .accident:         return "ikon-olycka"
        case .wildlife:         return "ikon-vilt"
        case .camera:           return "ikon-kamera"
        }
    }
}
