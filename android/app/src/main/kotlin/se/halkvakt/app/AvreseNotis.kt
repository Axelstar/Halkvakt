// PÅMINNELSEN FÖRE AVRESAN (kort #659, DECISIONS #870, #983) — spegel av iOS AvreseNotis.swift. En notis omkring en kvart före
// den tid föraren valt. Telefonen schemalägger den själv, och ingenting skickas. Notisen säger inte vad som finns längs vägen:
// den öppnar resan i appen, där läget hämtas färskt.
//
// Larmet är inte exakt (skills/halkvakt-android: inga exakta larm, de kräver en egen behörighet): Android får lägga det några
// minuter efter tiden, mer i strömsparläge. Ett larm försvinner när telefonen startas om; BootReceiver lägger det igen.
package se.halkvakt.app

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import kotlinx.coroutines.flow.MutableStateFlow

object AvreseNotis {
    private const val KANAL = "avresa"
    /** Egen id: förgrundsnotisen har 1, heads-up 2, Efter resan 3 och Spara resan 4. */
    const val NOTIF_ID = 5
    const val EXTRA_RESAN = "planerad_resa"
    /** Så långt före avresan kommer notisen. */
    const val FORE_MS = 15 * 60_000L
    /** Notisens tryck och raderna i appen sätter den; appen byter till fliken Resor med resan öppen och nollar den. */
    val visaResan = MutableStateFlow(false)

    /** Lägger larmet. Falskt när notiserna är avslagna eller tiden för notisen redan har passerat. */
    fun schemalagg(ctx: Context, avresaMs: Long, nu: Long = System.currentTimeMillis()): Boolean {
        val nar = avresaMs - FORE_MS
        if (nar <= nu || !nm(ctx).areNotificationsEnabled()) return false
        (ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nar, larm(ctx))
        return true
    }

    fun taBort(ctx: Context) {
        (ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(larm(ctx))
        nm(ctx).cancel(NOTIF_ID)
    }

    /** Larmet har gått: notisen, om resan finns kvar och föraren inte redan kör med vakten på. */
    internal fun visa(ctx: Context) {
        Resplan.ladda(ctx)
        val p = Resplan.kommande() ?: return
        if (!p.paminn || GuardService.runningFlow.value) return
        if (Build.VERSION.SDK_INT >= 26 && nm(ctx).getNotificationChannel(KANAL) == null) {
            nm(ctx).createNotificationChannel(NotificationChannel(KANAL, "Påminnelse före resan", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "En påminnelse omkring en kvart före en resa du har planerat, när du har bett om den."
                setShowBadge(false)
            })
        }
        val oppna = PendingIntent.getActivity(ctx, 9,
            Intent(ctx, MainActivity::class.java).putExtra(EXTRA_RESAN, true)
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val text = "Öppna Halkvakt och se läget längs vägen."
        nm(ctx).notify(NOTIF_ID, Notification.Builder(ctx, KANAL).setContentTitle("${p.mal} om en kvart").setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info).setContentIntent(oppna).setAutoCancel(true).build())
    }

    private fun larm(ctx: Context) = PendingIntent.getBroadcast(ctx, 8, Intent(ctx, AvreseReceiver::class.java),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    private fun nm(ctx: Context) = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
}

class AvreseReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) = AvreseNotis.visa(ctx)
}
