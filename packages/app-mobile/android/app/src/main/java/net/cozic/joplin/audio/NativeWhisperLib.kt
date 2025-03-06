package net.cozic.joplin.audio

import java.io.Closeable

class NativeWhisperLib(
	modelPath: String,
	languageCode: String,
	prompt: String,
) : Closeable {
	companion object {
		init {
			System.loadLibrary("joplin")
		}

		external fun runTests(): Unit;

		// TODO: The example whisper.cpp project transfers pointers as Longs to the Kotlin code.
		// This seems unsafe. Try changing how this is managed.
		private external fun init(modelPath: String, languageCode: String, prompt: String): Long;
		private external fun free(pointer: Long): Unit;

		private external fun fullTranscribe(pointer: Long, audioData: FloatArray): String;
		private external fun getPreview(pointer: Long): String;
	}

	private var closed = false
	private val pointer: Long = init(modelPath, languageCode, prompt)

	fun transcribe(audioData: FloatArray): String {
		if (closed) {
			throw Exception("Cannot transcribe using a closed session")
		}

		return fullTranscribe(pointer, audioData)
	}

	fun getPreview(): String {
		if (closed) {
			throw Exception("Cannot get preview from a closed session")
		}

		return getPreview(pointer)
	}

	override fun close() {
		if (closed) {
			throw Exception("Cannot close a whisper session twice")
		}

		closed = true
		free(pointer)
	}

}