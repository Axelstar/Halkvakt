// EFTER RESAN — kortet överst på Redo. (kort #203, Axels svar på §8 20/9). Spegel av Androids
// EfterResanKort i ui/App.kt: resans obesvarade varningar, en rad var med KLOCKSLAG och TEXT, så att
// föraren kan peka ut vilken som inte stämde. Notisens "Ja, alla stämde" räcker för den som bara
// vill kvittera; det här kortet finns för avvikelsen.
//
// Lager 2 (DECISIONS #379): resans MISSAR står här också — ordet i bilen var ett tryck eller "appen missade", tanken kommer
// här. Föraren väljer Halka / Vatten / Vilt / Olycka / Annat, och först då skickas missen.
//
// Tystnad skickar ingenting. Det står på kortet, med samma ord som på Android.
import SwiftUI

struct EfterResanKort: View {
    let varningar: [AlertEntry]
    var missar: [MissEntry] = []
    let sedan: Date
    @State private var prefs = Prefs.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            SectionHeader(text: "Efter resan")
            Text(varningar.isEmpty ? Missar.fraga(missar.count) : Resan.fraga(varningar.count))
                .font(Typo.sans(19, .bold))
                .lineSpacing(5)
                .foregroundStyle(Brand.text)
                .padding(.top, 6)

            ForEach(varningar, id: \.self) { e in
                let svar = Facit.answerFor(prefs.facit, id: e.id, t: e.t)
                VStack(alignment: .leading, spacing: 6) {
                    HStack(alignment: .top, spacing: 10) {
                        Text(e.t.klockslag)
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

            ForEach(missar, id: \.self) { m in
                let rad = prefs.missar.first { $0.t == m.t }
                let vald = rad?.vad
                VStack(alignment: .leading, spacing: 6) {
                    HStack(alignment: .top, spacing: 10) {
                        Text(m.t.klockslag)
                            .font(Typo.mono(12))
                            .foregroundStyle(Brand.dim)
                        Text("Du markerade: appen missade — vad?")
                            .font(Typo.sans(14))
                            .foregroundStyle(vald == nil ? Brand.text : Brand.dim)
                        Spacer(minLength: 0)
                        // Läget PER RAD (Bengts provresa 28/9, `docs/TILL-AXEL-BYGGE-19.md` p. 3): en vald miss säger
                        // själv att den gått — en rad utan val har aldrig "Skickat" under sig.
                        if rad?.sent == true {
                            Text("Skickad").font(Typo.mono(11)).foregroundStyle(Brand.green)
                        }
                    }
                    // Två per rad, som Android — tre fick inte plats på en smal telefon (fotostudion 26/9).
                    ForEach(stride(from: 0, to: Missar.vad.count, by: 2).map { Array(Missar.vad[$0..<min($0 + 2, Missar.vad.count)]) }, id: \.self) { rad in
                        HStack(spacing: 8) {
                            ForEach(rad, id: \.self) { v in
                                FacitButton(title: v.prefix(1).uppercased() + v.dropFirst(), selected: vald == v) { valj(m, v) }
                            }
                        }
                    }
                }
                .padding(.top, 12)
            }

            if !varningar.isEmpty {
                Button { svaraAlla() } label: {
                    Text("Ja, alla stämde")
                        .font(Typo.sans(17, .bold))
                        .foregroundStyle(Brand.bg)
                        .frame(maxWidth: .infinity, minHeight: 52)
                        .background(Brand.yellow, in: Capsule())
                }
                .padding(.top, 16)
            }

            Text("Svarar du inte skickas ingenting — tystnad räknas aldrig som ja.")
                .font(Typo.sans(11))
                .foregroundStyle(Brand.dim)
                .padding(.top, 8)

            // Den gemensamma statusraden bara vid FEL, och bara den här resans. Ett "Skickat 13:52 (1 miss)" under en
            // obesvarad rad lästes som att raden gått (Bengts provresa 28/9), och raden överlever omstart, så gårdagens
            // "Skickat 22:00 (1 svar)" stod under dagens varningar (Axels skärmbild 1/10, kort #279). Besvarade varningar
            // försvinner ur kortet, valda missar säger "Skickad" själva — lyckade sändningar behöver ingen rad här.
            if let s = prefs.facitStatus, !s.hasPrefix("Skickat"), (prefs.facitStatusAt ?? .distantPast) >= sedan {
                Text(s)
                    .font(Typo.mono(11))
                    .foregroundStyle(Brand.yellow)
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

    private func valj(_ m: MissEntry, _ v: String) {
        prefs.missar = Missar.valj(prefs.missar, t: m.t, vad: v)
        skicka()
    }

    /// Kortet visas bara när vakten är av = bilen står stilla ⇒ svaret får gå direkt (DECISIONS #208).
    private func skicka() {
        if !GuardManager.shared.running { Task { _ = await FacitSender.flush() } }
    }
}
