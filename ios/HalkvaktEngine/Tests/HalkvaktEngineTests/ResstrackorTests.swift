// Resans sträckor (DECISIONS #930, #933): bryts vid varje större ort längs vägen och säger hur många ställen halkan gäller.
import Foundation
import Testing
@testable import HalkvaktEngine

struct ResstrackorTests {
    /// En rak väg norrut längs 15 °O, från 56 °N till 60 °N: omkring 445 km, en punkt per 0,01 grad.
    private let rutt: [[Double]] = (0...400).map { [15.0, 56.0 + Double($0) * 0.01] }
    private let orter = [
        Ort(namn: "Startby", lon: 15.0, lat: 56.05),     // 5,6 km in: resans start, ingen brytpunkt
        Ort(namn: "Mellanstad", lon: 15.0, lat: 57.0),   // 111 km in
        Ort(namn: "Norrstad", lon: 15.02, lat: 58.5),    // 278 km in, 1,2 km från vägen
        Ort(namn: "Sidoby", lon: 16.0, lat: 58.0),       // sex mil från vägen: räknas inte
        Ort(namn: "Målby", lon: 15.0, lat: 59.95),       // 5,6 km från målet: ingen brytpunkt
    ]

    private func rad(_ slag: RapportSlag, _ km: Int, id: String? = nil, text: String = "", rubrik: String = "") -> RapportRad {
        RapportRad(id: id ?? "\(slag.rawValue):\(km)", slag: slag, rubrik: rubrik, text: text, avstandM: 0, langsM: km * 1000, vag: nil, start: nil)
    }

    @Test func bryterVidVarjeOrt() {
        let s = Resstrackor.strackor(rutt, rader: [rad(.halka, 300), rad(.frysrisk, 150), rad(.vagarbete, 50)], orter: orter)
        #expect(s.map(\.fran) == ["Startby", "Mellanstad", "Norrstad"])
        #expect(s.map(\.lage) == [.lugnt, .frysrisk, .halt])
        #expect(s[0].franM == 0)
        #expect(abs(s[1].franM - 111_195) < 300)
        #expect(abs(s[2].franM - 278_000) < 1_000)
        #expect(s[0].tillM == s[1].franM && s[1].tillM == s[2].franM)
        #expect(abs(s[2].tillM - 444_780) < 1_000)
        #expect(s.map { $0.rader.map(\.slag) } == [[.vagarbete], [.frysrisk], [.halka]])
    }

    @Test func sammaLageSlasInteIhop() {
        let lugnt = Resstrackor.strackor(rutt, rader: [rad(.vagarbete, 50), rad(.kamera, 200), rad(.vagarbete, 400)], orter: orter)
        #expect(lugnt.map(\.fran) == ["Startby", "Mellanstad", "Norrstad"])
        #expect(lugnt.map(\.lage) == [.lugnt, .lugnt, .lugnt])
        let halt = Resstrackor.strackor(rutt, rader: [rad(.halka, 120, id: "a"), rad(.halka, 130, id: "b"), rad(.halka, 300, id: "c")], orter: orter)
        #expect(halt.map(\.lage) == [.lugnt, .halt, .halt])
        #expect(halt.map(Resstrackor.antal) == [0, 2, 1])
    }

    @Test func halkaGarForeFrysriskOchSmhiStarInteMed() {
        let s = Resstrackor.strackor(rutt, rader: [rad(.frysrisk, 20), rad(.halka, 60), rad(.smhi, 0)], orter: orter)
        #expect(s.map(\.lage) == [.halt, .lugnt, .lugnt])
        #expect(s[0].rader.map(\.slag) == [.frysrisk, .halka])
    }

    @Test func utanOrterBlirDetEnStracka() {
        let s = Resstrackor.strackor(rutt, rader: [rad(.halka, 300)], orter: [])
        #expect(s.count == 1 && s[0].fran == nil && s[0].lage == .halt)
        #expect(Resstrackor.strackor([[15, 56]], rader: [], orter: orter).isEmpty)
    }

