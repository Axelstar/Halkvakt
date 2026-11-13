// Introduktionen (kort #652): samma upplägg och texter som iPhone-appens (kort #651), ritad för Androids egna rutor.
// Varje skärm före en ruta är redogörelsen Play kräver, och säger vilket val som ska göras. Varje svar har sitt läge.
// Vilken skärm som följer på vilket svar avgörs i Intro.kt (ren logik, IntroTest); rutorna begärs i MainActivity.
package se.halkvakt.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import se.halkvakt.app.Intro
import se.halkvakt.app.Intro.Sjalv
import se.halkvakt.app.Intro.Steg
import se.halkvakt.app.MainActivity
import se.halkvakt.app.MainActivity.Plats
import se.halkvakt.app.Prefs
import se.halkvakt.app.Raknare
import se.halkvakt.engine.HazardKind

private val IntroText2 = Color(0xFFA9B5BB)
private val IntroLinje = Color(0xFF1E282D)
private val IntroRing = Color(0xFF34424A)

private const val PLATSTEXT =
    "Din plats stannar i telefonen. Appen hämtar samma vägdata till alla och jämför med var du är, i din telefon. Inget konto behövs."

@Composable
fun IntroScreen(activity: MainActivity, startSteg: Int = 0, onKlar: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var steg by rememberSaveable { mutableStateOf(Steg.entries[startSteg.coerceIn(0, Steg.entries.size - 1)]) }
    var sjalv by rememberSaveable { mutableStateOf(Sjalv.FRAGA) }
    var fragadPlats by rememberSaveable { mutableStateOf(false) }
    var fragadNotiser by rememberSaveable { mutableStateOf(false) }
    val lage by activity.behorighetLage.collectAsStateWithLifecycle()
    val svar by activity.introSvar.collectAsStateWithLifecycle()
    val autostart by activity.autostartOn.collectAsStateWithLifecycle()
    val avstangda by remember { Prefs.disabledKinds(ctx) }.collectAsStateWithLifecycle(initialValue = emptySet())
    val plats = remember(lage) { activity.platsLage() }
    val notiserPa = remember(lage) { activity.notiserOk() }
    val exakt = plats == Plats.EXAKT

    // Ett svar hanteras en gång. Löpnumret skiljer ett nytt svar från ett gammalt när introduktionen visas igen.
    var hanterat by rememberSaveable { mutableStateOf(svar.second) }
    LaunchedEffect(svar) {
        if (svar.second == hanterat) return@LaunchedEffect
        hanterat = svar.second
        when (svar.first) {
            10 -> { fragadPlats = true; if (activity.platsLage() == Plats.EXAKT && steg == Steg.PLATSEN) steg = Steg.SJALVSTART }
            11 -> {
                sjalv = Intro.efterSjalvstartsrutorna(activity.sjalvstartBehorigheter(), activity.bakgrundOk())
                if (sjalv == Sjalv.PA) activity.introSlaPaSjalvstart()
            }
            12 -> { sjalv = Intro.efterHelaTiden(activity.bakgrundOk()); if (sjalv == Sjalv.PA) activity.introSlaPaSjalvstart() }
            13 -> fragadNotiser = true
        }
    }

    fun klar() {
        scope.launch {
            withContext(Dispatchers.IO) { runCatching { Prefs.setIntroKlar(ctx); Raknare.onboardingKlar(ctx) } }
            onKlar()
        }
    }

    val topp: Pair<String, Color> = when (steg) {
        Steg.VALKOMMEN -> "Välkommen" to Brand.yellow
        Steg.VARNINGARNA -> "Steg 1 av 5" to Brand.yellow
        Steg.MARKS -> "Steg 2 av 5" to Brand.yellow
        Steg.PLATSEN -> when (Intro.platsSkarm(exakt, plats == Plats.UNGEFARLIG, fragadPlats)) {
            Intro.PlatsSkarm.EXAKT_BEHOVS -> "Platsen är ungefärlig" to Brand.yellow
            Intro.PlatsSkarm.NEKAD -> "Platsen är av" to Brand.yellow
            Intro.PlatsSkarm.KLAR -> "Steg 3 av 5" to Brand.green
            else -> "Steg 3 av 5" to Brand.yellow
        }
        Steg.SJALVSTART -> "Steg 4 av 5" to (if (autostart && activity.bakgrundOk()) Brand.green else Brand.yellow)
        Steg.NOTISER -> "Steg 5 av 5" to Brand.yellow
        Steg.KLAR -> when (Intro.slutSkarm(exakt, autostart)) {
            Intro.SlutSkarm.REDO -> "Klart" to Brand.green
            Intro.SlutSkarm.REDO_NAR_DU_STARTAR -> "Klart" to Brand.yellow
            Intro.SlutSkarm.NASTAN_REDO -> "En sak kvar" to Brand.yellow
        }
    }

    Column(Modifier.fillMaxSize().background(Brand.bg).statusBarsPadding().navigationBarsPadding()) {
        Row(Modifier.fillMaxWidth().padding(top = 20.dp).height(48.dp).padding(horizontal = 28.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Lockup()
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                MonoLabel(topp.first); StatusLight(topp.second)
            }
        }
        when (steg) {
            Steg.VALKOMMEN -> Sida("Visa mig", { steg = Steg.VARNINGARNA }, lank = "Hoppa över", onLank = { steg = Steg.KLAR }) {
                Rubrik("Rösten som varnar innan du är där", "Halkvakt säger till med rösten om faror på vägen framför dig.")
                Etikett("Så fungerar det")
                RowPanel {
                    StegRad({ Nummer(1) }, "Du kör som vanligt", "Med vilken kartapp du vill, eller ingen alls.")
                    StegRad({ Nummer(2) }, "Halkvakt håller koll på vägen framför dig", "Halka, fartkameror, olyckor, vilt och frysrisk.")
                    StegRad({ Nummer(3) }, "Rösten säger till innan du är framme",
                        "I bilens högtalare om telefonen är kopplad till bilen, annars i telefonens.", divider = false)
                }
                Etikett("Bra att veta", top = 20.dp, bottom = 6.dp)
                Brodtext("Halkvakt är ett stöd, inte en garanti. Den varnar inte överallt och kan ha fel. Kör alltid efter väglaget.",
                    IntroText2, Modifier.padding(horizontal = 4.dp))
            }

            Steg.VARNINGARNA -> Sida("Nästa", { steg = Steg.MARKS }, fot = "Du väljer själv vilka i Inställningar") {
                Rubrik("Halka, fartkameror och mer", "Fem slags varningar, alla påslagna från början.")
                Spacer(Modifier.height(24.dp))
                RowPanel {
                    VarningsRad(HazardKind.SLIPPERY_SEGMENT, "Halka", "Rapporterade hala vägsträckor")
                    VarningsRad(HazardKind.CAMERA, "Fartkameror", "Fasta kameror på din väg, 500 meter innan och med hastighetsgränsen")
                    VarningsRad(HazardKind.ACCIDENT, "Olyckor och hinder", "Trafikverkets pågående lägen")
                    VarningsRad(HazardKind.WILDLIFE, "Vilt", "Djur på vägen")
                    VarningsRad(HazardKind.ICING_POINT, "Frysrisk", "Vägbanan nära noll och vått, även på broar", divider = false)
                }
            }

            Steg.MARKS -> Sida("Nästa", { steg = Steg.PLATSEN }) {
                Rubrik("Du hör den först", "Rösten säger vad som ligger framför dig, ungefär 30 sekunder innan du är framme.")
                Spacer(Modifier.height(20.dp))
                ExempelKort()
                Spacer(Modifier.height(14.dp))
                RowPanel {
                    StegRad({ Nummer(1) }, "Rösten säger till", "I bilens högtalare om telefonen är kopplad till bilen, annars i telefonens.")
                    StegRad({ Nummer(2) }, "Gult kort i åtta sekunder", "Syns på skärmen, vilken app du än har framme.")
                    StegRad({ Nummer(3) }, "Tyst annars", "Vakten talar bara när det finns något att varna för.", divider = false)
                }
            }

            Steg.PLATSEN -> when (Intro.platsSkarm(exakt, plats == Plats.UNGEFARLIG, fragadPlats)) {
                Intro.PlatsSkarm.FRAGA -> Sida("Fortsätt", { activity.introBegarPlats() }) {
                    Rubrik("Nu slår vi på vakten", "Först platsen: vakten behöver veta var du är för att kunna varna.")
                    Etikett("Din plats", top = 20.dp, bottom = 6.dp)
                    Brodtext(PLATSTEXT, Brand.text, Modifier.padding(horizontal = 4.dp))
                    Etikett("I nästa ruta från Android", top = 22.dp)
                    // Knapparnas namn är avlästa på en svensk Android 14 (introprov 14/11): "När du använder appen", inte "När appen används".
                    ValLista(listOf("Exakt" to true, "När du använder appen" to true, "Bara den här gången" to false, "Tillåt inte" to false))
                }
                Intro.PlatsSkarm.KLAR -> Sida("Fortsätt", { steg = Intro.efterPlatsen(true) }) {
                    Rubrik("Platsen är klar", "Vakten vet var du är medan den är på. Platsen stannar i telefonen.")
                    Spacer(Modifier.height(24.dp))
                    RowPanel { StegRad({ Bock() }, "Platsen", null, marke = "Exakt", markeFarg = Brand.green, divider = false) }
                }
                Intro.PlatsSkarm.EXAKT_BEHOVS -> Sida("Öppna inställningar", { activity.openAppSettings() },
                    lank = "Fortsätt utan exakt plats", onLank = { steg = Intro.efterPlatsen(false) }) {
                    Rubrik("Exakt plats behövs",
                        "Med ungefärlig plats vet Halkvakt inte vilken väg du kör på, och kan inte varna. Det ändras i telefonens inställningar.")
                    Etikett("Så gör du")
                    Atgardslista(listOf("Tryck Öppna inställningar", "Tryck Behörigheter, sedan Plats", "Slå på Använd exakt plats", "Kom tillbaka hit"))
                }
                Intro.PlatsSkarm.NEKAD -> Sida("Öppna inställningar", { activity.openAppSettings() },
                    lank = "Fortsätt utan plats", onLank = { steg = Intro.efterPlatsen(false) }) {
                    Rubrik("Vakten kan inte varna",
                        "Utan platsen vet Halkvakt inte vad som ligger framför dig. Det ändras i telefonens inställningar.")
                    Etikett("Så gör du")
                    Atgardslista(listOf("Tryck Öppna inställningar", "Tryck Behörigheter, sedan Plats",
                        "Välj Tillåt bara när appen används", "Kom tillbaka hit"))
                }
            }

            Steg.SJALVSTART -> when (if (autostart && activity.bakgrundOk()) Sjalv.PA else if (sjalv == Sjalv.PA) Sjalv.STARTAR_SJALV else sjalv) {
                Sjalv.FRAGA -> Sida("Slå på självstart", { activity.introBegarSjalvstart() },
                    lank = "Inte nu, jag startar själv", onLank = { sjalv = Sjalv.STARTAR_SJALV }) {
                    Rubrik("Ska vakten starta själv?", "Då vaknar den när du börjar köra. Du behöver inte öppna appen före resan.")
                    Etikett("Android frågar om tre saker")
                    RowPanel {
                        StegRad({ Nummer(1) }, "Fysisk aktivitet", "Så ser telefonen att du åker bil.")
                        StegRad({ Nummer(2) }, "Enheter i närheten", "Så märker den när bilens Bluetooth kopplar upp.")
                        StegRad({ Nummer(3) }, "Platsen, alltid", "Så kan vakten starta med appen stängd.", divider = false)
                    }
                    Brodtext("Platsen stannar i telefonen, även då. Välj Tillåt i de två första rutorna.", IntroText2,
                        Modifier.padding(start = 4.dp, end = 4.dp, top = 14.dp))
                }
                Sjalv.HELA_TIDEN -> Sida("Öppna sidan", { activity.introBegarBakgrund() }) {
                    Rubrik("Sista frågan: Tillåt alltid",
                        "Android öppnar en sida i telefonens inställningar. Välj Tillåt alltid och tryck sedan bakåt för att komma tillbaka hit.")
                    Etikett("På nästa sida från Android")
                    // Sidans val är avlästa på en svensk Android 14 (introprov 14/11): "Tillåt alltid", inte "Tillåt hela tiden".
                    ValLista(listOf("Tillåt alltid" to true, "Tillåt bara när appen används" to false, "Fråga varje gång" to false, "Tillåt inte" to false))
                    Brodtext("Halkvakt läser platsen även när appen är stängd eller skärmen släckt, så att vakten kan starta själv när du börjar " +
                        "köra. Platsen läses bara medan vakten är på och notisen Halkvakt vaktar syns. Den skickas aldrig av sig själv.",
                        IntroText2, Modifier.padding(start = 4.dp, end = 4.dp, top = 14.dp))
                }
                Sjalv.PA -> Sida("Fortsätt", { steg = Steg.NOTISER }) {
                    Rubrik("Självstarten är på", "Vakten startar själv när du kör. Notisen Halkvakt vaktar visar när den är på.")
                    Spacer(Modifier.height(24.dp))
                    RowPanel {
                        StegRad({ Bock() }, "Platsen", null, marke = "Alltid", markeFarg = Brand.green)
                        StegRad({ Bock() }, "Självstart när du kör", "Vakten lär sig bilens Bluetooth vid nästa körning.",
                            marke = "På", markeFarg = Brand.green, divider = false)
                    }
                }
                Sjalv.STARTAR_SJALV -> Sida("Fortsätt", { steg = Steg.NOTISER }, lank = "Slå på självstart", onLank = { sjalv = Sjalv.FRAGA }) {
                    Rubrik("Du startar vakten själv",
                        "Halkvakt varnar precis som vanligt. Du öppnar bara appen och trycker Starta vakten före varje resa.")
                    Etikett("Så blir det")
                    RowPanel {
                        StegRad({ Bock() }, "Alla varningar, när vakten är på", "Öppna Halkvakt och tryck Starta vakten före resan.")
                        StegRad({ Ring() }, "Självstart när du kör", "Vill du slippa trycka? Slå på den i Inställningar.", marke = "Av", divider = false)
                    }
                }
            }

            Steg.NOTISER -> when (Intro.notisSkarm(notiserPa, activity.notiserFragas(), fragadNotiser)) {
                Intro.NotisSkarm.FRAGA -> Sida("Fortsätt", { activity.introBegarNotiser() }, lank = "Inte nu", onLank = { steg = Steg.KLAR }) {
                    NotisRubrik(); ExempelBanner(); NotisLista()
                }
                Intro.NotisSkarm.PA -> Sida("Fortsätt", { steg = Steg.KLAR }) {
                    NotisRubrik(); ExempelBanner()
                    Spacer(Modifier.height(14.dp))
                    RowPanel { StegRad({ Bock() }, "Notiser", null, marke = "På", markeFarg = Brand.green, divider = false) }
                }
                Intro.NotisSkarm.AV -> Sida("Fortsätt", { steg = Steg.KLAR }, lank = "Slå på i inställningar", onLank = { activity.openAppSettings() }) {
                    NotisRubrik(); Box(Modifier.padding(top = 0.dp)) { ExempelBanner(blek = true) }
                    Brodtext("Notiserna är avslagna. Rösten varnar ändå, men varken bannern eller notisen Halkvakt vaktar syns.", IntroText2,
                        Modifier.padding(start = 4.dp, end = 4.dp, top = 14.dp))
                }
            }

            Steg.KLAR -> {
                val antalPa = 5 - avstangda.count { it in INTRO_FEM }
                when (Intro.slutSkarm(exakt, autostart)) {
                    Intro.SlutSkarm.REDO -> Sida("Klar", { klar() }, fot = "Allt går att ändra i Inställningar") {
                        Rubrik("Vakten är redo", "Nästa gång du kör säger rösten till om något ligger framför dig.")
                        Etikett("Det här har du nu")
                        RowPanel {
                            StegRad({ Bock() }, "Varningar", null, marke = "$antalPa av 5", markeFarg = Brand.green)
                            StegRad({ Bock() }, "Start", null, marke = "Själv när du kör", markeFarg = Brand.green)
                            BannerRad(notiserPa)
                        }
                        Etikett("Så fungerar det")
                        RowPanel {
                            StegRad({ Nummer(1) }, "Du kör iväg", "Vakten startar själv.")
                            StegRad({ Nummer(2) }, "Rösten säger till", "Innan du är framme vid faran.")
                            StegRad({ Nummer(3) }, "Du parkerar", "Vakten stänger av sig efter 15 minuter.", divider = false)
                        }
                    }
                    Intro.SlutSkarm.REDO_NAR_DU_STARTAR -> Sida("Klar", { klar() }, lank = "Slå på självstart",
                        onLank = { sjalv = Sjalv.FRAGA; steg = Steg.SJALVSTART }) {
                        Rubrik("Redo när du startar", "Vakten varnar så fort du tryckt Starta vakten. Den vaknar inte av sig själv.")
                        Etikett("Det här har du nu")
                        RowPanel {
                            StegRad({ Bock() }, "Varningar", null, marke = "$antalPa av 5", markeFarg = Brand.green)
                            StegRad({ Bock() }, "Start", null, marke = "Du trycker själv")
                            BannerRad(notiserPa)
                        }
                        Etikett("Så fungerar det")
                        RowPanel {
                            StegRad({ Nummer(1) }, "Öppna Halkvakt före resan", "Tryck Starta vakten.")
                            StegRad({ Nummer(2) }, "Rösten säger till", "Innan du är framme vid faran.")
                            StegRad({ Nummer(3) }, "Du parkerar", "Vakten stänger av sig efter 15 minuter.", divider = false)
                        }
                    }
                    Intro.SlutSkarm.NASTAN_REDO -> Sida("Slå på platsen", { steg = Steg.PLATSEN }, lank = "Gör det senare", onLank = { klar() }) {
                        Rubrik("Nästan redo", "En sak saknas för att vakten ska kunna varna.")
                        Etikett("Det här saknas")
                        RowPanel {
                            StegRad({ Ring() }, if (plats == Plats.UNGEFARLIG) "Exakt plats" else "Platsen",
                                "Utan den vet vakten inte vad som ligger framför dig.", marke = "Av", markeFarg = Brand.yellow, divider = false)
                        }
                        Etikett("Det här har du nu")
                        RowPanel {
                            StegRad({ Bock() }, "Varningar", null, marke = "$antalPa av 5", markeFarg = Brand.green)
                            BannerRad(notiserPa)
                        }
                    }
                }
            }
        }
    }
}

