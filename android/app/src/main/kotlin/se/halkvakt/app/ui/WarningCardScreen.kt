// VARNINGSKORTET — designöverlämningen v2 (DECISIONS #444), samma kort som iOS WarningCardView.
// Helskärm i gult i 8 s medan rösten talar, sedan bort av sig själv — ingen knapp (Androids "Uppfattat" och
// källrad borttagna). Innehållet kommer ur se.halkvakt.engine.WarningCard, som CI testar; här finns bara layouten.
// Fast ordning uppifrån: huvudrad, läge, ikon, rubrik, avstånd, råd, repliken, tidsstapeln.
package se.halkvakt.app.ui

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import se.halkvakt.app.R
import se.halkvakt.engine.WarningCard
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private val Ink = Brand.bg                   // #080B0D
private val Ink2 = Color(0xFF3A2E0B)         // andratext på gult
private const val SECONDS = 8

private fun iconRes(i: WarningCard.Icon) = when (i) {
    WarningCard.Icon.OLYCKA -> R.drawable.ikon_olycka
    WarningCard.Icon.HALKA -> R.drawable.ikon_halka
    WarningCard.Icon.FRYS -> R.drawable.ikon_frysrisk
    WarningCard.Icon.BRO -> R.drawable.ikon_bro
    WarningCard.Icon.VILT -> R.drawable.ikon_vilt
    WarningCard.Icon.KAMERA -> R.drawable.ikon_kamera
}

@Composable
fun WarningCardScreen(card: WarningCard) {
    val shownAt = remember { Date() }
    var started by remember { mutableStateOf(false) }
    val progress by animateFloatAsState(if (started) 1f else 0f, tween(SECONDS * 1000, easing = LinearEasing), label = "tid")
    var left by remember { mutableIntStateOf(SECONDS) }
    LaunchedEffect(Unit) {
        started = true
        while (left > 0) { delay(1000); left-- }
    }

    Column(
        Modifier.fillMaxSize().background(Brand.yellow).statusBarsPadding().navigationBarsPadding()
            .padding(start = 28.dp, end = 28.dp, top = 16.dp, bottom = 22.dp)
            .clearAndSetSemantics { contentDescription = "Halkvakt varnar. ${card.title}. ${card.quote}" },
    ) {
        Row(Modifier.fillMaxWidth().height(32.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(painterResource(R.drawable.ikon_mark), null, tint = Ink, modifier = Modifier.size(16.dp, 14.dp))
            Spacer(Modifier.width(10.dp))
            Text("HALKVAKT VARNAR", color = Ink, fontFamily = Typo.mono, fontWeight = FontWeight.SemiBold, fontSize = 11.sp, letterSpacing = 0.14.em)
            Spacer(Modifier.weight(1f))
            Text(SimpleDateFormat("HH:mm", Locale("sv", "SE")).format(shownAt), color = Ink, fontFamily = Typo.mono,
                fontWeight = FontWeight.Medium, fontSize = 11.sp, letterSpacing = 0.14.em)
        }
        Spacer(Modifier.height(16.dp))
        card.stage?.let {
            Text(it, color = Brand.yellow, fontFamily = Typo.mono, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, letterSpacing = 0.14.em,
                modifier = Modifier.background(Ink, RoundedCornerShape(8.dp)).padding(horizontal = 12.dp, vertical = 7.dp))
            Spacer(Modifier.height(22.dp))
        }
        Icon(painterResource(iconRes(card.icon)), null, tint = Ink, modifier = Modifier.size(96.dp))
        Spacer(Modifier.height(22.dp))
        Text(card.title, color = Ink, fontFamily = Typo.sans, fontWeight = FontWeight.SemiBold, fontSize = 56.sp,
            lineHeight = 55.sp, letterSpacing = (-0.035).em)
        card.sub?.let {
            Spacer(Modifier.height(10.dp))
            Text(it, color = Ink2, fontFamily = Typo.sans, fontWeight = FontWeight.Medium, fontSize = 20.sp, lineHeight = 26.sp)
        }
        Spacer(Modifier.height(26.dp))
        DistanceRow(card)
        card.advice?.let { advice ->
            Spacer(Modifier.height(22.dp))
            Column(Modifier.fillMaxWidth().background(Ink, RoundedCornerShape(16.dp)).padding(horizontal = 18.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(advice, color = Brand.yellow, fontFamily = Typo.sans, fontWeight = FontWeight.SemiBold, fontSize = 24.sp, lineHeight = 28.sp)
                card.adviceSub?.let {
                    Text(it, color = Brand.yellow, fontFamily = Typo.mono, fontWeight = FontWeight.Medium, fontSize = 11.sp, letterSpacing = 0.14.em)
                }
            }
        }
        Spacer(Modifier.weight(1f).heightIn(min = 16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(Modifier.height(20.dp), horizontalArrangement = Arrangement.spacedBy(3.dp), verticalAlignment = Alignment.CenterVertically) {
                listOf(8, 16, 11, 18, 7).forEach { h -> Box(Modifier.size(3.dp, h.dp).background(Ink2, RoundedCornerShape(2.dp))) }
            }
            Text("”${card.quote}”", color = Ink2, fontFamily = Typo.sans, fontSize = 15.sp, lineHeight = 20.sp)
        }
        Spacer(Modifier.height(18.dp))
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.weight(1f).height(4.dp).background(Ink.copy(alpha = .18f), RoundedCornerShape(2.dp))) {
                Box(Modifier.fillMaxHeight().fillMaxWidth(progress).background(Ink, RoundedCornerShape(2.dp)))
            }
            Text("$left S", color = Ink, fontFamily = Typo.mono, fontWeight = FontWeight.SemiBold, fontSize = 10.sp, letterSpacing = 0.14.em,
                modifier = Modifier.width(28.dp))
        }
    }
}

@Composable
private fun DistanceRow(card: WarningCard) {
    Row(Modifier.heightIn(min = 72.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(18.dp)) {
        when (val d = card.distance) {
            is WarningCard.Distance.Number -> Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(d.value, color = Ink, fontFamily = Typo.mono, fontWeight = FontWeight.SemiBold, fontSize = 68.sp, lineHeight = 68.sp,
                    letterSpacing = (-0.03).em)
                Text(d.unit, color = Ink, fontFamily = Typo.mono, fontWeight = FontWeight.SemiBold, fontSize = 18.sp, letterSpacing = 0.12.em,
                    modifier = Modifier.padding(bottom = 10.dp))
            }
            is WarningCard.Distance.Words -> Text(d.text, color = Ink, fontFamily = Typo.mono, fontWeight = FontWeight.SemiBold,
                fontSize = 24.sp, letterSpacing = 0.12.em)
        }
        card.road?.let {
            Text(it, color = Ink, fontFamily = Typo.mono, fontWeight = FontWeight.SemiBold, fontSize = 20.sp, letterSpacing = 0.06.em, maxLines = 1,
                modifier = Modifier.height(44.dp).border(3.dp, Ink, RoundedCornerShape(9.dp)).padding(horizontal = 12.dp).wrapContentHeight())
        }
        card.limit?.let {
            Box(Modifier.size(64.dp).border(6.dp, Ink, CircleShape), contentAlignment = Alignment.Center) {
                Text("$it", color = Ink, fontFamily = Typo.mono, fontWeight = FontWeight.SemiBold, fontSize = 24.sp)
            }
        }
    }
}
