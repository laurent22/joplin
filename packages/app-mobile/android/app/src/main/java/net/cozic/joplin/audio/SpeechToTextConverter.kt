package net.cozic.joplin.audio

import ai.onnxruntime.OnnxJavaType
import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import ai.onnxruntime.extensions.OrtxPackage
import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi
import java.io.Closeable
import java.nio.ByteBuffer
import java.nio.FloatBuffer
import java.nio.IntBuffer

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
        "en" -> intArrayOf(50258, 50259, 50359, 50363)
        "fr" -> intArrayOf(50258, 50265, 50359, 50363)
        "es" -> intArrayOf(50258, 50262, 50359, 50363)
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

    // TODO
    @SuppressLint("NewApi")
    private fun convert(data: FloatArray): String {
        val outputs = session.run(getInputs(data), setOf("str"))
        val mainOutput = outputs.get("str").get().value as Array<Array<String>>
        outputs.close()
        Log.d("Whisper", "Main output value: ${mainOutput[0][0]} ${mainOutput.size} ${mainOutput[0].size}")
        return mainOutput[0][0]
    }

    // Converts **at most** the last [n] seconds of buffered data
    fun convertNonblocking(seconds: Double): String {
        return convert(recorder.readNonblocking(seconds));
    }

    fun convertBlocking(seconds: Double): String {
        return convert(recorder.readBlocking(seconds))
    }

    override fun close() {
        recorder.close()
        session.close()
    }
}