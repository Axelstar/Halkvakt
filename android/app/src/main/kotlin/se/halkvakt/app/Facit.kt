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

    /** Servern tar bara emot svar inom ±48 h (facit-svar). 47 h = en timmes marginal. Äldre svar skickas inte och
     *  frågas inte om — ett svar på en gammal varning gav HTTP 400 vid varje försök och stoppade kön (fynd 23/9). */
    const val MAX_AGE_MS = 47L * 3600 * 1000

    fun pending(list: List<FacitEntry>, now: Long = System.currentTimeMillis()): List<FacitEntry> =
        list.filter { !it.sent && now - it.t < MAX_AGE_MS }

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

    // STATUSRADEN (Bengts provresa 28/9, docs/TILL-AXEL-BYGGE-19.md Android 1; samma regler som iOS sedan kort #279).
    // Raden är EN för hela appen och överlever omstart, så "Skickat 13:52 (1 missar)" under en obesvarad rad lästes som att
    // raden gått, och gårdagens kvitto stod under dagens varningar. `at` är när raden skrevs; 0 = före den här ändringen.

    /** Kvittots delar, rätt böjda: "2 svar", "1 miss", "3 missar". */
    fun kvittodelar(svar: Int, missar: Int): List<String> = listOfNotNull(
        svar.takeIf { it > 0 }?.let { "$it svar" },
        missar.takeIf { it > 0 }?.let { if (it == 1) "1 miss" else "$it missar" })

    /** Kortet efter resan: bara ett FEL, och bara den här resans. Besvarade varningar försvinner ur kortet och en vald miss
     *  säger "Skickad" själv — ett lyckat kvitto behöver ingen rad där. */
    fun kortetsStatus(status: String?, at: Long, resanStart: Long): String? =
        status?.takeIf { !it.startsWith("Skickat") && at >= resanStart }

    /** Under senast sagda varningen: bara en sändning yngre än varningen — en äldre rad är ett kvitto på något annat. */
    fun radensStatus(status: String?, at: Long, varningen: Long): String? = status?.takeIf { at >= varningen }
}
