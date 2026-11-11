// Downloads data/app/v1/{manifest,static,live}.json — the bucket first, GitHub Pages only when the bucket does not answer
// (DECISIONS #741 punkt 4) — caches to filesDir (offline = last snapshot stays valid, PLAN §2), verifies sha256 from the
// manifest, and maps into engine hazards — the Kotlin mirror of engine/src/snapshot.ts.
package se.halkvakt.app

import android.content.Context
import kotlinx.coroutines.flow.first
import org.json.JSONObject
import se.halkvakt.engine.*
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.time.Instant

object SnapshotRepo {

    /** Hinken (publicera skriver trion varannan minut) och reserven, Pages (var tionde minut). En trio blandas aldrig. */
    private const val HINK = "https://xmpfztykhyvhmrzsnjrc.supabase.co/storage/v1/object/public/app/v1/"
    private const val RESERV = "https://axelstar.github.io/halkvakt-karta/data/app/v1/"
    private const val MANIFEST = "manifest.json"
    private val FILER = listOf("static.json", "live.json")

    /** Ett varvs utfall: NY = nya filer skrevs; OFORANDRAD = inget nyare, eller filerna låg efter manifestet i Cloudflares cache,
     *  och cachen gäller; FEL = ingen källa svarade, och den sparade snapshoten gäller. */
    enum class Utfall { NY, OFORANDRAD, FEL }
    enum class Kalla { HINK, RESERV, INGEN }

    /** [fromCache]: hämtningen föll och den sparade filen gäller — då kan åldern bero på nätet, inte på datan.
     *  [vaderAldstMs]: lägesfilens weather_oldest_at, den äldsta mättiden bland de svenska väderstationerna; null = saknas. */
    data class Snapshot(val hazards: List<Hazard>, val generatedAtMs: Long, val stations: List<Station> = emptyList(),
                        val fromCache: Boolean = false, val utfall: Utfall = Utfall.NY, val kalla: Kalla = Kalla.INGEN,
                        val vaderAldstMs: Long? = null)

    fun loadSnapshot(ctx: Context): Snapshot {
        // Provkörning 18/10: ett nytt försök direkt innan den sparade filen får gälla. Sedan #741 bara när ingen källa svarade (FEL);
        // en kontrollsumma som inte stämmer är OFÖRÄNDRAD, och takten kollar om efter 30 s (SnapshotSchedule).
        var docs = koll(ctx.filesDir, ::httpGet)
        if (docs.utfall == Utfall.FEL) docs = koll(ctx.filesDir, ::httpGet)
        val gen = tid(docs.live, "generated_at") ?: 0L  // saknad tidsstämpel = maximalt gammal ⇒ vakten fäller
        // Efterhalkan (S3) bara för den som slagit på Betatest — Kompisarna först (Bengt 22/10, DECISIONS #676/#677).
        val betatest = kotlinx.coroutines.runBlocking { Prefs.facitEnabled(ctx).first() }
        val faror = toHazards(docs.stat, docs.live)
        return Snapshot(if (betatest) faror else utanEfterhalka(faror), gen, stations(docs.stat), docs.utfall == Utfall.FEL,
            docs.utfall, docs.kalla, tid(docs.live, "weather_oldest_at"))
    }

    /** Efterhalkans spärr (#676/#677): S3 är den enda regeln som läser `regn_h`. Utan betatestet töms fältet, och betan tiger
     *  som när lägesfilen saknar det; allt annat, kandidaten med, är orört. Spegel av SnapshotReader.utanEfterhalka i iOS. */
    fun utanEfterhalka(faror: List<Hazard>): List<Hazard> =
        faror.map { if (it is PointHazard && it.meta.rainH != null) it.copy(meta = it.meta.copy(rainH = null)) else it }

    internal class Docs(val stat: JSONObject, val live: JSONObject, val utfall: Utfall, val kalla: Kalla)

    /** Manifestet som det kom (det sparas ordagrant), dess tid och kontrollsumman per fil. */
    private class Manifest(val text: String, val genMs: Long?, val sha: Map<String, String>)

    /** null = saknas eller trasigt. */
    private fun manifest(text: String?): Manifest? = text?.let { t ->
        runCatching {
            val o = JSONObject(t); val f = o.getJSONObject("files")
            Manifest(t, tid(o, "generated_at"), FILER.associateWith { f.getJSONObject(it.removeSuffix(".json")).get("sha256").toString() })
        }.getOrNull()
    }

