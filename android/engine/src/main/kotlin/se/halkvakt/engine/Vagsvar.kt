package se.halkvakt.engine

/*
 * VÄGTJÄNSTENS SVAR (kort #659, DECISIONS #870, #941): läser Googles svar på en adressökning (Places API (New), autocomplete) och på
 * en ruttfråga (Routes API, computeRoutes). Ren logik: läsarna tar JSON som Map och List, som rapportens läsare, så att de går att
 * pröva utan telefon. Anropen görs i appen (Vagtjanst.kt), som är den enda filen som frågar Google.
 *
 * Av svaret om vägen används bara linjen, längden och restiden. Vägbeskrivningen och stegen begärs inte: Googles villkor för Europa
 * förbjuder dem tillsammans med en karta (EEA Service Specific Terms, B.20.1).
 */
object Vagsvar {
    /** Ett förslag i söklistan: Googles id för platsen, namnet och raden under. */
    data class Forslag(val placeId: String, val titel: String, val under: String)

    /** En bilväg: punkterna som [lon, lat], längden och restiden. */
    data class Vag(val punkter: List<DoubleArray>, val meter: Int, val restidS: Double?)

    /** Så många förslag visas, som på iPhone. */
    const val FLEST_FORSLAG = 6

    @Suppress("UNCHECKED_CAST")
    private fun obj(a: Any?): Map<String, Any?>? = a as? Map<String, Any?>
    private fun lista(a: Any?): List<Any?> = a as? List<Any?> ?: emptyList()
    private fun text(a: Any?): String? = obj(a)?.get("text") as? String

    /** Förslagen ur svaret på autocomplete. Ett förslag utan id eller namn hoppas över. */
    fun forslag(svar: Map<String, Any?>): List<Forslag> = lista(svar["suggestions"]).mapNotNull { s ->
        val p = obj(obj(s)?.get("placePrediction")) ?: return@mapNotNull null
        val id = p["placeId"] as? String ?: return@mapNotNull null
        val format = obj(p["structuredFormat"])
        val titel = text(format?.get("mainText")) ?: text(p["text"]) ?: return@mapNotNull null
        Forslag(id, titel, text(format?.get("secondaryText")) ?: "")
    }.take(FLEST_FORSLAG)

    /** Den första vägen ur svaret på computeRoutes. null när ingen väg finns eller linjen är kortare än två punkter. */
    fun vag(svar: Map<String, Any?>): Vag? {
        val r = obj(lista(svar["routes"]).firstOrNull()) ?: return null
        val punkter = avkoda(obj(r["polyline"])?.get("encodedPolyline") as? String ?: return null)
        if (punkter.size < 2) return null
        // Restiden står som "3600s".
        val restid = (r["duration"] as? String)?.removeSuffix("s")?.toDoubleOrNull()
        return Vag(punkter, (r["distanceMeters"] as? Number)?.toInt() ?: 0, restid)
    }

    /** Googles kodade linje (precision fem decimaler) som punkter [lon, lat]. En trasig sträng ger punkterna fram till felet. */
    fun avkoda(kodad: String): List<DoubleArray> {
        val ut = ArrayList<DoubleArray>()
        var i = 0; var lat = 0; var lon = 0
        fun nasta(): Int? {
            var resultat = 0; var skift = 0
            while (true) {
                if (i >= kodad.length) return null
                val b = kodad[i++].code - 63
                if (b < 0) return null
                resultat = resultat or ((b and 0x1f) shl skift)
                skift += 5
                if (b < 0x20) break
            }
            return if (resultat and 1 != 0) (resultat shr 1).inv() else resultat shr 1
        }
        while (i < kodad.length) {
            lat += nasta() ?: break
            lon += nasta() ?: break
            ut += doubleArrayOf(lon / 1e5, lat / 1e5)
        }
        return ut
    }
}
