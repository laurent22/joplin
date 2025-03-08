#include "WhisperSession.h"

#include <utility>
#include <sstream>
#include <algorithm>
#include "whisper.h"
#include "findLongestSilence.h"
#include "androidUtil.h"

WhisperSession::WhisperSession(const std::string& modelPath, std::string lang, std::string prompt)
	: lang_ {std::move(lang)}, prompt_ {std::move(prompt)} {
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

	// Lifetime: lifetime(params) < lifetime(lang_) = lifetime(this).
	params.language = lang_.c_str();

	return params;
}

std::string
WhisperSession::transcribe_(const std::vector<float>& audio, size_t transcribeCount) {
	int minTranscribeLength = WHISPER_SAMPLE_RATE / 2; // 0.5s
	if (transcribeCount < minTranscribeLength) {
		return "";
	}

	whisper_full_params params = buildWhisperParams_();
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

std::string
WhisperSession::transcribeNextChunk(const float *pAudio, int sizeAudio) {
	std::string finalizedContent;

	// Update the local audio buffer
	for (int i = 0; i < sizeAudio; i++) {
		audioBuffer_.push_back(pAudio[i]);
	}

	// Does the audio buffer need to be split somewhere?
	int maximumSamples = WHISPER_SAMPLE_RATE * 25;
	if (audioBuffer_.size() >= maximumSamples) {
		float minSilenceSeconds = 0.3f;
		auto silenceRange = findLongestSilence(
			audioBuffer_, WHISPER_SAMPLE_RATE, minSilenceSeconds, maximumSamples
		);

		// In this case, the audio is long enough that it needs to be split somewhere. If there's
		// no suitable pause available, default to splitting in the middle.
		int halfBufferSize = audioBuffer_.size() / 2;
		int transcribeTo = silenceRange.isValid ? silenceRange.start : halfBufferSize;
		int trimTo = silenceRange.isValid ? silenceRange.end : halfBufferSize;

		finalizedContent = splitAndTranscribeBefore_(transcribeTo, trimTo);
	} else if (audioBuffer_.size() > WHISPER_SAMPLE_RATE * 3) {
		// Allow brief pauses to create new paragraphs:
		float minSilenceSeconds = 2.0f;
		auto splitPoint = findLongestSilence(
			audioBuffer_, WHISPER_SAMPLE_RATE, minSilenceSeconds, maximumSamples
		);
		if (splitPoint.isValid) {
			int tolerance = WHISPER_SAMPLE_RATE / 20; // 0.05s
			bool isCompletelySilent = splitPoint.start < tolerance && splitPoint.end > audioBuffer_.size() - tolerance;
			if (isCompletelySilent) {
				audioBuffer_.clear();
			} else {
				finalizedContent = splitAndTranscribeBefore_(splitPoint.start, splitPoint.end);
			}
		}
	}

	previewText_ = transcribe_(audioBuffer_, audioBuffer_.size());
	return finalizedContent;
}

std::string WhisperSession::getPreview() {
	return previewText_;
}
