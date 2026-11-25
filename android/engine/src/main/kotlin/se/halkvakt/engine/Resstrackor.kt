package se.halkvakt.engine

import kotlin.math.roundToInt

/*
 * RESANS STRÄCKOR (DECISIONS #930, Förslag A #933, #934) — spegel av Resstrackor.swift, med samma prov (ResstrackorTest).
 *
 * En planerad resa delad i sträckor i den ordning föraren kör. Resan bryts vid varje större ort längs vägen, och sträckorna slås
 * inte ihop. Läget är det rapporten redan har räknat fram: halt (minst en halksträcka), frysrisk (ingen halka, men en station eller
 * bro med frysrisk) eller lugnt. Sträckan säger hur många ställen halkan gäller och vilken sorts halka det är, med Trafikverkets ord
 * som vanlig svenska. Tiden vid en sträcka är avresan plus sträckans andel av restiden: en klocktid, ingen prognos.
 */

data class Ort(val namn: String, val lon: Double, val lat: Double)

enum class StrackLage { LUGNT, FRYSRISK, HALT }

/** [fran] är orten sträckan börjar vid, null för resans start när ingen ort ligger där. SMHI:s varningar står inte i [rader]. */
data class Resstracka(val fran: String?, val franM: Int, val tillM: Int, val lage: StrackLage, val rader: List<RapportRad>)

object Resstrackor {
    /** En ort ligger längs vägen när den är närmare vägen än så. */
    const val ORT_INOM_M = 5_000.0
    /** En ort närmare starten eller målet än så är ingen brytpunkt: den är starten eller målet. */
    const val ORT_KANT_M = 15_000.0
    /** Två brytpunkter närmare varandra än så blir en: den första i körordning. */
    const val ORT_GLES_M = 20_000.0

    /** Vägens längd fram till varje punkt, i meter. */
    fun kumulativ(rutt: List<DoubleArray>): List<Double> {
        val kum = ArrayList<Double>(rutt.size.coerceAtLeast(1)); kum += 0.0
        for (i in 1 until rutt.size) kum += kum[i - 1] + Geo.haversineM(rutt[i - 1][0], rutt[i - 1][1], rutt[i][0], rutt[i][1])
        return kum
    }

    /** Orterna längs vägen: namn och meter in på resan, i körordning. Vägens punkter ligger tätt, så närmaste punkt räcker. */
    fun orterLangs(rutt: List<DoubleArray>, kum: List<Double>, orter: List<Ort>): List<Pair<String, Double>> {
        if (rutt.size < 2) return emptyList()
        val ut = mutableListOf<Pair<String, Double>>()
        for (o in orter) {
            var bast = Double.POSITIVE_INFINITY; var vid = 0
            for ((i, p) in rutt.withIndex()) {
                val d = Geo.haversineM(o.lon, o.lat, p[0], p[1])
                if (d < bast) { bast = d; vid = i }
            }
            if (bast <= ORT_INOM_M) ut += o.namn to kum[vid]
        }
        return ut.sortedBy { it.second }
    }

    /** Resans sträckor. [rader] är resans rapport åt det håll föraren kör. */
    fun strackor(rutt: List<DoubleArray>, rader: List<RapportRad>, orter: List<Ort>): List<Resstracka> {
        val kum = kumulativ(rutt)
        val total = kum.last()
        if (total <= 0) return emptyList()
        val langs = orterLangs(rutt, kum, orter)
        val brott = mutableListOf<Pair<String?, Double>>(langs.firstOrNull { it.second < ORT_KANT_M }?.first to 0.0)
        for (o in langs) {
            if (o.second >= ORT_KANT_M && o.second <= total - ORT_KANT_M && o.second - brott.last().second >= ORT_GLES_M) brott += o
        }
        val pa = rader.filter { it.slag != RapportSlag.SMHI }
        return brott.mapIndexed { i, b ->
            val sista = i + 1 == brott.size
            val till = if (sista) total else brott[i + 1].second
            val mina = pa.filter { it.langsM >= b.second && (sista || it.langsM < till) }.sortedBy { it.langsM }   // sortedBy är stabil
            val lage = when {
                mina.any { it.slag == RapportSlag.HALKA } -> StrackLage.HALT
                mina.any { it.slag == RapportSlag.FRYSRISK } -> StrackLage.FRYSRISK
                else -> StrackLage.LUGNT
            }
            Resstracka(b.first, b.second.roundToInt(), till.roundToInt(), lage, mina)
        }
    }

