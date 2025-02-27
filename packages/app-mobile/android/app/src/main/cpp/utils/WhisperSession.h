#pragma once

#include <string>
#include "whisper.h"

class WhisperSession {
public:
	WhisperSession(const std::string& modelPath, std::string lang, std::string prompt);
	~WhisperSession();
	std::string transcribeNextChunk(const float *pAudio, int sizeAudio);
	std::string getPreview();

private:
	// Current preview state
	std::string previewText_;

	whisper_full_params buildWhisperParams_();
	std::string transcribe_(const std::vector<float>& audio, size_t samplesToTranscribe);
	std::string splitAndTranscribeBefore_(int transcribeUpTo, int trimTo);

	whisper_context *pContext_;
	const std::string lang_;
	const std::string prompt_;

	std::vector<float> audioBuffer_;
};

