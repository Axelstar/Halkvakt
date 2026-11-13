// Introduktionens val (kort #652): vilken skärm som visas efter vilket svar. Ren logik utan Android, så att den
// går att prova i JVM (IntroTest). Skärmarna bor i ui/IntroSkarm.kt, rutorna begärs i MainActivity.
package se.halkvakt.app

object Intro {
    enum class Steg { VALKOMMEN, VARNINGARNA, MARKS, PLATSEN, SJALVSTART, NOTISER, KLAR }

    /** Platsstegets lägen, efter vad Android svarar. */
    enum class PlatsSkarm { FRAGA, KLAR, EXAKT_BEHOVS, NEKAD }
    /** Självstartens lägen: frågan, sidan före "Tillåt hela tiden", på, eller föraren startar själv. */
    enum class Sjalv { FRAGA, HELA_TIDEN, PA, STARTAR_SJALV }
    enum class NotisSkarm { FRAGA, PA, AV }
    enum class SlutSkarm { REDO, REDO_NAR_DU_STARTAR, NASTAN_REDO }

    /** exakt = ACCESS_FINE_LOCATION, ungefarlig = bara COARSE. fragad = platsrutan har visats i den här introduktionen. */
    fun platsSkarm(exakt: Boolean, ungefarlig: Boolean, fragad: Boolean): PlatsSkarm = when {
        exakt -> PlatsSkarm.KLAR
        ungefarlig -> PlatsSkarm.EXAKT_BEHOVS
        fragad -> PlatsSkarm.NEKAD
        else -> PlatsSkarm.FRAGA
    }

    /** Efter platssteget: självstarten frågas bara när platsen är exakt, annars går det inte att starta själv. */
    fun efterPlatsen(exakt: Boolean): Steg = if (exakt) Steg.SJALVSTART else Steg.NOTISER

    /** Efter rutorna om rörelse och Bluetooth (kod 11). Bakgrundsplatsen begärs alltid i ett eget steg efteråt. */
    fun efterSjalvstartsrutorna(beviljade: Boolean, bakgrund: Boolean): Sjalv = when {
        !beviljade -> Sjalv.STARTAR_SJALV
        bakgrund -> Sjalv.PA
        else -> Sjalv.HELA_TIDEN
    }

    /** Efter systemets sida om "Tillåt hela tiden" (kod 12). */
    fun efterHelaTiden(bakgrund: Boolean): Sjalv = if (bakgrund) Sjalv.PA else Sjalv.STARTAR_SJALV

    /** fragas = Android 13+, där notiser kräver ett ja. Äldre Android har dem på från början. */
    fun notisSkarm(pa: Boolean, fragas: Boolean, fragad: Boolean): NotisSkarm = when {
        pa -> NotisSkarm.PA
        fragas && !fragad -> NotisSkarm.FRAGA
        else -> NotisSkarm.AV
    }

    fun slutSkarm(exakt: Boolean, sjalvstart: Boolean): SlutSkarm = when {
        !exakt -> SlutSkarm.NASTAN_REDO
        sjalvstart -> SlutSkarm.REDO
        else -> SlutSkarm.REDO_NAR_DU_STARTAR
    }

    /** En installation som redan har gett platsen har använt appen före introduktionen och får inte den påtvingad. */
    fun visasVidStart(introKlar: Boolean, harPlats: Boolean): Boolean = !introKlar && !harPlats
}
