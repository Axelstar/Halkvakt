// RAPPORTFILEN (favoriterna steg 3c, kort #357; DECISIONS #617, #636) — spegel av iOS RapportRepo.swift. Hämtar favoriternas
// rapportfil ur den publika hinken `favoriter`, som funktionen `favoriter` skriver var tionde minut. Samma fil för alla: anropet bär
// ingen fråga, ingen plats och ingen resa — matchningen mot förarens vägar sker i telefonen (Rapporten.kt), och den filen når aldrig
// nätet (ruttspärren).
//
// manifest.json bär sha256 för de två delarna. En del hämtas bara när kontrollsumman ändrats; en del vars sha256 inte stämmer
// förkastas och den förra behålls (CLAUDE.md). Cachen ligger i cacheDir: allmän data, återskapbar.
package se.halkvakt.app

import android.content.Context
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

object RapportRepo {
    private const val BASE = "https://xmpfztykhyvhmrzsnjrc.supabase.co/storage/v1/object/public/favoriter/"

    class Filer(val snabb: JSONObject, val lang: JSONObject)

    /** Blockerar — anropas utanför huvudtråden. Utan nät faller manifestet, och då gäller de sparade delarna. */
    fun hamta(ctx: Context): Filer {
        val manifest = runCatching { JSONObject(String(httpGet("manifest.json"), Charsets.UTF_8)) }.getOrNull()
        return Filer(del(ctx, "rapport-snabb.json", manifest?.optJSONObject("snabb")), del(ctx, "rapport-lang.json", manifest?.optJSONObject("lang")))
    }

    private fun del(ctx: Context, namn: String, meta: JSONObject?): JSONObject {
        val cache = File(ctx.cacheDir, namn)
        val sparad = cache.takeIf { it.isFile }?.let { runCatching { it.readBytes() }.getOrNull() }
        val vantad = meta?.optString("sha256").orEmpty()
        if (sparad != null && vantad.isNotEmpty() && sha(sparad) == vantad) return JSONObject(String(sparad, Charsets.UTF_8))
        return try {
            val body = httpGet(namn)
            require(vantad.isNotEmpty() && sha(body) == vantad) { "kontrollsumman stämmer inte för $namn" }
            val tmp = File(ctx.cacheDir, "$namn.tmp")
            tmp.writeBytes(body)
            tmp.renameTo(cache)
            JSONObject(String(body, Charsets.UTF_8))
        } catch (e: Exception) {
            if (sparad != null) JSONObject(String(sparad, Charsets.UTF_8)) else throw e
        }
    }

    private fun sha(b: ByteArray) = MessageDigest.getInstance("SHA-256").digest(b).joinToString("") { "%02x".format(it) }

    private fun httpGet(namn: String): ByteArray {
        val conn = URL(BASE + namn).openConnection() as HttpURLConnection
        conn.connectTimeout = 10_000; conn.readTimeout = 15_000
        conn.setRequestProperty("User-Agent", "Halkvakt-Android/0.1")
        try {
            require(conn.responseCode == 200) { "HTTP ${conn.responseCode} for $namn" }
            return conn.inputStream.use { it.readBytes() }
        } finally { conn.disconnect() }
    }
}
