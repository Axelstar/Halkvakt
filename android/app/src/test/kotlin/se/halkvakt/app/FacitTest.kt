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
}
