// KARTBILDEN (kort #659, DECISIONS #876): en stillbild av Apples karta i gråskala, med Halkvakts egna märken ritade ovanpå.
// Apples karta går inte att färga om, och i färg tog den över sidan (Axels skärmbild 15/11: blått hav, gröna fält, blå
// platsprick). Bilden hämtas från Apple för området som visas, precis som den rörliga kartan gjorde. Halkvakt får ingenting.
// Märkena är desamma på startsidan och för en planerad resa (Axel 20/11, DECISIONS #933): en gul prick för en halksträcka, en
// gul ring för frysrisk, en vit prick för föraren och ett grått streck för resans väg. Vägen ritas på Apples karta, för Apples
// villkor säger att deras kartdata bara får visas där (utvecklaravtalet, bilaga 6, punkt 2.4).
// Med `vidTryck` går märkena att trycka på (DECISIONS #922): det närmaste inom 24 punkter, annars ingenting. Den valda faran
// får en vit kant.
import SwiftUI
import MapKit
import HalkvaktEngine

struct Kartbild: View {
    struct Punkt: Identifiable {
        let id: String
        let kind: HazardKind
        let koord: CLLocationCoordinate2D
    }

    struct Plats: Identifiable {
        let id: String
        let koord: CLLocationCoordinate2D
    }

    let omrade: MKCoordinateRegion
    var hojd: CGFloat = 200
    /// Grått streck: vägen för en planerad resa, med en ring vid starten och en fylld punkt vid målet.
    var vag: [CLLocationCoordinate2D] = []
    /// Gula prickar: halksträckorna.
    var halka: [Plats] = []
    /// Gula ringar: platserna med frysrisk.
    var frysrisk: [Plats] = []
    /// Gula märken med farans ikon: olyckor och vilt.
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
                        let cirkel = { (c: CGPoint, r: CGFloat) in Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r)) }
                        if vag.count > 1 {
                            var linje = Path()
                            linje.addLines(vag.map { bild.point(for: $0) })
                            ctx.stroke(linje, with: .color(Brand.bg), style: StrokeStyle(lineWidth: 6, lineCap: .round, lineJoin: .round))
                            ctx.stroke(linje, with: .color(Brand.dim), style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))
                            for (i, p) in [vag[0], vag[vag.count - 1]].enumerated() {
                                let c = bild.point(for: p)
                                ctx.fill(cirkel(c, 4.5), with: .color(i == 0 ? Brand.bg : Brand.text))
                                ctx.stroke(cirkel(c, 4.5), with: .color(Brand.text), lineWidth: 2)
                            }
                        }
                        for p in frysrisk {
                            let c = bild.point(for: p.koord)
                            if p.id == valt { ctx.stroke(cirkel(c, 10), with: .color(.white), lineWidth: 2) }
                            ctx.stroke(cirkel(c, 6), with: .color(Brand.bg), lineWidth: 5)
                            ctx.stroke(cirkel(c, 6), with: .color(Brand.yellow), lineWidth: 2.5)
                        }
                        for p in halka {
                            let c = bild.point(for: p.koord)
                            ctx.fill(cirkel(c, p.id == valt ? 10 : 7), with: .color(p.id == valt ? .white : Brand.bg))
                            ctx.fill(cirkel(c, 5), with: .color(Brand.yellow))
                        }
                        if let plats {
                            let c = bild.point(for: plats)
                            ctx.fill(cirkel(c, 9), with: .color(Brand.bg))
                            ctx.fill(cirkel(c, 6), with: .color(.white))
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

    /// Faran som trycket gäller: det närmaste märket, om det ligger nära nog.
    private func traff(_ p: CGPoint, _ bild: MKMapSnapshotter.Snapshot) -> String? {
        let alla = punkter.map { (id: $0.id, koord: $0.koord) } + halka.map { (id: $0.id, koord: $0.koord) }
            + frysrisk.map { (id: $0.id, koord: $0.koord) }
        let marke = alla.map { (id: $0.id, d: Self.avstand(p, bild.point(for: $0.koord))) }.min { $0.d < $1.d }
        guard let marke, marke.d <= Self.traffPunkt else { return nil }
        return marke.id
    }

    private static func avstand(_ a: CGPoint, _ b: CGPoint) -> CGFloat { hypot(a.x - b.x, a.y - b.y) }

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

/// Vad märkena på kartan betyder. Samma på startsidan och för en planerad resa (DECISIONS #933).
struct Kartforklaring: View {
    enum Sista { case vagen, du }
    let sista: Sista

    var body: some View {
        HStack(spacing: 16) {
            rad("Halka") { Circle().fill(Brand.yellow).frame(width: 9, height: 9) }
            rad("Frysrisk") { Circle().stroke(Brand.yellow, lineWidth: 2).frame(width: 9, height: 9) }
            switch sista {
            case .vagen: rad("Vägen") { Capsule().fill(Brand.dim).frame(width: 16, height: 3) }
            case .du: rad("Du") { Circle().fill(.white).frame(width: 9, height: 9) }
            }
        }
    }

    private func rad(_ text: String, @ViewBuilder marke: () -> some View) -> some View {
        HStack(spacing: 6) {
            marke().frame(width: 16, height: 12).accessibilityHidden(true)
            MonoLabel(text: text)
        }
    }
}
