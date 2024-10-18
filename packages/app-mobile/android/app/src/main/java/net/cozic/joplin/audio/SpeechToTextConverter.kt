package net.cozic.joplin.audio

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import ai.onnxruntime.extensions.OrtxPackage
import android.annotation.SuppressLint
import android.content.Context
import android.util.Log
import java.io.Closeable
import java.nio.FloatBuffer
import java.nio.IntBuffer
import kotlin.time.DurationUnit
import kotlin.time.measureTimedValue

class SpeechToTextConverter(
	modelPath: String,
	locale: String,
	recorderFactory: AudioRecorderFactory,
	private val environment: OrtEnvironment,
	context: Context,
) : Closeable {
	private val recorder = recorderFactory(context)
	private val session: OrtSession = environment.createSession(
		modelPath,
		OrtSession.SessionOptions().apply {
			// Needed for audio decoding
			registerCustomOpLibrary(OrtxPackage.getLibraryPath())
		},
	)
	private val languageCode = Regex("_.*").replace(locale, "")
	private val decoderInputIds = when (languageCode) {
		// Add 50363 to the end to omit timestamps
		"en" -> intArrayOf(50258, 50259, 50359)
		"fr" -> intArrayOf(50258, 50265, 50359)
		"es" -> intArrayOf(50258, 50262, 50359)
		"de" -> intArrayOf(50258, 50261, 50359)
		"it" -> intArrayOf(50258, 50274, 50359)
		"nl" -> intArrayOf(50258, 50271, 50359)
		"ko" -> intArrayOf(50258, 50264, 50359)
		"th" -> intArrayOf(50258, 50289, 50359)
		"ru" -> intArrayOf(50258, 50263, 50359)
		"pt" -> intArrayOf(50258, 50267, 50359)
		"pl" -> intArrayOf(50258, 50269, 50359)
		"id" -> intArrayOf(50258, 50275, 50359)
		"hi" -> intArrayOf(50258, 50276, 50359)
		// Let Whisper guess the language
		else -> intArrayOf(50258)
	}

	fun start() {
		recorder.start()
	}

	private fun getInputs(data: FloatArray): MutableMap<String, OnnxTensor> {
		fun intTensor(value: Int) = OnnxTensor.createTensor(
			environment,
			IntBuffer.wrap(intArrayOf(value)),
			longArrayOf(1),
		)
		fun floatTensor(value: Float) = OnnxTensor.createTensor(
			environment,
			FloatBuffer.wrap(floatArrayOf(value)),
			longArrayOf(1),
		)
		val audioPcmTensor = OnnxTensor.createTensor(
			environment,
			FloatBuffer.wrap(data),
			longArrayOf(1, data.size.toLong()),
		)
		val decoderInputIdsTensor = OnnxTensor.createTensor(
			environment,
			IntBuffer.wrap(decoderInputIds),
			longArrayOf(1, decoderInputIds.size.toLong())
		)

		return mutableMapOf(
			"audio_pcm" to audioPcmTensor,
			"max_length" to intTensor(412),
			"min_length" to intTensor(0),
			"num_return_sequences" to intTensor(1),
			"num_beams" to intTensor(1),
			"length_penalty" to floatTensor(1.1f),
			"repetition_penalty" to floatTensor(3f),
			"decoder_input_ids" to decoderInputIdsTensor,

			// Required for timestamps
			"logits_processor" to intTensor(1)
		)
	}

	// TODO .get() fails on older Android versions
	@SuppressLint("NewApi")
	private fun convert(data: FloatArray): String {
		val (inputs, convertInputsTime) = measureTimedValue {
			getInputs(data)
		}
		val (outputs, getOutputsTime) = measureTimedValue {
			session.run(inputs, setOf("str"))
		}
		val mainOutput = outputs.get("str").get().value as Array<Array<String>>
		outputs.close()

		Log.i("Whisper", "Converted ${data.size / 16000}s of data in ${
			getOutputsTime.toString(DurationUnit.SECONDS, 2)
		} converted inputs in ${convertInputsTime.inWholeMilliseconds}ms")
		return mainOutput[0][0]
	}

	fun dropFirstSeconds(seconds: Double) {
		Log.i("Whisper", "Drop first seconds $seconds")
		recorder.dropFirstSeconds(seconds)
	}

	val bufferLengthSeconds: Double get() = recorder.bufferLengthSeconds

	fun expandBufferAndConvert(seconds: Double): String {
		recorder.pullNextSeconds(seconds)
		// Also pull any extra available data, in case the speech-to-text converter
		// is lagging behind the audio recorder.
		recorder.pullAvailable()

		return convert(recorder.bufferedData)
	}

	// Converts as many seconds of buffered data as possible, without waiting
	fun expandBufferAndConvert(): String {
		recorder.pullAvailable()
		return convert(recorder.bufferedData)
	}

	override fun close() {
		recorder.close()
		session.close()
	}
}