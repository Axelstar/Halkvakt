// TYCK TILL UTAN MEJLAPP (DECISIONS #829): telefonen har ingen mejlapp som tar emot mailto, så adressen visas med en kopieringsknapp.
import SwiftUI
import UIKit

struct IngenMejlVy: View {
    @Environment(\.dismiss) private var dismiss
    @State private var kopierad = false

    var body: some View {
        VStack(spacing: 0) {
            MonoLabel(text: "Tyck till")
            Text("Mejla oss på").font(Typo.sans(22, .semibold)).tracking(-0.3).foregroundStyle(Brand.text).padding(.top, 10)
            Text(Tipsa.adress).font(Typo.mono(22, .semibold)).foregroundStyle(Brand.text).padding(.top, 14)
                .textSelection(.enabled)
            Text("Telefonen har ingen mejlapp inställd. Kopiera adressen och skriv från din vanliga mejl. Vi läser allt.")
                .font(Typo.sans(15)).lineSpacing(3).foregroundStyle(Brand.text2)
                .multilineTextAlignment(.center).padding(.top, 12)
            YellowPill(title: kopierad ? "Kopierad" : "Kopiera adressen") {
                UIPasteboard.general.string = Tipsa.adress
                kopierad = true
            }
            .padding(.top, 26)
            MonoLink(title: "Stäng") { dismiss() }.padding(.top, 10)
        }
        .padding(.horizontal, 28).padding(.top, 34).padding(.bottom, 24)
        .frame(maxWidth: .infinity)
        .background(Brand.panel)
        .presentationDetents([.medium])
        .presentationBackground(Brand.panel)
    }
}
