// Designöverlämningen v2 (DECISIONS #444) på Android — samma skärmar som iOS: Redo (01) och Redo efter tur (01b),
// På vakt (02) med gammal data (M–N) och inställningar i två nivåer (04). Tokens i Theme.kt, kortet i WarningCardScreen.kt.
// Avviker Android från iOS är det en bugg, inte en anpassning (DECISIONS #47).
package se.halkvakt.app.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import se.halkvakt.app.AgeGate
import se.halkvakt.app.AlertEntry
import se.halkvakt.app.GuardService
import se.halkvakt.app.MainActivity
import se.halkvakt.app.Missar
import se.halkvakt.app.Nearby
import se.halkvakt.app.NearbyItem
import se.halkvakt.app.Prefs
import se.halkvakt.app.R
import se.halkvakt.engine.HazardKind
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private val Divider = Color(0xFF253036)
private val Line = Color(0xFF1E282D)
private val TrackOff = Color(0xFF26323A)
private val Raised = Color(0xFF1A2327)
private val Text2 = Color(0xFFA9B5BB)
private val Muted2 = Color(0xFF6F7C83)
private val Muted3 = Color(0xFF4A5A63)
private val Ring = Color(0xFF34424A)

fun klockslag(ms: Long): String = SimpleDateFormat("HH:mm", Locale("sv", "SE")).format(Date(ms))

/** Kortets rubriker (DECISIONS #444) — samma ord på iPhone och Android. */
fun rubrik(k: HazardKind) = when (k) {
    HazardKind.ACCIDENT -> "Olycka"
    HazardKind.SLIPPERY_SEGMENT -> "Halka"
    HazardKind.ICING_POINT -> "Frysrisk"
    HazardKind.WILDLIFE -> "Vilt"
    HazardKind.CAMERA -> "Fartkamera"
}

/* ---------- Delar som återkommer ---------- */

@Composable
fun Mark(size: Dp, tint: Color = Brand.yellow) =
    Icon(painterResource(R.drawable.ikon_mark), null, tint = tint, modifier = Modifier.size(size, size * 83f / 94f))

@Composable
fun Lockup(markSize: Dp = 16.dp, textSize: TextUnit = 12.sp) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(markSize * 0.56f)) {
        Mark(markSize)
        Text("HALKVAKT", color = Brand.text, fontFamily = Typo.mono, fontWeight = FontWeight.SemiBold, fontSize = textSize, letterSpacing = 0.12.em)
    }
}

/** 7 dp ljus som andas (opacitet 1 → 0,45, skala 1 → 0,8, 2,4 s). */
@Composable
fun StatusLight(color: Color) {
    val t = rememberInfiniteTransition(label = "ljus")
    val p by t.animateFloat(0f, 1f, infiniteRepeatable(tween(1200, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "puls")
    Box(Modifier.size(7.dp).scale(1f - .2f * p).alpha(1f - .55f * p).background(color, CircleShape))
}

/** Toppraden: logotypen i mitten, läget till höger med ljuset. */
@Composable
fun DesignTopBar(label: String?, color: Color, showLockup: Boolean = true) {
    Box(Modifier.fillMaxWidth().height(48.dp).padding(horizontal = 28.dp)) {
        if (showLockup) Box(Modifier.align(Alignment.Center)) { Lockup() }
        if (label != null) Row(Modifier.align(Alignment.CenterEnd), verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(7.dp)) {
            MonoLabel(label, if (color == Brand.yellow) Brand.dim else color)
            StatusLight(color)
        }
    }
}

@Composable
fun MonoLabel(text: String, color: Color = Brand.dim, size: TextUnit = 10.sp, modifier: Modifier = Modifier) =
    Text(text.uppercase(), color = color, fontFamily = Typo.mono, fontWeight = FontWeight.Medium, fontSize = size,
        letterSpacing = 0.14.em, modifier = modifier)

/** Gul kapsel 220 × 56 — bara för knappar som GÖR något. */
@Composable
fun YellowPill(title: String, color: Color = Brand.yellow, play: Boolean = false, onClick: () -> Unit) {
    Row(Modifier.size(220.dp, 56.dp).background(color, RoundedCornerShape(28.dp)).clickable(role = Role.Button, onClick = onClick),
        horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
        if (play) { Text("▶", color = Brand.bg, fontSize = 13.sp); Spacer(Modifier.width(10.dp)) }
        Text(title, color = Brand.bg, fontFamily = Typo.sans, fontWeight = FontWeight.SemiBold, fontSize = 17.sp)
    }
}

@Composable
fun NeutralPill(title: String, onClick: () -> Unit) {
    Box(Modifier.size(220.dp, 56.dp).background(Brand.panel, RoundedCornerShape(28.dp)).border(1.dp, TrackOff, RoundedCornerShape(28.dp))
        .clickable(role = Role.Button, onClick = onClick), contentAlignment = Alignment.Center) {
        Text(title, color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.SemiBold, fontSize = 17.sp)
    }
}

@Composable
fun MonoLink(title: String, onClick: () -> Unit) {
    Text(title.uppercase(), color = Brand.text, fontFamily = Typo.mono, fontWeight = FontWeight.Medium, fontSize = 11.sp,
        letterSpacing = 0.14.em, textDecoration = TextDecoration.Underline,
        modifier = Modifier.heightIn(min = 44.dp).clickable(role = Role.Button, onClick = onClick).wrapContentHeight())
}

@Composable
fun DashedDivider(vertical: Boolean = false, modifier: Modifier = Modifier) {
    Canvas(if (vertical) modifier.width(1.dp).fillMaxHeight() else modifier.fillMaxWidth().height(1.dp)) {
        drawLine(Divider, Offset.Zero, if (vertical) Offset(0f, size.height) else Offset(size.width, 0f), 1.dp.toPx(),
            pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 3.dp.toPx())))
    }
}

