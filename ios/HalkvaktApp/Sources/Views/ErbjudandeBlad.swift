// ERBJUDANDET (DECISIONS #926): bladet som öppnas när föraren trycker på en notis med ett erbjudande. Det säger att det är ett
// erbjudande och från vem, visar notisens rubrik och text, och har en länk till partnern. Halkvakt skickar ingenting om föraren
// till partnern; länken öppnas i telefonens webbläsare som vilken länk som helst.
import SwiftUI

struct ErbjudandeBlad: View {
    let erbjudande: Servernotis.Erbjudande
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            MonoLabel(text: "Erbjudande från \(erbjudande.partner)", size: 11)
            Text(erbjudande.rubrik)
                .font(Typo.sans(28, .semibold)).tracking(-0.6).foregroundStyle(Brand.text).padding(.top, 12)
            Text(erbjudande.text)
                .font(Typo.sans(16)).lineSpacing(4).foregroundStyle(Brand.text2).padding(.top, 12)
            Spacer(minLength: 24)
            Text("Halkvakt berättar inte för \(erbjudande.partner) vem du är eller var du är. Länken öppnas i din webbläsare. Du stänger av erbjudanden under Integritet.")
                .font(Typo.sans(13)).lineSpacing(3).foregroundStyle(Brand.dim)
            HStack {
                Spacer()
                VStack(spacing: 4) {
                    YellowPill(title: "Visa erbjudandet") {
                        openURL(erbjudande.lank)
                        dismiss()
                    }
                    MonoLink(title: "Stäng") { dismiss() }
                }
                Spacer()
            }
            .padding(.top, 20)
        }
        .padding(.horizontal, 24).padding(.top, 32).padding(.bottom, 16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Brand.bg)
        .presentationDetents([.medium, .large])
    }
}
