package com.reactnativevosk
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject
import org.vosk.Model
import org.vosk.Recognizer
import org.vosk.android.RecognitionListener
import org.vosk.android.SpeechService
import org.vosk.android.StorageService
import java.io.IOException

class VoskModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), RecognitionListener {
  private var model: Model? = null
  private var speechService: SpeechService? = null
  private var context: ReactApplicationContext? = reactContext
  private var recognizer: Recognizer? = null

  override fun getName(): String {
    return "Vosk"
  }

  @ReactMethod
  fun addListener(type: String?) {
    // Keep: Required for RN built in Event Emitter Calls.
  }

  @ReactMethod
  fun removeListeners(type: Int?) {
    // Keep: Required for RN built in Event Emitter Calls.
  }

  override fun onResult(hypothesis: String) {
    // Get text data from string object
    val text = getHypothesisText(hypothesis)

    // Stop recording if data found
    if (text != null && text.isNotEmpty()) {
      // Don't auto-stop the recogniser - we want to do that when the user
      // presses on "stop" only.
      // cleanRecognizer();
      sendEvent("onResult", text)
    }
  }

  override fun onFinalResult(hypothesis: String) {
    val text = getHypothesisText(hypothesis)
    if (text!!.isNotEmpty()) sendEvent("onFinalResult", text)
  }

  override fun onPartialResult(hypothesis: String) {
    sendEvent("onPartialResult", hypothesis)
  }

  override fun onError(e: Exception) {
    sendEvent("onError", e.toString())
  }

  override fun onTimeout() {
    sendEvent("onTimeout")
  }

  /**
   * Converts hypothesis json text to the recognized text
   * @return the recognized text or null if something went wrong
   */
  private fun getHypothesisText(hypothesis: String): String? {
    // Hypothesis is in the form: '{text: "recognized text"}'
    return try {
      val res = JSONObject(hypothesis)
      res.getString("text")
    } catch (tx: Throwable) {
      null
    }
  }

  /**
   * Sends event to react native with associated data
   */
  private fun sendEvent(eventName: String, data: String? = null) {
    // Write event data if there is some
    val event = Arguments.createMap().apply {
      if (data != null) putString("data", data)
    }

    // Send event
    context?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)?.emit(
      eventName,
      event
    )
  }

  /**
   * Translates array of string(s) to required kaldi string format
   * @return the array of string(s) as a single string
   */
  private fun makeGrammar(grammarArray: ReadableArray): String {
    return grammarArray.toArrayList().joinToString(
      prefix = "[",
      separator = ", ",
      transform = {"\"" + it + "\""},
      postfix = "]"
    )
  }

  @ReactMethod
  fun loadModel(path: String, promise: Promise) {
    cleanModel();
    StorageService.unpack(context, path, "models",
      { model: Model? ->
        this.model = model
        promise.resolve("Model successfully loaded")
      }
    ) { e: IOException ->
      this.model = null
      promise.reject(e)
    }
  }

  @ReactMethod
  fun start(grammar: ReadableArray? = null) {

    if (model == null) {
      sendEvent("onError", "Model is not loaded yet")
    }
    else if (speechService != null) {
      sendEvent("onError", "Recognizer is already in use")
    } else {
      try {
        recognizer =
          if (grammar != null)
            Recognizer(model, 16000.0f, makeGrammar(grammar))
          else
            Recognizer(model, 16000.0f)

        speechService = SpeechService(recognizer, 16000.0f)
        speechService!!.startListening(this)
        sendEvent("onStart")

      } catch (e: IOException) {
        sendEvent("onError", e.toString())
      }
    }
  }
  private fun cleanRecognizer() {
    if (speechService != null) {
      speechService!!.stop()
      speechService!!.shutdown();
      speechService = null
    }
    if (recognizer != null) {
      recognizer!!.close();
      recognizer = null;
    }
  }

  private fun cleanModel() {
    if (this.model != null) {
      this.model!!.close();
      this.model = null;
    }
  }

  @ReactMethod
  fun stop() {
    cleanRecognizer();
  }

  @ReactMethod
  fun stopOnly() {
    if (speechService != null) {
      speechService!!.stop()
    }
  }

  @ReactMethod
  fun cleanup() {
    if (speechService != null) {
      speechService!!.shutdown();
      speechService = null
    }
    if (recognizer != null) {
      recognizer!!.close();
      recognizer = null;
    }
  }

  @ReactMethod
  fun unload() {
    cleanRecognizer();
    cleanModel();
  }
}
