// Thin Android glue around AutostartController. All decisions live in the controller;
// this file only translates system events to controller calls and commands to actions.
//
// Background-start law (Android 12+), encoded here:
//   * Activity-transition events are on the official exemption list for starting a
//     foreground service from the background — the AR path may start directly.
//   * A plain Bluetooth ACL broadcast is NOT exempt on all OEMs, so the BT turbo path
//     tries, and on ForegroundServiceStartNotAllowedException falls back to a
//     high-priority notification ("tap to start") — one tap instead of zero, never a crash.
//   * Location access in a background-started FGS requires "Allow all the time"
//     (ACCESS_BACKGROUND_LOCATION) — requested in MainActivity's autostart setup.
package se.halkvakt.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.bluetooth.BluetoothDevice
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.google.android.gms.location.ActivityRecognition
import com.google.android.gms.location.ActivityRecognitionResult
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionRequest
import com.google.android.gms.location.ActivityTransitionResult
import com.google.android.gms.location.DetectedActivity

object AutostartManager {
    private const val PREFS = "autostart"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_CARS = "cars"
    private const val KEY_AUTO = "auto_started"   // #248: survives the per-event controller
    // 27/11: what the phone has told us, shown under the switch so a silent self-start can be read off the screen.
    private const val KEY_ARMED = "ar_armed"          // epoch ms: Play services accepted the registration
    private const val KEY_ARM_ERROR = "ar_error"      // why it did not, short
    private const val KEY_SIGNAL = "ar_signal"        // epoch ms of the last "in a vehicle" from either road
    private const val KEY_SAMPLE_TRY = "sample_try"   // epoch ms of the last start tried from a sampled reading
    private const val KEY_HAND_STOP = "hand_stop"     // epoch ms of the last stop by hand

    fun isEnabled(ctx: Context): Boolean =
        ctx.getSharedPreferences(PREFS, 0).getBoolean(KEY_ENABLED, false)

    fun setEnabled(ctx: Context, on: Boolean) {
        ctx.getSharedPreferences(PREFS, 0).edit().putBoolean(KEY_ENABLED, on).apply()
        if (on) registerTransitions(ctx) else unregisterTransitions(ctx)
    }

    fun controller(ctx: Context): AutostartController {
        val p = ctx.getSharedPreferences(PREFS, 0)
        return AutostartController(p.getStringSet(KEY_CARS, emptySet()) ?: emptySet(), p.getBoolean(KEY_AUTO, false))
    }

    /** Manual stop, or the guard stopping itself: the next STOP event must not act on an old start. */
    fun clearAutoStarted(ctx: Context) {
        ctx.getSharedPreferences(PREFS, 0).edit().putBoolean(KEY_AUTO, false).apply()
    }

    /** A stop by hand: the sampled readings stay away for SAMPLE_PAUSE_MS. */
    fun noteHandStop(ctx: Context) {
        ctx.getSharedPreferences(PREFS, 0).edit().putLong(KEY_HAND_STOP, System.currentTimeMillis()).apply()
    }

    fun noteSignal(ctx: Context) {
        ctx.getSharedPreferences(PREFS, 0).edit().putLong(KEY_SIGNAL, System.currentTimeMillis()).apply()
    }

    /** A sampled reading (DrivingSampleReceiver). True when it started, or tried to start, the guard. */
    fun onSample(ctx: Context, inVehicle: Boolean, confidence: Int): Boolean {
        val p = ctx.getSharedPreferences(PREFS, 0)
        val now = System.currentTimeMillis()
        if (inVehicle && confidence >= SAMPLE_CONFIDENCE) noteSignal(ctx)
        if (!sampleStarts(inVehicle, confidence, GuardService.running, now, p.getLong(KEY_SAMPLE_TRY, 0), p.getLong(KEY_HAND_STOP, 0))) return false
        p.edit().putLong(KEY_SAMPLE_TRY, now).apply()
        val c = controller(ctx)
        execute(ctx, c.onVehicleEnter(GuardService.running), c)
        return true
    }

