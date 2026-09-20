// Resan — vad som hände under ETT körpass, och vad föraren ännu inte svarat på.
// Kort #203 (Bengts fråga 18/9, Axels svar på §8 20/9 — DECISIONS #267). REN Kotlin, JVM-testbar.
//
// VARFÖR DEN FINNS. Dagens facit kräver att föraren stannar, avslutar vakten, öppnar appen och
// hittar knapparna — och bara resans SISTA varning går att svara på. Fälttesten 16/9 och 18/9 gav
// noll svar. Undantagsprincipen med underskrift (KB-D7): svaret är en HANDLING, men handlingen får
// vara EN per resa. Det här är räkningen bakom den handlingen.
//
// TYSTNAD ÄR INGET SVAR. En resa utan tryck ger noll rader — aldrig ett antaget "ja". Den regeln
// bor inte här utan i frånvaron av kod: ingenting i den här filen skriver ett svar av sig själv.
package se.halkvakt.app

object Resan {

    /**
     * Resans obesvarade varningar: historikens rader från och med [sedan] som saknar svar.
     * Nyast sist, som historiken.
     *
     * Rader UTAN id är från före 16/9 (AlertHistory:s trekolumnsformat) och går inte att svara på —
     * ett svar utan varnings-id kan inte matchas mot något i domen. De räknas därför inte som
     * obesvarade: annars hade varje gammal rad hållit frågan öppen för evigt.
     */
    fun obesvarade(historik: List<AlertEntry>, facit: List<FacitEntry>, sedan: Long): List<AlertEntry> =
        historik.filter { it.t >= sedan && it.id.isNotEmpty() && Facit.answerFor(facit, it.id, it.t) == null }

    /**
     * Ett tryck, samma svar på allt. Bygger på [Facit.answer], så ett tidigare svar ersätts och det
     * nya blir osänt — förarens senaste ord gäller, precis som för ett enskilt svar.
     */
    fun svaraAlla(facit: List<FacitEntry>, varningar: List<AlertEntry>, svar: Boolean): List<FacitEntry> =
        varningar.fold(facit) { acc, v -> Facit.answer(acc, v.id, v.t, svar) }

    /**
     * Står frågan kvar? Ett dygn, sedan tiger den. En fråga som aldrig försvinner blir tapet, och
     * ett svar på en resa man inte minns är inte ett facit — det är en gissning.
     */
    fun fragaKvar(sedan: Long, nu: Long, obesvarade: Int): Boolean =
        obesvarade > 0 && sedan > 0L && nu - sedan < DYGN_MS

    const val DYGN_MS = 24L * 60 * 60 * 1000

    /** Notisens fråga. Singular när det bara var en varning — "alla 1 varningarna" är inte svenska. */
    fun fraga(antal: Int): String =
        if (antal == 1) "Resan klar — stämde varningen?" else "Resan klar — stämde alla $antal varningarna?"
}
