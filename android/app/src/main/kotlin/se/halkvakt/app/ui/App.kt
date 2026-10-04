// Halkvakts UI — appens rot, flikraden och betatestets kort. Skärmarna (designöverlämningen v2, DECISIONS #444)
// bor i Skinn.kt, varningskortet i WarningCardScreen.kt. Gult bara för det som gör något och för varningen; grönt = på.
// Skill-regler: en lägsta ansvarig ägare per state (DataStore/tjänstens StateFlows),
// composables konsumerar; trappan bor orörd i MainActivity.
package se.halkvakt.app.ui

import android.graphics.Typeface
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.delay
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import se.halkvakt.app.AlertEntry
import se.halkvakt.app.AppEvents
import se.halkvakt.app.Facit
import se.halkvakt.app.FacitSender
import se.halkvakt.app.GuardService
import se.halkvakt.app.MainActivity
import se.halkvakt.app.MissEntry
import se.halkvakt.app.Missar
import se.halkvakt.app.Nearby
import se.halkvakt.app.NearbyItem
import se.halkvakt.app.Prefs
import se.halkvakt.app.R
import se.halkvakt.app.Resan
import se.halkvakt.engine.HazardKind

// Skinnet v3 (DECISIONS #47): tokens bor i Theme.kt och speglar iOS Theme.swift exakt.
// De gamla namnen står kvar som alias så vyerna nedan inte behöver röras i samma varv.
private val Gul = Brand.yellow
private val Natt = Brand.bg
private val Text = Brand.text
private val Dis = Brand.dim
private val Yta = Brand.panel
private val Kant = Brand.stroke
private val Gron = Brand.green
private val GronLjus = Brand.greenText
private val Teal = Brand.blue
private val Cond = Typo.mono

private val Scheme = darkColorScheme(
    primary = Gul, onPrimary = Natt, background = Natt, onBackground = Text,
    surface = Yta, onSurface = Text, surfaceVariant = Kant, onSurfaceVariant = Dis,
    secondary = Teal,
)

/** Ikonsetet (designen v2, DECISIONS #444) — sex ikoner, samma former som iOS. Logomärket är INTE en av dem. */
@Composable
fun HazardIcon(k: HazardKind, size: Dp = 24.dp, tint: Color = Brand.yellow) {
    Icon(
        painter = painterResource(when (k) {
            HazardKind.SLIPPERY_SEGMENT -> R.drawable.ikon_halka
            HazardKind.ICING_POINT      -> R.drawable.ikon_frysrisk
            HazardKind.ACCIDENT         -> R.drawable.ikon_olycka
            HazardKind.WILDLIFE         -> R.drawable.ikon_vilt
            HazardKind.CAMERA           -> R.drawable.ikon_kamera
        }),
        contentDescription = rubrik(k),
        tint = tint,
        modifier = Modifier.size(size),
    )
}

