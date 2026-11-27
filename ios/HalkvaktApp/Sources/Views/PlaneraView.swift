// PLANERA EN RESA (kort #659, DECISIONS #870): de sparade resorna och en sökruta för en ny adress. En sparad resa öppnar
// sin rapport som i fliken Favoriter. En sökt adress går till Resplan, som frågar Apple om vägen dit.
import SwiftUI
import HalkvaktEngine

struct PlaneraView: View {
    @State private var plan = Resplan.shared
    @State private var fav = Favoriter.shared
    @State private var sok = ""
    @State private var visaResan = false
    @FocusState private var fokus: Bool
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Button { dismiss() } label: {
                    Text("← VAKTEN").font(Typo.mono(11)).tracking(1.5).foregroundStyle(Brand.text).frame(height: 44)
                }
                Text("Vart ska du?").font(Typo.sans(32, .semibold)).tracking(-0.8).foregroundStyle(Brand.text).padding(.top, 8)
                    .accessibilityAddTraits(.isHeader)
                Text("Se läget längs vägen innan du åker.").font(Typo.sans(15)).foregroundStyle(Brand.text2).padding(.top, 10)

                TextField("Sök adress eller ort", text: $sok)
                    .font(Typo.sans(16)).foregroundStyle(Brand.text)
                    .focused($fokus)
                    .submitLabel(.search)
                    .onSubmit { if let forst = plan.forslag.first { valj(forst) } }
                    .autocorrectionDisabled()
                    .padding(.horizontal, 20).frame(height: 56)
                    .background(Brand.panel, in: Capsule())
                    .overlay(Capsule().strokeBorder(Brand.trackOff, lineWidth: 1))
                    .padding(.top, 24)

                switch plan.lage {
                case .vilar:
                    EmptyView()
                case .soker:
                    Text("Räknar ut vägen …").font(Typo.sans(15)).foregroundStyle(Brand.text2).padding(.top, 14).padding(.horizontal, 4)
                case .fel(let text):
                    Text(text).font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.yellow).padding(.top, 14).padding(.horizontal, 4)
                }

                // En ny sökning ersätter resan som redan är planerad, och dess påminnelse: sagt innan föraren söker.
                if let kommande = plan.kommande {
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
                            forslagsRad(f, divider: f.id < plan.forslag.count - 1)
                        }
                    }
                    .padding(.top, 14)
                } else if !fav.rutter.isEmpty {
                    MonoLabel(text: "Dina resor").padding(.top, 28).padding(.bottom, 10).padding(.horizontal, 4)
                    RowPanel {
                        ForEach(Array(fav.rutter.enumerated()), id: \.element.id) { i, r in
                            sparadRad(r, divider: i < fav.rutter.count - 1)
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 6) {
                    MonoLabel(text: "När du söker")
                    Text("Apple slår upp adressen och räknar ut vägen, och får då veta var du är och vart du ska. Halkvakt får aldrig veta det. Resan sparas inte.")
                        .font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2)
                }
                .padding(.top, 24).padding(.horizontal, 4)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 24).padding(.top, 8).padding(.bottom, 150)
        }
        .scrollIndicators(.hidden)
        .scrollDismissesKeyboard(.interactively)
        .background(Brand.bg)
        .toolbar(.hidden, for: .navigationBar)
        .onChange(of: sok) { _, ny in plan.sok(ny) }
        .navigationDestination(isPresented: $visaResan) { PlaneradResaView() }
        .navigationDestination(for: String.self) { id in RapportView(ruttId: id, tillbaka: "Planera") }
    }

    private func valj(_ f: Resplan.Forslag) {
        guard plan.lage != .soker else { return }
        fokus = false
        Task { if await plan.planera(f) { sok = ""; visaResan = true } }
    }

    private func forslagsRad(_ f: Resplan.Forslag, divider: Bool) -> some View {
        VStack(spacing: 0) {
            Button {
                valj(f)
            } label: {
                VStack(alignment: .leading, spacing: 3) {
                    Text(f.titel).font(Typo.sans(16, .medium)).foregroundStyle(Brand.text)
                    if !f.under.isEmpty { Text(f.under).font(Typo.sans(13)).foregroundStyle(Brand.dim) }
                }
                .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
                .contentShape(Rectangle())
            }
            .disabled(plan.lage == .soker)
            .accessibilityHint("Räknar ut vägen dit")
            if divider { DashedDivider() }
        }
    }

    private func sparadRad(_ r: SparadRutt, divider: Bool) -> some View {
        VStack(spacing: 0) {
            NavigationLink(value: r.id) {
                HStack(spacing: 12) {
                    Text(r.namn).font(Typo.sans(16, .medium)).foregroundStyle(Brand.text)
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.right").font(.system(size: 13, weight: .semibold)).foregroundStyle(Brand.dim)
                }
                .frame(minHeight: 52)
                .contentShape(Rectangle())
            }
            .accessibilityHint("Öppnar rapporten för resan")
            if divider { DashedDivider() }
        }
    }
}
