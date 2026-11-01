// Värd-aktiviteten: Compose-UI:t (ui/App.kt) + behörighetstrappan.
// Trappan är PORTERAD ORDAGRANT från View-versionen — det är Play-anpassad logik
// (bakgrundsplats MÅSTE begäras i separat steg, kod 2→3) och ändras aldrig av UI-skäl.
package se.halkvakt.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.speech.tts.TextToSpeech
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.lifecycleScope
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import se.halkvakt.engine.Alert
import se.halkvakt.engine.Hazard
import se.halkvakt.engine.HazardKind
import se.halkvakt.engine.Texts
import se.halkvakt.engine.WarningCard
import androidx.activity.compose.setContent
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import se.halkvakt.app.ui.HalkvaktApp
import java.util.Locale

/** UI-loggens enda ägare — Compose konsumerar Flow:n, tjänsten postar via AlertBus. */
object AppEvents {
    val events = MutableStateFlow<List<String>>(emptyList())
    fun post(msg: String) {
        val time = android.text.format.DateFormat.format("HH:mm:ss", System.currentTimeMillis())
        events.value = (events.value + "[$time] $msg").takeLast(80)
    }
}

/** The explanation shown BEFORE an Android permission dialog (Play's prominent disclosure; iOS has it in the intro). */
data class Disclosure(val titel: String, val text: String, val onFortsatt: () -> Unit)

class MainActivity : ComponentActivity() {

