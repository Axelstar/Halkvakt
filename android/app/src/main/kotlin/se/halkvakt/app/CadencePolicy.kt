// GPS cadence policy — PURE and unit-tested, same discipline as the engine.
//
// The battery truth: high-accuracy GPS at 1 Hz is the app's dominant power cost, and on
// a Norrland E4 stretch the nearest hazard can be 100+ km away. The guard's alert logic
// never needs more warning room than leadMaxM (3 000 m) + camera trigger (500 m), so far
// from everything we can sample sparsely and still be provably early.
//
// Safety proof for the tier boundaries (worst case 140 km/h ≈ 39 m/s):
//   FAR tier (>20 km, 15 s):  max 585 m travelled per fix → we re-evaluate the tier at
//     least ~33 fixes before crossing the 5 km line. Never late.
//   MID tier (5–20 km, 5 s):  max 195 m per fix → tier drops to NEAR before 4.8 km,
//     leaving > 1.5 km of margin above the 3 km max alert lead.
//   NEAR tier (<5 km, 1 s):   full alert readiness, identical to today's behaviour.
// Unknown position vs hazards (no snapshot yet) → NEAR: never trade safety for battery.
package se.halkvakt.app

object CadencePolicy {
    const val NEAR_MS = 1_000L
    const val MID_MS = 5_000L
    const val FAR_MS = 15_000L

    const val NEAR_WITHIN_M = 5_000.0
    const val MID_WITHIN_M = 20_000.0

    fun intervalMs(nearestHazardM: Double?): Long = when {
        nearestHazardM == null -> NEAR_MS
        nearestHazardM <= NEAR_WITHIN_M -> NEAR_MS
        nearestHazardM <= MID_WITHIN_M -> MID_MS
        else -> FAR_MS
    }
}