@Composable
fun RowPanel(content: @Composable ColumnScope.() -> Unit) =
    Column(Modifier.fillMaxWidth().background(Brand.panel, RoundedCornerShape(18.dp)).padding(horizontal = 20.dp), content = content)

@Composable
fun NavRow(title: String, value: String? = null, divider: Boolean = true, onClick: () -> Unit) {
    Column(Modifier.clickable(onClick = onClick)) {
        Row(Modifier.fillMaxWidth().height(56.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(title, color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 16.sp, modifier = Modifier.weight(1f))
            value?.let { MonoLabel(it, size = 11.sp) }
            Text("→", color = Brand.dim, fontFamily = Typo.mono, fontSize = 13.sp)
        }
        if (divider) DashedDivider()
    }
}

@Composable
fun ReceiptRow(label: String, value: String, valueColor: Color = Brand.text, divider: Boolean = true) {
    Column {
        Row(Modifier.fillMaxWidth().padding(vertical = 15.dp), verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            MonoLabel(label, size = 11.sp)
            Text(value, color = valueColor, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 15.sp,
                textAlign = TextAlign.End, modifier = Modifier.weight(1f))
        }
        if (divider) DashedDivider()
    }
}

@Composable
fun GreenToggleRow(title: String, sub: String?, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 16.sp)
            sub?.let { Text(it, color = Brand.dim, fontFamily = Typo.sans, fontSize = 13.sp) }
        }
        Switch(checked = checked, onCheckedChange = onChange,
            colors = SwitchDefaults.colors(checkedTrackColor = Brand.green, checkedThumbColor = Brand.text,
                uncheckedTrackColor = TrackOff, uncheckedThumbColor = Brand.text, uncheckedBorderColor = TrackOff))
    }
}

@Composable
fun Plinth(res: Int, height: Dp = 220.dp) =
    Image(painterResource(res), null, modifier = Modifier.fillMaxWidth().height(height))

/** Den flytande flikraden: Vakten / Inställningar. */
@Composable
fun FloatingTabBar(tab: Int, onTab: (Int) -> Unit) {
    Row(Modifier.background(Brand.panel, RoundedCornerShape(32.dp)).border(1.dp, Line, RoundedCornerShape(32.dp)).padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        listOf("VAKTEN", "INSTÄLLNINGAR").forEachIndexed { i, title ->
            Column(Modifier.size(112.dp, 52.dp).background(if (tab == i) Raised else Color.Transparent, RoundedCornerShape(26.dp))
                .clickable(role = Role.Tab) { onTab(i) }.semantics { selected = tab == i },
                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                if (i == 0) Mark(16.dp, if (tab == 0) Brand.yellow else Brand.dim)
                else Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    repeat(3) { Box(Modifier.size(16.dp, 2.dp).background(if (tab == 1) Brand.text else Brand.dim, RoundedCornerShape(1.dp))) }
                }
                Spacer(Modifier.height(6.dp))
                Text(title, color = if (tab == i) Brand.text else Brand.dim, fontFamily = Typo.mono, fontSize = 10.sp, letterSpacing = 0.12.em)
            }
        }
    }
}

