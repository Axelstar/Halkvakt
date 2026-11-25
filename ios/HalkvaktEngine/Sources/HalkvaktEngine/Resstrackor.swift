// RESANS STRÄCKOR (DECISIONS #930, Förslag A #933): en planerad resa delad i sträckor i den ordning föraren kör, för skärmen
// Planerad resa.
//
// Regeln: resan bryts vid varje större ort som ligger längs vägen. Sträckorna slås inte ihop (Axel 20/11: en enda hal sträcka
// från Helsingborg till Östermalm sade för lite). Läget är det rapporten redan har räknat fram, ingenting nytt:
//   halt      minst en halksträcka (Trafikverkets väglag) på sträckan
//   frysrisk  ingen halka, men minst en station eller bro med frysrisk enligt röstens regel
//   lugnt     ingetdera
// Sträckan säger hur många ställen halkan gäller och vilken sorts halka det är, med Trafikverkets ord skrivna som vanlig svenska.
// Tiden vid en sträcka är avresan plus sträckans andel av Apples restid. Det är en klocktid, ingen prognos: väglaget på raden
// är läget nu, inte läget då.
//
// Bara iPhone än (Planera resa, kort #659). Ren kod, prövad i ResstrackorTests.
import Foundation

public struct Ort: Equatable, Sendable {
    public let namn: String
    public let lon: Double, lat: Double
    public init(namn: String, lon: Double, lat: Double) { self.namn = namn; self.lon = lon; self.lat = lat }
}

public enum StrackLage: Int, Comparable, Sendable {
    case lugnt = 0, frysrisk, halt
    public static func < (a: StrackLage, b: StrackLage) -> Bool { a.rawValue < b.rawValue }
}

public struct Resstracka: Equatable {
    /// Orten sträckan börjar vid, nil för resans start när ingen ort ligger där.
    public let fran: String?
    public let franM: Int, tillM: Int
    public let lage: StrackLage
    /// Rapportens rader på sträckan, i körordning. SMHI:s varningar gäller hela resan och står inte här.
    public let rader: [RapportRad]
}

public enum Resstrackor {
    /// En ort ligger längs vägen när den är närmare vägen än så.
    public static let ortInomM = 5_000.0
    /// En ort närmare starten eller målet än så är ingen brytpunkt: den är starten eller målet.
    public static let ortKantM = 15_000.0
    /// Två brytpunkter närmare varandra än så blir en: den första i körordning.
    public static let ortGlesM = 20_000.0

    /// Vägens längd fram till varje punkt, i meter.
    public static func kumulativ(_ rutt: [[Double]]) -> [Double] {
        var kum = [0.0]
        for i in stride(from: 1, to: rutt.count, by: 1) {
            kum.append(kum[i - 1] + Geo.haversineM(rutt[i - 1][0], rutt[i - 1][1], rutt[i][0], rutt[i][1]))
        }
        return kum
    }

    /// Orterna längs vägen: (namn, meter in på resan), i körordning. Vägens punkter ligger tätt, så närmaste punkt räcker.
    public static func orterLangs(_ rutt: [[Double]], kum: [Double], orter: [Ort]) -> [(namn: String, m: Double)] {
        guard rutt.count >= 2 else { return [] }
        var ut: [(namn: String, m: Double)] = []
        for o in orter {
            var bast = Double.infinity, vid = 0
            for (i, p) in rutt.enumerated() {
                let d = Geo.haversineM(o.lon, o.lat, p[0], p[1])
                if d < bast { bast = d; vid = i }
            }
            if bast <= ortInomM { ut.append((o.namn, kum[vid])) }
        }
        return ut.sorted { $0.m < $1.m }
    }

    /// Resans sträckor. `rader` är resans rapport åt det håll föraren kör.
    public static func strackor(_ rutt: [[Double]], rader: [RapportRad], orter: [Ort]) -> [Resstracka] {
        let kum = kumulativ(rutt)
        guard let total = kum.last, total > 0 else { return [] }
        let langs = orterLangs(rutt, kum: kum, orter: orter)
        let start = langs.first { $0.m < ortKantM }?.namn

        var brott: [(namn: String?, m: Double)] = [(start, 0)]
        for o in langs where o.m >= ortKantM && o.m <= total - ortKantM && o.m - brott[brott.count - 1].m >= ortGlesM {
            brott.append((o.namn, o.m))
        }

        let pa = rader.filter { $0.slag != .smhi }
        var ut: [Resstracka] = []
        for (i, b) in brott.enumerated() {
            let till = i + 1 < brott.count ? brott[i + 1].m : total
            let sista = i + 1 == brott.count
            let mina = pa.filter { Double($0.langsM) >= b.m && (sista || Double($0.langsM) < till) }
                .enumerated().sorted { $0.element.langsM != $1.element.langsM ? $0.element.langsM < $1.element.langsM : $0.offset < $1.offset }
                .map(\.element)
            let lage: StrackLage = mina.contains { $0.slag == .halka } ? .halt : mina.contains { $0.slag == .frysrisk } ? .frysrisk : .lugnt
            ut.append(Resstracka(fran: b.namn, franM: Int(b.m.rounded()), tillM: Int(till.rounded()), lage: lage, rader: mina))
        }
        return ut
    }

