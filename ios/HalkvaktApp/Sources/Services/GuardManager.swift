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

    func requestPermissionAndStart() {
        switch manager.authorizationStatus {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse:
            // Trappan: be om Alltid för släckt skärm; körning funkar redan nu.
            manager.requestAlwaysAuthorization()
            start()
        case .authorizedAlways:
            start()
        default:
            break
        }
    }

    private func start() {
        guard !running else { return }
        running = true
        startedAt = .now
        distanceKm = 0; alertCount = 0; lastSaid = nil
        staleAnnounced = false
        prevLoc = nil
        manager.allowsBackgroundLocationUpdates = manager.authorizationStatus == .authorizedAlways
        manager.startUpdatingLocation()
        Task { await refreshSnapshot() }
    }

    func stop() {
        running = false
        manager.stopUpdatingLocation()
        dismissTask?.cancel()
        currentWarning = nil
    }

    // MARK: - CLLocationManagerDelegate

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in
            self.authStatus = status
            if status == .authorizedWhenInUse || status == .authorizedAlways {
                if !self.running { self.requestPermissionAndStart() }
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
        guard running, let engine else { return }

        let fix = Fix(t: loc.timestamp.timeIntervalSince1970,
                      lon: loc.coordinate.longitude,
                      lat: loc.coordinate.latitude,
                      speedKmh: loc.speed >= 0 ? loc.speed * 3.6 : nil,
                      headingDeg: loc.course >= 0 ? loc.course : nil)
        guard let alert = engine.step(fix) else { return }
        guard Prefs.shared.enabled(alert.kind) else { return }  // munnen tiger, minnet består

        alertCount += 1
        lastSaid = alert.text
        history.insert(alert, at: 0)
        if history.count > 50 { history.removeLast() }
        SpeechService.shared.speak(alert.text)

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
