// FAVORITERNA (kort #357; DECISIONS #616, #625, #633, #817) — spegel av iOS Services/Favoriter.swift. Körda vägar sparas bara
// på förarens begäran, bara i telefonen och aldrig i en säkerhetskopia. Brytaren "Erbjud att spara resor" (Prefs.favErbjud) är
// av från början; av ⇒ ingen väg samlas in och ingen fil skrivs. Glesningen (en punkt per 75 m) och listans regler (högst fem,
// den sjätte nekas) och dagens resor (högst tre i väntan på namn, ett dygn, dit och hem som en; se.halkvakt.engine.Vantande) bor i
// motorn, prövade mot engine/fixtures/rutter.json i tre språk.
//
// Favoriter 2a (DECISIONS #817): frågan kommer som notis efter resan (FavoritNotis.kt), med svarsfält i notisen. Resan räknas som
// slut när vakten stannar (bilens Bluetooth bort eller rörelseigenkänningen) eller när bilen stått still i tio minuter — aldrig
// medan bilen rullar. Högst en notis per dag; senare resor samlas tyst i Dagens resor.
//
// Två filer i noBackupFilesDir/favoriter/, som varken säkerhetskopieras eller flyttas till en ny telefon. allowBackup="false"
// stänger molnkopian redan, men från Android 12 gäller den inte flytten mellan telefoner, så res/xml/data_extraction_rules.xml
// stänger ute mappen där också (FAVORITER §6).
//   rutter.json         de sparade rutterna
//   senaste-resan.json  dagens resor i väntan på namn, var och en högst ett dygn
//   kollen.json         förra kollen per resa: när rapporten öppnades och vilka faror den visade (steg 3c). Farornas id pekar på
//                       platser längs vägen, så filen behandlas som rutterna.
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
import se.halkvakt.engine.Vantande
import java.io.File
import java.time.Instant
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import java.util.UUID

object Favoriter {
    /** Kortare resor erbjuds inte (DECISIONS #633): en vakt som startades i en parkering eller bars av en gående är ingen väg. */
    // Minst 2 km och 5 minuters körtid (DECISIONS #701): på tåget 24/10 kom frågan två gånger på en minut.
    const val MINSTA_RESA_KM = 2.0
    const val MINSTA_RESA_MIN = 5.0
    /** Raden Kör du den här ofta? på Redo (DECISIONS #817): efter en resa på minst så här många km med brytaren av, igen
     *  tidigast en vecka efter Inte nu. */
    const val ERBJUD_EFTER_KM = 10.0
    const val ERBJUD_IGEN_EFTER_MS = 7 * 24 * 3600 * 1000L
    const val RUTTER_FIL = "rutter.json"
    const val VANTANDE_FIL = "senaste-resan.json"
    const val KOLLEN_FIL = "kollen.json"

    /** Sätts av notisen och raden på Redo; appens rot byter till fliken och nollar den. */
    val visaFliken = MutableStateFlow(false)

    @Volatile private var lager: RuttLager? = null

    /** En per process, i noBackupFilesDir. */
    fun lager(ctx: Context): RuttLager = lager ?: synchronized(this) {
        lager ?: RuttLager(File(ctx.applicationContext.noBackupFilesDir, "favoriter")).also { lager = it }
    }

    /** "Resa 3/11" — resans dag, samma ord som namnförslaget och det tomma fältets namn. */
    fun datumnamn(v: Vantande): String {
        val d = Instant.ofEpochMilli((v.slutS * 1000).toLong()).atZone(ZoneId.systemDefault())
        return Rutter.namnforslag(d.dayOfMonth, d.monthValue).last()
    }

    /** Raden Kör du den här ofta?: brytaren av, en lång resa som slutade senaste dygnet, och inget Inte nu den senaste veckan. */
    fun erbjudRaden(erbjud: Boolean, senasteKm: Double, senasteSlutMs: Long, doldMs: Long, nuMs: Long): Boolean {
        if (erbjud || senasteKm < ERBJUD_EFTER_KM || senasteSlutMs <= 0L || nuMs - senasteSlutMs >= Vantande.VANTANDE_KVAR_S * 1000) return false
        return doldMs <= 0L || (senasteSlutMs > doldMs && nuMs - doldMs >= ERBJUD_IGEN_EFTER_MS)
    }
}

/**
 * Lagret bakom fliken och frågan. Allt anropas på huvudtråden (positionerna kommer på huvudlöparen, tjänstens start och stopp och
 * UI:t också). Mappen ges utifrån, så att JVM-proven kan köra det mot en tillfällig katalog.
 */