    /**
     * Ett varv, en "koll" (DECISIONS #741 punkt 4). [hamta] tar en hel adress och kastar vid nätfel, tidsgräns och HTTP ≠ 200.
     * Ett varv i taget, så att vakten, rapporten och appens start aldrig skriver cachen samtidigt. Kastar bara när ingenting finns
     * att visa: ingen sparad snapshot, och hämtningen gav ingen.
     */
    @Synchronized internal fun koll(mapp: File, hamta: (String) -> String): Docs {
        val sparat = manifest(las(mapp, MANIFEST))
        val harCache = sparat != null && FILER.all { File(mapp, it).isFile }
        // 1. Manifestet ur hinken; reserven bara när hinken inte svarar. Filerna hämtas sedan ur samma källa.
        val hink = manifest(runCatching { hamta(HINK + MANIFEST) }.getOrNull())
        val ny = hink ?: manifest(runCatching { hamta(RESERV + MANIFEST) }.getOrNull()) ?: return cachen(mapp, Utfall.FEL, Kalla.INGEN)
        val kalla = if (hink != null) Kalla.HINK else Kalla.RESERV
        val bas = if (hink != null) HINK else RESERV
        // 2. Inte nyare än det sparade manifestet ⇒ cachen gäller. Skyddar också mot en reserv som är äldre än cachen.
        val forra = sparat?.genMs; val nu = ny.genMs
        if (harCache && forra != null && (nu == null || nu <= forra)) return cachen(mapp, Utfall.OFORANDRAD, kalla)
        // 3. Bara filerna vars kontrollsumma ändrats (static sällan); utan cache båda (4).
        val nya = LinkedHashMap<String, String>()
        for (namn in FILER.filter { !harCache || ny.sha[it] != sparat?.sha?.get(it) }) {
            val text = try { hamta(bas + namn) } catch (e: Exception) { return cachen(mapp, Utfall.FEL, kalla) }
            // Cloudflare kan visa ett nytt manifest medan filen ännu är gammal: ingenting skrivs, cachen gäller, takten kollar om.
            if (sha256(text) != ny.sha[namn]) return cachen(mapp, Utfall.OFORANDRAD, kalla)
            nya[namn] = text
        }
        val stat = JSONObject(nya["static.json"] ?: las(mapp, "static.json") ?: error("ingen sparad static.json"))
        val live = JSONObject(nya["live.json"] ?: las(mapp, "live.json") ?: error("ingen sparad live.json"))
        nya.forEach { (namn, text) -> skriv(mapp, namn, text) }
        skriv(mapp, MANIFEST, ny.text)   // sist: manifestet säger vad filerna verifierades mot
        return Docs(stat, live, Utfall.NY, kalla)
    }

    /** Den sparade snapshoten. */
    private fun cachen(mapp: File, utfall: Utfall, kalla: Kalla): Docs =
        Docs(JSONObject(las(mapp, "static.json") ?: error("ingen sparad vägdata")),
            JSONObject(las(mapp, "live.json") ?: error("ingen sparad vägdata")), utfall, kalla)

    private fun las(mapp: File, namn: String): String? = File(mapp, namn).takeIf { it.isFile }?.let { runCatching { it.readText() }.getOrNull() }

    /** Atomiskt: en tillfällig fil som byter namn. */
    private fun skriv(mapp: File, namn: String, text: String) {
        val tmp = File(mapp, "$namn.tmp")
        tmp.writeText(text)
        check(tmp.renameTo(File(mapp, namn))) { "kunde inte byta namn på $namn" }
    }

    private fun sha256(s: String) =
        MessageDigest.getInstance("SHA-256").digest(s.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }

    /** En ISO-8601-tid i millisekunder; null när fältet saknas, är null eller inte går att läsa. */
    private fun tid(o: JSONObject, nyckel: String): Long? =
        if (o.isNull(nyckel)) null else runCatching { Instant.parse(o.get(nyckel).toString()).toEpochMilli() }.getOrNull()

    /** Kort #203 lager 2: alla stationers id och position (static.json sedan 26/9) — missknappens plats. Inga faror. */
    fun stations(staticDoc: JSONObject): List<Station> {
        val a = staticDoc.optJSONArray("stations") ?: return emptyList()
        return (0 until a.length()).map { i -> a.getJSONObject(i).let { Station(it.getString("id"), it.getDouble("lon"), it.getDouble("lat")) } }
    }

    fun loadHazards(ctx: Context): List<Hazard> = loadSnapshot(ctx).hazards

    /** static.json och live.json som de ligger, verifierade som ovan — för favoriternas rapport (kort #357), som läser fler fält än
     *  motorn (vägen på sträckorna, broarna, SMHI:s områden). Samma varv som vakten (#741). Blockerar. */
    fun dokument(ctx: Context): Pair<JSONObject, JSONObject> = koll(ctx.filesDir, ::httpGet).let { it.stat to it.live }

    private fun httpGet(url: String): String {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = 10_000; conn.readTimeout = 15_000
        conn.setRequestProperty("User-Agent", "Halkvakt-Android/0.1")
        try {
            require(conn.responseCode == 200) { "HTTP ${conn.responseCode} for $url" }
            return conn.inputStream.bufferedReader().readText()
        } finally { conn.disconnect() }
    }

