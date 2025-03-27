#pragma once

#include <string>
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
	// Returns the transcription of any unfinalized audio
	std::string getPreview();

private:
	// Current preview state
	std::string previewText_;

	whisper_full_params buildWhisperParams_();
	std::string transcribe_(const std::vector<float>& audio, size_t samplesToTranscribe);
	std::string splitAndTranscribeBefore_(int transcribeUpTo, int trimTo);
	// Like transcribeNextChunk, but does not update the preview state
	// and does not add a new chunk to the buffer.
	// Since updating the preview state can be slow, this may be preferred
	// for internal operations where the preview does not need to be kept up-to-date.
	std::string transcribeNextChunkNoPreview_();

	bool isBufferSilent_();

	whisper_context *pContext_;
	const std::string lang_;
	const std::string prompt_;
    const bool shortAudioContext_;

	std::vector<float> audioBuffer_;
};

