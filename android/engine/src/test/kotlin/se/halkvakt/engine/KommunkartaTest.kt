// Kommunkartan (DECISIONS #917): samma prov som KommunkartaTests.swift, och den riktiga filen läst en gång.
package se.halkvakt.engine

import org.json.JSONObject
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class KommunkartaTest {
    private fun ruta(x0: Double, y0: Double, x1: Double, y1: Double) =
        listOf(doubleArrayOf(x0, y0), doubleArrayOf(x1, y0), doubleArrayOf(x1, y1), doubleArrayOf(x0, y1), doubleArrayOf(x0, y0))

    private val karta = Kommunkarta(listOf(
        // En ruta med ett hål, och hålet är en egen kommun.
        Kommun("1280", "Yttre", doubleArrayOf(13.5, 55.5), listOf(ruta(13.0, 55.0, 14.0, 56.0), ruta(13.4, 55.4, 13.6, 55.6))),
        Kommun("1281", "Inre", doubleArrayOf(13.5, 55.5), listOf(ruta(13.4, 55.4, 13.6, 55.6))),
        Kommun("2584", "Norr", doubleArrayOf(20.0, 67.5), listOf(ruta(19.0, 67.0, 21.0, 68.0))),
    ))

    @Test fun enPlatsInneIEnYtaFarDenKommunen() {
        assertEquals("1280", karta.kommun(13.1, 55.1)?.k)
        assertEquals("2584", karta.kommun(20.5, 67.2)?.k)
    }

    @Test fun ettHalHorTillKommunenSomFyllerDet() {
        assertEquals("1281", karta.kommun(13.5, 55.5)?.k)
    }

    @Test fun enRemsaStraxUtanforFarNarmasteMittpunktInomReserven() {
        // 0,05 grader norr om den norra rutan: omkring 5,5 km utanför, 61 km från mittpunkten.
        assertNull(karta.kommun(20.0, 68.05))
        val liten = Kommunkarta(listOf(Kommun("0180", "Liten", doubleArrayOf(18.05, 59.33), listOf(ruta(18.0, 59.3, 18.1, 59.36)))))
        assertEquals("0180", liten.kommun(18.11, 59.33)?.k)
    }

    @Test fun langtBortFinnsIngenKommun() {
        assertNull(karta.kommun(12.57, 55.68 - 3))
        assertNull(karta.kommun(0.0, 0.0))
    }

    @Test fun filformatetLases() {
        val json = """{"kommuner":[{"k":"1280","n":"Malmö","c":[13.0,55.6],"p":[[[12.9,55.5],[13.1,55.5],[13.1,55.7],[12.9,55.7],[12.9,55.5]]]},{"n":"utan kod"}]}"""
        val k = Kommunkarta.las(JSONObject(json).toMap())
        assertEquals(1, k.kommuner.size)
        assertEquals("Malmö", k.kommun(13.0, 55.6)?.n)
    }

    @Test fun denRiktigaFilenBarAllaKommuner() {
        var d = File(System.getProperty("user.dir")).absoluteFile
        while (!File(d, "data/kommuner/kommuner.json").isFile) d = d.parentFile ?: error("data/kommuner hittades inte")
        val k = Kommunkarta.las(JSONObject(File(d, "data/kommuner/kommuner.json").readText()).toMap())
        assertEquals(290, k.kommuner.size)
        assertEquals("Malmö", k.kommun(13.0038, 55.6050)?.n)
        assertEquals("Stockholm", k.kommun(18.0686, 59.3293)?.n)
    }
}
