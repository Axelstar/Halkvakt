// Stoppknappen i den pågående notisen (kort #262 Å1, Bengts fältrapport 27/9: vakten blev kvar hela dagen
// och kunde bara stoppas genom att appen öppnades). Samma väg som "Avsluta vakten" i appen: tjänsten
// stoppas och autostartens flagga nollas, så nästa Bluetooth-frånkoppling inte agerar på en gammal start.
//
// En receiver och stopService, inte en start-intent till tjänsten: en stoppknapp får aldrig kunna
// STARTA en tjänst som redan dött — det vore motsatsen till vad kortet handlar om.
package se.halkvakt.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class StoppaVaktenReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.action != ACTION_STOPPA) return
        GuardService.stop(ctx)
        AutostartManager.clearAutoStarted(ctx)
    }

    companion object {
        const val ACTION_STOPPA = "se.halkvakt.app.STOPPA_VAKTEN"
    }
}
