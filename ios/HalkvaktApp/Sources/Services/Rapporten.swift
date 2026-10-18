// RAPPORTEN LÄNGS DE SPARADE RESORNA (favoriterna steg 3b, kort #357; DECISIONS #636, #637). Läser lägesfilen och static.json
// (SnapshotRepo) och rapportfilen (RapportRepo), och räknar i telefonen varje sparad resa åt båda hållen med motorns
// ResansRapport — Hem är samma väg vänd, köerna och restiderna bara åt förarens håll. Den här filen når aldrig nätet: den får
// filerna som data, och ingen väg lämnar telefonen (ruttspärren, scripts/rutterspar.ts).
//
// Samma åldersgränser som rösten (AgeGate, FAVORITER §3): väglag och frysrisk ur en lägesfil som är 45 minuter eller äldre, och
// olyckor och vilt ur en rapportfil som är två timmar eller äldre, visas inte som läget just nu.
import Foundation
import Observation
import HalkvaktEngine

@MainActor
@Observable
final class Rapporten {
    static let shared = Rapporten()

    /// En sparad resa åt båda hållen, efter åldersgränserna.
    struct Resa {
        let dit: [RapportRad]
        let hem: [RapportRad]
    }

    /// Radens läge i fliken (FAVORITER §2).
    enum Radlage {
        case nytt(antal: Int, viktigast: RapportRad)
        case ingetNytt(storst: RapportRad)
        case lugnt
    }

    private(set) var resor: [String: Resa] = [:]
    private(set) var kollat: Date?
    private(set) var lagesfil: Date?
    private(set) var gammaltVaglag = false
    private(set) var gamlaOlyckor = false
    private(set) var gickInte = false
    private var pagaende: Task<Void, Never>?

    private init() {}

    var laddar: Bool { pagaende != nil }

    /// Hämtar och räknar om. Ett anrop medan en hämtning pågår väntar in den i stället för att starta en till.
    func uppdatera() async {
        if let p = pagaende { await p.value; return }
        let t = Task { await ladda() }
        pagaende = t
        await t.value
        pagaende = nil
    }

    private func ladda() async {
        let rutter = Favoriter.shared.rutter
        guard !rutter.isEmpty else { return }
        do {
            async let dok = SnapshotRepo.dokument()
            async let fil = RapportRepo.hamta()
            let (d, f) = try await (dok, fil)
            guard let u = await Self.rakna(rutter, stat: d.stat, live: d.live, snabb: f.snabb, lang: f.lang, nu: .now) else {
                gickInte = true
                return
            }
            resor = u.resor
            lagesfil = u.lagesfil
            gammaltVaglag = u.gammaltVaglag
            gamlaOlyckor = u.gamlaOlyckor
            kollat = .now
            gickInte = false
        } catch {
            gickInte = true
        }
    }

    // MARK: - Fliken och skärmen

    /// Det som pågår längs resan åt något håll, utom kamerorna — de är fasta och varken nya eller "något som pågår".
    private static func pagar(_ r: Resa) -> [RapportRad] {
        let dit = Set(r.dit.map(\.id))
        return (r.dit + r.hem.filter { !dit.contains($0.id) }).filter { $0.slag != .kamera }
    }

    /// Alla id resan visar åt båda hållen — det som sparas som förra kollen.
    func ids(_ id: String) -> [String] {
        guard let r = resor[id] else { return [] }
        return Array(Set(r.dit.map(\.id) + r.hem.map(\.id))).sorted()
    }

    func radlage(_ id: String, koll: Favoriter.Koll?) -> Radlage? {
        guard let r = resor[id] else { return nil }
        let p = Self.pagar(r)
        let vikt = { (a: RapportRad) in ResansRapport.ordning.firstIndex(of: a.slag) ?? .max }
        if let koll {
            let sett = Set(koll.ids)
            let nya = p.filter { !sett.contains($0.id) }
            if let forst = nya.min(by: { vikt($0) < vikt($1) }) { return .nytt(antal: nya.count, viktigast: forst) }
        }
        if let storst = p.min(by: { vikt($0) < vikt($1) }) { return .ingetNytt(storst: storst) }
        return .lugnt
    }

    /// Det nya åt det valda hållet sedan förra kollen; första kollen har inget nytt (som motorns nyttSedan).
    static func nytt(_ rader: [RapportRad], koll: Favoriter.Koll?) -> [RapportRad] {
        guard let koll else { return [] }
        let sett = Set(koll.ids)
        return rader.filter { !sett.contains($0.id) && $0.slag != .kamera }
    }

    /// Radens rubrik med vägen, när rubriken inte redan säger var: "Olycka på E4", men "Djur på vägen" som den står.
    static func titel(_ rubrik: String, vag: String?) -> String {
        guard let v = ResansRapport.vagNamn(vag), !rubrik.contains(" på ") else { return rubrik }
        return "\(rubrik) på \(v)"
    }

    // MARK: - Räkningen, utanför huvudtråden

    private struct Utfall {
        let resor: [String: Resa]
        let lagesfil: Date?
        let gammaltVaglag: Bool
        let gamlaOlyckor: Bool
    }

    nonisolated private static func rakna(_ rutter: [SparadRutt], stat: [String: Any], live: [String: Any], snabb: [String: Any],
                                          lang: [String: Any], nu: Date) async -> Utfall? {
        guard let fil = ResansRapport.lasRapportfil(snabb) else { return nil }
        let lage = ResansRapport.lasLage(live), kameror = ResansRapport.lasKameror(stat), linjer = ResansRapport.lasLinjer(lang)
        let tid = { (s: String?) in s.flatMap { ISO8601DateFormatter.withFraction.date(from: $0) ?? ISO8601DateFormatter().date(from: $0) } }
        let lagesTid = tid(live["generated_at"] as? String), rapportTid = tid(fil.generatedAt)
        let alder = { (t: Date?) in t.map { nu.timeIntervalSince($0) / 60 } ?? .infinity }
        let gammaltVaglag = alder(lagesTid) >= AgeGate.weatherMaxMin
        let gamlaOlyckor = alder(rapportTid) >= AgeGate.accidentMaxMin
        let grind = { (rader: [RapportRad]) in
            rader.filter { r in
                !(gammaltVaglag && (r.slag == .halka || r.slag == .frysrisk)) && !(gamlaOlyckor && (r.slag == .olycka || r.slag == .vilt))
            }
        }
        var resor: [String: Resa] = [:]
        for r in rutter {
            if Task.isCancelled { return nil }
            let dit = ResansRapport.resansRapport(r.punkter, hem: false, lage: lage, kameror: kameror, snabb: fil, linjer: linjer)
            let hem = ResansRapport.resansRapport(r.punkter, hem: true, lage: lage, kameror: kameror, snabb: fil, linjer: linjer)
            resor[r.id] = Resa(dit: grind(dit), hem: grind(hem))
        }
        return Utfall(resor: resor, lagesfil: lagesTid, gammaltVaglag: gammaltVaglag, gamlaOlyckor: gamlaOlyckor)
    }
}
