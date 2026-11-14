// KARTBILDEN (kort #659, DECISIONS #876): en stillbild av Apples karta i gråskala, med Halkvakts egna märken ritade ovanpå.
// Apples karta går inte att färga om, och i färg tog den över sidan (Axels skärmbild 15/11: blått hav, gröna fält, blå
// platsprick). Bilden hämtas från Apple för området som visas, precis som den rörliga kartan gjorde. Halkvakt får ingenting.
import SwiftUI
import MapKit
import HalkvaktEngine

struct Kartbild: View {
    struct Punkt: Identifiable {
        let id: String
        let kind: HazardKind
        let koord: CLLocationCoordinate2D
    }

    let omrade: MKCoordinateRegion
    var hojd: CGFloat = 200
    /// Gula streck: halkan, eller vägen för en planerad resa.
    var streck: [[CLLocationCoordinate2D]] = []
    /// Små grå prickar: fartkamerorna.
    var prickar: [CLLocationCoordinate2D] = []
    /// Gula märken med farans ikon.
    var punkter: [Punkt] = []
    /// Förarens plats, vit.
    var plats: CLLocationCoordinate2D?
    /// Ändras när området ändras, så att bilden hämtas om.
    let nyckel: String
    let etikett: String

    @State private var bild: MKMapSnapshotter.Snapshot?

    var body: some View {
        GeometryReader { geo in
            ZStack {
                Brand.panel
                if let bild {
                    Image(uiImage: bild.image).resizable()
                        .saturation(0).contrast(0.85).brightness(-0.06)
                        .opacity(0.8)
                    Canvas { ctx, _ in
                        for linje in streck where linje.count > 1 {
                            var vag = Path()
                            vag.addLines(linje.map { bild.point(for: $0) })
                            ctx.stroke(vag, with: .color(Brand.yellow),
                                       style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round))
                        }
                        for p in prickar {
                            let c = bild.point(for: p)
                            ctx.fill(Path(ellipseIn: CGRect(x: c.x - 2, y: c.y - 2, width: 4, height: 4)), with: .color(Brand.dim))
                        }
                        if let plats {
                            let c = bild.point(for: plats)
                            ctx.fill(Path(ellipseIn: CGRect(x: c.x - 9, y: c.y - 9, width: 18, height: 18)), with: .color(Brand.bg))
                            ctx.fill(Path(ellipseIn: CGRect(x: c.x - 6, y: c.y - 6, width: 12, height: 12)), with: .color(.white))
                        }
                    }
                    ForEach(punkter) { p in
                        HazardIcon(kind: p.kind, size: 14).foregroundStyle(Brand.bg)
                            .padding(5).background(Brand.yellow, in: Circle())
                            .position(bild.point(for: p.koord))
                    }
                }
            }
            .task(id: "\(nyckel)|\(Int(geo.size.width))") { await hamta(CGSize(width: geo.size.width, height: hojd)) }
        }
        .frame(height: hojd)
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(etikett)
    }

    private func hamta(_ storlek: CGSize) async {
        guard storlek.width > 0 else { return }
        let val = MKMapSnapshotter.Options()
        val.region = omrade
        val.size = storlek
        val.traitCollection = UITraitCollection(userInterfaceStyle: .dark)
        let stil = MKStandardMapConfiguration(elevationStyle: .flat, emphasisStyle: .muted)
        stil.pointOfInterestFilter = .excludingAll
        val.preferredConfiguration = stil
        // Går bilden inte att hämta står den förra kvar, eller panelens färg.
        if let ny = try? await MKMapSnapshotter(options: val).start() { bild = ny }
    }
}
