#include "WhisperSession.h"

#include <utility>
#include <sstream>
#include <algorithm>
#include "whisper.h"
#include "findLongestSilence.h"
#include "androidUtil.h"

WhisperSession::WhisperSession(const std::string& modelPath, std::string lang, std::string prompt, bool shortAudioContext)
	: lang_ {std::move(lang)}, prompt_ {std::move(prompt)}, shortAudioContext_ {shortAudioContext} {
	whisper_context_params contextParams = whisper_context_default_params();

	// Lifetime(pModelPath): Whisper.cpp creates a copy of pModelPath and stores it in a std::string.
	// whisper_init_from_file_with_params doesn't seem to otherwise save pModelPath. As such, it's
	// safe to pass a pointer to a std::string's representation:
	const char *pModelPath = modelPath.c_str();
	pContext_ = whisper_init_from_file_with_params(pModelPath, contextParams);

	if (pContext_ == nullptr) {
		throw std::runtime_error("Unable to initialize the Whisper context.");
	}
}

WhisperSession::~WhisperSession() {
	if (pContext_ != nullptr) {
		whisper_free(pContext_);
	}
}

whisper_full_params
WhisperSession::buildWhisperParams_() {
	whisper_full_params params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
	// WHISPER_SAMPLING_BEAM_SEARCH is an alternative to greedy:
	// params.beam_search = { .beam_size = 2 };
	params.print_realtime = false;
	// Disable timestamps: They make creating custom Whisper models more difficult:
	params.print_timestamps = false;
	params.no_timestamps = true;

	params.print_progress = false;
	params.translate = false;
	params.offset_ms = 0;
	params.single_segment = true;
	// Avoid non-speech tokens (e.g. "(crackle)"). For now, this is disabled because it seems to
	// cause increased hallucinations (e.g. repeated "Thank you"s).
	// params.suppress_nst = true;
	params.temperature = 0; // Initial randomness
	// There's also a temperature_inc variable, which is used when decoding fails (Whisper increases
	// the temperature by temperature_inc and retries).

	// Following the whisper streaming example in setting prompt_tokens to nullptr
	// when using VAD (Voice Activity Detection)
	params.initial_prompt = prompt_.c_str();
	params.prompt_tokens = nullptr;
	params.prompt_n_tokens = 0;
	params.audio_ctx = 0;

	// Lifetime: lifetime(params) < lifetime(lang_) = lifetime(this).
	params.language = lang_.c_str();

	return params;
}

std::string
WhisperSession::transcribe_(const std::vector<float>& audio, size_t transcribeCount) {
	// Whisper won't transcribe anything shorter than 1s.
	int minTranscribeLength = WHISPER_SAMPLE_RATE; // 1s
	if (transcribeCount < minTranscribeLength) {
		return "";
	}

	float seconds = static_cast<float>(transcribeCount) / WHISPER_SAMPLE_RATE;
	if (seconds > 30.0f) {
		LOGW("Warning: Audio is longer than 30 seconds. Not all audio will be transcribed");
	}

	whisper_full_params params = buildWhisperParams_();

	// If supported by the model, allow shortening the transcription. This can significantly
	// improve performance, but requires a fine-tuned model.
	// See https://github.com/futo-org/whisper-acft
	if (this->shortAudioContext_) {
		// audio_ctx: 1500 every 30 seconds (50 units in one second).
		// See https://github.com/futo-org/whisper-acft/issues/6
		float padding = 64.0f;
		params.audio_ctx = static_cast<int>(seconds * (1500.0f / 30.0f) + padding);

		if (params.audio_ctx > 1500) {
			params.audio_ctx = 1500;
		}
	}
	whisper_reset_timings(pContext_);

	transcribeCount = std::min(audio.size(), transcribeCount);

	if (whisper_full(pContext_, params, audio.data(), transcribeCount) != 0) {
		throw std::runtime_error("Failed to run Whisper (non-zero exit status).");
	} else {
		whisper_print_timings(pContext_);
	}

	// Tokens to be used as a prompt for the next run of Whisper
	unsigned int segmentCount = whisper_full_n_segments(pContext_);

	// Build the results
	std::stringstream results;
	for (int i = 0; i < segmentCount; i++) {
		results << " " << whisper_full_get_segment_text(pContext_, i);
	}

	std::string result = results.str();
	LOGD("Transcribed: %s (audio len %.2f)", result.c_str(), audio.size() / (float) WHISPER_SAMPLE_RATE);

	return result;
}

std::string
WhisperSession::splitAndTranscribeBefore_(int transcribeUpTo, int trimTo) {
	std::string result = transcribe_(audioBuffer_, transcribeUpTo);

	// Trim
	LOGI("Trim to %.2f s, transcribe to %.2f s", (float) trimTo / WHISPER_SAMPLE_RATE, (float) transcribeUpTo / WHISPER_SAMPLE_RATE);
	audioBuffer_ = std::vector(audioBuffer_.begin() + trimTo, audioBuffer_.end());
	return result;
}

