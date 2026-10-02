// The warning card's content for cards A–L of the design handoff v2 (DECISIONS #443).
// Swift twin: ios/HalkvaktEngine/Tests/HalkvaktEngineTests/WarningCardTests.swift — keep the cases identical.
package se.halkvakt.engine

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class WarningCardTest {
    private fun alert(kind: HazardKind, d: Long, text: String, step: AccidentStep? = null) =
        Alert(t = 0.0, hazardId = "h", kind = kind, distanceM = d, text = text, step = step)
    private fun num(v: String, u: String) = WarningCard.Distance.Number(v, u)
    private fun words(w: String) = WarningCard.Distance.Words(w)

    @Test fun accidentPlainWithRoad() {   // A
        val c = WarningCard.make(alert(HazardKind.ACCIDENT, 3120, "Olycka rapporterad på E18 3 kilometer framför dig."), PointMeta(road = "E18"))
        assertEquals("Olycka", c.title); assertNull(c.stage)
        assertEquals(num("3", "KM"), c.distance); assertEquals("E18", c.road); assertNull(c.advice)
    }

    @Test fun accidentBareRoadNumberAndNoRoad() {   // I, J
        assertEquals("VÄG 25", WarningCard.make(alert(HazardKind.ACCIDENT, 4000, "x"), PointMeta(road = "25")).road)
        assertNull(WarningCard.make(alert(HazardKind.ACCIDENT, 3000, "x"), PointMeta(road = null)).road)
        assertNull(WarningCard.make(alert(HazardKind.ACCIDENT, 3000, "x"), PointMeta(road = "  ")).road)
    }

    @Test fun accidentUnderOneKmSaysOneKm() {   // the voice says "1 kilometer" (max 1)
        assertEquals(num("1", "KM"), WarningCard.make(alert(HazardKind.ACCIDENT, 420, "x"), null).distance)
    }

    @Test fun seriousEarlyWithClearanceTime() {   // F
        val c = WarningCard.make(alert(HazardKind.ACCIDENT, 8200, "x", AccidentStep.EARLY), PointMeta(endTimeLocal = "19:30", road = "E18"))
        assertEquals("ALLVARLIG · TIDIGT", c.stage); assertEquals("Allvarlig olycka", c.title)
        assertEquals(num("8", "KM"), c.distance); assertEquals("E18", c.road)
        assertEquals("Överväg annan väg", c.advice); assertEquals("STOR PÅVERKAN · RÖJD CA 19:30", c.adviceSub)
        assertEquals("STOR PÅVERKAN", WarningCard.make(alert(HazardKind.ACCIDENT, 8200, "x", AccidentStep.EARLY), PointMeta(road = "E18")).adviceSub)
    }

    @Test fun seriousReminder() {   // G
        val c = WarningCard.make(alert(HazardKind.ACCIDENT, 1500, "Sakta ner — olycksplats strax framför dig.", AccidentStep.REMINDER), PointMeta(road = "E18"))
        assertEquals("PÅMINNELSE", c.stage); assertEquals("Sakta ner", c.title); assertEquals("Olycksplats strax framför dig", c.sub)
        assertEquals(words("STRAX FRAMFÖR"), c.distance); assertNull(c.road); assertNull(c.advice)
    }

    @Test fun seriousLate() {   // H
        val c = WarningCard.make(alert(HazardKind.ACCIDENT, 1900, "x", AccidentStep.LATE), PointMeta(road = "E18"))
        assertEquals("ALLVARLIG · SENT", c.stage); assertEquals(num("2", "KM"), c.distance)
        assertEquals("Sakta ner", c.advice); assertEquals("STOR PÅVERKAN", c.adviceSub)
    }

    @Test fun wordsInsteadOfNumbers() {   // B, C, D
        val b = WarningCard.make(alert(HazardKind.SLIPPERY_SEGMENT, 900, "Varning: halka rapporterad på vägen framför dig."), null)
        assertEquals("Halka", b.title); assertEquals(words("FRAMFÖR DIG"), b.distance); assertEquals(WarningCard.Icon.HALKA, b.icon)
        val c = WarningCard.make(alert(HazardKind.ICING_POINT, 700, "x"), PointMeta())
        assertEquals(WarningCard.Icon.FRYS, c.icon); assertEquals("Vägbanan nära noll grader", c.sub); assertEquals(words("FRAMÖVER"), c.distance)
        val d = WarningCard.make(alert(HazardKind.WILDLIFE, 650, "Viltrisk framöver."), null)
        assertEquals("Vilt", d.title); assertEquals(words("FRAMÖVER"), d.distance)
    }

    @Test fun bridgeInHundredsOfMetresLikeTheVoice() {   // K
        val k = WarningCard.make(alert(HazardKind.ICING_POINT, 640, "Frysrisk framöver — bro om 600 meter."), PointMeta(bridge = true))
        assertEquals(WarningCard.Icon.BRO, k.icon); assertEquals("Bro", k.sub); assertEquals(num("600", "M"), k.distance)
        assertEquals(num("1200", "M"), WarningCard.make(alert(HazardKind.ICING_POINT, 1240, "x"), PointMeta(bridge = true)).distance)
        assertEquals(num("100", "M"), WarningCard.make(alert(HazardKind.ICING_POINT, 30, "x"), PointMeta(bridge = true)).distance)
    }

    @Test fun cameraAlwaysFiveHundredAndLimitOnlyWhenKnown() {   // E, L
        val e = WarningCard.make(alert(HazardKind.CAMERA, 472, "Fartkamera om 500 meter. Gränsen är 80."), PointMeta(speedLimitKmh = 80))
        assertEquals(num("500", "M"), e.distance); assertEquals(80, e.limit)
        assertNull(WarningCard.make(alert(HazardKind.CAMERA, 472, "Fartkamera om 500 meter."), PointMeta()).limit)
    }

    @Test fun quoteIsTheVoiceLineVerbatim() {
        val text = "Allvarlig olycka på E18 2 kilometer framför dig — stor påverkan. Sakta ner."
        assertEquals(text, WarningCard.make(alert(HazardKind.ACCIDENT, 2000, text, AccidentStep.LATE), null).quote)
    }
}
