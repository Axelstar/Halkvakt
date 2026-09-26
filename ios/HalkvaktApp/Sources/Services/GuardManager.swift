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
    /// Körtid i sekunder, exklusive pauser (resan håller ihop över mackstopp).
    var drivingSeconds: TimeInterval {
        guard let s = startedAt else { return 0 }
        return max(0, Date.now.timeIntervalSince(s) - tripPausedSeconds)
    }
    var alertCount = 0
    var lastSaid: String?

    private let manager = CLLocationManager()
    private var engine: AlertEngine?
    private var hazards: [Hazard] = []
    /// Kort #203 lager 2: alla stationer ur static.json — missens plats. Den förra listan står kvar om en laddning saknar den.
    private var stations: [Station] = []
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
    // S4: facit skickas när bilen står stilla — en gång per stopp.
    private var stillSince: Date?
    private var flushedThisStop = false

    // Vakna själv (DECISIONS #40): med "Alltid" ber vi iOS väcka appen vid betydande
    // förflyttning (~500 m, även när appen är stängd — iOS startar om oss i bakgrunden).
    // När vi väcks PROVAR vi: full positionsström i högst 90 s. Ser vi bilfart startar
    // vakten på riktigt; annars släcks strömmen igen. Det är iOS-motsvarigheten till
    // Androids rörelseigenkänning. Apples lås gäller Bluetooth, inte plats.
    private static let probeMaxS: TimeInterval = 90
    private static let probeStartKmh = 15.0
    private var probing = false
    private var probeStartedAt: Date?
    /// Den här körningen startades av självväckningen (för kvittots körtid).
    private var autoWoke = false
    /// Vila efter misslyckat prov — annars kan en sen positionsleverans starta nästa direkt.
    private var lastProbeFailedAt: Date?
    // En RESA håller ihop över pauser (Bengt, Bodenresan 1/9): vakten somnar vid en kvarts
    // stillastående och vaknar när bilen rullar igen — men tid och sträcka ska inte nollas
    // vid varje macka. Vaknar vi inom 3 h fortsätter samma resa; efter det är det en ny.
    private static let sameTripWithin: TimeInterval = 3 * 3600
    private var tripEndedAt: Date?
    private var tripPausedSeconds: TimeInterval = 0
    private static let probeCooldownS: TimeInterval = 5 * 60
    /// Manuellt stopp mitt i körning får inte följas av en självstart sekunden efter.
    private var manualStoppedAt: Date?
    private static let noProbeAfterManualStopS: TimeInterval = 10 * 60

    // Parkeringsstaketet (DECISIONS #41): när vakten stoppar vet vi var bilen står. En
    // cirkel på 150 m runt platsen; iOS väcker oss när telefonen lämnar den — på ett par
    // hundra meter i stället för betydande förflyttning-tjänstens ~500 m. Nästa resa
    // börjar där förra slutade: hemma, jobbet, affären. Betydande förflyttning är kvar
    // som reserv för första resan efter installation, när ingen parkering är känd.
    private static let parkingRadiusM: CLLocationDistance = 150
    nonisolated private static let parkingRegionId = "halkvakt.parkering"   // läses från CoreLocations tråd

    override private init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
        manager.activityType = .automotiveNavigation
        manager.pausesLocationUpdatesAutomatically = false
    }

    // MARK: - Snapshot

    private var staleAnnounced = false

    // Kort #258 (DECISIONS #371): under resan laddas vägdatan om var 30:e minut, som på Android (SnapshotSchedule) —
    // en laddning i taget, och efter ett fel väntar nästa försök en minut. Förut laddades den bara vid start och när
    // Vakten-vyn visades, så åldersvakten prövades aldrig igen under en lång resa.
    private static let refreshEvery: TimeInterval = 30 * 60
    private static let retryAfter: TimeInterval = 60
    private var loading = false
    private var nextLoadAt = Date.distantPast

    /// `fresh`: vakten startar — ny motor, nytt minne. Annars behåller en körande vakt minnet (v14: aldrig säga om).
    func refreshSnapshot(fresh: Bool = false) async {
        guard !loading else { return }
        loading = true
        defer { loading = false }
        do {
            let snap = try await SnapshotRepo.loadSnapshot()
            let gate = AgeGate.filter(snap.hazards, generatedAt: snap.generatedAt, now: .now)
            hazards = gate.hazards
            if !snap.stations.isEmpty { stations = snap.stations }
            if !fresh, running, let engine { engine.updateHazards(gate.hazards) }
            else { engine = AlertEngine(gate.hazards, EngineConfig.withPrefs()) }
            nextLoadAt = .now.addingTimeInterval(Self.refreshEvery)
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
            nextLoadAt = .now.addingTimeInterval(Self.retryAfter)
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

    /// Steg två i Apples trappa: iOS visar "Ändra till Tillåt alltid?" bara när vi ber om
    /// det EFTER att Vid användning getts, och bara i förgrunden. Introduktionen ber här,
    /// så att Alltid — som självväckningen kräver — avgörs på sida två, inte vid första start.
    func requestAlwaysUpgrade() {
        guard manager.authorizationStatus == .authorizedWhenInUse else { return }
        manager.requestAlwaysAuthorization()
    }

    func requestPermissionAndStart() {
        startRequested = true
        let status = manager.authorizationStatus
        print("[Vakten] start begärd, platstillstånd = \(status.rawValue)")
        switch status {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse:
            // Trappan: be om Alltid för självstarten; körning med släckt skärm funkar redan nu (#273).
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
        if let t = lastProbeFailedAt, Date.now.timeIntervalSince(t) < Self.probeCooldownS { return }
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
            Prefs.shared.lastAutoWakeAt = .now      // kvittot: vaknade själv
            Prefs.shared.lastAutoWakeMinutes = 0
            autoWoke = true
            startRequested = true
            start()
        } else {
            lastProbeFailedAt = .now
            manager.stopUpdatingLocation()
            print("[Vakten] ingen bilfart — somnar om")
        }
    }

    private func start() {
        guard !running else { return }
        print("[Vakten] startar")
        running = true
        lastMovedAt = .now
        // Ny resa bara om det gått länge sedan förra; annars fortsätter tid och sträcka.
        let sameTrip = tripEndedAt.map { Date.now.timeIntervalSince($0) < Self.sameTripWithin } ?? false
        if sameTrip, let ended = tripEndedAt {
            tripPausedSeconds += Date.now.timeIntervalSince(ended)   // pausen räknas inte som körtid
        } else {
            distanceKm = 0; alertCount = 0; lastSaid = nil
            tripPausedSeconds = 0
            startedAt = .now
            // Kort #203: NY resa ⇒ nytt facitfönster. Fortsätter samma resa efter ett mackstopp
            // behålls det gamla — annars hade varningarna före macken fallit utanför "alla".
            Prefs.shared.tripStart = startedAt
        }
        tripEndedAt = nil
        staleAnnounced = false
        prevLoc = nil
        // ALLTID sant när vakten startas av föraren (#273). Apple: "When the value of this property is
        // true and you start location updates while the app is in the foreground, Core Location configures
        // the system to keep the app running to receive continuous background location updates … Updates
        // continue even if the app subsequently enters the background." Och när den är false görs det INTE,
        // uttryckligen "to extend the effectiveness of the authorizedWhenInUse authorization while the app
        // is running in the background". Raden gjorde förut detta villkorat av .authorizedAlways — alltså
        // tyst röst med släckt skärm för varje testare som svarade "Tillåt när appen används", vilket är
        // det enda iOS erbjuder i första rutan. Always behövs för SJÄLVSTARTEN (betydande förflyttning),
        // inte för resan föraren själv startar. Priset är den blå indikatorn, som Apple kräver — ärligt.
        manager.allowsBackgroundLocationUpdates = true
        manager.startUpdatingLocation()
        Task {
            await HeadsUpService.shared.requestAuthorizationIfNeeded()   // #23, en gång
            await refreshSnapshot(fresh: true)
        }
    }

    /// Lägg staketet runt bilens sista kända plats. Byter ut det förra — bara ett åt gången.
    private func fenceParking() {
        guard Prefs.shared.autoWake, manager.authorizationStatus == .authorizedAlways,
              let p = prevLoc ?? manager.location else { return }
        for r in manager.monitoredRegions where r.identifier == Self.parkingRegionId {
            manager.stopMonitoring(for: r)
        }
        let region = CLCircularRegion(center: p.coordinate, radius: Self.parkingRadiusM, identifier: Self.parkingRegionId)
        region.notifyOnEntry = false
        region.notifyOnExit = true
        manager.startMonitoring(for: region)
        print("[Vakten] parkeringsstaket lagt, 150 m")
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
        guard region.identifier == Self.parkingRegionId else { return }
        Task { @MainActor in
            print("[Vakten] lämnade parkeringen — provar farten")
            self.beginProbe()
        }
    }

    func stop() {
        Task { _ = await FacitSender.flush() }   // S4: resan är slut — osända svar går iväg
        if running, autoWoke, let t0 = startedAt {
            Prefs.shared.lastAutoWakeMinutes = max(1, Int(Date.now.timeIntervalSince(t0) / 60))
        }
        autoWoke = false
        if running { manualStoppedAt = .now }
        running = false
        startRequested = false
        probing = false; probeStartedAt = nil
        tripEndedAt = .now
        headsUpTask?.cancel()
        manager.stopUpdatingLocation()
        dismissTask?.cancel()
        currentWarning = nil
        efterResan()     // kort #203: frågan kommer till föraren, inte tvärtom
        fenceParking()   // nästa resa börjar här
    }

    /// Resan är slut. Lämnade den obesvarade varningar visas notisen med knapparna i sig.
    /// Ingen notis alls om betatestet är av — knappen finns bara för den som själv slagit på den (#186).
    private func efterResan() {
        let p = Prefs.shared
        guard p.facitOn, let sedan = p.tripStart else { return }
        let obes = Resan.obesvarade(p.history, p.facit, sedan: sedan)
        let missar = Missar.omarkerade(p.missar, sedan: sedan)   // #203 lager 2
        guard Resan.fragaKvar(sedan: sedan, nu: .now, obesvarade: obes.count + missar.count) else { return }
        Task { await EfterResanNotis.shared.visa(antal: obes.count, missar: missar.count) }
    }

    /// Kort #203 lager 2: "appen missade" — knappen i körläget och Siri-frasen. Sparar klockslaget, närmaste station och
    /// halkavsnitt inom 2 km; vad det var väljs efter resan. Utan betatest, position eller stationslista sparas ingenting.
    @discardableResult
    func markeraMiss() -> Bool {
        guard Prefs.shared.facitOn, let l = lastLoc,
              let st = Missar.narmasteStation(stations, lon: l.lon, lat: l.lat) else { return false }
        Prefs.shared.missar = Missar.markera(Prefs.shared.missar, t: .now, station: st,
                                             segment: Missar.narmasteSegment(hazards, lon: l.lon, lat: l.lat))
        return true
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
                // Samma regel som i start() (#273): bakgrundsuppdateringar gäller båda lägena.
                else if self.running { self.manager.allowsBackgroundLocationUpdates = true }
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

        guard running else { return }
        if !loading, Date.now >= nextLoadAt { Task { await refreshSnapshot() } }   // #258: också när första laddningen föll
        guard let engine else { return }

        // Självstopp: räkna rörelse, stoppa efter en kvarts stillastående.
        let kmh = loc.speed >= 0 ? loc.speed * 3.6 : 0
        if kmh >= Self.movingKmh { lastMovedAt = loc.timestamp }
        // S4: facit skickas när bilen står stilla (≥ 30 s under 3 km/h), en gång per stopp — aldrig under körning.
        if kmh >= 3 { stillSince = nil; flushedThisStop = false }
        else if stillSince == nil { stillSince = loc.timestamp }
        else if !flushedThisStop, let s = stillSince, loc.timestamp.timeIntervalSince(s) >= 30 {
            flushedThisStop = true
            Task { _ = await FacitSender.flush() }
        }
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
        // EN tidsstämpel för båda: facitsvaret nycklas på (id, t), och raden under "Senast sagt"
        // och raden i efter-resan-kortet måste peka på SAMMA svar. Två .now hade gett två rader.
        let nu = Date.now
        Prefs.shared.lastSaidText = alert.text   // #24: överlever omstart
        Prefs.shared.lastSaidAt = nu
        Prefs.shared.lastSaidId = alert.hazardId   // S4: facitknappen vet vilken varning
        // Kort #203: hela resan, inte bara den sista. Persistent — notisknappen kan tryckas
        // efter att appen dödats.
        Prefs.shared.history = AlertLog.append(Prefs.shared.history,
            AlertEntry(t: nu, kind: alert.kind.rawValue, text: alert.text, id: alert.hazardId))
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
