// FAVORITERNA STEG 2 (kort #357; DECISIONS #616, #625, #633) — spegel av iOS Services/Favoriter.swift. Körda vägar sparas bara
// på förarens begäran, bara i telefonen och aldrig i en säkerhetskopia. Brytaren "Erbjud att spara resor" (Prefs.favErbjud) är
// av från början; av ⇒ ingen väg samlas in och ingen fil skrivs. Glesningen (en punkt per 75 m) och listans regler (högst fem,
// den sjätte nekas) bor i motorn, se.halkvakt.engine.Rutter, prövade mot engine/fixtures/rutter.json i tre språk.
//
// Två filer i noBackupFilesDir/favoriter/, som varken säkerhetskopieras eller flyttas till en ny telefon. allowBackup="false"
// stänger molnkopian redan, men från Android 12 gäller den inte flytten mellan telefoner, så res/xml/data_extraction_rules.xml
// stänger ute mappen där också (FAVORITER §6).
//   rutter.json         de sparade rutterna
//   senaste-resan.json  den senaste resans väg tills föraren svarat, högst ett dygn
// Inget här når nätet. scripts/rutterspar.ts i ci fäller en fil som både når nätet och rör rutterna.
package se.halkvakt.app

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONArray
import org.json.JSONObject
import se.halkvakt.engine.Rutter
import se.halkvakt.engine.Ruttinsamlare
import se.halkvakt.engine.SparadRutt
import java.io.File
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

object Favoriter {
    /** Frågan står kvar ett dygn; sedan raderas vägen (FAVORITER §6). */
    const val FRAGA_KVAR_MS = 24 * 3600 * 1000L
    /** Kortare resor erbjuds inte (DECISIONS #633): en vakt som startades i en parkering eller bars av en gående är ingen väg. */
    const val MINSTA_RESA_KM = 1.0
    const val RUTTER_FIL = "rutter.json"
    const val VANTANDE_FIL = "senaste-resan.json"

    @Volatile private var lager: RuttLager? = null

    /** En per process, i noBackupFilesDir. */
    fun lager(ctx: Context): RuttLager = lager ?: synchronized(this) {
        lager ?: RuttLager(File(ctx.applicationContext.noBackupFilesDir, "favoriter")).also { lager = it }
    }
}

/** Den senaste resans väg i väntan på förarens svar. punkter är [lon, lat], WGS84. */
data class VantandeResa(val slut: Long, val punkter: List<DoubleArray>)

/**
 * Lagret bakom fliken och frågan. Allt anropas på huvudtråden (positionerna kommer på huvudlöparen, tjänstens start och stopp och
 * UI:t också). Mappen ges utifrån, så att JVM-proven kan köra det mot en tillfällig katalog.
 */
class RuttLager(private val mapp: File, private val nu: () -> Long = System::currentTimeMillis) {
    private val _rutter = MutableStateFlow<List<SparadRutt>>(emptyList())
    val rutter: StateFlow<List<SparadRutt>> = _rutter
    private val _vantande = MutableStateFlow<VantandeResa?>(null)
    val vantande: StateFlow<VantandeResa?> = _vantande
    private var insamlare: Ruttinsamlare? = null

    init {
        _rutter.value = las(Favoriter.RUTTER_FIL)?.let(RuttJson::rutter) ?: emptyList()
        _vantande.value = las(Favoriter.VANTANDE_FIL)?.let(RuttJson::vantande)
        _vantande.value?.let { if (nu() - it.slut >= Favoriter.FRAGA_KVAR_MS) avsta() }
    }

    // ── Under resan (GuardService) ──────────────────────────────────────────────────────────────

    /** Vakten startar. Varje start är en ny resa på Android. */
    fun resanBorjar(erbjud: Boolean) { insamlare = if (erbjud) Ruttinsamlare() else null }

    fun fix(lon: Double, lat: Double) { insamlare?.add(lon, lat) }

    /** Vakten stoppar: vägen läggs i den tillfälliga filen, och Redo. frågar om den ska sparas. */
    fun resanSlutar(km: Double) {
        val r = insamlare?.route() ?: return
        insamlare = null
        if (km < Favoriter.MINSTA_RESA_KM || r.size < 2) return
        val v = VantandeResa(nu(), r)
        if (skriv(Favoriter.VANTANDE_FIL, RuttJson.vantande(v))) _vantande.value = v
    }