    /** The line under the switch: is the phone listening, and has it ever said "in a vehicle"? Null when the switch is off. */
    fun status(ctx: Context): String? {
        if (!isEnabled(ctx)) return null
        val p = ctx.getSharedPreferences(PREFS, 0)
        val kl = { ms: Long -> java.text.SimpleDateFormat("d/M HH.mm", java.util.Locale("sv", "SE")).format(java.util.Date(ms)) }
        val fel = p.getString(KEY_ARM_ERROR, null)
        val armad = p.getLong(KEY_ARMED, 0)
        val signal = p.getLong(KEY_SIGNAL, 0)
        return when {
            fel != null -> "Telefonen tog inte emot självstarten ($fel)"
            armad == 0L -> "Väntar på besked från telefonen"
            signal == 0L -> "Lyssnar sedan ${kl(armad)} · ingen fordonssignal än"
            else -> "Lyssnar sedan ${kl(armad)} · senaste fordonssignal ${kl(signal)}"
        }
    }

    fun persistCars(ctx: Context, c: AutostartController) {
        ctx.getSharedPreferences(PREFS, 0).edit().putStringSet(KEY_CARS, c.learnedCars()).apply()
    }

    fun execute(ctx: Context, cmd: AutoCmd, c: AutostartController) {
        ctx.getSharedPreferences(PREFS, 0).edit().putBoolean(KEY_AUTO, c.isAutoStarted()).apply()
        when (cmd) {
            AutoCmd.START -> if (!safeStartGuard(ctx)) clearAutoStarted(ctx)   // nothing started: a later hand start is not ours to stop
            AutoCmd.STOP -> { GuardService.stoppOrsak = "sjalv"; ctx.stopService(Intent(ctx, GuardService::class.java)) }   // #787
            AutoCmd.LEARN -> { persistCars(ctx, c); AlertBus.post("Bilens Bluetooth inlärd — vakten startar själv nästa gång.") }
            AutoCmd.NONE -> {}
        }
    }

    fun registerTransitions(ctx: Context) {
        val transitions = listOf(
            ActivityTransition.Builder()
                .setActivityType(DetectedActivity.IN_VEHICLE)
                .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER).build(),
            ActivityTransition.Builder()
                .setActivityType(DetectedActivity.IN_VEHICLE)
                .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_EXIT).build(),
        )
        val app = ctx.applicationContext
        val prefs = app.getSharedPreferences(PREFS, 0)
        val fel = { e: Exception -> prefs.edit().putString(KEY_ARM_ERROR, (e.message ?: e.javaClass.simpleName).take(60)).apply() }
        try {
            val client = ActivityRecognition.getClient(app)
            // The answer comes later, as a Task: a refusal used to pass unseen, and the switch said on.
            client.requestActivityTransitionUpdates(ActivityTransitionRequest(transitions), transitionPI(app))
                .addOnSuccessListener { prefs.edit().putLong(KEY_ARMED, System.currentTimeMillis()).remove(KEY_ARM_ERROR).apply() }
                .addOnFailureListener(fel)
            // The second road (sampleStarts in Autostart.kt).
            client.requestActivityUpdates(SAMPLE_INTERVAL_MS, samplePI(app)).addOnFailureListener(fel)
        } catch (e: SecurityException) { fel(e) /* permission revoked; setup flow re-asks */ }
    }

    private fun unregisterTransitions(ctx: Context) {
        try {
            val client = ActivityRecognition.getClient(ctx.applicationContext)
            client.removeActivityTransitionUpdates(transitionPI(ctx))
            client.removeActivityUpdates(samplePI(ctx))
        } catch (_: SecurityException) {}
        ctx.getSharedPreferences(PREFS, 0).edit().remove(KEY_ARMED).remove(KEY_ARM_ERROR).apply()
    }

    private fun samplePI(ctx: Context): PendingIntent = PendingIntent.getBroadcast(
        ctx, 43, Intent(ctx, DrivingSampleReceiver::class.java),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE, // AR fills extras
    )

    private fun transitionPI(ctx: Context): PendingIntent = PendingIntent.getBroadcast(
        ctx, 41, Intent(ctx, DrivingTransitionReceiver::class.java),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE, // AR fills extras
    )

    /** false = the start was refused and the driver got the notification instead. */
    private fun safeStartGuard(ctx: Context): Boolean {
        if (GuardService.running) return true
        return try {
            ctx.startForegroundService(Intent(ctx, GuardService::class.java))
            true
        } catch (e: Exception) {
            tapToStartNotification(ctx)
            false
        }
    }

    fun tapToStartNotification(ctx: Context) {
        val nm = ctx.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel("autostart", "Autostart", NotificationManager.IMPORTANCE_HIGH))
        val open = PendingIntent.getActivity(
            ctx, 42,
            Intent(ctx, MainActivity::class.java).putExtra("auto_start", true)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        nm.notify(42, Notification.Builder(ctx, "autostart")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("Kör du?")
            .setContentText("Tryck för att starta Halkvakt-vakten.")
            .setContentIntent(open).setAutoCancel(true).build())
    }
}

