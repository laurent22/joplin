package net.cozic.joplin.audio

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder.AudioSource
import java.io.Closeable

class AudioRecorder(context: Context) : Closeable {
	private val sampleRate = 16_000

	init {
		val permissionResult = context.checkSelfPermission("android.permission.RECORD_AUDIO")
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
		.setBufferSizeInBytes(sampleRate * 30) // 30s of audio
		.build()

	fun start() {
		recorder.startRecording()
	}

	private fun read(seconds: Double, mode: Int): FloatArray {
		val size = (seconds * sampleRate).toInt()
		val output = FloatArray(size)
		recorder.read(output, 0, size, mode);
		return output
	}

	fun readNonblocking(seconds: Double): FloatArray {
		return read(seconds, AudioRecord.READ_NON_BLOCKING)
	}

	fun readBlocking(seconds: Double): FloatArray {
		return read(seconds, AudioRecord.READ_BLOCKING)
	}

	override fun close() {
		recorder.stop()
		recorder.release()
	}
}