@Composable
fun HalkvaktApp(activity: MainActivity) {
    MaterialTheme(colorScheme = Scheme) {
        var tab by rememberSaveable { mutableStateOf(0) }
        val warning by GuardService.currentWarning.collectAsStateWithLifecycle()
        val running by GuardService.runningFlow.collectAsStateWithLifecycle()
        DisposableEffect(running) {
            val w = activity.window
            if (running) w.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            onDispose { w.clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
        }
        Box(Modifier.fillMaxSize().background(Natt)) {
            Box(Modifier.fillMaxSize().statusBarsPadding()) {
                // Ingen flikrad medan vakten kör: körläget täcker allt (designen v2, DECISIONS #444).
                if (running) PaVaktScreen(activity)
                else when (tab) {
                    0 -> RedoScreen(activity) { BetaOverst(activity) }
                    else -> SettingsScreen(activity)
                }
            }
            if (!running) {
                Box(Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(130.dp).background(TabFade))
                Box(Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(bottom = 8.dp)) {
                    FloatingTabBar(tab) { tab = it }
                }
            }
            // Kort ersätter kort (designen 04): det nya glider upp och täcker, det gamla krymper och tonar bort.
            // Nyckeln är ShownWarning-instansen, så en ny varning ger ett nytt kort och en ny 8-sekundersstapel.
            AnimatedContent(
                targetState = warning,
                transitionSpec = {
                    (slideInVertically(tween(380, easing = CubicBezierEasing(.2f, .8f, .2f, 1f))) { it }) togetherWith
                        (scaleOut(tween(380), targetScale = .92f) + fadeOut(tween(380)))
                },
                label = "varningskort",
            ) { w -> if (w != null) WarningCardScreen(w.card) }
        }
    }
}

/**
 * Betatestets del av Redo (kort #203, DECISIONS #267) — designen v2 visar den inte, men den står kvar för
 * betatestarna: frågan efter resan överst, och annars facitknapparna under senast sagda varningen.
 */
@Composable
private fun BetaOverst(activity: MainActivity) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val facitOn by Prefs.facitEnabled(ctx).collectAsStateWithLifecycle(initialValue = false)
    if (!facitOn) return
    val historik by Prefs.history(ctx).collectAsStateWithLifecycle(initialValue = emptyList())
    val facit by Prefs.facit(ctx).collectAsStateWithLifecycle(initialValue = emptyList())
    val facitStatus by Prefs.facitStatus(ctx).collectAsStateWithLifecycle(initialValue = null)
    val facitStatusAt by Prefs.facitStatusAt(ctx).collectAsStateWithLifecycle(initialValue = 0L)
    val resanStart by Prefs.tripStart(ctx).collectAsStateWithLifecycle(initialValue = 0L)
    val missar by Prefs.missar(ctx).collectAsStateWithLifecycle(initialValue = emptyList())
    val resansVarningar = remember(historik, resanStart) { historik.filter { it.t >= resanStart && it.id.isNotEmpty() } }
    val obesvarade = remember(historik, facit, resanStart) { Resan.obesvarade(historik, facit, resanStart) }
    val resansMissar = remember(missar, resanStart) { missar.filter { it.t >= resanStart } }
    val omarkerade = remember(missar, resanStart) { Missar.omarkerade(missar, resanStart) }
    Column(Modifier.padding(top = 14.dp)) {
        if (Resan.fragaKvar(resanStart, System.currentTimeMillis(), obesvarade.size + omarkerade.size)) {
            EfterResanKort(
                varningar = resansVarningar,
                missar = resansMissar,
                svarFor = { e -> Facit.answerFor(facit, e.id, e.t) },
                status = Facit.kortetsStatus(facitStatus, facitStatusAt, resanStart),
                onSvar = { e, svar -> scope.launch {
                    Prefs.answerFacit(ctx, e.id, e.t, svar)
                    if (!GuardService.running) runCatching { FacitSender.flush(ctx) }
                } },
                onAlla = { scope.launch {
                    Prefs.svaraAllaFacit(ctx, resanStart, svar = true)
                    if (!GuardService.running) runCatching { FacitSender.flush(ctx) }
                } },
                onVal = { m, vad -> scope.launch {
                    Prefs.valjMiss(ctx, m.t, vad)
                    if (!GuardService.running) runCatching { FacitSender.flush(ctx) }
                } },
            )
        } else {
            // Nyaste SIST i historiken (AlertHistory.append). Vakten av = bilen står stilla: skicka direkt (DECISIONS #208).
            val senast = historik.lastOrNull() ?: return@Column
            LastSaidCard(senast, true, Facit.answerFor(facit, senast.id, senast.t),
                Facit.radensStatus(facitStatus, facitStatusAt, senast.t)) { svar ->
                scope.launch {
                    Prefs.answerFacit(ctx, senast.id, senast.t, svar)
                    if (!GuardService.running) withContext(Dispatchers.IO) { runCatching { FacitSender.flush(ctx) } }
                }
            }
        }
    }
}

/**
 * Frågan efter resan, överst på Redo. (kort #203, Axels svar 2 och hans tillägg 20/9).
 *
 * Kortet visar resans varningar med KLOCKSLAG OCH TEXT — inte bara antalet. Axels invändning mot
 * förslaget: *"Ja, alla stämde" efter tre timmars körning — minns föraren de tre varningarna?*
 * Ett tryck ska vara ett svar på något föraren läser, inte på ett tal han ska minnas.
 *
 * AVVIKELSEN pekas ut genom att trycka på raden. Underlaget hade listan som ett eget läge "bara vid
 * avvikelse"; när raderna ändå är synliga blir det ett läge för mycket (DECISIONS #277).
 */
