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
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import se.halkvakt.engine.Fix
import se.halkvakt.engine.EngineConfig
import se.halkvakt.engine.Geo
import se.halkvakt.engine.HazardKind
import java.util.Locale
import kotlin.concurrent.thread

object AlertBus {
    @Volatile var onEvent: ((String) -> Unit)? = null
    fun post(msg: String) { onEvent?.invoke(msg) }
}

/** Körpassets bokföring — UI:t läser, tjänsten skriver. Nollställs per pass. */
data class Session(
    val startedAt: Long = 0L,
    val km: Double = 0.0,
    val counts: Map<HazardKind, Int> = emptyMap(),
    val lastSaid: Pair<String, Long>? = null,
    val lon: Double? = null, val lat: Double? = null,
)

class GuardService : Service() {

    /** Skill-regel: asynkront arbete har en explicit ägare och livstid = tjänstens. */
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var stillSinceMs = 0L
    private var flushedThisStop = false
    @Volatile private var disabledKinds: Set<HazardKind> = emptySet()
    private var prevLon = Double.NaN; private var prevLat = Double.NaN
    private var guard: Guard? = null
    private lateinit var fused: FusedLocationProviderClient
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private lateinit var audio: AudioManager
    private var focusRequest: AudioFocusRequest? = null
    private var lastSnapshotLoad = 0L
    private var staleAnnounced = false
    private val idleStop = IdleStop()   // #248: samma kvart som iOS

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        audio = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        fused = LocationServices.getFusedLocationProviderClient(this)
        scope.launch { Prefs.disabledKinds(this@GuardService).collect { disabledKinds = it } }
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
        prevLon = Double.NaN; prevLat = Double.NaN
        session.value = Session(startedAt = System.currentTimeMillis())
        staleAnnounced = false   // #250 (a): EN rad om gammal data per körning — nollställs här, inte vid laddningen
        // Resans fönster överlever tjänsten (kort #203): notisens knapp trycks minuter senare,
        // i en annan process, och måste veta vad "alla varningar" syftar på.
        scope.launch { Prefs.setTripStart(this@GuardService, session.value.startedAt) }
        loadSnapshotAsync()
        startLocationUpdates()
        AlertBus.post("Tjänsten startad. Laddar vägdata …")
        return START_STICKY
    }

    private fun loadSnapshotAsync() = thread {
        try {
            val snap = SnapshotRepo.loadSnapshot(this)
            val gate = AgeGate.filter(snap.hazards, snap.generatedAtMs, System.currentTimeMillis())
            val hazards = gate.hazards
            if (gate.stale && !staleAnnounced) { staleAnnounced = true; speak(AgeGate.STALE_LINE) }
            val dataTid = if (snap.generatedAtMs > 0)
                android.text.format.DateFormat.format("HH:mm", snap.generatedAtMs) else "okänd tid"
            val g = guard
            if (g == null) {
                val warnM = kotlinx.coroutines.runBlocking { Prefs.warnDistanceM(this@GuardService).first() }.toDouble()
                guard = Guard(hazards, cfg = EngineConfig(leadMaxM = warnM), speak = ::speak, notify = ::updateNotification, onEvent = AlertBus::post,
                    isEnabled = { it !in disabledKinds },
                    onAlert = { a ->
                        currentWarning.value = a
                        scope.launch { kotlinx.coroutines.delay(8000)
                            if (currentWarning.value === a) currentWarning.value = null }
                        session.value = session.value.let { s -> s.copy(
                            counts = s.counts + (a.kind to (s.counts[a.kind] ?: 0) + 1),
                            lastSaid = a.text to System.currentTimeMillis()) }
                        scope.launch {
                            Prefs.appendAlert(this@GuardService, AlertEntry((a.t * 1000).toLong(), a.kind.wire, a.text, a.hazardId)) } })
                AlertBus.post("Vägdata laddad: ${hazards.size} faror i landet. Kör försiktigt.")
                snapshotInfo.value = "${hazards.size} faror · väglag $dataTid"
            } else {
                // Mid-drive refresh: swap data, keep memory (never re-announce; v14 guards this).
                g.updateHazards(hazards)
                AlertBus.post("Vägdata uppdaterad: ${hazards.size} faror.")
                snapshotInfo.value = "${hazards.size} faror · väglag $dataTid"
            }
            lastSnapshotLoad = System.currentTimeMillis()
        } catch (e: Exception) {
            AlertBus.post("Kunde inte ladda vägdata: ${e.message}")
        }
    }

    private val callback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            val loc = result.lastLocation ?: return
            if (!prevLon.isNaN()) {
                val d = Geo.haversineM(prevLon, prevLat, loc.longitude, loc.latitude)
                if (d < 500) session.value = session.value.let { it.copy(
                    km = it.km + d / 1000.0, lon = loc.longitude, lat = loc.latitude) }
                else session.value = session.value.copy(lon = loc.longitude, lat = loc.latitude)
            } else session.value = session.value.copy(lon = loc.longitude, lat = loc.latitude)
            prevLon = loc.longitude; prevLat = loc.latitude
            if (System.currentTimeMillis() - lastSnapshotLoad > 30 * 60 * 1000L) loadSnapshotAsync()
            val fix = Fix(
                t = loc.time / 1000.0,
                lon = loc.longitude, lat = loc.latitude,
                speedKmh = if (loc.hasSpeed()) loc.speed * 3.6 else null,
                headingDeg = if (loc.hasBearing()) bearingToDouble(loc.bearing) else null,
            )
            if (idleStop.onFix(loc.time, fix.speedKmh)) {
                AlertBus.post("Stillastående en kvart — vakten stoppar själv.")
                AutostartManager.clearAutoStarted(this@GuardService)
                stopSelf()
                return
            }
            guard?.onLocation(fix)
            retuneCadence(fix.lon, fix.lat)
            // S4: facit skickas när bilen står stilla (≥ 30 s under 3 km/h), en gång per stopp — aldrig under körning.
            val still = (fix.speedKmh ?: 99.0) < 3.0
            if (!still) { stillSinceMs = 0L; flushedThisStop = false }
            else if (stillSinceMs == 0L) stillSinceMs = loc.time
            else if (!flushedThisStop && loc.time - stillSinceMs >= 30_000L) {
                flushedThisStop = true
                scope.launch(Dispatchers.IO) { runCatching { FacitSender.flush(this@GuardService) } }
            }
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
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIF_ID, buildNotification(text))
        headsUp(nm, text)
    }

    // #23: heads-up-varningen. Egen kanal med IMPORTANCE_HIGH så bannern lägger sig ÖVER
    // Google Maps/Waze i några sekunder och försvinner själv. Löftesvänlig form: ingen
    // ny behörighet (POST_NOTIFICATIONS finns redan för förgrundstjänsten), ingen knapp,
    // inget att trycka på — rösten är budskapet, bannern är bara ögats kvitto.
    // Kanalen är tyst (ljud null): rösten talar redan, ett plingsljud ovanpå vore tjat.
    private fun headsUp(nm: NotificationManager, text: String) {
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(HEADS_UP_CH) == null) {
            nm.createNotificationChannel(
                NotificationChannel(HEADS_UP_CH, "Varning under körning", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "Kort banner över kartappen när rösten varnar. Försvinner själv."
                    setSound(null, null)
                    enableVibration(false)
                }
            )
        }
        val pi = PendingIntent.getActivity(this, 1, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        nm.notify(
            HEADS_UP_ID,
            Notification.Builder(this, HEADS_UP_CH)
                .setContentTitle("Halkvakt")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setCategory(Notification.CATEGORY_NAVIGATION)
                .setContentIntent(pi)
                .setAutoCancel(true)
                .setTimeoutAfter(HEADS_UP_MS)
                .build()
        )
    }

    override fun onDestroy() {
        efterResan()          // FÖRE scope.cancel() — läser sitt eget, kortlivade scope
        scope.cancel()
        running = false
        fused.removeLocationUpdates(callback)
        tts?.shutdown()
        AlertBus.post("Tjänsten stoppad.")
        super.onDestroy()
    }

    /**
     * Frågan kommer till FÖRAREN — föraren letar aldrig (kort #203, Bengt 19/9: "som det är i dag är
     * det oerhört krångligt … det kommer inte många svar"). När vakten stannar, manuellt eller av
     * självstoppet, och resan lämnat obesvarade varningar: en notis med knapparna i sig, så att
     * svaret kan ges från låsskärmen utan att appen öppnas.
     *
     * Egen kortlivad scope med flit: tjänstens egen cancelas på nästa rad i onDestroy, och det här
     * är en läsning plus en notis. Ingen notis alls om betatestet är av — knappen finns bara för
     * den som själv slagit på den (#186).
     */
    private fun efterResan() {
        val sedan = session.value.startedAt
        if (sedan <= 0L) return
        val app = applicationContext
        CoroutineScope(Dispatchers.IO).launch {
            runCatching {
                if (!Prefs.facitEnabled(app).first()) return@runCatching
                val obes = Resan.obesvarade(Prefs.history(app).first(), Prefs.facit(app).first(), sedan)
                if (obes.isEmpty()) return@runCatching
                visaEfterResan(app, sedan, obes.size)
            }
        }
    }

    private fun visaEfterResan(ctx: Context, sedan: Long, antal: Int) {
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(EFTER_CH) == null) {
            nm.createNotificationChannel(
                NotificationChannel(EFTER_CH, "Efter resan", NotificationManager.IMPORTANCE_DEFAULT).apply {
                    description = "Frågan om varningarna stämde. Kommer en gång per resa, aldrig under körning."
                    setShowBadge(false)
                }
            )
        }
        val flaggor = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val ja = PendingIntent.getBroadcast(
            ctx, 3,
            Intent(ctx, FacitSvarReceiver::class.java)
                .setAction(FacitSvarReceiver.ACTION_JA)
                .putExtra(FacitSvarReceiver.EXTRA_SEDAN, sedan),
            flaggor)
        // "Något stämde inte" öppnar appen — avvikelsen måste pekas ut på en rad, och det går inte
        // från en notisknapp. Kortet överst på Redo. bär resans rader, så föraren landar rätt.
        val avvikelse = PendingIntent.getActivity(
            ctx, 4,
            Intent(ctx, MainActivity::class.java)
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            flaggor)
        nm.notify(
            FacitSvarReceiver.NOTIF_ID,
            Notification.Builder(ctx, EFTER_CH)
                .setContentTitle(Resan.fraga(antal))
                .setContentText("Ett tryck räcker. Tystnad räknas aldrig som ja.")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentIntent(avvikelse)
                .setAutoCancel(true)
                .addAction(0, "Ja, alla stämde", ja)
                .addAction(0, "Något stämde inte", avvikelse)
                .build()
        )
    }

    companion object {
        private const val NOTIF_ID = 1
        private const val EFTER_CH = "efter_resan"
        private const val HEADS_UP_CH = "heads_up"
        private const val HEADS_UP_ID = 2
        private const val HEADS_UP_MS = 8_000L  // samma 8 s som helskärmskortet
        /** UI observerar; autostart-limmet läser var-formen. Flow är sanningen. */
        val runningFlow = MutableStateFlow(false)
        val snapshotInfo = MutableStateFlow<String?>(null)
        val session = MutableStateFlow(Session())
        /** Helskärmskortet (1b): sätts vid uppläst varning, släcks efter 8 s eller "Uppfattat". */
        val currentWarning = MutableStateFlow<se.halkvakt.engine.Alert?>(null)
        var running: Boolean
            get() = runningFlow.value
            set(v) { runningFlow.value = v }
        fun start(ctx: Context) = ctx.startForegroundService(Intent(ctx, GuardService::class.java))
        fun stop(ctx: Context) = ctx.stopService(Intent(ctx, GuardService::class.java))
    }
}