private val INTRO_FEM = setOf(HazardKind.SLIPPERY_SEGMENT, HazardKind.CAMERA, HazardKind.ACCIDENT, HazardKind.WILDLIFE, HazardKind.ICING_POINT)

/* ---------- Byggstenar ---------- */

/** En sida: innehållet rullar, knappen ligger fast nederst med en länk eller en fotrad under. */
@Composable
private fun ColumnScope.Sida(knapp: String, onKnapp: () -> Unit, lank: String? = null, onLank: (() -> Unit)? = null,
                             fot: String? = null, content: @Composable ColumnScope.() -> Unit) {
    Column(Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 28.dp).padding(top = 28.dp, bottom = 16.dp),
        content = content)
    Column(Modifier.fillMaxWidth().padding(bottom = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        YellowPill(knapp, onClick = onKnapp)
        Box(Modifier.heightIn(min = 44.dp), contentAlignment = Alignment.Center) {
            when {
                lank != null && onLank != null -> MonoLink(lank, onLank)
                fot != null -> MonoLabel(fot)
            }
        }
    }
}

@Composable
private fun Rubrik(titel: String, text: String) {
    Text(titel, color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.SemiBold, fontSize = 30.sp, lineHeight = 34.sp,
        letterSpacing = (-0.025).em)
    Text(text, color = IntroText2, fontFamily = Typo.sans, fontSize = 15.sp, lineHeight = 22.sp, modifier = Modifier.padding(top = 12.dp))
}

