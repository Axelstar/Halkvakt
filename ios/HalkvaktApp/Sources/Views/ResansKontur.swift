// VÄGEN PÅ SVERIGES KONTUR (DECISIONS #930): resans sträckor ritade i sina lägen, utan en karta från någon annan. Halt är
// ett gult streck, frysrisk ett gult prickat och lugnt ett grått, som halkan redan ritas på kartan Nära dig (#873).
// Konturen är Natural Earth. Vägen är den Apple räknade ut, och skärmen säger det under rapporten.
import SwiftUI
import HalkvaktEngine

struct ResansKontur: View {
    let punkter: [[Double]]
    /// Vägens längd fram till varje punkt (Resstrackor.kumulativ).
    let kum: [Double]
    let strackor: [Resstracka]
    let mal: String
    let etikett: String

    var body: some View {
        Canvas { ctx, storlek in
            guard let ram = Self.ram(punkter, storlek) else { return }
            let pkt = { (p: [Double]) in ram.punkt(p) }
            for ring in Sverigekarta.kontur where ring.count > 2 {
                var land = Path()
                land.addLines(ring.map(pkt))
                land.closeSubpath()
                ctx.fill(land, with: .color(Brand.raisedSolid))
            }
            for s in strackor {
                let bit = Self.bit(punkter, kum, fran: Double(s.franM), till: Double(s.tillM))
                guard bit.count > 1 else { continue }
                var vag = Path()
                vag.addLines(bit.map(pkt))
                ctx.stroke(vag, with: .color(s.lage == .lugnt ? Brand.dim : Brand.yellow),
                           style: StrokeStyle(lineWidth: 3.5, lineCap: .round, lineJoin: .round, dash: s.lage == .frysrisk ? [1, 6] : []))
            }
            // Brytpunkterna och målet, med namn. Brytpunkterna har en ring, målet är fyllt. Namnen skrivs i turordning: målet,
            // starten och sedan resten, och ett namn som skulle hamna över ett annat skrivs inte (Axels inspelning 20/11:
            // Malmö och Helsingborg stod över varandra, DECISIONS #931).
            var skrivna: [CGRect] = []
            let brott = strackor.compactMap { s in Self.vid(punkter, kum, Double(s.franM)).map { (namn: s.fran, p: pkt($0)) } }
            for b in brott { Self.ring(&ctx, b.p, fylld: false) }
            if let p = punkter.last.map(pkt) {
                Self.ring(&ctx, p, fylld: true)
                Self.namn(&ctx, mal, p, storlek, ljus: true, skrivna: &skrivna)
            }
            for b in brott { if let namn = b.namn { Self.namn(&ctx, namn, b.p, storlek, ljus: false, skrivna: &skrivna) } }
        }
        .frame(height: 236)
        .background(Brand.bg)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay { RoundedRectangle(cornerRadius: 12).stroke(Brand.line, lineWidth: 1) }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(etikett)
        .accessibilityAddTraits(.isImage)
    }

    // MARK: - Ritningen

    private static func ring(_ ctx: inout GraphicsContext, _ p: CGPoint, fylld: Bool) {
        let r = CGRect(x: p.x - 3.5, y: p.y - 3.5, width: 7, height: 7)
        ctx.fill(Path(ellipseIn: r), with: .color(fylld ? Brand.text : Brand.bg))
        ctx.stroke(Path(ellipseIn: r), with: .color(Brand.text), lineWidth: 2)
    }

    /// Namnet till höger om punkten, eller till vänster när det inte får plats. Skrivs inte om det hamnar över ett namn som
    /// redan står där.
    private static func namn(_ ctx: inout GraphicsContext, _ text: String, _ p: CGPoint, _ storlek: CGSize, ljus: Bool,
                             skrivna: inout [CGRect]) {
        let t = ctx.resolve(Text(text.uppercased()).font(Typo.mono(10, .medium)).tracking(1).foregroundStyle(ljus ? Brand.text : Brand.text2))
        let matt = t.measure(in: storlek)
        let hoger = p.x + 9 + matt.width <= storlek.width - 4
        let y = min(max(p.y, 10), storlek.height - 10)
        let ruta = CGRect(x: hoger ? p.x + 9 : p.x - 9 - matt.width, y: y - matt.height / 2, width: matt.width, height: matt.height)
        guard !skrivna.contains(where: { $0.insetBy(dx: -4, dy: -2).intersects(ruta) }) else { return }
        skrivna.append(ruta)
        ctx.draw(t, at: CGPoint(x: hoger ? p.x + 9 : p.x - 9, y: y), anchor: hoger ? .leading : .trailing)
    }

    // MARK: - Geometrin

    /// Utsnittet: vägens ram med luft omkring, minst två grader högt så att en kort resa ändå visar var i landet den går.
    /// Longituden krymps med breddgradens cosinus, så att landet inte ser utdraget ut.
    private struct Ram {
        let x0: Double, y1: Double, skala: Double, k: Double, dx: Double, dy: Double
        func punkt(_ p: [Double]) -> CGPoint {
            CGPoint(x: (p[0] * k - x0) * skala + dx, y: (y1 - p[1]) * skala + dy)
        }
    }

    private static func ram(_ punkter: [[Double]], _ storlek: CGSize) -> Ram? {
        guard let lonMin = punkter.map({ $0[0] }).min(), let lonMax = punkter.map({ $0[0] }).max(),
              let latMin = punkter.map({ $0[1] }).min(), let latMax = punkter.map({ $0[1] }).max(),
              storlek.width > 0, storlek.height > 0 else { return nil }
        let k = cos((latMin + latMax) / 2 * .pi / 180)
        let hojd = max((latMax - latMin) * 1.5, 2.0), bredd = max((lonMax - lonMin) * k * 1.5, 1.0)
        let skala = min(storlek.width / bredd, storlek.height / hojd)
        let mx = (lonMin + lonMax) / 2 * k, my = (latMin + latMax) / 2
        return Ram(x0: mx, y1: my, skala: skala, k: k, dx: storlek.width / 2, dy: storlek.height / 2)
    }

    /// Punkten `m` meter in på vägen.
    private static func vid(_ punkter: [[Double]], _ kum: [Double], _ m: Double) -> [Double]? {
        guard punkter.count == kum.count, !punkter.isEmpty else { return nil }
        guard let i = kum.firstIndex(where: { $0 >= m }) else { return punkter.last }
        guard i > 0, kum[i] > kum[i - 1] else { return punkter[i] }
        let t = (m - kum[i - 1]) / (kum[i] - kum[i - 1])
        return [punkter[i - 1][0] + t * (punkter[i][0] - punkter[i - 1][0]), punkter[i - 1][1] + t * (punkter[i][1] - punkter[i - 1][1])]
    }

    /// Vägens punkter mellan två lägen, med ändpunkterna inräknade.
    private static func bit(_ punkter: [[Double]], _ kum: [Double], fran: Double, till: Double) -> [[Double]] {
        guard punkter.count == kum.count, let a = vid(punkter, kum, fran), let b = vid(punkter, kum, till) else { return [] }
        return [a] + zip(punkter, kum).filter { $0.1 > fran && $0.1 < till }.map(\.0) + [b]
    }
}
