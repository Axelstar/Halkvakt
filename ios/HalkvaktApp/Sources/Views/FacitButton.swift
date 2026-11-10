// Facitknappen (S4): en av två — "Stämde" / "Stämde inte". Kapsel i Halkvakt-gult; den valda är fylld.
import SwiftUI

struct FacitButton: View {
    let title: String
    let selected: Bool
    let action: () -> Void

    var body: some View {
        // Egen etikett och .plain (kort #998): standardknappen färgade texten själv, så att den valda knappen visade gul text på
        // gul botten och ordet försvann i trycket (Axels skärminspelning 10/11).
        Button(action: action) {
            Text(title)
                .font(Typo.sans(14, .semibold))
                .foregroundStyle(selected ? Brand.bg : Brand.yellow)
                .padding(.horizontal, 14).padding(.vertical, 8)
                .frame(minHeight: 44)
                .background(selected ? Brand.yellow : Color.clear, in: Capsule())
                .overlay(Capsule().stroke(Brand.yellow, lineWidth: 1))
                .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}
