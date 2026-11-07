// FLIKEN FAVORITER (kort #357; DECISIONS #616, #625, #633, #637, #817) — spegel av iOS FavoriterView.swift, samma ord. Överst
// dagens resor i väntan på namn (Favoriter 2a: fältet är sparknappen, förslagen väljer namn, Släng för sig, taket synligt), sedan
// de sparade resorna, var och en med sitt läge (Nytt, Inget nytt, Lugnt; FAVORITER §2), sin rapport (RapportSkarm.kt, steg 3c),
// Byt namn och Ta bort; läget räknas om när fliken visas.
// Ingen karta bakom linjen: ingen kartserver får veta var en resa går (#616, 6.2). Namnförslagen är fasta, med datum
// (Rutter.namnforslag); inget slås upp om platsen.
package se.halkvakt.app.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch
import se.halkvakt.app.Favoriter
import se.halkvakt.app.MainActivity
import se.halkvakt.app.Prefs
import se.halkvakt.app.Rapporten
import se.halkvakt.app.FavoritNotis
import se.halkvakt.app.RuttLager
import se.halkvakt.engine.Geo
import se.halkvakt.engine.ResansRapport
import se.halkvakt.engine.Rutter
import se.halkvakt.engine.SparadRutt
import se.halkvakt.engine.Vantande
import java.time.Instant
import java.time.ZoneId
import java.util.Calendar

/** Fliken: listan, och rapporten för den resa föraren öppnat — en nivå till, som inställningarnas undersidor. */
@Composable
fun FavoriterScreen(activity: MainActivity) {
    var oppen by rememberSaveable { mutableStateOf<String?>(null) }
    androidx.activity.compose.BackHandler(enabled = oppen != null) { oppen = null }
    AnimatedContent(oppen, transitionSpec = {
        val e = CubicBezierEasing(.2f, .8f, .2f, 1f)
        if (targetState != null) slideInHorizontally(tween(420, easing = e)) { it } togetherWith fadeOut(tween(420))
        else fadeIn(tween(420)) togetherWith slideOutHorizontally(tween(420, easing = e)) { it }
    }, label = "favoriter") { id ->
        if (id == null) FavoriterLista { oppen = it } else RapportSkarm(id, activity) { oppen = null }
    }
}

@Composable
private fun FavoriterLista(oppna: (String) -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val lager = remember { Favoriter.lager(ctx) }
    val erbjud by remember { Prefs.favErbjud(ctx) }.collectAsStateWithLifecycle(initialValue = false)
    val rutter by lager.rutter.collectAsStateWithLifecycle()
    val dagens by lager.dagens.collectAsStateWithLifecycle()
    val kollar by lager.kollar.collectAsStateWithLifecycle()
    val rapport by Rapporten.lage.collectAsStateWithLifecycle()
    var fragaTaBortAlla by remember { mutableStateOf(false) }
    var byterNamn by remember { mutableStateOf<SparadRutt?>(null) }
    // När fliken visas, och när en resa sparas eller tas bort medan den visas.
    LaunchedEffect(rutter.map { it.id }) { lager.rensaGamla(); Rapporten.uppdatera(ctx) }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp).padding(top = 24.dp, bottom = 150.dp)) {
        Text("Favoriter", color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.SemiBold, fontSize = 32.sp, letterSpacing = (-0.025).em)
        Text("Vägar du kör ofta. Båda hållen räknas som en.", color = Brand.text2, fontFamily = Typo.sans, fontSize = 15.sp, modifier = Modifier.padding(top = 10.dp))
        Spacer(Modifier.height(28.dp))
        RowPanel {
            GreenToggleRow("Erbjud att spara resor", "Appen frågar efter resan", erbjud) { on ->
                scope.launch { Prefs.setFavErbjud(ctx, on) }
                if (!on) { lager.slangAlla(); FavoritNotis.taBort(ctx) }   // av ⇒ dagens resor raderas; de sparade står kvar (#633)
            }
        }
        if (erbjud && dagens.isNotEmpty()) {
            MonoLabel("Dagens resor · ${dagens.size} att spara", modifier = Modifier.padding(top = 28.dp, bottom = 10.dp, start = 4.dp))
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                dagens.forEach { v -> key(v.id) { DagensRad(lager, v, full = rutter.size >= Rutter.MAX_RUTTER) } }
            }
        }
        if (rutter.isEmpty()) {
            Text(if (erbjud) "Kör en resa, så frågar appen efteråt om du vill spara den."
                 else "Slå på, så frågar appen efter en resa om du vill spara vägen du körde. Högst fem resor.",
                color = Brand.text2, fontFamily = Typo.sans, fontSize = 14.sp, lineHeight = 21.sp, modifier = Modifier.padding(top = 14.dp, start = 4.dp))
        } else {
            MonoLabel(if (rutter.size >= Rutter.MAX_RUTTER) "${Rutter.MAX_RUTTER} av ${Rutter.MAX_RUTTER} · listan är full"
                      else "Dina resor · ${rutter.size} av ${Rutter.MAX_RUTTER}", modifier = Modifier.padding(top = 28.dp, bottom = 10.dp, start = 4.dp))
            RowPanel {
                rutter.forEachIndexed { i, r ->
                    val lage = rapport.resor[r.id]?.let { ResansRapport.radlage(it.dit, it.hem, kollar[r.id]?.ids) }
                    ResaRad(r, lage, rapport.laddar, rapport.gickInte, divider = i < rutter.size - 1, onOppna = { oppna(r.id) },
                        onBytNamn = { byterNamn = r }) { lager.taBort(r.id) }
                }
            }
            Box(Modifier.fillMaxWidth().padding(top = 12.dp), contentAlignment = androidx.compose.ui.Alignment.Center) {
                MonoLink("Ta bort alla") { fragaTaBortAlla = true }
            }
        }
        Column(Modifier.padding(top = 24.dp, start = 4.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            MonoLabel("Bara i telefonen")
            Text("Resorna sparas bara i telefonen och följer inte med i säkerhetskopian. De försvinner när du tar bort dem eller appen.",
                color = Brand.text2, fontFamily = Typo.sans, fontSize = 14.sp, lineHeight = 21.sp)
        }
    }
    if (fragaTaBortAlla) AlertDialog(
        onDismissRequest = { fragaTaBortAlla = false },
        title = { Text("Ta bort alla sparade resor?") },
        confirmButton = { TextButton({ lager.taBortAlla(); fragaTaBortAlla = false }) { Text("Ta bort alla", color = Brand.yellow) } },
        dismissButton = { TextButton({ fragaTaBortAlla = false }) { Text("Avbryt", color = Brand.text) } },
        containerColor = Brand.panel, titleContentColor = Brand.text,
    )
    byterNamn?.let { r ->
        var namn by remember(r.id) { mutableStateOf(r.namn) }
        AlertDialog(
            onDismissRequest = { byterNamn = null },
            title = { Text("Byt namn") },
            text = { OutlinedTextField(namn, { namn = it }, singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Brand.text, unfocusedTextColor = Brand.text,
                    focusedBorderColor = Brand.yellow, cursorColor = Brand.yellow)) },
            confirmButton = { TextButton({ lager.bytNamn(r.id, namn); byterNamn = null }) { Text("Spara", color = Brand.yellow) } },
            dismissButton = { TextButton({ byterNamn = null }) { Text("Avbryt", color = Brand.text) } },
            containerColor = Brand.panel, titleContentColor = Brand.text,
        )
    }
}