/** Target of the Activity Recognition PendingIntent (exempt background-start trigger). */
class DrivingTransitionReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (!AutostartManager.isEnabled(ctx)) return
        if (!ActivityTransitionResult.hasResult(intent)) return
        val result = ActivityTransitionResult.extractResult(intent) ?: return
        val c = AutostartManager.controller(ctx)
        for (ev in result.transitionEvents) {
            if (ev.activityType != DetectedActivity.IN_VEHICLE) continue
            val cmd = when (ev.transitionType) {
                ActivityTransition.ACTIVITY_TRANSITION_ENTER -> { AutostartManager.noteSignal(ctx); c.onVehicleEnter(GuardService.running) }
                ActivityTransition.ACTIVITY_TRANSITION_EXIT -> c.onVehicleExit()
                else -> AutoCmd.NONE
            }
            AutostartManager.execute(ctx, cmd, c)
        }
    }
}

/** Target of Activity Recognition's sampled readings: the second road to a start (sampleStarts in Autostart.kt). */
class DrivingSampleReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (!AutostartManager.isEnabled(ctx)) return
        if (!ActivityRecognitionResult.hasResult(intent)) return
        val a = ActivityRecognitionResult.extractResult(intent)?.mostProbableActivity ?: return
        AutostartManager.onSample(ctx, a.type == DetectedActivity.IN_VEHICLE, a.confidence)
    }
}

/** Manifest-registered ACL receiver (exempt from implicit-broadcast limits) — the turbo path. */
class BluetoothCarReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (!AutostartManager.isEnabled(ctx)) return
        val device: BluetoothDevice = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE) ?: return
        val address = try { device.address } catch (_: SecurityException) { return } ?: return
        val c = AutostartManager.controller(ctx)
        val cmd = when (intent.action) {
            BluetoothDevice.ACTION_ACL_CONNECTED -> c.onAclConnected(address, GuardService.running,
                try { device.bluetoothClass?.deviceClass } catch (_: SecurityException) { null })
            BluetoothDevice.ACTION_ACL_DISCONNECTED -> c.onAclDisconnected(address)
            else -> AutoCmd.NONE
        }
        AutostartManager.execute(ctx, cmd, c)
    }
}

/**
 * AR registrations do not survive a reboot or an update of the app — re-arm on both (protected system broadcasts).
 * Before 27/11 only the reboot re-armed: after every update from Play the switch said on and nothing listened, until
 * the phone was restarted (Bengt's test phone never started the guard by itself). MainActivity re-arms too, so opening
 * the app is enough.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val armar = intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED
        if (armar && AutostartManager.isEnabled(ctx)) AutostartManager.registerTransitions(ctx)
        // Påminnelsen före en planerad resa (DECISIONS #983): ett larm försvinner när telefonen startas om.
        if (armar) {
            Resplan.ladda(ctx)
            Resplan.kommande()?.takeIf { it.paminn }?.avresaMs?.let { AvreseNotis.schemalagg(ctx, it) }
        }
    }
}
