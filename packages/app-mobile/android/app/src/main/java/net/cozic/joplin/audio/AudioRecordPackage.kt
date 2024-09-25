package net.cozic.joplin.audio

import android.content.pm.PackageManager
import android.util.Log
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.uimanager.ViewManager


class AudioRecordPackage : ReactPackage {
	override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
		return listOf<NativeModule>(AudioRecordModule(reactContext))
	}

	override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
		return emptyList()
	}

	class AudioRecordModule(
		private var context: ReactApplicationContext,
	) : ReactContextBaseJavaModule(context) {
		private var nextSessionId: Int = 0
		private var sessions: MutableMap<Int, AudioRecorder> = mutableMapOf()

		override fun getName() = "AudioRecordModule"

		@ReactMethod
		fun openSession(promise: Promise) {
			val appContext = context.applicationContext
			val permissionResult = appContext.checkSelfPermission("android.permission.RECORD_AUDIO")
			if (permissionResult == PackageManager.PERMISSION_DENIED) {
				promise.reject(SecurityException("Permission denied"))
				return
			}

			val sessionId = nextSessionId++
			sessions[sessionId] = AudioRecorder(appContext)
			promise.resolve(sessionId)
		}

		@ReactMethod
		fun startRecording(sessionId: Int, promise: Promise) {
			val session = sessions[sessionId]

			if (session == null) {
				promise.reject(InvalidSessionIdException(sessionId))
				return
			}

			session.start()
			promise.resolve(sessionId)
		}

		@ReactMethod
		fun pullData(sessionId: Int, duration: Double, blocking: Boolean, promise: Promise) {
			val session = sessions[sessionId]

			if (session == null) {
				promise.reject(InvalidSessionIdException(sessionId))
				return
			}

			try {
				val data = (
					if (blocking)
						session.readBlocking(duration)
					else
						session.readNonblocking(duration)
				)

				val nativeArray = Arguments.makeNativeArray<Double>(data)
				Log.d("WHISPER", "Created output array ${nativeArray.size()} from byte array of size ${data.size}. Blocking is $blocking. First byte: ${
					data[0]
				}")
				promise.resolve(nativeArray)
			} catch (exception: Throwable) {
				promise.reject(exception)
			}
		}

		@ReactMethod
		fun closeSession(sessionId: Int, promise: Promise) {
			val session = sessions[sessionId]

			if (session == null) {
				promise.reject(InvalidSessionIdException(sessionId))
				return
			}

			session.close()
			sessions.remove(sessionId)
			promise.resolve(sessionId)
		}
	}
}