class RuttLager(private val mapp: File, private val nu: () -> Long = System::currentTimeMillis) {
    private val _rutter = MutableStateFlow<List<SparadRutt>>(emptyList())
    val rutter: StateFlow<List<SparadRutt>> = _rutter
    /** Dagens resor i väntan på namn, äldst först. */
    private val _dagens = MutableStateFlow<List<Vantande>>(emptyList())
    val dagens: StateFlow<List<Vantande>> = _dagens
    private var insamlare: Ruttinsamlare? = null
    /** Vaktpassets id: ett pass som slutar två gånger (tio minuter stilla, sedan vaktens stopp) uppdaterar sin egen rad. */
    private var pass = UUID.randomUUID().toString()

    /** Förra kollen av en resas rapport, åt båda hållen (steg 3c): det som tillkommit sedan dess är Nytt. [tid] i millisekunder. */
    data class Koll(val tid: Long, val ids: List<String>)
    private val _kollar = MutableStateFlow<Map<String, Koll>>(emptyMap())
    val kollar: StateFlow<Map<String, Koll>> = _kollar

    init {
        _rutter.value = las(Favoriter.RUTTER_FIL)?.let(RuttJson::rutter) ?: emptyList()
        _dagens.value = las(Favoriter.VANTANDE_FIL)?.let(RuttJson::dagens) ?: emptyList()
        _kollar.value = las(Favoriter.KOLLEN_FIL)?.let(RuttJson::kollar) ?: emptyMap()
        rensaGamla()
    }

    // ── Under resan (GuardService) ──────────────────────────────────────────────────────────────

    /** Vakten startar. Varje start är en ny resa på Android. */
    fun resanBorjar(erbjud: Boolean) {
        insamlare = if (erbjud) Ruttinsamlare() else null
        pass = UUID.randomUUID().toString()
    }

    fun fix(lon: Double, lat: Double) { insamlare?.add(lon, lat) }

    /** Resan är slut eller ser ut att vara det: vägen så långt läggs i dagens resor. Svarar resan som ska ge dagens notis — en ny
     *  rad, inte samma pass igen och inte hemresan som slogs ihop — eller null. */
    fun resanSlutar(km: Double, minuter: Double): Vantande? {
        val r = insamlare?.route() ?: return null
        if (km < Favoriter.MINSTA_RESA_KM || minuter < Favoriter.MINSTA_RESA_MIN || r.size < 2) return null
        // DECISIONS #637: vägen hem, eller samma väg igen, är redan sparad — en resa räcker för båda hållen, så ingen ny fråga.
        if (_rutter.value.any { Rutter.sammaResa(it.punkter, r) }) return null
        val fore = _dagens.value
        val nuS = nu() / 1000.0
        val lista = Vantande.dagensResor(fore, Vantande(pass, nuS, km, r), nuS)
        if (!skriv(Favoriter.VANTANDE_FIL, RuttJson.dagens(lista))) return null
        _dagens.value = lista
        return lista.firstOrNull { it.id == pass }?.takeIf { fore.none { f -> f.id == pass } }
    }

    // ── Föraren svarar (notisen, fliken) ────────────────────────────────────────────────────────

    enum class Svar { SPARAD, FULLT, FEL }

    /** Sparar en av dagens resor. Tomt namn sparar som Resa d/m. */
    fun spara(id: String, namn: String): Svar {
        val v = _dagens.value.firstOrNull { it.id == id } ?: return Svar.FEL
        val n = namn.trim().ifEmpty { Favoriter.datumnamn(v) }
        val ny = SparadRutt(UUID.randomUUID().toString(), n, Instant.ofEpochMilli(nu()).truncatedTo(ChronoUnit.SECONDS).toString(), v.punkter)
        val lista = Rutter(_rutter.value).laggTill(ny) ?: return Svar.FULLT
        if (!skriv(Favoriter.RUTTER_FIL, RuttJson.rutter(lista))) return Svar.FEL
        _rutter.value = lista.rutter
        slang(id)
        return Svar.SPARAD
    }

    /** Släng en av dagens resor: vägen raderas. */
    fun slang(id: String) {
        val lista = _dagens.value.filter { it.id != id }
        if (lista.isEmpty()) { slangAlla(); return }
        if (skriv(Favoriter.VANTANDE_FIL, RuttJson.dagens(lista))) _dagens.value = lista
    }

