// One screen, no fluff: permission gate → big start/stop toggle → live event log.
// UI is built in code (no layout XML) — three screens total in v1 per PLAN; this is #1.
package se.halkvakt.app

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

class MainActivity : Activity() {

    private lateinit var status: TextView
    private lateinit var toggle: Button
    private lateinit var log: TextView
    private var running = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#0E1B25"))
            setPadding(48, 96, 48, 48)
        }
        val title = TextView(this).apply {
            text = "⚠ HALKVAKT"
            textSize = 28f; setTextColor(Color.parseColor("#FFC400"))
            typeface = Typeface.MONOSPACE; gravity = Gravity.CENTER
        }
        status = TextView(this).apply {
            text = "Redo. Tryck start när du sätter dig i bilen."
            textSize = 16f; setTextColor(Color.parseColor("#F3F6F9"))
            gravity = Gravity.CENTER; setPadding(0, 32, 0, 32)
        }
        toggle = Button(this).apply {
            text = "STARTA VAKTEN"
            textSize = 20f
            setBackgroundColor(Color.parseColor("#1E7A46")); setTextColor(Color.WHITE)
            setOnClickListener { onToggle() }
        }
        log = TextView(this).apply {
            textSize = 13f; setTextColor(Color.parseColor("#9FB3C8"))
            typeface = Typeface.MONOSPACE; setPadding(0, 32, 0, 0)
        }
        root.addView(title)
        root.addView(status)
        root.addView(toggle, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 160))
        root.addView(ScrollView(this).apply { addView(log) })
        setContentView(root)

        AlertBus.onEvent = { msg -> runOnUiThread { appendLog(msg) } }
    }

    private fun onToggle() {
        if (!running) {
            if (!hasPermissions()) { requestPermissions(); return }
            GuardService.start(this)
            running = true
            toggle.text = "STOPPA VAKTEN"
            toggle.setBackgroundColor(Color.parseColor("#8A2B2B"))
            status.text = "Vakten är på. Lägg undan telefonen och kör."
        } else {
            GuardService.stop(this)
            running = false
            toggle.text = "STARTA VAKTEN"
            toggle.setBackgroundColor(Color.parseColor("#1E7A46"))
            status.text = "Vakten är av."
        }
    }

    private fun hasPermissions(): Boolean =
        checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

    private fun requestPermissions() {
        val wanted = mutableListOf(Manifest.permission.ACCESS_FINE_LOCATION)
        if (Build.VERSION.SDK_INT >= 33) wanted.add(Manifest.permission.POST_NOTIFICATIONS)
        appendLog("Halkvakt behöver din plats för att veta vad som finns på vägen framför dig. Positionen lämnar aldrig telefonen.")
        requestPermissions(wanted.toTypedArray(), 1)
    }

    override fun onRequestPermissionsResult(code: Int, perms: Array<out String>, results: IntArray) {
        super.onRequestPermissionsResult(code, perms, results)
        if (hasPermissions()) onToggle() else appendLog("Utan platsbehörighet kan vakten inte varna. Ge behörighet och försök igen.")
    }

    private fun appendLog(msg: String) {
        val time = android.text.format.DateFormat.format("HH:mm:ss", System.currentTimeMillis())
        log.text = "[$time] $msg\n${log.text}".lines().take(60).joinToString("\n")
    }

    override fun onDestroy() { AlertBus.onEvent = null; super.onDestroy() }
}
