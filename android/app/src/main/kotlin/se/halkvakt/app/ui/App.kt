// Halkvakts UI — Compose, tre flikar. Skill-regler som styr formen:
//  - EN lägsta ansvarig ägare per state: DataStore/tjänstens StateFlows äger allt,
//    composables KONSUMERAR via collectAsStateWithLifecycle. Ingen kopia i UI-lager.
//  - Behörighetstrappan bor kvar i MainActivity (Play-granskad logik) — UI:t ringer bara.
package se.halkvakt.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch
import se.halkvakt.app.AlertEntry
import se.halkvakt.app.AppEvents
import se.halkvakt.app.GuardService
import se.halkvakt.app.MainActivity
import se.halkvakt.app.Prefs
import se.halkvakt.engine.HazardKind

private val Gul = Color(0xFFFFC400)
private val Natt = Color(0xFF06090D)
private val Panel = Color(0xFF0E1B25)
private val Text = Color(0xFFF3F6F9)
private val Dis = Color(0xFF9FB3C8)
private val Gron = Color(0xFF1E7A46)
private val Rod = Color(0xFF8A2B2B)

private val Scheme = darkColorScheme(
    primary = Gul, onPrimary = Natt,
    background = Natt, onBackground = Text,
    surface = Panel, onSurface = Text,
    surfaceVariant = Color(0xFF14344A), onSurfaceVariant = Dis,
    secondary = Color(0xFF7EC8E3),
)

private val KIND_LABEL = mapOf(
    HazardKind.ACCIDENT to ("Olyckor & hinder" to "Trafikverkets pågående lägen"),
    HazardKind.SLIPPERY_SEGMENT to ("Halt väglag" to "Rapporterade hala vägsträckor"),
    HazardKind.ICING_POINT to ("Frysrisk" to "Vägväderstationer nära noll och vått"),
    HazardKind.WILDLIFE to ("Vilt" to "Polisens viltolyckor senaste dygnen"),
    HazardKind.CAMERA to ("Fartkameror" to "Fasta kameror på din väg"),
)

@Composable
fun HalkvaktApp(activity: MainActivity) {
    MaterialTheme(colorScheme = Scheme) {
        var tab by rememberSaveable { mutableStateOf(0) }
        Scaffold(
            containerColor = Natt,
            bottomBar = {
                NavigationBar(containerColor = Panel) {
                    NavigationBarItem(tab == 0, { tab = 0 }, { Icon(Icons.Filled.Warning, null) }, label = { Text("Vakten") })
                    NavigationBarItem(tab == 1, { tab = 1 }, { Icon(Icons.Filled.Settings, null) }, label = { Text("Inställningar") })
                    NavigationBarItem(tab == 2, { tab = 2 }, { Icon(Icons.Filled.Info, null) }, label = { Text("Om") })
                }
            }
        ) { pad ->
            Box(Modifier.padding(pad)) {
                when (tab) {
                    0 -> VaktScreen(activity)
                    1 -> SettingsScreen(activity)
                    else -> OmScreen()
                }
            }
        }
    }
}

@Composable
private fun VaktScreen(activity: MainActivity) {
    val running by GuardService.runningFlow.collectAsStateWithLifecycle()
    val snapshot by GuardService.snapshotInfo.collectAsStateWithLifecycle()
    val autostart by activity.autostartOn.collectAsStateWithLifecycle()
    val events by AppEvents.events.collectAsStateWithLifecycle()
    val ctx = LocalContext.current
    val history by remember { Prefs.history(ctx) }.collectAsStateWithLifecycle(initialValue = emptyList())

    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        Spacer(Modifier.height(20.dp))
        Text("⚠ HALKVAKT", color = Gul, fontSize = 26.sp,
            fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold,
            modifier = Modifier.align(Alignment.CenterHorizontally))
        Spacer(Modifier.height(6.dp))
        Text(
            if (running) "Vakten är på. Lägg undan telefonen och kör."
            else "Redo. Tryck start när du sätter dig i bilen.",
            color = Dis, modifier = Modifier.align(Alignment.CenterHorizontally))
        Spacer(Modifier.height(18.dp))

        Button(
            onClick = { activity.onToggle() },
            colors = ButtonDefaults.buttonColors(
                containerColor = if (running) Rod else Gron, contentColor = Color.White),
            modifier = Modifier.fillMaxWidth().height(84.dp)
        ) { Text(if (running) "STOPPA VAKTEN" else "STARTA VAKTEN", fontSize = 20.sp, fontWeight = FontWeight.Bold) }

        Spacer(Modifier.height(10.dp))
        Surface(shape = MaterialTheme.shapes.medium, color = Panel, modifier = Modifier.fillMaxWidth()) {
            Row(Modifier.padding(horizontal = 14.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Autostart", color = Text)
                    Text(if (autostart) "Vakten vaknar själv när du kör" else "Av — starta manuellt varje gång",
                        color = Dis, fontSize = 12.sp)
                }
                Switch(checked = autostart, onCheckedChange = { activity.onAutostartToggle() },
                    colors = SwitchDefaults.colors(checkedTrackColor = Gul, checkedThumbColor = Natt))
            }
        }
        snapshot?.let {
            Spacer(Modifier.height(8.dp))
            Text("Vägdata: $it", color = Dis, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
        }

        Spacer(Modifier.height(16.dp))
        LazyColumn(Modifier.weight(1f)) {
            item { Rubrik("HÄNDELSER") }
            items(events.asReversed()) { Text(it, color = Dis, fontSize = 12.sp, fontFamily = FontFamily.Monospace, modifier = Modifier.padding(vertical = 2.dp)) }
            if (history.isNotEmpty()) {
                item { Spacer(Modifier.height(12.dp)); Rubrik("TIDIGARE VARNINGAR") }
                items(history.asReversed().take(20)) { e -> HistoryRow(e) }
            }
        }
    }
}

