// MÄTNINGEN I TELEFONEN (DECISIONS #741 punkt 5) — hur färska varningarna var när de kom fram, och vad det kostade i batteri, per
// resa (vaktens start → stopp). Bara lokalt: ingenting här lämnar telefonen, inga koordinater sparas, och ingen kod som når nätet
// läser filen. noBackupFilesDir/matningen.json med de tio senaste resorna, skriven atomiskt som favoriterna (Favoriter.kt).
package se.halkvakt.app

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.time.Instant
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToLong

/** En mätt resa. Tiderna i millisekunder; [alderS] och [stationS] i sekunder, en post per NY; batteriet i procent, null = okänt. */
data class MattResa(
    val start: Long, val slut: Long, val kollar: Int, val nya: Int, val reserv: Int,
    val alderS: List<Long>, val stationS: List<Long>, val batteriStart: Int?, val batteriSlut: Int?,
)

/** En resas räkning medan vakten går. Varven kommer i laddtråden, start och stopp på huvudtråden. */
class Matare(private val start: Long, private val batteriStart: Int?) {
    private var kollar = 0; private var nya = 0; private var reserv = 0
    private val alder = ArrayList<Long>(); private val station = ArrayList<Long>()

    /** Ett varv som slutade [nu]. [snap] null = laddningen kastade (ingen källa svarade och ingen sparad snapshot fanns). */
    @Synchronized fun varv(nu: Long, snap: SnapshotRepo.Snapshot?) {
        kollar++
        if (snap == null) return
        if (snap.kalla == SnapshotRepo.Kalla.RESERV) reserv++
        if (snap.utfall != SnapshotRepo.Utfall.NY) return
        nya++
        if (snap.generatedAtMs > 0) alder.add(Matningen.sekunder(nu - snap.generatedAtMs))
        snap.vaderAldstMs?.let { station.add(Matningen.sekunder(nu - it)) }
    }

    /** Resan slutar [slut]; null när den var kortare än två minuter och inte sparas. */
    @Synchronized fun resa(slut: Long, batteriSlut: Int?): MattResa? =
        if (slut - start < Matningen.MINSTA_RESA_MS) null
        else MattResa(start, slut, kollar, nya, reserv, alder.toList(), station.toList(), batteriStart, batteriSlut)
}

object Matningen {
    const val FIL = "matningen.json"
    const val MAX_RESOR = 10
    const val MINSTA_RESA_MS = 2 * 60_000L
    private val MANADER = listOf("jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec")

    fun fil(ctx: Context): File = File(ctx.applicationContext.noBackupFilesDir, FIL)

    /** Nyast först. Tåligt: en saknad eller trasig fil ger en tom lista, aldrig en krasch. */
    fun las(fil: File): List<MattResa> = runCatching { resor(fil.readText()) }.getOrNull() ?: emptyList()

    /** Lägger resan först och behåller de tio senaste. Atomiskt: en tillfällig fil som byter namn; går det inte står den förra kvar. */
    fun spara(fil: File, resa: MattResa) {
        runCatching {
            fil.parentFile?.mkdirs()
            val tmp = File(fil.path + ".tmp")
            tmp.writeText(json((listOf(resa) + las(fil)).take(MAX_RESOR)))
            check(tmp.renameTo(fil)) { "kunde inte byta namn" }
        }
    }

    /** Samma form som iOS: en lista, nyast först, tiderna i ISO-8601 och okänt batteri som null. */
    fun json(resor: List<MattResa>): String = JSONArray().apply {
        resor.forEach { r ->
            put(JSONObject().put("start", iso(r.start)).put("slut", iso(r.slut)).put("kollar", r.kollar).put("nya", r.nya)
                .put("reserv", r.reserv).put("alder_s", JSONArray().apply { r.alderS.forEach { put(it) } })
                .put("station_s", JSONArray().apply { r.stationS.forEach { put(it) } })
                .put("batteri_start", r.batteriStart ?: JSONObject.NULL).put("batteri_slut", r.batteriSlut ?: JSONObject.NULL))
        }
    }.toString()

    fun resor(s: String): List<MattResa> {
        val a = JSONArray(s)
        return (0 until a.length()).map { i ->
            val o = a.getJSONObject(i)
            MattResa(Instant.parse(o.get("start").toString()).toEpochMilli(), Instant.parse(o.get("slut").toString()).toEpochMilli(),
                o.getInt("kollar"), o.getInt("nya"), o.getInt("reserv"), langar(o.getJSONArray("alder_s")), langar(o.getJSONArray("station_s")),
                if (o.isNull("batteri_start")) null else o.getInt("batteri_start"),
                if (o.isNull("batteri_slut")) null else o.getInt("batteri_slut"))
        }
    }

    /** Resans rubrik och raderna under den på Betatest-sidan. En rad vars data saknas utelämnas. */
    fun rader(r: MattResa, zon: ZoneId = ZoneId.systemDefault()): Pair<String, List<String>> {
        val z = Instant.ofEpochMilli(r.start).atZone(zon)
        val rubrik = "${z.dayOfMonth} ${MANADER[z.monthValue - 1]} ${tva(z.hour)}:${tva(z.minute)} · " +
            "${((r.slut - r.start) / 60_000.0).roundToLong()} min"
        val rader = mutableListOf("${r.kollar} kollar · ${r.nya} nya · ${r.reserv} ur reserven")
        median(r.alderS)?.let { rader.add("Ålder vid ankomst: median ${minSek(it.roundToLong())}, högst ${minSek(r.alderS.max())}") }
        median(r.stationS)?.let { rader.add("Äldsta station: median ${(it / 60.0).roundToLong()} min") }
        if (r.batteriStart != null && r.batteriSlut != null) {
            // Svenskt decimalkomma och minustecken (en laddad telefon ger en negativ takt), som iOS.
            val perTimme = (r.batteriStart - r.batteriSlut) / ((r.slut - r.start) / 3_600_000.0)
            val takt = "%.1f".format(Locale.ROOT, perTimme).replace('.', ',').replace('-', '−')
            rader.add("Batteri ${r.batteriStart} → ${r.batteriSlut} % ($takt %/h)")
        }
        return rubrik to rader
    }

    /** Millisekunder som hela sekunder, avrundat som iOS. */
    internal fun sekunder(ms: Long): Long = (ms / 1000.0).roundToLong()

    private fun median(v: List<Long>): Double? {
        if (v.isEmpty()) return null
        val s = v.sorted(); val m = s.size / 2
        return if (s.size % 2 == 1) s[m].toDouble() else (s[m - 1] + s[m]) / 2.0
    }

    /** Sekunder som m:ss (3:05). */
    private fun minSek(s: Long): String = (if (s < 0) "−" else "") + "${abs(s) / 60}:${tva((abs(s) % 60).toInt())}"
    private fun tva(n: Int) = n.toString().padStart(2, '0')
    private fun iso(ms: Long) = Instant.ofEpochMilli(ms).truncatedTo(ChronoUnit.SECONDS).toString()
    private fun langar(a: JSONArray) = (0 until a.length()).map { a.getLong(it) }
}
