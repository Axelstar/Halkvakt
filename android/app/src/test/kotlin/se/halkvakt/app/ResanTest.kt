// Första enhetstestet i app-modulen (kort #203). Det finns ett skäl att det är just den här filen:
// `SnapshotRepo` och resten av app-målet är otestbart utan Android, och det var därför <null>-felet
// (#210) kunde leva i fyra dygn. `Resan` skrevs medvetet som ren Kotlin så att räkningen bakom
// förarens ENDA tryck kan fällas av en maskin i stället för av en människa i en bil.
package se.halkvakt.app

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ResanTest {

    private fun v(t: Long, id: String) = AlertEntry(t, "camera", "Fartkamera om femhundra meter.", id)

    @Test
    fun `bara varningar fran resan raknas`() {
        val hist = listOf(v(100, "cam:a"), v(900, "cam:b"), v(1000, "cam:c"))
        val obes = Resan.obesvarade(hist, emptyList(), sedan = 900)
        assertEquals(listOf("cam:b", "cam:c"), obes.map { it.id })
    }

    @Test
    fun `besvarade varningar raknas inte`() {
        val hist = listOf(v(1000, "cam:a"), v(1100, "cam:b"))
        val facit = Facit.answer(emptyList(), "cam:a", 1000, true)
        assertEquals(listOf("cam:b"), Resan.obesvarade(hist, facit, sedan = 0).map { it.id })
    }

    @Test
    fun `rader utan id gar inte att svara pa och haller inte fragan oppen`() {
        val hist = listOf(AlertEntry(1000, "camera", "gammal rad", ""), v(1100, "cam:b"))
        assertEquals(listOf("cam:b"), Resan.obesvarade(hist, emptyList(), sedan = 0).map { it.id })
    }

    @Test
    fun `ett tryck svarar pa hela resan och lamnar dem osanda`() {
        val hist = listOf(v(1000, "cam:a"), v(1100, "cam:b"), v(1200, "cam:c"))
        val facit = Resan.svaraAlla(emptyList(), hist, true)
        assertEquals(3, facit.size)
        assertTrue(facit.all { it.svar && !it.sent })
        assertTrue(Resan.obesvarade(hist, facit, sedan = 0).isEmpty())
    }

    @Test
    fun `senaste ordet galler ocksa nar man svarar pa hela resan`() {
        val hist = listOf(v(1000, "cam:a"))
        val forst = Facit.markSent(Facit.answer(emptyList(), "cam:a", 1000, true), listOf(FacitEntry("cam:a", 1000, true, false)))
        assertTrue(forst.single().sent)
        val sedan = Resan.svaraAlla(forst, hist, false)
        assertEquals(1, sedan.size)
        assertEquals(false, sedan.single().svar)
        assertTrue(!sedan.single().sent, "ett andrat svar maste skickas om")
    }

    @Test
    fun `tystnad ger noll rader`() {
        val hist = listOf(v(1000, "cam:a"), v(1100, "cam:b"))
        // Ingen anropar svaraAlla: facit forblir tomt. Ett obesvarat pass far aldrig bli ett "ja".
        assertEquals(emptyList<FacitEntry>(), emptyList<FacitEntry>())
        assertEquals(2, Resan.obesvarade(hist, emptyList(), sedan = 0).size)
    }

    @Test
    fun `fragan star kvar ett dygn och inte langre`() {
        val start = 1_000_000L
        assertTrue(Resan.fragaKvar(start, start + 60_000, obesvarade = 2))
        assertTrue(Resan.fragaKvar(start, start + Resan.DYGN_MS - 1, obesvarade = 1))
        assertTrue(!Resan.fragaKvar(start, start + Resan.DYGN_MS, obesvarade = 1), "efter ett dygn tiger den")
        assertTrue(!Resan.fragaKvar(start, start + 60_000, obesvarade = 0), "allt besvarat = ingen fraga")
        assertTrue(!Resan.fragaKvar(0, 60_000, obesvarade = 2), "utan resa ingen fraga")
    }

    @Test
    fun `fragan boejs efter antalet`() {
        assertEquals("Resan klar — stämde varningen?", Resan.fraga(1))
        assertTrue(Resan.fraga(3).contains("alla 3 varningarna"))
    }
}
