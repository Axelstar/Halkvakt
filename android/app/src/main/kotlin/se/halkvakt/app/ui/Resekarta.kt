// VÄGEN PÅ KARTAN (kort #659, Förslag A, DECISIONS #933, #941) — Androids motsvarighet till iOS Kartbild. Googles karta i mörkt
// läge, stilla: vägen i grått, en gul prick per halksträcka och en gul ring per plats med frysrisk, där de ligger längs vägen.
// Kartan hämtar kartbilder från Google för området som visas. Ingen position slås på i kartan, och ingenting går till Halkvakt.
package se.halkvakt.app.ui

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.GoogleMapOptions
import com.google.android.gms.maps.MapView
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.maps.model.MapColorScheme
import com.google.android.gms.maps.model.MarkerOptions
import com.google.android.gms.maps.model.PolylineOptions

/** [vag], [halka] och [frysrisk] är punkter som [lon, lat]. */
@Composable
fun Resekarta(vag: List<DoubleArray>, halka: List<DoubleArray>, frysrisk: List<DoubleArray>, etikett: String, hojd: Dp = 236.dp) {
    val ctx = LocalContext.current
    val livscykel = LocalLifecycleOwner.current.lifecycle
    val vy = remember {
        MapView(ctx, GoogleMapOptions().mapColorScheme(MapColorScheme.DARK).mapToolbarEnabled(false).compassEnabled(false)
            .zoomControlsEnabled(false).scrollGesturesEnabled(false).zoomGesturesEnabled(false).rotateGesturesEnabled(false)
            .tiltGesturesEnabled(false))
    }
    DisposableEffect(livscykel) {
        var skapad = false
        val o = LifecycleEventObserver { _, h ->
            when (h) {
                Lifecycle.Event.ON_CREATE -> { vy.onCreate(null); skapad = true }
                Lifecycle.Event.ON_START -> vy.onStart()
                Lifecycle.Event.ON_RESUME -> vy.onResume()
                Lifecycle.Event.ON_PAUSE -> vy.onPause()
                Lifecycle.Event.ON_STOP -> vy.onStop()
                else -> Unit
            }
        }
        livscykel.addObserver(o)   // en ny observatör får händelserna fram till läget nu
        onDispose {
            livscykel.removeObserver(o)
            if (skapad) {
                if (livscykel.currentState.isAtLeast(Lifecycle.State.RESUMED)) vy.onPause()
                if (livscykel.currentState.isAtLeast(Lifecycle.State.STARTED)) vy.onStop()
                vy.onDestroy()
            }
        }
    }
    AndroidView({ vy }, Modifier.fillMaxWidth().height(hojd).clip(RoundedCornerShape(12.dp)).semantics { contentDescription = etikett }) { v ->
        v.getMapAsync { m -> rita(m, v, vag, halka, frysrisk) }
    }
}

private fun rita(m: GoogleMap, v: MapView, vag: List<DoubleArray>, halka: List<DoubleArray>, frysrisk: List<DoubleArray>) {
    if (vag.size < 2) return
    val t = v.resources.displayMetrics.density
    val ll = { p: DoubleArray -> LatLng(p[1], p[0]) }
    m.clear()
    m.setOnMarkerClickListener { true }
    m.addPolyline(PolylineOptions().addAll(vag.map(ll)).color(Brand.dim.toArgb()).width(4 * t))
    val marke = { p: DoubleArray, bild: Bitmap, z: Float ->
        m.addMarker(MarkerOptions().position(ll(p)).icon(BitmapDescriptorFactory.fromBitmap(bild)).anchor(0.5f, 0.5f).zIndex(z))
    }
    marke(vag.first(), prick(t, 12f, Brand.bg.toArgb(), Brand.text.toArgb()), 1f)
    marke(vag.last(), prick(t, 12f, Brand.text.toArgb(), Brand.text.toArgb()), 1f)
    val ring = prick(t, 14f, null, Brand.yellow.toArgb()); val gul = prick(t, 12f, Brand.yellow.toArgb(), Brand.bg.toArgb())
    frysrisk.forEach { marke(it, ring, 2f) }
    halka.forEach { marke(it, gul, 3f) }
    val ram = LatLngBounds.builder().apply { vag.forEach { include(ll(it)) } }.build()
    val b = v.width.takeIf { it > 0 } ?: v.resources.displayMetrics.widthPixels
    val h = v.height.takeIf { it > 0 } ?: (236 * t).toInt()
    m.moveCamera(CameraUpdateFactory.newLatLngBounds(ram, b, h, (28 * t).toInt()))
}

/** En rund markering: fylld med [fyllning] (eller tom) och med en kant i [kant]. */
private fun prick(t: Float, dp: Float, fyllning: Int?, kant: Int): Bitmap {
    val s = (dp * t).toInt().coerceAtLeast(4)
    val bild = Bitmap.createBitmap(s, s, Bitmap.Config.ARGB_8888)
    val c = Canvas(bild)
    val k = 2.5f * t
    val p = Paint(Paint.ANTI_ALIAS_FLAG)
    if (fyllning != null) { p.style = Paint.Style.FILL; p.color = fyllning; c.drawCircle(s / 2f, s / 2f, s / 2f - k / 2, p) }
    p.style = Paint.Style.STROKE; p.strokeWidth = k; p.color = kant
    c.drawCircle(s / 2f, s / 2f, s / 2f - k / 2, p)
    return bild
}

/** Vad märkena på kartan betyder, i ord. */
@Composable
fun Kartforklaring(modifier: Modifier = Modifier) {
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
        MonoLabel("● Halka", Brand.yellow, 10.sp)
        MonoLabel("○ Frysrisk", Brand.yellow, 10.sp)
        MonoLabel("— Vägen", Brand.dim, 10.sp)
    }
}
