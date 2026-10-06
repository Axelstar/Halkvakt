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
//
// STANDSTILL (kort #262 Å2, DECISIONS #461). The distance tiers almost never leave NEAR where people live — a
// tester had a camera 2.0 km away and ran 1 Hz GPS all day on a desk. A phone that stands still cannot reach a
// hazard, so a still phone samples at MID at most. Proof: from 0 km/h, 5 s at a hard 3 m/s² is 37.5 m, after
// which the first moving fix (>= 3 km/h) puts the tier back on distance — far inside the 500 m camera trigger
// and the 3 km lead. Unknown speed is NOT still. "Still" is the same 3 km/h the trip-end facit flush uses.
package se.halkvakt.app

object CadencePolicy {
    const val NEAR_MS = 1_000L
    const val MID_MS = 5_000L
    const val FAR_MS = 15_000L

    const val NEAR_WITHIN_M = 5_000.0
    const val MID_WITHIN_M = 20_000.0

    const val STILL_BELOW_KMH = 3.0

    fun intervalMs(nearestHazardM: Double?, speedKmh: Double? = null): Long {
        val byDistance = when {
            nearestHazardM == null -> NEAR_MS
            nearestHazardM <= NEAR_WITHIN_M -> NEAR_MS
            nearestHazardM <= MID_WITHIN_M -> MID_MS
            else -> FAR_MS
        }
        val still = speedKmh != null && speedKmh < STILL_BELOW_KMH
        return if (still) maxOf(byDistance, MID_MS) else byDistance
    }
}
