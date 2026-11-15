// KARTAN NÄRA DIG (kort #659, DECISIONS #870, #873): Apples karta med farorna inom sex mil, på startsidan. Halkan är gula
// streck längs vägen, de andra farorna gula punkter och fartkamerorna små grå prickar, så att de inte täcker resten. Utan
// plats visas hela landet med bara halkan.
//
// Kartbilderna hämtas från Apple för det område som visas, så Apple får veta ungefär var föraren är när startsidan öppnas.
// Halkvakt får ingenting. Kandidaten och småvägsrösten står inte på kartan, som i listan I närheten (Nearby).
import SwiftUI
import MapKit
import CoreLocation
import HalkvaktEngine

struct NaraDigKarta: View {
    let faror: [Hazard]
    let plats: (lon: Double, lat: Double)?

    /// Flest punkter av varje slag som ritas. Strecken är få och ritas alla.
    private static let flestPunkter = 60
    private static let flestKameror = 80

    private typealias Punkt = Kartbild.Punkt

    private struct Stracka: Identifiable {
        let id: String
        let koord: [CLLocationCoordinate2D]
    }

    var body: some View {
        // En stillbild i gråskala med egna märken (DECISIONS #876): halkan gul, kamerorna små grå prickar, platsen vit.
        Kartbild(omrade: omrade,
                 streck: strackor.map(\.koord),
                 prickar: kameror.map(\.koord),
                 punkter: punkter,
                 plats: plats.map { CLLocationCoordinate2D(latitude: $0.lat, longitude: $0.lon) },
                 nyckel: plats.map { String(format: "%.2f,%.2f", $0.lon, $0.lat) } ?? "landet",
                 etikett: plats == nil ? "Karta över halkan i Sverige" : "Karta över farorna inom sex mil")
    }

    private var omrade: MKCoordinateRegion {
        if let plats {
            return MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: plats.lat, longitude: plats.lon),
                                      latitudinalMeters: 2.3 * Nearby.maxM, longitudinalMeters: 2.3 * Nearby.maxM)
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
            guard case .point(let id, let kind, let lon, let lat, _, _) = h, nara(h) else { return nil }
            return Punkt(id: id, kind: kind, koord: CLLocationCoordinate2D(latitude: lat, longitude: lon))
        }
    }
}