/* ---------- 01 REDO och 01b REDO EFTER TUR ---------- */

@Composable
fun RedoScreen(activity: MainActivity, overst: @Composable () -> Unit) {
    val ctx = LocalContext.current
    val historik by Prefs.history(ctx).collectAsStateWithLifecycle(initialValue = emptyList())
    val start by Prefs.tripStart(ctx).collectAsStateWithLifecycle(initialValue = 0L)
    val slut by remember { Prefs.tripEnd(ctx) }.collectAsStateWithLifecycle(initialValue = 0L to 0f)
    val disabled by remember { Prefs.disabledKinds(ctx) }.collectAsStateWithLifecycle(initialValue = emptySet())
    val autostart by activity.autostartOn.collectAsStateWithLifecycle()
    val snapshot by GuardService.snapshotInfo.collectAsStateWithLifecycle()
    val (slutMs, km) = slut
    val tur = remember(historik, start, slutMs) {
        if (start <= 0L || slutMs < start) emptyList() else historik.filter { it.t in start..slutMs }.sortedBy { it.t }
    }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp).padding(bottom = 120.dp),
        horizontalAlignment = Alignment.CenterHorizontally) {
        DesignTopBar(if (snapshot == null) "Hämtar" else "Live", if (snapshot == null) Muted2 else Brand.yellow)
        overst()
        if (tur.isEmpty()) Plinth(R.drawable.plinth_logo) else Spacer(Modifier.height(24.dp))
        Text("Redo.", color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.SemiBold, fontSize = 44.sp,
            letterSpacing = (-0.03).em, modifier = Modifier.padding(top = 12.dp))
        val vaknar = if (autostart) "Vakten vaknar själv när du kör. " else ""
        Text(if (tur.isEmpty()) vaknar + "Din position lämnar inte telefonen av sig själv."
             else if (autostart) "Vakten vaknar själv när du kör." else "Din position lämnar inte telefonen av sig själv.",
            color = Text2, fontFamily = Typo.sans, fontSize = 15.sp, lineHeight = 22.sp, textAlign = TextAlign.Center,
            modifier = Modifier.widthIn(max = 290.dp).padding(top = 14.dp))
        if (tur.isEmpty()) {
            val pa = listOf("Halka" to HazardKind.SLIPPERY_SEGMENT, "Vilt" to HazardKind.WILDLIFE, "Olyckor" to HazardKind.ACCIDENT,
                "Frysrisk" to HazardKind.ICING_POINT, "Kameror" to HazardKind.CAMERA).filter { it.second !in disabled }.map { it.first }
            MonoLabel(if (pa.isEmpty()) "Alla källor av" else pa.joinToString(" · "), modifier = Modifier.padding(top = 18.dp))
        } else {
            Spacer(Modifier.height(24.dp))
            Kvitto(tur, start, slutMs, km)
        }
        Spacer(Modifier.height(32.dp))
        YellowPill("Starta vakten", play = true) { activity.onToggle() }
        MonoLabel(if (tur.isEmpty()) "Ingen tur än" else "${tur.size} ${if (tur.size == 1) "varning" else "varningar"} · visas tills nästa tur",
            Muted2, modifier = Modifier.padding(top = 16.dp))
    }
}

