// UI-sidans snapshot-ägare: laddar vägläget när appen öppnas (parkerad nyfikenhet),
// oberoende av tjänsten. En ägare, ett Flow — UI konsumerar.
package se.halkvakt.app

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import se.halkvakt.engine.Hazard

object SnapshotHolder {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    val hazards = MutableStateFlow<List<Hazard>>(emptyList())
    val loaded = MutableStateFlow(false)
    val loadedAt = MutableStateFlow<Long?>(null)

    fun refresh(ctx: Context) {
        val app = ctx.applicationContext
        scope.launch {
            try {
                val list = SnapshotRepo.loadHazards(app)
                hazards.value = list; loaded.value = true; loadedAt.value = System.currentTimeMillis()
                // Samma flöde som tjänsten: tänder LIVEDATA-pillen + "hämtat HH:mm" även parkerad.
                GuardService.snapshotInfo.value = "${list.size} faror · hämtat ${android.text.format.DateFormat.format("HH:mm", System.currentTimeMillis())}"
            }
            catch (_: Exception) { /* behåll ev. tidigare lista; nästa refresh försöker igen */ }
        }
    }
}
