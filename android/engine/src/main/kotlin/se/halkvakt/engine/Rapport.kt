package se.halkvakt.engine

import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.hypot

/*
 * RESANS RAPPORT (favoriterna steg 3a, kort #357; DECISIONS #636, #637) — spegel av favoritRapport, grupperade, tomma, nyttSedan och
 * visning i publish/rapport-core.ts och resansRapport, riktning och vand i publish/rapport-app.ts, prövad mot engine/fixtures/rapport.json
 * i alla tre språk (scripts/rapport-facit.ts). Avstånden per slag är provmiljöns tal, appens trösklar sedan #637; talen står i
 * kontraktsgrinden. Ren logik: läsarna tar JSON som Map och List (appen gör om sin org.json, provet läser med toMap), och allt räknas i
 * telefonen. Ingen fråga om förarens väg lämnar den.
 */

enum class RapportSlag(val wire: String) {
    FRYSRISK("frysrisk"), HALKA("halka"), OLYCKA("olycka"), HINDER("hinder"), VILT("vilt"), KO("ko"), RESTID("restid"),
    VAGARBETE("vagarbete"), HASTIGHET("hastighet"), OMLEDNING("omledning"), FARJA("farja"), KAMERA("kamera"), SMHI("smhi");
    companion object { fun of(s: String): RapportSlag? = entries.firstOrNull { it.wire == s } }
}

/** En post i rapportfilens snabba del (schema 2). [p] en punkt [lon, lat], [l] id för en linje i den långsamma delen. */
data class RapportPost(
    val id: String, val slag: RapportSlag, val rubrik: String, val t: String? = null, val p: DoubleArray? = null, val l: String? = null,
    val vag: String? = null, val start: String? = null, val slut: String? = null, val korfalt: Int? = null, val grans: Int? = null,
    val tid: Int? = null, val normal: Int? = null, val text: String? = null,
)
data class RapportStation(val namn: String, val luft: Double?)
data class Rapportfil(val generatedAt: String, val poster: List<RapportPost>, val stationer: Map<String, RapportStation>)

/** Lägesfilens fält som rapporten läser — fler än motorns läsare tar ut (vägen på sträckorna, broarna, SMHI:s områden). */
data class RapportLage(val segments: List<Strecka>, val weather: List<Station>, val bridges: List<Bro>, val smhi: List<Smhi>) {
    data class Strecka(val id: String, val line: List<DoubleArray>, val info: List<String>, val road: String?)
    data class Station(val id: String, val lon: Double, val lat: Double, val yta: Double?, val fukt: Boolean, val regnH: Double?,
                       val lutning30: Double?)
    data class Bro(val id: String, val lon: Double, val lat: Double, val road: String?, val yta: Double?, val fukt: Boolean)
    /** [polygoner]: varje polygon är en lista ringar, den första yttre och resten hål. */
    data class Smhi(val id: String, val event: String?, val niva: String?, val polygoner: List<List<List<DoubleArray>>>)
}
data class RapportKamera(val id: String, val lon: Double, val lat: Double, val road: String?)

data class RapportRad(val id: String, val slag: RapportSlag, val rubrik: String, val text: String, val avstandM: Int, val langsM: Int,
                      val vag: String?, val start: String?)
data class RapportGrupp(val id: String, val slag: RapportSlag, val rubrik: String, val text: String, val antal: Int, val ids: List<String>,
                        val langsM: Int)

