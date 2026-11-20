// KARTAN NÄRA DIG (kort #659, DECISIONS #870, #873): Apples karta med det närmaste omkring föraren, på startsidan. Halkan är
// gula streck längs vägen, de andra farorna gula punkter och fartkamerorna små grå prickar, så att de inte täcker resten. Utan
// plats visas hela landet med bara halkan.
// Utsnittet (DECISIONS #919, Axel 20/11): kartan når en och en halv gång så långt som den närmaste faran, minst en mil och
// högst sex, i steg om fem kilometer. Finns ingen fara inom sex mil visas en och en halv mil omkring föraren. Listan under
// kartan bär resten.
// Ett tryck på ett märke eller ett streck väljer faran (DECISIONS #922), och startsidan visar den i ett kort under kartan.
// Fartkamerorna går inte att trycka på. Frysrisken ritas bara när den uppfyller röstens regel (Nearby.visas).
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

    /// Flest punkter av varje slag som ritas. Strecken är få och ritas alla.
    private static let flestPunkter = 60
    private static let flestKameror = 80

    private typealias Punkt = Kartbild.Punkt

    private struct Stracka: Identifiable {
        let id: String
        let koord: [CLLocationCoordinate2D]
    }

    var body: some View {
        let radie = radieM
        // En stillbild i gråskala med egna märken (DECISIONS #876): halkan gul, kamerorna små grå prickar, platsen vit.
        Kartbild(omrade: omrade(radie),
                 streck: strackor.map(\.koord),
                 streckId: strackor.map(\.id),
                 prickar: kameror.map(\.koord),
                 punkter: punkter,
                 plats: plats.map { CLLocationCoordinate2D(latitude: $0.lat, longitude: $0.lon) },
                 valt: valt,
                 vidTryck: vidTryck,
                 nyckel: plats.map { String(format: "%.2f,%.2f,%d", $0.lon, $0.lat, Int(radie / 1000)) } ?? "landet",
                 etikett: plats == nil ? "Karta över halkan i Sverige" : "Karta över det närmaste omkring dig")
    }

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
            return MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: plats.lat, longitude: plats.lon),
                                      latitudinalMeters: 2.3 * radie, longitudinalMeters: 2.3 * radie)
        }
        return MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: 62.5, longitude: 16.5),
                                  span: MKCoordinateSpan(latitudeDelta: 16, longitudeDelta: 16))
    }

    private func nara(_ h: Hazard) -> Bool {
        guard let plats else { return true }
        return Nearby.distanceM(h, lon: plats.lon, lat: plats.lat) <= Nearby.maxM
    }

    private var strackor: [Stracka] {
        faror.compactMap { h -> Stracka? in
            guard case .segment(let id, let line, _) = h, nara(h) else { return nil }
            return Stracka(id: id, koord: line.map { CLLocationCoordinate2D(latitude: $0[1], longitude: $0[0]) })
        }
    }

    private var punkter: [Punkt] { Array(allaPunkter.filter { $0.kind != .camera }.prefix(Self.flestPunkter)) }

    private var kameror: [Punkt] { Array(allaPunkter.filter { $0.kind == .camera }.prefix(Self.flestKameror)) }

    private var allaPunkter: [Punkt] {
        // Utan plats ritas bara halkan: tusentals punkter över hela landet säger ingenting.
        guard plats != nil else { return [] }
        return faror.compactMap { h -> Punkt? in
            guard case .point(let id, let kind, let lon, let lat, _, _) = h, Nearby.visas(h), nara(h) else { return nil }
            return Punkt(id: id, kind: kind, koord: CLLocationCoordinate2D(latitude: lat, longitude: lon))
        }
    }
}
