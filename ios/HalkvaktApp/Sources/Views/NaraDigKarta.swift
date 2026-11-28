// KARTAN NÄRA DIG (kort #659, DECISIONS #870, #873): Apples karta med det närmaste omkring föraren, på startsidan. Märkena är
// desamma som för en planerad resa (Axel 20/11, DECISIONS #933): en gul prick per halksträcka, mitt på sträckan, en gul ring för
// frysrisk och en vit prick för föraren. Olyckor och vilt har kvar sina ikoner. Fartkamerorna står inte på kartan: antalet står
// under listan. Utan plats visas hela landet med bara halkan.
// Utsnittet (DECISIONS #919, Axel 20/11): kartan når en och en halv gång så långt som den närmaste faran, minst en mil och
// högst sex, i steg om fem kilometer. Finns ingen fara inom sex mil visas en och en halv mil omkring föraren. Listan under
// kartan bär resten.
// Ett tryck på ett märke väljer faran (DECISIONS #922), och startsidan visar den i ett kort under kartan.
// Frysrisken ritas bara när den uppfyller röstens regel (Nearby.visas).
//
// Kartbilderna hämtas från Apple för det område som visas, så Apple får veta ungefär var föraren är när startsidan öppnas.
// Halkvakt får ingenting. Kandidaten och småvägsrösten står inte på kartan, som i listan I närheten (Nearby.visas).
import SwiftUI
import MapKit
import CoreLocation
import HalkvaktEngine

struct NaraDigKarta: View {
    let faror: [Hazard]
    let plats: (lon: Double, lat: Double)?
    /// Den valda farans id, och vad ett tryck gör: farans id, eller nil för ett tryck bredvid.
    var valt: String?
    var vidTryck: ((String?) -> Void)?
    /// Kartans höjd: högre när inget är rapporterat nära, lägre när listan står under den (DECISIONS #981 punkt 2).
    var hojd: CGFloat = 236

    /// Flest märken av varje slag som ritas.
    private static let flestPunkter = 60

    private typealias Punkt = Kartbild.Punkt
    private typealias Plats = Kartbild.Plats

    var body: some View {
        let radie = radieM
        // En stillbild i gråskala med egna märken (DECISIONS #876, #933).
        Kartbild(omrade: omrade(radie),
                 hojd: hojd,
                 halka: halka,
                 frysrisk: Array(allaPunkter.filter { $0.kind == .icing_point }.prefix(Self.flestPunkter)).map { Plats(id: $0.id, koord: $0.koord) },
                 punkter: Array(allaPunkter.filter { $0.kind != .icing_point && $0.kind != .camera }.prefix(Self.flestPunkter)),
                 plats: plats.map { CLLocationCoordinate2D(latitude: $0.lat, longitude: $0.lon) },
                 valt: valt,
                 vidTryck: vidTryck,
                 nyckel: (plats.map { String(format: "%.2f,%.2f,%d", $0.lon, $0.lat, Int(radie / 1000)) } ?? "landet") + "|\(Int(hojd))",
                 etikett: plats == nil ? "Karta över halkan i Sverige" : "Karta över det närmaste omkring dig")
    }

    private static let landetsMitt = CLLocationCoordinate2D(latitude: 62.5, longitude: 16.5)
    private static let minstRadieM = 10_000.0
    private static let utanFaraRadieM = 15_000.0
    private static let radieStegM = 5_000.0

    /// Hur långt kartan når från föraren (DECISIONS #919). Fartkamerorna styr inte utsnittet: de finns överallt.
    private var radieM: Double {
        guard let plats else { return 0 }
        let narmast = faror.compactMap { h -> Double? in
            guard Nearby.visas(h) else { return nil }
            if case .point(_, let kind, _, _, _, _) = h, kind == .camera { return nil }
            return Nearby.distanceM(h, lon: plats.lon, lat: plats.lat)
        }.min() ?? .infinity
        guard narmast <= Nearby.maxM else { return Self.utanFaraRadieM }
        let steg = (1.5 * narmast / Self.radieStegM).rounded(.up) * Self.radieStegM
        return min(Nearby.maxM, max(Self.minstRadieM, steg))
    }

    private func omrade(_ radie: Double) -> MKCoordinateRegion {
        if let plats {
            // Mitten flyttas en bit mot landets mitt, så att Sverige fyller bilden (DECISIONS #981 punkt 2): från Malmö visade
            // kartan till hälften Öresund och Danmark. 0,4 radier håller föraren och den närmaste faran kvar i bild.
            let dLat = (Self.landetsMitt.latitude - plats.lat) * 111_320
            let dLon = (Self.landetsMitt.longitude - plats.lon) * 111_320 * cos(plats.lat * .pi / 180)
            let langd = max(1, (dLat * dLat + dLon * dLon).squareRoot())
            let flytt = min(0.4 * radie, langd)
            let mitt = CLLocationCoordinate2D(latitude: plats.lat + flytt * dLat / langd / 111_320,
                                              longitude: plats.lon + flytt * dLon / langd / (111_320 * cos(plats.lat * .pi / 180)))
            return MKCoordinateRegion(center: mitt, latitudinalMeters: 2.3 * radie, longitudinalMeters: 2.3 * radie)
        }
        return MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: 62.5, longitude: 16.5),
                                  span: MKCoordinateSpan(latitudeDelta: 16, longitudeDelta: 16))
    }

    private func nara(_ h: Hazard) -> Bool {
        guard let plats else { return true }
        return Nearby.distanceM(h, lon: plats.lon, lat: plats.lat) <= Nearby.maxM
    }

    /// Halksträckorna som prickar, mitt på sträckan.
    private var halka: [Plats] {
        faror.compactMap { h -> Plats? in
            guard case .segment(let id, let line, _) = h, nara(h), !line.isEmpty else { return nil }
            let mitt = line[line.count / 2]
            return Plats(id: id, koord: CLLocationCoordinate2D(latitude: mitt[1], longitude: mitt[0]))
        }
    }

    private var allaPunkter: [Punkt] {
        // Utan plats ritas bara halkan: tusentals punkter över hela landet säger ingenting.
        guard plats != nil else { return [] }
        return faror.compactMap { h -> Punkt? in
            guard case .point(let id, let kind, let lon, let lat, _, _) = h, Nearby.visas(h), nara(h) else { return nil }
            return Punkt(id: id, kind: kind, koord: CLLocationCoordinate2D(latitude: lat, longitude: lon))
        }
    }
}
