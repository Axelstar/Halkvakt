// KORTET OM EN VALD FARA (DECISIONS #922): det som visas under kartan Nära dig när föraren trycker på ett märke, ett streck
// eller en rad i listan. Kortet säger bara det som står i lägesfilen: vad det är, mätningen eller rapportens ord, källan och
// när filen skrevs. Avståndet är fågelvägen till farans plats, och kortet säger det.
import SwiftUI
import HalkvaktEngine

struct FaraKort: View {
    let fara: Hazard
    /// Fågelvägen från föraren, nil utan plats.
    let distM: Double?
    let lagetFran: Date?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                HazardIcon(kind: Nearby.kind(of: fara), size: 20).foregroundStyle(Brand.yellow)
                Text(rubrik).font(Typo.sans(16, .medium)).foregroundStyle(Brand.text)
                Spacer(minLength: 0)
            }
            ForEach(rader, id: \.self) { rad in
                Text(rad).font(Typo.sans(14)).lineSpacing(3).foregroundStyle(Brand.text2)
            }
            MonoLabel(text: fot, color: Brand.faint)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 20).padding(.vertical, 16)
        .background(Brand.panel, in: RoundedRectangle(cornerRadius: 18))
        .accessibilityElement(children: .combine)
    }

    private var rubrik: String {
        switch fara {
        case .segment(_, _, let meta): return WarningCard.halkrubrik(rapporterad: meta.halkaRapporterad)
        case .point(_, let kind, _, _, _, let meta):
            switch kind {
            case .icing_point: return meta.bridge ? "Frysrisk på bro" : Self.uppmatt(meta) ? "Frysrisk" : "Frysrisk (beta)"
            case .accident: return "Olycka\(ResansRapport.vagNamn(meta.road).map { " på \($0)" } ?? "")"
            default: return VaktenView.rubrik(kind.rawValue)
            }
        case .kandidat, .smavag: return "Halka"
        }
    }

    private var rader: [String] {
        var ut: [String] = []
        switch fara {
        case .segment(_, _, let meta):
            ut.append(!meta.info.isEmpty ? meta.info.joined(separator: ", ") + "."
                      : meta.halkaRapporterad ? "Halka rapporterad på sträckan." : "Risk för halka rapporterad på sträckan.")
        case .point(let id, let kind, _, _, _, let meta):
            switch kind {
            case .icing_point:
                let yta = meta.surfaceTempC.map(Self.grader) ?? "nära noll"
                if meta.bridge {
                    ut.append("Närmaste station visar \(yta) och fukt på vägbanan. En bro fryser före vägen.")
                } else if Self.uppmatt(meta) {
                    ut.append("Vägytan är \(yta), med fukt på vägbanan.")
                } else {
                    ut.append("Vägytan är \(yta) och faller snabbt efter regn.")
                }
            case .accident:
                if let p = meta.severityCode.flatMap({ ResansRapport.paverkanText[$0] }) {
                    ut.append(p.prefix(1).uppercased() + p.dropFirst() + " enligt Trafikverket.")
                }
                if let t = meta.endTimeLocal { ut.append("Beräknas röjd vid \(t).") }
            case .wildlife:
                ut.append(id.hasPrefix("djur:") ? "Djur på vägen rapporterat." : "Viltrisk rapporterad.")
            default:
                break
            }
        case .kandidat, .smavag:
            break
        }
        if let distM { ut.append("\(Nearby.distText(distM)) bort, fågelvägen.") }
        return ut
    }

    /// "KÄLLA: TRAFIKVERKETS VÄGVÄDERSTATION · LÄGET FRÅN 17:56"
    private var fot: String {
        var kalla = "Källa: Trafikverket"
        if case .point(_, let kind, _, _, _, _) = fara, kind == .icing_point { kalla = "Källa: Trafikverkets vägväderstation" }
        return lagetFran.map { "\(kalla) · läget från \($0.klockslag)" } ?? kalla
    }

    /// Stationens egen regel: +1 eller kallare och fukt. Annars är det efterhalkan (S3), som bara betatestarna får.
    private static func uppmatt(_ m: PointMeta) -> Bool { (m.surfaceTempC.map { $0 <= 1 } ?? false) && m.moisture }

    /// "+0,4°"
    private static func grader(_ t: Double) -> String {
        let s = String(format: "%.1f°", abs(t)).replacingOccurrences(of: ".", with: ",")
        return t > 0 ? "+" + s : t < 0 ? "−" + s : s
    }
}