    val autostartOn = MutableStateFlow(false)
    /** Snapshotten för "I närheten" — UI-läsning, tjänsten har sin egen kopia. */
    val hazards = MutableStateFlow<List<Hazard>>(emptyList())
    val stations = MutableStateFlow<List<Station>>(emptyList())
    val lastLoc = MutableStateFlow<Pair<Double, Double>?>(null)
    private var testTts: TextToSpeech? = null
    /** Visible replacement for the log nobody saw: why the guard did not start, what is missing. */
    val notice = MutableStateFlow<String?>(null)
    val disclosure = MutableStateFlow<Disclosure?>(null)
    private var askedNotifications = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        AlertBus.onEvent = AppEvents::post
        autostartOn.value = AutostartManager.isEnabled(this)
        setContent { HalkvaktApp(this) }
        lifecycleScope.launch(Dispatchers.IO) {
            runCatching { SnapshotRepo.loadSnapshot(this@MainActivity) }
                .onSuccess { snap ->
                    val gate = AgeGate.filter(snap.hazards, snap.generatedAtMs, System.currentTimeMillis())
                    hazards.value = gate.hazards
                    stations.value = snap.stations   // #203 lager 2: missknappens plats
                    // Datans tid (generated_at) — inte nedladdningens (Bengts granskning).
                    val tid = if (snap.generatedAtMs > 0)
                        android.text.format.DateFormat.format("HH:mm", snap.generatedAtMs) else "okänd tid"
                    GuardService.snapshotInfo.value = "${gate.hazards.size} faror · väglag $tid"
                }
        }
        handleAutoStart(intent)
        // S4: osända facitsvar går iväg när appen öppnas — bilen står stilla då.
        lifecycleScope.launch(Dispatchers.IO) { runCatching { FacitSender.flush(this@MainActivity) } }
        // Fotostudion (android.yml): visar facitknapparna på en påhittad varning. Bara debug-byggen.
        val debug = (applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0
        if (debug && intent?.getBooleanExtra("fotostudio_facit", false) == true) lifecycleScope.launch {
            Prefs.setFacitEnabled(this@MainActivity, true)
            Prefs.appendAlert(this@MainActivity, AlertEntry(System.currentTimeMillis(), "camera", "Fartkamera om 500 meter.", "cam:fotostudio"))
            // #203 lager 2: en resa med en miss, så att Efter resan-kortet och missraden syns i bilden. En gång — kroken körs två
            // gånger per fotostudio. "wx:fotostudio" märks som prov i driver_miss (sql/038) om den någonsin skickas.
            if (Prefs.missar(this@MainActivity).first().isEmpty()) {
                val nu = System.currentTimeMillis()
                Prefs.setTripStart(this@MainActivity, nu - 10 * 60_000L)
                Prefs.markeraMiss(this@MainActivity, nu - 5 * 60_000L, "wx:fotostudio", null)
            }
            // Redo efter tur (designen v2, DECISIONS #444): turen är slut, kvittot syns under betatestets kort.
            Prefs.setTripEnd(this@MainActivity, System.currentTimeMillis() + 1_000L, 31f)
        }
        // Fotostudion: betakortet (S3, DECISIONS #524) på en påhittad varning, för produktboken (#525). Bara debug-byggen.
        if (debug && intent?.getBooleanExtra("fotostudio_beta", false) == true) {
            val a = Alert(System.currentTimeMillis() / 1000.0, "wx:fotostudio", HazardKind.ICING_POINT, 655, Texts.EFTERHALKA_TEXT, beta = true)
            GuardService.currentWarning.value = ShownWarning(a, WarningCard.make(a, null))
        }
        // Fotostudion: kandidatens betakort (DECISIONS #577) på en påhittad varning, för produktboken. Bara debug-byggen.
        if (debug && intent?.getBooleanExtra("fotostudio_kandidat", false) == true) {
            val a = Alert(System.currentTimeMillis() / 1000.0, "kand:fotostudio", HazardKind.KANDIDAT, 655, Texts.KANDIDAT_TEXT, beta = true)
            GuardService.currentWarning.value = ShownWarning(a, WarningCard.make(a, null))
        }
        // Fotostudion: favoriterna (kort #357) — brytaren på, en sparad resa och en som väntar på svar, så att frågan på Redo. och
        // fliken syns i produktboken. Påhittade vägar, aldrig en riktig resa. Betatestets kort stängs av så att frågan syns överst.
        if (debug && intent?.getBooleanExtra("fotostudio_favoriter", false) == true) lifecycleScope.launch {
            Prefs.setFacitEnabled(this@MainActivity, false)
            Prefs.setFavErbjud(this@MainActivity, true)
            val l = Favoriter.lager(this@MainActivity)
            val resa = { lat0: Double -> l.resanBorjar(true); repeat(400) { i -> l.fix(18.063, lat0 + i * 85 / 111_320.0) }; l.resanSlutar(34.0, 30.0) }
            if (l.rutter.value.isEmpty()) { resa(59.20); l.spara("Till jobbet") }
            if (l.vantande.value == null) resa(59.33)
        }
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        handleAutoStart(intent)   // the "Kör du?" notification while the app is already open
    }

    private fun handleAutoStart(i: android.content.Intent?) {
        if (i?.getBooleanExtra("auto_start", false) == true && hasPermissions() && !GuardService.running) onToggle()
    }

    /** iOS's long-press on "På vakt" (kort #280): a sample card for 8 s, no voice — App Review sees a warning without driving. */
    fun demoWarning() {
        val a = Alert(0.0, "demo", HazardKind.SLIPPERY_SEGMENT, 900, "Varning: halka rapporterad på vägen framför dig.")
        val shown = ShownWarning(a, WarningCard.make(a, null))
        GuardService.currentWarning.value = shown
        lifecycleScope.launch { kotlinx.coroutines.delay(8000); if (GuardService.currentWarning.value === shown) GuardService.currentWarning.value = null }
    }

