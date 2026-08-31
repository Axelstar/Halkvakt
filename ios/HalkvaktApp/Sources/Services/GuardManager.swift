// Vakten: CoreLocation i bakgrunden → motorsteg → röst + logg.
// Spegel av Androids GuardService-beteende: tystad kategori behåller
// motorminnet (gaten sitter vid munnen), körlägesstatistik, 8 s-varningskort.
import Foundation
import CoreLocation
import Observation
import HalkvaktEngine

@MainActor
@Observable
final class GuardManager: NSObject, CLLocationManagerDelegate {
    static let shared = GuardManager()

    // UI-tillstånd
    var running = false
    var authStatus: CLAuthorizationStatus = .notDetermined
    var snapshotInfo: String?
    var nearby: [NearbyItem] = []
    var lastLoc: (lon: Double, lat: Double)?
    var currentWarning: Alert?
    var history: [Alert] = []
    /// Platsen är avslagen (Aldrig/begränsad) — knappen kan inte starta; UI ska säga varför.
    var locationDenied = false

    // Körlägesstatistik
    var startedAt: Date?
    var distanceKm = 0.0
    var alertCount = 0
    var lastSaid: String?

    private let manager = CLLocationManager()
    private var engine: AlertEngine?
    private var hazards: [Hazard] = []
    private var prevLoc: CLLocation?
    private var dismissTask: Task<Void, Never>?
    private var headsUpTask: Task<Void, Never>?

    // Självstopp (DECISIONS #35): en vakt som startade automatiskt ska sluta automatiskt.
    // Står bilen still i en kvart är resan slut — vakten stoppar sig själv, tyst, så att
    // en start-automation räcker och ingen stopp-automation behövs. Samma tanke som
    // Androids onVehicleExit, men mätt i tid i stället för i rörelseigenkänning: iOS har
    // ingen motsvarande signal utan extra behörighet, och tid kräver ingenting.
    private static let idleStopAfter: TimeInterval = 15 * 60
    private static let movingKmh = 5.0
    private var lastMovedAt: Date?

    // Vakna själv (DECISIONS #40): med "Alltid" ber vi iOS väcka appen vid betydande
    // förflyttning (~500 m, även när appen är stängd — iOS startar om oss i bakgrunden).
    // När vi väcks PROVAR vi: full positionsström i högst 90 s. Ser vi bilfart startar
    // vakten på riktigt; annars släcks strömmen igen. Det är iOS-motsvarigheten till
    // Androids rörelseigenkänning. Apples lås gäller Bluetooth, inte plats.
    private static let probeMaxS: TimeInterval = 90
    private static let probeStartKmh = 15.0
    private var probing = false
    private var probeStartedAt: Date?
    /// Manuellt stopp mitt i körning får inte följas av en självstart sekunden efter.
    private var manualStoppedAt: Date?
    private static let noProbeAfterManualStopS: TimeInterval = 10 * 60

