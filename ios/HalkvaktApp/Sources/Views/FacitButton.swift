// Facitknappen (S4): en av två — "Stämde" / "Stämde inte". Kapsel i Halkvakt-gult; den valda är fylld.
import SwiftUI

struct FacitButton: View {
    let title: String
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(title, action: action)
            .font(Typo.sans(14, .semibold))
            .foregroundStyle(selected ? Brand.bg : Brand.yellow)
            .padding(.horizontal, 14).padding(.vertical, 8)
            .background(selected ? Brand.yellow : Color.clear, in: Capsule())
            .overlay(Capsule().stroke(Brand.yellow, lineWidth: 1))
            .accessibilityAddTraits(selected ? .isSelected : [])
    }
}
