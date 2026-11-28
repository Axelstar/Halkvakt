// PLANERA RESA (kort #659, DECISIONS #870, #941) — spegel av iOS PlaneraView och PlaneradResaView (Förslag A, #933), samma ord.
// Föraren söker en adress, Google föreslår platser och räknar ut vägen, och rapporten längs vägen räknas i telefonen. Målet
// heter som kommunen det ligger i, ur Halkvakts egen tabell: Googles namn på platsen får inte stå bredvid en karta.
package se.halkvakt.app.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.border
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import se.halkvakt.app.GuardService
import se.halkvakt.app.AvreseNotis
import se.halkvakt.app.MainActivity
import se.halkvakt.app.Rapporten
import se.halkvakt.app.Resplan
import se.halkvakt.app.Sverigedata
import se.halkvakt.engine.RapportGrupp
import se.halkvakt.engine.RapportSlag
import se.halkvakt.engine.ResansRapport
import se.halkvakt.engine.Resstracka
import se.halkvakt.engine.Resstrackor
import se.halkvakt.engine.StrackLage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.roundToInt

/** Så länge väntar sökningen efter den senaste tangenten: en fråga per paus, inte per bokstav. */
private const val SOKPAUS_MS = 350L
/** Så många tecken innan Google får den första frågan. Varje fråga om förslag räknas och kostar efter gratisdelen (28/11). */
private const val SOK_MINST = 3

/**
 * Sökrutan överst i fliken Resor (DECISIONS #982): fältet, förslagen och felen. `fokusera` ställer markören i fältet, när
 * föraren kommer från Planera resa på startsidan; `klar` öppnar den planerade resan.
 */
