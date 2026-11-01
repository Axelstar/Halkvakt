// Appens anonyma dagsräknare (DECISIONS #772; Axel och Bengt 1/11). Spegel av iOS Raknare.swift.
//
// VAD SOM LÄMNAR TELEFONEN, och inget annat: ett ord per händelse — {h, v, app} — till app-raknare, som räknar upp EN rad
// per dygn, app, händelse och värde. Ingen position, ingen resa, inget enhets-id, ingen version, ingen tid. Det som finns på
// servern är "i dag valde 14 Android-ägare Tillåt hela tiden", aldrig vem. Alltid på (variant A); står i integritet.html och i
// appens Integritet. Tre händelser här (Android har ingen introduktion, så onboarding_klar finns bara på iOS):
//   behorighet         platsbehörigheten blev alltid (hela tiden) | nar (när appen används) | nekad
//   vakt_startad       vakten startade: hand (knappen) | sjalv (autostarten)
//   forsta_varningen   första repliken någonsin på enheten
// En gång per enhet och värde, utom vakt_startad som räknas varje gång (också en omstart efter ett kvartsstopp).
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

    /** Varje start räknas; sjalv = autostarten, hand = knappen. */
    suspend fun vaktStartad(ctx: Context, sjalv: Boolean) = lagg(ctx, "vakt_startad", if (sjalv) "sjalv" else "hand")

    suspend fun forstaVarningen(ctx: Context) = raknaEnGang(ctx, "forsta_varningen")

    private suspend fun raknaEnGang(ctx: Context, h: String, v: String = "") {
        val nyckel = if (v.isEmpty()) h else "$h:$v"
        if (!Prefs.raknareMarkera(ctx, nyckel)) return
        lagg(ctx, h, v)
    }

    private suspend fun lagg(ctx: Context, h: String, v: String) = Prefs.raknareLagg(ctx, "$h $v", MAX_KO)

    /** Skickar kön, en händelse per anrop, och stannar vid första felet. Antalet som gick iväg. */
    suspend fun flush(ctx: Context): Int = lås.withLock {
        val ko = Prefs.raknareKo(ctx).first()
        var sent = 0
        for (rad in ko) {
            val (h, v) = rad.split(" ", limit = 2).let { it[0] to it.getOrElse(1) { "" } }
            if (!posta(h, v)) break
            sent++
        }
        if (sent > 0) Prefs.raknareTaBort(ctx, sent)
        sent
    }

    /** true = 204, eller 400 (servern känner inte ordet: kasta, kön får inte fastna bakom det). */
    private fun posta(h: String, v: String): Boolean = runCatching {
        val conn = URL(ADRESS).openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.connectTimeout = 10_000; conn.readTimeout = 10_000
        conn.doOutput = true
        conn.setRequestProperty("Content-Type", "application/json")
        conn.outputStream.use { it.write("""{"h":"$h","v":"$v","app":"android"}""".toByteArray()) }
        val code = conn.responseCode
        conn.disconnect()
        code == 204 || code == 400
    }.getOrDefault(false)
}
