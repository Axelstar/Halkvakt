// RAPPORTEN LÄNGS DE SPARADE RESORNA (favoriterna steg 3c, kort #357; DECISIONS #636, #637) — spegel av iOS Rapporten.swift. Läser
// lägesfilen och static.json (SnapshotRepo) och rapportfilen (RapportRepo), och räknar i telefonen varje sparad resa åt båda hållen
// med motorns ResansRapport — Hem är samma väg vänd, köerna och restiderna bara åt förarens håll. Den här filen når aldrig nätet:
// den får filerna som data, och ingen väg lämnar telefonen (ruttspärren, scripts/rutterspar.ts).
//
// Samma åldersgränser som rösten (AgeGate, FAVORITER §3): väglag och frysrisk ur en lägesfil som är 45 minuter eller äldre, och
// olyckor och vilt ur en rapportfil som är två timmar eller äldre, visas inte som läget just nu. Reglerna bor i motorn.
package se.halkvakt.app

import android.content.Context
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import se.halkvakt.engine.KandidatRad
import se.halkvakt.engine.RapportRad
import se.halkvakt.engine.ResansRapport
import se.halkvakt.engine.SparadRutt
import java.time.Instant

object Rapporten {
    /** En sparad resa åt båda hållen, efter åldersgränserna. [kandidatDit] och [kandidatHem] är rutan Halkvakt tror (DECISIONS #739),
     *  null när kandidaten är avstängd — aldrig med i förra kollen eller radens läge, som bara läser [dit] och [hem]. */
    data class Resa(val dit: List<RapportRad>, val hem: List<RapportRad>, val kandidatDit: List<KandidatRad>?,
                    val kandidatHem: List<KandidatRad>?)

    data class Lage(
        val resor: Map<String, Resa> = emptyMap(),
        val kollat: Long? = null,
        val lagesfil: Long? = null,
        /** Rapportfilens tid: olyckor, vägarbeten, hinder, köer, restider och färjor kommer ur den (DECISIONS #686 punkt 5, B7-05). */
        val rapportfil: Long? = null,
        val gammaltVaglag: Boolean = false,
        val gamlaOlyckor: Boolean = false,
        val laddar: Boolean = false,
        val gickInte: Boolean = false,
    )

    private val _lage = MutableStateFlow(Lage())
    val lage: StateFlow<Lage> = _lage
    private val mutex = Mutex()

    /** Hämtar och räknar om, utanför huvudtråden. Anropen går ett i taget: ett andra väntar på låset och hämtar sedan själv — delarna
     *  ligger kvar med sin kontrollsumma, så det kostar manifesten och en omräkning. Den som anropar äger arbetet: avbryts den (listan
     *  lämnar skärmen när rapporten öppnas) är det inget fel, och läget säger inte "kunde inte hämtas" (fotostudion 18/10). */
    suspend fun uppdatera(ctx: Context) {
        val app = ctx.applicationContext
        mutex.withLock {
            val rutter = Favoriter.lager(app).rutter.value
            if (rutter.isEmpty()) return
            _lage.update { it.copy(laddar = true) }
            val u = try {
                withContext(Dispatchers.IO) {
                    val (stat, live) = SnapshotRepo.dokument(app)
                    val f = RapportRepo.hamta(app)
                    val betatest = Prefs.facitEnabled(app).first()
                    rakna(rutter, karta(stat), karta(live), karta(f.snabb), karta(f.lang), System.currentTimeMillis(), betatest)
                }
            } catch (e: CancellationException) {
                _lage.update { it.copy(laddar = false) }
                throw e
            } catch (e: Exception) {
                null
            }
            _lage.update {
                if (u == null) it.copy(laddar = false, gickInte = true)
                else it.copy(resor = u.resor, kollat = System.currentTimeMillis(), lagesfil = u.lagesfil, rapportfil = u.rapportfil,
                    gammaltVaglag = u.gammaltVaglag, gamlaOlyckor = u.gamlaOlyckor, laddar = false, gickInte = false)
            }
        }
    }

    private class Utfall(val resor: Map<String, Resa>, val lagesfil: Long?, val rapportfil: Long?, val gammaltVaglag: Boolean,
                         val gamlaOlyckor: Boolean)

    private fun rakna(rutter: List<SparadRutt>, stat: Map<String, Any?>, live: Map<String, Any?>, snabb: Map<String, Any?>,
                      lang: Map<String, Any?>, nu: Long, betatest: Boolean): Utfall? {
        val fil = ResansRapport.lasRapportfil(snabb) ?: return null
        // Efterhalkans spärr (#676, #677): utan Betatest räknas S3 inte fram i rapporten, som rösten tiger om den (SnapshotRepo).
        val lage = ResansRapport.lasLage(live).let { if (betatest) it else ResansRapport.utanEfterhalka(it) }
        val kameror = ResansRapport.lasKameror(stat); val linjer = ResansRapport.lasLinjer(lang)
        val lagesTid = tid(live["generated_at"] as? String); val rapportTid = tid(fil.generatedAt)
        val alderMin = { t: Long? -> if (t == null) Long.MAX_VALUE else (nu - t) / 60_000 }
        val gammaltVaglag = alderMin(lagesTid) >= AgeGate.WEATHER_MAX_MIN
        val gamlaOlyckor = alderMin(rapportTid) >= AgeGate.ACCIDENT_MAX_MIN
        val grind = { r: List<RapportRad> -> ResansRapport.aldersgrind(r, gammaltVaglag, gamlaOlyckor) }
        val resor = rutter.associate { r ->
            r.id to Resa(grind(ResansRapport.resansRapport(r.punkter, false, lage, kameror, fil, linjer)),
                grind(ResansRapport.resansRapport(r.punkter, true, lage, kameror, fil, linjer)),
                ResansRapport.kandidatRader(r.punkter, false, lage), ResansRapport.kandidatRader(r.punkter, true, lage))
        }
        return Utfall(resor, lagesTid, rapportTid, gammaltVaglag, gamlaOlyckor)
    }

    private fun tid(s: String?): Long? = s?.let { runCatching { Instant.parse(it).toEpochMilli() }.getOrNull() }

    /** Androids org.json som Map och List, som motorns läsare tar (JSON-null blir null). */
    private fun karta(o: JSONObject): Map<String, Any?> = o.keys().asSequence().associateWith { varde(o.opt(it)) }
    private fun varde(v: Any?): Any? = when {
        v == null || v == JSONObject.NULL -> null
        v is JSONObject -> karta(v)
        v is JSONArray -> (0 until v.length()).map { varde(v.opt(it)) }
        else -> v
    }
}
