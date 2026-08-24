// The guard: foreground location service. GPS fix → AlertEngine.step → Swedish TTS
// that DUCKS whatever is playing (Google Maps, Spotify) and restores it.
// Skeleton scope (BACKLOG #7): manual start/stop from MainActivity; snapshot loaded
// at service start + refreshed every 30 min (engine rebuilt — cooldown state reset
// accepted for skeleton, tracked in BACKLOG as engine.updateHazards).
package se.halkvakt.app

import android.app.*
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import com.google.android.gms.location.*
import se.halkvakt.engine.AlertEngine
import se.halkvakt.engine.Fix
import java.util.Locale
import kotlin.concurrent.thread

object AlertBus {
    @Volatile var onEvent: ((String) -> Unit)? = null
    fun post(msg: String) { onEvent?.invoke(msg) }
}

class GuardService : Service() {

    private var engine: AlertEngine? = null
    private lateinit var fused: FusedLocationProviderClient
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private lateinit var audio: AudioManager
    private var focusRequest: AudioFocusRequest? = null
    private var lastSnapshotLoad = 0L

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        audio = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        fused = LocationServices.getFusedLocationProviderClient(this)
        tts = TextToSpeech(this) { status ->
            if (status == TextToSpeech.SUCCESS) {
                tts?.language = Locale("sv", "SE")
                ttsReady = true
            }
        }
        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(id: String?) {}
            override fun onError(id: String?) { abandonFocus() }
            override fun onDone(id: String?) { abandonFocus() }
        })
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIF_ID, buildNotification("Halkvakt aktiv — inga varningar just nu"))
        loadSnapshotAsync()
        startLocationUpdates()
        AlertBus.post("Tjänsten startad. Laddar vägdata …")
        return START_STICKY
    }

    private fun loadSnapshotAsync() = thread {
        try {
            val hazards = SnapshotRepo.loadHazards(this)
            engine = AlertEngine(hazards)
            lastSnapshotLoad = System.currentTimeMillis()
            AlertBus.post("Vägdata laddad: ${hazards.size} faror i landet. Kör försiktigt.")
        } catch (e: Exception) {
            AlertBus.post("Kunde inte ladda vägdata: ${e.message}")
        }
    }

    private val callback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            val loc = result.lastLocation ?: return
            if (System.currentTimeMillis() - lastSnapshotLoad > 30 * 60 * 1000L) loadSnapshotAsync()
            val fix = Fix(
                t = loc.time / 1000.0,
                lon = loc.longitude, lat = loc.latitude,
                speedKmh = if (loc.hasSpeed()) loc.speed * 3.6 else null,
                headingDeg = if (loc.hasBearing()) bearingToDouble(loc.bearing) else null,
            )
            val alert = engine?.step(fix) ?: return
            speak(alert.text)
            AlertBus.post("🔊 ${alert.text} (${alert.distanceM} m)")
            updateNotification(alert.text)
        }
    }

    private fun bearingToDouble(b: Float): Double = ((b.toDouble()) % 360.0 + 360.0) % 360.0

    @Suppress("MissingPermission") // MainActivity gates start on granted permission
    private fun startLocationUpdates() {
        val req = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1000L)
            .setMinUpdateIntervalMillis(1000L)
            .build()
        fused.requestLocationUpdates(req, callback, Looper.getMainLooper())
    }

    private fun speak(text: String) {
        if (!ttsReady) return
        requestFocus()
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "hv-${System.nanoTime()}")
    }

    private fun requestFocus() {
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
        val fr = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
            .setAudioAttributes(attrs).build()
        focusRequest = fr
        audio.requestAudioFocus(fr)
        tts?.setAudioAttributes(attrs)
    }

    private fun abandonFocus() { focusRequest?.let { audio.abandonAudioFocusRequest(it) } }

    private fun buildNotification(text: String): Notification {
        val chId = "guard"
        if (Build.VERSION.SDK_INT >= 26) {
            val ch = NotificationChannel(chId, "Halkvakt", NotificationManager.IMPORTANCE_LOW)
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(ch)
        }
        val pi = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        return Notification.Builder(this, chId)
            .setContentTitle("Halkvakt")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pi)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification(text: String) {
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .notify(NOTIF_ID, buildNotification(text))
    }

    override fun onDestroy() {
        fused.removeLocationUpdates(callback)
        tts?.shutdown()
        AlertBus.post("Tjänsten stoppad.")
        super.onDestroy()
    }

    companion object {
        private const val NOTIF_ID = 1
        fun start(ctx: Context) = ctx.startForegroundService(Intent(ctx, GuardService::class.java))
        fun stop(ctx: Context) = ctx.stopService(Intent(ctx, GuardService::class.java))
    }
}
