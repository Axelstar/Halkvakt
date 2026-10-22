package se.halkvakt.app

// Efterhalkans spärr (DECISIONS #676/#677): utan betatestet töms `regn_h`, och S3 tiger; inget annat ändras.
import se.halkvakt.engine.HazardKind
import se.halkvakt.engine.PointHazard
import se.halkvakt.engine.PointMeta
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class EfterhalkaSparrTest {
    @Test fun tommerBaraRegnfaltet() {
        val p = PointHazard(id = "wx:1", kind = HazardKind.ICING_POINT, lon = 18.0, lat = 59.0,
            meta = PointMeta(surfaceTempC = 2.0, moisture = true, rainH = 1.0, fall30C = 1.2))
        val ut = SnapshotRepo.utanEfterhalka(listOf(p)).single() as PointHazard
        assertNull(ut.meta.rainH)
        assertEquals(1.2, ut.meta.fall30C); assertEquals(2.0, ut.meta.surfaceTempC); assertEquals(true, ut.meta.moisture)
        assertEquals("wx:1", ut.id)
    }

    @Test fun utanRegnfaltOrort() {
        val p = PointHazard(id = "wx:2", kind = HazardKind.ICING_POINT, lon = 18.0, lat = 59.0)
        assertEquals(listOf(p), SnapshotRepo.utanEfterhalka(listOf(p)))
    }
}