    // ── Föraren svarar (Redo.) ──────────────────────────────────────────────────────────────────

    enum class Svar { SPARAD, FULLT, FEL }

    fun spara(namn: String): Svar {
        val n = namn.trim()
        val v = _vantande.value ?: return Svar.FEL
        if (n.isEmpty()) return Svar.FEL
        val ny = SparadRutt(UUID.randomUUID().toString(), n, Instant.ofEpochMilli(nu()).truncatedTo(ChronoUnit.SECONDS).toString(), v.punkter)
        val lista = Rutter(_rutter.value).laggTill(ny) ?: return Svar.FULLT
        if (!skriv(Favoriter.RUTTER_FIL, RuttJson.rutter(lista))) return Svar.FEL
        _rutter.value = lista.rutter
        avsta()
        return Svar.SPARAD
    }

    /** Nej tack, brytaren av eller ett dygn utan svar: den tillfälliga filen raderas. */
    fun avsta() {
        _vantande.value = null
        insamlare = null
        File(mapp, Favoriter.VANTANDE_FIL).delete()
    }

    // ── Fliken ──────────────────────────────────────────────────────────────────────────────────

    fun taBort(id: String) {
        val lista = Rutter(_rutter.value).taBort(id)
        if (lista.rutter.isEmpty()) { taBortAlla(); return }
        if (skriv(Favoriter.RUTTER_FIL, RuttJson.rutter(lista))) _rutter.value = lista.rutter
    }

    fun taBortAlla() {
        File(mapp, Favoriter.RUTTER_FIL).delete()
        _rutter.value = emptyList()
    }

    // ── Filerna ─────────────────────────────────────────────────────────────────────────────────

    /** Atomiskt: en tillfällig fil som byter namn. Går det inte raderas filen hellre än att en halv skrivs. */
    private fun skriv(namn: String, text: String): Boolean = runCatching {
        mapp.mkdirs()
        val tmp = File(mapp, "$namn.tmp")
        tmp.writeText(text)
        check(tmp.renameTo(File(mapp, namn))) { "kunde inte byta namn" }
        true
    }.getOrElse { File(mapp, namn).delete(); false }   // aldrig en koordinat i loggen

    private fun las(namn: String): String? = File(mapp, namn).takeIf { it.isFile }?.let { runCatching { it.readText() }.getOrNull() }
}

/** Filernas form, samma som iOS (rutter.json: schema 1 och rutterna; senaste-resan.json: slut i ISO-8601 och punkterna). */
object RuttJson {
    fun rutter(r: Rutter): String = JSONObject().put("schema", r.schema).put("rutter", JSONArray().apply {
        r.rutter.forEach { put(JSONObject().put("id", it.id).put("namn", it.namn).put("sparad", it.sparad).put("punkter", punkter(it.punkter))) }
    }).toString()

    fun rutter(s: String): List<SparadRutt>? = runCatching {
        val a = JSONObject(s).getJSONArray("rutter")
        (0 until a.length()).map { i ->
            val o = a.getJSONObject(i)
            SparadRutt(o.get("id").toString(), o.get("namn").toString(), o.get("sparad").toString(), punkter(o.getJSONArray("punkter")))
        }
    }.getOrNull()

    fun vantande(v: VantandeResa): String =
        JSONObject().put("slut", Instant.ofEpochMilli(v.slut).toString()).put("punkter", punkter(v.punkter)).toString()

    fun vantande(s: String): VantandeResa? = runCatching {
        val o = JSONObject(s)
        VantandeResa(Instant.parse(o.get("slut").toString()).toEpochMilli(), punkter(o.getJSONArray("punkter")))
    }.getOrNull()

    private fun punkter(p: List<DoubleArray>) = JSONArray().apply { p.forEach { put(JSONArray().put(it[0]).put(it[1])) } }
    private fun punkter(a: JSONArray) = (0 until a.length()).map { val p = a.getJSONArray(it); doubleArrayOf(p.getDouble(0), p.getDouble(1)) }
}
