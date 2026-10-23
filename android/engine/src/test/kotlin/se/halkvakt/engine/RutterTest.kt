// DE SPARADE RUTTERNA (DECISIONS #616, #625): Ruttinsamlare och Rutter mot det delade facit engine/fixtures/rutter.json, som
// TypeScript (test/rutter.test.ts) och Swift (RutterTests.swift) prövas mot. Samma punkter, exakt.
package se.halkvakt.engine

import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class RutterTest {

    private fun repoRoot(): File {
        var d = File(System.getProperty("user.dir")).absoluteFile
        while (!File(d, "engine/fixtures").isDirectory) {
            d = d.parentFile ?: error("engine/fixtures not found above ${System.getProperty("user.dir")}")
        }
        return d
    }

    private fun facit() = JSONObject(File(repoRoot(), "engine/fixtures/rutter.json").readText())

    private fun strangar(a: JSONArray) = (0 until a.length()).map { a.getString(it) }

    private fun rutt(id: String) = SparadRutt(id, id, "2026-10-17T18:00:00Z", listOf(doubleArrayOf(15.0, 59.0)))

    @Test fun talenArDeIFacit() {
        val f = facit()
        assertEquals(f.getDouble("ruttStegM"), Rutter.RUTT_STEG_M)
        assertEquals(f.getInt("maxRutter"), Rutter.MAX_RUTTER)
    }

    @Test fun insamlarenSomTypeScript() {
        val fall = facit().getJSONArray("fall")
        assertTrue(fall.length() >= 5, "facit bär sina fall")
        for (k in 0 until fall.length()) {
            val f = fall.getJSONObject(k)
            val fixar = f.getJSONArray("fixar").let { a -> (0 until a.length()).map { val p = a.getJSONArray(it); listOf(p.getDouble(0), p.getDouble(1)) } }
            val r = Ruttinsamlare()
            for (p in fixar) r.add(p[0], p[1])
            val vantat = f.getJSONArray("sparas").let { a -> (0 until a.length()).map { fixar[a.getInt(it)] } }
            assertEquals(vantat, r.route().map { it.toList() }, f.getString("namn"))
        }
    }

    @Test fun listanSomTypeScript() {
        val l = facit().getJSONObject("lista")
        var full = Rutter()
        for (i in 1..Rutter.MAX_RUTTER) full = full.laggTill(rutt("r$i"))!!
        assertEquals(l.getInt("fullAntal"), full.rutter.size)
        assertEquals("null", l.getString("sjatteSvar"))
        assertNull(full.laggTill(rutt("r6")), "den sjätte nekas, inget trängs ut tyst")
        assertEquals(strangar(l.getJSONArray("efterTaBortR3")), full.taBort("r3").rutter.map { it.id })
        assertEquals(strangar(l.getJSONArray("efterTaBortOkand")), full.taBort("okand").rutter.map { it.id })
    }

    @Test fun namnforslagenSomTypeScript() {
        val n = facit().getJSONObject("namnforslag")
        assertEquals(strangar(n.getJSONArray("svar")), Rutter.namnforslag(n.getInt("dag"), n.getInt("manad")))
    }

    @Test fun igenkanningenSomTypeScript() {
        val s = facit().getJSONObject("samma")
        assertEquals(s.getDouble("m"), Rutter.SAMMA_RESA_M)
        assertEquals(s.getDouble("andel"), Rutter.SAMMA_RESA_ANDEL)
        val pkt = { a: JSONArray -> (0 until a.length()).map { val p = a.getJSONArray(it); doubleArrayOf(p.getDouble(0), p.getDouble(1)) } }
        val a = pkt(s.getJSONArray("a"))
        val fall = s.getJSONArray("fall")
        assertEquals(5, fall.length(), "facit bär sina fall")
        for (k in 0 until fall.length()) {
            val f = fall.getJSONObject(k); val b = pkt(f.getJSONArray("b"))
            assertEquals(f.getBoolean("svar"), Rutter.sammaResa(a, b), f.getString("namn"))
            assertEquals(f.getBoolean("svar"), Rutter.sammaResa(b, a), "${f.getString("namn")}, åt andra hållet")
        }
    }
}
