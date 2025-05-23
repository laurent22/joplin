#pragma once

#include <string>
#include <vector>

#include "whisper.h"

class WhisperSession {
public:
	WhisperSession(const std::string& modelPath, std::string lang, std::string prompt, bool shortAudioContext);
	~WhisperSession();
	// Adds to the buffer
	void addAudio(const float *pAudio, int sizeAudio);
	// Returns the next finalized slice of audio (if any) and updates the preview.
	std::string transcribeNextChunk();
	// Transcribes all buffered audio data that hasn't been finalized yet
	std::string transcribeAll();

private:
	whisper_full_params buildWhisperParams_();
	std::string transcribe_(const std::vector<float>& audio, size_t samplesToTranscribe);
	std::string splitAndTranscribeBefore_(int transcribeUpTo, int trimTo);

	bool isBufferSilent_();

	whisper_context *pContext_;
	const std::string lang_;
	const std::string prompt_;
	const bool shortAudioContext_;

	std::vector<float> audioBuffer_;
};

