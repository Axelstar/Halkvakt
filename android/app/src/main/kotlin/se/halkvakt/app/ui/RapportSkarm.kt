// RAPPORTEN FÖR EN SPARAD RESA (favoriterna steg 3c, kort #357; FAVORITER §3, DECISIONS #636, #637) — spegel av iOS RapportView.swift,
// samma ord. Dit och Hem är samma sparade väg; Hem är den vända, så farorna kommer i körordning och köerna gäller förarens håll. Överst
// när läget är från, sedan det nya sedan förra kollen, allt längs vägen i viktordning, det tomma på en rad, rutan Halkvakt tror
// (kandidatens betavarningar, DECISIONS #739) och vakten. Inga avstånd på raderna: en station ligger vid en plats och får aldrig ett avstånd som mätningen inte bär. Android har
// ingen dra-för-att-uppdatera i den här Compose-versionen; KOLLA IGEN gör samma sak.
package se.halkvakt.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch
import se.halkvakt.app.Favoriter
import se.halkvakt.app.MainActivity
import se.halkvakt.app.Rapporten
import se.halkvakt.app.RuttLager
import se.halkvakt.engine.KandidatRad
import se.halkvakt.engine.RapportRad
import se.halkvakt.engine.ResansRapport
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

@Composable
fun RapportSkarm(ruttId: String, activity: MainActivity, back: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val lager = remember { Favoriter.lager(ctx) }
    val rutter by lager.rutter.collectAsStateWithLifecycle()
    val rapport by Rapporten.lage.collectAsStateWithLifecycle()
    var hem by rememberSaveable(ruttId) { mutableStateOf(false) }
    val fore = remember(ruttId) { lager.kollar.value[ruttId] }   // före den här kollen: grunden för Nytt
    // Hämtar om, och det som nu visas åt båda hållen blir förra kollen till nästa gång — bara när hämtningen lyckades. Annars ligger
    // den förra rapporten kvar, och förra kollen hade fått en tid då ingenting hämtades (B7-24).
    val uppdatera: suspend () -> Unit = {
        Rapporten.uppdatera(ctx)
        val l = Rapporten.lage.value
        if (!l.gickInte) l.resor[ruttId]?.let { lager.kollad(ruttId, ResansRapport.kollensIds(it.dit, it.hem)) }
    }
    LaunchedEffect(ruttId) { uppdatera() }

    Column(Modifier.fillMaxSize().background(Brand.bg).verticalScroll(rememberScrollState()).padding(horizontal = 24.dp).padding(top = 8.dp, bottom = 150.dp)) {
        Text("← FAVORITER", color = Brand.text, fontFamily = Typo.mono, fontSize = 11.sp, letterSpacing = 0.14.em,
            modifier = Modifier.heightIn(min = 44.dp).clickable(onClick = back).wrapContentHeight())
        val rutt = rutter.firstOrNull { it.id == ruttId }
        if (rutt != null) {
            Text(rutt.namn, color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.SemiBold, fontSize = 32.sp,
                letterSpacing = (-0.025).em, modifier = Modifier.padding(top = 8.dp))
            Row(Modifier.padding(top = 18.dp), verticalAlignment = Alignment.CenterVertically) {
                RiktningsVal(hem) { hem = it }
                Spacer(Modifier.weight(1f))
                MonoLink("Kolla igen") { scope.launch { uppdatera() } }
            }
            val resa = rapport.resor[ruttId]
            if (resa == null) {
                Text(if (rapport.gickInte) "Läget kunde inte hämtas. Tryck på Kolla igen." else "Kollar läget …", color = Brand.text2,
                    fontFamily = Typo.sans, fontSize = 15.sp, modifier = Modifier.padding(top = 28.dp))
            } else {
                RapportInnehall(if (hem) resa.hem else resa.dit, if (hem) resa.kandidatHem else resa.kandidatDit, fore, rapport)
            }
            Box(Modifier.fillMaxWidth().padding(top = 32.dp), contentAlignment = Alignment.Center) {
                YellowPill("Starta vakten", play = true) { activity.onToggle() }
            }
        }
    }
}

