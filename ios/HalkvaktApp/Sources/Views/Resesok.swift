// SÖKRUTAN I FLIKEN RESOR (kort #659, DECISIONS #870, #982): föraren söker en adress, och ett förslag går till Resplan, som frågar
// Apple om vägen dit. Förut en egen skärm, Planera en resa; nu överst i fliken, över de sparade resorna.
import SwiftUI

struct Resesok: View {
    /// Sant när en väg är uträknad och resans skärm ska visas.
    @Binding var visaResan: Bool
    /// Räknas upp när startsidan ber om sökrutan: markören ställs i fältet.
    let fokusera: Int
    @State private var plan = Resplan.shared
    @State private var sok = ""
    @FocusState private var fokus: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            TextField("Sök adress eller ort", text: $sok)
                .font(Typo.sans(16)).foregroundStyle(Brand.text)
                .focused($fokus)
                .submitLabel(.search)
                .onSubmit { if let forst = plan.forslag.first { valj(forst) } }
                .autocorrectionDisabled()
                .padding(.horizontal, 20).frame(height: 56)
                .background(Brand.panel, in: Capsule())
                .overlay(Capsule().strokeBorder(Brand.trackOff, lineWidth: 1))

            switch plan.lage {
            case .vilar:
                EmptyView()
            case .soker:
                Text("Räknar ut vägen …").font(Typo.sans(15)).foregroundStyle(Brand.text2).padding(.top, 14).padding(.horizontal, 4)
            case .fel(let text):
                Text(text).font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.yellow).padding(.top, 14).padding(.horizontal, 4)
            }

            // En ny sökning ersätter resan som redan är planerad, och dess påminnelse: sagt innan föraren söker.
            if let kommande = plan.kommande, fokus || !sok.isEmpty {
                Text("Du har en planerad resa till \(kommande.mal). En ny sökning ersätter den och tar bort påminnelsen.")
                    .font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2).padding(.top, 14).padding(.horizontal, 4)
            }

            if plan.forslag.isEmpty, plan.soksvar != .inget {
                Text(plan.soksvar == .fel ? "Sökningen gick inte. Kontrollera nätet och försök igen."
                                          : "Inga träffar. Prova en annan stavning eller en ort i närheten.")
                    .font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.yellow).padding(.top, 14).padding(.horizontal, 4)
            }

            if !plan.forslag.isEmpty {
                RowPanel {
                    ForEach(plan.forslag) { f in
                        ForslagsRad(forslag: f, divider: f.id < plan.forslag.count - 1, upptagen: plan.lage == .soker) { valj(f) }
                    }
                }
                .padding(.top, 14)
            }
        }
        .onChange(of: sok) { _, ny in plan.sok(ny) }
        .onChange(of: fokusera) { _, _ in fokus = true }
    }

    private func valj(_ f: Resplan.Forslag) {
        guard plan.lage != .soker else { return }
        fokus = false
        Task { if await plan.planera(f) { sok = ""; visaResan = true } }
    }
}

/// Ett förslag i söklistan: namnet och raden under. Hela raden är knappen.
private struct ForslagsRad: View {
    let forslag: Resplan.Forslag
    let divider: Bool
    let upptagen: Bool
    let action: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Button(action: action) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(forslag.titel).font(Typo.sans(16, .medium)).foregroundStyle(Brand.text)
                    if !forslag.under.isEmpty { Text(forslag.under).font(Typo.sans(13)).foregroundStyle(Brand.dim) }
                }
                .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
                .contentShape(Rectangle())
            }
            .disabled(upptagen)
            .accessibilityHint("Räknar ut vägen dit")
            if divider { DashedDivider() }
        }
    }
}