    override private init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
        manager.activityType = .automotiveNavigation
        manager.pausesLocationUpdatesAutomatically = false
    }

    // MARK: - Snapshot

    private var staleAnnounced = false

    func refreshSnapshot() async {
        do {
            let snap = try await SnapshotRepo.loadSnapshot()
            let gate = AgeGate.filter(snap.hazards, generatedAt: snap.generatedAt, now: .now)
            hazards = gate.hazards
            engine = AlertEngine(gate.hazards, EngineConfig.withPrefs())
            if gate.stale && running && !staleAnnounced {
                staleAnnounced = true
                SpeechService.shared.speak(AgeGate.staleLine)
            }
            let df = DateFormatter(); df.dateFormat = "HH:mm"
            let tid = snap.generatedAt > .distantPast ? df.string(from: snap.generatedAt) : "okänd tid"
            snapshotInfo = "\(gate.hazards.count) faror · väglag \(tid)"
            recomputeNearby()
        } catch {
            // Behåll förra snapshoten; UI visar gammal info-rad tills nästa lyckade.
        }
    }

    // MARK: - Start/stopp

    /// Introduktionen ber om platsen utan att starta vakten. Delegaten startar bara
    /// när ett start faktiskt begärts (startRequested) — annars skulle vakten dra igång
    /// i soffan i samma sekund tillståndet ges.
    private var startRequested = false

    func requestLocationPermission() {
        guard manager.authorizationStatus == .notDetermined else { return }
        manager.requestWhenInUseAuthorization()
    }

    func requestPermissionAndStart() {
        startRequested = true
        let status = manager.authorizationStatus
        print("[Vakten] start begärd, platstillstånd = \(status.rawValue)")
        switch status {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse:
            // Trappan: be om Alltid för släckt skärm; körning funkar redan nu.
            manager.requestAlwaysAuthorization()
            start()
        case .authorizedAlways:
            start()
        default:
            // Aldrig/begränsad. En knapp får inte svälja trycket tyst (Axel 31/8):
            // UI visar en rad med vägen till Inställningar.
            locationDenied = true
        }
    }

    /// Slå på självväckning om användaren tillåtit Alltid och inte stängt av funktionen.
    func armAutoWake() {
        guard Prefs.shared.autoWake, manager.authorizationStatus == .authorizedAlways else {
            manager.stopMonitoringSignificantLocationChanges()
            return
        }
        manager.startMonitoringSignificantLocationChanges()
        print("[Vakten] självväckning på")
    }

    /// Väckt av iOS utan att vakten kör: prova om vi är i en bil.
    private func beginProbe() {
        guard !running, !probing, Prefs.shared.autoWake else { return }
        if let t = manualStoppedAt, Date.now.timeIntervalSince(t) < Self.noProbeAfterManualStopS { return }
        probing = true
        probeStartedAt = .now
        manager.allowsBackgroundLocationUpdates = true
        manager.startUpdatingLocation()
        print("[Vakten] väckt — provar farten")
    }

    private func endProbe(startGuard: Bool) {
        probing = false
        probeStartedAt = nil
        if startGuard {
            print("[Vakten] bilfart — startar själv")
            startRequested = true
            start()
        } else {
            manager.stopUpdatingLocation()
            print("[Vakten] ingen bilfart — somnar om")
        }
    }

    private func start() {
        guard !running else { return }
        print("[Vakten] startar")
        running = true
        startedAt = .now
        lastMovedAt = .now
        distanceKm = 0; alertCount = 0; lastSaid = nil
        staleAnnounced = false
        prevLoc = nil
        manager.allowsBackgroundLocationUpdates = manager.authorizationStatus == .authorizedAlways
        manager.startUpdatingLocation()
        Task {
            await HeadsUpService.shared.requestAuthorizationIfNeeded()   // #23, en gång
            await refreshSnapshot()
        }
    }

    func stop() {
        if running { manualStoppedAt = .now }
        running = false
        startRequested = false
        probing = false; probeStartedAt = nil
        headsUpTask?.cancel()
        manager.stopUpdatingLocation()
        dismissTask?.cancel()
        currentWarning = nil
    }

    // MARK: - CLLocationManagerDelegate

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in
            self.authStatus = status
            if status == .authorizedAlways { self.armAutoWake() }
            if status == .authorizedWhenInUse || status == .authorizedAlways {
                self.locationDenied = false
                if !self.running && self.startRequested { self.requestPermissionAndStart() }
                else { self.manager.allowsBackgroundLocationUpdates = status == .authorizedAlways }
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        Task { @MainActor in
            for loc in locations { self.handle(loc) }
        }
    }

    private func handle(_ loc: CLLocation) {
        lastLoc = (loc.coordinate.longitude, loc.coordinate.latitude)
        if let p = prevLoc { distanceKm += loc.distance(from: p) / 1000 }
        prevLoc = loc
        recomputeNearby()

        if probing {
            let kmh = loc.speed >= 0 ? loc.speed * 3.6 : 0
            if kmh >= Self.probeStartKmh { endProbe(startGuard: true); return }
            if let t0 = probeStartedAt, Date.now.timeIntervalSince(t0) > Self.probeMaxS { endProbe(startGuard: false) }
            return
        }
        // Väckt av betydande förflyttning medan vakten är av ⇒ prova.
        if !running, manager.authorizationStatus == .authorizedAlways, Prefs.shared.autoWake {
            beginProbe()
            return
        }

        guard running, let engine else { return }

        // Självstopp: räkna rörelse, stoppa efter en kvarts stillastående.
        let kmh = loc.speed >= 0 ? loc.speed * 3.6 : 0
        if kmh >= Self.movingKmh { lastMovedAt = loc.timestamp }
        if let moved = lastMovedAt, loc.timestamp.timeIntervalSince(moved) >= Self.idleStopAfter {
            stop()
            manualStoppedAt = nil   // självstopp ⇒ nästa resa får väcka oss direkt
            print("[Vakten] stillastående en kvart — stoppar själv")
            return
        }

        let fix = Fix(t: loc.timestamp.timeIntervalSince1970,
                      lon: loc.coordinate.longitude,
                      lat: loc.coordinate.latitude,
                      speedKmh: loc.speed >= 0 ? loc.speed * 3.6 : nil,
                      headingDeg: loc.course >= 0 ? loc.course : nil)
        guard let alert = engine.step(fix) else { return }
        guard Prefs.shared.enabled(alert.kind) else { return }  // munnen tiger, minnet består

        alertCount += 1
        lastSaid = alert.text
        Prefs.shared.lastSaidText = alert.text   // #24: överlever omstart
        Prefs.shared.lastSaidAt = .now
        history.insert(alert, at: 0)
        if history.count > 50 { history.removeLast() }
        SpeechService.shared.speak(alert.text)
        headsUpTask?.cancel()
        headsUpTask = Task { await HeadsUpService.shared.show(alert) }   // #23

        currentWarning = alert
        dismissTask?.cancel()
        dismissTask = Task {
            try? await Task.sleep(for: .seconds(8))
            if !Task.isCancelled { self.currentWarning = nil }
        }
    }

    private func recomputeNearby() {
        guard let l = lastLoc else { return }
        nearby = Nearby.nearest(hazards, lon: l.lon, lat: l.lat)
    }
}

extension EngineConfig {
    @MainActor
    static func withPrefs() -> EngineConfig {
        var c = EngineConfig()
        c.leadMaxM = Prefs.shared.leadMaxM
        return c
    }
}
