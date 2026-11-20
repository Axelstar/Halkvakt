// Frysrisken som startsidan och listan visar (DECISIONS #922): samma regel som rösten, utan avståndet.
import Foundation
import Testing
@testable import HalkvaktEngine

struct FrysriskTests {
    private func meta(_ t: Double?, fukt: Bool, bro: Bool = false, regnH: Double? = nil, fall: Double? = nil) -> PointMeta {
        PointMeta(surfaceTempC: t, moisture: fukt, bridge: bro, rainH: regnH, fall30C: fall)
    }

    @Test func stationenKraverKalltOchVatt() {
        #expect(meta(0.4, fukt: true).frysriskGaller())
        #expect(meta(1.0, fukt: true).frysriskGaller())
        // Axels startsida 20/11: Oxie +2,4 och Svedala +1,2, båda torra, stod som frysrisk.
        #expect(!meta(2.4, fukt: false).frysriskGaller())
        #expect(!meta(1.2, fukt: false).frysriskGaller())
        #expect(!meta(-3.0, fukt: false).frysriskGaller())
        #expect(!meta(1.2, fukt: true).frysriskGaller())
        #expect(!meta(nil, fukt: true).frysriskGaller())
    }

    @Test func bronHarSinEgenGrans() {
        #expect(meta(2.8, fukt: true, bro: true).frysriskGaller())
        #expect(!meta(3.2, fukt: true, bro: true).frysriskGaller())
        #expect(!meta(2.8, fukt: false, bro: true).frysriskGaller())
    }

    @Test func efterhalkanBaraMedRegnfaltet() {
        #expect(meta(2.0, fukt: false, regnH: 1.0, fall: 1.2).frysriskGaller())
        #expect(!meta(2.0, fukt: false, regnH: nil, fall: 1.2).frysriskGaller())
        #expect(!meta(2.0, fukt: false, regnH: 5.0, fall: 1.2).frysriskGaller())
        #expect(!meta(2.0, fukt: false, regnH: 1.0, fall: 0.2).frysriskGaller())
        #expect(!meta(2.0, fukt: false, bro: true, regnH: 1.0, fall: 1.2).frysriskGaller())
    }
}