@Composable
private fun Kvitto(tur: List<AlertEntry>, start: Long, slut: Long, km: Float) {
    Column(Modifier.fillMaxWidth().background(Brand.panel, RoundedCornerShape(18.dp)).padding(horizontal = 20.dp)) {
        Column(Modifier.padding(vertical = 16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            MonoLabel("Senaste turen")
            Text("${klockslag(start)}–${klockslag(slut)} · ${(slut - start) / 60000} MIN · ${"%.0f".format(km)} KM",
                color = Brand.text, fontFamily = Typo.mono, fontWeight = FontWeight.Medium, fontSize = 12.sp)
        }
        tur.forEach { v ->
            DashedDivider()
            val k = runCatching { HazardKind.of(v.kind) }.getOrNull()
            Row(Modifier.fillMaxWidth().padding(vertical = 14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(klockslag(v.t), color = Brand.dim, fontFamily = Typo.mono, fontWeight = FontWeight.Medium, fontSize = 12.sp)
                if (k != null) HazardIcon(k, 22.dp, Brand.text)
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text(k?.let(::rubrik) ?: v.kind, color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 15.sp)
                    Text("”${v.text}”", color = Text2, fontFamily = Typo.sans, fontSize = 13.sp)
                }
            }
        }
    }
}

/* ---------- 02 PÅ VAKT ---------- */

@Composable
fun PaVaktScreen(activity: MainActivity) {
    val session by GuardService.session.collectAsStateWithLifecycle()
    val hazards by activity.hazards.collectAsStateWithLifecycle()
    val stations by activity.stations.collectAsStateWithLifecycle()
    val stale by GuardService.dataStale.collectAsStateWithLifecycle()
    val dataTime by GuardService.dataTime.collectAsStateWithLifecycle()
    val toast by GuardService.staleToast.collectAsStateWithLifecycle()
    val snapshot by GuardService.snapshotInfo.collectAsStateWithLifecycle()
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val facitOn by Prefs.facitEnabled(ctx).collectAsStateWithLifecycle(initialValue = false)
    var missKvitto by remember { mutableStateOf<String?>(null) }
    var now by remember { mutableStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) { while (true) { delay(1000); now = System.currentTimeMillis() } }
    val minutes = ((now - session.startedAt) / 60000).coerceAtLeast(0)
    val nearby = remember(hazards, session.lon, session.lat) {
        session.lon?.let { lon -> session.lat?.let { lat -> Nearby.nearest(hazards, lon, lat) } } ?: emptyList()
    }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp)) {
            DesignTopBar("På", Brand.green)
            Column(Modifier.padding(top = 12.dp).fillMaxWidth().background(Brand.panel, RoundedCornerShape(18.dp)).padding(20.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(Modifier.size(7.dp).background(Brand.green, CircleShape)); MonoLabel("På vakt", Brand.green)
                }
                Row(Modifier.padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(22.dp), verticalAlignment = Alignment.Bottom) {
                    Tal("$minutes", "MIN"); Tal("%.0f".format(session.km), "KM")
                }
                DashedDivider(modifier = Modifier.padding(top = 18.dp))
                Row(Modifier.padding(top = 16.dp).height(IntrinsicSize.Min)) {
                    Stat(session.counts.values.sum(), "Varningar", Modifier.weight(1f))
                    DashedDivider(vertical = true)
                    Stat(session.counts[HazardKind.SLIPPERY_SEGMENT] ?: 0, "Halka", Modifier.weight(1f).padding(start = 16.dp))
                    DashedDivider(vertical = true)
                    Stat(session.counts[HazardKind.WILDLIFE] ?: 0, "Vilt", Modifier.weight(1f).padding(start = 16.dp))
                }
            }
            Spacer(Modifier.height(14.dp))
            Tillstand(stale, dataTime, session.lastSaid)
            Row(Modifier.fillMaxWidth().padding(top = 26.dp, start = 4.dp, end = 4.dp)) {
                MonoLabel("På din väg"); Spacer(Modifier.weight(1f))
                snapshot?.let { MonoLabel(it.substringAfterLast("· "), Muted2) }
            }
            if (nearby.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                RowPanel { nearby.take(3).forEachIndexed { i, n -> NearRow(n, i < minOf(3, nearby.size) - 1) } }
            }
            Spacer(Modifier.height(28.dp))
            Column(Modifier.fillMaxWidth().padding(bottom = 22.dp), horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)) {
                // Kort #203 lager 2 (Axels ja, DECISIONS #267 p. 5): sparar klockslag, närmaste station och halkavsnitt inom 2 km;
                // vad det var väljs efter resan. Bara med betatestet på.
                if (facitOn) {
                    MonoLink("Appen missade något") { scope.launch {
                        val lon = session.lon; val lat = session.lat
                        val st = if (lon != null && lat != null) Missar.narmasteStation(stations, lon, lat) else null
                        val seg = if (lon != null && lat != null) Missar.narmasteSegment(hazards, lon, lat) else null
                        val t = System.currentTimeMillis()
                        Prefs.markeraMiss(ctx, t, st, seg)
                        missKvitto = if (st != null) "Markerat ${klockslag(t)} — du väljer vad det var efter resan."
                            else "Kunde inte markera: appen har ingen position eller stationslista än."
                    } }
                    missKvitto?.let { Text(it, color = Brand.dim, fontSize = 12.sp, textAlign = TextAlign.Center) }
                }
                NeutralPill("Avsluta vakten") { activity.onToggle() }
            }
        }
        // Gammal väglagsdata (designen M): mörk rad överst i 8 s medan rösten talar.
        if (toast) {
            Row(Modifier.align(Alignment.TopCenter).padding(horizontal = 12.dp, vertical = 4.dp).fillMaxWidth()
                .background(Raised, RoundedCornerShape(22.dp)).border(1.dp, Ring, RoundedCornerShape(22.dp))
                .padding(horizontal = 18.dp, vertical = 16.dp), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Vagform(Brand.text)
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    MonoLabel("Halkvakt · väglagsdata")
                    Text("”${AgeGate.STALE_LINE}”", color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 17.sp)
                }
            }
        }
    }
}

