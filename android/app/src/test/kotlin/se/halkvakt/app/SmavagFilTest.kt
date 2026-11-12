// SMÅVÄGSPROVET (DECISIONS #828 byggsteg 7, #844) — the Kotlin side. engine/fixtures/smavagprov.json holds the point file and the
// besked for each case and the hazards every reader must give: TS (test/smavagfil.test.ts), Swift (SmavagFilTests.swift) and this.
package se.halkvakt.app

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class SmavagFilTest {

    private fun repoRoot(): File {
        var d = File(System.getProperty("user.dir")).absoluteFile
        while (!File(d, "engine/fixtures").isDirectory) {
            d = d.parentFile ?: error("engine/fixtures not found above ${System.getProperty("user.dir")}")
        }
        return d
    }

    @Test
    fun everyCaseGivesTheExpectedHazards() {
        val prov = JSONObject(File(repoRoot(), "engine/fixtures/smavagprov.json").readText())
        val fall = prov.getJSONArray("fall")
        assertTrue("the fixture has its cases", fall.length() >= 10)
        for (i in 0 until fall.length()) {
            val f = fall.getJSONObject(i)
            val namn = f.getString("namn")
            val fil = SmavagFil.parse(f.getJSONObject("fil"))
            val besked = f.optJSONObject("besked")
            val got = fil?.hazards(besked, f.getString("filSha")) ?: emptyList()
            val vantat = f.getJSONArray("vantat")
            assertEquals("$namn: count", vantat.length(), got.size)
            for (j in 0 until vantat.length()) {
                val v = vantat.getJSONObject(j)
                val h = got[j]
                assertEquals("$namn: id", v.getString("id"), h.id)
                val pts = v.getJSONArray("points")
                assertEquals("$namn ${h.id}: points", pts.length(), h.points.size)
                for (k in 0 until pts.length()) {
                    assertEquals("$namn ${h.id}: lon $k", pts.getJSONArray(k).getDouble(0), h.points[k][0], 0.0)
                    assertEquals("$namn ${h.id}: lat $k", pts.getJSONArray(k).getDouble(1), h.points[k][1], 0.0)
                }
                val warn = v.getJSONArray("warn")
                assertEquals("$namn ${h.id}: warn", (0 until warn.length()).map { warn.getInt(it) }, h.warn)
            }
        }
    }
}
