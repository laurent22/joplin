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
    private val environment: OrtEnvironment,
    context: Context,
) : Closeable {
    private val recorder = AudioRecorder(context)
    private val session: OrtSession = environment.createSession(
        modelPath,
        OrtSession.SessionOptions().apply {
            // Needed for audio decoding
            registerCustomOpLibrary(OrtxPackage.getLibraryPath())
        },
    )
    private val decoderInputIds = when (locale) {
        // Add 50363 to the end to omit timestamps
        "en" -> intArrayOf(50258, 50259, 50359)
        "fr" -> intArrayOf(50258, 50265, 50359)
        "es" -> intArrayOf(50258, 50262, 50359)
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
            "max_length" to intTensor(200),
            "min_length" to intTensor(1),
            "num_return_sequences" to intTensor(1),
            "num_beams" to intTensor(2),
            "length_penalty" to floatTensor(1f),
            "repetition_penalty" to floatTensor(1f),
            "decoder_input_ids" to decoderInputIdsTensor,
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