    /// Klocktiden vid en punkt på resan: avresan plus punktens andel av restiden. nil utan restid.
    public static func tidVid(_ m: Int, totalM: Int, restidS: Double?, avresa: Date) -> Date? {
        guard let restidS, restidS > 0, totalM > 0 else { return nil }
        return avresa.addingTimeInterval(restidS * Double(min(max(m, 0), totalM)) / Double(totalM))
    }

    /// Punkten `m` meter in på vägen.
    public static func punkt(_ rutt: [[Double]], kum: [Double], m: Double) -> [Double]? {
        guard rutt.count == kum.count, !rutt.isEmpty else { return nil }
        guard let i = kum.firstIndex(where: { $0 >= m }) else { return rutt.last }
        guard i > 0, kum[i] > kum[i - 1] else { return rutt[i] }
        let t = (m - kum[i - 1]) / (kum[i] - kum[i - 1])
        return [rutt[i - 1][0] + t * (rutt[i][0] - rutt[i - 1][0]), rutt[i - 1][1] + t * (rutt[i][1] - rutt[i - 1][1])]
    }

    // MARK: - Texterna

    private static func stallen(_ n: Int) -> String { n == 1 ? "1 ställe" : "\(n) ställen" }

    /// Antalet halksträckor på sträckan, eller platserna med frysrisk när ingen halka finns.
    public static func antal(_ s: Resstracka) -> Int {
        let halka = s.rader.filter { $0.slag == .halka }.count
        return halka > 0 ? halka : s.rader.filter { $0.slag == .frysrisk }.count
    }

    /// En halkrad som bara är risk för halka: kod 2 utan halkord, som rösten (DECISIONS #963, #964).
    private static func risk(_ r: RapportRad) -> Bool { r.slag == .halka && r.rubrik.hasPrefix("Halkrisk") }

    /// "Halt på 1 ställe", "Halkrisk på 3 ställen" eller "Halt på 1 ställe, halkrisk på 3 ställen".
    private static func halkdelar(_ rader: [RapportRad]) -> String {
        let halka = rader.filter { $0.slag == .halka }
        let risker = halka.filter(risk).count, halt = halka.count - risker
        if risker == 0 { return "Halt på \(stallen(halt))" }
        if halt == 0 { return "Halkrisk på \(stallen(risker))" }
        return "Halt på \(stallen(halt)), halkrisk på \(stallen(risker))"
    }

    /// Sträckans rubrik: "Halt på 4 ställen", "Halkrisk på 2 ställen", "Frysrisk på 1 ställe" eller "Lugnt".
    public static func rubrik(_ s: Resstracka) -> String {
        switch s.lage {
        case .halt: return halkdelar(s.rader)
        case .frysrisk: return "Frysrisk på \(stallen(antal(s)))"
        case .lugnt: return "Lugnt"
        }
    }

    /// Etiketten till höger: antalet ställen för halkan, annars läget.
    public static func tagg(_ s: Resstracka) -> String {
        switch s.lage {
        case .halt: return stallen(antal(s)).uppercased()
        case .frysrisk: return "FRYSRISK"
        case .lugnt: return "LUGNT"
        }
    }

    /// Trafikverkets ord för väglaget som vanlig svenska. Nyckeln är ordet med små bokstäver och utan "fläckvis".
    private static let vaglagsord: [String: (ordning: Int, text: String)] = [
        "is": (0, "is"), "is med bart i hjulspår": (1, "is med bart i hjulspåren"), "packad snö": (2, "packad snö"),
        "moddig vägbana": (3, "snömodd"), "moddsträngar": (4, "moddsträngar"), "lössnö": (5, "lössnö"),
    ]
    /// Ord som inte är halka i sig: de står med när en sträcka öppnas, men inte i sammanfattningen.
    private static let bredvidord: [String: String] = ["våt": "vått", "torrt": "torrt"]
    private static let utanOrd = "halka rapporterad på sträckan"
    private static let utanOrdRisk = "risk för halka rapporterad på sträckan"

