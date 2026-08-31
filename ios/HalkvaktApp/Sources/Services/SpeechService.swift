// Rösten + inställningarna. AVSpeechSynthesizer duckar bilens musik via
// audiosessionens .duckOthers — samma beteende som Androids audio focus.
import Foundation
import AVFoundation
import Observation
import HalkvaktEngine

@MainActor
final class SpeechService {
    static let shared = SpeechService()
    private let synth = AVSpeechSynthesizer()

    func speak(_ text: String) {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, options: [.duckOthers])
        try? session.setActive(true)
        let u = AVSpeechUtterance(string: text)
        u.voice = AVSpeechSynthesisVoice(language: "sv-SE")
        u.rate = AVSpeechUtteranceDefaultSpeechRate
        synth.speak(u)
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
    /// Längsta förvarning i meter (motorns leadMaxM).
    var leadMaxM: Double { didSet { d.set(leadMaxM, forKey: "k.leadMaxM") } }
    /// #24: senaste repliken, överlever omstart — hemskärmens "Senast sagt".
    var lastSaidText: String? { didSet { d.set(lastSaidText, forKey: "k.lastSaidText") } }
    var lastSaidAt: Date? { didSet { d.set(lastSaidAt, forKey: "k.lastSaidAt") } }
    /// Introduktionen visad? (DECISIONS #36) Kan nollställas från Inställningar.
    var onboardingDone: Bool { didSet { d.set(onboardingDone, forKey: "k.onboardingDone") } }
    /// Hur telefonen kopplas till bilen — styr vilka autostart-steg som visas (DECISIONS #37).
    var carSetup: CarSetup? { didSet { d.set(carSetup?.rawValue, forKey: "k.carSetup") } }
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
        leadMaxM = d.object(forKey: "k.leadMaxM") as? Double ?? 3000
        lastSaidText = d.string(forKey: "k.lastSaidText")
        lastSaidAt = d.object(forKey: "k.lastSaidAt") as? Date
        onboardingDone = d.bool(forKey: "k.onboardingDone")
        carSetup = d.string(forKey: "k.carSetup").flatMap(CarSetup.init(rawValue:))
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
        }
    }

    func label(_ kind: HazardKind) -> String {
        switch kind {
        case .accident: return "Olycka/hinder"
        case .slippery_segment: return "Halt väglag"
        case .icing_point: return "Frysrisk"
        case .wildlife: return "Vilt"
        case .camera: return "Fartkamera"
        }
    }
}

/// Tre svar på en fråga: "Hur kopplar du telefonen i bilen?" Var och en har sin egen
/// bästa utlösare. Frågan ställs i introduktionen; svaret styr guiden.
enum CarSetup: String, CaseIterable, Identifiable {
    // OBS: heter INTE `none`. På en optional CarSetup? tolkar Swift `.none` som
    // Optional.none (= nil), inte som vårt fall — knappen "Inte alls" sparade ingenting.
    // Fångat på Axels telefon 31/8.
    case carplay, bluetooth, noConnection
    var id: String { rawValue }
}