    /** Klocktiden (ms sedan 1970) vid en punkt på resan: avresan plus punktens andel av restiden. null utan restid. */
    fun tidVid(m: Int, totalM: Int, restidS: Double?, avresaMs: Long): Long? {
        if (restidS == null || restidS <= 0 || totalM <= 0) return null
        return avresaMs + (restidS * 1000 * m.coerceIn(0, totalM) / totalM).toLong()
    }

    /** Punkten [m] meter in på vägen. */
    fun punkt(rutt: List<DoubleArray>, kum: List<Double>, m: Double): DoubleArray? {
        if (rutt.size != kum.size || rutt.isEmpty()) return null
        val i = kum.indexOfFirst { it >= m }
        if (i < 0) return rutt.last()
        if (i == 0 || kum[i] <= kum[i - 1]) return rutt[i]
        val t = (m - kum[i - 1]) / (kum[i] - kum[i - 1])
        return doubleArrayOf(rutt[i - 1][0] + t * (rutt[i][0] - rutt[i - 1][0]), rutt[i - 1][1] + t * (rutt[i][1] - rutt[i - 1][1]))
    }

    // ---- texterna ----

    private fun stallen(n: Int) = if (n == 1) "1 ställe" else "$n ställen"

    /** Antalet halksträckor på sträckan, eller platserna med frysrisk när ingen halka finns. */
    fun antal(s: Resstracka): Int {
        val halka = s.rader.count { it.slag == RapportSlag.HALKA }
        return if (halka > 0) halka else s.rader.count { it.slag == RapportSlag.FRYSRISK }
    }

    /** En halkrad som bara är risk för halka: kod 2 utan halkord, som rösten (DECISIONS #963, #964). */
    private fun risk(r: RapportRad) = r.slag == RapportSlag.HALKA && r.rubrik.startsWith("Halkrisk")

    /** "Halt på 1 ställe", "Halkrisk på 3 ställen" eller "Halt på 1 ställe, halkrisk på 3 ställen". */
    private fun halkdelar(rader: List<RapportRad>): String {
        val halka = rader.filter { it.slag == RapportSlag.HALKA }
        val risker = halka.count(::risk); val halt = halka.size - risker
        return when {
            risker == 0 -> "Halt på ${stallen(halt)}"
            halt == 0 -> "Halkrisk på ${stallen(risker)}"
            else -> "Halt på ${stallen(halt)}, halkrisk på ${stallen(risker)}"
        }
    }

    /** Sträckans rubrik: "Halt på 4 ställen", "Halkrisk på 2 ställen", "Frysrisk på 1 ställe" eller "Lugnt". */
    fun rubrik(s: Resstracka): String = when (s.lage) {
        StrackLage.HALT -> halkdelar(s.rader)
        StrackLage.FRYSRISK -> "Frysrisk på ${stallen(antal(s))}"
        StrackLage.LUGNT -> "Lugnt"
    }

    /** Etiketten till höger: antalet ställen för halkan, annars läget. */
    fun tagg(s: Resstracka): String = when (s.lage) {
        StrackLage.HALT -> stallen(antal(s)).uppercase()
        StrackLage.FRYSRISK -> "FRYSRISK"
        StrackLage.LUGNT -> "LUGNT"
    }

    /** Trafikverkets ord för väglaget som vanlig svenska. Nyckeln är ordet med små bokstäver och utan "fläckvis". */
    private val vaglagsord = mapOf(
        "is" to (0 to "is"), "is med bart i hjulspår" to (1 to "is med bart i hjulspåren"), "packad snö" to (2 to "packad snö"),
        "moddig vägbana" to (3 to "snömodd"), "moddsträngar" to (4 to "moddsträngar"), "lössnö" to (5 to "lössnö"),
    )
    /** Ord som inte är halka i sig: de står med när en sträcka öppnas, men inte i sammanfattningen. */
    private val bredvidord = mapOf("våt" to "vått", "torrt" to "torrt")
    private const val UTAN_ORD = "halka rapporterad på sträckan"
    private const val UTAN_ORD_RISK = "risk för halka rapporterad på sträckan"
    private const val FLACKVIS = "fläckvis "

