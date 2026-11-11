// CARPLAY (DECISIONS #817): Halkvakt på bilens skärm, som en Driving Task-app (Apples tillstånd 1/11). Det viktigaste är inte
// den här skärmen utan bannern: varningen visas över kartan i CarPlay som en notis (kategorin med allowInCarPlay i
// EfterResanNotis, sedan iOS 18.4), och Apple kräver att appens ikon ligger på CarPlay-hemskärmen för det. Skärmen här är
// därför liten och bara Apples mallar: vakten på eller av, det rösten sa senast och läget längs de sparade resorna.
// Apples regler för Driving Task: inget utöver det som hjälper under körningen, ingen inställning, och data uppdateras högst
// var tionde sekund. Ingen position visas och inget lämnar telefonen.
//
// BRYTAREN: CarPlay slås av i bygget genom att ta bort tillståndet (com.apple.developer.carplay-driving-task) och
// scenkonfigurationen (UIApplicationSceneManifest) i project.yml. Koden här körs då aldrig.
import CarPlay
import HalkvaktEngine

final class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    private var interfaceController: CPInterfaceController?
    private let lista = CPListTemplate(title: "Halkvakt", sections: [])
    private var uppdatering: Task<Void, Never>?
    private var senast = ""

    func templateApplicationScene(_ scene: CPTemplateApplicationScene, didConnect interfaceController: CPInterfaceController) {
        self.interfaceController = interfaceController
        lista.emptyViewTitleVariants = ["Halkvakt"]
        interfaceController.setRootTemplate(lista, animated: false, completion: nil)
        GuardManager.shared.startFranCarPlay()   // DECISIONS #840: bilens skärm öppnad ⇒ vakten startar
        rita()
        uppdatering = Task { @MainActor [weak self] in
            await Rapporten.shared.uppdatera()
            while !Task.isCancelled {
                self?.rita()
                try? await Task.sleep(for: .seconds(10))   // Apple: högst var tionde sekund
            }
        }
    }

    func templateApplicationScene(_ scene: CPTemplateApplicationScene, didDisconnectInterfaceController interfaceController: CPInterfaceController) {
        uppdatering?.cancel()
        uppdatering = nil
        self.interfaceController = nil
    }

    /// Bygger sektionerna och byter dem bara när något ändrats.
    private func rita() {
        let g = GuardManager.shared
        let p = Prefs.shared
        let fav = Favoriter.shared
        let rapporten = Rapporten.shared

        var vakten: [CPListItem] = []
        let status = CPListItem(text: g.running ? "Vakten är på" : "Vakten är av",
                                detailText: g.running ? (g.snapshotInfo ?? "Hämtar väglaget") : "Tryck för att starta",
                                image: UIImage(systemName: g.running ? "checkmark.shield.fill" : "shield"))
        status.handler = { _, klar in
            Task { @MainActor in
                if GuardManager.shared.running { GuardManager.shared.stop() } else { GuardManager.shared.requestPermissionAndStart() }
                klar()
            }
        }
        vakten.append(status)

        var sagt: [CPListItem] = []
        if let text = p.lastSaidText, let t = p.lastSaidAt, Date.now.timeIntervalSince(t) < 3600 {
            sagt.append(CPListItem(text: text, detailText: t.klockslag, image: UIImage(systemName: "speaker.wave.2.fill")))
        }

        let resor: [CPListItem] = fav.rutter.prefix(5).map { r in
            CPListItem(text: r.namn, detailText: Self.lage(rapporten.radlage(r.id, koll: fav.kollar[r.id])))
        }

        let nyckel = ([g.running ? "1" : "0", g.snapshotInfo ?? ""] + sagt.map { $0.text ?? "" }
                      + resor.map { "\($0.text ?? "")|\($0.detailText ?? "")" }).joined(separator: "§")
        guard nyckel != senast else { return }
        senast = nyckel

        var sektioner = [CPListSection(items: vakten)]
        if !sagt.isEmpty { sektioner.append(CPListSection(items: sagt, header: "Senast sagt", sectionIndexTitle: nil)) }
        if !resor.isEmpty { sektioner.append(CPListSection(items: resor, header: "Dina resor", sectionIndexTitle: nil)) }
        lista.updateSections(sektioner)
    }

    /// Samma ord som fliken Favoriter (FAVORITER §2).
    private static func lage(_ l: ResansRapport.Radlage?) -> String {
        switch l {
        case .nytt(let antal, let v): return "\(antal == 1 ? "1 ny" : "\(antal) nya") · \(ResansRapport.titel(v.rubrik, vag: v.vag))"
        case .ingetNytt(let v): return "Inget nytt · \(ResansRapport.titel(v.rubrik, vag: v.vag))"
        case .lugnt: return "Lugnt · inget rapporterat längs vägen"
        case nil: return "Läget hämtas"
        }
    }
}
