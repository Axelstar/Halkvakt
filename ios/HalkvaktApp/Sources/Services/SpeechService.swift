// Rösten + inställningarna. AVSpeechSynthesizer duckar bilens musik via
// audiosessionens .duckOthers och släpper den när repliken är sagd — samma beteende som Androids audio focus
// (GuardService.abandonFocus i onDone).
import Foundation
import AVFoundation
import UIKit
import Observation
import HalkvaktEngine

@MainActor
final class SpeechService: NSObject, AVSpeechSynthesizerDelegate {
    static let shared = SpeechService()
    private let synth = AVSpeechSynthesizer()

    private override init() {
        super.init()
        synth.delegate = self
    }

    func speak(_ text: String) {
        let session = AVAudioSession.sharedInstance()
        // .voicePrompt: CarPlay och Bluetooth spelar repliken som en navigationsröst, på navigationsvolymen
        // i stället för mediavolymen (provkörning 18/10: rösten högt, musiken lågt).
        try? session.setCategory(.playback, mode: .voicePrompt, options: [.duckOthers])
        try? session.setActive(true)
        let u = AVSpeechUtterance(string: text)
        u.voice = AVSpeechSynthesisVoice(language: "sv-SE")
        u.rate = AVSpeechUtteranceDefaultSpeechRate
        synth.speak(u)
    }

    /// Testlarm för bakgrundsljudet (Apple 2.5.4, 5/10): talar efter `delay` sekunder så man hinner gå till
    /// hemskärmen. Bakgrundsuppgiften håller appen vaken tills repliken är sagd.
    func speakLater(_ text: String, delay: Double = 5) {
        endBackgroundTask()
        bgTask = UIApplication.shared.beginBackgroundTask { [weak self] in
            Task { @MainActor in self?.endBackgroundTask() }
        }
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(delay))
            speak(text)
            try? await Task.sleep(for: .seconds(6))
            endBackgroundTask()
        }
    }

    // Provkörning 18/10: sessionen aktiverades men släpptes aldrig, så bilens musik stod kvar nedduckad efter repliken.
    // När rösten tystnat avaktiveras den med .notifyOthersOnDeactivation, så att musiken tonar upp igen.
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        Task { @MainActor in self.releaseSession() }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        Task { @MainActor in self.releaseSession() }
    }

    private func releaseSession() {
        guard !synth.isSpeaking else { return }   // en replik till står i kö — släpp efter den
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    private var bgTask: UIBackgroundTaskIdentifier = .invalid
    private func endBackgroundTask() {
        guard bgTask != .invalid else { return }
        UIApplication.shared.endBackgroundTask(bgTask)
        bgTask = .invalid
    }
}

@MainActor
@Observable
final class Prefs {
    static let shared = Prefs()
    private let d = UserDefaults.standard

    var accident: Bool { didSet { d.set(accident, forKey: "k.accident") } }
    var slippery: Bool { didSet { d.set(slippery, forKey: "k.slippery") } }
    var icing: Bool { didSet { d.set(icing, forKey: "k.icing") } }
    var wildlife: Bool { didSet { d.set(wildlife, forKey: "k.wildlife") } }
    var camera: Bool { didSet { d.set(camera, forKey: "k.camera") } }
    /// Längsta förvarning i meter (motorns leadMaxM) — ett tak. Kort #259: motorn talar vid fart × 30 s, så över 1 200 m
    /// (≈ 30 s i 140 km/h) gjorde reglaget ingenting. Äldre sparade värden upp till 3 000 läses som 1 200: samma beteende.
    static let leadRange: ClosedRange<Double> = 400...1200
    var leadMaxM: Double { didSet { d.set(leadMaxM, forKey: "k.leadMaxM") } }
    /// #24: senaste repliken, överlever omstart — hemskärmens "Senast sagt".
    var lastSaidText: String? { didSet { d.set(lastSaidText, forKey: "k.lastSaidText") } }
    var lastSaidAt: Date? { didSet { d.set(lastSaidAt, forKey: "k.lastSaidAt") } }
    /// S4: vilken varning "Senast sagt" gäller — facitknappen behöver id:t (DECISIONS #203).
    var lastSaidId: String? { didSet { d.set(lastSaidId, forKey: "k.lastSaidId") } }
    /// Betatestet bara i TestFlight och i utvecklarbyggen (Bengt 22/10, DECISIONS #681): i ett App Store-bygge syns det inte, och en
    /// brytare som slagits på i en äldre version gäller inte, så att varken facitsvar eller efterhalkans betavarning (#677, #679)
    /// når allmänheten. TestFlight känns igen på kvittots namn; App Store-bygget har ett riktigt kvitto.
    static let betatestTillaten: Bool = {
        #if DEBUG
        return true
        #else
        return Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt"
        #endif
    }()
    /// S4: betatestets facitknapp (DECISIONS #186) — AV tills föraren själv slår på den.
    var facitOn: Bool { didSet { d.set(facitOn, forKey: "k.facitOn") } }
    /// S4: svaren, sända och osända. Ren Swift-logik i Facit.swift.
    var facit: [FacitEntry] { didSet { d.set(try? JSONEncoder().encode(facit), forKey: "k.facit") } }
    /// Kort #203: resans varningar, persistenta. iOS hade förut bara "senast sagt" — bara resans SISTA
    /// varning gick att svara på. Nyast SIST, som Androids AlertHistory.
    var history: [AlertEntry] { didSet { d.set(try? JSONEncoder().encode(history), forKey: "k.history") } }
    /// Kort #203: när den pågående resan började. Fönstret som "alla" i "Ja, alla stämde" betyder.
    /// Överlever omstart: notisens knapp kan tryckas långt efter att appen dödats.
    var tripStart: Date? { didSet { d.set(tripStart, forKey: "k.tripStart") } }
    /// Redo efter tur (designen 01b): senaste resans slut och sträcka.
    var lastTripEnd: Date? { didSet { d.set(lastTripEnd, forKey: "k.lastTripEnd") } }
    var lastTripKm: Double { didSet { d.set(lastTripKm, forKey: "k.lastTripKm") } }
    /// Kort #203 lager 2: förarens missar, markerade och valda. Ren Swift-logik i Missar.swift.
    var missar: [MissEntry] { didSet { d.set(try? JSONEncoder().encode(missar), forKey: "k.missar") } }
    /// S4: vad senaste sändningsförsöket gav — syns under knapparna så testaren ser vad som hände (DECISIONS #209).
    var facitStatus: String? { didSet { d.set(facitStatus, forKey: "k.facitStatus") } }
    /// När statusraden skrevs — så att den bara visas under den resa eller varning den gäller (kort #279).
    var facitStatusAt: Date? { didSet { d.set(facitStatusAt, forKey: "k.facitStatusAt") } }
    /// Introduktionen visad? (DECISIONS #36) Kan nollställas från Inställningar.
    var onboardingDone: Bool { didSet { d.set(onboardingDone, forKey: "k.onboardingDone") } }
    /// Senaste gången vakten startades av intentet (automation eller Siri) — guidens kvitto.
    var lastIntentStartAt: Date? { didSet { d.set(lastIntentStartAt, forKey: "k.lastIntentStartAt") } }
    /// Vakna själv vid körning (kräver Alltid). Standard på. DECISIONS #40.
    /// Kvitto för självväckningen (DECISIONS #46): när vaknade vakten själv senast, och hur länge körde den.
    var lastAutoWakeAt: Date? { didSet { d.set(lastAutoWakeAt, forKey: "k.lastAutoWakeAt") } }
    var lastAutoWakeMinutes: Int { didSet { d.set(lastAutoWakeMinutes, forKey: "k.lastAutoWakeMinutes") } }
    var autoWake: Bool {
        didSet {
            d.set(autoWake, forKey: "k.autoWake")
            Task { @MainActor in GuardManager.shared.armAutoWake() }   // MainActor-isolerad
        }
    }