    /** Mirror of snapshotToHazards() in engine/src/snapshot.ts — keep 1:1, same order (#289). */
    fun toHazards(staticDoc: JSONObject, liveDoc: JSONObject): List<Hazard> {
        val out = ArrayList<Hazard>()
        val cams = staticDoc.getJSONArray("cameras")
        for (i in 0 until cams.length()) {
            val c = cams.getJSONObject(i)
            out.add(PointHazard(
                id = "cam:${c.idText()}", kind = HazardKind.CAMERA,
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
                id = "seg:${s.idText()}", line = line,
                meta = SegmentMeta(code = if (s.isNull("code")) null else s.getInt("code"), info = info),
            ))
        }
        val wx = liveDoc.getJSONArray("weather")
        for (i in 0 until wx.length()) {
            val w = wx.getJSONObject(i)
            out.add(PointHazard(
                id = "wx:${w.idText()}", kind = HazardKind.ICING_POINT,
                lon = w.getDouble("lon"), lat = w.getDouble("lat"),
                meta = PointMeta(
                    surfaceTempC = if (w.isNull("yta")) null else w.getDouble("yta"),
                    moisture = w.optBoolean("fukt", false),
                    // S3 (DECISIONS #524): saknas fältet eller är det null ⇒ null, och betan tiger.
                    rainH = if (!w.has("regn_h") || w.isNull("regn_h")) null else w.getDouble("regn_h"),
                    fall30C = if (!w.has("lutning30") || w.isNull("lutning30")) null else w.getDouble("lutning30"),
                ),
            ))
        }
        val devs = liveDoc.getJSONArray("deviations")
        for (i in 0 until devs.length()) {
            val d = devs.getJSONObject(i)
            // Olyckslyftet (#28): sev/slut are absent in snapshots published before this
            // shipped, and absent for non-accident deviation types by design. Missing ⇒ null
            // ⇒ the engine grades it mild and speaks the old line. Never louder by accident.
            out.add(PointHazard(
                id = "dev:${d.idText()}", kind = HazardKind.ACCIDENT,
                lon = d.getDouble("lon"), lat = d.getDouble("lat"),
                meta = PointMeta(
                    severityCode = if (d.has("sev") && !d.isNull("sev")) d.getInt("sev") else null,
                    endTimeLocal = if (d.has("slut") && !d.isNull("slut")) d.getString("slut") else null,
                    road = if (d.has("road") && !d.isNull("road")) d.getString("road") else null,
                ),
            ))
        }
        liveDoc.optJSONArray("wildlife")?.let { vs ->
            for (i in 0 until vs.length()) {
                val v = vs.getJSONObject(i)
                out.add(PointHazard(
                    id = "vilt:${v.idText()}", kind = HazardKind.WILDLIFE,
                    lon = v.getDouble("lon"), lat = v.getDouble("lat"),
                ))
            }
        }
        liveDoc.optJSONArray("djur")?.let { ds ->   // #318 — Trafikverkets djur på vägen
            for (i in 0 until ds.length()) {
                val v = ds.getJSONObject(i)
                out.add(PointHazard(
                    id = "djur:${v.idText()}", kind = HazardKind.WILDLIFE,
                    lon = v.getDouble("lon"), lat = v.getDouble("lat"),
                ))
            }
        }
        liveDoc.optJSONArray("bridges")?.let { bs ->   // #38 — broar nära frysande station
            for (i in 0 until bs.length()) {
                val b = bs.getJSONObject(i)
                out.add(PointHazard(
                    id = "bro:${b.idText()}", kind = HazardKind.ICING_POINT,
                    lon = b.getDouble("lon"), lat = b.getDouble("lat"),
                    meta = PointMeta(
                        surfaceTempC = if (b.isNull("yta")) null else b.getDouble("yta"),
                        moisture = b.optBoolean("fukt", false),
                        bridge = true,
                    ),
                ))
            }
        }
        liveDoc.optJSONArray("kandidat")?.let { ks ->   // #576, #577 — kandidatens varnande punkter per sträcka
            for (i in 0 until ks.length()) {
                val k = ks.getJSONObject(i)
                val pts = k.getJSONArray("punkter")
                out.add(KandidatHazard(
                    id = "kand:${k.idText()}",
                    segmentHazardId = "seg:${k.idText()}",   // #581: samma sträckas halkvarning
                    points = (0 until pts.length()).map { j -> pts.getJSONArray(j).let { doubleArrayOf(it.getDouble(0), it.getDouble(1)) } },
                ))
            }
        }
        return out
    }

    /** The id as text whether the JSON carries a string or a number ("dev:4711"), like the TS and Swift readers.
     *  getString() would do it on Android but throws in the JVM tests' org.json (#289). */
    private fun JSONObject.idText(): String = get("id").toString()
}
