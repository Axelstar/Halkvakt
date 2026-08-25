// En ägare för varaktigt tillstånd (skill: kotlin-concurrency-and-flow):
// DataStore är sanningen, UI och tjänst KONSUMERAR Flows — ingen dubbellagring.
package se.halkvakt.app

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import se.halkvakt.engine.HazardKind

private val Context.dataStore by preferencesDataStore("halkvakt")

object Prefs {
    private val KEY_HISTORY = stringPreferencesKey("alert_history")
    private fun kindKey(k: HazardKind) = booleanPreferencesKey("warn_${k.wire}")

    /** Kategorier föraren stängt av (default: allt PÅ). */
    fun disabledKinds(ctx: Context): Flow<Set<HazardKind>> =
        ctx.dataStore.data.map { p -> HazardKind.entries.filter { p[kindKey(it)] == false }.toSet() }

    suspend fun setKindEnabled(ctx: Context, k: HazardKind, on: Boolean) {
        ctx.dataStore.edit { it[kindKey(k)] = on }
    }

    fun history(ctx: Context): Flow<List<AlertEntry>> =
        ctx.dataStore.data.map { AlertHistory.decode(it[KEY_HISTORY] ?: "") }

    suspend fun appendAlert(ctx: Context, e: AlertEntry) {
        ctx.dataStore.edit { p ->
            p[KEY_HISTORY] = AlertHistory.encode(
                AlertHistory.append(AlertHistory.decode(p[KEY_HISTORY] ?: ""), e))
        }
    }
}
