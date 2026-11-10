// Facitknapparna på hemskärmen (S4, DECISIONS #210). LastSaidCard var död kod sedan skinnet v3 — hemskärmen
// visar "Senast sagt" som en rad i VaktenView — så knapparna sitter här, under den raden. Bara betatestare,
// bara på en varning som bär ett id. Hemskärmen visas när vakten är av = bilen står stilla ⇒ svaret skickas direkt.
import SwiftUI

struct FacitRow: View {
    let id: String
    let at: Date
    let text: String
    @State private var prefs = Prefs.shared

    var body: some View {
        let svar = Facit.answerFor(prefs.facit, id: id, t: at)
        VStack(alignment: .leading, spacing: 6) {
            // Kort #998: knapparna står aldrig utan sin varning. Varningen kan vara upp till 47 timmar gammal och höra till en
            // tidigare tur, medan raden ovanför säger INGA VARNINGAR SENASTE TUREN (Axels skärminspelning 10/11).
            Text("SENAST SAGT · \(Calendar.current.isDateInToday(at) ? at.klockslag : at.formatted(.dateTime.day().month(.abbreviated).hour().minute().locale(Locale(identifier: "sv_SE"))).uppercased())")
                .font(Typo.mono(10)).tracking(1.4).foregroundStyle(Brand.faint)
            Text("”\(text)”").font(Typo.sans(15)).italic().foregroundStyle(Brand.text)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 8) {
                FacitButton(title: "Stämde", selected: svar == true) { svara(true) }
                FacitButton(title: "Stämde inte", selected: svar == false) { svara(false) }
            }
            Text(svar == nil ? "Stämde det? Svaret skickas direkt." : "Tack.")
                .font(Typo.sans(12)).foregroundStyle(Brand.faint)
            // Bara en sändning yngre än varningen — en äldre rad är ett kvitto på något annat (kort #279).
            if let s = prefs.facitStatus, (prefs.facitStatusAt ?? .distantPast) >= at {
                Text(s).font(Typo.mono(11)).foregroundStyle(s.hasPrefix("Skickat") ? Brand.green : Brand.yellow)
            }
        }
    }

    private func svara(_ svar: Bool) {
        prefs.facit = Facit.answer(prefs.facit, id: id, t: at, svar: svar)
        if !GuardManager.shared.running { Task { _ = await FacitSender.flush() } }
    }
}
