// Platsdelningens två skärmar (DECISIONS #917, #918): frågan, som täcker appen tills föraren svarat, och Din data under Integritet.
// Skärmarna: Design-duken "Halkvakt: platsdelning och erbjudanden, skärmar" (20/11).
import SwiftUI

/// Frågan för den som redan gått igenom introduktionen (befintliga förare vid uppdateringen): täcker appen tills föraren
/// svarat. Nya förare får sedan 28/11 en annan skärm i introduktionen (ForeResanFraga, DECISIONS #979); den här byts i nästa steg.
/// Inget skickas förrän steg två är klart, och inget av de två valen om erbjudanden är förvalt (DECISIONS #920).
struct PlatsdelningFraga: View {
    @State private var plats = Platsdelning.shared
    @State private var villDela = false
    @State private var erbjudanden: Bool?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Lockup().padding(.bottom, 28)
                if villDela {
                    PlatsErbjudandenInnehall(erbjudanden: $erbjudanden)
                    HStack {
                        Spacer()
                        YellowPill(title: "Fortsätt") { if let erbjudanden { plats.svara(ja: true, erbjudanden: erbjudanden) } }
                            .disabled(erbjudanden == nil).opacity(erbjudanden == nil ? 0.4 : 1)
                        Spacer()
                    }
                    .padding(.top, 32)
                    if erbjudanden == nil {
                        HStack { Spacer(); MonoLabel(text: "Välj ett av de två"); Spacer() }.padding(.top, 12)
                    }
                } else {
                    PlatsFraganInnehall(etikett: "Nytt i Halkvakt")
                    HStack { Spacer(); YellowPill(title: "Ja, dela min kommun") { villDela = true }; Spacer() }
                        .padding(.top, 32)
                    HStack { Spacer(); MonoLink(title: "Inte nu") { plats.svara(ja: false) }; Spacer() }
                        .padding(.top, 12)
                }
            }
            .padding(.horizontal, 28).padding(.top, 32).padding(.bottom, 40)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .scrollIndicators(.hidden)
        .background(Brand.bg.ignoresSafeArea())
        .accessibilityAddTraits(.isModal)
    }
}

/// Steg ett: vad som delas och vad som aldrig delas. Knapparna står hos den som visar innehållet.
struct PlatsFraganInnehall: View {
    /// Raden över rubriken; introduktionen har sin egen stegrad och visar ingen.
    let etikett: String?

    var body: some View {
        if let etikett { MonoLabel(text: etikett, size: 11).padding(.bottom, 12) }
        Text("Vill du ha en varning innan du kör?")
            .font(Typo.sans(32, .semibold)).tracking(-0.8).foregroundStyle(Brand.text)
        Text("Då behöver vi veta vilken kommun du är i, så att vi kan säga till när det är halt där.")
            .font(Typo.sans(15)).lineSpacing(3).foregroundStyle(Brand.text2).padding(.top, 12)
        RowPanel {
            ReceiptRow(label: "Vi sparar", value: "Din kommun, senaste läget")
            ReceiptRow(label: "Aldrig", value: "Var du kör, dina resor")
            ReceiptRow(label: "Kopplas till", value: "Ett slumpat nummer")
            ReceiptRow(label: "Tas bort", value: "När du vill, under Integritet", divider: false)
        }
        .padding(.top, 24)
        Text(Platsord.nyttLofte).font(Typo.sans(15, .medium)).foregroundStyle(Brand.text).padding(.top, 20)
        Text("Säger du nej fungerar Halkvakt som i dag. Testbygge: notiserna är inte påslagna än.")
            .font(Typo.sans(13)).lineSpacing(3).foregroundStyle(Brand.dim).padding(.top, 10)
    }
}

/// Steg två: valet om erbjudanden. Ja står först, och inget är valt från början.
struct PlatsErbjudandenInnehall: View {
    @Binding var erbjudanden: Bool?

    var body: some View {
        MonoLabel(text: "Valfritt", size: 11)
        Text("Vill du ha erbjudanden nära dig?")
            .font(Typo.sans(32, .semibold)).tracking(-0.8).foregroundStyle(Brand.text).padding(.top, 12)
        Text("Rabatter och tips från våra partner, utvalda för där du bor.")
            .font(Typo.sans(15)).lineSpacing(3).foregroundStyle(Brand.text2).padding(.top, 12)
        VStack(spacing: 10) {
            PlatsVal(titel: "Ja tack", text: "Aldrig när du kör.", vald: erbjudanden == true) { erbjudanden = true }
            PlatsVal(titel: "Nej tack", text: "Bara varningar", vald: erbjudanden == false) { erbjudanden = false }
        }
        .padding(.top, 24)
        Text("Våra partner får aldrig veta vem eller var du är. Du kan ändra dig under Integritet.")
            .font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2).padding(.top, 18)
    }
}

/// Ett val av två: hela rutan är knappen, grön prick på det valda.
private struct PlatsVal: View {
    let titel: String
    let text: String
    let vald: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Circle().fill(vald ? Brand.green : Brand.trackOff).frame(width: 12, height: 12)
                VStack(alignment: .leading, spacing: 3) {
                    Text(titel).font(Typo.sans(16, .medium)).foregroundStyle(vald ? Brand.text : Brand.text2)
                    Text(text).font(Typo.sans(13)).foregroundStyle(Brand.dim)
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 16).padding(.vertical, 14)
            .frame(minHeight: 68)
            .background(Brand.panel, in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(vald ? Brand.green : Brand.line, lineWidth: 1))
        }
        .buttonStyle(PressScale())
        .accessibilityAddTraits(vald ? .isSelected : [])
    }
}

/// Din data under Integritet: allt som sparats om telefonen, valet om erbjudanden och Radera min data.
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
                    ReceiptRow(label: "Notiser", value: plats.notisadress == nil ? "Ingen adress sparad" : "Adress sparad")
                    GreenToggleRow(title: "Erbjudanden", sub: "Från våra partner. Aldrig när du kör.", isOn: $plats.erbjudanden)
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
                MonoLink(title: "Visa frågan igen") { plats.fragaIgen() }.padding(.top, 8)
            }
        }
    }
}