bool WhisperSession::isBufferSilent_() {
	int toleranceSamples = WHISPER_SAMPLE_RATE / 5; // 0.2s
	auto silence = findLongestSilence(
			audioBuffer_,
			LongestSilenceOptions {
					.sampleRate = WHISPER_SAMPLE_RATE,
					.minSilenceLengthSeconds = 0.0f,
					.maximumSilenceStartSamples = toleranceSamples, // 0.5s
					.returnFirstMatch = true
			}
	);
	return silence.end >= audioBuffer_.size() - toleranceSamples;
}

std::string
WhisperSession::transcribeNextChunk() {
	std::stringstream result;

	// Handles a silence detected between (splitStart, splitEnd).
	auto splitAndProcess = [&] (int splitStart, int splitEnd) {
		int tolerance = WHISPER_SAMPLE_RATE / 8; // 0.125s
		bool isCompletelySilent = splitStart < tolerance && splitEnd > audioBuffer_.size() - tolerance;
		LOGD("WhisperSession: Found silence range from %.2f -> %.2f", splitStart / (float) WHISPER_SAMPLE_RATE, splitEnd / (float) WHISPER_SAMPLE_RATE);

		if (isCompletelySilent) {
			audioBuffer_.clear();
			return false;
		} else if (splitEnd > tolerance) { // Anything to transcribe?
			// Include some of the silence between the start and the end. Excluding it
			// seems to make Whisper more likely to omit trailing punctuation.
			int maximumSilentSamples = WHISPER_SAMPLE_RATE;
			int silentSamplesToAdd = std::min(maximumSilentSamples, (splitEnd - splitStart) / 2);
			splitStart += silentSamplesToAdd;

			result << splitAndTranscribeBefore_(splitStart, splitEnd) << "\n\n";
			return true;
		}

		return false;
	};

	int maximumSamples = WHISPER_SAMPLE_RATE * 25;

	// Handle paragraph breaks indicated by long pauses
	while (audioBuffer_.size() > WHISPER_SAMPLE_RATE * 3) {
		LOGD("WhisperSession: Checking for a longer pauses.");
		// Allow brief pauses to create new paragraphs:
		float minSilenceSeconds = 1.5f;
		auto splitPoint = findLongestSilence(
			audioBuffer_,
			LongestSilenceOptions {
				.sampleRate = WHISPER_SAMPLE_RATE,
				.minSilenceLengthSeconds = minSilenceSeconds,
				.maximumSilenceStartSamples = maximumSamples,
				.returnFirstMatch = true
			}
		);
		if (!splitPoint.isValid) {
			break;
		}
		if (!splitAndProcess(splitPoint.start, splitPoint.end)) {
			break;
		}
	}

	// If there are no long pauses, force a paragraph break somewhere
	if (audioBuffer_.size() >= maximumSamples) {
		LOGD("WhisperSession: Allowing shorter pauses to break.");
		float minSilenceSeconds = 0.3f;
		auto silenceRange = findLongestSilence(
				audioBuffer_,
				LongestSilenceOptions {
						.sampleRate = WHISPER_SAMPLE_RATE,
						.minSilenceLengthSeconds = minSilenceSeconds,
						.maximumSilenceStartSamples = maximumSamples,
						.returnFirstMatch = false
				}
		);

		// In this case, the audio is long enough that it needs to be split somewhere. If there's
		// no suitable pause available, default to splitting in the middle.
		int halfBufferSize = audioBuffer_.size() / 2;
		int splitStart = silenceRange.isValid ? silenceRange.start : halfBufferSize;
		int splitEnd = silenceRange.isValid ? silenceRange.end : halfBufferSize;
		splitAndProcess(splitStart, splitEnd);
	}

	return result.str();
}


void WhisperSession::addAudio(const float *pAudio, int sizeAudio) {
	// Update the local audio buffer
	for (int i = 0; i < sizeAudio; i++) {
		audioBuffer_.push_back(pAudio[i]);
	}
}

std::string WhisperSession::transcribeAll() {
	if (isBufferSilent_()) {
		return "";
	}

	std::stringstream result;

	std::string transcribed;
	auto update_transcribed = [&] {
		transcribed = transcribeNextChunk();
		return !transcribed.empty();
	};
	while (update_transcribed()) {
		result << transcribed << "\n\n";
	}

	// Transcribe content considered by transcribeNextChunk as partial:
	if (!isBufferSilent_()) {
		result << transcribe_(audioBuffer_, audioBuffer_.size());
	}
	audioBuffer_.clear();

	return result.str();
}