object ResansRapport {
    /** Favoritsidans viktordning (FAVORITER §3): halka och frysrisk först, SMHI sist. */
    val ORDNING = listOf(RapportSlag.HALKA, RapportSlag.FRYSRISK, RapportSlag.OLYCKA, RapportSlag.HINDER, RapportSlag.VILT, RapportSlag.KO,
        RapportSlag.RESTID, RapportSlag.VAGARBETE, RapportSlag.HASTIGHET, RapportSlag.OMLEDNING, RapportSlag.FARJA, RapportSlag.KAMERA,
        RapportSlag.SMHI)
    /** Avståndet till resan per slag, i meter — provmiljöns tal, appens trösklar (DECISIONS #637). */
    val MARGINALER: Map<RapportSlag, Double> = mapOf(RapportSlag.HALKA to 100.0, RapportSlag.FRYSRISK to 500.0, RapportSlag.OLYCKA to 150.0,
        RapportSlag.HINDER to 150.0, RapportSlag.VILT to 150.0, RapportSlag.KO to 100.0, RapportSlag.RESTID to 100.0,
        RapportSlag.VAGARBETE to 100.0, RapportSlag.HASTIGHET to 100.0, RapportSlag.OMLEDNING to 100.0, RapportSlag.FARJA to 500.0,
        RapportSlag.KAMERA to 100.0, RapportSlag.SMHI to 0.0)
    /** En linje ligger längs resan först när minst LANGS_ANDEL av den, eller LANGS_MINST_M, ligger inom avståndet. */
    const val LANGS_ANDEL = 0.5
    const val LANGS_MINST_M = 500.0
    const val LANGS_STEG_M = 100.0
    const val GRUPP_FRAN = 3
    const val RUTA_GRAD = 0.05
    private val cfg = EngineConfig()

    // ── Läsarna ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

    private fun dbl(o: Map<*, *>, k: String): Double? = (o[k] as? Number)?.toDouble()
    private fun str(o: Map<*, *>, k: String): String? = o[k] as? String
    private fun int(o: Map<*, *>, k: String): Int? = (o[k] as? Number)?.toInt()
    private fun punkter(a: Any?): List<DoubleArray> = ((a as? List<*>) ?: emptyList<Any?>()).mapNotNull { p ->
        val q = p as? List<*>
        val x = q?.getOrNull(0) as? Number; val y = q?.getOrNull(1) as? Number
        if (q == null || q.size < 2 || x == null || y == null) null else doubleArrayOf(x.toDouble(), y.toDouble())
    }
    private fun objekt(a: Any?): List<Map<*, *>> = ((a as? List<*>) ?: emptyList<Any?>()).filterIsInstance<Map<*, *>>()
    private fun idText(v: Any?): String = v?.toString() ?: ""

    fun lasRapportfil(o: Map<*, *>): Rapportfil? {
        val poster = o["poster"] as? List<*> ?: return null
        val st = LinkedHashMap<String, RapportStation>()
        (o["stationer"] as? Map<*, *>)?.forEach { (k, v) -> if (k is String && v is Map<*, *>) st[k] = RapportStation(str(v, "namn") ?: "", dbl(v, "luft")) }
        return Rapportfil(str(o, "generated_at") ?: "", objekt(poster).mapNotNull { p ->
            val id = str(p, "id") ?: return@mapNotNull null
            val slag = str(p, "slag")?.let { RapportSlag.of(it) } ?: return@mapNotNull null
            RapportPost(id, slag, str(p, "rubrik") ?: "", str(p, "t"), punkter(listOf(p["p"])).firstOrNull(), str(p, "l"), str(p, "vag"),
                str(p, "start"), str(p, "slut"), int(p, "korfalt"), int(p, "grans"), int(p, "tid"), int(p, "normal"), str(p, "text"))
        }, st)
    }

    fun lasLinjer(o: Map<*, *>): Map<String, List<List<DoubleArray>>> {
        val ut = LinkedHashMap<String, List<List<DoubleArray>>>()
        (o["linjer"] as? Map<*, *>)?.forEach { (k, v) -> if (k is String) ut[k] = ((v as? List<*>) ?: emptyList<Any?>()).map(::punkter) }
        return ut
    }