@Composable
fun Resesok(activity: MainActivity, fokusera: Boolean, fokuserad: () -> Unit, klar: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var text by rememberSaveable { mutableStateOf("") }
    val forslag by Resplan.forslag.collectAsStateWithLifecycle()
    val lage by Resplan.lage.collectAsStateWithLifecycle()
    val fokus = remember { FocusRequester() }
    LaunchedEffect(fokusera) { if (fokusera) { fokus.requestFocus(); fokuserad() } }
    LaunchedEffect(text) {
        delay(SOKPAUS_MS)
        Resplan.sok(ctx, if (text.trim().length < SOK_MINST) "" else text)
    }
    Column {
        BasicTextField(text, { text = it }, singleLine = true, cursorBrush = SolidColor(Brand.yellow),
            textStyle = TextStyle(color = Brand.text, fontFamily = Typo.sans, fontSize = 17.sp),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            // En kapsel med kant, som på iPhone: den platta grå rutan läste inte som en sökruta (Axel 28/11).
            modifier = Modifier.fillMaxWidth().focusRequester(fokus).background(Brand.panel, RoundedCornerShape(28.dp))
                .border(1.dp, Color(0xFF26323A), RoundedCornerShape(28.dp)).padding(horizontal = 20.dp, vertical = 17.dp),
            decorationBox = { falt ->
                Box { if (text.isEmpty()) Text("Sök adress eller ort", color = Brand.dim, fontFamily = Typo.sans, fontSize = 17.sp); falt() }
            })
        when (val l = lage) {
            Resplan.Lage.Soker -> Text("Räknar ut vägen …", color = Brand.text2, fontFamily = Typo.sans, fontSize = 15.sp,
                modifier = Modifier.padding(top = 20.dp, start = 4.dp))
            is Resplan.Lage.Fel -> Text(l.text, color = Brand.yellow, fontFamily = Typo.sans, fontSize = 14.sp, lineHeight = 21.sp,
                modifier = Modifier.padding(top = 20.dp, start = 4.dp))
            Resplan.Lage.Vilar -> Unit
        }
        if (forslag.isNotEmpty() && lage != Resplan.Lage.Soker) {
            Spacer(Modifier.height(16.dp))
            RowPanel {
                forslag.forEachIndexed { i, f ->
                    Column(Modifier.fillMaxWidth().heightIn(min = 56.dp)
                        .clickable(role = Role.Button) { scope.launch { if (Resplan.planera(ctx, f, activity.lastLoc.value)) { text = ""; klar() } } }
                        .padding(vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        Text(f.titel, color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 16.sp,
                            maxLines = 1, overflow = TextOverflow.Ellipsis)
                        if (f.under.isNotEmpty()) Text(f.under, color = Brand.text2, fontFamily = Typo.sans, fontSize = 13.sp,
                            maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    if (i < forslag.size - 1) DashedDivider()
                }
            }
            // Googles krav: förslagen bär deras namn när de inte står på en karta.
            Text("Google Maps", color = Brand.text2, fontSize = 12.sp, modifier = Modifier.padding(top = 10.dp, start = 4.dp))
        }
    }
}

/** Vad som går till Google när föraren söker: sagt i fliken, där sökrutan står (DECISIONS #941). */
@Composable
fun NarDuSoker() {
    Column(Modifier.padding(top = 24.dp, start = 4.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        MonoLabel("När du söker")
        Text("Det du skriver går till Google, som föreslår platser. När du väljer en plats får Google veta var du är och vart du " +
            "ska, för att räkna ut vägen. Halkvakt får inget av det: läget längs vägen räknas ut i telefonen.",
            color = Brand.text2, fontFamily = Typo.sans, fontSize = 14.sp, lineHeight = 21.sp)
    }
}

@Composable
private fun Tillbaka(text: String, back: () -> Unit) =
    Text(text, color = Brand.text, fontFamily = Typo.mono, fontSize = 11.sp, letterSpacing = 0.14.em,
        modifier = Modifier.heightIn(min = 44.dp).clickable(role = Role.Button, onClick = back).wrapContentHeight())

/** En planerad resa före start: omdömet i en mening, Starta vakten, vägen på kartan, sträckorna i körordning och resten. */
@Composable
fun PlaneradResaSkarm(activity: MainActivity, back: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val plan by Resplan.plan.collectAsStateWithLifecycle()
    var rapport by remember { mutableStateOf<Rapporten.Planerad?>(null) }
    var strackor by remember { mutableStateOf<List<Resstracka>>(emptyList()) }
    var kum by remember { mutableStateOf<List<Double>>(emptyList()) }
    var gickInte by remember { mutableStateOf(false) }
    val hamta: suspend () -> Unit = {
        plan?.let { p ->
            val ny = Rapporten.planerad(ctx, p.punkter)
            if (ny != null) {
                val (k, s) = withContext(Dispatchers.Default) {
                    Resstrackor.kumulativ(p.punkter) to Resstrackor.strackor(p.punkter, ny.rader, Sverigedata.orter(ctx))
                }
                kum = k; strackor = s; rapport = ny
            }
            gickInte = ny == null
        }
    }
    // Vägen är nyckeln, inte resan: en ändrad avresetid ger en ny Plan med samma väg, och läget ska inte hämtas om för den.
    LaunchedEffect(plan?.punkter) { hamta() }
    // Resans två lägen (DECISIONS #983): Åker nu och Åker senare. Senare har avresetiden och påminnelsen.
    var senare by rememberSaveable { mutableStateOf(plan?.avresaMs != null) }
    var avresa by rememberSaveable { mutableStateOf(plan?.avresaMs ?: standardAvresa()) }
    var avresefel by remember { mutableStateOf<String?>(null) }
    val sparaAvresa: (Boolean) -> Unit = { vill ->
        avresefel = null
        AvreseNotis.taBort(ctx)
        if (!Resplan.sattAvresa(ctx, avresa)) avresefel = "Tiden har redan passerat. Välj en senare tid."
        else if (vill) {
            if (!activity.notificationsOk()) { activity.begarNotiser(); avresefel = "Slå på notiser för Halkvakt, så kommer påminnelsen." }
            else if (!AvreseNotis.schemalagg(ctx, avresa)) avresefel = "Påminnelsen kommer en kvart innan. Välj en tid minst en kvart bort."
            else Resplan.sattAvresa(ctx, avresa, paminn = true)
        }
    }

    Column(Modifier.fillMaxSize().background(Brand.bg).verticalScroll(rememberScrollState()).padding(horizontal = 24.dp)
        .padding(top = 8.dp, bottom = 150.dp)) {
        Tillbaka("← RESOR", back)
        val p = plan
        if (p == null) {
            Text("Ingen resa är planerad.", color = Brand.text2, fontFamily = Typo.sans, fontSize = 15.sp, modifier = Modifier.padding(top = 28.dp))
            return@Column
        }
        Text("Till ${p.mal}", color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.SemiBold, fontSize = 32.sp,
            letterSpacing = (-0.025).em, modifier = Modifier.padding(top = 8.dp))
        Row(Modifier.fillMaxWidth().padding(top = 14.dp), verticalAlignment = Alignment.CenterVertically) {
            MonoLabel(matt(p), size = 11.sp)
            Spacer(Modifier.weight(1f))
            MonoLink("Kolla igen") { scope.launch { hamta() } }
        }
        Lagesval(senare, Modifier.padding(top = 16.dp)) { ny ->
            senare = ny
            if (ny) sparaAvresa(false) else { avresefel = null; AvreseNotis.taBort(ctx); Resplan.sattAvresa(ctx, null) }
        }
        val r = rapport
        val oroligt = strackor.any { it.lage != StrackLage.LUGNT }
        if (senare) {
            Column(Modifier.fillMaxWidth().padding(top = 16.dp).background(Brand.panel, RoundedCornerShape(18.dp)).padding(horizontal = 20.dp)) {
                Row(Modifier.fillMaxWidth().heightIn(min = 64.dp), verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Jag åker", color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 16.sp,
                        modifier = Modifier.weight(1f))
                    val tid = java.time.Instant.ofEpochMilli(avresa).atZone(java.time.ZoneId.systemDefault())
                    Tidval(DATUM.format(tid), "Väljer dag") {
                        android.app.DatePickerDialog(ctx, { _, ar, manad, dag ->
                            avresa = tid.withYear(ar).withMonth(manad + 1).withDayOfMonth(dag).toInstant().toEpochMilli()
                            sparaAvresa(plan?.paminn == true)
                        }, tid.year, tid.monthValue - 1, tid.dayOfMonth).apply { datePicker.minDate = System.currentTimeMillis() }.show()
                    }
                    Tidval(KLOCKA.format(tid), "Väljer klockslag") {
                        android.app.TimePickerDialog(ctx, { _, timme, minut ->
                            avresa = tid.withHour(timme).withMinute(minut).withSecond(0).toInstant().toEpochMilli()
                            sparaAvresa(plan?.paminn == true)
                        }, tid.hour, tid.minute, true).show()
                    }
                }
                DashedDivider()
                GreenToggleRow("Påminn mig en kvart innan", "En notis som öppnar resan", plan?.paminn == true) { on -> sparaAvresa(on) }
            }
            avresefel?.let {
                Text(it, color = Brand.yellow, fontFamily = Typo.sans, fontSize = 14.sp, lineHeight = 21.sp,
                    modifier = Modifier.padding(top = 12.dp, start = 4.dp))
            }
        }
        if (r != null) Dom(r, strackor, oroligt)
        else Text(if (gickInte) "Läget kunde inte hämtas. Tryck på Kolla igen." else "Kollar läget …", color = Brand.text2,
            fontFamily = Typo.sans, fontSize = 15.sp, modifier = Modifier.padding(top = 28.dp))
        if (senare) {
            Text("Det här är läget nu. Halkvakt hämtar det färskt när du öppnar påminnelsen eller appen.", color = Brand.text2,
                fontFamily = Typo.sans, fontSize = 14.sp, lineHeight = 21.sp, modifier = Modifier.padding(top = 14.dp, start = 4.dp))
        } else Nuknappar(activity, p, r)

        if (r != null) {
            // Vägen och sträckorna visas när något längs vägen är halt eller har frysrisk. En lugn resa behöver dem inte.
            if (oroligt) {
                MonoLabel("Längs vägen, i den ordning du kör", size = 11.sp, modifier = Modifier.padding(top = 28.dp, bottom = 10.dp, start = 4.dp))
                Column(Modifier.fillMaxWidth().background(Brand.panel, RoundedCornerShape(18.dp)).padding(20.dp)) {
                    val marken = { slag: RapportSlag ->
                        r.rader.filter { it.slag == slag }.mapNotNull { Resstrackor.punkt(p.punkter, kum, it.langsM.toDouble()) }
                    }
                    Resekarta(p.punkter, marken(RapportSlag.HALKA), marken(RapportSlag.FRYSRISK),
                        "Karta med vägen till ${p.mal}. ${Resstrackor.dom(strackor)}")
                    Kartforklaring(Modifier.padding(top = 12.dp, bottom = 6.dp))
                    MonoLabel("Kartan kommer från Google", Brand.faint, modifier = Modifier.padding(bottom = 14.dp))
                    // Klocktiderna räknas från avresan i Åker senare, annars från nu.
                    ResansStrackor(strackor, p.mal, (kum.lastOrNull() ?: 0.0).roundToInt(), p.restidS,
                        if (senare) maxOf(avresa, System.currentTimeMillis()) else r.kollat)
                }
            }
            Ovrigt(r, !oroligt)
        }
        Column(Modifier.fillMaxWidth().padding(top = 24.dp), horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp)) {
            MonoLabel(p.avresaMs?.let { "Avresa ${dagOchKlockslag(it)}" } ?: "Resan sparas inte")
            MonoLabel("Vägen kommer från Google", Brand.faint)
            MonoLink("Ta bort resan") { AvreseNotis.taBort(ctx); Resplan.rensa(ctx); back() }
        }
    }
}

/** Åker nu (DECISIONS #983): Starta vakten, tipset om en annan väg och länken till kartappen. */
@Composable
private fun Nuknappar(activity: MainActivity, p: Resplan.Plan, r: Rapporten.Planerad?) {
    val ctx = LocalContext.current
    Column {
        Box(Modifier.fillMaxWidth().padding(top = 24.dp), contentAlignment = Alignment.Center) {
            YellowPill("Starta vakten", play = true) { activity.onToggle() }
        }
        r?.rader?.firstOrNull { it.slag in TIPS_SLAG }?.let {
            Text("${it.rubrik} längs vägen. Se om det finns en annan väg i din kartapp.", color = Brand.yellow, fontFamily = Typo.sans,
                fontWeight = FontWeight.Medium, fontSize = 14.sp, lineHeight = 21.sp, textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp))
        }
        Box(Modifier.fillMaxWidth().padding(top = 4.dp), contentAlignment = Alignment.Center) {
            MonoLink("Öppna i Google Maps") {
                val mal = p.punkter.last()
                val startar = activity.platsLage() != MainActivity.Plats.INGEN && !GuardService.runningFlow.value
                runCatching {
                    ctx.startActivity(Intent(Intent.ACTION_VIEW,
                        Uri.parse("https://www.google.com/maps/dir/?api=1&destination=${mal[1]},${mal[0]}&travelmode=driving")))
                }
                if (startar) activity.onToggle()
            }
        }
        if (activity.platsLage() != MainActivity.Plats.INGEN) {
            Text("Vakten startar när du öppnar kartappen.", color = Brand.dim, fontFamily = Typo.sans, fontSize = 13.sp,
                textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
        }
    }
}

/** Åker nu eller Åker senare: två halvor i en kapsel, den valda ljus. */
@Composable
private fun Lagesval(senare: Boolean, modifier: Modifier = Modifier, valj: (Boolean) -> Unit) {
    Row(modifier.fillMaxWidth().background(Brand.panel, RoundedCornerShape(28.dp)).border(1.dp, Color(0xFF26323A), RoundedCornerShape(28.dp))
        .padding(4.dp)) {
        listOf("Åker nu" to false, "Åker senare" to true).forEach { (titel, varde) ->
            val vald = senare == varde
            Box(Modifier.weight(1f).heightIn(min = 48.dp).background(if (vald) Brand.text else Color.Transparent, RoundedCornerShape(24.dp))
                .clickable(role = Role.Tab) { if (!vald) valj(varde) }, contentAlignment = Alignment.Center) {
                Text(titel, color = if (vald) Brand.bg else Brand.text2, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 15.sp)
            }
        }
    }
}

/** Dagen eller klockslaget i Jag åker: en liten kapsel som öppnar Androids väljare. */
@Composable
private fun Tidval(text: String, vad: String, valj: () -> Unit) {
    Box(Modifier.heightIn(min = 44.dp).background(Color(0xFF1A2327), RoundedCornerShape(22.dp))
        .clickable(role = Role.Button, onClickLabel = vad, onClick = valj).padding(horizontal = 14.dp), contentAlignment = Alignment.Center) {
        Text(text, color = Brand.text, fontFamily = Typo.sans, fontSize = 15.sp)
    }
}

private val SVENSKA = java.util.Locale("sv", "SE")
private val DATUM = java.time.format.DateTimeFormatter.ofPattern("d MMM yyyy", SVENSKA)
private val KLOCKA = java.time.format.DateTimeFormatter.ofPattern("HH:mm", SVENSKA)
private val DAG_OCH_KLOCKA = java.time.format.DateTimeFormatter.ofPattern("d MMM HH:mm", SVENSKA)

/** "28 nov. 10:42" */
internal fun dagOchKlockslag(ms: Long): String =
    DAG_OCH_KLOCKA.format(java.time.Instant.ofEpochMilli(ms).atZone(java.time.ZoneId.systemDefault()))

/** Förvald avresa: en timme bort, på hela fem minuter. */
private fun standardAvresa(nu: Long = System.currentTimeMillis()): Long = (nu + 3_600_000L) / 300_000L * 300_000L

/** Kortet överst: omdömet i en mening och när läget kollades. Ur en gammal lägesfil får kortet inte säga att det är lugnt. */
@Composable
private fun Dom(r: Rapporten.Planerad, strackor: List<Resstracka>, oroligt: Boolean) {
    Column(Modifier.fillMaxWidth().padding(top = 24.dp).background(Brand.panel, RoundedCornerShape(18.dp)).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.size(7.dp).background(if (oroligt || r.gammaltVaglag) Brand.yellow else Brand.faint, RoundedCornerShape(50)))
            MonoLabel("Just nu", Brand.text, 11.sp)
            Spacer(Modifier.weight(1f))
            MonoLabel("Kollat ${klockslag(r.kollat)}", size = 11.sp)
        }
        Text(if (r.gammaltVaglag) "Väglaget är för gammalt." else Resstrackor.dom(strackor), color = Brand.text, fontFamily = Typo.sans,
            fontWeight = FontWeight.SemiBold, fontSize = 26.sp, lineHeight = 32.sp, letterSpacing = (-0.02).em)
        if (r.gammaltVaglag) Text("Väglaget är äldre än 45 minuter och visas inte som läget just nu. Tryck på Kolla igen.",
            color = Brand.text2, fontFamily = Typo.sans, fontSize = 15.sp, lineHeight = 22.sp)
        if (r.gamlaOlyckor) Text("Olyckorna är äldre än två timmar och visas inte som läget just nu.", color = Brand.yellow,
            fontFamily = Typo.sans, fontSize = 14.sp)
    }
}

