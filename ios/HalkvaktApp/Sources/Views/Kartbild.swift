// KARTBILDEN (kort #659, DECISIONS #876): en stillbild av Apples karta i gråskala, med Halkvakts egna märken ritade ovanpå.
// Apples karta går inte att färga om, och i färg tog den över sidan (Axels skärmbild 15/11: blått hav, gröna fält, blå
// platsprick). Bilden hämtas från Apple för området som visas, precis som den rörliga kartan gjorde. Halkvakt får ingenting.
// Med `vidTryck` går märkena och strecken att trycka på (DECISIONS #922): det närmaste märket inom 24 punkter, annars det
// närmaste strecket inom 22, annars ingenting. Den valda faran får en vit kant.
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
    /// Streckens id i samma ordning, när de går att trycka på.
    var streckId: [String] = []
    /// Små grå prickar: fartkamerorna.
    var prickar: [CLLocationCoordinate2D] = []
    /// Gula märken med farans ikon.
    var punkter: [Punkt] = []
    /// Förarens plats, vit.
    var plats: CLLocationCoordinate2D?
    /// Den valda farans id.
    var valt: String?
    /// Ett tryck på kartan: farans id, eller nil när trycket hamnar bredvid.
    var vidTryck: ((String?) -> Void)?
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
                        for (i, linje) in streck.enumerated() where linje.count > 1 {
                            var vag = Path()
                            vag.addLines(linje.map { bild.point(for: $0) })
                            if let valt, i < streckId.count, streckId[i] == valt {
                                ctx.stroke(vag, with: .color(.white),
                                           style: StrokeStyle(lineWidth: 9, lineCap: .round, lineJoin: .round))
                            }
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
                            .overlay { if p.id == valt { Circle().stroke(.white, lineWidth: 3) } }
                            .position(bild.point(for: p.koord))
                    }
                }
            }
            .onTapGesture { p in
                guard let vidTryck, let bild else { return }
                vidTryck(traff(p, bild))
            }
            .task(id: "\(nyckel)|\(Int(geo.size.width))") { await hamta(CGSize(width: geo.size.width, height: hojd)) }
        }
        .frame(height: hojd)
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(etikett)
    }

    private static let traffPunkt: CGFloat = 24
    private static let traffStreck: CGFloat = 22

    /// Faran som trycket gäller: märket först, sedan strecket.
    private func traff(_ p: CGPoint, _ bild: MKMapSnapshotter.Snapshot) -> String? {
        let marke = punkter.map { (id: $0.id, d: Self.avstand(p, bild.point(for: $0.koord))) }.min { $0.d < $1.d }
        if let marke, marke.d <= Self.traffPunkt { return marke.id }
        var bast: (id: String, d: CGFloat)?
        for (i, linje) in streck.enumerated() where i < streckId.count && linje.count > 1 {
            let pkt = linje.map { bild.point(for: $0) }
            let d = zip(pkt, pkt.dropFirst()).map { Self.avstand(p, $0, $1) }.min() ?? .infinity
            if d <= Self.traffStreck, d < (bast?.d ?? .infinity) { bast = (streckId[i], d) }
        }
        return bast?.id
    }

    private static func avstand(_ a: CGPoint, _ b: CGPoint) -> CGFloat { hypot(a.x - b.x, a.y - b.y) }

    /// Avståndet från p till sträckan a–b.
    private static func avstand(_ p: CGPoint, _ a: CGPoint, _ b: CGPoint) -> CGFloat {
        let dx = b.x - a.x, dy = b.y - a.y
        let l2 = dx * dx + dy * dy
        guard l2 > 0 else { return avstand(p, a) }
        let t = max(0, min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2))
        return avstand(p, CGPoint(x: a.x + t * dx, y: a.y + t * dy))
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
        // En hämtning som avbrutits för att området ändrats får inte skriva över den nya bilden när den blir klar efter den
        // (Axels inspelning 20/11: bilden över hela landet stod kvar fast platsen fanns, DECISIONS #919).
        guard let ny = try? await MKMapSnapshotter(options: val).start(), !Task.isCancelled else { return }
        bild = ny
    }
}
