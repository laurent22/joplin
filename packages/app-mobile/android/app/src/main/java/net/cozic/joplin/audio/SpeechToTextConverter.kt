package net.cozic.joplin.audio

import android.content.Context
import android.util.Log
import java.io.Closeable

class SpeechToTextConverter(
	modelPath: String,
	locale: String,
	prompt: String,
	recorderFactory: AudioRecorderFactory,
	context: Context,
) : Closeable {
	private val recorder = recorderFactory(context)
	private val languageCode = Regex("_.*").replace(locale, "")
	private var whisper = NativeWhisperLib(
		modelPath,
		languageCode,
		prompt,
	)

	fun start() {
		recorder.start()
	}

	private fun convert(data: FloatArray): String {
		Log.d("Whisper", "Pre-transcribe data of size ${data.size}")
		val result = whisper.transcribe(data)
		Log.d("Whisper", "Post transcribe. Got $result")
		return result;
	}

	fun dropFirstSeconds(seconds: Double) {
		Log.i("Whisper", "Drop first seconds $seconds")
		recorder.dropFirstSeconds(seconds)
	}

	val bufferLengthSeconds: Double get() = recorder.bufferLengthSeconds

	fun convertNext(seconds: Double): String {
		val buffer = recorder.pullNextSeconds(seconds)
		val result = convert(buffer)
		dropFirstSeconds(seconds)
		return result
	}

	// Converts as many seconds of buffered data as possible, without waiting
	fun convertRemaining(): String {
		val buffer = recorder.pullAvailable()
		return convert(buffer)
	}

	fun getPreview(): String {
		return whisper.getPreview()
	}

	override fun close() {
		Log.d("Whisper", "Close")
		recorder.close()
		whisper.close()
	}
}