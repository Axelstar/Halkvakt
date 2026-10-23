package se.halkvakt.app

import android.speech.tts.TextToSpeech
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class VoiceTest {
    @Test fun swedishAvailableIsNoProblem() {
        assertNull(Voice.problem(TextToSpeech.LANG_AVAILABLE))
        assertNull(Voice.problem(TextToSpeech.LANG_COUNTRY_AVAILABLE))
    }
    @Test fun missingSwedishIsShown() {
        assertEquals(Voice.NO_SWEDISH, Voice.problem(TextToSpeech.LANG_MISSING_DATA))
        assertEquals(Voice.NO_SWEDISH, Voice.problem(TextToSpeech.LANG_NOT_SUPPORTED))
    }
}
