// Sändaren för förarfacit (S4). Skickar osända svar — och bara dem — till facit-svar.
// Anropas när bilen står stilla (GuardService) eller när appen öppnas (MainActivity): aldrig under
// körning, inga timers, ingen bakgrundspolling (skill §3). Nätet borta ⇒ försök igen vid nästa stopp.
package se.halkvakt.app

import android.content.Context
import kotlinx.coroutines.flow.first
import java.net.HttpURLConnection
import java.net.URL

object FacitSender {
    /** Returnerar antalet svar som gick iväg. 0 när betatestet är av eller inget väntar. */
    suspend fun flush(ctx: Context): Int {
        if (!Prefs.facitEnabled(ctx).first()) return 0
        val pending = Facit.pending(Prefs.facit(ctx).first())
        if (pending.isEmpty()) return 0
        val ver = runCatching { ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName }.getOrNull() ?: "?"
        val sent = mutableListOf<FacitEntry>()
        val klockan = android.text.format.DateFormat.format("HH:mm", System.currentTimeMillis())
        for (e in pending) {
            // Felet fångas och blir läsbart under knapparna — det är det testaren och Claude behöver se.
            val fel = runCatching {
                val conn = URL(Facit.URL).openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.connectTimeout = 10_000; conn.readTimeout = 10_000
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")
                conn.outputStream.use { it.write(Facit.body(e, "android", ver).toByteArray()) }
                val code = conn.responseCode
                val kropp = if (code == 204) "" else runCatching { conn.errorStream?.bufferedReader()?.readText() ?: "" }.getOrDefault("")
                conn.disconnect()
                if (code == 204) null else "HTTP $code ${kropp.take(80)}"
            }.getOrElse { "${it.javaClass.simpleName}: ${it.message?.take(60) ?: ""}" }
            if (fel != null) { Prefs.setFacitStatus(ctx, "Kunde inte skicka $klockan: $fel"); break }
            sent += e
        }
        if (sent.isNotEmpty()) { Prefs.markFacitSent(ctx, sent); Prefs.setFacitStatus(ctx, "Skickat $klockan (${sent.size} svar)") }
        return sent.size
    }
}
