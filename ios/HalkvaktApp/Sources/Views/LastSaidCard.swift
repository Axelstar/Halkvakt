// DÖD KOD sedan skinnet v3 (2/9): ingen vy använder LastSaidCard — hemskärmen (VaktenView) visar "Senast sagt"
// som en rad, och facitknapparna sitter i FacitRow (DECISIONS #210). Kvar tills ett eget kort tar bort den.
// #24 "Senast sagt" på hemskärmen. Spegel av Androids LastSaidCard: förra körningens
// sista replik med datum och tid, ur Prefs så den överlever omstart. Tomt läge säger
// vad tystnaden betyder — tystnad är en funktion, inte ett fel.
import SwiftUI

struct LastSaidCard: View {
    @State private var prefs = Prefs.shared

    var body: some View {
        Panel {
            HStack {
                SectionHeader(text: "Senast sagt")
                Spacer()
                if let at = prefs.lastSaidAt {
                    Text(at.formatted(.dateTime.day().month(.abbreviated).hour().minute()))
                        .font(Typo.sans(12))
                        .foregroundStyle(Brand.faint)
                }
            }
            if let at = prefs.lastAutoWakeAt {
                Label {
                    Text("Vaknade själv \(at.formatted(.dateTime.day().month(.abbreviated).hour().minute()))" +
                         (prefs.lastAutoWakeMinutes > 0 ? " · körde \(prefs.lastAutoWakeMinutes) min" : ""))
                        .font(Typo.sans(13)).foregroundStyle(Brand.green)
                } icon: { Image(systemName: "car.fill").foregroundStyle(Brand.green) }
            }
            if let text = prefs.lastSaidText {
                Text("”\(text)”")
                    .font(Typo.sans(15).italic())
                    .foregroundStyle(Brand.text)
            } else {
                Text("Rösten har inte behövt säga något än.")
                    .font(Typo.sans(15).italic())
                    .foregroundStyle(Brand.dim)
            }
            // S4 (Axels form, DECISIONS #196): två knappar, ingen fritext. Bara betatestare, bara när
            // varningen bär ett id. Svaret loggas lokalt och skickas när bilen står stilla.
            if prefs.facitOn, prefs.lastSaidText != nil, let id = prefs.lastSaidId, let at = prefs.lastSaidAt {
                let svar = Facit.answerFor(prefs.facit, id: id, t: at)
                HStack(spacing: 8) {
                    FacitButton(title: "Stämde", selected: svar == true) { svara(id: id, at: at, true) }
                    FacitButton(title: "Stämde inte", selected: svar == false) { svara(id: id, at: at, false) }
                }
                Text(svar == nil ? "Stämde det? Svaret skickas när bilen står stilla." : "Tack — skickas när bilen står stilla.")
                    .font(Typo.sans(12)).foregroundStyle(Brand.faint)
                if let s = prefs.facitStatus {
                    Text(s).font(Typo.mono(11)).foregroundStyle(s.hasPrefix("Skickat") ? Brand.green : Brand.yellow)
                }
            }
        }
        // .contain i stället för .combine (16/9): med knappar i kortet måste VoiceOver kunna trycka dem var för sig.
        .accessibilityElement(children: .contain)
    }

    /// Vakten av = bilen står stilla: skicka direkt (DECISIONS #208). Under körning väntar svaret på
    /// stillastående i GuardManager, som förut.
    private func svara(id: String, at: Date, _ svar: Bool) {
        prefs.facit = Facit.answer(prefs.facit, id: id, t: at, svar: svar)
        if !GuardManager.shared.running { Task { _ = await FacitSender.flush() } }
    }
}