    fun lasLage(o: Map<*, *>): RapportLage {
        val smhi = objekt(o["smhi"]).map { w ->
            val g = w["geom"] as? Map<*, *>
            val c = (g?.get("coordinates") as? List<*>) ?: emptyList<Any?>()
            val polys: List<List<List<DoubleArray>>> = when (g?.get("type")) {
                "Polygon" -> listOf(c.map(::punkter))
                "MultiPolygon" -> c.map { poly -> ((poly as? List<*>) ?: emptyList<Any?>()).map(::punkter) }
                else -> emptyList()
            }
            RapportLage.Smhi(idText(w["id"]), str(w, "event"), w["niva"]?.toString(), polys)
        }
        return RapportLage(
            segments = objekt(o["segments"]).map { s ->
                RapportLage.Strecka(idText(s["id"]), punkter(s["line"]), (s["info"] as? List<*>)?.filterIsInstance<String>() ?: emptyList(), str(s, "road"))
            },
            weather = objekt(o["weather"]).mapNotNull { w ->
                val lon = dbl(w, "lon") ?: return@mapNotNull null; val lat = dbl(w, "lat") ?: return@mapNotNull null
                RapportLage.Station(idText(w["id"]), lon, lat, dbl(w, "yta"), w["fukt"] == true, dbl(w, "regn_h"), dbl(w, "lutning30"))
            },
            bridges = objekt(o["bridges"]).mapNotNull { b ->
                val lon = dbl(b, "lon") ?: return@mapNotNull null; val lat = dbl(b, "lat") ?: return@mapNotNull null
                RapportLage.Bro(idText(b["id"]), lon, lat, str(b, "road"), dbl(b, "yta"), b["fukt"] == true)
            },
            smhi = smhi,
        )
    }

    fun lasKameror(o: Map<*, *>): List<RapportKamera> = objekt(o["cameras"]).mapNotNull { c ->
        val lon = dbl(c, "lon") ?: return@mapNotNull null; val lat = dbl(c, "lat") ?: return@mapNotNull null
        RapportKamera(idText(c["id"]), lon, lat, str(c, "road"))
    }

    // ── Texterna ────────────────────────────────────────────────────────────────────────────────────────────────────────────

    private val STHLM = ZoneId.of("Europe/Stockholm")
    private val SV = Locale("sv", "SE")
    private val KLOCKA = DateTimeFormatter.ofPattern("HH:mm", SV).withZone(STHLM)
    private val DATUM = DateTimeFormatter.ofPattern("d MMMM", SV).withZone(STHLM)
    private fun tid(iso: String?): Instant? =
        iso?.let { runCatching { Instant.parse(it) }.getOrNull() ?: runCatching { OffsetDateTime.parse(it).toInstant() }.getOrNull() }
    private fun klocka(iso: String?): String? = tid(iso)?.let(KLOCKA::format)
    private fun datum(iso: String?): String? = tid(iso)?.let(DATUM::format)

    /** Den läsbara texten för en post, ur fälten — som rapport-core.ts visning(). */
    fun visning(p: RapportPost): String {
        if (!p.text.isNullOrEmpty()) return p.text
        if (p.slag == RapportSlag.RESTID || (p.slag == RapportSlag.KO && p.id.startsWith("tt:")))
            return if (p.tid != null) "${p.tid} minuter, normalt ${p.normal ?: "–"}" else "restid saknas"
        val slut = if (p.slut == "tv") "tills vidare" else if (!p.slut.isNullOrEmpty()) "till ${datum(p.slut + "T12:00:00Z") ?: "null"}" else ""
        return listOf(p.t ?: "", if ((p.korfalt ?: 0) != 0) "${p.korfalt} körfält avstängda" else "",
            if ((p.grans ?: 0) != 0) "${p.grans} km/h förbi vägarbetet" else "", slut,
            if (p.slag == RapportSlag.OLYCKA || p.slag == RapportSlag.HINDER || p.slag == RapportSlag.KO) "rapporterad ${klocka(p.start) ?: "–"}" else "",
        ).filter { it.isNotEmpty() }.joinToString(" · ")
    }

    private val E_VAG = Regex("^e\\s*(\\d+)$", RegexOption.IGNORE_CASE)
    private val N_VAG = Regex("^(?:väg|rv|riksväg|länsväg)?\\s*(\\d+)$", RegexOption.IGNORE_CASE)

