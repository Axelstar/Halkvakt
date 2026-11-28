// Din data under Integritet (DECISIONS #917, #918). Frågan är ett blad sedan 28/11 (ForeResanBlad, DECISIONS #979), och steget
// och reglaget om erbjudanden är borta.
import SwiftUI

/// Din data under Integritet: allt som sparats om telefonen och Radera min data.
struct DinDataView: View {
    @State private var plats = Platsdelning.shared
    @State private var raderar = false
    @State private var raderingFel = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            MonoLabel(text: "Din data").padding(.bottom, 10).padding(.horizontal, 4)
            if plats.svar == .ja {
                RowPanel {
                    ReceiptRow(label: "Kommun", value: plats.kommunNamn ?? "Inte läst än")
                    ReceiptRow(label: "Skickad", value: plats.skickad?.dagOchKlockslag ?? (plats.sandningFel ? "Gick inte, försöker igen" : "Inte än"))
                    ReceiptRow(label: "Notiser", value: plats.notisadress == nil ? "Ingen adress sparad" : "Adress sparad", divider: false)
                }
                Text("Det här är allt vi har sparat om den här telefonen. \(Platsord.nyttLofte)")
                    .font(Typo.sans(13)).lineSpacing(3).foregroundStyle(Brand.dim).padding(.top, 12).padding(.horizontal, 4)
                if let id = plats.id {
                    Text("Ditt nummer, om du mejlar oss om din data:").font(Typo.sans(13)).foregroundStyle(Brand.dim)
                        .padding(.top, 12).padding(.horizontal, 4)
                    Text(id).font(Typo.mono(11)).foregroundStyle(Brand.text2).textSelection(.enabled)
                        .padding(.top, 4).padding(.horizontal, 4)
                }
                HStack {
                    Spacer()
                    NeutralPill(title: raderar ? "Raderar" : "Radera min data") {
                        guard !raderar else { return }
                        raderar = true
                        Task {
                            raderingFel = !(await plats.radera())
                            raderar = false
                        }
                    }
                    Spacer()
                }
                .padding(.top, 20)
                if raderingFel {
                    Text("Det gick inte att nå servern. Inget är raderat. Försök igen när du har nät.")
                        .font(Typo.sans(13)).foregroundStyle(Brand.yellow).padding(.top, 10).padding(.horizontal, 4)
                }
            } else {
                Text("Du delar inte din kommun. Inget om den här telefonens plats är sparat hos oss.")
                    .font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2).padding(.horizontal, 4)
                MonoLink(title: "Visa frågan igen") { plats.visaBladet = true }.padding(.top, 8)
            }
        }
    }
}
