// The road-data check cadence (DECISIONS #741 punkt 4). Kotlin twin: SnapshotScheduleTest.kt — keep the cases alike.
import XCTest
@testable import HalkvaktEngine

final class KolltaktenTests: XCTestCase {
    private let gen: TimeInterval = 1_000_000

    func testNewDataPutsTheNextCheckAtGenPlusThreeMinutes() {
        let n = Kolltakten.nasta(nu: gen + 50, utfall: .ny, gen: gen, omkollad: false)
        XCTAssertEqual(n.at, gen + 180)
        XCTAssertFalse(n.omkoll)
    }

    /// A late NY (the file is older than three minutes) lands on the next grid point after now: never in the past, never more
    /// than 120 s away, and always on the grid gen + 180 + k × 120.
    func testLateNewDataLandsOnTheNextGridPointAfterNow() {
        for sek in stride(from: 180, through: 1_500, by: 1) {
            let nu = gen + TimeInterval(sek)
            let at = Kolltakten.nasta(nu: nu, utfall: .ny, gen: gen, omkollad: false).at
            XCTAssertGreaterThan(at, nu, "at \(sek) s")
            XCTAssertLessThanOrEqual(at - nu, 120, "at \(sek) s")
            XCTAssertEqual((at - gen - 180).truncatingRemainder(dividingBy: 120), 0, "at \(sek) s")
        }
        XCTAssertEqual(Kolltakten.rutnat(nu: gen + 180, gen: gen), gen + 300, "a grid point at exactly now moves to the next one")
        XCTAssertEqual(Kolltakten.rutnat(nu: gen + 181.5, gen: gen), gen + 300)
    }

    func testUnchangedLooksAgainAfterThirtySecondsOnceThenTheGrid() {
        var s = Kolltakten()
        XCTAssertTrue(s.borja(nu: gen + 170, force: true))
        s.klar(nu: gen + 170, utfall: .oforandrad, gen: gen)
        XCTAssertEqual(s.nastaKoll, gen + 200)
        XCTAssertFalse(s.borja(nu: gen + 199))
        XCTAssertTrue(s.borja(nu: gen + 200))
        s.klar(nu: gen + 201, utfall: .oforandrad, gen: gen)
        XCTAssertEqual(s.nastaKoll, gen + 300, "the re-check found nothing either: back to the grid")
    }

    func testAFailedCheckWaitsAMinute() {
        XCTAssertEqual(Kolltakten.nasta(nu: gen, utfall: .fel, gen: gen - 100, omkollad: false).at, gen + 60)
        let n = Kolltakten.nasta(nu: gen, utfall: .fel, gen: nil, omkollad: true)
        XCTAssertEqual(n.at, gen + 60)
        XCTAssertFalse(n.omkoll)
    }

    func testUnknownGenWaitsTwoMinutes() {
        XCTAssertEqual(Kolltakten.nasta(nu: gen, utfall: .ny, gen: nil, omkollad: false).at, gen + 120)
        XCTAssertEqual(Kolltakten.nasta(nu: gen, utfall: .oforandrad, gen: nil, omkollad: true).at, gen + 120)
    }

    func testOneCheckAtATime() {
        var s = Kolltakten()
        XCTAssertTrue(s.borja(nu: 0, force: true))   // the guard starts
        for t in 1...300 {
            XCTAssertFalse(s.borja(nu: TimeInterval(t)), "fix at \(t) s started a second check")
            XCTAssertFalse(s.borja(nu: TimeInterval(t), force: true), "force at \(t) s started a second check")
        }
        s.klar(nu: 300, utfall: .fel, gen: nil)
        XCTAssertFalse(s.borja(nu: 359))
        XCTAssertTrue(s.borja(nu: 360))
    }

    func testAClockBehindTheServerNeverPushesTheCheckPastThreeMinutes() {
        // The phone's clock is an hour behind: gen lies an hour in the phone's future.
        XCTAssertEqual(Kolltakten.nasta(nu: gen, utfall: .ny, gen: gen + 3600, omkollad: false).at, gen + 180)
        XCTAssertEqual(Kolltakten.nasta(nu: gen, utfall: .oforandrad, gen: gen + 3600, omkollad: true).at, gen + 180)
    }

    func testTheGuardsStartChecksAtOnce() {
        var s = Kolltakten()
        XCTAssertTrue(s.borja(nu: gen + 50))   // the first fix checks at once: nothing loaded yet
        s.klar(nu: gen + 50, utfall: .ny, gen: gen)
        XCTAssertFalse(s.borja(nu: gen + 60))
        XCTAssertTrue(s.borja(nu: gen + 60, force: true))
    }
}