/** Sträckorna i den ordning föraren kör, en per större ort. Ett tryck öppnar sträckan. Alla börjar stängda (DECISIONS #931). */
@Composable
private fun ResansStrackor(strackor: List<Resstracka>, mal: String, totalM: Int, restidS: Double?, avresaMs: Long) {
    var oppen by remember(strackor) { mutableStateOf<Int?>(null) }
    val marke = { m: Int ->
        val km = "${(m / 1000.0).roundToInt()} km"
        Resstrackor.tidVid(m, totalM, restidS, avresaMs)?.let { "$km · ca ${klockslag(it)}" } ?: km
    }
    Column {
        strackor.forEachIndexed { i, s ->
            PlatsRad(s.fran ?: "Start", marke(s.franM), false)
            Row(Modifier.height(IntrinsicSize.Min)) {
                Box(Modifier.width(20.dp).fillMaxHeight().padding(vertical = 2.dp), contentAlignment = Alignment.Center) {
                    Box(Modifier.width(4.dp).fillMaxHeight().background(Brand.dim, RoundedCornerShape(2.dp)))
                }
                Column(Modifier.weight(1f).padding(start = 12.dp, top = 4.dp, bottom = 8.dp)) {
                    Column(Modifier.fillMaxWidth().heightIn(min = 52.dp)
                        .clickable(role = Role.Button, onClickLabel = if (oppen == i) "Döljer det som finns på sträckan" else "Visar det som finns på sträckan") {
                            oppen = if (oppen == i) null else i
                        }, verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterVertically)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(Resstrackor.rubrik(s), color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 16.sp,
                                modifier = Modifier.weight(1f))
                            Text("${Resstrackor.tagg(s)} ${if (oppen == i) "−" else "+"}", fontFamily = Typo.mono, fontWeight = FontWeight.SemiBold,
                                fontSize = 11.sp, letterSpacing = 0.14.em,
                                color = when (s.lage) { StrackLage.HALT -> Brand.yellow; StrackLage.FRYSRISK -> Brand.text; else -> Brand.dim })
                        }
                        Text(Resstrackor.under(s), color = Brand.text2, fontFamily = Typo.sans, fontSize = 13.sp, lineHeight = 19.sp)
                    }
                    if (oppen == i) Detaljer(s)
                }
            }
        }
        PlatsRad(mal, marke(totalM), true)
    }
}

