// Resplanen (kort #659): filen går runt, en resa ligger kvar till sex timmar efter avresan, och målets namn kommer ur
// Halkvakts egen kommuntabell.
package se.halkvakt.app

import org.json.JSONObject
import se.halkvakt.engine.Kommun
import se.halkvakt.engine.Kommunkarta
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ResplanTest {
    private val vag = listOf(doubleArrayOf(13.0, 55.6), doubleArrayOf(13.1, 55.7), doubleArrayOf(13.2, 55.8))

    @Test fun filenGarRunt() {
        val p = Resplan.franJson(Resplan.tillJson(Resplan.Plan("Lund", vag, 21.5, 1260.0, 1_800_000_000_000L)))!!
        assertEquals("Lund", p.mal); assertEquals(21.5, p.km); assertEquals(1260.0, p.restidS); assertEquals(1_800_000_000_000L, p.avresaMs)
        assertEquals(3, p.punkter.size); assertEquals(13.2, p.punkter[2][0]); assertEquals(55.8, p.punkter[2][1])
        val utan = Resplan.franJson(Resplan.tillJson(Resplan.Plan("Lund", vag, 21.5, null, null)))!!
        assertNull(utan.restidS); assertNull(utan.avresaMs)
        // Påminnelsen (DECISIONS #983) följer med i filen, och en fil från före den läses som utan påminnelse.
        assertFalse(p.paminn)
        assertTrue(Resplan.franJson(Resplan.tillJson(Resplan.Plan("Lund", vag, 21.5, 1260.0, 1_800_000_000_000L, paminn = true)))!!.paminn)
        assertFalse(Resplan.franJson("""{"mal":"Lund","km":1,"restidS":null,"avresaMs":5,"punkter":[[13.0,55.7],[13.1,55.8]]}""")!!.paminn)
    }

    @Test fun enTrasigFilGerIngenResa() {
        assertNull(Resplan.franJson("inte json"))
        assertNull(Resplan.franJson("""{"mal":"Lund","km":1,"punkter":[[13.0,55.6]]}"""))
        assertNull(Resplan.franJson(JSONObject().put("mal", "Lund").toString()))
    }

    @Test fun resanLiggerKvarTillSexTimmarEfterAvresan() {
        val avresa = 1_800_000_000_000L
        val p = Resplan.Plan("Lund", vag, 21.5, 1260.0, avresa)
        assertTrue(Resplan.kvar(p, avresa - 1)); assertTrue(Resplan.kvar(p, avresa + Resplan.KVAR_EFTER_AVRESA_MS - 1))
        assertFalse(Resplan.kvar(p, avresa + Resplan.KVAR_EFTER_AVRESA_MS))
        assertFalse(Resplan.kvar(Resplan.Plan("Lund", vag, 21.5, 1260.0, null), avresa))
    }

    @Test fun maletHeterSomKommunenDetLiggerI() {
        val ruta = listOf(doubleArrayOf(13.0, 55.0), doubleArrayOf(14.0, 55.0), doubleArrayOf(14.0, 56.0), doubleArrayOf(13.0, 56.0), doubleArrayOf(13.0, 55.0))
        val karta = Kommunkarta(listOf(Kommun("1281", "Lund", doubleArrayOf(13.5, 55.5), listOf(ruta))))
        assertEquals("Lund", Resplan.malnamn(doubleArrayOf(13.2, 55.8), karta))
        assertEquals(Resplan.OKANT_MAL, Resplan.malnamn(doubleArrayOf(0.0, 0.0), karta))
    }

    @Test fun orternaLasesUrTabellen() {
        val fil = Rapporten.karta(JSONObject("""{"kontur":[],"orter":[{"n":"Exempelstad","c":[15.0,57.0]},{"n":"utan plats"},{"c":[1,2]}]}"""))
        val orter = Sverigedata.orter(fil)
        assertEquals(1, orter.size)
        assertEquals("Exempelstad", orter[0].namn); assertEquals(15.0, orter[0].lon); assertEquals(57.0, orter[0].lat)
    }
}
