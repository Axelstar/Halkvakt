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
import se.halkvakt.engine.Hazard
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

class MainActivity : ComponentActivity() {

    val autostartOn = MutableStateFlow(false)
    /** Snapshotten för "I närheten" — UI-läsning, tjänsten har sin egen kopia. */
    val hazards = MutableStateFlow<List<Hazard>>(emptyList())
    val stations = MutableStateFlow<List<Station>>(emptyList())
    val lastLoc = MutableStateFlow<Pair<Double, Double>?>(null)
    private var testTts: TextToSpeech? = null

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
        if (intent?.getBooleanExtra("auto_start", false) == true && hasPermissions() && !GuardService.running) onToggle()
        // S4: osända facitsvar går iväg när appen öppnas — bilen står stilla då.
        lifecycleScope.launch(Dispatchers.IO) { runCatching { FacitSender.flush(this@MainActivity) } }
        // Fotostudion (android.yml): visar facitknapparna på en påhittad varning. Bara debug-byggen.
        val debug = (applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0
        if (debug && intent?.getBooleanExtra("fotostudio_facit", false) == true) lifecycleScope.launch {
            Prefs.setFacitEnabled(this@MainActivity, true)
            Prefs.appendAlert(this@MainActivity, AlertEntry(System.currentTimeMillis(), "camera", "Fartkamera om femhundra meter.", "cam:fotostudio"))
            // #203 lager 2: en resa med en miss, så att Efter resan-kortet och missraden syns i bilden. En gång — kroken körs två
            // gånger per fotostudio. "wx:fotostudio" märks som prov i driver_miss (sql/038) om den någonsin skickas.
            if (Prefs.missar(this@MainActivity).first().isEmpty()) {
                val nu = System.currentTimeMillis()
                Prefs.setTripStart(this@MainActivity, nu - 10 * 60_000L)
                Prefs.markeraMiss(this@MainActivity, nu - 5 * 60_000L, "wx:fotostudio", null)
            }
        }
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
        if (!hasPermissions()) missing.add(Manifest.permission.ACCESS_FINE_LOCATION)
        if (Build.VERSION.SDK_INT >= 29 &&
            checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED)
            missing.add(Manifest.permission.ACTIVITY_RECOGNITION)
        if (Build.VERSION.SDK_INT >= 31 &&
            checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED)
            missing.add(Manifest.permission.BLUETOOTH_CONNECT)
        if (missing.isNotEmpty()) {
            AppEvents.post("Autostart behöver veta när du sitter i ett fordon (rörelseigenkänning) och när bilens Bluetooth kopplar upp.")
            requestPermissions(missing.toTypedArray(), 2); return
        }
        if (Build.VERSION.SDK_INT >= 29 &&
            checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            AppEvents.post("Sista steget: välj \"Tillåt hela tiden\" för platsen — annars får vakten inte se vägen när den startar sig själv i bakgrunden.")
            requestPermissions(arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION), 3); return
        }
        AutostartManager.setEnabled(this, true)
        autostartOn.value = true
        AppEvents.post("Autostart på. Vakten lär sig bilens Bluetooth vid nästa körning.")
    }

    fun onToggle() {
        if (!GuardService.running) {
            if (!hasPermissions()) { requestStartPermissions(); return }
            GuardService.start(this)
        } else {
            GuardService.stop(this)
            AutostartManager.clearAutoStarted(this)   // #248: persisted, not a throwaway controller
        }
    }

    /** Provvarning i samma TTS-kanal som riktiga varningar — volymkontroll i bilen. */
    fun testVoice() {
        val text = "Fartkamera om 500 meter. Gränsen är 80."   // en riktig motorreplik (DECISIONS #443)
        if (testTts == null) {
            testTts = TextToSpeech(this) { st ->
                if (st == TextToSpeech.SUCCESS) {
                    testTts?.language = Locale("sv", "SE")
                    testTts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "hv-test")
                } else AppEvents.post("Ingen svensk röst hittades — kontrollera systemets talsyntes-inställningar.")
            }
        } else testTts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "hv-test")
    }

    private fun hasPermissions(): Boolean =
        checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

    private fun requestStartPermissions() {
        val wanted = mutableListOf(Manifest.permission.ACCESS_FINE_LOCATION)
        if (Build.VERSION.SDK_INT >= 33) wanted.add(Manifest.permission.POST_NOTIFICATIONS)
        AppEvents.post("Halkvakt behöver din plats för att veta vad som finns på vägen framför dig. Positionen lämnar inte telefonen av sig själv.")
        requestPermissions(wanted.toTypedArray(), 1)
    }

    @Deprecated("Deprecated in Java")
    override fun onRequestPermissionsResult(code: Int, perms: Array<String>, results: IntArray) {
        super.onRequestPermissionsResult(code, perms, results)
        when (code) {
            1 -> if (hasPermissions()) onToggle() else AppEvents.post("Utan platsbehörighet kan vakten inte varna. Ge behörighet och försök igen.")
            2, 3 -> onAutostartToggle() // klättra vidare i trappan; avslutas när allt är på plats
        }
    }

    override fun onResume() {
        super.onResume()
        autostartOn.value = AutostartManager.isEnabled(this)
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