@Composable
private fun Etikett(text: String, top: androidx.compose.ui.unit.Dp = 24.dp, bottom: androidx.compose.ui.unit.Dp = 10.dp) =
    MonoLabel(text, modifier = Modifier.padding(start = 4.dp, top = top, bottom = bottom))

@Composable
private fun Brodtext(text: String, color: Color, modifier: Modifier = Modifier) =
    Text(text, color = color, fontFamily = Typo.sans, fontSize = 14.sp, lineHeight = 20.sp, modifier = modifier)

@Composable
private fun Nummer(n: Int) {
    Box(Modifier.size(22.dp).border(1.dp, Brand.dim, CircleShape), contentAlignment = Alignment.Center) {
        Text("$n", color = Brand.text, fontFamily = Typo.mono, fontWeight = FontWeight.SemiBold, fontSize = 11.sp)
    }
}

@Composable
private fun Bock() {
    Box(Modifier.size(22.dp).background(Brand.green, CircleShape), contentAlignment = Alignment.Center) {
        Icon(Icons.Filled.Check, contentDescription = "Klart", tint = Brand.bg, modifier = Modifier.size(15.dp))
    }
}

@Composable
private fun Ring() = Box(Modifier.size(22.dp).border(2.dp, IntroRing, CircleShape))

