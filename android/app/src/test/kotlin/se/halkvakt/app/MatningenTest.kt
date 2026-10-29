// DECISIONS #741 punkt 5: mätningen i telefonen — räkningen per resa, filen (de tio senaste, tålig mot en trasig fil) och raderna
// på Betatest-sidan, mot en tillfällig katalog. Att katalogen i appen är noBackupFilesDir står i Matningen.fil.
package se.halkvakt.app

import se.halkvakt.app.SnapshotRepo.Kalla
import se.halkvakt.app.SnapshotRepo.Snapshot
import se.halkvakt.app.SnapshotRepo.Utfall
import java.io.File
import java.nio.file.Files
import java.time.Instant
import java.time.ZoneId
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class MatningenTest {
    private val start = Instant.parse("2026-10-29T06:20:00Z").toEpochMilli()   // 07:20 i Stockholm
    private val stockholm = ZoneId.of("Europe/Stockholm")
    private fun fil(): File = File(Files.createTempDirectory("matningen").toFile(), Matningen.FIL)
    private fun snap(utfall: Utfall, kalla: Kalla, gen: Long, vader: Long? = null) =
        Snapshot(emptyList(), gen, utfall = utfall, kalla = kalla, vaderAldstMs = vader)
    private fun resa(start: Long, batteri: Int? = 80) = MattResa(start, start + 34 * 60_000L, 17, 12, 0, listOf(185L), listOf(540L), batteri, batteri)

    @Test fun matarenRaknarVarvNyaOchReserven() {
        val m = Matare(start, 82)
        val nu = start + 60_000L
        m.varv(nu, snap(Utfall.NY, Kalla.HINK, nu - 185_000L, vader = nu - 540_000L))
        m.varv(nu, snap(Utfall.OFORANDRAD, Kalla.RESERV, nu - 200_000L))
        m.varv(nu, snap(Utfall.FEL, Kalla.INGEN, nu - 300_000L))
        m.varv(nu, null)                                                   // laddningen kastade
        m.varv(nu, snap(Utfall.NY, Kalla.RESERV, nu - 220_000L))           // ingen weather_oldest_at
        m.varv(nu, snap(Utfall.NY, Kalla.HINK, 0L))                        // okänd tid: ingen ålder
        val r = m.resa(start + 34 * 60_000L, 79)!!
        assertEquals(6, r.kollar); assertEquals(3, r.nya); assertEquals(2, r.reserv)
        assertEquals(listOf(185L, 220L), r.alderS)
        assertEquals(listOf(540L), r.stationS)
        assertEquals(82 to 79, r.batteriStart to r.batteriSlut)
    }

    @Test fun enResaUnderTvaMinuterSparasInte() {
        assertNull(Matare(start, 80).resa(start + Matningen.MINSTA_RESA_MS - 1, 80))
        assertEquals(start + Matningen.MINSTA_RESA_MS, Matare(start, 80).resa(start + Matningen.MINSTA_RESA_MS, 80)?.slut)
    }

    @Test fun deTioSenasteBehallsOchFilenLasesTillbaka() {
        val f = fil()
        repeat(12) { i -> Matningen.spara(f, resa(start + i * 3_600_000L, batteri = if (i == 11) null else 80)) }
        val resor = Matningen.las(f)
        assertEquals(Matningen.MAX_RESOR, resor.size)
        assertEquals(resa(start + 11 * 3_600_000L, null), resor.first(), "nyast först, och batteriet null överlever")
        assertEquals(start + 2 * 3_600_000L, resor.last().start, "de två äldsta har fallit bort")
        assertEquals(listOf(Matningen.FIL), f.parentFile.list()!!.toList(), "ingen .tmp kvar")
    }

    @Test fun enTrasigEllerSaknadFilGerEnTomLista() {
        val f = fil()
        assertEquals(emptyList(), Matningen.las(f))
        f.writeText("[{\"start\": \"2026-10-29T06:20:00Z\", \"kollar\": 1")   // avbruten mitt i
        assertEquals(emptyList(), Matningen.las(f))
        Matningen.spara(f, resa(start))
        assertEquals(1, Matningen.las(f).size, "en trasig fil skrivs över, ingen krasch")
    }

    @Test fun radernaSomPaSidan() {
        val r = MattResa(start, start + 34 * 60_000L, 17, 12, 0, listOf(170L, 220L, 185L), listOf(600L, 500L, 540L), 82, 79)
        assertEquals("29 okt 07:20 · 34 min" to listOf(
            "17 kollar · 12 nya · 0 ur reserven",
            "Ålder vid ankomst: median 3:05, högst 3:40",
            "Äldsta station: median 9 min",
            "Batteri 82 → 79 % (5,3 %/h)",
        ), Matningen.rader(r, stockholm))
    }

    /** En telefon som laddas i bilen: negativ takt med svenskt minustecken. */
    @Test fun enLaddadTelefonGerNegativTakt() {
        val r = MattResa(start, start + 60 * 60_000L, 1, 0, 0, emptyList(), emptyList(), 70, 85)
        assertEquals("Batteri 70 → 85 % (−15,0 %/h)", Matningen.rader(r, stockholm).second.last())
    }

    @Test fun enRadVarsDataSaknasUtelamnas() {
        val r = MattResa(start, start + 5 * 60_000L, 3, 0, 3, emptyList(), emptyList(), null, 79)
        assertEquals("29 okt 07:20 · 5 min" to listOf("3 kollar · 0 nya · 3 ur reserven"), Matningen.rader(r, stockholm))
    }
}
