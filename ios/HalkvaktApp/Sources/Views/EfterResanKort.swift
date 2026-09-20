// EFTER RESAN — kortet överst på Redo. (kort #203, Axels svar på §8 20/9). Spegel av Androids
// EfterResanKort i ui/App.kt: resans obesvarade varningar, en rad var med KLOCKSLAG och TEXT, så att
// föraren kan peka ut vilken som inte stämde. Notisens "Ja, alla stämde" räcker för den som bara
// vill kvittera; det här kortet finns för avvikelsen.
//
// Tystnad skickar ingenting. Det står på kortet, med samma ord som på Android.
import SwiftUI

struct EfterResanKort: View {
    let varningar: [AlertEntry]
    let sedan: Date
    @State private var prefs = Prefs.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            SectionHeader(text: "Efter resan")
            Text(Resan.fraga(varningar.count))
                .font(Typo.sans(19, .bold))
                .lineSpacing(5)
                .foregroundStyle(Brand.text)
                .padding(.top, 6)

            ForEach(varningar, id: \.self) { e in
                let svar = Facit.answerFor(prefs.facit, id: e.id, t: e.t)
                VStack(alignment: .leading, spacing: 6) {
                    HStack(alignment: .top, spacing: 10) {
                        Text(e.t.formatted(.dateTime.hour().minute()))
                            .font(Typo.mono(12))
                            .foregroundStyle(Brand.dim)
                        Text("”\(e.text)”")
                            .font(Typo.sans(14))
                            .italic()
                            .lineSpacing(5)
                            .foregroundStyle(svar == nil ? Brand.text : Brand.dim)
                        Spacer(minLength: 0)
                    }
                    HStack(spacing: 8) {
                        FacitButton(title: "Stämde", selected: svar == true) { svara(e, true) }
                        FacitButton(title: "Stämde inte", selected: svar == false) { svara(e, false) }
                    }
                }
                .padding(.top, 12)
            }

            Button { svaraAlla() } label: {
                Text("Ja, alla stämde")
                    .font(Typo.sans(17, .bold))
                    .foregroundStyle(Brand.bg)
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .background(Brand.yellow, in: Capsule())
            }
            .padding(.top, 16)

            Text("Svarar du inte skickas ingenting — tystnad räknas aldrig som ja.")
                .font(Typo.sans(11))
                .foregroundStyle(Brand.dim)
                .padding(.top, 8)

            if let s = prefs.facitStatus {
                Text(s)
                    .font(Typo.mono(11))
                    .foregroundStyle(s.hasPrefix("Skickat") ? Brand.green : Brand.yellow)
                    .padding(.top, 4)
            }
        }
        .padding(18)
        .background(Brand.panel, in: RoundedRectangle(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Brand.yellow.opacity(0.45), lineWidth: 1))
    }

    private func svara(_ e: AlertEntry, _ svar: Bool) {
        prefs.facit = Facit.answer(prefs.facit, id: e.id, t: e.t, svar: svar)
        skicka()
    }

    private func svaraAlla() {
        let obes = Resan.obesvarade(prefs.history, prefs.facit, sedan: sedan)
        guard !obes.isEmpty else { return }
        prefs.facit = Resan.svaraAlla(prefs.facit, obes, svar: true)
        EfterResanNotis.shared.ta_bort()   // frågan är besvarad; notisen ska inte ligga kvar på låsskärmen
        skicka()
    }

    /// Kortet visas bara när vakten är av = bilen står stilla ⇒ svaret får gå direkt (DECISIONS #208).
    private func skicka() {
        if !GuardManager.shared.running { Task { _ = await FacitSender.flush() } }
    }
}
