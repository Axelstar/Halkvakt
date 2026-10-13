// URVALET LÄNGS RUTTEN (DECISIONS #528): RouteFilter.alongRoute mot det delade facit engine/fixtures/langsrutten.json, som
// TypeScript (test/langsrutten.test.ts) och Swift (LangsRuttenTests.swift) prövas mot. Samma id i samma ordning, talen inom 0,01 m.
package se.halkvakt.engine

import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class LangsRuttenTest {

    private fun repoRoot(): File {
        var d = File(System.getProperty("user.dir")).absoluteFile
        while (!File(d, "engine/fixtures").isDirectory) {
            d = d.parentFile ?: error("engine/fixtures not found above ${System.getProperty("user.dir")}")
        }
        return d
    }

    private fun punkter(a: JSONArray): List<DoubleArray> =
        (0 until a.length()).map { val p = a.getJSONArray(it); doubleArrayOf(p.getDouble(0), p.getDouble(1)) }

    private fun fara(o: JSONObject): Hazard =
        if (o.getString("kind") == "slippery_segment") SegmentHazard(o.get("id").toString(), punkter(o.getJSONArray("line")))
        else PointHazard(o.get("id").toString(), HazardKind.of(o.getString("kind")), o.getDouble("lon"), o.getDouble("lat"))

    @Test fun allaFallenSomTypeScript() {
        val fall = JSONObject(File(repoRoot(), "engine/fixtures/langsrutten.json").readText()).getJSONArray("fall")
        assertTrue(fall.length() >= 3, "facit bär sina fall")
        for (k in 0 until fall.length()) {
            val f = fall.getJSONObject(k)
            val namn = f.getString("namn")
            val faror = f.getJSONArray("faror").let { a -> (0 until a.length()).map { fara(a.getJSONObject(it)) } }
            val vantat = f.getJSONArray("vantat").let { a -> (0 until a.length()).map { a.getJSONObject(it) } }
            val r = RouteFilter.alongRoute(faror, punkter(f.getJSONArray("linje")), f.getDouble("marginalM"))
            assertEquals(vantat.map { it.get("id").toString() }, r.map { it.hazard.id }, "$namn: samma faror i samma ordning")
            r.forEachIndexed { i, x ->
                assertTrue(abs(x.distanceM - vantat[i].getDouble("avstandM")) < 0.01, "$namn ${x.hazard.id}: avståndet ${x.distanceM}")
                assertTrue(abs(x.alongM - vantat[i].getDouble("langsM")) < 0.01, "$namn ${x.hazard.id}: platsen ${x.alongM}")
            }
        }
    }
}
