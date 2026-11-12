// Mirror of engine/src/smavagfil.ts — keep 1:1 (DECISIONS #828 byggsteg 7, #844). Held to engine/fixtures/smavagprov.json by
// SmavagFilTest, like the TS and Swift readers. The point file (smavag.json, schema 2) lists every small-road point in the order of
// the bits in live.json's `smavag`; each point carries its road (`vag`) and place along it (`ordning`). Silence is a feature: an
// unknown schema, a besked for another file, a wrong point or byte count or a value that is not a whole number gives no hazards.
// Only roads with a warning point become hazards, and a road with a single point is left out (the road test needs two neighbours).
package se.halkvakt.app

import org.json.JSONArray
import org.json.JSONObject
import se.halkvakt.engine.SmavagHazard
import java.util.Base64

class SmavagFil private constructor(val lon: DoubleArray, val lat: DoubleArray, val vag: IntArray, val ordning: IntArray) {
    val n: Int get() = lon.size

    /** The hazards for live.json's `smavag` besked, read against this file, whose verified sha256 is [filSha]. */
    fun hazards(besked: JSONObject?, filSha: String?): List<SmavagHazard> {
        if (besked == null || filSha == null || besked.isNull("fil") || besked.get("fil").toString() != filSha) return emptyList()
        val bn = besked.opt("n") as? Number ?: return emptyList()
        if (bn.toDouble() != n.toDouble() || besked.isNull("bitar")) return emptyList()
        val bytes = runCatching { Base64.getDecoder().decode(besked.get("bitar").toString()) }.getOrNull() ?: return emptyList()
        if (bytes.size != (n + 7) / 8) return emptyList()
        fun varnar(i: Int) = (((bytes[i shr 3].toInt() and 0xFF) shr (i and 7)) and 1) == 1   // infix binds looser than ==
        val varnandeVagar = HashSet<Int>()
        for (i in 0 until n) if (varnar(i)) varnandeVagar.add(vag[i])
        val perVag = HashMap<Int, MutableList<Int>>()
        for (i in 0 until n) if (vag[i] in varnandeVagar) perVag.getOrPut(vag[i]) { mutableListOf() }.add(i)
        val out = ArrayList<SmavagHazard>()
        for (v in perVag.keys.sorted()) {
            val idx = perVag.getValue(v).sortedBy { ordning[it] }
            if (idx.size < 2) continue
            out.add(SmavagHazard(id = "smv:$v", points = idx.map { doubleArrayOf(lon[it], lat[it]) },
                warn = idx.indices.filter { varnar(idx[it]) }))
        }
        return out
    }

    companion object {
        /** smavag.json as downloaded. null = an unknown schema or an invalid file. */
        fun parse(doc: JSONObject): SmavagFil? {
            val schema = doc.opt("schema") as? Number
            if (schema == null || schema.toDouble() != 2.0) return null
            val p = doc.optJSONArray("punkter") ?: return null
            val v = doc.optJSONArray("vag") ?: return null
            val r = doc.optJSONArray("ordning") ?: return null
            val n = p.length()
            if (v.length() != n || r.length() != n) return null
            val lon = DoubleArray(n); val lat = DoubleArray(n); val vag = IntArray(n); val ordning = IntArray(n)
            for (i in 0 until n) {
                val q = p.optJSONArray(i) ?: return null
                lon[i] = tal(q, 0) ?: return null
                lat[i] = tal(q, 1) ?: return null
                vag[i] = heltal(v, i) ?: return null
                ordning[i] = heltal(r, i) ?: return null
            }
            return SmavagFil(lon, lat, vag, ordning)
        }

        // JVM tests run json-java, Android its own org.json: a number can be Integer, Long, Double or BigDecimal in either (#289).
        private fun tal(a: JSONArray, i: Int): Double? = (a.opt(i) as? Number)?.toDouble()?.takeIf { it.isFinite() }

        /** A whole number, or null (a fraction, a word, a boolean or null). */
        private fun heltal(a: JSONArray, i: Int): Int? {
            val d = (a.opt(i) as? Number)?.toDouble() ?: return null
            return if (d.isFinite() && d == Math.floor(d)) d.toInt() else null
        }
    }
}
