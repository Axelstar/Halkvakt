// Favoriterna steg 2 (kort #357; DECISIONS #616, #625, #633): RuttLager mot en tillfällig katalog. Att katalogen i appen är
// noBackupFilesDir och att flytten till en ny telefon stänger ute den prövar ruttspärren (scripts/rutterspar.ts) i ci.
package se.halkvakt.app

import se.halkvakt.engine.Rutter
import java.io.File
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class FavoriterTest {
    private val t0 = 1_792_299_600_000L   // 2026-10-18T05:00:00Z
    private fun mapp(): File = Files.createTempDirectory("favoriter").toFile()
    private fun filer(m: File) = (m.listFiles() ?: emptyArray()).map { it.name }.sorted()

    /** En resa rakt norrut: n fixar 30 m isär från 59° N. Olika [lon] är olika vägar (0,01° är 570 m) — samma väg en gång till
     *  känns igen och erbjuds inte (DECISIONS #637). */
    private fun kor(l: RuttLager, n: Int, lon: Double = 15.0) { repeat(n) { i -> l.fix(lon, 59.0 + i * 30 / 111_320.0) } }

    @Test fun brytarenAvSamlarIngentingOchSkriverIngenFil() {
        val m = mapp(); val l = RuttLager(m) { t0 }
        l.resanBorjar(erbjud = false); kor(l, 80); l.resanSlutar(km = 2.4)
        assertNull(l.vantande.value)
        assertEquals(emptyList(), filer(m))
    }

    @Test fun enResaUnderEnKilometerErbjudsInte() {
        val m = mapp(); val l = RuttLager(m) { t0 }
        l.resanBorjar(true); kor(l, 30); l.resanSlutar(km = Favoriter.MINSTA_RESA_KM - 0.1)
        assertNull(l.vantande.value)
        assertEquals(emptyList(), filer(m))
    }

    @Test fun resanSparasLasesTillbakaOchDenTillfalligaFilenRaderas() {
        val m = mapp(); val l = RuttLager(m) { t0 }
        l.resanBorjar(true); kor(l, 80); l.resanSlutar(km = 2.4)
        val v = assertNotNull(l.vantande.value)
        assertEquals(t0, v.slut)
        assertEquals(listOf(Favoriter.VANTANDE_FIL), filer(m))
        assertEquals(RuttLager.Svar.SPARAD, l.spara("  Hem  "))
        assertNull(l.vantande.value)
        assertEquals(listOf(Favoriter.RUTTER_FIL), filer(m), "den tillfälliga filen är borta, ingen .tmp kvar")
        val igen = RuttLager(m) { t0 }.rutter.value.single()
        assertEquals("Hem", igen.namn)
        assertEquals("2026-10-18T05:00:00Z", igen.sparad)
        assertEquals(v.punkter.map { it.toList() }, igen.punkter.map { it.toList() })
    }

    @Test fun denSjatteNekasOchVagenStarKvar() {
        val m = mapp(); val l = RuttLager(m) { t0 }
        repeat(Rutter.MAX_RUTTER) { i -> l.resanBorjar(true); kor(l, 80, 15.0 + i * 0.01); l.resanSlutar(2.4); assertEquals(RuttLager.Svar.SPARAD, l.spara("R$i")) }
        l.resanBorjar(true); kor(l, 80, 15.1); l.resanSlutar(2.4)
        assertEquals(RuttLager.Svar.FULLT, l.spara("R6"))
        assertNotNull(l.vantande.value, "inget trängs ut tyst, och vägen väntar kvar")
        assertEquals(Rutter.MAX_RUTTER, l.rutter.value.size)
    }

    @Test fun nejTackRaderarVagen() {
        val m = mapp(); val l = RuttLager(m) { t0 }
        l.resanBorjar(true); kor(l, 80); l.resanSlutar(2.4)
        l.avsta()
        assertNull(l.vantande.value)
        assertEquals(emptyList(), filer(m))
    }

    @Test fun efterEttDygnRaderasVagenVidNastaStart() {
        val m = mapp()
        RuttLager(m) { t0 }.apply { resanBorjar(true); kor(this, 80); resanSlutar(2.4) }
        assertNotNull(RuttLager(m) { t0 + Favoriter.FRAGA_KVAR_MS - 1 }.vantande.value, "en sekund före dygnet står den kvar")
        assertNull(RuttLager(m) { t0 + Favoriter.FRAGA_KVAR_MS }.vantande.value)
        assertEquals(emptyList(), filer(m))
    }

    @Test fun taBortEnOchTaBortAlla() {
        val m = mapp(); val l = RuttLager(m) { t0 }
        repeat(2) { i -> l.resanBorjar(true); kor(l, 80, 15.0 + i * 0.01); l.resanSlutar(2.4); l.spara("R$i") }
        l.taBort(l.rutter.value.first().id)
        assertEquals(listOf("R1"), l.rutter.value.map { it.namn })
        assertEquals(listOf("R1"), RuttLager(m) { t0 }.rutter.value.map { it.namn })
        l.taBortAlla()
        assertTrue(l.rutter.value.isEmpty())
        assertFalse(File(m, Favoriter.RUTTER_FIL).exists())
    }

    @Test fun vagenHemKannsIgenOchFragasInteIgen() {
        val m = mapp(); val l = RuttLager(m) { t0 }
        l.resanBorjar(true); kor(l, 80); l.resanSlutar(2.4); l.spara("Till jobbet")
        l.resanBorjar(true); repeat(80) { i -> l.fix(15.0, 59.0 + (79 - i) * 30 / 111_320.0) }; l.resanSlutar(2.4)
        assertNull(l.vantande.value, "samma väg åt andra hållet är redan sparad")
        l.resanBorjar(true); kor(l, 80, 15.01); l.resanSlutar(2.4)
        assertNotNull(l.vantande.value, "en väg 570 m bort är en annan väg")
    }

    @Test fun forraKollenSparasUtanforRutternaOchForsvinnerMedResan() {
        val m = mapp(); val l = RuttLager(m) { t0 }
        repeat(2) { i -> l.resanBorjar(true); kor(l, 80, 15.0 + i * 0.01); l.resanSlutar(2.4); l.spara("R$i") }
        val (a, b) = l.rutter.value.map { it.id }
        l.kollad(a, listOf("seg:1", "tt:2")); l.kollad(b, listOf("cam:3")); l.kollad("okand", listOf("x"))
        assertEquals(setOf(a, b), l.kollar.value.keys, "en okänd resa får ingen koll")
        assertTrue(File(m, Favoriter.KOLLEN_FIL).isFile)
        val igen = RuttLager(m) { t0 }.kollar.value
        assertEquals(RuttLager.Koll(t0, listOf("seg:1", "tt:2")), igen[a])
        l.taBort(a)
        assertEquals(setOf(b), RuttLager(m) { t0 }.kollar.value.keys)
        l.taBortAlla()
        assertFalse(File(m, Favoriter.KOLLEN_FIL).exists())
        assertTrue(l.kollar.value.isEmpty())
    }

    @Test fun enTrasigFilGerIngaRutterOchIngenKrasch() {
        val m = mapp()
        File(m, Favoriter.RUTTER_FIL).writeText("{inte json")
        File(m, Favoriter.VANTANDE_FIL).writeText("[]")
        val l = RuttLager(m) { t0 }
        assertTrue(l.rutter.value.isEmpty())
        assertNull(l.vantande.value)
    }
}