@Composable private fun Tal(v: String, enhet: String) = Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
    Text(v, color = Brand.text, fontFamily = Typo.mono, fontWeight = FontWeight.Medium, fontSize = 40.sp, letterSpacing = (-0.02).em)
    MonoLabel(enhet, size = 11.sp, modifier = Modifier.padding(bottom = 8.dp))
}

@Composable private fun Stat(n: Int, label: String, modifier: Modifier) = Column(modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
    Text("$n", color = Brand.text, fontFamily = Typo.mono, fontWeight = FontWeight.Medium, fontSize = 22.sp)
    MonoLabel(label)
}

@Composable fun Vagform(color: Color) = Row(Modifier.height(22.dp), horizontalArrangement = Arrangement.spacedBy(3.dp), verticalAlignment = Alignment.CenterVertically) {
    listOf(8, 16, 11, 18, 7).forEach { h -> Box(Modifier.size(3.dp, h.dp).background(color, RoundedCornerShape(2.dp))) }
}

/** Raden under panelen: gammal data (N) går före allt; annars det senast sagda, eller "Tyst så länge". */
@Composable
private fun Tillstand(stale: Boolean, dataTime: Long?, lastSaid: Pair<String, Long>?) {
    val dashed = Modifier.fillMaxWidth().dashedBorder().padding(horizontal = 20.dp, vertical = 16.dp)
    when {
        stale -> Row(Modifier.fillMaxWidth().background(Color(0xFF0B1013), RoundedCornerShape(18.dp)).border(1.dp, Ring, RoundedCornerShape(18.dp))
            .padding(horizontal = 20.dp, vertical = 16.dp), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            HazardIcon(HazardKind.SLIPPERY_SEGMENT, 24.dp, Brand.text)
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                MonoLabel("Väglagsdata · gammal")
                Text("Kör som om det kan vara halt.", color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 15.sp)
                dataTime?.let { MonoLabel("Senast färsk ${klockslag(it)}", Muted2) }
            }
        }
        lastSaid != null -> Column(dashed, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            MonoLabel("Senast sagt · ${klockslag(lastSaid.second)}")
            Text("”${lastSaid.first}”", color = Brand.text, fontFamily = Typo.sans, fontSize = 15.sp)
        }
        else -> Column(dashed, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            MonoLabel("Tyst så länge")
            Text("Inget på din väg än. Du hör det direkt när något dyker upp.", color = Text2, fontFamily = Typo.sans, fontSize = 15.sp)
        }
    }
}

/** Streckad ram, radie 18 — "Tyst så länge" och "Senast sagt". */
private fun Modifier.dashedBorder() = drawBehind {
    drawRoundRect(Divider, cornerRadius = CornerRadius(18.dp.toPx()),
        style = Stroke(1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 4.dp.toPx()))))
}