/** Dit eller Hem — samma väg, åt två håll. */
@Composable
private fun RiktningsVal(hem: Boolean, valj: (Boolean) -> Unit) {
    Row(Modifier.background(Brand.panel, RoundedCornerShape(50)).padding(4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        listOf("Dit" to false, "Hem" to true).forEach { (titel, varde) ->
            val vald = hem == varde
            Text(titel, color = if (vald) Brand.text else Brand.dim, fontFamily = Typo.sans, fontWeight = FontWeight.SemiBold, fontSize = 15.sp,
                modifier = Modifier.heightIn(min = 40.dp).background(if (vald) Valt else Color.Transparent, RoundedCornerShape(50))
                    .semantics { selected = vald }.clickable(role = Role.Tab) { valj(varde) }.wrapContentHeight().padding(horizontal = 22.dp))
        }
    }
}

@Composable
private fun RapportInnehall(rader: List<RapportRad>, kandidat: List<KandidatRad>?, fore: RuttLager.Koll?, l: Rapporten.Lage) {
    val nya = ResansRapport.nyttSedanKollen(rader, fore?.ids)
    val nyaIds = nya.map { it.id }.toSet()
    val ovriga = rader.filter { it.id !in nyaIds }
    val perId = rader.associateBy { it.id }

    MonoLabel("Just nu · kollat ${l.kollat?.let(::klockslag) ?: "–"}", modifier = Modifier.padding(top = 28.dp, bottom = 10.dp, start = 4.dp))
    Column(Modifier.fillMaxWidth().background(Brand.panel, RoundedCornerShape(18.dp)).padding(20.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Läget från ${l.lagesfil?.let(::klockslag) ?: "okänd tid"}", color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.SemiBold, fontSize = 17.sp)
        // B7-05 (DECISIONS #686 punkt 5): olyckor, vägarbeten, hinder, köer, restider och färjor kommer ur rapportfilen.
        Text("Rapporten från ${l.rapportfil?.let(::klockslag) ?: "okänd tid"}", color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.SemiBold, fontSize = 17.sp)
        Text("Läget kan ändras under resan, och då säger rösten till.", color = Brand.text2, fontFamily = Typo.sans, fontSize = 14.sp, lineHeight = 21.sp)
        if (l.gammaltVaglag) Text("Väglaget är äldre än 45 minuter och visas inte som läget just nu.", color = Brand.yellow, fontFamily = Typo.sans, fontSize = 14.sp)
        if (l.gamlaOlyckor) Text("Olyckorna är äldre än två timmar och visas inte som läget just nu.", color = Brand.yellow, fontFamily = Typo.sans, fontSize = 14.sp)
    }

    if (fore != null && nya.isNotEmpty()) {
        MonoLabel("Nytt sedan ${sedan(fore.tid)}", Brand.yellow, modifier = Modifier.padding(top = 24.dp, bottom = 10.dp, start = 4.dp))
        RowPanel { nya.forEachIndexed { i, r -> RapportRadVy(ResansRapport.titel(r.rubrik, r.vag), r.text, gul = true, divider = i < nya.size - 1) } }
    }

    MonoLabel("Längs vägen just nu", modifier = Modifier.padding(top = 24.dp, bottom = 10.dp, start = 4.dp))
    val grupper = ResansRapport.grupperade(ovriga)
    if (grupper.isEmpty()) {
        Text(if (nya.isEmpty()) "Inget rapporterat längs rutten just nu." else "Inget mer längs rutten just nu.", color = Brand.text2,
            fontFamily = Typo.sans, fontSize = 15.sp, modifier = Modifier.padding(start = 4.dp))
    } else {
        RowPanel {
            grupper.forEachIndexed { i, g ->
                val ensam = g.antal == 1 && !g.id.startsWith("grupp:")
                RapportRadVy(if (ensam) ResansRapport.titel(g.rubrik, perId[g.id]?.vag) else g.rubrik, g.text, divider = i < grupper.size - 1)
            }
        }
    }

    ResansRapport.tomtRad(rader, l.gammaltVaglag, l.gamlaOlyckor)?.let {
        Text(it, color = Brand.dim, fontFamily = Typo.sans, fontSize = 14.sp, lineHeight = 21.sp, modifier = Modifier.padding(top = 14.dp, start = 4.dp))
    }

    // Halkvakt tror (DECISIONS #739): kandidatens betavarningar i en egen ruta, en rad per väg, utan avstånd och aldrig i Nytt.
    MonoLabel("Halkvakt tror · beta", modifier = Modifier.padding(top = 24.dp, bottom = 10.dp, start = 4.dp))
    val tomt = ResansRapport.kandidatTomt(kandidat, l.gammaltVaglag)
    if (tomt != null || kandidat == null) {
        Text(tomt ?: ResansRapport.KANDIDAT_AV, color = Brand.text2, fontFamily = Typo.sans, fontSize = 14.sp, lineHeight = 21.sp,
            modifier = Modifier.padding(start = 4.dp))
    } else {
        RowPanel { kandidat.forEachIndexed { i, r -> RapportRadVy(r.rubrik, r.text, divider = i < kandidat.size - 1) } }
        Text(ResansRapport.KANDIDAT_FOT, color = Brand.dim, fontFamily = Typo.sans, fontSize = 14.sp, lineHeight = 21.sp,
            modifier = Modifier.padding(top = 14.dp, start = 4.dp))
    }
}

@Composable
private fun RapportRadVy(titel: String, text: String, gul: Boolean = false, divider: Boolean) {
    Column {
        Column(Modifier.fillMaxWidth().padding(vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(titel, color = if (gul) Brand.yellow else Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 16.sp)
            if (text.isNotEmpty()) Text(text, color = Brand.text2, fontFamily = Typo.sans, fontSize = 14.sp, lineHeight = 21.sp)
        }
        if (divider) DashedDivider()
    }
}

/** "16:20" i dag, "i går 16:20", annars "17 okt. 16:20". */
private fun sedan(ms: Long): String {
    val zon = ZoneId.systemDefault()
    val dag = Instant.ofEpochMilli(ms).atZone(zon).toLocalDate()
    val idag = LocalDate.now(zon)
    return when (dag) {
        idag -> klockslag(ms)
        idag.minusDays(1) -> "i går ${klockslag(ms)}"
        else -> "${dag.dayOfMonth} ${MANADER[dag.monthValue - 1]} ${klockslag(ms)}"
    }
}

private val MANADER = listOf("jan.", "feb.", "mars", "apr.", "maj", "juni", "juli", "aug.", "sep.", "okt.", "nov.", "dec.")

/** Den valda halvan av Dit / Hem — samma ton som iOS Brand.raisedSolid. */
private val Valt = Color(0xFF1A2327)
