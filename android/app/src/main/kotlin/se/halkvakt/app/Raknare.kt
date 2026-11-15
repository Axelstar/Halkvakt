// Appens anonyma dagsräknare (DECISIONS #772; Axel och Bengt 1/11; sex områden DECISIONS #787, 3/11). Spegel av iOS Raknare.swift.
//
// VAD SOM LÄMNAR TELEFONEN, och inget annat: ett ord per händelse — {h, v, app, ver, k} — till app-raknare, som räknar upp EN
// rad per dygn, app, version, kohort, händelse och värde. Ingen position, ingen sträcka, inget enhets-id, ingen tid. Det som
// finns på servern är "i dag valde 14 Android-ägare Tillåt hela tiden", aldrig vem. Alltid på (variant A); står i
// integritet.html och i appens Integritet. ver = versionName; k = ny | befintlig (hade telefonen appen när räknandet började).
// Sex områden, som iOS (värdelistan bor i supabase/functions/app-raknare/index.ts; Android har introduktionen sedan kort #652 men inget intent):
//   1 vägen in       behorighet (alltid | nar | nekad), notiser (pa | nekad), forsta_starten, forsta_varningen
//   2 aktiva förare  aktiv_dag: en gång per dygn som vakten gick (0 | 1-7 | 8-30 | over30 dagar sedan räknandet började)
//   3 vaktpasset     vakt_startad (hand | sjalv) och resa_slut start:längd:slut — sjalv|knapp, fyra längdhinkar (okand när
//                    processen dog mitt i), parkerad (kvarten) | sjalv (autostarten stängde) | hand | avbruten. Aldrig sträcka.
//   4 varningarna    varning fara:avstånd i hinkar, varning_ersatt, banner (visad | tyst)
//   5 inställningar  installning fara:pa|av, forvarning:400|800|1200, autostart:pa|av
//   6 fel            plats_borta, gammal_data, hamtning_fel — en gång per vaktpass och sort
// Område 1 en gång per enhet och värde, resten när det händer.
// Skickas när appen öppnas (MainActivity) och när bilen står stilla (GuardService, samma stopp som facit) — aldrig under
// körning, inga timers (skill §3). Nätet borta ⇒ kön står kvar till nästa tillfälle.
package se.halkvakt.app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

object Raknare {
    const val ADRESS = "https://xmpfztykhyvhmrzsnjrc.supabase.co/functions/v1/app-raknare"
    private const val MAX_KO = 50
    private val lås = Mutex()   // en sändning i taget: två samtidiga hade skickat samma rad två gånger

    /** Platsbehörigheten som appen ser den just nu. nekad = föraren sa nej i rutan som bad om platsen. */
    suspend fun behorighet(ctx: Context, nekad: Boolean = false) {
        val fin = ctx.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val bak = Build.VERSION.SDK_INT < 29 || ctx.checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
        val v = when { fin && bak -> "alltid"; fin -> "nar"; nekad -> "nekad"; else -> return }
        raknaEnGang(ctx, "behorighet", v)
    }