@Composable
private fun StegRad(lead: @Composable () -> Unit, titel: String, text: String?, marke: String? = null,
                    markeFarg: Color = Brand.dim, divider: Boolean = true) {
    Column {
        Row(Modifier.fillMaxWidth().padding(vertical = 15.dp), verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            lead()
            Column(Modifier.weight(1f)) {
                Text(titel, color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 16.sp, lineHeight = 21.sp)
                text?.let { Text(it, color = IntroText2, fontFamily = Typo.sans, fontSize = 14.sp, lineHeight = 20.sp, modifier = Modifier.padding(top = 3.dp)) }
            }
            marke?.let { MonoLabel(it, markeFarg, modifier = Modifier.padding(top = 4.dp)) }
        }
        if (divider) DashedDivider()
    }
}

@Composable
private fun VarningsRad(kind: HazardKind, titel: String, text: String, divider: Boolean = true) =
    StegRad({ HazardIcon(kind, 24.dp, Brand.text) }, titel, text, divider = divider)

@Composable
private fun BannerRad(pa: Boolean) =
    if (pa) StegRad({ Bock() }, "Banner på skärmen", null, marke = "På", markeFarg = Brand.green, divider = false)
    else StegRad({ Ring() }, "Banner på skärmen", "Rösten varnar ändå.", marke = "Av", divider = false)