@Composable private fun Rubrik(s: String) =
    Text(s, color = Gul, fontSize = 12.sp, fontFamily = FontFamily.Monospace, letterSpacing = 2.sp)

@Composable private fun HistoryRow(e: AlertEntry) {
    val tid = android.text.format.DateFormat.format("d/M HH:mm", e.t).toString()
    Row(Modifier.padding(vertical = 3.dp)) {
        Text(tid, color = Dis.copy(alpha = .7f), fontSize = 12.sp, fontFamily = FontFamily.Monospace)
        Spacer(Modifier.width(8.dp))
        Text(e.text, color = Text, fontSize = 13.sp)
    }
}

@Composable
private fun SettingsScreen(activity: MainActivity) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val disabled by remember { Prefs.disabledKinds(ctx) }.collectAsStateWithLifecycle(initialValue = emptySet())

    Column(Modifier.fillMaxSize().padding(20.dp)) {
        Rubrik("VARNA FÖR")
        Spacer(Modifier.height(6.dp))
        HazardKind.entries.forEach { kind ->
            val (label, desc) = KIND_LABEL[kind] ?: (kind.wire to "")
            Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(label, color = Text)
                    Text(desc, color = Dis, fontSize = 12.sp)
                }
                Switch(checked = kind !in disabled,
                    onCheckedChange = { on -> scope.launch { Prefs.setKindEnabled(ctx, kind, on) } },
                    colors = SwitchDefaults.colors(checkedTrackColor = Gul, checkedThumbColor = Natt))
            }
        }
        Spacer(Modifier.height(20.dp))
        Rubrik("RÖSTEN")
        Spacer(Modifier.height(8.dp))
        OutlinedButton(onClick = { activity.testVoice() }, modifier = Modifier.fillMaxWidth()) {
            Text("Testa rösten", color = Gul)
        }
        Text("Spelar en provvarning i samma kanal som riktiga varningar — bra för att ställa volymen i bilen.",
            color = Dis, fontSize = 12.sp, modifier = Modifier.padding(top = 6.dp))
    }
}

@Composable
private fun OmScreen() {
    val ctx = LocalContext.current
    val uri = LocalUriHandler.current
    val version = remember {
        runCatching { ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName }.getOrNull() ?: "?"
    }
    Column(Modifier.fillMaxSize().padding(20.dp)) {
        Rubrik("OM HALKVAKT")
        Spacer(Modifier.height(10.dp))
        Text("Halkvakt varnar dig med rösten — som en passagerare som läst allt Trafikverket vet om vägen framför dig.", color = Text)
        Spacer(Modifier.height(14.dp))
        Surface(shape = MaterialTheme.shapes.medium, color = Panel, modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(14.dp)) {
                Text("Din position lämnar aldrig telefonen.", color = Gul, fontWeight = FontWeight.Bold)
                Text("All matchning mot vägdata sker lokalt i appen. Inget konto, ingen spårning.",
                    color = Dis, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
            }
        }
        Spacer(Modifier.height(18.dp))
        LinkRow("Livekartan — läget just nu") { uri.openUri("https://axelstar.github.io/halkvakt-karta/karta.html") }
        LinkRow("Om appen & vanliga frågor") { uri.openUri("https://axelstar.github.io/halkvakt-karta/om.html") }
        LinkRow("Press & material") { uri.openUri("https://axelstar.github.io/halkvakt-karta/press.html") }
        Spacer(Modifier.weight(1f))
        Text("Version $version · Öppna data från Trafikverket (CC0) och Polisen",
            color = Dis, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
        Spacer(Modifier.height(8.dp))
    }
}

@Composable private fun LinkRow(label: String, onClick: () -> Unit) {
    TextButton(onClick = onClick, contentPadding = PaddingValues(0.dp)) {
        Text("→ $label", color = Color(0xFF7EC8E3))
    }
}
