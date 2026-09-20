// Svaret som inte kräver att appen öppnas (kort #203, Axels svar 2: "låsskärmen är det viktiga —
// föraren ska aldrig behöva öppna appen för att svara ja").
//
// Notisens knapp "Ja, alla stämde" landar här. Receivern skriver svaren, tar bort notisen och
// försöker skicka. Lyckas inte sändningen ligger svaren kvar som osända och går iväg vid nästa
// stillastående eller appstart — samma seghet som FacitSender redan har.
//
// goAsync() ger oss ungefär tio sekunder. Skrivningen tar millisekunder; sändningen har 10 s
// timeout per svar och kan därför hinna falla utanför fönstret. Det är avsiktligt i den ordningen:
// SVARET är det dyrbara och sparas först, sändningen är det som får misslyckas och försöka igen.
package se.halkvakt.app

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class FacitSvarReceiver : BroadcastReceiver() {

    override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.action != ACTION_JA) return
        val sedan = intent.getLongExtra(EXTRA_SEDAN, 0L)
        if (sedan <= 0L) return                       // utan fönster vet vi inte vad "alla" betyder
        val app = ctx.applicationContext
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val n = Prefs.svaraAllaFacit(app, sedan, svar = true)
                (app.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(NOTIF_ID)
                if (n > 0) runCatching { FacitSender.flush(app) }
            } finally {
                pending.finish()
            }
        }
    }

    companion object {
        const val ACTION_JA = "se.halkvakt.app.FACIT_JA"
        const val EXTRA_SEDAN = "sedan"
        /** Egen id — får aldrig krocka med förgrundsnotisen (1) eller heads-up (2). */
        const val NOTIF_ID = 3
    }
}
