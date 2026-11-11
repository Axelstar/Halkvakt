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
        /// Rutan Halkvakt tror (DECISIONS #739): kandidatens rader åt varje håll, nil när kandidaten är avstängd. Aldrig med i
        /// förra kollen eller radens läge — `ids` och `radlage` läser bara `dit` och `hem`.
        let kandidatDit: [KandidatRad]?
        let kandidatHem: [KandidatRad]?
    }

    private(set) var resor: [String: Resa] = [:]
    private(set) var kollat: Date?
    private(set) var lagesfil: Date?
    /// Rapportfilens tid: olyckor, vägarbeten, hinder, köer, restider och färjor kommer ur den (DECISIONS #686 punkt 5, B7-05).
    private(set) var rapportfil: Date?
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
        let betatest = Prefs.shared.facitOn
        do {
            async let dok = SnapshotRepo.dokument()
            async let fil = RapportRepo.hamta()
            let (d, f) = try await (dok, fil)
            guard let u = await Self.rakna(rutter, stat: d.stat, live: d.live, snabb: f.snabb, lang: f.lang, nu: .now, betatest: betatest) else {
                gickInte = true
                return
            }
            resor = u.resor
            lagesfil = u.lagesfil
            rapportfil = u.rapportfil
            gammaltVaglag = u.gammaltVaglag
            gamlaOlyckor = u.gamlaOlyckor
            kollat = .now
            gickInte = false
        } catch {
            gickInte = true
        }
    }

    // MARK: - Fliken och skärmen — reglerna bor i motorn (ResansRapport, prövade mot facit), här bara resans rader

    /// Alla id resan visar åt båda hållen — det som sparas som förra kollen.
    func ids(_ id: String) -> [String] {
        guard let r = resor[id] else { return [] }
        return ResansRapport.kollensIds(r.dit, r.hem)
    }

    func radlage(_ id: String, koll: Favoriter.Koll?) -> ResansRapport.Radlage? {
        guard let r = resor[id] else { return nil }
        return ResansRapport.radlage(r.dit, r.hem, sett: koll?.ids)
    }

    // MARK: - Räkningen, utanför huvudtråden

    private struct Utfall {
        let resor: [String: Resa]
        let lagesfil: Date?
        let rapportfil: Date?
        let gammaltVaglag: Bool
        let gamlaOlyckor: Bool
    }

    nonisolated private static func rakna(_ rutter: [SparadRutt], stat: [String: Any], live: [String: Any], snabb: [String: Any],
                                          lang: [String: Any], nu: Date, betatest: Bool) async -> Utfall? {
        guard let fil = ResansRapport.lasRapportfil(snabb) else { return nil }
        // Efterhalkans spärr (#676, #677): utan Betatest räknas S3 inte fram i rapporten, som rösten tiger om den (SnapshotRepo).
        let lage = betatest ? ResansRapport.lasLage(live) : ResansRapport.utanEfterhalka(ResansRapport.lasLage(live))
        let kameror = ResansRapport.lasKameror(stat), linjer = ResansRapport.lasLinjer(lang)
        let tid = { (s: String?) in s.flatMap { ISO8601DateFormatter.withFraction.date(from: $0) ?? ISO8601DateFormatter().date(from: $0) } }
        let lagesTid = tid(live["generated_at"] as? String), rapportTid = tid(fil.generatedAt)
        let alder = { (t: Date?) in t.map { nu.timeIntervalSince($0) / 60 } ?? .infinity }
        let gammaltVaglag = alder(lagesTid) >= AgeGate.weatherMaxMin
        let gamlaOlyckor = alder(rapportTid) >= AgeGate.accidentMaxMin
        let grind = { (rader: [RapportRad]) in ResansRapport.aldersgrind(rader, gammaltVaglag: gammaltVaglag, gamlaOlyckor: gamlaOlyckor) }
        var resor: [String: Resa] = [:]
        for r in rutter {
            if Task.isCancelled { return nil }
            let dit = ResansRapport.resansRapport(r.punkter, hem: false, lage: lage, kameror: kameror, snabb: fil, linjer: linjer)
            let hem = ResansRapport.resansRapport(r.punkter, hem: true, lage: lage, kameror: kameror, snabb: fil, linjer: linjer)
            resor[r.id] = Resa(dit: grind(dit), hem: grind(hem),
                               kandidatDit: ResansRapport.kandidatRader(r.punkter, hem: false, lage: lage),
                               kandidatHem: ResansRapport.kandidatRader(r.punkter, hem: true, lage: lage))
        }
        return Utfall(resor: resor, lagesfil: lagesTid, rapportfil: rapportTid, gammaltVaglag: gammaltVaglag, gamlaOlyckor: gamlaOlyckor)
    }
}