    private init() {
        accident = d.object(forKey: "k.accident") as? Bool ?? true
        slippery = d.object(forKey: "k.slippery") as? Bool ?? true
        icing = d.object(forKey: "k.icing") as? Bool ?? true
        wildlife = d.object(forKey: "k.wildlife") as? Bool ?? true
        camera = d.object(forKey: "k.camera") as? Bool ?? true
        leadMaxM = min(max(d.object(forKey: "k.leadMaxM") as? Double ?? Prefs.leadRange.upperBound,
                           Prefs.leadRange.lowerBound), Prefs.leadRange.upperBound)
        lastSaidText = d.string(forKey: "k.lastSaidText")
        lastSaidAt = d.object(forKey: "k.lastSaidAt") as? Date
        lastSaidId = d.string(forKey: "k.lastSaidId")
        facitOn = Self.betatestTillaten && d.bool(forKey: "k.facitOn")   // det sparade värdet rörs inte (#681)
        facit = d.data(forKey: "k.facit").flatMap { try? JSONDecoder().decode([FacitEntry].self, from: $0) } ?? []
        facitStatus = d.string(forKey: "k.facitStatus")
        facitStatusAt = d.object(forKey: "k.facitStatusAt") as? Date
        missar = d.data(forKey: "k.missar").flatMap { try? JSONDecoder().decode([MissEntry].self, from: $0) } ?? []
        history = d.data(forKey: "k.history").flatMap { try? JSONDecoder().decode([AlertEntry].self, from: $0) } ?? []
        tripStart = d.object(forKey: "k.tripStart") as? Date
        lastTripEnd = d.object(forKey: "k.lastTripEnd") as? Date
        lastTripKm = d.double(forKey: "k.lastTripKm")
        onboardingDone = d.bool(forKey: "k.onboardingDone")
        lastIntentStartAt = d.object(forKey: "k.lastIntentStartAt") as? Date
        autoWake = d.object(forKey: "k.autoWake") as? Bool ?? true
        lastAutoWakeAt = d.object(forKey: "k.lastAutoWakeAt") as? Date
        lastAutoWakeMinutes = d.integer(forKey: "k.lastAutoWakeMinutes")
    }

    /// Tystad kategori: motorn minns, munnen tiger — samma princip som Android.
    func enabled(_ kind: HazardKind) -> Bool {
        switch kind {
        case .accident: return accident
        case .slippery_segment: return slippery
        case .icing_point: return icing
        case .wildlife: return wildlife
        case .camera: return camera
        case .kandidat: return slippery   // #577: följer reglaget Halka — den säger halka, och har inget eget reglage
        }
    }

    func label(_ kind: HazardKind) -> String {
        switch kind {
        case .accident: return "Olycka/hinder"
        case .slippery_segment: return "Halt väglag"
        case .icing_point: return "Frysrisk"
        case .wildlife: return "Vilt"
        case .camera: return "Fartkamera"
        case .kandidat: return "Halka (beta)"
        }
    }
}
