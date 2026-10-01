// The guard pipeline, extracted from GuardService so it can be driven by tests
// (instrumented on-device replay) without Android service machinery. The service
// is a thin shell around this class.
package se.halkvakt.app

import se.halkvakt.engine.Alert
import se.halkvakt.engine.AlertEngine
import se.halkvakt.engine.EngineConfig
import se.halkvakt.engine.HazardKind
import se.halkvakt.engine.Fix
import se.halkvakt.engine.Geo
import se.halkvakt.engine.Hazard
import se.halkvakt.engine.PointHazard
import se.halkvakt.engine.SegmentHazard

class Guard(
    hazards: List<Hazard>,
    cfg: EngineConfig = EngineConfig(),
    private val speak: (String) -> Unit,
    private val notify: (String) -> Unit,
    private val onEvent: (String) -> Unit = {},
    /** Förarens kategorival — avstängd kategori tystas (motorns minne räknar ändå: ingen dubbelvarning vid återaktivering). */
    private val isEnabled: (HazardKind) -> Boolean = { true },
    /** Krok för persistent historik — anropas ENDAST för faktiskt upplästa varningar. */
    private val onAlert: (Alert) -> Unit = {},
) {
    private val engine = AlertEngine(hazards, cfg)
    private var coords: List<DoubleArray> = flatten(hazards)

    /** Fresh snapshot mid-drive: swap hazards, KEEP the engine's memory (BACKLOG #9, v14). */
    fun updateHazards(hazards: List<Hazard>) {
        engine.updateHazards(hazards)
        coords = flatten(hazards)
        // MOTPROV: cache not dropped on new snapshot
    }

    /** Last full sweep: where it was taken and what it found. Null = no sweep yet, or the set changed. */
    private var svep: Triple<Double, Double, Double>? = null

    /**
     * Straight-line distance to the nearest hazard of any kind — feeds CadencePolicy.
     * Coarse on purpose (segment vertices, no corridor logic): this classifies battery
     * tiers, it never decides alerts.
     *
     * Kort #262 Å5: the full sweep touches every coordinate of every hazard (segment vertices
     * included), and at 1 Hz that is a national sweep per second on top of the engine's own.
     * Between sweeps the triangle inequality gives a LOWER bound for free: after moving m metres,
     * no hazard can be closer than (lastNearest − m). A lower bound can only pick a FASTER tier
     * than the truth — never a slower one — so it is safe to hand to CadencePolicy. A new sweep is
     * taken once the car has covered half the last measured distance, so far from everything the
     * sweep runs every tens of kilometres, and within the 5 km NEAR tier every ~2.5 km.
     * Proven in GuardTest.
     */
    fun nearestHazardM(lon: Double, lat: Double): Double? {
        svep?.let { (sLon, sLat, d) ->
            val flyttat = Geo.haversineM(lon, lat, sLon, sLat)
            if (flyttat < d / 2) return d   // MOTPROV: stale value, bound may exceed the truth
        }
        val d = coords.minOfOrNull { Geo.haversineM(lon, lat, it[0], it[1]) } ?: return null
        svep = Triple(lon, lat, d)
        return d
    }

    private fun flatten(hazards: List<Hazard>): List<DoubleArray> = buildList {
        for (h in hazards) when (h) {
            is PointHazard -> add(doubleArrayOf(h.lon, h.lat))
            is SegmentHazard -> addAll(h.line)
        }
    }

    fun onLocation(fix: Fix): Alert? {
        val alert = engine.step(fix) ?: return null
        if (!isEnabled(alert.kind)) {
            onEvent("🔇 tystad (${alert.kind.wire}): ${alert.text}")
            return alert
        }
        speak(alert.text)
        notify(alert.text)
        onEvent("🔊 ${alert.text} (${alert.distanceM} m)")
        onAlert(alert)
        return alert
    }
}
