// Persistent varningshistorik — REN Kotlin (JVM-testbar utan Android).
// Kodas som tab-separerade rader i DataStore; toleranta avkodare (korrupt rad hoppas).
package se.halkvakt.app

/** `id` = motorns hazardId (S4: facitknappen behöver veta VILKEN varning). Tomt för rader från före 16/9. */
data class AlertEntry(val t: Long, val kind: String, val text: String, val id: String = "")

object AlertHistory {
    const val MAX = 50

    fun encode(list: List<AlertEntry>): String = list.joinToString("\n") {
        "${it.t}\t${it.kind}\t${it.text.replace('\t', ' ').replace('\n', ' ')}\t${it.id.replace('\t', ' ').replace('\n', ' ')}"
    }

    fun decode(s: String): List<AlertEntry> = s.lineSequence().mapNotNull { line ->
        val p = line.split('\t')
        if (p.size < 3) null
        else p[0].toLongOrNull()?.let { AlertEntry(it, p[1], p[2], p.getOrElse(3) { "" }) }   // 3 kolumner = rad från före 16/9
    }.toList()

    /** Nyaste sist; trimmar äldsta först. */
    fun append(list: List<AlertEntry>, e: AlertEntry, max: Int = MAX): List<AlertEntry> =
        (list + e).let { if (it.size > max) it.subList(it.size - max, it.size) else it }
}