/** Raden för en plats: ringen, namnet och hur långt in på resan den ligger, med klocktiden när restiden är känd. */
@Composable
private fun PlatsRad(namn: String, marke: String, fylld: Boolean) {
    Row(Modifier.fillMaxWidth().heightIn(min = 28.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.width(20.dp), contentAlignment = Alignment.Center) {
            Box(Modifier.size(10.dp).background(Brand.text, RoundedCornerShape(50)).padding(2.dp)
                .background(if (fylld) Brand.text else Brand.panel, RoundedCornerShape(50)))
        }
        Text(namn, color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 15.sp, maxLines = 1,
            overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f).padding(start = 12.dp, end = 8.dp))
        MonoLabel(marke, size = 11.sp)
    }
}

private val ETIKETT = mapOf(RapportSlag.HALKA to "Halka", RapportSlag.FRYSRISK to "Frysrisk", RapportSlag.OLYCKA to "Olycka",
    RapportSlag.HINDER to "Hinder", RapportSlag.VILT to "Vilt", RapportSlag.KO to "Kö", RapportSlag.RESTID to "Restid",
    RapportSlag.VAGARBETE to "Vägarbete", RapportSlag.HASTIGHET to "Hastighet", RapportSlag.OMLEDNING to "Omledning",
    RapportSlag.FARJA to "Färja", RapportSlag.KAMERA to "Kameror", RapportSlag.SMHI to "SMHI")

