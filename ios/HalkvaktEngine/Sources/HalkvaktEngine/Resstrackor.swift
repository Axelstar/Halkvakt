// RESANS STRÄCKOR (DECISIONS #930): en planerad resa delad i sträckor i den ordning föraren kör, för skärmen Planerad resa.
//
// Regeln: resan bryts vid de större orter som ligger längs vägen, och grannsträckor med samma läge slås ihop. En brytpunkt
// hamnar alltså vid en ort, och bara där läget byter. Läget är det rapporten redan har räknat fram, ingenting nytt:
//   halt      minst en halksträcka (Trafikverkets väglag) på sträckan
//   frysrisk  ingen halka, men minst en station eller bro med frysrisk enligt röstens regel
//   lugnt     ingetdera
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
            if let f = ut.last, f.lage == lage {
                ut[ut.count - 1] = Resstracka(fran: f.fran, franM: f.franM, tillM: Int(till.rounded()), lage: lage, rader: f.rader + mina)
            } else {
                ut.append(Resstracka(fran: b.namn, franM: Int(b.m.rounded()), tillM: Int(till.rounded()), lage: lage, rader: mina))
            }
        }
        return ut
    }

    /// Klocktiden vid en punkt på resan: avresan plus punktens andel av restiden. nil utan restid.
    public static func tidVid(_ m: Int, totalM: Int, restidS: Double?, avresa: Date) -> Date? {
        guard let restidS, restidS > 0, totalM > 0 else { return nil }
        return avresa.addingTimeInterval(restidS * Double(min(max(m, 0), totalM)) / Double(totalM))
    }

    // MARK: - Texterna

    private static func antal(_ n: Int, _ en: String, _ flera: String) -> String { n == 1 ? "1 \(en)" : "\(n) \(flera)" }

    /// Sträckans rubrik: "Halt väglag", "Frysrisk" eller "Lugnt".
    public static func rubrik(_ s: Resstracka) -> String {
        switch s.lage {
        case .halt: return "Halt väglag"
        case .frysrisk: return "Frysrisk"
        case .lugnt: return "Lugnt"
        }
    }

    /// Raden under rubriken: det som räknats på sträckan. "3 hala sträckor. 2 stationer med frysrisk. 1 vägarbete."
    public static func under(_ s: Resstracka) -> String {
        let n = { (slag: RapportSlag) in s.rader.filter { $0.slag == slag }.count }
        var delar: [String] = []
        if n(.halka) > 0 { delar.append(antal(n(.halka), "hal sträcka", "hala sträckor")) }
        if n(.frysrisk) > 0 { delar.append(antal(n(.frysrisk), "plats med frysrisk", "platser med frysrisk")) }
        if n(.olycka) > 0 { delar.append(antal(n(.olycka), "olycka", "olyckor")) }
        if n(.hinder) > 0 { delar.append(antal(n(.hinder), "hinder", "hinder")) }
        if n(.vilt) > 0 { delar.append(antal(n(.vilt), "viltrapport", "viltrapporter")) }
        if n(.ko) > 0 { delar.append(antal(n(.ko), "kö", "köer")) }
        if n(.vagarbete) > 0 { delar.append(antal(n(.vagarbete), "vägarbete", "vägarbeten")) }
        if n(.kamera) > 0 { delar.append(antal(n(.kamera), "fartkamera", "fartkameror")) }
        return delar.isEmpty ? "Inget rapporterat på sträckan." : delar.joined(separator: ". ") + "."
    }

    /// Domen överst: rubriken och en mening om var det börjar.
    public static func dom(_ strackor: [Resstracka]) -> (rubrik: String, text: String) {
        let km = { (m: Int) in "\(Int((Double(m) / 1000).rounded()))" }
        guard let varst = strackor.map(\.lage).max(), varst != .lugnt, let forsta = strackor.first(where: { $0.lage != .lugnt }) else {
            return ("Lugnt hela vägen.", "Inget halt och ingen frysrisk rapporterad längs vägen. Ändras läget under resan säger rösten till.")
        }
        let vad = varst == .halt ? "Halt" : "Frysrisk"
        let hal = strackor.first { $0.lage == varst }!
        let var_ = hal.franM == 0 ? "redan från start" : hal.fran.map { "från \($0)" } ?? "efter \(km(hal.franM)) kilometer"
        var text = forsta.franM == 0 ? "" : "Lugnt de första \(km(forsta.franM)) kilometrarna."
        if varst == .halt, forsta.lage == .frysrisk {
            text += (text.isEmpty ? "" : " ") + "Frysrisk \(forsta.franM == 0 ? "från start" : forsta.fran.map { "från \($0)" } ?? "efter \(km(forsta.franM)) kilometer")."
        }
        if text.isEmpty { text = "Läget kan ändras under resan, och då säger rösten till." }
        return ("\(vad) \(var_).", text)
    }
}