    /** Radens ord: (fläckvis, ordet). */
    private fun ord(text: String): List<Pair<Boolean, String>> =
        text.split(",").map { it.trim().lowercase() }.filter { it.isNotEmpty() }
            .map { if (it.startsWith(FLACKVIS)) true to it.removePrefix(FLACKVIS) else false to it }

    /** En halkrads text för den öppnade sträckan: "fläckvis Is, Våt" blir "fläckvis is, vått". */
    fun rentVaglag(text: String): String {
        val delar = ord(text).map { (f, o) -> (if (f) FLACKVIS else "") + (vaglagsord[o]?.second ?: bredvidord[o] ?: o) }
        return if (delar.isEmpty()) UTAN_ORD else delar.joinToString(", ")
    }

    /**
     * Sorterna av halka på sträckan i en mening: "Fläckvis is och moddsträngar." Ett ord är fläckvis bara när varje rad säger det.
     * Säger raderna bara vått står det: omkring var tredje sträcka i Trafikverkets väglag är besvärlig (kod 2) med bara det ordet
     * (DECISIONS #934).
     */
    fun sorter(rader: List<RapportRad>): String {
        val alla = rader.filter { it.slag == RapportSlag.HALKA }.flatMap { ord(it.text) }
        val funna = LinkedHashMap<String, Triple<Int, String, Boolean>>()
        for ((f, o) in alla) {
            if (o in bredvidord || o == UTAN_ORD || o == UTAN_ORD_RISK) continue
            val k = vaglagsord[o] ?: (9 to o)
            funna[k.second] = Triple(k.first, k.second, f && (funna[k.second]?.third ?: true))
        }
        // Is med bart i hjulspåren är också is: står båda räcker ordet is.
        if ("is" in funna) funna.remove("is med bart i hjulspåren")
        val delar = funna.values.sortedWith(compareBy({ it.first }, { it.second })).map { (if (it.third) FLACKVIS else "") + it.second }
        if (delar.isEmpty()) {
            val vatt = alla.filter { it.second == "våt" }
            if (vatt.isEmpty()) return if (rader.filter { it.slag == RapportSlag.HALKA }.all(::risk)) "Risk för halka rapporterad." else "Halt väglag rapporterat."
            return "${if (vatt.all { it.first }) "Fläckvis vått" else "Vått"}. Besvärligt väglag enligt Trafikverket."
        }
        val mening = if (delar.size == 1) delar[0] else delar.dropLast(1).joinToString(", ") + " och " + delar.last()
        return mening.replaceFirstChar { it.uppercase() } + "."
    }

    /** "Frysrisk vid en mätstation.", "Frysrisk vid 2 mätstationer och på en bro." */
    fun frysrisk(rader: List<RapportRad>): String? {
        val alla = rader.filter { it.slag == RapportSlag.FRYSRISK }
        val broar = alla.count { it.id.startsWith("bro:") }; val stationer = alla.size - broar
        val delar = mutableListOf<String>()
        if (stationer > 0) delar += if (stationer == 1) "vid en mätstation" else "vid $stationer mätstationer"
        if (broar > 0) delar += if (broar == 1) "på en bro" else "på $broar broar"
        return if (delar.isEmpty()) null else "Frysrisk " + delar.joinToString(" och ") + "."
    }

    /** Raden under rubriken: vilken sorts halka det är, och frysrisken. */
    fun under(s: Resstracka): String = when (s.lage) {
        StrackLage.HALT -> listOfNotNull(sorter(s.rader), frysrisk(s.rader)).joinToString(" ")
        StrackLage.FRYSRISK -> frysrisk(s.rader) ?: "Frysrisk."
        StrackLage.LUGNT -> "Inget halt rapporterat."
    }

    /** Omdömet överst, i en mening: hur många ställen det gäller och var det börjar. */
    fun dom(strackor: List<Resstracka>): String {
        val varst = strackor.maxOfOrNull { it.lage } ?: StrackLage.LUGNT
        if (varst == StrackLage.LUGNT) return "Lugnt hela vägen."
        val forsta = strackor.first { it.lage == varst }
        val mina = strackor.filter { it.lage == varst }
        val n = mina.sumOf { antal(it) }
        val vart = if (forsta.franM == 0) "redan på första sträckan" else "${if (n == 1) "efter" else "först efter"} ${forsta.fran ?: "start"}"
        return "${if (varst == StrackLage.HALT) halkdelar(mina.flatMap { it.rader }) else "Frysrisk på ${stallen(n)}"}, $vart."
    }
}