/** Rutans val som Android visar dem, med de rätta förbockade och märkta. */
@Composable
private fun ValLista(rader: List<Pair<String, Boolean>>) {
    Column(Modifier.fillMaxWidth().background(Brand.panel, RoundedCornerShape(18.dp)).border(1.dp, IntroLinje, RoundedCornerShape(18.dp))
        .padding(horizontal = 20.dp)) {
        rader.forEachIndexed { i, (text, vald) ->
            Row(Modifier.fillMaxWidth().heightIn(min = 56.dp), verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                if (vald) Bock() else Ring()
                Text(text, color = if (vald) Brand.text else IntroText2, fontFamily = Typo.sans,
                    fontWeight = if (vald) FontWeight.SemiBold else FontWeight.Normal, fontSize = 16.sp, modifier = Modifier.weight(1f))
                if (vald) MonoLabel("Välj den", Brand.green)
            }
            if (i < rader.size - 1) DashedDivider()
        }
    }
}

@Composable
private fun Atgardslista(rader: List<String>) = RowPanel {
    rader.forEachIndexed { i, r -> StegRad({ Nummer(i + 1) }, r, null, divider = i < rader.size - 1) }
}

@Composable
private fun NotisRubrik() = Rubrik("Se varningen på skärmen",
    "Rösten varnar alltid. Med notiser syns varningen också som en banner överst på skärmen, vilken app du än har framme.")

