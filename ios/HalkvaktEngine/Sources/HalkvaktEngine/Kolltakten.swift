// When the guard checks for new road data (DECISIONS #741 punkt 4). Kotlin twin: android/app/.../SnapshotSchedule.kt — same
// rule, same numbers. Lives in the engine package because it is pure and the package is what CI tests (as IdleStop).
//
// `publicera` writes manifest.json, static.json and live.json every two minutes (sql/074). The bucket's public address goes
// through Cloudflare, and a new file shows there 40–60 s after it was written (measured 29/10). So the next check is laid on the
// publication grid — generated_at + 120 s + 60 s margin — instead of a fixed half hour. A check that found nothing new
// (OFÖRÄNDRAD: the same manifest, or a file whose sha256 did not match yet) looks once more after 30 s and then goes back to the
// grid; a failed check (FEL) tries again after a minute, as before. One check at a time, and the guard's start checks at once.
import Foundation

public struct Kolltakten {
    public static let publiceringS: TimeInterval = 120
    public static let marginalS: TimeInterval = 60
    public static let omkollS: TimeInterval = 30
    public static let felS: TimeInterval = 60

    // Never a case named `none` (CLAUDE.md: on an Optional it silently becomes nil).
    public enum Utfall: Equatable, Sendable { case ny, oforandrad, fel }

    /// The earliest time of the next check, in seconds (any epoch, the same as `nu`).
    public private(set) var nastaKoll: TimeInterval = -.infinity
    private var pagar = false
    /// The next scheduled check is a re-check, and whether the running one is.
    private var omkoll = false
    private var dennaOmkoll = false

    public init() {}

    /// true = start a check now, and report back with `klar`. `force` (the guard starts) skips the wait, never a running check.
    public mutating func borja(nu: TimeInterval, force: Bool = false) -> Bool {
        if pagar || (!force && nu < nastaKoll) { return false }
        pagar = true
        dennaOmkoll = !force && omkoll
        return true
    }

    /// The check ended at `nu`. `gen` = generated_at of the snapshot the app now has, nil when unknown.
    public mutating func klar(nu: TimeInterval, utfall: Utfall, gen: TimeInterval?) {
        let n = Self.nasta(nu: nu, utfall: utfall, gen: gen, omkollad: dennaOmkoll)
        nastaKoll = n.at
        omkoll = n.omkoll
        pagar = false
    }

    /// The rule itself: the next check after a check that ended at `nu`, and whether that one is a re-check.
    /// `omkollad` = the check that ended was itself a re-check.
    public static func nasta(nu: TimeInterval, utfall: Utfall, gen: TimeInterval?, omkollad: Bool) -> (at: TimeInterval, omkoll: Bool) {
        switch utfall {
        case .fel: return (nu + felS, false)
        case .oforandrad where !omkollad: return (nu + omkollS, true)
        case .ny, .oforandrad: return (rutnat(nu: nu, gen: gen), false)
        }
    }

    /// The first grid point gen + 180 s + k × 120 s after `nu` (closed form): never in the past, never more than 120 s away once
    /// the file is late, and never more than 180 s away when the phone's clock is behind the server's. Unknown gen ⇒ `nu` + 120 s.
    public static func rutnat(nu: TimeInterval, gen: TimeInterval?) -> TimeInterval {
        guard let gen else { return nu + publiceringS }
        let t = gen + publiceringS + marginalS
        if t > nu { return min(t, nu + publiceringS + marginalS) }
        let r = t + (((nu - t) / publiceringS).rounded(.down) + 1) * publiceringS
        return r > nu ? r : r + publiceringS   // floating-point rounding must never leave it at `nu`
    }
}