@Composable
private fun NearRow(n: NearbyItem, divider: Boolean) {
    Column {
        Row(Modifier.fillMaxWidth().height(52.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            HazardIcon(n.kind, 20.dp, Brand.dim)
            Text(Nearby.distText(n.distM).uppercase(), color = Brand.text, fontFamily = Typo.mono, fontSize = 14.sp, modifier = Modifier.width(70.dp))
            Text(rubrik(n.kind), color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 15.sp, modifier = Modifier.weight(1f))
            n.secondary?.let { MonoLabel(it, Muted2) }
        }
        if (divider) DashedDivider()
    }
}

/* ---------- 04 INSTÄLLNINGAR (två nivåer) ---------- */

private enum class Sida { VARNA_FOR, FORVARNING, START, ROSTEN, BETATEST, INTEGRITET, OM }

@Composable
/** `onIntro` null = ingen introduktion att visa igen (Android har trappan i MainActivity, ingen introduktion än). */
fun SettingsScreen(activity: MainActivity, onIntro: (() -> Unit)? = null) {
    var sida by rememberSaveable { mutableStateOf<String?>(null) }
    androidx.activity.compose.BackHandler(enabled = sida != null) { sida = null }
    AnimatedContent(sida, transitionSpec = {
        val e = CubicBezierEasing(.2f, .8f, .2f, 1f)
        if (targetState != null) slideInHorizontally(tween(420, easing = e)) { it } togetherWith fadeOut(tween(420))
        else fadeIn(tween(420)) togetherWith slideOutHorizontally(tween(420, easing = e)) { it }
    }, label = "inställningar") { s ->
        if (s == null) SettingsRoot(activity, onIntro) { sida = it.name }
        else Undersida(Sida.valueOf(s), activity, { sida = it.name }) { sida = null }
    }
}

@Composable
private fun SettingsRoot(activity: MainActivity, onIntro: (() -> Unit)?, open: (Sida) -> Unit) {
    val ctx = LocalContext.current
    val disabled by remember { Prefs.disabledKinds(ctx) }.collectAsStateWithLifecycle(initialValue = emptySet())
    val warn by remember { Prefs.warnDistanceM(ctx) }.collectAsStateWithLifecycle(initialValue = Prefs.WARN_MAX_M)
    val autostart by activity.autostartOn.collectAsStateWithLifecycle()
    val facitOn by Prefs.facitEnabled(ctx).collectAsStateWithLifecycle(initialValue = false)
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp).padding(top = 24.dp, bottom = 150.dp)) {
        Text("Inställningar", color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.SemiBold, fontSize = 32.sp, letterSpacing = (-0.025).em)
        Text("Allt är på från början.", color = Text2, fontFamily = Typo.sans, fontSize = 15.sp, modifier = Modifier.padding(top = 10.dp))
        Spacer(Modifier.height(28.dp))
        RowPanel {
            NavRow("Varna för", "${5 - disabled.size} av 5") { open(Sida.VARNA_FOR) }
            NavRow("Förvarning", avstand(warn)) { open(Sida.FORVARNING) }
            NavRow("Start", if (autostart) "Själv" else "Manuellt") { open(Sida.START) }
            NavRow("Rösten", "Android", divider = false) { open(Sida.ROSTEN) }
        }
        Spacer(Modifier.height(14.dp))
        RowPanel {
            NavRow("Betatest", if (facitOn) "På" else "Av") { open(Sida.BETATEST) }
            NavRow("Integritet") { open(Sida.INTEGRITET) }
            onIntro?.let { NavRow("Visa introduktionen igen", onClick = it) }
            NavRow("Om Halkvakt", divider = false) { open(Sida.OM) }
        }
        Column(Modifier.padding(top = 24.dp, start = 4.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            MonoLabel("Löftet")
            Text("Din position lämnar inte telefonen av sig själv.", color = Text2, fontFamily = Typo.sans, fontSize = 15.sp)
        }
    }
}

private fun avstand(m: Float) = if (m >= 1000) "${"%.1f".format(m / 1000).replace('.', ',')} km" else "${m.toInt()} m"

