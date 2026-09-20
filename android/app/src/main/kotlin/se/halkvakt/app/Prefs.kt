// En ägare för varaktigt tillstånd (skill: kotlin-concurrency-and-flow):
// DataStore är sanningen, UI och tjänst KONSUMERAR Flows — ingen dubbellagring.
package se.halkvakt.app

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import se.halkvakt.engine.HazardKind

private val Context.dataStore by preferencesDataStore("halkvakt")

object Prefs {
    private val KEY_HISTORY = stringPreferencesKey("alert_history")
    private val KEY_FACIT = stringPreferencesKey("facit")
    private val KEY_FACIT_ON = booleanPreferencesKey("facit_on")
    private val KEY_FACIT_STATUS = stringPreferencesKey("facit_status")
    private val KEY_WARN_DIST = floatPreferencesKey("warn_distance_m")
    private val KEY_TRIP_START = longPreferencesKey("trip_start")
    private fun kindKey(k: HazardKind) = booleanPreferencesKey("warn_${k.wire}")

    /** Kategorier föraren stängt av (default: allt PÅ). */
    fun disabledKinds(ctx: Context): Flow<Set<HazardKind>> =
        ctx.dataStore.data.map { p -> HazardKind.entries.filter { p[kindKey(it)] == false }.toSet() }

    suspend fun setKindEnabled(ctx: Context, k: HazardKind, on: Boolean) {
        ctx.dataStore.edit { it[kindKey(k)] = on }
    }

    /** Hur tidigt rösten får tala (motorns leadMaxM). 500–5000 m, default = motorns 3000. */
    fun warnDistanceM(ctx: Context): Flow<Float> =
        ctx.dataStore.data.map { it[KEY_WARN_DIST] ?: 3000f }

    suspend fun setWarnDistanceM(ctx: Context, m: Float) {
        ctx.dataStore.edit { it[KEY_WARN_DIST] = m.coerceIn(500f, 5000f) }
    }

    fun history(ctx: Context): Flow<List<AlertEntry>> =
        ctx.dataStore.data.map { AlertHistory.decode(it[KEY_HISTORY] ?: "") }

    /** Betatestets facitknapp (S4, DECISIONS #186): AV tills föraren själv slår på den. */
    fun facitEnabled(ctx: Context): Flow<Boolean> = ctx.dataStore.data.map { it[KEY_FACIT_ON] ?: false }
    suspend fun setFacitEnabled(ctx: Context, on: Boolean) { ctx.dataStore.edit { it[KEY_FACIT_ON] = on } }
    fun facit(ctx: Context): Flow<List<FacitEntry>> = ctx.dataStore.data.map { Facit.decode(it[KEY_FACIT] ?: "") }
    suspend fun answerFacit(ctx: Context, id: String, t: Long, svar: Boolean) {
        ctx.dataStore.edit { p -> p[KEY_FACIT] = Facit.encode(Facit.answer(Facit.decode(p[KEY_FACIT] ?: ""), id, t, svar)) }
    }
    /** S4: vad senaste sändningsförsöket gav — syns under knapparna (DECISIONS #209). */
    fun facitStatus(ctx: Context): Flow<String?> = ctx.dataStore.data.map { it[KEY_FACIT_STATUS] }
    suspend fun setFacitStatus(ctx: Context, s: String) { ctx.dataStore.edit { it[KEY_FACIT_STATUS] = s } }
    suspend fun markFacitSent(ctx: Context, sent: Collection<FacitEntry>) {
        ctx.dataStore.edit { p -> p[KEY_FACIT] = Facit.encode(Facit.markSent(Facit.decode(p[KEY_FACIT] ?: ""), sent)) }
    }

    // ── Resan (kort #203) ────────────────────────────────────────────────────────────────────
    /** När nuvarande (eller senaste) körpass startade. Överlever att tjänsten dör: notisens
     *  knapp trycks minuter senare, i en annan process, och måste veta vilket fönster som gäller. */
    fun tripStart(ctx: Context): Flow<Long> = ctx.dataStore.data.map { it[KEY_TRIP_START] ?: 0L }
    suspend fun setTripStart(ctx: Context, t: Long) { ctx.dataStore.edit { it[KEY_TRIP_START] = t } }

    /**
     * Ett tryck = EN skrivning, och historiken läses om INUTI transaktionen. Skälet är inte
     * prydlighet: mellan att notisen skrevs och att föraren trycker kan vakten ha hunnit tala en
     * gång till, och den varningen ska också få svaret. Returnerar antalet svar som skrevs, så att
     * den som anropar vet om det är värt att försöka skicka.
     */
    suspend fun svaraAllaFacit(ctx: Context, sedan: Long, svar: Boolean): Int {
        var n = 0
        ctx.dataStore.edit { p ->
            val facit = Facit.decode(p[KEY_FACIT] ?: "")
            val obes = Resan.obesvarade(AlertHistory.decode(p[KEY_HISTORY] ?: ""), facit, sedan)
            n = obes.size
            if (n > 0) p[KEY_FACIT] = Facit.encode(Resan.svaraAlla(facit, obes, svar))
        }
        return n
    }

    suspend fun appendAlert(ctx: Context, e: AlertEntry) {
        ctx.dataStore.edit { p ->
            p[KEY_HISTORY] = AlertHistory.encode(
                AlertHistory.append(AlertHistory.decode(p[KEY_HISTORY] ?: ""), e))
        }
    }
}
