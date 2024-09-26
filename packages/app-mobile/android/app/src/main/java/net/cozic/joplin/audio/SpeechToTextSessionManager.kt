package net.cozic.joplin.audio

import ai.onnxruntime.OrtEnvironment
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
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
		environment: OrtEnvironment,
		context: Context,
	): Int {
		val sessionId = nextSessionId++
		sessions[sessionId] = SpeechToTextSession(
			SpeechToTextConverter(modelPath, locale, environment, context)
		)
		return sessionId
	}

	private fun getSession(id: Int): SpeechToTextSession {
		return sessions[id] ?: throw InvalidSessionIdException(id)
	}

	private fun concurrentWithSession(id: Int, callback: (session: SpeechToTextSession)->Unit) {
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

	fun startRecording(sessionId: Int, promise: Promise) {
		this.concurrentWithSession(sessionId) { session ->
			session.converter.start()
			promise.resolve(null)
		}
	}

	fun pullData(sessionId: Int, duration: Double, blocking: Boolean, promise: Promise) {
		this.concurrentWithSession(sessionId) { session ->
			try {
				val result =
					if (blocking)
						session.converter.convertBlocking(duration)
					else
						session.converter.convertNonblocking(duration)
				promise.resolve(result)
			} catch (error: Throwable) {
				promise.reject(error)
			}
		}
	}

	fun closeSession(sessionId: Int, promise: Promise) {
		this.concurrentWithSession(sessionId) { session ->
			session.converter.close()
			promise.resolve(null)
		}
	}
}
