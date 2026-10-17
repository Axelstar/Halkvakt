package se.halkvakt.app

import android.media.AudioAttributes
import android.speech.tts.TextToSpeech

/** One audio path for real warnings and "Testa rösten" — the test used to play on the media stream, the warnings on navigation. */
object Voice {
    val ATTRS: AudioAttributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
        .build()

    const val NO_ENGINE = "Telefonen har ingen talmotor igång. Installera eller välj \"Talsyntes från Google\" under Text till tal."
    const val NO_SWEDISH = "Den svenska rösten saknas. Ladda ner Svenska under Text till tal, annars hörs inga varningar."

    /** setLanguage's result → the line to show, or null when Swedish is available. */
    fun problem(setLanguageResult: Int): String? =
        if (setLanguageResult == TextToSpeech.LANG_MISSING_DATA || setLanguageResult == TextToSpeech.LANG_NOT_SUPPORTED) NO_SWEDISH else null
}
