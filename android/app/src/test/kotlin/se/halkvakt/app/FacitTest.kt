package se.halkvakt.app

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class FacitTest {
    @Test fun roundtrip() {
        val l = listOf(FacitEntry("wx:2135", 1700000000000, true, false), FacitEntry("seg:16010", 1700000001000, false, true))
        val back = Facit.decode(Facit.encode(l))
        assertEquals(l, back)
    }
    @Test fun corruptLinesAreSkipped() {
        val back = Facit.decode("skräp\n1\tbara_tre\tja\n1700000000000\tcam:TV1\tja\t0\n")
        assertEquals(1, back.size); assertEquals("cam:TV1", back[0].id)
    }
    @Test fun answerReplacesAndBecomesUnsent() {
        var l = Facit.answer(emptyList(), "wx:1", 10, true)
        l = Facit.markSent(l, l)
        assertTrue(l.single().sent)
        l = Facit.answer(l, "wx:1", 10, false)          // ångrar sig
        assertEquals(1, l.size); assertFalse(l.single().sent); assertEquals(false, Facit.answerFor(l, "wx:1", 10))
        assertNull(Facit.answerFor(l, "wx:1", 11))
    }
    @Test fun markSentOnlyMarksTheExactAnswer() {
        val l = Facit.answer(emptyList(), "wx:1", 10, true)
        val changed = Facit.answer(l, "wx:1", 10, false)   // ändrat under sändningen
        val after = Facit.markSent(changed, l)              // det som gick iväg var "ja"
        assertFalse(after.single().sent)                    // "nej" är fortfarande osänt
        assertEquals(1, Facit.pending(after, now = 10).size)
    }
    @Test fun answersOlderThanTheServerWindowAreNotSent() {
        val l = Facit.answer(emptyList(), "wx:1", 0, true)
        assertEquals(1, Facit.pending(l, now = Facit.MAX_AGE_MS - 1).size)
        assertEquals(0, Facit.pending(l, now = Facit.MAX_AGE_MS).size)
    }
    @Test fun capIsKept() {
        var l = emptyList<FacitEntry>()
        repeat(Facit.MAX + 5) { i -> l = Facit.answer(l, "wx:$i", i.toLong(), true) }
        assertEquals(Facit.MAX, l.size); assertEquals("wx:${Facit.MAX + 4}", l.last().id)
    }
    @Test fun bodyIsExactlyFiveFieldsAndNothingElse() {
        val b = Facit.body(FacitEntry("wx:21\"35", 1700000000000, true, false), "android", "0.3.1")
        assertEquals("{\"id\":\"wx:21\\\"35\",\"t\":\"2023-11-14T22:13:20Z\",\"svar\":\"ja\",\"app\":\"android\",\"ver\":\"0.3.1\"}", b)
        assertFalse(b.contains("lat")); assertFalse(b.contains("lon"))
    }

    // Statusraden (Bengts provresa 28/9, TILL-AXEL-BYGGE-19 Android 1): "Skickat 13:52 (1 missar)" stod under en obesvarad rad,
    // och gårdagens kvitto under dagens varningar.
    @Test fun kvittotBojerMiss() {
        assertEquals(listOf("1 miss"), Facit.kvittodelar(0, 1))
        assertEquals(listOf("2 svar", "3 missar"), Facit.kvittodelar(2, 3))
        assertTrue(Facit.kvittodelar(0, 0).isEmpty())
    }

    @Test fun kortetVisarBaraDenHarResansFel() {
        val start = 1_000_000L
        assertNull(Facit.kortetsStatus("Skickat 13:52 (1 miss)", start + 5, start), "ett lyckat kvitto står aldrig i kortet")
        assertEquals("Kunde inte skicka 13:52: HTTP 400", Facit.kortetsStatus("Kunde inte skicka 13:52: HTTP 400", start + 5, start))
        assertNull(Facit.kortetsStatus("Kunde inte skicka 22:00: HTTP 500", start - 1, start), "förra resans fel hör inte hit")
        assertNull(Facit.kortetsStatus("Kunde inte skicka 22:00: HTTP 500", 0L, start), "en rad från före 4/10 saknar tid och visas inte")
        assertNull(Facit.kortetsStatus(null, start + 5, start))
    }

    @Test fun radenVisarBaraEnSandningEfterVarningen() {
        val varningen = 2_000_000L
        assertEquals("Skickat 13:48 (4 svar)", Facit.radensStatus("Skickat 13:48 (4 svar)", varningen + 60_000, varningen))
        assertNull(Facit.radensStatus("Skickat 22:00 (1 svar)", varningen - 1, varningen), "gårdagens kvitto under dagens varning")
    }
}