    /** Brytaren av: allt som väntade raderas, och en resa som pågår börjar om. */
    fun slangAlla() {
        _dagens.value = emptyList()
        insamlare = null
        File(mapp, Favoriter.VANTANDE_FIL).delete()
    }

    /** Resor äldre än ett dygn raderas; vid start och när fliken eller Redo visas. */
    fun rensaGamla() {
        val nuS = nu() / 1000.0
        val kvar = _dagens.value.filter { nuS - it.slutS < Vantande.VANTANDE_KVAR_S }
        if (kvar.size == _dagens.value.size) return
        if (kvar.isEmpty()) slangAlla() else if (skriv(Favoriter.VANTANDE_FIL, RuttJson.dagens(kvar))) _dagens.value = kvar
    }

    // ── Fliken ──────────────────────────────────────────────────────────────────────────────────

    fun bytNamn(id: String, namn: String) {
        val n = namn.trim()
        if (n.isEmpty()) return
        val lista = Rutter(_rutter.value.map { if (it.id == id) it.copy(namn = n) else it })
        if (skriv(Favoriter.RUTTER_FIL, RuttJson.rutter(lista))) _rutter.value = lista.rutter
    }

    fun taBort(id: String) {
        val lista = Rutter(_rutter.value).taBort(id)
        if (lista.rutter.isEmpty()) { taBortAlla(); return }
        if (skriv(Favoriter.RUTTER_FIL, RuttJson.rutter(lista))) _rutter.value = lista.rutter
        if (id in _kollar.value) { val k = _kollar.value - id; if (skriv(Favoriter.KOLLEN_FIL, RuttJson.kollar(k))) _kollar.value = k }
    }

    fun taBortAlla() {
        File(mapp, Favoriter.RUTTER_FIL).delete()
        File(mapp, Favoriter.KOLLEN_FIL).delete()
        _rutter.value = emptyList()
        _kollar.value = emptyMap()
    }

    /** Föraren har läst rapporten: det den visade, åt båda hållen, är grunden för nästa Nytt. */
    fun kollad(id: String, ids: List<String>) {
        if (_rutter.value.none { it.id == id }) return
        val k = _kollar.value + (id to Koll(nu(), ids))
        if (skriv(Favoriter.KOLLEN_FIL, RuttJson.kollar(k))) _kollar.value = k
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

/** Filernas form, samma som iOS (rutter.json: schema 1 och rutterna; senaste-resan.json: dagens resor som en lista med id, slutS,
 *  km, punkter och dithem, som Swifts Codable skriver dem). */
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

    fun dagens(l: List<Vantande>): String = JSONArray().apply {
        l.forEach { put(JSONObject().put("id", it.id).put("slutS", it.slutS).put("km", it.km).put("punkter", punkter(it.punkter)).put("dithem", it.dithem)) }
    }.toString()

    fun dagens(s: String): List<Vantande>? = runCatching {
        val a = JSONArray(s)
        (0 until a.length()).map { i ->
            val o = a.getJSONObject(i)
            Vantande(o.get("id").toString(), o.getDouble("slutS"), o.getDouble("km"), punkter(o.getJSONArray("punkter")), o.optBoolean("dithem"))
        }
    }.getOrNull()

    /** kollen.json som på iOS: ett objekt per resa, {"tid": ISO-8601, "ids": [...]}. */
    fun kollar(k: Map<String, RuttLager.Koll>): String = JSONObject().apply {
        k.forEach { (id, v) ->
            put(id, JSONObject().put("tid", Instant.ofEpochMilli(v.tid).truncatedTo(ChronoUnit.SECONDS).toString())
                .put("ids", JSONArray().apply { v.ids.forEach { put(it) } }))
        }
    }.toString()

    fun kollar(s: String): Map<String, RuttLager.Koll>? = runCatching {
        val o = JSONObject(s)
        o.keys().asSequence().associateWith { id ->
            val v = o.getJSONObject(id); val a = v.getJSONArray("ids")
            RuttLager.Koll(Instant.parse(v.get("tid").toString()).toEpochMilli(), (0 until a.length()).map { a.get(it).toString() })
        }
    }.getOrNull()

    private fun punkter(p: List<DoubleArray>) = JSONArray().apply { p.forEach { put(JSONArray().put(it[0]).put(it[1])) } }
    private fun punkter(a: JSONArray) = (0 until a.length()).map { val p = a.getJSONArray(it); doubleArrayOf(p.getDouble(0), p.getDouble(1)) }
}
