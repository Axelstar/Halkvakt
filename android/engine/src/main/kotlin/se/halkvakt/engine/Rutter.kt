package se.halkvakt.engine

/*
 * SAVED ROUTES (favoriterna steg 2, kort #357; DECISIONS #616, #625) — spegel av engine/src/rutter.ts, prövad mot
 * engine/fixtures/rutter.json i alla tre språk (scripts/rutter-facit.ts); talen vaktas av kontraktsgrinden. Ren logik utan I/O:
 * appen håller filen själv, på telefonen och utanför varje backup.
 *
 * A route is the road the driver actually drove, collected during the trip and offered after it — never an address, never a
 * route search on the net. The collector keeps one point per RUTT_STEG_M and always the last fix, so the route ends where the trip did.
 */

/** Thins a trip's fixes as they arrive: a fix is kept when it lies at least [Rutter.RUTT_STEG_M] from the last kept one. */
class Ruttinsamlare {
    private val kept = mutableListOf<DoubleArray>()
    private var last: DoubleArray? = null
    private var lastKept = false

    fun add(lon: Double, lat: Double) {
        last = doubleArrayOf(lon, lat)
        val k = kept.lastOrNull()
        lastKept = k == null || Geo.haversineM(k[0], k[1], lon, lat) >= Rutter.RUTT_STEG_M
        if (lastKept) kept.add(doubleArrayOf(lon, lat))
    }

    /** The route so far: the kept points, plus the last fix when it was not kept, so the route ends where the trip did. */
    fun route(): List<DoubleArray> {
        val l = last
        return if (l == null || lastKept) kept.toList() else kept + listOf(l)
    }
}

/** [punkter] are [lon, lat], WGS84; [sparad] is UTC ISO-8601. */
data class SparadRutt(val id: String, val namn: String, val sparad: String, val punkter: List<DoubleArray>)

data class Rutter(val rutter: List<SparadRutt> = emptyList()) {
    val schema = 1

    /** Adds a route, or answers null when [MAX_RUTTER] are already saved — the driver removes one first; nothing is pushed out silently. */
    fun laggTill(ny: SparadRutt): Rutter? = if (rutter.size >= MAX_RUTTER) null else Rutter(rutter + ny)

    /** Removes one route by id; an unknown id leaves the list as it is. */
    fun taBort(id: String): Rutter = Rutter(rutter.filter { it.id != id })

    companion object {
        /** One kept point per this many metres of driving (FAVORITER §6). */
        const val RUTT_STEG_M = 75.0
        /** At most this many saved routes (DECISIONS #616, 5.2). */
        const val MAX_RUTTER = 5

        /** The name suggestions after a trip (DECISIONS #625): fixed ones and the date. Free text is always possible in the app. */
        fun namnforslag(dag: Int, manad: Int): List<String> = listOf("Till jobbet", "Hem", "Resa $dag/$manad")
    }
}
