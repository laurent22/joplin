package net.cozic.joplin.audio

import android.content.Context
import com.facebook.react.bridge.Promise
import java.util.concurrent.Executor
import java.util.concurrent.locks.ReentrantLock

class SpeechToTextSession (
	val converter: SpeechToTextConverter
) {
	val mutex = ReentrantLock()
}

class SpeechToTextSessionManager(
	private var executor: Executor,
) {
	private val sessions: MutableMap<Int, SpeechToTextSession> = mutableMapOf()
	private var nextSessionId: Int = 0

	fun openSession(
		modelPath: String,
		locale: String,
		prompt: String,
		context: Context,
	): Int {
		val sessionId = nextSessionId++
		sessions[sessionId] = SpeechToTextSession(
			SpeechToTextConverter(
				modelPath, locale, prompt, recorderFactory = AudioRecorder.factory, context,
			)
		)
		return sessionId
	}

	private fun getSession(id: Int): SpeechToTextSession {
		return sessions[id] ?: throw InvalidSessionIdException(id)
	}

	private fun concurrentWithSession(
		id: Int,
		callback: (session: SpeechToTextSession)->Unit,
	) {
		executor.execute {
			val session = getSession(id)
			session.mutex.lock()
			try {
				callback(session)
			} finally {
				session.mutex.unlock()
			}
		}
	}
	private fun concurrentWithSession(
		id: Int,
		onError: (error: Throwable)->Unit,
		callback: (session: SpeechToTextSession)->Unit,
	) {
		return concurrentWithSession(id) { session ->
			try {
				callback(session)
			} catch (error: Throwable) {
				onError(error)
			}
		}
	}

	fun startRecording(sessionId: Int, promise: Promise) {
		this.concurrentWithSession(sessionId, promise::reject) { session ->
			session.converter.start()
			promise.resolve(null)
		}
	}

	// Left-shifts the recording buffer by [duration] seconds
	fun dropFirstSeconds(sessionId: Int, duration: Double, promise: Promise) {
		this.concurrentWithSession(sessionId, promise::reject) { session ->
			session.converter.dropFirstSeconds(duration)
			promise.resolve(sessionId)
		}
	}

	fun getBufferLengthSeconds(sessionId: Int, promise: Promise) {
		this.concurrentWithSession(sessionId, promise::reject) { session ->
			promise.resolve(session.converter.bufferLengthSeconds)
		}
	}

	// Waits for the next [duration] seconds to become available, then converts
	fun convertNext(sessionId: Int, duration: Double, promise: Promise) {
		this.concurrentWithSession(sessionId, promise::reject) { session ->
			val result = session.converter.convertNext(duration)
			promise.resolve(result)
		}
	}

	// Converts all available recorded data
	fun convertAvailable(sessionId: Int, promise: Promise) {
		this.concurrentWithSession(sessionId, promise::reject) { session ->
			val result = session.converter.convertRemaining()
			promise.resolve(result)
		}
	}

	fun getPreview(sessionId: Int, promise: Promise) {
		this.concurrentWithSession(sessionId, promise::reject) { session ->
			val result = session.converter.getPreview()
			promise.resolve(result)
		}
	}

	fun closeSession(sessionId: Int, promise: Promise) {
		this.concurrentWithSession(sessionId) { session ->
			session.converter.close()
			promise.resolve(null)
		}
	}
}
