// Förarens missar — "appen missade" (kort #203 lager 2; Axels ja 20/9, DECISIONS #267 punkt 4–5; Bengts "gör 203" 26/9,
// DECISIONS #379). REN Kotlin, JVM-testbar utan Android. Den andra halvan av förarfacit: appen var tyst när den borde varnat.
//
// I BILEN ett tryck: appen sparar klockslaget, närmaste mätstation ur snapshotens stationslista och närmaste halkavsnitt inom
// 2 km om telefonen har något — som id:n, samma ordförråd som varningarna. Ingen koordinat. EFTER RESAN väljer föraren vad
// det var. Först då kan missen skickas: en omarkerad miss skickas aldrig (tystnad är inget svar, KB-D7).
//
// VAD SOM LÄMNAR TELEFONEN, och inget annat: klockslaget, vad, station-id, segment-id, plattform, appversion. Ärligt (Axels
// ord): station-id plus klockslag säger ungefär var föraren var. Bara betatestare med brytaren på.
package se.halkvakt.app

import se.halkvakt.engine.Geo
import se.halkvakt.engine.Hazard
import se.halkvakt.engine.SegmentHazard

data class Station(val id: String, val lon: Double, val lat: Double)

data class MissEntry(val t: Long, val station: String, val segment: String?, val vad: String?, val sent: Boolean)

object Missar {
    /** Förarens fem val — samma ord som tabellens CHECK (sql/038). */
    val VAD = listOf("halka", "vatten", "vilt", "olycka", "annat")
    const val SEGMENT_M = 2_000.0
    const val MAX = 50
    /** 4a (DECISIONS #461): ett andra tryck, eller ett andra "appen missade", inom en minut är samma miss. */
    const val SPARR_MS = 60_000L

    fun encode(list: List<MissEntry>): String = list.joinToString("\n") {
        "${it.t}\t${it.station}\t${it.segment ?: ""}\t${it.vad ?: ""}\t${if (it.sent) 1 else 0}"
    }

    fun decode(s: String): List<MissEntry> = s.lineSequence().mapNotNull { line ->
        val p = line.split('\t')
        if (p.size < 5 || p[1].isEmpty()) null
        else p[0].toLongOrNull()?.let { t -> MissEntry(t, p[1], p[2].ifEmpty { null }, p[3].takeIf { it in VAD }, p[4] == "1") }
    }.toList()

    /** Närmaste station som "wx:<id>" — null bara om telefonen inte har någon stationslista än. */
    fun narmasteStation(stations: List<Station>, lon: Double, lat: Double): String? =
        stations.minByOrNull { Geo.haversineM(lon, lat, it.lon, it.lat) }?.let { "wx:${it.id}" }

    /** Närmaste halkavsnitt ur snapshoten, om någon av dess punkter ligger inom [SEGMENT_M]. */
    fun narmasteSegment(hazards: List<Hazard>, lon: Double, lat: Double): String? =
        hazards.filterIsInstance<SegmentHazard>()
            .map { s -> s.id to (s.line.minOfOrNull { p -> Geo.haversineM(lon, lat, p[0], p[1]) } ?: Double.MAX_VALUE) }
            .filter { it.second <= SEGMENT_M }
            .minByOrNull { it.second }?.first

    /** Ett tryck i bilen. Utan station finns inget att peka på — då sparas ingenting (knappen säger det). */
    fun markera(list: List<MissEntry>, t: Long, station: String?, segment: String?): List<MissEntry> =
        if (station == null || redanMarkerad(list, t) != null) list
        else (list + MissEntry(t, station, segment, null, false)).let { if (it.size > MAX) it.subList(it.size - MAX, it.size) else it }

    /** Markeringen som ett nytt tryck vid [t] skulle dubbla, om den ligger inom [SPARR_MS] — annars null. */
    fun redanMarkerad(list: List<MissEntry>, t: Long): MissEntry? =
        list.lastOrNull()?.takeIf { t - it.t in 0 until SPARR_MS }

    /** Förarens val efter resan. Ett nytt val ersätter det förra och blir osänt igen — förarens senaste ord gäller. */
    fun valj(list: List<MissEntry>, t: Long, vad: String): List<MissEntry> =
        if (vad !in VAD) list else list.map { if (it.t == t) it.copy(vad = vad, sent = false) else it }

    /** Resans missar som ännu saknar val — kortet och notisen frågar om dem. */
    fun omarkerade(list: List<MissEntry>, sedan: Long): List<MissEntry> = list.filter { it.t >= sedan && it.vad == null }

    /** Det som kan skickas: valda, osända och inom serverns fönster (samma 47 h som svaren). */
    fun pending(list: List<MissEntry>, now: Long = System.currentTimeMillis()): List<MissEntry> =
        list.filter { !it.sent && it.vad != null && now - it.t < Facit.MAX_AGE_MS }

    fun markSent(list: List<MissEntry>, sent: Collection<MissEntry>): List<MissEntry> =
        list.map { e -> if (sent.any { it.t == e.t && it.vad == e.vad }) e.copy(sent = true) else e }

    /** Kroppen som skickas — hela kroppen. Läs den: det är allt som lämnar telefonen. */
    fun body(e: MissEntry, app: String, ver: String): String {
        val esc = { s: String -> s.replace("\\", "\\\\").replace("\"", "\\\"") }
        val seg = e.segment?.let { "\"${esc(it)}\"" } ?: "null"
        return "{\"miss\":true,\"t\":\"${Facit.iso(e.t)}\",\"vad\":\"${esc(e.vad ?: "")}\",\"station\":\"${esc(e.station)}\"," +
            "\"segment\":$seg,\"app\":\"${esc(app)}\",\"ver\":\"${esc(ver.take(20))}\"}"
    }

    /** Notisens och kortets fråga när resan bara bar missar. */
    fun fraga(antal: Int): String =
        if (antal == 1) "Du markerade att appen missade något — vad var det?" else "Du markerade $antal missar — vad var det?"
}
