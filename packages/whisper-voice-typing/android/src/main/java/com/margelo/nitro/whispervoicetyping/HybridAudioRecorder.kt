package com.margelo.nitro.whispervoicetyping

import android.util.Log
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.Promise
import com.margelo.nitro.NitroModules
import java.nio.ByteBuffer
import java.nio.ByteOrder

// Wraps an AudioRecorder in an interface that can be accessed from C++
class HybridAudioRecorder : HybridAudioRecorderSpec() {
	private val recorder = AudioRecorder(NitroModules.applicationContext!!)

	override fun start() {
		recorder.start()
	}

	override fun stop() {
		recorder.close()
	}

	override fun waitForData(seconds: Double): Promise<Unit> {
		return Promise.async {
			recorder.bufferAdditionalData(seconds)
		}
	}

	override fun pullAvailable(): ArrayBuffer {
		val floatData = recorder.pullAvailable()
        val bytes = convertToBytes(floatData)

		val buffer = ArrayBuffer.copy(bytes)
        recorder.resetBuffer()
		return buffer
	}

    private fun convertToBytes(floatData: FloatArray): ByteArray {
        // Convert to a ByteBuffer first. (Similar approach to https://stackoverflow.com/q/11385596)
        val output = ByteBuffer.allocate(floatData.size * Float.SIZE_BYTES)
        output.order(ByteOrder.nativeOrder())
        output.asFloatBuffer().put(floatData)
        return output.array()
    }
}