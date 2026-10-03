// LÄSARKONTRAKTET (kort #210, #289; DECISIONS #278, #448). The shared vectors start where the hazard is already
// parsed, so they can never see a fault in the JSON reading — #210 ("på väg <null>") sat exactly there.
// engine/fixtures/lasarprov.json is the static + live the apps download, with the cases that are easy to read
// wrong, and the parsed outcome every reader must give. TS: test/lasarkontraktet.test.ts; Swift:
// LasarkontraktetTests.swift in ios/HalkvaktEngine. A missing field and null are the same outcome; a number or a
// word never is.
package se.halkvakt.app

import org.json.JSONObject
import se.halkvakt.engine.Hazard
import se.halkvakt.engine.PointHazard
import se.halkvakt.engine.SegmentHazard
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LasarkontraktetTest {

    private fun repoRoot(): File {
        var d = File(System.getProperty("user.dir")).absoluteFile
        while (!File(d, "engine/fixtures").isDirectory) {
            d = d.parentFile ?: error("engine/fixtures not found above ${System.getProperty("user.dir")}")
        }
        return d
    }

    /** The field as the reader produced it; null when the reader leaves it out. */
    private fun falt(h: Hazard, nyckel: String): Any? = when (h) {
        is SegmentHazard -> when (nyckel) {
            "code" -> h.meta.code
            else -> error("${h.id}: unknown segment field $nyckel")
        }
        is PointHazard -> when (nyckel) {
            "bearing" -> h.bearing
            "surfaceTempC" -> h.meta.surfaceTempC
            "bridge" -> h.meta.bridge
            "severityCode" -> h.meta.severityCode
            "endTimeLocal" -> h.meta.endTimeLocal
            "road" -> h.meta.road
            "speedLimitKmh" -> h.meta.speedLimitKmh
            else -> error("${h.id}: unknown point field $nyckel")
        }
    }

    /** Numbers compare by value (the fixture's 180 is an Int, the reader's bearing a Double). */
    private fun lika(a: Any?, b: Any?): Boolean =
        if (a is Number && b is Number) a.toDouble() == b.toDouble() else a == b

    @Test fun kotlinLasarenGerProvfilensUtfallOchNullBlirAldrigEttTalEllerEttOrd() {
        val prov = JSONObject(File(repoRoot(), "engine/fixtures/lasarprov.json").readText())
        val faror = SnapshotRepo.toHazards(prov.getJSONObject("static"), prov.getJSONObject("live"))
        val vantat = prov.getJSONArray("vantat").let { a -> (0 until a.length()).map { a.getJSONObject(it) } }

        assertEquals(vantat.map { it.getString("id") }, faror.map { it.id }, "samma id i samma ordning som referensen")
        for (v in vantat) {
            val h = faror.first { it.id == v.getString("id") }
            assertEquals(v.getString("kind"), h.kind.wire, "${h.id}: kind")
            for (nyckel in v.keys()) {
                if (nyckel == "id" || nyckel == "kind" || nyckel.startsWith("_")) continue
                val forvantat = if (v.isNull(nyckel)) null else v.get(nyckel)
                val fick = falt(h, nyckel)
                assertTrue(lika(fick, forvantat), "${h.id}: $nyckel — väntade $forvantat, fick $fick. ${v.optString("_varfor")}")
            }
        }

        // What #210 was about, said plainly: no reader may ever leave a word where the data says null.
        val d2 = faror.first { it.id == "dev:d2" } as PointHazard
        assertNull(d2.meta.road, "road måste vara null")
        assertNotNull(faror.firstOrNull { it.id == "dev:4711" }, "ett id som tal ska bli \"dev:4711\"")
    }
}
