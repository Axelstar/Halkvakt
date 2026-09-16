// Förarfacit — betatestarnas "stämde det?" (bedömning v3 S4, DECISIONS #186/#196/#201). REN Kotlin,
// JVM-testbar utan Android. Ett svar per varning (id + tid); ett nytt svar ersätter det förra och
// blir osänt igen — förarens senaste ord gäller. Kodas som tab-separerade rader i DataStore, med
// samma toleranta avkodare som varningshistoriken (korrupt rad hoppas).
//
// VAD SOM LÄMNAR TELEFONEN, och inget annat: varningens id, klockslaget, svaret, plattform, appversion.
// Ingen position, ingen resa, inget konto. Men ärligt: ett varnings-id pekar på en fara på kartan och
// klockslaget säger när — så ett svar säger ungefär var bilen var just då. Det står i Om-avsnittet,
// och knappen finns bara för den som själv slagit på betatestet.
package se.halkvakt.app

import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

data class FacitEntry(val id: String, val t: Long, val svar: Boolean, val sent: Boolean)

object Facit {
    const val MAX = 200
    const val URL = "https://xmpfztykhyvhmrzsnjrc.supabase.co/functions/v1/facit-svar"

    fun encode(list: List<FacitEntry>): String = list.joinToString("\n") {
        "${it.t}\t${it.id.replace('\t', ' ').replace('\n', ' ')}\t${if (it.svar) "ja" else "nej"}\t${if (it.sent) 1 else 0}"
    }

    fun decode(s: String): List<FacitEntry> = s.lineSequence().mapNotNull { line ->
        val p = line.split('\t')
        if (p.size < 4) null
        else p[0].toLongOrNull()?.let { t -> FacitEntry(p[1], t, p[2] == "ja", p[3] == "1") }
    }.toList()

    /** Svara på en varning. Ett tidigare svar på samma varning ersätts; det nya är osänt. */
    fun answer(list: List<FacitEntry>, id: String, t: Long, svar: Boolean): List<FacitEntry> =
        (list.filterNot { it.id == id && it.t == t } + FacitEntry(id, t, svar, false))
            .let { if (it.size > MAX) it.subList(it.size - MAX, it.size) else it }

    fun answerFor(list: List<FacitEntry>, id: String, t: Long): Boolean? =
        list.lastOrNull { it.id == id && it.t == t }?.svar

    fun pending(list: List<FacitEntry>): List<FacitEntry> = list.filter { !it.sent }

    /** Markerar exakt de svar som gick iväg — ett svar som hunnit ändras under sändningen förblir osänt. */
    fun markSent(list: List<FacitEntry>, sent: Collection<FacitEntry>): List<FacitEntry> =
        list.map { e -> if (sent.any { it.id == e.id && it.t == e.t && it.svar == e.svar }) e.copy(sent = true) else e }

    /** Kroppen som skickas — hela kroppen. Läs den: det är allt som lämnar telefonen. */
    fun body(e: FacitEntry, app: String, ver: String): String {
        val esc = { s: String -> s.replace("\\", "\\\\").replace("\"", "\\\"") }
        return "{\"id\":\"${esc(e.id)}\",\"t\":\"${iso(e.t)}\",\"svar\":\"${if (e.svar) "ja" else "nej"}\"," +
            "\"app\":\"${esc(app)}\",\"ver\":\"${esc(ver.take(20))}\"}"
    }

    fun iso(t: Long): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }
            .format(java.util.Date(t))
}
