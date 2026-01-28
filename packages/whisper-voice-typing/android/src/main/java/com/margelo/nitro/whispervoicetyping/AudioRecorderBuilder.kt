package com.margelo.nitro.whispervoicetyping
import com.margelo.nitro.NitroModules

// This object simplifies constructing instances of AudioRecorder from C++.
object AudioRecorderBuilder {

	@JvmStatic
	fun build(): AudioRecorder? {
		val context = NitroModules.applicationContext?: return null
		return AudioRecorder(context)
	}
}
