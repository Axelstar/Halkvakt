// Tipsa en vän och Tyck till (DECISIONS #829): när kortet visas, och att mejlet bara bär de tre tekniska raderna.
package se.halkvakt.app

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class TipsaTest {
    @Test fun kortetEfterFemtePassetTillsDetAvfardas() {
        assertFalse(Tipsa.visaKortet(pass = Tipsa.PASS_FORE_KORTET - 1, dold = false, vaktenKor = false), "fyra pass: inte än")
        assertTrue(Tipsa.visaKortet(pass = Tipsa.PASS_FORE_KORTET, dold = false, vaktenKor = false))
        assertTrue(Tipsa.visaKortet(pass = 40, dold = false, vaktenKor = false), "står kvar tills föraren svarar")
        assertFalse(Tipsa.visaKortet(pass = 40, dold = true, vaktenKor = false), "avfärdat för gott")
        assertFalse(Tipsa.visaKortet(pass = 40, dold = false, vaktenKor = true), "aldrig medan vakten kör")
    }

    @Test fun mejletBarBaraVersionTelefonOchSystem() {
        val text = Tipsa.mejlText("0.4.0", 42, "Google Pixel 8", "Android 16")
        assertEquals(
            listOf("App: Halkvakt 0.4.0 (42)", "Telefon: Google Pixel 8", "System: Android 16"),
            text.lines().filter { it.startsWith("App:") || it.startsWith("Telefon:") || it.startsWith("System:") },
        )
        assertTrue("Ingen plats och inga resor." in text)
        assertTrue(text.startsWith("\n\n\n"), "föraren skriver överst")
    }
}
