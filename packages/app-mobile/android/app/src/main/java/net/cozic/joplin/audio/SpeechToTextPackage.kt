package net.cozic.joplin.audio

import ai.onnxruntime.OrtEnvironment
import android.util.Log
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

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
        private var nextSessionId: Int = 0
        private var sessions: MutableMap<Int, SpeechToTextConverter> = mutableMapOf()
        private var environment: OrtEnvironment? = null

        override fun getName() = "SpeechToTextModule"

        override fun onHostResume() { }
        override fun onHostPause() { }
        override fun onHostDestroy() {
            environment?.close()
        }

        @ReactMethod
        fun openSession(modelPath: String, locale: String, promise: Promise) {
            val appContext = context.applicationContext
            val ortEnvironment = environment ?: OrtEnvironment.getEnvironment()
            if (environment != null) {
                environment = ortEnvironment
            }

            try {
                val sessionId = nextSessionId++
                sessions[sessionId] = SpeechToTextConverter(modelPath, locale, ortEnvironment, appContext)
                promise.resolve(sessionId)
            } catch (exception: Throwable) {
                promise.reject(exception)
            }
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
                val result =
                    if (blocking)
                        session.convertBlocking(duration)
                    else
                        session.convertNonblocking(duration)
                Log.d("Whisper", "Result: $result")
                promise.resolve(result)
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