// KARTAN NÄRA DIG (kort #659, DECISIONS #870): Apples karta med farorna inom sex mil, på startsidan. Halkan är gula streck
// längs vägen, de andra farorna är punkter. Utan plats visas hela landet med bara halkan.
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

    /// Flest punkter som ritas. Strecken är få och ritas alla.
    private static let flestPunkter = 60

    private struct Punkt: Identifiable {
        let id: String
        let kind: HazardKind
        let koord: CLLocationCoordinate2D
    }

    private struct Stracka: Identifiable {
        let id: String
        let koord: [CLLocationCoordinate2D]
    }

    var body: some View {
        Map(initialPosition: .region(omrade), interactionModes: []) {
            UserAnnotation()
            ForEach(strackor) { s in
                MapPolyline(coordinates: s.koord).stroke(Brand.yellow, lineWidth: 4)
            }
            ForEach(punkter) { p in
                Annotation(VaktenView.rubrik(p.kind.rawValue), coordinate: p.koord) {
                    HazardIcon(kind: p.kind, size: 14).foregroundStyle(Brand.bg)
                        .padding(5).background(Brand.yellow, in: Circle())
                }
                .annotationTitles(.hidden)
            }
        }
        .mapStyle(.standard(elevation: .flat, pointsOfInterest: .excludingAll))
        // Kartan byggs om när platsen kommer, så att den visar rätt område.
        .id(plats.map { "\($0.lon),\($0.lat)" } ?? "landet")
        .frame(height: 200)
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(plats == nil ? "Karta över halkan i Sverige" : "Karta över farorna inom sex mil")
    }

    private var omrade: MKCoordinateRegion {
        if let plats {
            return MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: plats.lat, longitude: plats.lon),
                                      latitudinalMeters: 2 * Nearby.maxM, longitudinalMeters: 2 * Nearby.maxM)
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

    private var punkter: [Punkt] {
        // Utan plats ritas bara halkan: tusentals punkter över hela landet säger ingenting.
        guard plats != nil else { return [] }
        let alla = faror.compactMap { h -> Punkt? in
            guard case .point(let id, let kind, let lon, let lat, _, _) = h, nara(h) else { return nil }
            return Punkt(id: id, kind: kind, koord: CLLocationCoordinate2D(latitude: lat, longitude: lon))
        }
        return Array(alla.prefix(Self.flestPunkter))
    }
}
