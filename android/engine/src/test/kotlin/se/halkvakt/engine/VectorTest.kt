// THE cross-platform contract test: replays every shared vector from /engine/vectors/
// plus the real Skåne fixture, and requires the Kotlin engine to produce the SAME
// alert log as the frozen TypeScript output — field for field. If this is green,
// the two implementations are behaviourally identical.
package se.halkvakt.engine

import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class VectorTest {

    private fun repoRoot(): File {
        var d = File(System.getProperty("user.dir")).absoluteFile
        while (!File(d, "engine/vectors").isDirectory) {
            d = d.parentFile ?: error("engine/vectors not found above ${System.getProperty("user.dir")}")
        }
        return d
    }

    private fun parseHazard(o: JSONObject): Hazard {
        val kind = HazardKind.of(o.getString("kind"))
        if (kind == HazardKind.SLIPPERY_SEGMENT) {
            val line = o.getJSONArray("line").let { arr ->
                (0 until arr.length()).map { i ->
                    val p = arr.getJSONArray(i)
                    doubleArrayOf(p.getDouble(0), p.getDouble(1))
                }
            }
            val m = o.optJSONObject("meta")
            return SegmentHazard(
                id = o.getString("id"), line = line,
                meta = SegmentMeta(
                    code = m?.let { if (it.has("code") && !it.isNull("code")) it.getInt("code") else null },
                    info = m?.optJSONArray("info")?.let { a -> (0 until a.length()).map { a.getString(it) } } ?: emptyList(),
                ),
            )
        }
        val m = o.optJSONObject("meta")
        return PointHazard(
            id = o.getString("id"), kind = kind,
            lon = o.getDouble("lon"), lat = o.getDouble("lat"),
            bearing = if (o.has("bearing") && !o.isNull("bearing")) o.getDouble("bearing") else null,
            meta = PointMeta(
                surfaceTempC = m?.let { if (it.has("surfaceTempC") && !it.isNull("surfaceTempC")) it.getDouble("surfaceTempC") else null },
                moisture = m?.optBoolean("moisture", false) ?: false,
                active = m?.optBoolean("active", true) ?: true,
                speedLimitKmh = m?.let { if (it.has("speedLimitKmh") && !it.isNull("speedLimitKmh")) it.getInt("speedLimitKmh") else null },
                severityCode = m?.let { if (it.has("severityCode") && !it.isNull("severityCode")) it.getInt("severityCode") else null },
                bridge = m?.optBoolean("bridge", false) ?: false,
                endTimeLocal = m?.let { if (it.has("endTimeLocal") && !it.isNull("endTimeLocal")) it.getString("endTimeLocal") else null },
            ),
        )
    }

    private fun parseFix(o: JSONObject) = Fix(
        t = o.getDouble("t"), lon = o.getDouble("lon"), lat = o.getDouble("lat"),
        speedKmh = if (o.has("speedKmh") && !o.isNull("speedKmh")) o.getDouble("speedKmh") else null,
        headingDeg = if (o.has("headingDeg") && !o.isNull("headingDeg")) o.getDouble("headingDeg") else null,
    )

    private fun runFile(f: File): Pair<List<Alert>, JSONArray> {
        val doc = JSONObject(f.readText())
        val hazards = doc.getJSONArray("hazards").let { a -> (0 until a.length()).map { parseHazard(a.getJSONObject(it)) } }
        val trace = doc.getJSONArray("trace").let { a -> (0 until a.length()).map { parseFix(a.getJSONObject(it)) } }
        val updates = doc.optJSONArray("updates")?.let { a ->
            (0 until a.length()).map { i ->
                val o = a.getJSONObject(i)
                o.getDouble("atT") to o.getJSONArray("hazards").let { h -> (0 until h.length()).map { parseHazard(h.getJSONObject(it)) } }
            }
        } ?: emptyList()
        val engine = AlertEngine(hazards)
        var u = 0
        val got = ArrayList<Alert>()
        for (fix in trace) {
            while (u < updates.size && fix.t >= updates[u].first) engine.updateHazards(updates[u++].second)
            engine.step(fix)?.let { got.add(it) }
        }
        return got to doc.getJSONArray("expected")
    }

    private fun assertLogEquals(name: String, got: List<Alert>, expected: JSONArray) {
        assertEquals(expected.length(), got.size, "$name: alert count")
        for (i in got.indices) {
            val e = expected.getJSONObject(i)
            val g = got[i]
            assertEquals(e.getDouble("t"), g.t, 1e-9, "$name[$i].t")
            assertEquals(e.getString("hazardId"), g.hazardId, "$name[$i].hazardId")
            assertEquals(e.getString("kind"), g.kind.wire, "$name[$i].kind")
            assertEquals(e.getLong("distanceM"), g.distanceM, "$name[$i].distanceM")
            assertEquals(e.getString("text"), g.text, "$name[$i].text")
        }
    }

    @Test
    fun allSharedVectorsProduceIdenticalLogs() {
        val dir = File(repoRoot(), "engine/vectors")
        val files = dir.listFiles { f -> f.name.endsWith(".json") }!!.sortedBy { it.name }
        assertTrue(files.size >= 17, "expected the full vector suite, found ${files.size}")
        for (f in files) {
            val (got, expected) = runFile(f)
            assertLogEquals(f.name, got, expected)
        }
    }

    @Test
    fun realSkaneFixtureIdentical() {
        val f = File(repoRoot(), "engine/fixtures/skane_vag108.json")
        val (got, expected) = runFile(f)
        assertLogEquals(f.name, got, expected)
        assertTrue(got.all { it.kind == HazardKind.CAMERA }, "August drive must be cameras-only")
    }

    @Test
    fun determinismAcrossFreshEngines() {
        val f = File(repoRoot(), "engine/vectors/v04_priority_drop.json")
        val (a, _) = runFile(f)
        val (b, _) = runFile(f)
        assertEquals(a, b)
    }
}