    /** Varje start räknas; sjalv = autostarten, hand = knappen. Ett pass som aldrig fick sitt slut (processen dog) räknas först,
     *  som avbrutet (#787); sedan dygnets aktiva dag och den första starten. */
    suspend fun vaktStartad(ctx: Context, sjalv: Boolean) {
        if (BuildConfig.DEBUG) return
        val metod = if (sjalv) "sjalv" else "knapp"
        Prefs.raknareBytPass(ctx, "$metod|${System.currentTimeMillis()}")?.substringBefore('|')?.let { lagg(ctx, "resa_slut", "$it:okand:avbruten") }
        felIPasset.clear()
        lagg(ctx, "vakt_startad", if (sjalv) "sjalv" else "hand")
        raknaEnGang(ctx, "forsta_starten")
        val dag = SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).apply { timeZone = TimeZone.getTimeZone("Europe/Stockholm") }.format(System.currentTimeMillis())
        if (Prefs.raknareAktivDag(ctx, dag)) lagg(ctx, "aktiv_dag", dagarHink(System.currentTimeMillis() - Prefs.raknareKohort(ctx).first))
    }

    /** Passet slutade (#787): orsak = parkerad | sjalv | hand. Bara längden i hinkar. */
    suspend fun vaktStoppad(ctx: Context, orsak: String) {
        if (BuildConfig.DEBUG) return
        val pass = Prefs.raknareBytPass(ctx, null) ?: return
        val t0 = pass.substringAfter('|').toLongOrNull() ?: return
        lagg(ctx, "resa_slut", "${pass.substringBefore('|')}:${langdHink(System.currentTimeMillis() - t0)}:$orsak")
    }

    /** Rösten talade (#787): faran och avståndet i hinkar, och faran vars kort byttes ut om ett kort syntes. */
    suspend fun varning(ctx: Context, kind: String, avstandM: Int, ersatte: String?) {
        lagg(ctx, "varning", "$kind:${avstandHink(avstandM)}")
        if (ersatte != null) lagg(ctx, "varning_ersatt", ersatte)
    }

    suspend fun banner(ctx: Context, visad: Boolean) = lagg(ctx, "banner", if (visad) "visad" else "tyst")

    /** Notistillståndet när appen öppnas (#787). Ett nej räknas bara efter att appen frågat. */
    suspend fun notiser(ctx: Context, pa: Boolean, fragat: Boolean) {
        if (pa) raknaEnGang(ctx, "notiser", "pa") else if (fragat) raknaEnGang(ctx, "notiser", "nekad")
    }

    /** Föraren ändrade en inställning (#787): fara:pa|av, forvarning:400|800|1200, autostart:pa|av. */
    suspend fun installning(ctx: Context, v: String) = lagg(ctx, "installning", v)

    /** Något gick fel under passet (#787): plats_borta | gammal_data | hamtning_fel. En gång per pass och sort. */
    private val felIPasset = java.util.Collections.synchronizedSet(mutableSetOf<String>())
    suspend fun fel(ctx: Context, v: String) { if (felIPasset.add(v)) lagg(ctx, "fel", v) }

    fun dagarHink(ms: Long): String { val d = ms / 86_400_000L; return when { d <= 0 -> "0"; d <= 7 -> "1-7"; d <= 30 -> "8-30"; else -> "over30" } }
    fun langdHink(ms: Long): String = when { ms < 180_000 -> "under3"; ms < 900_000 -> "3-15"; ms < 2_700_000 -> "15-45"; else -> "over45" }
    fun avstandHink(m: Int): String = when { m < 400 -> "under400"; m < 800 -> "400-800"; m < 1200 -> "800-1200"; m < 3000 -> "1200-3000"; else -> "over3000" }

    suspend fun forstaVarningen(ctx: Context) = raknaEnGang(ctx, "forsta_varningen")
    /** Introduktionen genomgången eller överhoppad (kort #652), en gång per installation, som iOS. */
    suspend fun onboardingKlar(ctx: Context) = raknaEnGang(ctx, "onboarding_klar")

    private suspend fun raknaEnGang(ctx: Context, h: String, v: String = "") {
        if (BuildConfig.DEBUG) return   // ett debugbygge får inte "minnas" ett ord det aldrig skickade
        val nyckel = if (v.isEmpty()) h else "$h:$v"
        if (!Prefs.raknareMarkera(ctx, nyckel)) return
        lagg(ctx, h, v)
    }

    /** Utvecklarbyggen räknas inte: android.yml:s emulator (fotostudion, Skåneuppspelningen) kör debug-APK:n med platsen beviljad
     *  och vakten startad, och gav tre rader innan någon telefon hade 0.3.15 (1/11). Butiksbygget är release. */
    private suspend fun lagg(ctx: Context, h: String, v: String) {
        if (BuildConfig.DEBUG) return
        Prefs.raknareKohort(ctx)   // #787: kohorten låses vid första händelsen, innan passet hinner skriva en resa
        Prefs.raknareLagg(ctx, "$h $v", MAX_KO)
    }

    /** Skickar kön, en händelse per anrop, och stannar vid första felet. Antalet som gick iväg. */
    suspend fun flush(ctx: Context): Int = lås.withLock {
        val ko = Prefs.raknareKo(ctx).first()
        val k = if (Prefs.raknareKohort(ctx).second) "befintlig" else "ny"
        var sent = 0
        for (rad in ko) {
            val (h, v) = rad.split(" ", limit = 2).let { it[0] to it.getOrElse(1) { "" } }
            if (!posta(h, v, k)) break
            sent++
        }
        if (sent > 0) Prefs.raknareTaBort(ctx, sent)
        sent
    }

    /** true = 204, eller 400 (servern känner inte ordet: kasta, kön får inte fastna bakom det). */
    private fun posta(h: String, v: String, k: String): Boolean = runCatching {
        val conn = URL(ADRESS).openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.connectTimeout = 10_000; conn.readTimeout = 10_000
        conn.doOutput = true
        conn.setRequestProperty("Content-Type", "application/json")
        conn.outputStream.use { it.write("""{"h":"$h","v":"$v","app":"android","ver":"${BuildConfig.VERSION_NAME}","k":"$k"}""".toByteArray()) }
        val code = conn.responseCode
        conn.disconnect()
        code == 204 || code == 400
    }.getOrDefault(false)
}
