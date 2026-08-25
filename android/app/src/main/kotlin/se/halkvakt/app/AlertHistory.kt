// Persistent varningshistorik — REN Kotlin (JVM-testbar utan Android).
// Kodas som tab-separerade rader i DataStore; toleranta avkodare (korrupt rad hoppas).
package se.halkvakt.app

data class AlertEntry(val t: Long, val kind: String, val text: String)

object AlertHistory {
    const val MAX = 50

    fun encode(list: List<AlertEntry>): String = list.joinToString("\n") {
        "${it.t}\t${it.kind}\t${it.text.replace('\t', ' ').replace('\n', ' ')}"
    }

    fun decode(s: String): List<AlertEntry> = s.lineSequence().mapNotNull { line ->
        val p = line.split('\t')
        if (p.size < 3) null
        else p[0].toLongOrNull()?.let { AlertEntry(it, p[1], p.subList(2, p.size).joinToString(" ")) }
    }.toList()

    /** Nyaste sist; trimmar äldsta först. */
    fun append(list: List<AlertEntry>, e: AlertEntry, max: Int = MAX): List<AlertEntry> =
        (list + e).let { if (it.size > max) it.subList(it.size - max, it.size) else it }
}
