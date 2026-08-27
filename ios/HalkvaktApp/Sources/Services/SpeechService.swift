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

    private init() {
        accident = d.object(forKey: "k.accident") as? Bool ?? true
        slippery = d.object(forKey: "k.slippery") as? Bool ?? true
        icing = d.object(forKey: "k.icing") as? Bool ?? true
        wildlife = d.object(forKey: "k.wildlife") as? Bool ?? true
        camera = d.object(forKey: "k.camera") as? Bool ?? true
        leadMaxM = d.object(forKey: "k.leadMaxM") as? Double ?? 3000
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
