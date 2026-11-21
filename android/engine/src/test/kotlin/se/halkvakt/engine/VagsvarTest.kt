// Vägtjänstens svar (kort #659): läsarna för Googles svar på adressökningen och ruttfrågan, prövade på svar i den form
// dokumentationen visar. Svaren är påhittade: inga riktiga adresser, plats-id eller vägar.
package se.halkvakt.engine

import org.json.JSONObject
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class VagsvarTest {
    private fun karta(json: String): Map<String, Any?> = JSONObject(json).toMap()

    @Test fun avkodarGooglesExempel() {
        // Exemplet i Googles beskrivning av kodningen: (38.5, -120.2), (40.7, -120.95), (43.252, -126.453).
        val p = Vagsvar.avkoda("_p~iF~ps|U_ulLnnqC_mqNvxq`@")
        assertEquals(3, p.size)
        val facit = listOf(-120.2 to 38.5, -120.95 to 40.7, -126.453 to 43.252)
        for ((i, f) in facit.withIndex()) assertTrue(abs(p[i][0] - f.first) < 1e-9 && abs(p[i][1] - f.second) < 1e-9, "punkt $i")
    }

    @Test fun enTrasigLinjeGerPunkternaFramTillFelet() {
        assertEquals(1, Vagsvar.avkoda("_p~iF~ps|U_ulL").size)
        assertTrue(Vagsvar.avkoda("").isEmpty())
        assertTrue(Vagsvar.avkoda(" ").isEmpty())
    }

    @Test fun laserForslagen() {
        val svar = karta("""{"suggestions":[
            {"placePrediction":{"placeId":"id-1","text":{"text":"Provgatan 1, Exempelstad"},
              "structuredFormat":{"mainText":{"text":"Provgatan 1"},"secondaryText":{"text":"Exempelstad"}}}},
            {"queryPrediction":{"text":{"text":"en sökfras utan plats"}}},
            {"placePrediction":{"placeId":"id-2","text":{"text":"Exempeltorget"}}},
            {"placePrediction":{"text":{"text":"utan id"}}}
        ]}""")
        assertEquals(listOf(Vagsvar.Forslag("id-1", "Provgatan 1", "Exempelstad"), Vagsvar.Forslag("id-2", "Exempeltorget", "")),
            Vagsvar.forslag(svar))
        assertTrue(Vagsvar.forslag(karta("{}")).isEmpty())
    }

    @Test fun visarHogstSexForslag() {
        val manga = (1..9).joinToString(",") { """{"placePrediction":{"placeId":"id-$it","text":{"text":"Plats $it"}}}""" }
        assertEquals(Vagsvar.FLEST_FORSLAG, Vagsvar.forslag(karta("""{"suggestions":[$manga]}""")).size)
    }

    @Test fun laserVagen() {
        val v = Vagsvar.vag(karta("""{"routes":[{"distanceMeters":61234,"duration":"2710s",
            "polyline":{"encodedPolyline":"_p~iF~ps|U_ulLnnqC_mqNvxq`@"}}]}"""))!!
        assertEquals(61234, v.meter)
        assertEquals(2710.0, v.restidS)
        assertEquals(3, v.punkter.size)
    }

    @Test fun ingenVagGerNull() {
        assertNull(Vagsvar.vag(karta("{}")))
        assertNull(Vagsvar.vag(karta("""{"routes":[]}""")))
        assertNull(Vagsvar.vag(karta("""{"routes":[{"distanceMeters":10}]}""")))
        // En linje med en enda punkt är ingen väg.
        assertNull(Vagsvar.vag(karta("""{"routes":[{"polyline":{"encodedPolyline":"_p~iF~ps|U"}}]}""")))
        // Utan restid går vägen att visa, men utan klockslag.
        assertNull(Vagsvar.vag(karta("""{"routes":[{"polyline":{"encodedPolyline":"_p~iF~ps|U_ulLnnqC"}}]}"""))!!.restidS)
    }
}
