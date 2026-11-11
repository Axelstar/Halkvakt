package se.halkvakt.app

/**
 * When the guard may load road data (kort #218, DECISIONS #280, #741 punkt 4). One load at a time. The next koll follows
 * publicera's grid: the bucket gets a new trio every [PUBLICERING_MS], and Cloudflare shows it up to [MARGINAL_MS] later. An
 * unchanged koll (OFORANDRAD — nothing newer, or the files still behind the manifest in Cloudflare's cache) is retried once after
 * [OMKOLL_MS]; a failed one after [FEL_MS]. Before #218, every GPS fix without data started a new, complete load in its own
 * thread — once a second until the first one succeeded. Pure, so the JVM proves it.
 */
class SnapshotSchedule {
    private var loading = false
    private var nextMs = Long.MIN_VALUE
    /** The next koll is an omkoll: the last one was OFORANDRAD and was not itself an omkoll. */
    private var omkoll = false

    /** true = start a load now, and report back with [done]. [force] (the guard just started) skips the wait, never a running load. */
    @Synchronized fun tryBegin(nowMs: Long, force: Boolean = false): Boolean {
        if (loading || (!force && nowMs < nextMs)) return false
        loading = true
        if (force) omkoll = false   // a koll at the start is no omkoll
        return true
    }

    /** [genMs]: generated_at of the snapshot the app now has, 0 = unknown. */
    @Synchronized fun done(nowMs: Long, utfall: SnapshotRepo.Utfall, genMs: Long) {
        loading = false
        val (nasta, igen) = nastaKoll(nowMs, utfall, genMs, omkoll)
        nextMs = nasta; omkoll = igen
    }

    companion object {
        const val PUBLICERING_MS = 120_000L   // publicera every other minute (sql/074)
        const val MARGINAL_MS = 60_000L       // Cloudflare shows a new file 40–60 s after it is written (measured 29/10)
        const val OMKOLL_MS = 30_000L
        const val FEL_MS = 60_000L            // the old retryMs

        /** The next koll after one that ended [nuMs] with [utfall], and whether it is an omkoll. [omkollad]: that koll was one. */
        fun nastaKoll(nuMs: Long, utfall: SnapshotRepo.Utfall, genMs: Long, omkollad: Boolean): Pair<Long, Boolean> = when {
            utfall == SnapshotRepo.Utfall.FEL -> nuMs + FEL_MS to false
            utfall == SnapshotRepo.Utfall.OFORANDRAD && !omkollad -> nuMs + OMKOLL_MS to true
            else -> rutnat(nuMs, genMs) to false
        }

        /** The first point gen + PUBLICERING + MARGINAL + k·PUBLICERING (k ≥ 0) after [nuMs], never more than PUBLICERING +
         *  MARGINAL away when the phone's clock is behind the server's; unknown gen ⇒ nu + PUBLICERING. */
        fun rutnat(nuMs: Long, genMs: Long): Long {
            if (genMs <= 0L) return nuMs + PUBLICERING_MS
            val t = genMs + PUBLICERING_MS + MARGINAL_MS
            return if (t > nuMs) minOf(t, nuMs + PUBLICERING_MS + MARGINAL_MS) else t + ((nuMs - t) / PUBLICERING_MS + 1) * PUBLICERING_MS
        }
    }
}
