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
import se.halkvakt.engine.Fix
import java.util.Locale
import kotlin.concurrent.thread

object AlertBus {
    @Volatile var onEvent: ((String) -> Unit)? = null
    fun post(msg: String) { onEvent?.invoke(msg) }
}

class GuardService : Service() {

    private var guard: Guard? = null
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
                // Navigation-guidance stream: routes correctly over car Bluetooth and
                // follows the navigation volume the driver already trusts, not media.
                tts?.setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build())
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
        running = true
        loadSnapshotAsync()
        startLocationUpdates()
        AlertBus.post("Tjänsten startad. Laddar vägdata …")
        return START_STICKY
    }

    private fun loadSnapshotAsync() = thread {
        try {
            val hazards = SnapshotRepo.loadHazards(this)
            val g = guard
            if (g == null) {
                guard = Guard(hazards, speak = ::speak, notify = ::updateNotification, onEvent = AlertBus::post)
                AlertBus.post("Vägdata laddad: ${hazards.size} faror i landet. Kör försiktigt.")
            } else {
                // Mid-drive refresh: swap data, keep memory (never re-announce; v14 guards this).
                g.updateHazards(hazards)
                AlertBus.post("Vägdata uppdaterad: ${hazards.size} faror.")
            }
            lastSnapshotLoad = System.currentTimeMillis()
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
            guard?.onLocation(fix)
            retuneCadence(fix.lon, fix.lat)
        }
    }

    private fun bearingToDouble(b: Float): Double = ((b.toDouble()) % 360.0 + 360.0) % 360.0

    private var currentIntervalMs = 0L

    @Suppress("MissingPermission") // MainActivity gates start on granted permission
    private fun startLocationUpdates(intervalMs: Long = CadencePolicy.NEAR_MS) {
        currentIntervalMs = intervalMs
        val req = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, intervalMs)
            .setMinUpdateIntervalMillis(intervalMs)
            .build()
        fused.requestLocationUpdates(req, callback, Looper.getMainLooper())
    }

    /** Battery: far from every hazard → sparse GPS; near → full 1 Hz. Tiers proven in CadencePolicyTest. */
    @Suppress("MissingPermission")
    private fun retuneCadence(lon: Double, lat: Double) {
        val wanted = CadencePolicy.intervalMs(guard?.nearestHazardM(lon, lat))
        if (wanted != currentIntervalMs) {
            fused.removeLocationUpdates(callback)
            startLocationUpdates(wanted)
        }
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
        running = false
        fused.removeLocationUpdates(callback)
        tts?.shutdown()
        AlertBus.post("Tjänsten stoppad.")
        super.onDestroy()
    }

    companion object {
        private const val NOTIF_ID = 1
        /** Read by autostart glue: idempotent starts, BT learning. Set on the main thread. */
        @Volatile var running = false
        fun start(ctx: Context) = ctx.startForegroundService(Intent(ctx, GuardService::class.java))
        fun stop(ctx: Context) = ctx.stopService(Intent(ctx, GuardService::class.java))
    }
}
