// PLANERA RESA (kort #659, DECISIONS #870): föraren söker en adress, Apple räknar ut vägen dit från där föraren är, och
// rapporten längs vägen räknas i telefonen som för en sparad resa. Det här är den enda filen som frågar Apple om en adress
// eller en väg. Den rör aldrig de körda vägarna som föraren sparat (ruttspärren i ci fäller det).
//
// Vad som lämnar telefonen, och bara när föraren själv söker: sökorden, förarens plats och målet, till Apple. Halkvakt får
// ingenting av det.
//
// En sökt resa sparas inte. Med en avresetid ligger den kvar i en fil till sex timmar efter avresan, så att påminnelsen kan
// visa den. Filen ligger under Application Support/resplan/ och undantas från säkerhetskopian.
import Foundation
import Observation
import MapKit
import CoreLocation

@MainActor
@Observable
final class Resplan: NSObject, MKLocalSearchCompleterDelegate {
    static let shared = Resplan()

    struct Plan: Codable, Equatable {
        let mal: String
        let punkter: [[Double]]   // [lon, lat], WGS84
        let km: Double
        /// Apples restid i sekunder. nil i en resa som sparades före DECISIONS #930.
        var restidS: Double?
        var avresa: Date?
        /// Adressen som text, så att resan kan sparas och sökas igen (DECISIONS #985). nil i en resa från före det.
        var fraga: String?
    }

    /// Ett förslag i söklistan: namnet och raden under.
    struct Forslag: Identifiable, Equatable {
        let id: Int
        let titel: String
        let under: String
    }

    enum Lage: Equatable { case vilar, soker, fel(String) }
    /// Vad söklistan säger när den är tom fast föraren har skrivit något.
    enum Soksvar { case inget, ingaTraffar, fel }

    /// Så länge ligger en resa med avresetid kvar efter avresan.
    static let kvarEfterAvresaS: TimeInterval = 6 * 3600

    private(set) var forslag: [Forslag] = []
    private(set) var soksvar = Soksvar.inget
    /// Startsidan ber fliken Resor om sökrutan eller om den planerade resan (DECISIONS #982). Räknare, så att flera lyssnare
    /// kan följa samma begäran utan att någon nollställer den.
    private(set) var sokBegard = 0
    private(set) var resanBegard = 0
    func begarSok() { sokBegard += 1 }
    func begarResan() { resanBegard += 1 }
    private(set) var plan: Plan?
    private(set) var lage: Lage = .vilar
    private var traffar: [MKLocalSearchCompletion] = []
    private let completer = MKLocalSearchCompleter()