@Composable
private fun EfterResanKort(
    varningar: List<AlertEntry>,
    missar: List<MissEntry>,
    svarFor: (AlertEntry) -> Boolean?,
    status: String?,
    onSvar: (AlertEntry, Boolean) -> Unit,
    onAlla: () -> Unit,
    onVal: (MissEntry, String) -> Unit,
) {
    Surface(shape = RoundedCornerShape(20.dp), color = Yta,
        border = BorderStroke(1.dp, Gul.copy(alpha = .45f)), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(18.dp)) {
            Rubrik("EFTER RESAN")
            Spacer(Modifier.height(6.dp))
            Text(if (varningar.isNotEmpty()) Resan.fraga(varningar.size) else Missar.fraga(missar.size), color = Text, fontSize = 19.sp,
                fontFamily = Typo.sans, fontWeight = FontWeight.Bold, lineHeight = 25.sp)
            Spacer(Modifier.height(12.dp))
            varningar.forEach { e ->
                val svar = svarFor(e)
                Column(Modifier.fillMaxWidth().padding(bottom = 10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(android.text.format.DateFormat.format("HH:mm", e.t).toString(),
                            color = Dis, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                        Spacer(Modifier.width(10.dp))
                        Text("”${e.text}”", color = if (svar == null) Text else Dis, fontSize = 14.sp,
                            fontStyle = FontStyle.Italic, lineHeight = 19.sp, modifier = Modifier.weight(1f))
                    }
                    Spacer(Modifier.height(6.dp))
                    Row {
                        FacitKnapp("Stämde", vald = svar == true) { onSvar(e, true) }
                        Spacer(Modifier.width(8.dp))
                        FacitKnapp("Stämde inte", vald = svar == false) { onSvar(e, false) }
                    }
                }
            }
            // Kort #203 lager 2: missarna. Ordet i bilen var ett tryck; tanken kommer här — och först då skickas något.
            missar.forEach { m ->
                Column(Modifier.fillMaxWidth().padding(bottom = 10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(android.text.format.DateFormat.format("HH:mm", m.t).toString(),
                            color = Dis, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                        Spacer(Modifier.width(10.dp))
                        Text("Du markerade: appen missade — vad?", color = if (m.vad == null) Text else Dis, fontSize = 14.sp,
                            modifier = Modifier.weight(1f))
                        // Läget PER RAD (TILL-AXEL-BYGGE-19 Android 1): en vald miss säger själv att den gått.
                        if (m.sent && m.vad != null) Text("Skickad", color = Gron, fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                    }
                    Spacer(Modifier.height(6.dp))
                    Missar.VAD.chunked(2).forEach { rad ->   // två per rad: tre fick inte plats på en smal telefon (fotostudion 26/9)
                        Row(Modifier.padding(bottom = 6.dp)) {
                            rad.forEach { vad ->
                                FacitKnapp(vad.replaceFirstChar { it.uppercase() }, vald = m.vad == vad) { onVal(m, vad) }
                                Spacer(Modifier.width(8.dp))
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(4.dp))
            if (varningar.isNotEmpty()) Button(onClick = onAlla, shape = RoundedCornerShape(50),
                colors = ButtonDefaults.buttonColors(containerColor = Gul, contentColor = Natt),
                modifier = Modifier.fillMaxWidth().height(52.dp)) {
                Text("Ja, alla stämde", fontSize = 17.sp, fontWeight = FontWeight.Bold)
            }
            Text("Svarar du inte skickas ingenting — tystnad räknas aldrig som ja.",
                color = Dis, fontSize = 11.sp, modifier = Modifier.padding(top = 8.dp))
            status?.let {
                Text(it, color = if (it.startsWith("Skickat")) Gron else Gul, fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace, modifier = Modifier.padding(top = 4.dp))
            }
        }
    }
}

@Composable
private fun LastSaidCard(e: AlertEntry?, facitOn: Boolean = false, svar: Boolean? = null, status: String? = null, onSvar: (Boolean) -> Unit = {}) {
    Surface(shape = RoundedCornerShape(16.dp), color = Yta,
        border = BorderStroke(1.dp, Gul.copy(alpha = .25f)), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp)) {
            Row {
                Rubrik("SENAST SAGT")
                Spacer(Modifier.weight(1f))
                e?.let {
                    Text(android.text.format.DateFormat.format("d MMM HH:mm", it.t).toString(),
                        color = Dis, fontSize = 11.sp)
                }
            }
            Spacer(Modifier.height(4.dp))
            Text(e?.let { "”${it.text}”" } ?: "Rösten har inte behövt säga något än.",
                color = if (e != null) Text else Dis, fontSize = 15.sp, fontStyle = FontStyle.Italic)
            // S4 (Axels form, DECISIONS #196): två knappar, ingen fritext. Bara betatestare, bara när varningen
            // bär ett id. Svaret loggas lokalt och skickas när bilen står stilla.
            if (facitOn && e != null && e.id.isNotEmpty() && System.currentTimeMillis() - e.t < Facit.MAX_AGE_MS) {
                Spacer(Modifier.height(10.dp))
                Row {
                    FacitKnapp("Stämde", vald = svar == true) { onSvar(true) }
                    Spacer(Modifier.width(8.dp))
                    FacitKnapp("Stämde inte", vald = svar == false) { onSvar(false) }
                }
                Text(if (svar == null) "Stämde det? Svaret skickas när bilen står stilla." else "Tack — skickas när bilen står stilla.",
                    color = Dis, fontSize = 11.sp, modifier = Modifier.padding(top = 6.dp))
                status?.let { Text(it, color = if (it.startsWith("Skickat")) Gron else Gul, fontSize = 11.sp, fontFamily = FontFamily.Monospace) }
            }
        }
    }
}

@Composable
private fun FacitKnapp(label: String, vald: Boolean, onClick: () -> Unit) {
    if (vald) Button(onClick = onClick, shape = RoundedCornerShape(50),
        colors = ButtonDefaults.buttonColors(containerColor = Gul, contentColor = Natt)) { Text(label, fontFamily = Cond, fontSize = 15.sp) }
    else OutlinedButton(onClick = onClick, shape = RoundedCornerShape(50), border = BorderStroke(1.dp, Gul)) { Text(label, color = Gul, fontFamily = Cond, fontSize = 15.sp) }
}

@Composable private fun Rubrik(s: String) =
    Text(s, color = Gul, fontSize = 11.sp, fontFamily = FontFamily.Monospace, letterSpacing = 2.sp)
