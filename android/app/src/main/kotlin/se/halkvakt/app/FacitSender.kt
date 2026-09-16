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
        for (e in pending) {
            val ok = runCatching {
                val conn = URL(Facit.URL).openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.connectTimeout = 10_000; conn.readTimeout = 10_000
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")
                conn.outputStream.use { it.write(Facit.body(e, "android", ver).toByteArray()) }
                val code = conn.responseCode
                conn.disconnect()
                code == 204
            }.getOrDefault(false)
            if (!ok) break
            sent += e
        }
        if (sent.isNotEmpty()) Prefs.markFacitSent(ctx, sent)
        return sent.size
    }
}