    private override init() {
        super.init()
        completer.delegate = self
        completer.resultTypes = [.address, .pointOfInterest]
        // Sverige, så att förslagen börjar här.
        completer.region = MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: 62.0, longitude: 16.0),
                                              span: MKCoordinateSpan(latitudeDelta: 15, longitudeDelta: 15))
        if let p = Self.las(), let avresa = p.avresa, Date.now < avresa.addingTimeInterval(Self.kvarEfterAvresaS) {
            plan = p
        } else {
            Self.radera()
        }
    }

    // MARK: - Sökningen

    func sok(_ text: String) {
        let t = text.trimmingCharacters(in: .whitespaces)
        if t.isEmpty {
            completer.cancel()
            traffar = []
            forslag = []
            soksvar = .inget
        } else {
            completer.queryFragment = t
        }
    }

    nonisolated func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        let nya = Array(completer.results.prefix(6))
        let fragade = !completer.queryFragment.isEmpty
        Task { @MainActor in
            self.traffar = nya
            self.forslag = nya.enumerated().map { Forslag(id: $0.offset, titel: $0.element.title, under: $0.element.subtitle) }
            self.soksvar = nya.isEmpty && fragade ? .ingaTraffar : .inget
        }
    }

    nonisolated func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        Task { @MainActor in
            self.traffar = []
            self.forslag = []
            self.soksvar = .fel
        }
    }

    // MARK: - Vägen

    /// Slår upp förslaget och räknar ut bilvägen dit från där föraren är. Sant när resan finns i `plan`.
    func planera(_ val: Forslag) async -> Bool {
        // Förslagen kan ha bytts mellan att raden ritades och trycket: slå upp raden på det föraren såg, inte på dess plats i listan.
        guard let traff = traffar.first(where: { $0.title == val.titel && $0.subtitle == val.under }) else {
            lage = .fel("Förslagen ändrades. Välj adressen igen.")
            return false
        }
        let status = CLLocationManager().authorizationStatus
        guard status == .authorizedWhenInUse || status == .authorizedAlways else {
            GuardManager.shared.requestLocationPermission()
            lage = .fel("Halkvakt behöver platsen för att räkna ut vägen härifrån. Slå på den och sök igen.")
            return false
        }
        return await rakna(MKLocalSearch.Request(completion: traff), mal: val.titel,
                           fraga: val.under.isEmpty ? val.titel : "\(val.titel), \(val.under)")
    }

    /// En sparad sökt resa öppnas (DECISIONS #985): adressen söks igen hos Apple, och vägen räknas härifrån.
    func planera(sokt fraga: String, namn: String) async -> Bool {
        let status = CLLocationManager().authorizationStatus
        guard status == .authorizedWhenInUse || status == .authorizedAlways else {
            GuardManager.shared.requestLocationPermission()
            lage = .fel("Halkvakt behöver platsen för att räkna ut vägen härifrån. Slå på den och försök igen.")
            return false
        }
        let f = MKLocalSearch.Request()
        f.naturalLanguageQuery = fraga
        return await rakna(f, mal: namn, fraga: fraga)
    }

    private func rakna(_ sokning: MKLocalSearch.Request, mal namn: String, fraga text: String) async -> Bool {
        lage = .soker
        do {
            let svar = try await MKLocalSearch(request: sokning).start()
            guard let mal = svar.mapItems.first else {
                lage = .fel("Adressen hittades inte. Prova en annan.")
                return false
            }
            let fraga = MKDirections.Request()
            fraga.source = MKMapItem.forCurrentLocation()
            fraga.destination = mal
            fraga.transportType = .automobile
            guard let vag = try await MKDirections(request: fraga).calculate().routes.first else {
                lage = .fel("Ingen bilväg hittades dit.")
                return false
            }
            let n = vag.polyline.pointCount
            var koord = [CLLocationCoordinate2D](repeating: kCLLocationCoordinate2DInvalid, count: n)
            vag.polyline.getCoordinates(&koord, range: NSRange(location: 0, length: n))
            plan = Plan(mal: namn, punkter: koord.map { [$0.longitude, $0.latitude] }, km: vag.distance / 1000,
                        restidS: vag.expectedTravelTime, avresa: nil, fraga: text)
            Self.radera()
            AvreseNotis.taBort()
            lage = .vilar
            return true
        } catch {
            lage = .fel("Vägen kunde inte räknas ut. Kontrollera nätet och försök igen.")
            return false
        }
    }

    // MARK: - Avresan

    /// Sätter eller tar bort avresetiden. Med en tid schemaläggs påminnelsen och resan läggs i filen. Falskt när notiserna är
    /// avslagna eller tiden redan har passerat: då sätts ingen tid.
    func sattAvresa(_ tid: Date?) async -> Bool {
        guard var p = plan else { return false }
        guard let tid else {
            p.avresa = nil
            plan = p
            Self.radera()
            AvreseNotis.taBort()
            return true
        }
        guard await AvreseNotis.schemalagg(mal: p.mal, avresa: tid) else { return false }
        p.avresa = tid
        plan = p
        Self.skriv(p)
        return true
    }

    /// Tar bort resan, filen och påminnelsen.
    func rensa() {
        plan = nil
        Self.radera()
        AvreseNotis.taBort()
    }

    /// Resan med avresetid som startsidan visar, tills sex timmar efter avresan.
    var kommande: Plan? {
        guard let p = plan, let avresa = p.avresa, Date.now < avresa.addingTimeInterval(Self.kvarEfterAvresaS) else { return nil }
        return p
    }

    // MARK: - Filen

    private static var fil: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("resplan", isDirectory: true).appendingPathComponent("plan.json")
    }

    private static func las() -> Plan? {
        guard let data = try? Data(contentsOf: fil) else { return nil }
        return try? JSONDecoder().decode(Plan.self, from: data)
    }

    private static func radera() { try? FileManager.default.removeItem(at: fil) }

    /// Skriver filen och undantar den från säkerhetskopian. Går flaggan inte att sätta raderas filen.
    private static func skriv(_ p: Plan) {
        do {
            try FileManager.default.createDirectory(at: fil.deletingLastPathComponent(), withIntermediateDirectories: true)
            try JSONEncoder().encode(p).write(to: fil, options: .atomic)
            var u = fil
            var rv = URLResourceValues()
            rv.isExcludedFromBackup = true
            try u.setResourceValues(rv)
            u.removeAllCachedResourceValues()
            guard try u.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup == true else {
                throw CocoaError(.fileWriteUnknown)
            }
        } catch {
            radera()
        }
    }
}
