// DECISIONS #741 punkt 4: ett varv (en koll) mot en påhittad hink och reserv och en tillfällig katalog. Hinken först, reserven bara
// när hinken inte svarar, en trio blandas aldrig, bara det som ändrats hämtas, och en kontrollsumma som inte stämmer skriver ingenting.
package se.halkvakt.app

import se.halkvakt.app.SnapshotRepo.Kalla
import se.halkvakt.app.SnapshotRepo.Utfall
import java.io.File
import java.io.IOException
import java.nio.file.Files
import java.security.MessageDigest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class SnapshotKollTest {
    private val hink = "https://xmpfztykhyvhmrzsnjrc.supabase.co/storage/v1/object/public/app/v1/"
    private val reserv = "https://axelstar.github.io/halkvakt-karta/data/app/v1/"
    private val t1 = "2026-10-29T06:20:00Z"
    private val t2 = "2026-10-29T06:22:00Z"

    /** Nätet: adress → kropp; en adress som saknas svarar som HTTP 404. Varje anrop loggas. */
    private val svar = HashMap<String, String>()
    private val anrop = ArrayList<String>()
    private val hamta: (String) -> String = { url -> anrop.add(url); svar[url] ?: throw IOException("HTTP 404 for $url") }

    private fun mapp(): File = Files.createTempDirectory("snapshot").toFile()
    private fun filer(m: File) = (m.listFiles() ?: emptyArray()).map { it.name }.sorted()
    private fun sha(s: String) = MessageDigest.getInstance("SHA-256").digest(s.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
    private fun stat(n: Int) = """{"cameras":[],"n":$n}"""
    private fun live(gen: String) = """{"generated_at":"$gen","weather_oldest_at":null,"segments":[]}"""
    private fun manifest(tid: String, s: String, l: String) =
        """{"schema":1,"generated_at":"$tid","files":{"static":{"sha256":"${sha(s)}"},"live":{"sha256":"${sha(l)}"}}}"""

    /** Lägger en hel trio på [bas]: static är densamma varje gång, live bär tiden. */
    private fun trio(bas: String, tid: String) {
        val s = stat(1); val l = live(tid)
        svar[bas + "manifest.json"] = manifest(tid, s, l); svar[bas + "static.json"] = s; svar[bas + "live.json"] = l
    }

    private fun gen(d: SnapshotRepo.Docs) = d.live.get("generated_at").toString()

    /** En cache från hinken vid [t1]; anropen nollställda. */
    private fun medCache(): File {
        val m = mapp(); trio(hink, t1)
        assertEquals(Utfall.NY, SnapshotRepo.koll(m, hamta).utfall)
        anrop.clear()
        return m
    }

    // Småvägsrösten (byggsteg 7, DECISIONS #844): punktfilen hämtas bara med ett besked, prövas mot beskedets kontrollsumma, hålls i
    // minnet per kontrollsumma och tas ur reserven när hinken ger fel innehåll. Utan rätt fil blir det inga faror.
    private val punktfil = """{"schema":2,"punkter":[[12.0,56.0],[12.01,56.005]],"vag":[1,1],"ordning":[0,1]}"""
    private fun liveMed(sha: String) = org.json.JSONObject("""{"generated_at":"$t1","segments":[],"smavag":{"fil":"$sha","n":2,"bitar":"Ag=="}}""")

    @Test fun punktfilenHamtasInteUtanBesked() {
        SnapshotRepo.smavagMinne = null
        val m = mapp(); svar[hink + "smavag.json"] = punktfil
        assertEquals(0, SnapshotRepo.smavagFor(m, org.json.JSONObject(live(t1)), hamta).size)
        assertEquals(emptyList<String>(), anrop, "inget anrop utan besked")
    }

    @Test fun punktfilenHamtasEnGangOchHallsIMinnet() {
        SnapshotRepo.smavagMinne = null
        val m = mapp(); svar[hink + "smavag.json"] = punktfil
        val faror = SnapshotRepo.smavagFor(m, liveMed(sha(punktfil)), hamta)
        assertEquals(listOf("smv:1"), faror.map { it.id })
        assertEquals(listOf(1), (faror[0] as se.halkvakt.engine.SmavagHazard).warn, "punkt 1 varnar (bit 1, Ag==)")
        assertEquals(punktfil, File(m, "smavag.json").readText())
        anrop.clear()
        assertEquals(1, SnapshotRepo.smavagFor(m, liveMed(sha(punktfil)), hamta).size)
        assertEquals(emptyList<String>(), anrop, "andra gången ur minnet")
        SnapshotRepo.smavagMinne = null
        assertEquals(1, SnapshotRepo.smavagFor(m, liveMed(sha(punktfil)), hamta).size)
        assertEquals(emptyList<String>(), anrop, "efter en omstart ur den sparade filen")
    }

    @Test fun felInnehallIHinkenGerReservenOchFelOverallGerTystnad() {
        SnapshotRepo.smavagMinne = null
        val m = mapp(); svar[hink + "smavag.json"] = punktfil.replace("12.01", "12.02"); svar[reserv + "smavag.json"] = punktfil
        assertEquals(1, SnapshotRepo.smavagFor(m, liveMed(sha(punktfil)), hamta).size, "reserven när hinken ger fel innehåll")
        assertEquals(listOf(hink + "smavag.json", reserv + "smavag.json"), anrop)
        SnapshotRepo.smavagMinne = null; anrop.clear()
        val m2 = mapp(); svar[reserv + "smavag.json"] = punktfil.replace("12.01", "12.03")
        assertEquals(0, SnapshotRepo.smavagFor(m2, liveMed(sha(punktfil)), hamta).size, "fel innehåll överallt: tystnad")
        assertEquals(false, File(m2, "smavag.json").exists(), "en fil med fel kontrollsumma skrivs aldrig")
    }

    @Test fun forstaKollenHamtarTrionUrHinkenOchSkriverManifestetSist() {
        val m = mapp(); trio(hink, t1)
        val d = SnapshotRepo.koll(m, hamta)
        assertEquals(Utfall.NY to Kalla.HINK, d.utfall to d.kalla)
        assertEquals(listOf(hink + "manifest.json", hink + "static.json", hink + "live.json"), anrop)
        assertEquals(listOf("live.json", "manifest.json", "static.json"), filer(m), "ingen .tmp kvar")
        assertEquals(svar[hink + "manifest.json"], File(m, "manifest.json").readText())
    }

    @Test fun inteNyareGerOforandradUtanAttFilernaHamtas() {
        val m = medCache()
        val d = SnapshotRepo.koll(m, hamta)
        assertEquals(Utfall.OFORANDRAD to Kalla.HINK, d.utfall to d.kalla)
        assertEquals(listOf(hink + "manifest.json"), anrop)
        assertEquals(t1, gen(d))
    }

    @Test fun baraDenAndradeFilenHamtas() {
        val m = medCache(); trio(hink, t2)   // static oförändrad
        val d = SnapshotRepo.koll(m, hamta)
        assertEquals(Utfall.NY, d.utfall)
        assertEquals(listOf(hink + "manifest.json", hink + "live.json"), anrop)
        assertEquals(live(t2), File(m, "live.json").readText())
        assertEquals(t2, gen(d))
    }

    @Test fun kontrollsummanStammerInteGerOforandradOchIngentingSkrivs() {
        val m = medCache()
        val sparat = File(m, "manifest.json").readText()
        svar[hink + "manifest.json"] = manifest(t2, stat(1), live(t2))   // Cloudflare: nytt manifest, gammal live.json
        val d = SnapshotRepo.koll(m, hamta)
        assertEquals(Utfall.OFORANDRAD to Kalla.HINK, d.utfall to d.kalla)
        assertEquals(sparat, File(m, "manifest.json").readText())
        assertEquals(live(t1), File(m, "live.json").readText())
        assertEquals(listOf("live.json", "manifest.json", "static.json"), filer(m))
    }

    @Test fun hinkenSvararInteOchReservenTarOver() {
        val m = mapp(); trio(reserv, t1)
        val d = SnapshotRepo.koll(m, hamta)
        assertEquals(Utfall.NY to Kalla.RESERV, d.utfall to d.kalla)
        assertEquals(listOf(hink + "manifest.json", reserv + "manifest.json", reserv + "static.json", reserv + "live.json"), anrop)
    }

    /** Hinken svarar på manifestet men inte på filen: den sparade snapshoten gäller, och reservens filer blandas aldrig in. */
    @Test fun enTrioBlandasAldrig() {
        val m = medCache(); trio(hink, t2); svar.remove(hink + "live.json"); trio(reserv, t2)
        val d = SnapshotRepo.koll(m, hamta)
        assertEquals(Utfall.FEL to Kalla.HINK, d.utfall to d.kalla)
        assertEquals(listOf(hink + "manifest.json", hink + "live.json"), anrop)
        assertEquals(t1, gen(d))
    }

    @Test fun ingenKallaSvararGerFelOchCachenGaller() {
        val m = medCache(); svar.clear()
        val d = SnapshotRepo.koll(m, hamta)
        assertEquals(Utfall.FEL to Kalla.INGEN, d.utfall to d.kalla)
        assertEquals(t1, gen(d))
    }

    @Test fun enReservSomArAldreAnCachenGerOforandrad() {
        val m = mapp(); trio(hink, t2)
        SnapshotRepo.koll(m, hamta)
        svar.clear(); anrop.clear(); trio(reserv, t1)
        val d = SnapshotRepo.koll(m, hamta)
        assertEquals(Utfall.OFORANDRAD to Kalla.RESERV, d.utfall to d.kalla)
        assertEquals(listOf(hink + "manifest.json", reserv + "manifest.json"), anrop)
        assertEquals(t2, gen(d))
    }

    /** Cachade filer från före #741, utan manifest: båda hämtas. */
    @Test fun cachadeFilerUtanManifestHamtarBada() {
        val m = mapp(); File(m, "static.json").writeText(stat(0)); File(m, "live.json").writeText(live(t1))
        trio(hink, t2)
        assertEquals(Utfall.NY, SnapshotRepo.koll(m, hamta).utfall)
        assertEquals(listOf(hink + "manifest.json", hink + "static.json", hink + "live.json"), anrop)
    }

    @Test fun ingenCacheOchIngetNatKastar() {
        assertFailsWith<IllegalStateException> { SnapshotRepo.koll(mapp(), hamta) }
    }
}
