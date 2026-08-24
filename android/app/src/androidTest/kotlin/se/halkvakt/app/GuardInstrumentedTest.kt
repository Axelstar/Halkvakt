// Instrumented smoke tests — run ON an Android device/emulator (ART runtime, real
// android.* classes). Two proofs the JVM suite cannot give:
//   1. The APK's MainActivity launches without crashing (manifest/wiring sanity).
//   2. The Skåne replay — same frozen fixture as the TS and Kotlin JVM suites —
//      produces the identical alert log through the APP's Guard pipeline on Android,
//      with TTS and notification captured via fakes. Three runtimes, one truth.
package se.halkvakt.app

import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import se.halkvakt.engine.*

@RunWith(AndroidJUnit4::class)
class GuardInstrumentedTest {

    @Test
    fun mainActivityLaunches() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            scenario.onActivity { activity -> assertTrue(!activity.isFinishing) }
        }
    }

    @Test
    fun skaneReplayOnDeviceMatchesFrozenLog() {
        val ctx = InstrumentationRegistry.getInstrumentation().context
        val doc = JSONObject(ctx.assets.open("skane_vag108.json").bufferedReader().readText())

        val hazards = ArrayList<Hazard>()
        val hz = doc.getJSONArray("hazards")
        for (i in 0 until hz.length()) {
            val o = hz.getJSONObject(i)
            when (o.getString("kind")) {
                "slippery_segment" -> {
                    val la = o.getJSONArray("line")
                    val line = (0 until la.length()).map { j ->
                        val p = la.getJSONArray(j); doubleArrayOf(p.getDouble(0), p.getDouble(1))
                    }
                    val m = o.optJSONObject("meta")
                    hazards.add(SegmentHazard(o.getString("id"), line, SegmentMeta(
                        code = m?.let { if (it.isNull("code")) null else it.getInt("code") },
                        info = m?.optJSONArray("info")?.let { a -> (0 until a.length()).map { a.getString(it) } } ?: emptyList(),
                    )))
                }
                else -> hazards.add(PointHazard(
                    id = o.getString("id"), kind = HazardKind.of(o.getString("kind")),
                    lon = o.getDouble("lon"), lat = o.getDouble("lat"),
                    bearing = if (o.isNull("bearing")) null else o.optDouble("bearing"),
                    meta = o.optJSONObject("meta")?.let { m ->
                        PointMeta(
                            surfaceTempC = if (m.isNull("surfaceTempC")) null else m.optDouble("surfaceTempC"),
                            moisture = m.optBoolean("moisture", false),
                            active = m.optBoolean("active", true),
                        )
                    } ?: PointMeta(),
                ))
            }
        }

        val spoken = ArrayList<String>()
        val notified = ArrayList<String>()
        val guard = Guard(hazards, speak = { spoken.add(it) }, notify = { notified.add(it) })

        val alerts = ArrayList<Alert>()
        val tr = doc.getJSONArray("trace")
        for (i in 0 until tr.length()) {
            val f = tr.getJSONObject(i)
            guard.onLocation(Fix(
                t = f.getDouble("t"), lon = f.getDouble("lon"), lat = f.getDouble("lat"),
                speedKmh = if (f.isNull("speedKmh")) null else f.optDouble("speedKmh"),
            ))?.let { alerts.add(it) }
        }

        val expected = doc.getJSONArray("expected")
        assertEquals("alert count on ART runtime", expected.length(), alerts.size)
        for (i in alerts.indices) {
            val e = expected.getJSONObject(i)
            assertEquals(e.getString("hazardId"), alerts[i].hazardId)
            assertEquals(e.getDouble("t"), alerts[i].t, 1e-9)
            assertEquals(e.getLong("distanceM"), alerts[i].distanceM)
            assertEquals(e.getString("text"), alerts[i].text)
        }
        assertEquals("every alert spoken", alerts.size, spoken.size)
        assertEquals("every alert notified", alerts.size, notified.size)
        assertTrue("August drive is cameras only", alerts.all { it.kind == HazardKind.CAMERA })
    }
}