    private static func ord(_ text: String) -> [(flackvis: Bool, ord: String)] {
        text.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces).lowercased() }.filter { !$0.isEmpty }.map {
            $0.hasPrefix("fläckvis ") ? (true, String($0.dropFirst("fläckvis ".count))) : (false, $0)
        }
    }

    /// En halkrads text för den öppnade sträckan: "fläckvis Is, Våt" blir "fläckvis is, vått".
    public static func rentVaglag(_ text: String) -> String {
        let delar = ord(text).map { o in "\(o.flackvis ? "fläckvis " : "")\(vaglagsord[o.ord]?.text ?? bredvidord[o.ord] ?? o.ord)" }
        return delar.isEmpty ? utanOrd : delar.joined(separator: ", ")
    }

    /// Sorterna av halka på sträckan i en mening: "Fläckvis is och moddsträngar." Ett ord är fläckvis bara när varje rad säger det.
    /// Säger raderna bara vått står det: omkring var tredje sträcka i Trafikverkets väglag är besvärlig (kod 2) med bara det
    /// ordet (mätt i live.json 21/11, 111 av 367, DECISIONS #934).
    static func sorter(_ rader: [RapportRad]) -> String {
        var funna: [String: (ordning: Int, text: String, flackvis: Bool)] = [:]
        for o in rader.filter({ $0.slag == .halka }).flatMap({ ord($0.text) }) where bredvidord[o.ord] == nil && o.ord != utanOrd && o.ord != utanOrdRisk {
            let k = vaglagsord[o.ord] ?? (9, o.ord)
            funna[k.text] = (k.ordning, k.text, o.flackvis && (funna[k.text]?.flackvis ?? true))
        }
        // Is med bart i hjulspåren är också is: står båda räcker ordet is.
        if funna["is"] != nil { funna["is med bart i hjulspåren"] = nil }
        let delar = funna.values.sorted { ($0.ordning, $0.text) < ($1.ordning, $1.text) }.map { "\($0.flackvis ? "fläckvis " : "")\($0.text)" }
        guard let sista = delar.last else {
            let vatt = rader.filter { $0.slag == .halka }.flatMap { ord($0.text) }.filter { $0.ord == "våt" }
            guard !vatt.isEmpty else {
                return rader.filter { $0.slag == .halka }.allSatisfy(risk) ? "Risk för halka rapporterad." : "Halt väglag rapporterat."
            }
            return "\(vatt.allSatisfy(\.flackvis) ? "Fläckvis vått" : "Vått"). Besvärligt väglag enligt Trafikverket."
        }
        let mening = delar.count == 1 ? sista : delar.dropLast().joined(separator: ", ") + " och " + sista
        return mening.prefix(1).uppercased() + mening.dropFirst() + "."
    }

    /// "Frysrisk vid en mätstation.", "Frysrisk vid 2 mätstationer och på en bro."
    static func frysrisk(_ rader: [RapportRad]) -> String? {
        let alla = rader.filter { $0.slag == .frysrisk }
        let broar = alla.filter { $0.id.hasPrefix("bro:") }.count, stationer = alla.count - broar
        var delar: [String] = []
        if stationer > 0 { delar.append(stationer == 1 ? "vid en mätstation" : "vid \(stationer) mätstationer") }
        if broar > 0 { delar.append(broar == 1 ? "på en bro" : "på \(broar) broar") }
        return delar.isEmpty ? nil : "Frysrisk " + delar.joined(separator: " och ") + "."
    }

    /// Raden under rubriken: vilken sorts halka det är, och frysrisken. Vägarbeten, hinder och kameror står först när sträckan öppnas.
    public static func under(_ s: Resstracka) -> String {
        switch s.lage {
        case .halt: return [sorter(s.rader), frysrisk(s.rader)].compactMap { $0 }.joined(separator: " ")
        case .frysrisk: return frysrisk(s.rader) ?? "Frysrisk."
        case .lugnt: return "Inget halt rapporterat."
        }
    }

    /// Omdömet överst, i en mening: hur många ställen det gäller och var det börjar.
    public static func dom(_ strackor: [Resstracka]) -> String {
        guard let varst = strackor.map(\.lage).max(), varst != .lugnt, let forsta = strackor.first(where: { $0.lage == varst }) else {
            return "Lugnt hela vägen."
        }
        let mina = strackor.filter { $0.lage == varst }
        let n = mina.map(antal).reduce(0, +)
        let var_ = forsta.franM == 0 ? "redan på första sträckan" : "\(n == 1 ? "efter" : "först efter") \(forsta.fran ?? "start")"
        return "\(varst == .halt ? halkdelar(mina.flatMap(\.rader)) : "Frysrisk på \(stallen(n))"), \(var_)."
    }
}
