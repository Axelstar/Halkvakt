// RESANS RAPPORT (favoriterna steg 3a, DECISIONS #636, #637): ResansRapport mot det delade facit engine/fixtures/rapport.json, som
// TypeScript (test/rapport-app.test.ts) och Swift (RapportTests.swift) prövas mot. Indata läses med motorns egna läsare. Id, slag, rubrik,
// text och ordning exakt; avstånden och platserna inom en meter (avrundningen av ett tal som slutar på ,5 får skilja).
package se.halkvakt.engine

import org.json.JSONObject
import java.io.File
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class RapportTest {

    private fun repoRoot(): File {
        var d = File(System.getProperty("user.dir")).absoluteFile
        while (!File(d, "engine/fixtures").isDirectory) {
            d = d.parentFile ?: error("engine/fixtures not found above ${System.getProperty("user.dir")}")
        }
        return d
    }

    private fun facit(): Map<String, Any?> = JSONObject(File(repoRoot(), "engine/fixtures/rapport.json").readText()).toMap()

    @Suppress("UNCHECKED_CAST")
    private fun obj(a: Any?) = a as Map<String, Any?>
    @Suppress("UNCHECKED_CAST")
    private fun lista(a: Any?) = a as List<Any?>
    private fun punkter(a: Any?): List<DoubleArray> =
        lista(a).map { p -> lista(p).let { doubleArrayOf((it[0] as Number).toDouble(), (it[1] as Number).toDouble()) } }

    private class In(val rutt: List<DoubleArray>, val lage: RapportLage, val kameror: List<RapportKamera>, val snabb: Rapportfil,
                     val linjer: Map<String, List<List<DoubleArray>>>)

    private fun indata(f: Map<String, Any?>): In {
        val i = obj(f["in"])
        return In(punkter(i["rutt"]), ResansRapport.lasLage(obj(i["live"])), ResansRapport.lasKameror(obj(i["stat"])),
            ResansRapport.lasRapportfil(obj(i["snabb"]))!!, ResansRapport.lasLinjer(obj(i["lang"])))
    }

    private fun jamfor(rader: List<RapportRad>, vantat: List<Map<String, Any?>>, namn: String) {
        assertEquals(vantat.map { it["id"] }, rader.map { it.id }, "$namn: samma rader i samma ordning")
        for ((r, v) in rader.zip(vantat)) {
            assertEquals(v["slag"], r.slag.wire, "$namn ${r.id}: slaget")
            assertEquals(v["rubrik"], r.rubrik, "$namn ${r.id}: rubriken")
            assertEquals(v["text"], r.text, "$namn ${r.id}: texten")
            assertTrue(abs(r.avstandM - (v["avstandM"] as Number).toInt()) <= 1, "$namn ${r.id}: avståndet ${r.avstandM} mot ${v["avstandM"]}")
            assertTrue(abs(r.langsM - (v["langsM"] as Number).toInt()) <= 1, "$namn ${r.id}: platsen ${r.langsM} mot ${v["langsM"]}")
            assertEquals(v["vag"], r.vag, "$namn ${r.id}: vägen")
            assertEquals(v["start"], r.start, "$namn ${r.id}: starten")
        }
    }

    @Test fun troskalarnaArDeIFacit() {
        val f = facit()
        val m = obj(f["marginaler"])
        assertEquals(RapportSlag.entries.size, m.size)
        for ((k, v) in m) assertEquals((v as Number).toDouble(), ResansRapport.MARGINALER[RapportSlag.of(k)!!], k)
        val l = obj(f["langs"])
        assertEquals((l["andel"] as Number).toDouble(), ResansRapport.LANGS_ANDEL)
        assertEquals((l["minstM"] as Number).toDouble(), ResansRapport.LANGS_MINST_M)
        assertEquals((l["stegM"] as Number).toDouble(), ResansRapport.LANGS_STEG_M)
        assertEquals((f["gruppFran"] as Number).toInt(), ResansRapport.GRUPP_FRAN)
    }

    @Test fun ditOchHemSomTypeScript() {
        val f = facit(); val i = indata(f)
        for ((hem, nyckel) in listOf(false to "dit", true to "hem")) {
            val d = obj(f[nyckel])
            val rader = ResansRapport.resansRapport(i.rutt, hem, i.lage, i.kameror, i.snabb, i.linjer)
            jamfor(rader, lista(d["rader"]).map(::obj), nyckel)
            val grupper = ResansRapport.grupperade(rader); val vg = lista(d["grupper"]).map(::obj)
            assertEquals(vg.map { it["id"] }, grupper.map { it.id }, "$nyckel: grupperna")
            for ((g, v) in grupper.zip(vg)) {
                assertEquals(v["rubrik"], g.rubrik, "$nyckel ${g.id}: rubriken")
                assertEquals(v["text"], g.text, "$nyckel ${g.id}: texten")
                assertEquals((v["antal"] as Number).toInt(), g.antal)
                assertEquals(v["ids"], g.ids, "$nyckel ${g.id}: raderna i gruppen")
            }
            val t = ResansRapport.tomma(rader); val vt = obj(d["tomma"])
            assertEquals(vt["inget"], t.inget.map { it.wire }, "$nyckel: det tomma")
            assertEquals(vt["koerMatsInte"], t.koerMatsInte)
        }
    }

    @Test fun riktningenSomTypeScript() {
        val f = facit(); val i = indata(f)
        val fall = lista(f["riktning"]).map(::obj)
        assertEquals(4, fall.size)
        for (c in fall) assertEquals((c["svar"] as Number).toInt(), ResansRapport.riktning(lista(c["delar"]).map(::punkter), i.rutt, 100.0),
            c["namn"] as String)
    }

    @Test fun nyttSedanSomTypeScript() {
        val f = facit(); val i = indata(f)
        val dit = ResansRapport.resansRapport(i.rutt, false, i.lage, i.kameror, i.snabb, i.linjer)
        val n = obj(f["nytt"]); val foreIds = lista(n["fore"])
        assertEquals(n["ut"], ResansRapport.nyttSedan(dit.filter { it.id in foreIds }, dit))
        assertEquals(emptyList(), ResansRapport.nyttSedan(null, dit))
    }
}
