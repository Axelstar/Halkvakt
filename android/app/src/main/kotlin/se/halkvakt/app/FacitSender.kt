// Sändaren för förarfacit (S4). Skickar osända svar — och bara dem — till facit-svar.
// Anropas när bilen står stilla (GuardService) eller när appen öppnas (MainActivity): aldrig under
// körning, inga timers, ingen bakgrundspolling (skill §3). Nätet borta ⇒ försök igen vid nästa stopp.
// Kort #203 lager 2: efter svaren skickas förarens valda missar till samma funktion (Missar.body).
package se.halkvakt.app

import android.content.Context
import kotlinx.coroutines.flow.first
import java.net.HttpURLConnection
import java.net.URL

object FacitSender {
    /** Returnerar antalet svar och missar som gick iväg. 0 när betatestet är av eller inget väntar. */
    suspend fun flush(ctx: Context): Int {
        if (!Prefs.facitEnabled(ctx).first()) return 0
        val pending = Facit.pending(Prefs.facit(ctx).first())
        val missar = Missar.pending(Prefs.missar(ctx).first())
        if (pending.isEmpty() && missar.isEmpty()) return 0
        val ver = runCatching { ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName }.getOrNull() ?: "?"
        val klockan = android.text.format.DateFormat.format("HH:mm", System.currentTimeMillis())
        val sent = mutableListOf<FacitEntry>()
        var fel: String? = null
        for (e in pending) {
            fel = posta(Facit.body(e, "android", ver)); if (fel != null) break
            sent += e
        }
        val sentMissar = mutableListOf<MissEntry>()
        if (fel == null) for (m in missar) {
            fel = posta(Missar.body(m, "android", ver)); if (fel != null) break
            sentMissar += m
        }
        if (sent.isNotEmpty()) Prefs.markFacitSent(ctx, sent)
        if (sentMissar.isNotEmpty()) Prefs.markMissarSent(ctx, sentMissar)
        val delar = Facit.kvittodelar(sent.size, sentMissar.size)
        if (fel != null) Prefs.setFacitStatus(ctx, "Kunde inte skicka $klockan: $fel")
        else if (delar.isNotEmpty()) Prefs.setFacitStatus(ctx, "Skickat $klockan (${delar.joinToString(", ")})")
        return sent.size + sentMissar.size
    }

    /** Ett anrop. null = 204; annars felet i läsbar form — det testaren och Claude behöver se under knapparna. */
    private fun posta(kropp: String): String? = runCatching {
        val conn = URL(Facit.URL).openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.connectTimeout = 10_000; conn.readTimeout = 10_000
        conn.doOutput = true
        conn.setRequestProperty("Content-Type", "application/json")
        conn.outputStream.use { it.write(kropp.toByteArray()) }
        val code = conn.responseCode
        val svar = if (code == 204) "" else runCatching { conn.errorStream?.bufferedReader()?.readText() ?: "" }.getOrDefault("")
        conn.disconnect()
        if (code == 204) null else "HTTP $code ${svar.take(80)}"
    }.getOrElse { "${it.javaClass.simpleName}: ${it.message?.take(60) ?: ""}" }
}
