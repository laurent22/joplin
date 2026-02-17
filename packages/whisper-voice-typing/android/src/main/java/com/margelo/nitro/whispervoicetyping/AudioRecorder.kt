package com.margelo.nitro.whispervoicetyping

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder.AudioSource
import java.io.Closeable
import kotlin.math.max
import kotlin.math.min
import com.margelo.nitro.NitroModules
import java.nio.FloatBuffer

class AudioRecorder (context: Context) : Closeable {
	private val sampleRate = 16_000
	// Don't allow the unprocessed audio buffer to grow indefinitely -- discard
	// data if longer than this:
	private val maxLengthSeconds = 120
	private val maxRecorderBufferLengthSeconds = 20
    private val maxBufferSizeFloats = sampleRate * maxLengthSeconds
	private val buffer = FloatArray(maxBufferSizeFloats)

	private var bufferWriteOffset = 0


	init {
		val permissionResult = context.checkSelfPermission(Manifest.permission.RECORD_AUDIO)
		if (permissionResult == PackageManager.PERMISSION_DENIED) {
			throw SecurityException("Missing RECORD_AUDIO permission!")
		}
	}

	// Permissions check is included above
	@SuppressLint("MissingPermission")
	private val recorder = AudioRecord.Builder()
		.setAudioSource(AudioSource.MIC)
		.setAudioFormat(
			AudioFormat.Builder()
				// PCM: A WAV format
				.setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
				.setSampleRate(sampleRate)
				.setChannelMask(AudioFormat.CHANNEL_IN_MONO)
				.build()
		)
		// Use a smaller internal buffer size in the recorder
		.setBufferSizeInBytes(maxRecorderBufferLengthSeconds * sampleRate * Float.SIZE_BYTES)
		.build()

	// Discards the first [samples] samples from the start of the buffer. Conceptually, this
	// advances the buffer's start point.
	private fun advanceStartBySamples(samples: Int) {
		val samplesClamped = min(samples, maxBufferSizeFloats)
		val remainingBuffer = buffer.sliceArray(samplesClamped until maxBufferSizeFloats)

        buffer.fill(0f, samplesClamped, maxBufferSizeFloats)
		remainingBuffer.copyInto(buffer, 0)
		bufferWriteOffset = max(bufferWriteOffset - samplesClamped, 0)
	}

	fun start() {
		recorder.startRecording()
	}

	@Synchronized
	private fun read(requestedSize: Int, mode: Int) {
		val size = min(requestedSize, maxBufferSizeFloats - bufferWriteOffset)
		val sizeRead = recorder.read(buffer, bufferWriteOffset, size, mode)
		if (sizeRead > 0) {
			bufferWriteOffset += sizeRead
		}
	}

	// Returns a pointer to the buffered data
	fun pullAvailable(): FloatArray {
		read(maxBufferSizeFloats, AudioRecord.READ_NON_BLOCKING)
        return buffer.sliceArray(0 until bufferWriteOffset)
	}

	// Sets the buffer write offset back to zero.
	fun resetBuffer() {
		bufferWriteOffset = 0
	}

	// Pushes at least [seconds] seconds of new data to the recording buffer.
	// Call "pullAvailable" to read the buffered data.
	fun bufferAdditionalData(seconds: Double) {
		val remainingSize = maxBufferSizeFloats - bufferWriteOffset
		val requestedSize = (seconds * sampleRate).toInt()

		// If low on size, make more room.
		if (remainingSize < maxBufferSizeFloats / 3) {
			advanceStartBySamples(maxBufferSizeFloats / 3)
		}

		read(requestedSize, AudioRecord.READ_BLOCKING)
	}

	override fun close() {
		recorder.stop()
		recorder.release()
	}
}
