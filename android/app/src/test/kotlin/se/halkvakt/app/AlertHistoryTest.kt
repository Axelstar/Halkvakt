package se.halkvakt.app

import kotlin.test.Test
import kotlin.test.assertEquals

class AlertHistoryTest {
    @Test fun roundtripWithSwedishAndSanitizedTabs() {
        val orig = listOf(
            AlertEntry(1700000000000, "slippery_segment", "Halt väglag om åttahundra meter — is på bron"),
            AlertEntry(1700000001000, "wildlife", "Vilt\trapporterat\nframför dig"))
        val back = AlertHistory.decode(AlertHistory.encode(orig))
        assertEquals(2, back.size)
        assertEquals("Halt väglag om åttahundra meter — is på bron", back[0].text)
        assertEquals("Vilt rapporterat framför dig", back[1].text) // tab+radbryt sanerade
        assertEquals("wildlife", back[1].kind)
    }
    @Test fun corruptLinesAreSkipped() {
        val back = AlertHistory.decode("garbage\n123\tonly_two\n${1}\tcamera\tFartkamera om femhundra meter\n\n")
        assertEquals(1, back.size); assertEquals("camera", back[0].kind)
    }
    @Test fun appendTrimsOldestKeepsNewest() {
        var l = emptyList<AlertEntry>()
        repeat(60) { i -> l = AlertHistory.append(l, AlertEntry(i.toLong(), "camera", "n$i")) }
        assertEquals(AlertHistory.MAX, l.size); assertEquals("n59", l.last().text); assertEquals("n10", l.first().text)
    }
    @Test fun emptyStringDecodesEmpty() { assertEquals(0, AlertHistory.decode("").size) }
}
