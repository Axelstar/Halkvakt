// Halkvakts UI v2 — porterad från Claude Design-mockupen David valde.
// Färgsemantik: GRÖNT = kör/livedata, GULT = varningsdata (chips, vippor, vald flik).
// Skill-regler: en lägsta ansvarig ägare per state (DataStore/tjänstens StateFlows),
// composables konsumerar; trappan bor orörd i MainActivity.
package se.halkvakt.app.ui

import android.graphics.Typeface
import androidx.compose.foundation.BorderStroke
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
import se.halkvakt.app.Nearby
import se.halkvakt.app.NearbyItem
import se.halkvakt.app.Prefs
import se.halkvakt.app.R
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
private val GronMork = Color(0xFF0E1F16)
private val GronKant = Color(0xFF1C3327)
private val Teal = Brand.blue
private val Cond = Typo.mono

private val Scheme = darkColorScheme(
    primary = Gul, onPrimary = Natt, background = Natt, onBackground = Text,
    surface = Yta, onSurface = Text, surfaceVariant = Kant, onSurfaceVariant = Dis,
    secondary = Teal,
)

private fun kindColor(k: HazardKind) = if (k == HazardKind.ICING_POINT) Teal else Gul
/** Ikonsetet (DECISIONS #49) — fem faror, samma former som iOS. Triangeln är varumärket
 *  och är INTE en av dem: den står kvar överst på varningskortet. */
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
        contentDescription = kindTitle(k),
        tint = tint,
        modifier = Modifier.size(size),
    )
}

private fun kindChip(k: HazardKind) = when (k) {
    HazardKind.ACCIDENT -> "OLYCKA"; HazardKind.SLIPPERY_SEGMENT -> "HALT VÄGLAG"
    HazardKind.ICING_POINT -> "FRYSRISK"; HazardKind.WILDLIFE -> "VILT"; HazardKind.CAMERA -> "FARTKAMERA"
}
private fun kindTitle(k: HazardKind) = when (k) {
    HazardKind.ACCIDENT -> "Olycka eller hinder på vägen"
    HazardKind.SLIPPERY_SEGMENT -> "Halt väglag rapporterat"
    HazardKind.ICING_POINT -> "Frysrisk vid vägväderstation"
    HazardKind.WILDLIFE -> "Vilt rapporterat i området"
    HazardKind.CAMERA -> "Fartkamera"
}
private fun kindSource(k: HazardKind) = when (k) {
    HazardKind.ACCIDENT -> "Trafikverket · läget nu"
    HazardKind.SLIPPERY_SEGMENT -> "Trafikverket väglag"
    HazardKind.ICING_POINT -> "Vägväderstation"
    HazardKind.WILDLIFE -> "Polisen"
    HazardKind.CAMERA -> "Trafikverket kameror"
}

@Composable
fun HalkvaktApp(activity: MainActivity) {
    MaterialTheme(colorScheme = Scheme) {
        var tab by rememberSaveable { mutableStateOf(0) }
        val warning by GuardService.currentWarning.collectAsStateWithLifecycle()
        Box {
        Scaffold(
            containerColor = Natt,
            bottomBar = {
                NavigationBar(containerColor = Color(0xFF0A0F15)) {
                    val c = NavigationBarItemDefaults.colors(
                        selectedIconColor = Gul, selectedTextColor = Gul,
                        unselectedIconColor = Dis, unselectedTextColor = Dis,
                        indicatorColor = Gul.copy(alpha = .14f))
                    NavigationBarItem(tab == 0, { tab = 0 }, { Icon(Icons.Filled.Warning, null) }, label = { Text("Vakten") }, colors = c)
                    NavigationBarItem(tab == 1, { tab = 1 }, { Icon(Icons.Filled.Settings, null) }, label = { Text("Inställningar") }, colors = c)
                    // Om-fliken borttagen 2/9 (DECISIONS #48, som iOS): innehållet är sista
                    // avsnittet i Inställningar. Två flikar, inte tre.
                }
            }
        ) { pad ->
            Column(Modifier.padding(pad).statusBarsPadding()) {
                TopBar()
                when (tab) {
                    0 -> VaktScreen(activity)
                    else -> SettingsScreen(activity)   // Om ligger sist i Inställningar (#48)
                }
            }
        }
        warning?.let { w -> WarningOverlay(w) { GuardService.currentWarning.value = null } }
        }
    }
}

