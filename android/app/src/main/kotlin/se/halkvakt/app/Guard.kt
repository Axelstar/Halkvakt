// The guard pipeline, extracted from GuardService so it can be driven by tests
// (instrumented on-device replay) without Android service machinery. The service
// is a thin shell around this class.
package se.halkvakt.app

import se.halkvakt.engine.Alert
import se.halkvakt.engine.AlertEngine
import se.halkvakt.engine.Fix
import se.halkvakt.engine.Geo
import se.halkvakt.engine.Hazard
import se.halkvakt.engine.PointHazard
import se.halkvakt.engine.SegmentHazard

class Guard(
    hazards: List<Hazard>,
    private val speak: (String) -> Unit,
    private val notify: (String) -> Unit,
    private val onEvent: (String) -> Unit = {},
) {
    private val engine = AlertEngine(hazards)
    private var coords: List<DoubleArray> = flatten(hazards)

    /** Fresh snapshot mid-drive: swap hazards, KEEP the engine's memory (BACKLOG #9, v14). */
    fun updateHazards(hazards: List<Hazard>) {
        engine.updateHazards(hazards)
        coords = flatten(hazards)
    }

    /**
     * Straight-line distance to the nearest hazard of any kind — feeds CadencePolicy.
     * Coarse on purpose (segment vertices, no corridor logic): this classifies battery
     * tiers, it never decides alerts. O(n) over ~2 000 national points ≈ microseconds.
     */
    fun nearestHazardM(lon: Double, lat: Double): Double? =
        coords.minOfOrNull { Geo.haversineM(lon, lat, it[0], it[1]) }

    private fun flatten(hazards: List<Hazard>): List<DoubleArray> = buildList {
        for (h in hazards) when (h) {
            is PointHazard -> add(doubleArrayOf(h.lon, h.lat))
            is SegmentHazard -> addAll(h.line)
        }
    }

    fun onLocation(fix: Fix): Alert? {
        val alert = engine.step(fix) ?: return null
        speak(alert.text)
        notify(alert.text)
        onEvent("🔊 ${alert.text} (${alert.distanceM} m)")
        return alert
    }
}