    /** Vägnamnen skrivna lika: E-vägar som "E22", övriga som "väg 17". Inget namn blir null. */
    fun vagNamn(v: String?): String? {
        val s = (v ?: "").trim()
        if (s.isEmpty()) return null
        E_VAG.find(s)?.let { return "E${it.groupValues[1]}" }
        N_VAG.find(s)?.let { return "väg ${it.groupValues[1]}" }
        return s.take(20)
    }

    private fun grader(v: Double?): String {
        if (v == null) return "–"
        val tecken = if (v > 0) "+" else if (v < 0) "−" else ""
        return "$tecken${String.format(Locale.ROOT, "%.1f", abs(v)).replace('.', ',')} °C"
    }

    // ── Geometrin ───────────────────────────────────────────────────────────────────────────────────────────────────────────

    private fun iRing(x: Double, y: Double, ring: List<DoubleArray>): Boolean {
        var inne = false
        var j = ring.size - 1
        for (i in ring.indices) {
            val xi = ring[i][0]; val yi = ring[i][1]; val xj = ring[j][0]; val yj = ring[j][1]
            if ((yi > y) != (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inne = !inne
            j = i
        }
        return inne
    }

    private fun polygonTraffar(polys: List<List<List<DoubleArray>>>, rutt: List<DoubleArray>): Boolean {
        for (i in 0 until rutt.size - 1) {
            val ax = rutt[i][0]; val ay = rutt[i][1]; val bx = rutt[i + 1][0]; val by = rutt[i + 1][1]
            val n = maxOf(1, ceil(hypot(bx - ax, by - ay) / 0.02).toInt())
            for (k in 0..n) {
                val x = ax + (bx - ax) * k / n; val y = ay + (by - ay) * k / n
                if (polys.any { poly -> poly.isNotEmpty() && iRing(x, y, poly[0]) && poly.drop(1).none { iRing(x, y, it) } }) return true
            }
        }
        return false
    }

    /** Rutnätet längs resan (rapport-core.ts rutnat): för en kandidat det första och sista sträckindexet som når dess rutor, eller null. */
    private fun rutnat(rutt: List<DoubleArray>, marginM: Double): (List<Hazard>) -> Pair<Int, Int>? {
        val rutor = HashMap<String, MutableList<Int>>()
        val nord = rutt.maxOfOrNull { abs(it[1]) } ?: 0.0
        val dy = marginM / 110_000; val dx = marginM / (111_320 * cos(nord * Math.PI / 180))
        fun cell(v: Double) = floor(v / RUTA_GRAD).toInt()
        for (i in 0 until rutt.size - 1) {
            val ax = rutt[i][0]; val ay = rutt[i][1]; val bx = rutt[i + 1][0]; val by = rutt[i + 1][1]
            for (cx in cell(minOf(ax, bx) - dx)..cell(maxOf(ax, bx) + dx))
                for (cy in cell(minOf(ay, by) - dy)..cell(maxOf(ay, by) + dy)) rutor.getOrPut("$cx,$cy") { mutableListOf() }.add(i)
        }
        return { geo ->
            var i0 = Int.MAX_VALUE; var i1 = Int.MIN_VALUE
            for (h in geo) {
                val ps: List<DoubleArray> = when (h) {
                    is SegmentHazard -> h.line
                    is PointHazard -> listOf(doubleArrayOf(h.lon, h.lat))
                    else -> emptyList()
                }
                if (ps.isEmpty()) continue
                val x0 = ps.minOf { it[0] }; val x1 = ps.maxOf { it[0] }; val y0 = ps.minOf { it[1] }; val y1 = ps.maxOf { it[1] }
                for (cx in cell(x0)..cell(x1)) for (cy in cell(y0)..cell(y1))
                    rutor["$cx,$cy"]?.forEach { s -> if (s < i0) i0 = s; if (s > i1) i1 = s }
            }
            if (i0 == Int.MAX_VALUE) null else i0 to i1
        }
    }

    private fun provpunkter(line: List<DoubleArray>, start: Int, id: (Int) -> String): List<Hazard> =
        Geo.samplePolyline(line, LANGS_STEG_M).mapIndexed { i, q -> PointHazard(id(start + i), HazardKind.ACCIDENT, q[0], q[1]) }

    /** Ligger linjen längs resan och inte bara tvärs över den? */
    private fun langsVagen(geo: List<Hazard>, rutt: List<DoubleArray>, marginalM: Double): Boolean {
        val prov = mutableListOf<Hazard>()
        for (h in geo) if (h is SegmentHazard) prov += provpunkter(h.line, prov.size) { "s$it" }
        if (prov.isEmpty()) return true
        val inom = RouteFilter.alongRoute(prov, rutt, marginalM).size.toDouble()
        return inom / prov.size >= LANGS_ANDEL || inom * LANGS_STEG_M >= LANGS_MINST_M
    }

    // ── Rapporten ───────────────────────────────────────────────────────────────────────────────────────────────────────────

    private class Kandidat(val id: String, val slag: RapportSlag, val rubrik: String, val text: String, val geo: List<Hazard>,
                           val vag: String?, val start: String?, val post: RapportPost?)

    private val radOrdning = compareBy<RapportRad>({ ORDNING.indexOf(it.slag) }, { it.langsM }).thenBy { it.id }
    private val gruppOrdning = compareBy<RapportGrupp>({ ORDNING.indexOf(it.slag) }, { it.langsM }).thenBy { it.id }

    /** Det fliken visar för resan: rader i viktordning, inom slagets ordning i körordning (rapport-core.ts favoritRapport). */
    fun favoritRapport(rutt: List<DoubleArray>, lage: RapportLage, kameror: List<RapportKamera>, snabb: Rapportfil,
                       linjer: Map<String, List<List<DoubleArray>>>, marginal: Map<RapportSlag, Double> = MARGINALER): List<RapportRad> {
        fun pkt(id: String, lon: Double, lat: Double): List<Hazard> = listOf(PointHazard(id, HazardKind.ACCIDENT, lon, lat))
        fun lin(id: String, delar: List<List<DoubleArray>>): List<Hazard> =
            delar.filter { it.size >= 2 }.mapIndexed { i, line -> SegmentHazard("$id#$i", line) }
        val st = snabb.stationer
        val kand = mutableListOf<Kandidat>()
        for (s in lage.segments) {
            val v = vagNamn(s.road)
            kand += Kandidat("seg:${s.id}", RapportSlag.HALKA, "Halt väglag${v?.let { " på $it" } ?: ""}",
                if (s.info.isEmpty()) "halka rapporterad på sträckan" else s.info.joinToString(", "), lin("seg:${s.id}", listOf(s.line)), v, null, null)
        }
        for (w in lage.weather) {
            val t = w.yta
            val frys = t != null && t <= 1 && w.fukt
            val beta = !frys && t != null && w.regnH != null && w.lutning30 != null && t >= cfg.efterhalkaYtaMinC && t <= cfg.efterhalkaYtaMaxC &&
                w.lutning30 >= cfg.efterhalkaFall30C && w.regnH <= cfg.efterhalkaRegnH
            if (!frys && !beta) continue
            val namn = st[w.id]?.namn
            kand += Kandidat("wx:${w.id}", RapportSlag.FRYSRISK, "Frysrisk vid stationen${namn?.let { " i $it" } ?: ""}${if (beta) " (beta)" else ""}",
                "Vägytan ${grader(t)}, luften ${grader(st[w.id]?.luft)}${if (w.fukt) ", fukt på vägbanan" else ""}${if (beta) ", efter regnet" else ""}",
                pkt("wx:${w.id}", w.lon, w.lat), null, null, null)
        }
        for (b in lage.bridges) if (b.yta != null && b.yta <= 3 && b.fukt)
            kand += Kandidat("bro:${b.id}", RapportSlag.FRYSRISK, "Frysrisk på bron${vagNamn(b.road)?.let { " på $it" } ?: ""}",
                "närmaste station ${grader(b.yta)}", pkt("bro:${b.id}", b.lon, b.lat), b.road, null, null)
        for (c in kameror) kand += Kandidat("cam:${c.id}", RapportSlag.KAMERA, "Fartkamera", vagNamn(c.road) ?: "",
            pkt("cam:${c.id}", c.lon, c.lat), vagNamn(c.road), null, null)
        for (p in snabb.poster) {
            val geo = if (p.l != null) lin(p.id, linjer[p.l] ?: emptyList()) else if (p.p != null) pkt(p.id, p.p[0], p.p[1]) else emptyList()
            if (geo.isNotEmpty()) kand += Kandidat(p.id, p.slag, p.rubrik, "", geo, p.vag, p.start, p)
        }
        val skar = rutnat(rutt, (marginal.values.maxOrNull() ?: 0.0) + 200)
        val kum = DoubleArray(rutt.size)
        for (i in 1 until rutt.size) kum[i] = kum[i - 1] + Geo.haversineM(rutt[i - 1][0], rutt[i - 1][1], rutt[i][0], rutt[i][1])
        val rader = mutableListOf<RapportRad>()
        for (k in kand) {
            val nara = skar(k.geo) ?: continue
            val bit = rutt.subList(nara.first, minOf(nara.second + 2, rutt.size)); val fore = kum[nara.first]
            val m = marginal[k.slag] ?: 0.0
            val t = RouteFilter.alongRoute(k.geo, bit, m).minByOrNull { it.distanceM } ?: continue
            if (k.geo[0] is SegmentHazard && !langsVagen(k.geo, bit, m)) continue
            rader += RapportRad(k.id, k.slag, k.rubrik, k.post?.let { visning(it) } ?: k.text, Math.round(t.distanceM).toInt(),
                Math.round(fore + t.alongM).toInt(), k.vag, k.start)
        }
        for (w in lage.smhi) if (polygonTraffar(w.polygoner, rutt))
            rader += RapportRad("smhi:${w.id}:${w.event ?: "undefined"}", RapportSlag.SMHI, "SMHI: ${w.event ?: "varning"}",
                "nivå ${w.niva ?: "–"}", 0, 0, null, null)
        return rader.sortedWith(radOrdning)
    }

    /** Hem: samma väg åt andra hållet. */
    fun vand(rutt: List<DoubleArray>): List<DoubleArray> = rutt.reversed()

    /** Går linjen åt samma håll som resan? 1 samma, −1 motsatt, 0 går inte att avgöra (rapport-app.ts riktning; DECISIONS #637). */
    fun riktning(delar: List<List<DoubleArray>>, rutt: List<DoubleArray>, marginalM: Double): Int {
        var summa = 0.0
        for (del in delar) {
            val prov = provpunkter(del, 0) { "p$it" }
            val langs = RouteFilter.alongRoute(prov, rutt, marginalM).associate { it.hazard.id to it.alongM }
            var fore: Double? = null
            for (i in prov.indices) {
                val l = langs["p$i"] ?: continue
                if (fore != null) summa += l - fore
                fore = l
            }
        }
        return if (summa > 0) 1 else if (summa < 0) -1 else 0
    }

    /** Det appen visar för en sparad resa, eller den vända för Hem, med köer och restider bara åt förarens håll (rapport-app.ts). */
    fun resansRapport(rutt: List<DoubleArray>, hem: Boolean, lage: RapportLage, kameror: List<RapportKamera>, snabb: Rapportfil,
                      linjer: Map<String, List<List<DoubleArray>>>): List<RapportRad> {
        val r = if (hem) vand(rutt) else rutt
        val linjeFor = HashMap<String, List<List<DoubleArray>>>()
        for (p in snabb.poster) p.l?.let { linjeFor[p.id] = linjer[it] ?: emptyList() }
        return favoritRapport(r, lage, kameror, snabb, linjer).filter { rad ->
            !rad.id.startsWith("tt:") || riktning(linjeFor[rad.id] ?: emptyList(), r, MARGINALER[rad.slag] ?: 0.0) != -1
        }
    }

    /** Det som är nytt sedan förra kollen: id som inte fanns då. Första kollen har inget nytt. */
    fun nyttSedan(fore: List<RapportRad>?, nu: List<RapportRad>): List<String> {
        if (fore == null) return emptyList()
        val fanns = fore.map { it.id }.toSet()
        return nu.filter { it.id !in fanns }.map { it.id }
    }

    data class Tomma(val inget: List<RapportSlag>, val koerMatsInte: Boolean)

    /** Det tomma på en rad: slagen utan något, i viktordning; köerna mäts bara där en restidssträcka går längs resan. */
    fun tomma(rader: List<RapportRad>): Tomma {
        val finns = rader.map { it.slag }.toSet()
        return Tomma(ORDNING.filter { it !in finns && it != RapportSlag.RESTID }, rader.none { it.id.startsWith("tt:") })
    }

    private val ENSKILD = setOf(RapportSlag.HALKA, RapportSlag.FRYSRISK, RapportSlag.OLYCKA, RapportSlag.HINDER, RapportSlag.VILT,
        RapportSlag.KO, RapportSlag.FARJA, RapportSlag.SMHI)
    private val ORD = mapOf(RapportSlag.KAMERA to ("fartkamera" to "fartkameror"), RapportSlag.VAGARBETE to ("vägarbete" to "vägarbeten"),
        RapportSlag.HASTIGHET to ("hastighetsbegränsning" to "hastighetsbegränsningar"), RapportSlag.OMLEDNING to ("omledning" to "omledningar"),
        RapportSlag.RESTID to ("restidssträcka" to "restidssträckor"))
    private val TAL = listOf("noll", "en", "två", "tre", "fyra", "fem", "sex", "sju", "åtta", "nio", "tio", "elva", "tolv")
    private fun kmText(m: Int) = "${Math.round(m / 1000.0)} km"

    /** Raderna sammanslagna för skärmen (rapport-core.ts grupperade). */
    fun grupperade(rader: List<RapportRad>): List<RapportGrupp> {
        val ut = mutableListOf<RapportGrupp>()
        val hinkar = LinkedHashMap<String, MutableList<RapportRad>>()
        for (r in rader) {
            if (r.slag in ENSKILD) { ut += RapportGrupp(r.id, r.slag, r.rubrik, r.text, 1, listOf(r.id), r.langsM); continue }
            val nyckel = if (r.slag == RapportSlag.RESTID) "restid" else "${r.slag.wire}|${r.vag ?: ""}"
            hinkar.getOrPut(nyckel) { mutableListOf() }.add(r)
        }
        for ((nyckel, hink) in hinkar) {
            var l: List<RapportRad> = hink
            val slag = l[0].slag; val vag = l[0].vag
            if (!(slag == RapportSlag.KAMERA || slag == RapportSlag.RESTID || l.size >= GRUPP_FRAN)) {
                for (r in l) ut += RapportGrupp(r.id, slag, r.rubrik, r.text, 1, listOf(r.id), r.langsM); continue
            }
            val (en, flera) = ORD.getValue(slag)
            val n = l.size; val tal = if (n < TAL.size) TAL[n] else n.toString()
            val rubrik = "${tal.take(1).uppercase()}${tal.drop(1)} ${if (n == 1) en else flera}${if (slag != RapportSlag.RESTID && !vag.isNullOrEmpty()) " på $vag" else ""}"
            val fran = l.minOf { it.langsM }; val till = l.maxOf { it.langsM }
            val text = when (slag) {
                RapportSlag.KAMERA -> "Rösten säger till före varje kamera."
                RapportSlag.RESTID -> "Normal trafik på sträckorna längs rutten."
                else -> {
                    l = l.sortedBy { it.langsM }
                    "${if (n == 1) "" else "Mellan ${kmText(fran)} och ${kmText(till)} in på rutten. "}Närmast: ${l[0].text.ifEmpty { l[0].rubrik }}"
                }
            }
            ut += RapportGrupp("grupp:$nyckel", slag, rubrik, text, n, l.map { it.id }, fran)
        }
        return ut.sortedWith(gruppOrdning)
    }
}
