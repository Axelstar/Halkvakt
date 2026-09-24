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
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionRequest
import com.google.android.gms.location.ActivityTransitionResult
import com.google.android.gms.location.DetectedActivity

object AutostartManager {
    private const val PREFS = "autostart"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_CARS = "cars"
    private const val KEY_AUTO = "auto_started"   // #248: survives the per-event controller

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

    fun persistCars(ctx: Context, c: AutostartController) {
        ctx.getSharedPreferences(PREFS, 0).edit().putStringSet(KEY_CARS, c.learnedCars()).apply()
    }

    fun execute(ctx: Context, cmd: AutoCmd, c: AutostartController) {
        ctx.getSharedPreferences(PREFS, 0).edit().putBoolean(KEY_AUTO, c.isAutoStarted()).apply()
        when (cmd) {
            AutoCmd.START -> safeStartGuard(ctx)
            AutoCmd.STOP -> ctx.stopService(Intent(ctx, GuardService::class.java))
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
        try {
            ActivityRecognition.getClient(ctx)
                .requestActivityTransitionUpdates(ActivityTransitionRequest(transitions), transitionPI(ctx))
        } catch (_: SecurityException) { /* permission revoked; setup flow re-asks */ }
    }

    private fun unregisterTransitions(ctx: Context) {
        try {
            ActivityRecognition.getClient(ctx).removeActivityTransitionUpdates(transitionPI(ctx))
        } catch (_: SecurityException) {}
    }

    private fun transitionPI(ctx: Context): PendingIntent = PendingIntent.getBroadcast(
        ctx, 41, Intent(ctx, DrivingTransitionReceiver::class.java),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE, // AR fills extras
    )

    private fun safeStartGuard(ctx: Context) {
        if (GuardService.running) return
        try {
            ctx.startForegroundService(Intent(ctx, GuardService::class.java))
        } catch (e: Exception) {
            tapToStartNotification(ctx)
        }
    }

    private fun tapToStartNotification(ctx: Context) {
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
                ActivityTransition.ACTIVITY_TRANSITION_ENTER -> c.onVehicleEnter()
                ActivityTransition.ACTIVITY_TRANSITION_EXIT -> c.onVehicleExit()
                else -> AutoCmd.NONE
            }
            AutostartManager.execute(ctx, cmd, c)
        }
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
            BluetoothDevice.ACTION_ACL_CONNECTED -> c.onAclConnected(address, GuardService.running)
            BluetoothDevice.ACTION_ACL_DISCONNECTED -> c.onAclDisconnected(address)
            else -> AutoCmd.NONE
        }
        AutostartManager.execute(ctx, cmd, c)
    }
}

/** AR registrations do not survive reboot — re-arm on boot (protected system broadcast). */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED && AutostartManager.isEnabled(ctx)) {
            AutostartManager.registerTransitions(ctx)
        }
    }
}