    @Test func domenArEnMening() {
        let s = Resstrackor.strackor(rutt, rader: [rad(.halka, 300, id: "a"), rad(.halka, 120, id: "b"), rad(.halka, 130, id: "c"),
                                                    rad(.frysrisk, 150)], orter: orter)
        #expect(Resstrackor.dom(s) == "Halt på 3 ställen, först efter Mellanstad.")
        #expect(Resstrackor.dom(Resstrackor.strackor(rutt, rader: [rad(.halka, 300)], orter: orter)) == "Halt på 1 ställe, efter Norrstad.")
        #expect(Resstrackor.dom(Resstrackor.strackor(rutt, rader: [rad(.vagarbete, 50)], orter: orter)) == "Lugnt hela vägen.")
        #expect(Resstrackor.dom(Resstrackor.strackor(rutt, rader: [rad(.halka, 10)], orter: orter)) == "Halt på 1 ställe, redan på första sträckan.")
        #expect(Resstrackor.dom(Resstrackor.strackor(rutt, rader: [rad(.frysrisk, 300), rad(.frysrisk, 150)], orter: orter))
                == "Frysrisk på 2 ställen, först efter Mellanstad.")
    }

    @Test func texternaSagerAntaletOchSortenAvHalka() {
        let s = Resstrackor.strackor(rutt, rader: [
            rad(.halka, 300, id: "seg:a", text: "fläckvis Is, Våt"), rad(.halka, 310, id: "seg:b", text: "fläckvis Is, fläckvis moddig Vägbana"),
            rad(.vagarbete, 320), rad(.frysrisk, 330, id: "wx:1"), rad(.halka, 150, id: "seg:c", text: "Moddsträngar, Lössnö"),
            rad(.frysrisk, 20, id: "wx:2"), rad(.frysrisk, 30, id: "bro:3"),
        ], orter: orter)
        #expect(Resstrackor.rubrik(s[2]) == "Halt på 2 ställen" && Resstrackor.tagg(s[2]) == "2 STÄLLEN")
        #expect(Resstrackor.under(s[2]) == "Fläckvis is och fläckvis snömodd. Frysrisk vid en mätstation.")
        #expect(Resstrackor.rubrik(s[1]) == "Halt på 1 ställe" && Resstrackor.tagg(s[1]) == "1 STÄLLE")
        #expect(Resstrackor.under(s[1]) == "Moddsträngar och lössnö.")
        #expect(Resstrackor.rubrik(s[0]) == "Frysrisk på 2 ställen" && Resstrackor.tagg(s[0]) == "FRYSRISK")
        #expect(Resstrackor.under(s[0]) == "Frysrisk vid en mätstation och på en bro.")
        let lugnt = Resstrackor.strackor(rutt, rader: [rad(.vagarbete, 50)], orter: orter)[0]
        #expect(Resstrackor.rubrik(lugnt) == "Lugnt" && Resstrackor.tagg(lugnt) == "LUGNT")
        #expect(Resstrackor.under(lugnt) == "Inget halt rapporterat.")
    }

    @Test func riskForHalkaSagerHalkrisk() {
        // Kod 2 utan halkord är halkrisk, som rösten (DECISIONS #964).
        func risk(_ km: Int, _ text: String = "risk för halka rapporterad på sträckan") -> RapportRad { rad(.halka, km, text: text, rubrik: "Halkrisk") }
        let bara = Resstrackor.strackor(rutt, rader: [risk(300), risk(310, "Våt")], orter: orter)
        #expect(Resstrackor.rubrik(bara[2]) == "Halkrisk på 2 ställen" && Resstrackor.tagg(bara[2]) == "2 STÄLLEN")
        #expect(Resstrackor.dom(bara) == "Halkrisk på 2 ställen, först efter Norrstad.")
        #expect(Resstrackor.sorter([risk(1)]) == "Risk för halka rapporterad.")
        let blandat = Resstrackor.strackor(rutt, rader: [risk(300), rad(.halka, 310, text: "Is", rubrik: "Halt väglag")], orter: orter)
        #expect(Resstrackor.rubrik(blandat[2]) == "Halt på 1 ställe, halkrisk på 1 ställe")
        #expect(Resstrackor.under(blandat[2]) == "Is.")
        #expect(Resstrackor.sorter([risk(1), rad(.halka, 2, text: "halka rapporterad på sträckan", rubrik: "Halt väglag")]) == "Halt väglag rapporterat.")
    }

    @Test func trafikverketsOrdBlirVanligSvenska() {
        #expect(Resstrackor.rentVaglag("fläckvis Is, Våt") == "fläckvis is, vått")
        #expect(Resstrackor.rentVaglag("Is med bart i hjulspår, fläckvis moddig Vägbana") == "is med bart i hjulspåren, fläckvis snömodd")
        #expect(Resstrackor.rentVaglag("halka rapporterad på sträckan") == "halka rapporterad på sträckan")
        // Is på en rad och fläckvis is på en annan: då är det inte bara fläckvis. Vått och torrt är ingen halka i sig.
        #expect(Resstrackor.sorter([rad(.halka, 1, text: "Is"), rad(.halka, 2, text: "fläckvis Is, fläckvis Torrt"),
                                    rad(.halka, 3, text: "Is med bart i hjulspår")]) == "Is.")
        #expect(Resstrackor.sorter([rad(.halka, 1, text: "Våt"), rad(.halka, 2, text: "fläckvis Våt, fläckvis Torrt")])
                == "Vått. Besvärligt väglag enligt Trafikverket.")
        #expect(Resstrackor.sorter([rad(.halka, 1, text: "fläckvis Våt, fläckvis Torrt")]) == "Fläckvis vått. Besvärligt väglag enligt Trafikverket.")
        #expect(Resstrackor.sorter([rad(.halka, 1, text: "Våt"), rad(.halka, 2, text: "Lössnö")]) == "Lössnö.")
        #expect(Resstrackor.sorter([rad(.halka, 1, text: "halka rapporterad på sträckan")]) == "Halt väglag rapporterat.")
        #expect(Resstrackor.sorter([rad(.halka, 1, text: "Packad snö, Lössnö, Is")]) == "Is, packad snö och lössnö.")
    }

    @Test func punktenLiggerPaVagen() {
        let kum = Resstrackor.kumulativ(rutt)
        let p = Resstrackor.punkt(rutt, kum: kum, m: kum[100] + (kum[101] - kum[100]) / 2)!
        #expect(abs(p[1] - 57.005) < 0.0001 && p[0] == 15.0)
        #expect(Resstrackor.punkt(rutt, kum: kum, m: 9_999_999) == rutt.last)
    }

    @Test func tidenArAvresanPlusAndelenAvRestiden() {
        let t0 = Date(timeIntervalSince1970: 1_800_000_000)
        #expect(Resstrackor.tidVid(50_000, totalM: 100_000, restidS: 3600, avresa: t0) == t0.addingTimeInterval(1800))
        #expect(Resstrackor.tidVid(200_000, totalM: 100_000, restidS: 3600, avresa: t0) == t0.addingTimeInterval(3600))
        #expect(Resstrackor.tidVid(50_000, totalM: 100_000, restidS: nil, avresa: t0) == nil)
    }
}
