package se.halkvakt.app

import se.halkvakt.engine.Alert
import se.halkvakt.engine.WarningCard

/** Varningen som visas just nu och vad kortet säger om den (DECISIONS #444). En ny instans per varning,
 *  så kortet byts — och tidsstapeln börjar om — även när samma fara varnar igen. */
class ShownWarning(val alert: Alert, val card: WarningCard)
