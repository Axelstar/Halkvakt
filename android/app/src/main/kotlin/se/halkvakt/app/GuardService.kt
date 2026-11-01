// The guard: foreground location service. GPS fix → AlertEngine.step → Swedish TTS
// that DUCKS whatever is playing (Google Maps, Spotify) and restores it.
// Skeleton scope (BACKLOG #7): manual start/stop from MainActivity; snapshot loaded
// at service start + refreshed on publicera's two-minute grid, SnapshotSchedule and DECISIONS #741 (engine rebuilt — cooldown
// state reset accepted for skeleton, tracked in BACKLOG as engine.updateHazards).
package se.halkvakt.app

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.BatteryManager
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
import se.halkvakt.engine.Hazard
import se.halkvakt.engine.HazardKind
import se.halkvakt.engine.PointHazard
import se.halkvakt.engine.WarningCard
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
    @Volatile private var ttsReady = false
    /** Det som sades innan talmotorn var klar (gammal data direkt vid start) — talas så fort den är det, aldrig tappat. */
    @Volatile private var pendingSpeech: String? = null
    private lateinit var audio: AudioManager
    private var focusRequest: AudioFocusRequest? = null
    private val snapshotSchedule = SnapshotSchedule()   // #218, #741: one load at a time, on the publication grid
    /** Den laddade vägdatan — kortet slår upp farans metadata här. Skrivs i laddtråden, läses i varningen. */
    @Volatile private var hazardsNow: List<Hazard> = emptyList()
    /** Mätningen (DECISIONS #741 punkt 5): resans varv, bara i telefonen. Sätts vid start, räknas i laddtråden. */
    @Volatile private var matare: Matare? = null
    private val idleStop = IdleStop()   // #248: samma kvart som iOS

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        audio = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        fused = LocationServices.getFusedLocationProviderClient(this)
        scope.launch { Prefs.disabledKinds(this@GuardService).collect { disabledKinds = it } }
        tts = TextToSpeech(this) { status ->
            if (status == TextToSpeech.SUCCESS) {
                // A missing Swedish voice used to fail silently (or read Swedish with an English voice).
                voiceProblem.value = Voice.problem(tts?.setLanguage(Locale("sv", "SE")) ?: TextToSpeech.LANG_NOT_SUPPORTED)
                // Navigation-guidance stream: routes correctly over car Bluetooth and
                // follows the navigation volume the driver already trusts, not media.
                tts?.setAudioAttributes(Voice.ATTRS)
                ttsReady = true
                pendingSpeech?.let { pendingSpeech = null; speak(it) }
            } else {
                voiceProblem.value = Voice.NO_ENGINE
                AlertBus.post(Voice.NO_ENGINE)
            }
        }
        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(id: String?) {}
            override fun onError(id: String?) { abandonFocus() }
            override fun onDone(id: String?) { abandonFocus() }
        })
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIF_ID, buildNotification(IDLE_TEXT))
        running = true
        val sjalv = AutostartManager.controller(this).isAutoStarted()
        scope.launch { Raknare.vaktStartad(this@GuardService, sjalv) }   // #772: ett ord i kön, skickas vid nästa stopp
        prevLon = Double.NaN; prevLat = Double.NaN
        session.value = Session(startedAt = System.currentTimeMillis())
        matare = Matare(session.value.startedAt, batteri())
        // Resans fönster överlever tjänsten (kort #203): notisens knapp trycks minuter senare,
        // i en annan process, och måste veta vad "alla varningar" syftar på.
        scope.launch { Prefs.setTripStart(this@GuardService, session.value.startedAt) }
        // Kort #357: insamlingen bara med brytaren på. På huvudtråden, som positionerna — de första fixarna före läsningen tappas.
        val app = applicationContext
        scope.launch(Dispatchers.Main) { Favoriter.lager(app).resanBorjar(Prefs.favErbjud(app).first()) }
        loadSnapshotAsync(force = true)
        startLocationUpdates()
        AlertBus.post("Tjänsten startad. Laddar vägdata …")
        return START_STICKY
    }

    private fun loadSnapshotAsync(force: Boolean = false) {
        if (snapshotSchedule.tryBegin(System.currentTimeMillis(), force)) thread { loadSnapshot() }
    }

    private fun loadSnapshot() {
        var utfall = SnapshotRepo.Utfall.FEL; var gen = 0L
        var laddad: SnapshotRepo.Snapshot? = null
        try {
            val snap = SnapshotRepo.loadSnapshot(this)
            laddad = snap
            val gate = AgeGate.filter(snap.hazards, snap.generatedAtMs, System.currentTimeMillis())
            val hazards = gate.hazards
            hazardsNow = hazards
            dataStale.value = gate.stale
            val dataTid = if (snap.generatedAtMs > 0)
                android.text.format.DateFormat.format("HH:mm", snap.generatedAtMs) else "okänd tid"
            val g = guard
            if (g == null) {
                val warnM = kotlinx.coroutines.runBlocking { Prefs.warnDistanceM(this@GuardService).first() }.toDouble()
                guard = Guard(hazards, cfg = EngineConfig(leadMaxM = warnM), speak = ::speak, notify = ::updateNotification, onEvent = AlertBus::post,
                    // Kandidaten (#577) följer reglaget Halka i Varna för — den säger halka, och har inget eget reglage.
                    isEnabled = { (if (it == HazardKind.KANDIDAT) HazardKind.SLIPPERY_SEGMENT else it) !in disabledKinds },
                    onAlert = { a ->
                        // Kortet (DECISIONS #444) slår upp farans metadata: vägnummer, gräns, bro, röjningstid.
                        val meta = (hazardsNow.firstOrNull { it.id == a.hazardId } as? PointHazard)?.meta
                        val shown = ShownWarning(a, WarningCard.make(a, meta))
                        currentWarning.value = shown
                        scope.launch { kotlinx.coroutines.delay(8000)
                            if (currentWarning.value === shown) currentWarning.value = null }
                        session.value = session.value.let { s -> s.copy(
                            counts = s.counts + (a.kind to (s.counts[a.kind] ?: 0) + 1),
                            lastSaid = a.text to System.currentTimeMillis()) }
                        scope.launch {
                            Prefs.appendAlert(this@GuardService, AlertEntry((a.t * 1000).toLong(), a.kind.wire, a.text, a.hazardId))
                            Raknare.forstaVarningen(this@GuardService) } })   // #772: en gång per enhet
                AlertBus.post("Vägdata laddad: ${hazards.size} faror i landet. Kör försiktigt.")
                snapshotInfo.value = "${hazards.size} faror · väglag $dataTid"
            } else {
                // Mid-drive refresh: swap data, keep memory (never re-announce; v14 guards this).
                g.updateHazards(hazards)
                AlertBus.post("Vägdata uppdaterad: ${hazards.size} faror.")
                snapshotInfo.value = "${hazards.size} faror · väglag $dataTid"
            }
            utfall = snap.utfall; gen = snap.generatedAtMs   // takten (#741): FEL, och den sparade filen, prövas om efter en minut
        } catch (e: Exception) {
            AlertBus.post("Kunde inte ladda vägdata: ${e.message}")
        } finally {
            val nu = System.currentTimeMillis()
            matare?.varv(nu, laddad)   // null: laddningen kastade, ett varv utan källa
            snapshotSchedule.done(nu, utfall, gen)
        }
    }

    /** Batterinivån i procent ur den klibbiga ACTION_BATTERY_CHANGED; null när den inte går att läsa (mätningen, #741 punkt 5). */
    private fun batteri(): Int? = runCatching {
        registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))?.let { i ->
            val niva = i.getIntExtra(BatteryManager.EXTRA_LEVEL, -1); val skala = i.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
            if (niva < 0 || skala <= 0) null else niva * 100 / skala
        }
    }.getOrNull()

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
            if (loc.hasAccuracy()) Favoriter.lager(this@GuardService).fix(loc.longitude, loc.latitude)   // kort #357
            loadSnapshotAsync()   // the schedule decides; most fixes start nothing
            val fix = Fix(
                t = loc.time / 1000.0,
                lon = loc.longitude, lat = loc.latitude,
                speedKmh = if (loc.hasSpeed()) loc.speed * 3.6 else null,
                headingDeg = if (loc.hasBearing()) bearingToDouble(loc.bearing) else null,
            )
            if (idleStop.onFix(loc.time, fix.lon, fix.lat)) {
                AlertBus.post("Stillastående en kvart — vakten stoppar själv.")
                AutostartManager.clearAutoStarted(this@GuardService)
                stopSelf()
                return
            }
            guard?.onLocation(fix)
            retuneCadence(fix.lon, fix.lat, fix.speedKmh)
            // S4: facit skickas när bilen står stilla (≥ 30 s under 3 km/h), en gång per stopp — aldrig under körning.
            val still = (fix.speedKmh ?: 99.0) < 3.0
            if (!still) { stillSinceMs = 0L; flushedThisStop = false }
            else if (stillSinceMs == 0L) stillSinceMs = loc.time
            else if (!flushedThisStop && loc.time - stillSinceMs >= 30_000L) {
                flushedThisStop = true
                scope.launch(Dispatchers.IO) { runCatching { FacitSender.flush(this@GuardService) }; runCatching { Raknare.flush(this@GuardService) } }   // #772: räknarens kö likaså
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
    private fun retuneCadence(lon: Double, lat: Double, speedKmh: Double?) {
        val wanted = CadencePolicy.intervalMs(guard?.nearestHazardM(lon, lat), speedKmh)
        if (wanted != currentIntervalMs) {
            fused.removeLocationUpdates(callback)
            startLocationUpdates(wanted)
        }
    }

    private fun speak(text: String) {
        if (!ttsReady) { pendingSpeech = text; return }
        requestFocus()
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "hv-${System.nanoTime()}")
    }

    private fun requestFocus() {
        val fr = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
            .setAudioAttributes(Voice.ATTRS).build()
        focusRequest = fr
        audio.requestAudioFocus(fr)
        tts?.setAudioAttributes(Voice.ATTRS)
    }

    private fun abandonFocus() { focusRequest?.let { audio.abandonAudioFocusRequest(it) } }

    private fun buildNotification(text: String): Notification {
        val chId = "guard"
        if (Build.VERSION.SDK_INT >= 26) {
            val ch = NotificationChannel(chId, "Halkvakt", NotificationManager.IMPORTANCE_LOW)
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(ch)
        }
        val pi = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        // Å1 (kort #262): vakten ska gå att stoppa från låsskärmen — förut krävde det att appen öppnades.
        val stoppa = PendingIntent.getBroadcast(this, 3,
            Intent(this, StoppaVaktenReceiver::class.java).setAction(StoppaVaktenReceiver.ACTION_STOPPA),
            PendingIntent.FLAG_IMMUTABLE)
        return Notification.Builder(this, chId)
            .setContentTitle("Halkvakt")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pi)
            .setOngoing(true)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .addAction(0, "Avsluta vakten", stoppa)
            .apply { if (Build.VERSION.SDK_INT >= 31) setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE) }
            .build()
    }

    private var idleReset: kotlinx.coroutines.Job? = null

    private fun updateNotification(text: String) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIF_ID, buildNotification(text))
        headsUp(nm, text)
        // The ongoing notification used to keep the last warning forever; back to idle when the banner goes.
        idleReset?.cancel()
        idleReset = scope.launch { kotlinx.coroutines.delay(HEADS_UP_MS); if (running) nm.notify(NOTIF_ID, buildNotification(IDLE_TEXT)) }
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
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setContentIntent(pi)
                .setAutoCancel(true)
                .setTimeoutAfter(HEADS_UP_MS)
                .build()
        )
    }

    override fun onDestroy() {
        efterResan()          // FÖRE scope.cancel() — läser sitt eget, kortlivade scope
        sparaTuren()
        sparaMatningen()
        Favoriter.lager(this).resanSlutar(session.value.km, (System.currentTimeMillis() - session.value.startedAt) / 60_000.0)   // kort #357: frågan på Redo., bara om insamlingen var på
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
    /** Redo efter tur (designen 01b): turens slut och sträcka till kvittot. Egen kortlivad scope, som efterResan. */
    private fun sparaTuren() {
        if (session.value.startedAt <= 0L) return
        val app = applicationContext
        val km = session.value.km.toFloat()
        CoroutineScope(Dispatchers.IO).launch { Prefs.setTripEnd(app, System.currentTimeMillis(), km) }
    }

    /** Mätningen (DECISIONS #741 punkt 5): resan sparas när den slutar, bara i telefonen; under två minuter sparas den inte. */
    private fun sparaMatningen() {
        val m = matare ?: return
        matare = null
        m.resa(System.currentTimeMillis(), batteri())?.let { Matningen.spara(Matningen.fil(this), it) }
    }

    private fun efterResan() {
        val sedan = session.value.startedAt
        if (sedan <= 0L) return
        val app = applicationContext
        CoroutineScope(Dispatchers.IO).launch {
            runCatching {
                if (!Prefs.facitEnabled(app).first()) return@runCatching
                val obes = Resan.obesvarade(Prefs.history(app).first(), Prefs.facit(app).first(), sedan)
                val missar = Missar.omarkerade(Prefs.missar(app).first(), sedan)   // #203 lager 2
                if (obes.isEmpty() && missar.isEmpty()) return@runCatching
                visaEfterResan(app, sedan, obes.size, missar.size)
            }
        }
    }

    private fun visaEfterResan(ctx: Context, sedan: Long, antal: Int, missar: Int = 0) {
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
        // #203 lager 2: bara missar ⇒ ingen "Ja, alla stämde" (det finns inget att bekräfta) — notisen öppnar kortet.
        val notis = Notification.Builder(ctx, EFTER_CH)
            .setContentTitle(if (antal > 0) Resan.fraga(antal) else Missar.fraga(missar))
            .setContentText(if (antal > 0) "Ett tryck räcker. Tystnad räknas aldrig som ja." else "Välj i appen — utan val skickas ingenting.")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(avvikelse)
            .setAutoCancel(true)
        if (antal > 0) notis.addAction(0, "Ja, alla stämde", ja).addAction(0, "Något stämde inte", avvikelse)
        nm.notify(FacitSvarReceiver.NOTIF_ID, notis.build())
    }

    companion object {
        private const val NOTIF_ID = 1
        private const val EFTER_CH = "efter_resan"
        private const val HEADS_UP_CH = "heads_up"
        private const val HEADS_UP_ID = 2
        private const val HEADS_UP_MS = 8_000L  // samma 8 s som helskärmskortet
        private const val IDLE_TEXT = "Halkvakt vaktar — inga varningar just nu"
        /** Null = rösten fungerar. Annars raden som visas på Redo och under Rösten. */
        val voiceProblem = MutableStateFlow<String?>(null)
        /** UI observerar; autostart-limmet läser var-formen. Flow är sanningen. */
        val runningFlow = MutableStateFlow(false)
        val snapshotInfo = MutableStateFlow<String?>(null)
        val session = MutableStateFlow(Session())
        /** Varningskortet (DECISIONS #444): sätts vid uppläst varning, släcks efter 8 s — ingen knapp. */
        val currentWarning = MutableStateFlow<ShownWarning?>(null)
        /** Sant så länge den laddade väglagsdatan är för gammal. Halkvarningarna är då avstängda, så På vakt säger inte "Tyst så länge". */
        val dataStale = MutableStateFlow(false)
        var running: Boolean
            get() = runningFlow.value
            set(v) { runningFlow.value = v }
        fun start(ctx: Context) = ctx.startForegroundService(Intent(ctx, GuardService::class.java))
        fun stop(ctx: Context) = ctx.stopService(Intent(ctx, GuardService::class.java))
    }
}
