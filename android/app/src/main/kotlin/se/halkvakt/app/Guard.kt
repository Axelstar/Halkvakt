// The guard pipeline, extracted from GuardService so it can be driven by tests
// (instrumented on-device replay) without Android service machinery. The service
// is a thin shell around this class.
package se.halkvakt.app

import se.halkvakt.engine.Alert
import se.halkvakt.engine.AlertEngine
import se.halkvakt.engine.Fix
import se.halkvakt.engine.Hazard

class Guard(
    hazards: List<Hazard>,
    private val speak: (String) -> Unit,
    private val notify: (String) -> Unit,
    private val onEvent: (String) -> Unit = {},
) {
    private val engine = AlertEngine(hazards)

    fun onLocation(fix: Fix): Alert? {
        val alert = engine.step(fix) ?: return null
        speak(alert.text)
        notify(alert.text)
        onEvent("🔊 ${alert.text} (${alert.distanceM} m)")
        return alert
    }
}