@Composable
private fun NotisLista() {
    Etikett("Halkvakt skickar")
    RowPanel {
        StegRad({ Bock() }, "Varningar medan du kör", null)
        StegRad({ Bock() }, "Notisen Halkvakt vaktar", "Visar att vakten är på.")
        StegRad({ Bock() }, "En fråga efter resan, om du vill spara den", null, divider = false)
    }
}

/** Ett litet varningskort i gult, med motorns egen replik. */
@Composable
private fun ExempelKort() {
    Column(Modifier.fillMaxWidth().background(Brand.amber, RoundedCornerShape(18.dp)).padding(18.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            MonoLabel("Halkvakt varnar", Brand.onAmber); MonoLabel("8 s", Brand.onAmber)
        }
        Row(Modifier.padding(top = 14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            HazardIcon(HazardKind.SLIPPERY_SEGMENT, 40.dp, Brand.onAmber)
            Column {
                Text("Halka", color = Brand.onAmber, fontFamily = Typo.sans, fontWeight = FontWeight.SemiBold, fontSize = 28.sp)
                MonoLabel("Framför dig", Brand.onAmber, 11.sp)
            }
        }
        Text("”Varning: halka rapporterad på vägen framför dig.”", color = Brand.onAmber, fontFamily = Typo.sans, fontStyle = FontStyle.Normal,
            fontSize = 14.sp, lineHeight = 20.sp, modifier = Modifier.padding(top = 14.dp))
    }
}

/** En banner som den ser ut över en annan app. */
@Composable
private fun ExempelBanner(blek: Boolean = false) {
    Row(Modifier.padding(top = 20.dp).fillMaxWidth().background(Color(0xFF1A2327), RoundedCornerShape(16.dp)).padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Mark(20.dp, if (blek) Brand.dim else Brand.yellow)
        Column(Modifier.weight(1f)) {
            MonoLabel("Fartkamera · 500 m", if (blek) IntroRing else Brand.dim, 9.sp)
            Text("Fartkamera om 500 meter. Gränsen är 80.", color = if (blek) Brand.dim else Brand.text, fontFamily = Typo.sans, fontSize = 13.sp,
                modifier = Modifier.padding(top = 2.dp))
        }
    }
}