    /**
     * Autostart-trappan (oförändrad semantik). Android FORCES background location
     * ("Allow all the time") to be requested in a separate step after foreground
     * location — hence code 2→3.
     */
    fun onAutostartToggle() {
        if (AutostartManager.isEnabled(this)) {
            AutostartManager.setEnabled(this, false)
            autostartOn.value = false
            AppEvents.post("Autostart av.")
            return
        }
        val missing = mutableListOf<String>()
        if (!hasPermissions()) missing.addAll(LOCATION)
        if (Build.VERSION.SDK_INT >= 29 &&
            checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED)
            missing.add(Manifest.permission.ACTIVITY_RECOGNITION)
        if (Build.VERSION.SDK_INT >= 31 &&
            checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED)
            missing.add(Manifest.permission.BLUETOOTH_CONNECT)
        // Notifications once per session only: they are optional, and re-adding a denied one re-opened this step forever.
        if (Build.VERSION.SDK_INT >= 33 && !notificationsOk() && !askedNotifications) missing.add(Manifest.permission.POST_NOTIFICATIONS)
        if (missing.isNotEmpty()) {
            if (Manifest.permission.POST_NOTIFICATIONS in missing) askedNotifications = true
            disclosure.value = Disclosure("Vakten vaknar själv",
                "För att starta själv behöver vakten din plats, se när du åker bil (rörelseigenkänning) och när bilens Bluetooth kopplar upp. " +
                    "Notisen \"Halkvakt vaktar\" visar när den är på. Din position lämnar inte telefonen av sig själv.") {
                requestPermissions(missing.toTypedArray(), 2)
            }
            return
        }
        if (Build.VERSION.SDK_INT >= 29 &&
            checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            disclosure.value = Disclosure("Platsen även i bakgrunden",
                "Halkvakt läser din plats även när appen är stängd eller skärmen släckt, så att vakten kan starta själv när du börjar köra och " +
                    "varna medan du kör. Platsen läses bara medan vakten är på och notisen \"Halkvakt vaktar\" syns. Matchningen sker i telefonen — " +
                    "positionen skickas aldrig av sig själv.\n\nVälj \"Tillåt hela tiden\" på nästa sida.") {
                requestPermissions(arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION), 3)
            }
            return
        }
        AutostartManager.setEnabled(this, true)
        autostartOn.value = true
        notice.value = null
        AppEvents.post("Autostart på. Vakten lär sig bilens Bluetooth vid nästa körning.")
    }

    fun onToggle() {
        if (!GuardService.running) {
            if (!hasPermissions()) {
                disclosure.value = Disclosure("Platsen — bara i telefonen",
                    "Halkvakt läser din plats medan vakten är på, för att veta vad som finns på vägen framför dig. " +
                        "Matchningen sker i telefonen — positionen skickas aldrig av sig själv.\n\nVälj \"Exakt\" och \"När appen används\" på nästa sida.",
                    ::requestStartPermissions)
                return
            }
            // The notification permission used to be asked only together with the first location question,
            // so with location already granted it was never asked — and Android 13+ hid "Halkvakt vaktar".
            if (Build.VERSION.SDK_INT >= 33 && !notificationsOk() && !askedNotifications) {
                askedNotifications = true
                requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 4); return
            }
            notice.value = if (notificationsOk()) null
                else "Notiser är av: vakten varnar med rösten, men \"Halkvakt vaktar\" och bannern syns inte."
            GuardService.start(this)
        } else {
            GuardService.stop(this)
            AutostartManager.clearAutoStarted(this)   // #248: persisted, not a throwaway controller
        }
    }

    /** Provvarning i samma ljudkanal som riktiga varningar (Voice.ATTRS) — volymkontroll i bilen. */
    fun testVoice() {
        val text = "Fartkamera om 500 meter. Gränsen är 80."   // en riktig motorreplik (DECISIONS #444)
        testTts?.let { it.speak(text, TextToSpeech.QUEUE_FLUSH, null, "hv-test"); return }
        testTts = TextToSpeech(this) { st ->
            if (st == TextToSpeech.SUCCESS) {
                val problem = Voice.problem(testTts?.setLanguage(Locale("sv", "SE")) ?: TextToSpeech.LANG_NOT_SUPPORTED)
                GuardService.voiceProblem.value = problem
                testTts?.setAudioAttributes(Voice.ATTRS)
                testTts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "hv-test")
            } else {
                GuardService.voiceProblem.value = Voice.NO_ENGINE
                testTts?.shutdown(); testTts = null   // a failed engine is never reused; the next tap tries again
            }
        }
    }

    fun openAppSettings() = runCatching {
        startActivity(android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            android.net.Uri.fromParts("package", packageName, null)))
    }

    fun openVoiceSettings() = runCatching { startActivity(android.content.Intent("com.android.settings.TTS_SETTINGS")) }

    private fun notificationsOk(): Boolean =
        (getSystemService(android.app.NotificationManager::class.java)).areNotificationsEnabled()

    private fun hasPermissions(): Boolean =
        checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

    /** Notifications are optional for autostart's step 2 (a denial there must not block the climb). */
    private fun hasAllAutostart(): Boolean = hasPermissions() &&
        (Build.VERSION.SDK_INT < 29 || checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED) &&
        (Build.VERSION.SDK_INT < 31 || checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED)

    private companion object {
        /** Android 12+ ignores a FINE request without COARSE (targetSdk 31+). */
        val LOCATION = listOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
    }

    private fun requestStartPermissions() {
        val wanted = LOCATION.toMutableList()
        if (Build.VERSION.SDK_INT >= 33 && !notificationsOk()) { wanted.add(Manifest.permission.POST_NOTIFICATIONS); askedNotifications = true }
        requestPermissions(wanted.toTypedArray(), 1)
    }

    @Deprecated("Deprecated in Java")
    override fun onRequestPermissionsResult(code: Int, perms: Array<String>, results: IntArray) {
        super.onRequestPermissionsResult(code, perms, results)
        val granted = results.isNotEmpty() && results.all { it == PackageManager.PERMISSION_GRANTED }
        // #772: ett nej i platsrutan räknas här; ett ja räknas i onResume, som följer efter rutan.
        if (Manifest.permission.ACCESS_FINE_LOCATION in perms && !hasPermissions())
            lifecycleScope.launch(Dispatchers.IO) { runCatching { Raknare.behorighet(this@MainActivity, nekad = true) } }
        when (code) {
            1 -> if (hasPermissions()) onToggle()
                 else notice.value = if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED)
                     "Ungefärlig plats räcker inte — välj \"Exakt plats\" för Halkvakt under Plats i appens inställningar."
                     else "Platsen är av. Utan plats vet vakten inte vad som ligger framför dig."
            4 -> onToggle()   // starts with or without notifications; asked once per app session
            // Climb on only when this step was granted — re-asking after a denial looped (and reopened Settings forever).
            2 -> if (granted || hasAllAutostart()) onAutostartToggle()
                 else notice.value = "Autostart är av: den behöver plats, rörelseigenkänning, Bluetooth och notiser. Slå på dem i appens inställningar."
            3 -> if (granted) onAutostartToggle()
                 else notice.value = "Autostart är av: välj \"Tillåt hela tiden\" under Plats i appens inställningar och slå på igen."
        }
    }

    override fun onResume() {
        super.onResume()
        autostartOn.value = AutostartManager.isEnabled(this)
        // #772: behörigheten som den ser ut nu (en gång per enhet och värde), och räknarens kö går iväg — appen är öppen, bilen står.
        lifecycleScope.launch(Dispatchers.IO) { runCatching { Raknare.behorighet(this@MainActivity); Raknare.flush(this@MainActivity) } }
        if (hasPermissions()) {
            val fused = LocationServices.getFusedLocationProviderClient(this)
            fused.lastLocation.addOnSuccessListener { l ->
                if (l != null) lastLoc.value = l.longitude to l.latitude
                else fused.getCurrentLocation(com.google.android.gms.location.Priority.PRIORITY_BALANCED_POWER_ACCURACY,
                        com.google.android.gms.tasks.CancellationTokenSource().token)
                    .addOnSuccessListener { c -> c?.let { lastLoc.value = it.longitude to it.latitude } }
            }
        }
    }

    override fun onDestroy() {
        AlertBus.onEvent = null
        testTts?.shutdown()
        super.onDestroy()
    }
}
