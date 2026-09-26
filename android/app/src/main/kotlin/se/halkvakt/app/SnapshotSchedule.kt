package se.halkvakt.app

/**
 * When the guard may load road data (kort #218, DECISIONS #280). One load at a time, and a failed load waits
 * [retryMs] before the next try; a successful one is refreshed after [refreshMs]. Before this, every GPS fix
 * without data started a new, complete load in its own thread — once a second until the first one succeeded.
 * Pure, so the JVM proves it.
 */
class SnapshotSchedule(private val refreshMs: Long = 30 * 60 * 1000L, private val retryMs: Long = 60 * 1000L) {
    private var loading = false
    private var nextMs = Long.MIN_VALUE

    /** true = start a load now, and report back with [done]. [force] (the guard just started) skips the wait, never a running load. */
    @Synchronized fun tryBegin(nowMs: Long, force: Boolean = false): Boolean {
        if (loading || (!force && nowMs < nextMs)) return false
        loading = true
        return true
    }

    @Synchronized fun done(nowMs: Long, ok: Boolean) {
        loading = false
        nextMs = nowMs + if (ok) refreshMs else retryMs
    }
}
