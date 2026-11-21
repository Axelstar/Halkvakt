// Vägtjänstens frågor (kort #659): vad appen skickar till Google när föraren söker. Sökningen bär ingen plats, och ruttfrågan
// ber inte om trafik (det dyrare slaget) och inte om något utöver det fältmasken säger.
package se.halkvakt.app

import org.json.JSONObject
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class VagtjanstTest {
    @Test fun sokningenSkickarBaraOrdenOchSverige() {
        val f = JSONObject(Vagtjanst.forslagsfraga("Provgatan 1"))
        assertEquals(setOf("input", "languageCode", "includedRegionCodes"), f.keySet())
        assertEquals("Provgatan 1", f.getString("input"))
        assertEquals("se", f.getJSONArray("includedRegionCodes").getString(0))
    }

    @Test fun ruttfraganBarPlatsenMaletOchIngenTrafik() {
        val f = JSONObject(Vagtjanst.vagfraga(13.0, 55.6, "id-1", tat = true))
        val fran = f.getJSONObject("origin").getJSONObject("location").getJSONObject("latLng")
        assertEquals(55.6, fran.getDouble("latitude")); assertEquals(13.0, fran.getDouble("longitude"))
        assertEquals("id-1", f.getJSONObject("destination").getString("placeId"))
        assertEquals("DRIVE", f.getString("travelMode"))
        assertEquals("TRAFFIC_UNAWARE", f.getString("routingPreference"))
        assertEquals("HIGH_QUALITY", f.getString("polylineQuality"))
        assertFalse(JSONObject(Vagtjanst.vagfraga(13.0, 55.6, "id-1", tat = false)).has("polylineQuality"))
        assertTrue(f.keySet().none { it in setOf("departureTime", "extraComputations", "intermediates") })
    }
}
