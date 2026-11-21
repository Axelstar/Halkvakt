package se.halkvakt.engine

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sqrt

/*
 * KOMMUNKARTAN (DECISIONS #917) — spegel av Kommunkarta.swift, med samma prov. Vilken kommun en plats ligger i, räknat ur tabellen
 * data/kommuner/kommuner.json. Ren geometri: ingenting skickas härifrån. Gränserna är förenklade, så en plats i en remsa längs en
 * kust eller en gräns kan hamna utanför varje yta. Då svarar den närmaste mittpunkten inom RESERV_M, och bortom den finns inget svar.
 */

/** [k] är kommunkoden (de två första siffrorna är länet), [c] mittpunkten [lon, lat], [p] ringar av [lon, lat]. */
class Kommun(val k: String, val n: String, val c: DoubleArray, val p: List<List<DoubleArray>>)

class Kommunkarta(val kommuner: List<Kommun>) {
    fun kommun(lon: Double, lat: Double): Kommun? {
        kommuner.firstOrNull { innanfor(it.p, lon, lat) }?.let { return it }
        var narmast: Kommun? = null
        var kortast = RESERV_M
        for (k in kommuner) {
            if (k.c.size != 2) continue
            val d = avstandM(lon, lat, k.c[0], k.c[1])
            if (d <= kortast) { kortast = d; narmast = k }
        }
        return narmast
    }

    companion object {
        const val RESERV_M = 15_000.0

        /** Läser filen som Map och List, som rapportens läsare. En post utan kod eller namn hoppas över. */
        fun las(fil: Map<String, Any?>): Kommunkarta {
            fun punkt(a: Any?): DoubleArray? = (a as? List<*>)?.takeIf { it.size == 2 }
                ?.let { doubleArrayOf((it[0] as Number).toDouble(), (it[1] as Number).toDouble()) }
            return Kommunkarta((fil["kommuner"] as? List<*> ?: emptyList<Any?>()).mapNotNull { o ->
                val m = o as? Map<*, *> ?: return@mapNotNull null
                Kommun(m["k"] as? String ?: return@mapNotNull null, m["n"] as? String ?: return@mapNotNull null,
                    punkt(m["c"]) ?: DoubleArray(0),
                    (m["p"] as? List<*> ?: emptyList<Any?>()).map { ring -> (ring as List<*>).mapNotNull(::punkt) })
            })
        }

        /** Jämnt-udda över alla ringar, så att både öar och hål fungerar. */
        fun innanfor(ringar: List<List<DoubleArray>>, x: Double, y: Double): Boolean {
            var inne = false
            for (ring in ringar) {
                if (ring.size < 3) continue
                var j = ring.size - 1
                for (i in ring.indices) {
                    val xi = ring[i][0]; val yi = ring[i][1]; val xj = ring[j][0]; val yj = ring[j][1]
                    if ((yi > y) != (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inne = !inne
                    j = i
                }
            }
            return inne
        }

        /** Avståndet i meter på plan jord: gott nog på de här avstånden. */
        fun avstandM(lon1: Double, lat1: Double, lon2: Double, lat2: Double): Double {
            val kx = cos((lat1 + lat2) / 2 * PI / 180) * 111_320
            val dx = (lon2 - lon1) * kx; val dy = (lat2 - lat1) * 110_540
            return sqrt(dx * dx + dy * dy)
        }
    }
}
