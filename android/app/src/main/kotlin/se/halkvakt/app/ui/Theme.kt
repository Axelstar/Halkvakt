// Skinnet v3 på Android (DECISIONS #47) — spegel av iOS Theme.swift.
// Tokens är designens, inte mina: ändra i docs/design/Halkvakt-App-v3.dc.html, sedan i
// BÅDA plattformarna. Avviker Android från iOS är det en bugg, inte en anpassning.
// Typsnitt: Instrument Sans (text) + IBM Plex Mono (siffror, etiketter), båda OFL.
package se.halkvakt.app.ui

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import se.halkvakt.app.R

object Brand {
    // Ytor
    val bg     = Color(0xFF080B0D)
    val panel  = Color(0xFF0F1518)
    val raised = Color(0x0AFFFFFF)   // white 4 %
    val stroke = Color(0x1FFFFFFF)   // white 12 %
    // Accent
    val yellow  = Color(0xFFFFC94A)
    val amber   = Color(0xFFFFC94A)  // varningskortets yta = gul
    val onAmber = Color(0xFF140F00)  // text på gult
    val green     = Color(0xFF1FB25A)
    val greenText = Color(0xFF7FD9A4)
    val blue      = Color(0xFF6EC9E8)
    // Text
    val text  = Color(0xFFE9EFF2)
    val text2 = Color(0xFFC7D3D9)
    val dim   = Color(0xFF8FA0A9)
    val faint = Color(0xFF6C7B84)
}

object Typo {
    val sans = FontFamily(Font(R.font.instrumentsans, FontWeight.Normal))
    val mono = FontFamily(
        Font(R.font.ibmplexmono_regular, FontWeight.Normal),
        Font(R.font.ibmplexmono_medium, FontWeight.Medium),
        Font(R.font.ibmplexmono_semibold, FontWeight.SemiBold),
    )
}
