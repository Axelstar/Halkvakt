// Downloads data/app/v1/{manifest,static,live}.json from the CDN, caches to filesDir
// (offline = last snapshot stays valid, PLAN §2), verifies sha256 from the manifest,
// and maps into engine hazards — the Kotlin mirror of engine/src/snapshot.ts.
package se.halkvakt.app

import android.content.Context
import org.json.JSONObject
import se.halkvakt.engine.*
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

object SnapshotRepo {

    private const val BASE = "https://axelstar.github.io/halkvakt-karta/data/app/v1/"

    data class Snapshot(val hazards: List<Hazard>, val generatedAtMs: Long)

    fun loadSnapshot(ctx: Context): Snapshot {
        val staticDoc = fetchVerified(ctx, "static.json")
        val liveDoc = fetchVerified(ctx, "live.json")
        val gen = try {
            java.time.Instant.parse(liveDoc.getString("generated_at")).toEpochMilli()
        } catch (e: Exception) { 0L }  // saknad tidsstämpel = maximalt gammal ⇒ vakten fäller
        return Snapshot(toHazards(staticDoc, liveDoc), gen)
    }

    fun loadHazards(ctx: Context): List<Hazard> = loadSnapshot(ctx).hazards

    private fun fetchVerified(ctx: Context, name: String): JSONObject {
        val cache = File(ctx.filesDir, name)
        return try {
            val manifest = JSONObject(httpGet("manifest.json"))
            val meta = manifest.getJSONObject("files").getJSONObject(name.removeSuffix(".json"))
            val body = httpGet(name)
            val sha = MessageDigest.getInstance("SHA-256").digest(body.toByteArray(Charsets.UTF_8))
                .joinToString("") { "%02x".format(it) }
            require(sha == meta.getString("sha256")) { "checksum mismatch for $name" }
            cache.writeText(body)
            JSONObject(body)
        } catch (e: Exception) {
            if (cache.exists()) JSONObject(cache.readText()) // offline: last snapshot stays valid
            else throw e
        }
    }

    private fun httpGet(name: String): String {
        val conn = URL(BASE + name).openConnection() as HttpURLConnection
        conn.connectTimeout = 10_000; conn.readTimeout = 15_000
        conn.setRequestProperty("User-Agent", "Halkvakt-Android/0.1")
        try {
            require(conn.responseCode == 200) { "HTTP ${conn.responseCode} for $name" }
            return conn.inputStream.bufferedReader().readText()
        } finally { conn.disconnect() }
    }

    /** Mirror of snapshotToHazards() in engine/src/snapshot.ts — keep 1:1. */
    fun toHazards(staticDoc: JSONObject, liveDoc: JSONObject): List<Hazard> {
        val out = ArrayList<Hazard>()
        val cams = staticDoc.getJSONArray("cameras")
        for (i in 0 until cams.length()) {
            val c = cams.getJSONObject(i)
            out.add(PointHazard(
                id = "cam:${c.getString("id")}", kind = HazardKind.CAMERA,
                lon = c.getDouble("lon"), lat = c.getDouble("lat"),
                bearing = if (c.isNull("bearing")) null else c.getDouble("bearing"),
            ))
        }
        val segs = liveDoc.getJSONArray("segments")
        for (i in 0 until segs.length()) {
            val s = segs.getJSONObject(i)
            val lineArr = s.getJSONArray("line")
            val line = (0 until lineArr.length()).map { j ->
                val p = lineArr.getJSONArray(j); doubleArrayOf(p.getDouble(0), p.getDouble(1))
            }
            val info = s.optJSONArray("info")?.let { a -> (0 until a.length()).map { a.getString(it) } } ?: emptyList()
            out.add(SegmentHazard(
                id = "seg:${s.getString("id")}", line = line,
                meta = SegmentMeta(code = if (s.isNull("code")) null else s.getInt("code"), info = info),
            ))
        }
        val wx = liveDoc.getJSONArray("weather")
        for (i in 0 until wx.length()) {
            val w = wx.getJSONObject(i)
            out.add(PointHazard(
                id = "wx:${w.getString("id")}", kind = HazardKind.ICING_POINT,
                lon = w.getDouble("lon"), lat = w.getDouble("lat"),
                meta = PointMeta(
                    surfaceTempC = if (w.isNull("yta")) null else w.getDouble("yta"),
                    moisture = w.optBoolean("fukt", false),
                ),
            ))
        }
        liveDoc.optJSONArray("bridges")?.let { bs ->   // #38 — broar nära frysande station
            for (i in 0 until bs.length()) {
                val b = bs.getJSONObject(i)
                out.add(PointHazard(
                    id = "bro:${b.getString("id")}", kind = HazardKind.ICING_POINT,
                    lon = b.getDouble("lon"), lat = b.getDouble("lat"),
                    meta = PointMeta(
                        surfaceTempC = if (b.isNull("yta")) null else b.getDouble("yta"),
                        moisture = b.optBoolean("fukt", false),
                        bridge = true,
                    ),
                ))
            }
        }
        liveDoc.optJSONArray("wildlife")?.let { vs ->
            for (i in 0 until vs.length()) {
                val v = vs.getJSONObject(i)
                out.add(PointHazard(
                    id = "vilt:${v.getString("id")}", kind = HazardKind.WILDLIFE,
                    lon = v.getDouble("lon"), lat = v.getDouble("lat"),
                ))
            }
        }
        liveDoc.optJSONArray("djur")?.let { ds ->   // #318 — Trafikverkets djur på vägen
            for (i in 0 until ds.length()) {
                val v = ds.getJSONObject(i)
                out.add(PointHazard(
                    id = "djur:${v.getString("id")}", kind = HazardKind.WILDLIFE,
                    lon = v.getDouble("lon"), lat = v.getDouble("lat"),
                ))
            }
        }
        val devs = liveDoc.getJSONArray("deviations")
        for (i in 0 until devs.length()) {
            val d = devs.getJSONObject(i)
            // Olyckslyftet (#28): sev/slut are absent in snapshots published before this
            // shipped, and absent for non-accident deviation types by design. Missing ⇒ null
            // ⇒ the engine grades it mild and speaks the old line. Never louder by accident.
            out.add(PointHazard(
                id = "dev:${d.getString("id")}", kind = HazardKind.ACCIDENT,
                lon = d.getDouble("lon"), lat = d.getDouble("lat"),
                meta = PointMeta(
                    severityCode = if (d.has("sev") && !d.isNull("sev")) d.getInt("sev") else null,
                    endTimeLocal = if (d.has("slut") && !d.isNull("slut")) d.getString("slut") else null,
                    road = if (d.has("road") && !d.isNull("road")) d.getString("road") else null,
                ),
            ))
        }
        return out
    }
}