/** En av dagens resor (Favoriter 2a, DECISIONS #817): fältet först, förslagen under (de väljer namn, sparar inte), Spara och Släng
 *  för sig. Är listan full står taket i raden i stället för fältet. */
@Composable
private fun DagensRad(lager: RuttLager, v: Vantande, full: Boolean) {
    val ctx = LocalContext.current
    var namn by remember { mutableStateOf("") }
    var gickInte by remember { mutableStateOf(false) }
    val spara = { gickInte = lager.spara(v.id, namn) != RuttLager.Svar.SPARAD; if (!gickInte) FavoritNotis.taBort(ctx) }
    Column(Modifier.fillMaxWidth().background(Brand.panel, RoundedCornerShape(18.dp)).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            val tid = Instant.ofEpochMilli((v.slutS * 1000).toLong()).atZone(ZoneId.systemDefault()).let { "%02d:%02d".format(it.hour, it.minute) }
            Text(if (v.dithem) "${FavoritNotis.km(v.km)} · dit och hem" else "${FavoritNotis.km(v.km)} · slutade $tid",
                color = Brand.text, fontFamily = Typo.mono, fontWeight = FontWeight.Medium, fontSize = 12.sp, letterSpacing = 0.05.em,
                modifier = Modifier.weight(1f))
            MonoLink("Släng") { lager.slang(v.id) }
        }
        if (full) {
            Text("Listan är full. Ta bort en resa nedan för att spara den här.", color = Brand.text2, fontFamily = Typo.sans, fontSize = 14.sp)
        } else {
            Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                OutlinedTextField(namn, { namn = it }, placeholder = { Text("t.ex. Jobbet") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { spara() }),
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Brand.text, unfocusedTextColor = Brand.text,
                        focusedBorderColor = Brand.yellow, cursorColor = Brand.yellow),
                    modifier = Modifier.weight(1f))
                Text("Spara", color = Brand.yellow, fontFamily = Typo.sans, fontWeight = FontWeight.SemiBold, fontSize = 15.sp,
                    modifier = Modifier.heightIn(min = 48.dp).clickable(role = Role.Button) { spara() }.wrapContentHeight().padding(start = 12.dp))
            }
            val d = Instant.ofEpochMilli((v.slutS * 1000).toLong()).atZone(ZoneId.systemDefault())
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                Text("Förslag:", color = Brand.dim, fontFamily = Typo.sans, fontSize = 13.sp)
                Rutter.namnforslag(d.dayOfMonth, d.monthValue).dropLast(1).forEach { f ->   // datumet är det tomma fältets namn
                    Text(f, color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 14.sp,
                        modifier = Modifier.heightIn(min = 36.dp).background(Raised2, RoundedCornerShape(18.dp))
                            .clickable(role = Role.Button, onClickLabel = "Väljer namnet, sparar inte") { namn = f }
                            .wrapContentHeight().padding(horizontal = 12.dp))
                }
            }
            Text(if (gickInte) "Resan kunde inte sparas. Försök igen." else "Tomt namn sparar som ${se.halkvakt.app.Favoriter.datumnamn(v)}.",
                color = if (gickInte) Brand.yellow else Brand.dim, fontFamily = Typo.sans, fontSize = 12.sp)
        }
    }
}

