// SPARA RESAN? (favoriterna steg 2, kort #357; DECISIONS #616, #625) — frågan efter resan, som egen rad på Redo. för den som
// slagit på "Erbjud att spara resor". Kortet Efter resan visas bara för betatestarna, så frågan står för sig själv.
// Namnförslagen är fasta, med datum: Till jobbet, Hem, Resa 18/10 (Rutter.namnforslag). Fritext går alltid. Inget slås upp
// om platsen. Nej tack raderar vägen; utan svar raderas den efter ett dygn (Favoriter.fragaKvarS).
import SwiftUI
import HalkvaktEngine

struct SparaResanKort: View {
    let resa: Favoriter.VantandeResa
    @State private var fav = Favoriter.shared
    @State private var egetNamn = ""
    @State private var skriverEget = false
    @State private var gickInte = false
    @FocusState private var faltet: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                MonoLabel(text: "Spara resan?")
                Text("Resan slutade \(resa.slut.klockslag). Spara vägen du körde, så finns den under Favoriter. Den stannar i telefonen.")
                    .font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2)
            }
            .padding(.vertical, 16)

            if fav.rutter.count >= Rutter.max {
                Text("Du har redan fem resor. Ta bort en under Favoriter först.")
                    .font(Typo.sans(14)).foregroundStyle(Brand.yellow).padding(.bottom, 12)
            } else {
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 8) { namnknappar }
                    VStack(alignment: .leading, spacing: 8) { namnknappar }
                }
                if skriverEget {
                    HStack(spacing: 10) {
                        TextField("Eget namn", text: $egetNamn)
                            .font(Typo.sans(16)).foregroundStyle(Brand.text)
                            .focused($faltet).submitLabel(.done)
                            .onSubmit { spara(egetNamn) }
                        Button("Spara") { spara(egetNamn) }
                            .font(Typo.sans(15, .semibold)).foregroundStyle(Brand.yellow)
                            .disabled(egetNamn.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                    .padding(.horizontal, 14).frame(minHeight: 48)
                    .background(Brand.raisedSolid, in: RoundedRectangle(cornerRadius: 12))
                    .padding(.top, 10)
                } else {
                    MonoLink(title: "Eget namn") { skriverEget = true; faltet = true }
                }
                if gickInte {
                    Text("Resan kunde inte sparas. Försök igen.").font(Typo.sans(13)).foregroundStyle(Brand.yellow).padding(.top, 6)
                }
            }

            DashedDivider().padding(.top, 6)
            MonoLink(title: "Nej tack") { fav.avsta() }
        }
        .padding(.horizontal, 20)
        .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
    }

    @ViewBuilder private var namnknappar: some View {
        let c = Calendar.current.dateComponents([.day, .month], from: resa.slut)
        ForEach(Rutter.namnforslag(dag: c.day ?? 1, manad: c.month ?? 1), id: \.self) { namn in
            Button { spara(namn) } label: {
                Text(namn).font(Typo.sans(15, .medium)).foregroundStyle(Brand.text)
                    .padding(.horizontal, 16).frame(minHeight: 44)
                    .background(Brand.raisedSolid, in: Capsule())
            }
            .buttonStyle(PressScale())
            .accessibilityHint("Sparar resan med det här namnet")
        }
    }

    private func spara(_ namn: String) {
        switch fav.spara(namn: namn) {
        case .sparad: gickInte = false
        case .fullt, .fel: gickInte = true
        }
    }
}
