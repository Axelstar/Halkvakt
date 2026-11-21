// VÄGTJÄNSTEN (kort #659, DECISIONS #870, #941): den enda filen i Android-appen som frågar Google om en adress eller en väg.
// Den rör aldrig de körda vägarna som föraren sparat (ruttspärren i ci fäller det).
//
// Vad som lämnar telefonen, och bara när föraren själv söker: sökorden till Places API (New), och förarens plats och målets
// plats-id till Routes API. Halkvakt får ingenting av det. Sökningen skickar ingen plats: förslagen begränsas till Sverige.
//
// Av svaret om vägen begärs bara linjen, längden och restiden (fältmasken). Vägbeskrivningen och stegen begärs inte.
// Nyckeln är låst i Google Cloud till appens paket och signeringsnycklar, och Google prövar det mot huvudena X-Android-Package
// och X-Android-Cert. Ett bygge signerat med en annan nyckel, som emulatorns, får därför nej.
package se.halkvakt.app

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import se.halkvakt.engine.Vagsvar
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

object Vagtjanst {
    private const val FORSLAG_URL = "https://places.googleapis.com/v1/places:autocomplete"
    private const val VAG_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
    private const val FORSLAG_FALT =
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat"
    private const val VAG_FALT = "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline"

    /** Det Google behöver för att släppa igenom ett anrop: nyckeln, appens paket och signeringsnyckelns SHA-1. */
    class Identitet(val nyckel: String, val paket: String, val cert: String)

    fun identitet(ctx: Context, nyckel: String) = Identitet(nyckel, ctx.packageName, cert(ctx))

    /** Förslagen för det föraren har skrivit. Tom lista när texten är tom eller anropet faller. */
    fun forslag(id: Identitet, text: String): List<Vagsvar.Forslag> {
        val t = text.trim()
        if (t.isEmpty()) return emptyList()
        return posta(FORSLAG_URL, forslagsfraga(t), id, FORSLAG_FALT)?.let(Vagsvar::forslag) ?: emptyList()
    }

    /** Bilvägen från förarens plats till platsen med [placeId]. null när ingen väg finns eller anropet faller. */
    fun vag(id: Identitet, franLon: Double, franLat: Double, placeId: String): Vagsvar.Vag? {
        // Den täta linjen först: rapporten mäter avstånd till vägen. Tar tjänsten inte emot det valet frågas den om utan.
        for (tat in listOf(true, false)) {
            posta(VAG_URL, vagfraga(franLon, franLat, placeId, tat), id, VAG_FALT)?.let(Vagsvar::vag)?.let { return it }
        }
        return null
    }

    internal fun forslagsfraga(text: String): String =
        JSONObject().put("input", text).put("languageCode", "sv").put("includedRegionCodes", JSONArray().put("se")).toString()

    internal fun vagfraga(franLon: Double, franLat: Double, placeId: String, tat: Boolean): String = JSONObject()
        .put("origin", JSONObject().put("location", JSONObject().put("latLng", JSONObject().put("latitude", franLat).put("longitude", franLon))))
        .put("destination", JSONObject().put("placeId", placeId))
        .put("travelMode", "DRIVE").put("routingPreference", "TRAFFIC_UNAWARE")
        .put("languageCode", "sv").put("regionCode", "se")
        .apply { if (tat) put("polylineQuality", "HIGH_QUALITY") }
        .toString()

    private fun posta(url: String, kropp: String, id: Identitet, falt: String): Map<String, Any?>? = runCatching {
        val conn = URL(url).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "POST"
            conn.connectTimeout = 10_000; conn.readTimeout = 15_000
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("X-Goog-Api-Key", id.nyckel)
            conn.setRequestProperty("X-Goog-FieldMask", falt)
            conn.setRequestProperty("X-Android-Package", id.paket)
            conn.setRequestProperty("X-Android-Cert", id.cert)
            conn.outputStream.use { it.write(kropp.toByteArray()) }
            if (conn.responseCode != 200) null else Rapporten.karta(JSONObject(conn.inputStream.bufferedReader().use { it.readText() }))
        } finally {
            conn.disconnect()
        }
    }.getOrNull()

    /** SHA-1 för nyckeln appen är signerad med, som versaler utan kolon. Tom när den inte går att läsa. */
    @Suppress("DEPRECATION")
    private fun cert(ctx: Context): String = runCatching {
        val pm = ctx.packageManager
        val signatur = if (Build.VERSION.SDK_INT >= 28) {
            pm.getPackageInfo(ctx.packageName, PackageManager.GET_SIGNING_CERTIFICATES).signingInfo?.apkContentsSigners?.firstOrNull()
        } else {
            pm.getPackageInfo(ctx.packageName, PackageManager.GET_SIGNATURES).signatures?.firstOrNull()
        }
        signatur?.let { MessageDigest.getInstance("SHA-1").digest(it.toByteArray()).joinToString("") { b -> "%02X".format(b) } }
    }.getOrNull() ?: ""
}