@Composable
private fun ResaRad(r: SparadRutt, lage: ResansRapport.Radlage?, laddar: Boolean, gickInte: Boolean, divider: Boolean,
                    onOppna: () -> Unit, onBytNamn: () -> Unit, onTaBort: () -> Unit) {
    Column {
        Column(Modifier.fillMaxWidth().padding(top = 10.dp).clickable(role = Role.Button, onClickLabel = "Öppnar rapporten för resan", onClick = onOppna),
            verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(r.namn, color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 16.sp)
            Text(under(r), color = Brand.dim, fontFamily = Typo.mono, fontSize = 11.sp, letterSpacing = 0.1.em)
            RadLageText(lage, laddar, gickInte)
        }
        // Dämpade länkar (gult bara för det som gör något, DECISIONS #817): Byt namn och Ta bort på samma ställe på varje rad.
        Row(horizontalArrangement = Arrangement.spacedBy(18.dp), modifier = Modifier.padding(bottom = 4.dp)) {
            Box(Modifier.semantics { contentDescription = "Byt namn på ${r.namn}" }) { MonoLink("Byt namn", onBytNamn) }
            Box(Modifier.semantics { contentDescription = "Ta bort ${r.namn}" }) { MonoLink("Ta bort", onTaBort) }
        }
        if (divider) DashedDivider()
    }
}

/** Radens läge under namnet: Nytt med ett gult märke, Inget nytt med det största som pågår, eller Lugnt (FAVORITER §2). */
@Composable
private fun RadLageText(lage: ResansRapport.Radlage?, laddar: Boolean, gickInte: Boolean) {
    val m = Modifier.padding(top = 3.dp)
    when (lage) {
        is ResansRapport.Radlage.Nytt -> Row(m, verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(if (lage.antal == 1) "1 NY" else "${lage.antal} NYA", color = Brand.onAmber, fontFamily = Typo.mono, fontWeight = FontWeight.SemiBold,
                fontSize = 10.sp, letterSpacing = 0.12.em,
                modifier = Modifier.background(Brand.yellow, RoundedCornerShape(50)).padding(horizontal = 7.dp, vertical = 3.dp))
            Text(ResansRapport.titel(lage.viktigast.rubrik, lage.viktigast.vag), color = Brand.yellow, fontFamily = Typo.sans, fontSize = 14.sp, maxLines = 2)
        }
        is ResansRapport.Radlage.IngetNytt -> Text("Inget nytt · ${ResansRapport.titel(lage.storst.rubrik, lage.storst.vag)}", color = Brand.text2,
            fontFamily = Typo.sans, fontSize = 14.sp, maxLines = 2, modifier = m)
        ResansRapport.Radlage.Lugnt -> Text("Lugnt · inget rapporterat längs vägen just nu", color = Brand.greenText, fontFamily = Typo.sans,
            fontSize = 14.sp, modifier = m)
        null -> if (laddar || gickInte) Text(if (laddar) "Kollar läget …" else "Läget kunde inte hämtas", color = Brand.dim, fontFamily = Typo.sans,
            fontSize = 14.sp, modifier = m)
    }
}

/** "34 KM · SPARAD 18/10" — längden räknas ur punkterna i telefonen. */
private fun under(r: SparadRutt): String {
    val m = r.punkter.zipWithNext { a, b -> Geo.haversineM(a[0], a[1], b[0], b[1]) }.sum()
    val km = if (m >= 10_000) "%.0f".format(m / 1000) else "%.1f".format(m / 1000).replace('.', ',')
    val datum = runCatching { Instant.parse(r.sparad).atZone(ZoneId.systemDefault()).let { "${it.dayOfMonth}/${it.monthValue}" } }.getOrDefault("")
    return "$km KM · SPARAD $datum"
}

/** Upphöjda chips — samma ton som iOS Brand.raisedSolid. */
private val Raised2 = androidx.compose.ui.graphics.Color(0xFF1A2327)
