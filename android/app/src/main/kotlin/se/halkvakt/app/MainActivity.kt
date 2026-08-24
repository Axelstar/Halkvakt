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
    private lateinit var autoBtn: Button
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
        autoBtn = Button(this).apply {
            textSize = 14f
            setBackgroundColor(Color.parseColor("#14344A")); setTextColor(Color.parseColor("#9FB3C8"))
            setOnClickListener { onAutostartToggle() }
        }
        refreshAutoBtn()
        root.addView(title)
        root.addView(status)
        root.addView(toggle, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 160))
        root.addView(autoBtn)
        root.addView(ScrollView(this).apply { addView(log) })
        setContentView(root)

        AlertBus.onEvent = { msg -> runOnUiThread { appendLog(msg) } }
        if (intent?.getBooleanExtra("auto_start", false) == true && hasPermissions() && !running) onToggle()
    }

    private fun refreshAutoBtn() {
        autoBtn.text = if (AutostartManager.isEnabled(this))
            "AUTOSTART: PÅ — vakten vaknar själv när du kör" else
            "AUTOSTART: AV — tryck för att slå på"
    }

    /**
     * The autostart permission ladder. Android FORCES background location ("Allow all the
     * time") to be requested in a separate step after foreground location — hence code 2→3.
     */
    private fun onAutostartToggle() {
        if (AutostartManager.isEnabled(this)) {
            AutostartManager.setEnabled(this, false)
            appendLog("Autostart av.")
            refreshAutoBtn(); return
        }
        val missing = mutableListOf<String>()
        if (!hasPermissions()) missing.add(Manifest.permission.ACCESS_FINE_LOCATION)
        if (Build.VERSION.SDK_INT >= 29 &&
            checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED)
            missing.add(Manifest.permission.ACTIVITY_RECOGNITION)
        if (Build.VERSION.SDK_INT >= 31 &&
            checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED)
            missing.add(Manifest.permission.BLUETOOTH_CONNECT)
        if (missing.isNotEmpty()) {
            appendLog("Autostart behöver veta när du sitter i ett fordon (rörelseigenkänning) och när bilens Bluetooth kopplar upp.")
            requestPermissions(missing.toTypedArray(), 2); return
        }
        if (Build.VERSION.SDK_INT >= 29 &&
            checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            appendLog("Sista steget: välj \"Tillåt hela tiden\" för platsen — annars får vakten inte se vägen när den startar sig själv i bakgrunden.")
            requestPermissions(arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION), 3); return
        }
        AutostartManager.setEnabled(this, true)
        appendLog("Autostart på. Vakten lär sig bilens Bluetooth vid nästa körning.")
        refreshAutoBtn()
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
            AutostartManager.controller(this).onManualStop()
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
        when (code) {
            1 -> if (hasPermissions()) onToggle() else appendLog("Utan platsbehörighet kan vakten inte varna. Ge behörighet och försök igen.")
            2, 3 -> onAutostartToggle() // klättra vidare i trappan; avslutas när allt är på plats
        }
    }

    private fun appendLog(msg: String) {
        val time = android.text.format.DateFormat.format("HH:mm:ss", System.currentTimeMillis())
        log.text = "[$time] $msg\n${log.text}".lines().take(60).joinToString("\n")
    }

    override fun onDestroy() { AlertBus.onEvent = null; super.onDestroy() }
}
