// Resans sträckor (DECISIONS #930, #933, #934): samma prov som ResstrackorTests.swift, så att iPhone och Android delar resan lika
// och säger samma ord.
package se.halkvakt.engine

import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ResstrackorTest {
    /** En rak väg norrut längs 15°E, en punkt per hundradels grad: 4 grader, omkring 445 km. */
    private val rutt: List<DoubleArray> = (0..400).map { doubleArrayOf(15.0, 56.0 + it / 100.0) }
    private val orter = listOf(
        Ort("Startby", 15.0, 56.02),      // 2 km in: resans start
        Ort("Mellanstad", 15.0, 57.0),    // 111 km in
        Ort("Grannby", 15.0, 57.1),       // 11 km efter Mellanstad: för nära, ingen brytpunkt
        Ort("Norrstad", 15.02, 58.5),     // 278 km in, 1,2 km från vägen
        Ort("Avsides", 15.5, 58.0),       // 30 km från vägen
        Ort("Malby", 15.0, 59.95),        // 5,6 km före målet: resans mål
    )

    private fun rad(slag: RapportSlag, km: Int, id: String? = null, text: String = "", rubrik: String = "") =
        RapportRad(id ?: "${slag.wire}:$km", slag, rubrik, text, 0, km * 1000, null, null)

    @Test fun hittarOrternaLangsVagenIKorordning() {
        val langs = Resstrackor.orterLangs(rutt, Resstrackor.kumulativ(rutt), orter)
        assertEquals(listOf("Startby", "Mellanstad", "Grannby", "Norrstad", "Malby"), langs.map { it.first })
        assertTrue(abs(langs[1].second - 111_195) < 300)
    }

    @Test fun bryterVidVarjeOrt() {
        val s = Resstrackor.strackor(rutt, listOf(rad(RapportSlag.HALKA, 300), rad(RapportSlag.FRYSRISK, 150), rad(RapportSlag.VAGARBETE, 50)), orter)
        assertEquals(listOf<String?>("Startby", "Mellanstad", "Norrstad"), s.map { it.fran })
        assertEquals(listOf(StrackLage.LUGNT, StrackLage.FRYSRISK, StrackLage.HALT), s.map { it.lage })
        assertEquals(0, s[0].franM)
        assertTrue(abs(s[1].franM - 111_195) < 300)
        assertTrue(abs(s[2].franM - 278_000) < 1_000)
        assertTrue(s[0].tillM == s[1].franM && s[1].tillM == s[2].franM)
        assertTrue(abs(s[2].tillM - 444_780) < 1_000)
        assertEquals(listOf(listOf(RapportSlag.VAGARBETE), listOf(RapportSlag.FRYSRISK), listOf(RapportSlag.HALKA)), s.map { l -> l.rader.map { it.slag } })
    }

    @Test fun sammaLageSlasInteIhop() {
        val lugnt = Resstrackor.strackor(rutt, listOf(rad(RapportSlag.VAGARBETE, 50), rad(RapportSlag.KAMERA, 200), rad(RapportSlag.VAGARBETE, 400)), orter)
        assertEquals(listOf<String?>("Startby", "Mellanstad", "Norrstad"), lugnt.map { it.fran })
        assertEquals(List(3) { StrackLage.LUGNT }, lugnt.map { it.lage })
        val halt = Resstrackor.strackor(rutt, listOf(rad(RapportSlag.HALKA, 120, "a"), rad(RapportSlag.HALKA, 130, "b"), rad(RapportSlag.HALKA, 300, "c")), orter)
        assertEquals(listOf(StrackLage.LUGNT, StrackLage.HALT, StrackLage.HALT), halt.map { it.lage })
        assertEquals(listOf(0, 2, 1), halt.map { Resstrackor.antal(it) })
    }

    @Test fun halkaGarForeFrysriskOchSmhiStarInteMed() {
        val s = Resstrackor.strackor(rutt, listOf(rad(RapportSlag.FRYSRISK, 20), rad(RapportSlag.HALKA, 60), rad(RapportSlag.SMHI, 0)), orter)
        assertEquals(listOf(StrackLage.HALT, StrackLage.LUGNT, StrackLage.LUGNT), s.map { it.lage })
        assertEquals(listOf(RapportSlag.FRYSRISK, RapportSlag.HALKA), s[0].rader.map { it.slag })
    }

    @Test fun utanOrterBlirDetEnStracka() {
        val s = Resstrackor.strackor(rutt, listOf(rad(RapportSlag.HALKA, 300)), emptyList())
        assertTrue(s.size == 1 && s[0].fran == null && s[0].lage == StrackLage.HALT)
        assertTrue(Resstrackor.strackor(listOf(doubleArrayOf(15.0, 56.0)), emptyList(), orter).isEmpty())
    }

    @Test fun domenArEnMening() {
        fun dom(vararg r: RapportRad) = Resstrackor.dom(Resstrackor.strackor(rutt, r.toList(), orter))
        assertEquals("Halt på 3 ställen, först efter Mellanstad.",
            dom(rad(RapportSlag.HALKA, 300, "a"), rad(RapportSlag.HALKA, 120, "b"), rad(RapportSlag.HALKA, 130, "c"), rad(RapportSlag.FRYSRISK, 150)))
        assertEquals("Halt på 1 ställe, efter Norrstad.", dom(rad(RapportSlag.HALKA, 300)))
        assertEquals("Lugnt hela vägen.", dom(rad(RapportSlag.VAGARBETE, 50)))
        assertEquals("Halt på 1 ställe, redan på första sträckan.", dom(rad(RapportSlag.HALKA, 10)))
        assertEquals("Frysrisk på 2 ställen, först efter Mellanstad.", dom(rad(RapportSlag.FRYSRISK, 300), rad(RapportSlag.FRYSRISK, 150)))
    }

    @Test fun texternaSagerAntaletOchSortenAvHalka() {
        val s = Resstrackor.strackor(rutt, listOf(
            rad(RapportSlag.HALKA, 300, "seg:a", "fläckvis Is, Våt"), rad(RapportSlag.HALKA, 310, "seg:b", "fläckvis Is, fläckvis moddig Vägbana"),
            rad(RapportSlag.VAGARBETE, 320), rad(RapportSlag.FRYSRISK, 330, "wx:1"), rad(RapportSlag.HALKA, 150, "seg:c", "Moddsträngar, Lössnö"),
            rad(RapportSlag.FRYSRISK, 20, "wx:2"), rad(RapportSlag.FRYSRISK, 30, "bro:3"),
        ), orter)
        assertEquals("Halt på 2 ställen", Resstrackor.rubrik(s[2])); assertEquals("2 STÄLLEN", Resstrackor.tagg(s[2]))
        assertEquals("Fläckvis is och fläckvis snömodd. Frysrisk vid en mätstation.", Resstrackor.under(s[2]))
        assertEquals("Halt på 1 ställe", Resstrackor.rubrik(s[1])); assertEquals("1 STÄLLE", Resstrackor.tagg(s[1]))
        assertEquals("Moddsträngar och lössnö.", Resstrackor.under(s[1]))
        assertEquals("Frysrisk på 2 ställen", Resstrackor.rubrik(s[0])); assertEquals("FRYSRISK", Resstrackor.tagg(s[0]))
        assertEquals("Frysrisk vid en mätstation och på en bro.", Resstrackor.under(s[0]))
        val lugnt = Resstrackor.strackor(rutt, listOf(rad(RapportSlag.VAGARBETE, 50)), orter)[0]
        assertEquals("Lugnt", Resstrackor.rubrik(lugnt)); assertEquals("LUGNT", Resstrackor.tagg(lugnt))
        assertEquals("Inget halt rapporterat.", Resstrackor.under(lugnt))
    }

    @Test fun riskForHalkaSagerHalkrisk() {
        // Kod 2 utan halkord är halkrisk, som rösten (DECISIONS #964).
        fun risk(km: Int, text: String = "risk för halka rapporterad på sträckan") = rad(RapportSlag.HALKA, km, text = text, rubrik = "Halkrisk")
        val bara = Resstrackor.strackor(rutt, listOf(risk(300), risk(310, "Våt")), orter)
        assertEquals("Halkrisk på 2 ställen", Resstrackor.rubrik(bara[2])); assertEquals("2 STÄLLEN", Resstrackor.tagg(bara[2]))
        assertEquals("Halkrisk på 2 ställen, först efter Norrstad.", Resstrackor.dom(bara))
        assertEquals("Risk för halka rapporterad.", Resstrackor.sorter(listOf(risk(1))))
        val blandat = Resstrackor.strackor(rutt, listOf(risk(300), rad(RapportSlag.HALKA, 310, text = "Is", rubrik = "Halt väglag")), orter)
        assertEquals("Halt på 1 ställe, halkrisk på 1 ställe", Resstrackor.rubrik(blandat[2]))
        assertEquals("Is.", Resstrackor.under(blandat[2]))
        assertEquals("Halt väglag rapporterat.",
            Resstrackor.sorter(listOf(risk(1), rad(RapportSlag.HALKA, 2, text = "halka rapporterad på sträckan", rubrik = "Halt väglag"))))
    }

    @Test fun trafikverketsOrdBlirVanligSvenska() {
        fun h(km: Int, text: String) = rad(RapportSlag.HALKA, km, text = text)
        assertEquals("fläckvis is, vått", Resstrackor.rentVaglag("fläckvis Is, Våt"))
        assertEquals("is med bart i hjulspåren, fläckvis snömodd", Resstrackor.rentVaglag("Is med bart i hjulspår, fläckvis moddig Vägbana"))
        assertEquals("halka rapporterad på sträckan", Resstrackor.rentVaglag("halka rapporterad på sträckan"))
        // Is på en rad och fläckvis is på en annan: då är det inte bara fläckvis. Vått och torrt är ingen halka i sig.
        assertEquals("Is.", Resstrackor.sorter(listOf(h(1, "Is"), h(2, "fläckvis Is, fläckvis Torrt"), h(3, "Is med bart i hjulspår"))))
        assertEquals("Vått. Besvärligt väglag enligt Trafikverket.", Resstrackor.sorter(listOf(h(1, "Våt"), h(2, "fläckvis Våt, fläckvis Torrt"))))
        assertEquals("Fläckvis vått. Besvärligt väglag enligt Trafikverket.", Resstrackor.sorter(listOf(h(1, "fläckvis Våt, fläckvis Torrt"))))
        assertEquals("Lössnö.", Resstrackor.sorter(listOf(h(1, "Våt"), h(2, "Lössnö"))))
        assertEquals("Halt väglag rapporterat.", Resstrackor.sorter(listOf(h(1, "halka rapporterad på sträckan"))))
        assertEquals("Is, packad snö och lössnö.", Resstrackor.sorter(listOf(h(1, "Packad snö, Lössnö, Is"))))
    }

    @Test fun punktenLiggerPaVagen() {
        val kum = Resstrackor.kumulativ(rutt)
        val p = Resstrackor.punkt(rutt, kum, kum[100] + (kum[101] - kum[100]) / 2)!!
        assertTrue(abs(p[1] - 57.005) < 0.0001 && p[0] == 15.0)
        assertContentEquals(rutt.last(), Resstrackor.punkt(rutt, kum, 9_999_999.0))
    }

    @Test fun tidenArAvresanPlusAndelenAvRestiden() {
        val t0 = 1_000_000L
        assertEquals(t0 + 1_800_000, Resstrackor.tidVid(50_000, 100_000, 3600.0, t0))
        assertEquals(t0 + 3_600_000, Resstrackor.tidVid(200_000, 100_000, 3600.0, t0))
        assertNull(Resstrackor.tidVid(50_000, 100_000, null, t0))
    }
}