/** 1b:s signatur: helskärm i bärnstensgult — läsbar i periferin, en enda handling. */
@Composable
private fun WarningOverlay(w: se.halkvakt.engine.Alert, onAck: () -> Unit) {
    Surface(color = Gul, modifier = Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().padding(28.dp).statusBarsPadding(),
            horizontalAlignment = Alignment.CenterHorizontally) {
            Spacer(Modifier.height(8.dp))
            Text("HALKVAKT VARNAR", color = Natt, fontSize = 13.sp,
                fontFamily = FontFamily.Monospace, letterSpacing = 3.sp)
            Spacer(Modifier.weight(.8f))
            Text(kindTitle(w.kind), color = Natt, fontFamily = Cond,
                fontSize = 46.sp, lineHeight = 50.sp)
            Text(Nearby.distText(w.distanceM.toDouble()), color = Natt, fontFamily = Cond,
                fontSize = 84.sp, lineHeight = 88.sp)
            Spacer(Modifier.height(14.dp))
            Text("”${w.text}”", color = Natt.copy(alpha = .78f), fontSize = 17.sp,
                lineHeight = 24.sp, modifier = Modifier.padding(horizontal = 8.dp))
            Spacer(Modifier.weight(1f))
            Button(onClick = onAck, shape = RoundedCornerShape(50),
                colors = ButtonDefaults.buttonColors(containerColor = Natt, contentColor = Gul),
                modifier = Modifier.fillMaxWidth().height(64.dp)) {
                Text("Uppfattat", fontFamily = Cond, fontSize = 19.sp, letterSpacing = 1.sp)
            }
            Spacer(Modifier.height(10.dp))
        }
    }
}

@Composable
private fun TopBar() {
    val running by GuardService.runningFlow.collectAsStateWithLifecycle()
    val snapshot by GuardService.snapshotInfo.collectAsStateWithLifecycle()
    Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Filled.Warning, null, tint = Gul, modifier = Modifier.size(22.dp))
        Spacer(Modifier.width(8.dp))
        Text("Halkvakt", color = Text, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.weight(1f))
        when {
            running -> StatusPill("VAKTEN PÅ", Gul)
            snapshot != null -> StatusPill("LIVEDATA", GronLjus)
        }
    }
}