@Composable
private fun Detaljer(s: Resstracka) {
    val perId = s.rader.associateBy { it.id }
    Column(Modifier.padding(bottom = 6.dp)) {
        ResansRapport.grupperade(s.rader).sortedBy { it.langsM }.forEach { g ->
            DashedDivider()
            Row(Modifier.fillMaxWidth().padding(vertical = 11.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MonoLabel(ETIKETT[g.slag] ?: g.slag.wire, modifier = Modifier.width(82.dp))
                Text(varde(g, perId[g.id]?.vag), color = Brand.text, fontFamily = Typo.sans, fontSize = 13.sp, lineHeight = 19.sp,
                    modifier = Modifier.weight(1f))
            }
        }
    }
}

/** Rapportens rubrik och text på en rad: "Halt väglag på E4: fläckvis is". Halkans ord skrivs som vanlig svenska. */
internal fun varde(g: RapportGrupp, vag: String?): String {
    val ensam = g.antal == 1 && !g.id.startsWith("grupp:")
    val rubrik = if (ensam) ResansRapport.titel(g.rubrik, vag) else g.rubrik
    val text = if (g.slag == RapportSlag.HALKA && ensam) Resstrackor.rentVaglag(g.text) else g.text
    val forsta = text.firstOrNull() ?: return rubrik
    return if (forsta.isLowerCase() || forsta.isDigit()) "$rubrik: $text" else "$rubrik. $text"
}

/** En rad per sort under Övrigt på vägen, inte en per händelse (DECISIONS #933). Olyckorna står överst. */
private val SORTER = listOf("Olyckor" to setOf(RapportSlag.OLYCKA),
    "Vägarbeten" to setOf(RapportSlag.VAGARBETE, RapportSlag.HASTIGHET, RapportSlag.OMLEDNING), "Fartkameror" to setOf(RapportSlag.KAMERA),
    "Hinder" to setOf(RapportSlag.HINDER, RapportSlag.VILT), "Trafik" to setOf(RapportSlag.KO, RapportSlag.FARJA))

/** Det som kan göra en annan väg värd att se efter: olycka, hinder, halka, kö och omledning. */
private val TIPS_SLAG = setOf(RapportSlag.OLYCKA, RapportSlag.HINDER, RapportSlag.HALKA, RapportSlag.KO, RapportSlag.OMLEDNING)

/** Det som inte är väglag, SMHI:s varningar, raden om det tomma och rutan Halkvakt tror (DECISIONS #739). */
@Composable
private fun Ovrigt(r: Rapporten.Planerad, lugn: Boolean) {
    val rader = r.rader.filter { it.slag != RapportSlag.HALKA && it.slag != RapportSlag.FRYSRISK }
    val perId = rader.associateBy { it.id }
    val grupper = ResansRapport.grupperade(rader)
    MonoLabel(if (lugn) "Längs vägen" else "Övrigt på vägen", size = 11.sp, modifier = Modifier.padding(top = 28.dp, bottom = 10.dp, start = 4.dp))
    if (grupper.isEmpty()) {
        Text("Inget mer rapporterat längs vägen just nu.", color = Brand.text2, fontFamily = Typo.sans, fontSize = 15.sp,
            modifier = Modifier.padding(start = 4.dp))
    } else if (!lugn) {
        // Med sträckorna ovanför står varje rad redan under sin sträcka (DECISIONS #932). Här står hur många det är av varje slag.
        val sorter = SORTER.map { (namn, slag) -> namn to rader.count { it.slag in slag } }.filter { it.second > 0 }
        val smhi = grupper.filter { it.slag == RapportSlag.SMHI }
        RowPanel {
            sorter.forEachIndexed { i, (namn, antal) -> ReceiptRow(namn, "$antal", divider = i < sorter.size - 1 || smhi.isNotEmpty()) }
            smhi.forEachIndexed { i, g -> OvrigRad(g.rubrik, g.text, i < smhi.size - 1) }
        }
        if (sorter.isNotEmpty()) Text("Öppna en sträcka för att se vad det är.", color = Brand.dim, fontFamily = Typo.sans, fontSize = 14.sp,
            lineHeight = 21.sp, modifier = Modifier.padding(top = 14.dp, start = 4.dp))
    } else {
        RowPanel {
            grupper.forEachIndexed { i, g ->
                val ensam = g.antal == 1 && !g.id.startsWith("grupp:")
                OvrigRad(if (ensam) ResansRapport.titel(g.rubrik, perId[g.id]?.vag) else g.rubrik, g.text, i < grupper.size - 1)
            }
        }
    }
    ResansRapport.tomtRad(r.rader, r.gammaltVaglag, r.gamlaOlyckor)?.let {
        Text(it, color = Brand.dim, fontFamily = Typo.sans, fontSize = 14.sp, lineHeight = 21.sp, modifier = Modifier.padding(top = 14.dp, start = 4.dp))
    }
    MonoLabel("Halkvakt tror · beta", modifier = Modifier.padding(top = 24.dp, bottom = 10.dp, start = 4.dp))
    val tomt = ResansRapport.kandidatTomt(r.kandidat, r.gammaltVaglag)
    val kandidat = r.kandidat
    if (tomt != null || kandidat == null) {
        Text(tomt ?: ResansRapport.KANDIDAT_AV, color = Brand.text2, fontFamily = Typo.sans, fontSize = 14.sp, lineHeight = 21.sp,
            modifier = Modifier.padding(start = 4.dp))
    } else {
        RowPanel { kandidat.forEachIndexed { i, k -> OvrigRad(k.rubrik, k.text, i < kandidat.size - 1, oppenFranStart = true) } }
        Text(ResansRapport.KANDIDAT_FOT, color = Brand.dim, fontFamily = Typo.sans, fontSize = 14.sp, lineHeight = 21.sp,
            modifier = Modifier.padding(top = 14.dp, start = 4.dp))
    }
}

/** Rubriken, och texten först när föraren öppnar raden (DECISIONS #931). En rad utan text går inte att öppna. */
@Composable
private fun OvrigRad(titel: String, text: String, divider: Boolean, oppenFranStart: Boolean = false) {
    var oppen by remember(titel, text) { mutableStateOf(oppenFranStart) }
    Column {
        Column(Modifier.fillMaxWidth().heightIn(min = 44.dp)
            .clickable(enabled = text.isNotEmpty() && !oppenFranStart, role = Role.Button) { oppen = !oppen }.padding(vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterVertically)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(titel, color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 16.sp, modifier = Modifier.weight(1f))
                if (text.isNotEmpty() && !oppenFranStart) Text(if (oppen) "−" else "+", color = Brand.dim, fontFamily = Typo.mono,
                    fontWeight = FontWeight.SemiBold, fontSize = 11.sp)
            }
            if (oppen && text.isNotEmpty()) Text(text, color = Brand.text2, fontFamily = Typo.sans, fontSize = 14.sp, lineHeight = 21.sp)
        }
        if (divider) DashedDivider()
    }
}

/** "614 km · ca 6 tim", eller bara längden för en resa utan restid. */
internal fun matt(p: Resplan.Plan): String {
    val km = if (p.km < 10) "%.1f km".format(p.km).replace('.', ',') else "${p.km.roundToInt()} km"
    val s = p.restidS?.takeIf { it > 0 } ?: return km
    val m = (s / 300).roundToInt() * 5
    val tid = if (m < 90) "${maxOf(m, 5)} min" else if (m % 60 < 15 || m % 60 > 45) "${(m / 60.0).roundToInt()} tim" else "${m / 60} tim ${m % 60} min"
    return "$km · ca $tid"
}
