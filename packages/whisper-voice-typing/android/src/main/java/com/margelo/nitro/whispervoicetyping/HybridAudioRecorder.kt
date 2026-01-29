package com.margelo.nitro.whispervoicetyping

import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.Promise
import com.margelo.nitro.NitroModules
import java.nio.FloatBuffer
import java.nio.ByteBuffer

// Wraps an AudioRecorder in an interface that can be accessed from C++
class HybridAudioRecorder : HybridAudioRecorderSpec() {
	private val recorder_ = AudioRecorder(NitroModules.applicationContext!!)

	override fun start() {
		recorder_.start()
	}

	override fun stop() {
		recorder_.close()
	}

	override fun waitForData(seconds: Double): Promise<Unit> {
		return Promise.async {
			recorder_.bufferAdditionalData(seconds)
		}
	}

    private fun toBytes(buffer: FloatBuffer): ByteArray {
        // Convert to a ByteBuffer first. (Similar approach to https://stackoverflow.com/q/11385596)
        val output = ByteBuffer.allocate(buffer.capacity() * Float.SIZE_BYTES)
        output.asFloatBuffer().put(buffer)
        return output.array()
    }

	override fun pullAvailable(): ArrayBuffer {
		val availableData = recorder_.pullAvailable()
		val buffer = ArrayBuffer.copy(toBytes(recorder_.pullAvailable()))
        recorder_.resetBuffer()
		return buffer
	}

}