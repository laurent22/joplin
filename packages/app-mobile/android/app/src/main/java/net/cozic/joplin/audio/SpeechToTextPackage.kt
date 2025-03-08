package net.cozic.joplin.audio

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class SpeechToTextPackage : ReactPackage {
	override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
		return listOf<NativeModule>(SpeechToTextModule(reactContext))
	}

	override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
		return emptyList()
	}

	class SpeechToTextModule(
		private var context: ReactApplicationContext,
	) : ReactContextBaseJavaModule(context), LifecycleEventListener {
		private val executorService: ExecutorService = Executors.newFixedThreadPool(1)
		private val sessionManager = SpeechToTextSessionManager(executorService)

		override fun getName() = "SpeechToTextModule"

		override fun onHostResume() { }
		override fun onHostPause() { }
		override fun onHostDestroy() { }

		@ReactMethod
		fun runTests(promise: Promise) {
			try {
				NativeWhisperLib.runTests()
				promise.resolve(true)
			} catch (exception: Throwable) {
				promise.reject(exception)
			}
		}

		@ReactMethod
		fun openSession(modelPath: String, locale: String, prompt: String, promise: Promise) {
			val appContext = context.applicationContext

			try {
				val sessionId = sessionManager.openSession(modelPath, locale, prompt, appContext)
				promise.resolve(sessionId)
			} catch (exception: Throwable) {
				promise.reject(exception)
			}
		}

		@ReactMethod
		fun startRecording(sessionId: Int, promise: Promise) {
			sessionManager.startRecording(sessionId, promise)
		}

		@ReactMethod
		fun getBufferLengthSeconds(sessionId: Int, promise: Promise) {
			sessionManager.getBufferLengthSeconds(sessionId, promise)
		}

		@ReactMethod
		fun dropFirstSeconds(sessionId: Int, duration: Double, promise: Promise) {
			sessionManager.dropFirstSeconds(sessionId, duration, promise)
		}

		@ReactMethod
		fun convertNext(sessionId: Int, duration: Double, promise: Promise) {
			sessionManager.convertNext(sessionId, duration, promise)
		}

		@ReactMethod
		fun convertAvailable(sessionId: Int, promise: Promise) {
			sessionManager.convertAvailable(sessionId, promise)
		}

		@ReactMethod
		fun getPreview(sessionId: Int, promise: Promise) {
			sessionManager.getPreview(sessionId, promise)
		}

		@ReactMethod
		fun closeSession(sessionId: Int, promise: Promise) {
			sessionManager.closeSession(sessionId, promise)
		}
	}
}