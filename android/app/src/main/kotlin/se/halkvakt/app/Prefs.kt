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
    private val KEY_FACIT_STATUS_AT = longPreferencesKey("facit_status_at")
    private val KEY_WARN_DIST = floatPreferencesKey("warn_distance_m")
    private val KEY_TRIP_START = longPreferencesKey("trip_start")
    private val KEY_TRIP_END = longPreferencesKey("trip_end")      // Redo efter tur (DECISIONS #444)
    private val KEY_TRIP_KM = floatPreferencesKey("trip_km")
    private val KEY_MISSAR = stringPreferencesKey("missar")
    private fun kindKey(k: HazardKind) = booleanPreferencesKey("warn_${k.wire}")

    /** Kategorier föraren stängt av (default: allt PÅ). */
    fun disabledKinds(ctx: Context): Flow<Set<HazardKind>> =
        ctx.dataStore.data.map { p -> HazardKind.entries.filter { p[kindKey(it)] == false }.toSet() }

    suspend fun setKindEnabled(ctx: Context, k: HazardKind, on: Boolean) {
        ctx.dataStore.edit { it[kindKey(k)] = on }
    }

    /** Kort #259: the engine speaks at speed × 30 s, clamped to leadMinM…leadMaxM, so the slider is a CAP. 1 200 m ≈ 30 s at
     *  140 km/h — above that it changed nothing. Values stored before (up to 5 000) read as 1 200: same behaviour below 144 km/h. */
    const val WARN_MIN_M = 400f
    const val WARN_MAX_M = 1200f

    /** Längsta förvarning (motorns leadMaxM), ett tak på WARN_MIN_M–WARN_MAX_M. */
    fun warnDistanceM(ctx: Context): Flow<Float> =
        ctx.dataStore.data.map { (it[KEY_WARN_DIST] ?: WARN_MAX_M).coerceIn(WARN_MIN_M, WARN_MAX_M) }

    suspend fun setWarnDistanceM(ctx: Context, m: Float) {
        ctx.dataStore.edit { it[KEY_WARN_DIST] = m.coerceIn(WARN_MIN_M, WARN_MAX_M) }
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
    /** När raden skrevs (0 = före 4/10) — raden visas bara där den hör hemma (Facit.kortetsStatus, Facit.radensStatus). */
    fun facitStatusAt(ctx: Context): Flow<Long> = ctx.dataStore.data.map { it[KEY_FACIT_STATUS_AT] ?: 0L }
    suspend fun setFacitStatus(ctx: Context, s: String) {
        ctx.dataStore.edit { it[KEY_FACIT_STATUS] = s; it[KEY_FACIT_STATUS_AT] = System.currentTimeMillis() }
    }
    suspend fun markFacitSent(ctx: Context, sent: Collection<FacitEntry>) {
        ctx.dataStore.edit { p -> p[KEY_FACIT] = Facit.encode(Facit.markSent(Facit.decode(p[KEY_FACIT] ?: ""), sent)) }
    }

    // ── Resan (kort #203) ────────────────────────────────────────────────────────────────────
    /** När nuvarande (eller senaste) körpass startade. Överlever att tjänsten dör: notisens
     *  knapp trycks minuter senare, i en annan process, och måste veta vilket fönster som gäller. */
    fun tripStart(ctx: Context): Flow<Long> = ctx.dataStore.data.map { it[KEY_TRIP_START] ?: 0L }
    suspend fun setTripStart(ctx: Context, t: Long) { ctx.dataStore.edit { it[KEY_TRIP_START] = t } }
    /** Senaste turens slut och sträcka — kvittot på Redo efter tur (designen 01b). */
    fun tripEnd(ctx: Context): Flow<Pair<Long, Float>> = ctx.dataStore.data.map { (it[KEY_TRIP_END] ?: 0L) to (it[KEY_TRIP_KM] ?: 0f) }
    suspend fun setTripEnd(ctx: Context, t: Long, km: Float) { ctx.dataStore.edit { it[KEY_TRIP_END] = t; it[KEY_TRIP_KM] = km } }

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

    // ── Missarna (kort #203 lager 2) ──────────────────────────────────────────────────────────
    fun missar(ctx: Context): Flow<List<MissEntry>> = ctx.dataStore.data.map { Missar.decode(it[KEY_MISSAR] ?: "") }
    suspend fun markeraMiss(ctx: Context, t: Long, station: String?, segment: String?) {
        ctx.dataStore.edit { p -> p[KEY_MISSAR] = Missar.encode(Missar.markera(Missar.decode(p[KEY_MISSAR] ?: ""), t, station, segment)) }
    }
    suspend fun valjMiss(ctx: Context, t: Long, vad: String) {
        ctx.dataStore.edit { p -> p[KEY_MISSAR] = Missar.encode(Missar.valj(Missar.decode(p[KEY_MISSAR] ?: ""), t, vad)) }
    }
    suspend fun markMissarSent(ctx: Context, sent: Collection<MissEntry>) {
        ctx.dataStore.edit { p -> p[KEY_MISSAR] = Missar.encode(Missar.markSent(Missar.decode(p[KEY_MISSAR] ?: ""), sent)) }
    }

    suspend fun appendAlert(ctx: Context, e: AlertEntry) {
        ctx.dataStore.edit { p ->
            p[KEY_HISTORY] = AlertHistory.encode(
                AlertHistory.append(AlertHistory.decode(p[KEY_HISTORY] ?: ""), e))
        }
    }
}