@Composable
private fun Undersida(sida: Sida, activity: MainActivity, open: (Sida) -> Unit, back: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val uri = LocalUriHandler.current
    Column(Modifier.fillMaxSize().background(Brand.bg).verticalScroll(rememberScrollState()).padding(horizontal = 24.dp).padding(top = 8.dp, bottom = 150.dp)) {
        Text("← INSTÄLLNINGAR", color = Brand.text, fontFamily = Typo.mono, fontSize = 11.sp, letterSpacing = 0.14.em,
            modifier = Modifier.heightIn(min = 44.dp).clickable(onClick = back).wrapContentHeight())
        when (sida) {
            Sida.VARNA_FOR -> {
                val disabled by remember { Prefs.disabledKinds(ctx) }.collectAsStateWithLifecycle(initialValue = emptySet())
                SidRubrik("Varna för", "Slå av det du inte vill höra.")
                Spacer(Modifier.height(24.dp))
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    KALLOR.forEach { (k, titel, text) ->
                        val pa = k !in disabled
                        Row(Modifier.fillMaxWidth().heightIn(min = 76.dp)
                            .background(if (pa) Brand.panel else Brand.bg, RoundedCornerShape(16.dp))
                            .border(1.dp, if (pa) Line else Raised, RoundedCornerShape(16.dp))
                            .clickable(role = Role.Switch) { scope.launch { Prefs.setKindEnabled(ctx, k, !pa) } }
                            .padding(horizontal = 18.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                Text(titel, color = if (pa) Brand.text else Muted2, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 16.sp)
                                Text(text, color = if (pa) Brand.dim else Muted3, fontFamily = Typo.sans, fontSize = 13.sp)
                            }
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                                Box(Modifier.size(7.dp).background(if (pa) Brand.green else Muted2, CircleShape))
                                MonoLabel(if (pa) "På" else "Av", if (pa) Brand.green else Muted2)
                            }
                        }
                    }
                }
            }
            Sida.FORVARNING -> {
                val warn by remember { Prefs.warnDistanceM(ctx) }.collectAsStateWithLifecycle(initialValue = Prefs.WARN_MAX_M)
                SidRubrik("Förvarning", "Rösten varnar ungefär 30 sekunder före. Du kan korta det, aldrig förlänga. Gäller från nästa start av vakten.")
                Spacer(Modifier.height(24.dp))
                RowPanel {
                    listOf(400f to "Kortast", 800f to "Mellan", 1200f to "Fullt — standard").forEachIndexed { i, (m, namn) ->
                        val vald = warn == m
                        Column(Modifier.clickable(role = Role.RadioButton) { scope.launch { Prefs.setWarnDistanceM(ctx, m) } }.semantics { selected = vald }) {
                            Row(Modifier.fillMaxWidth().height(60.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text(avstand(m).uppercase(), color = Brand.text, fontFamily = Typo.mono, fontWeight = FontWeight.Medium, fontSize = 15.sp, modifier = Modifier.width(72.dp))
                                Text(namn, color = Brand.dim, fontFamily = Typo.sans, fontSize = 14.sp, modifier = Modifier.weight(1f))
                                Box(Modifier.size(22.dp).border(2.dp, if (vald) Brand.green else Ring, CircleShape), contentAlignment = Alignment.Center) {
                                    if (vald) Box(Modifier.size(10.dp).background(Brand.green, CircleShape))
                                }
                            }
                            if (i < 2) DashedDivider()
                        }
                    }
                }
            }
            Sida.START -> {
                val autostart by activity.autostartOn.collectAsStateWithLifecycle()
                SidRubrik("Start", "Vakten känner igen när du kör och vaknar själv.")
                Spacer(Modifier.height(24.dp))
                // Å4 (kort #262): rörelseigenkänningen är huvudspåret (Autostart.kt), bilens Bluetooth startar direkt.
                RowPanel { GreenToggleRow("Vaknar själv när du kör", "Startar när telefonen märker att du åker bil, direkt om bilens Bluetooth kopplas",
                    autostart) { activity.onAutostartToggle() } }
                MonoLabel("Stoppar själv efter 15 min parkerad", Muted2, modifier = Modifier.padding(top = 16.dp, start = 4.dp))
            }
            Sida.ROSTEN -> {
                SidRubrik("Rösten", "Halkvakt talar med systemets svenska röst.")
                Text("BYT RÖST: INSTÄLLNINGAR → SYSTEM → SPRÅK → TEXT TILL TAL", color = Brand.dim, fontFamily = Typo.mono, fontSize = 10.sp,
                    letterSpacing = 0.1.em, lineHeight = 18.sp,
                    modifier = Modifier.padding(top = 24.dp).fillMaxWidth().background(Brand.panel, RoundedCornerShape(18.dp))
                        .clickable { runCatching { ctx.startActivity(android.content.Intent("com.android.settings.TTS_SETTINGS")
                            .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)) } }
                        .padding(horizontal = 20.dp, vertical = 16.dp))
                Box(Modifier.fillMaxWidth().padding(top = 32.dp), contentAlignment = Alignment.Center) {
                    YellowPill("Testa rösten", play = true) { activity.testVoice() }
                }
            }
            Sida.BETATEST -> {
                val facitOn by Prefs.facitEnabled(ctx).collectAsStateWithLifecycle(initialValue = false)
                SidRubrik("Betatest", "Hjälp oss göra varningarna bättre.")
                Spacer(Modifier.height(24.dp))
                RowPanel { GreenToggleRow("Svara på varningarna", "Tryck Stämde eller Stämde inte efter en varning", facitOn) { on ->
                    scope.launch { Prefs.setFacitEnabled(ctx, on) } } }
                MonoLabel("Vad skickas", modifier = Modifier.padding(top = 28.dp, bottom = 10.dp, start = 4.dp))
                // S4 (Bengt #186, Axel #196): texten säger exakt vad som skickas — inget mer, inget mindre.
                RowPanel {
                    ReceiptRow("Skickas", "Varningens id, klockslag, ditt svar")
                    ReceiptRow("Vid missad", "Klockslag, närmaste mätstation, vad det var")
                    ReceiptRow("Aldrig", "Konto, resa, position", divider = false)
                }
                Text("Ett varnings-id pekar på en fara på kartan, så vi ser ungefär var du var just då. Appens namn och version följer med. Bara för betatestare.",
                    color = Brand.dim, fontFamily = Typo.sans, fontSize = 13.sp, lineHeight = 19.sp, modifier = Modifier.padding(top = 14.dp, start = 4.dp))
            }
            Sida.INTEGRITET -> {
                val facitOn by Prefs.facitEnabled(ctx).collectAsStateWithLifecycle(initialValue = false)
                SidRubrik("Integritet", null)
                Column(Modifier.padding(top = 24.dp).fillMaxWidth().background(Brand.panel, RoundedCornerShape(18.dp)).padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    MonoLabel("Löftet", size = 11.sp)
                    Text("Din position lämnar inte telefonen av sig själv.", color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 20.sp)
                    Text("All matchning mot vägdata sker lokalt i appen. Inget konto, ingen spårning. Undantaget är betatestet — bara om du själv slår på det.",
                        color = Text2, fontFamily = Typo.sans, fontSize = 14.sp, lineHeight = 21.sp)
                }
                Spacer(Modifier.height(10.dp))
                RowPanel {
                    NavRow("Betatest", if (facitOn) "På" else "Av") { open(Sida.BETATEST) }
                    NavRow("Integritetspolicy", divider = false) { uri.openUri("https://axelstar.github.io/halkvakt-karta/integritet.html") }
                }
            }
            Sida.OM -> {
                val version = remember { runCatching { ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName }.getOrNull() ?: "?" }
                SidRubrik("Om Halkvakt", null)
                Spacer(Modifier.height(24.dp))
                RowPanel {
                    NavRow("Livekartan — läget just nu") { uri.openUri("https://axelstar.github.io/halkvakt-karta/karta.html") }
                    NavRow("Om appen & vanliga frågor") { uri.openUri("https://axelstar.github.io/halkvakt-karta/om.html") }
                    NavRow("Press & material", divider = false) { uri.openUri("https://axelstar.github.io/halkvakt-karta/press.html") }
                }
                // #249 (a): samma ärlighetsrad och attribution som iOS — Fintraffic (CC BY 4.0) och OSM (ODbL) kräver källan.
                Text("Varnar vid Trafikverkets mätstationer och rapporterade väglag — mellan stationerna är vägen oövervakad. " +
                    "Data: Trafikverket (CC0), SMHI, Fintraffic (CC BY 4.0), broar © OpenStreetMap-bidragsgivare (ODbL). " +
                    "Halkvakt är fristående och har ingen koppling till myndigheterna.",
                    color = Muted2, fontFamily = Typo.sans, fontSize = 12.sp, lineHeight = 18.sp, modifier = Modifier.padding(top = 20.dp, start = 4.dp))
                MonoLabel("Halkvakt $version · beta", Muted3, modifier = Modifier.padding(top = 16.dp, start = 4.dp))
            }
        }
    }
}

private val KALLOR = listOf(
    Triple(HazardKind.ACCIDENT, "Olyckor & hinder", "Trafikverkets pågående lägen"),
    Triple(HazardKind.SLIPPERY_SEGMENT, "Halt väglag", "Rapporterade hala vägsträckor"),
    Triple(HazardKind.ICING_POINT, "Frysrisk", "Vägväderstationer nära noll och vått"),
    Triple(HazardKind.WILDLIFE, "Vilt", "Djur på vägen enligt Trafikverket"),
    Triple(HazardKind.CAMERA, "Fartkameror", "Fasta kameror på din väg"),
)

@Composable
private fun SidRubrik(titel: String, text: String?) {
    Text(titel, color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.SemiBold, fontSize = 32.sp, letterSpacing = (-0.025).em,
        modifier = Modifier.padding(top = 8.dp, start = 4.dp))
    text?.let { Text(it, color = Text2, fontFamily = Typo.sans, fontSize = 15.sp, lineHeight = 22.sp, modifier = Modifier.padding(top = 10.dp, start = 4.dp)) }
}

/** Botten-toningen under flikraden: 130 dp, genomskinligt → mark vid 60 %. */
val TabFade = Brush.verticalGradient(0f to Color.Transparent, .6f to Brand.bg)