@Composable
private fun StatusPill(text: String, color: Color) {
    Surface(shape = RoundedCornerShape(50), color = color.copy(alpha = .12f),
        border = BorderStroke(1.dp, color.copy(alpha = .4f))) {
        Text("● $text", color = color, fontSize = 11.sp, fontFamily = FontFamily.Monospace,
            letterSpacing = 1.sp, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
    }
}

@Composable
private fun VaktScreen(activity: MainActivity) {
    val running by GuardService.runningFlow.collectAsStateWithLifecycle()
    DisposableEffect(running) {
        val w = activity.window
        if (running) w.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onDispose { w.clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
    }
    if (running) AktivContent(activity) else RedoContent(activity)
}

/* ---------- REDO ---------- */

@Composable
private fun RedoContent(activity: MainActivity) {
    val autostart by activity.autostartOn.collectAsStateWithLifecycle()
    val ctx = LocalContext.current
    val lastSaid by Prefs.history(ctx).collectAsStateWithLifecycle(initialValue = emptyList())   // #24
    val facitOn by Prefs.facitEnabled(ctx).collectAsStateWithLifecycle(initialValue = false)     // S4
    val facit by Prefs.facit(ctx).collectAsStateWithLifecycle(initialValue = emptyList())
    val scope = rememberCoroutineScope()
    val hazards by activity.hazards.collectAsStateWithLifecycle()
    val loc by activity.lastLoc.collectAsStateWithLifecycle()
    val snapshot by GuardService.snapshotInfo.collectAsStateWithLifecycle()
    val nearby = remember(hazards, loc) {
        loc?.let { (lon, lat) -> Nearby.nearest(hazards, lon, lat) } ?: emptyList()
    }

    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        item {
            Surface(shape = RoundedCornerShape(20.dp), color = Yta,
                border = BorderStroke(1.dp, Kant), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(18.dp)) {
                    Rubrik("STATUS")
                    // Skinnet v3: ETT ord i stort sans, som iOS VaktenView. Inte mono —
                    // mono är för siffror och etiketter.
                    Text("Redo.", color = Brand.text, fontSize = 64.sp,
                        fontFamily = Typo.sans, fontWeight = FontWeight.Bold,
                        letterSpacing = (-2.5).sp)
                    Text("Vakten lyssnar på vägen framför dig så fort du startar.",
                        color = Brand.dim, fontSize = 15.sp, fontFamily = Typo.sans,
                        lineHeight = 21.sp, modifier = Modifier.padding(top = 6.dp))
                    Spacer(Modifier.height(16.dp))
                    Button(onClick = { activity.onToggle() }, shape = RoundedCornerShape(50),
                        colors = ButtonDefaults.buttonColors(containerColor = Gron, contentColor = Color.White),
                        modifier = Modifier.fillMaxWidth().height(60.dp)) {
                        Icon(Icons.Filled.PlayArrow, null)
                        Spacer(Modifier.width(6.dp))
                        Text("Starta vakten", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.height(14.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Autostart", color = Text, fontSize = 15.sp)
                            Text("Startar när bilens Bluetooth kopplas", color = Dis, fontSize = 12.sp)
                        }
                        Switch(checked = autostart, onCheckedChange = { activity.onAutostartToggle() },
                            colors = SwitchDefaults.colors(checkedTrackColor = Gul, checkedThumbColor = Natt))
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            // #24: senast sagt — även när vakten är av. Förra körningens sista replik med
            // tid, ur den persisterade historiken. Tomt läge säger vad tystnaden betyder.
            // Nyaste SIST i historiken (AlertHistory.append) — firstOrNull visade den ÄLDSTA. Rättat 16/9 med S4.
            val senast = lastSaid.lastOrNull()
            LastSaidCard(senast, facitOn, senast?.let { Facit.answerFor(facit, it.id, it.t) }) { svar ->
                senast?.let { e -> scope.launch {
                    Prefs.answerFacit(ctx, e.id, e.t, svar)
                    // Vakten av = bilen står stilla: skicka direkt (DECISIONS #208). Under körning
                    // väntar svaret på stillastående i tjänsten, som förut.
                    if (!GuardService.running) withContext(Dispatchers.IO) { runCatching { FacitSender.flush(ctx) } }
                } }
            }
            Spacer(Modifier.height(20.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Rubrik("I NÄRHETEN")
                Spacer(Modifier.weight(1f))
                snapshot?.let { Text(it.substringAfter("· "), color = Dis, fontSize = 11.sp) }
            }
            Spacer(Modifier.height(8.dp))
        }
        if (nearby.isEmpty()) item {
            Text(
                if (loc == null) "Ger dig läget omkring dig så fort platsen är på — tryck start en första gång."
                else "Inget rapporterat inom sex mil just nu. Bra läge att köra.",
                color = Dis, fontSize = 13.sp)
        }
        items(nearby) { n -> NearbyCard(n); Spacer(Modifier.height(8.dp)) }
        item { Spacer(Modifier.height(12.dp)) }
    }
}

@Composable
private fun LastSaidCard(e: AlertEntry?, facitOn: Boolean = false, svar: Boolean? = null, onSvar: (Boolean) -> Unit = {}) {
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
            if (facitOn && e != null && e.id.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                Row {
                    FacitKnapp("Stämde", vald = svar == true) { onSvar(true) }
                    Spacer(Modifier.width(8.dp))
                    FacitKnapp("Stämde inte", vald = svar == false) { onSvar(false) }
                }
                Text(if (svar == null) "Stämde det? Svaret skickas när bilen står stilla." else "Tack — skickas när bilen står stilla.",
                    color = Dis, fontSize = 11.sp, modifier = Modifier.padding(top = 6.dp))
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

@Composable
private fun NearbyCard(n: NearbyItem) {
    Surface(shape = RoundedCornerShape(16.dp), color = Yta,
        border = BorderStroke(1.dp, Kant), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                KindChip(n.kind)
                Spacer(Modifier.weight(1f))
                Text(Nearby.distText(n.distM), color = kindColor(n.kind),
                    fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(6.dp))
            Text(kindTitle(n.kind), color = Text, fontSize = 15.sp)
            Text(listOfNotNull(n.secondary, kindSource(n.kind)).joinToString(" · "),
                color = Dis, fontSize = 12.sp, modifier = Modifier.padding(top = 2.dp))
        }
    }
}

@Composable
private fun KindChip(k: HazardKind) {
    val c = kindColor(k)
    Surface(shape = RoundedCornerShape(7.dp), color = c.copy(alpha = .13f)) {
        Text(kindChip(k), color = c, fontSize = 10.sp, fontFamily = FontFamily.Monospace,
            letterSpacing = 1.5.sp, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
    }
}

/* ---------- AKTIV (körläge) ---------- */

@Composable
private fun AktivContent(activity: MainActivity) {
    val session by GuardService.session.collectAsStateWithLifecycle()
    val hazards by activity.hazards.collectAsStateWithLifecycle()
    val ctx = LocalContext.current
    val warnM by remember { Prefs.warnDistanceM(ctx) }.collectAsStateWithLifecycle(initialValue = 3000f)
    var now by remember { mutableStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) { while (true) { delay(1000); now = System.currentTimeMillis() } }

    val minutes = ((now - session.startedAt) / 60000).coerceAtLeast(0)
    val nearby = remember(hazards, session.lon, session.lat) {
        session.lon?.let { lon -> session.lat?.let { lat -> Nearby.nearest(hazards, lon, lat) } } ?: emptyList()
    }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp)) {
        Surface(shape = RoundedCornerShape(20.dp), color = GronMork,
            border = BorderStroke(1.dp, GronKant), modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(18.dp)) {
                Text("PASSAGERAREN ÄR VAKEN", color = GronLjus, fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace, letterSpacing = 2.sp)
                Text("$minutes min · ${"%.0f".format(session.km)} km",
                    color = Text, fontSize = 34.sp, fontFamily = Cond,
                    modifier = Modifier.padding(top = 4.dp))
                Text("Rösten talar när något dyker upp inom ${"%.1f".format(warnM / 1000).replace('.', ',')} km framför dig.",
                    color = Dis, fontSize = 13.sp, modifier = Modifier.padding(top = 2.dp))
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatBox(session.counts.values.sum(), "Varningar", Modifier.weight(1f))
                    StatBox(session.counts[HazardKind.SLIPPERY_SEGMENT] ?: 0, "Halka", Modifier.weight(1f))
                    StatBox(session.counts[HazardKind.WILDLIFE] ?: 0, "Vilt", Modifier.weight(1f))
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        Surface(shape = RoundedCornerShape(16.dp), color = Yta,
            border = BorderStroke(1.dp, Gul.copy(alpha = .25f)), modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(14.dp)) {
                Row {
                    Rubrik("SENAST SAGT")
                    Spacer(Modifier.weight(1f))
                    session.lastSaid?.let {
                        Text(android.text.format.DateFormat.format("HH:mm", it.second).toString(),
                            color = Dis, fontSize = 11.sp)
                    }
                }
                Spacer(Modifier.height(4.dp))
                Text(session.lastSaid?.let { "”${it.first}”" }
                    ?: "Rösten säger till när något dyker upp — annars är den tyst.",
                    color = if (session.lastSaid != null) Text else Dis,
                    fontSize = 15.sp, fontStyle = FontStyle.Italic)
            }
        }
        Spacer(Modifier.height(18.dp))
        Rubrik("PÅ DIN VÄG")
        Spacer(Modifier.height(6.dp))
        if (nearby.isEmpty())
            Text("Fri väg så långt datat ser.", color = Dis, fontSize = 13.sp)
        nearby.forEach { n ->
            Row(Modifier.fillMaxWidth().padding(vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(Nearby.distText(n.distM), color = kindColor(n.kind), fontWeight = FontWeight.Bold,
                    fontSize = 14.sp, modifier = Modifier.width(64.dp))
                Column {
                    Text(kindTitle(n.kind), color = Text, fontSize = 14.sp)
                    n.secondary?.let { Text(it, color = Dis, fontSize = 12.sp) }
                }
            }
        }
        Spacer(Modifier.height(20.dp))
        OutlinedButton(onClick = { activity.onToggle() }, shape = RoundedCornerShape(50),
            border = BorderStroke(1.dp, Color(0xFF33424F)),
            modifier = Modifier.fillMaxWidth().height(56.dp)) {
            Text("Avsluta vakten", color = Text, fontSize = 16.sp)
        }
        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun StatBox(n: Int, label: String, modifier: Modifier = Modifier) {
    Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF10241A), modifier = modifier) {
        Column(Modifier.padding(vertical = 10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("$n", color = Text, fontSize = 22.sp, fontFamily = Cond)
            Text(label, color = Dis, fontSize = 11.sp)
        }
    }
}

@Composable private fun Rubrik(s: String) =
    Text(s, color = Gul, fontSize = 11.sp, fontFamily = FontFamily.Monospace, letterSpacing = 2.sp)

/* ---------- INSTÄLLNINGAR ---------- */

private val KIND_LABEL = mapOf(
    HazardKind.ACCIDENT to ("Olyckor & hinder" to "Trafikverkets pågående lägen"),
    HazardKind.SLIPPERY_SEGMENT to ("Halt väglag" to "Rapporterade hala vägsträckor"),
    HazardKind.ICING_POINT to ("Frysrisk" to "Vägväderstationer nära noll och vått"),
    HazardKind.WILDLIFE to ("Vilt" to "Polisens viltolyckor senaste dygnen"),
    HazardKind.CAMERA to ("Fartkameror" to "Fasta kameror på din väg"),
)

@Composable
private fun SettingsScreen(activity: MainActivity) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val disabled by remember { Prefs.disabledKinds(ctx) }.collectAsStateWithLifecycle(initialValue = emptySet())
    val warnPref by remember { Prefs.warnDistanceM(ctx) }.collectAsStateWithLifecycle(initialValue = 3000f)
    var slider by remember(warnPref) { mutableStateOf(warnPref) }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp)) {
        Text("Inställningar", color = Text, fontSize = 30.sp, fontFamily = Cond)
        Text("Fem källor. Slå av det du inte vill höra.", color = Dis, fontSize = 13.sp)
        Spacer(Modifier.height(18.dp))
        Rubrik("VARNA FÖR")
        Spacer(Modifier.height(8.dp))
        Surface(shape = RoundedCornerShape(18.dp), color = Yta,
            border = BorderStroke(1.dp, Kant), modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(horizontal = 14.dp, vertical = 4.dp)) {
                HazardKind.entries.forEachIndexed { i, kind ->
                    if (i > 0) HorizontalDivider(color = Kant)
                    val (label, desc) = KIND_LABEL[kind] ?: (kind.wire to "")
                    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(label, color = Text, fontSize = 15.sp)
                            Text(desc, color = Dis, fontSize = 12.sp)
                        }
                        Switch(checked = kind !in disabled,
                            onCheckedChange = { on -> scope.launch { Prefs.setKindEnabled(ctx, kind, on) } },
                            colors = SwitchDefaults.colors(checkedTrackColor = Gul, checkedThumbColor = Natt))
                    }
                }
            }
        }
        Spacer(Modifier.height(20.dp))
        Rubrik("RÖSTEN")
        run {
            val ctx2 = LocalContext.current
            TextButton(onClick = {
                runCatching { ctx2.startActivity(android.content.Intent("com.android.settings.TTS_SETTINGS")
                    .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)) }
            }, contentPadding = PaddingValues(vertical = 2.dp)) {
                Text("Röst · systemets svenska  ›", color = Color(0xFF7EC8E3), fontSize = 15.sp)
            }
        }
        Spacer(Modifier.height(8.dp))
        Surface(shape = RoundedCornerShape(18.dp), color = Yta,
            border = BorderStroke(1.dp, Kant), modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(14.dp)) {
                Row {
                    Text("Röst", color = Text, fontSize = 15.sp)
                    Spacer(Modifier.weight(1f))
                    Text("Svenska · systemets röst", color = Dis, fontSize = 13.sp)
                }
                HorizontalDivider(color = Kant, modifier = Modifier.padding(vertical = 10.dp))
                Row {
                    Text("Varna på avstånd", color = Text, fontSize = 15.sp)
                    Spacer(Modifier.weight(1f))
                    Text("${"%.1f".format(slider / 1000).replace('.', ',')} km",
                        color = Gul, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
                Slider(value = slider, onValueChange = { slider = it },
                    onValueChangeFinished = { scope.launch { Prefs.setWarnDistanceM(ctx, slider) } },
                    valueRange = 500f..5000f,
                    colors = SliderDefaults.colors(thumbColor = Gul, activeTrackColor = Gul, inactiveTrackColor = Kant))
                Row {
                    Text("Sent — 500 m", color = Dis, fontSize = 11.sp)
                    Spacer(Modifier.weight(1f))
                    Text("Tidigt — 5 km", color = Dis, fontSize = 11.sp)
                }
                Text("Gäller från nästa start av vakten.", color = Dis, fontSize = 11.sp,
                    modifier = Modifier.padding(top = 4.dp))
            }
        }
        Spacer(Modifier.height(16.dp))
        OutlinedButton(onClick = { activity.testVoice() }, shape = RoundedCornerShape(50),
            border = BorderStroke(1.dp, Gul), modifier = Modifier.fillMaxWidth().height(52.dp)) {
            Text("Testa rösten", color = Gul, fontFamily = Cond, fontSize = 16.sp, letterSpacing = 1.sp)
        }
        Text("Spelar en provvarning i samma kanal som riktiga varningar — bra för att ställa volymen i bilen.",
            color = Dis, fontSize = 12.sp, modifier = Modifier.padding(top = 6.dp))
        Spacer(Modifier.height(16.dp))

        // S4 — BETATEST (Bengt #186, Axel #196): av tills föraren själv slår på den. Texten säger exakt vad som skickas.
        val facitOn by remember { Prefs.facitEnabled(ctx) }.collectAsStateWithLifecycle(initialValue = false)
        Rubrik("BETATEST")
        Spacer(Modifier.height(8.dp))
        Surface(shape = RoundedCornerShape(18.dp), color = Yta,
            border = BorderStroke(1.dp, Kant), modifier = Modifier.fillMaxWidth()) {
            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Svara på varningarna", color = Text, fontSize = 15.sp)
                    Text("Efter en varning kan du trycka Stämde eller Stämde inte. Det som skickas är varningens id, " +
                        "klockslaget och ditt svar — inget konto, ingen resa, ingen position. Men ett varnings-id pekar på en " +
                        "fara på kartan, så vi ser ungefär var du var just då. Bara för betatestare.",
                        color = Dis, fontSize = 12.sp, lineHeight = 16.sp)
                }
                Switch(checked = facitOn, onCheckedChange = { on -> scope.launch { Prefs.setFacitEnabled(ctx, on) } },
                    colors = SwitchDefaults.colors(checkedTrackColor = Gul, checkedThumbColor = Natt))
            }
        }
        Spacer(Modifier.height(28.dp))
        OmScreen()   // #48: Om-fliken borttagen — innehållet är sista avsnittet här
    }
}

