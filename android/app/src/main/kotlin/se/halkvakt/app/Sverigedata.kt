// SVERIGES ORTER OCH KOMMUNER (DECISIONS #917, #930, #941): de två tabellerna som appen bär med sig, lästa en gång. Orterna
// (data/sverige/sverige.json, Natural Earth) är brytpunkterna för en planerad resas sträckor. Kommunerna
// (data/kommuner/kommuner.json) ger målets namn på skärmen Planerad resa: Googles namn på platsen får inte stå bredvid en karta
// (EEA Service Specific Terms, B.15.1), så namnet tas ur Halkvakts egna data. Filerna läggs i appen av bygget, ur data/.
package se.halkvakt.app

import android.content.Context
import org.json.JSONObject
import se.halkvakt.engine.Kommunkarta
import se.halkvakt.engine.Ort

object Sverigedata {
    @Volatile private var orterna: List<Ort>? = null
    @Volatile private var kommunerna: Kommunkarta? = null

    private fun las(ctx: Context, namn: String): Map<String, Any?> =
        Rapporten.karta(JSONObject(ctx.applicationContext.assets.open(namn).bufferedReader().use { it.readText() }))

    /** Blockerar första gången: anropas utanför huvudtråden. */
    fun orter(ctx: Context): List<Ort> = orterna ?: synchronized(this) {
        orterna ?: orter(las(ctx, "sverige.json")).also { orterna = it }
    }

    /** Blockerar första gången: anropas utanför huvudtråden. */
    fun kommuner(ctx: Context): Kommunkarta = kommunerna ?: synchronized(this) {
        kommunerna ?: Kommunkarta.las(las(ctx, "kommuner.json")).also { kommunerna = it }
    }

    internal fun orter(fil: Map<String, Any?>): List<Ort> = (fil["orter"] as? List<*> ?: emptyList<Any?>()).mapNotNull { o ->
        val m = o as? Map<*, *> ?: return@mapNotNull null
        val c = m["c"] as? List<*> ?: return@mapNotNull null
        if (c.size != 2) return@mapNotNull null
        Ort(m["n"] as? String ?: return@mapNotNull null, (c[0] as Number).toDouble(), (c[1] as Number).toDouble())
    }
}
