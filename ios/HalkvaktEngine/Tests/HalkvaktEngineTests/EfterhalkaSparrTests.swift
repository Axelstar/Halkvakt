// Efterhalkans spärr (DECISIONS #676/#677): utan betatestet töms `regn_h`, och S3 tiger; inget annat ändras.
import Foundation
import Testing
@testable import HalkvaktEngine

struct EfterhalkaSparrTests {
    @Test func tommerBaraRegnfaltet() {
        var m = PointMeta(); m.surfaceTempC = 2.0; m.moisture = true; m.rainH = 1.0; m.fall30C = 1.2
        let hz: [Hazard] = [.point(id: "wx:1", kind: .icing_point, lon: 18, lat: 59, bearing: nil, meta: m)]
        let ut = SnapshotReader.utanEfterhalka(hz)
        guard case let .point(id, kind, _, _, _, meta) = ut[0] else { Issue.record("inte en punkt"); return }
        #expect(id == "wx:1" && kind == .icing_point)
        #expect(meta.rainH == nil)
        #expect(meta.fall30C == 1.2 && meta.surfaceTempC == 2.0 && meta.moisture)
    }

    @Test func utanRegnfaltOrort() {
        let hz: [Hazard] = [.point(id: "wx:2", kind: .icing_point, lon: 18, lat: 59, bearing: nil, meta: PointMeta())]
        #expect(SnapshotReader.utanEfterhalka(hz).count == 1)
    }
}
