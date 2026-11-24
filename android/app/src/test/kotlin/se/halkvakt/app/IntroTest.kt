// Introduktionen (kort #652): vilken skärm som följer på vilket svar i Androids rutor.
package se.halkvakt.app

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class IntroTest {
    @Test fun platsstegetHarEttLagePerSvar() {
        assertEquals(Intro.PlatsSkarm.FRAGA, Intro.platsSkarm(exakt = false, ungefarlig = false, fragad = false))
        assertEquals(Intro.PlatsSkarm.KLAR, Intro.platsSkarm(exakt = true, ungefarlig = true, fragad = true))
        assertEquals(Intro.PlatsSkarm.EXAKT_BEHOVS, Intro.platsSkarm(exakt = false, ungefarlig = true, fragad = true), "ungefärlig plats räcker inte")
        assertEquals(Intro.PlatsSkarm.NEKAD, Intro.platsSkarm(exakt = false, ungefarlig = false, fragad = true))
        assertEquals(Intro.PlatsSkarm.EXAKT_BEHOVS, Intro.platsSkarm(exakt = false, ungefarlig = true, fragad = false), "ändrad i inställningarna")
    }

    @Test fun sjalvstartenFragasBaraMedExaktPlats() {
        assertEquals(Intro.Steg.SJALVSTART, Intro.efterPlatsen(exakt = true))
        assertEquals(Intro.Steg.NOTISER, Intro.efterPlatsen(exakt = false))
    }

    @Test fun bakgrundsplatsenBegarsIEttEgetStegEfterRutorna() {
        assertEquals(Intro.Sjalv.HELA_TIDEN, Intro.efterSjalvstartsrutorna(beviljade = true, bakgrund = false))
        assertEquals(Intro.Sjalv.STARTAR_SJALV, Intro.efterSjalvstartsrutorna(beviljade = false, bakgrund = false), "ett nej: föraren startar själv")
        assertEquals(Intro.Sjalv.STARTAR_SJALV, Intro.efterSjalvstartsrutorna(beviljade = false, bakgrund = true))
        assertEquals(Intro.Sjalv.PA, Intro.efterSjalvstartsrutorna(beviljade = true, bakgrund = true), "allt fanns redan")
        assertEquals(Intro.Sjalv.PA, Intro.efterHelaTiden(bakgrund = true))
        assertEquals(Intro.Sjalv.STARTAR_SJALV, Intro.efterHelaTiden(bakgrund = false), "valde inte Tillåt hela tiden")
    }

    @Test fun notiserFragasBaraDarAndroidKraverEttJa() {
        assertEquals(Intro.NotisSkarm.FRAGA, Intro.notisSkarm(pa = false, fragas = true, fragad = false))
        assertEquals(Intro.NotisSkarm.AV, Intro.notisSkarm(pa = false, fragas = true, fragad = true))
        assertEquals(Intro.NotisSkarm.PA, Intro.notisSkarm(pa = true, fragas = false, fragad = false), "före Android 13 är de på")
        assertEquals(Intro.NotisSkarm.AV, Intro.notisSkarm(pa = false, fragas = false, fragad = false), "avstängda i systemet")
    }

    @Test fun slutskarmenFoljerPlatsenOchSjalvstarten() {
        assertEquals(Intro.SlutSkarm.REDO, Intro.slutSkarm(exakt = true, sjalvstart = true))
        assertEquals(Intro.SlutSkarm.REDO_NAR_DU_STARTAR, Intro.slutSkarm(exakt = true, sjalvstart = false))
        assertEquals(Intro.SlutSkarm.NASTAN_REDO, Intro.slutSkarm(exakt = false, sjalvstart = false))
        assertEquals(Intro.SlutSkarm.NASTAN_REDO, Intro.slutSkarm(exakt = false, sjalvstart = true), "utan exakt plats kan vakten inte varna")
    }

    @Test fun enInstallationSomRedanGettPlatsenFarInteIntroduktionen() {
        assertTrue(Intro.visasVidStart(introKlar = false, harPlats = false), "ny installation")
        assertFalse(Intro.visasVidStart(introKlar = false, harPlats = true), "använde appen före introduktionen; fotostudion likaså")
        assertFalse(Intro.visasVidStart(introKlar = true, harPlats = false))
    }
}
