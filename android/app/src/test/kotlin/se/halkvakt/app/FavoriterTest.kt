// Favoriterna (kort #357; DECISIONS #616, #625, #633, #806): RuttLager mot en tillfällig katalog. Att katalogen i appen är
// noBackupFilesDir och att flytten till en ny telefon stänger ute den prövar ruttspärren (scripts/rutterspar.ts) i ci.
package se.halkvakt.app

import se.halkvakt.engine.Rutter
import se.halkvakt.engine.Vantande
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
        l.resanBorjar(erbjud = false); kor(l, 80); assertNull(l.resanSlutar(km = 2.4, minuter = 10.0))
        assertTrue(l.dagens.value.isEmpty())
        assertEquals(emptyList(), filer(m))
    }

    @Test fun enResaUnderTvaKilometerErbjudsInte() {
        val m = mapp(); val l = RuttLager(m) { t0 }
        l.resanBorjar(true); kor(l, 30); assertNull(l.resanSlutar(km = Favoriter.MINSTA_RESA_KM - 0.1, minuter = 10.0))
        assertTrue(l.dagens.value.isEmpty())
        assertEquals(emptyList(), filer(m))
    }

    @Test fun enResaUnderFemMinuterErbjudsInte() {
        val m = mapp(); val l = RuttLager(m) { t0 }
        l.resanBorjar(true); kor(l, 80); assertNull(l.resanSlutar(km = 2.4, minuter = Favoriter.MINSTA_RESA_MIN - 0.5))
        assertTrue(l.dagens.value.isEmpty())
        assertEquals(emptyList(), filer(m))
    }

    @Test fun resanSparasLasesTillbakaOchDenTillfalligaFilenRaderas() {
        val m = mapp(); val l = RuttLager(m) { t0 }
        l.resanBorjar(true); kor(l, 80)
        val v = assertNotNull(l.resanSlutar(km = 2.4, minuter = 10.0), "en ny resa ger dagens notis")
        assertEquals(t0 / 1000.0, v.slutS)
        assertEquals(listOf(Favoriter.VANTANDE_FIL), filer(m))
        assertEquals(1, RuttLager(m) { t0 }.dagens.value.size, "dagens resor läses tillbaka")
        assertEquals(RuttLager.Svar.SPARAD, l.spara(v.id, "  Hem  "))
        assertTrue(l.dagens.value.isEmpty())
        assertEquals(listOf(Favoriter.RUTTER_FIL), filer(m), "den tillfälliga filen är borta, ingen .tmp kvar")
        val igen = RuttLager(m) { t0 }.rutter.value.single()
        assertEquals("Hem", igen.namn)
        assertEquals("2026-10-18T05:00:00Z", igen.sparad)
        assertEquals(v.punkter.map { it.toList() }, igen.punkter.map { it.toList() })
    }

    @Test fun tomtNamnSparasSomDatumet() {
        val m = mapp(); val l = RuttLager(m) { t0 }
        l.resanBorjar(true); kor(l, 80); val v = l.resanSlutar(2.4, 10.0)!!
        assertEquals(RuttLager.Svar.SPARAD, l.spara(v.id, "  "))
        assertEquals(Favoriter.datumnamn(v), l.rutter.value.single().namn)
        assertTrue(l.rutter.value.single().namn.startsWith("Resa "))
    }

    @Test fun sammaPassSomSlutarIgenUppdaterarSinRadOchGerIngenNyNotis() {
        val m = mapp(); val l = RuttLager(m) { t0 }
        l.resanBorjar(true); kor(l, 80)
        assertNotNull(l.resanSlutar(2.4, 10.0), "tio minuter stilla: första gången")
        kor(l, 120)
        assertNull(l.resanSlutar(3.6, 14.0), "vaktens stopp efter samma pass: ingen ny notis")
        assertEquals(3.6, l.dagens.value.single().km)
    }

    @Test fun ditOchHemSammaDagBlirEnResa() {
        val m = mapp(); val l = RuttLager(m) { t0 }
        l.resanBorjar(true); kor(l, 80); assertNotNull(l.resanSlutar(2.4, 10.0))
        l.resanBorjar(true); repeat(80) { i -> l.fix(15.0, 59.0 + (79 - i) * 30 / 111_320.0) }
        assertNull(l.resanSlutar(2.4, 10.0), "hemresan slås ihop och ger ingen notis")
        assertTrue(l.dagens.value.single().dithem)
    }

    @Test fun denSjatteNekasOchVagenStarKvar() {
        val m = mapp(); val l = RuttLager(m) { t0 }
        repeat(Rutter.MAX_RUTTER) { i ->
            l.resanBorjar(true); kor(l, 80, 15.0 + i * 0.01)
            assertEquals(RuttLager.Svar.SPARAD, l.spara(l.resanSlutar(2.4, 10.0)!!.id, "R$i"))
        }
        l.resanBorjar(true); kor(l, 80, 15.1); val v = l.resanSlutar(2.4, 10.0)!!
        assertEquals(RuttLager.Svar.FULLT, l.spara(v.id, "R6"))
        assertEquals(1, l.dagens.value.size, "inget trängs ut tyst, och vägen väntar kvar")
        assertEquals(Rutter.MAX_RUTTER, l.rutter.value.size)
    }

    @Test fun slangRaderarVagen() {
        val m = mapp(); val l = RuttLager(m) { t0 }
        l.resanBorjar(true); kor(l, 80); val v = l.resanSlutar(2.4, 10.0)!!
        l.slang(v.id)
        assertTrue(l.dagens.value.isEmpty())
        assertEquals(emptyList(), filer(m))
    }

    @Test fun efterEttDygnRaderasVagenVidNastaStart() {
        val m = mapp()
        RuttLager(m) { t0 }.apply { resanBorjar(true); kor(this, 80); resanSlutar(2.4, 10.0) }
        val dygn = (Vantande.VANTANDE_KVAR_S * 1000).toLong()
        assertEquals(1, RuttLager(m) { t0 + dygn - 1000 }.dagens.value.size, "en sekund före dygnet står den kvar")
        assertTrue(RuttLager(m) { t0 + dygn }.dagens.value.isEmpty())
        assertEquals(emptyList(), filer(m))
    }

    @Test fun bytNamn() {
        val m = mapp(); val l = RuttLager(m) { t0 }
        l.resanBorjar(true); kor(l, 80); l.spara(l.resanSlutar(2.4, 10.0)!!.id, "Jobbet")
        l.bytNamn(l.rutter.value.single().id, " Pendlingen ")
        assertEquals("Pendlingen", RuttLager(m) { t0 }.rutter.value.single().namn)
        l.bytNamn(l.rutter.value.single().id, "  ")
        assertEquals("Pendlingen", l.rutter.value.single().namn, "tomt namn byter inte")
    }

    @Test fun radenKorDuDenHarOfta() {
        val nu = t0
        assertTrue(Favoriter.erbjudRaden(false, 12.0, nu - 60_000, 0L, nu))
        assertFalse(Favoriter.erbjudRaden(true, 12.0, nu - 60_000, 0L, nu), "brytaren på")
        assertFalse(Favoriter.erbjudRaden(false, 9.0, nu - 60_000, 0L, nu), "kort resa")
        assertFalse(Favoriter.erbjudRaden(false, 12.0, nu - 60_000, nu - 120_000, nu), "Inte nu före resan, för en minut sedan")
        assertTrue(Favoriter.erbjudRaden(false, 12.0, nu - 60_000, nu - Favoriter.ERBJUD_IGEN_EFTER_MS - 1, nu), "en vecka efter Inte nu")
    }

    @Test fun taBortEnOchTaBortAlla() {
        val m = mapp(); val l = RuttLager(m) { t0 }
        repeat(2) { i -> l.resanBorjar(true); kor(l, 80, 15.0 + i * 0.01); l.spara(l.resanSlutar(2.4, 10.0)!!.id, "R$i") }
        l.taBort(l.rutter.value.first().id)
        assertEquals(listOf("R1"), l.rutter.value.map { it.namn })
        assertEquals(listOf("R1"), RuttLager(m) { t0 }.rutter.value.map { it.namn })
        l.taBortAlla()
        assertTrue(l.rutter.value.isEmpty())
        assertFalse(File(m, Favoriter.RUTTER_FIL).exists())
    }

    @Test fun vagenHemKannsIgenOchFragasInteIgen() {
        val m = mapp(); val l = RuttLager(m) { t0 }
        l.resanBorjar(true); kor(l, 80); l.spara(l.resanSlutar(2.4, 10.0)!!.id, "Jobbet")
        l.resanBorjar(true); repeat(80) { i -> l.fix(15.0, 59.0 + (79 - i) * 30 / 111_320.0) }
        assertNull(l.resanSlutar(2.4, 10.0))
        assertTrue(l.dagens.value.isEmpty(), "samma väg åt andra hållet är redan sparad")
        l.resanBorjar(true); kor(l, 80, 15.01)
        assertNotNull(l.resanSlutar(2.4, 10.0), "en väg 570 m bort är en annan väg")
    }

    @Test fun forraKollenSparasUtanforRutternaOchForsvinnerMedResan() {
        val m = mapp(); val l = RuttLager(m) { t0 }
        repeat(2) { i -> l.resanBorjar(true); kor(l, 80, 15.0 + i * 0.01); l.spara(l.resanSlutar(2.4, 10.0)!!.id, "R$i") }
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
        File(m, Favoriter.VANTANDE_FIL).writeText("{inte en lista")
        val l = RuttLager(m) { t0 }
        assertTrue(l.rutter.value.isEmpty())
        assertTrue(l.dagens.value.isEmpty())
    }
}
