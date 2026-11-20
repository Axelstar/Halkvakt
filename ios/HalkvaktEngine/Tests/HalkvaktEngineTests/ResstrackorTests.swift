// Resans sträckor (DECISIONS #930): bryts vid orterna längs vägen, och bara där läget byter.
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

    private func rad(_ slag: RapportSlag, _ km: Int, id: String? = nil) -> RapportRad {
        RapportRad(id: id ?? "\(slag.rawValue):\(km)", slag: slag, rubrik: "", text: "", avstandM: 0, langsM: km * 1000, vag: nil, start: nil)
    }

    @Test func bryterVidOrternaDarLagetByter() {
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

    @Test func sammaLageSlasIhop() {
        let s = Resstrackor.strackor(rutt, rader: [rad(.vagarbete, 50), rad(.kamera, 200), rad(.vagarbete, 400)], orter: orter)
        #expect(s.count == 1)
        #expect(s[0].fran == "Startby" && s[0].lage == .lugnt && s[0].franM == 0)
        #expect(s[0].rader.map(\.langsM) == [50_000, 200_000, 400_000])
    }

    @Test func halkaGarForeFrysriskOchSmhiStarInteMed() {
        let s = Resstrackor.strackor(rutt, rader: [rad(.frysrisk, 20), rad(.halka, 60), rad(.smhi, 0)], orter: orter)
        #expect(s.map(\.lage) == [.halt, .lugnt])
        #expect(s[0].rader.map(\.slag) == [.frysrisk, .halka])
    }

    @Test func utanOrterBlirDetEnStracka() {
        let s = Resstrackor.strackor(rutt, rader: [rad(.halka, 300)], orter: [])
        #expect(s.count == 1 && s[0].fran == nil && s[0].lage == .halt)
        #expect(Resstrackor.strackor([[15, 56]], rader: [], orter: orter).isEmpty)
    }

    @Test func domenSagerVarDetBorjar() {
        let s = Resstrackor.strackor(rutt, rader: [rad(.halka, 300), rad(.frysrisk, 150)], orter: orter)
        let d = Resstrackor.dom(s)
        #expect(d.rubrik == "Halt från Norrstad.")
        #expect(d.text == "Lugnt de första 111 kilometrarna. Frysrisk från Mellanstad.")
        let lugnt = Resstrackor.dom(Resstrackor.strackor(rutt, rader: [rad(.vagarbete, 50)], orter: orter))
        #expect(lugnt.rubrik == "Lugnt hela vägen.")
        let start = Resstrackor.dom(Resstrackor.strackor(rutt, rader: [rad(.halka, 10)], orter: orter))
        #expect(start.rubrik == "Halt redan från start.")
        let utanOrt = Resstrackor.dom(Resstrackor.strackor(rutt, rader: [rad(.frysrisk, 300)], orter: []))
        #expect(utanOrt.rubrik == "Frysrisk redan från start.")
    }

    @Test func texternaRaknarDetSomStarPaStrackan() {
        let s = Resstrackor.strackor(rutt, rader: [rad(.halka, 300, id: "a"), rad(.halka, 310, id: "b"), rad(.vagarbete, 320)], orter: orter)
        #expect(Resstrackor.rubrik(s[1]) == "Halt väglag")
        #expect(Resstrackor.under(s[1]) == "2 hala sträckor. 1 vägarbete.")
        #expect(Resstrackor.rubrik(s[0]) == "Lugnt")
        #expect(Resstrackor.under(s[0]) == "Inget rapporterat på sträckan.")
    }

    @Test func tidenArAvresanPlusAndelenAvRestiden() {
        let t0 = Date(timeIntervalSince1970: 1_800_000_000)
        #expect(Resstrackor.tidVid(50_000, totalM: 100_000, restidS: 3600, avresa: t0) == t0.addingTimeInterval(1800))
        #expect(Resstrackor.tidVid(200_000, totalM: 100_000, restidS: 3600, avresa: t0) == t0.addingTimeInterval(3600))
        #expect(Resstrackor.tidVid(50_000, totalM: 100_000, restidS: nil, avresa: t0) == nil)
    }
}
