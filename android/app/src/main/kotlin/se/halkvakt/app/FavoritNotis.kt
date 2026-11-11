// SPARA RESAN? SOM NOTIS (Favoriter 2a, DECISIONS #817) — spegel av FavoritNotis i iOS Services/Favoriter.swift. Svarsfältet syns
// direkt i notisen (RemoteInput), så att föraren kan döpa resan utan att öppna appen; Släng raderar vägen; ett vanligt tryck öppnar
// Favoriter med dagens resor överst. Högst en notis per dag, för den första nya resan. Texten bär bara längden och antalet, inga
// klockslag och ingen plats: notisen syns på låsskärmen. Inget här når nätet (ruttspärren, scripts/rutterspar.ts).
package se.halkvakt.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.RemoteInput
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import se.halkvakt.engine.Vantande
import java.time.LocalDate

object FavoritNotis {
    private const val KANAL = "favoriter"
    /** Egen id — får aldrig krocka med förgrundsnotisen (1), heads-up (2) eller Efter resan (3). */
    const val NOTIF_ID = 4
    const val ACTION_NAMNGE = "se.halkvakt.app.FAVORIT_NAMNGE"
    const val ACTION_SLANG = "se.halkvakt.app.FAVORIT_SLANG"
    const val EXTRA_RESA = "resa"
    const val EXTRA_FAVORITER = "favoriter"
    const val SVAR_NYCKEL = "namn"
    private const val DAG_NYCKEL = "fav_notis_dag"

    /** Dagens notis: högst en per dag, för den första nya resan. */
    fun fraga(ctx: Context, v: Vantande, antal: Int) {
        val sp = ctx.getSharedPreferences("favoriter_notis", Context.MODE_PRIVATE)   // en dag, ingen väg
        val dag = LocalDate.now().toString()
        if (sp.getString(DAG_NYCKEL, null) == dag) return
        sp.edit().putString(DAG_NYCKEL, dag).apply()
        val f = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE   // mutable: RemoteInput fyller i svaret
        val namnge = PendingIntent.getBroadcast(ctx, 5,
            Intent(ctx, FavoritSvarReceiver::class.java).setAction(ACTION_NAMNGE).putExtra(EXTRA_RESA, v.id), f)
        val slang = PendingIntent.getBroadcast(ctx, 6,
            Intent(ctx, FavoritSvarReceiver::class.java).setAction(ACTION_SLANG).putExtra(EXTRA_RESA, v.id),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val svar = RemoteInput.Builder(SVAR_NYCKEL).setLabel("Vad var det för resa?").build()
        val n = bygg(ctx, "Spara resan?", "${km(v.km)}, $antal ${if (antal == 1) "resa" else "resor"} i dag. Skriv vad det var för resa.")
            .addAction(Notification.Action.Builder(null, "Spara", namnge).addRemoteInput(svar).build())
            .addAction(Notification.Action.Builder(null, "Släng", slang).build())
            .build()
        nm(ctx).notify(NOTIF_ID, n)
    }

    /** Kvittot ersätter frågan och pekar vidare om fler resor väntar. */
    fun kvitto(ctx: Context, rubrik: String, text: String) = nm(ctx).notify(NOTIF_ID, bygg(ctx, rubrik, text).build())

    fun taBort(ctx: Context) = nm(ctx).cancel(NOTIF_ID)

    private fun bygg(ctx: Context, titel: String, text: String): Notification.Builder {
        if (Build.VERSION.SDK_INT >= 26 && nm(ctx).getNotificationChannel(KANAL) == null) {
            nm(ctx).createNotificationChannel(NotificationChannel(KANAL, "Spara resan", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Frågan om dagens resa ska sparas. Högst en gång per dag, aldrig under körning."
                setShowBadge(false)
            })
        }
        val oppna = PendingIntent.getActivity(ctx, 7,
            Intent(ctx, MainActivity::class.java).putExtra(EXTRA_FAVORITER, true)
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        return Notification.Builder(ctx, KANAL).setContentTitle(titel).setContentText(text)
            .setStyle(Notification.BigTextStyle().bigText(text))
            .setSmallIcon(android.R.drawable.ic_dialog_info).setContentIntent(oppna).setAutoCancel(true)
    }

    private fun nm(ctx: Context) = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    fun km(km: Double): String = if (km >= 10) "${Math.round(km)} km" else "%.1f km".format(km).replace('.', ',')
}

/** Svaren i notisen. På huvudtråden, som resten av lagret; skrivningen tar millisekunder. */
class FavoritSvarReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val id = intent.getStringExtra(FavoritNotis.EXTRA_RESA) ?: return
        val lager = Favoriter.lager(ctx)
        when (intent.action) {
            FavoritNotis.ACTION_NAMNGE -> {
                val namn = RemoteInput.getResultsFromIntent(intent)?.getCharSequence(FavoritNotis.SVAR_NYCKEL)?.toString().orEmpty().trim()
                val v = lager.dagens.value.firstOrNull { it.id == id }
                when (lager.spara(id, namn)) {
                    RuttLager.Svar.SPARAD -> {
                        val kvar = lager.dagens.value.size
                        FavoritNotis.kvitto(ctx, "Sparad som ${namn.ifEmpty { v?.let(Favoriter::datumnamn) ?: "Resa" }}",
                            "Du ser läget längs den under Favoriter." +
                                if (kvar > 0) " $kvar ${if (kvar == 1) "resa" else "resor"} till i dag att spara." else "")
                    }
                    RuttLager.Svar.FULLT -> FavoritNotis.kvitto(ctx, "Resan sparades inte",
                        "Du har redan fem resor. Ta bort en under Favoriter, så står dagens resor kvar där.")
                    RuttLager.Svar.FEL -> FavoritNotis.kvitto(ctx, "Resan sparades inte", "Försök igen under Favoriter.")
                }
            }
            FavoritNotis.ACTION_SLANG -> { lager.slang(id); FavoritNotis.taBort(ctx) }
        }
    }
}
