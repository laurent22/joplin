package net.cozic.joplin.audio

import java.io.Closeable

class NativeWhisperLib(
	modelPath: String,
	languageCode: String,
	prompt: String,
	shortAudioContext: Boolean,
) : Closeable {
	companion object {
		init {
			System.loadLibrary("joplin")
		}

		external fun runTests(): Unit;

		// TODO: The example whisper.cpp project transfers pointers as Longs to the Kotlin code.
		// This seems unsafe. Try changing how this is managed.
		private external fun init(modelPath: String, languageCode: String, prompt: String, shortAudioContext: Boolean): Long;
		private external fun free(pointer: Long): Unit;

		private external fun addAudio(pointer: Long, audioData: FloatArray): Unit;
		private external fun transcribeNextChunk(pointer: Long): String;
		private external fun transcribeRemaining(pointer: Long): String;
	}

	private var closed = false
	private val pointer: Long = init(modelPath, languageCode, prompt, shortAudioContext)

	fun addAudio(audioData: FloatArray) {
		if (closed) {
			throw Exception("Cannot add audio data to a closed session")
		}

		Companion.addAudio(pointer, audioData)
	}

	fun transcribeNextChunk(): String {
		if (closed) {
			throw Exception("Cannot transcribe using a closed session")
		}

		return Companion.transcribeNextChunk(pointer)
	}

	fun transcribeRemaining(): String {
		if (closed) {
			throw Exception("Cannot transcribeAll using a closed session")
		}

		return Companion.transcribeRemaining(pointer)
	}

	override fun close() {
		if (closed) {
			throw Exception("Cannot close a whisper session twice")
		}

		closed = true
		free(pointer)
	}

}