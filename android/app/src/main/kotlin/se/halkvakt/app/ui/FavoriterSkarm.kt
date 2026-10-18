// FLIKEN FAVORITER och frågan SPARA RESAN? (favoriterna steg 2, kort #357; DECISIONS #616, #625, #633) — spegel av iOS
// FavoriterView.swift och SparaResanKort.swift, samma ord. Steg 3 lägger till lägena (Nytt, Inget nytt, Lugnt) och rapporten.
// Ingen karta bakom linjen: ingen kartserver får veta var en resa går (#616, 6.2). Namnförslagen är fasta, med datum
// (Rutter.namnforslag); inget slås upp om platsen.
package se.halkvakt.app.ui

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
import se.halkvakt.app.Prefs
import se.halkvakt.app.RuttLager
import se.halkvakt.app.VantandeResa
import se.halkvakt.engine.Geo
import se.halkvakt.engine.Rutter
import se.halkvakt.engine.SparadRutt
import java.time.Instant
import java.time.ZoneId
import java.util.Calendar

@Composable
fun FavoriterScreen() {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val lager = remember { Favoriter.lager(ctx) }
    val erbjud by remember { Prefs.favErbjud(ctx) }.collectAsStateWithLifecycle(initialValue = false)
    val rutter by lager.rutter.collectAsStateWithLifecycle()
    var fragaTaBortAlla by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp).padding(top = 24.dp, bottom = 150.dp)) {
        Text("Favoriter", color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.SemiBold, fontSize = 32.sp, letterSpacing = (-0.025).em)
        Text("Vägar du kör ofta, sparade efter en resa.", color = Brand.text2, fontFamily = Typo.sans, fontSize = 15.sp, modifier = Modifier.padding(top = 10.dp))
        Spacer(Modifier.height(28.dp))
        RowPanel {
            GreenToggleRow("Erbjud att spara resor", "Appen frågar efter resan", erbjud) { on ->
                scope.launch { Prefs.setFavErbjud(ctx, on) }
                if (!on) lager.avsta()   // av ⇒ den väntande vägen raderas; de sparade står kvar (#633)
            }
        }
        if (rutter.isEmpty()) {
            Text(if (erbjud) "Kör en resa, så frågar appen efteråt om du vill spara den."
                 else "Slå på, så frågar appen efter en resa om du vill spara vägen du körde. Högst fem resor.",
                color = Brand.text2, fontFamily = Typo.sans, fontSize = 14.sp, lineHeight = 21.sp, modifier = Modifier.padding(top = 14.dp, start = 4.dp))
        } else {
            MonoLabel("Dina resor · ${rutter.size} av ${Rutter.MAX_RUTTER}", modifier = Modifier.padding(top = 28.dp, bottom = 10.dp, start = 4.dp))
            RowPanel {
                rutter.forEachIndexed { i, r -> ResaRad(r, divider = i < rutter.size - 1) { lager.taBort(r.id) } }
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
}

@Composable
private fun ResaRad(r: SparadRutt, divider: Boolean, onTaBort: () -> Unit) {
    Column {
        Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(r.namn, color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 16.sp)
                Text(under(r), color = Brand.dim, fontFamily = Typo.mono, fontSize = 11.sp, letterSpacing = 0.1.em)
            }
            Text("Ta bort", color = Brand.text2, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 14.sp,
                modifier = Modifier.heightIn(min = 44.dp).clickable(role = Role.Button, onClick = onTaBort)
                    .semantics { contentDescription = "Ta bort ${r.namn}" }.wrapContentHeight().padding(horizontal = 4.dp))
        }
        if (divider) DashedDivider()
    }
}

/** "34 KM · SPARAD 18/10" — längden räknas ur punkterna i telefonen. */
private fun under(r: SparadRutt): String {
    val m = r.punkter.zipWithNext { a, b -> Geo.haversineM(a[0], a[1], b[0], b[1]) }.sum()
    val km = if (m >= 10_000) "%.0f".format(m / 1000) else "%.1f".format(m / 1000).replace('.', ',')
    val datum = runCatching { Instant.parse(r.sparad).atZone(ZoneId.systemDefault()).let { "${it.dayOfMonth}/${it.monthValue}" } }.getOrDefault("")
    return "$km KM · SPARAD $datum"
}

/** Frågan efter resan på Redo. — bara med brytaren på och en väntande väg. */
@Composable
fun SparaResanKort(lager: RuttLager, resa: VantandeResa) {
    val rutter by lager.rutter.collectAsStateWithLifecycle()
    var eget by remember { mutableStateOf("") }
    var skriverEget by remember { mutableStateOf(false) }
    var gickInte by remember { mutableStateOf(false) }
    val spara = { namn: String -> gickInte = lager.spara(namn) != RuttLager.Svar.SPARAD }

    Column(Modifier.fillMaxWidth().background(Brand.panel, RoundedCornerShape(18.dp)).padding(horizontal = 20.dp)) {
        Column(Modifier.padding(vertical = 16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            MonoLabel("Spara resan?")
            Text("Resan slutade ${klockslag(resa.slut)}. Spara vägen du körde, så finns den under Favoriter. Den stannar i telefonen.",
                color = Brand.text2, fontFamily = Typo.sans, fontSize = 14.sp, lineHeight = 21.sp)
        }
        if (rutter.size >= Rutter.MAX_RUTTER) {
            Text("Du har redan fem resor. Ta bort en under Favoriter först.", color = Brand.yellow, fontFamily = Typo.sans, fontSize = 14.sp,
                modifier = Modifier.padding(bottom = 12.dp))
        } else {
            val c = Calendar.getInstance().apply { timeInMillis = resa.slut }
            // Två per rad: tre fick inte plats på en smal telefon, samma skäl som missraderna i Efter resan (fotostudion 26/9).
            Rutter.namnforslag(c.get(Calendar.DAY_OF_MONTH), c.get(Calendar.MONTH) + 1).chunked(2).forEach { rad ->
                Row(Modifier.padding(bottom = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    rad.forEach { namn ->
                        Text(namn, color = Brand.text, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 15.sp,
                            modifier = Modifier.heightIn(min = 44.dp).background(Raised2, RoundedCornerShape(22.dp))
                                .clickable(role = Role.Button) { spara(namn) }.wrapContentHeight().padding(horizontal = 14.dp))
                    }
                }
            }
            if (skriverEget) {
                OutlinedTextField(eget, { eget = it }, placeholder = { Text("Eget namn") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { if (eget.isNotBlank()) spara(eget) }),
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Brand.text, unfocusedTextColor = Brand.text,
                        focusedBorderColor = Brand.yellow, cursorColor = Brand.yellow),
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp))
                Box(Modifier.fillMaxWidth(), contentAlignment = androidx.compose.ui.Alignment.CenterEnd) {
                    MonoLink("Spara") { if (eget.isNotBlank()) spara(eget) }
                }
            } else MonoLink("Eget namn") { skriverEget = true }
            if (gickInte) Text("Resan kunde inte sparas. Försök igen.", color = Brand.yellow, fontFamily = Typo.sans, fontSize = 13.sp,
                modifier = Modifier.padding(top = 6.dp))
        }
        DashedDivider(modifier = Modifier.padding(top = 6.dp))
        MonoLink("Nej tack") { lager.avsta() }
    }
}

/** Upphöjda chips — samma ton som iOS Brand.raisedSolid. */
private val Raised2 = androidx.compose.ui.graphics.Color(0xFF1A2327)
