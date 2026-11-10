// TIPSA EN VÄN, TYCK TILL OCH BETYGSÄTT (DECISIONS #829) — spegel av iOS Services/Tipsa.swift, samma texter ordagrant.
// Inget här når nätet av sig självt: delningen går genom telefonens delningsark, åsikten genom förarens egen mejlapp,
// betyget genom Google Play. Appens datasändning är oförändrad (CLAUDE.md, produktinvarianterna).
package se.halkvakt.app

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build

object Tipsa {
    /** Länken bär kampanjkoden `r=dela`, som webbplatsens egen räknare redan räknar (integritet.html, Webbplatsen). */
    const val LANK = "https://halkvakt.se/?r=dela"
    const val TEXT = "Jag kör med Halkvakt. Den säger till med rösten om halka, olyckor och vilt på vägen framför mig, innan jag är där."
    const val ADRESS = "hej@halkvakt.se"
    const val AMNE = "Synpunkter på Halkvakt"

    /** Kortet på Redo.: efter femte avslutade vaktpasset, tills föraren tipsat eller tryckt Inte nu. Aldrig medan vakten kör. */
    const val PASS_FORE_KORTET = 5
    fun visaKortet(pass: Int, dold: Boolean, vaktenKor: Boolean) = !dold && !vaktenKor && pass >= PASS_FORE_KORTET

    /** Mejlets text: tre tekniska rader som föraren ser och kan ta bort före Skicka. Ingen plats, inga resor. */
    fun mejlText(version: String, bygge: Long, modell: String, system: String) =
        "\n\n\n- - -\nDet här skickas med så att vi kan hjälpa dig:\nApp: Halkvakt $version ($bygge)\nTelefon: $modell\nSystem: $system\n" +
            "Ingen plats och inga resor. Ta bort raderna om du vill.\n"

    fun dela(ctx: Context) {
        val skicka = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, "$TEXT $LANK")
        ctx.startActivity(Intent.createChooser(skicka, "Tipsa en vän").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    /** Förarens egen mejlapp; false när ingen app tar emot mejlet, och då visar skärmen adressen i stället. */
    fun tyckTill(ctx: Context): Boolean {
        val info = ctx.packageManager.getPackageInfo(ctx.packageName, 0)
        val bygge = if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else @Suppress("DEPRECATION") info.versionCode.toLong()
        val mejl = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:"))
            .putExtra(Intent.EXTRA_EMAIL, arrayOf(ADRESS))
            .putExtra(Intent.EXTRA_SUBJECT, AMNE)
            .putExtra(Intent.EXTRA_TEXT, mejlText(info.versionName ?: "", bygge, "${Build.MANUFACTURER} ${Build.MODEL}", "Android ${Build.VERSION.RELEASE}"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return try { ctx.startActivity(mejl); true } catch (_: ActivityNotFoundException) { false }
    }

    fun betyg(ctx: Context) {
        val play = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=${ctx.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try { ctx.startActivity(play) } catch (_: ActivityNotFoundException) {
            ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=${ctx.packageName}"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
    }
}
