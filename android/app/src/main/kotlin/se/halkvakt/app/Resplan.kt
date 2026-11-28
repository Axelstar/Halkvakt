// PLANERA RESA (kort #659, DECISIONS #870, #941) — spegel av iOS Resplan.swift. Föraren söker en adress, Google räknar ut vägen
// dit från där föraren är (Vagtjanst), och rapporten längs vägen räknas i telefonen som för en sparad resa. Den här filen rör
// aldrig de körda vägarna som föraren sparat.
//
// Målets namn är kommunen målet ligger i, ur Halkvakts egen tabell, inte Googles namn på platsen: det namnet får inte stå bredvid
// en karta (Googles villkor för Europa), och skärmen Planerad resa har en.
//
// En sökt resa sparas inte. Med en avresetid ligger den kvar i en fil till sex timmar efter avresan, så att påminnelsen kan visa
// den. Filen ligger i noBackupFilesDir/resplan/, som varken säkerhetskopieras eller flyttas till en ny telefon.
package se.halkvakt.app

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import se.halkvakt.engine.Kommunkarta
import se.halkvakt.engine.Vagsvar
import java.io.File

object Resplan {
    /** [punkter] är vägen som [lon, lat]. [restidS] är null när tjänsten inte gav någon restid. */
    /** [paminn]: föraren har bett om påminnelsen före avresan (DECISIONS #983). */
    class Plan(val mal: String, val punkter: List<DoubleArray>, val km: Double, val restidS: Double?, val avresaMs: Long?,
               val paminn: Boolean = false)

    sealed interface Lage {
        data object Vilar : Lage
        data object Soker : Lage
        data class Fel(val text: String) : Lage
    }

    /** Så länge ligger en resa med avresetid kvar efter avresan. */
    const val KVAR_EFTER_AVRESA_MS = 6 * 3_600_000L
    /** Namnet när målet ligger utanför varje kommun i tabellen. */
    const val OKANT_MAL = "målet"

    private val _forslag = MutableStateFlow<List<Vagsvar.Forslag>>(emptyList())
    val forslag: StateFlow<List<Vagsvar.Forslag>> = _forslag
    private val _plan = MutableStateFlow<Plan?>(null)
    val plan: StateFlow<Plan?> = _plan
    private val _lage = MutableStateFlow<Lage>(Lage.Vilar)
    val lage: StateFlow<Lage> = _lage
    @Volatile private var laddad = false

    /** Läser filen en gång per process. En resa vars tid har gått tas bort. Anropas utanför huvudtråden. */
    fun ladda(ctx: Context, nu: Long = System.currentTimeMillis()) {
        if (laddad) return
        laddad = true
        val p = runCatching { fil(ctx).takeIf { it.isFile }?.readText()?.let(::franJson) }.getOrNull()
        if (p != null && kvar(p, nu)) _plan.value = p else fil(ctx).delete()
    }

    private fun identitet(ctx: Context) = Vagtjanst.identitet(ctx, BuildConfig.GOOGLE_MAPS_KEY)

    /** Förslagen för det föraren har skrivit. Den som anropar väntar ut tangenterna (en fråga per paus, inte per bokstav). */
    suspend fun sok(ctx: Context, text: String) {
        _forslag.value = if (text.isBlank()) emptyList() else withContext(Dispatchers.IO) { Vagtjanst.forslag(identitet(ctx), text) }
    }

    /** Räknar ut bilvägen till förslaget från [fran] (lon, lat). Sant när resan finns i [plan]. */
    suspend fun planera(ctx: Context, val_: Vagsvar.Forslag, fran: Pair<Double, Double>?): Boolean {
        if (fran == null) {
            _lage.value = Lage.Fel("Halkvakt behöver platsen för att räkna ut vägen härifrån. Slå på den och sök igen.")
            return false
        }
        _lage.value = Lage.Soker
        val ny = withContext(Dispatchers.IO) {
            Vagtjanst.vag(identitet(ctx), fran.first, fran.second, val_.placeId)?.let { v ->
                Plan(malnamn(v.punkter.last(), Sverigedata.kommuner(ctx)), v.punkter, v.meter / 1000.0, v.restidS, null)
            }
        }
        if (ny == null) {
            _lage.value = Lage.Fel("Vägen kunde inte räknas ut. Kontrollera nätet och försök igen.")
            return false
        }
        _plan.value = ny
        _forslag.value = emptyList()
        fil(ctx).delete()
        _lage.value = Lage.Vilar
        return true
    }

    /** Sätter eller tar bort avresetiden. Med en tid läggs resan i filen. Falskt när tiden redan har passerat. */
    fun sattAvresa(ctx: Context, ms: Long?, paminn: Boolean = false, nu: Long = System.currentTimeMillis()): Boolean {
        val p = _plan.value ?: return false
        if (ms != null && ms <= nu) return false
        val ny = Plan(p.mal, p.punkter, p.km, p.restidS, ms, paminn && ms != null)
        _plan.value = ny
        if (ms == null) fil(ctx).delete() else skriv(ctx, ny)
        return true
    }

    /** Fotostudion (bara debug-bygget): en påhittad resa, så att skärmen går att fotografera utan att fråga Google. */
    internal fun fotostudio(ctx: Context, p: Plan) {
        _plan.value = p
        skriv(ctx, p)
    }

    /** Tar bort resan och filen. */
    fun rensa(ctx: Context) {
        _plan.value = null
        fil(ctx).delete()
    }

    /** Resan med avresetid som startsidan visar, tills sex timmar efter avresan. */
    fun kommande(nu: Long = System.currentTimeMillis()): Plan? = _plan.value?.takeIf { kvar(it, nu) }

    internal fun kvar(p: Plan, nu: Long): Boolean = p.avresaMs != null && nu < p.avresaMs + KVAR_EFTER_AVRESA_MS

    /** Kommunen punkten [lon, lat] ligger i, eller [OKANT_MAL]. */
    internal fun malnamn(punkt: DoubleArray, karta: Kommunkarta): String = karta.kommun(punkt[0], punkt[1])?.n ?: OKANT_MAL

    // ---- filen ----

    private fun fil(ctx: Context) = File(File(ctx.applicationContext.noBackupFilesDir, "resplan"), "plan.json")

    private fun skriv(ctx: Context, p: Plan) {
        runCatching {
            val f = fil(ctx)
            f.parentFile?.mkdirs()
            val tmp = File(f.parentFile, "plan.json.tmp")
            tmp.writeText(tillJson(p))
            check(tmp.renameTo(f))
        }.onFailure { fil(ctx).delete() }
    }

    internal fun tillJson(p: Plan): String = JSONObject().put("mal", p.mal).put("km", p.km)
        .put("restidS", p.restidS ?: JSONObject.NULL).put("avresaMs", p.avresaMs ?: JSONObject.NULL).put("paminn", p.paminn)
        .put("punkter", JSONArray().apply { p.punkter.forEach { put(JSONArray().put(it[0]).put(it[1])) } }).toString()

    internal fun franJson(s: String): Plan? = runCatching {
        val o = JSONObject(s)
        val a = o.getJSONArray("punkter")
        val punkter = (0 until a.length()).map { i -> a.getJSONArray(i).let { doubleArrayOf(it.getDouble(0), it.getDouble(1)) } }
        require(punkter.size >= 2)
        Plan(o.get("mal").toString(), punkter, o.getDouble("km"), if (o.isNull("restidS")) null else o.getDouble("restidS"),
            if (o.isNull("avresaMs")) null else o.getLong("avresaMs"), o.optBoolean("paminn", false))
    }.getOrNull()
}