/* ---------- OM ---------- */

/** Om-avsnittet — sista delen av Inställningar sedan Om-fliken togs bort (DECISIONS #48). */
@Composable
private fun OmScreen() {
    val ctx = LocalContext.current
    val uri = LocalUriHandler.current
    val version = remember {
        runCatching { ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName }.getOrNull() ?: "?"
    }
    Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
        Rubrik("OM HALKVAKT")
        Spacer(Modifier.height(10.dp))
        Text("Halkvakt varnar dig med rösten — som en passagerare som läst allt Trafikverket vet om vägen framför dig.", color = Text)
        Spacer(Modifier.height(14.dp))
        Surface(shape = RoundedCornerShape(18.dp), color = Yta,
            border = BorderStroke(1.dp, Kant), modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(14.dp)) {
                Text("Din position lämnar aldrig telefonen.", color = Gul, fontWeight = FontWeight.Bold)
                Text("All matchning mot vägdata sker lokalt i appen. Inget konto, ingen spårning.",
                    color = Dis, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
                // S4: löftet skrivs om ordagrant (Axel #196) — det som skickas, när, och bara om du valt det.
                Text("Undantaget är betatestet, om du själv slår på det: då skickas varningens id, klockslag och ditt " +
                    "svar (Stämde / Stämde inte) — det säger ungefär var du var när rösten talade. Inget annat.",
                    color = Dis, fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp))
            }
        }
        Spacer(Modifier.height(18.dp))
        LinkRow("Livekartan — läget just nu") { uri.openUri("https://axelstar.github.io/halkvakt-karta/karta.html") }
        LinkRow("Om appen & vanliga frågor") { uri.openUri("https://axelstar.github.io/halkvakt-karta/om.html") }
        LinkRow("Press & material") { uri.openUri("https://axelstar.github.io/halkvakt-karta/press.html") }
        LinkRow("Integritetspolicy") { uri.openUri("https://axelstar.github.io/halkvakt-karta/integritet.html") }
        Spacer(Modifier.height(24.dp))
        Text("Version $version · Öppna data från Trafikverket (CC0) och Polisen",
            color = Dis, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
        Spacer(Modifier.height(8.dp))
    }
}

@Composable private fun LinkRow(label: String, onClick: () -> Unit) {
    TextButton(onClick = onClick, contentPadding = PaddingValues(0.dp)) {
        Text("→ $label", color = Teal)
    }
}
